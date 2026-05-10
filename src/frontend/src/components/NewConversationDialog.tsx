import { createActor } from "@/backend";
import type { UserId, UserProfilePublic } from "@/backend";
import { ContactSearchInput } from "@/components/ContactSearchInput";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { deriveGroupKey, encryptMessage } from "@/lib/crypto";
import { useActor } from "@caffeineai/core-infrastructure";
import { useNavigate } from "@tanstack/react-router";
import { Globe, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
}: NewConversationDialogProps) {
  const { actor } = useActor(createActor);
  const { principal } = useAuth();
  const navigate = useNavigate();

  // Direct tab
  const [directPeer, setDirectPeer] = useState<UserId | null>(null);
  const [directProfile, setDirectProfile] = useState<UserProfilePublic | null>(
    null,
  );
  const [directLoading, setDirectLoading] = useState(false);

  // Group tab
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupCategory, setGroupCategory] = useState("");
  const [groupDiscoverable, setGroupDiscoverable] = useState(false);
  const [groupMembers, setGroupMembers] = useState<
    { userId: UserId; profile: UserProfilePublic | null }[]
  >([]);
  const [groupLoading, setGroupLoading] = useState(false);

  const resetState = () => {
    setDirectPeer(null);
    setDirectProfile(null);
    setGroupName("");
    setGroupDescription("");
    setGroupCategory("");
    setGroupDiscoverable(false);
    setGroupMembers([]);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const handleDirectSelect = (
    userId: UserId,
    profile: UserProfilePublic | null,
  ) => {
    setDirectPeer(userId);
    setDirectProfile(profile);
  };

  const handleGroupMemberSelect = (
    userId: UserId,
    profile: UserProfilePublic | null,
  ) => {
    if (groupMembers.some((m) => m.userId.toText() === userId.toText())) return;
    setGroupMembers((prev) => [...prev, { userId, profile }]);
  };

  const removeGroupMember = (principalText: string) => {
    setGroupMembers((prev) =>
      prev.filter((m) => m.userId.toText() !== principalText),
    );
  };

  const startDirectChat = async () => {
    if (!actor || !directPeer) return;
    setDirectLoading(true);
    try {
      const result = await actor.createDirectConversation({ peer: directPeer });
      if (result.__kind__ === "err") {
        toast.error(`Failed to create chat: ${result.err}`);
        return;
      }
      onOpenChange(false);
      resetState();
      navigate({
        to: "/app/conversations/$id",
        params: { id: result.ok.id.toString() },
      });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDirectLoading(false);
    }
  };

  const createGroup = async () => {
    if (!actor || !groupName.trim() || groupMembers.length === 0) return;
    setGroupLoading(true);
    try {
      // Validate that all added members are registered users before submitting.
      const unverified = groupMembers.filter((m) => m.profile === null);
      if (unverified.length > 0) {
        const checks = await Promise.allSettled(
          unverified.map(async (m) => {
            const profile = await actor.getUserProfile(m.userId);
            return { userId: m.userId, exists: profile !== null };
          }),
        );
        const missing = checks
          .filter(
            (
              r,
            ): r is PromiseFulfilledResult<{
              userId: UserId;
              exists: boolean;
            }> => r.status === "fulfilled" && !r.value.exists,
          )
          .map((r) => r.value.userId);
        if (missing.length > 0) {
          const label = missing[0].toText().slice(0, 16);
          toast.error(
            `User ${label}… is not registered on CharlieSierra. They need to sign in first.`,
          );
          return;
        }
      }

      // Derive a deterministic group key from all members (including creator)
      // so every member independently computes the same key.
      const callerText = principal ? principal.toText() : "";
      const memberTexts = groupMembers.map((m) => m.userId.toText());
      // De-duplicate: ensure caller is in the list exactly once
      const allPrincipals = Array.from(
        new Set([callerText, ...memberTexts].filter(Boolean)),
      );

      let encryptedName: Uint8Array;
      try {
        const groupKey = await deriveGroupKey(allPrincipals);
        encryptedName = await encryptMessage(groupKey, groupName.trim());
      } catch (cryptoErr) {
        console.warn(
          "[CharlieSierra] Group name encryption failed, falling back to plain bytes:",
          cryptoErr,
        );
        // Fallback: store name as UTF-8 bytes (unencrypted but non-blocking)
        encryptedName = new TextEncoder().encode(groupName.trim());
      }

      const result = await actor.createGroupConversation({
        encryptedName,
        initialMembers: groupMembers.map((m) => m.userId),
        discoverable: groupDiscoverable,
        description: groupDescription.trim() || undefined,
        category: groupCategory.trim() || undefined,
        displayName: groupName.trim(),
      });

      if (result.__kind__ === "err") {
        const errMessages: Record<string, string> = {
          notFound:
            "One or more members could not be found. Please check the principal IDs and try again.",
          invalidInput: "Please add at least one member to the group.",
          unauthorized: "You don't have permission to create groups.",
          forbidden: "Group creation is not allowed.",
          alreadyExists: "A group with these members already exists.",
        };
        const msg =
          errMessages[result.err as string] ??
          `Failed to create group (${result.err}).`;
        console.error(
          "[CharlieSierra] createGroupConversation error:",
          result.err,
        );
        toast.error(msg);
        return;
      }

      onOpenChange(false);
      resetState();
      navigate({
        to: "/app/conversations/$id",
        params: { id: result.ok.id.toString() },
      });
    } catch (err) {
      console.error("[CharlieSierra] createGroup unexpected error:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        message
          ? `Failed to create group: ${message}`
          : "Something went wrong. Please try again.",
      );
    } finally {
      setGroupLoading(false);
    }
  };

  const groupMemberPrincipals = groupMembers.map((m) => m.userId.toText());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md"
        data-ocid="new_conversation.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            New Conversation
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="direct" className="mt-1">
          <TabsList className="w-full" data-ocid="new_conversation.tab_list">
            <TabsTrigger
              value="direct"
              className="flex-1"
              data-ocid="new_conversation.tab.direct"
            >
              Direct Chat
            </TabsTrigger>
            <TabsTrigger
              value="group"
              className="flex-1"
              data-ocid="new_conversation.tab.group"
            >
              Group
            </TabsTrigger>
          </TabsList>

          {/* ── Direct chat ──────────────────────────────────────────── */}
          <TabsContent value="direct" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Search contacts
              </Label>
              <ContactSearchInput
                onSelect={handleDirectSelect}
                placeholder="Name or principal ID…"
              />
            </div>

            {directPeer && (
              <div
                className="flex items-center gap-3 p-3 rounded-md bg-muted/60 border border-border"
                data-ocid="new_conversation.direct_preview"
              >
                <UserAvatar principal={directPeer.toText()} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {directPeer.toText().slice(0, 20)}…
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {directProfile ? "User found" : "Unknown user"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDirectPeer(null);
                    setDirectProfile(null);
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear selection"
                  data-ocid="new_conversation.clear_direct"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <Button
              onClick={startDirectChat}
              disabled={!directPeer || directLoading}
              className="w-full"
              data-ocid="new_conversation.start_chat_button"
            >
              {directLoading && (
                <Loader2 size={14} className="mr-2 animate-spin" />
              )}
              Start Chat
            </Button>
          </TabsContent>

          {/* ── Group chat ───────────────────────────────────────────── */}
          <TabsContent value="group" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="group-name-input"
                className="text-xs text-muted-foreground uppercase tracking-wider"
              >
                Group Name
              </Label>
              <Input
                id="group-name-input"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Team Falcon…"
                maxLength={80}
                data-ocid="new_conversation.group_name_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="group-description-input"
                className="text-xs text-muted-foreground uppercase tracking-wider"
              >
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="group-description-input"
                value={groupDescription}
                onChange={(e) =>
                  setGroupDescription(e.target.value.slice(0, 500))
                }
                placeholder="What's this group for?…"
                maxLength={500}
                rows={2}
                className="resize-none text-sm"
                data-ocid="new_conversation.group_description_input"
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {groupDescription.length}/500
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="group-category-input"
                className="text-xs text-muted-foreground uppercase tracking-wider"
              >
                Category{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="group-category-input"
                value={groupCategory}
                onChange={(e) => setGroupCategory(e.target.value)}
                placeholder="e.g. Operations, Intel, Support…"
                maxLength={40}
                data-ocid="new_conversation.group_category_input"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="group-discoverable"
                className="flex items-start gap-3 cursor-pointer"
                data-ocid="new_conversation.group_discoverable_row"
              >
                <Checkbox
                  id="group-discoverable"
                  checked={groupDiscoverable}
                  onCheckedChange={(v) => setGroupDiscoverable(v === true)}
                  className="mt-0.5"
                  data-ocid="new_conversation.group_discoverable_checkbox"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Globe size={13} className="text-muted-foreground" />
                    Make discoverable
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This group will appear in community discovery. Other users
                    can request to join.
                  </p>
                </div>
              </label>
              {groupDiscoverable && (
                <div
                  className="ml-7 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300"
                  data-ocid="new_conversation.discoverable_notice"
                >
                  This group will appear in community discovery. Other users can
                  request to join. A group admin must approve join requests.
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Add Members
              </Label>
              <ContactSearchInput
                onSelect={handleGroupMemberSelect}
                placeholder="Enter principal ID…"
                exclude={groupMemberPrincipals}
              />
            </div>

            {groupMembers.length > 0 && (
              <div
                className="flex flex-wrap gap-2"
                data-ocid="new_conversation.members_list"
              >
                {groupMembers.map(({ userId, profile }) => (
                  <div
                    key={userId.toText()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs"
                    data-ocid={`new_conversation.member.${userId.toText().slice(0, 8)}`}
                  >
                    <UserAvatar
                      principal={userId.toText()}
                      displayName={profile ? undefined : undefined}
                      size={18}
                    />
                    <span className="text-foreground font-medium">
                      {userId.toText().slice(0, 8)}…
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGroupMember(userId.toText())}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                      aria-label={`Remove ${userId.toText()}`}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={createGroup}
              disabled={
                !groupName.trim() || groupMembers.length === 0 || groupLoading
              }
              className="w-full"
              data-ocid="new_conversation.create_group_button"
            >
              {groupLoading && (
                <Loader2 size={14} className="mr-2 animate-spin" />
              )}
              Create Group
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
