import Common "../types/common";
import T "../types/groups-admin";
import AdminLib "../lib/admin";
import ConvsLib "../lib/conversations";
import GroupsAdminLib "../lib/groups-admin";
import OrgTypes "../types/orgs";
import Map "mo:core/Map";

// groups-admin-api.mo — Public mixin for admin-facing group management.
//
// Exposes three endpoints:
//   getAllGroups           — list all groups (filtered by org for OrgAdmins)
//   getGroupMembers        — list members of a specific group
//   removeMemberFromGroup  — force-remove a member and audit the action
//
// All state is injected from main.mo; this mixin is stateless.
mixin (
  adminState                   : AdminLib.State,
  convsState                   : ConvsLib.State,
  memberships                  : Map.Map<Text, OrgTypes.OrgMembership>,
  removeMemberRateLimitWindows : Map.Map<Common.UserId, Int>,
  removeMemberRateLimitCounts  : Map.Map<Common.UserId, Nat>,
) {
  /// List all group conversations visible to the caller.
  /// SuperAdmin sees all groups; OrgAdmin sees only their org's groups.
  public shared ({ caller }) func getAllGroups(
    req : T.GetAllGroupsRequest
  ) : async [T.GroupAdminRecord] {
    if (not AdminLib.isAdmin(adminState, caller)) { return [] };
    GroupsAdminLib.getAllGroups(convsState, adminState, memberships, caller, req);
  };

  /// Return all members of a specific group.
  /// Caller must be SuperAdmin or OrgAdmin.
  public shared ({ caller }) func getGroupMembers(
    req : T.GetGroupMembersRequest
  ) : async Common.Result<[T.GroupMemberRecord], Text> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err("Unauthorized: admin access required");
    };
    GroupsAdminLib.getGroupMembers(convsState, adminState, memberships, caller, req);
  };

  /// Force-remove a member from a group. Creates an audit log entry.
  /// Caller must be SuperAdmin or OrgAdmin.
  public shared ({ caller }) func removeMemberFromGroup(
    req : T.RemoveMemberFromGroupRequest
  ) : async Common.Result<(), Text> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err("Unauthorized: admin access required");
    };
    GroupsAdminLib.removeMemberFromGroup(convsState, adminState, memberships, caller, req, removeMemberRateLimitWindows, removeMemberRateLimitCounts);
  };
};
