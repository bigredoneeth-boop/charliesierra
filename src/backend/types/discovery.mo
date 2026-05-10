import Common "common";

module {
  public type JoinRequestStatus = {
    #pending;
    #approved;
    #denied;
  };

  public type DenialReason = Text;

  /// A request by a user to join a discoverable group.
  public type JoinRequest = {
    requestId      : Text;                   // client-generated UUID
    conversationId : Common.ConversationId;
    requesterId    : Common.UserId;
    message        : ?Text;                  // optional user note
    status         : JoinRequestStatus;
    createdAt      : Common.Timestamp;
  };

  /// Public summary of a discoverable group — no E2EE metadata, no messages.
  public type PublicGroupSummary = {
    id          : Common.ConversationId;
    name        : Text;                      // plaintext display name (groups set this explicitly)
    description : ?Text;
    category    : ?Text;
    memberCount : Nat;
  };

  /// Pagination request for listing public groups.
  public type ListPublicGroupsRequest = {
    category : ?Text;   // optional filter
    offset   : Nat;
    limit    : Nat;
  };

  /// Request to submit a join request.
  public type SubmitJoinRequestRequest = {
    conversationId : Common.ConversationId;
    message        : ?Text;
  };

  /// Admin action on a join request.
  public type JoinRequestActionRequest = {
    requestId      : Text;
    conversationId : Common.ConversationId;
    denialReason   : ?DenialReason;          // only for deny
  };
};
