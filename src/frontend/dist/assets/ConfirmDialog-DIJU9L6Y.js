import { r as reactExports, j as jsxRuntimeExports, T as TriangleAlert, e as cn, B as Button } from "./index-C1anCSBc.js";
function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel
}) {
  const confirmRef = reactExports.useRef(null);
  const cancelRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);
  reactExports.useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        var _a;
        return (_a = cancelRef.current) == null ? void 0 : _a.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!open) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "dialog",
    {
      open: true,
      className: "fixed inset-0 z-50 flex items-center justify-center m-0 p-0 max-w-none max-h-none w-full h-full bg-transparent border-none",
      "data-ocid": "confirm.dialog",
      "aria-labelledby": "confirm-dialog-title",
      "aria-describedby": "confirm-dialog-desc",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "absolute inset-0 bg-black/60 backdrop-blur-sm",
            onClick: onCancel,
            "aria-label": "Cancel",
            tabIndex: -1
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "relative z-10 w-full max-w-md mx-4 rounded-lg border",
              "bg-card border-border shadow-xl",
              "animate-in fade-in-0 zoom-in-95 duration-150"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 mb-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        destructive ? "bg-rose-500/10 border border-rose-500/20" : "bg-amber-500/10 border border-amber-500/20"
                      ),
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        TriangleAlert,
                        {
                          className: cn(
                            "h-5 w-5",
                            destructive ? "text-rose-500" : "text-amber-500"
                          ),
                          "aria-hidden": "true"
                        }
                      )
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "h2",
                      {
                        id: "confirm-dialog-title",
                        className: "text-base font-semibold text-foreground",
                        children: title
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "p",
                      {
                        id: "confirm-dialog-desc",
                        className: "mt-1 text-sm text-muted-foreground leading-relaxed",
                        children: description
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400", children: "This action will be permanently recorded in the audit log and cannot be undone." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4 rounded-b-lg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    ref: cancelRef,
                    type: "button",
                    variant: "outline",
                    "data-ocid": "confirm.cancel_button",
                    onClick: onCancel,
                    children: "Cancel"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    ref: confirmRef,
                    type: "button",
                    "data-ocid": "confirm.confirm_button",
                    onClick: onConfirm,
                    className: cn(
                      destructive && "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 focus-visible:ring-rose-500"
                    ),
                    variant: destructive ? "destructive" : "default",
                    children: confirmLabel
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
}
export {
  ConfirmDialog as C
};
