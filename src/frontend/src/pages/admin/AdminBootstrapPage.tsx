/**
 * AdminBootstrapPage.tsx
 * One-time Super Admin bootstrap page.
 * Accessible at /admin/bootstrap WITHOUT authentication.
 * Automatically redirects to /admin if a Super Admin already exists.
 */
import { createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActor } from "@caffeineai/core-infrastructure";
import { Principal } from "@dfinity/principal";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Shield, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminBootstrapPage() {
  const { actor, isFetching } = useActor(createActor);
  const navigate = useNavigate();

  const [principalInput, setPrincipalInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);

  // On mount: check if a Super Admin already exists; if so, redirect immediately.
  useEffect(() => {
    if (!actor || isFetching) return;
    let cancelled = false;
    (async () => {
      try {
        const alreadyExists = await actor.hasSuperAdmin();
        if (!cancelled && alreadyExists) {
          void navigate({ to: "/admin" });
        }
      } catch {
        // If the check fails, allow the page to render — user can still attempt bootstrap.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!actor) {
      setError("Backend actor not ready. Please wait and try again.");
      return;
    }

    let targetPrincipal: Principal;
    try {
      targetPrincipal = Principal.fromText(principalInput.trim());
    } catch {
      setError("Invalid Principal ID. Check the format and try again.");
      return;
    }

    setIsPending(true);
    try {
      const res = await actor.bootstrapSuperAdmin(targetPrincipal);
      if (res.__kind__ === "ok") {
        setSuccess(true);
        setTimeout(() => {
          void navigate({ to: "/admin" });
        }, 1500);
      } else {
        setError(res.err);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsPending(false);
    }
  }

  // While checking backend status, show a minimal loading state.
  if (checking || isFetching) {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center"
        data-ocid="bootstrap.loading_state"
      >
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-mono">Verifying system state...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Shield size={20} className="text-primary" />
          <span className="text-sm font-mono font-semibold text-foreground tracking-wide uppercase">
            CharlieSierra / Admin Console
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md" data-ocid="bootstrap.page">
          {/* Header block */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} className="text-primary" />
              </div>
              <h1 className="text-xl font-semibold font-mono text-foreground tracking-tight">
                Bootstrap Super Admin
              </h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-4">
              No Super Admin has been configured yet. Enter a Principal ID to
              claim the Super Admin role. This action can only be performed
              once.
            </p>
          </div>

          {/* Form card */}
          <div className="border border-border rounded-md bg-card p-6 shadow-sm space-y-5">
            {success ? (
              // Success state
              <div
                className="flex flex-col items-center gap-4 py-4 text-center"
                data-ocid="bootstrap.success_state"
              >
                <CheckCircle2 size={36} className="text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold font-mono text-foreground">
                    Super Admin role claimed successfully.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Redirecting to Admin Dashboard...
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2
                    size={14}
                    className="animate-spin text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    Please wait
                  </span>
                </div>
              </div>
            ) : (
              // Input form
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="principal-input"
                    className="text-xs font-mono font-medium text-foreground uppercase tracking-wider"
                  >
                    Principal ID
                  </Label>
                  <Input
                    id="principal-input"
                    data-ocid="bootstrap.principal_input"
                    type="text"
                    value={principalInput}
                    onChange={(e) => {
                      setPrincipalInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. dzdlk-gui4e-tacqa-6ptxj-..."
                    className="font-mono text-sm"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    disabled={isPending}
                    aria-describedby={error ? "bootstrap-error" : undefined}
                  />
                  {error && (
                    <p
                      id="bootstrap-error"
                      className="text-xs text-destructive font-mono"
                      data-ocid="bootstrap.error_state"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  data-ocid="bootstrap.submit_button"
                  disabled={isPending || !principalInput.trim()}
                  className="w-full font-mono"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Claiming...
                    </span>
                  ) : (
                    "Claim Super Admin"
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Footer note */}
          <p className="mt-4 text-xs text-muted-foreground font-mono text-center">
            After bootstrap, this page will no longer be accessible.
          </p>
        </div>
      </main>

      {/* Page footer */}
      <footer className="border-t border-border bg-card px-6 py-3">
        <div className="max-w-screen-sm mx-auto">
          <p className="text-xs text-muted-foreground font-mono text-center">
            RESTRICTED SYSTEM ACCESS — AUTHORIZED PERSONNEL ONLY
          </p>
        </div>
      </footer>
    </div>
  );
}
