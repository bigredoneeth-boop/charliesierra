import Common "common";

module {
  public type AuditEventType = {
    #userRegistered;
    #messageSent;
    #callInitiated;
    #memberAdded;
    #memberRemoved;
    #adminAction;
    #userRemoved;
    // Enterprise admin control variants
    #retentionEnabled;
    #retentionDisabled;
    #escrowEnrolled;
    #escrowRevoked;
    #escrowAccessGranted;
    #auditLogExported;
    // Resilience / priority-messaging variants
    #messageQueueDrained;  // offline queue synced after reconnect
    #priorityMessageSent;  // high-priority message delivered
    // Sovereign deployment variants
    #sovereignConfigUpdated;   // admin updated deployment config
    #compartmentAssigned;      // group compartment label set
  };

  // Audit log entry — encrypted_details keeps sensitive data opaque
  public type AuditEvent = {
    id : Nat;
    eventType : AuditEventType;
    actorPrincipal : Common.UserId;
    targetPrincipal : ?Common.UserId;
    timestamp : Common.Timestamp;
    encryptedDetails : ?Blob; // optional encrypted context blob
  };

  public type AuditEventPublic = AuditEvent; // already fully shareable

  public type GetAuditLogRequest = {
    afterEventId : ?Nat;    // pagination cursor
    limit : Nat;
    filterEventType : ?AuditEventType;
  };
};
