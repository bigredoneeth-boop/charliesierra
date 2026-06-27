import type { Attachment, MessagePublic, UserProfilePublic } from "@/backend";
import { MessageType } from "@/backend";
import { PriorityMessageBadge } from "@/components/PriorityMessageBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useCrypto } from "@/context/crypto-context";
import { useBackend } from "@/hooks/use-backend";
import { getDisplayName, setLocalDisplayName } from "@/hooks/use-profiles";
import { decryptMessage, deriveDisplayNameKey } from "@/lib/crypto";
import { getDecryptionStatus, setDecryptedFile } from "@/lib/decryption-cache";
import { getDecryptedMessageSync } from "@/lib/decryption-cache";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  Download,
  Edit,
  FileText,
  ImageIcon,
  Loader2,
  MessageSquare,
  Pin,
  Reply,
  Smile,
  Timer,
  Trash,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ReplyToInfo {
  messageId: bigint;
  senderName: string;
  content: string;
}

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
  onReaction?: (messageId: bigint, emoji: string) => void;
  onEdit?: (messageId: bigint) => void;
  onPin?: (messageId: bigint) => void;
  isPinned?: boolean;
  onThread?: (messageId: bigint) => void;
  threadCount?: number;
  onResend?: (messageId: bigint) => void;
  isFailed?: boolean;
  isSending?: boolean;
  showTimestamp?: boolean;
  isLastMessage?: boolean;
  onScrollToMessage?: (messageId: bigint) => void;
  onRekey?: () => Promise<{ success: boolean; error?: string }>;
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

function useDecryptedContent(
  msg: MessagePublic,
  conversationId: string,
  onRekey: (() => void) | undefined,
) {
  const { decryptFromConv, isKeyReady } = useCrypto();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStaleKeyButton, setShowStaleKeyButton] = useState(false);
  const [isRekeying, setIsRekeying] = useState(false);
  const [rekeyError, setRekeyError] = useState<string | null>(null);
  const [isPermanentlyUnreadable, setIsPermanentlyUnreadable] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const hasTriggeredRekey = useRef(false);
  // Ref to track cancellation across async boundaries for event handlers
  const cancelledRef = useRef(false);
  // CRITICAL: contentRef tracks the latest plaintext across all async
  // boundaries. If a concurrent decryptionSuccess event fires and sets content,
  // a stale effect run that later fails MUST NOT overwrite content with an
  // error. We check contentRef before setting any error state.
  const contentRef = useRef<string | null>(null);

  const msgId = msg.id.toString();

  // ── SYNCHRONOUS CACHE CHECK ON MOUNT ────────────────────────────────────────
  // Before any async work, check the in-memory cache synchronously. If we have
  // a hit, set content immediately and skip the async effect entirely. This
  // prevents "Decrypting..." flicker and "Permanently Unreadable" from ever
  // shadowing a successful cache hit on remount.
  const [cacheChecked, setCacheChecked] = useState(false);
  if (!cacheChecked) {
    const raw = msg.encryptedContent as unknown as Uint8Array;
    if (!raw || raw.length === 0) {
      setContent("");
      setCacheChecked(true);
    } else {
      const fresh = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) fresh[i] = raw[i];
      const cached = getDecryptedMessageSync(conversationId, msgId, fresh);
      if (cached !== null) {
        console.log(
          `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId} (sync cache hit on mount)`,
        );
        contentRef.current = cached;
        setContent(cached);
        setError(null);
        setIsPermanentlyUnreadable(false);
        setShowStaleKeyButton(false);
        setCacheChecked(true);
      } else {
        setCacheChecked(true);
      }
    }
  }

  // Listen for external signals that the key is ready, rekey completed, or
  // another message bubble successfully decrypted and cached this message.
  useEffect(() => {
    const handleKeyReady = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId: string }>;
      if (customEvent.detail?.conversationId === conversationId) {
        console.log(
          `[E2EE KEY] useDecryptedContent received keyReady for convId=${conversationId}, triggering retry`,
        );
        setRetryVersion((v) => v + 1);
      }
    };
    const handleRekeyComplete = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId: string }>;
      if (customEvent.detail?.conversationId === conversationId) {
        console.log(
          `[E2EE REKEY] useDecryptedContent received rekey:complete for convId=${conversationId}, triggering retry`,
        );
        setRetryVersion((v) => v + 1);
      }
    };
    const handleDecryptionSuccess = (e: Event) => {
      const customEvent = e as CustomEvent<{
        conversationId: string;
        msgId: string;
        plaintext: string;
      }>;
      if (
        customEvent.detail?.conversationId === conversationId &&
        customEvent.detail?.msgId === msgId
      ) {
        console.log(
          `[E2EE DECRYPT SUCCESS] useDecryptedContent received decryptionSuccess for msgId=${msgId}, updating UI`,
        );
        if (!cancelledRef.current) {
          contentRef.current = customEvent.detail.plaintext;
          setContent(customEvent.detail.plaintext);
          setError(null);
          setIsPermanentlyUnreadable(false);
          setShowStaleKeyButton(false);
        }
      }
    };
    window.addEventListener("keyReady", handleKeyReady);
    window.addEventListener("rekey:complete", handleRekeyComplete);
    window.addEventListener("decryptionSuccess", handleDecryptionSuccess);
    return () => {
      window.removeEventListener("keyReady", handleKeyReady);
      window.removeEventListener("rekey:complete", handleRekeyComplete);
      window.removeEventListener("decryptionSuccess", handleDecryptionSuccess);
    };
  }, [conversationId, msgId]);

  const isKeyReadyRef = useRef(isKeyReady);
  useEffect(() => {
    isKeyReadyRef.current = isKeyReady;
  }, [isKeyReady]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryVersion is a primitive reset trigger; encryptedContent is read inside the effect via msg.encryptedContent to avoid Uint8Array reference churn
  useEffect(() => {
    // If the synchronous mount check already found cached plaintext, skip
    // the entire async effect. The cache hit was handled during render.
    if (contentRef.current !== null) {
      console.log(
        `[E2EE DECRYPT SKIP] async effect skipped for msgId=${msgId} — sync cache hit already set content`,
      );
      return;
    }

    let cancelled = false;
    cancelledRef.current = false;
    // Track the current effect generation so stale async results don't overwrite
    // newer successful results.  Each effect run gets a fresh generation number.
    const myGeneration = Date.now() + Math.random();
    const generationRef = { current: myGeneration };

    async function decrypt() {
      // Read encryptedContent from the message object directly (via closure)
      // rather than from a ref — the closure captures the value at effect-run time.
      const raw = msg.encryptedContent as unknown as Uint8Array;
      if (!raw || raw.length === 0) {
        if (!cancelled) setContent("");
        return;
      }

      // Reset error/unreadable state at the start of every decrypt attempt.
      // This ensures that a retry (triggered by retryVersion or keyReady)
      // clears any stale "Permanently Unreadable" from a previous run.
      if (!cancelled) {
        setError(null);
        setIsPermanentlyUnreadable(false);
        setShowStaleKeyButton(false);
      }

      // Check local plaintext cache FIRST before any status checks.
      // If we have cached plaintext, display it immediately and skip all
      // decrypt work. This prevents "Permanently Unreadable" from ever
      // shadowing a successful cache hit.
      const fresh = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) fresh[i] = raw[i];
      const { getDecryptedMessage } = await import("@/lib/decryption-cache");
      const cachedPlaintext = await getDecryptedMessage(
        conversationId,
        msgId,
        fresh,
      );
      if (cachedPlaintext) {
        if (!cancelled && generationRef.current === myGeneration) {
          console.log(
            `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId} (async cache hit in useDecryptedContent)`,
          );
          contentRef.current = cachedPlaintext;
          setContent(cachedPlaintext);
          setError(null);
          setIsPermanentlyUnreadable(false);
          setShowStaleKeyButton(false);
        }
        return;
      }

      // Wait for key to be ready before attempting decrypt
      const maxWait = 30; // 3 seconds (100ms * 30)
      let waited = 0;
      while (!isKeyReadyRef.current(conversationId) && waited < maxWait) {
        await new Promise((r) => setTimeout(r, 100));
        waited++;
      }

      if (!isKeyReadyRef.current(conversationId)) {
        console.log(
          `[E2EE] useDecryptedContent: key not ready for convId=${conversationId} after wait`,
        );
        if (!cancelled && generationRef.current === myGeneration) {
          setError("Key not ready");
          setShowStaleKeyButton(true);
        }
        return;
      }

      try {
        const decrypted = await decryptFromConv(conversationId, fresh, msgId);

        // After decryptFromConv returns, double-check the cache in case a
        // concurrent call (from a different MessageBubble or a previous effect
        // run that was "cancelled") succeeded and cached the plaintext.
        const postCache = await getDecryptedMessage(
          conversationId,
          msgId,
          fresh,
        );
        const finalDecrypted = postCache ?? decrypted;

        if (cancelled || generationRef.current !== myGeneration) return;

        if (finalDecrypted === null) {
          // Check if it was marked permanently unreadable by decryptFromConv.
          // CRITICAL: do one final cache check in case a concurrent success
          // event wrote to the cache between decryptFromConv returning and now.
          const finalCacheCheck = await getDecryptedMessage(
            conversationId,
            msgId,
            fresh,
          );
          if (finalCacheCheck) {
            console.log(
              `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId} (final cache check after decryptFromConv null)`,
            );
            contentRef.current = finalCacheCheck;
            setContent(finalCacheCheck);
            setError(null);
            setIsPermanentlyUnreadable(false);
            setShowStaleKeyButton(false);
            return;
          }

          // CRITICAL RACE FIX: If a concurrent decryptionSuccess event already
          // populated contentRef with plaintext, do NOT overwrite it with an
          // error. The event handler fires independently of this effect run.
          if (contentRef.current !== null) {
            console.log(
              `[E2EE DECRYPT RACE GUARD] contentRef already has plaintext for msgId=${msgId}, skipping error set`,
            );
            return;
          }

          const finalStatus = await getDecryptionStatus(conversationId, msgId);
          if (finalStatus === "permanently-unreadable") {
            setIsPermanentlyUnreadable(true);
            setError("Permanently unreadable (previous key rotated)");
            setShowStaleKeyButton(false);
          } else {
            setError("Unable to decrypt");
            setShowStaleKeyButton(true);
          }
        } else {
          // SUCCESS PATH: plaintext returned and/or cached.
          // Always update contentRef so race-guard checks in later runs see it.
          contentRef.current = finalDecrypted;
          setContent(finalDecrypted);
          setError(null);
          setIsPermanentlyUnreadable(false);
          setShowStaleKeyButton(false);
          console.log(
            `[E2EE DECRYPT SUCCESS] displaying messageId=${msgId} convId=${conversationId} (decryptFromConv success path)`,
          );
        }
      } catch (err) {
        if (cancelled || generationRef.current !== myGeneration) return;
        console.error(
          `[E2EE] useDecryptedContent error for convId=${conversationId}:`,
          err,
        );
        setError("Decryption error");
        setShowStaleKeyButton(true);
      }
    }

    decrypt();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      // Increment generation so any in-flight async work from this run knows
      // it is stale and won't overwrite state set by a newer effect run.
      generationRef.current = -1;
    };
  }, [conversationId, decryptFromConv, msgId, retryVersion]);

  const handleRekey = async () => {
    if (hasTriggeredRekey.current) {
      console.log(
        `[E2EE REKEY] Already triggered rekey for msgId=${msg.id}, skipping`,
      );
      return;
    }
    hasTriggeredRekey.current = true;
    setIsRekeying(true);
    setRekeyError(null);

    try {
      if (!onRekey) {
        throw new Error("Rekey handler not available");
      }
      await onRekey();
      setIsRekeying(false);
      // After rekey, the parent should trigger a re-decrypt of all messages
    } catch (err) {
      console.error(
        `[E2EE REKEY] MessageBubble rekey error for convId=${conversationId}:`,
        err,
      );
      setRekeyError(err instanceof Error ? err.message : "Rekey failed");
      setIsRekeying(false);
      // After one failed attempt, permanently mark as unreadable
      setShowStaleKeyButton(false);
      setError("Unreadable (key rotated)");
    }
  };

  return {
    content,
    error,
    showStaleKeyButton,
    isRekeying,
    rekeyError,
    handleRekey,
    hasTriggeredRekey: hasTriggeredRekey.current,
    isPermanentlyUnreadable,
  };
}

/** Parse encrypted metadata JSON from a non-text message's encryptedContent */
/** Parse encrypted metadata JSON from a non-text message's encryptedContent */
function _useAttachmentMeta(
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
  const { getConversationKey, getDecryptedFileWithCache } = useCrypto();
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
          let blob: Blob;
          let url: string;

          const attachmentRecord =
            attachments.length > 0 ? (attachments[0] as Attachment) : null;
          const originalFileName = metaStorageKey || "unknown";
          // Attachment interface has no fileName field; use metaStorageKey or "unknown"
          // Attachment interface has no fileName field; use metaStorageKey or "unknown"
          // originalFileName already set above
          // originalFileName already set above

          if (attachmentRecord?.storageKey && getDecryptedFileWithCache) {
            const cachedBlob = await getDecryptedFileWithCache(
              attachmentRecord.storageKey,
              encryptedBytes,
              mimeType || "application/octet-stream",
              conversationId,
              convKey,
              originalFileName,
            );
            if (cachedBlob) {
              blob = cachedBlob;
              url = URL.createObjectURL(blob);
              console.log(
                `[E2EE FILE RECV] Decrypted via cache: ${blob.size} bytes`,
              );
            } else {
              // Fallback to direct decrypt
              const { decryptBlob } = await import("@/lib/crypto");
              const decryptedArrayBuffer = await decryptBlob(
                convKey,
                encryptedBytes,
              );
              if (cancelled) return;
              blob = new Blob([new Uint8Array(decryptedArrayBuffer)], {
                type: mimeType || "application/octet-stream",
              });
              url = URL.createObjectURL(blob);
              console.log(
                `[E2EE FILE RECV] Decrypted successfully (fallback): ${decryptedArrayBuffer.byteLength} bytes`,
              );
              // Cache the fallback result for future reuse
              const { hashCiphertext } = await import("@/lib/decryption-cache");
              await setDecryptedFile(attachmentRecord.storageKey, blob, {
                mimeType: mimeType || "application/octet-stream",
                originalFileName,
                size: blob.size,
                ciphertextHash: hashCiphertext(encryptedBytes),
                conversationId,
              });
            }
          } else {
            const { decryptBlob } = await import("@/lib/crypto");
            const decryptedArrayBuffer = await decryptBlob(
              convKey,
              encryptedBytes,
            );
            if (cancelled) return;
            blob = new Blob([new Uint8Array(decryptedArrayBuffer)], {
              type: mimeType || "application/octet-stream",
            });
            url = URL.createObjectURL(blob);
            console.log(
              `[E2EE FILE RECV] Decrypted successfully: ${decryptedArrayBuffer.byteLength} bytes`,
            );
            if (attachmentRecord?.storageKey) {
              const { hashCiphertext } = await import("@/lib/decryption-cache");
              await setDecryptedFile(attachmentRecord.storageKey, blob, {
                mimeType: mimeType || "application/octet-stream",
                originalFileName,
                size: blob.size,
                ciphertextHash: hashCiphertext(encryptedBytes),
                conversationId,
              });
            }
          }
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
function _ImageAttachment({
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
        <div className="flex items-center gap-2 mt-1 max-w-[200px]">
          <p className="text-xs opacity-60 truncate flex-1">{meta.name}</p>
          <a
            href={blobUrl}
            download={meta.name ?? "image"}
            className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label={`Download ${meta.name ?? "image"}`}
            data-ocid="message.download_button"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} />
          </a>
        </div>
      )}
      {/* Lightbox */}
      {expanded && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out relative"
          onClick={() => setExpanded(false)}
          aria-label="Close image"
          data-ocid="message.image_lightbox"
        >
          <img
            src={blobUrl}
            alt={meta.name ?? "Image attachment"}
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
          />
          {/* Download button in lightbox */}
          <a
            href={blobUrl}
            download={meta.name ?? "image"}
            className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 hover:bg-black/80 text-white text-sm px-3 py-2 rounded-lg transition-colors"
            aria-label={`Download ${meta.name ?? "image"}`}
            data-ocid="message.lightbox_download_button"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={16} />
            <span>Download</span>
          </a>
        </button>
      )}
    </>
  );
}

/** File/video/audio download button */
function _FileAttachment({
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
  isGroup,
  conversationId,
  onReply,
  onReaction,
  onDelete,
  onEdit,
  onPin,
  isPinned,
  onThread,
  threadCount,
  onResend,
  isFailed,
  isSending,
  showAvatar = true,
  showTimestamp = true,
  isLastMessage = false,
  onScrollToMessage,
  onRekey,
}: MessageBubbleProps) {
  const {
    content: decryptedContent,
    error: decryptionError,
    showStaleKeyButton,
    isPermanentlyUnreadable,
  } = useDecryptedContent(message, conversationId, onRekey);

  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isRekeying, setIsRekeying] = useState(false);
  const [rekeyStatus, setRekeyStatus] = useState<
    "idle" | "rekeying" | "success" | "error"
  >("idle");
  const menuRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Listen for rekey:complete and keyReady events to auto-retry decryption
  useEffect(() => {
    const handleRekeyComplete = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId: string }>;
      if (customEvent.detail?.conversationId === conversationId) {
        console.log(
          `[E2EE REKEY] Received rekey:complete for convId=${conversationId}, resetting decryption state`,
        );
        setRekeyStatus("success");
        setTimeout(() => setRekeyStatus("idle"), 3000);
      }
    };
    const handleKeyReady = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId: string }>;
      if (customEvent.detail?.conversationId === conversationId) {
        console.log(
          `[E2EE KEY] Received keyReady for convId=${conversationId}, will retry decryption`,
        );
      }
    };
    window.addEventListener("rekey:complete", handleRekeyComplete);
    window.addEventListener("keyReady", handleKeyReady);
    return () => {
      window.removeEventListener("rekey:complete", handleRekeyComplete);
      window.removeEventListener("keyReady", handleKeyReady);
    };
  }, [conversationId]);

  const handleRekey = async () => {
    if (isRekeying || rekeyStatus === "rekeying") return;
    setIsRekeying(true);
    setRekeyStatus("rekeying");
    console.log(
      `[E2EE REKEY] MessageBubble rekey clicked for convId=${conversationId}`,
    );

    try {
      if (onRekey) {
        const result = await onRekey();
        if (result.success) {
          setRekeyStatus("success");
          console.log(
            `[E2EE REKEY] MessageBubble rekey succeeded for convId=${conversationId}`,
          );
        } else {
          setRekeyStatus("error");
          console.error(
            `[E2EE REKEY] MessageBubble rekey failed for convId=${conversationId}: ${result.error || "unknown error"}`,
          );
        }
      } else {
        // Fallback: trigger window event for crypto-context to handle
        window.dispatchEvent(
          new CustomEvent("rekey:request", {
            detail: { convId: conversationId },
          }),
        );
        setRekeyStatus("rekeying");
      }
    } catch (err) {
      setRekeyStatus("error");
      console.error(
        `[E2EE REKEY] MessageBubble rekey error for convId=${conversationId}:`,
        err,
      );
    } finally {
      setIsRekeying(false);
      // After async completes, if still in rekeying state, transition to idle after delay
      setTimeout(() => {
        setRekeyStatus((prev) => (prev === "rekeying" ? "idle" : prev));
      }, 3000);
    }
  };

  const isReply = !!(message as unknown as { replyTo?: ReplyToInfo }).replyTo;
  const replyMessage = isReply
    ? (message as unknown as { replyTo: ReplyToInfo }).replyTo
    : null;

  const handleReplyClick = () => {
    if (replyMessage && onScrollToMessage) {
      onScrollToMessage(replyMessage.messageId);
    }
  };

  const handleReaction = (emoji: string) => {
    onReaction?.(message.id, emoji);
    setShowReactions(false);
  };

  const handleDelete = () => {
    onDelete?.(message.id);
    setShowMenu(false);
  };

  const handleEdit = () => {
    onEdit?.(message.id);
    setShowMenu(false);
  };

  const handlePin = () => {
    onPin?.(message.id);
    setShowMenu(false);
  };

  const handleThread = () => {
    onThread?.(message.id);
    setShowMenu(false);
  };

  const handleResend = () => {
    onResend?.(message.id);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const bubbleColor = isMine
    ? "bg-primary text-primary-foreground"
    : "bg-card text-foreground border border-border";

  const bubbleShape = isMine
    ? "rounded-2xl rounded-br-md"
    : "rounded-2xl rounded-bl-md";

  const alignment = isMine ? "justify-end" : "justify-start";

  const renderContent = () => {
    if (message.isDeleted) {
      return (
        <span className="italic text-gray-400 text-sm">
          This message was deleted
        </span>
      );
    }

    if (decryptedContent === null && !decryptionError) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Decrypting...</span>
        </div>
      );
    }

    if (decryptionError) {
      return (
        <div className="flex flex-col gap-2">
          {isPermanentlyUnreadable ? (
            <div className="flex items-center gap-2">
              <AlertCircle
                size={14}
                className="text-muted-foreground flex-shrink-0"
              />
              <span className="text-sm text-muted-foreground italic">
                Message from previous key rotation — unreadable
              </span>
            </div>
          ) : (
            <span className="text-sm text-destructive">
              Unable to decrypt message
            </span>
          )}
          {!isMine &&
            !isGroup &&
            showStaleKeyButton &&
            !isPermanentlyUnreadable && (
              <button
                type="button"
                onClick={handleRekey}
                disabled={rekeyStatus === "rekeying"}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  rekeyStatus === "rekeying"
                    ? "bg-warning text-warning-foreground cursor-wait"
                    : rekeyStatus === "success"
                      ? "bg-success text-success-foreground"
                      : rekeyStatus === "error"
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
                data-ocid="message.rekey_button"
              >
                {rekeyStatus === "rekeying"
                  ? "Rekeying…"
                  : rekeyStatus === "success"
                    ? "Rekeyed — retrying…"
                    : rekeyStatus === "error"
                      ? "Rekey failed — try again"
                      : "Stale key — tap to rekey"}
              </button>
            )}
        </div>
      );
    }

    if ((message as unknown as { attachment?: Attachment }).attachment) {
      return renderAttachment(
        (message as unknown as { attachment: Attachment }).attachment,
      );
    }

    return (
      <p className="text-sm whitespace-pre-wrap break-words">
        {decryptedContent ||
          (message as unknown as { content?: string }).content ||
          ""}
      </p>
    );
  };

  const renderAttachment = (attachment: Attachment) => {
    const isImage = attachment.mimeType?.startsWith("image/");
    const isVideo = attachment.mimeType?.startsWith("video/");
    const isAudio = attachment.mimeType?.startsWith("audio/");

    if (isImage) {
      return (
        <div className="relative">
          {!imageLoaded && !imageError && (
            <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg" />
          )}
          {imageError ? (
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
              <span className="text-xs text-gray-400 ml-2">Failed to load</span>
            </div>
          ) : (
            <img
              src={(attachment as unknown as { url?: string }).url || ""}
              alt={
                (attachment as unknown as { fileName?: string }).fileName ||
                "Image"
              }
              className={`max-w-48 max-h-48 rounded-lg object-cover cursor-pointer transition-opacity ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              tabIndex={0}
              role="button"
              aria-label="Expand image"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  window.open(
                    (attachment as unknown as { url?: string }).url || "#",
                    "_blank",
                  );
                }
              }}
              onClick={() =>
                window.open(
                  (attachment as unknown as { url?: string }).url || "#",
                  "_blank",
                )
              }
            />
          )}
        </div>
      );
    }

    if (isVideo) {
      return (
        <video
          aria-label="Video message"
          src={(attachment as unknown as { url?: string }).url || ""}
          controls
          className="max-w-48 max-h-48 rounded-lg"
          preload="metadata"
        />
      );
    }

    if (isAudio) {
      return (
        <audio
          aria-label="Audio message"
          src={(attachment as unknown as { url?: string }).url || ""}
          controls
          className="max-w-48"
          preload="metadata"
        />
      );
    }

    // Generic file
    return (
      <a
        href={(attachment as unknown as { url?: string }).url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
      >
        <FileText className="w-5 h-5 text-gray-500" />
        <div className="flex flex-col">
          <span className="text-sm font-medium truncate max-w-[150px]">
            {(attachment as unknown as { fileName?: string }).fileName ||
              "File"}
          </span>
          {(attachment as unknown as { fileSize?: number }).fileSize && (
            <span className="text-xs text-gray-400">
              {((size: number) => {
                if (size < 1024) return `${size} B`;
                if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
                return `${(size / (1024 * 1024)).toFixed(1)} MB`;
              })((attachment as unknown as { fileSize: number }).fileSize)}
            </span>
          )}
        </div>
        <Download className="w-4 h-4 text-gray-400 ml-auto" />
      </a>
    );
  };

  const renderReactions = () => {
    const reactions = (
      message as unknown as {
        reactions?: Array<{ emoji: string; count: number; users: string[] }>;
      }
    ).reactions;
    if (!reactions || reactions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {reactions.map((reaction, index) => (
          <button
            type="button"
            key={`${reaction.emoji}-${index}`}
            onClick={() => handleReaction(reaction.emoji)}
            className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${
              reaction.users.includes("currentUser")
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {reaction.emoji} {reaction.count}
          </button>
        ))}
      </div>
    );
  };

  const renderReplyPreview = () => {
    if (!replyMessage) return null;

    return (
      <div
        className="mb-2 p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
        tabIndex={0}
        role="button"
        aria-label="Reply to message"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleReplyClick();
          }
        }}
        onClick={handleReplyClick}
      >
        <div className="flex items-center gap-1 mb-1">
          <Reply className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {replyMessage.senderName || "Unknown"}
          </span>
        </div>
        <p className="text-xs text-foreground/70 truncate">
          {replyMessage.content || "Original message"}
        </p>
      </div>
    );
  };

  const renderStatus = () => {
    if (!isMine) return null;

    if (isSending) {
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Sending...
        </span>
      );
    }

    if (isFailed) {
      return (
        <button
          type="button"
          onClick={handleResend}
          className="text-xs text-destructive flex items-center gap-1 hover:text-destructive/80 transition-colors"
        >
          <AlertCircle className="w-3 h-3" />
          Failed — tap to retry
        </button>
      );
    }

    if (message.readBy && message.readBy.length > 0) {
      return (
        <span className="text-xs text-primary flex items-center gap-1">
          <Check className="w-3 h-3" />
          Read
        </span>
      );
    }

    const deliveredTo = (message as unknown as { deliveredTo?: string[] })
      .deliveredTo;
    if (deliveredTo && deliveredTo.length > 0) {
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Check className="w-3 h-3" />
          Delivered
        </span>
      );
    }

    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Check className="w-3 h-3" />
        Sent
      </span>
    );
  };

  const renderMenu = () => {
    if (!showMenu) return null;

    return (
      <div
        ref={menuRef}
        className="absolute z-50 bg-card shadow-lg rounded-lg py-1 min-w-[120px] border border-border"
        style={{
          [isMine ? "right" : "left"]: "0",
          top: "100%",
          marginTop: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            onReply?.(message);
            setShowMenu(false);
          }}
          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
        >
          <Reply className="w-4 h-4" />
          Reply
        </button>
        <button
          type="button"
          onClick={handleThread}
          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          {threadCount ? `${threadCount} replies` : "Start thread"}
        </button>
        <button
          type="button"
          onClick={() => setShowReactions(!showReactions)}
          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
        >
          <Smile className="w-4 h-4" />
          React
        </button>
        {isMine && (
          <>
            <button
              type="button"
              onClick={handleEdit}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
            >
              <Trash className="w-4 h-4" />
              Delete
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handlePin}
          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted flex items-center gap-2"
        >
          <Pin className="w-4 h-4" />
          {isPinned ? "Unpin" : "Pin"}
        </button>
      </div>
    );
  };

  const renderReactionPicker = () => {
    if (!showReactions) return null;

    const emojis = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

    return (
      <div
        className="absolute z-50 bg-white shadow-lg rounded-lg p-2 flex gap-1 border border-gray-200"
        style={{
          [isMine ? "right" : "left"]: "0",
          bottom: "100%",
          marginBottom: "4px",
        }}
      >
        {emojis.map((emoji) => (
          <button
            type="button"
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="text-lg hover:scale-125 transition-transform p-1"
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={bubbleRef}
      className={`flex ${alignment} mb-4 ${isLastMessage ? "mb-6" : ""}`}
      data-message-id={message.id}
    >
      {!isMine && showAvatar && (
        <div className="mr-2 flex-shrink-0">
          <UserAvatar
            principal={message.sender.toText()}
            displayName={
              (message as unknown as { senderName?: string }).senderName ||
              "User"
            }
            size={32}
          />
        </div>
      )}

      <div
        className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}
      >
        {isGroup && !isMine && (
          <span className="text-xs text-gray-500 mb-1 ml-1">
            {(message as unknown as { senderName?: string }).senderName ||
              "Unknown"}
          </span>
        )}

        <div className="relative">
          {renderReactionPicker()}

          <div
            className={`${bubbleColor} ${bubbleShape} px-4 py-2.5 shadow-sm relative`}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
          >
            {renderReplyPreview()}
            {renderContent()}
            {renderReactions()}

            {showTimestamp && (
              <div
                className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}
              >
                <span className="text-[10px] opacity-70">
                  {new Date(
                    Number(message.sentAt) / 1_000_000,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {renderStatus()}
              </div>
            )}
          </div>

          {renderMenu()}
        </div>

        {(message as unknown as { isEdited?: boolean }).isEdited && (
          <span className="text-[10px] text-gray-400 mt-0.5 ml-1">Edited</span>
        )}
      </div>

      {isMine && showAvatar && (
        <div className="ml-2 flex-shrink-0">
          <UserAvatar
            principal={message.sender.toText()}
            displayName={
              (message as unknown as { senderName?: string }).senderName ||
              "You"
            }
            size={32}
          />
        </div>
      )}
    </div>
  );
}
