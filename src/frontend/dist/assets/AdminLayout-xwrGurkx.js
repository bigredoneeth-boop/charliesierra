import { e as createLucideIcon, bj as React, r as reactExports, j as jsxRuntimeExports, bk as useRouterState, g as useAuth, s as cn, U as Users, aY as FileText, p as Settings, bl as LogOut, f as useNavigate } from "./index-D8Qg-lkp.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$4 = [
  ["path", { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", key: "1b4qmf" }],
  ["path", { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", key: "i71pzd" }],
  ["path", { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", key: "10jefs" }],
  ["path", { d: "M10 6h4", key: "1itunk" }],
  ["path", { d: "M10 10h4", key: "tcdvrf" }],
  ["path", { d: "M10 14h4", key: "kelpxr" }],
  ["path", { d: "M10 18h4", key: "1ulq68" }]
];
const Building2 = createLucideIcon("building-2", __iconNode$4);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
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
const ClipboardList = createLucideIcon("clipboard-list", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
];
const KeyRound = createLucideIcon("key-round", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
];
const LayoutDashboard = createLucideIcon("layout-dashboard", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M18 21a8 8 0 0 0-16 0", key: "3ypg7q" }],
  ["circle", { cx: "10", cy: "8", r: "5", key: "o932ke" }],
  ["path", { d: "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3", key: "10s06x" }]
];
const UsersRound = createLucideIcon("users-round", __iconNode);
const createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api = { setState, getState, getInitialState, subscribe };
  const initialState = state = createState(setState, getState, api);
  return api;
};
const createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;
const identity = (arg) => arg;
function useStore(api, selector = identity) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  React.useDebugValue(slice);
  return slice;
}
const createImpl = (createState) => {
  const api = createStore(createState);
  const useBoundStore = (selector) => useStore(api, selector);
  Object.assign(useBoundStore, api);
  return useBoundStore;
};
const create = (createState) => createState ? createImpl(createState) : createImpl;
const usePolicyExpiryStore = create((set) => ({
  expiryCount: 0,
  setExpiryCount: (count) => set({ expiryCount: count })
}));
const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Organizations", icon: Building2, path: "/admin/organizations" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Groups", icon: UsersRound, path: "/admin/groups" },
  { label: "Audit Logs", icon: ClipboardList, path: "/admin/audit-logs" },
  {
    label: "Key Escrow",
    icon: KeyRound,
    path: "/admin/key-escrow"
  },
  {
    label: "Retention Policies",
    icon: FileText,
    path: "/admin/retention-policies"
  },
  { label: "Settings", icon: Settings, path: "/admin/settings" }
];
function SidebarNavItem({
  item,
  isActive,
  collapsed,
  badgeCount
}) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      "data-ocid": `admin.nav.${item.label.toLowerCase().replace(/\s+/g, "_")}`,
      onClick: () => navigate({ to: item.path }),
      className: cn(
        "group flex w-full items-center gap-3 rounded-sm px-3 py-2.5",
        "text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2"
      ),
      title: collapsed ? item.label : void 0,
      "aria-current": isActive ? "page" : void 0,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Icon,
          {
            className: cn(
              "shrink-0",
              collapsed ? "h-5 w-5" : "h-4 w-4",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
            ),
            "aria-hidden": "true"
          }
        ),
        !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: item.label }),
        !collapsed && item.stub && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.55rem] tracking-widest text-muted-foreground uppercase", children: "SOON" }),
        !collapsed && !item.stub && badgeCount != null && badgeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[0.55rem] font-bold text-white",
            "aria-label": `${badgeCount} expiring`,
            "data-ocid": "admin.nav.retention_policies.badge",
            children: badgeCount
          }
        ),
        collapsed && badgeCount != null && badgeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500",
            "aria-hidden": "true"
          }
        )
      ]
    }
  );
}
function AdminSidebar({ collapsed }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { principal, logout } = useAuth();
  const expiryCount = usePolicyExpiryStore((s) => s.expiryCount);
  const principalText = (principal == null ? void 0 : principal.toText()) ?? "";
  const principalShort = principalText.length > 16 ? `${principalText.slice(0, 8)}…${principalText.slice(-6)}` : principalText;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "aside",
    {
      className: cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar",
        collapsed ? "w-16" : "w-60",
        "transition-[width] duration-200"
      ),
      "aria-label": "Admin navigation",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4",
              collapsed && "justify-center px-2"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: cn(
                    "flex shrink-0 items-center justify-center rounded-sm bg-primary/10 border border-primary/20",
                    collapsed ? "h-8 w-8" : "h-9 w-9"
                  ),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "svg",
                    {
                      className: "h-5 w-5 text-primary",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: "currentColor",
                      strokeWidth: "2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      "aria-hidden": "true",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "9 12 11 14 15 10" })
                      ]
                    }
                  )
                }
              ),
              !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[0.9rem] font-bold tracking-tight text-foreground leading-tight", children: "CharlieSierra" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] font-semibold tracking-[0.18em] uppercase text-muted-foreground leading-tight", children: "Admin Console" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.5rem] tracking-[0.12em] uppercase text-primary/60 mt-0.5 leading-tight", children: "Communications Secured" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-1 overflow-y-auto px-2 py-3 space-y-0.5", children: NAV_ITEMS.map((item) => {
          const isActive = item.path === "/admin" ? currentPath === "/admin" || currentPath === "/admin/" : currentPath.startsWith(item.path);
          const badge = item.path === "/admin/retention-policies" ? expiryCount : void 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            SidebarNavItem,
            {
              item,
              isActive,
              collapsed,
              badgeCount: badge
            },
            item.path
          );
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("border-t border-sidebar-border px-2 py-3 space-y-1"), children: [
          !collapsed && principalText && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.6rem] text-muted-foreground uppercase tracking-widest", children: "Logged in as" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                className: "font-mono text-[0.65rem] text-sidebar-foreground truncate",
                title: principalText,
                children: principalShort
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": "admin.logout_button",
              onClick: logout,
              className: cn(
                "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm",
                "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                collapsed && "justify-center px-2"
              ),
              title: collapsed ? "Sign out" : void 0,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "h-4 w-4 shrink-0", "aria-hidden": "true" }),
                !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Sign out" })
              ]
            }
          )
        ] })
      ]
    }
  );
}
function AdminLayout({ title, action, children }) {
  const [collapsed, setCollapsed] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-screen overflow-hidden bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AdminSidebar, { collapsed }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex shrink-0 items-center gap-4 border-b border-border bg-card px-6 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-ocid": "admin.sidebar_toggle",
            onClick: () => setCollapsed((v) => !v),
            className: "rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            "aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "svg",
              {
                className: "h-4 w-4",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                "aria-hidden": "true",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "3", y1: "12", x2: "21", y2: "12" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "3", y1: "18", x2: "21", y2: "18" })
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 items-center justify-between min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-mono text-xs font-bold tracking-widest text-foreground uppercase leading-tight truncate", children: "CharlieSierra Admin Console" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] tracking-[0.15em] uppercase text-primary/70 leading-tight", children: "Communications Secured" })
          ] }),
          title && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-6 hidden sm:block font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground border-l border-border pl-4", children: title }),
          action && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-4 shrink-0", children: action })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "main",
        {
          className: "flex-1 overflow-y-auto bg-background p-6",
          id: "admin-main",
          children
        }
      )
    ] })
  ] });
}
export {
  AdminLayout as A,
  Building2 as B,
  ClipboardList as C,
  usePolicyExpiryStore as u
};
