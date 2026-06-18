/**
 * CharlieSierra Crypto Utilities
 * Web Crypto API – AES-GCM + ECDH key management, IndexedDB key persistence.
 * CRITICAL: All encryption happens client-side. Backend never sees plaintext.
 */

const DB_NAME = "cs_keystore";
const DB_VERSION = 1;
const KEY_STORE = "keypairs";
const IV_LENGTH = 12; // 12 bytes for AES-GCM

export const CONV_KEY_PREFIX = "convkey_";
// ── Safe Uint8Array normalization ────────────────────────────────────────────

/**
 * Convert any byte-like value coming out of IndexedDB deserialization into a
 * fresh, zero-offset Uint8Array before any WebCrypto call.
 *
 * Rules:
 *  - Uint8Array with byteOffset !== 0  → slice(0) to allocate a fresh buffer
 *  - Uint8Array with byteOffset === 0  → return as-is (already safe)
 *  - ArrayBuffer                        → wrap with new Uint8Array()
 *  - Plain number[] from JSON/IDB       → Uint8Array.from() (element-by-element copy)
 *
 * NEVER apply Uint8Array.from() to a Uint8Array — it re-copies element-by-element
 * which is wasteful and was previously confused with the number-array fix.
 */
export function toCleanUint8Array(val: unknown): Uint8Array {
  if (val instanceof Uint8Array) {
    return val.byteOffset !== 0 ? val.slice(0) : val;
  }
  if (val instanceof ArrayBuffer) {
    return new Uint8Array(val);
  }
  // Plain number array from IndexedDB JSON deserialization
  return Uint8Array.from(val as number[]);
}

// ── IndexedDB helpers ───────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(KEY_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, "readonly");
    const req = tx.objectStore(KEY_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, "readwrite");
    tx.objectStore(KEY_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Return all key-value pairs in the KEY_STORE whose keys match the given prefix. */
export async function dbGetKeysWithPrefix(
  prefix: string,
): Promise<{ key: string; value: unknown }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, "readonly");
    const store = tx.objectStore(KEY_STORE);
    const results: { key: string; value: unknown }[] = [];
    const cursor = store.openCursor();
    cursor.onsuccess = (e) => {
      const result = (e.target as IDBRequest)
        .result as IDBCursorWithValue | null;
      if (result) {
        const key = result.key as string;
        if (key.startsWith(prefix)) {
          results.push({ key, value: result.value });
        }
        result.continue();
      } else {
        resolve(results);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

// ── ECDH key pair ────────────────────────────────────────────────────────────

export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<Uint8Array> {
  const spki = await crypto.subtle.exportKey("spki", key);
  return new Uint8Array(spki);
}

/**
 * Helper: export first 8 bytes of a CryptoKey as a hex fingerprint for logging.
 * Returns '(non-extractable)' if the key cannot be exported.
 */
export async function getKeyFingerprint(key: CryptoKey): Promise<string> {
  try {
    const raw = await crypto.subtle.exportKey("raw", key);
    const bytes = new Uint8Array(raw);
    return Array.from(bytes.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "(non-extractable)";
  }
}

export async function importPublicKey(bytes: Uint8Array): Promise<CryptoKey> {
  // CRITICAL FIX: bytes.slice(0) ALWAYS allocates a brand-new ArrayBuffer with
  // byteOffset === 0. new Uint8Array(bytes).buffer can still reference the
  // original shared backing buffer in some JS engines (V8 included), causing
  // WebCrypto to read from the wrong offset and silently import a garbage key.
  // Uint8Array.prototype.slice (not subarray) is the only safe choice here.
  console.log("[E2EE] importPublicKey byteLength:", bytes.byteLength);
  const fresh = bytes.slice(0);
  return crypto.subtle.importKey(
    "spki",
    fresh,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
}

/**
 * Derive a stable AES-GCM-256 shared secret from an ECDH key pair.
 *
 * We use deriveBits (→ 32 raw bytes) then importAESKey so the intermediate
 * key material can be logged for debugging. Both sides performing
 * ECDH(myPrivate, theirPublic) produce the SAME 32 bytes — this is the
 * mathematical guarantee of ECDH.
 */
export async function deriveSharedSecret(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    256,
  );
  const rawBytes = new Uint8Array(bits.slice(0)); // own fresh buffer
  const fingerprint = Array.from(rawBytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  console.log(
    `[E2EE ECDH] deriveBits succeeded: 32 bytes, fingerprint=${fingerprint}`,
  );
  return importAESKey(rawBytes);
}

// ── AES-GCM message encryption ───────────────────────────────────────────────

export async function encryptMessage(
  key: CryptoKey,
  plaintext: BufferSource,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  const ctBytes = new Uint8Array(encrypted);
  // CRITICAL: Build the exact [12-byte IV] + [ciphertext + 16-byte tag] format
  // in a single fresh contiguous Uint8Array.  We use new Uint8Array(12 + ctBytes.byteLength)
  // then set() to guarantee byteOffset === 0 and a brand-new ArrayBuffer.
  const fullPayload = new Uint8Array(12 + ctBytes.byteLength);
  fullPayload.set(iv, 0);
  fullPayload.set(ctBytes, 12);
  // Belt-and-suspenders: force a fresh copy so callers can never receive a
  // view with a non-zero byteOffset (defensive against future engine quirks).
  const cleanResult = new Uint8Array(fullPayload);
  // Hex prefix of first 32 bytes for sender/receiver log correlation
  const hexPrefix = Array.from(
    cleanResult.slice(0, Math.min(cleanResult.length, 32)),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
  console.log(
    `[E2EE ENCRYPT direct] total=${cleanResult.length}, iv=12, ct+tag=${ctBytes.byteLength}, byteOffset=${cleanResult.byteOffset}, hexPrefix=${hexPrefix}`,
  );
  return cleanResult;
}

export async function decryptMessage(
  key: CryptoKey,
  input: Uint8Array | ArrayBuffer,
): Promise<string | null> {
  try {
    // STEP 1: Normalise to a Uint8Array view.
    const blobView = toCleanUint8Array(
      input instanceof Uint8Array ? input : new Uint8Array(input),
    );

    // STEP 2: Force a brand-new contiguous copy with byteOffset === 0.
    // Candid/IDB paths can hand us Uint8Arrays that share a backing buffer
    // with a non-zero offset.  WebCrypto (especially AES-GCM) is sensitive
    // to this, so we copy element-by-element into a fresh buffer.
    let clean = new Uint8Array(blobView.length);
    for (let i = 0; i < blobView.length; i++) clean[i] = blobView[i];

    // Extra safety: if the forced copy still has issues, force another
    if (clean.byteOffset !== 0 || clean.length !== clean.buffer.byteLength) {
      clean = new Uint8Array(clean);
    }

    console.log(
      `[E2EE DECRYPT final] len=${clean.length}, offset=${clean.byteOffset}`,
    );

    if (clean.length < 28) {
      console.error(
        `[E2EE RECV] decryptMessage: blob too small (${clean.length} bytes, need >=28)`,
      );
      return null;
    }

    // Hex dump for diagnosis (first 64 bytes)
    if (clean.length < 100) {
      const hexPrefix = Array.from(clean.slice(0, Math.min(clean.length, 64)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
      console.log(`[E2EE HEX BLOB] ${hexPrefix}`);
    }

    // STEP 3: Try skipping 0 to 16 bytes to handle Candid-serialized blobs.
    // Candid may prepend 1-byte tag, 2-byte length, 4-byte length, 8-byte length,
    // or other variant prefixes. We try a wider range (0-16) to be robust.
    for (let skip = 0; skip <= 16; skip++) {
      if (clean.length - skip < 28) continue;

      const blob = clean.slice(skip);
      const iv = blob.slice(0, 12);
      const ciphertext = blob.slice(12);

      try {
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          ciphertext,
        );
        const text = new TextDecoder().decode(decrypted);
        console.log(
          `[E2EE DECRYPT SUCCESS] len=${clean.length} with prefix skip=${skip}`,
        );
        return text;
      } catch (_e) {
        // Continue trying next skip offset
      }
    }

    // Diagnostic: brute-force possible IV positions if prefix skips failed (for small blobs)
    if (clean.length <= 100) {
      console.log(
        `[E2EE DECRYPT DIAGNOSTIC] Brute-forcing IV positions for len=${clean.length}`,
      );
      for (let ivStart = 0; ivStart <= clean.length - 28; ivStart++) {
        const iv = clean.slice(ivStart, ivStart + 12);
        const ciphertext = clean.slice(ivStart + 12);
        if (ciphertext.length < 16) continue;

        try {
          const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext,
          );
          const text = new TextDecoder().decode(decrypted);
          console.log(
            `[E2EE DECRYPT SUCCESS via brute-force] IV start=${ivStart}, len=${clean.length}`,
          );
          return text;
        } catch (_e) {
          // continue trying next IV position
        }
      }
    }

    console.error(
      `[E2EE DECRYPT] All attempts failed for len=${clean.length}. Full hex: ${Array.from(
        clean,
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ")}`,
    );
    return null;
  } catch (err) {
    console.error("[E2EE DECRYPT] Top-level error:", err);
    return null;
  }
}

// ── Blob (file) encryption ────────────────────────────────────────────────────

export async function encryptBlob(
  key: CryptoKey,
  data: ArrayBuffer,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  const ctBytes = new Uint8Array(encrypted);
  const fullPayload = new Uint8Array(12 + ctBytes.byteLength);
  fullPayload.set(iv, 0);
  fullPayload.set(ctBytes, 12);
  // Force a fresh contiguous copy so byteOffset is guaranteed zero.
  const cleanResult = new Uint8Array(fullPayload);
  console.log(
    `[E2EE SEND] encryptBlob: IV length=${iv.length}, ciphertext+tag length=${ctBytes.byteLength}, total=${cleanResult.length}, byteOffset=${cleanResult.byteOffset}`,
  );
  return cleanResult;
}

export async function decryptBlob(
  key: CryptoKey,
  data: Uint8Array,
): Promise<ArrayBuffer> {
  // STEP 1: Normalise to a clean Uint8Array view.
  const clean = toCleanUint8Array(data);

  // STEP 2: Force a brand-new contiguous copy with byteOffset === 0.
  const fresh = new Uint8Array(clean.length);
  for (let i = 0; i < clean.length; i++) fresh[i] = clean[i];

  if (fresh.length < 28) {
    console.error(
      `[E2EE RECV] decryptBlob: blob too small (${fresh.length} bytes, need >=28)`,
    );
    throw new Error("Blob too small");
  }

  const iv = fresh.slice(0, 12);
  const ciphertextAndTag = fresh.slice(12);
  console.log(
    `[E2EE RECV] Decrypting: total=${fresh.length}, IV=12, ciphertext+tag=${ciphertextAndTag.length}`,
  );
  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertextAndTag,
    );
    const decrypted = new Uint8Array(plainBuffer);
    const safeResult = new Uint8Array(decrypted.length);
    for (let i = 0; i < decrypted.length; i++) safeResult[i] = decrypted[i];
    return safeResult.buffer;
  } catch (err) {
    console.error(
      `[EncryptedFile] AES-GCM decryptBlob FAILED: blob=${fresh.length} bytes, IV=12 bytes, ciphertext+tag=${ciphertextAndTag.length} bytes`,
      err,
    );
    throw err;
  }
}

// ── Group / symmetric key helpers ─────────────────────────────────────────────

export async function generateGroupKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

export async function importAESKey(bytes: Uint8Array): Promise<CryptoKey> {
  // CRITICAL FIX: bytes.slice(0) ALWAYS allocates a brand-new ArrayBuffer with
  // byteOffset === 0. new Uint8Array(bytes).buffer can still reference the
  // original shared backing buffer in some JS engines (V8 included), causing
  // WebCrypto to read from the wrong offset and silently import a garbage key.
  // Uint8Array.prototype.slice (not subarray) is the only safe choice here.
  console.log("[E2EE] importAESKey byteLength:", bytes.byteLength);
  const fresh = bytes.slice(0);
  return crypto.subtle.importKey("raw", fresh, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ── Deterministic group key ──────────────────────────────────────────────────

/**
 * Derive a deterministic AES-GCM group key from a set of member principal
 * strings.  All members independently derive the SAME key by:
 *   1. Sorting the principal strings alphabetically.
 *   2. Joining them with '|' and UTF-8 encoding.
 *   3. SHA-256 hashing the result → 32 bytes of key material.
 *   4. Importing those bytes as an AES-GCM-256 CryptoKey.
 *
 * This removes the need for any key distribution infrastructure while
 * guaranteeing every member can decrypt every other member's messages.
 */
export async function deriveGroupKey(
  memberPrincipalStrings: string[],
): Promise<CryptoKey> {
  const sorted = [...memberPrincipalStrings].sort();
  const seed = new TextEncoder().encode(sorted.join("|"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", seed);
  return crypto.subtle.importKey("raw", hashBuffer, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ── Display-name key derivation ─────────────────────────────────────────────

/**
 * Derive a stable, deterministic AES-256-GCM key for encrypting/decrypting
 * the user's own display name.
 *
 * Strategy: SHA-256 of the UTF-8 bytes of `principal.toText()` → 32 bytes
 * of genuine key material → import as a raw AES-GCM key.
 *
 * This gives a valid key (not SPKI header bytes) that is unique per user
 * and produces the same key on every device/session for the same identity.
 */
export async function deriveDisplayNameKey(principal: {
  toText(): string;
}): Promise<CryptoKey> {
  const seed = new TextEncoder().encode(principal.toText());
  const hashBuffer = await crypto.subtle.digest("SHA-256", seed);
  return crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── Persisted ECDH key pair ────────────────────────────────────────────────────

interface PersistedKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

// ── Conversation key persistence helpers ───────────────────────────────────

/**
 * Derive a wrapping key from the user's principal for encrypting stored
 * conversation key bytes at rest. Uses SHA-256 of "keystore:" + principalText.
 * This is the same derivation pattern used for display-name encryption.
 */
export async function deriveStorageWrapKey(
  principalText: string,
): Promise<CryptoKey> {
  try {
    const seed = new TextEncoder().encode(`keystore:${principalText}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", seed);
    return crypto.subtle.importKey(
      "raw",
      hashBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  } catch (err) {
    console.error("[E2EE KEYSTORE] Failed to derive storage wrap key:", err);
    throw err;
  }
}

/**
 * Encrypt raw key bytes using the storage wrap key before writing to IndexedDB.
 * Format: IV(12) + ciphertext+authTag.
 */
export async function wrapKeyBytes(
  wrapKey: CryptoKey,
  rawBytes: Uint8Array,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  // Use a definite ArrayBuffer for the WebCrypto call to satisfy strict TypeScript
  const inputBuf: ArrayBuffer = rawBytes.slice(0).buffer as ArrayBuffer;
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    inputBuf,
  );
  const ct = new Uint8Array(ciphertext);
  const result = new Uint8Array(IV_LENGTH + ct.length);
  for (let i = 0; i < IV_LENGTH; i++) result[i] = iv[i];
  for (let i = 0; i < ct.length; i++) result[IV_LENGTH + i] = ct[i];
  return result;
}

/**
 * Decrypt wrapped key bytes from IndexedDB.
 */
export async function unwrapKeyBytes(
  wrapKey: CryptoKey,
  wrapped: unknown,
  name?: string,
): Promise<Uint8Array> {
  try {
    // CRITICAL FIX: toCleanUint8Array handles all three cases:
    //  - Uint8Array with non-zero byteOffset (V8 byteOffset bug)
    //  - ArrayBuffer (direct buffer reference)
    //  - Plain number[] from IndexedDB JSON deserialization
    // This replaces the previous ad-hoc Uint8Array.from() call which was
    // only correct for the number-array case.
    const clean = toCleanUint8Array(wrapped);
    if (clean.length < IV_LENGTH + 1) throw new Error("wrapped blob too small");
    const iv = clean.slice(0, IV_LENGTH);
    const ct = clean.slice(IV_LENGTH);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      wrapKey,
      ct,
    );
    return new Uint8Array(plain);
  } catch (err) {
    console.error(
      "[E2EE KEYSTORE] Failed to unwrap key for storage key=",
      name ?? "(unknown)",
      err,
    );
    throw err;
  }
}

export async function loadOrCreateKeyPair(
  principal: string,
): Promise<{ keyPair: CryptoKeyPair; isNew: boolean }> {
  const stored = await dbGet<PersistedKeyPair>(`ecdh:${principal}`);
  if (stored?.privateKey && stored?.publicKey) {
    console.log(`[E2EE KEYS] Loaded existing ECDH key pair for ${principal}`);
    return {
      keyPair: { privateKey: stored.privateKey, publicKey: stored.publicKey },
      isNew: false,
    };
  }
  console.log(
    `[E2EE KEYS] Generating NEW ECDH key pair for ${principal} — profile update required`,
  );
  const kp = await generateECDHKeyPair();
  await dbSet(`ecdh:${principal}`, {
    privateKey: kp.privateKey,
    publicKey: kp.publicKey,
  });
  return { keyPair: kp, isNew: true };
}
