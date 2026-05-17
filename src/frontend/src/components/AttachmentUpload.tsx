import { ExternalBlob, MessageType } from "@/backend";
import type { ConversationId } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCrypto } from "@/context/crypto-context";
import { useBackend } from "@/hooks/use-backend";
import { FileText, ImageIcon, Loader2, Upload, Video, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface AttachmentUploadProps {
  conversationId: ConversationId;
  open: boolean;
  onClose: () => void;
  onMessageSent?: () => void;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function getMessageType(mimeType: string): MessageType {
  if (mimeType.startsWith("image/")) return MessageType.image;
  if (mimeType.startsWith("video/")) return MessageType.video;
  if (mimeType.startsWith("audio/")) return MessageType.audio;
  return MessageType.file;
}

export function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/"))
    return <ImageIcon size={32} className="text-primary" />;
  if (mimeType.startsWith("video/"))
    return <Video size={32} className="text-primary" />;
  return <FileText size={32} className="text-primary" />;
}

/** Convert Uint8Array storage key bytes to hex string for backend storage */
function keyToString(key: Uint8Array): string {
  return Array.from(key)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function AttachmentUpload({
  conversationId,
  open,
  onClose,
  onMessageSent,
}: AttachmentUploadProps) {
  const { encryptForConv, getConversationKey } = useCrypto();
  const { backend, uploadBlob } = useBackend();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file);
    setError(null);
    setProgress(0);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !backend || !uploadBlob) return;
    const convKey = getConversationKey(conversationId.toString());
    if (!convKey) {
      setError("Encryption key not available. Cannot upload securely.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // Step 1: Read file bytes
      const arrayBuf = await selectedFile.arrayBuffer();
      setProgress(10);

      // Step 2: Encrypt client-side using AES-GCM directly so we have the
      //         three parts (iv, ciphertext, authTag) as separate typed arrays.
      //         This lets us build the Blob from [iv, ciphertext, authTag]
      //         exactly per the official DFINITY immutable object storage pattern.
      const IV_LEN = 12;
      const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
      const cipherBuf = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        convKey,
        arrayBuf,
      );
      // AES-GCM output = ciphertext + 16-byte auth tag concatenated.
      // We treat it as one "ciphertext" part because the Web Crypto API does
      // not separate them — authTag is embedded at the end.
      const ciphertextAndTag = new Uint8Array(cipherBuf);

      // Step 3: Build the final encrypted Blob from the three logical parts.
      //         new Blob([iv, ciphertext, authTag]) is the official DFINITY pattern.
      //         Blob internally concatenates them — no shared ArrayBuffer issues.
      const encryptedBlob = new Blob([iv, ciphertextAndTag], {
        type: "application/octet-stream",
      });

      console.log(
        "[EncryptedFile] Final encrypted blob size:",
        encryptedBlob.size,
      );

      // Step 4: Create a Blob URL from the encrypted Blob and pass it via
      //         ExternalBlob.fromURL() so the platform uploader fetches it
      //         directly — guaranteeing num_blob_bytes and chunk hashes are
      //         computed from the encrypted data, not the original file.
      const encryptedBlobUrl = URL.createObjectURL(encryptedBlob);

      const originalSize = arrayBuf.byteLength;
      const encryptedSize = encryptedBlob.size;
      console.log(
        `[EncryptedFile] Original size: ${originalSize} | Encrypted size: ${encryptedSize} | Building blob_tree with encrypted data`,
      );

      const externalBlob = ExternalBlob.fromURL(
        encryptedBlobUrl,
      ).withUploadProgress(
        (pct) => setProgress(25 + Math.round(pct * 0.4)), // 25–65%
      );

      // Step 5: We need to log what the platform will PUT — extract chunk info
      //         for logging before the upload call triggers the blob_tree build.
      //         The platform reads from encryptedBlobUrl, so num_blob_bytes = encryptedSize.
      //         Compute chunk count for logging only (platform does actual hashing).
      const CHUNK_SIZE = 1024 * 1024; // 1 MB (platform default)
      const chunkCount = Math.ceil(encryptedSize / CHUNK_SIZE) || 1;
      console.log(
        "[EncryptedFile] Sending blob_tree with num_blob_bytes =",
        encryptedSize,
        ", chunk count =",
        chunkCount,
      );

      const storageKeyBytes = await uploadBlob(externalBlob);
      // Revoke the temporary Blob URL to free memory.
      URL.revokeObjectURL(encryptedBlobUrl);
      const storageKey = keyToString(storageKeyBytes);
      setProgress(65);

      // Step 3: Encrypt file metadata as message content (used as fallback display)
      const metaText = JSON.stringify({
        name: selectedFile.name,
        size: selectedFile.size,
        mime: selectedFile.type,
      });
      const encryptedContent = await encryptForConv(
        conversationId.toString(),
        metaText,
      );
      if (!encryptedContent) throw new Error("Encryption failed");
      setProgress(75);

      // Step 4: Send the message (type = image/video/audio/file)
      const msgType = getMessageType(selectedFile.type);
      const msgResult = await backend.sendMessage({
        conversationId,
        encryptedContent,
        messageType: msgType,
      });
      if (msgResult.__kind__ === "err") throw new Error(msgResult.err);
      setProgress(85);

      // Step 5: Register the attachment with the real storageKey
      const msgId = msgResult.ok.id;
      const attachResult = await backend.registerAttachment({
        messageId: msgId,
        mimeType: selectedFile.type,
        encryptedSizeBytes: BigInt(encryptedSize),
        storageKey,
      });
      if (attachResult.__kind__ === "err") throw new Error(attachResult.err);
      setProgress(100);

      onClose();
      onMessageSent?.();
      setSelectedFile(null);
      setProgress(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [
    selectedFile,
    backend,
    uploadBlob,
    conversationId,
    encryptForConv,
    getConversationKey,
    onClose,
    onMessageSent,
  ]);

  const handleClose = useCallback(() => {
    if (uploading) return;
    setSelectedFile(null);
    setProgress(0);
    setError(null);
    onClose();
  }, [uploading, onClose]);

  const uploadLabel =
    progress < 25
      ? "Encrypting..."
      : progress < 65
        ? "Uploading..."
        : progress < 85
          ? "Saving message..."
          : "Registering...";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" data-ocid="attachment.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} className="text-primary" />
            Share File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <button
            type="button"
            tabIndex={0}
            onDrop={onDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            className={`relative w-full text-left border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-smooth ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/40"
            }`}
            data-ocid="attachment.dropzone"
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              data-ocid="attachment.upload_button"
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <FileIcon mimeType={selectedFile.type} />
                <div>
                  <p className="font-medium text-sm truncate max-w-[240px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    data-ocid="attachment.close_button"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload size={28} className="opacity-50" />
                <p className="text-sm font-medium">
                  Drop a file here or click to browse
                </p>
                <p className="text-xs opacity-70">
                  Images, videos, audio, documents up to 500MB
                </p>
              </div>
            )}
          </button>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{uploadLabel}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p
              className="text-xs text-destructive"
              data-ocid="attachment.error_state"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
              data-ocid="attachment.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              data-ocid="attachment.submit_button"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  {uploadLabel}
                </>
              ) : (
                "Send encrypted"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
