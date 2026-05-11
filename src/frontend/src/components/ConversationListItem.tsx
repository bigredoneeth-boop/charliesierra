import type { ConversationPublic } from "@/backend";
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
import { useDeleteConversation } from "@/hooks/use-conversations";
import { getLocalAvatarDataUrl, useDisplayName } from "@/hooks/use-profiles";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Trash2, Users } from "lucide-react";
import { useState } from "react";

interface ConversationListItemProps {
  conversation: ConversationPublic;
  isActive?: boolean;
  index: number;
  onDeleted?: () => void;
}

function relativeTime(timestampNs: bigint): string {
  const ms = Number(timestampNs) / 1_000_000;
  const diff = Date.now() - ms;
  if (diff < 0) return "now";
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return secs < 5 ? "now" : `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function ConversationListItem({
  conversation,
  isActive = false,
  index,
  onDeleted,
}: ConversationListItemProps) {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteConversation = useDeleteConversation();

  // Get current route params to detect if we're viewing this thread
  const params = useParams({ strict: false }) as { id?: string };

  const isDirect = conversation.kind === "direct";
  const peer = isDirect
    ? (conversation.members.find((m) => m.toText() !== principal?.toText()) ??
      conversation.members[0])
    : null;

  const peerPrincipalText = peer?.toText() ?? null;
  const cachedName = useDisplayName(peerPrincipalText);

  const displayName = isDirect
    ? cachedName ||
      (peer
        ? `${peer.toText().slice(0, 10)}\u2026${peer.toText().slice(-6)}`
        : "Direct Message")
    : "Encrypted Group";

  const unreadCount = 0; // read receipts resolved in message view

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    await deleteConversation.mutateAsync(conversation.id);
    setConfirmOpen(false);
    // If currently viewing this thread, navigate back to conversations list
    if (params?.id === conversation.id.toString()) {
      navigate({ to: "/app/conversations" });
    }
    onDeleted?.();
  }

  return (
    <>
      <button
        type="button"
        className={[
          "group relative w-full flex items-start gap-3 px-4 py-3 transition-colors duration-150 text-left border-b border-border/40 last:border-b-0 cursor-pointer select-none",
          isActive
            ? "bg-primary/10 border-l-2 border-l-primary"
            : "hover:bg-muted/50",
        ].join(" ")}
        aria-current={isActive ? "page" : undefined}
        data-ocid={`conversations.item.${index}`}
        onClick={() =>
          navigate({
            to: "/app/conversations/$id",
            params: { id: conversation.id.toString() },
          })
        }
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {isDirect && peer ? (
            <UserAvatar
              principal={peer.toText()}
              avatarUrl={getLocalAvatarDataUrl(peer.toText()) ?? undefined}
              size={40}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Users size={16} className="text-secondary-foreground" />
            </div>
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p
              className={`text-sm truncate ${
                isActive
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground"
              }`}
            >
              {displayName}
            </p>
            <span className="text-[11px] text-muted-foreground flex-shrink-0">
              {relativeTime(conversation.lastMessageAt)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {isDirect
              ? "End-to-end encrypted"
              : `${conversation.members.length} member${
                  conversation.members.length !== 1 ? "s" : ""
                } \u00b7 Encrypted`}
          </p>
        </div>

        {/* Hover delete button */}
        <button
          type="button"
          aria-label="Delete thread"
          data-ocid={`conversations.delete_button.${index}`}
          onClick={handleDeleteClick}
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex-shrink-0 self-center p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
        >
          <Trash2 size={14} />
        </button>
      </button>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          className="bg-card border-border"
          data-ocid="conversations.delete_dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete Thread
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to permanently delete thread?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="conversations.delete_cancel_button"
              className="border-border text-foreground hover:bg-muted"
              onClick={() => setConfirmOpen(false)}
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="conversations.delete_confirm_button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleteConversation.isPending}
            >
              {deleteConversation.isPending ? "Deleting…" : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
