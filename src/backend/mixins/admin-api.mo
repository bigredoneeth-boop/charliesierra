import Common "../types/common";
import T "../types/admin";
import AdminLib "../lib/admin";
import Principal "mo:core/Principal";
import OrgTypes "../types/orgs";
import Map "mo:core/Map";

mixin (
  adminState  : AdminLib.State,
  memberships : Map.Map<Text, OrgTypes.OrgMembership>,
) {
  /// Read audit log. SuperAdmins/Auditors see all; OrgAdmins see their own orgs only.
  public shared query ({ caller }) func getAuditLog(
    req : T.GetAuditLogRequest
  ) : async Common.Result<[T.AuditEvent], Common.Error> {
    AdminLib.getAuditLog(adminState, caller, req, memberships);
  };

  /// Export up to 10,000 audit log entries (for CSV export). Same RBAC as getAuditLog.
  public shared query ({ caller }) func exportAuditLogs(
    req : T.ExportAuditLogsRequest
  ) : async Common.Result<[T.AuditEvent], Common.Error> {
    AdminLib.exportAuditLogs(adminState, caller, req, memberships);
  };

  /// Add an admin principal — caller must be an existing admin.
  public shared ({ caller }) func addAdmin(
    newAdmin : Common.UserId
  ) : async Common.Result<(), Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    AdminLib.addAdmin(adminState, newAdmin);
    AdminLib.recordEvent(adminState, #adminAction, caller, ?newAdmin, null);
    #ok(());
  };

  /// Remove an admin principal — caller must be an existing admin. Cannot remove the last admin.
  public shared ({ caller }) func removeAdmin(
    target : Common.UserId
  ) : async Common.Result<(), Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let result = AdminLib.removeAdmin(adminState, caller, target);
    switch (result) {
      case (#ok(())) {
        AdminLib.recordEvent(adminState, #adminAction, caller, ?target, null);
      };
      case (#err(_)) {};
    };
    result;
  };

  /// List all admin principals — caller must be an admin.
  public shared query ({ caller }) func listAdmins() : async Common.Result<[Common.UserId], Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    #ok(AdminLib.listAdmins(adminState));
  };

  /// Check if a principal is an admin (public utility for frontend gating).
  public query func isAdminCheck(
    principal : Common.UserId
  ) : async Bool {
    AdminLib.isAdmin(adminState, principal);
  };

  /// One-shot bootstrap: assign the first real Super Admin.
  /// Open to any caller, but is a safe no-op once bootstrap has been completed.
  public shared func bootstrapSuperAdmin(
    targetPrincipal : Common.UserId
  ) : async Common.Result<Text, Text> {
    AdminLib.bootstrapSuperAdmin(adminState, targetPrincipal);
  };

  /// Returns true if the bootstrap has already been completed.
  /// The frontend uses this to show or hide the bootstrap UI.
  public query func hasSuperAdmin() : async Bool {
    AdminLib.hasSuperAdmin(adminState);
  };
};
