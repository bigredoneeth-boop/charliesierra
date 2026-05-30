import T "../types/notifications";
import Common "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";

mixin (
  pushSubscriptions    : Map.Map<Common.UserId, T.PushSubscriptionRecord>,
  notificationPrefs    : Map.Map<Common.UserId, T.NotificationPreferences>,
  pendingNotifications : Map.Map<Common.UserId, [T.PendingNotification]>,
) {
  /// Store or update a Web Push subscription for the caller.
  /// The endpoint + auth + p256dh originate from the browser's PushSubscription object.
  public shared ({ caller }) func subscribeToPush(
    endpoint : Text,
    authKey  : Text,
    p256dh   : Text,
  ) : async Common.Result<(), Text> {
    let record : T.PushSubscriptionRecord = {
      endpoint  = endpoint;
      auth      = authKey;
      p256dh    = p256dh;
      createdAt = Time.now();
      var enabled = true;
    };
    pushSubscriptions.add(caller, record);
    #ok(());
  };

  /// Remove the caller's push subscription.
  public shared ({ caller }) func unsubscribeFromPush() : async Common.Result<(), Text> {
    pushSubscriptions.remove(caller);
    #ok(());
  };

  /// Return the caller's current notification preferences.
  /// Defaults to both channels enabled if no preference record exists.
  public shared query ({ caller }) func getNotificationPreferences() : async Common.Result<T.NotificationPreferences, Text> {
    let prefs : T.NotificationPreferences = switch (notificationPrefs.get(caller)) {
      case null  ({ directMessagesEnabled = true; groupMessagesEnabled = true });
      case (?p)  p;
    };
    #ok(prefs);
  };

  /// Persist updated DM / group notification toggles for the caller.
  public shared ({ caller }) func updateNotificationPreferences(
    directEnabled : Bool,
    groupEnabled  : Bool,
  ) : async Common.Result<(), Text> {
    let prefs : T.NotificationPreferences = {
      directMessagesEnabled = directEnabled;
      groupMessagesEnabled  = groupEnabled;
    };
    notificationPrefs.add(caller, prefs);
    #ok(());
  };

  /// Drain-and-return: retrieve all pending notification triggers for the caller
  /// and atomically clear the queue so each trigger is delivered exactly once.
  /// Returns metadata only — never message body or sensitive content.
  public shared ({ caller }) func getPendingNotifications() : async Common.Result<[T.PendingNotification], Text> {
    let result = switch (pendingNotifications.get(caller)) {
      case null  [];
      case (?arr) arr;
    };
    // Clear the queue atomically after reading
    pendingNotifications.remove(caller);
    #ok(result);
  };

  /// Return the VAPID public key so the frontend can create a PushSubscription.
  /// This is a standard test key — rotate for production.
  public shared query func getVAPIDPublicKey() : async Text {
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
  };
};
