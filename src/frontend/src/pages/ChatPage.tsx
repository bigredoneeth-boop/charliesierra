import { ConversationKind, JoinRequestStatus, createActor } from "@/backend";
import type {
  ConversationPublic,
  MessagePublic,
  UserProfilePublic,
} from "@/backend";
import { EncryptedBadge } from "@/components/EncryptedBadge";
import { GroupManagePanel } from "@/components/GroupManagePanel";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MessageInput } from "@/components/MessageInput";
import { MessageList } from "@/components/MessageList";
import { OfflineBanner } from "@/components/OfflineBanner";
import { UserAvatar } from "@/components/UserAvatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { useCrypto } from "@/context/crypto-context";
import { useConnection } from "@/hooks/use-connection";
import { useConversation, useMessages } from "@/hooks/use-conversations";
import { useGroupJoinRequests } from "@/hooks/use-discovery";
import {
  useDisableGroupRetention,
  useEnableGroupRetention,
  useGroupRetentionPolicy,
} from "@/hooks/use-enterprise";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { formatLastSeen, isOnline, usePresence } from "@/hooks/use-presence";
import {
  getDisplayName,
  setLocalDisplayName,
  useUserProfiles,
} from "@/hooks/use-profiles";
import {
  decryptMessage,
  deriveDisplayNameKey,
  deriveGroupKey,
  exportPublicKey,
  getKeyFingerprint,
  toCleanUint8Array,
} from "@/lib/crypto";
import { clearConversationStatusCache } from "@/lib/decryption-cache";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Home,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  Timer,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Peer display name ────────────────────────────────────────────────────────
async function decryptProfileDisplayName(
  profile: UserProfilePublic,
): Promise<string | null> {
  if (
    !profile.encryptedDisplayName ||
    profile.encryptedDisplayName.length === 0
  )
    return null;
  try {
    const principalText = profile.id.toText();
    const key = await deriveDisplayNameKey({ toText: () => principalText });
    return await decryptMessage(
      key,
      new Uint8Array(profile.encryptedDisplayName),
    );
  } catch (err) {
    console.error("[DisplayName] decryptProfileDisplayName failed:", err);
    return null;
  }
}

function usePeerName(
  conv: ConversationPublic | null | undefined,
  myPrincipal: string,
) {
  const peerId = useMemo(() => {
    if (!conv || conv.kind === ConversationKind.group) return null;
    return conv.members.find((m) => m.toText() !== myPrincipal) ?? null;
  }, [conv, myPrincipal]);
  const { data: profiles = [] } = useUserProfiles(peerId ? [peerId] : []);
  const profile = profiles[0];
  const peerText = peerId?.toText() ?? null;

  // Decrypt and cache peer display name whenever their profile arrives
  useEffect(() => {
    if (!profile || !peerText) return;
    decryptProfileDisplayName(profile).then((name) => {
      if (name) {
        setLocalDisplayName(peerText, name);
      }
    });
  }, [profile, peerText]);

  const displayName = peerText ? getDisplayName(peerText) : "Group";
  return { peerId, displayName, profile };
}

// ── Retention Banner ─────────────────────────────────────────────────────────
interface RetentionBannerProps {
  convId: bigint;
  isAdmin: boolean;
}

function RetentionBanner({ convId, isAdmin }: RetentionBannerProps) {
  const { data: policy } = useGroupRetentionPolicy(convId);
  const enableRetention = useEnableGroupRetention();
  const disableRetention = useDisableGroupRetention();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleToggleRetention = useCallback(() => {
    if (policy?.retentionEnabled) {
      disableRetention.mutate(convId);
    } else {
      setConfirmOpen(true);
    }
  }, [policy, disableRetention, convId]);

  const handleConfirmEnable = useCallback(() => {
    enableRetention.mutate(convId, { onSuccess: () => setConfirmOpen(false) });
  }, [enableRetention, convId]);

  if (!policy?.retentionEnabled && !isAdmin) return null;

  return (
    <>
      {policy?.retentionEnabled && (
        <div
          className="flex items-start gap-2.5 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs"
          data-ocid="chat.retention_banner"
        >
          <Database
            size={13}
            className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
          />
          <p className="text-amber-800 dark:text-amber-300 leading-relaxed flex-1">
            <strong>
              Message metadata retention is enabled by a group admin.
            </strong>{" "}
            Send timestamps and participants are logged — message content is
            never stored.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleToggleRetention}
              disabled={disableRetention.isPending}
              className="flex-shrink-0 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline font-medium transition-colors"
              data-ocid="chat.retention_disable_button"
            >
              Disable
            </button>
          )}
        </div>
      )}
      {isAdmin && !policy?.retentionEnabled && (
        <div
          className="flex items-center gap-2.5 px-4 py-2 bg-card border-b border-border text-xs"
          data-ocid="chat.retention_admin_bar"
        >
          <Database size={12} className="text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground flex-1">
            Metadata retention is off
          </span>
          <button
            type="button"
            onClick={handleToggleRetention}
            className="text-primary hover:underline font-medium text-xs transition-colors"
            data-ocid="chat.retention_enable_button"
          >
            Enable
          </button>
        </div>
      )}
      {/* Confirm enable dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-ocid="chat.retention_confirm_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Enable Message Metadata Retention?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Enabling retention will log send{" "}
                  <strong>timestamps and participant lists</strong> for all
                  future messages in this group.
                </p>
                <p>
                  Message content is <strong>never stored</strong> and remains
                  end-to-end encrypted. This setting applies to all group
                  members and cannot be individually opted out of.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="chat.retention_confirm_cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEnable}
              disabled={enableRetention.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
              data-ocid="chat.retention_confirm_button"
            >
              {enableRetention.isPending ? "Enabling…" : "Enable Retention"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Search bar ───────────────────────────────────────────────────────────────
interface SearchBarProps {
  decryptedMessages: { id: string; text: string }[];
  onClose: () => void;
  onHighlightMessage: (id: string | null) => void;
}

function ChatSearchBar({
  decryptedMessages,
  onClose,
  onHighlightMessage,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [resultIndex, setResultIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return decryptedMessages.filter((m) => m.text.toLowerCase().includes(q));
  }, [query, decryptedMessages]);

  useEffect(() => {
    setResultIndex(0);
    onHighlightMessage(results[0]?.id ?? null);
  }, [results, onHighlightMessage]);

  const goTo = useCallback(
    (dir: 1 | -1) => {
      if (results.length === 0) return;
      const next = (resultIndex + dir + results.length) % results.length;
      setResultIndex(next);
      onHighlightMessage(results[next].id);
    },
    [results, resultIndex, onHighlightMessage],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Enter" && !e.shiftKey) goTo(1);
      if (e.key === "Enter" && e.shiftKey) goTo(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goTo, onClose]);

  return (
    <div
      aria-label="Search messages"
      className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border"
      data-ocid="chat.search_bar"
    >
      <Search size={14} className="text-muted-foreground flex-shrink-0" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages…"
        aria-label="Search messages"
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        data-ocid="chat.search_input"
      />
      <output
        aria-live="polite"
        aria-label="Search result count"
        className="text-xs text-muted-foreground flex-shrink-0 min-w-[4rem] text-right"
        data-ocid="chat.search_count"
      >
        {query.trim()
          ? results.length === 0
            ? "No results"
            : `${resultIndex + 1} / ${results.length}`
          : ""}
      </output>
      <button
        type="button"
        onClick={() => goTo(-1)}
        disabled={results.length === 0}
        aria-label="Previous result"
        className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        data-ocid="chat.search_prev"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => goTo(1)}
        disabled={results.length === 0}
        aria-label="Next result"
        className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        data-ocid="chat.search_next"
      >
        <ChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close search"
        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        data-ocid="chat.search_close"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
interface HeaderProps {
  conv: ConversationPublic | null | undefined;
  myPrincipal: string;
  onBack: () => void;
  onSearchOpen: () => void;
  isSearchOpen: boolean;
  isCreator: boolean;
  pendingRequestCount: number;
  onManageOpen: () => void;
  isLoading?: boolean;
}

const _RekeyButton = ({
  convId,
  isGroup,
}: {
  convId: string;
  isGroup: boolean;
}) => {
  const { rekeyConversation } = useCrypto();
  const [status, setStatus] = useState<
    "idle" | "rekeying" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRekey = async () => {
    if (status === "rekeying") return;
    setStatus("rekeying");
    setErrorMsg(null);

    console.log(`[E2EE REKEY] User clicked rekey button for convId=${convId}`);

    // Clear any previous permanently-unreadable statuses so messages get a fresh retry
    try {
      await clearConversationStatusCache(convId);
      console.log(
        `[E2EE REKEY] Cleared decryption status cache for convId=${convId}`,
      );
    } catch (err) {
      console.warn(
        `[E2EE REKEY] Failed to clear status cache for convId=${convId}:`,
        err,
      );
    }

    try {
      const result = await rekeyConversation(convId);

      if (result.success) {
        console.log(`[E2EE REKEY] Rekey succeeded for convId=${convId}`);
        setStatus("success");
        // Auto-reset after 5 seconds
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        console.error(
          `[E2EE REKEY] Rekey failed for convId=${convId}: ${result.error}`,
        );
        setStatus("error");
        setErrorMsg(result.error || "rekey_failed");
      }
    } catch (err) {
      console.error(`[E2EE REKEY] Rekey exception for convId=${convId}:`, err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "rekey_failed");
    }
  };

  // Only show rekey button for direct (1:1) chats, not groups
  if (isGroup) return null;

  if (status === "rekeying") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Rekeying…</span>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        <span>Rekey complete — refresh if needed</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>Rekey failed{errorMsg ? `: ${errorMsg}` : ""}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs"
          onClick={handleRekey}
          data-ocid="chat.rekey.retry_button"
        >
          Retry Rekey
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 text-xs"
      onClick={handleRekey}
      data-ocid="chat.rekey.button"
    >
      <RefreshCw className="h-3 w-3 mr-1" />
      Rekey Conversation
    </Button>
  );
};

async function decryptGroupName(
  conv: ConversationPublic,
): Promise<string | null> {
  if (!conv.encryptedName || conv.encryptedName.length === 0) return null;
  const convIdStr = conv.id.toString();
  console.log(
    `[GROUP NAME] Decrypting group name for conversationId=${convIdStr}`,
  );
  try {
    const memberStrings = conv.members.map((m) => m.toText()).sort();
    const key = await deriveGroupKey(memberStrings);
    const raw = conv.encryptedName as Uint8Array;
    const fresh = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) fresh[i] = raw[i];
    const name = await decryptMessage(key, fresh);
    if (name?.trim()) {
      console.log(
        `[GROUP NAME] Decrypted: "${name}" for conversationId=${convIdStr}`,
      );
      return name.trim();
    }
    return null;
  } catch (err) {
    console.warn(
      `[GROUP NAME] Failed to decrypt group name for conversationId=${convIdStr}:`,
      err,
    );
    return null;
  }
}

function ChatHeader({
  conv,
  myPrincipal,
  onBack,
  onSearchOpen,
  isSearchOpen,
  isCreator,
  pendingRequestCount,
  onManageOpen,
  isLoading = false,
}: HeaderProps) {
  const navigate = useNavigate();
  const { peerId, displayName, profile } = usePeerName(conv, myPrincipal);
  const isGroup = conv?.kind === ConversationKind.group;

  // Decrypt group name from encryptedName field
  const [groupName, setGroupName] = useState<string | null>(null);
  useEffect(() => {
    if (!isGroup) return;
    decryptGroupName(conv).then((name) => {
      if (name) setGroupName(name);
    });
  }, [isGroup, conv]);
  const avatarPrincipal = peerId?.toText() ?? myPrincipal;
  const ttlSeconds = undefined; // TTL would come from conversation settings

  // Presence — derive online state from peer's lastSeen (1:1 only)
  const peerLastSeen: bigint | undefined =
    !isGroup && profile?.lastSeen !== undefined
      ? (profile.lastSeen as bigint)
      : undefined;
  const peerIsOnline =
    peerLastSeen !== undefined ? isOnline(peerLastSeen) : undefined;
  const peerLastSeenLabel =
    peerLastSeen !== undefined ? formatLastSeen(peerLastSeen) : undefined;

  // ── Skeleton header while loading ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-elevated flex-shrink-0"
        data-ocid="chat.header_skeleton"
      >
        {/* Back (mobile) */}
        <button
          type="button"
          onClick={onBack}
          className="flex-shrink-0 p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth md:hidden"
          aria-label="Back to conversations"
          data-ocid="chat.back_button"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Avatar skeleton */}
        <Skeleton className="h-[38px] w-[38px] rounded-full flex-shrink-0" />

        {/* Name + meta skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Actions skeleton */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-elevated flex-shrink-0"
      data-ocid="chat.header"
    >
      {/* Back (mobile) */}
      <button
        type="button"
        onClick={onBack}
        className="flex-shrink-0 p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth md:hidden"
        aria-label="Back to conversations"
        data-ocid="chat.back_button"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Avatar */}
      <UserAvatar
        principal={avatarPrincipal}
        displayName={isGroup ? "G" : displayName}
        size={38}
        isOnline={peerIsOnline}
      />

      {/* Name + badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate text-foreground">
            {isGroup ? (groupName ?? "Group") : displayName}
          </span>
          <EncryptedBadge compact />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p
            className="text-xs text-muted-foreground"
            title={
              !isGroup && peerLastSeenLabel ? peerLastSeenLabel : undefined
            }
          >
            {isGroup
              ? `${conv.members.length} members`
              : (peerLastSeenLabel ?? "End-to-end encrypted")}
          </p>
          {ttlSeconds && (
            <div
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground cursor-pointer hover:text-primary transition-colors"
              title="Disappearing messages"
            >
              <Timer size={10} />
              <span>{ttlSeconds}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate({ to: "/app/conversations" })}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
          aria-label="Go to conversations"
          data-ocid="chat.home_button"
        >
          <Home size={18} />
        </button>
        <button
          type="button"
          onClick={onSearchOpen}
          className={`p-2 rounded-lg transition-smooth ${
            isSearchOpen
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          aria-label="Search in conversation"
          aria-pressed={isSearchOpen}
          data-ocid="chat.search_button"
        >
          <Search size={18} />
        </button>
        {!isGroup && conv && (
          <_RekeyButton convId={conv.id.toString()} isGroup={isGroup} />
        )}
        {isCreator && (
          <button
            type="button"
            onClick={onManageOpen}
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
            aria-label="Manage group"
            data-ocid="chat.manage_group_button"
          >
            <Settings size={18} />
            {pendingRequestCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground leading-none"
              >
                {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Chat Page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { id } = useParams({ from: "/app/conversations/$id" });
  const navigate = useNavigate();
  const { principal } = useAuth();
  const { actor, isFetching: actorFetching } = useActor(createActor);
  const {
    keyPair,
    deriveAndStoreKey,
    getConversationKey,
    setGroupConversationKey,
    clearConversationKey,
    getGroupKeyFingerprint,
    decryptFromConv,
    missingKeyConvIds,
    clearMissingKeyConvId,
    isKeyReady,
  } = useCrypto();
  const myPrincipal = principal?.toText() ?? "";
  const connection = useConnection();
  // Keep current user's presence timestamp fresh (fires touchPresence every 30s)
  usePresence();
  const { queueDepth, drainQueue, retryMessage, deleteQueuedMessage } =
    useOfflineQueue();
  const queryClient = useQueryClient();

  // ── Search state ────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [managePanelOpen, setManagePanelOpen] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [decryptedMsgs, setDecryptedMsgs] = useState<
    { id: string; text: string }[]
  >([]);
  const [, _setIsRekeying] = useState(false);

  // When coming back online, drain the offline queue
  useEffect(() => {
    if (connection.isOnline) {
      drainQueue();
    }
  }, [connection.isOnline, drainQueue]);

  // Record when this conversation was last opened so ConversationListItem
  // can use it as a fallback unread signal for threads without cached messages.
  useEffect(() => {
    if (!id) return;
    try {
      localStorage.setItem(`cs_last_read_${id}`, Date.now().toString());
    } catch {
      // localStorage unavailable — no-op
    }
  }, [id]);

  const convId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }, [id]);

  const { data: conv, isLoading, isFetching, status } = useConversation(convId);

  // Read messages from cache for search (no extra fetch)
  const cachedMessages: MessagePublic[] = useMemo(() => {
    if (!convId) return [];
    const cached = queryClient.getQueryData<MessagePublic[]>([
      "messages",
      convId.toString(),
    ]);
    return cached ?? [];
  }, [queryClient, convId]);

  // Also subscribe to live messages for search freshness — only when search is open
  const { data: liveMsgs = [] } = useMessages(searchOpen ? convId : null);

  // Decrypt cached messages for search
  useEffect(() => {
    if (!convId || !searchOpen) return;
    const msgs = liveMsgs.length > 0 ? liveMsgs : cachedMessages;
    const convIdStr = convId.toString();
    let cancelled = false;
    Promise.all(
      msgs.map(async (m) => {
        try {
          // Element-by-element copy before decryption — same pattern as all
          // other call sites to guarantee byteOffset=0 on the fresh buffer.
          const raw = m.encryptedContent as unknown as Uint8Array;
          const fresh = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) fresh[i] = raw[i];
          const text = await decryptFromConv(convIdStr, fresh, m.id.toString());
          return { id: m.id.toString(), text: text ?? "" };
        } catch {
          return { id: m.id.toString(), text: "" };
        }
      }),
    )
      .then((results) => {
        if (!cancelled)
          setDecryptedMsgs(results.filter((r) => r.text.length > 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [searchOpen, convId, liveMsgs, cachedMessages, decryptFromConv]);

  // Scroll to highlighted message
  useEffect(() => {
    if (!highlightedMsgId) return;
    const el = document.querySelector(
      `[data-message-id="${highlightedMsgId}"]`,
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("search-highlight");
      const t = setTimeout(() => el.classList.remove("search-highlight"), 1500);
      return () => clearTimeout(t);
    }
  }, [highlightedMsgId]);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
    setHighlightedMsgId(null);
    setDecryptedMsgs([]);
  }, []);

  // Keyboard shortcut Cmd/Ctrl+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Derive peer IDs — `conv` is the only dep that matters; myPrincipal is stable
  // for the session. This recomputes only when the conversation object changes.
  const peerIds = useMemo(() => {
    if (!conv) return [];
    return conv.members.filter((m) => m.toText() !== myPrincipal);
  }, [conv, myPrincipal]);

  const { data: peerProfiles = [] } = useUserProfiles(peerIds);

  // Track whether a group key derivation is in-flight to avoid duplicate calls.
  const derivingGroupKey = useRef<string | null>(null);
  // Track the last peer ecdhPublicKey bytes string we derived a key from,
  // so we always re-derive when a new/different key arrives.
  const lastDerivedPeerKey = useRef<string>("");

  // FIX: Reset lastDerivedPeerKey when convId changes so each new conversation
  // always triggers a fresh ECDH key derivation from the peer's current profile.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — lastDerivedPeerKey is a ref (not reactive state); convId is the only real trigger
  useEffect(() => {
    lastDerivedPeerKey.current = "";
  }, [convId]);

  // Re-derivation on missing key: when decryptFromConv marks a convId as missing,
  // re-run the key exchange for the current conversation so decryption unblocks.
  useEffect(() => {
    if (!convId || !conv) return;
    const convIdStr = convId.toString();
    if (!missingKeyConvIds.has(convIdStr)) return;

    console.log(
      `[E2EE KEYDERIVE] Missing key detected for convId=${convIdStr} — triggering re-derivation`,
    );

    if (conv.kind === ConversationKind.direct) {
      // For 1:1 chats, reset the derived-key guard so the peer-profile effect
      // will re-run and call deriveAndStoreKey on the next render cycle.
      lastDerivedPeerKey.current = "";
      // Also clear the guard immediately so it re-fires even if peerProfiles
      // hasn't changed by re-deriving directly when a peer key is available.
      if (peerProfiles.length > 0) {
        const peer = peerProfiles.find(
          (p) => p.id.toText() === peerIds[0]?.toText(),
        );
        if (!peer) {
          console.warn(
            `[E2EE] ChatPage: peer profile not found for peerId=${peerIds[0]?.toText()} in convId=${convIdStr}`,
          );
          return;
        }
        if (peer.id.toText() === myPrincipal) {
          console.warn(
            `[E2EE] Self-keying detected for convId=${convIdStr}, aborting`,
          );
          return;
        }
        if (peer.ecdhPublicKey.length > 0) {
          const freshPeerKeyBytes = toCleanUint8Array(peer.ecdhPublicKey);
          deriveAndStoreKey(convIdStr, freshPeerKeyBytes).then((key) => {
            if (key) {
              console.log(
                `[E2EE KEYDERIVE] Re-derivation succeeded for convId=${convIdStr}`,
              );
              clearMissingKeyConvId(convIdStr);
            }
          });
        }
      }
    } else if (conv.kind === ConversationKind.group) {
      const memberStrings = conv.members.map((m) => m.toText()).sort();
      const fingerprint = memberStrings.join(",");
      deriveGroupKey(memberStrings)
        .then((key) => {
          setGroupConversationKey(convIdStr, key, fingerprint);
          console.log(
            `[E2EE KEYDERIVE] Group re-derivation succeeded for convId=${convIdStr}`,
          );
          clearMissingKeyConvId(convIdStr);
        })
        .catch((err) => {
          console.error(
            `[E2EE KEYDERIVE] Group re-derivation failed for convId=${convIdStr}:`,
            err,
          );
        });
    }
  }, [
    missingKeyConvIds,
    convId,
    conv,
    peerProfiles,
    peerIds,
    myPrincipal,
    deriveAndStoreKey,
    setGroupConversationKey,
    clearMissingKeyConvId,
  ]);

  useEffect(() => {
    if (!conv || convId === null) return;
    const convIdStr = convId.toString();

    // Direct: derive ECDH shared key from peer's public key.
    // Guard: we set lastDerivedPeerKey.current BEFORE any async work so that
    // subsequent effect re-runs from polling (same key bytes, new object ref)
    // see the fingerprint already set and skip re-derivation immediately.
    if (conv.kind === ConversationKind.direct) {
      if (peerProfiles.length > 0) {
        const peer = peerProfiles.find(
          (p) => p.id.toText() === peerIds[0]?.toText(),
        );
        if (!peer) {
          console.warn(
            `[E2EE] ChatPage: peer profile not found for peerId=${peerIds[0]?.toText()} in convId=${convIdStr}`,
          );
          return;
        }
        if (peer.id.toText() === myPrincipal) {
          console.warn(
            `[E2EE] Self-keying detected for convId=${convIdStr}, aborting`,
          );
          return;
        }
        if (peer.ecdhPublicKey.length === 0) {
          console.warn(
            `[E2EE] ChatPage: peer profile arrived with empty ecdhPublicKey for convId=${convIdStr}`,
          );
        } else {
          console.log(
            `[E2EE] ChatPage: peer ecdhPublicKey arrived, byteLength=${peer.ecdhPublicKey.byteLength} for convId=${convIdStr}`,
          );
          // Compute the fingerprint from the raw bytes — this is stable across
          // polling re-fetches that return identical key data in new object refs.
          const keyFingerprint = Array.from(
            peer.ecdhPublicKey.slice(0, 8),
          ).join(",");

          // PRIMARY GUARD: if we already processed this exact fingerprint AND
          // the key is actually ready, skip entirely. If the key was lost
          // (e.g. PWA context switch) we re-derive even for the same fingerprint.
          if (
            lastDerivedPeerKey.current === keyFingerprint &&
            isKeyReady(convIdStr)
          ) {
            console.log(
              `[E2EE ChatPage] skipping re-derive for convId=${convIdStr} — key already present with same fingerprint`,
            );
            return;
          }

          // SECONDARY GUARD: if the key is NOT ready (evicted/cleared) but we
          // have the same fingerprint, we MUST re-derive. Don't skip.
          if (
            lastDerivedPeerKey.current === keyFingerprint &&
            !isKeyReady(convIdStr)
          ) {
            console.log(
              `[E2EE ChatPage] re-deriving for convId=${convIdStr} — same fingerprint but key not ready (was evicted)`,
            );
            // Fall through to re-derivation below
          }

          // Claim the fingerprint synchronously BEFORE any async work so that
          // any re-runs triggered while deriveAndStoreKey is in flight don't
          // start a second derivation for the same key.
          lastDerivedPeerKey.current = keyFingerprint;

          const existingKey = getConversationKey(convIdStr);
          if (!existingKey) {
            console.log(
              `[E2EE KEYSTORE] No key found for convId=${convIdStr} - performing exchange`,
            );
          }

          // Always use a fresh buffer copy of the peer's ecdhPublicKey so Candid
          // buffer offsets don't corrupt the WebCrypto key import.
          const freshPeerKeyBytes = toCleanUint8Array(peer.ecdhPublicKey);
          deriveAndStoreKey(convIdStr, freshPeerKeyBytes).then(async (key) => {
            if (!key) {
              console.error(
                `[E2EE KEYDERIVE] conversationId=${convIdStr}: deriveAndStoreKey returned null`,
              );
            } else {
              console.log(
                `[E2EE] Key derivation complete for convId=${convIdStr}, key is now ready`,
              );
              if (keyPair) {
                const myPubBytes = await exportPublicKey(keyPair.publicKey);
                const myFp = Array.from(myPubBytes.slice(0, 8))
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("");
                const peerFp = Array.from(freshPeerKeyBytes.slice(0, 8))
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("");
                const sharedFp = await getKeyFingerprint(key);
                console.log(
                  `[E2EE KEYDERIVE] conversationId=${convIdStr}, peerKey fingerprint=${peerFp}, myKey fingerprint=${myFp}, sharedKey fingerprint=${sharedFp}`,
                );
              }
            }
          });
        }
      }
      return; // nothing more to do for direct chats
    }

    // Group: derive a deterministic key from sorted member principals.
    // CRITICAL: compare the current member fingerprint against the persisted
    // fingerprint stored alongside the key (survives page reloads). If
    // membership changed (add or remove), evict the stale cached key so every
    // client re-derives from the updated member list -- guaranteeing all
    // members share the same key.
    if (conv.kind === ConversationKind.group) {
      const memberStrings = conv.members.map((m) => m.toText()).sort();
      const fingerprint = memberStrings.join(",");

      // Use the persisted fingerprint from IndexedDB (restored via context) so
      // stale-key detection works correctly even after a full page reload.
      const persistedFingerprint = getGroupKeyFingerprint(convIdStr);
      const existingKey = getConversationKey(convIdStr);

      const fingerprintChanged =
        persistedFingerprint !== undefined &&
        persistedFingerprint !== fingerprint;

      if (fingerprintChanged) {
        // Membership changed -- evict the old cached key so we don't
        // encrypt/decrypt with a key derived from a stale member list.
        clearConversationKey(convIdStr);
      }

      // Skip derivation if the key is current and no membership change detected.
      if (existingKey && !fingerprintChanged) {
        console.log(`[E2EE KEYSTORE] Restored key for convId=${convIdStr}`);
        return;
      }
      if (!existingKey || fingerprintChanged) {
        console.log(
          `[E2EE KEYSTORE] No key found for convId=${convIdStr} - performing exchange`,
        );
      }

      // Avoid duplicate concurrent derivations for the same fingerprint.
      if (derivingGroupKey.current === fingerprint) return;
      derivingGroupKey.current = fingerprint;

      deriveGroupKey(memberStrings)
        .then((key) => {
          setGroupConversationKey(convIdStr, key, fingerprint);
        })
        .catch(() => {
          // Reset so the next render can retry
          derivingGroupKey.current = null;
        })
        .finally(() => {
          if (derivingGroupKey.current === fingerprint) {
            derivingGroupKey.current = null;
          }
        });
    }
  }, [
    conv,
    convId,
    peerProfiles,
    peerIds,
    myPrincipal,
    keyPair,
    deriveAndStoreKey,
    getConversationKey,
    setGroupConversationKey,
    clearConversationKey,
    getGroupKeyFingerprint,
    isKeyReady,
  ]);

  const allProfiles = peerProfiles;

  const isGroup = conv?.kind === ConversationKind.group;

  const isCreator = isGroup && conv?.createdBy?.toText() === myPrincipal;

  const { data: joinRequests = [] } = useGroupJoinRequests(
    isCreator && convId !== null ? convId : null,
  );
  const pendingRequestCount = joinRequests.filter(
    (r) => r.status === JoinRequestStatus.pending,
  ).length;

  const { data: isAdmin = false } = useQuery<boolean>({
    queryKey: ["admin-check", myPrincipal],
    queryFn: async () => {
      if (!actor || !principal) return false;
      return actor.isAdminCheck(principal);
    },
    enabled: !!actor && !actorFetching && isGroup && !!principal,
    staleTime: 60_000,
  });

  // Listen for decryption success events from crypto-context and invalidate
  // the messages query so all MessageBubbles re-check their caches.
  useEffect(() => {
    const handleDecryptionSuccess = (e: Event) => {
      const customEvent = e as CustomEvent<{
        conversationId: string;
        msgId: string;
        plaintext: string;
      }>;
      if (customEvent.detail?.conversationId === convId?.toString()) {
        console.log(
          `[E2EE DECRYPT SUCCESS] ChatPage received decryptionSuccess for msgId=${customEvent.detail.msgId}, invalidating messages query`,
        );
        // Invalidate messages so MessageList re-renders and each
        // MessageBubble picks up the newly cached plaintext.
        queryClient.invalidateQueries({
          queryKey: ["messages", convId?.toString()],
        });
      }
    };
    window.addEventListener("decryptionSuccess", handleDecryptionSuccess);
    return () => {
      window.removeEventListener("decryptionSuccess", handleDecryptionSuccess);
    };
  }, [convId, queryClient]);

  // Determine if we are genuinely in a loading state (fetching conversation data)
  // When the query is disabled (actor not ready), isLoading and isFetching are both false,
  // so we should NOT show skeletons. Only show skeleton when the query is actually running.
  const isConvLoading = (isLoading || isFetching) && !actorFetching;
  // Determine if the conversation is truly not found (query succeeded, no data)
  const isConvNotFound =
    status === "success" && (!conv || convId === null || convId === 0n);

  const handleBack = useCallback(() => {
    navigate({ to: "/app/conversations" });
  }, [navigate]);

  return (
    <div className="flex flex-col h-full bg-background" data-ocid="chat.page">
      <ChatHeader
        conv={conv}
        myPrincipal={myPrincipal}
        onBack={handleBack}
        onSearchOpen={() => setSearchOpen((p) => !p)}
        isSearchOpen={searchOpen}
        isCreator={isCreator}
        pendingRequestCount={pendingRequestCount}
        onManageOpen={() => setManagePanelOpen(true)}
        isLoading={isLoading}
      />

      {searchOpen && conv && (
        <ChatSearchBar
          decryptedMessages={decryptedMsgs}
          onClose={handleSearchClose}
          onHighlightMessage={setHighlightedMsgId}
        />
      )}

      <OfflineBanner
        connection={connection}
        queueDepth={queueDepth}
        isDraining={connection.isOnline && queueDepth > 0}
      />

      {isGroup && convId !== null && (
        <RetentionBanner convId={convId} isAdmin={isAdmin} />
      )}

      {/* Message list area — show data when available, skeleton only when genuinely loading without data, not-found when confirmed missing */}
      {isConvNotFound ? (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-3"
          data-ocid="chat.error_state"
        >
          <p className="text-muted-foreground text-sm">
            Conversation not found.
          </p>
          <button
            type="button"
            className="text-primary text-sm hover:underline"
            onClick={handleBack}
            data-ocid="chat.back_button"
          >
            Back to conversations
          </button>
        </div>
      ) : conv && convId !== null ? (
        <MessageList
          key={String(convId)}
          conversationId={convId}
          profiles={allProfiles}
          isGroup={isGroup}
          onRetryQueued={retryMessage}
          onDeleteQueued={deleteQueuedMessage}
        />
      ) : isConvLoading ? (
        <div
          className="flex-1 flex flex-col px-4 py-3 gap-4"
          data-ocid="chat.loading_state"
        >
          {/* Skeleton message bubbles */}
          <div className="flex gap-2 items-end">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-10 w-48 rounded-2xl rounded-bl-sm" />
            </div>
          </div>
          <div className="flex gap-2 items-end justify-end">
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-10 w-40 rounded-2xl rounded-br-sm" />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-14 w-56 rounded-2xl rounded-bl-sm" />
            </div>
          </div>
          <div className="flex gap-2 items-end justify-end">
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-10 w-32 rounded-2xl rounded-br-sm" />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-10 w-44 rounded-2xl rounded-bl-sm" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-3"
          data-ocid="chat.empty_state"
        >
          <p className="text-muted-foreground text-sm">
            Select a conversation to start chatting.
          </p>
          <button
            type="button"
            className="text-primary text-sm hover:underline"
            onClick={handleBack}
            data-ocid="chat.back_button"
          >
            Back to conversations
          </button>
        </div>
      )}

      {/* Input bar — always render real MessageInput when convId is valid; disable while loading */}
      {convId !== null && !isConvNotFound ? (
        <MessageInput
          conversationId={convId}
          isKeyReady={isKeyReady(convId.toString())}
          disabled={isConvLoading}
          onMessageSent={() => {
            queryClient.invalidateQueries({
              queryKey: ["messages", convId.toString()],
            });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }}
        />
      ) : null}

      {isCreator && conv && convId !== null && (
        <GroupManagePanel
          conv={conv}
          myPrincipal={myPrincipal}
          open={managePanelOpen}
          onClose={() => setManagePanelOpen(false)}
          pendingRequestCount={pendingRequestCount}
        />
      )}

      <footer className="py-1.5 px-4 border-t border-border text-center flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          To report a bug, email{" "}
          <a
            href="mailto:support@charliesierra.io"
            className="underline hover:text-foreground transition-colors duration-200"
          >
            support@charliesierra.io
          </a>
        </p>
      </footer>
    </div>
  );
}
