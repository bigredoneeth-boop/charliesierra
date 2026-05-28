/**
 * AdminUsersPage
 * Full User Management page for the CharlieSierra Admin Console.
 *
 * Features:
 * - Role guard (OrgAdmin or SuperAdmin only)
 * - Cross-org user list (SuperAdmin sees all via orgId: undefined)
 * - Search bar (debounced 300ms, passed to backend)
 * - Filter by Organization, Role, and Status (client-side)
 * - Paginated table with Load More (accumulated members)
 * - Principal truncation + copy-to-clipboard
 * - Organization column mapped from org list
 * - Role badges, status badges, relative last-active time
 * - Invite / Change Role / Suspend / Reactivate / Remove dialogs
 * - SuperAdmin members: no management actions shown
 * - Amber HIGH SECURITY ENVIRONMENT banner
 */
import type { OrgMembership, OrgRecord, OrgRole } from "@/backend";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInviteUser,
  useIsSuperAdmin,
  useMyOrgs,
  useMyRole,
  useOrgUsers,
  useOrgs,
  useReactivateMember,
  useRemoveMember,
  useSuspendMember,
  useUpdateMemberRole,
} from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncatePrincipal(p: string): string {
  if (p.length <= 20) return p;
  return `${p.slice(0, 8)}…${p.slice(-4)}`;
}

function relativeTime(ts: bigint | undefined): string {
  if (!ts) return "Never";
  try {
    const ms = Number(ts / BigInt(1_000_000));
    const sec = Math.floor((Date.now() - ms) / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    const days = Math.floor(sec / 86400);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
  } catch {
    return "—";
  }
}

// ── Role helpers ──────────────────────────────────────────────────────────────

type RoleKey = "SuperAdmin" | "OrgAdmin" | "Auditor" | "StandardUser";

function roleKey(role: OrgRole): RoleKey {
  return role as unknown as RoleKey;
}

const ROLE_LABELS: Record<RoleKey, string> = {
  SuperAdmin: "Super Admin",
  OrgAdmin: "Org Admin",
  Auditor: "Auditor",
  StandardUser: "Standard User",
};

const ROLE_BADGE: Record<RoleKey, string> = {
  SuperAdmin: "bg-red-50 text-red-700 border border-red-200",
  OrgAdmin: "bg-orange-50 text-orange-700 border border-orange-200",
  Auditor: "bg-blue-50 text-blue-700 border border-blue-200",
  StandardUser: "bg-muted text-muted-foreground border border-border",
};

function RoleBadge({ role }: { role: OrgRole }) {
  const k = roleKey(role);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5",
        "font-mono text-[0.62rem] font-semibold tracking-wider uppercase select-none whitespace-nowrap",
        ROLE_BADGE[k],
      )}
    >
      {ROLE_LABELS[k]}
    </span>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────

type MemberStatusKey = "Active" | "Suspended" | "Pending";

function memberStatus(m: OrgMembership): MemberStatusKey {
  const s = m.status as unknown as string;
  if (s === "Active") return "Active";
  if (s === "Suspended") return "Suspended";
  return "Pending";
}

const STATUS_BADGE_VALUE = {
  Active: "active",
  Suspended: "suspended",
  Pending: "pending",
} as const;

// ── Copy-to-clipboard hook ────────────────────────────────────────────────────

function useCopyText() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    });
  }, []);

  return { copy, copied };
}

// ── PrincipalCell ─────────────────────────────────────────────────────────────

function PrincipalCell({ principal }: { principal: { toText(): string } }) {
  const text = principal.toText();
  const { copy, copied } = useCopyText();

  return (
    <span className="group inline-flex items-center gap-1.5 min-w-0">
      <span
        className="font-mono text-xs text-foreground tracking-tight select-all"
        title={text}
      >
        {truncatePrincipal(text)}
      </span>
      <button
        type="button"
        aria-label="Copy principal"
        onClick={() => copy(text)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}

// ── Assignable roles (not SuperAdmin — global-only) ───────────────────────────

const ASSIGNABLE_ROLES: { value: RoleKey; label: string }[] = [
  { value: "OrgAdmin", label: "Org Admin" },
  { value: "Auditor", label: "Auditor" },
  { value: "StandardUser", label: "Standard User" },
];

const PAGE_SIZE = BigInt(25);

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={`skel-${i}`} className="border-b border-border">
          <td className="px-4 py-3">
            <Skeleton className="h-3 w-36" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3 w-28" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20 rounded" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16 rounded" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3 w-16" />
          </td>
          <td className="px-4 py-3" />
        </tr>
      ))}
    </>
  );
}

// ── Modal: Invite User ─────────────────────────────────────────────────────────

interface InviteModalProps {
  orgs: OrgRecord[];
  defaultOrgId: string | null;
  open: boolean;
  onClose: () => void;
}

function InviteUserModal({
  orgs,
  defaultOrgId,
  open,
  onClose,
}: InviteModalProps) {
  const [principalId, setPrincipalId] = useState("");
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState(defaultOrgId ?? "");
  const [role, setRole] = useState<RoleKey>("StandardUser");
  const [principalError, setPrincipalError] = useState("");
  const [orgError, setOrgError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const invite = useInviteUser();

  useEffect(() => {
    if (open) setOrgId(defaultOrgId ?? orgs[0]?.id ?? "");
  }, [open, defaultOrgId, orgs]);

  function handleClose() {
    setPrincipalId("");
    setEmail("");
    setRole("StandardUser");
    setPrincipalError("");
    setOrgError("");
    setSubmitError("");
    invite.reset();
    onClose();
  }

  async function handleSubmit() {
    let valid = true;
    if (!principalId.trim()) {
      setPrincipalError("Principal ID is required.");
      valid = false;
    } else {
      setPrincipalError("");
    }
    if (!orgId) {
      setOrgError("Organization is required.");
      valid = false;
    } else {
      setOrgError("");
    }
    if (!valid) return;
    setSubmitError("");
    try {
      await invite.mutateAsync({
        orgId,
        principalId: principalId.trim(),
        email: email.trim() || undefined,
        role: role as unknown as OrgRole,
      });
      toast.success("Invitation sent successfully.");
      handleClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to send invitation.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-md bg-card border border-border shadow-lg"
        data-ocid="admin.users.invite.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest text-foreground uppercase">
            Invite User
          </DialogTitle>
          <DialogDescription className="font-mono text-[0.65rem] text-muted-foreground">
            Add a user to an organization by their Internet Identity principal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Principal ID */}
          <div className="space-y-1.5">
            <Label
              htmlFor="invite-principal"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              Principal ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invite-principal"
              data-ocid="admin.users.invite.principal_input"
              placeholder="aaaaa-bbbbb-ccccc-..."
              value={principalId}
              onChange={(e) => {
                setPrincipalId(e.target.value);
                if (principalError) setPrincipalError("");
                if (submitError) setSubmitError("");
              }}
              className="font-mono text-sm h-9 rounded-sm bg-background"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            {principalError && (
              <p
                data-ocid="admin.users.invite.principal_field_error"
                className="font-mono text-[0.65rem] text-destructive"
              >
                {principalError}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label
              htmlFor="invite-email"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              Email{" "}
              <span className="normal-case text-muted-foreground/60">
                (optional)
              </span>
            </Label>
            <Input
              id="invite-email"
              data-ocid="admin.users.invite.email_input"
              placeholder="user@agency.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono text-sm h-9 rounded-sm bg-background"
              autoComplete="off"
              type="email"
            />
          </div>

          {/* Organization */}
          <div className="space-y-1.5">
            <Label
              htmlFor="invite-org"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              Organization <span className="text-destructive">*</span>
            </Label>
            <Select
              value={orgId}
              onValueChange={(v) => {
                setOrgId(v);
                if (orgError) setOrgError("");
              }}
            >
              <SelectTrigger
                id="invite-org"
                data-ocid="admin.users.invite.org_select"
                className="font-mono text-sm h-9 rounded-sm bg-background"
              >
                <SelectValue placeholder="Select organization…" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {orgs.map((org) => (
                  <SelectItem
                    key={org.id}
                    value={org.id}
                    className="font-mono text-sm"
                  >
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {orgError && (
              <p
                data-ocid="admin.users.invite.org_field_error"
                className="font-mono text-[0.65rem] text-destructive"
              >
                {orgError}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label
              htmlFor="invite-role"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              Role
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
              <SelectTrigger
                id="invite-role"
                data-ocid="admin.users.invite.role_select"
                className="font-mono text-sm h-9 rounded-sm bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem
                    key={r.value}
                    value={r.value}
                    className="font-mono text-sm"
                  >
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {submitError && (
            <p
              data-ocid="admin.users.invite.error_state"
              className="font-mono text-[0.65rem] text-destructive"
              role="alert"
            >
              {submitError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="admin.users.invite.cancel_button"
            onClick={handleClose}
            disabled={invite.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            data-ocid="admin.users.invite.submit_button"
            onClick={handleSubmit}
            disabled={invite.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-blue-700 hover:bg-blue-800 text-white"
          >
            {invite.isPending ? "Sending…" : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal: Change Role ────────────────────────────────────────────────────────

interface ChangeRoleModalProps {
  member: OrgMembership | null;
  open: boolean;
  onClose: () => void;
}

function ChangeRoleModal({ member, open, onClose }: ChangeRoleModalProps) {
  const currentKey = member ? roleKey(member.role) : "StandardUser";
  const [selectedRole, setSelectedRole] = useState<RoleKey>(currentKey);
  const updateRole = useUpdateMemberRole();

  useEffect(() => {
    setSelectedRole(member ? roleKey(member.role) : "StandardUser");
  }, [member]);

  async function handleSubmit() {
    if (!member) return;
    try {
      await updateRole.mutateAsync({
        orgId: member.orgId,
        userId: member.userId,
        newRole: selectedRole as unknown as OrgRole,
      });
      toast.success("Role updated successfully.");
      onClose();
    } catch (err) {
      toast.error(
        `Failed to update role: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm bg-card border border-border shadow-lg"
        data-ocid="admin.users.changerole.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest text-foreground uppercase">
            Change Role
          </DialogTitle>
          {member && (
            <DialogDescription className="font-mono text-[0.65rem] text-muted-foreground break-all">
              {truncatePrincipal(member.userId.toText())}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground">
              Current Role
            </Label>
            {member && <RoleBadge role={member.role} />}
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="change-role-select"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              New Role
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as RoleKey)}
            >
              <SelectTrigger
                id="change-role-select"
                data-ocid="admin.users.changerole.select"
                className="font-mono text-sm h-9 rounded-sm bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem
                    key={r.value}
                    value={r.value}
                    className="font-mono text-sm"
                  >
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="admin.users.changerole.cancel_button"
            onClick={onClose}
            disabled={updateRole.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            data-ocid="admin.users.changerole.confirm_button"
            onClick={handleSubmit}
            disabled={updateRole.isPending || selectedRole === currentKey}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50"
          >
            {updateRole.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog: Suspend Confirm ───────────────────────────────────────────────────

interface SuspendDialogProps {
  member: OrgMembership | null;
  open: boolean;
  onClose: () => void;
}

function SuspendDialog({ member, open, onClose }: SuspendDialogProps) {
  const [reason, setReason] = useState("Suspended by admin");
  const suspend = useSuspendMember();

  function handleClose() {
    setReason("Suspended by admin");
    onClose();
  }

  async function handleConfirm() {
    if (!member) return;
    try {
      await suspend.mutateAsync({
        orgId: member.orgId,
        userId: member.userId,
        reason: reason.trim() || "Suspended by admin",
      });
      toast.success("User suspended.");
      handleClose();
    } catch (err) {
      toast.error(
        `Failed to suspend: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-sm bg-card border border-border shadow-lg"
        data-ocid="admin.users.suspend.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest uppercase text-amber-600">
            Suspend User
          </DialogTitle>
          <DialogDescription className="font-mono text-[0.65rem] text-muted-foreground">
            User access will be revoked until reactivated. This action is
            audited and immutable.
          </DialogDescription>
        </DialogHeader>

        {member && (
          <p className="font-mono text-xs text-muted-foreground break-all bg-muted rounded-sm px-3 py-2 border border-border">
            {member.userId.toText()}
          </p>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="suspend-reason"
            className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
          >
            Reason
          </Label>
          <Input
            id="suspend-reason"
            data-ocid="admin.users.suspend.reason_input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="font-mono text-sm h-9 rounded-sm bg-background"
          />
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="admin.users.suspend.cancel_button"
            onClick={handleClose}
            disabled={suspend.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            data-ocid="admin.users.suspend.confirm_button"
            onClick={handleConfirm}
            disabled={suspend.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {suspend.isPending ? "Suspending…" : "Suspend User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog: Reactivate Confirm ────────────────────────────────────────────────

interface ReactivateDialogProps {
  member: OrgMembership | null;
  open: boolean;
  onClose: () => void;
}

function ReactivateDialog({ member, open, onClose }: ReactivateDialogProps) {
  const reactivate = useReactivateMember();

  async function handleConfirm() {
    if (!member) return;
    try {
      await reactivate.mutateAsync({
        orgId: member.orgId,
        userId: member.userId,
      });
      toast.success("User reactivated.");
      onClose();
    } catch (err) {
      toast.error(
        `Failed to reactivate: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm bg-card border border-border shadow-lg"
        data-ocid="admin.users.reactivate.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest uppercase text-green-700">
            Reactivate User
          </DialogTitle>
          <DialogDescription className="font-mono text-[0.65rem] text-muted-foreground">
            User access will be restored. This action is audited.
          </DialogDescription>
        </DialogHeader>

        {member && (
          <p className="font-mono text-xs text-muted-foreground break-all bg-muted rounded-sm px-3 py-2 border border-border">
            {member.userId.toText()}
          </p>
        )}

        <DialogFooter className="gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="admin.users.reactivate.cancel_button"
            onClick={onClose}
            disabled={reactivate.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            data-ocid="admin.users.reactivate.confirm_button"
            onClick={handleConfirm}
            disabled={reactivate.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-green-700 hover:bg-green-800 text-white"
          >
            {reactivate.isPending ? "Reactivating…" : "Reactivate User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog: Remove Confirm ────────────────────────────────────────────────────

interface RemoveDialogProps {
  member: OrgMembership | null;
  open: boolean;
  onClose: () => void;
}

function RemoveDialog({ member, open, onClose }: RemoveDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const remove = useRemoveMember();
  const isConfirmed = confirmation === "REMOVE";

  function handleClose() {
    setConfirmation("");
    onClose();
  }

  async function handleConfirm() {
    if (!member || !isConfirmed) return;
    try {
      await remove.mutateAsync({ orgId: member.orgId, userId: member.userId });
      toast.success("User removed from organization.");
      handleClose();
    } catch (err) {
      toast.error(
        `Failed to remove: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-sm bg-card border border-border shadow-lg"
        data-ocid="admin.users.remove.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest uppercase text-destructive">
            Remove User
          </DialogTitle>
          <DialogDescription className="font-mono text-[0.65rem] text-muted-foreground">
            This action is permanent and immutable. The user will be removed
            from the organization and all access revoked.
          </DialogDescription>
        </DialogHeader>

        {member && (
          <p className="font-mono text-xs text-muted-foreground break-all bg-muted rounded-sm px-3 py-2 border border-border">
            {member.userId.toText()}
          </p>
        )}

        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2">
          <p className="font-mono text-[0.65rem] text-red-700">
            ⚠ This action cannot be undone. All audit records are preserved.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="remove-confirmation"
            className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
          >
            Type <span className="text-destructive font-bold">REMOVE</span> to
            confirm
          </Label>
          <Input
            id="remove-confirmation"
            data-ocid="admin.users.remove.confirmation_input"
            placeholder="REMOVE"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="font-mono text-sm h-9 rounded-sm bg-background"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="admin.users.remove.cancel_button"
            onClick={handleClose}
            disabled={remove.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            data-ocid="admin.users.remove.confirm_button"
            onClick={handleConfirm}
            disabled={remove.isPending || !isConfirmed}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-red-700 hover:bg-red-800 text-white disabled:opacity-40"
          >
            {remove.isPending ? "Removing…" : "Remove User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── User Table Row ─────────────────────────────────────────────────────────────

interface UserRowProps {
  member: OrgMembership;
  index: number;
  orgName: string;
  onChangeRole: (m: OrgMembership) => void;
  onSuspend: (m: OrgMembership) => void;
  onReactivate: (m: OrgMembership) => void;
  onRemove: (m: OrgMembership) => void;
}

function UserRow({
  member,
  index,
  orgName,
  onChangeRole,
  onSuspend,
  onReactivate,
  onRemove,
}: UserRowProps) {
  const status = memberStatus(member);
  const rKey = roleKey(member.role);
  const isSuperAdminMember = rKey === "SuperAdmin";

  return (
    <tr
      data-ocid={`admin.users.item.${index}`}
      className="border-b border-border hover:bg-muted/30 transition-colors duration-100"
    >
      {/* Principal */}
      <td className="px-4 py-3">
        <PrincipalCell principal={member.userId} />
      </td>

      {/* Email */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-muted-foreground">
          {member.email ?? "—"}
        </span>
      </td>

      {/* Organization */}
      <td className="px-4 py-3">
        <span
          className="font-mono text-xs text-foreground max-w-[140px] inline-block truncate"
          title={orgName}
        >
          {orgName}
        </span>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <RoleBadge role={member.role} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <AdminStatusBadge status={STATUS_BADGE_VALUE[status]} />
      </td>

      {/* Last Active */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-muted-foreground">
          {relativeTime(member.lastActive)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        {isSuperAdminMember ? (
          <span className="font-mono text-[0.62rem] text-muted-foreground uppercase tracking-wider">
            Protected
          </span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-ocid={`admin.users.actions.${index}`}
                aria-label="User actions"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border shadow-md min-w-[160px]"
            >
              <DropdownMenuItem
                data-ocid={`admin.users.changerole_button.${index}`}
                className="font-mono text-xs cursor-pointer"
                onClick={() => onChangeRole(member)}
              >
                Change Role
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border" />
              {status !== "Suspended" ? (
                <DropdownMenuItem
                  data-ocid={`admin.users.suspend_button.${index}`}
                  className="font-mono text-xs cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50"
                  onClick={() => onSuspend(member)}
                >
                  Suspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  data-ocid={`admin.users.reactivate_button.${index}`}
                  className="font-mono text-xs cursor-pointer text-green-700 focus:bg-green-50"
                  onClick={() => onReactivate(member)}
                >
                  Reactivate
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                data-ocid={`admin.users.delete_button.${index}`}
                className="font-mono text-xs cursor-pointer text-destructive focus:text-destructive focus:bg-red-50"
                onClick={() => onRemove(member)}
              >
                Remove User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  // ── Org list (name map + invite modal + filter dropdown) ─────────────────────
  const { data: orgsData } = useOrgs({ limit: BigInt(200) });
  const allOrgs: OrgRecord[] = orgsData?.orgs ?? [];

  const orgNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const org of allOrgs) m[org.id] = org.name;
    return m;
  }, [allOrgs]);

  // ── My org memberships (access check + default org) ──────────────────────────
  const { data: myOrgs = [], isLoading: orgsLoading } = useMyOrgs();

  // ── Role guard ───────────────────────────────────────────────────────────────
  const firstOrgId = myOrgs[0]?.orgId ?? null;
  const { data: myRole, isLoading: roleLoading } = useMyRole(firstOrgId);
  const { data: isSuperAdmin, isLoading: superAdminLoading } =
    useIsSuperAdmin();

  const rKeyStr = myRole ? roleKey(myRole as OrgRole) : null;
  const canAccess =
    isSuperAdmin === true || rKeyStr === "OrgAdmin" || rKeyStr === "SuperAdmin";

  // ── Search (debounced 300ms) ─────────────────────────────────────────────────
  const [searchRaw, setSearchRaw] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(val: string) {
    setSearchRaw(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchDebounced(val.trim()), 300);
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterOrgId, setFilterOrgId] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const hasActiveFilters =
    filterOrgId !== "all" || filterRole !== "all" || filterStatus !== "all";

  function clearAllFilters() {
    setFilterOrgId("all");
    setFilterRole("all");
    setFilterStatus("all");
    handleSearchChange("");
  }

  // ── Pagination state ─────────────────────────────────────────────────────────
  const [accumulated, setAccumulated] = useState<OrgMembership[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  // Reset on org filter or search change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset
  useEffect(() => {
    setAccumulated([]);
    setCursor(null);
  }, [filterOrgId, searchDebounced]);

  // Build backend request — pass org filter when set; undefined = all orgs (SuperAdmin)
  const currentRequest = useMemo(
    () => ({
      orgId: filterOrgId !== "all" ? filterOrgId : undefined,
      limit: PAGE_SIZE,
      afterUserId: cursor ? ({ toText: () => cursor } as never) : undefined,
      search: searchDebounced || undefined,
    }),
    [filterOrgId, cursor, searchDebounced],
  );

  const {
    data: pageData,
    isLoading: pageLoading,
    isError: pageError,
    refetch,
  } = useOrgUsers(currentRequest);

  // Accumulate pages
  useEffect(() => {
    if (!pageData?.members) return;
    if (cursor === null) {
      setAccumulated(pageData.members);
    } else {
      setAccumulated((prev) => [
        ...prev,
        ...pageData.members.filter(
          (m) => !prev.some((p) => p.userId.toText() === m.userId.toText()),
        ),
      ]);
    }
  }, [pageData, cursor]);

  const hasMore = pageData?.hasMore ?? false;

  function handleLoadMore() {
    if (!pageData?.members.length) return;
    const last = pageData.members[pageData.members.length - 1];
    setCursor(last.userId.toText());
  }

  // ── Client-side role + status filtering ──────────────────────────────────────
  const filteredMembers = useMemo(() => {
    return accumulated.filter((m) => {
      if (filterRole !== "all" && roleKey(m.role) !== filterRole) return false;
      if (filterStatus !== "all" && memberStatus(m) !== filterStatus)
        return false;
      return true;
    });
  }, [accumulated, filterRole, filterStatus]);

  // ── Modal / dialog state ─────────────────────────────────────────────────────
  const [showInvite, setShowInvite] = useState(false);
  const [changeRoleMember, setChangeRoleMember] =
    useState<OrgMembership | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<OrgMembership | null>(
    null,
  );
  const [reactivateTarget, setReactivateTarget] =
    useState<OrgMembership | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgMembership | null>(null);

  // ── Derived loading states ───────────────────────────────────────────────────
  const isCheckingAccess = orgsLoading || roleLoading || superAdminLoading;
  const isFirstLoad = pageLoading && accumulated.length === 0;
  const isLoadingMore = pageLoading && accumulated.length > 0;

  const defaultInviteOrgId =
    filterOrgId !== "all" ? filterOrgId : (firstOrgId ?? null);

  const headerAction = canAccess ? (
    <Button
      type="button"
      size="sm"
      data-ocid="admin.users.invite_button"
      onClick={() => setShowInvite(true)}
      className="bg-blue-700 hover:bg-blue-800 text-white font-mono text-xs tracking-wider uppercase rounded-sm h-8 gap-1.5"
    >
      <UserPlus className="h-3.5 w-3.5" />
      Invite User
    </Button>
  ) : undefined;

  return (
    <AdminLayout title="USER MANAGEMENT" action={headerAction}>
      <div className="space-y-4">
        {/* Amber security banner */}
        <div
          data-ocid="admin.users.security_banner"
          className="flex items-start gap-3 rounded-sm border border-amber-300 bg-amber-50 px-4 py-3"
        >
          <Shield className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" />
          <p className="font-mono text-[0.7rem] text-amber-900 leading-relaxed">
            <span className="font-bold tracking-wider uppercase">
              HIGH SECURITY ENVIRONMENT
            </span>{" "}
            — All actions are audited and immutable. Only Org Admins and Super
            Admins may access this section.
          </p>
        </div>

        {/* Access check skeleton */}
        {isCheckingAccess && (
          <div
            data-ocid="admin.users.loading_state"
            className="rounded-sm bg-card border border-border shadow-sm p-6 space-y-3"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={`acs-${i}`} className="h-4 w-full" />
            ))}
          </div>
        )}

        {/* Access Denied */}
        {!isCheckingAccess && !canAccess && (
          <div
            data-ocid="admin.users.access_denied"
            className="rounded-sm bg-card border border-red-200 shadow-sm p-8 flex flex-col items-center gap-3 text-center"
          >
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-destructive">
              Access Denied
            </h3>
            <p className="font-mono text-xs text-muted-foreground max-w-sm">
              You must be an Org Admin or Super Admin to access this section.
            </p>
          </div>
        )}

        {/* Main content */}
        {!isCheckingAccess && canAccess && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    data-ocid="admin.users.search_input"
                    placeholder="Search by principal or email…"
                    value={searchRaw}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 text-xs font-mono border border-input rounded-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                  {searchRaw && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => handleSearchChange("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

                {/* Filter by Organization */}
                <Select
                  value={filterOrgId}
                  onValueChange={(v) => {
                    setFilterOrgId(v);
                    setAccumulated([]);
                    setCursor(null);
                  }}
                >
                  <SelectTrigger
                    data-ocid="admin.users.filter_org_select"
                    className="w-[200px] h-8 font-mono text-xs rounded-sm bg-background"
                  >
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all" className="font-mono text-xs">
                      All Organizations
                    </SelectItem>
                    {allOrgs.map((org) => (
                      <SelectItem
                        key={org.id}
                        value={org.id}
                        className="font-mono text-xs"
                      >
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter by Role */}
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger
                    data-ocid="admin.users.filter_role_select"
                    className="w-[160px] h-8 font-mono text-xs rounded-sm bg-background"
                  >
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all" className="font-mono text-xs">
                      All Roles
                    </SelectItem>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectItem
                        key={r.value}
                        value={r.value}
                        className="font-mono text-xs"
                      >
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter by Status */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger
                    data-ocid="admin.users.filter_status_select"
                    className="w-[150px] h-8 font-mono text-xs rounded-sm bg-background"
                  >
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all" className="font-mono text-xs">
                      All Status
                    </SelectItem>
                    <SelectItem value="Active" className="font-mono text-xs">
                      Active
                    </SelectItem>
                    <SelectItem value="Suspended" className="font-mono text-xs">
                      Suspended
                    </SelectItem>
                    <SelectItem value="Pending" className="font-mono text-xs">
                      Pending
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear all filters */}
                {(hasActiveFilters || searchRaw) && (
                  <button
                    type="button"
                    data-ocid="admin.users.clear_filters_button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* User Table */}
            <div className="rounded-sm bg-card border border-border shadow-sm overflow-hidden">
              {/* Error state */}
              {pageError && !isFirstLoad && (
                <div
                  data-ocid="admin.users.error_state"
                  className="flex flex-col items-center gap-3 py-12 text-center"
                >
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <p className="font-mono text-xs text-muted-foreground">
                    Failed to load users.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => refetch()}
                    className="font-mono text-xs gap-1.5 rounded-sm h-8"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                </div>
              )}

              {!pageError && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {[
                          "Principal",
                          "Email",
                          "Organization",
                          "Role",
                          "Status",
                          "Last Active",
                          "",
                        ].map((col) => (
                          <th
                            key={col}
                            className="px-4 py-2.5 text-left font-mono text-[0.62rem] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isFirstLoad && <SkeletonRows />}

                      {!isFirstLoad &&
                        filteredMembers.map((member, idx) => (
                          <UserRow
                            key={member.userId.toText()}
                            member={member}
                            index={idx + 1}
                            orgName={orgNameMap[member.orgId] ?? member.orgId}
                            onChangeRole={setChangeRoleMember}
                            onSuspend={setSuspendTarget}
                            onReactivate={setReactivateTarget}
                            onRemove={setRemoveTarget}
                          />
                        ))}
                    </tbody>
                  </table>

                  {/* Empty state */}
                  {!isFirstLoad &&
                    filteredMembers.length === 0 &&
                    !pageLoading && (
                      <div
                        data-ocid="admin.users.empty_state"
                        className="flex flex-col items-center justify-center gap-3 py-16 text-center"
                      >
                        <Users className="h-8 w-8 text-muted-foreground/40" />
                        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                          {searchDebounced || hasActiveFilters
                            ? "No users match the current filters"
                            : "No users in this organization"}
                        </p>
                        {!searchDebounced && !hasActiveFilters && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-ocid="admin.users.empty.invite_button"
                            onClick={() => setShowInvite(true)}
                            className="font-mono text-xs gap-1.5 rounded-sm h-8"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Invite First User
                          </Button>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Footer: count + Load More */}
              {filteredMembers.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between">
                  <p className="font-mono text-[0.62rem] text-muted-foreground uppercase tracking-wider">
                    {filteredMembers.length} user
                    {filteredMembers.length !== 1 ? "s" : ""}
                    {accumulated.length !== filteredMembers.length && (
                      <span className="ml-1 text-muted-foreground/60">
                        ({accumulated.length} loaded)
                      </span>
                    )}
                  </p>

                  {hasMore && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-ocid="admin.users.load_more_button"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="font-mono text-xs rounded-sm h-7 gap-1.5"
                    >
                      {isLoadingMore ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {isLoadingMore ? "Loading…" : "Load More"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals / Dialogs */}
      <InviteUserModal
        orgs={allOrgs}
        defaultOrgId={defaultInviteOrgId}
        open={showInvite}
        onClose={() => setShowInvite(false)}
      />

      <ChangeRoleModal
        member={changeRoleMember}
        open={!!changeRoleMember}
        onClose={() => setChangeRoleMember(null)}
      />

      <SuspendDialog
        member={suspendTarget}
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
      />

      <ReactivateDialog
        member={reactivateTarget}
        open={!!reactivateTarget}
        onClose={() => setReactivateTarget(null)}
      />

      <RemoveDialog
        member={removeTarget}
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
      />
    </AdminLayout>
  );
}
