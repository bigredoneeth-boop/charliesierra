// This file is intentionally left as a no-op module.
// All join request polling and notification logic lives in:
//   src/frontend/src/components/JoinRequestNotifier.tsx
// Context and hook exports live in:
//   src/frontend/src/hooks/use-pending-join-requests.ts
//
// The .ts file takes precedence in TypeScript's module resolution, so
// keeping this .tsx file empty avoids duplicate export conflicts.
export {};
