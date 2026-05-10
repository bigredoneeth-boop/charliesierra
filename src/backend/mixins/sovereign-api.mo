import AdminLib "../lib/admin";
import EnterpriseLib "../lib/enterprise";
import SovereignLib "../lib/sovereign";
import Common "../types/common";
import SovereignT "../types/sovereign";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";

mixin (
  adminState      : AdminLib.State,
  enterpriseState : EnterpriseLib.State,
  sovereignState  : SovereignLib.State
) {
  /// Return the current sovereign deployment configuration.
  /// Admin only.
  public shared query ({ caller }) func getDeploymentInfo()
    : async SovereignT.SovereignConfig
  {
    if (not AdminLib.isAdmin(adminState, caller)) {
      return Runtime.trap("unauthorized");
    };
    SovereignLib.getDeploymentInfo(sovereignState);
  };

  /// Update sovereign config (residency label, subnet principal, node count,
  /// cycles cost multiplier). Admin only.
  public shared ({ caller }) func setSovereignConfig(
    residency : SovereignT.DataResidency,
    subnet    : ?Principal,
    nodeCount : ?Nat,
    costMult  : ?Float
  ) : async Common.Result<SovereignT.SovereignConfig, Common.Error> {
    SovereignLib.setSovereignConfig(
      sovereignState,
      adminState,
      caller,
      residency,
      subnet,
      nodeCount,
      costMult,
      Time.now()
    );
  };

  /// Assign a compartment label (#classified | #unclassified) to a group chat.
  /// Caller must be a platform admin.
  public shared ({ caller }) func setGroupCompartment(
    convId : Common.ConversationId,
    compartment : SovereignT.CompartmentLabel
  ) : async Common.Result<(), Common.Error> {
    SovereignLib.setGroupCompartment(
      sovereignState,
      adminState,
      caller,
      convId,
      compartment,
      Time.now()
    );
  };

  /// Get the compartment label for a group conversation.
  /// Any member of the conversation may call this.
  public shared query ({ caller }) func getGroupCompartment(
    convId : Common.ConversationId
  ) : async ?SovereignT.CompartmentLabel {
    SovereignLib.getGroupCompartment(sovereignState, convId);
  };

  /// Export the full deployment config bundle as a JSON-serializable record.
  /// Admin only. No encryption keys are included.
  public shared ({ caller }) func exportConfigBundle()
    : async Common.Result<SovereignT.ConfigExportBundle, Common.Error>
  {
    SovereignLib.exportConfigBundle(
      sovereignState,
      adminState,
      enterpriseState,
      caller,
      Time.now()
    );
  };
};
