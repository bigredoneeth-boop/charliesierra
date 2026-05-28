/**
 * AdminLayout
 * Full-page sidebar + main content shell for the Admin Console.
 * - Fixed 240 px sidebar on desktop, icon-only on mobile (≤ md breakpoint)
 * - Government-military aesthetic: no decorative elements, clean borders, monospace labels
 * - Active nav item highlighted with primary color token
 */
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { usePolicyExpiryStore } from "@/stores/policy-expiry-store";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  ClipboardList,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

// ── Nav item definition ───────────────────────────────────────────────────────
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  /** Mark stub sections so we can append a badge */
  stub?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Organizations", icon: Building2, path: "/admin/organizations" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Groups", icon: UsersRound, path: "/admin/groups" },
  { label: "Audit Logs", icon: ClipboardList, path: "/admin/audit-logs" },
  {
    label: "Key Escrow",
    icon: KeyRound,
    path: "/admin/key-escrow",
  },
  {
    label: "Retention Policies",
    icon: FileText,
    path: "/admin/retention-policies",
  },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

// ── Sidebar nav item ──────────────────────────────────────────────────────────
function SidebarNavItem({
  item,
  isActive,
  collapsed,
  badgeCount,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  badgeCount?: number;
}) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <button
      type="button"
      data-ocid={`admin.nav.${item.label.toLowerCase().replace(/\s+/g, "_")}`}
      onClick={() => navigate({ to: item.path })}
      className={cn(
        "group flex w-full items-center gap-3 rounded-sm px-3 py-2.5",
        "text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={cn(
          "shrink-0",
          collapsed ? "h-5 w-5" : "h-4 w-4",
          isActive
            ? "text-primary"
            : "text-muted-foreground group-hover:text-sidebar-accent-foreground",
        )}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.stub && (
        <span className="ml-auto rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.55rem] tracking-widest text-muted-foreground uppercase">
          SOON
        </span>
      )}
      {!collapsed && !item.stub && badgeCount != null && badgeCount > 0 && (
        <span
          className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[0.55rem] font-bold text-white"
          aria-label={`${badgeCount} expiring`}
          data-ocid="admin.nav.retention_policies.badge"
        >
          {badgeCount}
        </span>
      )}
      {collapsed && badgeCount != null && badgeCount > 0 && (
        <span
          className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function AdminSidebar({ collapsed }: { collapsed: boolean }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { principal, logout } = useAuth();
  const expiryCount = usePolicyExpiryStore((s) => s.expiryCount);

  const principalText = principal?.toText() ?? "";
  const principalShort =
    principalText.length > 16
      ? `${principalText.slice(0, 8)}…${principalText.slice(-6)}`
      : principalText;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar",
        collapsed ? "w-16" : "w-60",
        "transition-[width] duration-200",
      )}
      aria-label="Admin navigation"
    >
      {/* Branding header */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4",
          collapsed && "justify-center px-2",
        )}
      >
        {/* Shield logo mark */}
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-sm bg-primary/10 border border-primary/20",
            collapsed ? "h-8 w-8" : "h-9 w-9",
          )}
        >
          <svg
            className="h-5 w-5 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[0.9rem] font-bold tracking-tight text-foreground leading-tight">
              CharlieSierra
            </p>
            <p className="font-mono text-[0.55rem] font-semibold tracking-[0.18em] uppercase text-muted-foreground leading-tight">
              Admin Console
            </p>
            <p className="font-mono text-[0.5rem] tracking-[0.12em] uppercase text-primary/60 mt-0.5 leading-tight">
              Communications Secured
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          // Active if exact match for dashboard, prefix match for others
          const isActive =
            item.path === "/admin"
              ? currentPath === "/admin" || currentPath === "/admin/"
              : currentPath.startsWith(item.path);
          const badge =
            item.path === "/admin/retention-policies" ? expiryCount : undefined;
          return (
            <SidebarNavItem
              key={item.path}
              item={item}
              isActive={isActive}
              collapsed={collapsed}
              badgeCount={badge}
            />
          );
        })}
      </nav>

      {/* Footer: principal + logout */}
      <div className={cn("border-t border-sidebar-border px-2 py-3 space-y-1")}>
        {!collapsed && principalText && (
          <div className="px-3 py-1">
            <p className="font-mono text-[0.6rem] text-muted-foreground uppercase tracking-widest">
              Logged in as
            </p>
            <p
              className="font-mono text-[0.65rem] text-sidebar-foreground truncate"
              title={principalText}
            >
              {principalShort}
            </p>
          </div>
        )}
        <button
          type="button"
          data-ocid="admin.logout_button"
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            collapsed && "justify-center px-2",
          )}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────────
interface AdminLayoutProps {
  /** Page title shown in the top header bar */
  title: string;
  /** Optional action element (e.g. a "New Org" button) placed right of title */
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminLayout({ title, action, children }: AdminLayoutProps) {
  // Collapse sidebar on narrow viewports by default
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AdminSidebar collapsed={collapsed} />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="flex shrink-0 items-center gap-4 border-b border-border bg-card px-6 py-3">
          {/* Collapse toggle */}
          <button
            type="button"
            data-ocid="admin.sidebar_toggle"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex flex-1 items-center justify-between min-w-0">
            <div className="min-w-0">
              <h1 className="font-mono text-xs font-bold tracking-widest text-foreground uppercase leading-tight truncate">
                CharlieSierra Admin Console
              </h1>
              <p className="font-mono text-[0.55rem] tracking-[0.15em] uppercase text-primary/70 leading-tight">
                Communications Secured
              </p>
            </div>
            {/* Page section label */}
            {title && (
              <span className="ml-6 hidden sm:block font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground border-l border-border pl-4">
                {title}
              </span>
            )}
            {action && <div className="ml-4 shrink-0">{action}</div>}
          </div>
        </header>

        {/* Scrollable page content */}
        <main
          className="flex-1 overflow-y-auto bg-background p-6"
          id="admin-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
