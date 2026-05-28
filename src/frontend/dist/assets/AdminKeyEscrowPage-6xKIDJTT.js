import { e as createLucideIcon, r as reactExports, aJ as useEscrowStats, aK as useEscrowedUsers, aL as useRecoveryRequests, aM as RecoveryRequestStatus, j as jsxRuntimeExports, an as TriangleAlert, U as Users, a as Skeleton, q as Shield, I as Input, aN as Key, B as Button, w as Copy, aO as EscrowStatus, c as Badge, aP as useEscrowGrants, aQ as useInitiateKeyRecovery, F as Dialog, G as DialogContent, H as DialogHeader, J as DialogTitle, K as DialogDescription, N as Label, O as Textarea, P as DialogFooter, aR as useApproveKeyRecovery, aS as useRejectKeyRecovery, d as ue } from "./index-D8Qg-lkp.js";
import { A as AdminLayout } from "./AdminLayout-xwrGurkx.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
];
const CircleCheckBig = createLucideIcon("circle-check-big", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
];
const CircleX = createLucideIcon("circle-x", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
];
const Clock = createLucideIcon("clock", __iconNode);
function formatPrincipal(p) {
  if (p.length <= 16) return p;
  return `${p.slice(0, 8)}...${p.slice(-4)}`;
}
function formatNanoTs(ns) {
  if (ns == null) return "—";
  const ms = Number(ns / 1000000n);
  return new Date(ms).toLocaleString(void 0, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    ue.success("Copied to clipboard", { duration: 2e3 });
  });
}
function EscrowStatusBadge({ status }) {
  const config = {
    [EscrowStatus.active]: {
      label: "Active",
      className: "border text-green-700 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800"
    },
    [EscrowStatus.pendingRecovery]: {
      label: "Pending Recovery",
      className: "border text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
    },
    [EscrowStatus.recovered]: {
      label: "Recovered",
      className: "border text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
    },
    [EscrowStatus.revoked]: {
      label: "Revoked",
      className: "border text-muted-foreground bg-muted border-border"
    }
  };
  const c = config[status] ?? config[EscrowStatus.revoked];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Badge,
    {
      variant: "outline",
      className: `text-xs font-medium whitespace-nowrap ${c.className}`,
      children: c.label
    }
  );
}
function RecoveryStatusBadge({ status }) {
  const config = {
    [RecoveryRequestStatus.pending]: {
      label: "Pending",
      className: "border text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
    },
    [RecoveryRequestStatus.approved]: {
      label: "Approved",
      className: "border text-green-700 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-400"
    },
    [RecoveryRequestStatus.rejected]: {
      label: "Rejected",
      className: "border text-muted-foreground bg-muted border-border"
    },
    [RecoveryRequestStatus.completed]: {
      label: "Completed",
      className: "border text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400"
    }
  };
  const c = config[status] ?? config[RecoveryRequestStatus.pending];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Badge,
    {
      variant: "outline",
      className: `text-xs font-medium whitespace-nowrap ${c.className}`,
      children: c.label
    }
  );
}
function PrincipalCell({ value }) {
  const text = typeof value.toText === "function" ? value.toText() : String(value);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 font-mono text-xs", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground", title: text, children: formatPrincipal(text) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => copyToClipboard(text),
        "aria-label": "Copy principal",
        className: "p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 11 })
      }
    )
  ] });
}
function EscrowGrantsSection({
  userId
}) {
  const grants = useEscrowGrants(
    userId
  );
  if (grants.isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: [1, 2].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full rounded" }, i)) });
  }
  if (!grants.data || grants.data.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        className: "text-xs text-muted-foreground italic py-2",
        "data-ocid": "escrow.grants.empty_state",
        children: "No recovery grants on record"
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "overflow-x-auto rounded border border-border",
      "data-ocid": "escrow.grants.table",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/40 border-b border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider", children: "Grant ID" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider", children: "Requested By" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider", children: "Timestamp" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider", children: "Outcome" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: grants.data.map((grant) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            className: "hover:bg-muted/20 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 font-mono text-muted-foreground", children: grant.grantId.toString() }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                PrincipalCell,
                {
                  value: grant.requestingAdmin
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2 font-mono text-muted-foreground whitespace-nowrap", children: formatNanoTs(grant.grantTimestamp) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `font-medium ${grant.accessOutcome === "granted" ? "text-green-600" : "text-muted-foreground"}`,
                  children: grant.accessOutcome
                }
              ) })
            ]
          },
          grant.grantId.toString()
        )) })
      ] })
    }
  );
}
function InitiateRecoveryDialog({ user, onClose }) {
  const [deviceId, setDeviceId] = reactExports.useState("");
  const [reason, setReason] = reactExports.useState("");
  const initiateRecovery = useInitiateKeyRecovery();
  if (!user) return null;
  const userIdText = typeof user.userId.toText === "function" ? user.userId.toText() : String(user.userId);
  async function handleSubmit() {
    if (!user) return;
    if (reason.trim().length < 10) {
      ue.error("Reason must be at least 10 characters");
      return;
    }
    try {
      await initiateRecovery.mutateAsync({
        targetUserId: user.userId,
        targetDeviceId: deviceId.trim() || "default",
        reason: reason.trim(),
        orgId: user.orgId ?? null
      });
      ue.success("Recovery request submitted — a second admin must approve");
      onClose();
    } catch (err) {
      ue.error(
        err instanceof Error ? err.message : "Failed to initiate recovery"
      );
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open: !!user,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent,
        {
          className: "sm:max-w-md",
          "data-ocid": "escrow.initiate_recovery.dialog",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 font-mono text-sm uppercase tracking-widest", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { className: "h-4 w-4 text-amber-500", "aria-hidden": "true" }),
                "Initiate Key Recovery"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-xs text-muted-foreground", children: "Submit a recovery request for the selected user. A second authorized admin must approve before access is granted." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TriangleAlert,
                {
                  className: "mt-0.5 h-4 w-4 shrink-0 text-amber-500",
                  "aria-hidden": "true"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-snug", children: "This action requires a second authorized admin to approve. All details are permanently audited." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs font-mono uppercase tracking-widest text-muted-foreground", children: "Target User" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "p",
                  {
                    className: "font-mono text-xs text-foreground break-all",
                    title: userIdText,
                    children: userIdText
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Label,
                  {
                    htmlFor: "device-id",
                    className: "text-xs font-mono uppercase tracking-widest text-muted-foreground",
                    children: "Device ID"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "device-id",
                    value: deviceId,
                    onChange: (e) => setDeviceId(e.target.value),
                    placeholder: "device-id (leave blank for default)",
                    className: "font-mono text-xs h-8",
                    "data-ocid": "escrow.initiate_recovery.device_input"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  Label,
                  {
                    htmlFor: "reason",
                    className: "text-xs font-mono uppercase tracking-widest text-muted-foreground",
                    children: [
                      "Reason ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Textarea,
                  {
                    id: "reason",
                    value: reason,
                    onChange: (e) => setReason(e.target.value),
                    placeholder: "Provide a detailed justification for this recovery request (minimum 10 characters)",
                    rows: 3,
                    className: "font-mono text-xs resize-none",
                    "data-ocid": "escrow.initiate_recovery.reason_textarea"
                  }
                ),
                reason.length > 0 && reason.trim().length < 10 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "p",
                  {
                    className: "text-xs text-destructive",
                    "data-ocid": "escrow.initiate_recovery.reason.field_error",
                    children: "Reason must be at least 10 characters"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: onClose,
                  "data-ocid": "escrow.initiate_recovery.cancel_button",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  size: "sm",
                  className: "bg-amber-600 hover:bg-amber-700 text-white border-0",
                  onClick: handleSubmit,
                  disabled: initiateRecovery.isPending || reason.trim().length < 10,
                  "data-ocid": "escrow.initiate_recovery.submit_button",
                  children: initiateRecovery.isPending ? "Submitting..." : "Submit Recovery Request"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function ApproveRecoveryDialog({ request, onClose }) {
  const approveRecovery = useApproveKeyRecovery();
  if (!request) return null;
  const targetText = typeof request.targetUserId.toText === "function" ? request.targetUserId.toText() : String(request.targetUserId);
  const initiatorText = typeof request.initiatingAdmin.toText === "function" ? request.initiatingAdmin.toText() : String(request.initiatingAdmin);
  async function handleApprove() {
    if (!request) return;
    try {
      await approveRecovery.mutateAsync(request.id);
      ue.success("Recovery approved");
      onClose();
    } catch (err) {
      ue.error(
        err instanceof Error ? err.message : "Failed to approve recovery"
      );
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open: !!request,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent,
        {
          className: "sm:max-w-md",
          "data-ocid": "escrow.approve_recovery.dialog",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 font-mono text-sm uppercase tracking-widest", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  CircleCheckBig,
                  {
                    className: "h-4 w-4 text-green-600",
                    "aria-hidden": "true"
                  }
                ),
                "Approve Key Recovery"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogDescription, { className: "text-xs text-muted-foreground", children: [
                "Request #",
                request.id.toString(),
                " — review carefully before approving."
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5 rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TriangleAlert,
                {
                  className: "mt-0.5 h-4 w-4 shrink-0 text-amber-500",
                  "aria-hidden": "true"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-snug", children: "You are authorizing key recovery. This action is permanent and immutably logged. You must be a different admin than the initiator." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Target Principal" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono mt-0.5 text-foreground break-all", children: targetText })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Initiated By" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono mt-0.5 text-foreground break-all", children: initiatorText })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Reason" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-foreground", children: request.reason })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Device" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono mt-0.5 text-foreground", children: request.targetDeviceId })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: onClose,
                  "data-ocid": "escrow.approve_recovery.cancel_button",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  size: "sm",
                  className: "bg-amber-600 hover:bg-amber-700 text-white border-0",
                  onClick: handleApprove,
                  disabled: approveRecovery.isPending,
                  "data-ocid": "escrow.approve_recovery.confirm_button",
                  children: approveRecovery.isPending ? "Approving..." : "Approve Recovery"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function RejectRecoveryDialog({ request, onClose }) {
  const rejectRecovery = useRejectKeyRecovery();
  if (!request) return null;
  const targetText = typeof request.targetUserId.toText === "function" ? request.targetUserId.toText() : String(request.targetUserId);
  async function handleReject() {
    if (!request) return;
    try {
      await rejectRecovery.mutateAsync(request.id);
      ue.success("Recovery request rejected");
      onClose();
    } catch (err) {
      ue.error(
        err instanceof Error ? err.message : "Failed to reject recovery"
      );
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open: !!request,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        DialogContent,
        {
          className: "sm:max-w-sm",
          "data-ocid": "escrow.reject_recovery.dialog",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 font-mono text-sm uppercase tracking-widest", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "h-4 w-4 text-destructive", "aria-hidden": "true" }),
                "Reject Recovery Request"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-xs text-muted-foreground", children: "Rejecting this request will permanently close it and log the action." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Target User" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono mt-0.5 text-foreground break-all", children: targetText })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono uppercase tracking-widest text-muted-foreground", children: "Reason" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-foreground", children: request.reason })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  onClick: onClose,
                  "data-ocid": "escrow.reject_recovery.cancel_button",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  variant: "outline",
                  size: "sm",
                  className: "border-destructive text-destructive hover:bg-destructive/10",
                  onClick: handleReject,
                  disabled: rejectRecovery.isPending,
                  "data-ocid": "escrow.reject_recovery.confirm_button",
                  children: rejectRecovery.isPending ? "Rejecting..." : "Reject Request"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
const STATUS_FILTERS = [
  { value: null, label: "All" },
  { value: RecoveryRequestStatus.pending, label: "Pending" },
  { value: RecoveryRequestStatus.approved, label: "Approved" },
  { value: RecoveryRequestStatus.rejected, label: "Rejected" },
  { value: RecoveryRequestStatus.completed, label: "Completed" }
];
const SKEL_IDS = ["s1", "s2", "s3", "s4", "s5"];
function TableSkeleton({ cols }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: SKEL_IDS.map((sid) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border", children: Array.from({ length: cols }).map((_, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full rounded" }) }, i)
  )) }, sid)) });
}
function AdminKeyEscrowPage() {
  const [activeTab, setActiveTab] = reactExports.useState("users");
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [selectedUser, setSelectedUser] = reactExports.useState(
    null
  );
  const [initiateDialogUser, setInitiateDialogUser] = reactExports.useState(null);
  const [approveDialogRequest, setApproveDialogRequest] = reactExports.useState(null);
  const [rejectDialogRequest, setRejectDialogRequest] = reactExports.useState(null);
  const [requestStatusFilter, setRequestStatusFilter] = reactExports.useState(null);
  const statsQuery = useEscrowStats();
  const escrowedUsersQuery = useEscrowedUsers({
    orgId: void 0,
    afterUserId: void 0,
    limit: 20n
  });
  const recoveryRequestsQuery = useRecoveryRequests(null, requestStatusFilter);
  const stats = statsQuery.data;
  const filteredUsers = (escrowedUsersQuery.data ?? []).filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const uid = typeof u.userId.toText === "function" ? u.userId.toText() : String(u.userId);
    return uid.toLowerCase().includes(q) || (u.orgId ?? "").toLowerCase().includes(q);
  });
  const pendingCount = (recoveryRequestsQuery.data ?? []).filter(
    (r) => r.status === RecoveryRequestStatus.pending
  ).length;
  const hasMoreUsers = (escrowedUsersQuery.data ?? []).length === 20;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AdminLayout, { title: "Key Escrow Management", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
          role: "alert",
          "data-ocid": "escrow.security_banner",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TriangleAlert,
              {
                className: "mt-0.5 h-5 w-5 shrink-0 text-amber-500",
                "aria-hidden": "true"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs font-semibold uppercase tracking-widest", children: "Dual Authorization Required" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs leading-relaxed", children: "All key recovery operations require dual authorization and are permanently audited. This page is access-controlled and all actions are immutably logged on the Internet Computer." })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "group rounded-sm border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px",
            "data-ocid": "escrow.stats.total_escrowed",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: "Total Escrowed Users" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Users,
                  {
                    className: "h-4 w-4 shrink-0 text-muted-foreground/50",
                    "aria-hidden": "true"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 font-mono text-4xl font-bold leading-none tabular-nums text-foreground", children: statsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-16 rounded" }) : ((stats == null ? void 0 : stats.totalEscrowed) ?? 0n).toString() })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "group rounded-sm border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px",
            "data-ocid": "escrow.stats.pending_recoveries",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: "Pending Recoveries" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Clock,
                  {
                    className: "h-4 w-4 shrink-0 text-muted-foreground/50",
                    "aria-hidden": "true"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "p",
                {
                  className: `mt-3 font-mono text-4xl font-bold leading-none tabular-nums ${((stats == null ? void 0 : stats.pendingRecoveries) ?? 0n) > 0n ? "text-amber-600" : "text-foreground"}`,
                  children: statsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-12 rounded" }) : ((stats == null ? void 0 : stats.pendingRecoveries) ?? 0n).toString()
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "group rounded-sm border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px",
            "data-ocid": "escrow.stats.last_recovery",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: "Last Recovery Event" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Shield,
                  {
                    className: "h-4 w-4 shrink-0 text-muted-foreground/50",
                    "aria-hidden": "true"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 font-mono text-sm font-semibold leading-snug text-foreground", children: statsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-32 rounded" }) : formatNanoTs(stats == null ? void 0 : stats.lastRecoveryTimestamp) })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex items-center gap-1 border-b border-border",
          role: "tablist",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": activeTab === "users",
                onClick: () => setActiveTab("users"),
                className: `px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${activeTab === "users" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`,
                "data-ocid": "escrow.users.tab",
                children: "Escrowed Users"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": activeTab === "requests",
                onClick: () => setActiveTab("requests"),
                className: `flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${activeTab === "requests" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`,
                "data-ocid": "escrow.requests.tab",
                children: [
                  "Recovery Requests",
                  pendingCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-amber-500 px-1 font-mono text-[0.6rem] font-bold text-white", children: pendingCount })
                ]
              }
            )
          ]
        }
      ),
      activeTab === "users" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-ocid": "escrow.users.panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative flex-1 max-w-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            placeholder: "Search by principal or org...",
            className: "h-8 pl-3 font-mono text-xs",
            "data-ocid": "escrow.users.search_input"
          }
        ) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "overflow-x-auto rounded-sm border border-border",
            "data-ocid": "escrow.users.table",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/40 border-b border-border sticky top-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: [
                "Principal",
                "Organization",
                "Status",
                "Last Backed Up",
                "Devices",
                "Actions"
              ].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  className: "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                  children: h
                },
                h
              )) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: escrowedUsersQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 6 }) : filteredUsers.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "td",
                {
                  colSpan: 6,
                  className: "px-4 py-12 text-center",
                  "data-ocid": "escrow.users.empty_state",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Key,
                      {
                        className: "mx-auto mb-3 h-8 w-8 text-muted-foreground/30",
                        "aria-hidden": "true"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground uppercase tracking-widest", children: searchQuery ? "No users match your search" : "No escrowed users found" })
                  ]
                }
              ) }) : filteredUsers.map((user, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "tr",
                {
                  className: "transition-colors hover:bg-muted/20",
                  "data-ocid": `escrow.users.item.${idx + 1}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PrincipalCell,
                      {
                        value: user.userId
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: user.orgId ?? "—" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EscrowStatusBadge, { status: user.escrowStatus }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap", children: formatNanoTs(user.lastBackedUp) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs text-foreground tabular-nums", children: user.deviceCount.toString() }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs px-2.5",
                          onClick: () => setSelectedUser(user),
                          "data-ocid": `escrow.users.view_details.${idx + 1}`,
                          children: "View Details"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          size: "sm",
                          className: "h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white border-0",
                          onClick: () => setInitiateDialogUser(user),
                          "data-ocid": `escrow.users.initiate_recovery.${idx + 1}`,
                          children: "Initiate Recovery"
                        }
                      )
                    ] }) })
                  ]
                },
                `${String(user.userId)}-${idx}`
              )) })
            ] })
          }
        ),
        hasMoreUsers && !escrowedUsersQuery.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            className: "font-mono text-xs uppercase tracking-widest",
            "data-ocid": "escrow.users.load_more_button",
            children: "Load More"
          }
        ) })
      ] }),
      activeTab === "requests" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", "data-ocid": "escrow.requests.panel", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "fieldset",
          {
            className: "flex flex-wrap gap-1.5",
            "aria-label": "Filter by status",
            children: STATUS_FILTERS.map(({ value, label }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setRequestStatusFilter(value),
                className: `rounded-sm border px-3 py-1 font-mono text-xs uppercase tracking-widest transition-colors ${requestStatusFilter === value ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`,
                "data-ocid": `escrow.requests.filter.${label.toLowerCase()}`,
                children: label
              },
              label
            ))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "overflow-x-auto rounded-sm border border-border",
            "data-ocid": "escrow.requests.table",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/40 border-b border-border sticky top-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: [
                "ID",
                "Target User",
                "Initiated By",
                "Reason",
                "Status",
                "Created",
                "Actions"
              ].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "th",
                {
                  className: "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                  children: h
                },
                h
              )) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { className: "divide-y divide-border", children: recoveryRequestsQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, { cols: 7 }) : (recoveryRequestsQuery.data ?? []).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "td",
                {
                  colSpan: 7,
                  className: "px-4 py-12 text-center",
                  "data-ocid": "escrow.requests.empty_state",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Shield,
                      {
                        className: "mx-auto mb-3 h-8 w-8 text-muted-foreground/30",
                        "aria-hidden": "true"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground uppercase tracking-widest", children: "No recovery requests found" })
                  ]
                }
              ) }) : (recoveryRequestsQuery.data ?? []).map((req, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "tr",
                {
                  className: "transition-colors hover:bg-muted/20",
                  "data-ocid": `escrow.requests.item.${idx + 1}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground", children: [
                      "#",
                      req.id.toString()
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PrincipalCell,
                      {
                        value: req.targetUserId
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PrincipalCell,
                      {
                        value: req.initiatingAdmin
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 max-w-[200px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: "text-xs text-muted-foreground line-clamp-2",
                        title: req.reason,
                        children: req.reason.length > 50 ? `${req.reason.slice(0, 50)}…` : req.reason
                      }
                    ) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RecoveryStatusBadge, { status: req.status }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap", children: formatNanoTs(req.createdAt) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: req.status === RecoveryRequestStatus.pending && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs px-2.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400",
                          onClick: () => setApproveDialogRequest(req),
                          "data-ocid": `escrow.requests.approve.${idx + 1}`,
                          children: "Approve"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          size: "sm",
                          className: "h-7 text-xs px-2.5 text-muted-foreground hover:border-foreground/30",
                          onClick: () => setRejectDialogRequest(req),
                          "data-ocid": `escrow.requests.reject.${idx + 1}`,
                          children: "Reject"
                        }
                      )
                    ] }) })
                  ]
                },
                req.id.toString()
              )) })
            ] })
          }
        )
      ] })
    ] }),
    selectedUser && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "fixed inset-y-0 right-0 z-50 w-96 border-l border-border bg-background shadow-xl flex flex-col",
        "data-ocid": "escrow.user_detail.panel",
        role: "complementary",
        "aria-label": "User escrow details",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border p-4 bg-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-mono text-xs font-bold uppercase tracking-widest text-foreground", children: "User Escrow Details" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground mt-0.5", children: "Read-only · All actions audited" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setSelectedUser(null),
                "aria-label": "Close panel",
                className: "rounded-sm p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                "data-ocid": "escrow.user_detail.close_button",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { size: 16, "aria-hidden": "true" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Principal" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  PrincipalCell,
                  {
                    value: selectedUser.userId
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Organization" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-foreground", children: selectedUser.orgId ?? "—" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Status" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EscrowStatusBadge, { status: selectedUser.escrowStatus }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Devices" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs font-bold text-foreground", children: selectedUser.deviceCount.toString() })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground", children: "Last Backed Up" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-foreground", children: formatNanoTs(selectedUser.lastBackedUp) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-1", children: "Recovery Grants" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                EscrowGrantsSection,
                {
                  userId: selectedUser.userId
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border p-4 bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              className: "w-full bg-amber-600 hover:bg-amber-700 text-white border-0 font-mono text-xs uppercase tracking-widest",
              onClick: () => {
                setInitiateDialogUser(selectedUser);
                setSelectedUser(null);
              },
              "data-ocid": "escrow.user_detail.initiate_recovery_button",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Key, { className: "mr-2 h-3.5 w-3.5", "aria-hidden": "true" }),
                "Initiate Recovery"
              ]
            }
          ) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      InitiateRecoveryDialog,
      {
        user: initiateDialogUser,
        onClose: () => setInitiateDialogUser(null)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ApproveRecoveryDialog,
      {
        request: approveDialogRequest,
        onClose: () => setApproveDialogRequest(null)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      RejectRecoveryDialog,
      {
        request: rejectDialogRequest,
        onClose: () => setRejectDialogRequest(null)
      }
    )
  ] });
}
export {
  AdminKeyEscrowPage as default
};
