import Common "../types/common";
import T "../types/attachments";
import AttLib "../lib/attachments";
import Principal "mo:core/Principal";

mixin (attState : AttLib.State) {
  /// Register attachment metadata after uploading the encrypted file to object storage.
  public shared ({ caller }) func registerAttachment(
    req : T.RegisterAttachmentRequest
  ) : async Common.Result<T.Attachment, Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#unauthorized);
    // Input validation
    if (req.storageKey.size() == 0 or req.storageKey.size() > 512) return #err(#invalidInput);
    if (req.mimeType.size() == 0 or req.mimeType.size() > 127) return #err(#invalidInput);
    if (req.encryptedSizeBytes == 0 or req.encryptedSizeBytes > 104857600) return #err(#invalidInput);
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
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#unauthorized);
    // Input validation
    if (attachmentId == 0) return #err(#invalidInput);
    AttLib.deleteAttachment(attState, caller, attachmentId);
  };

  /// Passthrough for file bytes — satisfies the frontend TypeScript interface
  /// contract. The real upload goes through object storage separately; this
  /// method exists so pnpm bindgen includes `uploadFile` in backendInterface.
  public shared ({ caller }) func uploadFile(fileBytes : Blob, mimeType : Text) : async Blob {
    if (caller.isAnonymous()) return "";
    if (fileBytes.size() == 0 or fileBytes.size() > 104857600) return "";
    ignore mimeType;
    fileBytes;
  };
};
