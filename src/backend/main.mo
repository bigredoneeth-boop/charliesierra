import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Principal "mo:core/Principal";
import UsersLib "lib/users";
import ConvsLib "lib/conversations";
import MsgsLib "lib/messages";
import AttLib "lib/attachments";
import CallsLib "lib/calls";
import AdminLib "lib/admin";
import EnterpriseLib "lib/enterprise";
import DevicesLib "lib/devices";
import DiscoveryLib "lib/discovery";
import UsersMixin "mixins/users-api";
import ConvsMixin "mixins/conversations-api";
import MsgsMixin "mixins/messages-api";
import AttMixin "mixins/attachments-api";
import CallsMixin "mixins/calls-api";
import AdminMixin "mixins/admin-api";
import EnterpriseMixin "mixins/enterprise-api";
import DevicesMixin "mixins/devices-api";
import DiscoveryMixin "mixins/discovery-api";

import SovereignLib "lib/sovereign";
import SovereignMixin "mixins/sovereign-api";


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
    typingIndicators = Map.empty();
    state = { var nextId = 0 };
  };

  // Attachments
  let attState : AttLib.State = {
    attachments = Map.empty();
    messageAttachments = Map.empty();
    state = { var nextId = 0 };
  };

  // Calls
  let callsState : CallsLib.State = {
    calls = Map.empty();
    userActiveCalls = Map.empty();
    state = { var nextId = 0 };
  };

  // Admin — seed the deployer (canister principal itself) as initial admin
  let adminState : AdminLib.State = {
    auditLog = Map.empty();
    adminPrincipals = Set.empty();
    state = { var nextEventId = 0 };
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
    retentionPolicies = Map.empty();
    retentionMetadata = List.empty();
    escrowRecords     = Map.empty();
    escrowGrants      = Map.empty();
    state             = { var nextGrantId = 0 };
  };

  // Devices (multi-device sync)
  let devicesState : DevicesLib.State = {
    devices    = Map.empty();
    syncTokens = Map.empty();
  };

  // Discovery (community/group discovery with join approval workflows)
  let discoveryState : DiscoveryLib.State = {
    joinRequests = Map.empty();
  };

  // Bootstrap: add the canister's own principal as the first admin so the deployer
  // (who is the controller) can call addAdmin to grant themselves or others access.
  AdminLib.ensureDeployer(adminState, Principal.fromActor(self));
  // Seed sovereign config with the canister's own principal text as the canister ID.
  sovereignState.state.sovereignConfig := {
    sovereignState.state.sovereignConfig with
    canisters = Principal.fromActor(self).toText();
  };

  // ── Mixin composition ──────────────────────────────────────────────────────
  include UsersMixin(usersState);
  include ConvsMixin(convsState, msgsState);
  include MsgsMixin(msgsState, convsState, enterpriseState);
  include AttMixin(attState);
  include CallsMixin(callsState);
  include AdminMixin(adminState);
  include EnterpriseMixin(adminState, enterpriseState, convsState);
  include SovereignMixin(adminState, enterpriseState, sovereignState);
  include DevicesMixin(devicesState);
  include DiscoveryMixin(discoveryState, convsState);
};
