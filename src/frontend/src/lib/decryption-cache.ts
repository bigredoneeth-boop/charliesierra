/**
 * CharlieSierra Decryption Cache
 *
 * Stores decrypted plaintext in IndexedDB so previously-decrypted messages
 * remain readable across sessions without re-running AES-GCM every time.
 *
 * Cache key:  `${convId}:${msgId}`
 * Value:     `{ plaintext: string, timestamp: number, ciphertextHash: string }`
 *
 * - 5 000 entry limit (LRU eviction)
 * - Cleared when user clears local encryption keys or deletes a conversation
 * - Works for both 1:1 and group chats
 */

const DB_NAME = "cs_decrypted_messages";
const DB_VERSION = 4;
const PLAINTEXT_STORE = "plaintext";
const FILE_STORE = "files";
const STATUS_STORE = "status";
const MAX_ENTRIES = 5000;
const FILE_MAX_ENTRIES = 50;
const FILE_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

// In-memory cache for instantaneous access without IndexedDB async overhead.
// Survives component unmounts/remounts so re-renders never lose plaintext.
const _memoryCache = new Map<
  string,
  { plaintext: string; ciphertextHash: string }
>();

export type DecryptionStatus =
  | "pending"
  | "decrypted"
  | "failed-retryable"
  | "permanently-unreadable";

interface StatusEntry {
  status: DecryptionStatus;
  updatedAt: number;
  ciphertextHash: string;
  attempts: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // If upgrading from version 3 (or earlier), add the status store
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(STATUS_STORE)) {
          const statusStore = db.createObjectStore(STATUS_STORE);
          statusStore.createIndex("byUpdatedAt", "updatedAt", {
            unique: false,
          });
        }
      }

      // If upgrading from version 2 (or earlier), delete and recreate stores with indexes
      if (oldVersion < 3) {
        if (db.objectStoreNames.contains(PLAINTEXT_STORE)) {
          db.deleteObjectStore(PLAINTEXT_STORE);
        }
        if (db.objectStoreNames.contains(FILE_STORE)) {
          db.deleteObjectStore(FILE_STORE);
        }
      }

      if (!db.objectStoreNames.contains(PLAINTEXT_STORE)) {
        const plaintextStore = db.createObjectStore(PLAINTEXT_STORE);
        plaintextStore.createIndex("byAccessedAt", "accessedAt", {
          unique: false,
        });
      }
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        const fileStore = db.createObjectStore(FILE_STORE);
        fileStore.createIndex("byAccessedAt", "accessedAt", { unique: false });
        fileStore.createIndex("bySize", "size", { unique: false });
      }
      if (!db.objectStoreNames.contains(STATUS_STORE)) {
        const statusStore = db.createObjectStore(STATUS_STORE);
        statusStore.createIndex("byUpdatedAt", "updatedAt", {
          unique: false,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Build a deterministic cache key from conversation + message id. */
function cacheKey(convId: string, msgId: string | number): string {
  return `${convId}:${msgId}`;
}

/** Simple djb2-like hash for the ciphertext so we can detect re-encryption. */
export function hashCiphertext(blob: Uint8Array): string {
  let h = 5381;
  for (let i = 0; i < blob.length; i++) {
    h = (h << 5) + h + blob[i];
  }
  return (h >>> 0).toString(16);
}

/** Get the decryption attempts count for a message. Returns 0 if no status is recorded. */
export async function getDecryptionAttempts(
  convId: string,
  msgId: string | number,
): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STATUS_STORE, "readonly");
    const store = tx.objectStore(STATUS_STORE);
    const req = store.get(cacheKey(convId, msgId));

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const entry = req.result as StatusEntry | undefined;
        if (!entry) {
          resolve(0);
          return;
        }
        resolve(entry.attempts ?? 0);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("[DECRYPT CACHE] getDecryptionAttempts failed:", err);
    return 0;
  }
}

/** Get the decryption status for a message. Returns null if no status is recorded. */
export async function getDecryptionStatus(
  convId: string,
  msgId: string | number,
): Promise<DecryptionStatus | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STATUS_STORE, "readonly");
    const store = tx.objectStore(STATUS_STORE);
    const req = store.get(cacheKey(convId, msgId));

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const entry = req.result as StatusEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }
        resolve(entry.status);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("[DECRYPT CACHE] getDecryptionStatus failed:", err);
    return null;
  }
}

/** Set the decryption status for a message. */
export async function setDecryptionStatus(
  convId: string,
  msgId: string | number,
  ciphertext: Uint8Array,
  status: DecryptionStatus,
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STATUS_STORE, "readwrite");
    const store = tx.objectStore(STATUS_STORE);

    const existing = await new Promise<StatusEntry | undefined>(
      (resolve, reject) => {
        const req = store.get(cacheKey(convId, msgId));
        req.onsuccess = () => resolve(req.result as StatusEntry | undefined);
        req.onerror = () => reject(req.error);
      },
    );

    const entry: StatusEntry = {
      status,
      updatedAt: Date.now(),
      ciphertextHash: hashCiphertext(ciphertext),
      // Reset attempts on success; increment only on failure states
      attempts: status === "decrypted" ? 0 : (existing?.attempts ?? 0) + 1,
    };

    store.put(entry, cacheKey(convId, msgId));

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("[DECRYPT CACHE] setDecryptionStatus failed:", err);
  }
}

/** Clear the decryption status for a message (e.g. before a manual retry). */
export async function clearDecryptionStatus(
  convId: string,
  msgId: string | number,
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STATUS_STORE, "readwrite");
    const store = tx.objectStore(STATUS_STORE);
    store.delete(cacheKey(convId, msgId));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("[DECRYPT CACHE] clearDecryptionStatus failed:", err);
  }
}

/** Remove every status entry belonging to a given conversation. */
export async function clearConversationStatusCache(
  convId: string,
): Promise<void> {
  try {
    const db = await openDB();
    const prefix = `${convId}:`;
    const tx = db.transaction(STATUS_STORE, "readwrite");
    const store = tx.objectStore(STATUS_STORE);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (cursor) {
        const key = cursor.key as string;
        if (key.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log(
      `[DECRYPT CACHE] Cleared status cache for conversation ${convId}`,
    );
  } catch (err) {
    console.error("[DECRYPT CACHE] clearConversationStatusCache failed:", err);
  }
}

/** Wipe the entire status cache. */
export async function clearAllStatusCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STATUS_STORE, "readwrite");
    tx.objectStore(STATUS_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log("[DECRYPT CACHE] Status cache cleared");
  } catch (err) {
    console.error("[DECRYPT CACHE] clearAllStatusCache failed:", err);
  }
}

/** Synchronous in-memory cache check only — no IndexedDB I/O. */
export function getDecryptedMessageSync(
  convId: string,
  msgId: string | number,
  ciphertext: Uint8Array,
): string | null {
  const key = cacheKey(convId, msgId);
  const currentHash = hashCiphertext(ciphertext);
  const memEntry = _memoryCache.get(key);
  if (memEntry && memEntry.ciphertextHash === currentHash) {
    console.log(`[CACHE HIT] memory sync for convId=${convId} msgId=${msgId}`);
    return memEntry.plaintext;
  }
  if (memEntry && memEntry.ciphertextHash !== currentHash) {
    // Hash mismatch → stale entry, evict from memory
    _memoryCache.delete(key);
  }
  console.log(`[CACHE MISS] memory sync for convId=${convId} msgId=${msgId}`);
  return null;
}

/** Retrieve cached plaintext if the ciphertext hash still matches. */
export async function getDecryptedMessage(
  convId: string,
  msgId: string | number,
  ciphertext: Uint8Array,
): Promise<string | null> {
  const key = cacheKey(convId, msgId);
  const currentHash = hashCiphertext(ciphertext);

  // ── 1. Fast in-memory cache check ───────────────────────────────────────
  const memEntry = _memoryCache.get(key);
  if (memEntry) {
    if (memEntry.ciphertextHash === currentHash) {
      console.log(
        `[CACHE HIT] memory cache for convId=${convId} msgId=${msgId}`,
      );
      return memEntry.plaintext;
    }
    // Hash mismatch → stale entry, evict from memory
    _memoryCache.delete(key);
  }

  // ── 2. IndexedDB fallback ───────────────────────────────────────────────
  try {
    const db = await openDB();
    const tx = db.transaction(PLAINTEXT_STORE, "readwrite");
    const store = tx.objectStore(PLAINTEXT_STORE);
    const req = store.get(key);

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const entry = req.result as
          | { plaintext: string; accessedAt: number; ciphertextHash: string }
          | undefined;
        if (!entry) {
          console.log(
            `[CACHE MISS] no IndexedDB entry for convId=${convId} msgId=${msgId}`,
          );
          resolve(null);
          return;
        }
        if (entry.ciphertextHash !== currentHash) {
          // Ciphertext changed (re-encrypted / edited) → stale cache
          console.log(
            `[CACHE MISS] hash mismatch for convId=${convId} msgId=${msgId} — ciphertext changed`,
          );
          resolve(null);
          return;
        }
        // Cache hit — promote to memory cache for instant future access
        _memoryCache.set(key, {
          plaintext: entry.plaintext,
          ciphertextHash: entry.ciphertextHash,
        });
        console.log(
          `[CACHE HIT] IndexedDB for convId=${convId} msgId=${msgId}`,
        );
        // Update accessedAt on cache hit
        entry.accessedAt = Date.now();
        store.put(entry, key);
        resolve(entry.plaintext);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("[DECRYPT CACHE] get failed:", err);
    return null;
  }
}

/** Store decrypted plaintext in the cache. */
export async function setDecryptedMessage(
  convId: string,
  msgId: string | number,
  ciphertext: Uint8Array,
  plaintext: string,
): Promise<void> {
  const key = cacheKey(convId, msgId);
  const hash = hashCiphertext(ciphertext);

  // Always update in-memory cache immediately so remounts see it instantly
  _memoryCache.set(key, { plaintext, ciphertextHash: hash });

  const doSet = async (): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(PLAINTEXT_STORE, "readwrite");
    const store = tx.objectStore(PLAINTEXT_STORE);

    const entry = {
      plaintext,
      accessedAt: Date.now(),
      ciphertextHash: hash,
    };

    store.put(entry, key);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  try {
    await doSet();
    console.log(
      `[CACHE WRITE] stored plaintext for convId=${convId} msgId=${msgId}`,
    );
    // Async cleanup — don't block the write
    void cleanupMessageCache();
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn(
        "[DECRYPT CACHE] QuotaExceededError on set, running cleanup and retrying…",
      );
      await cleanupMessageCache();
      try {
        await doSet();
        void cleanupMessageCache();
      } catch (retryErr) {
        console.error(
          "[DECRYPT CACHE] Retry set failed after cleanup:",
          retryErr,
        );
      }
    } else {
      console.error("[DECRYPT CACHE] set failed:", err);
    }
  }
}

/** Remove every cached entry belonging to a given conversation. */
export async function clearConversationCache(convId: string): Promise<void> {
  try {
    const db = await openDB();
    const prefix = `${convId}:`;

    // Clear in-memory cache first
    for (const key of _memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        _memoryCache.delete(key);
      }
    }

    // Clear plaintext store
    const tx1 = db.transaction(PLAINTEXT_STORE, "readwrite");
    const store1 = tx1.objectStore(PLAINTEXT_STORE);
    const cursorReq1 = store1.openCursor();
    cursorReq1.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (cursor) {
        const key = cursor.key as string;
        if (key.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    await new Promise<void>((resolve, reject) => {
      tx1.oncomplete = () => resolve();
      tx1.onerror = () => reject(tx1.error);
    });

    // Clear file store
    const tx2 = db.transaction(FILE_STORE, "readwrite");
    const store2 = tx2.objectStore(FILE_STORE);
    const cursorReq2 = store2.openCursor();
    cursorReq2.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (cursor) {
        const key = cursor.key as string;
        if (key.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    await new Promise<void>((resolve, reject) => {
      tx2.oncomplete = () => resolve();
      tx2.onerror = () => reject(tx2.error);
    });

    // Clear status store
    const tx3 = db.transaction(STATUS_STORE, "readwrite");
    const store3 = tx3.objectStore(STATUS_STORE);
    const cursorReq3 = store3.openCursor();
    cursorReq3.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (cursor) {
        const key = cursor.key as string;
        if (key.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    await new Promise<void>((resolve, reject) => {
      tx3.oncomplete = () => resolve();
      tx3.onerror = () => reject(tx3.error);
    });

    console.log(`[DECRYPT CACHE] Cleared cache for conversation ${convId}`);
  } catch (err) {
    console.error("[DECRYPT CACHE] clearConversation failed:", err);
  }
}

/** Wipe the entire cache (e.g. when user clears all local encryption keys). */
export async function clearAllCache(): Promise<void> {
  try {
    // Clear in-memory cache first
    _memoryCache.clear();

    const db = await openDB();

    const tx1 = db.transaction(PLAINTEXT_STORE, "readwrite");
    tx1.objectStore(PLAINTEXT_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx1.oncomplete = () => resolve();
      tx1.onerror = () => reject(tx1.error);
    });

    const tx2 = db.transaction(FILE_STORE, "readwrite");
    tx2.objectStore(FILE_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx2.oncomplete = () => resolve();
      tx2.onerror = () => reject(tx2.error);
    });

    const tx3 = db.transaction(STATUS_STORE, "readwrite");
    tx3.objectStore(STATUS_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx3.oncomplete = () => resolve();
      tx3.onerror = () => reject(tx3.error);
    });

    console.log("[DECRYPT CACHE] Entire cache cleared");
  } catch (err) {
    console.error("[DECRYPT CACHE] clearAll failed:", err);
  }
}

/** LRU-style cleanup: keep only the newest MAX_ENTRIES using the byAccessedAt index. */
export async function cleanupMessageCache(): Promise<void> {
  try {
    const db = await openDB();

    // Count total entries
    const countTx = db.transaction(PLAINTEXT_STORE, "readonly");
    const countStore = countTx.objectStore(PLAINTEXT_STORE);
    const countReq = countStore.count();
    const totalCount = await new Promise<number>((resolve, reject) => {
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => reject(countReq.error);
    });

    if (totalCount <= MAX_ENTRIES) return;

    const toDeleteCount = totalCount - MAX_ENTRIES;

    const delTx = db.transaction(PLAINTEXT_STORE, "readwrite");
    const delStore = delTx.objectStore(PLAINTEXT_STORE);
    const index = delStore.index("byAccessedAt");
    const range = IDBKeyRange.upperBound(Date.now());
    const cursorReq = index.openCursor(range);

    let deleted = 0;
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (cursor && deleted < toDeleteCount) {
        cursor.delete();
        deleted++;
        cursor.continue();
      }
    };

    await new Promise<void>((resolve, reject) => {
      delTx.oncomplete = () => resolve();
      delTx.onerror = () => reject(delTx.error);
    });

    console.log(
      `[DECRYPT CACHE] Evicted ${deleted} old entries (limit ${MAX_ENTRIES})`,
    );
  } catch (err) {
    console.error("[DECRYPT CACHE] cleanup failed:", err);
  }
}

/* ─────────────────────────── File Cache ─────────────────────────── */

interface FileCacheEntry {
  blob: Blob;
  mimeType: string;
  originalFileName: string;
  size: number;
  ciphertextHash: string;
  conversationId: string;
  accessedAt: number;
}

function isQuotaExceededError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === "QuotaExceededError") return true;
    if (err.message?.toLowerCase().includes("quota")) return true;
  }
  return false;
}

/** Retrieve a cached decrypted file blob if the ciphertext hash still matches. */
export async function getDecryptedFile(
  storageKey: string,
  ciphertextHash?: string,
): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(FILE_STORE, "readwrite");
    const store = tx.objectStore(FILE_STORE);
    const req = store.get(storageKey);

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const entry = req.result as FileCacheEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }
        if (ciphertextHash && entry.ciphertextHash !== ciphertextHash) {
          resolve(null);
          return;
        }
        // Update accessedAt on cache hit
        entry.accessedAt = Date.now();
        store.put(entry, storageKey);
        resolve(entry.blob);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("[DECRYPT CACHE] getDecryptedFile failed:", err);
    return null;
  }
}

/** Store a decrypted file blob in the cache. */
export async function setDecryptedFile(
  storageKey: string,
  blob: Blob,
  metadata: {
    mimeType: string;
    originalFileName: string;
    size: number;
    ciphertextHash: string;
    conversationId: string;
  },
): Promise<void> {
  const doSet = async (): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(FILE_STORE, "readwrite");
    const store = tx.objectStore(FILE_STORE);

    const entry: FileCacheEntry = {
      blob,
      mimeType: metadata.mimeType,
      originalFileName: metadata.originalFileName,
      size: metadata.size,
      ciphertextHash: metadata.ciphertextHash,
      conversationId: metadata.conversationId,
      accessedAt: Date.now(),
    };

    store.put(entry, storageKey);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  try {
    await doSet();
    // Async cleanup — don't block the write
    void cleanupFileCache();
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.warn(
        "[DECRYPT CACHE] QuotaExceededError on set file, running cleanup and retrying…",
      );
      await cleanupFileCache();
      try {
        await doSet();
        void cleanupFileCache();
      } catch (retryErr) {
        console.error(
          "[DECRYPT CACHE] Retry set file failed after cleanup:",
          retryErr,
        );
      }
    } else {
      console.error("[DECRYPT CACHE] setDecryptedFile failed:", err);
    }
  }
}

/** Wipe the entire file cache. */
export async function clearAllFileCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(FILE_STORE, "readwrite");
    tx.objectStore(FILE_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log("[DECRYPT CACHE] File cache cleared");
  } catch (err) {
    console.error("[DECRYPT CACHE] clearAllFileCache failed:", err);
  }
}

/** Remove every cached file belonging to a given conversation. */
export async function clearFileCacheForConversation(
  convId: string,
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(FILE_STORE, "readwrite");
    const store = tx.objectStore(FILE_STORE);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (cursor) {
        const entry = cursor.value as FileCacheEntry | undefined;
        if (entry?.conversationId === convId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log(
      `[DECRYPT CACHE] File cache cleared for conversation ${convId}`,
    );
  } catch (err) {
    console.error("[DECRYPT CACHE] clearFileCacheForConversation failed:", err);
  }
}

/** Prune oldest file entries until count <= FILE_MAX_ENTRIES and totalSize <= FILE_MAX_BYTES using the byAccessedAt index. */
export async function cleanupFileCache(): Promise<void> {
  try {
    const db = await openDB();

    // Gather stats
    const statsTx = db.transaction(FILE_STORE, "readonly");
    const statsStore = statsTx.objectStore(FILE_STORE);
    const countReq = statsStore.count();
    const totalCount = await new Promise<number>((resolve, reject) => {
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => reject(countReq.error);
    });

    let totalSize = 0;
    const sizeCursorReq = statsStore.openCursor();
    sizeCursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (cursor) {
        const entry = cursor.value as FileCacheEntry;
        totalSize += entry.size;
        cursor.continue();
      }
    };
    await new Promise<void>((resolve, reject) => {
      statsTx.oncomplete = () => resolve();
      statsTx.onerror = () => reject(statsTx.error);
    });

    if (totalCount <= FILE_MAX_ENTRIES && totalSize <= FILE_MAX_BYTES) return;

    const delTx = db.transaction(FILE_STORE, "readwrite");
    const delStore = delTx.objectStore(FILE_STORE);
    const index = delStore.index("byAccessedAt");
    const range = IDBKeyRange.upperBound(Date.now());
    const cursorReq = index.openCursor(range);

    let currentCount = totalCount;
    let currentSize = totalSize;
    let pruned = 0;

    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (cursor) {
        const entry = cursor.value as FileCacheEntry;
        if (currentCount <= FILE_MAX_ENTRIES && currentSize <= FILE_MAX_BYTES) {
          return;
        }
        cursor.delete();
        currentCount--;
        currentSize -= entry.size;
        pruned++;
        cursor.continue();
      }
    };

    await new Promise<void>((resolve, reject) => {
      delTx.oncomplete = () => resolve();
      delTx.onerror = () => reject(delTx.error);
    });

    console.log(
      `[DECRYPT CACHE] Pruned ${pruned} file entries (count limit ${FILE_MAX_ENTRIES}, size limit ${FILE_MAX_BYTES} bytes)`,
    );
  } catch (err) {
    console.error("[DECRYPT CACHE] cleanupFileCache failed:", err);
  }
}
