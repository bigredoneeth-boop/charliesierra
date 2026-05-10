import Common "../types/common";
import T "../types/messages";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";

module {
  public type State = {
    messages : Map.Map<Common.MessageId, T.Message>;
    // index: conversationId → ordered list of messageIds (append-ordered)
    conversationMessages : Map.Map<Common.ConversationId, [Common.MessageId]>;
    readReceipts : Map.Map<(Common.MessageId, Common.UserId), T.ReadReceiptRecord>;
    typingIndicators : Map.Map<(Common.ConversationId, Common.UserId), T.TypingIndicator>;
    state : { var nextId : Common.MessageId };
  };

  // ── Tuple compare helpers ─────────────────────────────────────────────────

  // (MessageId, UserId) key compare for readReceipts map
  func cmpMsgUser(a : (Common.MessageId, Common.UserId), b : (Common.MessageId, Common.UserId)) : { #less; #equal; #greater } {
    let c = Nat.compare(a.0, b.0);
    if (c != #equal) c else Principal.compare(a.1, b.1);
  };

  // (ConversationId, UserId) key compare for typingIndicators map
  func cmpConvUser(a : (Common.ConversationId, Common.UserId), b : (Common.ConversationId, Common.UserId)) : { #less; #equal; #greater } {
    let c = Nat.compare(a.0, b.0);
    if (c != #equal) c else Principal.compare(a.1, b.1);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  let DEFAULT_TTL_NS : Nat = 5_000_000_000; // 5 seconds in nanoseconds
  let MAX_PAGE_LIMIT : Nat = 50;

  /// Convert internal message to public (attaches read receipts).
  public func toPublic(
    s : State,
    msg : T.Message,
  ) : T.MessagePublic {
    // Collect all read receipts for this message
    let receipts = s.readReceipts.entries()
      |> _.filter(func(entry : ((Common.MessageId, Common.UserId), T.ReadReceiptRecord)) : Bool {
        entry.0.0 == msg.id
      })
      |> _.map(func(entry : ((Common.MessageId, Common.UserId), T.ReadReceiptRecord)) : T.ReadReceipt {
        { userId = entry.1.userId; readAt = entry.1.readAt }
      })
      |> _.toArray();
    {
      id = msg.id;
      conversationId = msg.conversationId;
      sender = msg.sender;
      encryptedContent = msg.encryptedContent;
      messageType = msg.messageType;
      sentAt = msg.sentAt;
      ttlSeconds = msg.ttlSeconds;
      priority = msg.priority;
      isDeleted = msg.isDeleted;
      readBy = receipts;
    };
  };

  /// Send an encrypted message to a conversation.
  public func sendMessage(
    s : State,
    caller : Common.UserId,
    req : T.SendMessageRequest,
    isMember : (Common.UserId, Common.ConversationId) -> Bool,
  ) : Common.Result<T.MessagePublic, Common.Error> {
    if (not isMember(caller, req.conversationId)) {
      return #err(#unauthorized);
    };
    let msgId = s.state.nextId;
    s.state.nextId += 1;
    let msg : T.Message = {
      id = msgId;
      conversationId = req.conversationId;
      sender = caller;
      encryptedContent = req.encryptedContent;
      messageType = req.messageType;
      sentAt = Time.now();
      ttlSeconds = req.ttlSeconds;
      priority = req.priority;
      var isDeleted = false;
    };
    s.messages.add(msgId, msg);
    // Append messageId to conversation index
    let existing = switch (s.conversationMessages.get(req.conversationId)) {
      case (?ids) ids;
      case null [];
    };
    s.conversationMessages.add(req.conversationId, existing.concat([msgId]));
    #ok(toPublic(s, msg));
  };

  /// Fetch a paginated list of messages for a conversation.
  public func getMessages(
    s : State,
    caller : Common.UserId,
    req : T.GetMessagesRequest,
    isMember : (Common.UserId, Common.ConversationId) -> Bool,
  ) : Common.Result<[T.MessagePublic], Common.Error> {
    if (not isMember(caller, req.conversationId)) {
      return #err(#unauthorized);
    };
    let limit = Nat.min(req.limit, MAX_PAGE_LIMIT);
    let ids = switch (s.conversationMessages.get(req.conversationId)) {
      case (?arr) arr;
      case null [];
    };
    // Work descending from cursor or end; filter deleted; take limit
    let result = ids.reverse()
      |> _.filter(func(mid : Common.MessageId) : Bool {
          switch (req.beforeMessageId) {
            case (?cursor) mid < cursor;
            case null true;
          };
        })
      |> _.filter(func(mid : Common.MessageId) : Bool {
          switch (s.messages.get(mid)) {
            case (?m) not m.isDeleted;
            case null false;
          };
        })
      |> _.filterMap(func(mid : Common.MessageId) : ?T.MessagePublic {
          switch (s.messages.get(mid)) {
            case (?m) {
              // Run lazy TTL pruning
              pruneTtlExpired(s, mid);
              if (m.isDeleted) null else ?toPublic(s, m);
            };
            case null null;
          };
        })
      |> _.values()
      |> _.take(limit)
      |> _.toArray();
    #ok(result);
  };

  /// Mark a message as read by the caller (idempotent — overwrites timestamp).
  public func markRead(
    s : State,
    caller : Common.UserId,
    messageId : Common.MessageId,
  ) : Common.Result<(), Common.Error> {
    switch (s.messages.get(messageId)) {
      case null #err(#notFound);
      case (?_msg) {
        let key = (messageId, caller);
        switch (s.readReceipts.get(cmpMsgUser, key)) {
          case (?rr) {
            rr.readAt := Time.now();
          };
          case null {
            let rr : T.ReadReceiptRecord = {
              messageId = messageId;
              userId = caller;
              var readAt = Time.now();
            };
            s.readReceipts.add(cmpMsgUser, key, rr);
          };
        };
        #ok(());
      };
    };
  };

  /// Set typing indicator for caller in a conversation.
  public func setTyping(
    s : State,
    caller : Common.UserId,
    conversationId : Common.ConversationId,
    ttlNs : Nat,
  ) : () {
    let effectiveTtl = if (ttlNs == 0) DEFAULT_TTL_NS else ttlNs;
    let expiresAt = Time.now() + effectiveTtl.toInt();
    let key = (conversationId, caller);
    switch (s.typingIndicators.get(cmpConvUser, key)) {
      case (?indicator) {
        indicator.expiresAt := expiresAt;
      };
      case null {
        let indicator : T.TypingIndicator = {
          conversationId = conversationId;
          userId = caller;
          var expiresAt = expiresAt;
        };
        s.typingIndicators.add(cmpConvUser, key, indicator);
      };
    };
  };

  /// Clear typing indicator for caller.
  public func clearTyping(
    s : State,
    caller : Common.UserId,
    conversationId : Common.ConversationId,
  ) : () {
    s.typingIndicators.remove(cmpConvUser, (conversationId, caller));
  };

  /// Get active (non-expired) typing indicators for a conversation, excluding caller.
  public func getTypingIndicators(
    s : State,
    caller : Common.UserId,
    conversationId : Common.ConversationId,
  ) : [T.TypingIndicatorPublic] {
    let now = Time.now();
    s.typingIndicators.entries()
      |> _.filter(func(entry : ((Common.ConversationId, Common.UserId), T.TypingIndicator)) : Bool {
          entry.0.0 == conversationId and entry.1.expiresAt > now and not Principal.equal(entry.1.userId, caller)
        })
      |> _.map(func(entry : ((Common.ConversationId, Common.UserId), T.TypingIndicator)) : T.TypingIndicatorPublic {
          { conversationId = entry.1.conversationId; userId = entry.1.userId; expiresAt = entry.1.expiresAt }
        })
      |> _.toArray();
  };

  /// Soft-delete a message if its TTL has expired.
  public func pruneTtlExpired(
    s : State,
    messageId : Common.MessageId,
  ) : () {
    switch (s.messages.get(messageId)) {
      case null ();
      case (?msg) {
        switch (msg.ttlSeconds) {
          case null ();
          case (?ttl) {
            let expiryNs : Int = msg.sentAt + ttl.toInt() * 1_000_000_000;
            if (Time.now() > expiryNs) {
              msg.isDeleted := true;
            };
          };
        };
      };
    };
  };
};
