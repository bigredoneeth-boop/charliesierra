import Common "../types/common";
import T "../types/admin";
import AdminLib "../lib/admin";
import UsersLib "../lib/users";
import ConvsLib "../lib/conversations";
import MsgsLib "../lib/messages";
import AttLib "../lib/attachments";
import Principal "mo:core/Principal";
import OrgTypes "../types/orgs";
import Map "mo:core/Map";
import Nat "mo:core/Nat";

mixin (
  adminState  : AdminLib.State,
  memberships : Map.Map<Text, OrgTypes.OrgMembership>,
  usersState  : UsersLib.State,
  convsState  : ConvsLib.State,
  msgsState   : MsgsLib.State,
  attState    : AttLib.State,
  invites     : Map.Map<Text, OrgTypes.OrgInvite>,
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

  /// Returns true if the one-time test-data reset has already been performed.
  /// The frontend uses this to show or hide the reset button.
  public query func hasDataResetBeenPerformed() : async Bool {
    adminState.state.dataResetCompleted;
  };

  /// One-time-use admin operation that clears all testing data (messages, conversations,
  /// attachments, and non-admin user profiles). Can only be called by a Super Admin and
  /// can only run once — the flag is set permanently after completion.
  ///
  /// Preserved: adminPrincipals, auditLog, bootstrapCompleted, orgsData, org memberships
  /// for the Super Admin principal, vetEscrowRecords, recoveryRequests, platform settings.
  public shared ({ caller }) func resetAllTestData() : async Common.Result<Text, Text> {
    // Access control: Super Admin only
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err("Unauthorized");
    };

    // One-time-use guard
    if (adminState.state.dataResetCompleted) {
      return #err("Reset already performed. This operation can only be run once.");
    };

    // ── Clear conversations ──────────────────────────────────────────────────
    let convKeys = convsState.conversations.keys().toArray();
    for (k in convKeys.vals()) {
      convsState.conversations.remove(k);
    };
    let directKeys = convsState.directIndex.keys().toArray();
    for (k in directKeys.vals()) {
      convsState.directIndex.remove(k);
    };
    convsState.state.nextId := 0;

    // ── Clear messages ───────────────────────────────────────────────────────
    let msgKeys = msgsState.messages.keys().toArray();
    for (k in msgKeys.vals()) {
      msgsState.messages.remove(k);
    };
    let convMsgKeys = msgsState.conversationMessages.keys().toArray();
    for (k in convMsgKeys.vals()) {
      msgsState.conversationMessages.remove(k);
    };
    // (MessageId, UserId) compare for readReceipts map
    let cmpMsgUser = func(a : (Common.MessageId, Common.UserId), b : (Common.MessageId, Common.UserId)) : { #less; #equal; #greater } {
      let c = Nat.compare(a.0, b.0);
      if (c != #equal) c else Principal.compare(a.1, b.1);
    };
    let rrKeys = msgsState.readReceipts.keys().toArray();
    for (k in rrKeys.vals()) {
      msgsState.readReceipts.remove(cmpMsgUser, k);
    };
    let rbmKeys = msgsState.receiptsByMessage.keys().toArray();
    for (k in rbmKeys.vals()) {
      msgsState.receiptsByMessage.remove(k);
    };
    // (ConversationId, UserId) compare for typingIndicators map
    let cmpConvUser = func(a : (Common.ConversationId, Common.UserId), b : (Common.ConversationId, Common.UserId)) : { #less; #equal; #greater } {
      let c = Nat.compare(a.0, b.0);
      if (c != #equal) c else Principal.compare(a.1, b.1);
    };
    let typingKeys = msgsState.typingIndicators.keys().toArray();
    for (k in typingKeys.vals()) {
      msgsState.typingIndicators.remove(cmpConvUser, k);
    };
    msgsState.state.nextId := 0;

    // ── Clear attachments ────────────────────────────────────────────────────
    let attKeys = attState.attachments.keys().toArray();
    for (k in attKeys.vals()) {
      attState.attachments.remove(k);
    };
    let msgAttKeys = attState.messageAttachments.keys().toArray();
    for (k in msgAttKeys.vals()) {
      attState.messageAttachments.remove(k);
    };
    attState.state.nextId := 0;

    // ── Clear user profiles (keep Super Admin, remove all others) ────────────
    let superAdmin = Principal.fromText("dzdlk-gui4e-tacqa-6ptxj-jslvy-medgl-425ra-lbapw-3lmgh-hbulu-wqe");
    let testUser   = Principal.fromText("rzo6g-jmyjf-gbh4e-abyig-odtez-cqtdy-5pjoo-gk3p6-nvyxq-ckpud-sqe");
    let profileKeys = usersState.profiles.keys().toArray();
    for (p in profileKeys.vals()) {
      if (p != superAdmin) {
        usersState.profiles.remove(p);
      };
    };

    // ── Remove test user from org memberships ────────────────────────────────
    let membershipKeys = memberships.keys().toArray();
    for (k in membershipKeys.vals()) {
      switch (memberships.get(k)) {
        case (?m) {
          if (m.userId == testUser) {
            memberships.remove(k);
          };
        };
        case null {};
      };
    };

    // ── Remove test user from invites ────────────────────────────────────────
    let inviteKeys = invites.keys().toArray();
    for (k in inviteKeys.vals()) {
      switch (invites.get(k)) {
        case (?inv) {
          if (inv.principalOrEmail == testUser.toText()) {
            invites.remove(k);
          };
        };
        case null {};
      };
    };

    // ── Audit log entry (before setting the flag) ────────────────────────────
    AdminLib.recordEvent(
      adminState,
      #adminAction,
      caller,
      null,
      null,
    );

    // ── Permanently disable this operation ───────────────────────────────────
    adminState.state.dataResetCompleted := true;

    #ok("All testing data has been cleared successfully. This operation has been permanently disabled.");
  };
};

