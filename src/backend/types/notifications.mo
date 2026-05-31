module {
  /// Web Push API subscription record — stores VAPID subscription data for a user.
  public type PushSubscriptionRecord = {
    endpoint  : Text;    // Push service endpoint URL
    auth      : Text;    // auth secret (base64url) from browser PushSubscription
    p256dh    : Text;    // receiver public key (base64url) from browser PushSubscription
    createdAt : Int;     // Time.now() nanoseconds at subscription time
    var lastUsed : Int;  // Time.now() nanoseconds of last successful push attempt
    var enabled : Bool;  // Whether push delivery is currently active
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

  /// VAPID state — pre-generated P-256 keypair, persisted across upgrades.
  /// Keys are generated offline using a tool such as web-push-codelab.glitch.me
  /// and hardcoded as base64url-encoded constants. P-256 (secp256r1) is required
  /// by the VAPID spec (RFC 8292). IC ECDSA only supports secp256k1, so we store
  /// the raw 32-byte private key scalar and sign JWTs with inline P-256 math.
  public type VapidState = {
    /// Uncompressed P-256 public key bytes (65 bytes: 0x04 || x || y)
    publicKeyBytes  : [Nat8];
    /// Base64url-encoded uncompressed public key for frontend PushManager.subscribe()
    publicKeyB64    : Text;
    /// Raw 32-byte P-256 private key scalar (big-endian)
    privateKeyBytes : [Nat8];
    /// Nanosecond timestamp when VAPID state was initialised
    createdAt       : Int;
  };
};
