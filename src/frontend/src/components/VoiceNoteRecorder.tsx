import type { ConversationId } from "@/backend";
import { MessageType } from "@/backend";
import { Button } from "@/components/ui/button";
import { useCrypto } from "@/context/crypto-context";
import { useBackend } from "@/hooks/use-backend";
import { Loader2, Mic, MicOff, Play, Send, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceNoteRecorderProps {
  conversationId: ConversationId;
  onClose: () => void;
  onSent: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/** Convert Uint8Array storage key bytes to hex string */
function keyToHex(key: Uint8Array): string {
  return Array.from(key)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type RecorderState = "idle" | "recording" | "preview" | "sending";

export function VoiceNoteRecorder({
  conversationId,
  onClose,
  onSent,
}: VoiceNoteRecorderProps) {
  const { encryptForConv, getConversationKey } = useCrypto();
  const { backend, uploadBlob } = useBackend();
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        for (const t of stream.getTracks()) t.stop();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState("preview");
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError("Microphone access denied.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }, []);

  const discard = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    setState("idle");
  }, [audioUrl]);

  const sendVoiceNote = useCallback(async () => {
    if (!audioBlob || !backend || !uploadBlob) return;
    const convKey = getConversationKey(conversationId.toString());
    if (!convKey) {
      setError("Encryption key not available.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      const { ExternalBlob } = await import("@/backend");
      const arrayBuf = await audioBlob.arrayBuffer();
      const { encryptBlob } = await import("@/lib/crypto");
      const encrypted = await encryptBlob(convKey, arrayBuf);

      // Upload encrypted audio blob to object-storage.
      // Allocate a brand-new, fully-isolated ArrayBuffer and copy the encrypted
      // bytes into it byte-by-byte. This guarantees the backing buffer is not
      // shared with the IV-prepend stage of encryptBlob(), which can produce a
      // non-zero byteOffset composite view that confuses the blob_tree hasher
      // and causes a 403 "Invalid Payload" when the hashes don't match the data.
      const isolatedBuffer = new ArrayBuffer(encrypted.byteLength);
      new Uint8Array(isolatedBuffer).set(encrypted);
      const safeBytes = new Uint8Array(
        isolatedBuffer,
      ) as Uint8Array<ArrayBuffer>;
      const externalBlob = ExternalBlob.fromBytes(safeBytes);
      const storageKeyBytes = await uploadBlob(externalBlob);
      const storageKey = keyToHex(storageKeyBytes);

      const metaText = JSON.stringify({ duration, mimeType: audioBlob.type });
      const encryptedContent = await encryptForConv(
        conversationId.toString(),
        metaText,
      );
      if (!encryptedContent) throw new Error("Encryption failed");

      const msgResult = await backend.sendMessage({
        conversationId,
        encryptedContent,
        messageType: MessageType.audio,
      });
      if (msgResult.__kind__ === "err") throw new Error(msgResult.err);

      const msgId = msgResult.ok.id;
      const attachResult = await backend.registerAttachment({
        messageId: msgId,
        mimeType: audioBlob.type,
        encryptedSizeBytes: BigInt(encrypted.byteLength),
        storageKey,
      });
      if (attachResult.__kind__ === "err") throw new Error(attachResult.err);

      onSent();
      discard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send voice note",
      );
      setState("preview");
    }
  }, [
    audioBlob,
    backend,
    uploadBlob,
    conversationId,
    duration,
    encryptForConv,
    getConversationKey,
    onSent,
    discard,
  ]);

  return (
    <div
      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 shadow-message"
      data-ocid="voicenote.panel"
    >
      {state === "idle" && (
        <>
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
            data-ocid="voicenote.record_button"
          >
            <Mic size={18} className="text-primary" />
            <span>Tap to record</span>
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="voicenote.close_button"
          >
            <MicOff size={16} />
          </button>
        </>
      )}

      {state === "recording" && (
        <>
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <span className="text-sm font-mono text-foreground min-w-[48px]">
            {formatDuration(duration)}
          </span>
          <span className="text-xs text-muted-foreground">Recording...</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity"
            data-ocid="voicenote.stop_button"
          >
            <Square size={12} fill="currentColor" />
            Stop
          </button>
        </>
      )}

      {state === "preview" && audioUrl && (
        <>
          <button
            type="button"
            onClick={() => audioRef.current?.play()}
            className="text-primary hover:opacity-80 transition-opacity"
            data-ocid="voicenote.play_button"
            aria-label="Play preview"
          >
            <Play size={18} fill="currentColor" />
          </button>
          <audio ref={audioRef} src={audioUrl} className="sr-only">
            <track kind="captions" />
          </audio>
          <span className="text-sm font-mono text-muted-foreground min-w-[48px]">
            {formatDuration(duration)}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={discard}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            data-ocid="voicenote.delete_button"
            aria-label="Discard recording"
          >
            <Trash2 size={16} />
          </button>
          <Button
            type="button"
            size="sm"
            onClick={sendVoiceNote}
            data-ocid="voicenote.submit_button"
          >
            <Send size={14} className="mr-1" />
            Send
          </Button>
        </>
      )}

      {state === "sending" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Encrypting &amp; sending...
        </div>
      )}

      {error && (
        <p
          className="text-xs text-destructive"
          data-ocid="voicenote.error_state"
        >
          {error}
        </p>
      )}
    </div>
  );
}
