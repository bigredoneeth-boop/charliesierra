import Common "common";
import OrgTypes "orgs";

module {
  // ── Retention Period ──────────────────────────────────────────────────────

  /// Predefined retention window options for org-level policies.
  public type RetentionPeriod = {
    #days30;
    #days90;
    #year1;
    #years7;
    #unlimited;
  };

  // ── Core Policy Record ────────────────────────────────────────────────────

  /// Org-level (or global) retention policy.
  /// A null orgId means this is the global/platform-wide default policy.
  public type RetentionPolicy = {
    id         : Text;
    orgId      : ?OrgTypes.OrgId;
    period     : RetentionPeriod;
    autoDelete : Bool;           // purge messages after retention window expires
    legalHold  : Bool;           // legal hold overrides autoDelete and prevents deletion
    updatedAt  : Common.Timestamp;
    updatedBy  : Common.UserId;
  };

  // ── Request / Response Types ──────────────────────────────────────────────

  public type CreateRetentionPolicyRequest = {
    orgId      : ?OrgTypes.OrgId;
    period     : RetentionPeriod;
    autoDelete : Bool;
    legalHold  : Bool;
  };

  public type UpdateRetentionPolicyRequest = {
    id         : Text;
    period     : ?RetentionPeriod;
    autoDelete : ?Bool;
    legalHold  : ?Bool;
  };

  public type LegalHoldRequest = {
    orgId  : OrgTypes.OrgId;
    hold   : Bool;
    reason : Text;
  };

  public type GetRetentionPoliciesRequest = {
    orgId : ?OrgTypes.OrgId;
  };
};
