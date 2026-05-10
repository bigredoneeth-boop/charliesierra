import { createActor } from "@/backend";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Lock, ShieldOff } from "lucide-react";
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

  if (isLoading || isFetching) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-background"
        data-ocid="admin.gate_loading_state"
      >
        <LoadingSpinner fullScreen label="Verifying access…" />
      </div>
    );
  }

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
