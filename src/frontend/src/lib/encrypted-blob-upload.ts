import { loadConfig } from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import type { Identity } from "@icp-sdk/core/agent";
import { HttpAgent } from "@icp-sdk/core/agent";

const MOTOKO_DEDUPLICATION_SENTINEL = "!caf!";
type BlobHashTree = {
  tree: { hash: { toShaString(): string } };
};

type StorageClientInternals = StorageClient & {
  processFileForUpload(
    file: Blob,
    headers: Record<string, string>,
  ): Promise<{
    chunks: Blob[];
    chunkHashes: unknown[];
    blobHashTree: BlobHashTree;
  }>;
  getCertificate(hash: string): Promise<Uint8Array>;
  storageGatewayClient: {
    uploadBlobTree(
      blobHashTree: BlobHashTree,
      bucketName: string,
      numBlobBytes: number,
      owner: string,
      projectId: string,
      certificateBytes: Uint8Array,
    ): Promise<void>;
  };
  parallelUpload(
    chunks: Blob[],
    chunkHashes: unknown[],
    blobRootHash: { toShaString(): string },
    httpHeaders: Record<string, string>,
    onProgress?: (percentage: number) => void,
  ): Promise<void>;
  bucket: string;
  backendCanisterId: string;
  projectId: string;
};

let cachedClient: StorageClient | null = null;
let cachedIdentity: Identity | undefined;

async function getStorageClient(
  identity?: Identity,
): Promise<StorageClientInternals> {
  if (cachedClient && cachedIdentity === identity) {
    return cachedClient as StorageClientInternals;
  }
  const config = await loadConfig();
  const agent = new HttpAgent({
    identity,
    host: config.backend_host,
  });
  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch((err) => {
      console.warn(
        "Unable to fetch root key. Check that your local replica is running",
      );
      console.error(err);
    });
  }
  cachedClient = new StorageClient(
    config.bucket_name,
    config.storage_gateway_url,
    config.backend_canister_id,
    config.project_id,
    agent,
  );
  cachedIdentity = identity;
  return cachedClient as StorageClientInternals;
}

/**
 * Read encrypted bytes into a contiguous buffer, then build chunk hashes and
 * blob_tree from that exact payload (not from ExternalBlob.fromURL).
 */
export async function processEncryptedBlobForUpload(encryptedBlob: Blob): Promise<{
  chunks: Blob[];
  chunkHashes: unknown[];
  blobHashTree: BlobHashTree;
}> {
  const payloadBytes = new Uint8Array(await encryptedBlob.arrayBuffer());
  const numBlobBytes = payloadBytes.byteLength;
  const blobForChunks = new Blob([payloadBytes], {
    type: "application/octet-stream",
  });
  const fileHeaders = {
    "Content-Type": "application/octet-stream",
    "Content-Length": numBlobBytes.toString(),
  };
  const client = await getStorageClient();
  return client.processFileForUpload(blobForChunks, fileHeaders);
}

/**
 * Upload a pre-built blob_tree and chunk payloads directly to the storage gateway.
 */
export async function uploadBlobTreeDirect(
  blobHashTree: BlobHashTree,
  encryptedBlob: Blob,
  chunks: Blob[],
  chunkHashes: unknown[],
  options?: {
    identity?: Identity;
    onProgress?: (percentage: number) => void;
  },
): Promise<Uint8Array> {
  const numBlobBytes = new Uint8Array(await encryptedBlob.arrayBuffer())
    .byteLength;
  const client = await getStorageClient(options?.identity);
  const blobRootHash = blobHashTree.tree.hash;
  const hashString = blobRootHash.toShaString();
  const certificateBytes = await client.getCertificate(hashString);
  await client.storageGatewayClient.uploadBlobTree(
    blobHashTree,
    client.bucket,
    numBlobBytes,
    client.backendCanisterId,
    client.projectId,
    certificateBytes,
  );
  await client.parallelUpload(
    chunks,
    chunkHashes,
    blobRootHash,
    { "Content-Type": "application/json" },
    options?.onProgress,
  );
  return new TextEncoder().encode(MOTOKO_DEDUPLICATION_SENTINEL + hashString);
}
