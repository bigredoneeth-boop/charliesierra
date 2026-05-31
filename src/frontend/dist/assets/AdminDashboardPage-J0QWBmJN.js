import { e as createLucideIcon, n as useNavigate, k as useAuth, _ as useIsSuperAdmin, aq as useCheckPolicyExpiry, ar as useMyOrgs, a7 as useOrgs, a2 as useOrgUsers, as as useAdminAuditLog, r as reactExports, j as jsxRuntimeExports, U as Users, at as UserCheck, au as MessageSquare, av as Settings, aw as AuditEventType, a0 as Shield, f as cn, ax as ShieldCheck } from "./index-DwKKOR6D.js";
import { u as usePolicyExpiryStore, A as AdminLayout, B as Building2 } from "./AdminLayout-D2txHq0E.js";
import { P as PrincipalDisplay } from "./PrincipalDisplay-rQvDPiaT.js";
import { U as UserPlus } from "./user-plus-DmT3PvrM.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]];
const ChevronRight = createLucideIcon("chevron-right", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
  [
    "path",
    {
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      key: "116196"
    }
  ],
  ["path", { d: "M12 11h4", key: "1jrz19" }],
  ["path", { d: "M12 16h4", key: "n85exb" }],
  ["path", { d: "M8 11h.01", key: "1dfujw" }],
  ["path", { d: "M8 16h.01", key: "18s6g9" }]
];
const ClipboardList = createLucideIcon("clipboard-list", __iconNode);
const TIME_FILTERS = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "all", label: "All" }
];
const EVENT_TYPE_META = {
  [AuditEventType.userRegistered]: {
    label: "User Registered",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/30"
  },
  [AuditEventType.messageSent]: {
    label: "Message Sent",
    className: "bg-green-500/10 text-green-700 border-green-500/30"
  },
  [AuditEventType.callInitiated]: {
    label: "Call Initiated",
    className: "bg-purple-500/10 text-purple-700 border-purple-500/30"
  },
  [AuditEventType.memberAdded]: {
    label: "Member Added",
    className: "bg-teal-500/10 text-teal-700 border-teal-500/30"
  },
  [AuditEventType.memberRemoved]: {
    label: "Member Removed",
    className: "bg-orange-500/10 text-orange-700 border-orange-500/30"
  },
  [AuditEventType.memberRoleChanged]: {
    label: "Role Changed",
    className: "bg-teal-500/10 text-teal-700 border-teal-500/30"
  },
  [AuditEventType.memberSuspended]: {
    label: "Member Suspended",
    className: "bg-orange-500/10 text-orange-700 border-orange-500/30"
  },
  [AuditEventType.orgCreated]: {
    label: "Org Created",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/30"
  },
  [AuditEventType.adminAction]: {
    label: "Admin Action",
    className: "bg-red-500/10 text-red-700 border-red-500/30"
  },
  [AuditEventType.userRemoved]: {
    label: "User Removed",
    className: "bg-orange-500/10 text-orange-700 border-orange-500/30"
  },
  [AuditEventType.retentionEnabled]: {
    label: "Retention On",
    className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
  },
  [AuditEventType.retentionDisabled]: {
    label: "Retention Off",
    className: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
  },
  [AuditEventType.escrowEnrolled]: {
    label: "Escrow Enrolled",
    className: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30"
  },
  [AuditEventType.escrowRevoked]: {
    label: "Escrow Revoked",
    className: "bg-rose-500/10 text-rose-700 border-rose-500/30"
  },
  [AuditEventType.escrowAccessGranted]: {
    label: "Escrow Access",
    className: "bg-rose-500/10 text-rose-700 border-rose-500/30"
  },
  [AuditEventType.auditLogExported]: {
    label: "Log Exported",
    className: "bg-slate-500/10 text-slate-700 border-slate-500/30"
  },
  [AuditEventType.messageQueueDrained]: {
    label: "Queue Drained",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30"
  },
  [AuditEventType.priorityMessageSent]: {
    label: "Priority Sent",
    className: "bg-orange-500/10 text-orange-700 border-orange-500/30"
  },
  [AuditEventType.sovereignConfigUpdated]: {
    label: "Sovereign Updated",
    className: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30"
  },
  [AuditEventType.compartmentAssigned]: {
    label: "Compartment Assigned",
    className: "bg-violet-500/10 text-violet-700 border-violet-500/30"
  },
  [AuditEventType.userInvited]: {
    label: "User Invited",
    className: "bg-sky-500/10 text-sky-700 border-sky-500/30"
  },
  [AuditEventType.orgDeleted]: {
    label: "Org Deleted",
    className: "bg-red-500/10 text-red-700 border-red-500/30"
  },
  [AuditEventType.memberReactivated]: {
    label: "Member Reactivated",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
  },
  [AuditEventType.orgSuspended]: {
    label: "Org Suspended",
    className: "bg-orange-500/10 text-orange-700 border-orange-500/30"
  },
  [AuditEventType.groupMemberRemoved]: {
    label: "Group Member Removed",
    className: "bg-rose-500/10 text-rose-700 border-rose-500/30"
  },
  [AuditEventType.orgUpdated]: {
    label: "Org Updated",
    className: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30"
  },
  [AuditEventType.keyRecoveryInitiated]: {
    label: "Recovery Initiated",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30"
  },
  [AuditEventType.keyRecoveryApproved]: {
    label: "Recovery Approved",
    className: "bg-green-500/10 text-green-700 border-green-500/30"
  },
  [AuditEventType.keyRecoveryRejected]: {
    label: "Recovery Rejected",
    className: "bg-neutral-500/10 text-neutral-600 border-neutral-500/30"
  },
  [AuditEventType.policyReportExported]: {
    label: "Report Exported",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/30"
  },
  [AuditEventType.policyExpiryCheckPerformed]: {
    label: "Expiry Check",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30"
  },
  [AuditEventType.legalHoldPlaced]: {
    label: "Legal Hold Placed",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30"
  },
  [AuditEventType.legalHoldRemoved]: {
    label: "Legal Hold Removed",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30"
  },
  [AuditEventType.retentionPolicyCreated]: {
    label: "Retention Policy Created",
    className: "bg-teal-500/10 text-teal-700 border-teal-500/30"
  },
  [AuditEventType.retentionPolicyUpdated]: {
    label: "Retention Policy Updated",
    className: "bg-teal-500/10 text-teal-700 border-teal-500/30"
  },
  [AuditEventType.platformSettingsUpdated]: {
    label: "Platform Settings Updated",
    className: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30"
  },
  [AuditEventType.orgSettingsUpdated]: {
    label: "Org Settings Updated",
    className: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30"
  },
  [AuditEventType.keyRecoveryCompleted]: {
    label: "Key Recovery Completed",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30"
  },
  [AuditEventType.keyEscrowEnrolled]: {
    label: "Key Escrow Enrolled",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/30"
  }
};
function principalText(p) {
  if (!p) return "";
  if (typeof p.toText === "function") {
    return p.toText();
  }
  return String(p);
}
function compactPrincipal(p) {
  if (p.length <= 16) return p;
  return `${p.slice(0, 8)}...${p.slice(-6)}`;
}
function isoTimestamp(ts) {
  const ms = Number(ts / BigInt(1e6));
  return new Date(ms).toISOString();
}
function relativeTime(ts) {
  const ms = Number(ts / BigInt(1e6));
  const diffMs = Date.now() - ms;
  const diffSec = Math.floor(diffMs / 1e3);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
function filterByWindow(events, filter) {
  if (filter === "all") return events;
  const windowMs = filter === "24h" ? 24 * 60 * 60 * 1e3 : 7 * 24 * 60 * 60 * 1e3;
  const cutoff = BigInt(Date.now() - windowMs) * BigInt(1e6);
  return events.filter((e) => e.timestamp >= cutoff);
}
function countActiveUsers(events) {
  const cutoff = BigInt(Date.now() - 24 * 60 * 60 * 1e3) * BigInt(1e6);
  const recent = events.filter((e) => e.timestamp >= cutoff);
  const uniq = new Set(recent.map((e) => principalText(e.actorPrincipal)));
  return uniq.size;
}
function countMessages7d(events) {
  const cutoff = BigInt(Date.now() - 7 * 24 * 60 * 60 * 1e3) * BigInt(1e6);
  return events.filter(
    (e) => e.timestamp >= cutoff && String(e.eventType) === AuditEventType.messageSent
  ).length;
}
function SecurityStatusCard() {
  const checkTime = (/* @__PURE__ */ new Date()).toLocaleString();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "group rounded-sm border border-green-200 dark:border-green-800",
        "bg-green-50 dark:bg-green-950/30 p-5 shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-green-300 dark:hover:border-green-700"
      ),
      "data-ocid": "dashboard.stats.security_status",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-400", children: "Security Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ShieldCheck,
            {
              size: 28,
              className: "shrink-0 text-green-600 dark:text-green-400 transition-colors duration-200 group-hover:text-green-500",
              "aria-hidden": "true"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0",
              "aria-hidden": "true"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-2xl font-bold text-green-700 dark:text-green-300 leading-none tracking-wide", children: "SECURE" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-green-600/70 dark:text-green-400/70", children: "Last System Check" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] text-green-700 dark:text-green-400 tabular-nums", children: checkTime })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 inline-flex items-center gap-1 rounded-sm border border-green-300/60 dark:border-green-700/60 bg-green-100/60 dark:bg-green-900/40 px-1.5 py-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.55rem] font-semibold uppercase tracking-widest text-green-700 dark:text-green-400", children: "All Clear" }) })
      ]
    }
  );
}
function SkeletonCell({ className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-block animate-pulse rounded-sm bg-muted",
        className
      ),
      "aria-hidden": "true"
    }
  );
}
function SecurityBanner() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex items-center gap-3 rounded-sm border border-amber-300 bg-amber-50 px-5 py-3",
      role: "banner",
      "aria-label": "Security environment notice",
      "data-ocid": "dashboard.security_banner",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-4 w-4 shrink-0 text-black/70", "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-black", children: [
          "HIGH SECURITY ENVIRONMENT —",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-normal", children: "All actions are audited and immutable on the Internet Computer." })
        ] })
      ]
    }
  );
}
function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  accent,
  ...rest
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "group rounded-sm border border-border bg-card p-5 shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-px hover:border-border/80"
      ),
      ...rest,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Icon,
            {
              className: cn(
                "h-3.5 w-3.5 shrink-0 transition-colors duration-200",
                accent ?? "text-muted-foreground/50 group-hover:text-muted-foreground/70"
              ),
              "aria-hidden": "true"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 font-mono text-4xl font-bold leading-none tabular-nums text-foreground", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonCell, { className: "h-8 w-16" }) : value })
      ]
    }
  );
}
function RecentActivityTable({
  events,
  loading,
  error,
  onViewAll
}) {
  const [timeFilter, setTimeFilter] = reactExports.useState("7d");
  if (error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "rounded-sm border border-destructive/50 bg-destructive/5 px-4 py-3",
        "data-ocid": "dashboard.audit.error_state",
        role: "alert",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono text-xs text-destructive", children: [
          "ERROR — ",
          error
        ] })
      }
    );
  }
  const filtered = filterByWindow(events, timeFilter).slice(0, 10);
  const COLS = ["ACTOR", "ACTION", "TARGET", "TIMESTAMP", "IP"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "dashboard.audit.section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mb-3 flex items-center justify-between gap-2",
        "data-ocid": "dashboard.audit.filter_row",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { className: "flex gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "sr-only", children: "Time filter" }),
            TIME_FILTERS.map(({ value, label }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                "data-ocid": `dashboard.audit.filter.${value}`,
                onClick: () => setTimeFilter(value),
                className: cn(
                  "rounded-sm border px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-widest",
                  "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  timeFilter === value ? "border-foreground/40 bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                ),
                children: label
              },
              value
            ))
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: onViewAll,
              "data-ocid": "dashboard.audit.view_all_button",
              className: "font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-150",
              children: "View all →"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", "data-ocid": "dashboard.audit.table", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full min-w-[600px] border-collapse text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border", children: COLS.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "th",
        {
          className: "py-3 pr-4 text-left font-mono text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground last:pr-0",
          children: h
        },
        h
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? ["sk1", "sk2", "sk3", "sk4", "sk5"].map((sid, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "tr",
        {
          className: cn(
            "border-b border-border/50",
            i % 2 === 0 ? "bg-muted/15" : "bg-transparent"
          ),
          children: ["sc0", "sc1", "sc2", "sc3", "sc4"].map(
            (sid2, ci) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-2.5 pr-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              SkeletonCell,
              {
                className: `h-3 ${["w-28", "w-24", "w-20", "w-16", "w-8"][ci]}`
              }
            ) }, sid2)
          )
        },
        sid
      )) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "td",
        {
          colSpan: 5,
          className: "py-10 text-center font-mono text-xs text-muted-foreground",
          "data-ocid": "dashboard.audit.empty_state",
          children: "No recent activity to display."
        }
      ) }) : filtered.map((ev, i) => {
        const actor = principalText(ev.actorPrincipal);
        const target = ev.targetPrincipal ? principalText(ev.targetPrincipal) : ev.orgId ? String(ev.orgId) : null;
        const meta = EVENT_TYPE_META[String(ev.eventType)] ?? EVENT_TYPE_META[AuditEventType.adminAction];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            "data-ocid": `dashboard.audit.item.${i + 1}`,
            className: cn(
              "border-b border-border/40 transition-colors duration-150 hover:bg-muted/40 cursor-default",
              i % 2 === 0 ? "bg-muted/15" : "bg-transparent"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 pr-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PrincipalDisplay, { principal: actor }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 pr-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: cn(
                    "inline-block rounded-sm border px-1.5 py-0.5",
                    "font-mono text-[0.6rem] font-medium uppercase tracking-wider",
                    meta.className
                  ),
                  children: meta.label
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 pr-4", children: target ? /* @__PURE__ */ jsxRuntimeExports.jsx(PrincipalDisplay, { principal: target }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.65rem] text-muted-foreground/40", children: "—" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "td",
                {
                  className: "py-3 pr-4 font-mono text-[0.65rem] tabular-nums text-muted-foreground whitespace-nowrap",
                  title: isoTimestamp(ev.timestamp),
                  children: relativeTime(ev.timestamp)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "py-3 font-mono text-[0.65rem] text-muted-foreground/40", children: "—" })
            ]
          },
          ev.id.toString()
        );
      }) })
    ] }) })
  ] });
}
function QuickActionCard({
  label,
  description,
  icon: Icon,
  onClick,
  ocid
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      "data-ocid": ocid,
      onClick,
      className: cn(
        "group flex items-center gap-3 rounded-sm border border-border bg-card p-4 text-left w-full",
        "transition-all duration-200 hover:shadow-sm hover:-translate-y-px hover:border-foreground/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-muted/40 transition-colors duration-200 group-hover:border-foreground/20 group-hover:bg-muted/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Icon,
          {
            className: "h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200",
            "aria-hidden": "true"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-foreground", children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 font-mono text-[0.6rem] text-muted-foreground/70 truncate", children: description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChevronRight,
          {
            className: "h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground",
            "aria-hidden": "true"
          }
        )
      ]
    }
  );
}
function AdminDashboardPage() {
  var _a;
  const navigate = useNavigate();
  const { principal } = useAuth();
  const setExpiryCount = usePolicyExpiryStore((s) => s.setExpiryCount);
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const { data: expiringPolicies = [] } = useCheckPolicyExpiry();
  const { data: myOrgs } = useMyOrgs();
  const firstOrgId = (_a = myOrgs == null ? void 0 : myOrgs[0]) == null ? void 0 : _a.orgId;
  const {
    data: orgsData,
    isLoading: orgsLoading,
    error: orgsError
  } = useOrgs({ limit: BigInt(100), afterOrgId: void 0 });
  const { data: orgUsersData, isLoading: usersLoading } = useOrgUsers(
    firstOrgId ? { orgId: firstOrgId, limit: BigInt(100), afterUserId: void 0 } : null
  );
  const {
    data: auditEvents = [],
    isLoading: auditLoading,
    error: auditError
  } = useAdminAuditLog({ limit: BigInt(200), afterEventId: void 0 });
  const typedAuditEvents = auditEvents;
  const totalOrgsVal = orgsLoading ? "…" : orgsError ? "ERR" : String(Number((orgsData == null ? void 0 : orgsData.total) ?? 0));
  const totalUsersVal = orgsLoading ? "…" : orgsError ? "ERR" : isSuperAdmin ? String(
    ((orgsData == null ? void 0 : orgsData.orgs) ?? []).reduce(
      (acc, org) => acc + Number(org.memberCount ?? 0),
      0
    )
  ) : (
    // For non-SA: fall back to users in first org
    usersLoading ? "…" : String(Number((orgUsersData == null ? void 0 : orgUsersData.total) ?? 0))
  );
  const activeUsersVal = auditLoading ? "…" : String(countActiveUsers(typedAuditEvents));
  const messagesVal = auditLoading ? "…" : String(countMessages7d(typedAuditEvents));
  const principalFull = (principal == null ? void 0 : principal.toText()) ?? "";
  const principalCompact = compactPrincipal(principalFull);
  const expiryAlertCount = expiringPolicies.length;
  reactExports.useEffect(() => {
    setExpiryCount(expiryAlertCount);
  }, [expiryAlertCount, setExpiryCount]);
  const [expiryBannerDismissed, setExpiryBannerDismissed] = reactExports.useState(false);
  const topError = orgsError ? String(orgsError.message) : null;
  const auditErrorMsg = auditError ? String(auditError.message) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AdminLayout, { title: "Dashboard", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SecurityBanner, {}),
    expiryAlertCount > 0 && !expiryBannerDismissed && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mt-3 flex items-center justify-between gap-3 rounded-sm border border-amber-400/60 bg-amber-50 px-4 py-2.5",
        role: "alert",
        "data-ocid": "dashboard.policy_expiry_banner",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "svg",
              {
                className: "h-4 w-4 shrink-0 text-amber-600",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": "true",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-amber-800", children: [
              "Policy Expiry Alert:",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-normal", children: [
                expiryAlertCount,
                " retention",
                " ",
                expiryAlertCount === 1 ? "policy" : "policies",
                " expiring within 30 days. Review required in",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "a",
                  {
                    href: "/admin/retention-policies",
                    className: "underline hover:text-amber-900 transition-colors",
                    "data-ocid": "dashboard.policy_expiry_link",
                    children: "Retention Policies"
                  }
                ),
                "."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setExpiryBannerDismissed(true),
              className: "shrink-0 rounded-sm px-2 py-1 font-mono text-[0.6rem] uppercase tracking-widest text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition-colors",
              "data-ocid": "dashboard.policy_expiry_dismiss_button",
              children: "Dismiss"
            }
          )
        ]
      }
    ),
    principalFull && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mt-3 flex items-center gap-2",
        "data-ocid": "dashboard.user_info",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground", children: "Authenticated as:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              title: principalFull,
              className: "font-mono text-[0.65rem] text-foreground cursor-default select-all",
              children: principalCompact
            }
          ),
          isSuperAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-sm border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-widest text-red-700", children: "Super Admin" })
        ]
      }
    ),
    topError && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "mt-4 rounded-sm border border-destructive/50 bg-destructive/5 px-4 py-3",
        "data-ocid": "dashboard.error_state",
        role: "alert",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono text-xs font-semibold text-destructive uppercase tracking-wider", children: [
          "ERROR — ",
          topError
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 space-y-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-labelledby": "stats-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            id: "stats-heading",
            className: "mb-3 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
            children: "System Overview"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5",
            "data-ocid": "dashboard.stats.section",
            children: [
              isSuperAdmin ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                StatCard,
                {
                  label: "Total Organizations",
                  value: totalOrgsVal,
                  icon: Building2,
                  loading: orgsLoading,
                  accent: "text-blue-600/70",
                  "data-ocid": "dashboard.stats.total_orgs"
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                StatCard,
                {
                  label: "My Organizations",
                  value: String(
                    (myOrgs == null ? void 0 : myOrgs.length) ?? 0
                  ),
                  icon: Building2,
                  accent: "text-blue-600/70",
                  "data-ocid": "dashboard.stats.my_orgs"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                StatCard,
                {
                  label: "Total Users",
                  value: totalUsersVal,
                  icon: Users,
                  loading: orgsLoading || !!firstOrgId && usersLoading,
                  accent: "text-indigo-600/70",
                  "data-ocid": "dashboard.stats.total_users"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                StatCard,
                {
                  label: "Active (24h)",
                  value: activeUsersVal,
                  icon: UserCheck,
                  loading: auditLoading,
                  accent: "text-teal-600/70",
                  "data-ocid": "dashboard.stats.active_users"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                StatCard,
                {
                  label: "Messages (7d)",
                  value: messagesVal,
                  icon: MessageSquare,
                  loading: auditLoading,
                  accent: "text-violet-600/70",
                  "data-ocid": "dashboard.stats.messages_7d"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SecurityStatusCard, {})
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-labelledby": "activity-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            id: "activity-heading",
            className: "mb-3 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
            children: "Recent Activity"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-sm border border-border bg-card px-4 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          RecentActivityTable,
          {
            events: typedAuditEvents,
            loading: auditLoading,
            error: auditErrorMsg,
            onViewAll: () => navigate({ to: "/admin/audit-logs" })
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-labelledby": "actions-heading", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            id: "actions-heading",
            className: "mb-3 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
            children: "Quick Actions"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
            "data-ocid": "dashboard.quick_actions.section",
            children: [
              isSuperAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
                QuickActionCard,
                {
                  label: "Create Organization",
                  description: "Provision a new tenant or agency org",
                  icon: Building2,
                  ocid: "dashboard.create_org_button",
                  onClick: () => navigate({ to: "/admin/organizations" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                QuickActionCard,
                {
                  label: "Invite User",
                  description: "Add a user to an organization by principal",
                  icon: UserPlus,
                  ocid: "dashboard.invite_user_button",
                  onClick: () => navigate({ to: "/admin/users" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                QuickActionCard,
                {
                  label: "View Full Audit Logs",
                  description: "Browse immutable records of all admin actions",
                  icon: ClipboardList,
                  ocid: "dashboard.view_audit_logs_button",
                  onClick: () => navigate({ to: "/admin/audit-logs" })
                }
              ),
              isSuperAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
                QuickActionCard,
                {
                  label: "System Settings",
                  description: "Platform-wide configuration and controls",
                  icon: Settings,
                  ocid: "dashboard.system_settings_button",
                  onClick: () => navigate({ to: "/admin/settings" })
                }
              )
            ]
          }
        )
      ] })
    ] })
  ] });
}
export {
  AdminDashboardPage as default
};
