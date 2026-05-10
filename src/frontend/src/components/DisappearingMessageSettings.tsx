import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timer } from "lucide-react";

const TTL_OPTIONS = [
  { value: "0", label: "Off" },
  { value: "300", label: "5 minutes" },
  { value: "3600", label: "1 hour" },
  { value: "86400", label: "1 day" },
  { value: "604800", label: "1 week" },
];

const GLOBAL_KEY = "cs_ttl_global";

function getTtlKey(conversationId?: string) {
  return conversationId ? `cs_ttl_${conversationId}` : GLOBAL_KEY;
}

export function readConversationTtl(conversationId?: string): number {
  try {
    const stored = localStorage.getItem(getTtlKey(conversationId));
    if (stored !== null) return Number(stored);
    // Fall back to global default
    if (conversationId) {
      const global = localStorage.getItem(GLOBAL_KEY);
      if (global !== null) return Number(global);
    }
    return 0;
  } catch {
    return 0;
  }
}

interface DisappearingMessageSettingsProps {
  /** If provided, reads/writes per-conversation TTL; otherwise global default */
  conversationId?: string;
  label?: string;
}

export function DisappearingMessageSettings({
  conversationId,
  label,
}: DisappearingMessageSettingsProps) {
  const storageKey = getTtlKey(conversationId);

  const currentValue = (() => {
    try {
      return localStorage.getItem(storageKey) ?? "0";
    } catch {
      return "0";
    }
  })();

  const handleChange = (value: string) => {
    try {
      localStorage.setItem(storageKey, value);
      // Force re-render by dispatching a storage event (for other tabs)
      window.dispatchEvent(
        new StorageEvent("storage", { key: storageKey, newValue: value }),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3" data-ocid="disappearing.settings">
      <div className="flex items-start gap-3">
        <Timer
          size={16}
          className="text-muted-foreground mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 space-y-2.5">
          {label && (
            <p className="text-sm font-medium text-foreground">{label}</p>
          )}
          <Select defaultValue={currentValue} onValueChange={handleChange}>
            <SelectTrigger
              className="w-full sm:w-52"
              data-ocid="disappearing.select"
            >
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {TTL_OPTIONS.map(({ value, label: optLabel }) => (
                <SelectItem
                  key={value}
                  value={value}
                  data-ocid={`disappearing.option.${value}`}
                >
                  {optLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Messages will automatically disappear after the selected time.
          </p>
        </div>
      </div>
    </div>
  );
}
