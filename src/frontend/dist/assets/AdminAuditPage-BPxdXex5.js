import { e as createLucideIcon, j as jsxRuntimeExports, aD as EmptyState, a4 as ShieldCheck, c as Badge, a as Skeleton, a2 as AuditEventType, r as reactExports, d as ue, a6 as Copy, V as useIsSuperAdmin, X as useMyOrgs, a7 as useMyRole, O as OrgRole, aC as Principal, _ as useAdminAuditLog, aE as useExportAuditLogs, aF as Lock, B as Button, aG as Download, ab as X } from "./index-CCR6Ctxt.js";
import { A as AdminLayout } from "./AdminLayout-CoUIN4Ho.js";
import { S as ShieldAlert } from "./shield-alert-BPskbdXS.js";
import { F as Funnel } from "./funnel-CnTl0KvR.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
];
const RotateCcw = createLucideIcon("rotate-ccw", __iconNode);
const EVENT_TYPE_META = {
  [AuditEventType.userRegistered]: {
    label: "User Registered",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  },
  [AuditEventType.userInvited]: {
    label: "User Invited",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
  },
  [AuditEventType.userRemoved]: {
    label: "User Removed",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
  },
  [AuditEventType.messageSent]: {
    label: "Message Sent",
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
  },
  [AuditEventType.callInitiated]: {
    label: "Call Initiated",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
  },
  [AuditEventType.memberAdded]: {
    label: "Member Added",
    className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
  },
  [AuditEventType.memberRemoved]: {
    label: "Member Removed",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  },
  [AuditEventType.memberRoleChanged]: {
    label: "Role Changed",
    className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
  },
  [AuditEventType.memberSuspended]: {
    label: "Member Suspended",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
  },
  [AuditEventType.memberReactivated]: {
    label: "Member Reactivated",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
  },
  [AuditEventType.adminAction]: {
    label: "Admin Action",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
  },
  [AuditEventType.orgCreated]: {
    label: "Org Created",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  },
  [AuditEventType.orgUpdated]: {
    label: "Org Updated",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
  },
  [AuditEventType.orgSuspended]: {
    label: "Org Suspended",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
  },
  [AuditEventType.orgDeleted]: {
    label: "Org Deleted",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
  },
  [AuditEventType.retentionEnabled]: {
    label: "Retention Enabled",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
  },
  [AuditEventType.retentionDisabled]: {
    label: "Retention Disabled",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
  },
  [AuditEventType.escrowEnrolled]: {
    label: "Escrow Enrolled",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
  },
  [AuditEventType.escrowRevoked]: {
    label: "Escrow Revoked",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
  },
  [AuditEventType.escrowAccessGranted]: {
    label: "Escrow Access",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
  },
  [AuditEventType.auditLogExported]: {
    label: "Log Exported",
    className: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20"
  },
  [AuditEventType.messageQueueDrained]: {
    label: "Queue Drained",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  },
  [AuditEventType.priorityMessageSent]: {
    label: "Priority Sent",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
  },
  [AuditEventType.sovereignConfigUpdated]: {
    label: "Sovereign Updated",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
  },
  [AuditEventType.groupMemberRemoved]: {
    label: "Group Member Removed",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
  },
  [AuditEventType.compartmentAssigned]: {
    label: "Compartment Assigned",
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
  },
  [AuditEventType.keyRecoveryInitiated]: {
    label: "Recovery Initiated",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  },
  [AuditEventType.keyRecoveryApproved]: {
    label: "Recovery Approved",
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
  },
  [AuditEventType.keyRecoveryRejected]: {
    label: "Recovery Rejected",
    className: "bg-neutral-500/10 text-muted-foreground border-neutral-500/20"
  },
  [AuditEventType.policyReportExported]: {
    label: "Report Exported",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  },
  [AuditEventType.policyExpiryCheckPerformed]: {
    label: "Expiry Check",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  },
  [AuditEventType.legalHoldPlaced]: {
    label: "Legal Hold Placed",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  },
  [AuditEventType.legalHoldRemoved]: {
    label: "Legal Hold Removed",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  },
  [AuditEventType.retentionPolicyCreated]: {
    label: "Retention Policy Created",
    className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
  },
  [AuditEventType.retentionPolicyUpdated]: {
    label: "Retention Policy Updated",
    className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
  },
  [AuditEventType.platformSettingsUpdated]: {
    label: "Platform Settings Updated",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
  },
  [AuditEventType.orgSettingsUpdated]: {
    label: "Org Settings Updated",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
  },
  [AuditEventType.keyRecoveryCompleted]: {
    label: "Key Recovery Completed",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  },
  [AuditEventType.keyEscrowEnrolled]: {
    label: "Key Escrow Enrolled",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  }
};
const FALLBACK_META = {
  label: "Admin Action",
  className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
};
function decodeDetails$1(bytes) {
  if (!bytes || bytes.length === 0) return "";
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return "[binary data]";
  }
}
function shortenPrincipal(text) {
  return text.length > 16 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text;
}
function PrincipalCell({ value }) {
  const handleCopy = reactExports.useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      ue.success("Principal copied", { duration: 2e3 });
    });
  }, [value]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 font-mono text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", title: value, children: shortenPrincipal(value) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: handleCopy,
        "aria-label": "Copy principal",
        className: "p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors duration-200",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 11 })
      }
    )
  ] });
}
const SKEL_IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
function SkeletonRows() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: SKEL_IDS.map((sid) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border", children: [44, 28, 20, 20, 16, 36, 16].map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    Skeleton,
    {
      className: "h-4 rounded",
      style: { width: `${w * 4}px` }
    }
  ) }, w)) }, sid)) });
}
function AuditLogTable({ events, isLoading }) {
  if (!isLoading && events.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      EmptyState,
      {
        icon: ShieldCheck,
        title: "No audit events found",
        description: "Security events will appear here when users interact with CharlieSierra.",
        ocid: "audit.empty_state"
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-ocid": "audit.table_container", className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "table",
    {
      className: "w-full text-sm cursor-default select-text",
      "data-ocid": "audit.table",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/40 border-b border-border sticky top-0 z-10", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap", children: "Timestamp" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider", children: "Actor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap", children: "Action Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider", children: "Target" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider", children: "Organization" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider", children: "Details" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap", children: "IP" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonRows, {}) : events.map((event, idx) => {
          const meta = EVENT_TYPE_META[event.eventType] ?? FALLBACK_META;
          const ts = new Date(Number(event.timestamp) / 1e6);
          const details = decodeDetails$1(event.encryptedDetails);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              className: "transition-colors duration-100",
              "data-ocid": `audit.row.${idx + 1}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "td",
                  {
                    className: "px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono",
                    title: ts.toISOString(),
                    children: ts.toLocaleString(void 0, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PrincipalCell, { value: event.actorPrincipal.toText() }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Badge,
                  {
                    variant: "outline",
                    className: `text-xs font-medium border whitespace-nowrap ${meta.className}`,
                    children: meta.label
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: event.targetPrincipal ? /* @__PURE__ */ jsxRuntimeExports.jsx(PrincipalCell, { value: event.targetPrincipal.toText() }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground/40", children: "—" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: event.orgId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "font-mono text-xs text-muted-foreground",
                    title: event.orgId,
                    children: event.orgId.length > 12 ? `${event.orgId.slice(0, 10)}…` : event.orgId
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground/60 italic", children: "Platform" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 max-w-xs", children: details ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "text-xs text-muted-foreground line-clamp-2 break-words",
                    title: details,
                    children: details
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground/40", children: "—" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground/40", children: "—" }) })
              ]
            },
            event.id.toString()
          );
        }) })
      ]
    }
  ) });
}
const PAGE_LIMIT = 50;
const EVENT_TYPE_OPTIONS = [
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
    label: "Escrow Access Granted"
  },
  { value: AuditEventType.retentionEnabled, label: "Retention Enabled" },
  { value: AuditEventType.retentionDisabled, label: "Retention Disabled" },
  { value: AuditEventType.auditLogExported, label: "Log Exported" },
  {
    value: AuditEventType.sovereignConfigUpdated,
    label: "Sovereign Config Updated"
  },
  {
    value: AuditEventType.compartmentAssigned,
    label: "Compartment Assigned"
  },
  { value: AuditEventType.messageQueueDrained, label: "Queue Drained" },
  { value: AuditEventType.priorityMessageSent, label: "Priority Sent" },
  { value: AuditEventType.legalHoldPlaced, label: "Legal Hold Placed" },
  { value: AuditEventType.legalHoldRemoved, label: "Legal Hold Removed" },
  {
    value: AuditEventType.retentionPolicyCreated,
    label: "Retention Policy Created"
  },
  {
    value: AuditEventType.retentionPolicyUpdated,
    label: "Retention Policy Updated"
  }
];
function dateToNano(dateStr, endOfDay) {
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return BigInt(d.getTime()) * 1000000n;
}
function decodeDetails(bytes) {
  if (!bytes || bytes.length === 0) return "";
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}
function exportToCsv(events, filename) {
  const header = "Timestamp,Actor,ActionType,Target,Organization,Details";
  const rows = events.map((e) => {
    const ts = new Date(Number(e.timestamp) / 1e6).toISOString();
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
function FilterPill({
  label,
  onRemove
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-sm border border-primary/30 bg-primary/5 px-2 py-0.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.6rem] tracking-wide text-primary", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: onRemove,
        "aria-label": `Remove filter: ${label}`,
        className: "ml-0.5 rounded text-primary/60 transition-colors hover:text-primary",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 9 })
      }
    )
  ] });
}
function AdminAuditPage() {
  var _a, _b;
  const { data: isSuperAdmin = false } = useIsSuperAdmin();
  const { data: myOrgs = [] } = useMyOrgs();
  const firstOrgId = ((_a = myOrgs[0]) == null ? void 0 : _a.orgId) ?? null;
  const { data: myRole } = useMyRole(firstOrgId);
  const isAuditor = myRole === OrgRole.Auditor;
  const canSeeAllOrgs = isSuperAdmin || isAuditor;
  const [appliedFrom, setAppliedFrom] = reactExports.useState("");
  const [appliedTo, setAppliedTo] = reactExports.useState("");
  const [appliedEventType, setAppliedEventType] = reactExports.useState(
    ""
  );
  const [appliedOrgId, setAppliedOrgId] = reactExports.useState("");
  const [appliedActor, setAppliedActor] = reactExports.useState("");
  const [fromDate, setFromDate] = reactExports.useState("");
  const [toDate, setToDate] = reactExports.useState("");
  const [eventTypeFilter, setEventTypeFilter] = reactExports.useState(
    ""
  );
  const [orgIdFilter, setOrgIdFilter] = reactExports.useState("");
  const [actorFilter, setActorFilter] = reactExports.useState("");
  const [searchText, setSearchText] = reactExports.useState("");
  const [pages, setPages] = reactExports.useState([]);
  const [lastEventId, setLastEventId] = reactExports.useState(void 0);
  const serverReq = reactExports.useMemo(
    () => ({
      limit: BigInt(PAGE_LIMIT),
      afterEventId: lastEventId,
      filterEventType: appliedEventType || void 0,
      afterTimestamp: appliedFrom ? dateToNano(appliedFrom, false) : void 0,
      beforeTimestamp: appliedTo ? dateToNano(appliedTo, true) : void 0,
      filterOrgId: appliedOrgId.trim() || void 0,
      filterActor: appliedActor.trim() ? Principal.fromText(appliedActor.trim()) : void 0
    }),
    [
      appliedFrom,
      appliedTo,
      appliedEventType,
      appliedOrgId,
      appliedActor,
      lastEventId
    ]
  );
  const {
    data: newPage = [],
    isLoading,
    isFetching
  } = useAdminAuditLog(serverReq);
  const exportMutation = useExportAuditLogs();
  const allEvents = reactExports.useMemo(() => {
    const accumulated = [...pages.flat(), ...newPage];
    const seen = /* @__PURE__ */ new Set();
    return accumulated.filter((e) => {
      const key = e.id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pages, newPage]);
  const filteredEvents = reactExports.useMemo(() => {
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
  const hasActiveFilters = appliedFrom !== "" || appliedTo !== "" || appliedEventType !== "" || appliedOrgId !== "" || appliedActor !== "";
  function applyFilters() {
    setPages([]);
    setLastEventId(void 0);
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
    setLastEventId(void 0);
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
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const req = {
      filterEventType: appliedEventType || void 0,
      afterTimestamp: appliedFrom ? dateToNano(appliedFrom, false) : void 0,
      beforeTimestamp: appliedTo ? dateToNano(appliedTo, true) : void 0,
      filterOrgId: appliedOrgId.trim() || void 0,
      filterActor: void 0
    };
    try {
      const events = await exportMutation.mutateAsync(req);
      exportToCsv(events, `audit-logs-${dateStr}.csv`);
      ue.success(
        `Exported ${events.length} event${events.length !== 1 ? "s" : ""} to CSV`
      );
    } catch (err) {
      ue.error(err instanceof Error ? err.message : "Export failed");
    }
  }
  const inputCls = "h-8 rounded-sm border border-input bg-background px-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary";
  const hasDraftChanges = fromDate !== appliedFrom || toDate !== appliedTo || eventTypeFilter !== appliedEventType || orgIdFilter !== appliedOrgId || actorFilter !== appliedActor;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AdminLayout,
    {
      title: "AUDIT LOGS",
      action: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          onClick: handleExport,
          disabled: exportMutation.isPending,
          "data-ocid": "admin.audit.export_button",
          className: "gap-2 font-mono text-xs tracking-widest",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 13 }),
            exportMutation.isPending ? "EXPORTING…" : "EXPORT CSV"
          ]
        }
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            "data-ocid": "admin.audit.immutability_banner",
            className: "flex items-center gap-3 rounded-sm border border-amber-500/40 bg-amber-500/5 px-4 py-3",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 rounded-sm bg-amber-500/15 p-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { size: 14, className: "text-amber-600 dark:text-amber-400" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400", children: "IMMUTABLE RECORD" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 font-mono text-[0.65rem] tracking-wide text-amber-600/80 dark:text-amber-500/80", children: "All actions are immutable on the Internet Computer and cannot be altered." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto shrink-0 flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ShieldAlert,
                  {
                    size: 13,
                    className: "text-amber-500/60",
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.55rem] tracking-widest text-amber-500/60 uppercase", children: "Read Only" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            "data-ocid": "admin.audit.status_label",
            className: "font-mono text-[0.65rem] tracking-widest text-muted-foreground",
            children: isLoading ? "LOADING EVENTS…" : `${filteredEvents.length}${filteredEvents.length !== 1 ? " EVENTS" : " EVENT"}${hasActiveFilters ? " LOADED (FILTERED)" : " LOADED"}`
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            "data-ocid": "admin.audit.filter_bar",
            className: "rounded-sm border border-border bg-card p-4 space-y-3",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { size: 13, className: "text-muted-foreground shrink-0" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase", children: "Filters" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase", children: "Search (Actor or Details)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    placeholder: "Search by principal or details…",
                    value: searchText,
                    onChange: (e) => setSearchText(e.target.value),
                    "data-ocid": "admin.audit.search_input",
                    className: `${inputCls} w-full max-w-md`
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase", children: "From" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "date",
                      value: fromDate,
                      onChange: (e) => setFromDate(e.target.value),
                      max: toDate || void 0,
                      "data-ocid": "admin.audit.from_date_input",
                      className: inputCls
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase", children: "To" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "date",
                      value: toDate,
                      onChange: (e) => setToDate(e.target.value),
                      min: fromDate || void 0,
                      "data-ocid": "admin.audit.to_date_input",
                      className: inputCls
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase", children: "Action Type" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "select",
                    {
                      value: eventTypeFilter,
                      onChange: (e) => setEventTypeFilter(e.target.value),
                      "data-ocid": "admin.audit.event_type_select",
                      className: `${inputCls} pr-7`,
                      children: EVENT_TYPE_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: opt.value, children: opt.label }, opt.value))
                    }
                  )
                ] }),
                canSeeAllOrgs && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      id: "org-filter-label",
                      className: "font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase",
                      children: "Organization"
                    }
                  ),
                  myOrgs.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      value: orgIdFilter,
                      onChange: (e) => setOrgIdFilter(e.target.value),
                      "data-ocid": "admin.audit.org_select",
                      "aria-labelledby": "org-filter-label",
                      className: `${inputCls} pr-7`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "All Organizations" }),
                        myOrgs.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m.orgId, children: m.orgId }, m.orgId))
                      ]
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "text",
                      placeholder: "Org ID…",
                      value: orgIdFilter,
                      onChange: (e) => setOrgIdFilter(e.target.value),
                      "data-ocid": "admin.audit.org_id_input",
                      "aria-labelledby": "org-filter-label",
                      className: `${inputCls} w-44`
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.6rem] tracking-widest text-muted-foreground uppercase", children: "Actor" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "text",
                      placeholder: "Principal…",
                      value: actorFilter,
                      onChange: (e) => setActorFilter(e.target.value),
                      "data-ocid": "admin.audit.actor_input",
                      className: `${inputCls} w-40`
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 pt-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    size: "sm",
                    onClick: applyFilters,
                    disabled: !hasDraftChanges,
                    "data-ocid": "admin.audit.apply_filters_button",
                    className: "h-8 gap-1.5 font-mono text-[0.65rem] tracking-widest uppercase",
                    children: "Apply Filters"
                  }
                ),
                (hasActiveFilters || fromDate || toDate || eventTypeFilter || orgIdFilter || actorFilter || searchText) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    onClick: clearFilters,
                    "data-ocid": "admin.audit.clear_filters_button",
                    className: "h-8 gap-1.5 font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground hover:text-destructive",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 11 }),
                      "Clear All"
                    ]
                  }
                )
              ] }),
              hasActiveFilters && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  "data-ocid": "admin.audit.active_filters",
                  className: "flex flex-wrap gap-1.5 pt-1",
                  children: [
                    appliedFrom && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      FilterPill,
                      {
                        label: `From: ${appliedFrom}`,
                        onRemove: () => {
                          setFromDate("");
                          setAppliedFrom("");
                        }
                      }
                    ),
                    appliedTo && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      FilterPill,
                      {
                        label: `To: ${appliedTo}`,
                        onRemove: () => {
                          setToDate("");
                          setAppliedTo("");
                        }
                      }
                    ),
                    appliedEventType && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      FilterPill,
                      {
                        label: ((_b = EVENT_TYPE_OPTIONS.find((o) => o.value === appliedEventType)) == null ? void 0 : _b.label) ?? appliedEventType,
                        onRemove: () => {
                          setEventTypeFilter("");
                          setAppliedEventType("");
                        }
                      }
                    ),
                    appliedOrgId && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      FilterPill,
                      {
                        label: `Org: ${appliedOrgId}`,
                        onRemove: () => {
                          setOrgIdFilter("");
                          setAppliedOrgId("");
                        }
                      }
                    ),
                    appliedActor && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      FilterPill,
                      {
                        label: `Actor: ${appliedActor.slice(0, 12)}…`,
                        onRemove: () => {
                          setActorFilter("");
                          setAppliedActor("");
                        }
                      }
                    )
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "data-ocid": "admin.audit.table_section",
            className: "overflow-hidden rounded-sm border border-border bg-card",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              AuditLogTable,
              {
                events: filteredEvents,
                isLoading: isLoading && allEvents.length === 0
              }
            )
          }
        ),
        (hasMore || isFetching && allEvents.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            onClick: loadMore,
            disabled: isFetching,
            "data-ocid": "admin.audit.load_more_button",
            className: "gap-2 font-mono text-xs tracking-widest uppercase",
            children: isFetching ? "Loading…" : "Load More"
          }
        ) })
      ] })
    }
  );
}
export {
  AdminAuditPage as default
};
