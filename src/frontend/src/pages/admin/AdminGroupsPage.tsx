/**
 * AdminGroupsPage
 * Full Group Management page — /admin/groups
 * Columns: Group Name, Organization, Member Count, Created Date, Created By, Status, Actions
 * Side panel: member list + force remove with confirmation
 */
import type { GroupAdminRecord, GroupMemberRecord, OrgRecord } from "@/backend";
import { GroupStatus } from "@/backend";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAllGroups,
  useGroupMembers,
  useOrgs,
  useRemoveMemberFromGroup,
} from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronLeft,
  Copy,
  RefreshCw,
  Search,
  Shield,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// ── Helpers ─────────────────────────────────────────────────────────────────

function shortenPrincipal(p: { toText(): string } | string): string {
  const text = typeof p === "string" ? p : p.toText();
  return text.length > 16 ? `${text.slice(0, 8)}\u2026${text.slice(-6)}` : text;
}

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CopyBtn({ text }: { text: string }) {
  return (
    <button
      type="button"
      aria-label="Copy principal"
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }}
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}

function GroupStatusBadge({ status }: { status: GroupAdminRecord["status"] }) {
  const isActive = status === GroupStatus.active;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.15em]",
        isActive
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
      )}
    >
      {isActive ? "Active" : "Suspended"}
    </span>
  );
}

// ── Member side panel ──────────────────────────────────────────────────────────

interface MemberPanelProps {
  group: GroupAdminRecord;
  orgName: string;
  onClose: () => void;
}

function GroupMemberPanel({ group, orgName, onClose }: MemberPanelProps) {
  const {
    data: members,
    isLoading,
    isError,
    refetch,
  } = useGroupMembers(group.id);
  const removeMutation = useRemoveMemberFromGroup();
  const [confirmMember, setConfirmMember] = useState<GroupMemberRecord | null>(
    null,
  );

  const handleForceRemove = useCallback(
    async (member: GroupMemberRecord) => {
      try {
        await removeMutation.mutateAsync({
          groupId: group.id,
          memberId: member.userId,
        });
        toast.success(`Member removed from ${group.name}`);
        setConfirmMember(null);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to remove member",
        );
      }
    },
    [removeMutation, group.id, group.name],
  );

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to groups"
            data-ocid="groups.panel.close_button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-foreground">
              {group.name}
            </p>
            <p className="font-mono text-[0.6rem] text-muted-foreground">
              {orgName}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-0 border-b border-border">
        <div className="border-r border-border px-4 py-3">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
            Members
          </p>
          <p className="font-mono text-lg font-bold text-foreground">
            {Number(group.memberCount)}
          </p>
        </div>
        <div className="border-r border-border px-4 py-3">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
            Created
          </p>
          <p className="font-mono text-xs text-foreground">
            {formatTimestamp(group.createdAt)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
            Created By
          </p>
          <p className="font-mono text-xs text-foreground flex items-center">
            {shortenPrincipal(group.createdBy)}
            <CopyBtn text={group.createdBy.toText()} />
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 p-4" data-ocid="groups.panel.loading_state">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {isError && (
          <div
            className="flex flex-col items-center justify-center gap-3 py-12"
            data-ocid="groups.panel.error_state"
          >
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to load members
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-3 w-3" /> Retry
            </Button>
          </div>
        )}
        {!isLoading && !isError && (!members || members.length === 0) && (
          <div
            className="flex flex-col items-center justify-center gap-2 py-12"
            data-ocid="groups.panel.empty_state"
          >
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="font-mono text-xs text-muted-foreground">
              No members found
            </p>
          </div>
        )}
        {!isLoading && !isError && members && members.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Principal", "Display Name", "Joined", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member, idx) => (
                <tr
                  key={`${member.userId.toText()}-${idx}`}
                  className="border-b border-border hover:bg-muted/20 transition-colors"
                  data-ocid={`groups.panel.member.item.${idx + 1}`}
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1 font-mono text-[0.7rem] text-foreground">
                      {shortenPrincipal(member.userId)}
                      <CopyBtn text={member.userId.toText()} />
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {member.displayName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[0.7rem] text-muted-foreground">
                    {formatTimestamp(member.joinedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmMember(member)}
                      data-ocid={`groups.panel.force_remove.${idx + 1}`}
                    >
                      <UserMinus className="mr-1.5 h-3 w-3" /> Force Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog
        open={!!confirmMember}
        onOpenChange={(open) => !open && setConfirmMember(null)}
      >
        <DialogContent data-ocid="groups.panel.confirm_remove.dialog">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm uppercase tracking-wide">
              Confirm Force Remove
            </DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-mono font-semibold">
                {confirmMember ? shortenPrincipal(confirmMember.userId) : ""}
              </span>{" "}
              from <span className="font-semibold">{group.name}</span>? This
              action is audited and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmMember(null)}
              data-ocid="groups.panel.confirm_remove.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() =>
                confirmMember && void handleForceRemove(confirmMember)
              }
              data-ocid="groups.panel.confirm_remove.confirm_button"
            >
              {removeMutation.isPending ? "Removing…" : "Force Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AdminGroupsPage() {
  const [search, setSearch] = useState("");
  const [filterOrgId, setFilterOrgId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "suspended"
  >("all");
  const [page, setPage] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<GroupAdminRecord | null>(
    null,
  );

  const orgsQuery = useOrgs({ limit: BigInt(100) });
  const orgs: OrgRecord[] = orgsQuery.data?.orgs ?? [];

  const groupsReq = filterOrgId !== "all" ? { orgId: filterOrgId } : {};
  const {
    data: allGroups = [],
    isLoading,
    isError,
    refetch,
  } = useAllGroups(groupsReq);

  const filtered = useMemo(() => {
    let groups = allGroups;
    if (search.trim()) {
      const q = search.toLowerCase();
      groups = groups.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (filterOrgId !== "all") {
      groups = groups.filter((g) => g.orgId === filterOrgId);
    }
    if (filterStatus !== "all") {
      groups = groups.filter((g) =>
        filterStatus === "active"
          ? g.status === GroupStatus.active
          : g.status === GroupStatus.suspended,
      );
    }
    return groups;
  }, [allGroups, search, filterOrgId, filterStatus]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const orgNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const org of orgs) m[org.id] = org.name;
    return m;
  }, [orgs]);

  const getOrgName = (orgId: string | undefined) =>
    orgId ? (orgNameMap[orgId] ?? orgId) : "—";

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(0);
  };
  const handleFilterOrg = (v: string) => {
    setFilterOrgId(v);
    setPage(0);
  };
  const handleFilterStatus = (v: "all" | "active" | "suspended") => {
    setFilterStatus(v);
    setPage(0);
  };

  return (
    <AdminLayout
      title="GROUP MANAGEMENT"
      action={
        <Button
          variant="outline"
          size="sm"
          className="h-8 font-mono text-xs"
          onClick={() => void refetch()}
          data-ocid="groups.refresh_button"
        >
          <RefreshCw className="mr-2 h-3 w-3" /> Refresh
        </Button>
      }
    >
      <div className="flex h-full gap-0">
        <div
          className={cn(
            "flex flex-1 flex-col space-y-4 min-w-0",
            selectedGroup && "hidden lg:flex",
          )}
        >
          <div
            className="flex items-center gap-2 border border-amber-500/30 bg-amber-500/5 px-4 py-2.5"
            style={{ borderLeftWidth: "3px", borderLeftColor: "#d97706" }}
            data-ocid="groups.audit_banner"
          >
            <Shield className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="font-mono text-[0.65rem] text-amber-800 dark:text-amber-300">
              All actions are audited and immutable on the Internet Computer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search groups…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-8 pl-8 font-mono text-xs"
                data-ocid="groups.search_input"
              />
            </div>
            <select
              value={filterOrgId}
              onChange={(e) => handleFilterOrg(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              data-ocid="groups.org_filter.select"
            >
              <option value="all">All Organizations</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) =>
                handleFilterStatus(
                  e.target.value as "all" | "active" | "suspended",
                )
              }
              className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              data-ocid="groups.status_filter.select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="border border-border bg-card overflow-x-auto">
            <div className="border-b border-border bg-muted/20 px-4 py-2 flex items-center justify-between">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                Groups
              </p>
              {!isLoading && (
                <p className="font-mono text-[0.6rem] text-muted-foreground">
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  {[
                    "Group Name",
                    "Organization",
                    "Members",
                    "Created Date",
                    "Created By",
                    "Status",
                    "Actions",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-left font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 7 }).map((__, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {isError && !isLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center"
                      data-ocid="groups.error_state"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <p className="text-sm text-muted-foreground">
                          Failed to load groups
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void refetch()}
                        >
                          <RefreshCw className="mr-2 h-3 w-3" /> Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && paginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center"
                      data-ocid="groups.empty_state"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="font-mono text-xs text-muted-foreground">
                          {search ||
                          filterOrgId !== "all" ||
                          filterStatus !== "all"
                            ? "No groups match your filters"
                            : "No groups found"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !isError &&
                  paginated.map((group, idx) => (
                    <tr
                      key={group.id.toString()}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                      data-ocid={`groups.table.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">
                          {group.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {getOrgName(group.orgId)}
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">
                        {Number(group.memberCount)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[0.7rem] text-muted-foreground">
                        {formatTimestamp(group.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 font-mono text-[0.7rem] text-muted-foreground">
                          {shortenPrincipal(group.createdBy)}
                          <CopyBtn text={group.createdBy.toText()} />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <GroupStatusBadge status={group.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 font-mono text-[0.7rem]"
                          onClick={() => setSelectedGroup(group)}
                          data-ocid={`groups.view_members.${idx + 1}`}
                        >
                          <Users className="mr-1.5 h-3 w-3" /> View Members
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <p className="font-mono text-[0.6rem] text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 font-mono text-xs"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    data-ocid="groups.pagination_prev"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 font-mono text-xs"
                    disabled={page >= totalPages - 1}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    data-ocid="groups.pagination_next"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedGroup && (
          <div
            className="w-full lg:w-[480px] flex-shrink-0"
            data-ocid="groups.members.panel"
          >
            <GroupMemberPanel
              group={selectedGroup}
              orgName={getOrgName(selectedGroup.orgId)}
              onClose={() => setSelectedGroup(null)}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
