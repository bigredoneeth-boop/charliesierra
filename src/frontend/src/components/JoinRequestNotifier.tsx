/**
 * JoinRequestNotifier
 *
 * Mounted once in ProtectedLayout. Polls join requests for all groups
 * created by the current user, fires sonner toast alerts for new arrivals,
 * and exposes a live pending-request count to the rest of the tree via
 * PendingJoinRequestsContext.
 */

import { JoinRequestStatus, createActor } from "@/backend";
import type { ConversationPublic, JoinRequest } from "@/backend";
import { useAuth } from "@/context/auth-context";
import { PendingJoinRequestsContext } from "@/hooks/use-pending-join-requests";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── Poll requests for one group (shares query cache key with AdminPage) ─────
function useGroupRequestsPoll(conversationId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<JoinRequest[]>({
    queryKey: ["groupJoinRequests", conversationId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getGroupJoinRequests(conversationId);
      if (result.__kind__ === "err") return [];
      return result.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: 9_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
}

// ── Per-group watcher: null-rendering component ────────────────────────────
function GroupWatcher({
  conv,
  onUpdate,
}: {
  conv: ConversationPublic;
  onUpdate: (
    convId: bigint,
    requests: JoinRequest[],
    groupName: string,
  ) => void;
}) {
  const { data: requests = [] } = useGroupRequestsPoll(conv.id);
  const groupName =
    conv.displayName ?? `Group ${conv.id.toString().slice(0, 6)}`;

  useEffect(() => {
    onUpdate(conv.id, requests, groupName);
  }, [requests, conv.id, groupName, onUpdate]);

  return null;
}

// ── Hook: derive admin groups for the current user ──────────────────────
function useAdminGroups(): ConversationPublic[] {
  const { actor, isFetching } = useActor(createActor);
  const { principal } = useAuth();
  const myPrincipalText = principal?.toText();

  const { data: conversations = [] } = useQuery<ConversationPublic[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listConversations();
    },
    enabled: !!actor && !isFetching,
    staleTime: 5_500,
    refetchInterval: 6_000,
    refetchIntervalInBackground: false,
  });

  if (!myPrincipalText) return [];
  return conversations.filter(
    (c) => c.kind === "group" && c.createdBy?.toText() === myPrincipalText,
  );
}

// ── Provider: mounts watchers + exposes badge count via context ────────────
export function JoinRequestNotifier({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const adminGroups = useAdminGroups();

  const [requestsByGroup, setRequestsByGroup] = useState<
    Map<string, JoinRequest[]>
  >(new Map());

  const seenIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const loadedGroupIds = useRef<Set<string>>(new Set());
  // Keep a live snapshot of the group count for the first-load gate
  const adminGroupCount = useRef(0);
  adminGroupCount.current = adminGroups.length;

  // Always-current navigate ref so the toast action closure stays fresh
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const handleUpdate = useCallback(
    (convId: bigint, requests: JoinRequest[], groupName: string) => {
      const pending = requests.filter(
        (r) => r.status === JoinRequestStatus.pending,
      );
      const convIdStr = convId.toString();

      setRequestsByGroup((prev) => {
        const next = new Map(prev);
        next.set(convIdStr, pending);
        return next;
      });

      const wasFirstLoad = !loadedGroupIds.current.has(convIdStr);
      loadedGroupIds.current.add(convIdStr);

      // Once every admin group has reported, flip the flag and seed seen IDs
      if (
        !initialLoadDone.current &&
        adminGroupCount.current > 0 &&
        loadedGroupIds.current.size >= adminGroupCount.current
      ) {
        for (const r of pending) seenIds.current.add(r.requestId);
        initialLoadDone.current = true;
        return;
      }

      // During initial load: seed first-seen IDs silently (no toast)
      if (!initialLoadDone.current) {
        if (wasFirstLoad) {
          for (const r of pending) seenIds.current.add(r.requestId);
        }
        return;
      }

      // Post-initial-load: toast only genuinely new request IDs
      const newRequests = pending.filter(
        (r) => !seenIds.current.has(r.requestId),
      );

      for (const req of newRequests) {
        seenIds.current.add(req.requestId);
        const requesterStr = req.requesterId.toText();
        const short = `${requesterStr.slice(0, 10)}\u2026`;

        toast.info(`New join request \u2014 ${groupName}`, {
          description: `${short} wants to join`,
          duration: 8000,
          action: {
            label: "View",
            onClick: () =>
              void navigateRef.current({
                to: "/app/conversations/$id",
                params: { id: convId.toString() },
              }),
          },
        });
      }
    },
    [],
  );

  let totalPending = 0;
  for (const reqs of requestsByGroup.values()) {
    totalPending += reqs.length;
  }

  return (
    <PendingJoinRequestsContext.Provider value={totalPending}>
      {adminGroups.map((conv) => (
        <GroupWatcher
          key={conv.id.toString()}
          conv={conv}
          onUpdate={handleUpdate}
        />
      ))}
      {children}
    </PendingJoinRequestsContext.Provider>
  );
}
