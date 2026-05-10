import Common "common";

module {
  /// A registered device session for a user.
  public type DeviceRecord = {
    deviceId    : Text;             // client-generated UUID
    deviceLabel : Text;             // human-readable device name
    publicKey   : Blob;             // per-device E2EE public key
    registeredAt : Common.Timestamp;
    var lastSeen : Common.Timestamp;
  };

  /// Shared (API-boundary) variant — no var fields.
  public type DeviceRecordPublic = {
    deviceId    : Text;
    deviceLabel : Text;
    publicKey   : Blob;
    registeredAt : Common.Timestamp;
    lastSeen    : Common.Timestamp;
  };

  /// Payload used to add a device.
  public type AddDeviceRequest = {
    deviceId    : Text;
    deviceLabel : Text;
    publicKey   : Blob;
  };

  /// Short-lived QR-sync token stored by the canister.
  public type DeviceSyncToken = {
    ownerPrincipal  : Common.UserId;
    devicePublicKey : Blob;
    expiresAt       : Common.Timestamp; // 5-minute TTL
  };
};
