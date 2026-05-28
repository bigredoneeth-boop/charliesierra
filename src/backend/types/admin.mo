import Common "common";
import Orgs "orgs";

module {
  public type AuditEventType = {
    #userRegistered;
    #messageSent;
    #callInitiated;
    #memberAdded;
    #memberRemoved;        // member removed from group or org
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
    // Organisation management variants
    #orgCreated;           // new org/tenant created
    #orgUpdated;           // org name/description updated
    #orgSuspended;         // org suspended by SuperAdmin
    #orgDeleted;           // org permanently deleted by SuperAdmin
    #userInvited;          // user invited to an org
    #memberRoleChanged;    // member's org role updated
    #memberSuspended;      // member suspended within an org
    #memberReactivated;    // suspended member reactivated
    // Group admin variants
    #groupMemberRemoved;   // admin force-removed a member from a group
    // Key recovery variants
    #keyRecoveryInitiated;   // admin initiated a dual-control key recovery request
    #keyRecoveryApproved;    // second admin approved the key recovery request
    #keyRecoveryRejected;    // admin rejected the key recovery request
    #keyRecoveryCompleted;   // vetKD encrypted key delivered to authorized admin
    // Key escrow variants
    #keyEscrowEnrolled;      // user self-enrolled via vetKeys escrow
    // Retention policy management variants
    #retentionPolicyCreated; // admin created an org-level or global retention policy
    #retentionPolicyUpdated; // admin updated an existing retention policy
    #legalHoldPlaced;        // admin placed a legal hold on an org
    #legalHoldRemoved;       // admin removed a legal hold from an org
    // Retention reporting variants
    #policyReportExported;      // admin exported a policy compliance report
    #policyExpiryCheckPerformed; // admin checked for near-expiry policies
    // Settings management variants
    #platformSettingsUpdated;   // Super Admin updated global platform settings
    #orgSettingsUpdated;        // Org Admin or Super Admin updated org-level settings
  };

  // Audit log entry — encrypted_details keeps sensitive data opaque
  // orgId is set for org-scoped events so logs can be filtered per tenant.
  public type AuditEvent = {
    id : Nat;
    eventType : AuditEventType;
    actorPrincipal : Common.UserId;
    targetPrincipal : ?Common.UserId;
    timestamp : Common.Timestamp;
    encryptedDetails : ?Blob; // optional encrypted context blob
    orgId : ?Orgs.OrgId;     // org scope for multi-tenant filtering
  };

  public type AuditEventPublic = AuditEvent; // already fully shareable

  public type GetAuditLogRequest = {
    afterEventId      : ?Nat;              // pagination cursor
    limit             : Nat;
    filterEventType   : ?AuditEventType;
    afterTimestamp    : ?Common.Timestamp; // include only events with timestamp > this
    beforeTimestamp   : ?Common.Timestamp; // include only events with timestamp < this
    filterOrgId       : ?Orgs.OrgId;       // restrict to a specific organisation
    filterActor       : ?Common.UserId;    // restrict to a specific actor principal
  };

  // Export request — same filters as GetAuditLogRequest but no pagination.
  // Returns up to 10,000 events in one shot (intended for CSV export).
  public type ExportAuditLogsRequest = {
    filterEventType   : ?AuditEventType;
    afterTimestamp    : ?Common.Timestamp;
    beforeTimestamp   : ?Common.Timestamp;
    filterOrgId       : ?Orgs.OrgId;
    filterActor       : ?Common.UserId;
  };
};
