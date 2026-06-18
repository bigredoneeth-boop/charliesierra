import Common "../types/common";
import T "../types/admin";
import OrgTypes "../types/orgs";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import List "mo:core/List";

module {
  public type State = {
    auditLog : Map.Map<Nat, T.AuditEvent>;
    adminPrincipals : Set.Set<Common.UserId>;
    state : { var nextEventId : Nat; var bootstrapCompleted : Bool; var dataResetCompleted : Bool; var seedPrincipal : ?Principal };
  };

  /// Append an audit event. Call from other lib modules — never expose raw log writes publicly.
  public func recordEvent(
    s : State,
    eventType : T.AuditEventType,
    actorId : Common.UserId,
    target : ?Common.UserId,
    encryptedDetails : ?Blob,
  ) : () {
    let id = s.state.nextEventId;
    s.state.nextEventId += 1;
    let event : T.AuditEvent = {
      id;
      eventType;
      actorPrincipal = actorId;
      targetPrincipal = target;
      timestamp = Time.now();
      encryptedDetails;
      orgId = null;
    };
    s.auditLog.add(id, event);
  };

  // Helper: check whether an event passes all filters from GetAuditLogRequest.
  func matchesFilters(
    event           : T.AuditEvent,
    filterEventType : ?T.AuditEventType,
    afterTimestamp  : ?Common.Timestamp,
    beforeTimestamp : ?Common.Timestamp,
    filterOrgId     : ?OrgTypes.OrgId,
    filterActor     : ?Common.UserId,
  ) : Bool {
    let byType = switch (filterEventType) {
      case (?ft) { event.eventType == ft };
      case null { true };
    };
    let byAfterTs = switch (afterTimestamp) {
      case (?ts) { event.timestamp > ts };
      case null { true };
    };
    let byBeforeTs = switch (beforeTimestamp) {
      case (?ts) { event.timestamp < ts };
      case null { true };
    };
    let byOrg = switch (filterOrgId) {
      case (?oid) {
        switch (event.orgId) {
          case (?eOid) { eOid == oid };
          case null { false };
        };
      };
      case null { true };
    };
    let byActor = switch (filterActor) {
      case (?a) { event.actorPrincipal == a };
      case null { true };
    };
    byType and byAfterTs and byBeforeTs and byOrg and byActor;
  };

  // Helper: collect the set of orgIds the caller belongs to (for OrgAdmin visibility).
  func callerOrgIds(
    callerText  : Text,
    memberships : Map.Map<Text, OrgTypes.OrgMembership>,
  ) : Set.Set<OrgTypes.OrgId> {
    let result = Set.empty<OrgTypes.OrgId>();
    for ((_k, m) in memberships.entries()) {
      if (m.userId.toText() == callerText and m.status != #Suspended) {
        result.add(m.orgId);
      };
    };
    result;
  };

  /// Read paginated audit log.
  /// Access rules:
  ///   - SuperAdmin / any admin principal: sees all events (filtered by request params)
  ///   - OrgAdmin / Auditor that is NOT a platform admin: sees only events whose orgId
  ///     matches one of their own org memberships
  /// The memberships map is passed in so AdminLib does not need to import OrgsLib
  /// (which would create a circular dependency).
  public func getAuditLog(
    s           : State,
    caller      : Common.UserId,
    req         : T.GetAuditLogRequest,
    memberships : Map.Map<Text, OrgTypes.OrgMembership>,
  ) : Common.Result<[T.AuditEvent], Common.Error> {
    let callerIsAdmin = isAdmin(s, caller);
    // Determine org-scoped visibility set for non-admins.
    let orgScope : ?Set.Set<OrgTypes.OrgId> = if (callerIsAdmin) {
      null // null = unrestricted
    } else {
      let ids = callerOrgIds(caller.toText(), memberships);
      if (ids.isEmpty()) return #err(#error("unauthorized"));
      ?ids
    };

    let limit = if (req.limit == 0) { 50 } else { req.limit };
    let results = List.empty<T.AuditEvent>();
    let startId = switch (req.afterEventId) {
      case (?cursor) { cursor + 1 };
      case null { 0 };
    };
    var collected = 0;
    var i = startId;
    label scan while (i < s.state.nextEventId and collected < limit) {
      switch (s.auditLog.get(i)) {
        case (?event) {
          // Org-scope check: non-admins see only their own orgs.
          let orgVisible = switch (orgScope) {
            case null { true };
            case (?ids) {
              switch (event.orgId) {
                case (?oid) { ids.contains(oid) };
                case null { false };
              };
            };
          };
          if (orgVisible and matchesFilters(
            event,
            req.filterEventType,
            req.afterTimestamp,
            req.beforeTimestamp,
            req.filterOrgId,
            req.filterActor,
          )) {
            results.add(event);
            collected += 1;
          };
        };
        case null {};
      };
      i += 1;
    };
    #ok(results.toArray());
  };

  /// Export audit log — same filtering as getAuditLog but no cursor pagination.
  /// Returns up to 10,000 events. Same RBAC rules apply.
  public func exportAuditLogs(
    s           : State,
    caller      : Common.UserId,
    req         : T.ExportAuditLogsRequest,
    memberships : Map.Map<Text, OrgTypes.OrgMembership>,
  ) : Common.Result<[T.AuditEvent], Common.Error> {
    let callerIsAdmin = isAdmin(s, caller);
    let orgScope : ?Set.Set<OrgTypes.OrgId> = if (callerIsAdmin) {
      null
    } else {
      let ids = callerOrgIds(caller.toText(), memberships);
      if (ids.isEmpty()) return #err(#error("unauthorized"));
      ?ids
    };

    let maxExport = 10_000;
    let results = List.empty<T.AuditEvent>();
    var i = 0;
    label scan while (i < s.state.nextEventId and results.size() < maxExport) {
      switch (s.auditLog.get(i)) {
        case (?event) {
          let orgVisible = switch (orgScope) {
            case null { true };
            case (?ids) {
              switch (event.orgId) {
                case (?oid) { ids.contains(oid) };
                case null { false };
              };
            };
          };
          if (orgVisible and matchesFilters(
            event,
            req.filterEventType,
            req.afterTimestamp,
            req.beforeTimestamp,
            req.filterOrgId,
            req.filterActor,
          )) {
            results.add(event);
          };
        };
        case null {};
      };
      i += 1;
    };
    #ok(results.toArray());
  };

  /// Add an admin principal.
  public func addAdmin(
    s : State,
    newAdmin : Common.UserId,
  ) : () {
    s.adminPrincipals.add(newAdmin);
  };

  /// Remove an admin principal. Prevents removing the last admin.
  public func removeAdmin(
    s : State,
    _caller : Common.UserId,
    target : Common.UserId,
  ) : Common.Result<(), Common.Error> {
    // Prevent lockout: block removal if it would leave zero admins
    if (s.adminPrincipals.size() <= 1 and s.adminPrincipals.contains(target)) {
      return #err(#error("forbidden"));
    };
    s.adminPrincipals.remove(target);
    #ok(());
  };

  /// Check whether a principal holds admin rights.
  public func isAdmin(
    s : State,
    principal : Common.UserId,
  ) : Bool {
    s.adminPrincipals.contains(principal);
  };

  /// List all current admin principals.
  public func listAdmins(s : State) : [Common.UserId] {
    s.adminPrincipals.toArray();
  };

  /// Bootstrap: ensure deployer is an admin on first run.
  /// One-time bootstrap seed: add the canister principal as a temporary admin
  /// so the deployer can call bootstrapSuperAdmin on first run.
  /// This is a COMPLETE NO-OP once bootstrapCompleted is true — safe to call
  /// on every upgrade because it never re-seeds after bootstrap is done.
  public func initBootstrapOnce(
    s : State,
    canisterPrincipal : Common.UserId,
  ) : () {
    // If bootstrap is already done, do nothing — permanent guard.
    if (s.state.bootstrapCompleted) {
      return;
    };
    // Seed the canister principal as a temporary admin so the deployer
    // can invoke bootstrapSuperAdmin. Store it so we can remove it later.
    s.adminPrincipals.add(canisterPrincipal);
    s.state.seedPrincipal := ?canisterPrincipal;
  };

  /// Deprecated no-op kept for call-site compatibility during migration.
  /// All existing callers should migrate to initBootstrapOnce.
  public func ensureDeployer(
    s : State,
    deployer : Common.UserId,
  ) : () {
    initBootstrapOnce(s, deployer);
  };

  /// One-shot bootstrap: assign the first real Super Admin.
  /// On success: adds superAdminPrincipal, removes the temporary canister-seed
  /// principal, sets bootstrapCompleted = true permanently.
  /// Guard: returns #err if bootstrapCompleted is already true — this function
  /// can only succeed ONCE in the lifetime of the canister.
  public func bootstrapSuperAdmin(
    s : State,
    targetPrincipal : Common.UserId,
  ) : Common.Result<Text, Text> {
    if (s.state.bootstrapCompleted) {
      return #err("Bootstrap already completed. Cannot re-run.");
    };
    // Add the real Super Admin.
    s.adminPrincipals.add(targetPrincipal);
    // Remove the temporary canister-seed principal so it does NOT retain
    // permanent admin rights after bootstrap completes.
    switch (s.state.seedPrincipal) {
      case (?seed) {
        s.adminPrincipals.remove(seed);
        s.state.seedPrincipal := null;
      };
      case null {};
    };
    // Lock bootstrap permanently — this is the ONLY place this is set to true.
    s.state.bootstrapCompleted := true;
    recordEvent(s, #adminAction, targetPrincipal, ?targetPrincipal, null);
    #ok("Super Admin successfully bootstrapped.");
  };

  /// Assert that caller is the owner of a resource.
  /// Returns #ok(()) if caller == owner, #err(#unauthorized) otherwise.
  public func assertCallerIsOwner(
    caller : Common.UserId,
    owner  : Common.UserId,
  ) : Common.Result<(), Common.Error> {
    if (caller == owner) { #ok(()) }
    else { #err(#error("unauthorized")) };
  };

  /// Returns true if the one-shot bootstrap has been completed.
  /// Used by the frontend to decide whether to show or hide the bootstrap UI.
  public func hasSuperAdmin(s : State) : Bool {
    s.state.bootstrapCompleted;
  };
};
