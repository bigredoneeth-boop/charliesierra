/// Canister upgrade migration: adds recoveryRateLimits field to enterpriseState.
/// Previous EnterpriseState had no recoveryRateLimits map.
/// New shape adds { recoveryRateLimits : Map.Map<Principal, Int> } defaulting to empty.
///
/// Also carries forward the existing adminState shape (bootstrapCompleted, dataResetCompleted,
/// nextEventId, seedPrincipal) without modification.
///
/// The OldActor inline types describe the previously deployed stable state.
/// The NewActor type references AdminLib.State directly so the compiler can
/// verify it matches the current actor body without type duplication.
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import AdminLib "lib/admin";
import EnterpriseLib "lib/enterprise";
import SettingsLib "lib/settings";
import SettingsT "types/settings";

module {
  // ── Old inline types (previously deployed shape) ───────────────────────────
  // AuditEventType is an open variant — old stored data only needs the tags that
  // existed at the previous deployment. The Map stores the variant by tag index,
  // so the supertype relationship allows old values to be read into the new type.
  type UserId = Principal;

  // ── Old enterprise state inline types ─────────────────────────────────────
  type OldGroupRetentionPolicy = {
    convId          : Nat;
    retentionEnabled : Bool;
    enabledAt       : ?Int;
    enabledBy       : ?UserId;
  };

  type OldRetentionMetadataRecord = {
    messageId           : Nat;
    convId              : Nat;
    senderPrincipal     : UserId;
    recipientPrincipals : [UserId];
    sentAt              : Int;
  };

  type OldEscrowRecord = {
    userId                   : UserId;
    deviceId                 : Text;
    deviceLabel              : Text;
    devicePublicKeyFingerprint : Text;
    wrappedKey               : Blob;
    consentTimestamp         : Int;
    consentLanguageVersion   : Text;
    revokedAt               : ?Int;
    revokedReason            : ?Text;
  };

  type OldEscrowAccessGrant = {
    grantId          : Nat;
    targetUserId     : UserId;
    targetDeviceId   : Text;
    requestingAdmin  : UserId;
    grantTimestamp   : Int;
    reason           : Text;
    accessOutcome    : Text;
  };

  type OldRecoveryRequest = {
    id               : Nat;
    targetUserId     : UserId;
    targetDeviceId   : Text;
    initiatingAdmin  : UserId;
    approvedBy       : ?UserId;
    status           : { #pending; #approved; #rejected; #completed };
    reason           : Text;
    createdAt        : Int;
    resolvedAt       : ?Int;
    orgId            : ?Text;
  };

  type OldVetEscrowRecord = {
    principal          : UserId;
    enrolledAt         : Int;
    status             : { #active; #revoked };
    keyDerivationInput : Blob;
  };

  type OldEnterpriseState = {
    retentionPolicies        : Map.Map<Nat, OldGroupRetentionPolicy>;
    retentionMetadata        : List.List<OldRetentionMetadataRecord>;
    escrowRecords            : Map.Map<(UserId, Text), OldEscrowRecord>;
    escrowGrants             : Map.Map<Nat, OldEscrowAccessGrant>;
    recoveryRequests         : Map.Map<Nat, OldRecoveryRequest>;
    vetEscrowRecords         : Map.Map<UserId, OldVetEscrowRecord>;
    recoveryRateLimits       : Map.Map<UserId, Int>;
    recoveryRateLimitCounts  : Map.Map<UserId, Nat>;
    state                    : { var nextGrantId : Nat; var nextRecoveryRequestId : Nat };
  };

  // ── Old settings state inline types ────────────────────────────────────────
  // Previously deployed settingsState had only platformSettings + orgSettingsMap.
  // We import the same SettingsT types since the platform/org settings record
  // shapes have not changed — only the rate-limit maps were added as new fields.
  type OldSettingsState = {
    platformSettings               : { var value : SettingsT.PlatformSettings };
    orgSettingsMap                 : Map.Map<Text, SettingsT.OrgSettings>;
    settingsUpdateRateLimitWindows : Map.Map<UserId, Int>;
    settingsUpdateRateLimitCounts  : Map.Map<UserId, Nat>;
  };

  // ── Old inline admin types (previously deployed shape) ─────────────────────
  type OldAuditEventType = {
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
    #messageQueueDrained;
    #priorityMessageSent;
    #sovereignConfigUpdated;
    #compartmentAssigned;
    #orgCreated;
    #orgUpdated;
    #orgSuspended;
    #orgDeleted;
    #userInvited;
    #memberRoleChanged;
    #memberSuspended;
    #memberReactivated;
    #groupMemberRemoved;
    #keyRecoveryInitiated;
    #keyRecoveryApproved;
    #keyRecoveryRejected;
    #keyRecoveryCompleted;
    #keyEscrowEnrolled;
    #retentionPolicyCreated;
    #retentionPolicyUpdated;
    #legalHoldPlaced;
    #legalHoldRemoved;
    #policyReportExported;
    #policyExpiryCheckPerformed;
    #platformSettingsUpdated;
    #orgSettingsUpdated;
  };

  type OldAuditEvent = {
    id : Nat;
    eventType : OldAuditEventType;
    actorPrincipal : UserId;
    targetPrincipal : ?UserId;
    timestamp : Int;
    encryptedDetails : ?Blob;
    orgId : ?Text;  // OrgId = Text in the deployed types
  };

  type OldAdminState = {
    adminPrincipals : Set.Set<UserId>;
    auditLog        : Map.Map<Nat, OldAuditEvent>;
    state : {
      var bootstrapCompleted : Bool;
      var dataResetCompleted : Bool;
      var nextEventId        : Nat;
      var seedPrincipal      : ?Principal;
    };
  };

  type OldActor = {
    adminState      : OldAdminState;
    enterpriseState : OldEnterpriseState;
    settingsState   : OldSettingsState;
  };

  // ── NewActor uses lib State types directly ─────────────────────────────────
  type NewActor = {
    adminState      : AdminLib.State;
    enterpriseState : EnterpriseLib.State;
    settingsState   : SettingsLib.State;
  };

  // ── Migration function ─────────────────────────────────────────────────────
  public func run(old : OldActor) : NewActor {
    let newAdminState : AdminLib.State = {
      adminPrincipals = old.adminState.adminPrincipals;
      auditLog        = old.adminState.auditLog;
      state = {
        var bootstrapCompleted = old.adminState.state.bootstrapCompleted;
        var dataResetCompleted = old.adminState.state.dataResetCompleted;
        var nextEventId        = old.adminState.state.nextEventId;
        var seedPrincipal      = old.adminState.state.seedPrincipal;
      };
    };
    // Carry through all existing enterprise collections including rate-limit maps.
    let newEnterpriseState : EnterpriseLib.State = {
      retentionPolicies        = old.enterpriseState.retentionPolicies;
      retentionMetadata        = old.enterpriseState.retentionMetadata;
      escrowRecords            = old.enterpriseState.escrowRecords;
      escrowGrants             = old.enterpriseState.escrowGrants;
      recoveryRequests         = old.enterpriseState.recoveryRequests;
      vetEscrowRecords         = old.enterpriseState.vetEscrowRecords;
      recoveryRateLimits       = old.enterpriseState.recoveryRateLimits;
      recoveryRateLimitCounts  = old.enterpriseState.recoveryRateLimitCounts;
      state = {
        var nextGrantId           = old.enterpriseState.state.nextGrantId;
        var nextRecoveryRequestId = old.enterpriseState.state.nextRecoveryRequestId;
      };
    };
    // Carry through existing settings including rate-limit maps.
    let newSettingsState : SettingsLib.State = {
      platformSettings               = old.settingsState.platformSettings;
      orgSettingsMap                 = old.settingsState.orgSettingsMap;
      settingsUpdateRateLimitWindows = old.settingsState.settingsUpdateRateLimitWindows;
      settingsUpdateRateLimitCounts  = old.settingsState.settingsUpdateRateLimitCounts;
    };
    {
      adminState      = newAdminState;
      enterpriseState = newEnterpriseState;
      settingsState   = newSettingsState;
    };
  };
};
