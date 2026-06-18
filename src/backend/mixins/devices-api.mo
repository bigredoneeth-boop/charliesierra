import Common "../types/common";
import T "../types/devices";
import DevicesLib "../lib/devices";
import Principal "mo:core/Principal";

mixin (devicesState : DevicesLib.State) {
  /// Register a new device for the caller. Replaces any existing entry with the same deviceId.
  public shared ({ caller }) func addDevice(
    req : T.AddDeviceRequest
  ) : async Common.Result<T.DeviceRecordPublic, Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#error("unauthorized"));
    // Input validation
    if (req.deviceId.size() == 0 or req.deviceId.size() > 128) return #err(#error("invalidInput"));
    if (req.deviceLabel.size() == 0 or req.deviceLabel.size() > 100) return #err(#error("invalidInput"));
    if (req.publicKey.size() == 0 or req.publicKey.size() > 512) return #err(#error("invalidInput"));
    DevicesLib.addDevice(devicesState, caller, req);
  };

  /// List all devices registered to the caller.
  public shared query ({ caller }) func listMyDevices() : async [T.DeviceRecordPublic] {
    DevicesLib.listMyDevices(devicesState, caller);
  };

  /// Revoke (deregister) a device by its deviceId.
  public shared ({ caller }) func revokeDevice(
    deviceId : Text
  ) : async Common.Result<(), Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#error("unauthorized"));
    // Input validation
    if (deviceId.size() == 0 or deviceId.size() > 128) return #err(#error("invalidInput"));
    DevicesLib.revokeDevice(devicesState, caller, deviceId);
  };

  /// Generate a short-lived QR code sync token (5-minute TTL).
  /// The caller provides the device public key that the new device will use.
  public shared ({ caller }) func generateDeviceSyncToken(
    devicePublicKey : Blob
  ) : async Common.Result<Text, Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#error("unauthorized"));
    // Input validation
    if (devicePublicKey.size() == 0 or devicePublicKey.size() > 512) return #err(#error("invalidInput"));
    DevicesLib.generateDeviceSyncToken(devicesState, caller, devicePublicKey);
  };

  /// Redeem a QR sync token to register the current device.
  public shared ({ caller }) func redeemDeviceSyncToken(
    token       : Text,
    deviceId    : Text,
    deviceLabel : Text,
  ) : async Common.Result<T.DeviceRecordPublic, Common.Error> {
    // Authorization: reject anonymous callers
    if (caller.isAnonymous()) return #err(#error("unauthorized"));
    // Input validation
    if (token.size() == 0 or token.size() > 512) return #err(#error("invalidInput"));
    if (deviceId.size() == 0 or deviceId.size() > 128) return #err(#error("invalidInput"));
    if (deviceLabel.size() == 0 or deviceLabel.size() > 100) return #err(#error("invalidInput"));
    DevicesLib.redeemDeviceSyncToken(devicesState, caller, token, deviceLabel, deviceId);
  };
};
