/**
 * AdminOrganizationsPage
 * Production-quality Organization Management page for the Admin Console.
 *
 * Features:
 * - Role guard (OrgAdmin or SuperAdmin only)
 * - Debounced search (300 ms)
 * - Paginated table with Load More (accumulated orgs)
 * - ID truncation + copy-to-clipboard
 * - Status badges from OrgRecord.status
 * - Create / Edit / Suspend / Delete dialogs
 * - Detail view with members roster
 */
import type {
  OrgId,
  OrgMembership,
  OrgRecord,
  OrgRole,
  OrgStatus,
} from "@/backend";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import type { AdminStatusValue } from "@/components/admin/AdminStatusBadge";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import {
  useCreateOrg,
  useDeleteOrg,
  useIsSuperAdmin,
  useMyRole,
  useOrgDetails,
  useOrgUsers,
  useOrgs,
  useSuspendOrg,
  useUpdateOrg,
} from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert nanosecond bigint timestamp → locale date string */
function fmtDate(ts: bigint): string {
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Truncate a string to `max` chars with title tooltip support */
function truncate(str: string, max = 16): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

/** Map OrgStatus enum → AdminStatusValue */
function orgStatusToBadge(status: OrgStatus): AdminStatusValue {
  if (status === "Active") return "active";
  if (status === "Suspended") return "suspended";
  return "archived";
}

/** Format OrgRole enum value for display */
function fmtRole(role: OrgRole): string {
  const map: Record<string, string> = {
    SuperAdmin: "Super Admin",
    OrgAdmin: "Org Admin",
    Auditor: "Auditor",
    StandardUser: "Standard User",
  };
  return map[role as string] ?? String(role);
}

// ── Role helpers ──────────────────────────────────────────────────────────────

type RoleKey = "SuperAdmin" | "OrgAdmin" | "Auditor" | "StandardUser";

function roleKey(role: OrgRole): RoleKey {
  return role as unknown as RoleKey;
}

const ROLE_BADGE_CLASSES: Record<RoleKey, string> = {
  SuperAdmin: "bg-purple-100 text-purple-800 border border-purple-300",
  OrgAdmin: "bg-blue-100 text-blue-800 border border-blue-300",
  Auditor: "bg-amber-100 text-amber-800 border border-amber-300",
  StandardUser: "bg-gray-100 text-gray-600 border border-gray-300",
};

function RoleBadge({ role }: { role: OrgRole }) {
  const key = roleKey(role);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5",
        "font-mono text-[0.62rem] font-semibold tracking-wider uppercase select-none whitespace-nowrap",
        ROLE_BADGE_CLASSES[key],
      )}
    >
      {fmtRole(role)}
    </span>
  );
}

// ── Copy-to-clipboard hook ───────────────────────────────────────────────────

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

// ── ID Cell with copy ───────────────────────────────────────────────────────────

function IdCell({ id }: { id: string }) {
  const short = id.length > 12 ? `${id.slice(0, 8)}…` : id;
  const { copy, copied } = useCopyText();

  return (
    <span className="group inline-flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground" title={id}>
        {short}
      </span>
      <button
        type="button"
        aria-label="Copy ID"
        onClick={() => copy(id)}
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

// ── Principal Cell (for members) ───────────────────────────────────────────────

function PrincipalCell({ principal }: { principal: string }) {
  const short =
    principal.length > 20
      ? `${principal.slice(0, 10)}…${principal.slice(-5)}`
      : principal;
  const { copy, copied } = useCopyText();

  return (
    <span className="group inline-flex items-center gap-1.5">
      <span
        className="font-mono text-xs text-foreground tracking-tight select-all"
        title={principal}
      >
        {short}
      </span>
      <button
        type="button"
        aria-label="Copy principal"
        onClick={() => copy(principal)}
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

const PAGE_SIZE = BigInt(25);

// ── Skeleton rows (loading state) ─────────────────────────────────────────────
function TableSkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <tr key={`skeleton-${i}`} className="border-b border-border">
          <td className="px-4 py-3">
            <Skeleton className="h-3.5 w-36" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3.5 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16 rounded" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3.5 w-12" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3.5 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-3.5 w-20" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Create Organization Modal ─────────────────────────────────────────────────
interface CreateOrgModalProps {
  open: boolean;
  onClose: () => void;
}

function CreateOrgModal({ open, onClose }: CreateOrgModalProps) {
  const { principal } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");

  const createOrg = useCreateOrg();

  function handleClose() {
    setName("");
    setDescription("");
    setNameError("");
    createOrg.reset();
    onClose();
  }

  function validate(): boolean {
    if (!name.trim()) {
      setNameError("Organization name is required.");
      return false;
    }
    setNameError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const desc = description.trim();
    createOrg.mutate(
      { name: name.trim(), description: desc },
      {
        onSuccess: () => {
          toast.success("Organization created successfully.");
          handleClose();
        },
        onError: (err: unknown) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Failed to create organization.",
          );
        },
      },
    );
  }

  const principalText = principal?.toText() ?? "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-md bg-card border border-border shadow-lg"
        data-ocid="admin.create_org.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest text-foreground uppercase">
            New Organization
          </DialogTitle>
          <DialogDescription className="font-mono text-[0.65rem] text-muted-foreground">
            Creates a new isolated multi-tenant container.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="org-name"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              data-ocid="admin.create_org.name_input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              maxLength={100}
              placeholder="e.g. Department of Defense"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "org-name-error" : undefined}
              className="font-mono text-sm h-9 rounded-sm bg-background"
              autoFocus
            />
            {nameError && (
              <p
                id="org-name-error"
                data-ocid="admin.create_org.name_field_error"
                className="font-mono text-[0.65rem] text-destructive"
                role="alert"
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="org-desc"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              Description
              <span className="ml-1 normal-case text-muted-foreground/60">
                (optional)
              </span>
            </Label>
            <Textarea
              id="org-desc"
              data-ocid="admin.create_org.description_textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Short description of this organization's purpose."
              className="font-mono text-sm rounded-sm resize-none bg-background"
              rows={3}
            />
          </div>

          {/* Initial Admin */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground">
              Initial Admin
            </Label>
            <Input
              readOnly
              value={principalText}
              className="font-mono text-xs h-9 rounded-sm bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Mutation error */}
          {createOrg.isError && (
            <p
              data-ocid="admin.create_org.error_state"
              className="font-mono text-[0.65rem] text-destructive"
              role="alert"
            >
              {createOrg.error instanceof Error
                ? createOrg.error.message
                : "An unexpected error occurred."}
            </p>
          )}

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              data-ocid="admin.create_org.cancel_button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={createOrg.isPending}
              className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="admin.create_org.submit_button"
              size="sm"
              disabled={createOrg.isPending}
              className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-green-700 hover:bg-green-800 text-white"
            >
              {createOrg.isPending ? "Creating…" : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Organization Modal ───────────────────────────────────────────────────
interface EditOrgModalProps {
  org: OrgRecord | null;
  open: boolean;
  onClose: () => void;
}

function EditOrgModal({ org, open, onClose }: EditOrgModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const updateOrg = useUpdateOrg();

  useEffect(() => {
    if (org) {
      setName(org.name);
      setDescription(org.description ?? "");
    }
  }, [org]);

  function handleClose() {
    updateOrg.reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !name.trim()) return;
    updateOrg.mutate(
      {
        orgId: org.id,
        name: name.trim(),
        description: description.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Organization updated successfully.");
          handleClose();
        },
        onError: (err: unknown) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Failed to update organization.",
          );
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-md bg-card border border-border shadow-lg"
        data-ocid="admin.edit_org.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest text-foreground uppercase">
            Edit Organization
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label
              htmlFor="edit-org-name"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-org-name"
              data-ocid="admin.edit_org.name_input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="font-mono text-sm h-9 rounded-sm bg-background"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="edit-org-desc"
              className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
            >
              Description
            </Label>
            <Textarea
              id="edit-org-desc"
              data-ocid="admin.edit_org.description_textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              className="font-mono text-sm rounded-sm resize-none bg-background"
              rows={3}
            />
          </div>

          {updateOrg.isError && (
            <p
              data-ocid="admin.edit_org.error_state"
              className="font-mono text-[0.65rem] text-destructive"
              role="alert"
            >
              {updateOrg.error instanceof Error
                ? updateOrg.error.message
                : "An unexpected error occurred."}
            </p>
          )}

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              data-ocid="admin.edit_org.cancel_button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={updateOrg.isPending}
              className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="admin.edit_org.submit_button"
              size="sm"
              disabled={updateOrg.isPending}
              className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {updateOrg.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Suspend Organization Dialog ───────────────────────────────────────────────
interface SuspendOrgDialogProps {
  org: OrgRecord | null;
  open: boolean;
  onClose: () => void;
}

function SuspendOrgDialog({ org, open, onClose }: SuspendOrgDialogProps) {
  const suspendOrg = useSuspendOrg();

  function handleClose() {
    suspendOrg.reset();
    onClose();
  }

  async function handleConfirm() {
    if (!org) return;
    try {
      await suspendOrg.mutateAsync(org.id);
      toast.success(`Organization "${org.name}" suspended.`);
      handleClose();
    } catch (err) {
      toast.error(`Failed to suspend organization: ${String(err)}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-sm bg-card border border-border shadow-lg"
        data-ocid="admin.suspend_org.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest uppercase text-amber-700">
            Suspend Organization
          </DialogTitle>
          <DialogDescription className="font-mono text-[0.65rem] text-muted-foreground">
            This will prevent all members from accessing the organization.
          </DialogDescription>
        </DialogHeader>

        {org && (
          <p className="font-mono text-xs text-foreground break-all bg-muted rounded-sm px-3 py-2 border border-border">
            {org.name}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            data-ocid="admin.suspend_org.cancel_button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={suspendOrg.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="admin.suspend_org.confirm_button"
            size="sm"
            onClick={handleConfirm}
            disabled={suspendOrg.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {suspendOrg.isPending ? "Suspending…" : "Confirm Suspend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Organization Dialog ────────────────────────────────────────────────
interface DeleteOrgDialogProps {
  org: OrgRecord | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteOrgDialog({
  org,
  open,
  onClose,
  onDeleted,
}: DeleteOrgDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const deleteOrg = useDeleteOrg();
  const isConfirmed = org ? confirmation === org.name : false;

  function handleClose() {
    setConfirmation("");
    deleteOrg.reset();
    onClose();
  }

  async function handleConfirm() {
    if (!org || !isConfirmed) return;
    try {
      await deleteOrg.mutateAsync(org.id);
      toast.success(`Organization "${org.name}" deleted.`);
      handleClose();
      onDeleted();
    } catch (err) {
      toast.error(`Failed to delete organization: ${String(err)}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-sm bg-card border border-border shadow-lg"
        data-ocid="admin.delete_org.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-mono text-xs font-bold tracking-widest uppercase text-red-700">
            Delete Organization
          </DialogTitle>
          <DialogDescription className="font-mono text-[0.65rem] text-muted-foreground">
            This action is permanent. All data associated with this organization
            will be irrevocably removed.
          </DialogDescription>
        </DialogHeader>

        {org && (
          <p className="font-mono text-xs text-foreground break-all bg-muted rounded-sm px-3 py-2 border border-border">
            {org.name}
          </p>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="delete-confirmation"
            className="font-mono text-[0.65rem] tracking-widest uppercase text-muted-foreground"
          >
            Type{" "}
            <span className="text-destructive font-semibold">
              {org?.name ?? ""}
            </span>{" "}
            to confirm
          </Label>
          <Input
            id="delete-confirmation"
            data-ocid="admin.delete_org.confirmation_input"
            placeholder={org?.name ?? ""}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="font-mono text-sm h-9 rounded-sm bg-background"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            data-ocid="admin.delete_org.cancel_button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={deleteOrg.isPending}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="admin.delete_org.confirm_button"
            size="sm"
            onClick={handleConfirm}
            disabled={deleteOrg.isPending || !isConfirmed}
            className="font-mono text-xs tracking-wider uppercase rounded-sm h-8 bg-red-700 hover:bg-red-800 text-white disabled:opacity-40"
          >
            {deleteOrg.isPending ? "Deleting…" : "Delete Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Organization Detail View ───────────────────────────────────────────────────
interface OrgDetailViewProps {
  orgId: OrgId;
  onBack: () => void;
  canAdmin: boolean;
}

function OrgDetailView({ orgId, onBack, canAdmin }: OrgDetailViewProps) {
  const {
    data: org,
    isLoading: orgLoading,
    isError: orgError,
  } = useOrgDetails(orgId);
  const { data: usersData, isLoading: usersLoading } = useOrgUsers({
    orgId,
    limit: BigInt(100),
    afterUserId: undefined,
  });

  const [showEdit, setShowEdit] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (orgLoading) {
    return (
      <div data-ocid="admin.org_detail.loading_state" className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div data-ocid="admin.org_detail.error_state" className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to list
        </button>
        <p className="font-mono text-sm text-destructive">
          Failed to load organization details.
        </p>
      </div>
    );
  }

  const members = usersData?.members ?? [];
  const createdByText = org.createdBy?.toText?.() ?? String(org.createdBy);
  const isSuspended = org.status === "Suspended";

  return (
    <div data-ocid="admin.org_detail.panel" className="space-y-6">
      {/* Back navigation */}
      <button
        type="button"
        data-ocid="admin.org_detail.back_link"
        onClick={onBack}
        className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to organizations
      </button>

      {/* Org header card */}
      <div className="rounded-sm border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2.5">
              <Building2
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 className="font-mono text-sm font-bold tracking-wide text-foreground truncate">
                {org.name}
              </h2>
            </div>
            {org.description ? (
              <p className="font-mono text-xs text-muted-foreground pl-6 break-words">
                {org.description}
              </p>
            ) : (
              <p className="font-mono text-xs text-muted-foreground/50 pl-6 italic">
                No description
              </p>
            )}
          </div>
          <AdminStatusBadge status={orgStatusToBadge(org.status)} />
        </div>

        {/* Metadata grid */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
          {(
            [
              ["Organization ID", org.id],
              ["Members", String(org.memberCount)],
              ["Created", fmtDate(org.createdAt)],
              ["Created By", createdByText],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-[0.6rem] tracking-widest uppercase text-muted-foreground">
                {label}
              </dt>
              <dd
                className="mt-0.5 font-mono text-xs text-foreground truncate"
                title={value}
              >
                {label === "Organization ID" || label === "Created By"
                  ? truncate(value, 20)
                  : value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Quick Actions */}
      {canAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            data-ocid="admin.org_detail.edit_button"
            size="sm"
            variant="outline"
            onClick={() => setShowEdit(true)}
            className="font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-8 gap-1.5 border-amber-600/40 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            data-ocid="admin.org_detail.suspend_button"
            size="sm"
            variant="outline"
            onClick={() => setShowSuspend(true)}
            disabled={isSuspended}
            className="font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-8 gap-1.5 border-amber-600/40 text-amber-700 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-40"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Suspend
          </Button>
          <Button
            type="button"
            data-ocid="admin.org_detail.delete_button"
            size="sm"
            variant="outline"
            onClick={() => setShowDelete(true)}
            className="font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-8 gap-1.5 border-red-600/40 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}

      {/* Members sub-section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-[0.65rem] font-bold tracking-widest uppercase text-muted-foreground">
            Members
          </h3>
          <span className="font-mono text-[0.6rem] text-muted-foreground/60">
            ({members.length})
          </span>
        </div>

        {usersLoading ? (
          <div
            data-ocid="admin.org_detail.members.loading_state"
            className="space-y-2"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div
            data-ocid="admin.org_detail.members.empty_state"
            className="rounded-sm border border-border bg-card px-4 py-6 text-center"
          >
            <p className="font-mono text-xs text-muted-foreground">
              No members found.
            </p>
          </div>
        ) : (
          <div
            data-ocid="admin.org_detail.members.list"
            className="rounded-sm border border-border overflow-hidden"
          >
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Principal", "Role", "Status", "Joined"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 font-mono text-[0.6rem] font-semibold tracking-widest uppercase text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => {
                  const uid = m.userId?.toText?.() ?? String(m.userId);
                  const status =
                    (m.status as unknown as string) === "Active"
                      ? "active"
                      : (m.status as unknown as string) === "Suspended"
                        ? "suspended"
                        : "pending";
                  return (
                    <tr
                      key={uid}
                      data-ocid={`admin.org_detail.members.item.${idx + 1}`}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <PrincipalCell principal={uid} />
                      </td>
                      <td className="px-4 py-2.5">
                        <RoleBadge role={m.role} />
                      </td>
                      <td className="px-4 py-2.5">
                        <AdminStatusBadge status={status as AdminStatusValue} />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {fmtDate(m.joinedAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditOrgModal
        org={org}
        open={showEdit}
        onClose={() => setShowEdit(false)}
      />
      <SuspendOrgDialog
        org={org}
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
      />
      <DeleteOrgDialog
        org={org}
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onDeleted={onBack}
      />
    </div>
  );
}

// ── Organizations List View ────────────────────────────────────────────────────
function OrgListView({
  onViewDetails,
  isSuperAdmin,
}: {
  onViewDetails: (id: OrgId) => void;
  isSuperAdmin: boolean;
}) {
  // ── Search (debounced 300ms) ─────────────────────────────────────────────────
  const [searchRaw, setSearchRaw] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(val: string) {
    setSearchRaw(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(val.trim().toLowerCase());
    }, 300);
  }

  // ── Pagination state ─────────────────────────────────────────────────────────
  const [accumulated, setAccumulated] = useState<OrgRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  // Reset when search changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: searchDebounced is intentionally a dependency
  useEffect(() => {
    setAccumulated([]);
    setCursor(null);
  }, [searchDebounced]);

  const currentRequest = useMemo(() => {
    return {
      limit: PAGE_SIZE,
      afterOrgId: cursor ?? undefined,
      search: searchDebounced || undefined,
    };
  }, [cursor, searchDebounced]);

  const {
    data: pageData,
    isLoading: pageLoading,
    isError: pageError,
    refetch,
  } = useOrgs(currentRequest);

  // Accumulate pages
  useEffect(() => {
    if (!pageData?.orgs) return;
    if (cursor === null) {
      setAccumulated(pageData.orgs);
    } else {
      setAccumulated((prev) => [
        ...prev,
        ...pageData.orgs.filter(
          (o) => !prev.some((p) => String(p.id) === String(o.id)),
        ),
      ]);
    }
  }, [pageData, cursor]);

  const hasMore = pageData
    ? accumulated.length < Number(pageData.total)
    : false;

  function handleLoadMore() {
    if (!pageData?.orgs.length) return;
    const last = pageData.orgs[pageData.orgs.length - 1];
    setCursor(String(last.id));
  }

  const isFirstLoad = pageLoading && accumulated.length === 0;
  const isLoadingMore = pageLoading && accumulated.length > 0;

  const TABLE_HEADERS = [
    "Name",
    "ID",
    "Status",
    "Members",
    "Created",
    "Actions",
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + New Org */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            data-ocid="admin.organizations.search_input"
            placeholder="Search by organization name…"
            value={searchRaw}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs font-mono border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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

      {/* Error state */}
      {pageError && !isFirstLoad && (
        <div
          data-ocid="admin.organizations.error_state"
          className="rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3"
        >
          <p className="font-mono text-xs text-destructive">
            Failed to load organizations. Please try again.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="mt-2 border-border text-foreground gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-sm border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {TABLE_HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 font-mono text-[0.6rem] font-semibold tracking-widest uppercase text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isFirstLoad ? (
              <TableSkeletonRows />
            ) : accumulated.length === 0 && !pageLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <div data-ocid="admin.organizations.empty_state">
                    <Building2
                      className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30"
                      aria-hidden="true"
                    />
                    <p className="font-mono text-xs text-muted-foreground">
                      {searchDebounced
                        ? `No organizations match "${searchDebounced}"`
                        : "No organizations found."}
                    </p>
                    {isSuperAdmin && !searchDebounced && (
                      <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground/60">
                        Use &ldquo;New Organization&rdquo; to create the first
                        one.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              accumulated.map((org, idx) => {
                const orgIdText = String(org.id);
                return (
                  <tr
                    key={orgIdText}
                    data-ocid={`admin.organizations.item.${idx + 1}`}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-mono text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                        onClick={() => onViewDetails(org.id)}
                      >
                        {org.name}
                      </button>
                    </td>

                    {/* ID */}
                    <td className="px-4 py-3">
                      <IdCell id={orgIdText} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <AdminStatusBadge status={orgStatusToBadge(org.status)} />
                    </td>

                    {/* Members */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-foreground tabular-nums">
                        {String(org.memberCount)}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(org.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        data-ocid={`admin.organizations.view_button.${idx + 1}`}
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(org.id);
                        }}
                        className="font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-7 px-2.5"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: count + Load More */}
      {accumulated.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-muted/40 flex items-center justify-between">
          <p className="font-mono text-[0.6rem] text-muted-foreground uppercase tracking-wider">
            {accumulated.length} organization
            {accumulated.length !== 1 ? "s" : ""} shown
          </p>

          {hasMore && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-ocid="admin.organizations.load_more_button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="border-border text-muted-foreground font-mono text-xs h-7 gap-1.5"
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
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminOrganizationsPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<OrgId | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: isSuperAdmin, isLoading: superAdminLoading } =
    useIsSuperAdmin();
  const { data: myRole, isLoading: roleLoading } = useMyRole(selectedOrgId);

  const rKeyStr = myRole ? roleKey(myRole as OrgRole) : null;
  const canAdmin =
    isSuperAdmin === true || rKeyStr === "OrgAdmin" || rKeyStr === "SuperAdmin";

  const isCheckingAccess =
    superAdminLoading || (selectedOrgId ? roleLoading : false);

  // Header action — only visible to SuperAdmins
  const headerAction = isSuperAdmin ? (
    <Button
      type="button"
      data-ocid="admin.organizations.new_org_button"
      size="sm"
      onClick={() => setCreateModalOpen(true)}
      className="font-mono text-[0.65rem] tracking-wider uppercase rounded-sm h-8 gap-1.5 bg-green-700 hover:bg-green-800 text-white"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      New Organization
    </Button>
  ) : null;

  return (
    <AdminLayout
      title="Organizations"
      action={!selectedOrgId ? headerAction : undefined}
    >
      {isCheckingAccess ? (
        <div
          data-ocid="admin.organizations.loading_state"
          className="space-y-3"
        >
          <Skeleton key="org-loading-1" className="h-4 w-full" />
          <Skeleton key="org-loading-2" className="h-4 w-full" />
          <Skeleton key="org-loading-3" className="h-4 w-full" />
        </div>
      ) : selectedOrgId ? (
        <OrgDetailView
          orgId={selectedOrgId}
          onBack={() => setSelectedOrgId(null)}
          canAdmin={canAdmin}
        />
      ) : (
        <OrgListView
          onViewDetails={(id) => setSelectedOrgId(id)}
          isSuperAdmin={!!isSuperAdmin}
        />
      )}

      {/* Create org modal — rendered outside the list/detail swap */}
      <CreateOrgModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </AdminLayout>
  );
}
