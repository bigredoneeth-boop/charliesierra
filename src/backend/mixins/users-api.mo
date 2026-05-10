import Common "../types/common";
import T "../types/users";
import UsersLib "../lib/users";

mixin (usersState : UsersLib.State) {
  /// Register the calling principal as a new user.
  public shared ({ caller }) func registerUser(
    req : T.RegisterRequest
  ) : async Common.Result<T.UserProfilePublic, Common.Error> {
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
    UsersLib.updateProfile(usersState, caller, req);
  };

  /// Refresh last-seen timestamp for the caller.
  public shared ({ caller }) func touchPresence() : async () {
    UsersLib.touchPresence(usersState, caller);
  };
};
