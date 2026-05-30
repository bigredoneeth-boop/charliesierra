import type { OrgRecord, RetentionPolicy } from "@/backend";
import { RetentionPeriod, createActor } from "@/backend";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import {
  useCheckPolicyExpiry,
  useLogPolicyExpiryCheck,
  useLogPolicyReportExported,
} from "@/hooks/use-admin";
import { usePolicyExpiryStore } from "@/stores/policy-expiry-store";
import { useActor } from "@caffeineai/core-infrastructure";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertTriangle,
  FileText,
  Lock,
  Pencil,
  Shield,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function formatPeriod(p: string): string {
  switch (p) {
    case RetentionPeriod.days30:
      return "30 Days";
    case RetentionPeriod.days90:
      return "90 Days";
    case RetentionPeriod.year1:
      return "1 Year";
    case RetentionPeriod.years7:
      return "7 Years";
    case RetentionPeriod.unlimited:
      return "Unlimited";
    default:
      return p;
  }
}

function formatTs(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString();
}

const PERIOD_OPTIONS: { value: RetentionPeriod; label: string }[] = [
  { value: RetentionPeriod.days30, label: "30 Days" },
  { value: RetentionPeriod.days90, label: "90 Days" },
  { value: RetentionPeriod.year1, label: "1 Year" },
  { value: RetentionPeriod.years7, label: "7 Years" },
  { value: RetentionPeriod.unlimited, label: "Unlimited" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminRetentionPoliciesPage() {
  const { actor, isFetching } = useActor(createActor);
  const { principal } = useAuth();

  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [globalPolicy, setGlobalPolicy] = useState<RetentionPolicy | null>(
    null,
  );
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Expiry notification
  const { data: expiringPolicies = [] } = useCheckPolicyExpiry();
  const logExpiryCheck = useLogPolicyExpiryCheck();
  const logReportExported = useLogPolicyReportExported();
  const setExpiryCount = usePolicyExpiryStore((s) => s.setExpiryCount);
  const [expiryBannerDismissed, setExpiryBannerDismissed] = useState(false);
  const expiryCheckFiredRef = useRef(false);

  // Sync expiry count to global store
  useEffect(() => {
    setExpiryCount(expiringPolicies.length);
  }, [expiringPolicies.length, setExpiryCount]);

  // Log expiry check once on first load
  const { mutate: logExpiryCheckMutate } = logExpiryCheck;
  useEffect(() => {
    if (!actor || isFetching || expiryCheckFiredRef.current) return;
    expiryCheckFiredRef.current = true;
    logExpiryCheckMutate();
  }, [actor, isFetching, logExpiryCheckMutate]);

  // Create / Edit modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(
    null,
  );

  // Legal Hold modal
  const [legalHoldModalOpen, setLegalHoldModalOpen] = useState(false);
  const [legalHoldTarget, setLegalHoldTarget] = useState("");
  const [legalHoldReason, setLegalHoldReason] = useState("");

  // Confirm dialogs for destructive actions
  const [removePolicyConfirm, setRemovePolicyConfirm] =
    useState<RetentionPolicy | null>(null);
  const [removeLegalHoldConfirm, setRemoveLegalHoldConfirm] =
    useState<RetentionPolicy | null>(null);

  // Form state
  const [formOrgId, setFormOrgId] = useState<string>("__global__");
  const [formPeriod, setFormPeriod] = useState<RetentionPeriod>(
    RetentionPeriod.days90,
  );
  const [formAutoDelete, setFormAutoDelete] = useState(false);
  const [formLegalHold, setFormLegalHold] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holdSaving, setHoldSaving] = useState(false);

  // ── PDF compliance report generation ─────────────────────────────────────────
  function generateComplianceReport() {
    const actorText = principal?.toText() ?? "Unknown";
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timestampStr = now.toLocaleString();

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CharlieSierra Admin Console", margin, 11);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Retention Policy Compliance Report — CONFIDENTIAL", margin, 17);
    doc.setTextColor(0, 0, 0);

    // Report metadata
    let y = 32;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Report Metadata", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Generated: ${timestampStr}`, margin, y);
    y += 4;
    doc.text(`Actor: ${actorText}`, margin, y);
    y += 4;
    doc.text(`Total Policies: ${allRows.length}`, margin, y);
    y += 4;
    doc.text(
      `Policies on Legal Hold: ${allRows.filter((p) => p.legalHold).length}`,
      margin,
      y,
    );
    y += 4;
    doc.text(`Expiring Within 30 Days: ${expiringPolicies.length}`, margin, y);

    // Executive summary
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const summaryLines = doc.splitTextToSize(
      `This report provides a complete snapshot of all data retention policies configured in the CharlieSierra platform as of ${timestampStr}. All policies are enforced at the organization level and are subject to platform-wide immutable audit logging. Legal holds supersede all retention period settings.`,
      pageW - margin * 2,
    );
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 4 + 4;

    // Global policy table
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Global Policy", margin, y);
    y += 3;
    if (globalPolicy) {
      autoTable(doc, {
        startY: y,
        head: [["Period", "Auto-Delete", "Legal Hold", "Last Updated"]],
        body: [
          [
            formatPeriod(globalPolicy.period),
            globalPolicy.autoDelete ? "Yes" : "No",
            globalPolicy.legalHold ? "ACTIVE" : "None",
            formatTs(globalPolicy.updatedAt),
          ],
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: "bold",
        },
        margin: { left: margin, right: margin },
      });
      y =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 6;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("No global policy configured.", margin, y + 4);
      y += 10;
    }

    // Per-org policy table
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Per-Organization Policies", margin, y);
    y += 3;
    if (policies.length > 0) {
      const orgRows = policies.map((p) => [
        orgs.find((o) => o.id === p.orgId)?.name ?? p.orgId ?? "—",
        formatPeriod(p.period),
        p.autoDelete ? "Yes" : "No",
        p.legalHold ? "ACTIVE" : "None",
        formatTs(p.updatedAt),
      ]);
      autoTable(doc, {
        startY: y,
        head: [
          [
            "Organization",
            "Period",
            "Auto-Delete",
            "Legal Hold",
            "Last Updated",
          ],
        ],
        body: orgRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: "bold",
        },
        bodyStyles: { textColor: 50 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });
      y =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 6;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("No per-organization policies configured.", margin, y + 4);
      y += 10;
    }

    // Active legal holds section
    const legalHolds = allRows.filter((p) => p.legalHold);
    if (legalHolds.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Active Legal Holds", margin, y);
      y += 3;
      const holdRows = legalHolds.map((p) => [
        (p as RetentionPolicy & { isGlobal?: boolean }).isGlobal
          ? "Global Default"
          : (orgs.find((o) => o.id === p.orgId)?.name ?? p.orgId ?? "—"),
        formatPeriod(p.period),
        formatTs(p.updatedAt),
      ]);
      autoTable(doc, {
        startY: y,
        head: [["Organization", "Period", "Hold Since"]],
        body: holdRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [185, 28, 28],
          textColor: 255,
          fontStyle: "bold",
        },
        margin: { left: margin, right: margin },
      });
    }

    // Footer disclaimer
    const totalPages = (
      doc.internal as unknown as { getNumberOfPages: () => number }
    ).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(
        "This report was generated by the CharlieSierra Admin Console. All records are immutable on the Internet Computer.",
        margin,
        pageH - 8,
      );
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 8, {
        align: "right",
      });
    }

    doc.save(`charliesierra-compliance-${dateStr}.pdf`);
    logReportExported.mutate(undefined);
    toast.success("Compliance report downloaded");
  }

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [fetchedPolicies, fetchedGlobal, orgsResult] = await Promise.all([
        actor.getRetentionPolicies({ orgId: undefined }),
        actor.getGlobalRetentionPolicy(),
        actor.listOrgs({ limit: 100n }),
      ]);
      setPolicies(fetchedPolicies.filter((p) => p.orgId !== undefined));
      setGlobalPolicy(fetchedGlobal);
      if (orgsResult.__kind__ === "ok") {
        setOrgs(orgsResult.ok.orgs);
      }
    } catch (_err) {
      toast.error("Failed to load retention policies");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (actor && !isFetching) {
      fetchData();
    }
  }, [actor, isFetching, fetchData]);

  function openCreate() {
    setEditingPolicy(null);
    setFormOrgId("__global__");
    setFormPeriod(RetentionPeriod.year1);
    setFormAutoDelete(false);
    setFormLegalHold(false);
    setCreateModalOpen(true);
  }

  function openEdit(policy: RetentionPolicy) {
    setEditingPolicy(policy);
    setFormOrgId(policy.orgId !== undefined ? policy.orgId : "__global__");
    setFormPeriod(policy.period);
    setFormAutoDelete(policy.autoDelete);
    setFormLegalHold(policy.legalHold);
    setCreateModalOpen(true);
  }

  function openLegalHold(orgId: string) {
    setLegalHoldTarget(orgId);
    setLegalHoldReason("");
    setLegalHoldModalOpen(true);
  }

  async function handleSavePolicy() {
    if (!actor) return;
    setSaving(true);
    try {
      if (editingPolicy) {
        const result = await actor.updateRetentionPolicy({
          id: editingPolicy.id,
          period: formPeriod,
          legalHold: formLegalHold,
          autoDelete: formAutoDelete,
        });
        if (result.__kind__ === "ok") {
          toast.success("Retention policy updated");
          setCreateModalOpen(false);
          void fetchData();
        } else {
          toast.error(`Error: ${result.err}`);
        }
      } else {
        const result = await actor.createRetentionPolicy({
          orgId: formOrgId === "__global__" ? undefined : formOrgId,
          period: formPeriod,
          legalHold: formLegalHold,
          autoDelete: formAutoDelete,
        });
        if (result.__kind__ === "ok") {
          toast.success("Retention policy created");
          setCreateModalOpen(false);
          void fetchData();
        } else {
          toast.error(`Error: ${result.err}`);
        }
      }
    } catch (_err) {
      toast.error("Failed to save policy");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLegalHold() {
    if (!actor || legalHoldReason.trim().length < 10) return;
    if (!legalHoldTarget || legalHoldTarget === "__global__") {
      toast.error("Legal hold can only be applied to specific organizations");
      return;
    }
    setHoldSaving(true);

    const targetPolicy =
      legalHoldTarget === "__global__"
        ? globalPolicy
        : policies.find((p) => p.orgId === legalHoldTarget);
    const currentHold = targetPolicy?.legalHold ?? false;

    try {
      const result = await actor.toggleLegalHold({
        orgId: legalHoldTarget,
        hold: !currentHold,
        reason: legalHoldReason.trim(),
      });
      if (result.__kind__ === "ok") {
        toast.success(currentHold ? "Legal hold removed" : "Legal hold placed");
        setLegalHoldModalOpen(false);
        void fetchData();
      } else {
        toast.error(`Error: ${result.err}`);
      }
    } catch (_err) {
      toast.error("Failed to update legal hold");
    } finally {
      setHoldSaving(false);
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalPolicies = policies.length + (globalPolicy ? 1 : 0);
  const onLegalHold =
    policies.filter((p) => p.legalHold).length +
    (globalPolicy?.legalHold ? 1 : 0);
  const globalDefault = globalPolicy
    ? formatPeriod(globalPolicy.period)
    : "Not Set";

  // ── All displayable rows ─────────────────────────────────────────────────────
  const allRows: (RetentionPolicy & { isGlobal?: boolean })[] = [
    ...(globalPolicy ? [{ ...globalPolicy, isGlobal: true }] : []),
    ...policies,
  ];

  // ── Legal hold modal context ─────────────────────────────────────────────────
  const lhPolicy =
    legalHoldTarget === "__global__"
      ? globalPolicy
      : policies.find((p) => p.orgId === legalHoldTarget);
  const lhCurrentHold = lhPolicy?.legalHold ?? false;
  const lhOrgName =
    legalHoldTarget === "__global__"
      ? "Global Default"
      : (orgs.find((o) => o.id === legalHoldTarget)?.name ?? legalHoldTarget);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Retention Policies">
      <div className="p-6 space-y-6" data-ocid="retention.page">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Retention Policy Management
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage data retention policies and legal holds across all
              organizations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={generateComplianceReport}
              data-ocid="retention.generate_report_button"
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 font-medium"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Generate Compliance Report
            </Button>
            <Button onClick={openCreate} data-ocid="retention.create_button">
              <span className="mr-1">+</span> Create Policy
            </Button>
          </div>
        </div>

        {/* Policy expiry warning banner */}
        {expiringPolicies.length > 0 && !expiryBannerDismissed && (
          <div
            className="flex items-center justify-between gap-3 rounded-sm border border-amber-400/60 bg-amber-50 px-4 py-2.5"
            role="alert"
            data-ocid="retention.expiry_banner"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-amber-800">
                {expiringPolicies.length}{" "}
                {expiringPolicies.length === 1 ? "policy" : "policies"} expiring
                within 30 days — review required
              </span>
            </div>
            <button
              type="button"
              onClick={() => setExpiryBannerDismissed(true)}
              className="shrink-0 rounded-sm px-2 py-1 font-mono text-[0.6rem] uppercase tracking-widest text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition-colors"
              data-ocid="retention.expiry_dismiss_button"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Audit immutability banner */}
        <div
          className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3"
          role="alert"
          data-ocid="retention.audit_banner"
        >
          <Shield
            className="h-5 w-5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-black">
            All retention policy changes are audited and immutable. Legal hold
            restrictions cannot be bypassed.
          </span>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card data-ocid="retention.total_card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Total Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalPolicies}</p>
            </CardContent>
          </Card>
          <Card data-ocid="retention.legal_hold_card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" aria-hidden="true" />
                On Legal Hold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">
                {onLegalHold}
              </p>
            </CardContent>
          </Card>
          <Card data-ocid="retention.global_card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" aria-hidden="true" />
                Global Default
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{globalDefault}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <div
            className="flex items-center justify-center py-16 text-muted-foreground"
            data-ocid="retention.loading_state"
          >
            <span className="text-sm">Loading policies…</span>
          </div>
        ) : allRows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-16 text-center"
            data-ocid="retention.empty_state"
          >
            <FileText
              className="h-10 w-10 text-muted-foreground/50"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-muted-foreground">
              No retention policies configured. Create one to get started.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={openCreate}
              data-ocid="retention.empty_create_button"
            >
              Create your first policy
            </Button>
          </div>
        ) : (
          <div className="rounded-md border" data-ocid="retention.table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted/60">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                      Retention Period
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                      Legal Hold
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                      Auto-Delete
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                      Last Updated
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                      Days to Expiry
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase tracking-wider text-xs">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map((policy, idx) => {
                    const orgName = (
                      policy as RetentionPolicy & { isGlobal?: boolean }
                    ).isGlobal
                      ? null
                      : (orgs.find((o) => o.id === policy.orgId)?.name ??
                        policy.orgId ??
                        "—");
                    const holdTarget = (
                      policy as RetentionPolicy & { isGlobal?: boolean }
                    ).isGlobal
                      ? "__global__"
                      : (policy.orgId ?? "");
                    return (
                      <tr
                        key={policy.id}
                        className={`border-b last:border-0 transition-colors cursor-default ${
                          expiringPolicies.some((ep) => ep.id === policy.id)
                            ? "bg-amber-50/80 hover:bg-amber-100/70"
                            : "hover:bg-muted/30"
                        }`}
                        data-ocid={`retention.item.${idx + 1}`}
                      >
                        <td className="px-4 py-3">
                          {(policy as RetentionPolicy & { isGlobal?: boolean })
                            .isGlobal ? (
                            <span className="italic text-muted-foreground">
                              Global Default
                            </span>
                          ) : (
                            <span>{orgName}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatPeriod(policy.period)}
                        </td>
                        <td className="px-4 py-3">
                          {policy.legalHold ? (
                            <Badge
                              variant="destructive"
                              className="font-semibold"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              None
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {policy.autoDelete ? (
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline">Disabled</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatTs(policy.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const expiryMatch = expiringPolicies.find(
                              (ep) => ep.id === policy.id,
                            );
                            if (!expiryMatch)
                              return (
                                <span className="text-xs text-muted-foreground/40">
                                  —
                                </span>
                              );
                            const updatedMs = Number(
                              policy.updatedAt / 1_000_000n,
                            );
                            const expiryMs =
                              updatedMs + 30 * 24 * 60 * 60 * 1000;
                            const daysLeft = Math.max(
                              0,
                              Math.ceil(
                                (expiryMs - Date.now()) / (24 * 60 * 60 * 1000),
                              ),
                            );
                            return (
                              <span className="font-mono text-xs font-semibold text-amber-700">
                                {daysLeft}d
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(policy)}
                              data-ocid={`retention.edit_button.${idx + 1}`}
                              aria-label="Edit policy"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            {!policy.isGlobal && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (policy.legalHold) {
                                    setRemoveLegalHoldConfirm(policy);
                                  } else {
                                    openLegalHold(holdTarget);
                                  }
                                }}
                                data-ocid={`retention.legal_hold_button.${idx + 1}`}
                                aria-label={
                                  policy.legalHold
                                    ? "Remove legal hold"
                                    : "Place legal hold"
                                }
                                className={
                                  policy.legalHold
                                    ? "text-destructive hover:text-destructive"
                                    : "text-amber-600 hover:text-amber-700"
                                }
                              >
                                {policy.legalHold ? (
                                  <Unlock
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Lock
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
        <Dialog
          open={createModalOpen}
          onOpenChange={(open) => {
            if (!saving) setCreateModalOpen(open);
          }}
        >
          <DialogContent className="max-w-lg" data-ocid="retention.dialog">
            <DialogHeader>
              <DialogTitle>
                {editingPolicy
                  ? "Edit Retention Policy"
                  : "Create Retention Policy"}
              </DialogTitle>
              <DialogDescription>
                {editingPolicy
                  ? "Update the retention settings for this policy."
                  : "Define a new retention policy for an organization or as the global default."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Org selector — only shown on create */}
              {!editingPolicy && (
                <div className="space-y-1.5">
                  <Label htmlFor="policy-org">Apply To</Label>
                  <Select value={formOrgId} onValueChange={setFormOrgId}>
                    <SelectTrigger
                      id="policy-org"
                      data-ocid="retention.org_select"
                    >
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__global__">Global Default</SelectItem>
                      {orgs.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Retention period */}
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium leading-none">
                  Retention Period
                </legend>
                <div
                  className="grid grid-cols-2 gap-2"
                  data-ocid="retention.period_radio"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormPeriod(opt.value)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors text-left ${
                        formPeriod === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Auto-delete toggle */}
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-delete" className="font-medium">
                    Auto-Delete After Period
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically delete data when retention period expires
                  </p>
                </div>
                <Switch
                  id="auto-delete"
                  checked={formAutoDelete}
                  onCheckedChange={setFormAutoDelete}
                  data-ocid="retention.auto_delete_switch"
                />
              </div>

              {/* Auto-delete warning */}
              {formAutoDelete && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
                  <AlertTriangle
                    className="h-4 w-4 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-xs">
                    Auto-delete is irreversible. Data will be permanently
                    removed after the retention period expires.
                  </p>
                </div>
              )}

              {/* Legal hold toggle */}
              <div className="flex items-center justify-between rounded-md border px-4 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="legal-hold-switch" className="font-medium">
                    Legal Hold
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Prevent deletion even after the retention period expires
                  </p>
                </div>
                <Switch
                  id="legal-hold-switch"
                  checked={formLegalHold}
                  onCheckedChange={setFormLegalHold}
                  data-ocid="retention.legal_hold_switch"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={saving}
                data-ocid="retention.cancel_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePolicy}
                disabled={saving}
                data-ocid="retention.submit_button"
              >
                {saving
                  ? "Saving…"
                  : editingPolicy
                    ? "Save Changes"
                    : "Create Policy"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Remove Policy Confirm Dialog ──────────────────────────────── */}
        <ConfirmDialog
          open={removePolicyConfirm !== null}
          title="Remove Retention Policy"
          description="This policy will be permanently removed. Any data governed by this policy will revert to the global default retention settings. This action is audited."
          confirmLabel="Remove"
          destructive
          onCancel={() => setRemovePolicyConfirm(null)}
          onConfirm={async () => {
            if (!actor || !removePolicyConfirm) return;
            try {
              const result = await actor.updateRetentionPolicy({
                id: removePolicyConfirm.id,
                period: removePolicyConfirm.period,
                legalHold: false,
                autoDelete: false,
              });
              if (result.__kind__ === "ok") {
                toast.success("Retention policy removed");
                void fetchData();
              } else {
                toast.error(`Error: ${result.err}`);
              }
            } catch {
              toast.error("Failed to remove policy");
            } finally {
              setRemovePolicyConfirm(null);
            }
          }}
        />

        {/* ── Remove Legal Hold Confirm Dialog ─────────────────────────────── */}
        <ConfirmDialog
          open={removeLegalHoldConfirm !== null}
          title="Remove Legal Hold"
          description="This will release the legal hold on this organization. Data may be subject to automatic deletion according to the retention policy. This action is audited."
          confirmLabel="Remove Hold"
          destructive
          onCancel={() => setRemoveLegalHoldConfirm(null)}
          onConfirm={() => {
            if (removeLegalHoldConfirm) {
              const holdTargetId = removeLegalHoldConfirm.orgId ?? "";
              setRemoveLegalHoldConfirm(null);
              setLegalHoldTarget(holdTargetId);
              setLegalHoldReason("Admin-initiated hold removal");
              void (async () => {
                if (!actor) return;
                setHoldSaving(true);
                try {
                  const result = await actor.toggleLegalHold({
                    orgId: holdTargetId,
                    hold: false,
                    reason: "Admin-initiated hold removal via console",
                  });
                  if (result.__kind__ === "ok") {
                    toast.success("Legal hold removed");
                    void fetchData();
                  } else {
                    toast.error(`Error: ${result.err}`);
                  }
                } catch {
                  toast.error("Failed to remove legal hold");
                } finally {
                  setHoldSaving(false);
                }
              })();
            }
          }}
        />

        {/* ── Legal Hold Modal ─────────────────────────────────────────────── */}
        <Dialog
          open={legalHoldModalOpen}
          onOpenChange={(open) => {
            if (!holdSaving) setLegalHoldModalOpen(open);
          }}
        >
          <DialogContent
            className="max-w-md"
            data-ocid="retention.legal_hold_dialog"
          >
            <DialogHeader>
              <DialogTitle
                className={
                  lhCurrentHold ? "text-destructive" : "text-amber-700"
                }
              >
                {lhCurrentHold ? "Remove Legal Hold" : "Place Legal Hold"}
              </DialogTitle>
              <DialogDescription>
                {lhCurrentHold
                  ? `Remove the legal hold on ${lhOrgName}. Data will again be subject to normal retention rules.`
                  : `Place a legal hold on ${lhOrgName}. Data will be preserved regardless of retention period.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Warning box */}
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-amber-800">
                <AlertTriangle
                  className="h-4 w-4 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-xs">
                  All legal hold operations are permanently recorded in the
                  audit log and cannot be modified or deleted.
                </p>
              </div>

              {/* Reason textarea */}
              <div className="space-y-1.5">
                <Label htmlFor="hold-reason">
                  Reason{" "}
                  <span className="text-muted-foreground font-normal">
                    (required, min 10 characters)
                  </span>
                </Label>
                <Textarea
                  id="hold-reason"
                  value={legalHoldReason}
                  onChange={(e) => setLegalHoldReason(e.target.value)}
                  placeholder="Describe the legal basis or reason for this action…"
                  rows={3}
                  data-ocid="retention.hold_reason_textarea"
                />
                {legalHoldReason.length > 0 &&
                  legalHoldReason.trim().length < 10 && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="retention.hold_reason.field_error"
                    >
                      Reason must be at least 10 characters.
                    </p>
                  )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setLegalHoldModalOpen(false)}
                disabled={holdSaving}
                data-ocid="retention.hold_cancel_button"
              >
                Cancel
              </Button>
              <Button
                variant={lhCurrentHold ? "outline" : "default"}
                onClick={handleToggleLegalHold}
                disabled={holdSaving || legalHoldReason.trim().length < 10}
                className={
                  lhCurrentHold
                    ? "border-destructive text-destructive hover:bg-destructive/10"
                    : "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                }
                data-ocid="retention.hold_confirm_button"
              >
                {holdSaving
                  ? "Processing…"
                  : lhCurrentHold
                    ? "Remove Hold"
                    : "Confirm Hold"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
