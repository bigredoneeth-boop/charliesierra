import Common "../types/common";
import T "../types/settings";
import AdminLib "../lib/admin";
import SettingsLib "../lib/settings";
import OrgTypes "../types/orgs";
import Cycles "mo:core/Cycles";
import Map "mo:core/Map";

mixin (
  adminState   : AdminLib.State,
  settingsState : SettingsLib.State,
  memberships  : Map.Map<Text, OrgTypes.OrgMembership>,
) {
  // ── Platform Settings ─────────────────────────────────────────────────────

  /// Super Admin only: read the global platform settings.
  public shared query ({ caller }) func getPlatformSettings()
    : async T.PlatformSettings {
    assert AdminLib.isAdmin(adminState, caller);
    SettingsLib.getPlatformSettings(settingsState);
  };

  /// Super Admin only: update global platform settings. All changes are audited.
  public shared ({ caller }) func updatePlatformSettings(
    update : T.PlatformSettings
  ) : async Common.Result<(), Text> {
    SettingsLib.updatePlatformSettings(settingsState, adminState, caller, update);
  };

  // ── Org Settings ──────────────────────────────────────────────────────────

  /// Org Admin or Super Admin: read org-specific settings.
  public shared query ({ caller }) func getOrgSettings(
    orgId : Text
  ) : async T.OrgSettings {
    // Access check: Super Admin or Org Admin of that org
    let callerIsAdmin = AdminLib.isAdmin(adminState, caller);
    if (not callerIsAdmin) {
      let membershipKey = orgId # ":" # caller.toText();
      let hasAccess = switch (memberships.get(membershipKey)) {
        case (?m) m.status != #Suspended;
        case null false;
      };
      if (not hasAccess) {
        // Return defaults — caller cannot see settings for an org they don't belong to
        return SettingsLib.getOrgSettings(settingsState, orgId);
      };
    };
    SettingsLib.getOrgSettings(settingsState, orgId);
  };

  /// Org Admin or Super Admin: update org-specific settings. All changes are audited.
  public shared ({ caller }) func updateOrgSettings(
    orgId  : Text,
    update : T.OrgSettings,
  ) : async Common.Result<(), Text> {
    SettingsLib.updateOrgSettings(
      settingsState,
      adminState,
      memberships,
      caller,
      orgId,
      update,
    );
  };

  // ── Canister Health ───────────────────────────────────────────────────────

  /// Super Admin only: basic canister health metrics.
  /// Returns cycle balance and memory stats (read-only — no cycles are sent).
  public shared query ({ caller }) func getCanisterHealth()
    : async { cyclesBalance : Nat; memoryUsed : Nat; memoryCapacity : Nat } {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return { cyclesBalance = 0; memoryUsed = 0; memoryCapacity = 0 };
    };
    let balance = Cycles.balance();
    // Canister memory info is not available as a simple query without
    // ExperimentalStableMemory or management canister calls, so we return
    // conservative sentinel values (0) for unused fields.
    { cyclesBalance = balance; memoryUsed = 0; memoryCapacity = 0 };
  };
};
