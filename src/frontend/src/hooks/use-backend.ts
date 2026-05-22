import { ExternalBlob, createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";

interface UseBackendResult {
  backend: backendInterface | null;
  isLoading: boolean;
  uploadBlob:
    | ((bytes: Uint8Array, mimeType: string) => Promise<Uint8Array>)
    | null;
  downloadBlob: ((key: Uint8Array) => Promise<ExternalBlob>) | null;
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
    ? async (key: Uint8Array): Promise<ExternalBlob> => {
        const hexKey = Array.from(key)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const url = `https://blob.caffeine.ai/v1/blob/${hexKey}`;
        console.log(
          `[E2EE FILE RECV] Fetching blob using storageKey: ${hexKey}`,
        );
        return ExternalBlob.fromURL(url);
      }
    : null;

  return {
    backend: actor ?? null,
    isLoading: isFetching,
    uploadBlob,
    downloadBlob,
  };
}
