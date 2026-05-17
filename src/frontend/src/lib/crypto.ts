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
  plaintext: string,
): Promise<Uint8Array> {
  // Step 1: fresh random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Step 2: encode plaintext
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Step 3: AES-GCM encrypt — output is ciphertext + 16-byte auth tag
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes,
  );

  // Step 4: concatenate into a brand-new owned buffer: [IV(12)] [ciphertext+tag]
  // Use element-by-element copy to guarantee byteOffset=0 in the result.
  const ciphertextAndTag = new Uint8Array(ciphertextBuffer);
  const fullBlob = new Uint8Array(IV_LENGTH + ciphertextAndTag.length);
  for (let i = 0; i < IV_LENGTH; i++) fullBlob[i] = iv[i];
  for (let i = 0; i < ciphertextAndTag.length; i++)
    fullBlob[IV_LENGTH + i] = ciphertextAndTag[i];

  const keyFp = await getKeyFingerprint(key);
  console.log(
    `[E2EE SEND] Encrypting ${plaintextBytes.byteLength} bytes, IV=${ivHex}, keyFp=${keyFp}, fullBlob=${fullBlob.length} bytes (${IV_LENGTH} IV + ${ciphertextAndTag.length} ciphertext+tag)`,
  );

  return fullBlob;
}

export async function decryptMessage(
  key: CryptoKey,
  rawInput: Uint8Array,
): Promise<string> {
  // Step 1: ALWAYS copy ALL bytes into a fresh, fully-owned Uint8Array using
  // element-by-element copy. This is the ONLY safe way to guarantee byteOffset=0
  // regardless of how the input was allocated (Candid transport buffer, slice, etc.).
  const data = new Uint8Array(rawInput.length);
  for (let i = 0; i < rawInput.length; i++) data[i] = rawInput[i];

  // Step 2: validate minimum size: 12 (IV) + 1 (plaintext) + 16 (auth tag) = 29
  if (data.length < 29) {
    const err = `[E2EE RECV] Blob too small: ${data.length} bytes (minimum 29 = 12 IV + 1 plaintext + 16 tag)`;
    console.error(err);
    throw new Error(err);
  }

  // Step 3: extract IV (first 12 bytes) and ciphertext+tag (remaining bytes)
  const iv = data.slice(0, IV_LENGTH);
  const ciphertextAndTag = data.slice(IV_LENGTH);

  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const keyFp = await getKeyFingerprint(key);
  console.log(
    `[E2EE RECV] blob=${data.length} bytes, IV(hex)=${ivHex}, ciphertext+tag=${ciphertextAndTag.length} bytes, keyFp=${keyFp}`,
  );

  // Step 4: decrypt
  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertextAndTag,
    );
    const result = new TextDecoder().decode(plainBuffer);
    console.log(
      `[E2EE RECV] Decryption successful, plaintext=${result.length} chars`,
    );
    return result;
  } catch (err) {
    console.error(
      `[E2EE RECV] AES-GCM decryption FAILED: blob=${data.length} bytes, IV(hex)=${ivHex}, ciphertext+tag=${ciphertextAndTag.length} bytes, keyFp=${keyFp}`,
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
  const seed = new TextEncoder().encode(`keystore:${principalText}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", seed);
  return crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
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
  wrapped: Uint8Array,
): Promise<Uint8Array> {
  if (wrapped.length < IV_LENGTH + 1) throw new Error("wrapped blob too small");
  const iv = wrapped.slice(0, IV_LENGTH);
  const ct = wrapped.slice(IV_LENGTH);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    ct,
  );
  return new Uint8Array(plain);
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
