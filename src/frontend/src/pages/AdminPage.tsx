import { JoinRequestStatus, createActor } from "@/backend";
import type {
  AuditEvent,
  ConversationPublic,
  GetAuditLogRequest,
  JoinRequest,
  UserId,
} from "@/backend";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { AuditLogTable } from "@/components/AuditLogTable";
import { JoinRequestRow } from "@/components/JoinRequestRow";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import {
  useApproveJoinRequest,
  useDenyJoinRequest,
  useGroupJoinRequests,
} from "@/hooks/use-discovery";
import type { EscrowAccessGrant } from "@/hooks/use-enterprise";
import {
  useAdminEscrowGrants,
  useAdminGrantEscrow,
  useExportAuditLog,
} from "@/hooks/use-enterprise";
import {
  useDeploymentInfo,
  useExportConfigBundle,
  useGroupCompartment,
  useSetGroupCompartment,
  useSetSovereignConfig,
} from "@/hooks/use-sovereign";
import { AuditEventType } from "@/types/audit";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Copy,
  Download,
  Globe,
  KeyRound,
  Layers,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const ALL_EVENT_TYPES = [
  { value: "all", label: "All Event Types" },
  { value: AuditEventType.userRegistered, label: "User Registered" },
  { value: AuditEventType.messageSent, label: "Message Sent" },
  { value: AuditEventType.callInitiated, label: "Call Initiated" },
  { value: AuditEventType.memberAdded, label: "Member Added" },
  { value: AuditEventType.memberRemoved, label: "Member Removed" },
  { value: AuditEventType.adminAction, label: "Admin Action" },
  { value: AuditEventType.userRemoved, label: "User Removed" },
  { value: "escrowGranted", label: "Escrow Granted" },
  { value: "escrowRevoked", label: "Escrow Revoked" },
  { value: "retentionEnabled", label: "Retention Enabled" },
  {
    value: AuditEventType.sovereignConfigUpdated,
    label: "Sovereign Config Updated",
  },
  { value: AuditEventType.compartmentAssigned, label: "Compartment Assigned" },
];

const RESIDENCY_OPTIONS = [
  { value: "eu", label: "EU", description: "European Union" },
  { value: "us", label: "US", description: "United States" },
  { value: "apac", label: "APAC", description: "Asia Pacific" },
  { value: "global", label: "Global", description: "No restriction" },
] as const;

function StatCard({
  icon: Icon,
  label,
  value,
  ocid,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  ocid: string;
}) {
  return (
    <div
      className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3"
      data-ocid={ocid}
    >
      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-semibold text-foreground truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Export Modal ───────────────────────────────────────────────────────────
function ExportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const exportLog = useExportAuditLog();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [affectedUser, setAffectedUser] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["all"]);
  const [exportSummary, setExportSummary] = useState<string | null>(null);

  const toggleType = (value: string) => {
    if (value === "all") {
      setSelectedTypes(["all"]);
      return;
    }
    setSelectedTypes((prev) => {
      const without = prev.filter((t) => t !== "all");
      if (without.includes(value)) {
        const next = without.filter((t) => t !== value);
        return next.length === 0 ? ["all"] : next;
      }
      return [...without, value];
    });
  };

  const handleExport = () => {
    const eventTypes = selectedTypes.includes("all")
      ? ALL_EVENT_TYPES.filter((t) => t.value !== "all").map((t) => t.value)
      : selectedTypes;
    const req = {
      startDate: startDate
        ? BigInt(new Date(startDate).getTime() * 1_000_000)
        : undefined,
      endDate: endDate
        ? BigInt((new Date(endDate).getTime() + 86_400_000) * 1_000_000)
        : undefined,
      affectedUser: affectedUser.trim() || undefined,
      eventTypes,
      format,
    };
    exportLog.mutate(req, {
      onSuccess: (data) => {
        const ext = format;
        const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.${ext}`;
        const blob = new Blob([data], {
          type: format === "csv" ? "text/csv" : "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        const lineCount = data.split("\n").length - 1;
        setExportSummary(
          `Export complete — ${lineCount} records exported. Chain-of-custody metadata included.`,
        );
      },
      onError: (err) => {
        toast.error(`Export failed: ${err.message}`);
      },
    });
  };

  const handleClose = () => {
    setExportSummary(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-ocid="admin.export_dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={16} className="text-primary" />
            Export Audit Log
          </DialogTitle>
          <DialogDescription>
            Download a filtered audit log export for compliance reporting.
          </DialogDescription>
        </DialogHeader>

        {exportSummary ? (
          <div
            className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-700 dark:text-green-300"
            data-ocid="admin.export_success_state"
          >
            <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
            <p>{exportSummary}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="export-start">
                  Start Date
                </Label>
                <Input
                  id="export-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs"
                  data-ocid="admin.export_start_date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="export-end">
                  End Date
                </Label>
                <Input
                  id="export-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs"
                  data-ocid="admin.export_end_date"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="export-user">
                Affected User Principal (optional)
              </Label>
              <Input
                id="export-user"
                placeholder="2vxsx-fae..."
                value={affectedUser}
                onChange={(e) => setAffectedUser(e.target.value)}
                className="h-8 text-xs font-mono"
                data-ocid="admin.export_user_input"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Event Types</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_EVENT_TYPES.map((et) => (
                  <label
                    key={et.value}
                    htmlFor={`export-type-${et.value}`}
                    className="flex items-center gap-2 cursor-pointer text-xs py-0.5"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(et.value)}
                      onCheckedChange={() => toggleType(et.value)}
                      id={`export-type-${et.value}`}
                    />
                    <span className="text-foreground">{et.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as "csv" | "json")}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  data-ocid="admin.export_format_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv" className="text-xs">
                    CSV
                  </SelectItem>
                  <SelectItem value="json" className="text-xs">
                    JSON
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            data-ocid="admin.export_cancel_button"
          >
            {exportSummary ? "Close" : "Cancel"}
          </Button>
          {!exportSummary && (
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exportLog.isPending}
              className="flex items-center gap-1.5"
              data-ocid="admin.export_submit_button"
            >
              <Download size={13} />
              {exportLog.isPending ? "Exporting…" : "Export"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Grant Escrow Modal ───────────────────────────────────────────────────────────────
function GrantEscrowModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const grantEscrow = useAdminGrantEscrow();
  const [targetUser, setTargetUser] = useState("");
  const [targetDevice, setTargetDevice] = useState("");
  const [reason, setReason] = useState("");
  const [grantedKey, setGrantedKey] = useState<string | null>(null);

  const handleGrant = () => {
    if (!targetUser.trim() || !targetDevice.trim() || !reason.trim()) {
      toast.error("All fields are required");
      return;
    }
    grantEscrow.mutate(
      {
        targetUserId: targetUser.trim(),
        targetDeviceId: targetDevice.trim(),
        reason: reason.trim(),
      },
      {
        onSuccess: (grant) => {
          if (grant.wrappedKey) {
            setGrantedKey(
              Array.from(grant.wrappedKey)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join(" "),
            );
          } else {
            setGrantedKey("(no key material returned)");
          }
          toast.success(
            "Escrow access granted. This action has been permanently logged.",
          );
        },
        onError: (err) => toast.error(`Grant failed: ${err.message}`),
      },
    );
  };

  const handleClose = () => {
    setTargetUser("");
    setTargetDevice("");
    setReason("");
    setGrantedKey(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-ocid="admin.escrow_grant_dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
            Grant Escrow Access
          </DialogTitle>
          <DialogDescription>
            Authorize access to an enrolled device key.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>
            Granting escrow access will be <strong>permanently logged</strong>{" "}
            and the affected user will be notified.
          </p>
        </div>

        {grantedKey ? (
          <div
            className="space-y-2"
            data-ocid="admin.escrow_grant_success_state"
          >
            <Label className="text-xs">Wrapped Key Material (read-only)</Label>
            <Textarea
              readOnly
              value={grantedKey}
              rows={4}
              className="font-mono text-xs resize-none"
              data-ocid="admin.escrow_wrapped_key"
            />
            <p className="text-xs text-muted-foreground">
              Store this securely. It will not be shown again.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="grant-user" className="text-xs">
                Target User Principal
              </Label>
              <Input
                id="grant-user"
                placeholder="2vxsx-fae..."
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                className="h-8 text-xs font-mono"
                data-ocid="admin.escrow_user_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grant-device" className="text-xs">
                Target Device ID
              </Label>
              <Input
                id="grant-device"
                placeholder="device-uuid-xxx"
                value={targetDevice}
                onChange={(e) => setTargetDevice(e.target.value)}
                className="h-8 text-xs font-mono"
                data-ocid="admin.escrow_device_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grant-reason" className="text-xs">
                Authorization Reason
              </Label>
              <Textarea
                id="grant-reason"
                placeholder="Legal request reference, incident ID, or justification…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="text-xs resize-none"
                data-ocid="admin.escrow_reason_input"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            data-ocid="admin.escrow_grant_cancel_button"
          >
            {grantedKey ? "Close" : "Cancel"}
          </Button>
          {!grantedKey && (
            <Button
              size="sm"
              onClick={handleGrant}
              disabled={grantEscrow.isPending}
              data-ocid="admin.escrow_grant_confirm_button"
            >
              {grantEscrow.isPending ? "Granting…" : "Grant Access"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared Utilities ─────────────────────────────────────────────────────────────
function PrincipalTruncated({ value }: { value: string }) {
  const short = `${value.slice(0, 10)}…`;
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <span>{short}</span>
      <button
        type="button"
        aria-label="Copy"
        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => {
          navigator.clipboard
            .writeText(value)
            .then(() => toast.success("Copied", { duration: 2000 }));
        }}
      >
        <Copy size={11} />
      </button>
    </div>
  );
}

// ── Escrow Grants Panel ────────────────────────────────────────────────────────────────
function EscrowGrantsPanel() {
  const { data: grants = [], isLoading, refetch } = useAdminEscrowGrants();
  const [showGrantModal, setShowGrantModal] = useState(false);

  return (
    <div className="space-y-4" data-ocid="admin.escrow_panel">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
        <AlertTriangle
          size={16}
          className="text-amber-500 flex-shrink-0 mt-0.5"
        />
        <div className="space-y-1">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            High-Sensitivity Action
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Granting escrow access will be permanently logged and the affected
            user will be notified. Only use this for legally authorized
            requests.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {grants.length} grant{grants.length !== 1 ? "s" : ""} on record
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8"
            data-ocid="admin.escrow_refresh_button"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowGrantModal(true)}
            className="flex items-center gap-1.5 h-8"
            data-ocid="admin.escrow_grant_button"
          >
            <KeyRound size={13} />
            Grant Escrow Access
          </Button>
        </div>
      </div>

      <div
        className="bg-card border border-border rounded-lg overflow-hidden"
        data-ocid="admin.escrow_table"
      >
        {isLoading ? (
          <div
            className="flex items-center justify-center py-12 text-muted-foreground text-sm"
            data-ocid="admin.escrow_loading_state"
          >
            Loading grants…
          </div>
        ) : grants.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6"
            data-ocid="admin.escrow_empty_state"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <KeyRound size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                No escrow grants
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Escrow access grants appear here after an admin authorizes
                access.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {[
                    "Grant ID",
                    "Target User",
                    "Device ID",
                    "Requesting Admin",
                    "Granted",
                    "Reason",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grants.map((g: EscrowAccessGrant, idx: number) => (
                  <tr
                    key={g.grantId.toString()}
                    className="hover:bg-muted/20 transition-colors"
                    data-ocid={`admin.escrow_grant.${idx + 1}`}
                  >
                    <td className="px-4 py-3 font-mono">
                      {g.grantId.toString()}
                    </td>
                    <td className="px-4 py-3">
                      <PrincipalTruncated value={g.targetUserId} />
                    </td>
                    <td className="px-4 py-3 font-mono truncate max-w-[120px]">
                      {g.targetDeviceId}
                    </td>
                    <td className="px-4 py-3">
                      <PrincipalTruncated value={g.requestingAdmin} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(
                        Number(g.grantTimestamp) / 1_000_000,
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span
                        className="truncate block text-muted-foreground"
                        title={g.reason}
                      >
                        {g.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GrantEscrowModal
        open={showGrantModal}
        onClose={() => setShowGrantModal(false)}
      />
    </div>
  );
}

// ── Admin Accounts Tab ────────────────────────────────────────────────────────────
function isValidPrincipal(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    /^[a-z2-7][a-z0-9-]+$/.test(trimmed) &&
    trimmed.includes("-")
  );
}

function AdminAccountsTab() {
  const { actor, isFetching } = useActor(createActor);
  const { principal: selfPrincipal } = useAuth();
  const qc = useQueryClient();
  const [newPrincipal, setNewPrincipal] = useState("");
  const [principalError, setPrincipalError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<UserId | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const {
    data: admins = [],
    isLoading,
    refetch,
  } = useQuery<UserId[]>({
    queryKey: ["admin-list"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.listAdmins();
      if (result.__kind__ === "ok") return result.ok;
      return [];
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const handleAdd = async () => {
    const trimmed = newPrincipal.trim();
    if (!trimmed) {
      setPrincipalError("Principal ID is required");
      return;
    }
    if (!isValidPrincipal(trimmed)) {
      setPrincipalError(
        "Invalid principal format. Expected: xxxxx-xxxxx-xxxxx-xxxxx-xxx",
      );
      return;
    }
    if (!actor) return;
    setIsAdding(true);
    try {
      const { Principal: PrincipalClass } = await import(
        "@icp-sdk/core/principal"
      );
      const newAdmin = PrincipalClass.fromText(trimmed);
      const result = await actor.addAdmin(newAdmin);
      if (result.__kind__ === "err") throw new Error(result.err);
      toast.success("Admin access granted successfully");
      setNewPrincipal("");
      setPrincipalError(null);
      void qc.invalidateQueries({ queryKey: ["admin-list"] });
      void qc.invalidateQueries({ queryKey: ["admin-check"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to grant admin: ${msg}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget || !actor) return;
    setIsRemoving(true);
    try {
      const result = await actor.removeAdmin(removeTarget);
      if (result.__kind__ === "err") throw new Error(result.err);
      toast.success("Admin access revoked");
      setRemoveTarget(null);
      void qc.invalidateQueries({ queryKey: ["admin-list"] });
      void qc.invalidateQueries({ queryKey: ["admin-check"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to revoke admin: ${msg}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const selfText = selfPrincipal?.toText() ?? "";

  return (
    <div className="space-y-5" data-ocid="admin.accounts_panel">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground">
        <UserCog size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Administrators can access all dashboard features, view audit logs,
          manage escrow, and configure sovereign settings. All changes are
          permanently audit-logged.
        </p>
      </div>

      {/* Grant admin card */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <UserPlus size={14} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Grant Admin Access
            </span>
          </div>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-admin-principal" className="text-xs">
              Principal ID
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-admin-principal"
                placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                value={newPrincipal}
                onChange={(e) => {
                  setNewPrincipal(e.target.value);
                  if (principalError) setPrincipalError(null);
                }}
                onBlur={() => {
                  const t = newPrincipal.trim();
                  if (t && !isValidPrincipal(t)) {
                    setPrincipalError(
                      "Invalid principal format. Expected: xxxxx-xxxxx-xxxxx-xxxxx-xxx",
                    );
                  }
                }}
                className="font-mono text-xs h-8 flex-1"
                aria-describedby={
                  principalError ? "principal-error" : undefined
                }
                data-ocid="admin.accounts_principal_input"
              />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={isAdding || !newPrincipal.trim()}
                className="flex items-center gap-1.5 h-8 flex-shrink-0"
                data-ocid="admin.accounts_grant_button"
              >
                <UserPlus size={13} />
                {isAdding ? "Granting…" : "Grant Admin"}
              </Button>
            </div>
            {principalError && (
              <p
                id="principal-error"
                className="text-xs text-destructive flex items-center gap-1"
                data-ocid="admin.accounts_principal_field_error"
              >
                <AlertTriangle size={11} />
                {principalError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Admin list */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {admins.length} admin{admins.length !== 1 ? "s" : ""} registered
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isLoading}
          className="h-8"
          data-ocid="admin.accounts_refresh_button"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div
        className="bg-card border border-border rounded-lg overflow-hidden"
        data-ocid="admin.accounts_table"
      >
        {isLoading ? (
          <div
            className="flex items-center justify-center py-12 text-muted-foreground text-sm"
            data-ocid="admin.accounts_loading_state"
          >
            Loading admins…
          </div>
        ) : admins.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6"
            data-ocid="admin.accounts_empty_state"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Users size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                No admins found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Grant admin access using the form above.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {["Principal ID", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((adminPrincipal, idx) => {
                  const text = adminPrincipal.toText();
                  const isSelf = text === selfText;
                  return (
                    <tr
                      key={text}
                      className="hover:bg-muted/20 transition-colors"
                      data-ocid={`admin.accounts_row.${idx + 1}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="truncate max-w-[280px]" title={text}>
                            {text}
                          </span>
                          <button
                            type="button"
                            aria-label="Copy principal"
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                            onClick={() =>
                              navigator.clipboard
                                .writeText(text)
                                .then(() =>
                                  toast.success("Copied", { duration: 2000 }),
                                )
                            }
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            <ShieldCheck size={10} />
                            Administrator
                          </span>
                          {isSelf && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border"
                              data-ocid={`admin.accounts_self_badge.${idx + 1}`}
                            >
                              you
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex items-center gap-1"
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "You cannot remove your own admin access"
                              : `Revoke admin for ${text.slice(0, 12)}…`
                          }
                          onClick={() => setRemoveTarget(adminPrincipal)}
                          data-ocid={`admin.accounts_revoke_button.${idx + 1}`}
                        >
                          <Trash2 size={11} />
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm removal dialog */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="admin.accounts_revoke_dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={16} />
              Revoke Admin Access
            </DialogTitle>
            <DialogDescription>
              This will immediately remove administrator privileges from:
            </DialogDescription>
          </DialogHeader>
          {removeTarget && (
            <div className="px-3 py-2.5 rounded-lg bg-muted/50 border border-border font-mono text-xs break-all">
              {removeTarget.toText()}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            They will lose access to the admin dashboard immediately. This
            action is audit-logged and can be reversed by granting admin access
            again.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemoveTarget(null)}
              data-ocid="admin.accounts_revoke_cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveConfirm}
              disabled={isRemoving}
              data-ocid="admin.accounts_revoke_confirm_button"
            >
              {isRemoving ? "Revoking…" : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Audit Log Tab ──────────────────────────────────────────────────────────────────
function AuditLogTab() {
  const { actor, isFetching } = useActor(createActor);
  const [filterType, setFilterType] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showExportModal, setShowExportModal] = useState(false);

  const {
    data: allEvents = [],
    isLoading,
    refetch,
    dataUpdatedAt,
  } = useQuery<AuditEvent[]>({
    queryKey: ["audit-log"],
    queryFn: async () => {
      if (!actor) return [];
      const req: GetAuditLogRequest = { limit: 1000n };
      const result = await actor.getAuditLog(req);
      if (result.__kind__ === "ok") return result.ok;
      return [];
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const filteredEvents = useMemo(() => {
    let events = allEvents;
    if (filterType !== "all")
      events = events.filter((e) => e.eventType === filterType);
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      events = events.filter((e) => Number(e.timestamp) / 1_000_000 >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime() + 86_400_000;
      events = events.filter((e) => Number(e.timestamp) / 1_000_000 <= endMs);
    }
    return events;
  }, [allEvents, filterType, startDate, endDate]);

  const lastRefreshed = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger
            className="w-44 h-8 text-xs"
            data-ocid="admin.filter_type_select"
          >
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            {ALL_EVENT_TYPES.map((et) => (
              <SelectItem key={et.value} value={et.value} className="text-xs">
                {et.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 w-36 text-xs"
            aria-label="Start date"
            data-ocid="admin.filter_start_date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 w-36 text-xs"
            aria-label="End date"
            data-ocid="admin.filter_end_date"
          />
        </div>

        <span className="text-xs text-muted-foreground">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 h-8 text-xs"
            data-ocid="admin.export_button"
          >
            <Download size={13} />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 h-8 text-xs"
            data-ocid="admin.refresh_button"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Last refreshed {lastRefreshed} · auto-refresh every 30s
      </p>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <AuditLogTable events={filteredEvents} isLoading={isLoading} />
      </div>

      <ExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}

// ── Sovereign Tab ──────────────────────────────────────────────────────────────────
const RESIDENCY_LABELS: Record<string, string> = {
  eu: "European Union",
  us: "United States",
  apac: "Asia Pacific",
  global: "Global",
};

function ResidencyBadge({ value }: { value: string }) {
  const colorMap: Record<string, string> = {
    eu: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    us: "bg-primary/10 text-primary border-primary/30",
    apac: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    global: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
        colorMap[value] ?? colorMap.global
      }`}
    >
      <Globe size={10} />
      {RESIDENCY_LABELS[value] ?? value.toUpperCase()}
    </span>
  );
}

function SovereignTab() {
  const { data: config, isLoading } = useDeploymentInfo();
  const setSovereignConfig = useSetSovereignConfig();
  const exportBundle = useExportConfigBundle();
  const [residency, setResidency] = useState<string>("");

  const currentResidency = config?.residencyLabel ?? "";
  const pendingResidency = residency || currentResidency;

  const handleSave = () => {
    if (!pendingResidency) return;
    setSovereignConfig.mutate(
      { residency: pendingResidency as import("@/backend").DataResidency },
      {
        onSuccess: () => toast.success("Residency label updated"),
        onError: (err) => toast.error(`Update failed: ${err.message}`),
      },
    );
  };

  const copyCanisterId = () => {
    if (!config?.canisters) return;
    navigator.clipboard
      .writeText(config.canisters)
      .then(() => toast.success("Canister ID copied", { duration: 2000 }));
  };

  return (
    <div className="space-y-6" data-ocid="admin.sovereign_panel">
      {/* Deployment Info Card */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Deployment Info
            </span>
          </div>
        </div>
        {isLoading ? (
          <div
            className="flex items-center justify-center py-10 text-muted-foreground text-sm"
            data-ocid="admin.sovereign_loading_state"
          >
            Loading deployment info…
          </div>
        ) : !config ? (
          <div
            className="flex items-center justify-center py-10 text-muted-foreground text-sm"
            data-ocid="admin.sovereign_error_state"
          >
            Could not load deployment info.
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Canister ID
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-foreground truncate">
                    {config.canisters}
                  </span>
                  <button
                    type="button"
                    aria-label="Copy canister ID"
                    onClick={copyCanisterId}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                    data-ocid="admin.copy_canister_id_button"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Subnet Principal
                </p>
                {config.subnetPrincipal ? (
                  <PrincipalTruncated value={config.subnetPrincipal.toText()} />
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Not configured
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Data Residency
                </p>
                <ResidencyBadge value={config.residencyLabel} />
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Node Count</p>
                <span className="text-sm font-medium text-foreground">
                  {config.nodeCount !== undefined && config.nodeCount !== null
                    ? config.nodeCount.toString()
                    : "—"}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Cycle Cost Multiplier
                </p>
                <span className="text-sm font-medium text-foreground">
                  {config.cyclesCostMultiplier !== undefined &&
                  config.cyclesCostMultiplier !== null
                    ? `×${config.cyclesCostMultiplier.toFixed(2)}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Residency Selector */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Data Residency
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              — label only; used for deployment guidance
            </span>
          </div>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            data-ocid="admin.residency_selector"
          >
            {RESIDENCY_OPTIONS.map((opt) => {
              const active = pendingResidency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setResidency(opt.value)}
                  data-ocid={`admin.residency_${opt.value}`}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Globe size={16} />
                  <span>{opt.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={setSovereignConfig.isPending || !pendingResidency}
              data-ocid="admin.sovereign_save_button"
            >
              {setSovereignConfig.isPending ? "Saving…" : "Update Residency"}
            </Button>
          </div>
        </div>
      </div>

      {/* Export Config Bundle */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Download size={14} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Config Export
            </span>
          </div>
        </div>
        <div className="px-4 py-4 flex items-start gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm text-foreground">
              Export deployment configuration bundle
            </p>
            <p className="text-xs text-muted-foreground">
              Downloads a JSON file containing canister IDs, subnet info,
              residency label, compartment mappings, and admin principals.
              Encryption keys are never included.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportBundle.mutate()}
            disabled={exportBundle.isPending}
            className="flex items-center gap-1.5 flex-shrink-0"
            data-ocid="admin.export_config_button"
          >
            <Download size={13} />
            {exportBundle.isPending ? "Exporting…" : "Export Bundle"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Compartments Tab ────────────────────────────────────────────────────────────────
function CompartmentBadge({ value }: { value: string | null }) {
  if (!value) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
        None
      </span>
    );
  }
  if (value === "classified") {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">
        Classified
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 hover:bg-green-500/20">
      Unclassified
    </Badge>
  );
}

function CompartmentRow({
  conv,
  index,
}: {
  conv: ConversationPublic;
  index: number;
}) {
  const { data: compartment, isLoading } = useGroupCompartment(conv.id);
  const setCompartment = useSetGroupCompartment();
  const [selected, setSelected] = useState<string>("");

  const currentValue = compartment ?? null;
  const pending = selected || currentValue || "";

  const handleAssign = () => {
    if (!selected) return;
    setCompartment.mutate(
      {
        convId: conv.id,
        compartment: selected as import("@/backend").CompartmentLabel,
      },
      {
        onSuccess: () => {
          toast.success("Compartment updated");
          setSelected("");
        },
        onError: (err) => toast.error(`Failed: ${err.message}`),
      },
    );
  };

  return (
    <tr
      className="hover:bg-muted/20 transition-colors"
      data-ocid={`admin.compartment_row.${index}`}
    >
      <td className="px-4 py-3 font-mono text-xs">{conv.id.toString()}</td>
      <td className="px-4 py-3 text-xs text-foreground">
        {conv.kind === "group" ? "Group" : "Direct"}
      </td>
      <td className="px-4 py-3">
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : (
          <CompartmentBadge value={currentValue} />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Select
            value={pending}
            onValueChange={(v) => setSelected(v === pending ? "" : v)}
          >
            <SelectTrigger
              className="h-7 w-36 text-xs"
              data-ocid={`admin.compartment_select.${index}`}
            >
              <SelectValue placeholder="Assign…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classified" className="text-xs">
                Classified
              </SelectItem>
              <SelectItem value="unclassified" className="text-xs">
                Unclassified
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleAssign}
            disabled={!selected || setCompartment.isPending}
            data-ocid={`admin.compartment_assign.${index}`}
          >
            Assign
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CompartmentsTab() {
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();

  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useQuery<ConversationPublic[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listConversations();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });

  // Only group conversations can have compartments
  const groupConversations = conversations.filter((c) => c.kind === "group");

  return (
    <div className="space-y-4" data-ocid="admin.compartments_panel">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground">
        <Shield size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Compartments apply to group chats only.{" "}
          <strong className="text-foreground">Classified</strong> groups are
          restricted to cleared personnel;{" "}
          <strong className="text-foreground">Unclassified</strong> groups
          follow standard access rules. Assignments are audit-logged.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {groupConversations.length} group conversation
          {groupConversations.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void refetch();
            void qc.invalidateQueries({ queryKey: ["group-compartments"] });
          }}
          disabled={isLoading}
          className="h-8"
          data-ocid="admin.compartments_refresh_button"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-12 text-muted-foreground text-sm"
            data-ocid="admin.compartments_loading_state"
          >
            Loading conversations…
          </div>
        ) : groupConversations.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6"
            data-ocid="admin.compartments_empty_state"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Layers size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                No group conversations
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Compartments appear here once group chats are created.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {[
                    "Conversation ID",
                    "Type",
                    "Current Compartment",
                    "Assign",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groupConversations.map((conv, idx) => (
                  <CompartmentRow
                    key={conv.id.toString()}
                    conv={conv}
                    index={idx + 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Join Requests Tab ──────────────────────────────────────────────────────────────
function GroupRequestsForConv({
  conv,
  setAllRows,
}: {
  conv: ConversationPublic;
  setAllRows: React.Dispatch<
    React.SetStateAction<
      Map<string, { request: JoinRequest; groupName: string }>
    >
  >;
}) {
  const { data: requests = [] } = useGroupJoinRequests(conv.id);
  const groupName =
    conv.displayName ?? `Group ${conv.id.toString().slice(0, 6)}`;
  useEffect(() => {
    const pending = requests.filter(
      (r) => r.status === JoinRequestStatus.pending,
    );
    setAllRows((prev) => {
      const next = new Map(prev);
      for (const [k, v] of next) {
        if (v.request.conversationId === conv.id) next.delete(k);
      }
      for (const req of pending) {
        next.set(req.requestId, { request: req, groupName });
      }
      return next;
    });
  }, [requests, conv.id, groupName, setAllRows]);
  return null;
}

function AllGroupRequestsLoader({
  groupConvs,
  onApprove,
  onDeny,
  isActioning,
}: {
  groupConvs: ConversationPublic[];
  onApprove: (requestId: string, conversationId: bigint) => void;
  onDeny: (requestId: string, conversationId: bigint, reason?: string) => void;
  isActioning: boolean;
}) {
  const [allRows, setAllRows] = useState<
    Map<string, { request: JoinRequest; groupName: string }>
  >(new Map());
  const rowList = Array.from(allRows.values());
  return (
    <>
      {groupConvs.map((conv) => (
        <GroupRequestsForConv
          key={conv.id.toString()}
          conv={conv}
          setAllRows={setAllRows}
        />
      ))}
      {rowList.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-3 text-center"
          data-ocid="admin.join_requests_empty_state"
        >
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <UserCheck size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            No pending join requests
          </p>
          <p className="text-xs text-muted-foreground">
            Pending requests will appear once users apply to discoverable
            groups.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {["Group", "Requester", "Message", "Submitted", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rowList.map(({ request, groupName }, idx) => (
                <JoinRequestRow
                  key={request.requestId}
                  request={request}
                  groupName={groupName}
                  onApprove={onApprove}
                  onDeny={onDeny}
                  isActioning={isActioning}
                  index={idx + 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function JoinRequestsTab() {
  const { actor, isFetching } = useActor(createActor);
  const qc = useQueryClient();
  const approveJoin = useApproveJoinRequest();
  const denyJoin = useDenyJoinRequest();
  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useQuery<ConversationPublic[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listConversations();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
  const groupConvs = conversations.filter((c) => c.kind === "group");
  const discoverableCount = groupConvs.filter((c) => c.discoverable).length;
  const handleApprove = (requestId: string, conversationId: bigint) => {
    approveJoin.mutate(
      { requestId, conversationId },
      {
        onSuccess: () => {
          toast.success("Request approved.");
          void qc.invalidateQueries({ queryKey: ["groupJoinRequests"] });
          void qc.invalidateQueries({ queryKey: ["publicGroups"] });
        },
        onError: (err) => toast.error(`Approve failed: ${err.message}`),
      },
    );
  };
  const handleDeny = (
    requestId: string,
    conversationId: bigint,
    reason?: string,
  ) => {
    denyJoin.mutate(
      { requestId, conversationId, denialReason: reason },
      {
        onSuccess: () => {
          toast.success("Request denied.");
          void qc.invalidateQueries({ queryKey: ["groupJoinRequests"] });
          void qc.invalidateQueries({ queryKey: ["publicGroups"] });
        },
        onError: (err) => toast.error(`Deny failed: ${err.message}`),
      },
    );
  };
  return (
    <div className="space-y-4" data-ocid="admin.join_requests_panel">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
        <UserCheck size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Manage join requests for all{" "}
          <strong className="text-foreground">discoverable groups</strong>.
          Approve or deny each request. All actions are audit-logged.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {discoverableCount} discoverable group
          {discoverableCount !== 1 ? "s" : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void refetch();
            void qc.invalidateQueries({ queryKey: ["groupJoinRequests"] });
          }}
          disabled={isLoading}
          className="h-8"
          data-ocid="admin.join_requests_refresh_button"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div
            className="flex items-center justify-center py-12 text-muted-foreground text-sm"
            data-ocid="admin.join_requests_loading_state"
          >
            Loading groups…
          </div>
        ) : groupConvs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3 text-center"
            data-ocid="admin.join_requests_empty_state"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <UserCheck size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No discoverable groups
            </p>
            <p className="text-xs text-muted-foreground">
              Pending join requests will appear once groups are marked
              discoverable.
            </p>
          </div>
        ) : (
          <AllGroupRequestsLoader
            groupConvs={groupConvs}
            onApprove={handleApprove}
            onDeny={handleDeny}
            isActioning={approveJoin.isPending || denyJoin.isPending}
          />
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { actor, isFetching } = useActor(createActor);
  const { principal } = useAuth();

  void principal;

  const { data: allEventsForStats = [] } = useQuery<AuditEvent[]>({
    queryKey: ["audit-log"],
    queryFn: async () => {
      if (!actor) return [];
      const req: GetAuditLogRequest = { limit: 1000n };
      const result = await actor.getAuditLog(req);
      if (result.__kind__ === "ok") return result.ok;
      return [];
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const todayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return allEventsForStats.filter(
      (e) => Number(e.timestamp) / 1_000_000 >= todayStart.getTime(),
    ).length;
  }, [allEventsForStats]);

  const mostActiveUser = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of allEventsForStats) {
      const key = e.actorPrincipal.toText();
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    if (!top) return "—";
    return `${top[0].slice(0, 8)}…`;
  }, [allEventsForStats]);

  return (
    <AdminAccessGate>
      <Layout title="Admin Dashboard" showEncryptedBadge={false}>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">
                Security controls, audit logs, and compliance tools
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              icon={Activity}
              label="Events Today"
              value={todayCount}
              ocid="admin.stat_today"
            />
            <StatCard
              icon={Shield}
              label="Total Events"
              value={allEventsForStats.length}
              ocid="admin.stat_total"
            />
            <StatCard
              icon={Users}
              label="Most Active User"
              value={mostActiveUser}
              ocid="admin.stat_top_user"
            />
          </div>

          <Tabs defaultValue="accounts" data-ocid="admin.tabs">
            <TabsList className="w-full sm:w-auto inline-flex flex-wrap gap-y-0">
              <TabsTrigger
                value="accounts"
                className="flex items-center gap-1.5"
                data-ocid="admin.tab.accounts"
              >
                <UserCog size={13} />
                Admin Accounts
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="flex items-center gap-1.5"
                data-ocid="admin.tab.audit"
              >
                <Activity size={13} />
                Audit Log
              </TabsTrigger>
              <TabsTrigger
                value="escrow"
                className="flex items-center gap-1.5"
                data-ocid="admin.tab.escrow"
              >
                <KeyRound size={13} />
                Key Escrow
                <span className="ml-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5">
                  SENSITIVE
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="sovereign"
                className="flex items-center gap-1.5"
                data-ocid="admin.tab.sovereign"
              >
                <Server size={13} />
                Sovereign
              </TabsTrigger>
              <TabsTrigger
                value="compartments"
                className="flex items-center gap-1.5"
                data-ocid="admin.tab.compartments"
              >
                <Layers size={13} />
                Compartments
              </TabsTrigger>
              <TabsTrigger
                value="join-requests"
                className="flex items-center gap-1.5"
                data-ocid="admin.tab.join_requests"
              >
                <UserCheck size={13} />
                Join Requests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="mt-4">
              <AdminAccountsTab />
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <AuditLogTab />
            </TabsContent>

            <TabsContent value="escrow" className="mt-4">
              <EscrowGrantsPanel />
            </TabsContent>

            <TabsContent value="sovereign" className="mt-4">
              <SovereignTab />
            </TabsContent>

            <TabsContent value="compartments" className="mt-4">
              <CompartmentsTab />
            </TabsContent>
            <TabsContent value="join-requests" className="mt-4">
              <JoinRequestsTab />
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </AdminAccessGate>
  );
}
