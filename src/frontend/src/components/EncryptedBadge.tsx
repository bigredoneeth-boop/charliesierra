import { Lock } from "lucide-react";

interface EncryptedBadgeProps {
  compact?: boolean;
  className?: string;
}

export function EncryptedBadge({
  compact = false,
  className = "",
}: EncryptedBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium ${className}`}
      title="End-to-end encrypted"
      aria-label="End-to-end encrypted"
    >
      <Lock size={11} className="flex-shrink-0" />
      {!compact && <span>End-to-end encrypted</span>}
    </div>
  );
}
