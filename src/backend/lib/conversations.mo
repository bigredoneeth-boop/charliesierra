import Common "../types/common";
import T "../types/conversations";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Order "mo:core/Order";
import MsgsT "../types/messages";

module {
  public type State = {
    conversations : Map.Map<Common.ConversationId, T.Conversation>;
    // direct conversation index: canonical text key "smaller|larger" → ConversationId
    directIndex : Map.Map<Text, Common.ConversationId>;
    state : { var nextId : Common.ConversationId };
  };

  /// Canonical key for a direct conversation — smaller principal text first.
  func directKey(a : Principal, b : Principal) : Text {
    let ta = a.toText();
    let tb = b.toText();
    if (ta < tb) { ta # "|" # tb } else { tb # "|" # ta };
  };

  /// Check whether `user` is a member of conversation `c`.
  public func isMember(c : T.Conversation, user : Common.UserId) : Bool {
    c.members.find(func(m : Common.UserId) : Bool { Principal.equal(m, user) }) != null;
  };

  /// Create a 1:1 direct conversation between caller and peer.
  /// Returns existing conversation if one already exists.
  public func createDirect(
    s : State,
    caller : Common.UserId,
    req : T.CreateDirectRequest,
  ) : Common.Result<T.ConversationPublic, Common.Error> {
    if (Principal.equal(caller, req.peer)) {
      return #err(#invalidInput);
    };
    let key = directKey(caller, req.peer);
    switch (s.directIndex.get(key)) {
      case (?existingId) {
        switch (s.conversations.get(existingId)) {
          case (?c) { #ok(toPublic(c)) };
          case null { #err(#notFound) }; // orphan entry — should never happen
        };
      };
      case null {
        let id = s.state.nextId;
        s.state.nextId += 1;
        let now = Time.now();
        let conv : T.Conversation = {
          id;
          kind = #direct;
          encryptedName = null;
          members = [caller, req.peer];
          createdAt = now;
          var lastMessageAt = now;
          createdBy = caller;
          discoverable = false;
          displayName  = null;
          description  = null;
          category     = null;
        };
        s.conversations.add(id, conv);
        s.directIndex.add(key, id);
        #ok(toPublic(conv));
      };
    };
  };

  /// Create a group conversation. Caller is automatically included.
  public func createGroup(
    s : State,
    caller : Common.UserId,
    req : T.CreateGroupRequest,
  ) : Common.Result<T.ConversationPublic, Common.Error> {
    if (req.initialMembers.size() == 0) {
      return #err(#invalidInput);
    };
    let id = s.state.nextId;
    s.state.nextId += 1;
    let now = Time.now();
    // Ensure caller is in member list (deduplicated)
    let callerAlreadyIncluded = req.initialMembers.find(
      func(m : Common.UserId) : Bool { Principal.equal(m, caller) },
    ) != null;
    let members = if (callerAlreadyIncluded) {
      req.initialMembers;
    } else {
      [caller].concat(req.initialMembers);
    };
    let conv : T.Conversation = {
      id;
      kind = #group;
      encryptedName = ?req.encryptedName;
      members;
      createdAt = now;
      var lastMessageAt = now;
      createdBy = caller;
      discoverable = req.discoverable;
      displayName  = req.displayName;
      description  = req.description;
      category     = req.category;
    };
    s.conversations.add(id, conv);
    #ok(toPublic(conv));
  };

  /// List all conversations that the caller is a member of, sorted by lastMessageAt desc.
  public func listConversations(
    s : State,
    caller : Common.UserId,
  ) : [T.ConversationPublic] {
    let filtered : [T.ConversationPublic] = s.conversations.entries()
      .filter(func((_, c) : (Common.ConversationId, T.Conversation)) : Bool { isMember(c, caller) })
      .map(func((_, c) : (Common.ConversationId, T.Conversation)) : T.ConversationPublic { toPublic(c) })
      .toArray();
    filtered.sort(func(a : T.ConversationPublic, b : T.ConversationPublic) : Order.Order { Int.compare(b.lastMessageAt, a.lastMessageAt) });
  };

  /// Get a single conversation by id; returns null if caller is not a member.
  public func getConversation(
    s : State,
    caller : Common.UserId,
    id : Common.ConversationId,
  ) : ?T.ConversationPublic {
    switch (s.conversations.get(id)) {
      case null { null };
      case (?c) {
        if (isMember(c, caller)) { ?toPublic(c) } else { null };
      };
    };
  };

  /// Add a member to a group conversation. Caller must already be a member.
  public func addMember(
    s : State,
    caller : Common.UserId,
    req : T.AddMemberRequest,
  ) : Common.Result<(), Common.Error> {
    switch (s.conversations.get(req.conversationId)) {
      case null { #err(#notFound) };
      case (?c) {
        if (c.kind != #group) { return #err(#forbidden) };
        if (not isMember(c, caller)) { return #err(#unauthorized) };
        if (isMember(c, req.member)) { return #err(#alreadyExists) };
        let updated : T.Conversation = {
          c with
          members = c.members.concat([req.member]);
          var lastMessageAt = c.lastMessageAt;
        };
        s.conversations.add(req.conversationId, updated);
        #ok(());
      };
    };
  };

  /// Remove a member from a group conversation.
  /// Members can remove themselves; only the creator can remove others.
  public func removeMember(
    s : State,
    caller : Common.UserId,
    req : T.RemoveMemberRequest,
  ) : Common.Result<(), Common.Error> {
    switch (s.conversations.get(req.conversationId)) {
      case null { #err(#notFound) };
      case (?c) {
        if (c.kind != #group) { return #err(#forbidden) };
        if (not isMember(c, caller)) { return #err(#unauthorized) };
        let isSelf = Principal.equal(caller, req.member);
        let isCreator = Principal.equal(caller, c.createdBy);
        if (not isSelf and not isCreator) { return #err(#unauthorized) };
        if (not isMember(c, req.member)) { return #err(#notFound) };
        let updated : T.Conversation = {
          c with
          members = c.members.filter(func(m : Common.UserId) : Bool { not Principal.equal(m, req.member) });
          var lastMessageAt = c.lastMessageAt;
        };
        s.conversations.add(req.conversationId, updated);
        #ok(());
      };
    };
  };


  /// Delete a group conversation. Caller must be the creator.
  /// Also purges the conversation's messages from msgsState.
  /// Delete a conversation (group or direct). 
  /// For groups: caller must be the creator.
  /// For direct: caller must be a member.
  /// Also purges the conversation's messages from msgsState.
  public func deleteConversation(
    s : State,
    msgsConvMessages : Map.Map<Common.ConversationId, [Common.MessageId]>,
    msgsMessages : Map.Map<Common.MessageId, MsgsT.Message>,
    caller : Common.UserId,
    conversationId : Common.ConversationId,
  ) : Common.Result<(), Common.Error> {
    switch (s.conversations.get(conversationId)) {
      case null { #err(#notFound) };
      case (?c) {
        // Authorization check
        switch (c.kind) {
          case (#group) {
            if (not Principal.equal(caller, c.createdBy)) { return #err(#unauthorized) };
          };
          case (#direct) {
            if (not isMember(c, caller)) { return #err(#unauthorized) };
            // Remove from directIndex
            let members = c.members;
            if (members.size() == 2) {
              let key = directKey(members[0], members[1]);
              s.directIndex.remove(key);
            };
          };
        };
        // Remove message data for this conversation
        switch (msgsConvMessages.get(conversationId)) {
          case null {};
          case (?msgIds) {
            for (mid in msgIds.vals()) {
              msgsMessages.remove(mid);
            };
          };
        };
        msgsConvMessages.remove(conversationId);
        // Remove the conversation itself
        s.conversations.remove(conversationId);
        #ok(());
      };
    };
  };

  /// Convert internal conversation to public (strip var fields).
  public func toPublic(c : T.Conversation) : T.ConversationPublic {
    {
      id            = c.id;
      kind          = c.kind;
      encryptedName = c.encryptedName;
      members       = c.members;
      createdAt     = c.createdAt;
      lastMessageAt = c.lastMessageAt;
      createdBy     = c.createdBy;
      discoverable  = c.discoverable;
      displayName   = c.displayName;
      description   = c.description;
      category      = c.category;
    };
  };
};
