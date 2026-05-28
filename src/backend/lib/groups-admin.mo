import Common "../types/common";
import T "../types/groups-admin";
import AdminT "../types/admin";
import AdminLib "admin";
import ConvsLib "conversations";
import ConvsT "../types/conversations";
import OrgTypes "../types/orgs";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

module {
  public type State = {
    convsState  : ConvsLib.State;
    adminState  : AdminLib.State;
    memberships : Map.Map<Text, OrgTypes.OrgMembership>;
  };

  // ── Private helpers ────────────────────────────────────────────────────────

  /// Check whether caller is a platform-level SuperAdmin.
  func isSuperAdmin(
    caller     : Common.UserId,
    adminState : AdminLib.State,
  ) : Bool {
    adminState.adminPrincipals.contains(caller);
  };

  /// Find the first OrgAdmin membership for the caller (returns orgId or null).
  func callerOrgAdminId(
    caller      : Common.UserId,
    memberships : Map.Map<Text, OrgTypes.OrgMembership>,
  ) : ?OrgTypes.OrgId {
    for ((_k, m) in memberships.entries()) {
      if (Principal.equal(m.userId, caller) and m.role == #OrgAdmin and m.status != #Suspended) {
        return ?m.orgId;
      };
    };
    null;
  };

  /// Record an org-scoped audit event directly into the admin log.
  func recordOrgEvent(
    adminState : AdminLib.State,
    eventType  : AdminT.AuditEventType,
    actorId    : Common.UserId,
    target     : ?Text,
    orgId      : ?OrgTypes.OrgId,
  ) : () {
    let id = adminState.state.nextEventId;
    adminState.state.nextEventId += 1;
    // target is a principal text — store as principal for audit log.
    let targetPrincipal : ?Common.UserId = switch (target) {
      case (?t) ?Principal.fromText(t);
      case null null;
    };
    let event : AdminT.AuditEvent = {
      id;
      eventType;
      actorPrincipal   = actorId;
      targetPrincipal;
      timestamp        = Time.now();
      encryptedDetails = null;
      orgId;
    };
    adminState.auditLog.add(id, event);
  };

  // ── Public functions ───────────────────────────────────────────────────────

  /// Return all group conversations visible to the caller.
  /// SuperAdmin sees all groups; OrgAdmin sees only their own org's groups
  /// (orgId forced from their membership; the group record carries that orgId label).
  public func getAllGroups(
    convsState  : ConvsLib.State,
    adminState  : AdminLib.State,
    memberships : Map.Map<Text, OrgTypes.OrgMembership>,
    caller      : Common.UserId,
    req         : T.GetAllGroupsRequest,
  ) : [T.GroupAdminRecord] {
    let superAdmin = isSuperAdmin(caller, adminState);
    // Determine effective orgId: OrgAdmins are pinned to their own org.
    let effectiveOrgId : ?OrgTypes.OrgId = if (superAdmin) {
      req.orgId;
    } else {
      switch (callerOrgAdminId(caller, memberships)) {
        case (?oid) ?oid;
        case null {
          // Not SuperAdmin and not OrgAdmin — trap immediately.
          Runtime.trap("Unauthorized: must be OrgAdmin or SuperAdmin");
        };
      };
    };

    // Collect all group conversations.
    let records = List.empty<T.GroupAdminRecord>();
    for ((_id, conv) in convsState.conversations.entries()) {
      if (conv.kind == #group) {
        let rec : T.GroupAdminRecord = {
          id          = conv.id;
          name        = switch (conv.displayName) {
                          case (?n) n;
                          case null "Unnamed Group";
                        };
          orgId       = effectiveOrgId;
          memberCount = conv.members.size();
          createdAt   = conv.createdAt;
          createdBy   = conv.createdBy;
          status      = #active;
        };
        records.add(rec);
      };
    };

    // Sort by createdAt descending.
    let arr = records.toArray();
    arr.sort(func(a : T.GroupAdminRecord, b : T.GroupAdminRecord) : Order.Order {
      Int.compare(b.createdAt, a.createdAt)
    });
  };

  /// Return all members of a specific group.
  /// Caller must be SuperAdmin or OrgAdmin.
  public func getGroupMembers(
    convsState  : ConvsLib.State,
    adminState  : AdminLib.State,
    memberships : Map.Map<Text, OrgTypes.OrgMembership>,
    caller      : Common.UserId,
    req         : T.GetGroupMembersRequest,
  ) : Common.Result<[T.GroupMemberRecord], Text> {
    let superAdmin = isSuperAdmin(caller, adminState);
    if (not superAdmin) {
      switch (callerOrgAdminId(caller, memberships)) {
        case null return #err("Unauthorized: must be OrgAdmin or SuperAdmin");
        case (?_) {};
      };
    };

    switch (convsState.conversations.get(req.groupId)) {
      case null #err("Group not found");
      case (?conv) {
        if (conv.kind != #group) return #err("Group not found");
        let members = conv.members.map<Common.UserId, T.GroupMemberRecord>(
          func(uid) {
            {
              userId      = uid;
              joinedAt    = conv.createdAt; // approximate — exact join time not stored
              displayName = null;
            };
          }
        );
        #ok(members);
      };
    };
  };

  /// Force-remove a member from a group and record an audit event.
  /// Caller must be SuperAdmin or OrgAdmin.
  public func removeMemberFromGroup(
    convsState  : ConvsLib.State,
    adminState  : AdminLib.State,
    memberships : Map.Map<Text, OrgTypes.OrgMembership>,
    caller      : Common.UserId,
    req         : T.RemoveMemberFromGroupRequest,
  ) : Common.Result<(), Text> {
    let superAdmin = isSuperAdmin(caller, adminState);
    if (not superAdmin) {
      switch (callerOrgAdminId(caller, memberships)) {
        case null return #err("Unauthorized: must be OrgAdmin or SuperAdmin");
        case (?_) {};
      };
    };

    switch (convsState.conversations.get(req.groupId)) {
      case null return #err("Group not found");
      case (?conv) {
        if (conv.kind != #group) return #err("Group not found");
        // Remove the member by rebuilding the members array without them.
        let updated : ConvsT.Conversation = {
          conv with
          members = conv.members.filter(
            func(m : Common.UserId) : Bool { not Principal.equal(m, req.memberId) }
          );
          var lastMessageAt = conv.lastMessageAt;
        };
        convsState.conversations.add(req.groupId, updated);
        // Audit log the force-removal.
        recordOrgEvent(
          adminState,
          #groupMemberRemoved,
          caller,
          ?req.memberId.toText(),
          null,
        );
        #ok(());
      };
    };
  };
};
