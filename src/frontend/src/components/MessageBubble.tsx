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

/** Fetch, download from object-storage, and decrypt an attachment blob */
/** Fetch, download from object-storage, and decrypt an attachment blob */
function useAttachmentBlob(
  message: MessagePublic,
  conversationId: string,
  enabled: boolean,
  mimeType: string,
  metaStorageKey?: string,
  retryKey = 0,
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
  // Tracks whether the blob has been decrypted and the object URL created.
  // Once true, never reset — prevents duplicate download attempts after success.
  const decryptedRef = useRef(false);

  // When metaStorageKey arrives (async — it comes from decrypted metadata),
  // reset the in-flight lock so the main effect can start a fresh download.
  useEffect(() => {
    if (metaStorageKey && !doneRef.current && !decryptedRef.current) {
      fetchingRef.current = false;
    }
  }, [metaStorageKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryKey is a primitive prop used intentionally as a reset trigger
  useEffect(() => {
    // CRITICAL GUARD: If we have already successfully decrypted this file,
    // never re-enter the download pipeline regardless of why the effect fired.
    // metaStorageKey is in the dependency array and arrives async — without this
    // guard the effect would reset decryptedRef/blobUrl on every metadata update,
    // wiping out a completed download and showing the spinner again.
    if (decryptedRef.current) {
      console.log(
        "[E2EE FILE RECV] Already decrypted — skipping re-run of download effect",
      );
      return;
    }

    fetchingRef.current = false;
    doneRef.current = false;
    // decryptedRef is reset on retryKey change so a manual retry can re-download.
    decryptedRef.current = false;

    if (!enabled || !backend || !downloadBlob) return;
    if (message.messageType === MessageType.text) return;

    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    setBlobUrl(null);

    // Retry loop: poll for the conversation key becoming available.
    // Cap at 2 attempts maximum to prevent infinite loops.
    const KEY_POLL_DELAYS = [0, 1500];
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

        if (fetchingRef.current || decryptedRef.current) {
          console.log(
            decryptedRef.current
              ? "[E2EE FILE RECV] Already decrypted, skipping duplicate download"
              : "[E2EE FILE RECV] fetchingRef already locked, skipping",
          );
          return; // another timer already started the fetch, or already successfully done
        }
        fetchingRef.current = true;
        console.log(
          `[E2EE FILE RECV] Starting download for storageKey=${
            metaStorageKey ? `${metaStorageKey.slice(0, 16)}...` : "pending"
          }`,
        );

        // MANDATORY: try/finally ensures fetchingRef is ALWAYS released on every
        // exit path — success, thrown error, and early returns inside the async
        // work. Without this, a cancelled check or any thrown error permanently
        // locks fetchingRef, making every future render skip with
        // "fetchingRef already locked, skipping".
        try {
          // 1. Get attachment record from backend
          const attachments = await backend.getMessageAttachments(message.id);
          if (cancelled) return;

          // ── Storage-key selection ────────────────────────────────────────
          // The backend attachment record may carry a full blob-tree / certificate
          // (~59 k chars) instead of the short sha256:... key (~71 chars). Any key
          // longer than 200 characters is invalid for the download endpoint and will
          // produce an HTTP 400. Always prefer the shortest available key that is
          // under 200 characters.
          const MAX_KEY_LEN = 200;

          // Candidate A: key stored in the backend Attachment record.
          const backendKey: string | null =
            attachments.length > 0
              ? (attachments[0] as Attachment).storageKey
              : null;
          // Candidate B: key decoded inline from the encrypted message metadata.
          const inlineKey: string | null = metaStorageKey ?? null;

          const backendKeyLen = backendKey?.length ?? 0;
          const inlineKeyLen = inlineKey?.length ?? 0;

          console.log(
            `[E2EE FILE RECV] Available keys - short: ${backendKeyLen}, meta: ${inlineKeyLen}`,
          );

          // Discard any key longer than 200 chars — it is a tree/certificate blob.
          const candidateA =
            backendKey && backendKey.length <= MAX_KEY_LEN ? backendKey : null;
          const candidateB =
            inlineKey && inlineKey.length <= MAX_KEY_LEN ? inlineKey : null;

          // Selection priority:
          // 1. Prefer whichever candidate starts with 'sha256:' and has length 20-200.
          // 2. If neither starts with 'sha256:', fall back to the shorter valid candidate under 200.
          // 3. If short key is empty or length < 20, fall back to metaStorageKey (inlineKey / candidateB).
          function isShortKey(k: string | null): k is string {
            if (k == null) return false;
            return (
              k.startsWith("sha256:") &&
              k.length >= 20 &&
              k.length <= MAX_KEY_LEN
            );
          }

          let resolvedStorageKeyHex: string | null = null;
          if (isShortKey(candidateA)) {
            resolvedStorageKeyHex = candidateA;
          } else if (isShortKey(candidateB)) {
            resolvedStorageKeyHex = candidateB;
          } else {
            const a = candidateA as string | null;
            const b = candidateB as string | null;
            if (a && a.length >= 20) {
              // Neither starts with 'sha256:' — pick shorter valid candidate.
              resolvedStorageKeyHex =
                b && b.length >= 20 ? (a.length <= b.length ? a : b) : a;
            } else {
              // Short key (candidateA) is empty or too short — fall back to inlineKey.
              resolvedStorageKeyHex = b && b.length >= 20 ? b : null;
            }
          }

          if (!resolvedStorageKeyHex) {
            // No valid short key available from either source.
            if (attachments.length === 0) {
              console.log(
                `[E2EE FILE RECV] No attachment record yet (attempt ${
                  attemptIndex + 1
                }/${KEY_POLL_DELAYS.length}), will retry`,
              );
            } else {
              console.warn(
                `[E2EE FILE RECV] Both keys exceed 200 chars — backendKey=${backendKeyLen}, inlineKey=${inlineKeyLen}. Cannot download.`,
              );
            }
            if (attemptIndex === KEY_POLL_DELAYS.length - 1) {
              console.warn(
                `[E2EE FILE RECV] No valid short storageKey found for msgId=${message.id} after all retries`,
              );
              if (!cancelled) {
                setFetchError(true);
                setLoading(false);
              }
            }
            return; // finally will release fetchingRef
          }

          console.log(
            `[E2EE FILE RECV] Selected final storageKey (length: ${resolvedStorageKeyHex.length}): ${resolvedStorageKeyHex}`,
          );

          // 2. Download encrypted blob from object-storage via GET
          const storageKey = resolvedStorageKeyHex;
          let encryptedBytes: Uint8Array;
          try {
            // downloadBlob takes the string key directly — no hex conversion needed
            encryptedBytes = await downloadBlob(storageKey);
          } catch (fetchErr) {
            const errMsg =
              fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            console.error(
              `[E2EE FILE RECV] Fetch failed: ${errMsg} storageKey=${storageKey.slice(0, 16)}...`,
            );
            // If the error is non-retriable (e.g. HTTP 400 — invalid key),
            // break all remaining retry timers immediately.
            if (
              fetchErr &&
              typeof (fetchErr as Record<string, unknown>).nonRetriable ===
                "boolean" &&
              (fetchErr as Record<string, unknown>).nonRetriable === true
            ) {
              console.error(
                "[E2EE FILE RECV] Non-retriable error — aborting all retries.",
              );
              cancelled = true;
              for (const t2 of timers) clearTimeout(t2);
              if (!cancelled) {
                setFetchError(true);
                setLoading(false);
              }
              // Set state explicitly since cancelled is now true
              setFetchError(true);
              setLoading(false);
            }
            throw fetchErr; // re-throw so the outer catch/finally runs
          }
          if (cancelled) return;
          console.log(
            `[E2EE FILE RECV] Downloaded raw encrypted data: ${encryptedBytes.length} bytes`,
          );

          // 3. Decrypt using IV(12) + ciphertext+tag format.
          // encryptedBytes is already a fresh zero-offset buffer from downloadBlob.
          const { decryptBlob } = await import("@/lib/crypto");
          const decryptedArrayBuffer = await decryptBlob(
            convKey,
            encryptedBytes,
          );
          if (cancelled) return;

          console.log(
            `[E2EE FILE RECV] Decrypted successfully: ${decryptedArrayBuffer.byteLength} bytes`,
          );

          // 4. Create Blob with original mimeType and generate object URL
          const blob = new Blob([new Uint8Array(decryptedArrayBuffer)], {
            type: mimeType || "application/octet-stream",
          });
          const url = URL.createObjectURL(blob);
          console.log("[E2EE FILE RECV] Created object URL for display");

          // Revoke any previous URL
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = url;

          // Mark decryptedRef immediately after object URL is created, BEFORE setState,
          // so any concurrent effect timer sees it and skips a duplicate download.
          // Never reset decryptedRef except on an explicit retry (retryKey change).
          decryptedRef.current = true;

          // Update state — setBlobUrl then setLoading(false) called together so React
          // batches them into a single re-render that shows the file content.
          // doneRef is set AFTER setState calls so React's batching does not see
          // the ref as done before the state update lands.
          setBlobUrl(url);
          setLoading(false);
          setFetchError(false);
          console.log(
            "[E2EE FILE RECV] UI Update: Successfully replaced spinner with file content",
          );

          // Mark doneRef after setState so the render triggered by setState completes
          // before doneRef gates any future guard checks.
          doneRef.current = true;

          console.log(
            `[E2EE FILE RECV] Download succeeded for storageKey=${storageKey.slice(0, 16)}...`,
          );

          // Cancel any remaining retry timers now that we succeeded.
          cancelled = true;
          for (const t2 of timers) clearTimeout(t2);
        } catch (err) {
          console.error("[E2EE FILE RECV] Error during download/decrypt:", err);
          if (!cancelled) {
            // Show error and stop after any failed attempt — the retry button
            // lets the user manually trigger a fresh attempt.
            setFetchError(true);
            setLoading(false);
          }
        } finally {
          // MANDATORY finally block: unconditionally release the fetchingRef lock
          // on EVERY exit path — success, thrown error, and returns inside the try.
          // This prevents "fetchingRef already locked, skipping" on every render
          // after a failed or cancelled download.
          fetchingRef.current = false;
        }
      }, cumulative);
      timers.push(t);
    }

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      // Do NOT reset fetchingRef or doneRef here — the top of the next
      // effect run will reset them if retryKey changed.
    };
  }, [
    // retryKey triggers a full re-run and ref reset when the user taps "retry".
    retryKey,
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
  const [retryCount, setRetryCount] = useState(0);
  const prevBlobUrlRef = useRef<string | null>(null);
  const { blobUrl, loading, fetchError } = useAttachmentBlob(
    message,
    conversationId,
    true,
    meta.mime ?? "application/octet-stream",
    meta.storageKey,
    retryCount,
  );

  // Log when blobUrl transitions from null to a value (spinner replaced with file content)
  useEffect(() => {
    if (blobUrl && !prevBlobUrlRef.current) {
      console.log("[FileUI] Replaced loading spinner with actual content");
      console.log(
        "[FileUI] Final render: Displaying decrypted file with object URL",
      );
    }
    prevBlobUrlRef.current = blobUrl;
  }, [blobUrl]);

  if (fetchError) {
    return (
      <button
        type="button"
        className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        onClick={() => setRetryCount((c) => c + 1)}
        aria-label="Retry loading image"
        data-ocid="message.image_retry_button"
      >
        <ImageIcon size={16} />
        <span>Failed to load — tap to retry</span>
      </button>
    );
  }

  if (loading) {
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
  const [retryCount, setRetryCount] = useState(0);
  const prevBlobUrlRef = useRef<string | null>(null);
  const { blobUrl, loading, fetchError } = useAttachmentBlob(
    message,
    conversationId,
    true,
    meta.mime ?? "application/octet-stream",
    meta.storageKey,
    retryCount,
  );

  // Log when blobUrl transitions from null to a value (spinner replaced with file content)
  useEffect(() => {
    if (blobUrl && !prevBlobUrlRef.current) {
      console.log("[FileUI] Replaced loading spinner with actual content");
      console.log(
        "[FileUI] Final render: Displaying decrypted file with object URL",
      );
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
      <button
        type="button"
        className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        onClick={() => setRetryCount((c) => c + 1)}
        aria-label={`Retry loading ${label}`}
        data-ocid="message.file_retry_button"
      >
        {icon}
        <span className="truncate max-w-[140px] opacity-90">{label}</span>
        <span className="text-xs opacity-50">
          Failed to load — tap to retry
        </span>
      </button>
    );
  }

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
            isMine ? (
              <span className="flex items-center gap-1.5 text-sm opacity-90">
                <CheckCheck size={14} />
                File delivered{meta?.name ? `: ${meta.name}` : ""}
              </span>
            ) : (
              <ImageAttachment
                message={message}
                conversationId={conversationId}
                meta={meta}
              />
            )
          ) : isAttachment ? (
            isMine ? (
              <span className="flex items-center gap-1.5 text-sm opacity-90">
                <CheckCheck size={14} />
                File delivered{meta?.name ? `: ${meta.name}` : ""}
              </span>
            ) : (
              <FileAttachment
                message={message}
                conversationId={conversationId}
                meta={meta}
              />
            )
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
