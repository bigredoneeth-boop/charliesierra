/**
 * GroupManagePanel
 *
 * Slide-in sheet for group creators to manage their group directly
 * from the chat window. Sections: Members, Add Member, Join Requests.
 * Visible only to the group creator.
 */
import { ConversationKind } from "@/backend";
import type { ConversationPublic, JoinRequest } from "@/backend";
import { JoinRequestStatus } from "@/backend";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddConversationMember,
  useDeleteGroupConversation,
  useRemoveConversationMember,
} from "@/hooks/use-conversations";
import {
  useApproveJoinRequest,
  useDenyJoinRequest,
  useGroupJoinRequests,
} from "@/hooks/use-discovery";
import { getDisplayName } from "@/hooks/use-profiles";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import { Check, Trash2, UserMinus, UserPlus, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ContactSearchInput } from "./ContactSearchInput";
import { UserAvatar } from "./UserAvatar";

// ── Section heading ────────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
      {children}
    </h3>
  );
}

// ── Members list ────────────────────────────────────────────────────────────
function MembersList({
  conv,
  myPrincipal,
}: {
  conv: ConversationPublic;
  myPrincipal: string;
}) {
  const removeMember = useRemoveConversationMember();

  const handleRemove = useCallback(
    (memberText: string) => {
      // find the Principal object
      const member = conv.members.find((m) => m.toText() === memberText);
      if (!member) return;
      removeMember.mutate(
        { conversationId: conv.id, member },
        {
          onSuccess: () =>
            toast.success(`Removed ${memberText.slice(0, 12)}\u2026`),
          onError: (e) =>
            toast.error(`Failed to remove member: ${(e as Error).message}`),
        },
      );
    },
    [conv, removeMember],
  );

  return (
    <div className="space-y-1">
      {conv.members.map((m, idx) => {
        const text = m.toText();
        const isSelf = text === myPrincipal;
        const displayName = getDisplayName(text);
        const hasCustomName =
          (displayName !== text && !displayName.includes("\u2026")) ||
          displayName !== `${text.slice(0, 10)}\u2026${text.slice(-4)}`;
        return (
          <div
            key={text}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 group"
            data-ocid={`group_manage.member.${idx + 1}`}
          >
            <UserAvatar principal={text} size={28} />
            <div className="flex-1 min-w-0">
              <span className="block text-xs text-foreground font-medium truncate">
                {displayName}
                {isSelf && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                    (you)
                  </span>
                )}
              </span>
              {hasCustomName && (
                <span className="block text-[10px] text-muted-foreground font-mono truncate">
                  {text.slice(0, 16)}\u2026
                </span>
              )}
            </div>
            {!isSelf && (
              <button
                type="button"
                aria-label={`Remove ${displayName}`}
                onClick={() => handleRemove(text)}
                disabled={removeMember.isPending}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all duration-150"
                data-ocid={`group_manage.remove_button.${idx + 1}`}
              >
                <UserMinus size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Add member form ──────────────────────────────────────────────────────────
function AddMemberForm({ convId }: { convId: bigint }) {
  const addMember = useAddConversationMember();

  const handleSelect = useCallback(
    (member: Principal) => {
      addMember.mutate(
        { conversationId: convId, member },
        {
          onSuccess: () => toast.success("Member added"),
          onError: (e) =>
            toast.error(`Could not add member: ${(e as Error).message}`),
        },
      );
    },
    [convId, addMember],
  );

  return (
    <ContactSearchInput
      onSelect={(principal) => handleSelect(principal)}
      placeholder="Name or principal ID…"
      data-ocid="group_manage.add_member_input"
    />
  );
}

// ── Join requests list ───────────────────────────────────────────────────────
function JoinRequestsList({ convId }: { convId: bigint }) {
  const { data: requests = [], isLoading } = useGroupJoinRequests(convId);
  const approve = useApproveJoinRequest();
  const deny = useDenyJoinRequest();

  const pending = requests.filter(
    (r) => r.status === JoinRequestStatus.pending,
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <p
        className="text-xs text-muted-foreground text-center py-4"
        data-ocid="group_manage.requests_empty_state"
      >
        No pending requests
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {pending.map((req: JoinRequest, idx: number) => {
        const requesterText = req.requesterId.toText();
        const displayName = getDisplayName(requesterText);
        const short = `${requesterText.slice(0, 14)}\u2026`;
        return (
          <div
            key={req.requestId}
            className="flex items-start gap-2 px-2 py-2 rounded-md bg-muted/40 border border-border"
            data-ocid={`group_manage.request.${idx + 1}`}
          >
            <UserAvatar principal={requesterText} size={28} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">
                {displayName}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {short}
              </p>
              {req.message && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {req.message}
                </p>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                type="button"
                aria-label="Approve request"
                onClick={() =>
                  approve.mutate(
                    { requestId: req.requestId, conversationId: convId },
                    {
                      onSuccess: () => toast.success(`${displayName} approved`),
                      onError: (e) =>
                        toast.error(`Approve failed: ${(e as Error).message}`),
                    },
                  )
                }
                disabled={approve.isPending || deny.isPending}
                className="p-1.5 rounded-md text-muted-foreground hover:text-green-600 hover:bg-green-500/10 transition-colors"
                data-ocid={`group_manage.approve_button.${idx + 1}`}
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                aria-label="Deny request"
                onClick={() =>
                  deny.mutate(
                    { requestId: req.requestId, conversationId: convId },
                    {
                      onSuccess: () => toast.info(`${displayName} denied`),
                      onError: (e) =>
                        toast.error(`Deny failed: ${(e as Error).message}`),
                    },
                  )
                }
                disabled={approve.isPending || deny.isPending}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                data-ocid={`group_manage.deny_button.${idx + 1}`}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
interface GroupManagePanelProps {
  conv: ConversationPublic;
  myPrincipal: string;
  open: boolean;
  onClose: () => void;
  pendingRequestCount: number;
}

export function GroupManagePanel({
  conv,
  myPrincipal,
  open,
  onClose,
  pendingRequestCount,
}: GroupManagePanelProps) {
  const navigate = useNavigate();
  const deleteGroup = useDeleteGroupConversation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (conv.kind !== ConversationKind.group) return null;

  const groupLabel =
    conv.displayName ?? `Group ${conv.id.toString().slice(0, 6)}`;

  const handleDelete = () => {
    deleteGroup.mutate(conv.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        onClose();
        navigate({ to: "/app/conversations" });
      },
      onError: (e) =>
        toast.error(`Failed to delete group: ${(e as Error).message}`),
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-[340px] sm:w-[380px] p-0 flex flex-col"
          data-ocid="group_manage.panel"
        >
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <SheetTitle className="text-base font-semibold">
              Manage Group
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {groupLabel}
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-5 py-4 space-y-6">
              {/* Members */}
              <section data-ocid="group_manage.members_section">
                <SectionHeading>Members ({conv.members.length})</SectionHeading>
                <MembersList conv={conv} myPrincipal={myPrincipal} />
              </section>

              <Separator />

              {/* Add member */}
              <section data-ocid="group_manage.add_member_section">
                <SectionHeading>Add Member</SectionHeading>
                <AddMemberForm convId={conv.id} />
              </section>

              <Separator />

              {/* Join requests */}
              <section data-ocid="group_manage.requests_section">
                <SectionHeading>
                  Join Requests
                  {pendingRequestCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none">
                      {pendingRequestCount}
                    </span>
                  )}
                </SectionHeading>
                <JoinRequestsList convId={conv.id} />
              </section>

              <Separator />

              {/* Danger zone */}
              <section data-ocid="group_manage.danger_section">
                <SectionHeading>Danger Zone</SectionHeading>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setDeleteOpen(true)}
                  data-ocid="group_manage.delete_button"
                >
                  <Trash2 size={14} />
                  Delete Group
                </Button>
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog — rendered outside the Sheet so it isn't clipped */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent data-ocid="group_manage.delete_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteGroup.isPending}
              data-ocid="group_manage.delete_cancel_button"
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="group_manage.delete_confirm_button"
            >
              {deleteGroup.isPending ? "Deleting…" : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
