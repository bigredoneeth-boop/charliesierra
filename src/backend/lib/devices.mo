import Common "../types/common";
import T "../types/devices";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Principal "mo:core/Principal";

module {
  public type State = {
    /// Map from UserId to the list of registered device sessions.
    devices : Map.Map<Common.UserId, List.List<T.DeviceRecord>>;
    /// Short-lived QR sync tokens: token text → DeviceSyncToken.
    syncTokens : Map.Map<Text, T.DeviceSyncToken>;
  };

  /// Convert internal DeviceRecord to public (strip var fields).
  func toPublic(d : T.DeviceRecord) : T.DeviceRecordPublic {
    {
      deviceId     = d.deviceId;
      deviceLabel  = d.deviceLabel;
      publicKey    = d.publicKey;
      registeredAt = d.registeredAt;
      lastSeen     = d.lastSeen;
    };
  };

  /// Register (or replace) a device for the caller.
  public func addDevice(
    s      : State,
    caller : Common.UserId,
    req    : T.AddDeviceRequest,
  ) : Common.Result<T.DeviceRecordPublic, Common.Error> {
    let deviceList = switch (s.devices.get(caller)) {
      case (?list) { list };
      case null {
        let newList = List.empty<T.DeviceRecord>();
        s.devices.add(caller, newList);
        newList;
      };
    };
    // Reject duplicates
    let hasDuplicate = switch (deviceList.find(func(d : T.DeviceRecord) : Bool { d.deviceId == req.deviceId })) {
      case (?_) { true };
      case null { false };
    };
    if (hasDuplicate) { return #err(#alreadyExists) };
    // Enforce max 10 devices per user
    if (deviceList.size() >= 10) { return #err(#forbidden) };
    let now = Time.now();
    let record : T.DeviceRecord = {
      deviceId     = req.deviceId;
      deviceLabel  = req.deviceLabel;
      publicKey    = req.publicKey;
      registeredAt = now;
      var lastSeen = now;
    };
    deviceList.add(record);
    #ok(toPublic(record));
  };

  /// List all registered devices for the caller.
  public func listMyDevices(
    s      : State,
    caller : Common.UserId,
  ) : [T.DeviceRecordPublic] {
    switch (s.devices.get(caller)) {
      case null { [] };
      case (?list) { list.map<T.DeviceRecord, T.DeviceRecordPublic>(func(d) { toPublic(d) }).toArray() };
    };
  };

  /// Revoke (remove) a device by deviceId.
  public func revokeDevice(
    s        : State,
    caller   : Common.UserId,
    deviceId : Text,
  ) : Common.Result<(), Common.Error> {
    switch (s.devices.get(caller)) {
      case null { #err(#notFound) };
      case (?list) {
        let found = switch (list.find(func(d : T.DeviceRecord) : Bool { d.deviceId == deviceId })) {
          case (?_) { true };
          case null { false };
        };
        if (not found) { return #err(#notFound) };
        // Rebuild list without the revoked device
        let filtered = List.fromIter<T.DeviceRecord>(
          list.values().filter(func(d : T.DeviceRecord) : Bool { d.deviceId != deviceId })
        );
        s.devices.add(caller, filtered);
        #ok(());
      };
    };
  };

  /// Generate a short-lived QR sync token (5-minute TTL).
  public func generateDeviceSyncToken(
    s               : State,
    caller          : Common.UserId,
    devicePublicKey : Blob,
  ) : Common.Result<Text, Common.Error> {
    let now = Time.now();
    // 5-minute TTL in nanoseconds
    let expiresAt : Common.Timestamp = now + 5 * 60 * 1_000_000_000;
    // Generate a token string from caller principal + timestamp
    let tokenText = caller.toText() # "#" # now.toText();
    let token : T.DeviceSyncToken = {
      ownerPrincipal  = caller;
      devicePublicKey = devicePublicKey;
      expiresAt       = expiresAt;
    };
    s.syncTokens.add(tokenText, token);
    #ok(tokenText);
  };

  /// Validate and redeem a QR sync token, registering the new device.
  public func redeemDeviceSyncToken(
    s           : State,
    caller      : Common.UserId,
    token       : Text,
    deviceLabel : Text,
    deviceId    : Text,
  ) : Common.Result<T.DeviceRecordPublic, Common.Error> {
    switch (s.syncTokens.get(token)) {
      case null { #err(#notFound) };
      case (?syncToken) {
        let now = Time.now();
        // Check TTL
        if (now > syncToken.expiresAt) {
          s.syncTokens.remove(token);
          return #err(#forbidden);
        };
        // Caller must match token owner
        if (not Principal.equal(caller, syncToken.ownerPrincipal)) {
          return #err(#unauthorized);
        };
        // Delete the token (one-time use)
        s.syncTokens.remove(token);
        // Register the device using the token's public key
        let req : T.AddDeviceRequest = {
          deviceId    = deviceId;
          deviceLabel = deviceLabel;
          publicKey   = syncToken.devicePublicKey;
        };
        addDevice(s, caller, req);
      };
    };
  };
};
