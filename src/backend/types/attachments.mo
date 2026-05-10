import Common "common";

module {
  // Attachment metadata — links a message to an object-storage key
  // Actual file bytes are stored encrypted in object storage
  public type Attachment = {
    id : Common.AttachmentId;
    messageId : Common.MessageId;
    storageKey : Text;            // object-storage key (opaque reference)
    mimeType : Text;              // e.g. "image/jpeg" — not sensitive metadata
    encryptedSizeBytes : Nat;     // size of the encrypted payload
    uploadedAt : Common.Timestamp;
    uploader : Common.UserId;
  };

  public type RegisterAttachmentRequest = {
    messageId : Common.MessageId;
    storageKey : Text;
    mimeType : Text;
    encryptedSizeBytes : Nat;
  };
};
