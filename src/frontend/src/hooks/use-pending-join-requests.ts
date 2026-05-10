import { createContext, useContext } from "react";

// Context: exposes live pending join request count to Layout + any consumer
export const PendingJoinRequestsContext = createContext<number>(0);

export function usePendingJoinRequestCount(): number {
  return useContext(PendingJoinRequestsContext);
}
