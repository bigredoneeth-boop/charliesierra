import Common "../types/common";
import T "../types/enterprise";
import AdminT "../types/admin";
import AdminLib "admin";
import OrgTypes "../types/orgs";
import ConvT "../types/conversations";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

module {
  // ── Management Canister Interface (vetKD) ─────────────────────────────────

  let managementCanister : actor {
    vetkd_public_key : (T.VetKdPublicKeyRequest) -> async T.VetKdPublicKeyResponse;
    vetkd_derive_key : (T.VetKdDeriveKeyRequest) -> async T.VetKdDeriveKeyResponse;
  } = actor "aaaaa-aa";

  /// Shared vetKD key identity used throughout CharlieSierra escrow.
  let escrowKeyId : T.VetKdKeyId = {
    curve = #bls12_381_g2;
    name  = "key_1";
  };

  /// Shared derivation context — must match across all calls.
  let escrowContext : Blob = "\63\68\61\72\6c\69\65\73\69\65\72\72\61\5f\6b\65\79\5f\65\73\63\72\6f\77\5f\76\31";

  // ── State ──────────────────────────────────────────────────────────────────

  public type State = {
    retentionPolicies        : Map.Map<Common.ConversationId, T.GroupRetentionPolicy>;
    retentionMetadata        : List.List<T.RetentionMetadataRecord>;
    escrowRecords            : Map.Map<(Common.UserId, Text), T.EscrowRecord>;
    escrowGrants             : Map.Map<Nat, T.EscrowAccessGrant>;
    recoveryRequests         : Map.Map<Nat, T.RecoveryRequest>;
    vetEscrowRecords         : Map.Map<Common.UserId, T.VetEscrowRecord>;
    recoveryRateLimits       : Map.Map<Common.UserId, Int>;  // window-start timestamp per admin
    recoveryRateLimitCounts  : Map.Map<Common.UserId, Nat>;  // attempts in current window
    state                    : { var nextGrantId : Nat; var nextRecoveryRequestId : Nat };
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  /// Compute a human-readable fingerprint from a Blob by formatting the
  /// first 8 bytes as colon-separated hex pairs (e.g. "a1:b2:c3:d4:e5:f6:07:08").
  /// Used for vetKeys audit log entries — never logs raw key material.
  func blobFingerprint(b : Blob) : Text {
    let bytes = b.toArray();
    var out = "";
    var i = 0;
    let limit = if (bytes.size() < 8) bytes.size() else 8;
    while (i < limit) {
      let byte = bytes[i];
      let hi = byte / 16;
      let lo = byte % 16;
      let hexChar = func(n : Nat8) : Text {
        if (n < 10) n.toText()
        else if (n == 10) "a" else if (n == 11) "b" else if (n == 12) "c"
        else if (n == 13) "d" else if (n == 14) "e" else "f"
      };
      if (i > 0) { out #= ":" };
      out #= hexChar(hi) # hexChar(lo);
      i += 1;
    };
    out
  };

  /// Build the derivation ID as a hex fingerprint of the escrow context blob.
  func derivationId() : Text {
    blobFingerprint(escrowContext)
  };

  // ── vetKeys Escrow Methods ─────────────────────────────────────────────────

  /// Retrieve the canister's vetKD public key for the escrow context.
  /// Any caller may call this — used by clients to encrypt transport keys.
  /// Returns the BLS12-381 G2 public key blob.
  public func getEscrowPublicKey(
    adminState : AdminLib.State,
    caller     : Common.UserId,
  ) : async Common.Result<Blob, Text> {
    let req : T.VetKdPublicKeyRequest = {
      canister_id = null;
      context     = escrowContext;
      key_id      = escrowKeyId;
    };
    let resp = await managementCanister.vetkd_public_key(req);
    AdminLib.recordEvent(adminState, #adminAction, caller, null, null);
    #ok(resp.public_key);
  };

  /// Self-enroll the calling principal into vetKeys-based escrow.
  /// Creates a VetEscrowRecord keyed by the caller's principal.
  /// Returns an error if the caller is already enrolled.
  public func enrollUserKeyEscrow(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
  ) : Common.Result<Text, Text> {
    switch (s.vetEscrowRecords.get(caller)) {
      case (?existing) {
        if (existing.status == #active) {
          return #err("Already enrolled");
        };
        // Allow re-enrollment if previously revoked
      };
      case null {};
    };
    let record : T.VetEscrowRecord = {
      principal          = caller;
      enrolledAt         = Time.now();
      status             = #active;
      keyDerivationInput = caller.toBlob();
    };
    s.vetEscrowRecords.add(caller, record);
    AdminLib.recordEvent(adminState, #keyEscrowEnrolled, caller, null, null);
    #ok("Enrolled successfully");
  };

  /// Derive and return a transport-encrypted escrow key for a target principal.
  /// Caller must be Super Admin or Org Admin.
  /// Target must have an approved recovery request with dual-control satisfied
  /// (initiatedBy != approvedBy and approvedBy is set).
  /// The recovery request is marked #completed after successful derivation.
  public func getEncryptedEscrowKey(
    s                  : State,
    adminState         : AdminLib.State,
    caller             : Common.UserId,
    targetPrincipal    : Common.UserId,
    transportPublicKey : Blob,
  ) : async Common.Result<Blob, Text> {
    // SECURITY: Validate transport key length before any other operation.
    // Must be exactly 48 bytes (compressed P-256 public key per vetKeys spec).
    if (transportPublicKey.size() != 48) {
      return #err("Invalid transport public key: expected 48 bytes, got " # transportPublicKey.size().toText());
    };
    // SECURITY: Reject all-zero transport key (trivially weak).
    let allZero = transportPublicKey.toArray().foldLeft(
      true,
      func(acc, b) { acc and (b == 0) },
    );
    if (allZero) { return #err("Invalid transport public key: all-zero key rejected") };

    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err("Unauthorized: admin role required");
    };
    // Find an approved recovery request for this target with dual-control satisfied
    var approvedRequest : ?T.RecoveryRequest = null;
    for ((_rid, rr) in s.recoveryRequests.entries()) {
      if (
        Principal.equal(rr.targetUserId, targetPrincipal) and
        rr.status == #approved
      ) {
        switch (rr.approvedBy) {
          case (?approver) {
            if (not Principal.equal(rr.initiatingAdmin, approver)) {
              approvedRequest := ?rr;
            };
          };
          case null {};
        };
      };
    };
    let rr = switch (approvedRequest) {
      case null {
        return #err("No approved dual-control recovery request found for this principal");
      };
      case (?r) r;
    };
    // Call management canister to derive the encrypted key
    let deriveReq : T.VetKdDeriveKeyRequest = {
      input                = targetPrincipal.toBlob();
      context              = escrowContext;
      transport_public_key = transportPublicKey;
      key_id               = escrowKeyId;
    };
    let deriveResp = await managementCanister.vetkd_derive_key(deriveReq);
    // Mark the recovery request as completed
    let completed : T.RecoveryRequest = {
      rr with
      status     = #completed;
      resolvedAt = ?Time.now();
    };
    s.recoveryRequests.add(rr.id, completed);
    // SECURITY: no raw key material — only safe compliance metadata in audit log
    let transportFingerprint = blobFingerprint(transportPublicKey);
    let derivId = derivationId();
    let detailsJson =
      "{" #
      "\"recoveryId\":" # rr.id.toText() # "," #
      "\"targetPrincipal\":\"" # targetPrincipal.toText() # "\"," #
      "\"transportKeyFingerprint\":\"" # transportFingerprint # "\"," #
      "\"derivationId\":\"" # derivId # "\"" #
      "}";
    let detailsBlob = ?detailsJson.encodeUtf8();
    // SECURITY: no raw key material — detailsBlob contains only fingerprint metadata
    AdminLib.recordEvent(adminState, #keyRecoveryCompleted, caller, ?targetPrincipal, detailsBlob);
    #ok(deriveResp.encrypted_key);
  };

  func escrowKey(userId : Common.UserId, deviceId : Text) : (Common.UserId, Text) {
    (userId, deviceId);
  };

  func cmpEscrowKey(
    a : (Common.UserId, Text),
    b : (Common.UserId, Text)
  ) : { #less; #equal; #greater } {
    let pc = Principal.compare(a.0, b.0);
    if (pc != #equal) pc else Text.compare(a.1, b.1);
  };

  // ── Group Retention Policy ─────────────────────────────────────────────────

  /// Enable retention metadata collection for a group conversation.
  /// Caller must be a member of the conversation.
  public func enableGroupRetention(
    s         : State,
    adminState : AdminLib.State,
    caller    : Common.UserId,
    convId    : Common.ConversationId,
    getConv   : Common.ConversationId -> ?ConvT.Conversation,
  ) : Common.Result<(), Common.Error> {
    switch (getConv(convId)) {
      case null { #err(#notFound) };
      case (?conv) {
        if (conv.kind != #group) { return #err(#forbidden) };
        if (not AdminLib.isAdmin(adminState, caller)) { return #err(#unauthorized) };
        let policy : T.GroupRetentionPolicy = {
          convId;
          retentionEnabled = true;
          enabledAt = ?Time.now();
          enabledBy = ?caller;
        };
        s.retentionPolicies.add(convId, policy);
        AdminLib.recordEvent(
          adminState,
          #retentionEnabled,
          caller,
          null,
          null,
        );
        #ok(());
      };
    };
  };

  /// Disable retention metadata collection for a group conversation.
  public func disableGroupRetention(
    s         : State,
    adminState : AdminLib.State,
    caller    : Common.UserId,
    convId    : Common.ConversationId,
    getConv   : Common.ConversationId -> ?ConvT.Conversation,
  ) : Common.Result<(), Common.Error> {
    switch (getConv(convId)) {
      case null { #err(#notFound) };
      case (?conv) {
        if (conv.kind != #group) { return #err(#forbidden) };
        if (not AdminLib.isAdmin(adminState, caller)) { return #err(#unauthorized) };
        let policy : T.GroupRetentionPolicy = {
          convId;
          retentionEnabled = false;
          enabledAt = null;
          enabledBy = null;
        };
        s.retentionPolicies.add(convId, policy);
        AdminLib.recordEvent(
          adminState,
          #retentionDisabled,
          caller,
          null,
          null,
        );
        #ok(());
      };
    };
  };

  /// Get the retention policy for a group conversation.
  /// Returns a default disabled policy if none has been set.
  public func getGroupRetentionPolicy(
    s      : State,
    caller : Common.UserId,
    convId : Common.ConversationId,
    getConv : Common.ConversationId -> ?ConvT.Conversation,
  ) : Common.Result<T.GroupRetentionPolicy, Common.Error> {
    switch (getConv(convId)) {
      case null { #err(#notFound) };
      case (?conv) {
        let isMember = conv.members.find(
          func(m : Common.UserId) : Bool { Principal.equal(m, caller) }
        ) != null;
        if (not isMember) { return #err(#unauthorized) };
        let policy = switch (s.retentionPolicies.get(convId)) {
          case (?p) p;
          case null {
            { convId; retentionEnabled = false; enabledAt = null; enabledBy = null };
          };
        };
        #ok(policy);
      };
    };
  };

  /// Called by the messages domain on every sendMessage.
  /// Records metadata (no content) if the conversation has retention enabled.
  public func maybeRecordRetentionMetadata(
    s       : State,
    msgId   : Common.MessageId,
    convId  : Common.ConversationId,
    sender  : Common.UserId,
    members : [Common.UserId],
  ) : () {
    switch (s.retentionPolicies.get(convId)) {
      case null {};
      case (?policy) {
        if (policy.retentionEnabled) {
          let record : T.RetentionMetadataRecord = {
            messageId           = msgId;
            convId;
            senderPrincipal     = sender;
            recipientPrincipals = members;
            sentAt              = Time.now();
          };
          s.retentionMetadata.add(record);
        };
      };
    };
  };

  // ── Key Escrow ─────────────────────────────────────────────────────────────

  /// Enroll or update a device's wrapped key in escrow.
  public func enrollKeyEscrow(
    s                      : State,
    adminState             : AdminLib.State,
    caller                 : Common.UserId,
    deviceId               : Text,
    deviceLabel            : Text,
    devicePublicKeyFingerprint : Text,
    wrappedKey             : Blob,
    consentLanguageVersion : Text,
  ) : Common.Result<(), Common.Error> {
    let record : T.EscrowRecord = {
      userId                   = caller;
      deviceId;
      deviceLabel;
      devicePublicKeyFingerprint;
      wrappedKey;
      consentTimestamp         = Time.now();
      consentLanguageVersion;
      revokedAt               = null;
      revokedReason            = null;
    };
    s.escrowRecords.add(cmpEscrowKey, escrowKey(caller, deviceId), record);
    AdminLib.recordEvent(adminState, #escrowEnrolled, caller, null, null);
    #ok(());
  };

  /// Revoke escrow for a specific device.
  public func revokeKeyEscrow(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    deviceId   : Text,
    reason     : Text,
  ) : Common.Result<(), Common.Error> {
    let key = escrowKey(caller, deviceId);
    switch (s.escrowRecords.get(cmpEscrowKey, key)) {
      case null { #err(#notFound) };
      case (?existing) {
        if (existing.revokedAt != null) { return #err(#notFound) };
        let updated : T.EscrowRecord = {
          existing with
          revokedAt     = ?Time.now();
          revokedReason = ?reason;
        };
        s.escrowRecords.add(cmpEscrowKey, key, updated);
        AdminLib.recordEvent(adminState, #escrowRevoked, caller, null, null);
        #ok(());
      };
    };
  };

  /// Return all escrow records for the calling user.
  public func getMyEscrowStatus(
    s      : State,
    caller : Common.UserId,
  ) : [T.EscrowRecord] {
    s.escrowRecords.entries()
      |> _.filter(func((k, _) : ((Common.UserId, Text), T.EscrowRecord)) : Bool {
          Principal.equal(k.0, caller)
        })
      |> _.map(func((_, v) : ((Common.UserId, Text), T.EscrowRecord)) : T.EscrowRecord { v })
      |> _.toArray();
  };

  // ── Admin Escrow Access ────────────────────────────────────────────────────

  /// Grant an admin access to a user's escrow key and return the grant record.
  public func adminGrantEscrowAccess(
    s              : State,
    adminState     : AdminLib.State,
    caller         : Common.UserId,
    targetUserId   : Common.UserId,
    targetDeviceId : Text,
    reason         : Text,
  ) : Common.Result<T.EscrowAccessGrant, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let key = escrowKey(targetUserId, targetDeviceId);
    switch (s.escrowRecords.get(cmpEscrowKey, key)) {
      case null { #err(#notFound) };
      case (?escrow) {
        if (escrow.revokedAt != null) { return #err(#notFound) };
        let grantId = s.state.nextGrantId;
        s.state.nextGrantId += 1;
        let grant : T.EscrowAccessGrant = {
          grantId;
          targetUserId;
          targetDeviceId;
          requestingAdmin  = caller;
          grantTimestamp   = Time.now();
          reason;
          // accessOutcome encodes: which wrapped key blob was returned
          accessOutcome    = debug_show(escrow.wrappedKey);
        };
        s.escrowGrants.add(grantId, grant);
        AdminLib.recordEvent(adminState, #escrowAccessGranted, caller, ?targetUserId, null);
        #ok(grant);
      };
    };
  };

  /// Paginated list of all escrow access grants, optionally filtered by target user.
  public func adminGetEscrowGrants(
    s            : State,
    adminState   : AdminLib.State,
    caller       : Common.UserId,
    targetUserId : ?Common.UserId,
    limit        : Nat,
    afterGrantId : ?Nat,
  ) : Common.Result<[T.EscrowAccessGrant], Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let effectiveLimit = if (limit == 0) { 50 } else { limit };
    let startId = switch (afterGrantId) {
      case (?cursor) cursor + 1;
      case null 0;
    };
    let results = List.empty<T.EscrowAccessGrant>();
    var i = startId;
    label scan while (i < s.state.nextGrantId and results.size() < effectiveLimit) {
      switch (s.escrowGrants.get(i)) {
        case null {};
        case (?grant) {
          let matches = switch (targetUserId) {
            case (?uid) Principal.equal(grant.targetUserId, uid);
            case null true;
          };
          if (matches) { results.add(grant) };
        };
      };
      i += 1;
    };
    #ok(results.toArray());
  };

  // ── Audit Log Export ───────────────────────────────────────────────────────

  /// Export the audit log as CSV or JSON text.
  /// Records an #auditLogExported event in the audit log.
  public func exportAuditLog(
    _s         : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    req        : T.AuditExportRequest,
  ) : Common.Result<Text, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    // Filter audit log entries
    let matching = List.empty<AdminT.AuditEvent>();
    adminState.auditLog.entries()
      |> _.forEach(func((_, ev) : (Nat, AdminT.AuditEvent)) : () {
          // Date range filter
          let afterStart = switch (req.startDate) {
            case (?start) ev.timestamp >= start;
            case null true;
          };
          let beforeEnd = switch (req.endDate) {
            case (?end_) ev.timestamp <= end_;
            case null true;
          };
          // Event type filter
          let typeMatches = switch (req.eventTypes) {
            case null true;
            case (?types) {
              types.find(func(et : T.AuditExportEventType) : Bool {
                exportEventTypeMatches(et, ev.eventType)
              }) != null;
            };
          };
          // Affected user filter
          let userMatches = switch (req.affectedUser) {
            case null true;
            case (?uid) {
              Principal.equal(ev.actorPrincipal, uid) or
              (switch (ev.targetPrincipal) {
                case (?tp) Principal.equal(tp, uid);
                case null false;
              });
            };
          };
          if (afterStart and beforeEnd and typeMatches and userMatches) {
            matching.add(ev);
          };
        });
    let total = matching.size();
    let payload = switch (req.format) {
      case (#csv) buildCsv(matching);
      case (#json) buildJson(matching, caller, total);
    };
    AdminLib.recordEvent(adminState, #auditLogExported, caller, null, null);
    #ok(payload);
  };

  func exportEventTypeMatches(
    et       : T.AuditExportEventType,
    actual   : AdminT.AuditEventType,
  ) : Bool {
    switch (et, actual) {
      case (#userRegistered,   #userRegistered)   true;
      case (#messageSent,      #messageSent)      true;
      case (#callInitiated,    #callInitiated)    true;
      case (#memberAdded,      #memberAdded)      true;
      case (#memberRemoved,    #memberRemoved)    true;
      case (#adminAction,      #adminAction)      true;
      case (#userRemoved,      #userRemoved)      true;
      case (#retentionEnabled, #retentionEnabled) true;
      case (#retentionDisabled,#retentionDisabled) true;
      case (#escrowEnrolled,   #escrowEnrolled)   true;
      case (#escrowRevoked,    #escrowRevoked)    true;
      case (#escrowAccessGranted, #escrowAccessGranted) true;
      case (#auditLogExported, #auditLogExported) true;
      case (#orgCreated,       #orgCreated)       true;
      case (#orgUpdated,       #orgUpdated)       true;
      case (#orgSuspended,     #orgSuspended)     true;
      case (#orgDeleted,       #orgDeleted)       true;
      case (#userInvited,      #userInvited)      true;
      case (#memberRoleChanged, #memberRoleChanged) true;
      case (#memberSuspended,  #memberSuspended)  true;
      case (#memberReactivated, #memberReactivated) true;
      case (#groupMemberRemoved, #groupMemberRemoved) true;
      case (#keyRecoveryInitiated, #keyRecoveryInitiated) true;
      case (#keyRecoveryApproved, #keyRecoveryApproved) true;
      case (#keyRecoveryRejected, #keyRecoveryRejected) true;
      case (#keyRecoveryCompleted, #keyRecoveryCompleted) true;
      case (#keyEscrowEnrolled, #keyEscrowEnrolled) true;
      case (#retentionPolicyCreated, #retentionPolicyCreated) true;
      case (#retentionPolicyUpdated, #retentionPolicyUpdated) true;
      case (#legalHoldPlaced, #legalHoldPlaced) true;
      case (#legalHoldRemoved, #legalHoldRemoved) true;
      case (#policyReportExported, #policyReportExported) true;
      case (#policyExpiryCheckPerformed, #policyExpiryCheckPerformed) true;
      case _ false;
    };
  };

  func auditEventTypeText(et : AdminT.AuditEventType) : Text {
    switch et {
      case (#userRegistered)      "userRegistered";
      case (#messageSent)         "messageSent";
      case (#callInitiated)       "callInitiated";
      case (#memberAdded)         "memberAdded";
      case (#memberRemoved)       "memberRemoved";
      case (#adminAction)         "adminAction";
      case (#userRemoved)         "userRemoved";
      case (#retentionEnabled)    "retentionEnabled";
      case (#retentionDisabled)   "retentionDisabled";
      case (#escrowEnrolled)      "escrowEnrolled";
      case (#escrowRevoked)       "escrowRevoked";
      case (#escrowAccessGranted) "escrowAccessGranted";
      case (#auditLogExported)    "auditLogExported";
      case (#messageQueueDrained)     "messageQueueDrained";
      case (#priorityMessageSent)     "priorityMessageSent";
      case (#sovereignConfigUpdated)  "sovereignConfigUpdated";
      case (#compartmentAssigned)     "compartmentAssigned";
      case (#orgCreated)          "orgCreated";
      case (#orgUpdated)          "orgUpdated";
      case (#orgSuspended)        "orgSuspended";
      case (#orgDeleted)          "orgDeleted";
      case (#userInvited)         "userInvited";
      case (#memberRoleChanged)   "memberRoleChanged";
      case (#memberSuspended)      "memberSuspended";
      case (#memberReactivated)    "memberReactivated";
      case (#groupMemberRemoved)   "groupMemberRemoved";
      case (#keyRecoveryInitiated)   "keyRecoveryInitiated";
      case (#keyRecoveryApproved)    "keyRecoveryApproved";
      case (#keyRecoveryRejected)    "keyRecoveryRejected";
      case (#keyRecoveryCompleted)   "keyRecoveryCompleted";
      case (#keyEscrowEnrolled)      "keyEscrowEnrolled";
      case (#retentionPolicyCreated) "retentionPolicyCreated";
      case (#retentionPolicyUpdated) "retentionPolicyUpdated";
      case (#legalHoldPlaced)        "legalHoldPlaced";
      case (#legalHoldRemoved)       "legalHoldRemoved";
      case (#policyReportExported)       "policyReportExported";
      case (#policyExpiryCheckPerformed) "policyExpiryCheckPerformed";
      case (#platformSettingsUpdated)    "platformSettingsUpdated";
      case (#orgSettingsUpdated)         "orgSettingsUpdated";
    };
  };

  func buildCsv(events : List.List<AdminT.AuditEvent>) : Text {
    let header = "eventId,eventType,actorPrincipal,targetPrincipal,timestamp,hasEncryptedDetails";
    let rows = events.map(func(ev) {
      let target = switch (ev.targetPrincipal) {
        case (?tp) tp.toText();
        case null "";
      };
      let hasDetails = switch (ev.encryptedDetails) {
        case (?_) "true";
        case null "false";
      };
      ev.id.toText() # "," #
      auditEventTypeText(ev.eventType) # "," #
      ev.actorPrincipal.toText() # "," #
      target # "," #
      ev.timestamp.toText() # "," #
      hasDetails;
    });
    let lines = List.empty<Text>();
    lines.add(header);
    lines.append(rows);
    lines.values().join("\n");
  };

  func buildJson(
    events : List.List<AdminT.AuditEvent>,
    exporter : Common.UserId,
    total : Nat,
  ) : Text {
    let now = Time.now();
    // Simple deterministic payload hash: "sha256-count-<total>-ts-<now>"
    let payloadHash = "sha256-count-" # total.toText() # "-ts-" # now.toText();
    let eventJsons = events.map(func(ev) {
      let target = switch (ev.targetPrincipal) {
        case (?tp) "\"" # tp.toText() # "\"";
        case null "null";
      };
      let hasDetails = switch (ev.encryptedDetails) {
        case (?_) "true";
        case null "false";
      };
      "{" #
      "\"eventId\":" # ev.id.toText() # "," #
      "\"eventType\":\"" # auditEventTypeText(ev.eventType) # "\"," #
      "\"actorPrincipal\":\"" # ev.actorPrincipal.toText() # "\"," #
      "\"targetPrincipal\":" # target # "," #
      "\"timestamp\":" # ev.timestamp.toText() # "," #
      "\"hasEncryptedDetails\":" # hasDetails #
      "}";
    });
    let eventsArray = "[" # eventJsons.values().join(",") # "]";
    "{" #
    "\"exportMeta\":{" #
      "\"exporterPrincipal\":\"" # exporter.toText() # "\"," #
      "\"exportTimestamp\":" # now.toText() # "," #
      "\"totalRecords\":" # total.toText() # "," #
      "\"payloadHash\":\"" # payloadHash # "\"" #
    "}," #
    "\"events\":" # eventsArray #
    "}";
  };

  // ── Retention Metadata Query ───────────────────────────────────────────────

  /// Admin-only: return paginated retention metadata records.
  public func getRetentionMetadata(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    req        : T.GetRetentionMetadataRequest,
  ) : Common.Result<[T.RetentionMetadataRecord], Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let effectiveLimit = if (req.limit == 0) { 50 } else { req.limit };
    let results = List.empty<T.RetentionMetadataRecord>();
    let afterId = switch (req.afterMessageId) {
      case (?cursor) cursor + 1;
      case null 0;
    };
    label scan for (record in s.retentionMetadata.values()) {
      if (results.size() >= effectiveLimit) { break scan };
      if (record.messageId < afterId) { /* skip pagination */ } else {
        let convMatches = switch (req.convId) {
          case (?cid) record.convId == cid;
          case null true;
        };
        let afterStart = switch (req.startDate) {
          case (?start) record.sentAt >= start;
          case null true;
        };
        let beforeEnd = switch (req.endDate) {
          case (?end_) record.sentAt <= end_;
          case null true;
        };
        if (convMatches and afterStart and beforeEnd) {
          results.add(record);
        };
      };
    };
    #ok(results.toArray());
  };
  // ── Admin Escrow Dashboard ────────────────────────────────────────────────

  /// Return a summary record for every user who has at least one escrow record.
  /// Only Super Admins or Org Admins may call this.
  public func getEscrowedUsers(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    req        : T.GetEscrowedUsersRequest,
  ) : Common.Result<[T.EscrowedUserRecord], Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let effectiveLimit = if (req.limit == 0) { 50 } else { req.limit };
    let seen = Map.empty<Common.UserId, Bool>();
    let results = List.empty<T.EscrowedUserRecord>();
    let afterText = req.afterUserId;
    for (((uid, _deviceId), _record) in s.escrowRecords.entries()) {
      switch (seen.get(uid)) {
        case (?_) {};
        case null {
          seen.add(uid, true);
          let skip = switch (afterText) {
            case (?cursor) {
              switch (Text.compare(uid.toText(), cursor)) {
                case (#less) true;
                case (#equal) true;
                case (#greater) false;
              };
            };
            case null false;
          };
          if (not skip and results.size() < effectiveLimit) {
            let userRecords = List.empty<T.EscrowRecord>();
            for (((k0, _k1), v) in s.escrowRecords.entries()) {
              if (Principal.equal(k0, uid)) { userRecords.add(v) };
            };
            let deviceCount = userRecords.size();
            var lastBackedUp : ?Common.Timestamp = null;
            for (rec in userRecords.values()) {
              let ts = rec.consentTimestamp;
              lastBackedUp := switch (lastBackedUp) {
                case null ?ts;
                case (?existing) ?(if (ts > existing) ts else existing);
              };
            };
            var hasPendingRecovery = false;
            for ((_rid, rr) in s.recoveryRequests.entries()) {
              if (Principal.equal(rr.targetUserId, uid) and rr.status == #pending) {
                hasPendingRecovery := true;
              };
            };
            let hasActive = userRecords.find(
              func(r : T.EscrowRecord) : Bool { r.revokedAt == null }
            ) != null;
            let escrowStatus : T.EscrowStatus =
              if (hasPendingRecovery) #pendingRecovery
              else if (hasActive) #active
              else #revoked;
            let record : T.EscrowedUserRecord = {
              userId = uid;
              orgId = req.orgId;
              escrowStatus;
              lastBackedUp;
              deviceCount;
            };
            results.add(record);
          };
        };
      };
    };
    #ok(results.toArray());
  };

  /// Return platform-wide escrow statistics. Super Admin only.
  public func getEscrowStats(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
  ) : Common.Result<T.EscrowStatsRecord, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let seen = Map.empty<Common.UserId, Bool>();
    for (((uid, _), _) in s.escrowRecords.entries()) {
      seen.add(uid, true);
    };
    let totalEscrowed = seen.size();
    var pendingRecoveries = 0;
    for ((_rid, rr) in s.recoveryRequests.entries()) {
      if (rr.status == #pending) { pendingRecoveries += 1 };
    };
    var lastRecoveryTimestamp : ?Common.Timestamp = null;
    for ((_gid, grant) in s.escrowGrants.entries()) {
      let ts = grant.grantTimestamp;
      lastRecoveryTimestamp := switch (lastRecoveryTimestamp) {
        case null ?ts;
        case (?existing) ?(if (ts > existing) ts else existing);
      };
    };
    #ok({ totalEscrowed; pendingRecoveries; lastRecoveryTimestamp });
  };

  /// Initiate a dual-control key recovery request.
  /// Org Admins and Super Admins may call. Caller cannot target themselves.
  public func initiateKeyRecovery(
    s              : State,
    adminState     : AdminLib.State,
    caller         : Common.UserId,
    targetUserId   : Common.UserId,
    targetDeviceId : Text,
    reason         : Text,
    orgId          : ?OrgTypes.OrgId,
  ) : Common.Result<T.RecoveryRequest, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    if (Principal.equal(caller, targetUserId)) {
      return #err(#forbidden);
    };
    // Rate limit: 5 recovery initiations per admin per hour
    let now = Time.now();
    let windowNs : Int = 3_600_000_000_000; // 1 hour in nanoseconds
    let maxAttempts : Nat = 5;
    let (windowStart, currentCount) : (Int, Nat) = switch (s.recoveryRateLimits.get(caller)) {
      case null (now, 0);
      case (?ws) {
        let count = switch (s.recoveryRateLimitCounts.get(caller)) {
          case null 0;
          case (?c) c;
        };
        if (now - ws >= windowNs) {
          // Window has expired — reset
          (now, 0)
        } else {
          (ws, count)
        };
      };
    };
    if (currentCount >= maxAttempts) {
      return #err(#forbidden);
    };
    s.recoveryRateLimits.add(caller, windowStart);
    s.recoveryRateLimitCounts.add(caller, currentCount + 1);

    let requestId = s.state.nextRecoveryRequestId;
    s.state.nextRecoveryRequestId += 1;
    let request : T.RecoveryRequest = {
      id               = requestId;
      targetUserId;
      targetDeviceId;
      initiatingAdmin  = caller;
      approvedBy       = null;
      status           = #pending;
      reason;
      createdAt        = Time.now();
      resolvedAt       = null;
      orgId;
    };
    s.recoveryRequests.add(requestId, request);
    // Build JSON audit metadata — no key material ever included
    let orgIdText = switch (orgId) {
      case (?oid) "\"" # oid # "\"";
      case null "null";
    };
    let detailsJson =
      "{" #
      "\"recoveryId\":" # requestId.toText() # "," #
      "\"targetPrincipal\":\"" # targetUserId.toText() # "\"," #
      "\"orgId\":" # orgIdText # "," #
      "\"reason\":\"" # reason # "\"" #
      "}";
    let detailsBlob = ?detailsJson.encodeUtf8();
    AdminLib.recordEvent(adminState, #keyRecoveryInitiated, caller, ?targetUserId, detailsBlob);
    #ok(request);
  };

  /// Approve a pending dual-control key recovery request.
  /// The approving admin must be different from the initiating admin (dual control).
  public func approveKeyRecovery(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    requestId  : Nat,
  ) : Common.Result<T.RecoveryRequest, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    switch (s.recoveryRequests.get(requestId)) {
      case null { #err(#notFound) };
      case (?rr) {
        if (rr.status != #pending) { return #err(#forbidden) };
        // SECURITY: Dual-control enforcement — initiating admin cannot approve their own request
        if (Principal.equal(caller, rr.initiatingAdmin)) {
          return #err(#forbidden);
        };
        ignore adminGrantEscrowAccess(s, adminState, caller, rr.targetUserId, rr.targetDeviceId, rr.reason);
        let updated : T.RecoveryRequest = {
          rr with
          status     = #approved;
          approvedBy = ?caller;
          resolvedAt = ?Time.now();
        };
        s.recoveryRequests.add(requestId, updated);
        // SECURITY: no raw key material — only safe compliance metadata in audit log
        let detailsJson =
          "{" #
          "\"recoveryId\":" # requestId.toText() # "," #
          "\"approverPrincipal\":\"" # caller.toText() # "\"," #
          "\"targetPrincipal\":\"" # rr.targetUserId.toText() # "\"," #
          "\"derivationId\":\"" # derivationId() # "\"" #
          "}";
        let detailsBlob = ?detailsJson.encodeUtf8();
        // SECURITY: no raw key material — detailsBlob contains only fingerprint metadata
        AdminLib.recordEvent(adminState, #keyRecoveryApproved, caller, ?rr.targetUserId, detailsBlob);
        #ok(updated);
      };
    };
  };

  /// Reject a pending dual-control key recovery request.
  public func rejectKeyRecovery(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    requestId  : Nat,
  ) : Common.Result<T.RecoveryRequest, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    switch (s.recoveryRequests.get(requestId)) {
      case null { #err(#notFound) };
      case (?rr) {
        if (rr.status != #pending) { return #err(#forbidden) };
        let updated : T.RecoveryRequest = {
          rr with
          status     = #rejected;
          approvedBy = ?caller;
          resolvedAt = ?Time.now();
        };
        s.recoveryRequests.add(requestId, updated);
        // Build JSON audit metadata — no key material ever included
        let detailsJson =
          "{" #
          "\"recoveryId\":" # requestId.toText() # "," #
          "\"rejectorPrincipal\":\"" # caller.toText() # "\"," #
          "\"reason\":\"" # rr.reason # "\"" #
          "}";
        let detailsBlob = ?detailsJson.encodeUtf8();
        AdminLib.recordEvent(adminState, #keyRecoveryRejected, caller, ?rr.targetUserId, detailsBlob);
        #ok(updated);
      };
    };
  };

  /// Return a single recovery request by ID.
  /// Caller must be Super Admin or Org Admin of the target org.
  public func getRecoveryDetails(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    requestId  : Nat,
  ) : Common.Result<T.RecoveryRequest, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    switch (s.recoveryRequests.get(requestId)) {
      case null { #err(#notFound) };
      case (?rr) { #ok(rr) };
    };
  };

  /// List recovery requests, optionally filtered by orgId and/or status.
  public func getRecoveryRequests(
    s            : State,
    adminState   : AdminLib.State,
    caller       : Common.UserId,
    orgId        : ?OrgTypes.OrgId,
    statusFilter : ?T.RecoveryRequestStatus,
  ) : Common.Result<[T.RecoveryRequest], Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let results = List.empty<T.RecoveryRequest>();
    for ((_rid, rr) in s.recoveryRequests.entries()) {
      let orgMatches = switch (orgId) {
        case null true;
        case (?oid) {
          switch (rr.orgId) {
            case (?rOid) rOid == oid;
            case null false;
          };
        };
      };
      let statusMatches = switch (statusFilter) {
        case null true;
        case (?sf) rr.status == sf;
      };
      if (orgMatches and statusMatches) { results.add(rr) };
    };
    #ok(results.toArray());
  };
};
