import Common "../types/common";
import T "../types/discovery";
import ConvsT "../types/conversations";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  public type State = {
    /// Pending and resolved join requests, keyed by conversationId.
    joinRequests : Map.Map<Common.ConversationId, Map.Map<Text, T.JoinRequest>>;
  };

  /// List discoverable groups with optional category filter and pagination.
  public func listPublicGroups(
    convs : Map.Map<Common.ConversationId, ConvsT.Conversation>,
    req   : T.ListPublicGroupsRequest,
  ) : [T.PublicGroupSummary] {
    let all = convs.entries()
      .filter(func((_, c) : (Common.ConversationId, ConvsT.Conversation)) : Bool {
        if (not c.discoverable) { return false };
        if (c.kind != #group) { return false };
        switch (req.category) {
          case null { true };
          case (?cat) { c.category == ?cat };
        };
      })
      .map(func((_, c) : (Common.ConversationId, ConvsT.Conversation)) : T.PublicGroupSummary {
        {
          id          = c.id;
          name        = switch (c.displayName) { case (?n) { n }; case null { "" } };
          description = c.description;
          category    = c.category;
          memberCount = c.members.size();
        };
      })
      .toArray();
    // Pagination
    let offset = req.offset;
    let limit  = req.limit;
    if (offset >= all.size()) { return [] };
    let end = Nat.min(all.size(), offset + limit);
    all.sliceToArray(offset.toInt(), end.toInt());
  };

  /// Submit a join request for a discoverable group.
  public func submitJoinRequest(
    s      : State,
    convs  : Map.Map<Common.ConversationId, ConvsT.Conversation>,
    caller : Common.UserId,
    req    : T.SubmitJoinRequestRequest,
  ) : Common.Result<T.JoinRequest, Common.Error> {
    switch (convs.get(req.conversationId)) {
      case null { #err(#notFound) };
      case (?c) {
        if (not c.discoverable) { return #err(#forbidden) };
        // Caller must not already be a member
        let alreadyMember = c.members.find(func(m : Common.UserId) : Bool { Principal.equal(m, caller) });
        if (alreadyMember != null) { return #err(#alreadyExists) };
        let now = Time.now();
        let requestId = caller.toText() # "#" # now.toText();
        let joinReq : T.JoinRequest = {
          requestId      = requestId;
          conversationId = req.conversationId;
          requesterId    = caller;
          message        = req.message;
          status         = #pending;
          createdAt      = now;
        };
        let reqMap = switch (s.joinRequests.get(req.conversationId)) {
          case (?m) { m };
          case null {
            let newMap = Map.empty<Text, T.JoinRequest>();
            s.joinRequests.add(req.conversationId, newMap);
            newMap;
          };
        };
        reqMap.add(requestId, joinReq);
        #ok(joinReq);
      };
    };
  };

  /// Get all join requests for a group (caller must be group creator/admin).
  public func getGroupJoinRequests(
    s              : State,
    convs          : Map.Map<Common.ConversationId, ConvsT.Conversation>,
    caller         : Common.UserId,
    conversationId : Common.ConversationId,
  ) : Common.Result<[T.JoinRequest], Common.Error> {
    switch (convs.get(conversationId)) {
      case null { #err(#notFound) };
      case (?c) {
        let isCreator = Principal.equal(c.createdBy, caller);
        let isMember = c.members.find(func(m : Common.UserId) : Bool { Principal.equal(m, caller) });
        if (not isCreator and isMember == null) { return #err(#unauthorized) };
        switch (s.joinRequests.get(conversationId)) {
          case null { #ok([]) };
          case (?reqMap) {
            #ok(reqMap.values().toArray());
          };
        };
      };
    };
  };

  /// Approve a join request — adds the requester to the conversation.
  public func approveJoinRequest(
    s     : State,
    convs : Map.Map<Common.ConversationId, ConvsT.Conversation>,
    caller : Common.UserId,
    req    : T.JoinRequestActionRequest,
  ) : Common.Result<(), Common.Error> {
    switch (convs.get(req.conversationId)) {
      case null { #err(#notFound) };
      case (?c) {
        let isCreator = Principal.equal(c.createdBy, caller);
        let isMember = c.members.find(func(m : Common.UserId) : Bool { Principal.equal(m, caller) });
        if (not isCreator and isMember == null) { return #err(#unauthorized) };
        switch (s.joinRequests.get(req.conversationId)) {
          case null { #err(#notFound) };
          case (?reqMap) {
            switch (reqMap.get(req.requestId)) {
              case null { #err(#notFound) };
              case (?joinReq) {
                let updated : T.JoinRequest = { joinReq with status = #approved };
                reqMap.add(req.requestId, updated);
                // Add requester to the conversation members
                let newMembers = c.members.concat([joinReq.requesterId]);
                let updatedConv : ConvsT.Conversation = {
                  c with
                  members = newMembers;
                  var lastMessageAt = c.lastMessageAt;
                };
                convs.add(req.conversationId, updatedConv);
                #ok(());
              };
            };
          };
        };
      };
    };
  };

  /// Deny a join request.
  public func denyJoinRequest(
    s      : State,
    convs  : Map.Map<Common.ConversationId, ConvsT.Conversation>,
    caller : Common.UserId,
    req    : T.JoinRequestActionRequest,
  ) : Common.Result<(), Common.Error> {
    switch (convs.get(req.conversationId)) {
      case null { #err(#notFound) };
      case (?c) {
        let isCreator = Principal.equal(c.createdBy, caller);
        let isMember = c.members.find(func(m : Common.UserId) : Bool { Principal.equal(m, caller) });
        if (not isCreator and isMember == null) { return #err(#unauthorized) };
        switch (s.joinRequests.get(req.conversationId)) {
          case null { #err(#notFound) };
          case (?reqMap) {
            switch (reqMap.get(req.requestId)) {
              case null { #err(#notFound) };
              case (?joinReq) {
                let updated : T.JoinRequest = { joinReq with status = #denied };
                reqMap.add(req.requestId, updated);
                #ok(());
              };
            };
          };
        };
      };
    };
  };
};
