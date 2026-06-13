import Common "../types/common";
import AdminLib "../lib/admin";
import OrgTypes "../types/orgs";
import T "../types/settings";
import Map "mo:core/Map";
import Time "mo:core/Time";

module {
  // ── Default values ─────────────────────────────────────────────────────────

  let defaultPlatformSettings : T.PlatformSettings = {
    platformName          = "CharlieSierra";
    platformTagline       = "Communications Secured";
    mfaEnforced           = false;
    sessionTimeoutMinutes = 60;
    passwordPolicy        = #strong;
    defaultRetentionDays  = #year1;
    vetKeysEnabled        = false;
    keyEscrowEnabled      = false;
    auditLogRetentionDays = #years7;
  };

  func defaultOrgSettings(orgId : Text) : T.OrgSettings = {
    orgId                   = orgId;
    defaultInviteRole       = "standardUser";
    messageRetentionDays    = null;
    groupCreationPermission = #orgAdminsOnly;
    legalHoldEnabled        = false;
    legalHoldReason         = null;
    dataExportPermission    = #orgAdminsOnly;
    logoUrl                 = null;
    logoStorageKey          = null;
  };

  // ── State ──────────────────────────────────────────────────────────────────
  // Enhanced orthogonal persistence: no stable keyword needed.

  public type State = {
    platformSettings             : { var value : T.PlatformSettings };
    orgSettingsMap               : Map.Map<Text, T.OrgSettings>;
    settingsUpdateRateLimitWindows : Map.Map<Common.UserId, Int>;
    settingsUpdateRateLimitCounts  : Map.Map<Common.UserId, Nat>;
  };

  public func emptyState() : State = {
    platformSettings               = { var value = defaultPlatformSettings };
    orgSettingsMap                 = Map.empty();
    settingsUpdateRateLimitWindows = Map.empty();
    settingsUpdateRateLimitCounts  = Map.empty();
  };

  // Rate-limit helper: returns true (allowed) and records, or false (exceeded) without mutating.
  func checkAndRecordRateLimit(
    caller      : Common.UserId,
    now         : Int,
    windowMap   : Map.Map<Common.UserId, Int>,
    countMap    : Map.Map<Common.UserId, Nat>,
    maxAttempts : Nat,
  ) : Bool {
    let windowNs : Int = 3_600_000_000_000;
    let (windowStart, currentCount) : (Int, Nat) = switch (windowMap.get(caller)) {
      case null (now, 0);
      case (?ws) {
        let count = switch (countMap.get(caller)) { case null 0; case (?c) c };
        if (now - ws >= windowNs) { (now, 0) } else { (ws, count) };
      };
    };
    if (currentCount >= maxAttempts) { return false };
    windowMap.add(caller, windowStart);
    countMap.add(caller, currentCount + 1);
    true
  };

  // ── Platform settings ──────────────────────────────────────────────────────

  public func getPlatformSettings(s : State) : T.PlatformSettings {
    s.platformSettings.value;
  };

  /// Update platform-wide settings. Caller must be a Super Admin.
  public func updatePlatformSettings(
    s          : State,
    adminState : AdminLib.State,
    caller     : Common.UserId,
    update     : T.PlatformSettings,
  ) : Common.Result<(), Text> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err("Unauthorized: Super Admin access required.");
    };
    // Rate limit: 5 updatePlatformSettings calls per hour per caller.
    let now = Time.now();
    if (not checkAndRecordRateLimit(caller, now, s.settingsUpdateRateLimitWindows, s.settingsUpdateRateLimitCounts, 5)) {
      return #err("Rate limit exceeded: too many settings update requests. Try again later.");
    };
    s.platformSettings.value := update;
    AdminLib.recordEvent(
      adminState,
      #platformSettingsUpdated,
      caller,
      null,
      null,
    );
    #ok(());
  };

  // ── Org settings ───────────────────────────────────────────────────────────

  public func getOrgSettings(s : State, orgId : Text) : T.OrgSettings {
    switch (s.orgSettingsMap.get(orgId)) {
      case (?settings) settings;
      case null defaultOrgSettings(orgId);
    };
  };

  /// Update org-level settings. Caller must be an Org Admin or Super Admin.
  /// Org Admin access is verified by checking that the caller has any active
  /// membership in the target org — the memberships map is consulted.
  public func updateOrgSettings(
    s           : State,
    adminState  : AdminLib.State,
    memberships : Map.Map<Text, OrgTypes.OrgMembership>,
    caller      : Common.UserId,
    orgId       : Text,
    update      : T.OrgSettings,
  ) : Common.Result<(), Text> {
    let callerIsAdmin = AdminLib.isAdmin(adminState, caller);
    if (not callerIsAdmin) {
      // Check org-level admin/auditor membership
      let membershipKey = orgId # ":" # caller.toText();
      let hasOrgAccess = switch (memberships.get(membershipKey)) {
        case (?m) {
          m.status != #Suspended and
          (m.role == #OrgAdmin or m.role == #Auditor)
        };
        case null false;
      };
      if (not hasOrgAccess) {
        return #err("Unauthorized: Org Admin access required.");
      };
    };
    // Ensure orgId in update matches the target orgId
    let safeUpdate : T.OrgSettings = { update with orgId = orgId };
    s.orgSettingsMap.add(orgId, safeUpdate);
    AdminLib.recordEvent(
      adminState,
      #orgSettingsUpdated,
      caller,
      null,
      null,
    );
    #ok(());
  };
};
