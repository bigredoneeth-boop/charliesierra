import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Shield, Zap } from "lucide-react";
import { useEffect } from "react";

const FEATURES = [
  {
    icon: Shield,
    title: "End-to-End Encrypted",
    desc: "Messages encrypted on your device with AES-GCM — backend never sees plaintext.",
  },
  {
    icon: Shield,
    title: "Fully Decentralized",
    desc: "Deployed on the Internet Computer. No single server controls your data.",
  },
  {
    icon: Zap,
    title: "Real-Time Messaging",
    desc: "Encrypted group & 1:1 chats, voice notes, and file sharing.",
  },
];

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/app/conversations" });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header bar */}
      <header className="flex items-center gap-3 px-6 h-14 border-b border-border bg-card flex-shrink-0" />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-10">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center gap-2 mb-2">
              <img
                src="/assets/newlogo.png"
                alt="CharlieSierra"
                className="h-[22.4rem] w-auto object-contain"
              />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
              Secure by Default
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
              A fully decentralized, end-to-end encrypted messaging platform
              built on the Internet Computer.
            </p>
          </div>

          {/* Login card */}
          <div className="bg-card border border-border rounded-lg p-8 shadow-elevated space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-foreground">
                Sign in with Internet Identity
              </h2>
              <p className="text-sm text-muted-foreground">
                Authenticate securely using your Internet Identity — no
                passwords, no email required.
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={login}
              disabled={isLoading}
              data-ocid="login.submit_button"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size={16} className="mr-2" />
                  Connecting…
                </>
              ) : (
                "Connect with Internet Identity"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your keys are generated and stored locally on your device.
              <br />
              We never store unencrypted data.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-4 bg-muted/30 border border-border rounded-md"
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={15} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-border bg-muted/40 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
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
    </div>
  );
}
