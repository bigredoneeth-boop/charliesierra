import { e as createLucideIcon, r as reactExports, _ as useIsSuperAdmin, $ as useMyRole, j as jsxRuntimeExports, a0 as Shield, a as Skeleton, B as Button, a1 as useOrgDetails, a2 as useOrgUsers, a3 as useSuspendOrg, a4 as useDeleteOrg, a5 as ArrowLeft, a6 as Trash2, a7 as useOrgs, S as Search, a8 as X, a9 as RefreshCw, aa as ChevronDown, k as useAuth, ab as useCreateOrg, ac as Dialog, ad as DialogContent, ae as DialogHeader, af as DialogTitle, ag as DialogDescription, v as Label, I as Input, Y as Textarea, ah as DialogFooter, f as cn, ai as useUpdateOrg, d as ue, g as Check, h as Copy } from "./index-DwKKOR6D.js";
import { A as AdminLayout, B as Building2 } from "./AdminLayout-D2txHq0E.js";
import { A as AdminStatusBadge } from "./AdminStatusBadge-oofOTbmC.js";
import { C as ConfirmDialog } from "./ConfirmDialog-Gv0d7_1q.js";
import { P as PrincipalDisplay } from "./PrincipalDisplay-rQvDPiaT.js";
import { P as Pencil } from "./pencil-7uTvXtDc.js";
import { S as ShieldAlert } from "./shield-alert-DrkZJ_V_.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
];
const Plus = createLucideIcon("plus", __iconNode);
function fmtDate(ts) {
  return new Date(Number(ts / 1000000n)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function truncate(str, max = 16) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
function orgStatusToBadge(status) {
  if (status === "Active") return "active";
  if (status === "Suspended") return "suspended";
  return "archived";
}
function fmtRole(role) {
  const map = {
    SuperAdmin: "Super Admin",
    OrgAdmin: "Org Admin",
    Auditor: "Auditor",
    StandardUser: "Standard User"
  };
  return map[role] ?? String(role);
}
function roleKey(role) {
  return role;
}
const ROLE_BADGE_CLASSES = {
  SuperAdmin: "bg-purple-100 text-purple-800 border border-purple-300",
  OrgAdmin: "bg-blue-100 text-blue-800 border border-blue-300",
  Auditor: "bg-amber-100 text-amber-800 border border-amber-300",
  StandardUser: "bg-gray-100 text-gray-600 border border-gray-300"
};
function RoleBadge({ role }) {
  const key = roleKey(role);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn(
        "inline-flex items-center rounded px-2 py-0.5",
        "font-mono text-[0.62rem] font-semibold tracking-wider uppercase select-none whitespace-nowrap",
        ROLE_BADGE_CLASSES[key]
      ),
      children: fmtRole(role)
    }
  );
}
function useCopyText() {
  const [copied, setCopied] = reactExports.useState(false);
  const timerRef = reactExports.useRef(null);
  const copy = reactExports.useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    });
  }, []);
  return { copy, copied };
}
function IdCell({ id }) {
  const short = id.length > 12 ? `${id.slice(0, 8)}…` : id;
  const { copy, copied } = useCopyText();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "group inline-flex items-center gap-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs text-muted-foreground", title: id, children: short }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        "aria-label": "Copy ID",
        onClick: () => copy(id),
        className: "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground",
        children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-3 w-3 text-green-600" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3 w-3" })
      }
    )
  ] });
}
const PAGE_SIZE = BigInt(25);
function TableSkeletonRows() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3.5 w-36" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3.5 w-24" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-16 rounded" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3.5 w-12" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3.5 w-20" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3.5 w-20" }) })
  ] }, `skeleton-${i}`)) });
}
function CreateOrgModal({ open, onClose }) {
  const { principal } = useAuth();
  const [name, setName] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const [nameError, setNameError] = reactExports.useState("");
  const createOrg = useCreateOrg();
  function handleClose() {
    setName("");
    setDescription("");
    setNameError("");
    createOrg.reset();
    onClose();
  }
  function validate() {
    if (!name.trim()) {
      setNameError("Organization name is required.");
      return false;
    }
    setNameError("");
    return true;
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const desc = description.trim();
    createOrg.mutate(
      { name: name.trim(), description: desc },
      {
        onSuccess: () => {
          ue.success("Organization created successfully.");
          handleClose();
        },
        onError: (err) => {
          ue.error(
            err instanceof Error ? err.message : "Failed to create organization."
          );
        }
      }
    );
  }
  const principalText = (principal == null ? void 0 : principal.toText()) ?? "";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (o) => !o && handleClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      className: "max-w-md bg-card border border-border shadow-lg",
      "data-ocid": "admin.create_org.dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "font-mono text-xs font-bold tracking-widest text-foreground uppercase", children: "New Organization" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "font-mono text-[0.65rem] text-muted-foreground", children: "Creates a new isolated multi-tenant container." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", noValidate: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Label,
              {
                htmlFor: "org-name",
                className: "font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground",
                children: [
                  "Name ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                id: "org-name",
                "data-ocid": "admin.create_org.name_input",
                value: name,
                onChange: (e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                },
                maxLength: 100,
                placeholder: "e.g. Department of Defense",
                "aria-invalid": !!nameError,
                "aria-describedby": nameError ? "org-name-error" : void 0,
                className: "font-mono text-sm h-9 rounded-sm bg-background",
                autoFocus: true
              }
            ),
            nameError && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                id: "org-name-error",
                "data-ocid": "admin.create_org.name_field_error",
                className: "font-mono text-[0.65rem] text-destructive",
                role: "alert",
                children: nameError
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Label,
              {
                htmlFor: "org-desc",
                className: "font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground",
                children: [
                  "Description",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 normal-case text-muted-foreground/60", children: "(optional)" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Textarea,
              {
                id: "org-desc",
                "data-ocid": "admin.create_org.description_textarea",
                value: description,
                onChange: (e) => setDescription(e.target.value),
                maxLength: 500,
                placeholder: "Short description of this organization's purpose.",
                className: "font-mono text-sm rounded-sm resize-none bg-background",
                rows: 3
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground", children: "Initial Admin" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                readOnly: true,
                value: principalText,
                className: "font-mono text-xs h-9 rounded-sm bg-muted text-muted-foreground cursor-not-allowed"
              }
            )
          ] }),
          createOrg.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              "data-ocid": "admin.create_org.error_state",
              className: "font-mono text-[0.65rem] text-destructive",
              role: "alert",
              children: createOrg.error instanceof Error ? createOrg.error.message : "An unexpected error occurred."
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2 pt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                "data-ocid": "admin.create_org.cancel_button",
                variant: "outline",
                size: "sm",
                onClick: handleClose,
                disabled: createOrg.isPending,
                className: "font-mono text-xs tracking-wider uppercase rounded-sm h-8",
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "submit",
                "data-ocid": "admin.create_org.submit_button",
                size: "sm",
                disabled: createOrg.isPending,
                className: "font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-green-700 hover:bg-green-800 text-white",
                children: createOrg.isPending ? "Creating…" : "Create Organization"
              }
            )
          ] })
        ] })
      ]
    }
  ) });
}
function EditOrgModal({ org, open, onClose }) {
  const [name, setName] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const updateOrg = useUpdateOrg();
  reactExports.useEffect(() => {
    if (org) {
      setName(org.name);
      setDescription(org.description ?? "");
    }
  }, [org]);
  function handleClose() {
    updateOrg.reset();
    onClose();
  }
  async function handleSubmit(e) {
    e.preventDefault();
    if (!org || !name.trim()) return;
    updateOrg.mutate(
      {
        orgId: org.id,
        name: name.trim(),
        description: description.trim() || null
      },
      {
        onSuccess: () => {
          ue.success("Organization updated successfully.");
          handleClose();
        },
        onError: (err) => {
          ue.error(
            err instanceof Error ? err.message : "Failed to update organization."
          );
        }
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange: (o) => !o && handleClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DialogContent,
    {
      className: "max-w-md bg-card border border-border shadow-lg",
      "data-ocid": "admin.edit_org.dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { className: "font-mono text-xs font-bold tracking-widest text-foreground uppercase", children: "Edit Organization" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", noValidate: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Label,
              {
                htmlFor: "edit-org-name",
                className: "font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground",
                children: [
                  "Name ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                id: "edit-org-name",
                "data-ocid": "admin.edit_org.name_input",
                value: name,
                onChange: (e) => setName(e.target.value),
                maxLength: 100,
                className: "font-mono text-sm h-9 rounded-sm bg-background",
                autoFocus: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Label,
              {
                htmlFor: "edit-org-desc",
                className: "font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground",
                children: "Description"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Textarea,
              {
                id: "edit-org-desc",
                "data-ocid": "admin.edit_org.description_textarea",
                value: description,
                onChange: (e) => setDescription(e.target.value),
                maxLength: 500,
                className: "font-mono text-sm rounded-sm resize-none bg-background",
                rows: 3
              }
            )
          ] }),
          updateOrg.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              "data-ocid": "admin.edit_org.error_state",
              className: "font-mono text-[0.65rem] text-destructive",
              role: "alert",
              children: updateOrg.error instanceof Error ? updateOrg.error.message : "An unexpected error occurred."
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "gap-2 pt-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                "data-ocid": "admin.edit_org.cancel_button",
                variant: "outline",
                size: "sm",
                onClick: handleClose,
                disabled: updateOrg.isPending,
                className: "font-mono text-xs tracking-wider uppercase rounded-sm h-8",
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "submit",
                "data-ocid": "admin.edit_org.submit_button",
                size: "sm",
                disabled: updateOrg.isPending,
                className: "font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-amber-600 hover:bg-amber-700 text-white",
                children: updateOrg.isPending ? "Saving…" : "Save Changes"
              }
            )
          ] })
        ] })
      ]
    }
  ) });
}
function OrgDetailView({ orgId, onBack, canAdmin }) {
  var _a, _b;
  const {
    data: org,
    isLoading: orgLoading,
    isError: orgError
  } = useOrgDetails(orgId);
  const { data: usersData, isLoading: usersLoading } = useOrgUsers({
    orgId,
    limit: BigInt(100),
    afterUserId: void 0
  });
  const [showEdit, setShowEdit] = reactExports.useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = reactExports.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = reactExports.useState(false);
  const suspendOrg = useSuspendOrg();
  const deleteOrg = useDeleteOrg();
  async function handleSuspendConfirm() {
    if (!org) return;
    try {
      await suspendOrg.mutateAsync(org.id);
      ue.success(`Organization "${org.name}" suspended.`);
      setSuspendDialogOpen(false);
    } catch (err) {
      ue.error(`Failed to suspend organization: ${String(err)}`);
    }
  }
  async function handleDeleteConfirm() {
    if (!org) return;
    try {
      await deleteOrg.mutateAsync(org.id);
      ue.success(`Organization "${org.name}" removed.`);
      setDeleteDialogOpen(false);
      onBack();
    } catch (err) {
      ue.error(`Failed to remove organization: ${String(err)}`);
    }
  }
  if (orgLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.org_detail.loading_state", className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-48" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-32" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-24" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-40" })
    ] });
  }
  if (orgError || !org) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.org_detail.error_state", className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onBack,
          className: "flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3.5 w-3.5" }),
            "Back to list"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-sm text-destructive", children: "Failed to load organization details." })
    ] });
  }
  const members = (usersData == null ? void 0 : usersData.members) ?? [];
  const createdByText = ((_b = (_a = org.createdBy) == null ? void 0 : _a.toText) == null ? void 0 : _b.call(_a)) ?? String(org.createdBy);
  const isSuspended = org.status === "Suspended";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.org_detail.panel", className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        "data-ocid": "admin.org_detail.back_link",
        onClick: onBack,
        className: "flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
          "Back to organizations"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-sm border border-border bg-card p-5 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Building2,
              {
                className: "h-4 w-4 shrink-0 text-muted-foreground",
                "aria-hidden": "true"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-mono text-sm font-bold tracking-wide text-foreground truncate", children: org.name })
          ] }),
          org.description ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground pl-6 break-words", children: org.description }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground/50 pl-6 italic", children: "No description" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AdminStatusBadge, { status: orgStatusToBadge(org.status) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { className: "grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-4", children: [
        ["Organization ID", org.id],
        ["Members", String(org.memberCount)],
        ["Created", fmtDate(org.createdAt)],
        ["Created By", createdByText]
      ].map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "font-mono text-[0.6rem] tracking-widest uppercase text-muted-foreground", children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "dd",
          {
            className: "mt-0.5 font-mono text-xs text-foreground truncate",
            title: value,
            children: label === "Organization ID" || label === "Created By" ? truncate(value, 20) : value
          }
        )
      ] }, label)) })
    ] }),
    canAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          "data-ocid": "admin.org_detail.edit_button",
          size: "sm",
          variant: "outline",
          onClick: () => setShowEdit(true),
          className: "font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-8 gap-1.5 border-amber-600/40 text-amber-700 hover:bg-amber-50 hover:text-amber-800",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3.5 w-3.5" }),
            "Edit"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          "data-ocid": "admin.org_detail.suspend_button",
          size: "sm",
          variant: "outline",
          onClick: () => setSuspendDialogOpen(true),
          disabled: isSuspended,
          className: "font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-8 gap-1.5 border-amber-600/40 text-amber-700 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-40",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "h-3.5 w-3.5" }),
            "Suspend"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          "data-ocid": "admin.org_detail.delete_button",
          size: "sm",
          variant: "outline",
          onClick: () => setDeleteDialogOpen(true),
          className: "font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-8 gap-1.5 border-red-600/40 text-red-700 hover:bg-red-50 hover:text-red-800",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }),
            "Remove"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-mono text-[0.65rem] font-bold tracking-widest uppercase text-muted-foreground", children: "Members" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[0.6rem] text-muted-foreground/60", children: [
          "(",
          members.length,
          ")"
        ] })
      ] }),
      usersLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          "data-ocid": "admin.org_detail.members.loading_state",
          className: "space-y-2",
          children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full" }, i))
        }
      ) : members.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          "data-ocid": "admin.org_detail.members.empty_state",
          className: "rounded-sm border border-border bg-card px-4 py-6 text-center",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground", children: "No members found." })
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          "data-ocid": "admin.org_detail.members.list",
          className: "rounded-sm border border-border overflow-hidden",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-left", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border bg-muted/40", children: ["Principal", "Role", "Status", "Joined"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "th",
              {
                className: "px-4 py-2 font-mono text-[0.6rem] font-semibold tracking-widest uppercase text-muted-foreground",
                children: h
              },
              h
            )) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: members.map((m, idx) => {
              var _a2, _b2;
              const uid = ((_b2 = (_a2 = m.userId) == null ? void 0 : _a2.toText) == null ? void 0 : _b2.call(_a2)) ?? String(m.userId);
              const status = m.status === "Active" ? "active" : m.status === "Suspended" ? "suspended" : "pending";
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "tr",
                {
                  "data-ocid": `admin.org_detail.members.item.${idx + 1}`,
                  className: "border-b border-border last:border-0 hover:bg-muted/20 transition-colors",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PrincipalDisplay, { principal: uid }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleBadge, { role: m.role }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AdminStatusBadge, { status }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs text-muted-foreground", children: fmtDate(m.joinedAt) }) })
                  ]
                },
                uid
              );
            }) })
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      EditOrgModal,
      {
        org,
        open: showEdit,
        onClose: () => setShowEdit(false)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: suspendDialogOpen,
        onConfirm: handleSuspendConfirm,
        onCancel: () => setSuspendDialogOpen(false),
        title: "Suspend Organization",
        description: "This organization and all associated users will be suspended and unable to access the system. This action is audited.",
        confirmLabel: "Suspend",
        destructive: true
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: deleteDialogOpen,
        onConfirm: handleDeleteConfirm,
        onCancel: () => setDeleteDialogOpen(false),
        title: "Remove Organization",
        description: "This will permanently remove the organization and all associated data. This action cannot be undone and is permanently audited.",
        confirmLabel: "Remove",
        destructive: true
      }
    )
  ] });
}
function OrgListView({
  onViewDetails,
  isSuperAdmin
}) {
  const [searchRaw, setSearchRaw] = reactExports.useState("");
  const [searchDebounced, setSearchDebounced] = reactExports.useState("");
  const debounceRef = reactExports.useRef(null);
  function handleSearchChange(val) {
    setSearchRaw(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(val.trim().toLowerCase());
    }, 300);
  }
  const [accumulated, setAccumulated] = reactExports.useState([]);
  const [cursor, setCursor] = reactExports.useState(null);
  reactExports.useEffect(() => {
    setAccumulated([]);
    setCursor(null);
  }, [searchDebounced]);
  const currentRequest = reactExports.useMemo(() => {
    return {
      limit: PAGE_SIZE,
      afterOrgId: cursor ?? void 0,
      search: searchDebounced || void 0
    };
  }, [cursor, searchDebounced]);
  const {
    data: pageData,
    isLoading: pageLoading,
    isError: pageError,
    refetch
  } = useOrgs(currentRequest);
  reactExports.useEffect(() => {
    if (!(pageData == null ? void 0 : pageData.orgs)) return;
    if (cursor === null) {
      setAccumulated(pageData.orgs);
    } else {
      setAccumulated((prev) => [
        ...prev,
        ...pageData.orgs.filter(
          (o) => !prev.some((p) => String(p.id) === String(o.id))
        )
      ]);
    }
  }, [pageData, cursor]);
  const hasMore = pageData ? accumulated.length < Number(pageData.total) : false;
  function handleLoadMore() {
    if (!(pageData == null ? void 0 : pageData.orgs.length)) return;
    const last = pageData.orgs[pageData.orgs.length - 1];
    setCursor(String(last.id));
  }
  const isFirstLoad = pageLoading && accumulated.length === 0;
  const isLoadingMore = pageLoading && accumulated.length > 0;
  const TABLE_HEADERS = [
    "Name",
    "ID",
    "Status",
    "Members",
    "Created",
    "Actions"
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          "data-ocid": "admin.organizations.search_input",
          placeholder: "Search by organization name…",
          value: searchRaw,
          onChange: (e) => handleSearchChange(e.target.value),
          className: "w-full pl-8 pr-8 py-1.5 text-xs font-mono border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        }
      ),
      searchRaw && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "aria-label": "Clear search",
          onClick: () => handleSearchChange(""),
          className: "absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" })
        }
      )
    ] }) }),
    pageError && !isFirstLoad && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "admin.organizations.error_state",
        className: "rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-destructive", children: "Failed to load organizations. Please try again." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              type: "button",
              size: "sm",
              variant: "outline",
              onClick: () => refetch(),
              className: "mt-2 border-border text-foreground gap-1.5",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-3.5 w-3.5" }),
                "Retry"
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-sm border border-border overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-left", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border bg-muted/40", children: TABLE_HEADERS.map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "th",
        {
          className: "px-4 py-3 font-mono text-[0.6rem] font-semibold tracking-widest uppercase text-muted-foreground whitespace-nowrap",
          children: h
        },
        h
      )) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: isFirstLoad ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeletonRows, {}) : accumulated.length === 0 && !pageLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, className: "px-4 py-10 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.organizations.empty_state", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Building2,
          {
            className: "mx-auto mb-2 h-8 w-8 text-muted-foreground/30",
            "aria-hidden": "true"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground", children: searchDebounced ? `No organizations match "${searchDebounced}"` : "No organizations have been created yet. Create one to get started." }),
        isSuperAdmin && !searchDebounced && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 font-mono text-[0.65rem] text-muted-foreground/60", children: "Use “New Organization” to create the first one." })
      ] }) }) }) : accumulated.map((org, idx) => {
        const orgIdText = String(org.id);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            "data-ocid": `admin.organizations.item.${idx + 1}`,
            className: "border-b border-border last:border-0 hover:bg-muted/20 transition-colors",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "text-left font-mono text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm",
                  onClick: () => onViewDetails(org.id),
                  children: org.name
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IdCell, { id: orgIdText }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AdminStatusBadge, { status: orgStatusToBadge(org.status) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs text-foreground tabular-nums", children: String(org.memberCount) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs text-muted-foreground whitespace-nowrap", children: fmtDate(org.createdAt) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "button",
                  "data-ocid": `admin.organizations.view_button.${idx + 1}`,
                  variant: "outline",
                  size: "sm",
                  onClick: (e) => {
                    e.stopPropagation();
                    onViewDetails(org.id);
                  },
                  className: "font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-7 px-2.5",
                  children: "View Details"
                }
              ) })
            ]
          },
          orgIdText
        );
      }) })
    ] }) }),
    accumulated.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-2.5 border-t border-border bg-muted/40 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono text-[0.6rem] text-muted-foreground uppercase tracking-wider", children: [
        accumulated.length,
        " organization",
        accumulated.length !== 1 ? "s" : "",
        " shown"
      ] }),
      hasMore && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          type: "button",
          size: "sm",
          variant: "outline",
          "data-ocid": "admin.organizations.load_more_button",
          onClick: handleLoadMore,
          disabled: isLoadingMore,
          className: "border-border text-muted-foreground font-mono text-xs h-7 gap-1.5",
          children: [
            isLoadingMore ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" }),
            isLoadingMore ? "Loading…" : "Load More"
          ]
        }
      )
    ] })
  ] });
}
function AdminOrganizationsPage() {
  const [selectedOrgId, setSelectedOrgId] = reactExports.useState(null);
  const [createModalOpen, setCreateModalOpen] = reactExports.useState(false);
  const { data: isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin();
  const { data: myRole, isLoading: roleLoading } = useMyRole(selectedOrgId);
  const rKeyStr = myRole ? roleKey(myRole) : null;
  const canAdmin = isSuperAdmin === true || rKeyStr === "OrgAdmin" || rKeyStr === "SuperAdmin";
  const isCheckingAccess = superAdminLoading || (selectedOrgId ? roleLoading : false);
  const headerAction = isSuperAdmin ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Button,
    {
      type: "button",
      "data-ocid": "admin.organizations.new_org_button",
      size: "sm",
      onClick: () => setCreateModalOpen(true),
      className: "font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-8 gap-1.5 bg-green-700 hover:bg-green-800 text-white",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5", "aria-hidden": "true" }),
        "New Organization"
      ]
    }
  ) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AdminLayout,
    {
      title: "Organizations",
      action: !selectedOrgId ? headerAction : void 0,
      children: [
        !selectedOrgId && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground mb-3", children: "Manage multi-tenant organizations and their members" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Shield,
              {
                className: "h-4 w-4 shrink-0 text-black mt-0.5",
                "aria-hidden": "true"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-black leading-relaxed", children: "All organization management actions are audited and immutable." })
          ] })
        ] }),
        isCheckingAccess ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            "data-ocid": "admin.organizations.loading_state",
            className: "space-y-3",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full" }, "org-loading-1"),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full" }, "org-loading-2"),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full" }, "org-loading-3")
            ]
          }
        ) : selectedOrgId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          OrgDetailView,
          {
            orgId: selectedOrgId,
            onBack: () => setSelectedOrgId(null),
            canAdmin
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          OrgListView,
          {
            onViewDetails: (id) => setSelectedOrgId(id),
            isSuperAdmin: !!isSuperAdmin
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          CreateOrgModal,
          {
            open: createModalOpen,
            onClose: () => setCreateModalOpen(false)
          }
        )
      ]
    }
  );
}
export {
  AdminOrganizationsPage as default
};
