import Common "../types/common";
import T "../types/admin";
import AdminLib "../lib/admin";
import Principal "mo:core/Principal";

mixin (adminState : AdminLib.State) {
  /// Read audit log — caller must be an admin principal.
  public shared query ({ caller }) func getAuditLog(
    req : T.GetAuditLogRequest
  ) : async Common.Result<[T.AuditEvent], Common.Error> {
    AdminLib.getAuditLog(adminState, caller, req);
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
};
