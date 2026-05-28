import { createActor } from "@/backend";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useHasSuperAdmin } from "@/hooks/use-admin";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Lock, ShieldOff } from "lucide-react";
import type React from "react";

interface AdminAccessGateProps {
  children: React.ReactNode;
  /** Optional compartment gate — UI-only for now; admins see all, non-admins see access denied */
  compartment?: "classified" | "unclassified";
}

export function AdminAccessGate({
  children,
  compartment: _compartment,
}: AdminAccessGateProps) {
  const { actor, isFetching } = useActor(createActor);
  const { principal, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // All hooks must be called unconditionally before any early returns.
  const { data: isAdmin, isLoading } = useQuery<boolean>({
    queryKey: ["admin-check", principal?.toText()],
    queryFn: async () => {
      if (!actor || !principal) return false;
      return actor.isAdminCheck(principal);
    },
    enabled: !!actor && !isFetching && isAuthenticated && !!principal,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });

  const { data: hasSuperAdmin, isLoading: hasSuperAdminLoading } =
    useHasSuperAdmin();

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading || hasSuperAdminLoading || isFetching) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-background"
        data-ocid="admin.gate_loading_state"
      >
        <LoadingSpinner fullScreen label="Verifying access…" />
      </div>
    );
  }

  // ── No Super Admin yet — surface the bootstrap prompt ──────────────────────
  if (hasSuperAdmin === false) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-background gap-6 px-6"
        data-ocid="admin.bootstrap_prompt"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Lock size={36} className="text-primary" />
        </div>
        <div className="text-center max-w-sm space-y-2">
          <h1 className="text-xl font-semibold font-mono text-foreground">
            Admin Console Not Configured
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No Super Admin has been set up yet. Complete the one-time bootstrap
            process to activate the Admin Console.
          </p>
        </div>
        <Link
          to="/admin/bootstrap"
          data-ocid="admin.bootstrap_link"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-mono font-medium hover:bg-primary/90 transition-colors"
        >
          Begin Bootstrap Setup
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  // ── Access denied (Super Admin exists but caller is not an admin) ──────────
  if (!isAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-background gap-6 px-6"
        data-ocid="admin.access_denied"
      >
        <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center">
          <ShieldOff size={36} className="text-destructive" />
        </div>
        <div className="text-center max-w-sm space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Access Denied
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This area is restricted to administrators. If you believe this is an
            error, contact your system administrator.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
          <Lock size={12} className="text-destructive" />
          <span className="text-xs font-medium text-destructive">
            Administrator access required
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/app/conversations" })}
          data-ocid="admin.back_button"
        >
          Go back to conversations
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
