import { j as jsxRuntimeExports, f as cn } from "./index-CCR6Ctxt.js";
const STATUS_STYLES = {
  active: "bg-[oklch(var(--success)/0.15)] text-[oklch(var(--success))] border-[oklch(var(--success)/0.35)]",
  suspended: "bg-[oklch(var(--destructive)/0.12)] text-[oklch(var(--destructive))] border-[oklch(var(--destructive)/0.35)]",
  revoked: "bg-[oklch(var(--destructive)/0.12)] text-[oklch(var(--destructive))] border-[oklch(var(--destructive)/0.35)]",
  pending: "bg-[oklch(var(--warning)/0.15)] text-[oklch(var(--warning-foreground))] border-[oklch(var(--warning)/0.4)]",
  archived: "bg-muted text-muted-foreground border-border",
  expired: "bg-muted text-muted-foreground border-border"
};
function AdminStatusBadge({
  status,
  label,
  className
}) {
  const displayLabel = label ?? status.toUpperCase();
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      "aria-label": displayLabel,
      className: cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5",
        "font-mono text-[0.65rem] font-semibold tracking-widest uppercase",
        "select-none whitespace-nowrap",
        STATUS_STYLES[status],
        className
      ),
      children: displayLabel
    }
  );
}
export {
  AdminStatusBadge as A
};
