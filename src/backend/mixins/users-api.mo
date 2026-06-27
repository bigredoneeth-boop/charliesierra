import Common "../types/common";
import T "../types/users";
import UsersLib "../lib/users";
import Principal "mo:core/Principal";
import Array "mo:core/Array";

mixin (usersState : UsersLib.State) {
  /// Register the calling principal as a new user.
  public shared ({ caller }) func registerUser(
    req : T.RegisterRequest
  ) : async Common.Result<T.UserProfilePublic, Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#error("unauthorized"));
    // Input validation
    if (req.encryptedDisplayName.size() > 2048) return #err(#error("invalidInput: encryptedDisplayName"));
    // ECDH P-256 public key in SubjectPublicKeyInfo format is 91 bytes
    // (65-byte uncompressed point + 26-byte SPKI header)
    let expectedPrefix : [Nat8] = [0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07];
    if (req.ecdhPublicKey.size() != 91) return #err(#error("invalidInput: ecdhPublicKey"));
    let regBytes = req.ecdhPublicKey.toArray();
    var regPrefixValid = true;
    for (i in expectedPrefix.keys()) {
      if (i >= regBytes.size()) { regPrefixValid := false; break };
      if (regBytes[i] != expectedPrefix[i]) { regPrefixValid := false; break };
    };
    if (not regPrefixValid) return #err(#error("invalidInput: ecdhPublicKey"));
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
    if (caller.isAnonymous()) return #err(#error("unauthorized"));
    // Input validation on optional fields when provided
    switch (req.encryptedDisplayName) {
      case (?b) { if (b.size() > 2048) return #err(#error("invalidInput: encryptedDisplayName")) };
      case null {};
    };
    switch (req.ecdhPublicKey) {
      case (?b) {
        // ECDH P-256 public key in SubjectPublicKeyInfo format is typically 91 bytes
        // (65-byte uncompressed point + 26-byte SPKI header). Accept 91 bytes.
        // Expected prefix bytes: 0x3059301306072a8648ce3d020106082a8648ce3d030107
        let expectedPrefix : [Nat8] = [0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07];
        if (b.size() != 91) return #err(#error("invalidInput: ecdhPublicKey"));
        let bytes = b.toArray();
        // Validate prefix: first 22 bytes must match EC P-256 SPKI prefix
        var prefixValid = true;
        for (i in expectedPrefix.keys()) {
          if (i >= bytes.size()) { prefixValid := false; break };
          if (bytes[i] != expectedPrefix[i]) { prefixValid := false; break };
        };
        if (not prefixValid) return #err(#error("invalidInput: ecdhPublicKey"));
      };
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
