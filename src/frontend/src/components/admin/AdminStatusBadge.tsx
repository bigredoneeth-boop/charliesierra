/**
 * AdminStatusBadge
 * Compact, accessible status badge for user, org, and invite statuses.
 * Uses semantic design tokens — no raw color classes.
 */
import { cn } from "@/lib/utils";

export type AdminStatusValue =
  | "active"
  | "suspended"
  | "pending"
  | "archived"
  | "revoked"
  | "expired";

interface AdminStatusBadgeProps {
  status: AdminStatusValue;
  /** Optional explicit aria-label; defaults to capitalised status text */
  label?: string;
  className?: string;
}

/** Maps status → Tailwind token classes (semantic only, never raw colors) */
const STATUS_STYLES: Record<AdminStatusValue, string> = {
  active:
    "bg-[oklch(var(--success)/0.15)] text-[oklch(var(--success))] border-[oklch(var(--success)/0.35)]",
  suspended:
    "bg-[oklch(var(--destructive)/0.12)] text-[oklch(var(--destructive))] border-[oklch(var(--destructive)/0.35)]",
  revoked:
    "bg-[oklch(var(--destructive)/0.12)] text-[oklch(var(--destructive))] border-[oklch(var(--destructive)/0.35)]",
  pending:
    "bg-[oklch(var(--warning)/0.15)] text-[oklch(var(--warning-foreground))] border-[oklch(var(--warning)/0.4)]",
  archived: "bg-muted text-muted-foreground border-border",
  expired: "bg-muted text-muted-foreground border-border",
};

export function AdminStatusBadge({
  status,
  label,
  className,
}: AdminStatusBadgeProps) {
  const displayLabel = label ?? status.toUpperCase();
  return (
    <span
      aria-label={displayLabel}
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5",
        "font-mono text-[0.65rem] font-semibold tracking-widest uppercase",
        "select-none whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}
