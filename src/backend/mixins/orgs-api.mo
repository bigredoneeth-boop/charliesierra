import Common "../types/common";
import T "../types/orgs";
import AdminLib "../lib/admin";
import OrgsLib "../lib/orgs";
import Map "mo:core/Map";

// orgs-api.mo — Public mixin for multi-tenant organisation management.
//
// State is injected from main.mo so this mixin stays stateless.
// All RBAC checks are delegated to OrgsLib which enforces:
//   • SuperAdmin  : platform-level authority (from adminState.adminPrincipals)
//   • OrgAdmin    : org-scoped admin
//   • Auditor     : read-only compliance role
//   • StandardUser: regular member
//
// Every mutating call records an audit event with actor + target + orgId.
// No message content is ever stored.
mixin (
  adminState  : AdminLib.State,
  orgsData    : Map.Map<T.OrgId, T.OrgRecord>,
  memberships : Map.Map<Text, T.OrgMembership>,
  invites     : Map.Map<Text, T.OrgInvite>,
  orgsRlState : OrgsLib.RateLimitState,
) {
  /// Create a new organisation. Super Admin only.
  public shared ({ caller }) func createOrg(
    req : T.CreateOrgRequest
  ) : async Common.Result<T.OrgRecord, Text> {
    if (not OrgsLib.isSuperAdmin(caller, adminState)) {
      return #err("Unauthorized: Super Admin access required");
    };
    OrgsLib.createOrg(caller, req, orgsData, memberships, adminState, orgsRlState);
  };

  /// Get a single organisation record by ID.
  /// Org isolation enforced: only members or SuperAdmins may read.
  public shared query ({ caller }) func getOrg(
    orgId : T.OrgId
  ) : async Common.Result<T.OrgRecord, Text> {
    OrgsLib.getOrg(caller, orgId, orgsData, memberships, adminState);
  };

  /// List organisations.
  /// SuperAdmins see all; regular callers see only their own orgs.
  public shared query ({ caller }) func listOrgs(
    req : T.GetOrgsRequest
  ) : async Common.Result<T.GetOrgsResponse, Text> {
    OrgsLib.listOrgs(caller, req, orgsData, memberships, adminState);
  };

  /// Invite a user to an organisation by principal ID (with optional email for future linking).
  /// Phase 1: invitation auto-accepts — user is added to memberships immediately.
  /// Returns the created OrgMembership so the frontend can display the new member row.
  public shared ({ caller }) func inviteUser(
    req : T.InviteUserRequest
  ) : async Common.Result<T.OrgMembership, Text> {
    OrgsLib.inviteUser(caller, req, orgsData, memberships, invites, adminState, orgsRlState);
  };

  /// List members of an organisation with pagination.
  /// Caller must be a member or SuperAdmin.
  public shared query ({ caller }) func getOrgUsers(
    req : T.GetOrgUsersRequest
  ) : async Common.Result<T.GetOrgUsersResponse, Text> {
    OrgsLib.getOrgUsers(caller, req, memberships, adminState);
  };

  /// Change a member's role within an organisation.
  /// Caller must be OrgAdmin or SuperAdmin. Cannot demote the last OrgAdmin.
  public shared ({ caller }) func updateMemberRole(
    req : T.UpdateMemberRoleRequest
  ) : async Common.Result<(), Text> {
    OrgsLib.updateMemberRole(caller, req, memberships, adminState);
  };

  /// Suspend a member within an organisation (Phase 2: toggles status to #Suspended).
  /// Member remains in the membership map. Caller must be OrgAdmin or SuperAdmin.
  /// SuperAdmins cannot be suspended.
  public shared ({ caller }) func suspendMember(
    req : T.SuspendUserRequest
  ) : async Common.Result<(), Text> {
    OrgsLib.suspendMember(caller, req, memberships, adminState, orgsRlState);
  };

  /// Reactivate a previously suspended member, restoring their status to #Active.
  /// Caller must be OrgAdmin or SuperAdmin.
  public shared ({ caller }) func reactivateMember(
    orgId  : T.OrgId,
    userId : Common.UserId
  ) : async Common.Result<(), Text> {
    OrgsLib.reactivateMember(caller, orgId, userId, memberships, adminState);
  };

  /// Remove a member from an organisation.
  /// Caller must be OrgAdmin or SuperAdmin.
  public shared ({ caller }) func removeMember(
    orgId  : T.OrgId,
    userId : Common.UserId
  ) : async Common.Result<(), Text> {
    OrgsLib.removeMember(caller, orgId, userId, memberships, adminState);
  };

  /// Update an organisation's name and/or description.
  /// Caller must be OrgAdmin or SuperAdmin.
  public shared ({ caller }) func updateOrg(
    orgId       : T.OrgId,
    name        : Text,
    description : ?Text,
  ) : async Common.Result<T.OrgRecord, Text> {
    OrgsLib.updateOrg(caller, orgId, name, description, orgsData, memberships, adminState);
  };

  /// Suspend an organisation. SuperAdmin only.
  public shared ({ caller }) func suspendOrg(
    orgId : T.OrgId
  ) : async Common.Result<(), Text> {
    OrgsLib.suspendOrg(caller, orgId, orgsData, adminState);
  };

  /// Permanently delete an organisation and all its memberships. SuperAdmin only.
  public shared ({ caller }) func deleteOrg(
    orgId : T.OrgId
  ) : async Common.Result<(), Text> {
    OrgsLib.deleteOrg(caller, orgId, orgsData, memberships, adminState);
  };

  /// Get the calling principal's own org memberships and roles across all orgs.
  public shared query ({ caller }) func getMyOrgs() : async Common.Result<[T.OrgMembership], Text> {
    #ok(OrgsLib.getMyOrgs(caller, memberships));
  };

  /// Get the calling principal's role in a specific organisation.
  public shared query ({ caller }) func getMyRole(
    orgId : T.OrgId
  ) : async Common.Result<?T.OrgRole, Text> {
    #ok(OrgsLib.getMyRole(caller, orgId, memberships));
  };
};
