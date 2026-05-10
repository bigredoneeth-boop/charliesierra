import Common "common";
import EnterpriseT "enterprise";

module {
  // ── Data Residency ────────────────────────────────────────────────────────

  /// Geographic/jurisdictional label for data residency guidance.
  /// Stored in canister state; used for deployment guidance only — not
  /// enforced at runtime.
  public type DataResidency = {
    #eu;
    #us;
    #apac;
    #global;
  };

  // ── Compartment Labels ────────────────────────────────────────────────────

  /// Security compartment tier — applies to group chats only.
  public type CompartmentLabel = {
    #classified;
    #unclassified;
  };

  // ── Sovereign Config ─────────────────────────────────────────────────────

  /// Deployment configuration for a sovereign / dedicated-subnet deployment.
  /// All fields are advisory metadata stored on-chain.
  public type SovereignConfig = {
    residencyLabel      : DataResidency;
    canisters           : Text;              // canisterId string(s)
    subnetPrincipal     : ?Principal;
    nodeCount           : ?Nat;
    cyclesCostMultiplier : ?Float;
    lastUpdated         : Common.Timestamp;
  };

  // ── Config Export Bundle ──────────────────────────────────────────────────

  /// Exportable JSON bundle of deployment configuration.
  /// Never includes encryption keys.
  public type ConfigExportBundle = {
    canisters              : Text;
    subnetPrincipal        : ?Text;
    residencyLabel         : DataResidency;
    compartmentMappings    : [(Common.ConversationId, CompartmentLabel)];
    adminPrincipals        : [Common.UserId];
    groupRetentionPolicies : [(Common.ConversationId, EnterpriseT.GroupRetentionPolicy)];
    exportedBy             : Common.UserId;
    exportedAt             : Common.Timestamp;
  };
};
