import { Button } from "@/components/ui/button";
import type { PendingMessage } from "@/lib/offline-queue";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";

interface QueuedMessageBubbleProps {
  message: PendingMessage;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  decryptedPreview?: string | null;
}

export function QueuedMessageBubble({
  message,
  onRetry,
  onDelete,
  decryptedPreview,
}: QueuedMessageBubbleProps) {
  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isHigh = message.priority === "high";

  return (
    <div
      className="flex items-end gap-2 flex-row-reverse mt-0.5"
      data-ocid={`queue.item.${message.id}`}
    >
      <div className="w-8 flex-shrink-0" />

      <div className="relative max-w-[70%] min-w-0 items-end flex flex-col opacity-60">
        {/* Bubble */}
        <div
          className={`rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-message break-words ${
            isHigh
              ? "bg-primary/80 text-primary-foreground"
              : "bg-primary/60 text-primary-foreground"
          }`}
        >
          {decryptedPreview ? (
            <span className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {decryptedPreview}
            </span>
          ) : (
            <span className="text-sm opacity-70 italic">
              [Encrypted message]
            </span>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center gap-2 mt-0.5 px-1">
          <span className="text-[10px] text-muted-foreground">{timeStr}</span>

          {message.status === "sending" && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 size={10} className="animate-spin" />
              Sending…
            </span>
          )}

          {message.status === "failed" && (
            <span className="flex items-center gap-1 text-[10px] text-destructive">
              <AlertCircle size={10} />
              {message.errorReason === "expired" ? "Expired" : "Failed"}
            </span>
          )}

          {message.status === "pending" && (
            <span className="text-[10px] text-muted-foreground">Queued</span>
          )}
        </div>

        {/* Actions for failed messages */}
        {message.status === "failed" && message.errorReason !== "expired" && (
          <div className="flex items-center gap-1 mt-1 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-primary hover:bg-primary/10"
              onClick={() => onRetry(message.id)}
              data-ocid={`queue.retry_button.${message.id}`}
            >
              Retry
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px] text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(message.id)}
              data-ocid={`queue.delete_button.${message.id}`}
            >
              <Trash2 size={8} className="mr-0.5" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
