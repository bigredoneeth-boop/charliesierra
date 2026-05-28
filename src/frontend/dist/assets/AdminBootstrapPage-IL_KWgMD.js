import { e as createLucideIcon, g as useActor, Q as useNavigate, r as reactExports, j as jsxRuntimeExports, aB as LoaderCircle, a3 as Shield, p as Label, I as Input, B as Button, aC as Principal, N as createActor } from "./index-CCR6Ctxt.js";
import { S as ShieldAlert } from "./shield-alert-BPskbdXS.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
];
const CircleCheck = createLucideIcon("circle-check", __iconNode);
function AdminBootstrapPage() {
  const { actor, isFetching } = useActor(createActor);
  const navigate = useNavigate();
  const [principalInput, setPrincipalInput] = reactExports.useState("");
  const [isPending, setIsPending] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [success, setSuccess] = reactExports.useState(false);
  const [checking, setChecking] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (!actor || isFetching) return;
    let cancelled = false;
    (async () => {
      try {
        const alreadyExists = await actor.hasSuperAdmin();
        if (!cancelled && alreadyExists) {
          void navigate({ to: "/admin" });
        }
      } catch {
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, navigate]);
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!actor) {
      setError("Backend actor not ready. Please wait and try again.");
      return;
    }
    let targetPrincipal;
    try {
      targetPrincipal = Principal.fromText(principalInput.trim());
    } catch {
      setError("Invalid Principal ID. Check the format and try again.");
      return;
    }
    setIsPending(true);
    try {
      const res = await actor.bootstrapSuperAdmin(targetPrincipal);
      if (res.__kind__ === "ok") {
        setSuccess(true);
        setTimeout(() => {
          void navigate({ to: "/admin" });
        }, 1500);
      } else {
        setError(res.err);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsPending(false);
    }
  }
  if (checking || isFetching) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "min-h-screen bg-background flex items-center justify-center",
        "data-ocid": "bootstrap.loading_state",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 18, className: "animate-spin" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-mono", children: "Verifying system state..." })
        ] })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "border-b border-border bg-card px-6 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-screen-sm mx-auto flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { size: 20, className: "text-primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-mono font-semibold text-foreground tracking-wide uppercase", children: "CharlieSierra / Admin Console" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 flex items-center justify-center px-4 py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md", "data-ocid": "bootstrap.page", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-8 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { size: 20, className: "text-primary" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold font-mono text-foreground tracking-tight", children: "Bootstrap Super Admin" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-4", children: "No Super Admin has been configured yet. Enter a Principal ID to claim the Super Admin role. This action can only be performed once." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border border-border rounded-md bg-card p-6 shadow-sm space-y-5", children: success ? (
        // Success state
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex flex-col items-center gap-4 py-4 text-center",
            "data-ocid": "bootstrap.success_state",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { size: 36, className: "text-primary" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold font-mono text-foreground", children: "Super Admin role claimed successfully." }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "Redirecting to Admin Dashboard..." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  LoaderCircle,
                  {
                    size: 14,
                    className: "animate-spin text-muted-foreground"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground font-mono", children: "Please wait" })
              ] })
            ]
          }
        )
      ) : (
        // Input form
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Label,
              {
                htmlFor: "principal-input",
                className: "text-xs font-mono font-medium text-foreground uppercase tracking-wider",
                children: "Principal ID"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                id: "principal-input",
                "data-ocid": "bootstrap.principal_input",
                type: "text",
                value: principalInput,
                onChange: (e) => {
                  setPrincipalInput(e.target.value);
                  setError(null);
                },
                placeholder: "e.g. dzdlk-gui4e-tacqa-6ptxj-...",
                className: "font-mono text-sm",
                autoComplete: "off",
                autoCorrect: "off",
                spellCheck: false,
                required: true,
                disabled: isPending,
                "aria-describedby": error ? "bootstrap-error" : void 0
              }
            ),
            error && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                id: "bootstrap-error",
                className: "text-xs text-destructive font-mono",
                "data-ocid": "bootstrap.error_state",
                role: "alert",
                children: error
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "submit",
              "data-ocid": "bootstrap.submit_button",
              disabled: isPending || !principalInput.trim(),
              className: "w-full font-mono",
              children: isPending ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 14, className: "animate-spin" }),
                "Claiming..."
              ] }) : "Claim Super Admin"
            }
          )
        ] })
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-xs text-muted-foreground font-mono text-center", children: "After bootstrap, this page will no longer be accessible." })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "border-t border-border bg-card px-6 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-screen-sm mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground font-mono text-center", children: "RESTRICTED SYSTEM ACCESS — AUTHORIZED PERSONNEL ONLY" }) }) })
  ] });
}
export {
  AdminBootstrapPage as default
};
