import { createActor } from "@/backend";
import { useAuth } from "@/context/auth-context";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Types (local since they don't exist in backend.d.ts yet) ─────────────────

export interface GroupRetentionPolicy {
  convId: bigint;
  retentionEnabled: boolean;
  enabledAt?: bigint;
  enabledBy?: string;
}

export interface EscrowRecord {
  deviceId: string;
  deviceLabel: string;
  devicePublicKeyFingerprint: string;
  consentDate: bigint;
  status: "active" | "revoked";
  revokedAt?: bigint;
  revokedReason?: string;
}

export interface EscrowAccessGrant {
  grantId: bigint;
  targetUserId: string;
  targetDeviceId: string;
  requestingAdmin: string;
  grantTimestamp: bigint;
  reason: string;
  wrappedKey?: Uint8Array;
}

export interface AuditExportRequest {
  startDate?: bigint;
  endDate?: bigint;
  eventTypes: string[];
  affectedUser?: string;
  format: "csv" | "json";
}

export interface RetentionMetadataRecord {
  convId: bigint;
  participants: string[];
  messageTimestamp: bigint;
  sequenceId: bigint;
}

// ── Group Retention ──────────────────────────────────────────────────────────

export function useGroupRetentionPolicy(convId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GroupRetentionPolicy | null>({
    queryKey: ["group-retention", convId?.toString()],
    queryFn: async () => {
      if (!actor || convId === null) return null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (actor as any).getGroupRetentionPolicy(convId);
        if (result?.__kind__ === "ok") return result.ok as GroupRetentionPolicy;
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && convId !== null,
    staleTime: 30_000,
  });
}

export function useEnableGroupRetention() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (convId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).enableGroupRetention(convId);
      if (result?.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: (_data, convId) => {
      void qc.invalidateQueries({
        queryKey: ["group-retention", convId.toString()],
      });
    },
  });
}

export function useDisableGroupRetention() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (convId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).disableGroupRetention(convId);
      if (result?.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: (_data, convId) => {
      void qc.invalidateQueries({
        queryKey: ["group-retention", convId.toString()],
      });
    },
  });
}

// ── Key Escrow (User) ────────────────────────────────────────────────────────

export function useMyEscrowStatus() {
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated } = useAuth();
  return useQuery<EscrowRecord[]>({
    queryKey: ["my-escrow-status"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (actor as any).getMyEscrowStatus();
        return (result ?? []) as EscrowRecord[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && isAuthenticated,
    staleTime: 60_000,
  });
}

export function useEnrollKeyEscrow() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      deviceId: string;
      deviceLabel: string;
      devicePublicKeyFingerprint: string;
      wrappedKey: Uint8Array;
      consentLanguageVersion: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).enrollKeyEscrow(
        args.deviceId,
        args.deviceLabel,
        args.devicePublicKeyFingerprint,
        args.wrappedKey,
        args.consentLanguageVersion,
      );
      if (result?.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-escrow-status"] });
    },
  });
}

export function useRevokeKeyEscrow() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { deviceId: string; reason: string }) => {
      if (!actor) throw new Error("Actor not ready");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).revokeKeyEscrow(
        args.deviceId,
        args.reason,
      );
      if (result?.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-escrow-status"] });
    },
  });
}

// ── Key Escrow (Admin) ───────────────────────────────────────────────────────

export function useAdminEscrowGrants(targetUserId?: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<EscrowAccessGrant[]>({
    queryKey: ["admin-escrow-grants", targetUserId],
    queryFn: async () => {
      if (!actor) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // Candid positional args: targetUserId: ?Principal ([] = null), limit: bigint, afterGrantId: ?Nat ([] = null)
        const result = await (actor as any).adminGetEscrowGrants([], 100n, []);
        if (result?.__kind__ === "ok") return result.ok as EscrowAccessGrant[];
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useAdminGrantEscrow() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      targetUserId: string;
      targetDeviceId: string;
      reason: string;
    }): Promise<EscrowAccessGrant> => {
      if (!actor) throw new Error("Actor not ready");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).adminGrantEscrowAccess(
        args.targetUserId,
        args.targetDeviceId,
        args.reason,
      );
      if (result?.__kind__ === "err") throw new Error(result.err);
      return result.ok as EscrowAccessGrant;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-escrow-grants"] });
      void qc.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

// ── Audit Log Export ─────────────────────────────────────────────────────────

export function useExportAuditLog() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (req: AuditExportRequest): Promise<string> => {
      if (!actor) throw new Error("Actor not ready");
      // Map string event type names to Candid variant objects { variantName: null }.
      // An empty array encodes Candid ?[T] as null (match all events).
      const candid_eventTypes: Array<Record<string, null>> = (
        req.eventTypes ?? []
      ).map((et) => ({ [et]: null }) as Record<string, null>);
      const candid_req = {
        startDate: req.startDate !== undefined ? [req.startDate] : [],
        endDate: req.endDate !== undefined ? [req.endDate] : [],
        eventTypes: candid_eventTypes.length > 0 ? [candid_eventTypes] : [],
        affectedUser: req.affectedUser !== undefined ? [req.affectedUser] : [],
        format: req.format === "csv" ? { csv: null } : { json: null },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).exportAuditLog(candid_req);
      if (result?.__kind__ === "err") throw new Error(result.err);
      return result.ok as string;
    },
  });
}
