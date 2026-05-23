import { createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";

interface UseBackendResult {
  backend: backendInterface | null;
  isLoading: boolean;
  uploadBlob:
    | ((bytes: Uint8Array, mimeType: string) => Promise<Uint8Array>)
    | null;
  /** Downloads an encrypted blob from object storage via GET and returns the raw encrypted bytes. */
  downloadBlob: ((key: Uint8Array) => Promise<Uint8Array>) | null;
}

export function useBackend(): UseBackendResult {
  const { actor, isFetching } = useActor(createActor);

  // Upload via the public actor.uploadFile API declared in backendInterface.
  const uploadBlob = actor
    ? async (bytes: Uint8Array, mimeType: string): Promise<Uint8Array> => {
        return actor.uploadFile(bytes, mimeType);
      }
    : null;

  const downloadBlob = actor
    ? async (key: Uint8Array): Promise<Uint8Array> => {
        const hexKey = Array.from(key)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.log(
          `[E2EE FILE RECV] Downloading blob with key=${hexKey.slice(0, 16)}...`,
        );
        // Always use GET with the storageKey directly in the URL path.
        // Object storage endpoint: https://blob.caffeine.ai/v1/blob/{storageKey}
        const url = `https://blob.caffeine.ai/v1/blob/${hexKey}`;
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
          throw new Error(
            `Blob fetch failed: HTTP ${response.status} ${response.statusText}`,
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        console.log(
          `[E2EE FILE RECV] Downloaded raw encrypted data: ${arrayBuffer.byteLength} bytes`,
        );
        // Return a fresh zero-offset Uint8Array — element-by-element copy
        // prevents hidden byteOffset issues from ArrayBuffer slices.
        const raw = new Uint8Array(arrayBuffer);
        const fresh = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) fresh[i] = raw[i];
        return fresh;
      }
    : null;

  return {
    backend: actor ?? null,
    isLoading: isFetching,
    uploadBlob,
    downloadBlob,
  };
}
