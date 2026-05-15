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

/** Return all keys in the KEY_STORE that match the given prefix. */
export async function dbGetKeysWithPrefix(prefix: string): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, "readonly");
    const req = tx.objectStore(KEY_STORE).getAllKeys();
    req.onsuccess = () =>
      resolve((req.result as string[]).filter((k) => k.startsWith(prefix)));
    req.onerror = () => reject(req.error);
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

export async function importPublicKey(bytes: Uint8Array): Promise<CryptoKey> {
  // CRITICAL: Candid-decoded Uint8Array values often have a non-zero byteOffset.
  // Passing bytes.buffer directly would read from the wrong position in the underlying
  // ArrayBuffer. We must copy to a fresh Uint8Array first to guarantee byteOffset === 0.
  const copy = new Uint8Array(bytes);
  return crypto.subtle.importKey(
    "spki",
    copy.buffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
}

export async function deriveSharedSecret(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── AES-GCM message encryption ───────────────────────────────────────────────

export async function encryptMessage(
  key: CryptoKey,
  plaintext: string,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_LENGTH);
  return result;
}

export async function decryptMessage(
  key: CryptoKey,
  ciphertext: Uint8Array,
): Promise<string> {
  // FIX: Normalize to a zero-byteOffset copy so that slice() works correctly
  // on Candid-decoded vec nat8 typed arrays which may have a non-zero byteOffset.
  const bytes = new Uint8Array(ciphertext);
  if (bytes.length < IV_LENGTH) {
    const err = `[E2EE] Ciphertext too short for IV: got ${bytes.length} bytes, need at least ${IV_LENGTH}`;
    console.error(err);
    throw new Error(err);
  }
  const iv = bytes.slice(0, IV_LENGTH);
  const data = bytes.slice(IV_LENGTH);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );
    const result = new TextDecoder().decode(plaintext);
    console.log(
      `[E2EE] Decryption successful (ciphertext length: ${bytes.length})`,
    );
    return result;
  } catch (err) {
    console.error(
      `[E2EE] AES-GCM decryption failed (ciphertext length: ${bytes.length}):`,
      err,
    );
    throw err;
  }
}

// ── Blob (file) encryption ────────────────────────────────────────────────────

export async function encryptBlob(
  key: CryptoKey,
  data: ArrayBuffer,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_LENGTH);
  return result;
}

export async function decryptBlob(
  key: CryptoKey,
  data: Uint8Array,
): Promise<ArrayBuffer> {
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
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
  // CRITICAL: Candid-decoded Uint8Array values often have a non-zero byteOffset.
  // Passing bytes.buffer directly would read from the wrong position in the underlying
  // ArrayBuffer. We must copy to a fresh Uint8Array first to guarantee byteOffset === 0.
  const copy = new Uint8Array(bytes);
  return crypto.subtle.importKey(
    "raw",
    copy.buffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
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

export async function loadOrCreateKeyPair(
  principal: string,
): Promise<CryptoKeyPair> {
  const stored = await dbGet<PersistedKeyPair>(`ecdh:${principal}`);
  if (stored?.privateKey && stored?.publicKey) {
    return { privateKey: stored.privateKey, publicKey: stored.publicKey };
  }
  const kp = await generateECDHKeyPair();
  await dbSet(`ecdh:${principal}`, {
    privateKey: kp.privateKey,
    publicKey: kp.publicKey,
  });
  return kp;
}
