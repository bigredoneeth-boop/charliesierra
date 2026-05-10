import { getLocalAvatarDataUrl } from "@/hooks/use-profiles";
import { useState } from "react";

interface UserAvatarProps {
  principal: string;
  displayName?: string;
  /** Direct avatar URL or data URL — overrides localStorage lookup */
  avatarUrl?: string;
  size?: number;
  className?: string;
}

const AVATAR_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
];

function hashPrincipal(principal: string): number {
  let hash = 0;
  for (let i = 0; i < principal.length; i++) {
    hash = (hash << 5) - hash + principal.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function UserAvatar({
  principal,
  displayName,
  avatarUrl,
  size = 36,
  className = "",
}: UserAvatarProps) {
  const hash = hashPrincipal(principal);
  const colorClass = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const letter = displayName
    ? displayName[0].toUpperCase()
    : principal[0].toUpperCase();

  // Resolve the final image URL: explicit prop > localStorage cache > null
  const resolvedUrl = avatarUrl ?? getLocalAvatarDataUrl(principal);

  const [imgError, setImgError] = useState(false);
  const showImage = !!resolvedUrl && !imgError;

  if (showImage) {
    return (
      <img
        src={resolvedUrl}
        alt={displayName ?? principal}
        onError={() => setImgError(true)}
        className={`inline-block rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        aria-label={displayName ?? principal}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold select-none flex-shrink-0 ${colorClass} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={displayName ?? principal}
    >
      {letter}
    </div>
  );
}
