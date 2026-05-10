import Common "../types/common";
import T "../types/attachments";
import AttLib "../lib/attachments";

mixin (attState : AttLib.State) {
  /// Register attachment metadata after uploading the encrypted file to object storage.
  public shared ({ caller }) func registerAttachment(
    req : T.RegisterAttachmentRequest
  ) : async Common.Result<T.Attachment, Common.Error> {
    AttLib.registerAttachment(attState, caller, req);
  };

  /// Get attachments linked to a message.
  public query func getMessageAttachments(
    messageId : Common.MessageId
  ) : async [T.Attachment] {
    AttLib.getAttachmentsForMessage(attState, messageId);
  };

  /// Delete an attachment record (caller must be the uploader).
  public shared ({ caller }) func deleteAttachment(
    attachmentId : Common.AttachmentId
  ) : async Common.Result<(), Common.Error> {
    AttLib.deleteAttachment(attState, caller, attachmentId);
  };
};
