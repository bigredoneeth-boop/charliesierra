import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";
import { CryptoProvider } from "@/context/crypto-context";
import type React from "react";
import { Suspense, lazy } from "react";
const DiscoverPage = lazy(() => import("@/pages/DiscoverPage"));
const AdminDashboardPage = lazy(
  () => import("@/pages/admin/AdminDashboardPage"),
);
const AdminOrganizationsPage = lazy(
  () => import("@/pages/admin/AdminOrganizationsPage"),
);
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminGroupsPage = lazy(() => import("@/pages/admin/AdminGroupsPage"));
const AdminAuditPage = lazy(() => import("@/pages/admin/AdminAuditPage"));
const AdminKeyEscrowPage = lazy(
  () => import("@/pages/admin/AdminKeyEscrowPage"),
);
const AdminRetentionPoliciesPage = lazy(
  () => import("@/pages/admin/AdminRetentionPoliciesPage"),
);
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminBootstrapPage = lazy(
  () => import("@/pages/admin/AdminBootstrapPage"),
);
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { OnboardingGate } from "@/components/OnboardingGate";
import { AccessibilityProvider } from "@/context/accessibility-context";
import ChatPage from "@/pages/ChatPage";
import ConversationsPage from "@/pages/ConversationsPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import SettingsPage from "@/pages/SettingsPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

// ── Root route ──────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// ── Public routes ────────────────────────────────────────────────────────────
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <LoginPage />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => <LoginPage />,
});

// ── Protected layout route ───────────────────────────────────────────────────
function ProtectedLayout() {
  return (
    <OnboardingGate>
      <Outlet />
    </OnboardingGate>
  );
}

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: ProtectedLayout,
  beforeLoad: async () => {
    const { AuthClient } = await import("@dfinity/auth-client");
    const client = await AuthClient.create();
    const isAuthenticated = await client.isAuthenticated();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

// ── App sub-routes ────────────────────────────────────────────────────────────
const appIndexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: () => <ConversationsPage />,
});

const conversationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/conversations",
  component: () => <ConversationsPage />,
});

const conversationDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/conversations/$id",
  component: () => <ChatPage />,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: () => <SettingsPage />,
});

// Admin route removed — group creators manage groups from within the chat

const discoverRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/discover",
  component: () => (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <LoadingSpinner size={36} />
        </div>
      }
    >
      <DiscoverPage />
    </Suspense>
  ),
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: () => <NotFoundPage />,
});

// ── Admin layout wrapper ─────────────────────────────────────────────────────
function AdminGuard() {
  return (
    <AdminAccessGate>
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-background">
            <LoadingSpinner size={36} />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AdminAccessGate>
  );
}

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminGuard,
  beforeLoad: async () => {
    const { AuthClient } = await import("@dfinity/auth-client");
    const client = await AuthClient.create();
    const isAuthenticated = await client.isAuthenticated();
    if (!isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  component: () => <AdminDashboardPage />,
});

const adminOrgsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/organizations",
  component: () => <AdminOrganizationsPage />,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/users",
  component: () => <AdminUsersPage />,
});

const adminGroupsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/groups",
  component: () => <AdminGroupsPage />,
});

const adminAuditRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/audit-logs",
  component: () => <AdminAuditPage />,
});

const adminKeyEscrowRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/key-escrow",
  component: () => <AdminKeyEscrowPage />,
});

const adminRetentionPoliciesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/retention-policies",
  component: () => <AdminRetentionPoliciesPage />,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/settings",
  component: () => <AdminSettingsPage />,
});
// ── Admin bootstrap route (public — no auth guard) ───────────────────────────
// Must be a sibling of adminRoute so it bypasses AdminGuard and the auth check.
const adminBootstrapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/bootstrap",
  component: () => (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <LoadingSpinner size={36} />
        </div>
      }
    >
      <AdminBootstrapPage />
    </Suspense>
  ),
});

// ── Router ───────────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appRoute.addChildren([
    appIndexRoute,
    conversationsRoute,
    conversationDetailRoute,
    settingsRoute,
    discoverRoute,
  ]),
  // /admin/bootstrap is a top-level sibling so it bypasses all auth guards.
  adminBootstrapRoute,
  adminRoute.addChildren([
    adminIndexRoute,
    adminOrgsRoute,
    adminUsersRoute,
    adminGroupsRoute,
    adminAuditRoute,
    adminKeyEscrowRoute,
    adminRetentionPoliciesRoute,
    adminSettingsRoute,
  ]),
  notFoundRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <CryptoProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" richColors closeButton />
          </TooltipProvider>
        </CryptoProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}
