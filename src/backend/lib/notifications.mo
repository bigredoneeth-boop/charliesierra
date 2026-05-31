import Map "mo:core/Map";
import T "../types/notifications";
import Common "../types/common";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import List "mo:core/List";

module {
  /// Bundled state record injected into the NotificationsMixin.
  public type State = {
    pushSubscriptions    : Map.Map<Common.UserId, T.PushSubscriptionRecord>;
    notificationPrefs    : Map.Map<Common.UserId, T.NotificationPreferences>;
    pendingNotifications : Map.Map<Common.UserId, [T.PendingNotification]>;
    vapidState           : { var value : ?T.VapidState };
  };

  // ── Push notification preference gate ────────────────────────────────────────

  /// Returns whether push notifications are enabled for a target user + notif type.
  public func isPushEnabled(
    pushSubscriptions : Map.Map<Common.UserId, T.PushSubscriptionRecord>,
    notificationPrefs : Map.Map<Common.UserId, T.NotificationPreferences>,
    targetPrincipal   : Principal,
    notifType         : Text,
  ) : Bool {
    let subEnabled = switch (pushSubscriptions.get(targetPrincipal)) {
      case null false;
      case (?sub) sub.enabled;
    };
    if (not subEnabled) return false;
    let prefs : T.NotificationPreferences = switch (notificationPrefs.get(targetPrincipal)) {
      case null ({ directMessagesEnabled = true; groupMessagesEnabled = true });
      case (?p) p;
    };
    switch (notifType) {
      case "GroupMessage" prefs.groupMessagesEnabled;
      case _             prefs.directMessagesEnabled;
    };
  };

  // ── Auto-cleanup: remove subscriptions idle > 90 days ───────────────────────

  let NINETY_DAYS_NS : Int = 7_776_000_000_000_000_000;

  public func pruneStaleSubscriptions(
    pushSubscriptions : Map.Map<Common.UserId, T.PushSubscriptionRecord>,
  ) : () {
    let now = Time.now();
    // Collect stale principal keys first to avoid mutation during iteration
    let staleKeys = List.empty<Principal>();
    for ((p, sub) in pushSubscriptions.entries()) {
      if (now - sub.lastUsed > NINETY_DAYS_NS) {
        staleKeys.add(p);
      };
    };
    // Remove stale subscriptions
    for (p in staleKeys.values()) {
      pushSubscriptions.remove(p);
    };
  };

  // ── Pending notification queue (polling fallback) ────────────────────────────

  /// Enqueue a metadata-only PendingNotification for the polling fallback.
  /// Skips the polling queue when the user has an active push subscription
  /// (to prevent unbounded queue growth when push is the primary delivery path).
  public func enqueueNotificationForUser(
    pushSubscriptions    : Map.Map<Common.UserId, T.PushSubscriptionRecord>,
    notificationPrefs    : Map.Map<Common.UserId, T.NotificationPreferences>,
    pendingNotifications : Map.Map<Common.UserId, [T.PendingNotification]>,
    targetPrincipal      : Principal,
    notifType            : Text,
    senderDisplayName    : Text,
    groupName            : ?Text,
  ) : () {
    // Gate: preference toggle must be enabled
    let prefEnabled = switch (notificationPrefs.get(targetPrincipal)) {
      case null true; // default both on
      case (?p) switch (notifType) {
        case "GroupMessage" p.groupMessagesEnabled;
        case _             p.directMessagesEnabled;
      };
    };
    if (not prefEnabled) return;

    // Skip polling queue if user has an active push subscription.
    // Web Push will deliver the notification; no need to also queue it.
    let hasPushSub = switch (pushSubscriptions.get(targetPrincipal)) {
      case null false;
      case (?sub) sub.enabled;
    };
    if (hasPushSub) return;

    // Build a unique notification ID
    let now = Time.now();
    let notifId = notifType # ":" # targetPrincipal.toText() # ":" # now.toText();

    let notif : T.PendingNotification = {
      id              = notifId;
      notifType       = notifType;
      senderDisplayName = senderDisplayName;
      groupName       = groupName;
      timestamp       = now;
    };

    // Append to polling queue (push not active path only)
    let existing = switch (pendingNotifications.get(targetPrincipal)) {
      case null [];
      case (?arr) arr;
    };
    pendingNotifications.add(targetPrincipal, existing.concat([notif]));
  };
};
