import Common "../types/common";
import T "../types/admin";
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
    state : { var nextEventId : Nat };
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
    };
    s.auditLog.add(id, event);
  };

  /// Read paginated audit log — caller must be an admin.
  public func getAuditLog(
    s : State,
    caller : Common.UserId,
    req : T.GetAuditLogRequest,
  ) : Common.Result<[T.AuditEvent], Common.Error> {
    if (not isAdmin(s, caller)) {
      return #err(#unauthorized);
    };
    // Collect all events, filter by eventType if provided, then paginate by afterEventId cursor
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
          let matches = switch (req.filterEventType) {
            case (?ft) { event.eventType == ft };
            case null { true };
          };
          if (matches) {
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
    caller : Common.UserId,
    target : Common.UserId,
  ) : Common.Result<(), Common.Error> {
    // Prevent lockout: block removal if it would leave zero admins
    if (s.adminPrincipals.size() <= 1 and s.adminPrincipals.contains(target)) {
      return #err(#forbidden);
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
  public func ensureDeployer(
    s : State,
    deployer : Common.UserId,
  ) : () {
    if (s.adminPrincipals.isEmpty()) {
      s.adminPrincipals.add(deployer);
    };
  };
};
