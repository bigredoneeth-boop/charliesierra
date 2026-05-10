/**
 * Offline Message Queue — IndexedDB store for pending encrypted messages.
 * CRITICAL: This module never encrypts or decrypts. Content is always a pre-encrypted blob.
 */

const DB_NAME = "cs_offline_queue";
const DB_VERSION = 1;
const STORE_NAME = "offline-queue";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type MessagePriority = "normal" | "high";
export type PendingMessageStatus =
  | "pending"
  | "sending"
  | "failed"
  | "delivered";

export interface PendingMessage {
  id: string;
  conversationId: string;
  encryptedContent: Uint8Array;
  messageType: string;
  ttlSeconds?: number;
  priority: MessagePriority;
  createdAt: number;
  retryCount: number;
  status: PendingMessageStatus;
  errorReason?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("priority", "priority", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueuePendingMessage(
  msg: Omit<PendingMessage, "id" | "retryCount" | "status" | "createdAt">,
): Promise<PendingMessage> {
  const db = await openDB();
  const entry: PendingMessage = {
    ...msg,
    id: crypto.randomUUID(),
    retryCount: 0,
    status: "pending",
    createdAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Returns pending messages sorted: high-priority first, then FIFO by createdAt.
 * Messages older than 30 days are marked failed (expired) and excluded.
 */
export async function getPendingMessages(): Promise<PendingMessage[]> {
  const db = await openDB();
  const all = await new Promise<PendingMessage[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingMessage[]);
    req.onerror = () => reject(req.error);
  });

  const now = Date.now();
  const expired: PendingMessage[] = [];
  const active: PendingMessage[] = [];

  for (const msg of all) {
    if (msg.status === "delivered") continue;
    if (now - msg.createdAt > MAX_AGE_MS) {
      expired.push({ ...msg, status: "failed", errorReason: "expired" });
    } else if (msg.status !== "failed") {
      active.push(msg);
    }
  }

  // Mark expired messages as failed
  if (expired.length > 0) {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const msg of expired) store.put(msg);
  }

  return active.sort((a, b) => {
    // High priority first, then FIFO
    if (a.priority === "high" && b.priority !== "high") return -1;
    if (b.priority === "high" && a.priority !== "high") return 1;
    return a.createdAt - b.createdAt;
  });
}

export async function updatePendingMessage(
  id: string,
  patch: Partial<PendingMessage>,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) {
        resolve();
        return;
      }
      store.put({ ...req.result, ...patch });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markDelivered(id: string): Promise<void> {
  return updatePendingMessage(id, { status: "delivered" });
}

export async function markFailed(
  id: string,
  errorReason: string,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      if (!req.result) {
        resolve();
        return;
      }
      const msg = req.result as PendingMessage;
      store.put({
        ...msg,
        status: "failed",
        errorReason,
        retryCount: msg.retryCount + 1,
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removePendingMessage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearDeliveredMessages(): Promise<void> {
  const db = await openDB();
  const all = await new Promise<PendingMessage[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingMessage[]);
    req.onerror = () => reject(req.error);
  });
  const deliveredIds = all
    .filter((m) => m.status === "delivered")
    .map((m) => m.id);
  if (deliveredIds.length === 0) return;
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const id of deliveredIds) store.delete(id);
}

export async function getFailedMessages(): Promise<PendingMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const all = req.result as PendingMessage[];
      resolve(
        all.filter((m) => m.status === "failed" && m.errorReason !== "expired"),
      );
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllQueuedMessages(): Promise<PendingMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as PendingMessage[]).filter(
          (m) => m.status !== "delivered",
        ),
      );
    req.onerror = () => reject(req.error);
  });
}
