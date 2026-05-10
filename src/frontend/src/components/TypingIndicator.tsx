import { createActor } from "@/backend";
import type { ConversationId, TypingIndicatorPublic } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";

interface TypingIndicatorProps {
  conversationId: ConversationId;
  myPrincipal: string;
}

function useTypingIndicators(conversationId: ConversationId) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<TypingIndicatorPublic[]>({
    queryKey: ["typing", conversationId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTypingIndicators(conversationId);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
    staleTime: 2500,
    refetchIntervalInBackground: false,
  });
}

function getTypingText(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return `${names.length} people are typing`;
}

export const TypingIndicator = memo(function TypingIndicator({
  conversationId,
  myPrincipal,
}: TypingIndicatorProps) {
  const { data: indicators = [] } = useTypingIndicators(conversationId);
  const now = BigInt(Date.now()) * 1_000_000n; // nanoseconds
  const active = indicators.filter(
    (t) => t.userId.toText() !== myPrincipal && t.expiresAt > now,
  );

  if (active.length === 0) return null;

  const names = active.map((t) => {
    const text = t.userId.toText();
    return `${text.slice(0, 6)}...`;
  });

  return (
    <div
      className="flex items-center gap-2 px-4 py-2"
      data-ocid="typing.indicator"
      aria-live="polite"
      aria-label={getTypingText(names)}
    >
      <div className="flex items-center gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{
              animationDelay: `${i * 150}ms`,
              animationDuration: "0.9s",
            }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {getTypingText(names)}
      </span>
    </div>
  );
});
