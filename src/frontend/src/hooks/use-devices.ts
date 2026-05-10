import { createActor } from "@/backend";
import type { AddDeviceRequest, DeviceRecordPublic } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── List my registered devices ────────────────────────────────────────────────
export function useMyDevices() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<DeviceRecordPublic[]>({
    queryKey: ["myDevices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyDevices();
    },
    enabled: !!actor && !isFetching,
    staleTime: 5000,
    refetchInterval: 10_000,
  });
}

// ── Register a new device ─────────────────────────────────────────────────────
export function useAddDevice() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: AddDeviceRequest) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.addDevice(req);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDevices"] });
    },
  });
}

// ── Revoke a device ───────────────────────────────────────────────────────────
export function useRevokeDevice() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.revokeDevice(deviceId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDevices"] });
    },
  });
}

// ── Generate a sync token (QR pairing) ───────────────────────────────────────
export function useGenerateDeviceSyncToken() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (devicePublicKey: Uint8Array) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.generateDeviceSyncToken(devicePublicKey);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok; // returns the token string
    },
  });
}

// ── Redeem a sync token on a new device ──────────────────────────────────────
export function useRedeemDeviceSyncToken() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      deviceId,
      deviceLabel,
    }: {
      token: string;
      deviceId: string;
      deviceLabel: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.redeemDeviceSyncToken(
        token,
        deviceId,
        deviceLabel,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDevices"] });
    },
  });
}
