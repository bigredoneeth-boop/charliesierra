import { f as createLucideIcon, r as reactExports, a8 as useOrgs, am as useAllGroups, an as GroupStatus, j as jsxRuntimeExports, A as AdminLayout, $ as Shield, S as Search, I as Input, a as Skeleton, T as TriangleAlert, B as Button, aa as RefreshCw, U as Users, a7 as PrincipalDisplay, e as cn, ao as useGroupMembers, ap as useRemoveMemberFromGroup, d as ue, a9 as X, aq as UserMinus } from "./index-sYvNRfuw.js";
import { A as AdminStatusBadge } from "./AdminStatusBadge-D_QdF9I0.js";
import { C as ConfirmDialog } from "./ConfirmDialog-7ykLrmRA.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]];
const ChevronLeft = createLucideIcon("chevron-left", __iconNode);
function formatTimestamp(ns) {
  const ms = Number(ns / BigInt(1e6));
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function GroupMemberPanel({ group, orgName, onClose }) {
  const {
    data: members,
    isLoading,
    isError,
    refetch
  } = useGroupMembers(group.id);
  const removeMutation = useRemoveMemberFromGroup();
  const [removeConfirmOpen, setRemoveConfirmOpen] = reactExports.useState(false);
  const [confirmMember, setConfirmMember] = reactExports.useState(
    null
  );
  const handleRequestRemove = reactExports.useCallback((member) => {
    setConfirmMember(member);
    setRemoveConfirmOpen(true);
  }, []);
  const handleRemoveConfirm = reactExports.useCallback(async () => {
    if (!confirmMember) return;
    try {
      await removeMutation.mutateAsync({
        groupId: group.id,
        memberId: confirmMember.userId
      });
      ue.success("Member removed — action logged to audit trail");
      setRemoveConfirmOpen(false);
      setConfirmMember(null);
    } catch (err) {
      ue.error(
        err instanceof Error ? err.message : "Failed to remove member"
      );
    }
  }, [removeMutation, group.id, confirmMember]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col border-l border-border bg-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-border px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "text-muted-foreground hover:text-foreground transition-colors",
            "aria-label": "Back to groups",
            "data-ocid": "groups.panel.close_button",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { className: "h-4 w-4" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs font-bold uppercase tracking-[0.12em] text-foreground", children: group.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] text-muted-foreground", children: orgName })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "text-muted-foreground hover:text-foreground transition-colors",
          "aria-label": "Close panel",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-0 border-b border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-r border-border px-4 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground", children: "Members" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-lg font-bold text-foreground", children: Number(group.memberCount) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-r border-border px-4 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground", children: "Created" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-foreground", children: formatTimestamp(group.createdAt) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground", children: "Created By" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PrincipalDisplay, { principal: group.createdBy.toText() })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto", children: [
      isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 p-4", "data-ocid": "groups.panel.loading_state", children: Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-10 w-full" }, i)
      )) }),
      isError && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex flex-col items-center justify-center gap-3 py-12",
          "data-ocid": "groups.panel.error_state",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-8 w-8 text-destructive" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Failed to load members" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => void refetch(), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "mr-2 h-3 w-3" }),
              " Retry"
            ] })
          ]
        }
      ),
      !isLoading && !isError && (!members || members.length === 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex flex-col items-center justify-center gap-2 py-12",
          "data-ocid": "groups.panel.empty_state",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-8 w-8 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground", children: "No members found" })
          ]
        }
      ),
      !isLoading && !isError && members && members.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border bg-muted/30", children: ["Principal", "Display Name", "Joined", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "th",
          {
            className: "px-4 py-2.5 text-left font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground",
            children: h
          },
          h
        )) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: members.map((member, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            className: "border-b border-border hover:bg-muted/20 transition-colors",
            "data-ocid": `groups.panel.member.item.${idx + 1}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PrincipalDisplay, { principal: member.userId.toText() }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-muted-foreground", children: member.displayName ?? "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-mono text-[0.7rem] text-muted-foreground", children: formatTimestamp(member.joinedAt) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Button,
                {
                  variant: "ghost",
                  size: "sm",
                  className: "h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive",
                  onClick: () => handleRequestRemove(member),
                  "data-ocid": `groups.panel.force_remove.${idx + 1}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(UserMinus, { className: "mr-1.5 h-3 w-3" }),
                    " Force Remove"
                  ]
                }
              ) })
            ]
          },
          `${member.userId.toText()}-${idx}`
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: removeConfirmOpen,
        onConfirm: () => {
          void handleRemoveConfirm();
        },
        onCancel: () => {
          setRemoveConfirmOpen(false);
          setConfirmMember(null);
        },
        title: "Remove Member",
        description: "This member will be immediately removed from the group. This action is audited and cannot be undone.",
        confirmLabel: "Remove",
        destructive: true
      }
    )
  ] });
}
const PAGE_SIZE = 20;
function AdminGroupsPage() {
  var _a;
  const [search, setSearch] = reactExports.useState("");
  const [filterOrgId, setFilterOrgId] = reactExports.useState("all");
  const [filterStatus, setFilterStatus] = reactExports.useState("all");
  const [page, setPage] = reactExports.useState(0);
  const [selectedGroup, setSelectedGroup] = reactExports.useState(
    null
  );
  const orgsQuery = useOrgs({ limit: BigInt(100) });
  const orgs = ((_a = orgsQuery.data) == null ? void 0 : _a.orgs) ?? [];
  const groupsReq = filterOrgId !== "all" ? { orgId: filterOrgId } : {};
  const {
    data: allGroups = [],
    isLoading,
    isError,
    refetch
  } = useAllGroups(groupsReq);
  const filtered = reactExports.useMemo(() => {
    let groups = allGroups;
    if (search.trim()) {
      const q = search.toLowerCase();
      groups = groups.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (filterOrgId !== "all") {
      groups = groups.filter((g) => g.orgId === filterOrgId);
    }
    if (filterStatus !== "all") {
      groups = groups.filter(
        (g) => filterStatus === "active" ? g.status === GroupStatus.active : g.status === GroupStatus.suspended
      );
    }
    return groups;
  }, [allGroups, search, filterOrgId, filterStatus]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const orgNameMap = reactExports.useMemo(() => {
    const m = {};
    for (const org of orgs) m[org.id] = org.name;
    return m;
  }, [orgs]);
  const getOrgName = (orgId) => orgId ? orgNameMap[orgId] ?? orgId : "—";
  const handleSearchChange = (v) => {
    setSearch(v);
    setPage(0);
  };
  const handleFilterOrg = (v) => {
    setFilterOrgId(v);
    setPage(0);
  };
  const handleFilterStatus = (v) => {
    setFilterStatus(v);
    setPage(0);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    AdminLayout,
    {
      title: "GROUP MANAGEMENT",
      action: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "h-8 font-mono text-xs",
          onClick: () => void refetch(),
          "data-ocid": "groups.refresh_button",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "mr-2 h-3 w-3" }),
            " Refresh"
          ]
        }
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full gap-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "flex flex-1 flex-col space-y-4 min-w-0",
              selectedGroup && "hidden lg:flex"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "flex items-center gap-2 border border-amber-500/30 bg-amber-50 px-4 py-2.5",
                  style: { borderLeftWidth: "3px", borderLeftColor: "#d97706" },
                  "data-ocid": "groups.audit_banner",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-3.5 w-3.5 shrink-0 text-amber-600" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.65rem] text-black", children: "All actions are audited and immutable on the Internet Computer." })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[180px]", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Input,
                    {
                      placeholder: "Search groups…",
                      value: search,
                      onChange: (e) => handleSearchChange(e.target.value),
                      className: "h-8 pl-8 font-mono text-xs",
                      "data-ocid": "groups.search_input"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    value: filterOrgId,
                    onChange: (e) => handleFilterOrg(e.target.value),
                    className: "h-8 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring",
                    "data-ocid": "groups.org_filter.select",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All Organizations" }),
                      orgs.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.id, children: o.name }, o.id))
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    value: filterStatus,
                    onChange: (e) => handleFilterStatus(
                      e.target.value
                    ),
                    className: "h-8 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring",
                    "data-ocid": "groups.status_filter.select",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All Statuses" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "active", children: "Active" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "suspended", children: "Suspended" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border bg-card overflow-x-auto", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-border bg-muted/20 px-4 py-2 flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground", children: "Groups" }),
                  !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono text-[0.6rem] text-muted-foreground", children: [
                    filtered.length,
                    " result",
                    filtered.length !== 1 ? "s" : ""
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border bg-muted/10", children: [
                    "Group Name",
                    "Organization",
                    "Members",
                    "Created Date",
                    "Created By",
                    "Status",
                    "Actions"
                  ].map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "th",
                    {
                      className: "px-4 py-2.5 text-left font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground",
                      children: col
                    },
                    col
                  )) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                    isLoading && Array.from({ length: 5 }).map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                      /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "border-b border-border", children: Array.from({ length: 7 }).map((__, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells
                        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full" }) }, j)
                      )) }, i)
                    )),
                    isError && !isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "td",
                      {
                        colSpan: 7,
                        className: "px-4 py-12 text-center",
                        "data-ocid": "groups.error_state",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-8 w-8 text-destructive" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Failed to load groups" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            Button,
                            {
                              variant: "outline",
                              size: "sm",
                              onClick: () => void refetch(),
                              children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "mr-2 h-3 w-3" }),
                                " Retry"
                              ]
                            }
                          )
                        ] })
                      }
                    ) }),
                    !isLoading && !isError && paginated.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "td",
                      {
                        colSpan: 7,
                        className: "px-4 py-12 text-center",
                        "data-ocid": "groups.empty_state",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-3", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-8 w-8 text-muted-foreground" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-xs text-muted-foreground", children: search || filterOrgId !== "all" || filterStatus !== "all" ? "No groups match your filters" : "No groups found" })
                        ] })
                      }
                    ) }),
                    !isLoading && !isError && paginated.map((group, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "tr",
                      {
                        className: "border-b border-border hover:bg-muted/20 transition-colors",
                        "data-ocid": `groups.table.item.${idx + 1}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-foreground", children: group.name }) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: getOrgName(group.orgId) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-foreground", children: Number(group.memberCount) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-mono text-[0.7rem] text-muted-foreground", children: formatTimestamp(group.createdAt) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex items-center gap-1 font-mono text-[0.7rem] text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                            PrincipalDisplay,
                            {
                              principal: group.createdBy.toText()
                            }
                          ) }) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                            AdminStatusBadge,
                            {
                              status: group.status === GroupStatus.active ? "active" : "suspended"
                            }
                          ) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            Button,
                            {
                              variant: "outline",
                              size: "sm",
                              className: "h-7 font-mono text-[0.7rem]",
                              onClick: () => setSelectedGroup(group),
                              "data-ocid": `groups.view_members.${idx + 1}`,
                              children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "mr-1.5 h-3 w-3" }),
                                " View Members"
                              ]
                            }
                          ) })
                        ]
                      },
                      group.id.toString()
                    ))
                  ] })
                ] }),
                totalPages > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-t border-border px-4 py-2.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "font-mono text-[0.6rem] text-muted-foreground", children: [
                    "Page ",
                    page + 1,
                    " of ",
                    totalPages
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        variant: "outline",
                        size: "sm",
                        className: "h-7 font-mono text-xs",
                        disabled: page === 0,
                        onClick: () => setPage((p) => Math.max(0, p - 1)),
                        "data-ocid": "groups.pagination_prev",
                        children: "Previous"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        variant: "outline",
                        size: "sm",
                        className: "h-7 font-mono text-xs",
                        disabled: page >= totalPages - 1,
                        onClick: () => setPage((p) => Math.min(totalPages - 1, p + 1)),
                        "data-ocid": "groups.pagination_next",
                        children: "Next"
                      }
                    )
                  ] })
                ] })
              ] })
            ]
          }
        ),
        selectedGroup && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "w-full lg:w-[480px] flex-shrink-0",
            "data-ocid": "groups.members.panel",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              GroupMemberPanel,
              {
                group: selectedGroup,
                orgName: getOrgName(selectedGroup.orgId),
                onClose: () => setSelectedGroup(null)
              }
            )
          }
        )
      ] })
    }
  );
}
export {
  AdminGroupsPage as default
};
