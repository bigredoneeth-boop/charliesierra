/**
 * Thin wrapper around the generated backend createActor.
 * Prevents the "@dfinity/agent" warning about both agent and agentOptions
 * being passed simultaneously by stripping agentOptions when agent is provided.
 */
import {
  type Backend,
  type CreateActorOptions,
  type ExternalBlob,
  createActor as _createActor,
} from "../backend";

// Re-export everything from the generated backend so consumers importing
// types or helpers from "@/backend" continue to work unchanged.
export * from "../backend";

export function createActor(
  canisterId: string,
  uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
  downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
  options: CreateActorOptions = {},
): Backend {
  // If an agent is already provided, drop agentOptions to suppress:
  // "Detected both agent and agentOptions passed to createActor."
  const safeOptions: CreateActorOptions = options.agent
    ? { ...options, agentOptions: undefined }
    : options;
  return _createActor(canisterId, uploadFile, downloadFile, safeOptions);
}
