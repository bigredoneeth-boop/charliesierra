import Common "common";

module {
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
  };
};
