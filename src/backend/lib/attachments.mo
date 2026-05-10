import Common "../types/common";
import T "../types/attachments";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";

module {
  public type State = {
    attachments : Map.Map<Common.AttachmentId, T.Attachment>;
    messageAttachments : Map.Map<Common.MessageId, [Common.AttachmentId]>;
    state : { var nextId : Common.AttachmentId };
  };

  /// Register attachment metadata after the encrypted file has been uploaded to object storage.
  /// Caller must be the message sender — enforced by caller passing their Principal.
  public func registerAttachment(
    s : State,
    caller : Common.UserId,
    req : T.RegisterAttachmentRequest,
  ) : Common.Result<T.Attachment, Common.Error> {
    let attId = s.state.nextId;
    s.state.nextId += 1;
    let att : T.Attachment = {
      id = attId;
      messageId = req.messageId;
      storageKey = req.storageKey;
      mimeType = req.mimeType;
      encryptedSizeBytes = req.encryptedSizeBytes;
      uploadedAt = Time.now();
      uploader = caller;
    };
    s.attachments.add(attId, att);
    // Append to per-message index
    let existing = switch (s.messageAttachments.get(req.messageId)) {
      case (?ids) ids;
      case null [];
    };
    s.messageAttachments.add(req.messageId, existing.concat([attId]));
    #ok(att);
  };

  /// Get all attachment records for a message.
  public func getAttachmentsForMessage(
    s : State,
    messageId : Common.MessageId,
  ) : [T.Attachment] {
    let ids = switch (s.messageAttachments.get(messageId)) {
      case (?arr) arr;
      case null [];
    };
    ids.filterMap<Common.AttachmentId, T.Attachment>(func(aid) {
      s.attachments.get(aid)
    });
  };

  /// Delete attachment record (does NOT delete object-storage object).
  /// Only the original uploader may delete.
  public func deleteAttachment(
    s : State,
    caller : Common.UserId,
    attachmentId : Common.AttachmentId,
  ) : Common.Result<(), Common.Error> {
    switch (s.attachments.get(attachmentId)) {
      case null #err(#notFound);
      case (?att) {
        if (not Principal.equal(att.uploader, caller)) {
          return #err(#forbidden);
        };
        s.attachments.remove(attachmentId);
        // Remove from per-message index
        switch (s.messageAttachments.get(att.messageId)) {
          case null ();
          case (?ids) {
            let updated = ids.filter(func(aid) { aid != attachmentId });
            s.messageAttachments.add(att.messageId, updated);
          };
        };
        #ok(());
      };
    };
  };
};
