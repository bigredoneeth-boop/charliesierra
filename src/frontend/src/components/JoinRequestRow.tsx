import type { JoinRequest } from "@/backend";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { useRef, useState } from "react";

function formatRelativeTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ms).toLocaleDateString();
}

interface JoinRequestRowProps {
  request: JoinRequest;
  groupName: string;
  onApprove: (requestId: string, conversationId: bigint) => void;
  onDeny: (requestId: string, conversationId: bigint, reason?: string) => void;
  isActioning?: boolean;
  index: number;
}

export function JoinRequestRow({
  request,
  groupName,
  onApprove,
  onDeny,
  isActioning = false,
  index,
}: JoinRequestRowProps) {
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const denyRef = useRef<HTMLTextAreaElement>(null);

  const requesterShort = `${request.requesterId.toText().slice(0, 12)}\u2026`;

  const handleOpenDeny = () => {
    setShowDenyDialog(true);
    setTimeout(() => denyRef.current?.focus(), 50);
  };

  const handleConfirmDeny = () => {
    onDeny(
      request.requestId,
      request.conversationId,
      denyReason.trim() || undefined,
    );
    setShowDenyDialog(false);
    setDenyReason("");
  };

  const handleCancelDeny = () => {
    setShowDenyDialog(false);
    setDenyReason("");
  };

  return (
    <tr
      className="hover:bg-muted/20 transition-colors align-top"
      data-ocid={`admin.join_request.${index}`}
    >
      <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">
        {groupName}
      </td>
      <td className="px-4 py-3">
        <span
          className="font-mono text-xs text-muted-foreground"
          title={request.requesterId.toText()}
        >
          {requesterShort}
        </span>
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        {request.message ? (
          <span className="text-xs text-foreground line-clamp-2">
            {request.message}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            No message
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {formatRelativeTime(request.createdAt)}
      </td>
      <td className="px-4 py-3">
        {showDenyDialog ? (
          <div className="space-y-2 min-w-[180px]">
            <Textarea
              ref={denyRef}
              placeholder="Optional reason…"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={2}
              className="text-xs resize-none"
              aria-label="Denial reason"
              data-ocid={`admin.join_request_deny_reason.${index}`}
            />
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={handleConfirmDeny}
                disabled={isActioning}
                aria-label="Confirm deny join request"
                data-ocid={`admin.join_request_confirm_deny.${index}`}
              >
                Deny
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={handleCancelDeny}
                aria-label="Cancel deny"
                data-ocid={`admin.join_request_cancel_deny.${index}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-500/10"
              onClick={() =>
                onApprove(request.requestId, request.conversationId)
              }
              disabled={isActioning}
              aria-label={`Approve join request from ${requesterShort}`}
              data-ocid={`admin.join_request_approve.${index}`}
            >
              <Check size={12} className="mr-1" />
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={handleOpenDeny}
              disabled={isActioning}
              aria-label={`Deny join request from ${requesterShort}`}
              data-ocid={`admin.join_request_deny.${index}`}
            >
              <X size={12} className="mr-1" />
              Deny
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
