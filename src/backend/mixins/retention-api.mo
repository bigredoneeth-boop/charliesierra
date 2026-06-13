import Common "../types/common";
import RetentionTypes "../types/retention";
import OrgTypes "../types/orgs";
import AdminLib "../lib/admin";
import RetentionLib "../lib/retention";

mixin (
  adminState     : AdminLib.State,
  retentionState : RetentionLib.State,
) {
  // ── Retention Policy CRUD ─────────────────────────────────────────────────

  /// Admin: create a new org-level or global retention policy.
  /// Super Admin or Org Admin only. All creates are audited.
  public shared ({ caller }) func createRetentionPolicy(
    req : RetentionTypes.CreateRetentionPolicyRequest
  ) : async Common.Result<RetentionTypes.RetentionPolicy, Text> {
    RetentionLib.createRetentionPolicy(retentionState, adminState, caller, req);
  };

  /// Admin: update an existing retention policy's period, autoDelete, or legalHold.
  public shared ({ caller }) func updateRetentionPolicy(
    req : RetentionTypes.UpdateRetentionPolicyRequest
  ) : async Common.Result<RetentionTypes.RetentionPolicy, Text> {
    RetentionLib.updateRetentionPolicy(retentionState, adminState, caller, req);
  };

  /// Admin: list retention policies, optionally scoped to a specific org.
  public shared query ({ caller }) func getRetentionPolicies(
    req : RetentionTypes.GetRetentionPoliciesRequest
  ) : async [RetentionTypes.RetentionPolicy] {
    RetentionLib.getRetentionPolicies(retentionState, caller, req);
  };

  /// Query the single global platform-wide retention policy (if set).
  public shared query ({ caller }) func getGlobalRetentionPolicy()
    : async ?RetentionTypes.RetentionPolicy {
    RetentionLib.getGlobalRetentionPolicy(retentionState, caller);
  };

  /// Admin: place or remove a legal hold on an organisation.
  /// Legal hold prevents deletion even after retention period expires.
  /// All changes are audited.
  public shared ({ caller }) func toggleLegalHold(
    req : RetentionTypes.LegalHoldRequest
  ) : async Common.Result<RetentionTypes.RetentionPolicy, Text> {
    RetentionLib.toggleLegalHold(retentionState, adminState, caller, req);
  };

  /// Query the retention policy for a specific organisation.
  public shared query ({ caller }) func getRetentionPolicy(
    orgId : OrgTypes.OrgId
  ) : async ?RetentionTypes.RetentionPolicy {
    RetentionLib.getRetentionPolicy(retentionState, caller, orgId);
  };

  /// Query: list non-unlimited, non-legal-hold policies that are within
  /// 30 days of expiry. Super Admin sees all; Org Admin sees their org only.
  public shared query ({ caller }) func checkPolicyExpiry(
    callerOrgId : ?OrgTypes.OrgId
  ) : async [RetentionTypes.RetentionPolicy] {
    RetentionLib.checkPolicyExpiry(retentionState, adminState, caller, callerOrgId);
  };

  /// Update: log a #policyReportExported audit event. Admin only.
  public shared ({ caller }) func logPolicyReportExported(
    orgFilter : ?OrgTypes.OrgId
  ) : async () {
    if (not AdminLib.isAdmin(adminState, caller)) { return };
    RetentionLib.logPolicyReportExported(adminState, caller, orgFilter);
  };

  /// Update: log a #policyExpiryCheckPerformed audit event. Admin only.
  public shared ({ caller }) func logPolicyExpiryCheck() : async () {
    if (not AdminLib.isAdmin(adminState, caller)) { return };
    RetentionLib.logPolicyExpiryCheck(adminState, caller);
  };
};
