import Map "mo:core/Map";
import AdminLib "admin";
import EnterpriseLib "enterprise";
import Common "../types/common";
import SovereignT "../types/sovereign";

module {
  // ── State ─────────────────────────────────────────────────────────────────

  public type State = {
    state             : { var sovereignConfig : SovereignT.SovereignConfig };
    groupCompartments : Map.Map<Common.ConversationId, SovereignT.CompartmentLabel>;
  };

  // ── Functions ─────────────────────────────────────────────────────────────

  /// Return the current sovereign deployment config (admin only).
  public func getDeploymentInfo(
    state : State
  ) : SovereignT.SovereignConfig {
    state.state.sovereignConfig;
  };

  /// Update sovereign config fields (residency label, subnet principal, etc.).
  /// Caller must be an admin.
  public func setSovereignConfig(
    state     : State,
    adminState : AdminLib.State,
    caller    : Common.UserId,
    residency : SovereignT.DataResidency,
    subnet    : ?Principal,
    nodeCount : ?Nat,
    costMult  : ?Float,
    now       : Common.Timestamp
  ) : Common.Result<SovereignT.SovereignConfig, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let updated : SovereignT.SovereignConfig = {
      state.state.sovereignConfig with
      residencyLabel       = residency;
      subnetPrincipal      = subnet;
      nodeCount            = nodeCount;
      cyclesCostMultiplier = costMult;
      lastUpdated          = now;
    };
    state.state.sovereignConfig := updated;
    AdminLib.recordEvent(adminState, #sovereignConfigUpdated, caller, null, null);
    #ok(updated);
  };

  /// Assign a compartment label to a group conversation.
  /// Caller must be an admin of the group.
  public func setGroupCompartment(
    state    : State,
    adminState : AdminLib.State,
    caller   : Common.UserId,
    convId   : Common.ConversationId,
    compartment : SovereignT.CompartmentLabel,
    _now     : Common.Timestamp
  ) : Common.Result<(), Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    state.groupCompartments.add(convId, compartment);
    AdminLib.recordEvent(adminState, #compartmentAssigned, caller, null, null);
    #ok(());
  };

  /// Get the compartment label assigned to a group conversation.
  public func getGroupCompartment(
    state  : State,
    convId : Common.ConversationId
  ) : ?SovereignT.CompartmentLabel {
    state.groupCompartments.get(convId);
  };

  /// Export the full deployment config bundle (admin only).
  /// Bundle is JSON-serializable; never includes encryption keys.
  public func exportConfigBundle(
    state          : State,
    adminState     : AdminLib.State,
    enterpriseState : EnterpriseLib.State,
    caller         : Common.UserId,
    now            : Common.Timestamp
  ) : Common.Result<SovereignT.ConfigExportBundle, Common.Error> {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return #err(#unauthorized);
    };
    let subnetText = switch (state.state.sovereignConfig.subnetPrincipal) {
      case (?p) ?p.toText();
      case null null;
    };
    let bundle : SovereignT.ConfigExportBundle = {
      canisters              = state.state.sovereignConfig.canisters;
      subnetPrincipal        = subnetText;
      residencyLabel         = state.state.sovereignConfig.residencyLabel;
      compartmentMappings    = state.groupCompartments.toArray();
      adminPrincipals        = adminState.adminPrincipals.toArray();
      groupRetentionPolicies = enterpriseState.retentionPolicies.toArray();
      exportedBy             = caller;
      exportedAt             = now;
    };
    AdminLib.recordEvent(adminState, #auditLogExported, caller, null, null);
    #ok(bundle);
  };
};
