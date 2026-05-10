import { createActor } from "@/backend";
import type {
  AnswerCallRequest,
  CallRecordPublic,
  CallStatus,
  InitiateCallRequest,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useActiveCalls() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<CallRecordPublic[]>({
    queryKey: ["active-calls"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listActiveCalls();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 1000,
    staleTime: 500,
  });
}

export function useCall(id: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<CallRecordPublic | null>({
    queryKey: ["call", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getCall(id);
    },
    enabled: !!actor && !isFetching && id !== null,
    refetchInterval: 1000,
    staleTime: 500,
  });
}

export function useInitiateCall() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: InitiateCallRequest) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.initiateCall(req);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-calls"] });
    },
  });
}

export function useAnswerCall() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: AnswerCallRequest) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.answerCall(req);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-calls"] });
    },
  });
}

export function useEndCall() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      callId,
      reason,
    }: { callId: bigint; reason: CallStatus }) => {
      if (!actor) throw new Error("Not connected");
      return actor.endCall(callId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-calls"] });
    },
  });
}

export type {
  CallRecordPublic,
  CallStatus,
  InitiateCallRequest,
  AnswerCallRequest,
};
