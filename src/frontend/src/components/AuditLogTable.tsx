import type { AuditEvent } from "@/backend";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditEventType } from "@/types/audit";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

type EventTypeMeta = {
  label: string;
  className: string;
};

const EVENT_TYPE_META: Record<AuditEventType, EventTypeMeta> = {
  [AuditEventType.userRegistered]: {
    label: "User Registered",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  [AuditEventType.messageSent]: {
    label: "Message Sent",
    className:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  [AuditEventType.callInitiated]: {
    label: "Call Initiated",
    className:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  [AuditEventType.memberAdded]: {
    label: "Member Added",
    className:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  [AuditEventType.memberRemoved]: {
    label: "Member Removed",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  [AuditEventType.adminAction]: {
    label: "Admin Action",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  [AuditEventType.userRemoved]: {
    label: "User Removed",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  [AuditEventType.retentionEnabled]: {
    label: "Retention Enabled",
    className:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  [AuditEventType.retentionDisabled]: {
    label: "Retention Disabled",
    className:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  [AuditEventType.escrowEnrolled]: {
    label: "Escrow Enrolled",
    className:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  [AuditEventType.escrowRevoked]: {
    label: "Escrow Revoked",
    className:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  [AuditEventType.escrowAccessGranted]: {
    label: "Escrow Access",
    className:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  [AuditEventType.auditLogExported]: {
    label: "Log Exported",
    className:
      "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
  },
  [AuditEventType.messageQueueDrained]: {
    label: "Queue Drained",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  [AuditEventType.priorityMessageSent]: {
    label: "Priority Sent",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  [AuditEventType.sovereignConfigUpdated]: {
    label: "Sovereign Updated",
    className:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  [AuditEventType.compartmentAssigned]: {
    label: "Compartment Assigned",
    className:
      "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
};

function PrincipalCell({ value }: { value: string }) {
  const short = `${value.slice(0, 8)}…`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      toast.success("Principal copied", { duration: 2000 });
    });
  }, [value]);

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <span className="text-foreground">{short}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy principal"
        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <Copy size={11} />
      </button>
    </div>
  );
}

const AUDIT_SKEL_IDS = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
] as const;

function SkeletonRows() {
  return (
    <>
      {AUDIT_SKEL_IDS.map((sid) => (
        <tr key={sid} className="border-b border-border">
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-24 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-28" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20 rounded-full" />
          </td>
        </tr>
      ))}
    </>
  );
}

interface AuditLogTableProps {
  events: AuditEvent[];
  isLoading: boolean;
}

export function AuditLogTable({ events, isLoading }: AuditLogTableProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(events.length / PAGE_SIZE);
  const pageEvents = events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  if (!isLoading && events.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No audit events found"
        description="Security events will appear here when users interact with CharlieSierra."
        ocid="audit.empty_state"
      />
    );
  }

  return (
    <div data-ocid="audit.table_container">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-ocid="audit.table">
          <thead className="bg-muted/40 border-b border-border sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Event Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actor
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Target
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Time
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <SkeletonRows />
            ) : (
              pageEvents.map((event, idx) => {
                const meta =
                  EVENT_TYPE_META[event.eventType] ??
                  EVENT_TYPE_META[AuditEventType.adminAction];
                const globalIdx = page * PAGE_SIZE + idx + 1;
                return (
                  <tr
                    key={event.id.toString()}
                    className="hover:bg-muted/20 transition-colors duration-150"
                    data-ocid={`audit.row.${globalIdx}`}
                  >
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border ${meta.className}`}
                      >
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <PrincipalCell value={event.actorPrincipal.toText()} />
                    </td>
                    <td className="px-4 py-3">
                      {event.targetPrincipal ? (
                        <PrincipalCell value={event.targetPrincipal.toText()} />
                      ) : (
                        <span className="text-xs text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(
                        Number(event.timestamp) / 1_000_000,
                      ).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Lock size={10} className="text-muted-foreground/60" />
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground border-border"
                        >
                          Encrypted
                        </Badge>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} &middot; {events.length} events
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={page === 0}
              data-ocid="audit.pagination_prev"
              className="h-7 w-7 p-0"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={page >= totalPages - 1}
              data-ocid="audit.pagination_next"
              className="h-7 w-7 p-0"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
