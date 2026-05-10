import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Zap } from "lucide-react";

export function PriorityMessageBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500/20 flex-shrink-0"
          aria-label="High priority message"
          data-ocid="message.priority_badge"
        >
          <Zap size={9} className="text-orange-500 fill-orange-500" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        High priority message
      </TooltipContent>
    </Tooltip>
  );
}
