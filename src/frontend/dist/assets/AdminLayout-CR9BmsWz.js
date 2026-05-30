import { e as createLucideIcon, R as React, r as reactExports, bl as useRouterState, j as jsxRuntimeExports, bm as Menu, n as useNavigate, k as useAuth, a0 as Shield, f as cn, U as Users, bn as FileText, av as Settings, bo as LogOut } from "./index-Dj8-UVdB.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$4 = [
  ["rect", { width: "20", height: "5", x: "2", y: "3", rx: "1", key: "1wp1u1" }],
  ["path", { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8", key: "1s80jp" }],
  ["path", { d: "M10 12h4", key: "a56b0p" }]
];
const Archive = createLucideIcon("archive", __iconNode$4);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", key: "1b4qmf" }],
  ["path", { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", key: "i71pzd" }],
  ["path", { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", key: "10jefs" }],
  ["path", { d: "M10 6h4", key: "1itunk" }],
  ["path", { d: "M10 10h4", key: "tcdvrf" }],
  ["path", { d: "M10 14h4", key: "kelpxr" }],
  ["path", { d: "M10 18h4", key: "1ulq68" }]
];
const Building2 = createLucideIcon("building-2", __iconNode$3);
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
  { label: "Audit Logs", icon: FileText, path: "/admin/audit-logs" },
  { label: "Key Escrow", icon: KeyRound, path: "/admin/key-escrow" },
  {
    label: "Retention Policies",
    icon: Archive,
    path: "/admin/retention-policies"
  },
  { label: "Settings", icon: Settings, path: "/admin/settings" }
];
function SidebarNavItem({
  item,
  isActive,
  collapsed,
  badgeCount,
  onClick
}) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      "data-ocid": `admin.nav.${item.label.toLowerCase().replace(/\s+/g, "_")}`,
      onClick: () => {
        navigate({ to: item.path });
        onClick == null ? void 0 : onClick();
      },
      className: cn(
        "group relative flex w-full items-center gap-3 rounded px-3 py-2.5",
        "text-sm font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isActive ? "bg-blue-600/20 text-blue-300 border-l-2 border-blue-500" : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent",
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
              isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
            ),
            "aria-hidden": "true"
          }
        ),
        !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate flex-1 text-left", children: item.label }),
        !collapsed && !item.stub && badgeCount != null && badgeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[0.55rem] font-bold text-black",
            "aria-label": `${badgeCount} expiring`,
            "data-ocid": "admin.nav.retention_policies.badge",
            children: badgeCount
          }
        ),
        collapsed && badgeCount != null && badgeCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "absolute top-1.5 right-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-amber-500",
            "aria-hidden": "true"
          }
        )
      ]
    }
  );
}
function AdminSidebar({
  collapsed,
  onNavClick
}) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const { principal, logout } = useAuth();
  const expiryCount = usePolicyExpiryStore((s) => s.expiryCount);
  const principalText = (principal == null ? void 0 : principal.toText()) ?? "";
  const principalShort = principalText.length > 12 ? `${principalText.slice(0, 6)}…${principalText.slice(-6)}` : principalText;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "aside",
    {
      className: cn(
        "flex h-full flex-col border-r border-white/10",
        // Dark navy/charcoal background for government aesthetic
        "bg-[#0d1117]",
        collapsed ? "w-16" : "w-60",
        "transition-[width] duration-200 ease-in-out"
      ),
      "aria-label": "Admin navigation",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "flex items-center gap-3 border-b border-white/10 px-4 py-4",
              collapsed && "justify-center px-2"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: cn(
                    "flex shrink-0 items-center justify-center rounded bg-blue-600/20 border border-blue-500/30",
                    collapsed ? "h-8 w-8" : "h-9 w-9"
                  ),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-5 w-5 text-blue-400", "aria-hidden": "true" })
                }
              ),
              !collapsed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold tracking-tight text-white leading-tight", children: "CharlieSierra" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] font-semibold tracking-[0.15em] uppercase text-slate-400 leading-tight", children: "Admin Console" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.5rem] tracking-[0.1em] uppercase text-blue-400/80 mt-0.5 leading-tight", children: "Communications Secured" })
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
              badgeCount: badge,
              onClick: onNavClick
            },
            item.path
          );
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-white/10 px-2 py-3 space-y-1", children: [
          !collapsed && principalText && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-1.5 rounded bg-white/5 mx-0.5 mb-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.55rem] text-slate-500 uppercase tracking-widest", children: "Logged in as" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                className: "font-mono text-[0.65rem] text-slate-300 truncate mt-0.5",
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
              onClick: () => {
                logout();
                navigate({ to: "/" });
              },
              className: cn(
                "flex w-full items-center gap-3 rounded px-3 py-2 text-sm",
                "text-slate-400 hover:text-red-400 hover:bg-red-500/10",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
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
  const [mobileOpen, setMobileOpen] = reactExports.useState(false);
  const routerState = useRouterState();
  reactExports.useEffect(() => {
    setMobileOpen(false);
  }, [routerState.location.pathname]);
  reactExports.useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-screen overflow-hidden bg-[#0a0e14]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden md:flex flex-col h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AdminSidebar, { collapsed }) }),
    mobileOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "dialog",
      {
        open: true,
        className: "fixed inset-0 z-40 md:hidden m-0 p-0 max-w-none max-h-none w-full h-full bg-transparent border-none",
        "aria-label": "Admin navigation",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "absolute inset-0 bg-black/70 backdrop-blur-sm",
              onClick: () => setMobileOpen(false),
              "aria-label": "Close navigation"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-0 top-0 h-full w-60 flex flex-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            AdminSidebar,
            {
              collapsed: false,
              onNavClick: () => setMobileOpen(false)
            }
          ) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 flex-col overflow-hidden min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d1117] px-4 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-ocid": "admin.mobile_menu_button",
            onClick: () => setMobileOpen(true),
            className: "rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors md:hidden",
            "aria-label": "Open navigation menu",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { className: "h-5 w-5", "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-ocid": "admin.sidebar_toggle",
            onClick: () => setCollapsed((v) => !v),
            className: "hidden md:flex rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors",
            "aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { className: "h-4 w-4", "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 items-center justify-between min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-mono text-xs font-bold tracking-widest text-white uppercase leading-tight truncate", children: "CharlieSierra Admin Console" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-mono text-[0.5rem] tracking-[0.15em] uppercase text-blue-400/70 leading-tight", children: "Communications Secured" })
          ] }),
          title && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-6 hidden sm:block font-mono text-[0.6rem] uppercase tracking-widest text-slate-500 border-l border-white/10 pl-4 truncate", children: title }),
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
  usePolicyExpiryStore as u
};
