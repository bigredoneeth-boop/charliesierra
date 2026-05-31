import { r as reactExports, j as jsxRuntimeExports, g as Check, h as Copy, f as cn } from "./index-DEgtFyNG.js";
function shortenPrincipal(p) {
  if (!p || p.length <= 14) return p;
  return `${p.slice(0, 6)}…${p.slice(-6)}`;
}
function PrincipalDisplay({
  principal,
  className,
  showTooltip = true
}) {
  const [copied, setCopied] = reactExports.useState(false);
  const handleCopy = reactExports.useCallback(async () => {
    if (!principal) return;
    try {
      await navigator.clipboard.writeText(principal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch {
      const el = document.createElement("textarea");
      el.value = principal;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    }
  }, [principal]);
  if (!principal) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs text-muted-foreground italic", children: "—" });
  }
  const short = shortenPrincipal(principal);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn("inline-flex items-center gap-1.5", className),
      "data-ocid": "principal.display",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "font-mono text-xs text-foreground",
            title: showTooltip ? principal : void 0,
            "aria-label": `Principal: ${principal}`,
            children: short
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-ocid": "principal.copy_button",
            onClick: handleCopy,
            className: cn(
              "inline-flex h-4 w-4 items-center justify-center rounded",
              "text-muted-foreground hover:text-foreground",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              copied && "text-emerald-500"
            ),
            "aria-label": copied ? "Copied!" : `Copy principal: ${principal}`,
            title: copied ? "Copied!" : "Copy to clipboard",
            children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-3 w-3", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3 w-3", "aria-hidden": "true" })
          }
        )
      ]
    }
  );
}
export {
  PrincipalDisplay as P
};
