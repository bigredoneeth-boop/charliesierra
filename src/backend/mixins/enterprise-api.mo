import Common "../types/common";
import E "../types/enterprise";
import OrgTypes "../types/orgs";
import AdminLib "../lib/admin";
import EnterpriseLib "../lib/enterprise";
import ConvsLib "../lib/conversations";

mixin (
  adminState : AdminLib.State,
  enterpriseState : EnterpriseLib.State,
  convsState : ConvsLib.State,
) {
  // ── Group Retention Policy ────────────────────────────────────────────

  /// Enable message retention metadata collection for a group.
  /// Caller must be a member of the group. Applies to all future messages.
  public shared ({ caller }) func enableGroupRetention(
    convId : Common.ConversationId
  ) : async Common.Result<(), Common.Error> {
    EnterpriseLib.enableGroupRetention(
      enterpriseState,
      adminState,
      caller,
      convId,
      func(cid) { convsState.conversations.get(cid) },
    );
  };

  /// Disable message retention metadata collection for a group.
  /// Caller must be a member of the group.
  public shared ({ caller }) func disableGroupRetention(
    convId : Common.ConversationId
  ) : async Common.Result<(), Common.Error> {
    EnterpriseLib.disableGroupRetention(
      enterpriseState,
      adminState,
      caller,
      convId,
      func(cid) { convsState.conversations.get(cid) },
    );
  };

  /// Get the current retention policy for a group.
  public shared query ({ caller }) func getGroupRetentionPolicy(
    convId : Common.ConversationId
  ) : async Common.Result<E.GroupRetentionPolicy, Common.Error> {
    EnterpriseLib.getGroupRetentionPolicy(
      enterpriseState,
      caller,
      convId,
      func(cid) { convsState.conversations.get(cid) },
    );
  };

  // ── Key Escrow (per-user, opt-in) ─────────────────────────────────────

  /// Enroll a device key into escrow. Caller must explicitly consent.
  /// Only the wrapped (encrypted) key is stored — never plaintext.
  public shared ({ caller }) func enrollKeyEscrow(
    deviceId                 : Text,
    deviceLabel              : Text,
    devicePublicKeyFingerprint : Text,
    wrappedKey               : Blob,
    consentLanguageVersion   : Text,
  ) : async Common.Result<(), Common.Error> {
    EnterpriseLib.enrollKeyEscrow(
      enterpriseState,
      adminState,
      caller,
      deviceId,
      deviceLabel,
      devicePublicKeyFingerprint,
      wrappedKey,
      consentLanguageVersion,
    );
  };

  /// Revoke escrow for a specific device — user can revoke at any time.
  public shared ({ caller }) func revokeKeyEscrow(
    deviceId : Text,
    reason   : Text,
  ) : async Common.Result<(), Common.Error> {
    EnterpriseLib.revokeKeyEscrow(enterpriseState, adminState, caller, deviceId, reason);
  };

  /// Get the caller's own escrow enrollment status across all devices.
  public shared query ({ caller }) func getMyEscrowStatus()
    : async [E.EscrowRecord] {
    EnterpriseLib.getMyEscrowStatus(enterpriseState, caller);
  };

  // ── Admin Escrow Access ───────────────────────────────────────────────

  /// Admin function: grant access to a user's escrow-wrapped key.
  /// Caller must be an admin. Full audit trail is recorded.
  public shared ({ caller }) func adminGrantEscrowAccess(
    targetUserId   : Common.UserId,
    targetDeviceId : Text,
    reason         : Text,
  ) : async Common.Result<E.EscrowAccessGrant, Common.Error> {
    EnterpriseLib.adminGrantEscrowAccess(
      enterpriseState,
      adminState,
      caller,
      targetUserId,
      targetDeviceId,
      reason,
    );
  };

  /// Admin function: list all escrow access grants, optionally filtered by user.
  /// Caller must be an admin.
  public shared query ({ caller }) func adminGetEscrowGrants(
    targetUserId : ?Common.UserId,
    limit        : Nat,
    afterGrantId : ?Nat,
  ) : async Common.Result<[E.EscrowAccessGrant], Common.Error> {
    EnterpriseLib.adminGetEscrowGrants(
      enterpriseState,
      adminState,
      caller,
      targetUserId,
      limit,
      afterGrantId,
    );
  };

  // ── Audit Log Export ──────────────────────────────────────────────────

  /// Admin function: export the audit log in CSV or JSON format.
  /// Caller must be an admin. The export event itself is recorded.
  public shared ({ caller }) func exportAuditLog(
    req : E.AuditExportRequest
  ) : async Common.Result<Text, Common.Error> {
    EnterpriseLib.exportAuditLog(enterpriseState, adminState, caller, req);
  };

  // ── Retention Metadata Queries ────────────────────────────────────────

  /// Admin function: query retention metadata records.
  /// Caller must be an admin. Returns metadata only — no message content.
  public shared query ({ caller }) func getRetentionMetadata(
    req : E.GetRetentionMetadataRequest
  ) : async Common.Result<[E.RetentionMetadataRecord], Common.Error> {
    EnterpriseLib.getRetentionMetadata(enterpriseState, adminState, caller, req);
  };
  // ── Key Escrow Admin Dashboard ──────────────────────────────────────────

  /// Admin: list all users with escrowed keys (dashboard table).
  /// Super Admins or Org Admins only. Org-scoped via req.orgId.
  public shared ({ caller }) func getEscrowedUsers(
    req : E.GetEscrowedUsersRequest
  ) : async Common.Result<[E.EscrowedUserRecord], Common.Error> {
    EnterpriseLib.getEscrowedUsers(enterpriseState, adminState, caller, req);
  };

  /// Admin: return platform-wide escrow statistics. Super Admin only.
  public shared ({ caller }) func getEscrowStats()
    : async Common.Result<E.EscrowStatsRecord, Common.Error> {
    EnterpriseLib.getEscrowStats(enterpriseState, adminState, caller);
  };

  /// Admin: initiate a dual-control key recovery request.
  public shared ({ caller }) func initiateKeyRecovery(
    targetUserId   : Common.UserId,
    targetDeviceId : Text,
    reason         : Text,
    orgId          : ?OrgTypes.OrgId,
  ) : async Common.Result<E.RecoveryRequest, Common.Error> {
    EnterpriseLib.initiateKeyRecovery(
      enterpriseState, adminState, caller,
      targetUserId, targetDeviceId, reason, orgId,
    );
  };

  /// Admin: approve a pending key recovery request (dual control — must differ from initiator).
  public shared ({ caller }) func approveKeyRecovery(
    requestId : Nat
  ) : async Common.Result<E.RecoveryRequest, Common.Error> {
    EnterpriseLib.approveKeyRecovery(enterpriseState, adminState, caller, requestId);
  };

  /// Admin: reject a pending key recovery request.
  public shared ({ caller }) func rejectKeyRecovery(
    requestId : Nat
  ) : async Common.Result<E.RecoveryRequest, Common.Error> {
    EnterpriseLib.rejectKeyRecovery(enterpriseState, adminState, caller, requestId);
  };

  /// Admin: list recovery requests, optionally filtered by orgId and/or status.
  public shared ({ caller }) func getRecoveryRequests(
    orgId        : ?OrgTypes.OrgId,
    statusFilter : ?E.RecoveryRequestStatus,
  ) : async Common.Result<[E.RecoveryRequest], Common.Error> {
    EnterpriseLib.getRecoveryRequests(
      enterpriseState, adminState, caller, orgId, statusFilter,
    );
  };
};

