import Common "common";

module {
  // Public ECDH key blob — raw bytes of the public key point
  public type EcdhPublicKey = Blob;

  // All user content fields are encrypted blobs — backend never sees plaintext
  public type UserProfile = {
    id : Common.UserId;
    encryptedDisplayName : Blob; // AES-GCM encrypted display name
    encryptedAvatarKey : ?Text;  // object-storage key for encrypted avatar asset
    ecdhPublicKey : EcdhPublicKey;
    registeredAt : Common.Timestamp;
    var lastSeen : Common.Timestamp;
  };

  // Shared (API-boundary) variant — no var fields
  public type UserProfilePublic = {
    id : Common.UserId;
    encryptedDisplayName : Blob;
    encryptedAvatarKey : ?Text;
    ecdhPublicKey : EcdhPublicKey;
    registeredAt : Common.Timestamp;
    lastSeen : Common.Timestamp;
  };

  public type RegisterRequest = {
    encryptedDisplayName : Blob;
    ecdhPublicKey : EcdhPublicKey;
    encryptedAvatarKey : ?Text;
  };

  public type UpdateProfileRequest = {
    encryptedDisplayName : ?Blob;
    ecdhPublicKey : ?EcdhPublicKey;
    encryptedAvatarKey : ?Text;
  };
};
