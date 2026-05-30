import Map "mo:core/Map";
import T "../types/notifications";
import Common "../types/common";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

module {
  /// Bundled state record injected into the NotificationsMixin.
  public type State = {
    pushSubscriptions    : Map.Map<Common.UserId, T.PushSubscriptionRecord>;
    notificationPrefs    : Map.Map<Common.UserId, T.NotificationPreferences>;
    pendingNotifications : Map.Map<Common.UserId, [T.PendingNotification]>;
  };

  /// Append a metadata-only PendingNotification to the target user's queue.
  /// Only enqueues when:
  ///   1. The target user has an active push subscription (enabled = true)
  ///   2. The relevant preference toggle is enabled
  /// Never stores message body or sensitive content — metadata only.
  public func enqueueNotificationForUser(
    pushSubscriptions    : Map.Map<Common.UserId, T.PushSubscriptionRecord>,
    notificationPrefs    : Map.Map<Common.UserId, T.NotificationPreferences>,
    pendingNotifications : Map.Map<Common.UserId, [T.PendingNotification]>,
    targetPrincipal  : Principal,
    notifType        : Text,
    senderDisplayName : Text,
    groupName        : ?Text,
  ) : () {
    // Gate 1: target must have an active push subscription
    let subEnabled = switch (pushSubscriptions.get(targetPrincipal)) {
      case null false;
      case (?sub) sub.enabled;
    };
    if (not subEnabled) return;

    // Gate 2: relevant preference toggle must be on (default both true)
    let prefs : T.NotificationPreferences = switch (notificationPrefs.get(targetPrincipal)) {
      case null ({ directMessagesEnabled = true; groupMessagesEnabled = true });
      case (?p) p;
    };
    let prefEnabled = switch (notifType) {
      case ("GroupMessage") prefs.groupMessagesEnabled;
      case _               prefs.directMessagesEnabled; // "DirectMessage" and fallback
    };
    if (not prefEnabled) return;

    // Build a unique notification ID: type + principal + timestamp
    let now = Time.now();
    let notifId = notifType # ":" # targetPrincipal.toText() # ":" # now.toText();

    let notif : T.PendingNotification = {
      id              = notifId;
      notifType       = notifType;
      senderDisplayName = senderDisplayName;
      groupName       = groupName;
      timestamp       = now;
    };

    // Append to existing queue (or start a new one)
    let existing = switch (pendingNotifications.get(targetPrincipal)) {
      case null [];
      case (?arr) arr;
    };
    pendingNotifications.add(targetPrincipal, existing.concat([notif]));
  };
};
