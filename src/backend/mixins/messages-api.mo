import Common "../types/common";
import T "../types/messages";
import MsgsLib "../lib/messages";
import ConvsLib "../lib/conversations";
import EnterpriseLib "../lib/enterprise";
import Principal "mo:core/Principal";

mixin (
  msgsState : MsgsLib.State,
  convsState : ConvsLib.State,
  enterpriseState : EnterpriseLib.State,
) {

  func isMember(userId : Common.UserId, convId : Common.ConversationId) : Bool {
    switch (convsState.conversations.get(convId)) {
      case null false;
      case (?conv) {
        switch (conv.members.find(func(m : Common.UserId) : Bool { Principal.equal(m, userId) })) {
          case (?_) true;
          case null false;
        };
      };
    };
  };

  /// Send an encrypted message to a conversation.
  public shared ({ caller }) func sendMessage(
    req : T.SendMessageRequest
  ) : async Common.Result<T.MessagePublic, Common.Error> {
    let result = MsgsLib.sendMessage(msgsState, caller, req, isMember);
    // Hook: record retention metadata for group conversations when policy is enabled.
    switch (result) {
      case (#ok(msg)) {
        switch (convsState.conversations.get(req.conversationId)) {
          case (?conv) {
            if (conv.kind == #group) {
              EnterpriseLib.maybeRecordRetentionMetadata(
                enterpriseState,
                msg.id,
                req.conversationId,
                caller,
                conv.members,
              );
            };
          };
          case null {};
        };
      };
      case (#err(_)) {};
    };
    result;
  };

  /// Get paginated messages for a conversation (caller must be a member).
  public shared query ({ caller }) func getMessages(
    req : T.GetMessagesRequest
  ) : async Common.Result<[T.MessagePublic], Common.Error> {
    MsgsLib.getMessages(msgsState, caller, req, isMember);
  };

  /// Mark a message as read by the caller.
  public shared ({ caller }) func markMessageRead(
    messageId : Common.MessageId
  ) : async Common.Result<(), Common.Error> {
    MsgsLib.markRead(msgsState, caller, messageId);
  };

  /// Set the caller's typing indicator for a conversation.
  /// ttlSeconds: duration in seconds; 0 → default 5 seconds.
  public shared ({ caller }) func setTypingIndicator(
    conversationId : Common.ConversationId,
    ttlSeconds : Nat,
  ) : async () {
    MsgsLib.setTyping(msgsState, caller, conversationId, ttlSeconds * 1_000_000_000);
  };

  /// Clear the caller's typing indicator.
  public shared ({ caller }) func clearTypingIndicator(
    conversationId : Common.ConversationId
  ) : async () {
    MsgsLib.clearTyping(msgsState, caller, conversationId);
  };

  /// Get active typing indicators for a conversation (expired entries filtered out).
  /// Query call for low-latency polling.
  public shared query ({ caller }) func getTypingIndicators(
    conversationId : Common.ConversationId
  ) : async [T.TypingIndicatorPublic] {
    MsgsLib.getTypingIndicators(msgsState, caller, conversationId);
  };
};
