import type { ConversationId } from "@/backend";
import {
  MessagePriority as BackendMessagePriority,
  MessageType,
} from "@/backend";
import { AttachmentUpload } from "@/components/AttachmentUpload";
import { readConversationTtl } from "@/components/DisappearingMessageSettings";
import { VoiceNoteRecorder } from "@/components/VoiceNoteRecorder";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCrypto } from "@/context/crypto-context";
import { useBackend } from "@/hooks/use-backend";
import { useConnection } from "@/hooks/use-connection";
import type { MessagePriority } from "@/hooks/use-offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { Loader2, Mic, Paperclip, Send, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MessageInputProps {
  conversationId: ConversationId;
  onMessageSent?: () => void;
  isKeyReady?: boolean;
}

const TYPING_TTL = 5n; // 5 seconds typing TTL

function getPriorityKey(convId: string) {
  return `cs_msg_priority_${convId}`;
}

export function MessageInput({
  conversationId,
  onMessageSent,
  isKeyReady = true,
}: MessageInputProps) {
  const { encryptForConv, isRestoringKeys, getConversationKey } = useCrypto();
  const { backend } = useBackend();
  const connection = useConnection();
  const { queueMessage } = useOfflineQueue();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAttachment, setShowAttachment] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const convIdStr = conversationId.toString();
  // keyReady: true once the conversation key is in memory AND key restoration is done
  // _keyReady: exported for consumers that want a fine-grained "key in memory" guard.
  // Currently the send button uses canSend which already factors in isRestoringKeys.
  const _keyReady = !isRestoringKeys && !!getConversationKey(convIdStr);

  // Priority — persisted per conversation
  const [priority, setPriority] = useState<MessagePriority>(() => {
    try {
      const stored = localStorage.getItem(getPriorityKey(convIdStr));
      return stored === "high" ? "high" : "normal";
    } catch {
      return "normal";
    }
  });

  const togglePriority = useCallback(() => {
    setPriority((p) => {
      const next: MessagePriority = p === "normal" ? "high" : "normal";
      try {
        localStorage.setItem(getPriorityKey(convIdStr), next);
      } catch {
        /* */
      }
      return next;
    });
  }, [convIdStr]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: text change must trigger DOM resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxH = 5 * 24;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [text]);

  const clearTypingIndicator = useCallback(async () => {
    if (!backend || !isTypingRef.current) return;
    isTypingRef.current = false;
    try {
      await backend.clearTypingIndicator(conversationId);
    } catch {
      /* best effort */
    }
  }, [backend, conversationId]);

  const sendTypingIndicator = useCallback(async () => {
    if (!backend || !connection.isOnline) return;
    isTypingRef.current = true;
    try {
      await backend.setTypingIndicator(conversationId, TYPING_TTL);
    } catch {
      /* best effort */
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(clearTypingIndicator, 4000);
  }, [backend, conversationId, clearTypingIndicator, connection.isOnline]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      clearTypingIndicator();
    };
  }, [clearTypingIndicator]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      if (e.target.value.length > 0) {
        sendTypingIndicator();
      } else {
        clearTypingIndicator();
      }
    },
    [sendTypingIndicator, clearTypingIndicator],
  );

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    clearTypingIndicator();
    try {
      const plaintextBytes = new TextEncoder().encode(trimmed).byteLength;
      const encrypted = await encryptForConv(
        conversationId.toString(),
        trimmed,
      );
      if (!encrypted) {
        // Schedule an auto-retry in 1500ms so the race between re-derivation
        // and send resolves without the user having to click again.
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          // Only retry if the user hasn't cleared the input
          if (text.trim()) {
            handleSend();
          }
        }, 1500);
        throw new Error("Encryption key not ready. Retrying automatically...");
      }
      console.log(
        `[E2EE INPUT] plaintext=${plaintextBytes} bytes, encrypted blob=${encrypted.byteLength} bytes`,
      );
      const ttlValue = readConversationTtl(conversationId.toString());

      // CRITICAL: copy encrypted blob into a fresh zero-offset Uint8Array.
      // encryptForConv already returns a fresh buffer, but an extra set() pass
      // guarantees byteOffset=0 for the Candid vec nat8 serializer.
      const encryptedClean = new Uint8Array(encrypted.length);
      encryptedClean.set(encrypted);
      console.log(
        `[E2EE SEND] Encrypted message \u2192 full blob size = ${encryptedClean.length} bytes (IV=12, tag=16)`,
      );

      // Offline: queue the message instead of sending
      if (!connection.isOnline) {
        await queueMessage({
          conversationId: conversationId.toString(),
          encryptedContent: encryptedClean,
          messageType: MessageType.text,
          ttlSeconds: ttlValue > 0 ? ttlValue : undefined,
          priority,
        });
        setText("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        onMessageSent?.();
        return;
      }

      if (!backend) throw new Error("Not connected");

      // Pass priority and ttlSeconds as raw values — the autogenerated
      // backend.ts serializer handles wrapping them into Candid opt encoding.
      const result = await backend.sendMessage({
        conversationId,
        encryptedContent: encryptedClean,
        messageType: MessageType.text,
        ttlSeconds: ttlValue > 0 ? BigInt(ttlValue) : undefined,
        priority:
          priority === "high"
            ? BackendMessagePriority.high
            : BackendMessagePriority.normal,
      });
      if (result.__kind__ === "err") throw new Error(result.err);
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      onMessageSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [
    text,
    sending,
    backend,
    conversationId,
    encryptForConv,
    clearTypingIndicator,
    onMessageSent,
    connection.isOnline,
    queueMessage,
    priority,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // canSend controls the Send button. When isRestoringKeys is true, show a
  // loading state instead of allowing sends that will immediately fail.
  const canSend =
    text.trim().length > 0 && !sending && !isRestoringKeys && isKeyReady;

  return (
    <div className="bg-card border-t border-border px-3 py-2.5 flex-shrink-0">
      {/* Voice recorder overlay */}
      {showVoice && (
        <div className="mb-2">
          <VoiceNoteRecorder
            conversationId={conversationId}
            onClose={() => setShowVoice(false)}
            onSent={() => {
              setShowVoice(false);
              onMessageSent?.();
            }}
          />
        </div>
      )}

      {/* Key restoration notice — shown while startup key loading is in progress */}
      {isRestoringKeys && (
        <p className="text-[10px] text-muted-foreground mb-1.5 px-1 flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" />
          Loading encryption keys…
        </p>
      )}

      {/* Offline notice */}
      {!connection.isOnline && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-1.5 px-1">
          You’re offline — message will be queued and sent when reconnected.
        </p>
      )}

      {/* Main input row */}
      <div className="flex items-end gap-2">
        {/* Attachment */}
        <button
          type="button"
          onClick={() => setShowAttachment(true)}
          className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-smooth"
          aria-label="Attach file"
          data-ocid="message.upload_button"
        >
          <Paperclip size={20} />
        </button>

        {/* Textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={clearTypingIndicator}
            placeholder={
              connection.isOnline ? "Message" : "Message (will be queued)"
            }
            rows={1}
            className="w-full resize-none bg-muted/50 border border-input rounded-xl px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-smooth leading-relaxed overflow-hidden"
            style={{ maxHeight: `${5 * 24}px` }}
            data-ocid="message.input"
          />
        </div>

        {/* Priority toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={togglePriority}
              className={`flex-shrink-0 p-2 rounded-lg transition-smooth ${
                priority === "high"
                  ? "text-orange-500 bg-orange-500/15 hover:bg-orange-500/25"
                  : "text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
              }`}
              aria-label={
                priority === "high" ? "Priority: High" : "Priority: Normal"
              }
              aria-pressed={priority === "high"}
              data-ocid="message.priority_toggle"
            >
              <Zap
                size={18}
                className={priority === "high" ? "fill-orange-500" : ""}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {priority === "high"
              ? "High priority — click to set normal"
              : "Normal priority — click to set high"}
          </TooltipContent>
        </Tooltip>

        {/* Voice / Send */}
        {!canSend && !sending ? (
          <button
            type="button"
            onClick={() => setShowVoice((v) => !v)}
            className={`flex-shrink-0 p-2 rounded-lg transition-smooth ${
              showVoice
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            }`}
            aria-label="Record voice note"
            data-ocid="message.voice_button"
          >
            <Mic size={20} />
          </button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 h-9 w-9 p-0 rounded-xl"
            data-ocid="message.submit_button"
            aria-label={connection.isOnline ? "Send message" : "Queue message"}
          >
            {sending || isRestoringKeys ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p
          className="text-xs text-destructive mt-1.5 px-1"
          data-ocid="message.error_state"
        >
          {error}
        </p>
      )}

      {/* Attachment dialog */}
      <AttachmentUpload
        conversationId={conversationId}
        open={showAttachment}
        onClose={() => setShowAttachment(false)}
        onMessageSent={onMessageSent}
      />
    </div>
  );
}
