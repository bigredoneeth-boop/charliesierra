/**
 * AdminLayout
 * Full-page sidebar + main content shell for the Admin Console.
 * - Fixed 240 px sidebar on desktop with dark background
 * - Collapsible to icon-only mode; mobile overlay hamburger menu
 * - Government-military aesthetic: high-contrast, no decorative elements
 */
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { usePolicyExpiryStore } from "@/stores/policy-expiry-store";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  ArrowLeft,
  Building2,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

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
  { label: "Audit Logs", icon: FileText, path: "/admin/audit-logs" },
  { label: "Key Escrow", icon: KeyRound, path: "/admin/key-escrow" },
  {
    label: "Retention Policies",
    icon: Archive,
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
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  badgeCount?: number;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <button
      type="button"
      data-ocid={`admin.nav.${item.label.toLowerCase().replace(/\s+/g, "_")}`}
      onClick={() => {
        navigate({ to: item.path });
        onClick?.();
      }}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded px-3 py-2.5",
        "text-sm font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isActive
          ? "bg-blue-600/20 text-blue-300 border-l-2 border-blue-500"
          : "text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent",
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
            ? "text-blue-400"
            : "text-slate-400 group-hover:text-slate-200",
        )}
        aria-hidden="true"
      />
      {!collapsed && (
        <span className="truncate flex-1 text-left">{item.label}</span>
      )}
      {!collapsed && !item.stub && badgeCount != null && badgeCount > 0 && (
        <span
          className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[0.55rem] font-bold text-black"
          aria-label={`${badgeCount} expiring`}
          data-ocid="admin.nav.retention_policies.badge"
        >
          {badgeCount}
        </span>
      )}
      {collapsed && badgeCount != null && badgeCount > 0 && (
        <span
          className="absolute top-1.5 right-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-amber-500"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function AdminSidebar({
  collapsed,
  onNavClick,
}: {
  collapsed: boolean;
  onNavClick?: () => void;
}) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();
  const { principal, logout } = useAuth();
  const expiryCount = usePolicyExpiryStore((s) => s.expiryCount);

  const principalText = principal?.toText() ?? "";
  const principalShort =
    principalText.length > 12
      ? `${principalText.slice(0, 6)}…${principalText.slice(-6)}`
      : principalText;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/10",
        // Dark navy/charcoal background for government aesthetic
        "bg-[#0d1117]",
        collapsed ? "w-16" : "w-60",
        "transition-[width] duration-200 ease-in-out",
      )}
      aria-label="Admin navigation"
    >
      {/* Branding header */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-white/10 px-4 py-4",
          collapsed && "justify-center px-2",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded bg-blue-600/20 border border-blue-500/30",
            collapsed ? "h-8 w-8" : "h-9 w-9",
          )}
        >
          <Shield className="h-5 w-5 text-blue-400" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-white leading-tight">
              CharlieSierra
            </p>
            <p className="font-mono text-[0.55rem] font-semibold tracking-[0.15em] uppercase text-slate-400 leading-tight">
              Admin Console
            </p>
            <p className="font-mono text-[0.5rem] tracking-[0.1em] uppercase text-blue-400/80 mt-0.5 leading-tight">
              Communications Secured
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
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
              onClick={onNavClick}
            />
          );
        })}
      </nav>

      {/* Footer: principal + logout */}
      <div className="border-t border-white/10 px-2 py-3 space-y-1">
        {!collapsed && principalText && (
          <div className="px-3 py-1.5 rounded bg-white/5 mx-0.5 mb-1">
            <p className="font-mono text-[0.55rem] text-slate-500 uppercase tracking-widest">
              Logged in as
            </p>
            <p
              className="font-mono text-[0.65rem] text-slate-300 truncate mt-0.5"
              title={principalText}
            >
              {principalShort}
            </p>
          </div>
        )}
        <button
          type="button"
          data-ocid="admin.logout_button"
          onClick={() => {
            logout();
            navigate({ to: "/" });
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded px-3 py-2 text-sm",
            "text-slate-400 hover:text-red-400 hover:bg-red-500/10",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  // Close mobile menu on route change
  const routerState = useRouterState();
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional route-change side-effect
  useEffect(() => {
    setMobileOpen(false);
  }, [routerState.location.pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0a0e14]">
      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex flex-col h-full">
        <AdminSidebar collapsed={collapsed} />
      </div>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <dialog
          open
          className="fixed inset-0 z-40 md:hidden m-0 p-0 max-w-none max-h-none w-full h-full bg-transparent border-none"
          aria-label="Admin navigation"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-60 flex flex-col">
            <AdminSidebar
              collapsed={false}
              onNavClick={() => setMobileOpen(false)}
            />
          </div>
        </dialog>
      )}

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d1117] px-4 py-3">
          {/* Mobile hamburger */}
          <button
            type="button"
            data-ocid="admin.mobile_menu_button"
            onClick={() => setMobileOpen(true)}
            className="rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            data-ocid="admin.sidebar_toggle"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden md:flex rounded p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Return to Chat */}
          <button
            type="button"
            data-ocid="admin.return_to_chat_button"
            onClick={() => navigate({ to: "/app/conversations" })}
            className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-slate-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors duration-150 border border-transparent hover:border-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Return to Chat"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline font-mono text-[0.6rem] font-semibold uppercase tracking-widest">
              Return to Chat
            </span>
            <MessageSquare
              className="h-3 w-3 shrink-0 hidden sm:block opacity-60"
              aria-hidden="true"
            />
          </button>

          <div className="flex flex-1 items-center justify-between min-w-0">
            <div className="min-w-0">
              <h1 className="font-mono text-xs font-bold tracking-widest text-white uppercase leading-tight truncate">
                CharlieSierra Admin Console
              </h1>
              <p className="font-mono text-[0.5rem] tracking-[0.15em] uppercase text-blue-400/70 leading-tight">
                Communications Secured
              </p>
            </div>
            {title && (
              <span className="ml-6 hidden sm:block font-mono text-[0.6rem] uppercase tracking-widest text-slate-500 border-l border-white/10 pl-4 truncate">
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
