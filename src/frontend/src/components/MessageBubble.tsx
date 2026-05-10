import type { Attachment, MessagePublic, UserProfilePublic } from "@/backend";
import { MessageType } from "@/backend";
import { PriorityMessageBadge } from "@/components/PriorityMessageBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useCrypto } from "@/context/crypto-context";
import { useBackend } from "@/hooks/use-backend";
import { getDisplayName } from "@/hooks/use-profiles";
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
    decryptFromConv(conversationId, message.encryptedContent).then((result) => {
      if (result === null) setFailed(true);
      else {
        setText(result);
        setFailed(false);
      }
    });
  }, [message, conversationId, decryptFromConv]);

  return { text, failed };
}

/** Parse encrypted metadata JSON from a non-text message's encryptedContent */
function useAttachmentMeta(
  message: MessagePublic,
  conversationId: string,
): { name?: string; size?: number; mime?: string } {
  const { decryptFromConv } = useCrypto();
  const [meta, setMeta] = useState<{
    name?: string;
    size?: number;
    mime?: string;
  }>({});

  useEffect(() => {
    if (message.messageType === MessageType.text) return;
    decryptFromConv(conversationId, message.encryptedContent).then((result) => {
      if (!result) return;
      try {
        const parsed = JSON.parse(result) as {
          name?: string;
          size?: number;
          mime?: string;
        };
        setMeta(parsed);
      } catch {
        // not JSON — ignore
      }
    });
  }, [message, conversationId, decryptFromConv]);

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
function useAttachmentBlob(
  message: MessagePublic,
  conversationId: string,
  enabled: boolean,
) {
  const { backend, downloadBlob } = useBackend();
  const { getConversationKey } = useCrypto();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !backend || !downloadBlob) return;
    if (message.messageType === MessageType.text) return;
    const convKey = getConversationKey(conversationId);
    if (!convKey) return;

    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    (async () => {
      try {
        // 1. Get attachment record from backend
        const attachments = await backend.getMessageAttachments(message.id);
        if (cancelled || attachments.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }
        const attachment: Attachment = attachments[0];

        // 2. Download encrypted blob from object-storage
        const keyBytes = hexToBytes(attachment.storageKey);
        const externalBlob = await downloadBlob(keyBytes);
        const encryptedBytes = await externalBlob.getBytes();

        // 3. Decrypt blob client-side
        const { decryptBlob } = await import("@/lib/crypto");
        const decrypted = await decryptBlob(convKey, encryptedBytes);

        if (cancelled) return;

        // 4. Create an object URL for display/download
        const blob = new Blob([decrypted], { type: attachment.mimeType });
        const url = URL.createObjectURL(blob);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    backend,
    downloadBlob,
    message.id,
    message.messageType,
    conversationId,
    getConversationKey,
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
  meta: { name?: string; size?: number };
}) {
  const [expanded, setExpanded] = useState(false);
  const { blobUrl, loading, fetchError } = useAttachmentBlob(
    message,
    conversationId,
    true,
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-70">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading image...</span>
      </div>
    );
  }

  if (fetchError || !blobUrl) {
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
  meta: { name?: string; size?: number; mime?: string };
}) {
  const { blobUrl, loading, fetchError } = useAttachmentBlob(
    message,
    conversationId,
    true,
  );

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

  if (loading) {
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
      {blobUrl && !fetchError ? (
        <a
          href={blobUrl}
          download={meta.name ?? label}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label={`Download ${label}`}
          data-ocid="message.download_button"
        >
          <Download size={14} />
        </a>
      ) : fetchError ? (
        <span className="text-xs opacity-50">Unavailable</span>
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
  isGroup = false,
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
  const senderInitial = senderProfile
    ? senderProfile.id.toText()
    : senderPrincipalText;
  // Resolve sender display name: use localStorage cache, fall back to short principal
  const senderDisplayName = getDisplayName(senderPrincipalText);

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
          <UserAvatar principal={senderInitial} size={30} aria-hidden="true" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`relative max-w-[70%] min-w-0 ${
          isMine ? "items-end" : "items-start"
        } flex flex-col`}
        onContextMenu={openContextMenu}
      >
        {/* Sender name label (group chats only, non-self messages) */}
        {isGroup && !isMine && showAvatar && (
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
