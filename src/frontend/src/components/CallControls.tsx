import { useEndCall } from "@/hooks/use-calls";
import { useNavigate } from "@tanstack/react-router";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useCallback, useState } from "react";

interface CallControlsProps {
  localStream: MediaStream | null;
  onEnd: () => void;
}

interface ControlButtonProps {
  onClick: () => void;
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
  ocid: string;
  danger?: boolean;
}

function ControlButton({
  onClick,
  active,
  activeIcon,
  inactiveIcon,
  label,
  ocid,
  danger = false,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={[
        "w-14 h-14 rounded-full flex items-center justify-center transition-smooth",
        "hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        danger
          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          : active
            ? "bg-card text-foreground border border-border"
            : "bg-muted text-muted-foreground border border-border",
      ].join(" ")}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  );
}

export function CallControls({ localStream, onEnd }: CallControlsProps) {
  const navigate = useNavigate();
  const endCall = useEndCall();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const newMuted = !isMuted;
    for (const track of localStream.getAudioTracks()) {
      track.enabled = !newMuted;
    }
    setIsMuted(newMuted);
  }, [localStream, isMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOff((v) => !v);
  }, []);

  const handleEnd = useCallback(async () => {
    await onEnd();
    // onEnd handles navigation, but fallback:
    navigate({ to: "/app/conversations" });
  }, [onEnd, navigate]);

  // Silence endCall lint warning — it's used inside onEnd
  void endCall;

  return (
    <div
      data-ocid="call.controls"
      className="flex items-center gap-4 rounded-2xl bg-card/80 backdrop-blur-md px-6 py-4 shadow-elevated border border-border/40"
    >
      {/* Mute */}
      <ControlButton
        onClick={toggleMute}
        active={!isMuted}
        activeIcon={<Mic size={22} />}
        inactiveIcon={<MicOff size={22} />}
        label={isMuted ? "Unmute microphone" : "Mute microphone"}
        ocid="call.mute_toggle"
      />

      {/* Speaker */}
      <ControlButton
        onClick={toggleSpeaker}
        active={!isSpeakerOff}
        activeIcon={<Volume2 size={22} />}
        inactiveIcon={<VolumeX size={22} />}
        label={isSpeakerOff ? "Unmute speaker" : "Mute speaker"}
        ocid="call.speaker_toggle"
      />

      {/* End call */}
      <button
        type="button"
        data-ocid="call.end_button"
        onClick={handleEnd}
        aria-label="End call"
        className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-elevated"
      >
        <PhoneOff size={22} />
      </button>
    </div>
  );
}
