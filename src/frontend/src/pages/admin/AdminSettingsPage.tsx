import {
  DataExportPermission,
  GroupCreationPermission,
  OrgRole,
  PasswordPolicy,
  RetentionPeriod,
  createActor,
} from "@/backend";
import type { OrgSettings, PlatformSettings } from "@/backend";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
/**
 * AdminSettingsPage
 * Full settings control center for Super Admins (Platform Settings)
 * and Org Admins (Organization Settings).
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCycles(n: bigint): string {
  if (n >= 1_000_000_000_000n) return `${(Number(n) / 1e12).toFixed(1)}T`;
  if (n >= 1_000_000_000n) return `${(Number(n) / 1e9).toFixed(1)}B`;
  return `${(Number(n) / 1e6).toFixed(1)}M`;
}

function formatBytes(n: bigint): string {
  if (n >= 1_073_741_824n)
    return `${(Number(n) / 1_073_741_824).toFixed(1)} GB`;
  if (n >= 1_048_576n) return `${(Number(n) / 1_048_576).toFixed(1)} MB`;
  return `${(Number(n) / 1_024).toFixed(1)} KB`;
}

function retentionLabel(v: RetentionPeriod): string {
  const map: Record<RetentionPeriod, string> = {
    [RetentionPeriod.days30]: "30 Days",
    [RetentionPeriod.days90]: "90 Days",
    [RetentionPeriod.year1]: "1 Year",
    [RetentionPeriod.years7]: "7 Years",
    [RetentionPeriod.unlimited]: "Unlimited",
  };
  return map[v] ?? v;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { actor } = useActor(createActor);
  const { principal } = useAuth();
  const queryClient = useQueryClient();

  // ── Role detection ────────────────────────────────────────────────────────
  const orgsQuery = useQuery({
    queryKey: ["myOrgs", principal?.toText()],
    queryFn: async () => {
      const r = await actor!.getMyOrgs();
      if (r.__kind__ === "err") throw new Error(r.err);
      return r.ok;
    },
    enabled: !!actor && !!principal,
  });

  const isAdminQuery = useQuery({
    queryKey: ["isAdmin", principal?.toText()],
    queryFn: () =>
      actor!.isAdminCheck(
        principal as unknown as import("@icp-sdk/core/principal").Principal,
      ),
    enabled: !!actor && !!principal,
  });

  const isSuperAdmin = isAdminQuery.data ?? false;
  const myOrgMemberships = orgsQuery.data ?? [];
  const myOrgId =
    myOrgMemberships.find(
      (m) => m.role === OrgRole.OrgAdmin || m.role === OrgRole.SuperAdmin,
    )?.orgId ?? "";

  // ── Org selector (Super Admin can target any org by ID) ───────────────────
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const effectiveOrgId = isSuperAdmin ? selectedOrgId : myOrgId;

  // ── Platform Settings state ───────────────────────────────────────────────
  const [platformForm, setPlatformForm] = useState<PlatformSettings | null>(
    null,
  );
  const [platformErrors, setPlatformErrors] = useState<Record<string, string>>(
    {},
  );
  const [showPlatformSaveDialog, setShowPlatformSaveDialog] = useState(false);

  // ── Org Settings state ────────────────────────────────────────────────────
  const [orgForm, setOrgForm] = useState<OrgSettings | null>(null);
  const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});
  const [showOrgSaveDialog, setShowOrgSaveDialog] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const platformQuery = useQuery({
    queryKey: ["platformSettings"],
    queryFn: () => actor!.getPlatformSettings(),
    enabled: !!actor && isSuperAdmin,
  });

  useEffect(() => {
    if (platformQuery.data && !platformForm)
      setPlatformForm(platformQuery.data);
  }, [platformQuery.data, platformForm]);

  const orgSettingsQuery = useQuery({
    queryKey: ["orgSettings", effectiveOrgId],
    queryFn: () => actor!.getOrgSettings(effectiveOrgId),
    enabled: !!actor && !!effectiveOrgId,
  });

  useEffect(() => {
    if (orgSettingsQuery.data) setOrgForm(orgSettingsQuery.data);
  }, [orgSettingsQuery.data]);

  const healthQuery = useQuery({
    queryKey: ["canisterHealth"],
    queryFn: () => actor!.getCanisterHealth(),
    enabled: !!actor && isSuperAdmin,
    retry: 1,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: savePlatform, isPending: savingPlatform } = useMutation({
    mutationFn: (update: PlatformSettings) =>
      actor!.updatePlatformSettings(update),
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        toast.success("Platform settings saved successfully");
        queryClient.invalidateQueries({ queryKey: ["platformSettings"] });
      } else {
        toast.error(`Failed to save: ${result.err}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { mutate: saveOrg, isPending: savingOrg } = useMutation({
    mutationFn: (update: OrgSettings) =>
      actor!.updateOrgSettings(effectiveOrgId, update),
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        toast.success("Organization settings saved successfully");
        queryClient.invalidateQueries({
          queryKey: ["orgSettings", effectiveOrgId],
        });
      } else {
        toast.error(`Failed to save: ${result.err}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Validation ────────────────────────────────────────────────────────────
  function validatePlatform(): boolean {
    const errs: Record<string, string> = {};
    if (!platformForm?.platformName?.trim())
      errs.platformName = "Platform name is required";
    const t = Number(platformForm?.sessionTimeoutMinutes ?? 30n);
    if (t < 5 || t > 120)
      errs.sessionTimeout = "Session timeout must be between 5 and 120 minutes";
    setPlatformErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateOrg(): boolean {
    const errs: Record<string, string> = {};
    const reason = orgForm?.legalHoldReason?.trim() ?? "";
    if (orgForm?.legalHoldEnabled && reason.length < 10)
      errs.legalHoldReason =
        "Legal hold reason is required (min 10 characters)";
    setOrgErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Logo upload ───────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !actor) return;
    setLogoUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const resultBytes = await actor.uploadFile(bytes, file.type);
      const storageKey = new TextDecoder().decode(resultBytes);
      const logoUrl = `https://blob.caffeine.ai/v1/blob?blob_hash=${storageKey}&owner_id=wqf45-4qaaa-aaaau-agubq-cai`;
      setOrgForm((prev) =>
        prev ? { ...prev, logoUrl, logoStorageKey: storageKey } : prev,
      );
      toast.success("Logo uploaded. Click Save to apply.");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  const defaultTab = isSuperAdmin ? "platform" : "org";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Settings">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage platform and organization configuration
          </p>
        </div>

        {/* Audit warning banner */}
        <div
          data-ocid="settings.audit_banner"
          className="flex items-start gap-3 rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3"
        >
          <svg
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              clipRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              fillRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-100">
              Security Notice
            </p>
            <p className="mt-0.5 text-xs text-amber-200">
              All changes are audited and immutable. Actions cannot be undone on
              the Internet Computer.
            </p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="border border-border bg-card">
            {isSuperAdmin && (
              <TabsTrigger
                data-ocid="settings.platform_tab"
                value="platform"
                className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground"
              >
                Platform Settings
              </TabsTrigger>
            )}
            <TabsTrigger
              data-ocid="settings.org_tab"
              value="org"
              className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground"
            >
              Organization Settings
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════ PLATFORM SETTINGS ═══════════════ */}
          {isSuperAdmin && (
            <TabsContent value="platform" className="mt-6 space-y-6">
              {platformQuery.isLoading || !platformForm ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-52 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <>
                  {/* Branding card */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Branding
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Platform name and tagline displayed throughout the
                        console
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="platform-name" className="text-sm">
                          Platform Name
                        </Label>
                        <Input
                          id="platform-name"
                          data-ocid="settings.platform_name_input"
                          className="mt-1"
                          value={platformForm.platformName}
                          onChange={(e) =>
                            setPlatformForm((f) =>
                              f ? { ...f, platformName: e.target.value } : f,
                            )
                          }
                        />
                        {platformErrors.platformName && (
                          <p
                            data-ocid="settings.platform_name_input.field_error"
                            className="mt-1 text-xs text-red-400"
                          >
                            {platformErrors.platformName}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="platform-tagline" className="text-sm">
                          Tagline
                        </Label>
                        <Input
                          id="platform-tagline"
                          data-ocid="settings.platform_tagline_input"
                          className="mt-1"
                          value={platformForm.platformTagline}
                          onChange={(e) =>
                            setPlatformForm((f) =>
                              f ? { ...f, platformTagline: e.target.value } : f,
                            )
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security card */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Security
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Global authentication and access controls
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* MFA toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Require MFA for All Users
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Enforce multi-factor authentication platform-wide
                          </p>
                        </div>
                        <Switch
                          data-ocid="settings.mfa_switch"
                          checked={platformForm.mfaEnforced}
                          onCheckedChange={(v) =>
                            setPlatformForm((f) =>
                              f ? { ...f, mfaEnforced: v } : f,
                            )
                          }
                        />
                      </div>

                      {/* Session timeout */}
                      <div>
                        <Label htmlFor="session-timeout" className="text-sm">
                          Session Timeout (minutes)
                        </Label>
                        <Input
                          id="session-timeout"
                          data-ocid="settings.session_timeout_input"
                          type="number"
                          min={5}
                          max={120}
                          className="mt-1 w-32"
                          value={Number(platformForm.sessionTimeoutMinutes)}
                          onChange={(e) =>
                            setPlatformForm((f) =>
                              f
                                ? {
                                    ...f,
                                    sessionTimeoutMinutes: BigInt(
                                      Math.max(
                                        5,
                                        Math.min(
                                          120,
                                          Number(e.target.value) || 30,
                                        ),
                                      ),
                                    ),
                                  }
                                : f,
                            )
                          }
                        />
                        {platformErrors.sessionTimeout && (
                          <p
                            data-ocid="settings.session_timeout_input.field_error"
                            className="mt-1 text-xs text-red-400"
                          >
                            {platformErrors.sessionTimeout}
                          </p>
                        )}
                      </div>

                      {/* Password policy */}
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-foreground">
                          Password Policy
                        </legend>
                        <div className="grid grid-cols-3 gap-3">
                          {(
                            [
                              PasswordPolicy.basic,
                              PasswordPolicy.strong,
                              PasswordPolicy.enterprise,
                            ] as PasswordPolicy[]
                          ).map((policy) => {
                            const meta: Record<
                              PasswordPolicy,
                              { label: string; desc: string }
                            > = {
                              [PasswordPolicy.basic]: {
                                label: "Basic",
                                desc: "Minimum length, common rules",
                              },
                              [PasswordPolicy.strong]: {
                                label: "Strong",
                                desc: "Complex requirements, history",
                              },
                              [PasswordPolicy.enterprise]: {
                                label: "Enterprise",
                                desc: "Maximum security, rotation",
                              },
                            };
                            const isSelected =
                              platformForm.passwordPolicy === policy;
                            return (
                              <label
                                key={policy}
                                data-ocid={`settings.password_policy.${policy}`}
                                className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-muted/30 hover:border-border/80"
                                }`}
                              >
                                <input
                                  type="radio"
                                  className="sr-only"
                                  checked={isSelected}
                                  onChange={() =>
                                    setPlatformForm((f) =>
                                      f ? { ...f, passwordPolicy: policy } : f,
                                    )
                                  }
                                />
                                <span
                                  className={`text-sm font-medium ${
                                    isSelected
                                      ? "text-primary"
                                      : "text-foreground"
                                  }`}
                                >
                                  {meta[policy].label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {meta[policy].desc}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    </CardContent>
                  </Card>

                  {/* Data Retention card */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Data Retention
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Default retention periods applied platform-wide
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="default-retention" className="text-sm">
                          Default Retention Period
                        </Label>
                        <Select
                          value={platformForm.defaultRetentionDays}
                          onValueChange={(v) =>
                            setPlatformForm((f) =>
                              f
                                ? {
                                    ...f,
                                    defaultRetentionDays: v as RetentionPeriod,
                                  }
                                : f,
                            )
                          }
                        >
                          <SelectTrigger
                            id="default-retention"
                            data-ocid="settings.default_retention_select"
                            className="mt-1 w-52"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(RetentionPeriod).map((v) => (
                              <SelectItem key={v} value={v}>
                                {retentionLabel(v)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="audit-retention" className="text-sm">
                          Audit Log Retention Period
                        </Label>
                        <Select
                          value={platformForm.auditLogRetentionDays}
                          onValueChange={(v) =>
                            setPlatformForm((f) =>
                              f
                                ? {
                                    ...f,
                                    auditLogRetentionDays: v as RetentionPeriod,
                                  }
                                : f,
                            )
                          }
                        >
                          <SelectTrigger
                            id="audit-retention"
                            data-ocid="settings.audit_retention_select"
                            className="mt-1 w-52"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(RetentionPeriod).map((v) => (
                              <SelectItem key={v} value={v}>
                                {retentionLabel(v)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Management card */}
                  <Card className="border-amber-900/40 bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Key Management
                      </CardTitle>
                      <CardDescription className="text-xs text-amber-400/80">
                        Changes to key management settings affect all users
                        immediately
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            vetKeys Integration
                          </p>
                          <p className="text-xs text-amber-500/70">
                            Enabling vetKeys affects key derivation globally
                          </p>
                        </div>
                        <Switch
                          data-ocid="settings.vetkeys_switch"
                          checked={platformForm.vetKeysEnabled}
                          onCheckedChange={(v) =>
                            setPlatformForm((f) =>
                              f ? { ...f, vetKeysEnabled: v } : f,
                            )
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Key Escrow
                          </p>
                          <p className="text-xs text-amber-500/70">
                            Key Escrow enables authorized recovery of encrypted
                            data
                          </p>
                        </div>
                        <Switch
                          data-ocid="settings.key_escrow_switch"
                          checked={platformForm.keyEscrowEnabled}
                          onCheckedChange={(v) =>
                            setPlatformForm((f) =>
                              f ? { ...f, keyEscrowEnabled: v } : f,
                            )
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Health card */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        System Health
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Read-only canister status and resource metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {healthQuery.isLoading ? (
                        <div className="grid grid-cols-3 gap-4">
                          <Skeleton className="h-16" />
                          <Skeleton className="h-16" />
                          <Skeleton className="h-16" />
                        </div>
                      ) : healthQuery.isError ? (
                        <p
                          data-ocid="settings.health.error_state"
                          className="text-sm text-muted-foreground"
                        >
                          Health data unavailable
                        </p>
                      ) : healthQuery.data ? (
                        <div
                          data-ocid="settings.health.panel"
                          className="grid grid-cols-3 gap-4"
                        >
                          <div className="rounded-lg border border-border bg-muted/30 p-3">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              Cycles Balance
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {formatCycles(healthQuery.data.cyclesBalance)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 p-3">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              Memory Used
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {formatBytes(healthQuery.data.memoryUsed)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 p-3">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                              Memory Capacity
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                              {formatBytes(healthQuery.data.memoryCapacity)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>

                  {/* Save Platform Settings */}
                  <div>
                    <AlertDialog
                      open={showPlatformSaveDialog}
                      onOpenChange={setShowPlatformSaveDialog}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          data-ocid="settings.save_platform_button"
                          type="button"
                          disabled={savingPlatform}
                          onClick={() => {
                            if (validatePlatform())
                              setShowPlatformSaveDialog(true);
                          }}
                        >
                          {savingPlatform
                            ? "Saving..."
                            : "Save Platform Settings"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Confirm Settings Change
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will be permanently recorded in the
                            audit log and cannot be undone. Are you sure you
                            want to save these platform settings?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-ocid="settings.platform_save_dialog.cancel_button">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            data-ocid="settings.platform_save_dialog.confirm_button"
                            onClick={() => {
                              if (platformForm) savePlatform(platformForm);
                            }}
                          >
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </TabsContent>
          )}

          {/* ═══════════════ ORGANIZATION SETTINGS ═══════════════ */}
          <TabsContent value="org" className="mt-6 space-y-6">
            {/* Super Admin org selector */}
            {isSuperAdmin && (
              <Card className="border-border bg-card">
                <CardContent className="pt-4">
                  <Label htmlFor="org-id-input" className="text-sm">
                    Organization ID to Edit
                  </Label>
                  <Input
                    id="org-id-input"
                    data-ocid="settings.org_id_input"
                    className="mt-1"
                    placeholder="Enter Org ID"
                    value={selectedOrgId}
                    onChange={(e) => {
                      setSelectedOrgId(e.target.value);
                      setOrgForm(null);
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    As Super Admin, enter the Org ID you want to configure
                  </p>
                </CardContent>
              </Card>
            )}

            {!effectiveOrgId ? (
              <div
                data-ocid="settings.org.empty_state"
                className="py-12 text-center text-sm text-muted-foreground"
              >
                {isSuperAdmin
                  ? "Enter an Org ID above to manage organization settings."
                  : "No organization found for your account."}
              </div>
            ) : orgSettingsQuery.isLoading || !orgForm ? (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-52 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                {/* Org Profile card */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Organization Profile
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Branding and identity for this organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label className="text-sm">Organization Logo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        {orgForm.logoUrl ? (
                          <img
                            src={orgForm.logoUrl}
                            alt="Organization logo"
                            className="h-16 w-16 rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground">
                            No logo
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                          <Button
                            type="button"
                            data-ocid="settings.logo_upload_button"
                            variant="outline"
                            size="sm"
                            disabled={logoUploading}
                            onClick={() => logoInputRef.current?.click()}
                          >
                            {logoUploading
                              ? "Uploading..."
                              : orgForm.logoUrl
                                ? "Replace"
                                : "Upload"}
                          </Button>
                          {orgForm.logoUrl && (
                            <Button
                              type="button"
                              data-ocid="settings.logo_delete_button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                setOrgForm((f) =>
                                  f
                                    ? {
                                        ...f,
                                        logoUrl: undefined,
                                        logoStorageKey: undefined,
                                      }
                                    : f,
                                )
                              }
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Access & Permissions card */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Access &amp; Permissions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Controls for user access and feature availability
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Default invite role */}
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-foreground">
                        Default Role for New Invites
                      </legend>
                      <div className="flex flex-wrap gap-4">
                        {(
                          [
                            OrgRole.OrgAdmin,
                            OrgRole.Auditor,
                            OrgRole.StandardUser,
                          ] as OrgRole[]
                        ).map((role) => {
                          const roleLabels: Record<string, string> = {
                            [OrgRole.OrgAdmin]: "Org Admin",
                            [OrgRole.Auditor]: "Auditor",
                            [OrgRole.StandardUser]: "Standard User",
                          };
                          return (
                            <label
                              key={role}
                              data-ocid={`settings.default_role.${role}`}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <input
                                type="radio"
                                className="accent-primary"
                                checked={orgForm.defaultInviteRole === role}
                                onChange={() =>
                                  setOrgForm((f) =>
                                    f ? { ...f, defaultInviteRole: role } : f,
                                  )
                                }
                              />
                              <span className="text-sm text-foreground">
                                {roleLabels[role]}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    {/* Group creation */}
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-foreground">
                        Group Creation
                      </legend>
                      <div className="flex flex-wrap gap-4">
                        {(
                          [
                            GroupCreationPermission.orgAdminsOnly,
                            GroupCreationPermission.allMembers,
                          ] as GroupCreationPermission[]
                        ).map((perm) => {
                          const permLabels: Record<
                            GroupCreationPermission,
                            string
                          > = {
                            [GroupCreationPermission.orgAdminsOnly]:
                              "Org Admins Only",
                            [GroupCreationPermission.allMembers]: "All Members",
                          };
                          return (
                            <label
                              key={perm}
                              data-ocid={`settings.group_creation.${perm}`}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <input
                                type="radio"
                                className="accent-primary"
                                checked={
                                  orgForm.groupCreationPermission === perm
                                }
                                onChange={() =>
                                  setOrgForm((f) =>
                                    f
                                      ? {
                                          ...f,
                                          groupCreationPermission: perm,
                                        }
                                      : f,
                                  )
                                }
                              />
                              <span className="text-sm text-foreground">
                                {permLabels[perm]}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    {/* Data export */}
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-foreground">
                        Data Export Permission
                      </legend>
                      <div className="flex flex-wrap gap-4">
                        {(
                          [
                            DataExportPermission.disabled,
                            DataExportPermission.orgAdminsOnly,
                            DataExportPermission.allMembers,
                          ] as DataExportPermission[]
                        ).map((perm) => {
                          const exportLabels: Record<
                            DataExportPermission,
                            string
                          > = {
                            [DataExportPermission.disabled]: "Disabled",
                            [DataExportPermission.orgAdminsOnly]:
                              "Org Admins Only",
                            [DataExportPermission.allMembers]: "All Members",
                          };
                          return (
                            <label
                              key={perm}
                              data-ocid={`settings.data_export.${perm}`}
                              className="flex cursor-pointer items-center gap-2"
                            >
                              <input
                                type="radio"
                                className="accent-primary"
                                checked={orgForm.dataExportPermission === perm}
                                onChange={() =>
                                  setOrgForm((f) =>
                                    f
                                      ? { ...f, dataExportPermission: perm }
                                      : f,
                                  )
                                }
                              />
                              <span className="text-sm text-foreground">
                                {exportLabels[perm]}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </CardContent>
                </Card>

                {/* Message Retention Override card */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Message Retention Override
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Override the platform-wide retention period for this
                      organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={orgForm.messageRetentionDays ?? "platform"}
                      onValueChange={(v) =>
                        setOrgForm((f) =>
                          f
                            ? {
                                ...f,
                                messageRetentionDays:
                                  v === "platform"
                                    ? undefined
                                    : (v as RetentionPeriod),
                              }
                            : f,
                        )
                      }
                    >
                      <SelectTrigger
                        data-ocid="settings.message_retention_select"
                        className="w-56"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform">
                          Use Platform Default
                        </SelectItem>
                        {Object.values(RetentionPeriod).map((v) => (
                          <SelectItem key={v} value={v}>
                            {retentionLabel(v)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Legal Hold card */}
                <Card className="border-amber-900/40 bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Legal Hold
                      </CardTitle>
                      {orgForm.legalHoldEnabled && (
                        <Badge
                          data-ocid="settings.legal_hold_badge"
                          className="border-amber-600 bg-amber-900/40 text-amber-300 text-xs"
                        >
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs text-amber-400/80">
                      Legal hold prevents automatic deletion and has legal
                      implications. All changes are audited.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Enable Legal Hold
                        </p>
                        <p className="text-xs text-amber-500/70">
                          Prevents any automatic data deletion for this
                          organization
                        </p>
                      </div>
                      <Switch
                        data-ocid="settings.legal_hold_switch"
                        checked={orgForm.legalHoldEnabled}
                        onCheckedChange={(v) =>
                          setOrgForm((f) =>
                            f ? { ...f, legalHoldEnabled: v } : f,
                          )
                        }
                      />
                    </div>
                    {orgForm.legalHoldEnabled && (
                      <div>
                        <Label htmlFor="legal-hold-reason" className="text-sm">
                          Legal Hold Reason{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="legal-hold-reason"
                          data-ocid="settings.legal_hold_reason_textarea"
                          className="mt-1 resize-none"
                          rows={3}
                          placeholder="Describe the legal basis for this hold (min 10 characters)..."
                          value={orgForm.legalHoldReason ?? ""}
                          onChange={(e) =>
                            setOrgForm((f) =>
                              f ? { ...f, legalHoldReason: e.target.value } : f,
                            )
                          }
                        />
                        {orgErrors.legalHoldReason && (
                          <p
                            data-ocid="settings.legal_hold_reason_textarea.field_error"
                            className="mt-1 text-xs text-destructive"
                          >
                            {orgErrors.legalHoldReason}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Save Org Settings */}
                <div>
                  <AlertDialog
                    open={showOrgSaveDialog}
                    onOpenChange={setShowOrgSaveDialog}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        data-ocid="settings.save_org_button"
                        type="button"
                        disabled={savingOrg}
                        onClick={() => {
                          if (validateOrg()) setShowOrgSaveDialog(true);
                        }}
                      >
                        {savingOrg ? "Saving..." : "Save Organization Settings"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Confirm Settings Change
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will be permanently recorded in the audit
                          log and cannot be undone. Are you sure you want to
                          save these organization settings?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-ocid="settings.org_save_dialog.cancel_button">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          data-ocid="settings.org_save_dialog.confirm_button"
                          onClick={() => {
                            if (orgForm) saveOrg(orgForm);
                          }}
                        >
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
