import { createActor } from "@/backend";
import type {
  JoinRequest,
  JoinRequestActionRequest,
  PublicGroupSummary,
  SubmitJoinRequestRequest,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── List discoverable public groups (with optional category filter + pagination) ─
export function usePublicGroups(category?: string, offset = 0n) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PublicGroupSummary[]>({
    queryKey: ["publicGroups", category ?? "", offset.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPublicGroups({
        limit: 20n,
        offset,
        category: category ?? undefined,
      });
    },
    enabled: !!actor && !isFetching,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

// ── Submit a join request for a group ────────────────────────────────────────
export function useSubmitJoinRequest() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: SubmitJoinRequestRequest) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.submitJoinRequest(req);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicGroups"] });
    },
  });
}

// ── Get pending join requests for a group (for group admins) ─────────────────
export function useGroupJoinRequests(conversationId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<JoinRequest[]>({
    queryKey: ["groupJoinRequests", conversationId?.toString()],
    queryFn: async () => {
      if (!actor || conversationId === null) return [];
      const result = await actor.getGroupJoinRequests(conversationId);
      if (result.__kind__ === "err") return [];
      return result.ok;
    },
    enabled: !!actor && !isFetching && conversationId !== null,
    staleTime: 5_000,
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}

// ── Approve a join request ────────────────────────────────────────────────────
export function useApproveJoinRequest() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: JoinRequestActionRequest) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.approveJoinRequest(req);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["groupJoinRequests", vars.conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["publicGroups"] });
    },
  });
}

// ── Deny a join request ───────────────────────────────────────────────────────
export function useDenyJoinRequest() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: JoinRequestActionRequest) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.denyJoinRequest(req);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["groupJoinRequests", vars.conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["publicGroups"] });
    },
  });
}
