import Common "../types/common";
import T "../types/discovery";
import DiscoveryLib "../lib/discovery";
import ConvsLib "../lib/conversations";
import Principal "mo:core/Principal";

mixin (discoveryState : DiscoveryLib.State, convsState : ConvsLib.State) {
  /// List discoverable public groups. No E2EE metadata or messages included.
  public shared query func listPublicGroups(
    req : T.ListPublicGroupsRequest
  ) : async [T.PublicGroupSummary] {
    DiscoveryLib.listPublicGroups(convsState.conversations, req);
  };

  /// Submit a join request to a discoverable group.
  public shared ({ caller }) func submitJoinRequest(
    req : T.SubmitJoinRequestRequest
  ) : async Common.Result<T.JoinRequest, Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#unauthorized);
    // Input validation
    if (req.conversationId == 0) return #err(#invalidInput);
    DiscoveryLib.submitJoinRequest(discoveryState, convsState.conversations, caller, req);
  };

  /// Get all pending (and resolved) join requests for a group.
  /// Caller must be the group creator.
  public shared query ({ caller }) func getGroupJoinRequests(
    conversationId : Common.ConversationId
  ) : async Common.Result<[T.JoinRequest], Common.Error> {
    DiscoveryLib.getGroupJoinRequests(discoveryState, convsState.conversations, caller, conversationId);
  };

  /// Approve a join request — adds the requester to the group.
  public shared ({ caller }) func approveJoinRequest(
    req : T.JoinRequestActionRequest
  ) : async Common.Result<(), Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#unauthorized);
    // Input validation
    if (req.requestId.size() == 0) return #err(#invalidInput);
    if (req.conversationId == 0) return #err(#invalidInput);
    DiscoveryLib.approveJoinRequest(discoveryState, convsState.conversations, caller, req);
  };

  /// Deny a join request.
  public shared ({ caller }) func denyJoinRequest(
    req : T.JoinRequestActionRequest
  ) : async Common.Result<(), Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#unauthorized);
    // Input validation
    if (req.requestId.size() == 0) return #err(#invalidInput);
    if (req.conversationId == 0) return #err(#invalidInput);
    DiscoveryLib.denyJoinRequest(discoveryState, convsState.conversations, caller, req);
  };
};
