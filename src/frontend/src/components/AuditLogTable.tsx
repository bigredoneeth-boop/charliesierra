/**
 * AuditLogTable
 * Read-only, immutable-feel table for displaying AuditEvent records.
 * All 25 AuditEventType variants are mapped to human-readable labels and colors.
 * Columns: Timestamp · Actor · Action Type · Target · Organization · Details
 */
import type { AuditEvent } from "@/backend";
import { AuditEventType } from "@/backend";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, ShieldCheck } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

// ── Event type metadata ──────────────────────────────────────────────────────
type EventTypeMeta = { label: string; className: string };

export const EVENT_TYPE_META: Record<AuditEventType, EventTypeMeta> = {
  [AuditEventType.userRegistered]: {
    label: "User Registered",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  [AuditEventType.userInvited]: {
    label: "User Invited",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  [AuditEventType.userRemoved]: {
    label: "User Removed",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
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
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  [AuditEventType.memberRoleChanged]: {
    label: "Role Changed",
    className:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  [AuditEventType.memberSuspended]: {
    label: "Member Suspended",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  [AuditEventType.memberReactivated]: {
    label: "Member Reactivated",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  [AuditEventType.adminAction]: {
    label: "Admin Action",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  [AuditEventType.orgCreated]: {
    label: "Org Created",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  [AuditEventType.orgUpdated]: {
    label: "Org Updated",
    className:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  [AuditEventType.orgSuspended]: {
    label: "Org Suspended",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  [AuditEventType.orgDeleted]: {
    label: "Org Deleted",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
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
  [AuditEventType.groupMemberRemoved]: {
    label: "Group Member Removed",
    className:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  [AuditEventType.compartmentAssigned]: {
    label: "Compartment Assigned",
    className:
      "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  [AuditEventType.keyRecoveryInitiated]: {
    label: "Recovery Initiated",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  [AuditEventType.keyRecoveryApproved]: {
    label: "Recovery Approved",
    className:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  [AuditEventType.keyRecoveryRejected]: {
    label: "Recovery Rejected",
    className: "bg-neutral-500/10 text-muted-foreground border-neutral-500/20",
  },
  [AuditEventType.policyReportExported]: {
    label: "Report Exported",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  [AuditEventType.policyExpiryCheckPerformed]: {
    label: "Expiry Check",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  [AuditEventType.legalHoldPlaced]: {
    label: "Legal Hold Placed",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  [AuditEventType.legalHoldRemoved]: {
    label: "Legal Hold Removed",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  [AuditEventType.retentionPolicyCreated]: {
    label: "Retention Policy Created",
    className:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  [AuditEventType.retentionPolicyUpdated]: {
    label: "Retention Policy Updated",
    className:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
  [AuditEventType.platformSettingsUpdated]: {
    label: "Platform Settings Updated",
    className:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  [AuditEventType.orgSettingsUpdated]: {
    label: "Org Settings Updated",
    className:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
};

const FALLBACK_META: EventTypeMeta = {
  label: "Admin Action",
  className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Decode Uint8Array as UTF-8 detail string (admin logs are stored as plaintext). */
export function decodeDetails(bytes: Uint8Array | undefined): string {
  if (!bytes || bytes.length === 0) return "";
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return "[binary data]";
  }
}

/** Shorten a principal: first8…last6 */
export function shortenPrincipal(text: string): string {
  return text.length > 16 ? `${text.slice(0, 8)}\u2026${text.slice(-6)}` : text;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PrincipalCell({ value }: { value: string }) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      toast.success("Principal copied", { duration: 2000 });
    });
  }, [value]);

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <span className="text-foreground" title={value}>
        {shortenPrincipal(value)}
      </span>
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

const SKEL_IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

function SkeletonRows() {
  return (
    <>
      {SKEL_IDS.map((sid) => (
        <tr key={sid} className="border-b border-border">
          {[44, 28, 20, 20, 16, 36, 16].map((w) => (
            <td key={w} className="px-4 py-3">
              <Skeleton
                className="h-4 rounded"
                style={{ width: `${w * 4}px` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AuditLogTableProps {
  events: AuditEvent[];
  isLoading: boolean;
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuditLogTable({ events, isLoading }: AuditLogTableProps) {
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
    <div data-ocid="audit.table_container" className="overflow-x-auto">
      <table
        className="w-full text-sm cursor-default select-text"
        data-ocid="audit.table"
      >
        <thead className="bg-muted/40 border-b border-border sticky top-0 z-10">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              Timestamp
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Actor
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              Action Type
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Target
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Organization
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Details
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              IP
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            <SkeletonRows />
          ) : (
            events.map((event, idx) => {
              const meta = EVENT_TYPE_META[event.eventType] ?? FALLBACK_META;
              const ts = new Date(Number(event.timestamp) / 1_000_000);
              const details = decodeDetails(event.encryptedDetails);
              return (
                <tr
                  key={event.id.toString()}
                  className="transition-colors duration-100"
                  data-ocid={`audit.row.${idx + 1}`}
                >
                  {/* Timestamp */}
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono"
                    title={ts.toISOString()}
                  >
                    {ts.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>

                  {/* Actor */}
                  <td className="px-4 py-3">
                    <PrincipalCell value={event.actorPrincipal.toText()} />
                  </td>

                  {/* Action Type */}
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium border whitespace-nowrap ${meta.className}`}
                    >
                      {meta.label}
                    </Badge>
                  </td>

                  {/* Target */}
                  <td className="px-4 py-3">
                    {event.targetPrincipal ? (
                      <PrincipalCell value={event.targetPrincipal.toText()} />
                    ) : (
                      <span className="text-xs text-muted-foreground/40">
                        —
                      </span>
                    )}
                  </td>

                  {/* Organization */}
                  <td className="px-4 py-3">
                    {event.orgId ? (
                      <span
                        className="font-mono text-xs text-muted-foreground"
                        title={event.orgId}
                      >
                        {event.orgId.length > 12
                          ? `${event.orgId.slice(0, 10)}…`
                          : event.orgId}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">
                        Platform
                      </span>
                    )}
                  </td>

                  {/* Details */}
                  <td className="px-4 py-3 max-w-xs">
                    {details ? (
                      <span
                        className="text-xs text-muted-foreground line-clamp-2 break-words"
                        title={details}
                      >
                        {details}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">
                        —
                      </span>
                    )}
                  </td>

                  {/* IP — not available in AuditEvent schema */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground/40">—</span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
