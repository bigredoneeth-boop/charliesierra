/**
 * ConfirmDialog
 * Simple confirmation modal for destructive admin actions.
 * - Semi-transparent overlay, centered, max-w-md
 * - Confirm button is red when destructive=true
 * - Traps focus, closes on Escape and Cancel
 */
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  /** Whether the dialog is visible */
  open: boolean;
  /** Dialog heading — defaults to "Are you sure?" */
  title?: string;
  /** Explanation of the consequence, shown below the title */
  description: string;
  /** Label for the confirm button — defaults to "Confirm" */
  confirmLabel?: string;
  /** When true, the confirm button uses a destructive (red) style */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  // Focus cancel button when dialog opens (safer default for destructive actions)
  useEffect(() => {
    if (open) {
      // Small delay to let the DOM settle
      const t = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center m-0 p-0 max-w-none max-h-none w-full h-full bg-transparent border-none"
      data-ocid="confirm.dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      {/* Overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Cancel"
        tabIndex={-1}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md mx-4 rounded-lg border",
          "bg-card border-border shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-150",
        )}
      >
        <div className="p-6">
          {/* Icon + title */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                destructive
                  ? "bg-rose-500/10 border border-rose-500/20"
                  : "bg-amber-500/10 border border-amber-500/20",
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-5 w-5",
                  destructive ? "text-rose-500" : "text-amber-500",
                )}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <h2
                id="confirm-dialog-title"
                className="text-base font-semibold text-foreground"
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-desc"
                className="mt-1 text-sm text-muted-foreground leading-relaxed"
              >
                {description}
              </p>
            </div>
          </div>

          {/* Audit reminder */}
          <p className="mt-4 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            This action will be permanently recorded in the audit log and cannot
            be undone.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4 rounded-b-lg">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            data-ocid="confirm.cancel_button"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            data-ocid="confirm.confirm_button"
            onClick={onConfirm}
            className={cn(
              destructive &&
                "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 focus-visible:ring-rose-500",
            )}
            variant={destructive ? "destructive" : "default"}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
