import type { Attachment, MessagePublic, UserProfilePublic } from "@/backend";
import { MessageType } from "@/backend";
import { PriorityMessageBadge } from "@/components/PriorityMessageBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useCrypto } from "@/context/crypto-context";
import { useBackend } from "@/hooks/use-backend";
import { getDisplayName, setLocalDisplayName } from "@/hooks/use-profiles";
import { decryptMessage, deriveDisplayNameKey } from "@/lib/crypto";
import {
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Timer,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MessageBubbleProps {
  message: MessagePublic;
  isMine: boolean;
  senderProfile?: UserProfilePublic;
  showAvatar: boolean;
  conversationId: string;
  myPrincipal: string;
  isGroup?: boolean;
  onReply?: (message: MessagePublic) => void;
  onDelete?: (messageId: bigint) => void;
}

export function MessageStatus({
  message,
  isMine,
  myPrincipal,
}: { message: MessagePublic; isMine: boolean; myPrincipal: string }) {
  if (!isMine) return null;
  const readCount = message.readBy.filter(
    (r) => r.userId.toText() !== myPrincipal,
  ).length;
  if (readCount > 0) {
    return (
      <CheckCheck
        size={14}
        className="text-primary flex-shrink-0"
        aria-label="Read"
      />
    );
  }
  if (message.readBy.length > 0) {
    return (
      <CheckCheck
        size={14}
        className="text-muted-foreground flex-shrink-0"
        aria-label="Delivered"
      />
    );
  }
  return (
    <Check
      size={14}
      className="text-muted-foreground flex-shrink-0"
      aria-label="Sent"
    />
  );
}

export function isExpired(msg: MessagePublic): boolean {
  if (!msg.ttlSeconds) return false;
  const sentMs = Number(msg.sentAt) / 1_000_000;
  const expiresMs = sentMs + Number(msg.ttlSeconds) * 1000;
  return Date.now() > expiresMs;
}

export function useDecryptedContent(
  message: MessagePublic,
  conversationId: string,
  _isMine: boolean,
) {
  const { decryptFromConv } = useCrypto();
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (message.messageType !== MessageType.text) return;
    if (isExpired(message)) {
      setFailed(false);
      setText(null);
      return;
    }

    let cancelled = false;

    // Retry loop: 2 total attempts (initial + 1 retry after 500ms).
    const RETRY_DELAYS = [0, 500]; // ms before each attempt
    let cumulativeDelay = 0;

    const attempts = RETRY_DELAYS.map((delay, index) => {
      cumulativeDelay += delay;
      return { attempt: index + 1, delay: cumulativeDelay };
    });

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const { attempt, delay } of attempts) {
      const t = setTimeout(async () => {
        if (cancelled) return;
        console.log(
          `[E2EE] useDecryptedContent: attempt ${attempt}/${attempts.length} for convId=${conversationId} msgId=${message.id}`,
        );
        // CRITICAL: Element-by-element copy — the ONLY safe way to produce a
        // Uint8Array with byteOffset=0 regardless of how the Candid decoder
        // allocated the source buffer.
        // CRITICAL: element-by-element copy into a fresh zero-offset buffer.
        // encryptedContent from Candid decoding may carry a hidden byteOffset
        // that causes IV extraction to read the wrong bytes.
        const raw = message.encryptedContent as unknown as {
          length: number;
          [i: number]: number;
        };
        const rawLen =
          (raw as unknown as Uint8Array).length ?? Object.keys(raw).length;
        const fresh = new Uint8Array(rawLen);
        const rawU8 = raw as unknown as Uint8Array;
        for (let i = 0; i < rawLen; i++) fresh[i] = rawU8[i];
        console.log(
          `[E2EE RECV] Received blob = ${fresh.length} bytes, extracted IV=12, ciphertext+tag=${fresh.length - 12} bytes (attempt ${attempt}/${attempts.length}), convId=${conversationId}`,
        );
        const result = await decryptFromConv(conversationId, fresh);
        if (cancelled) return;
        if (result !== null) {
          setText(result);
          setFailed(false);
          // Cancel remaining retries — success
          cancelled = true;
        } else if (attempt === attempts.length) {
          // All retries exhausted
          console.error(
            `[E2EE] useDecryptedContent: all ${attempts.length} attempts failed for convId=${conversationId} msgId=${message.id}`,
          );
          setFailed(true);
        }
      }, delay);
      timers.push(t);
    }

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [message, conversationId, decryptFromConv]);

  return { text, failed };
}

/** Parse encrypted metadata JSON from a non-text message's encryptedContent */
/** Parse encrypted metadata JSON from a non-text message's encryptedContent */
function useAttachmentMeta(
  message: MessagePublic,
  conversationId: string,
): { name?: string; size?: number; mime?: string; storageKey?: string } {
  const { decryptFromConv } = useCrypto();
  const [meta, setMeta] = useState<{
    name?: string;
    size?: number;
    mime?: string;
    storageKey?: string;
  }>({});

  useEffect(() => {
    if (message.messageType === MessageType.text) return;
    if (meta.name || meta.mime) return; // already resolved

    let cancelled = false;
    // Retry loop — key may not be ready yet when the message first renders.
    // Mirror the same pattern used by useDecryptedContent.
    const RETRY_DELAYS = [0, 500, 500, 1000, 2000];
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const delay of RETRY_DELAYS) {
      cumulative += delay;
      const t = setTimeout(async () => {
        if (cancelled) return;
        const raw = message.encryptedContent as unknown as Uint8Array;
        const fresh = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) fresh[i] = raw[i];
        const result = await decryptFromConv(conversationId, fresh);
        if (cancelled || !result) return;
        try {
          const parsed = JSON.parse(result) as {
            name?: string;
            size?: number;
            mime?: string;
            storageKey?: string;
          };
          setMeta(parsed);
          cancelled = true; // success — stop retrying
          if (parsed.storageKey) {
            console.log(
              `[E2EE FILE RECV] Metadata decoded: name=${parsed.name}, mime=${parsed.mime}, storageKey=${parsed.storageKey.slice(0, 12)}...`,
            );
          } else {
            console.log(
              `[E2EE FILE RECV] Metadata decoded (no inline storageKey — will use attachment record): name=${parsed.name}, mime=${parsed.mime}`,
            );
          }
        } catch {
          // not JSON — ignore
        }
      }, cumulative);
      timers.push(t);
    }

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [message, conversationId, decryptFromConv, meta.name, meta.mime]);

  return meta;
}

/** Convert hex storageKey string back to Uint8Array */
function hexToBytes(hex: string): Uint8Array {
  const len = hex.length;
  const bytes = new Uint8Array(Math.ceil(len / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Fetch, download from object-storage, and decrypt an attachment blob */
/** Fetch, download from object-storage, and decrypt an attachment blob */
function useAttachmentBlob(
  message: MessagePublic,
  conversationId: string,
  enabled: boolean,
  mimeType: string,
  metaStorageKey?: string,
) {
  const { backend, downloadBlob } = useBackend();
  const { getConversationKey } = useCrypto();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  // Tracks whether a fetch is already in-flight.
  const fetchingRef = useRef(false);
  // Tracks whether we have already successfully produced a URL (survives re-renders).
  const doneRef = useRef(false);

  // When metaStorageKey arrives (async — it comes from decrypted metadata),
  // reset the in-flight lock so the main effect can start a fresh download.
  useEffect(() => {
    if (metaStorageKey && !doneRef.current) {
      fetchingRef.current = false;
    }
  }, [metaStorageKey]);

  useEffect(() => {
    if (!enabled || !backend || !downloadBlob) return;
    if (message.messageType === MessageType.text) return;
    if (doneRef.current) return; // already succeeded — do not re-fetch

    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    // Retry loop: poll for the conversation key becoming available.
    const KEY_POLL_DELAYS = [0, 500, 1000, 2000, 3000];
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (
      let attemptIndex = 0;
      attemptIndex < KEY_POLL_DELAYS.length;
      attemptIndex++
    ) {
      const delay = KEY_POLL_DELAYS[attemptIndex];
      cumulative += delay;
      const t = setTimeout(async () => {
        if (cancelled || doneRef.current) return;

        const convKey = getConversationKey(conversationId);
        if (!convKey) {
          console.log(
            `[E2EE FILE RECV] Key not ready for convId=${conversationId}, will retry...`,
          );
          if (attemptIndex === KEY_POLL_DELAYS.length - 1) {
            // Last attempt — give up
            if (!cancelled) {
              setFetchError(true);
              setLoading(false);
            }
          }
          return;
        }

        if (fetchingRef.current) {
          console.log("[E2EE FILE RECV] fetchingRef already locked, skipping");
          return; // another timer already started the fetch
        }
        fetchingRef.current = true;

        try {
          // 1. Get attachment record from backend
          const attachments = await backend.getMessageAttachments(message.id);
          if (cancelled) return;

          let resolvedStorageKeyHex: string | null = null;

          if (attachments.length === 0) {
            // Attachment record not registered yet — try inline storageKey from metadata
            if (metaStorageKey) {
              console.log(
                "[E2EE FILE RECV] Using inline storageKey from metadata as fallback",
              );
              resolvedStorageKeyHex = metaStorageKey;
            } else {
              // Release the lock so a later retry timer can try again
              fetchingRef.current = false;
              console.log(
                `[E2EE FILE RECV] No attachment record yet (attempt ${attemptIndex + 1}/5), will retry`,
              );
              if (attemptIndex === KEY_POLL_DELAYS.length - 1) {
                console.warn(
                  `[E2EE FILE RECV] No attachment record found for msgId=${message.id} after all retries`,
                );
                if (!cancelled) setLoading(false);
              }
              return;
            }
          } else {
            const attachment: Attachment = attachments[0];
            resolvedStorageKeyHex = attachment.storageKey;
          }

          console.log(
            `[E2EE FILE RECV] Starting download attempt, storageKey from backend=${attachments.length > 0 ? `${resolvedStorageKeyHex?.slice(0, 12)}...` : "none"}, metaStorageKey=${metaStorageKey ? `${metaStorageKey.slice(0, 12)}...` : "none"}`,
          );

          // 2. Download encrypted blob from object-storage
          const keyBytes = hexToBytes(resolvedStorageKeyHex!);
          const externalBlob = await downloadBlob(keyBytes);
          if (cancelled) return;
          const rawBytes = await externalBlob.getBytes();
          console.log(
            `[E2EE FILE RECV] Downloaded encrypted blob: ${rawBytes.length} bytes`,
          );

          // CRITICAL: Element-by-element copy into a fresh zero-offset buffer
          // so IV slicing always starts at byte 0.
          const encryptedBytes = new Uint8Array(rawBytes.length);
          for (let i = 0; i < rawBytes.length; i++)
            encryptedBytes[i] = rawBytes[i];

          // 3. Decrypt using IV(12) + ciphertext+tag format
          const { decryptBlob } = await import("@/lib/crypto");
          const decryptedArrayBuffer = await decryptBlob(
            convKey,
            encryptedBytes,
          );
          if (cancelled) return;

          console.log(
            `[E2EE FILE RECV] Decrypted file: ${decryptedArrayBuffer.byteLength} bytes, mime=${mimeType}`,
          );

          // 4. Create Blob and object URL
          const blob = new Blob([new Uint8Array(decryptedArrayBuffer)], {
            type: mimeType || "application/octet-stream",
          });
          const url = URL.createObjectURL(blob);
          console.log("[E2EE FILE RECV] Created object URL for display");

          // Revoke any previous URL
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = url;

          // Mark done BEFORE setting state so a cleanup that fires synchronously
          // after setState does not accidentally skip the update.
          doneRef.current = true;

          // Update state — this must not be guarded by `cancelled` because we
          // already checked it above and the work is complete.
          setBlobUrl(url);
          setLoading(false);
          setFetchError(false);

          // Cancel any remaining retry timers now that we succeeded.
          cancelled = true;
          for (const t2 of timers) clearTimeout(t2);
        } catch (err) {
          console.error("[E2EE FILE RECV] Error during download/decrypt:", err);
          // Release the lock so a later retry timer can attempt again.
          fetchingRef.current = false;
          if (!cancelled && attemptIndex === KEY_POLL_DELAYS.length - 1) {
            setFetchError(true);
            setLoading(false);
          }
        }
      }, cumulative);
      timers.push(t);
    }

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      // Do NOT reset fetchingRef or doneRef here — we want them to persist
      // across fast re-mounts so we do not re-download an already-fetched file.
    };
  }, [
    enabled,
    backend,
    downloadBlob,
    message.id,
    message.messageType,
    conversationId,
    getConversationKey,
    mimeType,
    metaStorageKey,
  ]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  return { blobUrl, loading, fetchError };
}

/** Inline image thumbnail with click-to-expand */
function ImageAttachment({
  message,
  conversationId,
  meta,
}: {
  message: MessagePublic;
  conversationId: string;
  meta: { name?: string; size?: number; mime?: string; storageKey?: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const prevBlobUrlRef = useRef<string | null>(null);
  const { blobUrl, loading, fetchError } = useAttachmentBlob(
    message,
    conversationId,
    true,
    meta.mime ?? "application/octet-stream",
    meta.storageKey,
  );

  // Log when blobUrl transitions from null to a value (spinner replaced)
  useEffect(() => {
    if (blobUrl && !prevBlobUrlRef.current) {
      console.log("[FileUI] Replaced loading spinner with actual content");
    }
    prevBlobUrlRef.current = blobUrl;
  }, [blobUrl]);

  if (fetchError) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-70">
        <ImageIcon size={16} />
        <span>Failed to decrypt file</span>
      </div>
    );
  }

  if (loading || (!blobUrl && !fetchError)) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-70">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading image...</span>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-70">
        <ImageIcon size={16} />
        <span>{meta.name ?? "Image"}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="block rounded-lg overflow-hidden max-w-[200px] cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setExpanded(true)}
        aria-label="View full image"
        data-ocid="message.image_preview"
      >
        <img
          src={blobUrl}
          alt={meta.name ?? "Image attachment"}
          className="w-full h-auto object-cover"
          style={{ maxHeight: 160 }}
        />
      </button>
      {meta.name && (
        <p className="text-xs opacity-60 mt-1 truncate max-w-[200px]">
          {meta.name}
        </p>
      )}
      {/* Lightbox */}
      {expanded && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setExpanded(false)}
          aria-label="Close image"
          data-ocid="message.image_lightbox"
        >
          <img
            src={blobUrl}
            alt={meta.name ?? "Image attachment"}
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
          />
        </button>
      )}
    </>
  );
}

/** File/video/audio download button */
function FileAttachment({
  message,
  conversationId,
  meta,
}: {
  message: MessagePublic;
  conversationId: string;
  meta: { name?: string; size?: number; mime?: string; storageKey?: string };
}) {
  const prevBlobUrlRef = useRef<string | null>(null);
  const { blobUrl, loading, fetchError } = useAttachmentBlob(
    message,
    conversationId,
    true,
    meta.mime ?? "application/octet-stream",
    meta.storageKey,
  );

  // Log when blobUrl transitions from null to a value (spinner replaced)
  useEffect(() => {
    if (blobUrl && !prevBlobUrlRef.current) {
      console.log("[FileUI] Replaced loading spinner with actual content");
    }
    prevBlobUrlRef.current = blobUrl;
  }, [blobUrl]);

  const icon =
    message.messageType === MessageType.video ? (
      <Video size={16} />
    ) : message.messageType === MessageType.audio ? (
      <span className="text-base leading-none">🎤</span>
    ) : (
      <FileText size={16} />
    );

  const label =
    meta.name ??
    (message.messageType === MessageType.video
      ? "Video"
      : message.messageType === MessageType.audio
        ? "Voice note"
        : "File");

  if (fetchError) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-70">
        {icon}
        <span className="truncate max-w-[140px] opacity-90">{label}</span>
        <span className="text-xs opacity-50">Failed to decrypt file</span>
      </div>
    );
  }

  if (loading || (!blobUrl && !fetchError)) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-70">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="truncate max-w-[140px] opacity-90">{label}</span>
      {blobUrl ? (
        <a
          href={blobUrl}
          download={meta.name ?? label}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label={`Download ${label}`}
          data-ocid="message.download_button"
        >
          <Download size={14} />
        </a>
      ) : null}
    </div>
  );
}

export function MessageBubble({
  message,
  isMine,
  senderProfile,
  showAvatar,
  conversationId,
  myPrincipal,
  isGroup: _isGroup = false,
  onReply,
  onDelete,
}: MessageBubbleProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const { text, failed } = useDecryptedContent(message, conversationId, isMine);
  const meta = useAttachmentMeta(message, conversationId);
  const expired = isExpired(message);

  const sentMs = Number(message.sentAt) / 1_000_000;
  const timeStr = new Date(sentMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const senderPrincipalText = message.sender.toText();
  // Resolve sender display name: use localStorage cache, fall back to short principal
  const [senderDisplayName, setSenderDisplayName] = useState<string>(() =>
    getDisplayName(senderPrincipalText),
  );

  // When senderProfile arrives, decrypt their encryptedDisplayName and populate
  // the localStorage cache so the name is available instantly in future renders.
  useEffect(() => {
    if (!senderProfile || senderProfile.encryptedDisplayName.length === 0)
      return;
    let cancelled = false;
    (async () => {
      try {
        const key = await deriveDisplayNameKey(senderProfile.id);
        const decrypted = await decryptMessage(
          key,
          new Uint8Array(senderProfile.encryptedDisplayName).slice(0),
        );
        if (cancelled || !decrypted?.trim()) return;
        setLocalDisplayName(senderPrincipalText, decrypted);
        setSenderDisplayName(decrypted);
      } catch (err) {
        console.error(
          "[DisplayName] Failed to decrypt sender display name for",
          senderPrincipalText,
          err,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [senderProfile, senderPrincipalText]);

  const openContextMenu = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const y = "touches" in e ? e.touches[0].clientY : e.clientY;
      setContextPos({ x, y });
      setContextOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!contextOpen) return;
    const close = () => setContextOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextOpen]);

  const isHighPriority = message.priority === "high";

  const bubbleBg = isMine
    ? "bg-primary text-primary-foreground"
    : "bg-card text-card-foreground border border-border";

  const isAttachment =
    message.messageType !== MessageType.text && !message.isDeleted && !expired;

  return (
    <div
      className={`flex items-end gap-2 group ${
        isMine ? "flex-row-reverse" : "flex-row"
      } ${showAvatar ? "mt-2" : "mt-0.5"}`}
      data-ocid={`message.item.${message.id}`}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {showAvatar && !isMine && (
          <UserAvatar
            principal={senderPrincipalText}
            displayName={
              senderDisplayName !== senderPrincipalText
                ? senderDisplayName
                : undefined
            }
            avatarUrl={(() => {
              try {
                return (
                  localStorage.getItem(`cs_avatar:${senderPrincipalText}`) ??
                  undefined
                );
              } catch {
                return undefined;
              }
            })()}
            size={30}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`relative max-w-[70%] min-w-0 ${
          isMine ? "items-end" : "items-start"
        } flex flex-col`}
        onContextMenu={openContextMenu}
      >
        {/* Sender name label — shown whenever a display name is known (group or direct) */}
        {!isMine && showAvatar && senderDisplayName.length > 0 && (
          <span className="text-[11px] font-medium text-muted-foreground mb-0.5 px-1 truncate max-w-full">
            {senderDisplayName}
          </span>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2.5 shadow-message break-words ${
            isMine ? "rounded-br-sm" : "rounded-bl-sm"
          } ${bubbleBg}`}
        >
          {expired ? (
            <div className="flex items-center gap-1.5 text-xs opacity-60 italic">
              <Timer size={12} />
              <span>Message expired</span>
            </div>
          ) : message.isDeleted ? (
            <span className="text-xs italic opacity-60">Message deleted</span>
          ) : message.messageType === MessageType.text ? (
            failed ? (
              <span className="text-xs italic opacity-60">
                Unable to decrypt
              </span>
            ) : text === null ? (
              <Loader2 size={14} className="animate-spin opacity-40" />
            ) : (
              <span className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {text}
              </span>
            )
          ) : isAttachment && message.messageType === MessageType.image ? (
            <ImageAttachment
              message={message}
              conversationId={conversationId}
              meta={meta}
            />
          ) : isAttachment ? (
            <FileAttachment
              message={message}
              conversationId={conversationId}
              meta={meta}
            />
          ) : null}
        </div>

        {/* Meta row: time + status + TTL */}
        <div
          className={`flex items-center gap-1 mt-0.5 px-1 ${
            isMine ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {isHighPriority && <PriorityMessageBadge />}
          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
          {message.ttlSeconds && !expired && (
            <Timer
              size={10}
              className="text-muted-foreground"
              aria-label={`Disappears in ${message.ttlSeconds}s`}
            />
          )}
          <MessageStatus
            message={message}
            isMine={isMine}
            myPrincipal={myPrincipal}
          />
        </div>
      </div>

      {/* Context menu */}
      {contextOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[140px] bg-popover border border-border rounded-lg shadow-elevated py-1 text-sm"
          style={{ left: contextPos.x, top: contextPos.y }}
          data-ocid="message.dropdown_menu"
        >
          {onReply && (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors"
              onClick={() => {
                onReply(message);
                setContextOpen(false);
              }}
              data-ocid="message.reply_button"
            >
              Reply
            </button>
          )}
          {isMine && onDelete && (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => {
                onDelete(message.id);
                setContextOpen(false);
              }}
              data-ocid="message.delete_button"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
