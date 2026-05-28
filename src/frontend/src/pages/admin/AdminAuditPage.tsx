/**
 * AdminAuditPage — /admin/audit-logs
 * Full-featured immutable audit log viewer with:
 *  - Immutability banner
 *  - Server-side filtered queries via afterEventId cursor (Load More)
 *  - Client-side text search (actor + details)
 *  - Date range, event type, org, and actor principal filters
 *  - CSV export via exportAuditLogs backend method
 *  - Role-based access: Super Admin + Auditors see all; Org Admins see own org
 */
import type { AuditEvent, ExportAuditLogsRequest } from "@/backend";
import { AuditEventType, OrgRole } from "@/backend";
import { AuditLogTable } from "@/components/AuditLogTable";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  useAdminAuditLog,
  useExportAuditLogs,
  useIsSuperAdmin,
  useMyOrgs,
  useMyRole,
} from "@/hooks/use-admin";
import { Principal } from "@icp-sdk/core/principal";
import {
  Download,
  Filter,
  Lock,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────────────────

const PAGE_LIMIT = 50;

const EVENT_TYPE_OPTIONS: Array<{ value: AuditEventType | ""; label: string }> =
  [
    { value: "", label: "All Event Types" },
    { value: AuditEventType.userRegistered, label: "User Registered" },
    { value: AuditEventType.userInvited, label: "User Invited" },
    { value: AuditEventType.userRemoved, label: "User Removed" },
    { value: AuditEventType.adminAction, label: "Admin Action" },
    { value: AuditEventType.memberAdded, label: "Member Added" },
    { value: AuditEventType.memberRemoved, label: "Member Removed" },
    { value: AuditEventType.memberRoleChanged, label: "Role Changed" },
    { value: AuditEventType.memberSuspended, label: "Member Suspended" },
    { value: AuditEventType.memberReactivated, label: "Member Reactivated" },
    { value: AuditEventType.orgCreated, label: "Org Created" },
    { value: AuditEventType.orgUpdated, label: "Org Updated" },
    { value: AuditEventType.orgSuspended, label: "Org Suspended" },
    { value: AuditEventType.orgDeleted, label: "Org Deleted" },
    { value: AuditEventType.escrowEnrolled, label: "Escrow Enrolled" },
    { value: AuditEventType.escrowRevoked, label: "Escrow Revoked" },
    {
      value: AuditEventType.escrowAccessGranted,
      label: "Escrow Access Granted",
    },
    { value: AuditEventType.retentionEnabled, label: "Retention Enabled" },
    { value: AuditEventType.retentionDisabled, label: "Retention Disabled" },
    { value: AuditEventType.auditLogExported, label: "Log Exported" },
    {
      value: AuditEventType.sovereignConfigUpdated,
      label: "Sovereign Config Updated",
    },
    {
      value: AuditEventType.compartmentAssigned,
      label: "Compartment Assigned",
    },
    { value: AuditEventType.messageQueueDrained, label: "Queue Drained" },
    { value: AuditEventType.priorityMessageSent, label: "Priority Sent" },
    { value: AuditEventType.legalHoldPlaced, label: "Legal Hold Placed" },
    { value: AuditEventType.legalHoldRemoved, label: "Legal Hold Removed" },
    {
      value: AuditEventType.retentionPolicyCreated,
      label: "Retention Policy Created",
    },
    {
      value: AuditEventType.retentionPolicyUpdated,
      label: "Retention Policy Updated",
    },
  ];

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateToNano(dateStr: string, endOfDay: boolean): bigint {
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return BigInt(d.getTime()) * 1_000_000n;
}

function decodeDetails(bytes: Uint8Array | undefined): string {
  if (!bytes || bytes.length === 0) return "";
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/** Export AuditEvent[] to CSV and trigger a browser download. */
function exportToCsv(events: AuditEvent[], filename: string) {
  const header = "Timestamp,Actor,ActionType,Target,Organization,Details";
  const rows = events.map((e) => {
    const ts = new Date(Number(e.timestamp) / 1_000_000).toISOString();
    const actor = e.actorPrincipal.toText();
    const action = e.eventType;
    const target = e.targetPrincipal ? e.targetPrincipal.toText() : "";
    const org = e.orgId ?? "";
    const details = decodeDetails(e.encryptedDetails).replace(/"/g, '""');
    return `"${ts}","${actor}","${action}","${target}","${org}","${details}"`;
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── FilterPill ─────────────────────────────────────────────────────────────────

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-primary/30 bg-primary/5 px-2 py-0.5">
      <span className="font-mono text-[0.6rem] tracking-wide text-primary">
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="ml-0.5 rounded text-primary/60 transition-colors hover:text-primary"
      >
        <X size={9} />
      </button>
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAuditPage() {
  // ── Role detection ──────────────────────────────────────────────────
  const { data: isSuperAdmin = false } = useIsSuperAdmin();
  const { data: myOrgs = [] } = useMyOrgs();
  const firstOrgId = myOrgs[0]?.orgId ?? null;
  const { data: myRole } = useMyRole(firstOrgId);
  const isAuditor = myRole === OrgRole.Auditor;
  const canSeeAllOrgs = isSuperAdmin || isAuditor;

  // ── Applied filter state (server-side) ──────────────────────────────
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [appliedEventType, setAppliedEventType] = useState<AuditEventType | "">(
    "",
  );
  const [appliedOrgId, setAppliedOrgId] = useState("");
  const [appliedActor, setAppliedActor] = useState("");

  // ── Draft filter state (pending apply) ──────────────────────────────
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<AuditEventType | "">(
    "",
  );
  const [orgIdFilter, setOrgIdFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  // ── Cursor-based pagination ─────────────────────────────────────────
  const [pages, setPages] = useState<AuditEvent[][]>([]);
  const [lastEventId, setLastEventId] = useState<bigint | undefined>(undefined);

  const serverReq = useMemo(
    () => ({
      limit: BigInt(PAGE_LIMIT),
      afterEventId: lastEventId,
      filterEventType: appliedEventType || undefined,
      afterTimestamp: appliedFrom ? dateToNano(appliedFrom, false) : undefined,
      beforeTimestamp: appliedTo ? dateToNano(appliedTo, true) : undefined,
      filterOrgId: appliedOrgId.trim() || undefined,
      filterActor: appliedActor.trim()
        ? Principal.fromText(appliedActor.trim())
        : undefined,
    }),
    [
      appliedFrom,
      appliedTo,
      appliedEventType,
      appliedOrgId,
      appliedActor,
      lastEventId,
    ],
  );

  const {
    data: newPage = [],
    isLoading,
    isFetching,
  } = useAdminAuditLog(serverReq);
  const exportMutation = useExportAuditLogs();

  const allEvents = useMemo(() => {
    const accumulated = [...pages.flat(), ...newPage];
    const seen = new Set<string>();
    return accumulated.filter((e) => {
      const key = e.id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pages, newPage]);

  const filteredEvents = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const actor = appliedActor.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (actor && !e.actorPrincipal.toText().toLowerCase().includes(actor))
        return false;
      if (q) {
        const actorText = e.actorPrincipal.toText().toLowerCase();
        const details = decodeDetails(e.encryptedDetails).toLowerCase();
        if (!actorText.includes(q) && !details.includes(q)) return false;
      }
      return true;
    });
  }, [allEvents, searchText, appliedActor]);

  const hasMore = newPage.length === PAGE_LIMIT;
  const hasActiveFilters =
    appliedFrom !== "" ||
    appliedTo !== "" ||
    appliedEventType !== "" ||
    appliedOrgId !== "" ||
    appliedActor !== "";

  function applyFilters() {
    setPages([]);
    setLastEventId(undefined);
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    setAppliedEventType(eventTypeFilter);
    setAppliedOrgId(orgIdFilter);
    setAppliedActor(actorFilter);
  }

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setEventTypeFilter("");
    setOrgIdFilter("");
    setActorFilter("");
    setSearchText("");
    setPages([]);
    setLastEventId(undefined);
    setAppliedFrom("");
    setAppliedTo("");
    setAppliedEventType("");
    setAppliedOrgId("");
    setAppliedActor("");
  }

  function loadMore() {
    if (newPage.length > 0) {
      const lastId = newPage[newPage.length - 1].id;
      setPages((prev) => [...prev, newPage]);
      setLastEventId(lastId);
    }
  }

  async function handleExport() {
    const dateStr = new Date().toISOString().slice(0, 10);
    const req: ExportAuditLogsRequest = {
      filterEventType: appliedEventType || undefined,
      afterTimestamp: appliedFrom ? dateToNano(appliedFrom, false) : undefined,
      beforeTimestamp: appliedTo ? dateToNano(appliedTo, true) : undefined,
      filterOrgId: appliedOrgId.trim() || undefined,
      filterActor: undefined,
    };
    try {
      const events = await exportMutation.mutateAsync(req);
      exportToCsv(events, `audit-logs-${dateStr}.csv`);
      toast.success(
        `Exported ${events.length} event${events.length !== 1 ? "s" : ""} to CSV`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  const inputCls =
    "h-8 rounded-sm border border-input bg-background px-2 font-mono text-xs text-foreground " +
    "placeholder:text-muted-foreground/50 transition-colors duration-150 " +
    "focus:outline-none focus:ring-2 focus:ring-primary";

  const hasDraftChanges =
    fromDate !== appliedFrom ||
    toDate !== appliedTo ||
    eventTypeFilter !== appliedEventType ||
    orgIdFilter !== appliedOrgId ||
    actorFilter !== appliedActor;

  return (
    <AdminLayout
      title="AUDIT LOGS"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exportMutation.isPending}
          data-ocid="admin.audit.export_button"
          className="gap-2 font-mono text-xs tracking-widest"
        >
          <Download size={13} />
          {exportMutation.isPending ? "EXPORTING…" : "EXPORT CSV"}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Immutability banner */}
        <div
          data-ocid="admin.audit.immutability_banner"
          className="flex items-center gap-3 rounded-sm border border-amber-500/40 bg-amber-500/5 px-4 py-3"
        >
          <div className="shrink-0 rounded-sm bg-amber-500/15 p-1.5">
            <Lock size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400">
              IMMUTABLE RECORD
            </p>
            <p className="mt-0.5 font-mono text-[0.65rem] tracking-wide text-amber-600/80 dark:text-amber-500/80">
              All actions are immutable on the Internet Computer and cannot be
              altered.
            </p>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-1.5">
            <ShieldAlert
              size={13}
              className="text-amber-500/60"
              aria-hidden="true"
            />
            <span className="font-mono text-[0.55rem] tracking-widest text-amber-500/60 uppercase">
              Read Only
            </span>
          </div>
        </div>

        {/* Status line */}
        <p
          data-ocid="admin.audit.status_label"
          className="font-mono text-[0.65rem] tracking-widest text-muted-foreground"
        >
          {isLoading
            ? "LOADING EVENTS…"
            : `${filteredEvents.length}${filteredEvents.length !== 1 ? " EVENTS" : " EVENT"}${hasActiveFilters ? " LOADED (FILTERED)" : " LOADED"}`}
        </p>

        {/* Filter bar */}
        <div
          data-ocid="admin.audit.filter_bar"
          className="rounded-sm border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-muted-foreground shrink-0" />
            <span className="font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase">
              Filters
            </span>
          </div>

          {/* Search bar */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase">
              Search (Actor or Details)
            </span>
            <input
              type="text"
              placeholder="Search by principal or details…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              data-ocid="admin.audit.search_input"
              className={`${inputCls} w-full max-w-md`}
            />
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase">
                From
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={toDate || undefined}
                data-ocid="admin.audit.from_date_input"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase">
                To
              </span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || undefined}
                data-ocid="admin.audit.to_date_input"
                className={inputCls}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase">
                Action Type
              </span>
              <select
                value={eventTypeFilter}
                onChange={(e) =>
                  setEventTypeFilter(e.target.value as AuditEventType | "")
                }
                data-ocid="admin.audit.event_type_select"
                className={`${inputCls} pr-7`}
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {canSeeAllOrgs && (
              <div className="flex flex-col gap-1">
                <span
                  id="org-filter-label"
                  className="font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase"
                >
                  Organization
                </span>
                {myOrgs.length > 0 ? (
                  <select
                    value={orgIdFilter}
                    onChange={(e) => setOrgIdFilter(e.target.value)}
                    data-ocid="admin.audit.org_select"
                    aria-labelledby="org-filter-label"
                    className={`${inputCls} pr-7`}
                  >
                    <option value="">All Organizations</option>
                    {myOrgs.map((m) => (
                      <option key={m.orgId} value={m.orgId}>
                        {m.orgId}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Org ID…"
                    value={orgIdFilter}
                    onChange={(e) => setOrgIdFilter(e.target.value)}
                    data-ocid="admin.audit.org_id_input"
                    aria-labelledby="org-filter-label"
                    className={`${inputCls} w-44`}
                  />
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase">
                Actor
              </span>
              <input
                type="text"
                placeholder="Principal…"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                data-ocid="admin.audit.actor_input"
                className={`${inputCls} w-40`}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={applyFilters}
              disabled={!hasDraftChanges}
              data-ocid="admin.audit.apply_filters_button"
              className="h-8 gap-1.5 font-mono text-[0.65rem] tracking-widest uppercase"
            >
              Apply Filters
            </Button>
            {(hasActiveFilters ||
              fromDate ||
              toDate ||
              eventTypeFilter ||
              orgIdFilter ||
              actorFilter ||
              searchText) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-ocid="admin.audit.clear_filters_button"
                className="h-8 gap-1.5 font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground hover:text-destructive"
              >
                <RotateCcw size={11} />
                Clear All
              </Button>
            )}
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div
              data-ocid="admin.audit.active_filters"
              className="flex flex-wrap gap-1.5 pt-1"
            >
              {appliedFrom && (
                <FilterPill
                  label={`From: ${appliedFrom}`}
                  onRemove={() => {
                    setFromDate("");
                    setAppliedFrom("");
                  }}
                />
              )}
              {appliedTo && (
                <FilterPill
                  label={`To: ${appliedTo}`}
                  onRemove={() => {
                    setToDate("");
                    setAppliedTo("");
                  }}
                />
              )}
              {appliedEventType && (
                <FilterPill
                  label={
                    EVENT_TYPE_OPTIONS.find((o) => o.value === appliedEventType)
                      ?.label ?? appliedEventType
                  }
                  onRemove={() => {
                    setEventTypeFilter("");
                    setAppliedEventType("");
                  }}
                />
              )}
              {appliedOrgId && (
                <FilterPill
                  label={`Org: ${appliedOrgId}`}
                  onRemove={() => {
                    setOrgIdFilter("");
                    setAppliedOrgId("");
                  }}
                />
              )}
              {appliedActor && (
                <FilterPill
                  label={`Actor: ${appliedActor.slice(0, 12)}…`}
                  onRemove={() => {
                    setActorFilter("");
                    setAppliedActor("");
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Audit table */}
        <div
          data-ocid="admin.audit.table_section"
          className="overflow-hidden rounded-sm border border-border bg-card"
        >
          <AuditLogTable
            events={filteredEvents}
            isLoading={isLoading && allEvents.length === 0}
          />
        </div>

        {/* Load More */}
        {(hasMore || (isFetching && allEvents.length > 0)) && (
          <div className="flex items-center justify-center py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={isFetching}
              data-ocid="admin.audit.load_more_button"
              className="gap-2 font-mono text-xs tracking-widest uppercase"
            >
              {isFetching ? "Loading…" : "Load More"}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
