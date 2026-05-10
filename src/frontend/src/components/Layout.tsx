import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/auth-context";
import { getLocalAvatarDataUrl } from "@/hooks/use-profiles";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Compass,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { EncryptedBadge } from "./EncryptedBadge";
import { UserAvatar } from "./UserAvatar";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showEncryptedBadge?: boolean;
  headerRight?: React.ReactNode;
}

// ThemeToggle imported from @/components/ThemeToggle

const NAV_ITEMS = [
  {
    to: "/app/conversations",
    icon: MessageSquare,
    label: "Conversations",
    ocid: "nav.conversations",
    ariaLabel: "Go to Conversations",
  },
  {
    to: "/app/discover",
    icon: Compass,
    label: "Discover",
    ocid: "nav.discover",
    ariaLabel: "Discover public groups",
  },
  {
    to: "/app/settings",
    icon: Settings,
    label: "Settings",
    ocid: "nav.settings",
    ariaLabel: "Go to Settings",
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { principal, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
        <img
          src="/assets/logo.png"
          alt="CharlieSierra"
          className="h-14 w-auto object-contain flex-shrink-0"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, label, ocid, ariaLabel }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              data-ocid={ocid}
              aria-label={ariaLabel}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Caffeine attribution */}
      <div className="px-4 py-2 border-t border-sidebar-border">
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          © {new Date().getFullYear()} Built with love using caffeine.ai
        </a>
      </div>

      {isAuthenticated && principal && (
        <div className="px-3 py-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <UserAvatar
              principal={principal.toText()}
              avatarUrl={getLocalAvatarDataUrl(principal.toText()) ?? undefined}
              size={28}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {principal.toText().slice(0, 16)}…
              </p>
              <p className="text-xs text-muted-foreground">Internet Identity</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              data-ocid="nav.logout"
              aria-label="Log out"
              className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({
  children,
  title,
  showEncryptedBadge = true,
  headerRight,
}: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Apply persisted theme on mount
  useEffect(() => {
    const stored = localStorage.getItem("cs_theme");
    const isDark = stored ? stored === "dark" : true;
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[280px] flex-shrink-0 flex-col border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 bg-sidebar border-sidebar-border"
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card flex-shrink-0">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                data-ocid="nav.menu_button"
                className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </SheetTrigger>
          </Sheet>

          {/* Logo — visible on mobile (desktop uses sidebar), hidden on md+ */}
          <img
            src="/assets/logo.png"
            alt="CharlieSierra"
            className="md:hidden h-10 w-auto object-contain"
          />

          {title && (
            <h1 className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
              {title}
            </h1>
          )}

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {showEncryptedBadge && <EncryptedBadge />}
            {headerRight}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="py-2 px-4 border-t border-border text-center flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              To report a bug, email{" "}
              <a
                href="mailto:support@charliesierra.io"
                className="underline hover:text-foreground transition-colors duration-200"
              >
                support@charliesierra.io
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
