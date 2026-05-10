import Common "../types/common";
import T "../types/conversations";
import ConvsLib "../lib/conversations";
import MsgsLib "../lib/messages";

mixin (convsState : ConvsLib.State, msgsState : MsgsLib.State) {
  /// Create or retrieve a 1:1 direct conversation with another user.
  public shared ({ caller }) func createDirectConversation(
    req : T.CreateDirectRequest
  ) : async Common.Result<T.ConversationPublic, Common.Error> {
    ConvsLib.createDirect(convsState, caller, req);
  };

  /// Create a new group conversation. Caller is automatically a member.
  public shared ({ caller }) func createGroupConversation(
    req : T.CreateGroupRequest
  ) : async Common.Result<T.ConversationPublic, Common.Error> {
    ConvsLib.createGroup(convsState, caller, req);
  };

  /// List all conversations the caller participates in, sorted by lastMessageAt desc.
  public shared query ({ caller }) func listConversations() : async [T.ConversationPublic] {
    ConvsLib.listConversations(convsState, caller);
  };

  /// Get a single conversation by id. Returns null if caller is not a member.
  public shared query ({ caller }) func getConversation(
    id : Common.ConversationId
  ) : async ?T.ConversationPublic {
    ConvsLib.getConversation(convsState, caller, id);
  };

  /// Add a member to a group conversation. Caller must be an existing member.
  public shared ({ caller }) func addConversationMember(
    req : T.AddMemberRequest
  ) : async Common.Result<(), Common.Error> {
    ConvsLib.addMember(convsState, caller, req);
  };

  /// Remove a member from a group conversation.
  /// Members can remove themselves; only the creator can remove others.
  public shared ({ caller }) func removeConversationMember(
    req : T.RemoveMemberRequest
  ) : async Common.Result<(), Common.Error> {
    ConvsLib.removeMember(convsState, caller, req);
  };
  /// Delete a group conversation. Only the group creator may call this.
  public shared ({ caller }) func deleteGroupConversation(
    conversationId : Common.ConversationId
  ) : async Common.Result<(), Common.Error> {
    ConvsLib.deleteGroup(
      convsState,
      msgsState.conversationMessages,
      msgsState.messages,
      caller,
      conversationId,
    );
  };
};
