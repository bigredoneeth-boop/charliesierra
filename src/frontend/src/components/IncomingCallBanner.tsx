import { CallStatus } from "@/backend";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/auth-context";
import type { CallRecordPublic } from "@/hooks/use-calls";
import { useActiveCalls, useEndCall } from "@/hooks/use-calls";
import { useUserProfile } from "@/hooks/use-profiles";
import { useNavigate } from "@tanstack/react-router";
import { Phone, PhoneOff } from "lucide-react";
import { useCallback } from "react";

function BannerItem({ call }: { call: CallRecordPublic }) {
  const navigate = useNavigate();
  const endCall = useEndCall();
  const { data: callerProfile } = useUserProfile(call.caller);
  const callerStr = call.caller.toText();

  const displayName = callerProfile
    ? callerStr.slice(0, 8)
    : callerStr.slice(0, 8);

  const handleAccept = useCallback(() => {
    navigate({ to: "/app/calls/$id", params: { id: call.id.toString() } });
  }, [navigate, call.id]);

  const handleDecline = useCallback(async () => {
    await endCall.mutateAsync({ callId: call.id, reason: CallStatus.declined });
  }, [endCall, call.id]);

  return (
    <div
      data-ocid="incoming_call.banner"
      role="alertdialog"
      aria-label="Incoming call"
      className="flex items-center gap-3 rounded-xl bg-card border border-border shadow-elevated px-4 py-3 min-w-[300px] max-w-sm"
    >
      <UserAvatar principal={callerStr} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {displayName}…
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Phone size={11} />
          <span>Voice call</span>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          data-ocid="incoming_call.decline_button"
          onClick={handleDecline}
          aria-label="Decline call"
          className="w-9 h-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-smooth"
        >
          <PhoneOff size={16} />
        </button>
        <button
          type="button"
          data-ocid="incoming_call.accept_button"
          onClick={handleAccept}
          aria-label="Accept call"
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-smooth"
        >
          <Phone size={16} />
        </button>
      </div>
    </div>
  );
}

export function IncomingCallBanner() {
  const { principal } = useAuth();
  const { data: activeCalls } = useActiveCalls();

  const myPrincipal = principal?.toText();

  // Only show ringing calls where we are the callee (not the caller)
  const incomingCalls = (activeCalls ?? []).filter(
    (c) =>
      c.status === CallStatus.ringing &&
      c.caller.toText() !== myPrincipal &&
      c.callees.some((p) => p.toText() === myPrincipal),
  );

  if (incomingCalls.length === 0) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2"
      style={{
        animation: "slideDown 0.3s cubic-bezier(0.4,0,0.2,1) both",
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -24px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      {incomingCalls.map((call) => (
        <BannerItem key={call.id.toString()} call={call} />
      ))}
    </div>
  );
}
