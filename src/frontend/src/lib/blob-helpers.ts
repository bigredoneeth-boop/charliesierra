import { ExternalBlob } from "@/backend";

/**
 * Safe wrapper around ExternalBlob.fromBytes() that guarantees the stored
 * Uint8Array always has byteOffset === 0.
 *
 * ExternalBlob.fromBytes() does `new Uint8Array(blob)` which creates a view
 * that can inherit a non-zero byteOffset from the input. The blob-tree hasher
 * in the platform computes hashes over the underlying ArrayBuffer, so a
 * non-zero byteOffset causes hash mismatches and a 403 Invalid Payload.
 *
 * This helper creates a fresh isolated copy with blob.slice(0) before passing
 * it to ExternalBlob.fromBytes(), ensuring byteOffset is always 0.
 */
export function createExternalBlob(blob: Uint8Array): ExternalBlob {
  // Use ArrayBuffer.slice() to guarantee a truly independent copy with no shared memory.
  // Uint8Array.slice(0) copies element-by-element but may still reference a shared
  // underlying buffer in some engines. ArrayBuffer.slice() always produces a brand-new
  // independent ArrayBuffer, so the Blob([bytes]) constructor cannot accidentally include
  // extra bytes from a shared parent buffer beyond blob.byteLength.
  const freshBuffer = blob.buffer.slice(
    blob.byteOffset,
    blob.byteOffset + blob.byteLength,
  );
  const freshBytes = new Uint8Array(freshBuffer) as Uint8Array<ArrayBuffer>;
  console.log(
    `[ObjectStorage] fromBytes: byteLength=${freshBytes.byteLength}, byteOffset=${freshBytes.byteOffset}`,
  );
  return ExternalBlob.fromBytes(freshBytes);
}
