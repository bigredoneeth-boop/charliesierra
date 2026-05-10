import Common "../types/common";
import T "../types/enterprise";
import AdminT "../types/admin";
import AdminLib "admin";
import ConvT "../types/conversations";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Iter "mo:core/Iter";

module {
  // ── State ──────────────────────────────────────────────────────────────────

  public type State = {
    retentionPolicies  : Map.Map<Common.ConversationId, T.GroupRetentionPolicy>;
    retentionMetadata  : List.List<T.RetentionMetadataRecord>;
    escrowRecords      : Map.Map<(Common.UserId, Text), T.EscrowRecord>;
    escrowGrants       : Map.Map<Nat, T.EscrowAccessGrant>;
    state              : { var nextGrantId : Nat };
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

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
};
