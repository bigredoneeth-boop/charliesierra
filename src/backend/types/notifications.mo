module {
  /// Web Push API subscription record — stores VAPID subscription data for a user.
  public type PushSubscriptionRecord = {
    endpoint : Text;   // Push service endpoint URL
    auth     : Text;   // VAPID auth secret (base64url)
    p256dh   : Text;   // VAPID receiver public key (base64url)
    createdAt : Int;   // Time.now() nanoseconds at subscription time
    var enabled : Bool; // Whether push delivery is currently active
  };

  /// Per-user notification preference toggles.
  public type NotificationPreferences = {
    directMessagesEnabled : Bool;
    groupMessagesEnabled  : Bool;
  };

  /// Lightweight metadata-only trigger queued for frontend polling.
  /// Never contains message body or sensitive content.
  public type PendingNotification = {
    id              : Text;   // Unique notification ID
    notifType       : Text;   // "DirectMessage" | "GroupMessage"
    senderDisplayName : Text; // Encrypted display name — decrypted client-side
    groupName       : ?Text;  // Present only for group messages
    timestamp       : Int;    // Time.now() nanoseconds
  };
};
