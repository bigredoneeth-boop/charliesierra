import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Common "../types/common";
import RetentionTypes "../types/retention";
import OrgTypes "../types/orgs";
import AdminLib "admin";
import AdminTypes "../types/admin";

module {
  // ── State ─────────────────────────────────────────────────────────────────

  public type State = {
    // policyId -> RetentionPolicy
    // the single global policy is stored under key "global"
    retentionPolicies : Map.Map<Text, RetentionTypes.RetentionPolicy>;
    state             : { var nextPolicyId : Nat };
  };

  // ── Private helpers ───────────────────────────────────────────────────────

  /// Write an org-scoped audit event into the shared audit log.
  func recordRetentionEvent(
    adminState : AdminLib.State,
    eventType  : AdminTypes.AuditEventType,
    actorId    : Common.UserId,
    orgId      : ?OrgTypes.OrgId,
  ) : () {
    let id = adminState.state.nextEventId;
    adminState.state.nextEventId += 1;
    adminState.auditLog.add(id, {
      id;
      eventType;
      actorPrincipal   = actorId;
      targetPrincipal  = null;
      timestamp        = Time.now();
      encryptedDetails = null;
      orgId;
    });
  };

  // ── Stubs ─────────────────────────────────────────────────────────────────

  public func createRetentionPolicy(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    req        : RetentionTypes.CreateRetentionPolicyRequest,
  ) : Common.Result<RetentionTypes.RetentionPolicy, Text> {
    // Authorization: must be SuperAdmin (platform admin) or — if targeting a specific org —
    // any admin principal. Full OrgAdmin scoping requires memberships not in scope here;
    // the mixin layer and frontend enforce per-org access.
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err("Unauthorized: must be SuperAdmin or Org Admin");
    };
    // Global policy (null orgId) is SuperAdmin-only.
    switch (req.orgId) {
      case null {
        // Require SuperAdmin (bootstrapCompleted guard is sufficient — all admins are super).
      };
      case (?_) { /* any admin can set org-level policy */ };
    };

    // Determine the storage key: global uses "global", org-level uses the orgId.
    let policyKey : Text = switch (req.orgId) {
      case null { "global" };
      case (?oid) { oid };
    };

    let now = Time.now();

    // Upsert: if a policy already exists for this key, update it.
    let policy : RetentionTypes.RetentionPolicy = switch (s.retentionPolicies.get(policyKey)) {
      case (?existing) {
        // Update the existing policy in-place.
        {
          existing with
          period     = req.period;
          autoDelete = req.autoDelete;
          legalHold  = req.legalHold;
          updatedAt  = now;
          updatedBy  = caller;
        };
      };
      case null {
        // Generate a new policy ID.
        let newId = s.state.nextPolicyId;
        s.state.nextPolicyId += 1;
        {
          id         = newId.toText();
          orgId      = req.orgId;
          period     = req.period;
          autoDelete = req.autoDelete;
          legalHold  = req.legalHold;
          updatedAt  = now;
          updatedBy  = caller;
        };
      };
    };
    s.retentionPolicies.add(policyKey, policy);

    // Audit log.
    recordRetentionEvent(
      adminState, #retentionPolicyCreated, caller, req.orgId,
    );

    #ok(policy);
  };

  public func updateRetentionPolicy(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    req        : RetentionTypes.UpdateRetentionPolicyRequest,
  ) : Common.Result<RetentionTypes.RetentionPolicy, Text> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err("Unauthorized: must be SuperAdmin or Org Admin");
    };

    // Find the policy by id (scan the map for matching id field).
    var foundKey : ?Text = null;
    var foundPolicy : ?RetentionTypes.RetentionPolicy = null;
    label search for ((k, p) in s.retentionPolicies.entries()) {
      if (p.id == req.id) {
        foundKey    := ?k;
        foundPolicy := ?p;
        break search;
      };
    };

    let (key, existing) = switch (foundKey, foundPolicy) {
      case (?k, ?p) { (k, p) };
      case _        { return #err("Policy not found: " # req.id) };
    };

    let now = Time.now();
    let updated : RetentionTypes.RetentionPolicy = {
      existing with
      period     = switch (req.period)     { case (?v) v; case null existing.period     };
      autoDelete = switch (req.autoDelete) { case (?v) v; case null existing.autoDelete };
      legalHold  = switch (req.legalHold)  { case (?v) v; case null existing.legalHold  };
      updatedAt  = now;
      updatedBy  = caller;
    };
    s.retentionPolicies.add(key, updated);

    recordRetentionEvent(
      adminState, #retentionPolicyUpdated, caller, existing.orgId,
    );

    #ok(updated);
  };

  public func getRetentionPolicies(
    s      : State,
    caller : Common.UserId,
    req    : RetentionTypes.GetRetentionPoliciesRequest,
  ) : [RetentionTypes.RetentionPolicy] {
    // SuperAdmins see all; others see only policies for orgs they can access.
    // Since we don't have memberships in scope, any authenticated call is allowed;
    // org-scoped filtering is applied via req.orgId.
    let results = List.empty<RetentionTypes.RetentionPolicy>();
    for ((_k, p) in s.retentionPolicies.entries()) {
      let matches = switch (req.orgId) {
        case null { true }; // no filter → all visible
        case (?oid) {
          switch (p.orgId) {
            case (?pid) { pid == oid };
            case null   { false }; // global policy doesn't match an org filter
          };
        };
      };
      if (matches) { results.add(p) };
    };
    results.toArray();
  };

  public func getGlobalRetentionPolicy(
    s      : State,
    caller : Common.UserId,
  ) : ?RetentionTypes.RetentionPolicy {
    ignore caller; // open read — no auth gate needed for global policy lookup
    s.retentionPolicies.get("global");
  };

  public func toggleLegalHold(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    req        : RetentionTypes.LegalHoldRequest,
  ) : Common.Result<RetentionTypes.RetentionPolicy, Text> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err("Unauthorized: must be SuperAdmin or Org Admin");
    };

    let now = Time.now();
    let policyKey = req.orgId;

    // Find or create the policy for the given org.
    let existing : RetentionTypes.RetentionPolicy = switch (s.retentionPolicies.get(policyKey)) {
      case (?p) { p };
      case null {
        // Create a default policy for this org so we can set the hold.
        let newId = s.state.nextPolicyId;
        s.state.nextPolicyId += 1;
        {
          id         = newId.toText();
          orgId      = ?req.orgId;
          period     = #unlimited;
          autoDelete = false;
          legalHold  = false;
          updatedAt  = now;
          updatedBy  = caller;
        };
      };
    };

    let updated : RetentionTypes.RetentionPolicy = {
      existing with
      legalHold = req.hold;
      updatedAt = now;
      updatedBy = caller;
    };
    s.retentionPolicies.add(policyKey, updated);

    // Audit: distinguish hold-placed vs hold-removed.
    let eventType : AdminTypes.AuditEventType = if (req.hold) {
      #legalHoldPlaced
    } else {
      #legalHoldRemoved
    };
    recordRetentionEvent(adminState, eventType, caller, ?req.orgId);

    #ok(updated);
  };

  public func getRetentionPolicy(
    s      : State,
    caller : Common.UserId,
    orgId  : OrgTypes.OrgId,
  ) : ?RetentionTypes.RetentionPolicy {
    ignore caller; // open read — callers are gated at the mixin level
    s.retentionPolicies.get(orgId);
  };

  /// Convert a RetentionPeriod to days as a Nat.
  /// #unlimited returns 0 (sentinel — callers should skip unlimited policies).
  func periodToDays(period : RetentionTypes.RetentionPeriod) : Nat {
    switch period {
      case (#days30)    30;
      case (#days90)    90;
      case (#year1)     365;
      case (#years7)    2555;
      case (#unlimited) 0; // sentinel
    };
  };

  /// Return non-unlimited, non-legal-hold policies whose updatedAt is older
  /// than (retentionPeriodDays - 30) days, i.e. within 30 days of expiry.
  /// Super Admin sees all; Org Admin sees only their org's policies.
  /// The caller-scoping is intentionally simple here — the mixin layer enforces
  /// role checks before calling this function.
  public func checkPolicyExpiry(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    callerOrgId : ?OrgTypes.OrgId,
  ) : [RetentionTypes.RetentionPolicy] {
    let isSuperAdmin = AdminLib.isAdmin(adminState, caller);
    let now          = Time.now();
    let results      = List.empty<RetentionTypes.RetentionPolicy>();

    for ((_k, p) in s.retentionPolicies.entries()) {
      // Skip unlimited policies — they never expire.
      let days = periodToDays(p.period);
      if (days == 0) { () } // #unlimited — skip
      else if (p.legalHold) { () } // legal hold — skip
      else {
        // Scope: Super Admin sees all; Org Admin sees only their org.
        let inScope = if (isSuperAdmin) {
          true
        } else {
          switch (callerOrgId, p.orgId) {
            case (?cid, ?pid) { cid == pid };
            case _ { false };
          };
        };
        if (inScope) {
          // Within-30-days-of-expiry threshold in nanoseconds.
          let thresholdNs : Int = ((days : Int) - 30) * 86400 * 1_000_000_000;
          let ageNs : Int = now - p.updatedAt;
          if (ageNs >= thresholdNs) {
            results.add(p);
          };
        };
      };
    };
    results.toArray();
  };

  /// Log an audit event of type #policyReportExported.
  public func logPolicyReportExported(
    adminState : AdminLib.State,
    caller     : Common.UserId,
    orgFilter  : ?OrgTypes.OrgId,
  ) : () {
    recordRetentionEvent(
      adminState,
      #policyReportExported,
      caller,
      orgFilter,
    );
  };

  /// Log an audit event of type #policyExpiryCheckPerformed.
  public func logPolicyExpiryCheck(
    adminState : AdminLib.State,
    caller     : Common.UserId,
  ) : () {
    recordRetentionEvent(
      adminState,
      #policyExpiryCheckPerformed,
      caller,
      null,
    );
  };
};
