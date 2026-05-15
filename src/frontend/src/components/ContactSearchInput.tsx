import { createActor } from "@/backend";
import type { UserId, UserProfilePublic } from "@/backend";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { DISPLAY_NAME_PREFIX, shortPrincipal } from "@/hooks/use-profiles";
import { parseIcError } from "@/utils/ic-errors";
import { useActor } from "@caffeineai/core-infrastructure";
import { Principal } from "@icp-sdk/core/principal";
import { Loader2, Search, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ContactSearchInputProps {
  onSelect: (userId: UserId, profile: UserProfilePublic | null) => void;
  placeholder?: string;
  exclude?: string[];
}

interface CachedContact {
  principal: string;
  displayName: string;
}

export function ContactSearchInput({
  onSelect,
  placeholder = "Search by name or paste principal ID…",
  exclude = [],
}: ContactSearchInputProps) {
  const { actor, isFetching } = useActor(createActor);
  const [value, setValue] = useState("");
  const [profile, setProfile] = useState<UserProfilePublic | null>(null);
  const [lookupState, setLookupState] = useState<
    | "idle"
    | "loading"
    | "found"
    | "not_registered"
    | "excluded"
    | "invalid"
    | "name_results"
    | "no_name_match"
    | "canister_error"
  >("idle");
  const [canisterError, setCanisterError] = useState<string | null>(null);
  const [nameMatches, setNameMatches] = useState<CachedContact[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Track a pending lookup so it retries once the actor becomes available
  const pendingLookupRef = useRef<string | null>(null);
  // Track a pending name search query that was attempted while actor was null
  const pendingNameQueryRef = useRef<string | null>(null);

  // Build an index of all locally-cached display names on mount
  const cachedContacts = useMemo<CachedContact[]>(() => {
    const results: CachedContact[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(DISPLAY_NAME_PREFIX)) continue;
        const principal = key.slice(DISPLAY_NAME_PREFIX.length);
        const name = localStorage.getItem(key);
        if (!name?.trim()) continue;
        try {
          Principal.fromText(principal);
          results.push({ principal, displayName: name.trim() });
        } catch {
          // Skip invalid principals
        }
      }
    } catch {
      // localStorage unavailable
    }
    return results;
  }, []);

  const searchByName = useCallback(
    (text: string) => {
      const q = text.trim().toLowerCase();
      if (!q) return [];
      return cachedContacts.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) &&
          !exclude.includes(c.principal),
      );
    },
    [cachedContacts, exclude],
  );

  /** Returns true if the string parses as a valid IC Principal. */
  const looksLikePrincipal = useCallback((text: string): boolean => {
    if (!text.trim()) return false;
    try {
      Principal.fromText(text.trim());
      return true;
    } catch {
      return false;
    }
  }, []);

  const lookupByPrincipal = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setLookupState("idle");
        setProfile(null);
        return;
      }

      let principal: UserId;
      try {
        principal = Principal.fromText(text.trim());
      } catch {
        setLookupState("invalid");
        setProfile(null);
        return;
      }

      if (exclude.includes(principal.toText())) {
        setLookupState("excluded");
        setProfile(null);
        return;
      }

      // Actor not ready — store and wait for retry via useEffect
      if (!actor || isFetching) {
        pendingLookupRef.current = text;
        setLookupState("loading");
        return;
      }

      pendingLookupRef.current = null;
      setLookupState("loading");
      try {
        const found = await actor.getUserProfile(principal);
        setCanisterError(null);
        if (found === null || found === undefined) {
          setProfile(null);
          setLookupState("not_registered");
        } else {
          setProfile(found);
          setLookupState("found");
        }
      } catch (err) {
        const errMsg = String(err);
        const isNotRegistered =
          errMsg.toLowerCase().includes("not_registered") ||
          errMsg.toLowerCase().includes("not registered") ||
          errMsg.toLowerCase().includes("notfound") ||
          errMsg.toLowerCase().includes("not found");
        if (isNotRegistered) {
          setProfile(null);
          setLookupState("not_registered");
          setCanisterError(null);
        } else {
          const friendly = parseIcError(err);
          console.error("[ContactSearch] getUserProfile error:", err);
          setProfile(null);
          setCanisterError(friendly);
          setLookupState("canister_error");
        }
      }
    },
    [actor, isFetching, exclude],
  );

  // Retry pending principal lookup OR pending name search once actor becomes available
  useEffect(() => {
    if (!actor || isFetching) return;
    if (pendingLookupRef.current) {
      const pending = pendingLookupRef.current;
      pendingLookupRef.current = null;
      lookupByPrincipal(pending);
    } else if (pendingNameQueryRef.current) {
      const pendingName = pendingNameQueryRef.current;
      pendingNameQueryRef.current = null;
      const matches = searchByName(pendingName);
      setNameMatches(matches);
      setLookupState(matches.length > 0 ? "name_results" : "no_name_match");
      setProfile(null);
    }
  }, [actor, isFetching, lookupByPrincipal, searchByName]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (!trimmed) {
      setLookupState("idle");
      setProfile(null);
      setNameMatches([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      // Try to parse as a principal first — most reliable
      if (looksLikePrincipal(trimmed)) {
        setNameMatches([]);
        lookupByPrincipal(trimmed);
      } else {
        // Name search in local cache
        // If actor isn't ready yet, store the query for retry when it becomes available
        if (!actor || isFetching) {
          pendingNameQueryRef.current = trimmed;
          setLookupState("loading");
          setProfile(null);
          return;
        }
        pendingNameQueryRef.current = null;
        const matches = searchByName(trimmed);
        setNameMatches(matches);
        setLookupState(matches.length > 0 ? "name_results" : "no_name_match");
        setProfile(null);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    value,
    actor,
    isFetching,
    lookupByPrincipal,
    searchByName,
    looksLikePrincipal,
  ]);

  const handlePrincipalSelect = () => {
    if (
      (lookupState !== "found" && lookupState !== "not_registered") ||
      !value.trim()
    )
      return;
    try {
      const principal = Principal.fromText(value.trim());
      onSelect(principal, profile);
      setValue("");
      setProfile(null);
      setLookupState("idle");
    } catch {
      /* noop */
    }
  };

  const handleNameSelect = (contact: CachedContact) => {
    try {
      const principal = Principal.fromText(contact.principal);
      onSelect(principal, null);
      setValue("");
      setNameMatches([]);
      setLookupState("idle");
    } catch {
      /* noop */
    }
  };

  // Principal display label
  const principalDisplayLabel = profile
    ? `${value.trim().slice(0, 20)}…`
    : `${value.trim().slice(0, 8)}…`;

  // Clear canister error when input is cleared
  useEffect(() => {
    if (!value.trim()) {
      setCanisterError(null);
    }
  }, [value]);

  const showDropdown = lookupState === "name_results" && nameMatches.length > 0;

  return (
    <div className="space-y-2" data-ocid="contact_search.panel">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePrincipalSelect()}
          placeholder={placeholder}
          className="pl-9 text-sm"
          data-ocid="contact_search.input"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
        />
        {lookupState === "loading" && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
          />
        )}
      </div>

      {/* Name search dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="rounded-md border border-border bg-card shadow-md overflow-hidden"
          data-ocid="contact_search.name_dropdown"
        >
          {nameMatches.map((contact, idx) => (
            <button
              key={contact.principal}
              type="button"
              onClick={() => handleNameSelect(contact)}
              data-ocid={`contact_search.name_result.${idx + 1}`}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors duration-150 text-left border-b border-border/50 last:border-b-0"
            >
              <UserAvatar principal={contact.principal} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {contact.displayName}
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {shortPrincipal(contact.principal)}
                </p>
              </div>
              <UserCheck size={14} className="text-primary flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* No name match hint */}
      {lookupState === "no_name_match" && value.trim() && (
        <p
          className="text-xs text-muted-foreground px-1"
          data-ocid="contact_search.no_results_hint"
        >
          No contacts found by name — paste the user's Principal ID to look up
          directly.
        </p>
      )}

      {/* Canister / IC error feedback */}
      {lookupState === "canister_error" && canisterError && (
        <p
          className="text-xs text-destructive px-1"
          data-ocid="contact_search.error_state"
        >
          {canisterError}
        </p>
      )}

      {/* Validation / exclusion feedback */}
      {lookupState === "invalid" && value.trim() && (
        <p
          className="text-xs text-destructive px-1"
          data-ocid="contact_search.error_state"
        >
          Invalid principal ID format
        </p>
      )}

      {lookupState === "excluded" && (
        <p
          className="text-xs text-muted-foreground px-1"
          data-ocid="contact_search.error_state"
        >
          Already added to this group
        </p>
      )}

      {/* Principal found but not yet registered on CharlieSierra */}
      {lookupState === "not_registered" && value.trim() && (
        <div className="space-y-1.5">
          <p
            className="text-xs text-destructive px-1"
            data-ocid="contact_search.not_registered_hint"
          >
            User not found — they may not be registered on CharlieSierra.
          </p>
          <button
            type="button"
            onClick={handlePrincipalSelect}
            data-ocid="contact_search.select_button"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors duration-150 text-left"
          >
            <UserAvatar principal={value.trim()} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {principalDisplayLabel}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Start a chat anyway and they can join later.
              </p>
            </div>
            <UserCheck
              size={16}
              className="text-amber-600 dark:text-amber-400 flex-shrink-0"
            />
          </button>
        </div>
      )}

      {/* Registered user found */}
      {lookupState === "found" && value.trim() && (
        <button
          type="button"
          onClick={handlePrincipalSelect}
          data-ocid="contact_search.select_button"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-muted/60 hover:bg-muted border border-border transition-colors duration-150 text-left"
        >
          <UserAvatar principal={value.trim()} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {principalDisplayLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile ? "User found — tap to start chat" : "Tap to add"}
            </p>
          </div>
          <UserCheck size={16} className="text-primary flex-shrink-0" />
        </button>
      )}
    </div>
  );
}
