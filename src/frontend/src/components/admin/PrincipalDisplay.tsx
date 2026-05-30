/**
 * PrincipalDisplay
 * Renders a shortened Internet Computer principal (first 6 + ... + last 6)
 * with a copy-to-clipboard button and a tooltip showing the full principal.
 */
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

interface PrincipalDisplayProps {
  /** Full principal string to display and copy */
  principal: string;
  /** Additional class names for the outer wrapper */
  className?: string;
  /** Show full principal in tooltip on hover — defaults to true */
  showTooltip?: boolean;
}

/** Shorten a principal to first 6 + … + last 6 */
function shortenPrincipal(p: string): string {
  if (!p || p.length <= 14) return p;
  return `${p.slice(0, 6)}\u2026${p.slice(-6)}`;
}

export function PrincipalDisplay({
  principal,
  className,
  showTooltip = true,
}: PrincipalDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!principal) return;
    try {
      await navigator.clipboard.writeText(principal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = principal;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [principal]);

  if (!principal) {
    return (
      <span className="font-mono text-xs text-muted-foreground italic">—</span>
    );
  }

  const short = shortenPrincipal(principal);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      data-ocid="principal.display"
    >
      {/* Shortened text with optional full-text tooltip */}
      <span
        className="font-mono text-xs text-foreground"
        title={showTooltip ? principal : undefined}
        aria-label={`Principal: ${principal}`}
      >
        {short}
      </span>

      {/* Copy button */}
      <button
        type="button"
        data-ocid="principal.copy_button"
        onClick={handleCopy}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded",
          "text-muted-foreground hover:text-foreground",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          copied && "text-emerald-500",
        )}
        aria-label={copied ? "Copied!" : `Copy principal: ${principal}`}
        title={copied ? "Copied!" : "Copy to clipboard"}
      >
        {copied ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Copy className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
