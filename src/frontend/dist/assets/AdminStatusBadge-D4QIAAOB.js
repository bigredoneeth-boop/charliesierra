import { j as jsxRuntimeExports, f as cn } from "./index-Dds3FvBP.js";
const STATUS_STYLES = {
  active: {
    base: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500"
  },
  suspended: {
    base: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    dot: "bg-rose-500"
  },
  revoked: {
    base: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    dot: "bg-rose-500"
  },
  pending: {
    base: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500"
  },
  archived: {
    base: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    dot: "bg-slate-500"
  },
  expired: {
    base: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    dot: "bg-slate-500"
  }
};
function AdminStatusBadge({
  status,
  label,
  className
}) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);
  const styles = STATUS_STYLES[status];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "output",
    {
      "aria-label": `Status: ${displayLabel}`,
      className: cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        "font-medium text-xs select-none whitespace-nowrap",
        styles.base,
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn("h-1.5 w-1.5 rounded-full shrink-0", styles.dot),
            "aria-hidden": "true"
          }
        ),
        displayLabel
      ]
    }
  );
}
export {
  AdminStatusBadge as A
};
