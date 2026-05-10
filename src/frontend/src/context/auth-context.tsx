import { createActor } from "@/backend";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useActor } from "@caffeineai/core-infrastructure";
import type { Identity } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  principal: Principal | null;
  identity: Identity | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
  isRegistered: boolean | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { identity, login, clear, loginStatus } = useInternetIdentity();
  const { actor } = useActor(createActor);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const registrationAttempted = useRef(false);

  const isAuthenticated = loginStatus === "success" && !!identity;
  const isLoading =
    loginStatus === "logging-in" || loginStatus === "initializing";
  const principal = identity?.getPrincipal() ?? null;

  // Check registration status (read-only — registration is handled by OnboardingGate)
  useEffect(() => {
    if (
      !isAuthenticated ||
      !actor ||
      !principal ||
      registrationAttempted.current
    )
      return;
    registrationAttempted.current = true;

    actor
      .getUserProfile(principal)
      .then((profile) => setIsRegistered(!!profile))
      .catch(() => setIsRegistered(false));
  }, [isAuthenticated, actor, principal]);

  // Reset on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setIsRegistered(null);
      registrationAttempted.current = false;
    }
  }, [isAuthenticated]);

  const logout = useCallback(() => {
    clear();
  }, [clear]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        principal,
        identity: identity ?? null,
        login,
        logout,
        isLoading,
        isRegistered,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
