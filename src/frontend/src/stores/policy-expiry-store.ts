/**
 * policyExpiryStore
 * Zustand store for cross-component policy expiry badge count.
 * AdminDashboardPage and AdminRetentionPoliciesPage write to this store.
 * AdminLayout reads it to show the amber badge on the Retention Policies nav item.
 */
import { create } from "zustand";

interface PolicyExpiryState {
  expiryCount: number;
  setExpiryCount: (count: number) => void;
}

export const usePolicyExpiryStore = create<PolicyExpiryState>((set) => ({
  expiryCount: 0,
  setExpiryCount: (count) => set({ expiryCount: count }),
}));
