import { ConversationKind, createActor } from "@/backend";
import type {
  ConversationId,
  GetMessagesRequest,
  MessagePublic,
  UserProfilePublic,
} from "@/backend";
import { MessageBubble } from "@/components/MessageBubble";
import { QueuedMessageBubble } from "@/components/QueuedMessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useAuth } from "@/context/auth-context";
import { useCrypto } from "@/context/crypto-context";
import { useMarkRead, useMessages } from "@/hooks/use-conversations";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { useUserProfiles } from "@/hooks/use-profiles";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface MessageListProps {
  conversationId: ConversationId;
  profiles: UserProfilePublic[];
  isGroup?: boolean;
  onRetryQueued?: (id: string) => void;
  onDeleteQueued?: (id: string) => void;
}

function groupByDate(
  messages: MessagePublic[],
): Array<{ label: string; messages: MessagePublic[] }> {
  const groups: Array<{
    label: string;
    messages: MessagePublic[];
    dateStr: string;
  }> = [];
  for (const msg of messages) {
    const date = new Date(Number(msg.sentAt) / 1_000_000).toDateString();
    const last = groups[groups.length - 1];
    if (last?.dateStr === date) {
      last.messages.push(msg);
    } else {
      const label = dateLabel(msg.sentAt);
      groups.push({ label, messages: [msg], dateStr: date });
    }
  }
  return groups;
}

function dateLabel(ts: bigint): string {
  const date = new Date(Number(ts) / 1_000_000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function useOlderMessages(
  conversationId: ConversationId,
  beforeId: bigint | undefined,
  enabled: boolean,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<MessagePublic[]>({
    queryKey: [
      "messages-older",
      conversationId.toString(),
      beforeId?.toString(),
    ],
    queryFn: async () => {
      if (!actor || !beforeId) return [];
      const req: GetMessagesRequest = {
        conversationId,
        limit: 30n,
        beforeMessageId: beforeId,
      };
      const result = await actor.getMessages(req);
      if (result.__kind__ === "ok") return result.ok;
      return [];
    },
    enabled: !!actor && !isFetching && enabled && !!beforeId,
  });
}

/** Wraps QueuedMessageBubble with async decryption of the queued blob. */
function DecryptedQueuedBubble({
  message,
  convIdStr,
  decryptFromConv,
  onRetry,
  onDelete,
}: {
  message: import("@/lib/offline-queue").PendingMessage;
  convIdStr: string;
  decryptFromConv: (convId: string, blob: Uint8Array) => Promise<string | null>;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    decryptFromConv(convIdStr, message.encryptedContent)
      .then((text) => {
        if (!cancelled) setPreview(text);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [convIdStr, message.encryptedContent, decryptFromConv]);
  return (
    <QueuedMessageBubble
      message={message}
      decryptedPreview={preview ?? undefined}
      onRetry={onRetry}
      onDelete={onDelete}
    />
  );
}

export function MessageList({
  conversationId,
  profiles,
  isGroup = false,
  onRetryQueued,
  onDeleteQueued,
}: MessageListProps) {
  const { principal } = useAuth();
  const myPrincipal = principal?.toText() ?? "";
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const { pendingMessages, retryMessage, deleteQueuedMessage } =
    useOfflineQueue();
  const { decryptFromConv } = useCrypto();
  const markRead = useMarkRead();
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [oldestId, setOldestId] = useState<bigint | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [allMessages, setAllMessages] = useState<MessagePublic[]>([]);
  const prevLenRef = useRef(0);

  // Filter queued messages for this conversation
  const myQueued = pendingMessages.filter(
    (m) =>
      m.conversationId === conversationId.toString() &&
      m.status !== "delivered",
  );

  const handleRetry = onRetryQueued ?? retryMessage;
  const handleDeleteQueued = onDeleteQueued ?? deleteQueuedMessage;

  // Stable string key from message IDs — changes only when the actual set changes,
  // preventing the merge effect from running on every poll when nothing is new.
  const messageIdsKey = useMemo(
    () => messages.map((m) => m.id.toString()).join(","),
    [messages],
  );

  // Merge polling messages — keyed on messageIdsKey so the effect only fires
  // when the actual set of IDs changes, not on every poll interval.
  useEffect(() => {
    if (!messageIdsKey) return;
    setAllMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const newMsgs = messages.filter((m) => !ids.has(m.id));
      if (newMsgs.length === 0) return prev;
      return [...prev, ...newMsgs].sort((a, b) => Number(a.sentAt - b.sentAt));
    });
  }, [messageIdsKey, messages]);

  // Auto-scroll on new messages when at bottom — only fires when count changes
  const allMessagesCount = allMessages.length;
  useEffect(() => {
    if (isAtBottom && allMessagesCount !== prevLenRef.current) {
      bottomRef.current?.scrollIntoView({
        behavior: prevLenRef.current === 0 ? "instant" : "smooth",
      });
    }
    prevLenRef.current = allMessagesCount;
  }, [allMessagesCount, isAtBottom]);

  // Scroll position tracking
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
    // Load older messages on scroll to top
    if (el.scrollTop < 80 && allMessages.length > 0) {
      const oldest = allMessages[0].id;
      if (oldest !== oldestId) {
        setOldestId(oldest);
        setLoadingOlder(true);
      }
    }
  }, [allMessages, oldestId]);

  const { data: olderMessages } = useOlderMessages(
    conversationId,
    oldestId,
    loadingOlder,
  );

  useEffect(() => {
    if (!olderMessages || olderMessages.length === 0) return;
    setAllMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const unique = olderMessages.filter((m) => !ids.has(m.id));
      if (unique.length === 0) {
        setLoadingOlder(false);
        return prev;
      }
      setLoadingOlder(false);
      return [...unique, ...prev].sort((a, b) => Number(a.sentAt - b.sentAt));
    });
  }, [olderMessages]);

  // IntersectionObserver to mark visible messages read
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.messageId;
            if (id) markRead.mutate(BigInt(id));
          }
        }
      },
      { root: el, threshold: 0.5 },
    );
    const nodes = el.querySelectorAll<HTMLElement>("[data-message-id]");
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [markRead]);

  const profileMap = new Map(profiles.map((p) => [p.id.toText(), p]));

  if (isLoading && allMessages.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        data-ocid="messages.loading_state"
      >
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!isLoading && allMessages.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6"
        data-ocid="messages.empty_state"
      >
        <div className="text-4xl">🔒</div>
        <p className="text-sm font-medium text-foreground">No messages yet</p>
        <p className="text-xs text-muted-foreground">
          Messages are end-to-end encrypted. Only you and your contact can read
          them.
        </p>
      </div>
    );
  }

  const groups = groupByDate(allMessages);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 flex flex-col"
      data-ocid="messages.list"
    >
      {/* Infinite scroll sentinel */}
      <div ref={topRef} className="py-1">
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          {/* Date separator */}
          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground font-medium px-2">
              {group.label}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {group.messages.map((msg, idx) => {
            const isMine = msg.sender.toText() === myPrincipal;
            const prevMsg = group.messages[idx - 1];
            const sameSenderAsPrev =
              prevMsg?.sender.toText() === msg.sender.toText();
            const showAvatar = !isMine && !sameSenderAsPrev;
            const senderProfile = profileMap.get(msg.sender.toText());
            return (
              <div key={msg.id.toString()} data-message-id={msg.id.toString()}>
                <MessageBubble
                  message={msg}
                  isMine={isMine}
                  senderProfile={senderProfile}
                  showAvatar={showAvatar}
                  conversationId={conversationId.toString()}
                  myPrincipal={myPrincipal}
                  isGroup={isGroup}
                />
              </div>
            );
          })}
        </div>
      ))}

      <TypingIndicator
        conversationId={conversationId}
        myPrincipal={myPrincipal}
      />

      {/* Queued (offline) messages */}
      {myQueued.length > 0 && (
        <div className="mt-1">
          {myQueued.map((qm) => (
            <DecryptedQueuedBubble
              key={qm.id}
              message={qm}
              convIdStr={conversationId.toString()}
              decryptFromConv={decryptFromConv}
              onRetry={handleRetry}
              onDelete={handleDeleteQueued}
            />
          ))}
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
