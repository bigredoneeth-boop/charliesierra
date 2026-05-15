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
import {
  getDisplayName,
  setLocalDisplayName,
  useUserProfiles,
} from "@/hooks/use-profiles";
import {
  decryptMessage,
  deriveDisplayNameKey,
  deriveGroupKey,
} from "@/lib/crypto";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Database,
  Phone,
  Search,
  Settings,
  Timer,
  Video,
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
  } catch {
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
  conv: ConversationPublic;
  myPrincipal: string;
  onBack: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onSearchOpen: () => void;
  isSearchOpen: boolean;
  isCreator: boolean;
  pendingRequestCount: number;
  onManageOpen: () => void;
}

function ChatHeader({
  conv,
  myPrincipal,
  onBack,
  onVoiceCall,
  onVideoCall,
  onSearchOpen,
  isSearchOpen,
  isCreator,
  pendingRequestCount,
  onManageOpen,
}: HeaderProps) {
  const {
    peerId,
    displayName,
    profile: _profile,
  } = usePeerName(conv, myPrincipal);
  const isGroup = conv.kind === ConversationKind.group;
  const avatarPrincipal = peerId?.toText() ?? myPrincipal;
  const ttlSeconds = undefined; // TTL would come from conversation settings

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
      />

      {/* Name + badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate text-foreground">
            {isGroup ? "Group Conversation" : displayName}
          </span>
          <EncryptedBadge compact />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground">
            {isGroup
              ? `${conv.members.length} members`
              : "End-to-end encrypted"}
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
          onClick={onVoiceCall}
          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-smooth"
          aria-label="Start voice call"
          data-ocid="chat.voice_call_button"
        >
          <Phone size={18} />
        </button>
        <button
          type="button"
          onClick={onVideoCall}
          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-smooth"
          aria-label="Start video call"
          data-ocid="chat.video_call_button"
        >
          <Video size={18} />
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
    deriveAndStoreKey,
    getConversationKey,
    setGroupConversationKey,
    clearConversationKey,
    getGroupKeyFingerprint,
    decryptFromConv,
  } = useCrypto();
  const myPrincipal = principal?.toText() ?? "";
  const connection = useConnection();
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

  // When coming back online, drain the offline queue
  useEffect(() => {
    if (connection.isOnline) {
      drainQueue();
    }
  }, [connection.isOnline, drainQueue]);

  const convId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }, [id]);

  const { data: conv, isLoading } = useConversation(convId);

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
          const text = await decryptFromConv(convIdStr, m.encryptedContent);
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

  useEffect(() => {
    if (!conv || convId === null) return;
    const convIdStr = convId.toString();

    // Direct: derive ECDH shared key from peer's public key.
    // ALWAYS re-derive when peerProfiles changes AND the key bytes are new —
    // this handles the race where the profile arrives after the first render.
    if (conv.kind === ConversationKind.direct) {
      if (peerProfiles.length > 0) {
        const peer = peerProfiles[0];
        if (peer.ecdhPublicKey.length === 0) {
          console.warn(
            `[E2EE] ChatPage: peer profile arrived with empty ecdhPublicKey for convId=${convIdStr}`,
          );
        } else {
          console.log(
            `[E2EE] ChatPage: peer ecdhPublicKey arrived, byteLength=${peer.ecdhPublicKey.byteLength} for convId=${convIdStr}`,
          );
          // Serialize the key bytes to a string for change detection.
          const keyFingerprint = Array.from(
            peer.ecdhPublicKey.slice(0, 8),
          ).join(",");
          const needsDerivation =
            !getConversationKey(convIdStr) ||
            lastDerivedPeerKey.current !== keyFingerprint;
          if (needsDerivation) {
            lastDerivedPeerKey.current = keyFingerprint;
            deriveAndStoreKey(convIdStr, peer.ecdhPublicKey).then((key) => {
              if (!key) {
                console.error(
                  `[E2EE] ChatPage: deriveAndStoreKey returned null for convId=${convIdStr}`,
                );
              }
            });
          }
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
      if (existingKey && !fingerprintChanged) return;

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
    deriveAndStoreKey,
    getConversationKey,
    setGroupConversationKey,
    clearConversationKey,
    getGroupKeyFingerprint,
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

  if (isLoading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        data-ocid="chat.loading_state"
      >
        <LoadingSpinner />
      </div>
    );
  }

  if (!conv || convId === null) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-3"
        data-ocid="chat.error_state"
      >
        <p className="text-muted-foreground text-sm">Conversation not found.</p>
        <button
          type="button"
          className="text-primary text-sm hover:underline"
          onClick={() => navigate({ to: "/app/conversations" })}
          data-ocid="chat.back_button"
        >
          Back to conversations
        </button>
      </div>
    );
  }

  const handleVoiceCall = () =>
    navigate({ to: "/app/calls/$id", params: { id } });
  const handleVideoCall = () =>
    navigate({
      to: "/app/calls/$id",
      params: { id },
      search: { type: "video" } as never,
    });
  const handleBack = () => navigate({ to: "/app/conversations" });

  return (
    <div className="flex flex-col h-full bg-background" data-ocid="chat.page">
      <ChatHeader
        conv={conv}
        myPrincipal={myPrincipal}
        onBack={handleBack}
        onVoiceCall={handleVoiceCall}
        onVideoCall={handleVideoCall}
        onSearchOpen={() => setSearchOpen((p) => !p)}
        isSearchOpen={searchOpen}
        isCreator={isCreator}
        pendingRequestCount={pendingRequestCount}
        onManageOpen={() => setManagePanelOpen(true)}
      />

      {searchOpen && (
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

      {isGroup && <RetentionBanner convId={convId} isAdmin={isAdmin} />}

      <MessageList
        conversationId={convId}
        profiles={allProfiles}
        isGroup={isGroup}
        onRetryQueued={retryMessage}
        onDeleteQueued={deleteQueuedMessage}
      />

      <MessageInput
        conversationId={convId}
        onMessageSent={() => {
          queryClient.invalidateQueries({
            queryKey: ["messages", convId.toString()],
          });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }}
      />

      {isCreator && convId !== null && (
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
