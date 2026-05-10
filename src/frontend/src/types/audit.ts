// AuditEventType is not yet exported from the generated backend bindings.
// Defined locally here to match the Motoko variant values in the canister.
export enum AuditEventType {
  userRegistered = "userRegistered",
  messageSent = "messageSent",
  callInitiated = "callInitiated",
  memberAdded = "memberAdded",
  memberRemoved = "memberRemoved",
  adminAction = "adminAction",
  userRemoved = "userRemoved",
  retentionEnabled = "retentionEnabled",
  retentionDisabled = "retentionDisabled",
  escrowEnrolled = "escrowEnrolled",
  escrowRevoked = "escrowRevoked",
  escrowAccessGranted = "escrowAccessGranted",
  auditLogExported = "auditLogExported",
  messageQueueDrained = "messageQueueDrained",
  priorityMessageSent = "priorityMessageSent",
  sovereignConfigUpdated = "sovereignConfigUpdated",
  compartmentAssigned = "compartmentAssigned",
}
