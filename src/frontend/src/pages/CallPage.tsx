import { CallStatus } from "@/backend";
import { CallControls } from "@/components/CallControls";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useCrypto } from "@/context/crypto-context";
import type { CallRecordPublic } from "@/hooks/use-calls";
import {
  useAnswerCall,
  useCall,
  useEndCall,
  useInitiateCall,
} from "@/hooks/use-calls";
import { useUserProfile } from "@/hooks/use-profiles";
import { decryptMessage, encryptMessage, generateGroupKey } from "@/lib/crypto";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Phone, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Simple symmetric key for this call session (caller generates, embeds in SDP envelope)
const STUN_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function AudioWaves() {
  return (
    <div className="flex items-end gap-1 h-8" aria-hidden="true">
      {[0.4, 0.7, 1, 0.7, 0.4, 0.6, 0.9, 0.6].map((scale, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: decorative animation bars
          key={i}
          className="w-1.5 rounded-full bg-primary/70 animate-pulse"
          style={{
            height: `${scale * 28}px`,
            animationDelay: `${i * 0.12}s`,
            animationDuration: "1.1s",
          }}
        />
      ))}
    </div>
  );
}

function RingingOutgoing({
  peer,
}: { peer: CallRecordPublic["callees"][0] | null }) {
  const { data: profile } = useUserProfile(peer);
  const principalStr = peer?.toText() ?? "";
  return (
    <div className="flex flex-col items-center gap-6">
      <UserAvatar principal={principalStr} size={96} />
      <div className="text-center">
        <p className="text-xl font-semibold text-foreground">
          {profile?.encryptedDisplayName
            ? "Calling…"
            : `Calling ${principalStr.slice(0, 8)}…`}
        </p>
        <p className="text-sm text-muted-foreground mt-1">Waiting for answer</p>
      </div>
      <LoadingSpinner size={28} label="Ringing" />
    </div>
  );
}

function RingingIncoming({
  call,
  onAccept,
  onDecline,
}: {
  call: CallRecordPublic;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { data: profile } = useUserProfile(call.caller);
  const principalStr = call.caller.toText();
  return (
    <div className="flex flex-col items-center gap-6">
      <UserAvatar principal={principalStr} size={96} />
      <div className="text-center">
        <p className="text-xl font-semibold text-foreground">
          {profile ? "Incoming call" : `${principalStr.slice(0, 8)}…`}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-1 text-muted-foreground text-sm">
          <Phone size={14} />
          <span>Voice call</span>
        </div>
      </div>
      <div className="flex gap-6">
        <button
          type="button"
          data-ocid="call.decline_button"
          onClick={onDecline}
          className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-elevated transition-smooth hover:scale-105 active:scale-95"
          aria-label="Decline call"
        >
          <PhoneOff size={24} />
        </button>
        <button
          type="button"
          data-ocid="call.accept_button"
          onClick={onAccept}
          className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elevated transition-smooth hover:scale-105 active:scale-95"
          aria-label="Accept call"
        >
          <Phone size={24} />
        </button>
      </div>
    </div>
  );
}

export default function CallPage() {
  const { id } = useParams({ from: "/app/calls/$id" });
  const callId = BigInt(id);
  const navigate = useNavigate();
  const { principal } = useAuth();
  const { data: call, isLoading } = useCall(callId);
  const initiateCall = useInitiateCall();
  const answerCall = useAnswerCall();
  const endCall = useEndCall();

  const { getConversationKey, deriveAndStoreKey, setConversationKey } =
    useCrypto();

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const seenCandidateCount = useRef(0);
  const callerSetupDone = useRef(false);
  const calleeSetupDone = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const isCaller =
    principal && call ? call.caller.toText() === principal.toText() : null;

  // Get or create the session key from the conversation's shared key
  const getSessionKey = useCallback(async (): Promise<CryptoKey> => {
    const convIdStr = call?.conversationId?.toString();
    if (convIdStr) {
      const existing = getConversationKey(convIdStr);
      if (existing) return existing;
      // Derive key from peers if not yet available
      if (call && call.callees.length > 0) {
        const derived = await deriveAndStoreKey(convIdStr, new Uint8Array(0));
        if (derived) return derived;
      }
    }
    // Fallback: generate a per-call group key and store it
    const fallbackKey = await generateGroupKey();
    if (convIdStr) setConversationKey(convIdStr, fallbackKey);
    return fallbackKey;
  }, [call, getConversationKey, deriveAndStoreKey, setConversationKey]);

  const encryptSdp = useCallback(
    async (sdp: string): Promise<Uint8Array> => {
      const key = await getSessionKey();
      return encryptMessage(key, sdp);
    },
    [getSessionKey],
  );

  const decryptSdp = useCallback(
    async (data: Uint8Array): Promise<string> => {
      const key = await getSessionKey();
      return decryptMessage(key, data);
    },
    [getSessionKey],
  );

  // ── Caller setup: create offer ──────────────────────────────────────────────
  useEffect(() => {
    if (!call || isCaller !== true || call.status !== CallStatus.ringing)
      return;
    if (callerSetupDone.current) return;
    callerSetupDone.current = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection(STUN_CONFIG);
        peerConnectionRef.current = pc;
        for (const track of stream.getTracks()) pc.addTrack(track, stream);

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") setCallActive(true);
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const encryptedOffer = await encryptSdp(JSON.stringify(offer));

        const callee = call.callees[0] ?? null;
        await initiateCall.mutateAsync({
          encryptedSdpOffer: encryptedOffer,
          callees: callee ? [callee] : [],
          callType: call.callType,
          conversationId: Array.isArray(call.conversationId)
            ? call.conversationId[0]
            : call.conversationId,
        });
      } catch (err) {
        setSetupError(err instanceof Error ? err.message : "Setup failed");
      }
    })();
  }, [call, isCaller, encryptSdp, initiateCall]);

  // ── Callee: when answer accepted, set remote description + create answer ────
  const handleAccept = useCallback(async () => {
    if (!call || !call.encryptedSdpOffer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(STUN_CONFIG);
      peerConnectionRef.current = pc;
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setCallActive(true);
      };

      const offerSdp = await decryptSdp(call.encryptedSdpOffer);
      const offer = JSON.parse(offerSdp) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const encryptedAnswer = await encryptSdp(JSON.stringify(answer));

      await answerCall.mutateAsync({
        callId: call.id,
        encryptedSdpAnswer: encryptedAnswer,
      });
      calleeSetupDone.current = true;
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Accept failed");
    }
  }, [call, decryptSdp, encryptSdp, answerCall]);

  // ── Caller: once answer is set on backend, set remote description ───────────
  useEffect(() => {
    if (!call || isCaller !== true || !call.encryptedSdpAnswer) return;
    const pc = peerConnectionRef.current;
    if (!pc || pc.remoteDescription) return;

    (async () => {
      try {
        const answerSdp = await decryptSdp(
          call.encryptedSdpAnswer as Uint8Array,
        );
        const answer = JSON.parse(answerSdp) as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(answer);
      } catch {
        // Ignore if already set
      }
    })();
  }, [call, isCaller, decryptSdp]);

  // ── ICE candidates polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!call) return;
    const pc = peerConnectionRef.current;
    if (!pc) return;
    const candidates = call.iceCandidates;
    if (candidates.length <= seenCandidateCount.current) return;

    const newCandidates = candidates.slice(seenCandidateCount.current);
    seenCandidateCount.current = candidates.length;

    for (const enc of newCandidates) {
      (async () => {
        try {
          const raw = await decryptSdp(enc);
          const candidate = JSON.parse(raw) as RTCIceCandidateInit;
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Stale or invalid candidate
        }
      })();
    }
  }, [call, decryptSdp]);

  // ── Sync active state from call status ──────────────────────────────────────
  useEffect(() => {
    if (call?.status === CallStatus.active) setCallActive(true);
  }, [call?.status]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      peerConnectionRef.current?.close();
      for (const t of localStreamRef.current?.getTracks() ?? []) t.stop();
    };
  }, []);

  const handleEnd = useCallback(async () => {
    if (!call) return;
    peerConnectionRef.current?.close();
    for (const t of localStreamRef.current?.getTracks() ?? []) t.stop();
    await endCall.mutateAsync({ callId: call.id, reason: CallStatus.ended });
    navigate({ to: "/app/conversations" });
  }, [call, endCall, navigate]);

  const handleDecline = useCallback(async () => {
    if (!call) return;
    await endCall.mutateAsync({ callId: call.id, reason: CallStatus.declined });
    navigate({ to: "/app/conversations" });
  }, [call, endCall, navigate]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading || !call) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner size={36} label="Loading call…" fullScreen />
      </div>
    );
  }

  const isTerminated =
    call.status === CallStatus.ended ||
    call.status === CallStatus.declined ||
    call.status === CallStatus.missed;

  // ── Ended / declined / missed ────────────────────────────────────────────────
  if (isTerminated) {
    const statusLabel =
      call.status === CallStatus.declined
        ? "Call declined"
        : call.status === CallStatus.missed
          ? "Missed call"
          : "Call ended";
    return (
      <div
        data-ocid="call.page"
        className="flex h-screen flex-col items-center justify-center gap-6 bg-background"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <PhoneOff size={28} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">{statusLabel}</p>
          <p className="text-sm text-muted-foreground mt-1">Voice call</p>
        </div>
        {call.conversationId && (
          <Button
            data-ocid="call.back_button"
            variant="outline"
            onClick={() =>
              navigate({
                to: "/app/conversations/$id",
                params: { id: call.conversationId!.toString() },
              })
            }
          >
            Back to chat
          </Button>
        )}
        {!call.conversationId && (
          <Button
            data-ocid="call.back_button"
            variant="outline"
            onClick={() => navigate({ to: "/app/conversations" })}
          >
            Back to conversations
          </Button>
        )}
      </div>
    );
  }

  // ── Active audio call ────────────────────────────────────────────────────────
  if (callActive) {
    const callee = call.callees[0] ?? null;
    const peerPrincipal = isCaller ? callee : call.caller;
    const peerStr = peerPrincipal?.toText() ?? "";
    return (
      <div
        data-ocid="call.page"
        className="flex h-screen flex-col items-center justify-center gap-6 bg-background"
      >
        <UserAvatar principal={peerStr} size={96} />
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            {peerStr.slice(0, 8)}…
          </p>
          <p className="text-sm text-muted-foreground mt-1">Call in progress</p>
        </div>
        <AudioWaves />
        <CallControls localStream={localStream} onEnd={handleEnd} />
      </div>
    );
  }

  // ── Ringing ──────────────────────────────────────────────────────────────────
  return (
    <div
      data-ocid="call.page"
      className="flex h-screen flex-col items-center justify-center gap-6 bg-background"
    >
      {isCaller ? (
        <>
          <RingingOutgoing peer={call.callees[0] ?? null} />
          <Button
            data-ocid="call.hangup_button"
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 p-0"
            onClick={handleEnd}
            aria-label="Hang up"
          >
            <PhoneOff size={22} />
          </Button>
        </>
      ) : (
        <RingingIncoming
          call={call}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
      {setupError && (
        <p className="text-sm text-destructive mt-2" role="alert">
          {setupError}
        </p>
      )}
      <footer className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
        <p className="text-[10px] text-muted-foreground/60">
          To report a bug, email{" "}
          <a
            href="mailto:support@charliesierra.io"
            className="underline pointer-events-auto hover:text-muted-foreground transition-colors duration-200"
          >
            support@charliesierra.io
          </a>
        </p>
      </footer>
    </div>
  );
}
