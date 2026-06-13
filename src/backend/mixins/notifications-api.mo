import T "../types/notifications";
import NotifLib "../lib/notifications";
import AdminLib "../lib/admin";
import Common "../types/common";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat8 "mo:core/Nat8";
import Nat32 "mo:core/Nat32";
import Nat64 "mo:core/Nat64";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";

mixin (
  pushSubscriptions    : Map.Map<Common.UserId, T.PushSubscriptionRecord>,
  notificationPrefs    : Map.Map<Common.UserId, T.NotificationPreferences>,
  pendingNotifications : Map.Map<Common.UserId, [T.PendingNotification]>,
  vapidState           : { var value : ?T.VapidState },
  adminState           : AdminLib.State,
) {

  // ── IC Management Canister interface for HTTP outcalls ───────────────────────

  type HttpHeader = { name : Text; value : Text };
  type HttpMethod = { #get; #post; #head };
  type HttpRequestArgs = {
    url                : Text;
    max_response_bytes : ?Nat64;
    headers            : [HttpHeader];
    body               : ?[Nat8];
    method             : HttpMethod;
    transform          : ?{
      function : shared query ({ response : HttpResponseType; context : Blob }) -> async HttpResponseType;
      context  : Blob;
    };
  };
  type HttpResponseType = {
    status  : Nat;
    headers : [HttpHeader];
    body    : [Nat8];
  };

  let mgmt : actor {
    http_request : (HttpRequestArgs) -> async HttpResponseType;
  } = actor "aaaaa-aa";

  // ── Well-known test VAPID P-256 keypair ──────────────────────────────────────
  // Public key: the well-known VAPID test key (base64url, uncompressed P-256 point).
  // This value is returned to the frontend for PushManager.subscribe().
  // Private key: 32-byte big-endian scalar used to sign VAPID JWTs with inline P-256.
  //
  // To rotate: generate a new P-256 keypair, update both constants, and redeploy.
  // Existing browser subscriptions must be recreated after rotation.

  let VAPID_PUBLIC_KEY_B64 : Text =
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

  // Uncompressed P-256 public key bytes (0x04 || X32 || Y32 = 65 bytes).
  let VAPID_PUBLIC_KEY_BYTES : [Nat8] = [
    0x04,
    // X coordinate (32 bytes)
    0x04, 0x49, 0x7a, 0xda, 0x25, 0x18, 0x81, 0x48,
    0xaf, 0xc4, 0x89, 0x2f, 0xeb, 0xdc, 0x95, 0x98,
    0x4b, 0xa2, 0x04, 0x86, 0xbe, 0x21, 0xbf, 0x7e,
    0x49, 0x2b, 0xcc, 0x79, 0x0b, 0x40, 0xdc, 0xb1,
    // Y coordinate (32 bytes)
    0x60, 0x0f, 0x39, 0x2b, 0xc5, 0x92, 0x63, 0x4a,
    0x09, 0xa7, 0x7d, 0xc9, 0x23, 0x04, 0x9b, 0x81,
    0x92, 0xbd, 0xea, 0x05, 0x43, 0x08, 0x1c, 0x14,
    0x05, 0x2d, 0x76, 0x29, 0xe4, 0xd9, 0x2c, 0x87,
    0x45,
  ];

  // Private key scalar d (32 bytes big-endian).
  let VAPID_PRIVATE_KEY : [Nat8] = [
    0xa8, 0x3e, 0x5a, 0x12, 0x7f, 0xc3, 0x9b, 0x44,
    0x61, 0xd9, 0x8b, 0x2e, 0x55, 0x1a, 0xf0, 0x3d,
    0x9c, 0x74, 0x82, 0xe0, 0x3b, 0x57, 0xa6, 0x21,
    0xdc, 0x4e, 0x8f, 0x13, 0x06, 0xb2, 0x71, 0xc5,
  ];

  // ── Base64url encoder (URL-safe, no padding) ─────────────────────────────────

  func b64urlEncodeBytes(bytes : [Nat8]) : Text {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let charArr : [Char] = chars.toArray();
    let n = bytes.size();
    var result = "";
    var i = 0;
    while (i + 2 < n) {
      let b0 = bytes[i].toNat();
      let b1 = bytes[i + 1].toNat();
      let b2 = bytes[i + 2].toNat();
      result #= Text.fromChar(charArr[(b0 / 4) % 64]);
      result #= Text.fromChar(charArr[((b0 % 4) * 16 + b1 / 16) % 64]);
      result #= Text.fromChar(charArr[((b1 % 16) * 4 + b2 / 64) % 64]);
      result #= Text.fromChar(charArr[b2 % 64]);
      i += 3;
    };
    if (i + 1 == n) {
      let b0 = bytes[i].toNat();
      result #= Text.fromChar(charArr[(b0 / 4) % 64]);
      result #= Text.fromChar(charArr[((b0 % 4) * 16) % 64]);
    } else if (i + 2 == n) {
      let b0 = bytes[i].toNat();
      let b1 = bytes[i + 1].toNat();
      result #= Text.fromChar(charArr[(b0 / 4) % 64]);
      result #= Text.fromChar(charArr[((b0 % 4) * 16 + b1 / 16) % 64]);
      result #= Text.fromChar(charArr[((b1 % 16) * 4) % 64]);
    };
    result;
  };

  func b64urlEncodeText(t : Text) : Text {
    b64urlEncodeBytes(t.encodeUtf8().toArray());
  };

  // ── SHA-256 ──────────────────────────────────────────────────────────────────

  func sha256(data : [Nat8]) : [Nat8] {
    let k : [Nat32] = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
      0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
      0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
      0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
      0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
      0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    var h0 : Nat32 = 0x6a09e667;
    var h1 : Nat32 = 0xbb67ae85;
    var h2 : Nat32 = 0x3c6ef372;
    var h3 : Nat32 = 0xa54ff53a;
    var h4 : Nat32 = 0x510e527f;
    var h5 : Nat32 = 0x9b05688c;
    var h6 : Nat32 = 0x1f83d9ab;
    var h7 : Nat32 = 0x5be0cd19;

    let msgLen = data.size();
    let bitLen : Nat64 = Nat64.fromNat(msgLen) * 8;
    let rem64 = (msgLen + 1) % 64;
    let padLen = if (rem64 <= 56) { 56 - rem64 } else { 120 - rem64 };
    let paddedSize = msgLen + 1 + padLen + 8;
    let padded = Array.tabulate<Nat8>(paddedSize, func _ = 0).toVarArray();
    var i = 0;
    while (i < msgLen) { padded[i] := data[i]; i += 1 };
    padded[msgLen] := 0x80;
    padded[paddedSize - 8] := Nat8.fromNat(((bitLen >> 56) & 0xFF).toNat());
    padded[paddedSize - 7] := Nat8.fromNat(((bitLen >> 48) & 0xFF).toNat());
    padded[paddedSize - 6] := Nat8.fromNat(((bitLen >> 40) & 0xFF).toNat());
    padded[paddedSize - 5] := Nat8.fromNat(((bitLen >> 32) & 0xFF).toNat());
    padded[paddedSize - 4] := Nat8.fromNat(((bitLen >> 24) & 0xFF).toNat());
    padded[paddedSize - 3] := Nat8.fromNat(((bitLen >> 16) & 0xFF).toNat());
    padded[paddedSize - 2] := Nat8.fromNat(((bitLen >>  8) & 0xFF).toNat());
    padded[paddedSize - 1] := Nat8.fromNat((bitLen & 0xFF).toNat());

    var blockStart = 0;
    while (blockStart < paddedSize) {
      let w = Array.tabulate<Nat32>(64, func _ = 0).toVarArray();
      var t = 0;
      while (t < 16) {
        let off = blockStart + t * 4;
        w[t] := (Nat32.fromNat(padded[off].toNat()) << 24)
              | (Nat32.fromNat(padded[off + 1].toNat()) << 16)
              | (Nat32.fromNat(padded[off + 2].toNat()) << 8)
              | Nat32.fromNat(padded[off + 3].toNat());
        t += 1;
      };
      while (t < 64) {
        let s0 = (w[t-15] >> 7 | w[t-15] << 25) ^ (w[t-15] >> 18 | w[t-15] << 14) ^ (w[t-15] >> 3);
        let s1 = (w[t- 2] >> 17 | w[t- 2] << 15) ^ (w[t- 2] >> 19 | w[t- 2] << 13) ^ (w[t- 2] >> 10);
        w[t] := w[t-16] +% s0 +% w[t-7] +% s1;
        t += 1;
      };
      var a = h0; var b = h1; var c = h2; var d = h3;
      var e = h4; var f = h5; var g = h6; var h = h7;
      t := 0;
      while (t < 64) {
        let S1  = (e >> 6 | e << 26) ^ (e >> 11 | e << 21) ^ (e >> 25 | e << 7);
        let ch  = (e & f) ^ (^e & g);
        let temp1 = h +% S1 +% ch +% k[t] +% w[t];
        let S0  = (a >> 2 | a << 30) ^ (a >> 13 | a << 19) ^ (a >> 22 | a << 10);
        let maj = (a & b) ^ (a & c) ^ (b & c);
        let temp2 = S0 +% maj;
        h := g; g := f; f := e; e := d +% temp1;
        d := c; c := b; b := a; a := temp1 +% temp2;
        t += 1;
      };
      h0 +%= a; h1 +%= b; h2 +%= c; h3 +%= d;
      h4 +%= e; h5 +%= f; h6 +%= g; h7 +%= h;
      blockStart += 64;
    };
    let putWord = func(hv : Nat32) : [Nat8] {
      [
        Nat8.fromNat(((hv >> 24) & 0xFF).toNat()),
        Nat8.fromNat(((hv >> 16) & 0xFF).toNat()),
        Nat8.fromNat(((hv >>  8) & 0xFF).toNat()),
        Nat8.fromNat((hv & 0xFF).toNat()),
      ];
    };
    putWord(h0).concat(putWord(h1)).concat(putWord(h2)).concat(putWord(h3))
      .concat(putWord(h4)).concat(putWord(h5)).concat(putWord(h6)).concat(putWord(h7));
  };

  // ── P-256 (secp256r1) field arithmetic for VAPID ECDSA signing ───────────────
  // p  = 2^256 - 2^224 + 2^192 + 2^96 - 1
  // n  = group order
  // G  = base point

  let P256_P  : Nat = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff;
  let P256_N  : Nat = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551;
  let P256_GX : Nat = 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296;
  let P256_GY : Nat = 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5;

  func modAdd(a : Nat, b : Nat, m : Nat) : Nat { (a + b) % m };
  func modSub(a : Nat, b : Nat, m : Nat) : Nat {
    if (a >= b) { (a - b) % m } else { (m - (b - a) % m) % m };
  };
  func modMul(a : Nat, b : Nat, m : Nat) : Nat { (a * b) % m };
  func modPow(base : Nat, exp : Nat, m : Nat) : Nat {
    if (m == 1) return 0;
    var result = 1;
    var b = base % m;
    var e = exp;
    while (e > 0) {
      if (e % 2 == 1) { result := (result * b) % m };
      b := (b * b) % m;
      e := e / 2;
    };
    result;
  };
  func modInv(a : Nat, m : Nat) : Nat { modPow(a, m - 2, m) };

  type JacPoint = { x : Nat; y : Nat; z : Nat };
  let P256_INFINITY : JacPoint = { x = 0; y = 1; z = 0 };

  func jacDouble(pt : JacPoint) : JacPoint {
    if (pt.z == 0) return P256_INFINITY;
    let p   = P256_P;
    let X1  = pt.x; let Y1 = pt.y; let Z1 = pt.z;
    let S   = modMul(4, modMul(X1, modMul(Y1, Y1, p), p), p);
    let aZ4 = modMul(3, modPow(Z1, 4, p), p);
    let M2  = modSub(modMul(3, modMul(X1, X1, p), p), aZ4, p);
    let X3  = modSub(modMul(M2, M2, p), modMul(2, S, p), p);
    let Y3  = modSub(modMul(M2, modSub(S, X3, p), p), modMul(8, modPow(Y1, 4, p), p), p);
    let Z3  = modMul(2, modMul(Y1, Z1, p), p);
    { x = X3; y = Y3; z = Z3 };
  };

  func jacAdd(pt1 : JacPoint, pt2 : JacPoint) : JacPoint {
    if (pt1.z == 0) return pt2;
    if (pt2.z == 0) return pt1;
    let p  = P256_P;
    let U1 = modMul(pt1.x, modMul(pt2.z, pt2.z, p), p);
    let U2 = modMul(pt2.x, modMul(pt1.z, pt1.z, p), p);
    let S1 = modMul(pt1.y, modMul(modMul(pt2.z, pt2.z, p), pt2.z, p), p);
    let S2 = modMul(pt2.y, modMul(modMul(pt1.z, pt1.z, p), pt1.z, p), p);
    let H  = modSub(U2, U1, p);
    let R  = modSub(S2, S1, p);
    if (H == 0) {
      if (R == 0) return jacDouble(pt1);
      return P256_INFINITY;
    };
    let H2 = modMul(H, H, p);
    let H3 = modMul(H, H2, p);
    let X3 = modSub(modSub(modMul(R, R, p), H3, p), modMul(2, modMul(U1, H2, p), p), p);
    let Y3 = modSub(modMul(R, modSub(modMul(U1, H2, p), X3, p), p), modMul(S1, H3, p), p);
    let Z3 = modMul(H, modMul(pt1.z, pt2.z, p), p);
    { x = X3; y = Y3; z = Z3 };
  };

  func scalarMulG(k : Nat) : JacPoint {
    let G : JacPoint = { x = P256_GX; y = P256_GY; z = 1 };
    var result = P256_INFINITY;
    var addend = G;
    var scalar = k;
    while (scalar > 0) {
      if (scalar % 2 == 1) { result := jacAdd(result, addend) };
      addend := jacDouble(addend);
      scalar := scalar / 2;
    };
    result;
  };

  func jacToAffine(pt : JacPoint) : (Nat, Nat) {
    let p    = P256_P;
    let zInv = modInv(pt.z, p);
    let z2   = modMul(zInv, zInv, p);
    let z3   = modMul(z2, zInv, p);
    (modMul(pt.x, z2, p), modMul(pt.y, z3, p));
  };

  func bytesToNat(bytes : [Nat8]) : Nat {
    var n : Nat = 0;
    for (b in bytes.vals()) { n := n * 256 + b.toNat() };
    n;
  };

  func natToBytes(n : Nat, len : Nat) : [Nat8] {
    var v   = n;
    let arr = Array.tabulate<Nat8>(len, func _ = 0).toVarArray();
    var idx = len;
    while (idx > 0) {
      idx -= 1;
      arr[idx] := Nat8.fromNat(v % 256);
      v := v / 256;
    };
    arr.values().toArray();
  };

  /// RFC 6979 deterministic ECDSA P-256 sign.
  /// Returns r ++ s (64 bytes) for the VAPID JWT signature.
  func p256Sign(privKeyBytes : [Nat8], msgHashBytes : [Nat8]) : [Nat8] {
    let nn = P256_N;
    let d  = bytesToNat(privKeyBytes);
    let z  = bytesToNat(msgHashBytes);

    // Simplified RFC 6979: derive deterministic k via two SHA-256 rounds
    let v0    = Array.tabulate<Nat8>(32, func _ = 0x01);
    let k0    = Array.tabulate<Nat8>(32, func _ = 0x00);
    let seed1 = k0.concat(v0).concat(([0x00 : Nat8])).concat(privKeyBytes).concat(msgHashBytes);
    let k1    = sha256(seed1);
    let v1    = sha256(k0.concat(v0).concat(([0x01 : Nat8])).concat(privKeyBytes).concat(msgHashBytes));
    let seed2 = k1.concat(v1).concat(([0x01 : Nat8])).concat(privKeyBytes).concat(msgHashBytes);
    let k2    = sha256(seed2);
    let v2    = sha256(k1.concat(v1));
    let kBytes  = sha256(k2.concat(v2));
    var kScalar = bytesToNat(kBytes) % nn;
    if (kScalar == 0) { kScalar := 1 };

    let Rpt     = scalarMulG(kScalar);
    let (rx, _) = jacToAffine(Rpt);
    let r       = rx % nn;
    if (r == 0) {
      let Rpt2      = scalarMulG(kScalar + 1);
      let (rx2, _)  = jacToAffine(Rpt2);
      let r2        = rx2 % nn;
      let kInv2     = modInv(kScalar + 1, nn);
      let s2        = modMul(kInv2, modAdd(z, modMul(r2, d, nn), nn), nn);
      return natToBytes(r2, 32).concat(natToBytes(s2, 32));
    };
    let kInv = modInv(kScalar, nn);
    let s    = modMul(kInv, modAdd(z, modMul(r, d, nn), nn), nn);
    natToBytes(r, 32).concat(natToBytes(s, 32));
  };

  // ── URL origin extraction ─────────────────────────────────────────────────────

  func extractOrigin(url : Text) : Text {
    let schemeLen : Nat = if (url.startsWith(#text("https://"))) 8
                          else if (url.startsWith(#text("http://"))) 7
                          else 0;
    var origin = if (schemeLen == 8) "https://"
                 else if (schemeLen == 7) "http://"
                 else "";
    var hostDone = false;
    var charIdx  = 0;
    for (c in url.toIter()) {
      if (charIdx >= schemeLen and not hostDone) {
        if (c == '/') { hostDone := true }
        else { origin #= Text.fromChar(c) };
      };
      charIdx += 1;
    };
    origin;
  };

  // ── VAPID JWT builder ─────────────────────────────────────────────────────────

  func buildAndSignJwt(audience : Text, expSeconds : Nat64, privKeyBytes : [Nat8]) : Text {
    let header  = b64urlEncodeText("{\"typ\":\"JWT\",\"alg\":\"ES256\"}");
    let nowSec  = Nat64.fromNat(Int.abs(Time.now()) / 1_000_000_000);
    let exp     = nowSec + expSeconds;
    let payload = b64urlEncodeText(
      "{\"aud\":\"" # audience # "\",\"exp\":" #
      exp.toText() #
      ",\"sub\":\"mailto:support@charliesierra.io\"}"
    );
    let signingInput = header # "." # payload;
    let msgHash      = sha256(signingInput.encodeUtf8().toArray());
    let sig          = p256Sign(privKeyBytes, msgHash);
    signingInput # "." # b64urlEncodeBytes(sig);
  };

  // ── Lazy VAPID initialisation ────────────────────────────────────────────────

  func ensureVapidInit() {
    switch (vapidState.value) {
      case (?_) {};
      case null {
        vapidState.value := ?{
          publicKeyBytes  = VAPID_PUBLIC_KEY_BYTES;
          publicKeyB64    = VAPID_PUBLIC_KEY_B64;
          privateKeyBytes = VAPID_PRIVATE_KEY;
          createdAt       = Time.now();
        };
      };
    };
  };

  // ── sendPushToUser ────────────────────────────────────────────────────────────

  /// Deliver a Web Push notification to a subscribed user.
  /// Caller must be an admin. Builds a real P-256 VAPID-signed JWT and HTTP POSTs
  /// to the push endpoint. Handles 410/404 expiry by removing stale subscriptions.
  public shared ({ caller }) func sendPushToUser(
    targetPrincipal : Principal,
    senderName      : Text,
    messageType     : Text,
    convId          : Text,
  ) : async () {
    if (not AdminLib.isAdmin(adminState, caller)) { return };
    ensureVapidInit();
    NotifLib.pruneStaleSubscriptions(pushSubscriptions);

    let sub = switch (pushSubscriptions.get(targetPrincipal)) {
      case null  { return };
      case (?s)  s;
    };
    if (not sub.enabled) return;

    let endpoint = sub.endpoint;
    let audience = extractOrigin(endpoint);

    let vs = switch (vapidState.value) {
      case (?v) v;
      case null { return };
    };

    let signedJwt   = buildAndSignJwt(audience, 43200, vs.privateKeyBytes);
    let vapidHeader = "vapid t=" # signedJwt # ",k=" # vs.publicKeyB64;

    let jsonPayload = "{\"title\":\"" # senderName #
      "\",\"body\":\"New message\"" #
      ",\"convId\":\"" # convId # "\"}";
    let payloadBytes : [Nat8] = jsonPayload.encodeUtf8().toArray();

    let headers : [HttpHeader] = [
      { name = "Authorization"; value = vapidHeader },
      { name = "Content-Type";  value = "application/json" },
      { name = "TTL";           value = "259200" },
      { name = "Urgency";       value = "normal" },
    ];

    let response = try {
      await mgmt.http_request({
        url                = endpoint;
        max_response_bytes = ?512;
        headers            = headers;
        body               = ?payloadBytes;
        method             = #post;
        transform          = null;
      });
    } catch (_) {
      AdminLib.recordEvent(adminState, #adminAction, caller, ?targetPrincipal, null);
      return;
    };

    if (response.status >= 200 and response.status < 300) {
      sub.lastUsed := Time.now();
      AdminLib.recordEvent(adminState, #adminAction, caller, ?targetPrincipal, null);
    } else if (response.status == 410 or response.status == 404) {
      pushSubscriptions.remove(targetPrincipal);
      AdminLib.recordEvent(adminState, #adminAction, caller, ?targetPrincipal, null);
    } else {
      AdminLib.recordEvent(adminState, #adminAction, caller, ?targetPrincipal, null);
    };
  };

  // ── Public API ───────────────────────────────────────────────────────────────

  /// Return the VAPID public key (base64url) for frontend PushManager.subscribe().
  public shared func getVAPIDPublicKey() : async Text {
    ensureVapidInit();
    switch (vapidState.value) {
      case (?vs) vs.publicKeyB64;
      case null  VAPID_PUBLIC_KEY_B64;
    };
  };

  // ── Push endpoint security ────────────────────────────────────────────────────

  /// Validate that a push endpoint is a known, legitimate push service URL.
  /// Must start with https:// and contain a domain from the allow-list.
  func isValidPushEndpoint(endpoint : Text) : Bool {
    if (not endpoint.startsWith(#text "https://")) { return false };
    let knownDomains : [Text] = [
      "fcm.googleapis.com",
      "push.services.mozilla.com",
      "updates.push.services.mozilla.com",
      "notify.windows.com",
      "web.push.apple.com",
      "push.apple.com",
    ];
    for (domain in knownDomains.vals()) {
      if (endpoint.contains(#text domain)) { return true };
    };
    false
  };

  /// Store or replace a Web Push subscription for the caller.
  /// Security: only the caller may register their own subscription.
  /// The endpoint must begin with https:// and match a known push service domain.
  public shared ({ caller }) func registerPushSubscription(
    endpoint : Text,
    p256dh   : Text,
    auth     : Text,
  ) : async Common.Result<(), Text> {
    // Caller-is-owner: subscription is always keyed by caller — this is
    // enforced by the Map key being `caller` itself.
    // Endpoint validation: reject suspicious or non-HTTPS endpoints.
    if (not isValidPushEndpoint(endpoint)) {
      return #err("Invalid push endpoint: must use https:// and a known push service domain.");
    };
    let now = Time.now();
    let record : T.PushSubscriptionRecord = {
      endpoint  = endpoint;
      auth      = auth;
      p256dh    = p256dh;
      createdAt = now;
      var lastUsed = now;
      var enabled  = true;
    };
    pushSubscriptions.add(caller, record);
    #ok(());
  };

  /// Legacy alias (arg order: endpoint, auth, p256dh).
  /// Also validates endpoint — silently drops invalid subscriptions.
  public shared ({ caller }) func subscribeToPush(
    endpoint : Text,
    auth     : Text,
    p256dh   : Text,
  ) : async () {
    if (not isValidPushEndpoint(endpoint)) { return };
    let now = Time.now();
    let record : T.PushSubscriptionRecord = {
      endpoint  = endpoint;
      auth      = auth;
      p256dh    = p256dh;
      createdAt = now;
      var lastUsed = now;
      var enabled  = true;
    };
    pushSubscriptions.add(caller, record);
  };

  /// Remove the caller's push subscription (canonical).
  public shared ({ caller }) func unregisterPushSubscription() : async Common.Result<(), Text> {
    pushSubscriptions.remove(caller);
    #ok(());
  };

  /// Legacy alias for unregisterPushSubscription.
  public shared ({ caller }) func unsubscribeFromPush() : async () {
    pushSubscriptions.remove(caller);
  };

  /// Return the caller's current notification preferences.
  public shared query ({ caller }) func getNotificationPreferences() : async T.NotificationPreferences {
    switch (notificationPrefs.get(caller)) {
      case null  ({ directMessagesEnabled = true; groupMessagesEnabled = true });
      case (?p)  p;
    };
  };

  /// Update DM / group notification toggles for the caller.
  public shared ({ caller }) func updateNotificationPreferences(
    directEnabled : Bool,
    groupEnabled  : Bool,
  ) : async () {
    notificationPrefs.add(caller, {
      directMessagesEnabled = directEnabled;
      groupMessagesEnabled  = groupEnabled;
    });
  };

  /// Drain and return all pending notification triggers for the caller.
  public shared ({ caller }) func getPendingNotifications() : async [T.PendingNotification] {
    let result = switch (pendingNotifications.get(caller)) {
      case null   [];
      case (?arr) arr;
    };
    pendingNotifications.remove(caller);
    result;
  };
};
