import Common "../types/common";
import T "../types/users";
import Map "mo:core/Map";
import Time "mo:core/Time";

module {
  public type State = {
    profiles : Map.Map<Common.UserId, T.UserProfile>;
    state : { var nextId : Nat }; // reserved for future counters
  };

  /// Register a new user. Returns #err #alreadyExists if the caller is already registered.
  public func register(
    s : State,
    caller : Common.UserId,
    req : T.RegisterRequest,
  ) : Common.Result<T.UserProfilePublic, Common.Error> {
    switch (s.profiles.get(caller)) {
      case (?_) { #err(#alreadyExists) };
      case null {
        let now = Time.now();
        let profile : T.UserProfile = {
          id = caller;
          encryptedDisplayName = req.encryptedDisplayName;
          ecdhPublicKey = req.ecdhPublicKey;
          encryptedAvatarKey = req.encryptedAvatarKey;
          registeredAt = now;
          var lastSeen = now;
        };
        s.profiles.add(caller, profile);
        #ok(toPublic(profile));
      };
    };
  };

  /// Return the public profile for a principal, or null if not found.
  public func getProfile(
    s : State,
    userId : Common.UserId,
  ) : ?T.UserProfilePublic {
    switch (s.profiles.get(userId)) {
      case (?p) { ?toPublic(p) };
      case null { null };
    };
  };

  /// Batch lookup for multiple user IDs — returns only found profiles.
  public func getProfiles(
    s : State,
    userIds : [Common.UserId],
  ) : [T.UserProfilePublic] {
    userIds.filterMap(
      func(uid : Common.UserId) : ?T.UserProfilePublic {
        switch (s.profiles.get(uid)) {
          case (?p) { ?toPublic(p) };
          case null { null };
        };
      },
    );
  };

  /// Update the caller's own profile fields (partial update — null fields unchanged).
  public func updateProfile(
    s : State,
    caller : Common.UserId,
    req : T.UpdateProfileRequest,
  ) : Common.Result<T.UserProfilePublic, Common.Error> {
    switch (s.profiles.get(caller)) {
      case null { #err(#notFound) };
      case (?profile) {
        let now = Time.now();
        let updated : T.UserProfile = {
          id = profile.id;
          encryptedDisplayName = switch (req.encryptedDisplayName) {
            case (?b) { b };
            case null { profile.encryptedDisplayName };
          };
          ecdhPublicKey = switch (req.ecdhPublicKey) {
            case (?k) { k };
            case null { profile.ecdhPublicKey };
          };
          encryptedAvatarKey = switch (req.encryptedAvatarKey) {
            case (?k) { ?k };
            case null { profile.encryptedAvatarKey };
          };
          registeredAt = profile.registeredAt;
          var lastSeen = now;
        };
        s.profiles.add(caller, updated);
        #ok(toPublic(updated));
      };
    };
  };

  /// Refresh the caller's last-seen timestamp.
  public func touchPresence(
    s : State,
    caller : Common.UserId,
  ) : () {
    switch (s.profiles.get(caller)) {
      case (?profile) { profile.lastSeen := Time.now() };
      case null {}; // not registered yet — ignore silently
    };
  };

  /// Convert internal profile to public (strip var fields).
  public func toPublic(profile : T.UserProfile) : T.UserProfilePublic {
    {
      id = profile.id;
      encryptedDisplayName = profile.encryptedDisplayName;
      ecdhPublicKey = profile.ecdhPublicKey;
      encryptedAvatarKey = profile.encryptedAvatarKey;
      registeredAt = profile.registeredAt;
      lastSeen = profile.lastSeen;
    };
  };
};
