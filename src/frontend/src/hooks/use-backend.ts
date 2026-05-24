import { createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { loadConfig } from "@caffeineai/core-infrastructure";
import { useActor } from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent } from "@dfinity/agent";

interface UseBackendResult {
  backend: backendInterface | null;
  isLoading: boolean;
  uploadBlob: ((bytes: Uint8Array, mimeType: string) => Promise<string>) | null;
  /** Downloads an encrypted blob from object storage and returns the raw encrypted bytes. */
  downloadBlob: ((key: string) => Promise<Uint8Array>) | null;
}

export function useBackend(): UseBackendResult {
  const { actor, isFetching } = useActor(createActor);

  // Upload using the platform's StorageClient (blob-tree protocol).
  // Returns the short hash key (sha256:..., ~69 chars) from the upload response.
  const uploadBlob = actor
    ? async (bytes: Uint8Array, mimeType: string): Promise<string> => {
        console.log(
          `[E2EE FILE] Uploading to blob storage: ${bytes.byteLength} bytes, mimeType=${mimeType}`,
        );
        // Create a clean zero-offset copy to prevent byteOffset issues (403 Invalid payload).
        const cleanBuf = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        );
        const cleanBytes = new Uint8Array(cleanBuf);
        console.log(
          `[E2EE FILE] Buffer normalized: byteLength=${cleanBytes.byteLength}, byteOffset=${cleanBytes.byteOffset}`,
        );

        const config = await loadConfig();
        const agent = HttpAgent.createSync({
          host: config.backend_host ?? "https://icp0.io",
        });
        const storageClient = new StorageClient(
          config.bucket_name ?? "default-bucket",
          config.storage_gateway_url ?? "https://blob.caffeine.ai",
          config.backend_canister_id,
          config.project_id ?? "00000000-0000-0000-0000-000000000000",
          agent,
        );

        const { hash } = await storageClient.putFile(cleanBytes);
        console.log(
          `[E2EE FILE] Upload succeeded. Raw key from API: '${hash}' (length: ${hash.length})`,
        );
        return hash;
      }
    : null;

  const downloadBlob = actor
    ? async (key: string): Promise<Uint8Array> => {
        console.log(
          "[E2EE FILE RECV] Attempting download with storageKey length:",
          key.length,
        );

        const config = await loadConfig();
        const ownerId =
          config.backend_canister_id ?? "wqf45-4qaaa-aaaau-agubq-cai";
        const projectId =
          config.project_id ?? "00000000-0000-0000-0000-000000000000";

        console.log("[E2EE FILE RECV] Using blob_hash parameter for download");
        const url = `https://blob.caffeine.ai/v1/blob?blob_hash=${encodeURIComponent(key)}&owner_id=${encodeURIComponent(ownerId)}&project_id=${encodeURIComponent(projectId)}`;
        console.log("[E2EE FILE RECV] Download URL:", url);
        console.log("[E2EE FILE RECV] Final Download URL:", url);

        let response: Response;
        try {
          response = await fetch(url, { method: "GET" });
        } catch (networkErr) {
          const msg =
            networkErr instanceof Error
              ? networkErr.message
              : String(networkErr);
          console.error(`[E2EE FILE RECV] Network error during fetch: ${msg}`);
          throw new Error(`Blob download network error: ${msg}`);
        }

        console.log(
          "[E2EE FILE RECV] Download response status:",
          response.status,
        );

        if (response.status === 400) {
          const body = await response.text().catch(() => "");
          console.error(
            `[E2EE FILE RECV] HTTP 400 Bad Request — storageKey is invalid (length: ${key.length}). Not retrying. Body: ${body}`,
          );
          // Attach a flag so the caller can detect this is non-retriable.
          const err = new Error(
            "Blob download failed: HTTP 400 Bad Request — invalid storageKey",
          ) as Error & { nonRetriable: boolean };
          err.nonRetriable = true;
          throw err;
        }

        if (!response.ok) {
          console.error(
            `[E2EE FILE RECV] Download failed: HTTP ${response.status} ${response.statusText}`,
          );
          throw new Error(
            `Blob download failed: HTTP ${response.status} ${response.statusText}`,
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(
          `[E2EE FILE RECV] Downloaded raw encrypted data: ${arrayBuffer.byteLength} bytes`,
        );
        // Return a fresh zero-offset Uint8Array.
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
