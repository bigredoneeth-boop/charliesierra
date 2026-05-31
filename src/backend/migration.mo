import Map "mo:core/Map";
import Principal "mo:core/Principal";
import NotifTypes "types/notifications";

module {
  // ── Old stable-field types ────────────────────────────────────────────────
  // These are defined inline (not imported from .old/) per migration skill rules.

  // Old PushSubscriptionRecord — no lastUsed field, enabled was mutable.
  type OldPushSubscriptionRecord = {
    endpoint  : Text;
    auth      : Text;
    p256dh    : Text;
    createdAt : Int;
    var enabled : Bool;  // was var in old shape
  };

  // ── OldActor / NewActor ───────────────────────────────────────────────────
  // These must mirror the full set of stable fields in the actor.

  type OldActor = {
    pushSubscriptions : Map.Map<Principal, OldPushSubscriptionRecord>;
  };

  type NewActor = {
    pushSubscriptions : Map.Map<Principal, NotifTypes.PushSubscriptionRecord>;
  };

  // ── Migration function ────────────────────────────────────────────────────

  /// Upgrade migration: for each push subscription that lacks lastUsed,
  /// initialise lastUsed = record.createdAt (the subscription creation time).
  public func run(old : OldActor) : NewActor {
    let pushSubscriptions = old.pushSubscriptions.map<Principal, OldPushSubscriptionRecord, NotifTypes.PushSubscriptionRecord>(
      func(_principal, rec) {
        {
          endpoint  = rec.endpoint;
          auth      = rec.auth;
          p256dh    = rec.p256dh;
          createdAt = rec.createdAt;
          var lastUsed = rec.createdAt; // default: same as creation time
          var enabled  = rec.enabled;
        }
      }
    );
    { pushSubscriptions };
  };
};
