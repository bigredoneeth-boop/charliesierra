/**
 * use-admin.ts
 * React Query hooks for all admin / org operations.
 * Each hook follows the useActor + createActor pattern used throughout the app.
 */
import { type RetentionPolicy, createActor } from "@/backend";
import type {
  AuditEvent,
  CreateOrgRequest,
  EscrowAccessGrant,
  EscrowStatsRecord,
  EscrowedUserRecord,
  ExportAuditLogsRequest,
  GetAllGroupsRequest,
  GetAuditLogRequest,
  GetEscrowedUsersRequest,
  GetOrgUsersRequest,
  GetOrgUsersResponse,
  GetOrgsRequest,
  GetOrgsResponse,
  GroupAdminRecord,
  GroupMemberRecord,
  InviteUserRequest,
  OrgId,
  OrgMembership,
  OrgRecord,
  OrgRole,
  RecoveryRequest,
  RecoveryRequestStatus,
  RemoveMemberFromGroupRequest,
  SuspendUserRequest,
  UpdateMemberRoleRequest,
  UserId,
} from "@/backend";
import { useAuth } from "@/context/auth-context";
import { extractErrText } from "@/lib/error-utils";
import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const STALE = 30_000;

// ── Read: my org memberships ─────────────────────────────────────────────────
export function useMyOrgs() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<OrgMembership[]>({
    queryKey: ["admin", "my-orgs"],
    queryFn: async () => {
      if (!actor) return [];
      const res = await actor.getMyOrgs();
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Read: my role in a specific org ─────────────────────────────────────────
export function useMyRole(orgId: OrgId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<OrgRole | null>({
    queryKey: ["admin", "my-role", orgId],
    queryFn: async () => {
      if (!actor || !orgId) return null;
      const res = await actor.getMyRole(orgId);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching && !!orgId,
    staleTime: STALE,
  });
}

// ── Read: paginated org list ─────────────────────────────────────────────────
export interface UseOrgsRequest {
  limit: bigint;
  afterOrgId?: OrgId;
  search?: string;
}

export function useOrgs(req: UseOrgsRequest) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GetOrgsResponse>({
    queryKey: [
      "admin",
      "orgs",
      req.limit.toString(),
      req.afterOrgId,
      req.search ?? "",
    ],
    queryFn: async () => {
      if (!actor) return { total: BigInt(0), orgs: [] };
      const res = await actor.listOrgs({
        limit: req.limit,
        afterOrgId: req.afterOrgId,
        search: req.search ?? undefined,
      });
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Read: single org record ──────────────────────────────────────────────────
export function useOrgDetails(orgId: OrgId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<OrgRecord | null>({
    queryKey: ["admin", "org", orgId],
    queryFn: async () => {
      if (!actor || !orgId) return null;
      const res = await actor.getOrg(orgId);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching && !!orgId,
    staleTime: STALE,
  });
}

// ── Read: org user list ──────────────────────────────────────────────────────
// ── Read: org user list ──────────────────────────────────────────────────────
export function useOrgUsers(req: GetOrgUsersRequest | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GetOrgUsersResponse>({
    queryKey: [
      "admin",
      "org-users",
      req?.orgId,
      req?.limit.toString(),
      req?.afterUserId?.toText?.(),
      req?.search ?? null,
    ],
    queryFn: async () => {
      if (!actor || !req)
        return { total: BigInt(0), hasMore: false, members: [] };
      const res = await actor.getOrgUsers(req);
      if (res.__kind__ === "err") throw new Error(res.err);
      return res.ok;
    },
    enabled: !!actor && !isFetching && !!req,
    staleTime: STALE,
  });
}

// ── Read: audit log (paginated) ──────────────────────────────────────────────
export function useAdminAuditLog(req: GetAuditLogRequest) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<AuditEvent[]>({
    queryKey: [
      "admin",
      "audit-log",
      req.limit.toString(),
      req.filterEventType,
      req.afterEventId?.toString(),
    ],
    queryFn: async () => {
      if (!actor) return [];
      const res = await actor.getAuditLog(req);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Read: all groups (admin) ────────────────────────────────────────────────────────
export function useAllGroups(req: GetAllGroupsRequest) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GroupAdminRecord[]>({
    queryKey: ["admin", "groups", req.orgId ?? null],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllGroups(req);
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Read: group members ─────────────────────────────────────────────────────────────
export function useGroupMembers(groupId: bigint) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GroupMemberRecord[]>({
    queryKey: ["admin", "group-members", groupId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      const res = await actor.getGroupMembers({ groupId });
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Mutation: remove member from group ──────────────────────────────────────────
export function useRemoveMemberFromGroup() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: RemoveMemberFromGroupRequest) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.removeMemberFromGroup(req);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: (_data, req) => {
      void qc.invalidateQueries({
        queryKey: ["admin", "group-members", req.groupId.toString()],
      });
      void qc.invalidateQueries({ queryKey: ["admin", "groups"] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}

// ── Read: super-admin check ──────────────────────────────────────────────────
/**
 * Derives super-admin status by checking whether the current principal is in
 * the listAdmins result. Caches for 30 s.
 */
export function useIsSuperAdmin() {
  const { actor, isFetching } = useActor(createActor);
  const { principal } = useAuth();
  return useQuery<boolean>({
    queryKey: ["admin", "is-super-admin", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return false;
      const res = await actor.listAdmins();
      if (res.__kind__ === "err") return false;
      return res.ok.some((p) => p.toText() === principal.toText());
    },
    enabled: !!actor && !isFetching && !!principal,
    staleTime: STALE,
  });
}

// ── Mutation: create org ─────────────────────────────────────────────────────
export function useCreateOrg() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: CreateOrgRequest) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.createOrg(req);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "orgs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "my-orgs"] });
    },
  });
}

// ── Mutation: invite user ────────────────────────────────────────────────────
export function useInviteUser() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: InviteUserRequest) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.inviteUser(req);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: (_data, req) => {
      void qc.invalidateQueries({
        queryKey: ["admin", "org-users", req.orgId],
      });
    },
  });
}

// ── Mutation: update member role ─────────────────────────────────────────────
export function useUpdateMemberRole() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: UpdateMemberRoleRequest) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.updateMemberRole(req);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: (_data, req) => {
      void qc.invalidateQueries({
        queryKey: ["admin", "org-users", req.orgId],
      });
    },
  });
}

// ── Mutation: suspend member ─────────────────────────────────────────────────
export function useSuspendMember() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: SuspendUserRequest) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.suspendMember(req);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: (_data, req) => {
      void qc.invalidateQueries({
        queryKey: ["admin", "org-users", req.orgId],
      });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}

// ── Mutation: remove member ──────────────────────────────────────────────────
export function useRemoveMember() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: OrgId; userId: UserId }) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.removeMember(orgId, userId);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: (_data, { orgId }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "org-users", orgId] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}
// ── Mutation: reactivate member ──────────────────────────────────────────────
export function useReactivateMember() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, userId }: { orgId: OrgId; userId: UserId }) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.reactivateMember(orgId, userId);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: (_data, { orgId }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "org-users", orgId] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}

// ── Mutation: update org ───────────────────────────────────────────────────────
export function useUpdateOrg() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orgId,
      name,
      description,
    }: {
      orgId: OrgId;
      name: string;
      description: string | null;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.updateOrg(orgId, name, description);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: (_data, { orgId }) => {
      void qc.invalidateQueries({ queryKey: ["admin", "orgs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "org", orgId] });
      void qc.invalidateQueries({ queryKey: ["admin", "my-orgs"] });
    },
  });
}

// ── Mutation: suspend org ────────────────────────────────────────────────────
export function useSuspendOrg() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: OrgId) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.suspendOrg(orgId);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "orgs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "my-orgs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}

// ── Mutation: delete org ─────────────────────────────────────────────────────
export function useDeleteOrg() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: OrgId) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.deleteOrg(orgId);
      if (res.__kind__ === "err") throw new Error(res.err);
      return res.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "orgs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "my-orgs"] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}

/**
 * Calls hasSuperAdmin() on the canister. Used to gate the bootstrap page
 * and to surface a prompt in AdminAccessGate when no admin is set up yet.
 */
export function useHasSuperAdmin() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["admin", "has-super-admin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasSuperAdmin();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Mutation: bootstrap the first Super Admin ─────────────────────────────────
/**
 * Calls bootstrapSuperAdmin(principal). Succeeds only once — the backend
 * rejects the call if a Super Admin already exists.
 */
export function useBootstrapSuperAdmin() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.bootstrapSuperAdmin(principal);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: () => {
      // Bust all admin caches so the new Super Admin state propagates immediately.
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

// ── Mutation: export audit logs ───────────────────────────────────────────────
/**
 * Calls exportAuditLogs with current filters — returns up to 10,000 events
 * for client-side CSV generation.
 */
export function useExportAuditLogs() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (req: ExportAuditLogsRequest) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.exportAuditLogs(req);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
  });
}

// ── Read: escrow stats ────────────────────────────────────────────────────────
export function useEscrowStats() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<EscrowStatsRecord>({
    queryKey: ["admin", "escrow-stats"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.getEscrowStats();
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Read: escrowed users (paginated) ─────────────────────────────────────────
export function useEscrowedUsers(req: GetEscrowedUsersRequest) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<EscrowedUserRecord[]>({
    queryKey: [
      "admin",
      "escrowed-users",
      req.orgId ?? null,
      req.afterUserId ?? null,
      req.limit.toString(),
    ],
    queryFn: async () => {
      if (!actor) return [];
      const res = await actor.getEscrowedUsers(req);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Read: recovery requests ──────────────────────────────────────────────────
export function useRecoveryRequests(
  orgId: OrgId | null,
  statusFilter: RecoveryRequestStatus | null,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<RecoveryRequest[]>({
    queryKey: ["admin", "recovery-requests", orgId, statusFilter],
    queryFn: async () => {
      if (!actor) return [];
      const res = await actor.getRecoveryRequests(
        orgId ?? null,
        statusFilter ?? null,
      );
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Read: escrow access grants for a user ───────────────────────────────────
export function useEscrowGrants(targetUserId: UserId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<EscrowAccessGrant[]>({
    queryKey: ["admin", "escrow-grants", targetUserId?.toText?.()],
    queryFn: async () => {
      if (!actor) return [];
      const res = await actor.adminGetEscrowGrants(
        targetUserId ?? null,
        50n,
        null,
      );
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE,
  });
}

// ── Mutation: initiate key recovery ─────────────────────────────────────────
export function useInitiateKeyRecovery() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      targetUserId,
      targetDeviceId,
      reason,
      orgId,
    }: {
      targetUserId: UserId;
      targetDeviceId: string;
      reason: string;
      orgId: OrgId | null;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.initiateKeyRecovery(
        targetUserId,
        targetDeviceId,
        reason,
        orgId ?? null,
      );
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "recovery-requests"] });
      void qc.invalidateQueries({ queryKey: ["admin", "escrow-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}

// ── Mutation: approve key recovery ──────────────────────────────────────────
export function useApproveKeyRecovery() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.approveKeyRecovery(requestId);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "recovery-requests"] });
      void qc.invalidateQueries({ queryKey: ["admin", "escrow-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}

// ── Mutation: reject key recovery ───────────────────────────────────────────
// ── Read: policies expiring within 30 days ──────────────────────────────────
/**
 * Calls checkPolicyExpiry() — returns policies expiring within 30 days.
 * Refreshes every 60 seconds to keep the sidebar badge count live.
 */
export function useCheckPolicyExpiry() {
  const { actor, isFetching } = useActor(createActor);
  const { principal } = useAuth();
  return useQuery<RetentionPolicy[]>({
    queryKey: ["admin", "policy-expiry", principal?.toText()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.checkPolicyExpiry(null);
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

// ── Mutation: log policy report exported ─────────────────────────────────────
/**
 * Logs a policyReportExported audit event.
 * Called after PDF compliance report is generated and downloaded.
 */
export function useLogPolicyReportExported() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (orgFilter?: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.logPolicyReportExported(orgFilter ?? null);
    },
  });
}

// ── Mutation: log policy expiry check ────────────────────────────────────────
/**
 * Logs a policyExpiryCheckPerformed audit event.
 * Called once on first page load of AdminRetentionPoliciesPage.
 */
export function useLogPolicyExpiryCheck() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      await actor.logPolicyExpiryCheck();
    },
  });
}

export function useRejectKeyRecovery() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      const res = await actor.rejectKeyRecovery(requestId);
      if (res.__kind__ === "err") throw new Error(extractErrText(res));
      return res.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "recovery-requests"] });
      void qc.invalidateQueries({ queryKey: ["admin", "escrow-stats"] });
      void qc.invalidateQueries({ queryKey: ["admin", "audit-log"] });
    },
  });
}

// ── Mutation: enroll user in vetKeys key escrow ────────────────────────────────
export function useEnrollUserKeyEscrow() {
  const queryClient = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (_principalId: string) => {
      if (!actor) throw new Error("Actor not ready");
      // getEncryptedEscrowKey / enrollUserKeyEscrow not yet in canister bindings.
      // Throw a clear error so callers know to redeploy and run pnpm bindgen.
      const fn = (actor as unknown as Record<string, unknown>)
        .enrollUserKeyEscrow;
      if (typeof fn !== "function") {
        throw new Error(
          "vetKeys enrollment not yet available in canister bindings. Please redeploy and run pnpm bindgen.",
        );
      }
      const result = (await fn.call(actor)) as { ok?: string; err?: string };
      if ("err" in result && result.err !== undefined)
        throw new Error(extractErrText(result));
      return result.ok ?? "Enrolled";
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "escrowed-users"],
      });
    },
  });
}

// ── Mutation: get encrypted escrow key via vetKeys transport ─────────────────
export function useGetEncryptedEscrowKey() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({
      targetPrincipal,
      transportPublicKey,
    }: { targetPrincipal: string; transportPublicKey: Uint8Array }) => {
      if (!actor) throw new Error("Actor not ready");
      const { Principal } = await import("@dfinity/principal");
      const fn = (actor as unknown as Record<string, unknown>)
        .getEncryptedEscrowKey;
      if (typeof fn !== "function") {
        throw new Error(
          "getEncryptedEscrowKey not available in canister bindings.",
        );
      }
      const result = (await fn.call(
        actor,
        Principal.fromText(targetPrincipal),
        transportPublicKey,
      )) as { ok?: Uint8Array; err?: string };
      if ("err" in result && result.err !== undefined)
        throw new Error(extractErrText(result));
      if (!result.ok) throw new Error("No key data returned");
      return result.ok;
    },
  });
}
