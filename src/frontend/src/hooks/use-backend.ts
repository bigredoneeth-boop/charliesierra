import { type ExternalBlob, createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";

interface UseBackendResult {
  backend: backendInterface | null;
  isLoading: boolean;
  uploadBlob: ((blob: ExternalBlob) => Promise<Uint8Array>) | null;
  downloadBlob: ((key: Uint8Array) => Promise<ExternalBlob>) | null;
}

export function useBackend(): UseBackendResult {
  const { actor, isFetching } = useActor(createActor);

  // Expose object-storage upload/download by accessing the platform-injected
  // private handlers on the Backend class instance (safe: backend.ts is @ts-nocheck).
  const uploadBlob = actor
    ? async (blob: ExternalBlob): Promise<Uint8Array> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (
          actor as unknown as {
            _uploadFile: (b: ExternalBlob) => Promise<Uint8Array>;
          }
        )._uploadFile(blob);
      }
    : null;

  const downloadBlob = actor
    ? async (key: Uint8Array): Promise<ExternalBlob> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (
          actor as unknown as {
            _downloadFile: (k: Uint8Array) => Promise<ExternalBlob>;
          }
        )._downloadFile(key);
      }
    : null;

  return {
    backend: actor ?? null,
    isLoading: isFetching,
    uploadBlob,
    downloadBlob,
  };
}
