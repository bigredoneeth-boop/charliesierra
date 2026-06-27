import Common "common";
import OrgTypes "orgs";

module {
  // ── vetKD System API Types ──────────────────────────────────────────────

  public type VetKdCurve = { #bls12_381_g2 };

  public type VetKdKeyId = {
    curve : VetKdCurve;
    name  : Text;
  };

  public type VetKdPublicKeyRequest = {
    canister_id : ?Principal;
    context     : Blob;
    key_id      : VetKdKeyId;
  };

  public type VetKdPublicKeyResponse = {
    public_key : Blob;
  };

  public type VetKdDeriveKeyRequest = {
    input                : Blob;
    context              : Blob;
    transport_public_key : Blob;
    key_id               : VetKdKeyId;
  };

  public type VetKdDeriveKeyResponse = {
    encrypted_key : Blob;
  };

  // ── vetKeys Escrow Enrollment ─────────────────────────────────────────────

  /// Lightweight enrollment record created when a user self-enrolls via vetKeys.
  /// No wrapped key is stored — key material is derived on-demand via the
  /// management canister when a recovery request is approved.
  public type VetEscrowRecord = {
    principal        : Common.UserId;
    enrolledAt       : Common.Timestamp;
    status           : { #active; #revoked };
    keyDerivationInput : Blob; // Principal.toBlob(principal)
  };

  // ── Retention Metadata ───────────────────────────────────────────────────

  /// Metadata-only record for a message subject to group retention policy.
  /// No content fields — only routing metadata.
  public type RetentionMetadataRecord = {
    messageId      : Common.MessageId;
    convId         : Common.ConversationId;
    senderPrincipal    : Common.UserId;
    recipientPrincipals : [Common.UserId];
    sentAt         : Common.Timestamp;
  };

  /// Per-group retention policy set by a group admin.
  public type GroupRetentionPolicy = {
    convId          : Common.ConversationId;
    retentionEnabled : Bool;
    enabledAt       : ?Common.Timestamp;
    enabledBy       : ?Common.UserId;
  };

  public type GetRetentionMetadataRequest = {
    convId    : ?Common.ConversationId;
    afterMessageId : ?Common.MessageId; // pagination cursor
    limit     : Nat;
    startDate : ?Common.Timestamp;
    endDate   : ?Common.Timestamp;
  };

  // ── Key Escrow ───────────────────────────────────────────────────────────

  /// Per-device escrow enrollment — user explicitly consents to key escrow
  /// for a specific device/principal. Backend stores only the wrapped (encrypted)
  /// key — plaintext key material never touches the backend.
  public type EscrowRecord = {
    userId                   : Common.UserId;
    deviceId                 : Text;
    deviceLabel              : Text;
    devicePublicKeyFingerprint : Text;
    wrappedKey               : Blob;   // encrypted key — never plaintext
    consentTimestamp         : Common.Timestamp;
    consentLanguageVersion   : Text;   // version of the consent language shown
    revokedAt               : ?Common.Timestamp;
    revokedReason            : ?Text;
  };

  /// Grant record logged when an admin accesses a user's escrow key.
  public type EscrowAccessGrant = {
    grantId          : Nat;
    targetUserId     : Common.UserId;
    targetDeviceId   : Text;
    requestingAdmin  : Common.UserId;
    grantTimestamp   : Common.Timestamp;
    reason           : Text;
    accessOutcome    : Text;
  };

  // ── Key Recovery ─────────────────────────────────────────────────────────

  /// Status of a dual-control key recovery request.
  public type RecoveryRequestStatus = {
    #pending;    // awaiting second-admin approval
    #approved;   // second admin approved; access grant created
    #rejected;   // admin rejected the request
    #completed;  // recovery fully completed
  };

  /// Dual-control key recovery request record.
  public type RecoveryRequest = {
    id               : Nat;
    targetUserId     : Common.UserId;
    targetDeviceId   : Text;
    initiatingAdmin  : Common.UserId;
    approvedBy       : ?Common.UserId;
    status           : RecoveryRequestStatus;
    reason           : Text;
    createdAt        : Common.Timestamp;
    resolvedAt       : ?Common.Timestamp;
    orgId            : ?OrgTypes.OrgId;
  };

  // ── Escrow Dashboard Types ────────────────────────────────────────────────

  /// Escrow status for a user as shown in the admin dashboard.
  public type EscrowStatus = {
    #active;           // at least one non-revoked escrow record
    #pendingRecovery;  // a pending recovery request exists for this user
    #recovered;        // all records revoked and a completed/approved grant exists
    #revoked;          // all records have been revoked
  };

  /// Per-user summary record for the escrow admin dashboard.
  public type EscrowedUserRecord = {
    userId       : Common.UserId;
    orgId        : ?OrgTypes.OrgId;
    escrowStatus : EscrowStatus;
    lastBackedUp : ?Common.Timestamp;
    deviceCount  : Nat;
  };

  /// Request type for listing escrowed users.
  public type GetEscrowedUsersRequest = {
    orgId       : ?OrgTypes.OrgId;
    afterUserId : ?Text;
    limit       : Nat;
  };

  /// Platform-wide escrow statistics (Super Admin only).
  public type EscrowStatsRecord = {
    totalEscrowed         : Nat;
    pendingRecoveries     : Nat;
    lastRecoveryTimestamp : ?Common.Timestamp;
  };

  // ── Audit Export ─────────────────────────────────────────────────────────

  public type AuditExportFormat = { #csv; #json };

  public type AuditExportRequest = {
    startDate    : ?Common.Timestamp;
    endDate      : ?Common.Timestamp;
    eventTypes   : ?[AuditExportEventType];
    affectedUser : ?Common.UserId;
    format       : AuditExportFormat;
  };

  /// Subset of AuditEventType variants relevant to enterprise export queries.
  /// Mirrors the extended AuditEventType variants in types/admin.mo.
  public type AuditExportEventType = {
    #userRegistered;
    #messageSent;
    #callInitiated;
    #memberAdded;
    #memberRemoved;
    #adminAction;
    #userRemoved;
    #retentionEnabled;
    #retentionDisabled;
    #escrowEnrolled;
    #escrowRevoked;
    #escrowAccessGranted;
    #auditLogExported;
    // Organisation management variants
    #orgCreated;
    #orgUpdated;
    #orgSuspended;
    #orgDeleted;
    #userInvited;
    #memberRoleChanged;
    #memberSuspended;
    #memberReactivated;
    #groupMemberRemoved;
    // Key recovery variants
    #keyRecoveryInitiated;
    #keyRecoveryApproved;
    #keyRecoveryRejected;
    #keyRecoveryCompleted;
    #keyEscrowEnrolled;
    // Retention policy variants
    #retentionPolicyCreated;
    #retentionPolicyUpdated;
    #legalHoldPlaced;
    #legalHoldRemoved;
    #policyReportExported;
    #policyExpiryCheckPerformed;
  };
};
