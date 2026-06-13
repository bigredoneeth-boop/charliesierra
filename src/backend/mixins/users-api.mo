import Common "../types/common";
import T "../types/users";
import UsersLib "../lib/users";
import Principal "mo:core/Principal";

mixin (usersState : UsersLib.State) {
  /// Register the calling principal as a new user.
  public shared ({ caller }) func registerUser(
    req : T.RegisterRequest
  ) : async Common.Result<T.UserProfilePublic, Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#unauthorized);
    // Input validation
    if (req.encryptedDisplayName.size() == 0 or req.encryptedDisplayName.size() > 2048) return #err(#invalidInput);
    if (req.ecdhPublicKey.size() == 0 or req.ecdhPublicKey.size() > 512) return #err(#invalidInput);
    UsersLib.register(usersState, caller, req);
  };

  /// Get a user profile by principal (public — no auth required for ECDH key lookup).
  public query func getUserProfile(
    userId : Common.UserId
  ) : async ?T.UserProfilePublic {
    UsersLib.getProfile(usersState, userId);
  };

  /// Batch get user profiles by principal list.
  public query func getUserProfiles(
    userIds : [Common.UserId]
  ) : async [T.UserProfilePublic] {
    UsersLib.getProfiles(usersState, userIds);
  };

  /// Update the caller's own profile (partial — null fields unchanged).
  public shared ({ caller }) func updateUserProfile(
    req : T.UpdateProfileRequest
  ) : async Common.Result<T.UserProfilePublic, Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#unauthorized);
    // Input validation on optional fields when provided
    switch (req.encryptedDisplayName) {
      case (?b) { if (b.size() == 0 or b.size() > 2048) return #err(#invalidInput) };
      case null {};
    };
    switch (req.ecdhPublicKey) {
      case (?b) { if (b.size() == 0 or b.size() > 512) return #err(#invalidInput) };
      case null {};
    };
    UsersLib.updateProfile(usersState, caller, req);
  };

  /// Refresh last-seen timestamp for the caller.
  public shared ({ caller }) func touchPresence() : async () {
    if (caller.isAnonymous()) return;
    UsersLib.touchPresence(usersState, caller);
  };
};
