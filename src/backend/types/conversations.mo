import Common "common";

module {
  public type ConversationKind = { #direct; #group };

  // Stored conversation record — mutable fields for live state
  public type Conversation = {
    id : Common.ConversationId;
    kind : ConversationKind;
    encryptedName : ?Blob;          // encrypted group name; null for direct
    members : [Common.UserId];      // list of member principals
    createdAt : Common.Timestamp;
    var lastMessageAt : Common.Timestamp;
    createdBy : Common.UserId;
    // Discovery / community fields (groups only)
    discoverable : Bool;            // true = visible in public group listings
    displayName  : ?Text;           // plaintext name shown in discovery (not E2EE)
    description  : ?Text;           // optional group description
    category     : ?Text;           // optional grouping tag
  };

  // Shared (API-boundary) variant — no var fields
  public type ConversationPublic = {
    id : Common.ConversationId;
    kind : ConversationKind;
    encryptedName : ?Blob;
    members : [Common.UserId];
    createdAt : Common.Timestamp;
    lastMessageAt : Common.Timestamp;
    createdBy : Common.UserId;
    // Discovery fields
    discoverable : Bool;
    displayName  : ?Text;
    description  : ?Text;
    category     : ?Text;
  };

  public type CreateDirectRequest = {
    peer : Common.UserId;
  };

  public type CreateGroupRequest = {
    encryptedName  : Blob;
    initialMembers : [Common.UserId];
    // Optional discovery metadata
    displayName  : ?Text;
    description  : ?Text;
    category     : ?Text;
    discoverable : Bool;
  };

  public type AddMemberRequest = {
    conversationId : Common.ConversationId;
    member : Common.UserId;
  };

  public type RemoveMemberRequest = {
    conversationId : Common.ConversationId;
    member : Common.UserId;
  };
};
