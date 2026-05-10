import Common "../types/common";
import T "../types/devices";
import DevicesLib "../lib/devices";

mixin (devicesState : DevicesLib.State) {
  /// Register a new device for the caller. Replaces any existing entry with the same deviceId.
  public shared ({ caller }) func addDevice(
    req : T.AddDeviceRequest
  ) : async Common.Result<T.DeviceRecordPublic, Common.Error> {
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
    DevicesLib.revokeDevice(devicesState, caller, deviceId);
  };

  /// Generate a short-lived QR code sync token (5-minute TTL).
  /// The caller provides the device public key that the new device will use.
  public shared ({ caller }) func generateDeviceSyncToken(
    devicePublicKey : Blob
  ) : async Common.Result<Text, Common.Error> {
    DevicesLib.generateDeviceSyncToken(devicesState, caller, devicePublicKey);
  };

  /// Redeem a QR sync token to register the current device.
  public shared ({ caller }) func redeemDeviceSyncToken(
    token       : Text,
    deviceId    : Text,
    deviceLabel : Text,
  ) : async Common.Result<T.DeviceRecordPublic, Common.Error> {
    DevicesLib.redeemDeviceSyncToken(devicesState, caller, token, deviceLabel, deviceId);
  };
};
