import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    ocid?: string;
  };
  className?: string;
  ocid?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
  ocid,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-16 px-6 text-center ${className}`}
      data-ocid={ocid}
    >
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Icon size={24} className="text-muted-foreground" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button
          variant="outline"
          size="sm"
          onClick={action.onClick}
          data-ocid={action.ocid}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
