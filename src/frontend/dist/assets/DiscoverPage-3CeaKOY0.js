import { j as jsxRuntimeExports, c as cn, r as reactExports, u as usePublicGroups, L as Layout, S as Search, I as Input, C as Compass, B as Button, a as Skeleton, b as useSubmitJoinRequest, d as Badge, U as Users, e as ue } from "./index-NLyTtNBW.js";
function Card({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "card",
      className: cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      ),
      ...props
    }
  );
}
function CardHeader({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "card-header",
      className: cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      ),
      ...props
    }
  );
}
function CardContent({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "card-content",
      className: cn("px-6", className),
      ...props
    }
  );
}
const CATEGORIES = [
  "All",
  "Operations",
  "Intelligence",
  "Logistics",
  "Training",
  "General"
];
function GroupCard({ group }) {
  const submit = useSubmitJoinRequest();
  function handleRequest() {
    submit.mutate(
      { conversationId: group.id, message: void 0 },
      {
        onSuccess: () => ue.success(`Join request sent to "${group.name}"`, {
          duration: 4e3
        }),
        onError: (err) => ue.error(err instanceof Error ? err.message : "Request failed")
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "flex flex-col border-border bg-card hover:shadow-elevated transition-shadow duration-200", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-sm text-foreground truncate", children: group.name }),
        group.category && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Badge,
          {
            variant: "secondary",
            className: "mt-1 text-[10px] uppercase tracking-wide",
            children: group.category
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 12, "aria-hidden": "true" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: group.memberCount.toString() })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex-1 pb-4", children: [
      group.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground line-clamp-2 mb-3", children: group.description }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          size: "sm",
          variant: "outline",
          className: "w-full",
          onClick: handleRequest,
          disabled: submit.isPending,
          "data-ocid": "discover.request_join_button",
          "aria-label": `Request to join ${group.name}`,
          children: submit.isPending ? "Sending…" : "Request to Join"
        }
      )
    ] })
  ] });
}
function GroupCardSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-md p-4 space-y-3 bg-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-3/4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-1/3" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-full" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-8 w-full mt-2" })
  ] });
}
function DiscoverPage() {
  const [search, setSearch] = reactExports.useState("");
  const [activeCategory, setActiveCategory] = reactExports.useState("All");
  const [offset, setOffset] = reactExports.useState(0n);
  const category = activeCategory === "All" ? void 0 : activeCategory;
  const { data: groups, isLoading } = usePublicGroups(category, offset);
  const filtered = (groups ?? []).filter(
    (g) => {
      var _a;
      return search.trim() === "" ? true : g.name.toLowerCase().includes(search.toLowerCase()) || ((_a = g.description) == null ? void 0 : _a.toLowerCase().includes(search.toLowerCase()));
    }
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Layout,
    {
      title: "Discover Groups",
      showEncryptedBadge: false,
      headerRight: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Compass,
        {
          size: 16,
          className: "text-muted-foreground",
          "aria-hidden": "true"
        }
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "max-w-4xl mx-auto px-4 py-6 space-y-6",
          "data-ocid": "discover.page",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": "Group search and filters", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 max-w-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Search,
                  {
                    size: 14,
                    className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
                    "aria-hidden": "true"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    type: "search",
                    placeholder: "Search groups…",
                    value: search,
                    onChange: (e) => setSearch(e.target.value),
                    className: "pl-8 h-9 text-sm",
                    "aria-label": "Search public groups",
                    "data-ocid": "discover.search_input"
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  role: "tablist",
                  "aria-label": "Filter groups by category",
                  className: "flex flex-wrap gap-1.5",
                  children: CATEGORIES.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      role: "tab",
                      "aria-selected": activeCategory === cat,
                      onClick: () => {
                        setActiveCategory(cat);
                        setOffset(0n);
                      },
                      "data-ocid": `discover.filter.${cat.toLowerCase()}`,
                      className: `px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"}`,
                      children: cat
                    },
                    cat
                  ))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("section", { "aria-label": "Public groups", children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
                "data-ocid": "discover.loading_state",
                "aria-busy": "true",
                "aria-label": "Loading groups",
                children: Array.from({ length: 6 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
                  /* @__PURE__ */ jsxRuntimeExports.jsx(GroupCardSkeleton, {}, i)
                ))
              }
            ) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "flex flex-col items-center justify-center py-16 text-center",
                "data-ocid": "discover.empty_state",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Compass,
                    {
                      size: 40,
                      className: "text-muted-foreground mb-4",
                      "aria-hidden": "true"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: "No groups found" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: search ? "Try a different search term or clear the filter." : "No discoverable groups are available yet." }),
                  search && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      variant: "ghost",
                      size: "sm",
                      className: "mt-3",
                      onClick: () => setSearch(""),
                      children: "Clear search"
                    }
                  )
                ]
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: filtered.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsx(GroupCard, { group }, group.id.toString())) }) }),
            !isLoading && filtered.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "flex items-center justify-between pt-2",
                "aria-label": "Pagination",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      size: "sm",
                      onClick: () => setOffset((o) => o > 20n ? o - 20n : 0n),
                      disabled: offset === 0n,
                      "data-ocid": "discover.pagination_prev",
                      "aria-label": "Previous page",
                      children: "Previous"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                    "Showing ",
                    filtered.length,
                    " group",
                    filtered.length !== 1 ? "s" : ""
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      variant: "outline",
                      size: "sm",
                      onClick: () => setOffset((o) => o + 20n),
                      disabled: (groups ?? []).length < 20,
                      "data-ocid": "discover.pagination_next",
                      "aria-label": "Next page",
                      children: "Next"
                    }
                  )
                ]
              }
            )
          ]
        }
      )
    }
  );
}
export {
  DiscoverPage as default
};
