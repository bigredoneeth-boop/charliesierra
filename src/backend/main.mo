import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Principal "mo:core/Principal";
import UsersLib "lib/users";
import ConvsLib "lib/conversations";
import MsgsLib "lib/messages";
import AttLib "lib/attachments";
import AdminLib "lib/admin";
import EnterpriseLib "lib/enterprise";
import DevicesLib "lib/devices";
import DiscoveryLib "lib/discovery";
import UsersMixin "mixins/users-api";
import ConvsMixin "mixins/conversations-api";
import MsgsMixin "mixins/messages-api";
import AttMixin "mixins/attachments-api";
import AdminMixin "mixins/admin-api";
import EnterpriseMixin "mixins/enterprise-api";
import DevicesMixin "mixins/devices-api";
import DiscoveryMixin "mixins/discovery-api";
import OrgsMixin "mixins/orgs-api";
import OrgTypes "types/orgs";
import OrgsLib "lib/orgs";

import SovereignLib "lib/sovereign";
import SovereignMixin "mixins/sovereign-api";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import GroupsAdminMixin "mixins/groups-admin-api";
import RetentionLib "lib/retention";
import RetentionMixin "mixins/retention-api";

import SettingsLib "lib/settings";
import SettingsMixin "mixins/settings-api";
import NotificationsMixin "mixins/notifications-api";
import NotifTypes "types/notifications";
import T "types/users";





















actor self {
  // ── Stable state slices ──────────────────────────────────────────────────────

  // Users
  let usersState : UsersLib.State = {
    profiles = Map.empty();
    state = { var nextId = 0 };
  };

  // Conversations
  let convsState : ConvsLib.State = {
    conversations = Map.empty();
    directIndex = Map.empty();
    state = { var nextId = 0 };
  };

  // Messages
  let msgsState : MsgsLib.State = {
    messages = Map.empty();
    conversationMessages = Map.empty();
    readReceipts = Map.empty();
    receiptsByMessage = Map.empty();
    typingIndicators = Map.empty();
    state = { var nextId = 0 };
  };

  // Attachments
  let attState : AttLib.State = {
    attachments = Map.empty();
    messageAttachments = Map.empty();
    state = { var nextId = 0 };
  };

  // Admin — seed the deployer (canister principal itself) as initial admin
  let adminState : AdminLib.State = {
    auditLog = Map.empty();
    adminPrincipals = Set.empty();
    state = { var nextEventId = 0; var bootstrapCompleted = false; var dataResetCompleted = false; var seedPrincipal : ?Principal = null };
  };

  // Sovereign deployment
  let sovereignState : SovereignLib.State = {
    state = {
      var sovereignConfig = {
        residencyLabel       = #global;
        canisters            = "";
        subnetPrincipal      = null;
        nodeCount            = null;
        cyclesCostMultiplier = null;
        lastUpdated          = 0;
      };
    };
    groupCompartments = Map.empty();
  };

  // Enterprise
  let enterpriseState : EnterpriseLib.State = {
    retentionPolicies    = Map.empty();
    retentionMetadata    = List.empty();
    escrowRecords        = Map.empty();
    escrowGrants         = Map.empty();
    recoveryRequests     = Map.empty();
    vetEscrowRecords     = Map.empty();
    recoveryRateLimits   = Map.empty();
    recoveryRateLimitCounts = Map.empty();
    state                = { var nextGrantId = 0; var nextRecoveryRequestId = 0 };
  };

  // Retention Policy Management
  let retentionState : RetentionLib.State = {
    retentionPolicies = Map.empty();
    state             = { var nextPolicyId = 0 };
  };

  // ── Rate-limit stable state ──────────────────────────────────────────────
  // These are top-level stable vars (not in any migrated sub-record).
  // They default to empty on fresh install and upgrade — no migration needed.
  let orgCreateRateLimitWindows    : Map.Map<Principal, Int> = Map.empty();
  let orgCreateRateLimitCounts     : Map.Map<Principal, Nat> = Map.empty();
  let inviteRateLimitWindows       : Map.Map<Principal, Int> = Map.empty();
  let inviteRateLimitCounts        : Map.Map<Principal, Nat> = Map.empty();
  let suspendRateLimitWindows      : Map.Map<Principal, Int> = Map.empty();
  let suspendRateLimitCounts       : Map.Map<Principal, Nat> = Map.empty();
  let removeMemberRateLimitWindows : Map.Map<Principal, Int> = Map.empty();
  let removeMemberRateLimitCounts  : Map.Map<Principal, Nat> = Map.empty();

  // Settings (platform-wide and per-org).
  // settingsUpdateRateLimitWindows/Counts are owned inside this record so the
  // migration can carry them forward correctly on upgrade.
  let settingsState : SettingsLib.State = SettingsLib.emptyState();

  // Devices (multi-device sync)
  let devicesState : DevicesLib.State = {
    devices    = Map.empty();
    syncTokens = Map.empty();
  };

  // Discovery (community/group discovery with join approval workflows)
  let discoveryState : DiscoveryLib.State = {
    joinRequests = Map.empty();
  };

  // Orgs — multi-tenant organisation management
  // orgsData    : orgId -> OrgRecord
  // memberships : "orgId:principalText" -> OrgMembership  (Text key for Map compatibility)
  // invites     : inviteId -> OrgInvite
  let orgsData    : Map.Map<OrgTypes.OrgId, OrgTypes.OrgRecord>    = Map.empty();
  let memberships : Map.Map<Text, OrgTypes.OrgMembership>          = Map.empty();
  let invites     : Map.Map<Text, OrgTypes.OrgInvite>              = Map.empty();

  // Composed rate-limit state record for OrgsLib.
  let orgsRlState : OrgsLib.RateLimitState = {
    orgCreateRateLimitWindows;
    orgCreateRateLimitCounts;
    inviteRateLimitWindows;
    inviteRateLimitCounts;
    suspendRateLimitWindows;
    suspendRateLimitCounts;
  };

  // Notifications — push subscriptions, preferences, pending triggers, and VAPID state
  let pushSubscriptions    : Map.Map<Principal, NotifTypes.PushSubscriptionRecord> = Map.empty();
  let notificationPrefs    : Map.Map<Principal, NotifTypes.NotificationPreferences> = Map.empty();
  let pendingNotifications : Map.Map<Principal, [NotifTypes.PendingNotification]>   = Map.empty();
  let vapidState           : { var value : ?NotifTypes.VapidState } = { var value = null };

  // One-time bootstrap seed: adds the canister principal as a temporary admin so the deployer
  // can call bootstrapSuperAdmin on first run. After bootstrap completes this is a no-op.
  AdminLib.initBootstrapOnce(adminState, Principal.fromActor(self));
  // Seed sovereign config with the canister's own principal text as the canister ID.
  sovereignState.state.sovereignConfig := {
    sovereignState.state.sovereignConfig with
    canisters = Principal.fromActor(self).toText();
  };

  /// Return all registered user profiles so clients can populate their local
  /// display-name search cache. Explicit wrapper required for Candid .did exposure.
  public query func getAllUserProfiles() : async [T.UserProfilePublic] {
    UsersLib.getAllProfiles(usersState);
  };

  // ── Mixin composition ──────────────────────────────────────────────────────
  include MixinObjectStorage();
  include UsersMixin(usersState);
  include ConvsMixin(convsState, msgsState);
  include MsgsMixin(msgsState, convsState, enterpriseState, pushSubscriptions, notificationPrefs, pendingNotifications, Principal.fromActor(self));
  include AttMixin(attState);
  include AdminMixin(adminState, memberships, usersState, convsState, msgsState, attState, invites);
  include EnterpriseMixin(adminState, enterpriseState, convsState);
  include SovereignMixin(adminState, enterpriseState, sovereignState);
  include DevicesMixin(devicesState);
  include DiscoveryMixin(discoveryState, convsState);
  // Wire org state + adminState into the OrgsMixin.
  // adminState.adminPrincipals serves as the SuperAdmin set (shared with AdminLib).
  include OrgsMixin(adminState, orgsData, memberships, invites, orgsRlState);
  include GroupsAdminMixin(adminState, convsState, memberships, removeMemberRateLimitWindows, removeMemberRateLimitCounts);
  include RetentionMixin(adminState, retentionState);
  include NotificationsMixin(pushSubscriptions, notificationPrefs, pendingNotifications, vapidState, adminState);
  include SettingsMixin(adminState, settingsState, memberships);
};
