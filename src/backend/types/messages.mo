import Common "common";

module {
  /// Priority level for a message — high-priority messages are surfaced
  /// above normal messages in offline queues and delivery ordering.
  public type MessagePriority = {
    #normal;
    #high;
  };

  public type MessageType = {
    #text;
    #image;
    #video;
    #audio;
    #file;
  };

  // All content is an opaque encrypted blob — backend never decrypts
  public type Message = {
    id : Common.MessageId;
    conversationId : Common.ConversationId;
    sender : Common.UserId;
    encryptedContent : Blob;      // AES-GCM encrypted payload
    messageType : MessageType;
    sentAt : Common.Timestamp;
    ttlSeconds : ?Nat;            // disappearing message TTL; null = permanent
    priority : ?MessagePriority;  // optional priority level; null = #normal
    var isDeleted : Bool;         // soft-delete flag (best-effort TTL cleanup)
  };

  // Shared (API-boundary) variant — no var fields
  public type MessagePublic = {
    id : Common.MessageId;
    conversationId : Common.ConversationId;
    sender : Common.UserId;
    encryptedContent : Blob;
    messageType : MessageType;
    sentAt : Common.Timestamp;
    ttlSeconds : ?Nat;
    priority : ?MessagePriority;  // optional priority level
    isDeleted : Bool;
    readBy : [ReadReceipt];       // read receipts bundled with message
  };

  // Per-user read receipt
  public type ReadReceipt = {
    userId : Common.UserId;
    readAt : Common.Timestamp;
  };

  // Stored read receipt — mutable to allow update
  public type ReadReceiptRecord = {
    messageId : Common.MessageId;
    userId : Common.UserId;
    var readAt : Common.Timestamp;
  };

  // Typing indicator — expires server-side on read
  public type TypingIndicator = {
    conversationId : Common.ConversationId;
    userId : Common.UserId;
    var expiresAt : Common.Timestamp; // cleared when past current time
  };

  public type TypingIndicatorPublic = {
    conversationId : Common.ConversationId;
    userId : Common.UserId;
    expiresAt : Common.Timestamp;
  };

  public type SendMessageRequest = {
    conversationId : Common.ConversationId;
    encryptedContent : Blob;
    messageType : MessageType;
    ttlSeconds : ?Nat;
    priority : ?MessagePriority;  // optional; null treated as #normal
  };

  public type GetMessagesRequest = {
    conversationId : Common.ConversationId;
    beforeMessageId : ?Common.MessageId; // pagination cursor
    limit : Nat;
  };
};
