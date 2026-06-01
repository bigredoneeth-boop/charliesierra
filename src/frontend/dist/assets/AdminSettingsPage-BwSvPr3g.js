import { i as useActor, k as useAuth, l as useQueryClient, m as useQuery, O as OrgRole, r as reactExports, R as React, n as useNavigate, o as useMutation, d as ue, j as jsxRuntimeExports, p as Tabs, q as TabsList, s as TabsTrigger, t as TabsContent, a as Skeleton, v as Label, I as Input, w as Switch, P as PasswordPolicy, x as Select, y as SelectTrigger, z as SelectValue, A as SelectContent, D as RetentionPeriod, E as SelectItem, F as AlertDialog, G as AlertDialogTrigger, B as Button, H as AlertDialogContent, J as AlertDialogHeader, K as AlertDialogTitle, M as AlertDialogDescription, N as AlertDialogFooter, Q as AlertDialogCancel, V as AlertDialogAction, W as GroupCreationPermission, X as DataExportPermission, c as Badge, Y as Textarea, Z as createActor } from "./index-CQ2E6TGk.js";
import { A as AdminLayout } from "./AdminLayout-WW-shEEN.js";
import { C as Card, a as CardHeader, c as CardTitle, d as CardDescription, b as CardContent } from "./card-BUgO7aH3.js";
function formatCycles(n) {
  if (n >= 1000000000000n) return `${(Number(n) / 1e12).toFixed(1)}T`;
  if (n >= 1000000000n) return `${(Number(n) / 1e9).toFixed(1)}B`;
  return `${(Number(n) / 1e6).toFixed(1)}M`;
}
function formatBytes(n) {
  if (n >= 1073741824n)
    return `${(Number(n) / 1073741824).toFixed(1)} GB`;
  if (n >= 1048576n) return `${(Number(n) / 1048576).toFixed(1)} MB`;
  return `${(Number(n) / 1024).toFixed(1)} KB`;
}
function retentionLabel(v) {
  const map = {
    [RetentionPeriod.days30]: "30 Days",
    [RetentionPeriod.days90]: "90 Days",
    [RetentionPeriod.year1]: "1 Year",
    [RetentionPeriod.years7]: "7 Years",
    [RetentionPeriod.unlimited]: "Unlimited"
  };
  return map[v] ?? v;
}
function AdminSettingsPage() {
  var _a;
  const { actor } = useActor(createActor);
  const { principal } = useAuth();
  const queryClient = useQueryClient();
  const orgsQuery = useQuery({
    queryKey: ["myOrgs", principal == null ? void 0 : principal.toText()],
    queryFn: async () => {
      const r = await actor.getMyOrgs();
      if (r.__kind__ === "err") throw new Error(r.err);
      return r.ok;
    },
    enabled: !!actor && !!principal
  });
  const isAdminQuery = useQuery({
    queryKey: ["isAdmin", principal == null ? void 0 : principal.toText()],
    queryFn: () => actor.isAdminCheck(
      principal
    ),
    enabled: !!actor && !!principal
  });
  const isSuperAdmin = isAdminQuery.data ?? false;
  const myOrgMemberships = orgsQuery.data ?? [];
  const myOrgId = ((_a = myOrgMemberships.find(
    (m) => m.role === OrgRole.OrgAdmin || m.role === OrgRole.SuperAdmin
  )) == null ? void 0 : _a.orgId) ?? "";
  const [selectedOrgId, setSelectedOrgId] = reactExports.useState("");
  const effectiveOrgId = isSuperAdmin ? selectedOrgId : myOrgId;
  const [platformForm, setPlatformForm] = reactExports.useState(
    null
  );
  const [platformErrors, setPlatformErrors] = reactExports.useState(
    {}
  );
  const [showPlatformSaveDialog, setShowPlatformSaveDialog] = reactExports.useState(false);
  const [orgForm, setOrgForm] = reactExports.useState(null);
  const [orgErrors, setOrgErrors] = reactExports.useState({});
  const [showOrgSaveDialog, setShowOrgSaveDialog] = reactExports.useState(false);
  const [logoUploading, setLogoUploading] = reactExports.useState(false);
  const logoInputRef = reactExports.useRef(null);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [resetConfirmInput, setResetConfirmInput] = React.useState("");
  const [resetDone, setResetDone] = React.useState(false);
  const [resetError, setResetError] = React.useState(null);
  const RESET_PHRASE = "RESET ALL DATA";
  const navigate = useNavigate();
  const platformQuery = useQuery({
    queryKey: ["platformSettings"],
    queryFn: () => actor.getPlatformSettings(),
    enabled: !!actor && isSuperAdmin
  });
  reactExports.useEffect(() => {
    if (platformQuery.data && !platformForm)
      setPlatformForm(platformQuery.data);
  }, [platformQuery.data, platformForm]);
  const orgSettingsQuery = useQuery({
    queryKey: ["orgSettings", effectiveOrgId],
    queryFn: () => actor.getOrgSettings(effectiveOrgId),
    enabled: !!actor && !!effectiveOrgId
  });
  reactExports.useEffect(() => {
    if (orgSettingsQuery.data) setOrgForm(orgSettingsQuery.data);
  }, [orgSettingsQuery.data]);
  const healthQuery = useQuery({
    queryKey: ["canisterHealth"],
    queryFn: () => actor.getCanisterHealth(),
    enabled: !!actor && isSuperAdmin,
    retry: 1
  });
  const dataResetDoneQuery = useQuery({
    queryKey: ["hasDataResetBeenPerformed"],
    queryFn: async () => {
      const result = await actor.hasDataResetBeenPerformed();
      return result;
    },
    enabled: !!actor && isSuperAdmin
  });
  const doResetMutation = useMutation({
    mutationFn: async () => {
      const result = await actor.resetAllTestData();
      if ("err" in result) throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      setResetDone(true);
      setShowResetModal(false);
      setResetConfirmInput("");
      queryClient.invalidateQueries({
        queryKey: ["hasDataResetBeenPerformed"]
      });
      setTimeout(() => navigate({ to: "/admin" }), 2e3);
    },
    onError: (err) => {
      setResetError(err.message);
    }
  });
  const { mutate: savePlatform, isPending: savingPlatform } = useMutation({
    mutationFn: (update) => actor.updatePlatformSettings(update),
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        ue.success("Platform settings saved successfully");
        queryClient.invalidateQueries({ queryKey: ["platformSettings"] });
      } else {
        ue.error(`Failed to save: ${result.err}`);
      }
    },
    onError: (e) => ue.error(e.message)
  });
  const { mutate: saveOrg, isPending: savingOrg } = useMutation({
    mutationFn: (update) => actor.updateOrgSettings(effectiveOrgId, update),
    onSuccess: (result) => {
      if (result.__kind__ === "ok") {
        ue.success("Organization settings saved successfully");
        queryClient.invalidateQueries({
          queryKey: ["orgSettings", effectiveOrgId]
        });
      } else {
        ue.error(`Failed to save: ${result.err}`);
      }
    },
    onError: (e) => ue.error(e.message)
  });
  function validatePlatform() {
    var _a2;
    const errs = {};
    if (!((_a2 = platformForm == null ? void 0 : platformForm.platformName) == null ? void 0 : _a2.trim()))
      errs.platformName = "Platform name is required";
    const t = Number((platformForm == null ? void 0 : platformForm.sessionTimeoutMinutes) ?? 30n);
    if (t < 5 || t > 120)
      errs.sessionTimeout = "Session timeout must be between 5 and 120 minutes";
    setPlatformErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function validateOrg() {
    var _a2;
    const errs = {};
    const reason = ((_a2 = orgForm == null ? void 0 : orgForm.legalHoldReason) == null ? void 0 : _a2.trim()) ?? "";
    if ((orgForm == null ? void 0 : orgForm.legalHoldEnabled) && reason.length < 10)
      errs.legalHoldReason = "Legal hold reason is required (min 10 characters)";
    setOrgErrors(errs);
    return Object.keys(errs).length === 0;
  }
  async function handleLogoUpload(e) {
    var _a2;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file || !actor) return;
    setLogoUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const resultBytes = await actor.uploadFile(bytes, file.type);
      const storageKey = new TextDecoder().decode(resultBytes);
      const logoUrl = `https://blob.caffeine.ai/v1/blob?blob_hash=${storageKey}&owner_id=wqf45-4qaaa-aaaau-agubq-cai`;
      setOrgForm(
        (prev) => prev ? { ...prev, logoUrl, logoStorageKey: storageKey } : prev
      );
      ue.success("Logo uploaded. Click Save to apply.");
    } catch {
      ue.error("Logo upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }
  const defaultTab = isSuperAdmin ? "platform" : "org";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AdminLayout, { title: "Settings", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 max-w-4xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Settings" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground text-sm mt-1", children: "Configure platform-wide security settings and organization defaults" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "settings.audit_banner",
        className: "flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "svg",
            {
              "aria-hidden": "true",
              className: "mt-0.5 h-5 w-5 shrink-0 text-amber-700",
              fill: "currentColor",
              viewBox: "0 0 20 20",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  clipRule: "evenodd",
                  d: "M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
                  fillRule: "evenodd"
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold text-black", children: "Security Notice" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-black", children: "All settings changes are audited and immutable. Changes take effect immediately across the platform." })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { defaultValue: defaultTab, className: "w-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { className: "border border-border bg-card", children: [
        isSuperAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(
          TabsTrigger,
          {
            "data-ocid": "settings.platform_tab",
            value: "platform",
            className: "data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
              "Platform Settings",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline text-[0.65rem] font-normal opacity-60", children: "(Super Admin Only)" })
            ] })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TabsTrigger,
          {
            "data-ocid": "settings.org_tab",
            value: "org",
            className: "data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground",
            children: "Organization Settings"
          }
        )
      ] }),
      isSuperAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "platform", className: "mt-6 space-y-6", children: platformQuery.isLoading || !platformForm ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-40 w-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-52 w-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-40 w-full" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        resetDone && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border border-green-700 rounded-lg bg-green-950/20 p-4 text-green-400 font-semibold", children: "✓ All testing data has been cleared. Your admin roles and organization settings are preserved." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border bg-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "Branding" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs", children: "Platform name and tagline displayed throughout the console" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "platform-name", className: "text-sm", children: "Platform Name" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "platform-name",
                  "data-ocid": "settings.platform_name_input",
                  className: "mt-1",
                  value: platformForm.platformName,
                  onChange: (e) => setPlatformForm(
                    (f) => f ? { ...f, platformName: e.target.value } : f
                  )
                }
              ),
              platformErrors.platformName && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "p",
                {
                  "data-ocid": "settings.platform_name_input.field_error",
                  className: "mt-1 text-xs text-red-400",
                  children: platformErrors.platformName
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "platform-tagline", className: "text-sm", children: "Tagline" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "platform-tagline",
                  "data-ocid": "settings.platform_tagline_input",
                  className: "mt-1",
                  value: platformForm.platformTagline,
                  onChange: (e) => setPlatformForm(
                    (f) => f ? { ...f, platformTagline: e.target.value } : f
                  )
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border bg-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "Security" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs", children: "Global authentication and access controls" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: "Require MFA for All Users" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Enforce multi-factor authentication platform-wide" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  "data-ocid": "settings.mfa_switch",
                  checked: platformForm.mfaEnforced,
                  onCheckedChange: (v) => setPlatformForm(
                    (f) => f ? { ...f, mfaEnforced: v } : f
                  )
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "session-timeout", className: "text-sm", children: "Session Timeout (minutes)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "session-timeout",
                  "data-ocid": "settings.session_timeout_input",
                  type: "number",
                  min: 5,
                  max: 120,
                  className: "mt-1 w-32",
                  value: Number(platformForm.sessionTimeoutMinutes),
                  onChange: (e) => setPlatformForm(
                    (f) => f ? {
                      ...f,
                      sessionTimeoutMinutes: BigInt(
                        Math.max(
                          5,
                          Math.min(
                            120,
                            Number(e.target.value) || 30
                          )
                        )
                      )
                    } : f
                  )
                }
              ),
              platformErrors.sessionTimeout && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "p",
                {
                  "data-ocid": "settings.session_timeout_input.field_error",
                  className: "mt-1 text-xs text-red-400",
                  children: platformErrors.sessionTimeout
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "mb-2 text-sm font-medium text-foreground", children: "Password Policy" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-3", children: [
                PasswordPolicy.basic,
                PasswordPolicy.strong,
                PasswordPolicy.enterprise
              ].map((policy) => {
                const meta = {
                  [PasswordPolicy.basic]: {
                    label: "Basic",
                    desc: "Minimum length, common rules"
                  },
                  [PasswordPolicy.strong]: {
                    label: "Strong",
                    desc: "Complex requirements, history"
                  },
                  [PasswordPolicy.enterprise]: {
                    label: "Enterprise",
                    desc: "Maximum security, rotation"
                  }
                };
                const isSelected = platformForm.passwordPolicy === policy;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "label",
                  {
                    "data-ocid": `settings.password_policy.${policy}`,
                    className: `flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:border-border/80"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "radio",
                          className: "sr-only",
                          checked: isSelected,
                          onChange: () => setPlatformForm(
                            (f) => f ? { ...f, passwordPolicy: policy } : f
                          )
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          className: `text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`,
                          children: meta[policy].label
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: meta[policy].desc })
                    ]
                  },
                  policy
                );
              }) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border bg-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "Data Retention" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs", children: "Default retention periods applied platform-wide" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "default-retention", className: "text-sm", children: "Default Retention Period" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: platformForm.defaultRetentionDays,
                  onValueChange: (v) => setPlatformForm(
                    (f) => f ? {
                      ...f,
                      defaultRetentionDays: v
                    } : f
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      SelectTrigger,
                      {
                        id: "default-retention",
                        "data-ocid": "settings.default_retention_select",
                        className: "mt-1 w-52",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: Object.values(RetentionPeriod).map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: retentionLabel(v) }, v)) })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "audit-retention", className: "text-sm", children: "Audit Log Retention Period" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Select,
                {
                  value: platformForm.auditLogRetentionDays,
                  onValueChange: (v) => setPlatformForm(
                    (f) => f ? {
                      ...f,
                      auditLogRetentionDays: v
                    } : f
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      SelectTrigger,
                      {
                        id: "audit-retention",
                        "data-ocid": "settings.audit_retention_select",
                        className: "mt-1 w-52",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: Object.values(RetentionPeriod).map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: retentionLabel(v) }, v)) })
                  ]
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-amber-900/40 bg-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "Key Management" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs text-amber-400/80", children: "Changes to key management settings affect all users immediately" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: "vetKeys Integration" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-500/70", children: "Enabling vetKeys affects key derivation globally" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  "data-ocid": "settings.vetkeys_switch",
                  checked: platformForm.vetKeysEnabled,
                  onCheckedChange: (v) => setPlatformForm(
                    (f) => f ? { ...f, vetKeysEnabled: v } : f
                  )
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: "Key Escrow" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-500/70", children: "Key Escrow enables authorized recovery of encrypted data" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Switch,
                {
                  "data-ocid": "settings.key_escrow_switch",
                  checked: platformForm.keyEscrowEnabled,
                  onCheckedChange: (v) => setPlatformForm(
                    (f) => f ? { ...f, keyEscrowEnabled: v } : f
                  )
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border bg-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "System Health" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs", children: "Read-only canister status and resource metrics" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: healthQuery.isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-16" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-16" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-16" })
          ] }) : healthQuery.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              "data-ocid": "settings.health.error_state",
              className: "text-sm text-muted-foreground",
              children: "Health data unavailable"
            }
          ) : healthQuery.data ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              "data-ocid": "settings.health.panel",
              className: "grid grid-cols-3 gap-4",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-muted/30 p-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Cycles Balance" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-lg font-semibold text-foreground", children: formatCycles(healthQuery.data.cyclesBalance) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-muted/30 p-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Memory Used" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-lg font-semibold text-foreground", children: formatBytes(healthQuery.data.memoryUsed) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border bg-muted/30 p-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Memory Capacity" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-lg font-semibold text-foreground", children: formatBytes(healthQuery.data.memoryCapacity) })
                ] })
              ]
            }
          ) : null })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          AlertDialog,
          {
            open: showPlatformSaveDialog,
            onOpenChange: setShowPlatformSaveDialog,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  "data-ocid": "settings.save_platform_button",
                  type: "button",
                  disabled: savingPlatform,
                  className: "min-w-[180px]",
                  onClick: () => {
                    if (validatePlatform())
                      setShowPlatformSaveDialog(true);
                  },
                  children: savingPlatform ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "svg",
                      {
                        className: "animate-spin h-4 w-4",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        "aria-hidden": "true",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "circle",
                            {
                              className: "opacity-25",
                              cx: "12",
                              cy: "12",
                              r: "10",
                              stroke: "currentColor",
                              strokeWidth: "4"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "path",
                            {
                              className: "opacity-75",
                              fill: "currentColor",
                              d: "M4 12a8 8 0 018-8v8z"
                            }
                          )
                        ]
                      }
                    ),
                    "Saving..."
                  ] }) : "Save Platform Settings"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: "Confirm Settings Change" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: "This action will be permanently recorded in the audit log and cannot be undone. Are you sure you want to save these platform settings?" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { "data-ocid": "settings.platform_save_dialog.cancel_button", children: "Cancel" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    AlertDialogAction,
                    {
                      "data-ocid": "settings.platform_save_dialog.confirm_button",
                      onClick: () => {
                        if (platformForm) savePlatform(platformForm);
                        ue.success(
                          "Settings saved successfully — change logged to audit trail"
                        );
                      },
                      children: "Confirm & Save"
                    }
                  )
                ] })
              ] })
            ]
          }
        ) }),
        isSuperAdmin && !resetDone && dataResetDoneQuery.data !== true && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 border border-red-700 rounded-lg bg-red-950/20 p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-bold text-red-400 mb-4 flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "⚠" }),
            " Danger Zone"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-gray-100", children: "Reset All Testing Data" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-400 mt-1 max-w-xl", children: "Permanently delete all messages, conversations, file attachments, and non-admin user profiles. Your Super Admin role, organization settings, audit logs, and platform configuration will be preserved. This action is irreversible and can only be performed once." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  setShowResetModal(true);
                  setResetError(null);
                },
                className: "flex-shrink-0 bg-red-700 hover:bg-red-600 text-white font-bold px-4 py-2 rounded transition-colors",
                children: "Reset All Testing Data"
              }
            )
          ] })
        ] }),
        showResetModal && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#0d1117] border border-red-700 rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-red-400 mb-4", children: "Confirm: Permanently Reset All Testing Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-red-950/40 border border-red-800 rounded p-4 mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-300 text-sm font-semibold", children: "⚠ This will permanently delete ALL messages, conversations, groups, file attachments, and user profiles (except Super Admin). This action is IRREVERSIBLE and can only be performed ONCE. It will be permanently logged in the audit trail." }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "label",
            {
              className: "block text-sm text-gray-400 mb-2",
              htmlFor: "reset-confirm-input",
              children: [
                "Type",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-bold text-red-400", children: "RESET ALL DATA" }),
                " ",
                "to confirm:"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: resetConfirmInput,
              onChange: (e) => {
                setResetConfirmInput(e.target.value);
                setResetError(null);
              },
              placeholder: "RESET ALL DATA",
              className: "w-full bg-[#161b22] border border-gray-600 rounded px-3 py-2 text-white mb-4 font-mono focus:outline-none focus:border-red-500",
              id: "reset-confirm-input"
            }
          ),
          resetError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm mb-4", children: resetError }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 justify-end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  setShowResetModal(false);
                  setResetConfirmInput("");
                  setResetError(null);
                },
                className: "px-4 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors",
                disabled: doResetMutation.isPending,
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => doResetMutation.mutate(),
                disabled: resetConfirmInput !== RESET_PHRASE || doResetMutation.isPending,
                className: "px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2",
                children: doResetMutation.isPending ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "animate-spin inline-block", children: "⟳" }),
                  " ",
                  "Resetting..."
                ] }) : "Confirm Reset"
              }
            )
          ] })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsContent, { value: "org", className: "mt-6 space-y-6", children: [
        isSuperAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-border bg-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "pt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { htmlFor: "org-id-input", className: "text-sm", children: "Organization ID to Edit" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Input,
            {
              id: "org-id-input",
              "data-ocid": "settings.org_id_input",
              className: "mt-1",
              placeholder: "Enter Org ID",
              value: selectedOrgId,
              onChange: (e) => {
                setSelectedOrgId(e.target.value);
                setOrgForm(null);
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "As Super Admin, enter the Org ID you want to configure" })
        ] }) }),
        !effectiveOrgId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "data-ocid": "settings.org.empty_state",
            className: "py-12 text-center text-sm text-muted-foreground",
            children: isSuperAdmin ? "Enter an Org ID above to manage organization settings." : "No organization found for your account."
          }
        ) : orgSettingsQuery.isLoading || !orgForm ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-40 w-full" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-52 w-full" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-40 w-full" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border bg-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "Organization Profile" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs", children: "Branding and identity for this organization" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm", children: "Organization Logo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-4", children: [
                orgForm.logoUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: orgForm.logoUrl,
                    alt: "Organization logo",
                    className: "h-16 w-16 rounded-lg border border-border object-cover"
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground", children: "No logo" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      ref: logoInputRef,
                      type: "file",
                      accept: "image/*",
                      className: "hidden",
                      onChange: handleLogoUpload
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      "data-ocid": "settings.logo_upload_button",
                      variant: "outline",
                      size: "sm",
                      disabled: logoUploading,
                      onClick: () => {
                        var _a2;
                        return (_a2 = logoInputRef.current) == null ? void 0 : _a2.click();
                      },
                      children: logoUploading ? "Uploading..." : orgForm.logoUrl ? "Replace" : "Upload"
                    }
                  ),
                  orgForm.logoUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      type: "button",
                      "data-ocid": "settings.logo_delete_button",
                      variant: "outline",
                      size: "sm",
                      className: "text-destructive hover:text-destructive",
                      onClick: () => setOrgForm(
                        (f) => f ? {
                          ...f,
                          logoUrl: void 0,
                          logoStorageKey: void 0
                        } : f
                      ),
                      children: "Delete"
                    }
                  )
                ] })
              ] })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border bg-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "Access & Permissions" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs", children: "Controls for user access and feature availability" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "mb-2 text-sm font-medium text-foreground", children: "Default Role for New Invites" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-4", children: [
                  OrgRole.OrgAdmin,
                  OrgRole.Auditor,
                  OrgRole.StandardUser
                ].map((role) => {
                  const roleLabels = {
                    [OrgRole.OrgAdmin]: "Org Admin",
                    [OrgRole.Auditor]: "Auditor",
                    [OrgRole.StandardUser]: "Standard User"
                  };
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "label",
                    {
                      "data-ocid": `settings.default_role.${role}`,
                      className: "flex cursor-pointer items-center gap-2",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            type: "radio",
                            className: "accent-primary",
                            checked: orgForm.defaultInviteRole === role,
                            onChange: () => setOrgForm(
                              (f) => f ? { ...f, defaultInviteRole: role } : f
                            )
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-foreground", children: roleLabels[role] })
                      ]
                    },
                    role
                  );
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "mb-2 text-sm font-medium text-foreground", children: "Group Creation" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-4", children: [
                  GroupCreationPermission.orgAdminsOnly,
                  GroupCreationPermission.allMembers
                ].map((perm) => {
                  const permLabels = {
                    [GroupCreationPermission.orgAdminsOnly]: "Org Admins Only",
                    [GroupCreationPermission.allMembers]: "All Members"
                  };
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "label",
                    {
                      "data-ocid": `settings.group_creation.${perm}`,
                      className: "flex cursor-pointer items-center gap-2",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            type: "radio",
                            className: "accent-primary",
                            checked: orgForm.groupCreationPermission === perm,
                            onChange: () => setOrgForm(
                              (f) => f ? {
                                ...f,
                                groupCreationPermission: perm
                              } : f
                            )
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-foreground", children: permLabels[perm] })
                      ]
                    },
                    perm
                  );
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("fieldset", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("legend", { className: "mb-2 text-sm font-medium text-foreground", children: "Data Export Permission" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-4", children: [
                  DataExportPermission.disabled,
                  DataExportPermission.orgAdminsOnly,
                  DataExportPermission.allMembers
                ].map((perm) => {
                  const exportLabels = {
                    [DataExportPermission.disabled]: "Disabled",
                    [DataExportPermission.orgAdminsOnly]: "Org Admins Only",
                    [DataExportPermission.allMembers]: "All Members"
                  };
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "label",
                    {
                      "data-ocid": `settings.data_export.${perm}`,
                      className: "flex cursor-pointer items-center gap-2",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            type: "radio",
                            className: "accent-primary",
                            checked: orgForm.dataExportPermission === perm,
                            onChange: () => setOrgForm(
                              (f) => f ? { ...f, dataExportPermission: perm } : f
                            )
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-foreground", children: exportLabels[perm] })
                      ]
                    },
                    perm
                  );
                }) })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-border bg-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "Message Retention Override" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs", children: "Override the platform-wide retention period for this organization" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: orgForm.messageRetentionDays ?? "platform",
                onValueChange: (v) => setOrgForm(
                  (f) => f ? {
                    ...f,
                    messageRetentionDays: v === "platform" ? void 0 : v
                  } : f
                ),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    SelectTrigger,
                    {
                      "data-ocid": "settings.message_retention_select",
                      className: "w-56",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {})
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "platform", children: "Use Platform Default" }),
                    Object.values(RetentionPeriod).map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: v, children: retentionLabel(v) }, v))
                  ] })
                ]
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "border-amber-900/40 bg-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "pb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-xs font-semibold uppercase tracking-wider text-foreground", children: "Legal Hold" }),
                orgForm.legalHoldEnabled && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Badge,
                  {
                    "data-ocid": "settings.legal_hold_badge",
                    className: "border-amber-600 bg-amber-900/40 text-amber-300 text-xs",
                    children: "ACTIVE"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardDescription, { className: "text-xs text-amber-400/80", children: "Legal hold prevents automatic deletion and has legal implications. All changes are audited." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-foreground", children: "Enable Legal Hold" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-500/70", children: "Prevents any automatic data deletion for this organization" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Switch,
                  {
                    "data-ocid": "settings.legal_hold_switch",
                    checked: orgForm.legalHoldEnabled,
                    onCheckedChange: (v) => setOrgForm(
                      (f) => f ? { ...f, legalHoldEnabled: v } : f
                    )
                  }
                )
              ] }),
              orgForm.legalHoldEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Label, { htmlFor: "legal-hold-reason", className: "text-sm", children: [
                  "Legal Hold Reason",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Textarea,
                  {
                    id: "legal-hold-reason",
                    "data-ocid": "settings.legal_hold_reason_textarea",
                    className: "mt-1 resize-none",
                    rows: 3,
                    placeholder: "Describe the legal basis for this hold (min 10 characters)...",
                    value: orgForm.legalHoldReason ?? "",
                    onChange: (e) => setOrgForm(
                      (f) => f ? { ...f, legalHoldReason: e.target.value } : f
                    )
                  }
                ),
                orgErrors.legalHoldReason && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "p",
                  {
                    "data-ocid": "settings.legal_hold_reason_textarea.field_error",
                    className: "mt-1 text-xs text-destructive",
                    children: orgErrors.legalHoldReason
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            AlertDialog,
            {
              open: showOrgSaveDialog,
              onOpenChange: setShowOrgSaveDialog,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    "data-ocid": "settings.save_org_button",
                    type: "button",
                    disabled: savingOrg,
                    className: "min-w-[200px]",
                    onClick: () => {
                      if (validateOrg()) setShowOrgSaveDialog(true);
                    },
                    children: savingOrg ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "svg",
                        {
                          className: "animate-spin h-4 w-4",
                          viewBox: "0 0 24 24",
                          fill: "none",
                          "aria-hidden": "true",
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "circle",
                              {
                                className: "opacity-25",
                                cx: "12",
                                cy: "12",
                                r: "10",
                                stroke: "currentColor",
                                strokeWidth: "4"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "path",
                              {
                                className: "opacity-75",
                                fill: "currentColor",
                                d: "M4 12a8 8 0 018-8v8z"
                              }
                            )
                          ]
                        }
                      ),
                      "Saving..."
                    ] }) : "Save Organization Settings"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { children: "Confirm Settings Change" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { children: "This action will be permanently recorded in the audit log and cannot be undone. Are you sure you want to save these organization settings?" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { "data-ocid": "settings.org_save_dialog.cancel_button", children: "Cancel" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      AlertDialogAction,
                      {
                        "data-ocid": "settings.org_save_dialog.confirm_button",
                        onClick: () => {
                          if (orgForm) saveOrg(orgForm);
                          ue.success(
                            "Settings saved successfully — change logged to audit trail"
                          );
                        },
                        children: "Confirm & Save"
                      }
                    )
                  ] })
                ] })
              ]
            }
          ) })
        ] })
      ] })
    ] })
  ] }) });
}
export {
  AdminSettingsPage as default
};
