/**
 * AdminKeyEscrowPage
 * Full key escrow management: escrowed users table, recovery requests,
 * user detail side panel, and dual-control recovery dialogs.
 * Government-military aesthetic with cautious amber coloring for recovery actions.
 */
import {
  type EscrowAccessGrant,
  EscrowStatus,
  type EscrowedUserRecord,
  type RecoveryRequest,
  RecoveryRequestStatus,
} from "@/backend";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproveKeyRecovery,
  useEscrowGrants,
  useEscrowStats,
  useEscrowedUsers,
  useInitiateKeyRecovery,
  useRecoveryRequests,
  useRejectKeyRecovery,
} from "@/hooks/use-admin";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Key,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrincipal(p: string): string {
  if (p.length <= 16) return p;
  return `${p.slice(0, 8)}...${p.slice(-4)}`;
}

function formatNanoTs(ns: bigint | null | undefined): string {
  if (ns == null) return "—";
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success("Copied to clipboard", { duration: 2000 });
  });
}

// ── EscrowStatusBadge ─────────────────────────────────────────────────────────

function EscrowStatusBadge({ status }: { status: EscrowStatus }) {
  const config: Record<EscrowStatus, { label: string; className: string }> = {
    [EscrowStatus.active]: {
      label: "Active",
      className:
        "border text-green-700 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
    },
    [EscrowStatus.pendingRecovery]: {
      label: "Pending Recovery",
      className:
        "border text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    },
    [EscrowStatus.recovered]: {
      label: "Recovered",
      className:
        "border text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    },
    [EscrowStatus.revoked]: {
      label: "Revoked",
      className: "border text-muted-foreground bg-muted border-border",
    },
  };
  const c = config[status] ?? config[EscrowStatus.revoked];
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium whitespace-nowrap ${c.className}`}
    >
      {c.label}
    </Badge>
  );
}

// ── RecoveryStatusBadge ───────────────────────────────────────────────────────

function RecoveryStatusBadge({ status }: { status: RecoveryRequestStatus }) {
  const config: Record<
    RecoveryRequestStatus,
    { label: string; className: string }
  > = {
    [RecoveryRequestStatus.pending]: {
      label: "Pending",
      className:
        "border text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    },
    [RecoveryRequestStatus.approved]: {
      label: "Approved",
      className:
        "border text-green-700 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-400",
    },
    [RecoveryRequestStatus.rejected]: {
      label: "Rejected",
      className: "border text-muted-foreground bg-muted border-border",
    },
    [RecoveryRequestStatus.completed]: {
      label: "Completed",
      className:
        "border text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",
    },
  };
  const c = config[status] ?? config[RecoveryRequestStatus.pending];
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium whitespace-nowrap ${c.className}`}
    >
      {c.label}
    </Badge>
  );
}

// ── PrincipalCell ─────────────────────────────────────────────────────────────

function PrincipalCell({ value }: { value: string }) {
  const text =
    typeof (value as unknown as { toText?: () => string }).toText === "function"
      ? (value as unknown as { toText: () => string }).toText()
      : String(value);
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <span className="text-foreground" title={text}>
        {formatPrincipal(text)}
      </span>
      <button
        type="button"
        onClick={() => copyToClipboard(text)}
        aria-label="Copy principal"
        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        <Copy size={11} />
      </button>
    </div>
  );
}

// ── EscrowGrantsSection ───────────────────────────────────────────────────────

function EscrowGrantsSection({
  userId,
}: { userId: { toText?: () => string } }) {
  const grants = useEscrowGrants(
    userId as Parameters<typeof useEscrowGrants>[0],
  );

  if (grants.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (!grants.data || grants.data.length === 0) {
    return (
      <p
        className="text-xs text-muted-foreground italic py-2"
        data-ocid="escrow.grants.empty_state"
      >
        No recovery grants on record
      </p>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded border border-border"
      data-ocid="escrow.grants.table"
    >
      <table className="w-full text-xs">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">
              Grant ID
            </th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">
              Requested By
            </th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider">
              Outcome
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {grants.data.map((grant: EscrowAccessGrant) => (
            <tr
              key={grant.grantId.toString()}
              className="hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2 font-mono text-muted-foreground">
                {grant.grantId.toString()}
              </td>
              <td className="px-3 py-2">
                <PrincipalCell
                  value={grant.requestingAdmin as unknown as string}
                />
              </td>
              <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                {formatNanoTs(grant.grantTimestamp)}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`font-medium ${
                    grant.accessOutcome === "granted"
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {grant.accessOutcome}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── InitiateRecoveryDialog ────────────────────────────────────────────────────

interface InitiateDialogProps {
  user: EscrowedUserRecord | null;
  onClose: () => void;
}

function InitiateRecoveryDialog({ user, onClose }: InitiateDialogProps) {
  const [deviceId, setDeviceId] = useState("");
  const [reason, setReason] = useState("");
  const initiateRecovery = useInitiateKeyRecovery();

  if (!user) return null;

  const userIdText =
    typeof (user.userId as { toText?: () => string }).toText === "function"
      ? (user.userId as { toText: () => string }).toText()
      : String(user.userId);

  async function handleSubmit() {
    if (!user) return;
    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    try {
      await initiateRecovery.mutateAsync({
        targetUserId: user.userId,
        targetDeviceId: deviceId.trim() || "default",
        reason: reason.trim(),
        orgId: user.orgId ?? null,
      });
      toast.success("Recovery request submitted — a second admin must approve");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to initiate recovery",
      );
    }
  }

  return (
    <Dialog
      open={!!user}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        data-ocid="escrow.initiate_recovery.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <Key className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Initiate Key Recovery
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Submit a recovery request for the selected user. A second authorized
            admin must approve before access is granted.
          </DialogDescription>
        </DialogHeader>

        {/* Warning */}
        <div className="flex items-start gap-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <p className="text-xs leading-snug">
            This action requires a second authorized admin to approve. All
            details are permanently audited.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Target User
            </Label>
            <p
              className="font-mono text-xs text-foreground break-all"
              title={userIdText}
            >
              {userIdText}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="device-id"
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
            >
              Device ID
            </Label>
            <Input
              id="device-id"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="device-id (leave blank for default)"
              className="font-mono text-xs h-8"
              data-ocid="escrow.initiate_recovery.device_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="reason"
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
            >
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a detailed justification for this recovery request (minimum 10 characters)"
              rows={3}
              className="font-mono text-xs resize-none"
              data-ocid="escrow.initiate_recovery.reason_textarea"
            />
            {reason.length > 0 && reason.trim().length < 10 && (
              <p
                className="text-xs text-destructive"
                data-ocid="escrow.initiate_recovery.reason.field_error"
              >
                Reason must be at least 10 characters
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="escrow.initiate_recovery.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white border-0"
            onClick={handleSubmit}
            disabled={initiateRecovery.isPending || reason.trim().length < 10}
            data-ocid="escrow.initiate_recovery.submit_button"
          >
            {initiateRecovery.isPending
              ? "Submitting..."
              : "Submit Recovery Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ApproveRecoveryDialog ─────────────────────────────────────────────────────

interface ApproveDialogProps {
  request: RecoveryRequest | null;
  onClose: () => void;
}

function ApproveRecoveryDialog({ request, onClose }: ApproveDialogProps) {
  const approveRecovery = useApproveKeyRecovery();

  if (!request) return null;

  const targetText =
    typeof (request.targetUserId as { toText?: () => string }).toText ===
    "function"
      ? (request.targetUserId as { toText: () => string }).toText()
      : String(request.targetUserId);
  const initiatorText =
    typeof (request.initiatingAdmin as { toText?: () => string }).toText ===
    "function"
      ? (request.initiatingAdmin as { toText: () => string }).toText()
      : String(request.initiatingAdmin);

  async function handleApprove() {
    if (!request) return;
    try {
      await approveRecovery.mutateAsync(request.id);
      toast.success("Recovery approved");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve recovery",
      );
    }
  }

  return (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        data-ocid="escrow.approve_recovery.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <CheckCircle
              className="h-4 w-4 text-green-600"
              aria-hidden="true"
            />
            Approve Key Recovery
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Request #{request.id.toString()} — review carefully before
            approving.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <p className="text-xs leading-snug">
            You are authorizing key recovery. This action is permanent and
            immutably logged. You must be a different admin than the initiator.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <p className="font-mono uppercase tracking-widest text-muted-foreground">
              Target Principal
            </p>
            <p className="font-mono mt-0.5 text-foreground break-all">
              {targetText}
            </p>
          </div>
          <div>
            <p className="font-mono uppercase tracking-widest text-muted-foreground">
              Initiated By
            </p>
            <p className="font-mono mt-0.5 text-foreground break-all">
              {initiatorText}
            </p>
          </div>
          <div>
            <p className="font-mono uppercase tracking-widest text-muted-foreground">
              Reason
            </p>
            <p className="mt-0.5 text-foreground">{request.reason}</p>
          </div>
          <div>
            <p className="font-mono uppercase tracking-widest text-muted-foreground">
              Device
            </p>
            <p className="font-mono mt-0.5 text-foreground">
              {request.targetDeviceId}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="escrow.approve_recovery.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white border-0"
            onClick={handleApprove}
            disabled={approveRecovery.isPending}
            data-ocid="escrow.approve_recovery.confirm_button"
          >
            {approveRecovery.isPending ? "Approving..." : "Approve Recovery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── RejectRecoveryDialog ──────────────────────────────────────────────────────

interface RejectDialogProps {
  request: RecoveryRequest | null;
  onClose: () => void;
}

function RejectRecoveryDialog({ request, onClose }: RejectDialogProps) {
  const rejectRecovery = useRejectKeyRecovery();

  if (!request) return null;

  const targetText =
    typeof (request.targetUserId as { toText?: () => string }).toText ===
    "function"
      ? (request.targetUserId as { toText: () => string }).toText()
      : String(request.targetUserId);

  async function handleReject() {
    if (!request) return;
    try {
      await rejectRecovery.mutateAsync(request.id);
      toast.success("Recovery request rejected");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject recovery",
      );
    }
  }

  return (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-sm"
        data-ocid="escrow.reject_recovery.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            Reject Recovery Request
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Rejecting this request will permanently close it and log the action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-xs">
          <div>
            <p className="font-mono uppercase tracking-widest text-muted-foreground">
              Target User
            </p>
            <p className="font-mono mt-0.5 text-foreground break-all">
              {targetText}
            </p>
          </div>
          <div>
            <p className="font-mono uppercase tracking-widest text-muted-foreground">
              Reason
            </p>
            <p className="mt-0.5 text-foreground">{request.reason}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            data-ocid="escrow.reject_recovery.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive text-destructive hover:bg-destructive/10"
            onClick={handleReject}
            disabled={rejectRecovery.isPending}
            data-ocid="escrow.reject_recovery.confirm_button"
          >
            {rejectRecovery.isPending ? "Rejecting..." : "Reject Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AdminKeyEscrowPage ────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: RecoveryRequestStatus | null; label: string }[] =
  [
    { value: null, label: "All" },
    { value: RecoveryRequestStatus.pending, label: "Pending" },
    { value: RecoveryRequestStatus.approved, label: "Approved" },
    { value: RecoveryRequestStatus.rejected, label: "Rejected" },
    { value: RecoveryRequestStatus.completed, label: "Completed" },
  ];

const SKEL_IDS = ["s1", "s2", "s3", "s4", "s5"] as const;

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {SKEL_IDS.map((sid) => (
        <tr key={sid} className="border-b border-border">
          {Array.from({ length: cols }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            <td key={i} className="px-4 py-3">
              <Skeleton className="h-4 w-full rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AdminKeyEscrowPage() {
  const [activeTab, setActiveTab] = useState<"users" | "requests">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<EscrowedUserRecord | null>(
    null,
  );
  const [initiateDialogUser, setInitiateDialogUser] =
    useState<EscrowedUserRecord | null>(null);
  const [approveDialogRequest, setApproveDialogRequest] =
    useState<RecoveryRequest | null>(null);
  const [rejectDialogRequest, setRejectDialogRequest] =
    useState<RecoveryRequest | null>(null);
  const [requestStatusFilter, setRequestStatusFilter] =
    useState<RecoveryRequestStatus | null>(null);

  const statsQuery = useEscrowStats();
  const escrowedUsersQuery = useEscrowedUsers({
    orgId: undefined,
    afterUserId: undefined,
    limit: 20n,
  });
  const recoveryRequestsQuery = useRecoveryRequests(null, requestStatusFilter);

  const stats = statsQuery.data;

  const filteredUsers = (escrowedUsersQuery.data ?? []).filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const uid =
      typeof (u.userId as { toText?: () => string }).toText === "function"
        ? (u.userId as { toText: () => string }).toText()
        : String(u.userId);
    return (
      uid.toLowerCase().includes(q) || (u.orgId ?? "").toLowerCase().includes(q)
    );
  });

  const pendingCount = (recoveryRequestsQuery.data ?? []).filter(
    (r) => r.status === RecoveryRequestStatus.pending,
  ).length;

  const hasMoreUsers = (escrowedUsersQuery.data ?? []).length === 20;

  return (
    <AdminLayout title="Key Escrow Management">
      <div className="space-y-6">
        {/* ── Security Banner ── */}
        <div
          className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
          role="alert"
          data-ocid="escrow.security_banner"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest">
              Dual Authorization Required
            </p>
            <p className="mt-0.5 text-xs leading-relaxed">
              All key recovery operations require dual authorization and are
              permanently audited. This page is access-controlled and all
              actions are immutably logged on the Internet Computer.
            </p>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Escrowed */}
          <div
            className="group rounded-sm border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px"
            data-ocid="escrow.stats.total_escrowed"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Total Escrowed Users
              </p>
              <Users
                className="h-4 w-4 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 font-mono text-4xl font-bold leading-none tabular-nums text-foreground">
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-16 rounded" />
              ) : (
                (stats?.totalEscrowed ?? 0n).toString()
              )}
            </p>
          </div>

          {/* Pending Recoveries */}
          <div
            className="group rounded-sm border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px"
            data-ocid="escrow.stats.pending_recoveries"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Pending Recoveries
              </p>
              <Clock
                className="h-4 w-4 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
            <p
              className={`mt-3 font-mono text-4xl font-bold leading-none tabular-nums ${
                (stats?.pendingRecoveries ?? 0n) > 0n
                  ? "text-amber-600"
                  : "text-foreground"
              }`}
            >
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-12 rounded" />
              ) : (
                (stats?.pendingRecoveries ?? 0n).toString()
              )}
            </p>
          </div>

          {/* Last Recovery Event */}
          <div
            className="group rounded-sm border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px"
            data-ocid="escrow.stats.last_recovery"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Last Recovery Event
              </p>
              <Shield
                className="h-4 w-4 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 font-mono text-sm font-semibold leading-snug text-foreground">
              {statsQuery.isLoading ? (
                <Skeleton className="h-8 w-32 rounded" />
              ) : (
                formatNanoTs(stats?.lastRecoveryTimestamp)
              )}
            </p>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div
          className="flex items-center gap-1 border-b border-border"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === "users"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="escrow.users.tab"
          >
            Escrowed Users
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "requests"}
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === "requests"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="escrow.requests.tab"
          >
            Recovery Requests
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-amber-500 px-1 font-mono text-[0.6rem] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Tab: Escrowed Users ── */}
        {activeTab === "users" && (
          <div className="space-y-4" data-ocid="escrow.users.panel">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by principal or org..."
                  className="h-8 pl-3 font-mono text-xs"
                  data-ocid="escrow.users.search_input"
                />
              </div>
            </div>

            <div
              className="overflow-x-auto rounded-sm border border-border"
              data-ocid="escrow.users.table"
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border sticky top-0">
                  <tr>
                    {[
                      "Principal",
                      "Organization",
                      "Status",
                      "Last Backed Up",
                      "Devices",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {escrowedUsersQuery.isLoading ? (
                    <TableSkeleton cols={6} />
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center"
                        data-ocid="escrow.users.empty_state"
                      >
                        <Key
                          className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30"
                          aria-hidden="true"
                        />
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                          {searchQuery
                            ? "No users match your search"
                            : "No escrowed users found"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => (
                      <tr
                        key={`${String(user.userId)}-${idx}`}
                        className="transition-colors hover:bg-muted/20"
                        data-ocid={`escrow.users.item.${idx + 1}`}
                      >
                        <td className="px-4 py-3">
                          <PrincipalCell
                            value={user.userId as unknown as string}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {user.orgId ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <EscrowStatusBadge status={user.escrowStatus} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatNanoTs(user.lastBackedUp)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground tabular-nums">
                          {user.deviceCount.toString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5"
                              onClick={() => setSelectedUser(user)}
                              data-ocid={`escrow.users.view_details.${idx + 1}`}
                            >
                              View Details
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white border-0"
                              onClick={() => setInitiateDialogUser(user)}
                              data-ocid={`escrow.users.initiate_recovery.${idx + 1}`}
                            >
                              Initiate Recovery
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {hasMoreUsers && !escrowedUsersQuery.isLoading && (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs uppercase tracking-widest"
                  data-ocid="escrow.users.load_more_button"
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Recovery Requests ── */}
        {activeTab === "requests" && (
          <div className="space-y-4" data-ocid="escrow.requests.panel">
            {/* Status filter pills */}
            <fieldset
              className="flex flex-wrap gap-1.5"
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setRequestStatusFilter(value)}
                  className={`rounded-sm border px-3 py-1 font-mono text-xs uppercase tracking-widest transition-colors ${
                    requestStatusFilter === value
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                  data-ocid={`escrow.requests.filter.${label.toLowerCase()}`}
                >
                  {label}
                </button>
              ))}
            </fieldset>

            <div
              className="overflow-x-auto rounded-sm border border-border"
              data-ocid="escrow.requests.table"
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border sticky top-0">
                  <tr>
                    {[
                      "ID",
                      "Target User",
                      "Initiated By",
                      "Reason",
                      "Status",
                      "Created",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recoveryRequestsQuery.isLoading ? (
                    <TableSkeleton cols={7} />
                  ) : (recoveryRequestsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center"
                        data-ocid="escrow.requests.empty_state"
                      >
                        <Shield
                          className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30"
                          aria-hidden="true"
                        />
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                          No recovery requests found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    (recoveryRequestsQuery.data ?? []).map((req, idx) => (
                      <tr
                        key={req.id.toString()}
                        className="transition-colors hover:bg-muted/20"
                        data-ocid={`escrow.requests.item.${idx + 1}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          #{req.id.toString()}
                        </td>
                        <td className="px-4 py-3">
                          <PrincipalCell
                            value={req.targetUserId as unknown as string}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <PrincipalCell
                            value={req.initiatingAdmin as unknown as string}
                          />
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span
                            className="text-xs text-muted-foreground line-clamp-2"
                            title={req.reason}
                          >
                            {req.reason.length > 50
                              ? `${req.reason.slice(0, 50)}…`
                              : req.reason}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <RecoveryStatusBadge status={req.status} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatNanoTs(req.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {req.status === RecoveryRequestStatus.pending && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                                onClick={() => setApproveDialogRequest(req)}
                                data-ocid={`escrow.requests.approve.${idx + 1}`}
                              >
                                Approve
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 text-muted-foreground hover:border-foreground/30"
                                onClick={() => setRejectDialogRequest(req)}
                                data-ocid={`escrow.requests.reject.${idx + 1}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── User Detail Side Panel ── */}
      {selectedUser && (
        <div
          className="fixed inset-y-0 right-0 z-50 w-96 border-l border-border bg-background shadow-xl flex flex-col"
          data-ocid="escrow.user_detail.panel"
          role="complementary"
          aria-label="User escrow details"
        >
          <div className="flex items-center justify-between border-b border-border p-4 bg-card">
            <div className="min-w-0">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                User Escrow Details
              </h3>
              <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground mt-0.5">
                Read-only · All actions audited
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              aria-label="Close panel"
              className="rounded-sm p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              data-ocid="escrow.user_detail.close_button"
            >
              <XCircle size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* User identity */}
            <div className="space-y-2">
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground">
                  Principal
                </p>
                <PrincipalCell
                  value={selectedUser.userId as unknown as string}
                />
              </div>
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground">
                  Organization
                </p>
                <p className="font-mono text-xs text-foreground">
                  {selectedUser.orgId ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-0.5">
                    <EscrowStatusBadge status={selectedUser.escrowStatus} />
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground">
                    Devices
                  </p>
                  <p className="font-mono text-xs font-bold text-foreground">
                    {selectedUser.deviceCount.toString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground">
                  Last Backed Up
                </p>
                <p className="font-mono text-xs text-foreground">
                  {formatNanoTs(selectedUser.lastBackedUp)}
                </p>
              </div>
            </div>

            {/* Grants */}
            <div className="space-y-2">
              <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-1">
                Recovery Grants
              </p>
              <EscrowGrantsSection
                userId={
                  selectedUser.userId as Parameters<
                    typeof EscrowGrantsSection
                  >[0]["userId"]
                }
              />
            </div>
          </div>

          <div className="border-t border-border p-4 bg-card">
            <Button
              type="button"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white border-0 font-mono text-xs uppercase tracking-widest"
              onClick={() => {
                setInitiateDialogUser(selectedUser);
                setSelectedUser(null);
              }}
              data-ocid="escrow.user_detail.initiate_recovery_button"
            >
              <Key className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Initiate Recovery
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      <InitiateRecoveryDialog
        user={initiateDialogUser}
        onClose={() => setInitiateDialogUser(null)}
      />
      <ApproveRecoveryDialog
        request={approveDialogRequest}
        onClose={() => setApproveDialogRequest(null)}
      />
      <RejectRecoveryDialog
        request={rejectDialogRequest}
        onClose={() => setRejectDialogRequest(null)}
      />
    </AdminLayout>
  );
}
