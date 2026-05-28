var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _t2, _e2, _t3, _t4, _t5, _e3, _t6, _t7, _e4, _n2, _t8, _t9, _t10, _e5, _n3, _r2, _t11, _e6, _n4, _r3;
const Gt = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function me(n) {
  return n instanceof Uint8Array || ArrayBuffer.isView(n) && n.constructor.name === "Uint8Array";
}
function Dt(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function J(n, ...t) {
  if (!me(n))
    throw new Error("Uint8Array expected");
  if (t.length > 0 && !t.includes(n.length))
    throw new Error("Uint8Array expected of length " + t + ", got length=" + n.length);
}
function Pe(n) {
  if (typeof n != "function" || typeof n.create != "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  Dt(n.outputLen), Dt(n.blockLen);
}
function Zt(n, t = true) {
  if (n.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && n.finished)
    throw new Error("Hash#digest() has already been called");
}
function In(n, t) {
  J(n);
  const r = t.outputLen;
  if (n.length < r)
    throw new Error("digestInto() expects output buffer of length at least " + r);
}
function dr(n) {
  return new Uint32Array(n.buffer, n.byteOffset, Math.floor(n.byteLength / 4));
}
function mt(...n) {
  for (let t = 0; t < n.length; t++)
    n[t].fill(0);
}
function Ee(n) {
  return new DataView(n.buffer, n.byteOffset, n.byteLength);
}
function ft(n, t) {
  return n << 32 - t | n >>> t;
}
const ur = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
function lr(n) {
  return n << 24 & 4278190080 | n << 8 & 16711680 | n >>> 8 & 65280 | n >>> 24 & 255;
}
function hr(n) {
  for (let t = 0; t < n.length; t++)
    n[t] = lr(n[t]);
  return n;
}
const ze = ur ? (n) => n : hr, Nn = (
  /* @ts-ignore */
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), br = /* @__PURE__ */ Array.from({ length: 256 }, (n, t) => t.toString(16).padStart(2, "0"));
function jt(n) {
  if (J(n), Nn)
    return n.toHex();
  let t = "";
  for (let r = 0; r < n.length; r++)
    t += br[n[r]];
  return t;
}
const ut = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function $e(n) {
  if (n >= ut._0 && n <= ut._9)
    return n - ut._0;
  if (n >= ut.A && n <= ut.F)
    return n - (ut.A - 10);
  if (n >= ut.a && n <= ut.f)
    return n - (ut.a - 10);
}
function Tn(n) {
  if (typeof n != "string")
    throw new Error("hex string expected, got " + typeof n);
  if (Nn)
    return Uint8Array.fromHex(n);
  const t = n.length, r = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const e = new Uint8Array(r);
  for (let s = 0, o = 0; s < r; s++, o += 2) {
    const c = $e(n.charCodeAt(o)), i = $e(n.charCodeAt(o + 1));
    if (c === void 0 || i === void 0) {
      const a = n[o] + n[o + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + o);
    }
    e[s] = c * 16 + i;
  }
  return e;
}
function Wt(n) {
  if (typeof n != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(n));
}
function Nt(n) {
  return typeof n == "string" && (n = Wt(n)), J(n), n;
}
function V(...n) {
  let t = 0;
  for (let e = 0; e < n.length; e++) {
    const s = n[e];
    J(s), t += s.length;
  }
  const r = new Uint8Array(t);
  for (let e = 0, s = 0; e < n.length; e++) {
    const o = n[e];
    r.set(o, s), s += o.length;
  }
  return r;
}
class ke {
}
function De(n) {
  const t = (e) => n().update(Nt(e)).digest(), r = n();
  return t.outputLen = r.outputLen, t.blockLen = r.blockLen, t.create = () => n(), t;
}
function mr(n) {
  const t = (e, s) => n(s).update(Nt(e)).digest(), r = n({});
  return t.outputLen = r.outputLen, t.blockLen = r.blockLen, t.create = (e) => n(e), t;
}
function gr(n = 32) {
  if (Gt && typeof Gt.getRandomValues == "function")
    return Gt.getRandomValues(new Uint8Array(n));
  if (Gt && typeof Gt.randomBytes == "function")
    return Uint8Array.from(Gt.randomBytes(n));
  throw new Error("crypto.getRandomValues must be defined");
}
function yr(n, t, r, e) {
  if (typeof n.setBigUint64 == "function")
    return n.setBigUint64(t, r, e);
  const s = BigInt(32), o = BigInt(4294967295), c = Number(r >> s & o), i = Number(r & o), a = e ? 4 : 0, u = e ? 0 : 4;
  n.setUint32(t + a, c, e), n.setUint32(t + u, i, e);
}
function pr(n, t, r) {
  return n & t ^ ~n & r;
}
function wr(n, t, r) {
  return n & t ^ n & r ^ t & r;
}
class qn extends ke {
  constructor(t, r, e, s) {
    super(), this.finished = false, this.length = 0, this.pos = 0, this.destroyed = false, this.blockLen = t, this.outputLen = r, this.padOffset = e, this.isLE = s, this.buffer = new Uint8Array(t), this.view = Ee(this.buffer);
  }
  update(t) {
    Zt(this), t = Nt(t), J(t);
    const { view: r, buffer: e, blockLen: s } = this, o = t.length;
    for (let c = 0; c < o; ) {
      const i = Math.min(s - this.pos, o - c);
      if (i === s) {
        const a = Ee(t);
        for (; s <= o - c; c += s)
          this.process(a, c);
        continue;
      }
      e.set(t.subarray(c, c + i), this.pos), this.pos += i, c += i, this.pos === s && (this.process(r, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Zt(this), In(t, this), this.finished = true;
    const { buffer: r, view: e, blockLen: s, isLE: o } = this;
    let { pos: c } = this;
    r[c++] = 128, mt(this.buffer.subarray(c)), this.padOffset > s - c && (this.process(e, 0), c = 0);
    for (let d = c; d < s; d++)
      r[d] = 0;
    yr(e, s - 8, BigInt(this.length * 8), o), this.process(e, 0);
    const i = Ee(t), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u = a / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      i.setUint32(4 * d, l[d], o);
  }
  digest() {
    const { buffer: t, outputLen: r } = this;
    this.digestInto(t);
    const e = t.slice(0, r);
    return this.destroy(), e;
  }
  _cloneInto(t) {
    t || (t = new this.constructor()), t.set(...this.get());
    const { blockLen: r, buffer: e, length: s, finished: o, destroyed: c, pos: i } = this;
    return t.destroyed = c, t.finished = o, t.length = s, t.pos = i, s % r && t.buffer.set(e), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const gt = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), te = /* @__PURE__ */ BigInt(2 ** 32 - 1), Xe = /* @__PURE__ */ BigInt(32);
function xr(n, t = false) {
  return t ? { h: Number(n & te), l: Number(n >> Xe & te) } : { h: Number(n >> Xe & te) | 0, l: Number(n & te) | 0 };
}
function Rn(n, t = false) {
  const r = n.length;
  let e = new Uint32Array(r), s = new Uint32Array(r);
  for (let o = 0; o < r; o++) {
    const { h: c, l: i } = xr(n[o], t);
    [e[o], s[o]] = [c, i];
  }
  return [e, s];
}
const Er = (n, t, r) => n << r | t >>> 32 - r, Br = (n, t, r) => t << r | n >>> 32 - r, Sr = (n, t, r) => t << r - 32 | n >>> 64 - r, _r = (n, t, r) => n << r - 32 | t >>> 64 - r;
const qr = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]), pt = /* @__PURE__ */ new Uint32Array(64);
class Hn extends qn {
  constructor(t = 32) {
    super(64, t, 8, false), this.A = gt[0] | 0, this.B = gt[1] | 0, this.C = gt[2] | 0, this.D = gt[3] | 0, this.E = gt[4] | 0, this.F = gt[5] | 0, this.G = gt[6] | 0, this.H = gt[7] | 0;
  }
  get() {
    const { A: t, B: r, C: e, D: s, E: o, F: c, G: i, H: a } = this;
    return [t, r, e, s, o, c, i, a];
  }
  // prettier-ignore
  set(t, r, e, s, o, c, i, a) {
    this.A = t | 0, this.B = r | 0, this.C = e | 0, this.D = s | 0, this.E = o | 0, this.F = c | 0, this.G = i | 0, this.H = a | 0;
  }
  process(t, r) {
    for (let d = 0; d < 16; d++, r += 4)
      pt[d] = t.getUint32(r, false);
    for (let d = 16; d < 64; d++) {
      const f = pt[d - 15], h = pt[d - 2], m = ft(f, 7) ^ ft(f, 18) ^ f >>> 3, g = ft(h, 17) ^ ft(h, 19) ^ h >>> 10;
      pt[d] = g + pt[d - 7] + m + pt[d - 16] | 0;
    }
    let { A: e, B: s, C: o, D: c, E: i, F: a, G: u, H: l } = this;
    for (let d = 0; d < 64; d++) {
      const f = ft(i, 6) ^ ft(i, 11) ^ ft(i, 25), h = l + f + pr(i, a, u) + qr[d] + pt[d] | 0, g = (ft(e, 2) ^ ft(e, 13) ^ ft(e, 22)) + wr(e, s, o) | 0;
      l = u, u = a, a = i, i = c + h | 0, c = o, o = s, s = e, e = h + g | 0;
    }
    e = e + this.A | 0, s = s + this.B | 0, o = o + this.C | 0, c = c + this.D | 0, i = i + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(e, s, o, c, i, a, u, l);
  }
  roundClean() {
    mt(pt);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), mt(this.buffer);
  }
}
Rn([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n) => BigInt(n)));
const Un = /* @__PURE__ */ De(() => new Hn());
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ze = /* @__PURE__ */ BigInt(0), fe = /* @__PURE__ */ BigInt(1);
function Je(n, t = "") {
  if (typeof n != "boolean") {
    const r = t && `"${t}"`;
    throw new Error(r + "expected boolean, got type=" + typeof n);
  }
  return n;
}
function tn(n, t, r = "") {
  const e = me(n), s = n == null ? void 0 : n.length, o = t !== void 0;
  if (!e || o) {
    const c = r && `"${r}" `, i = "", a = e ? `length=${s}` : `type=${typeof n}`;
    throw new Error(c + "expected Uint8Array" + i + ", got " + a);
  }
  return n;
}
function Ln(n) {
  if (typeof n != "string")
    throw new Error("hex string expected, got " + typeof n);
  return n === "" ? Ze : BigInt("0x" + n);
}
function dt(n) {
  return Ln(jt(n));
}
function Pn(n) {
  return J(n), Ln(jt(Uint8Array.from(n).reverse()));
}
function j(n, t) {
  return Tn(n.toString(16).padStart(t * 2, "0"));
}
function kn(n, t) {
  return j(n, t).reverse();
}
function Mt(n, t, r) {
  let e;
  if (typeof t == "string")
    try {
      e = Tn(t);
    } catch (o) {
      throw new Error(n + " must be hex string or Uint8Array, cause: " + o);
    }
  else if (me(t))
    e = Uint8Array.from(t);
  else
    throw new Error(n + " must be hex string or Uint8Array");
  const s = e.length;
  if (typeof r == "number" && s !== r)
    throw new Error(n + " of length " + r + " expected, got " + s);
  return e;
}
const Be = (n) => typeof n == "bigint" && Ze <= n;
function Dn(n, t, r) {
  return Be(n) && Be(t) && Be(r) && t <= n && n < r;
}
function Yt(n) {
  let t;
  for (t = 0; n > Ze; n >>= fe, t += 1)
    ;
  return t;
}
function Lr(n, t) {
  return n >> BigInt(t) & fe;
}
const qt = (n) => (fe << BigInt(n)) - fe;
function Pr(n) {
  return typeof n == "function" && Number.isSafeInteger(n.outputLen);
}
function Me(n, t, r = {}) {
  if (!n || typeof n != "object")
    throw new Error("expected valid options object");
  function e(s, o, c) {
    const i = n[s];
    if (c && i === void 0)
      return;
    const a = typeof i;
    if (a !== o || i === null)
      throw new Error(`param "${s}" is invalid: expected ${o}, got ${a}`);
  }
  Object.entries(t).forEach(([s, o]) => e(s, o, false)), Object.entries(r).forEach(([s, o]) => e(s, o, true));
}
const Zn = () => {
  throw new Error("not implemented");
};
function Re(n) {
  const t = /* @__PURE__ */ new WeakMap();
  return (r, ...e) => {
    const s = t.get(r);
    if (s !== void 0)
      return s;
    const o = n(r, ...e);
    return t.set(r, o), o;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const et = BigInt(0), Y = BigInt(1), vt = /* @__PURE__ */ BigInt(2), Mn = /* @__PURE__ */ BigInt(3), Kn = /* @__PURE__ */ BigInt(4), Fn = /* @__PURE__ */ BigInt(5), kr = /* @__PURE__ */ BigInt(7), Vn = /* @__PURE__ */ BigInt(8), Dr = /* @__PURE__ */ BigInt(9), Cn = /* @__PURE__ */ BigInt(16);
function nt(n, t) {
  const r = n % t;
  return r >= et ? r : t + r;
}
function en(n, t) {
  if (n === et)
    throw new Error("invert: expected non-zero number");
  if (t <= et)
    throw new Error("invert: expected positive modulus, got " + t);
  let r = nt(n, t), e = t, s = et, o = Y;
  for (; r !== et; ) {
    const i = e / r, a = e % r, u = s - o * i;
    e = r, r = a, s = o, o = u;
  }
  if (e !== Y)
    throw new Error("invert: does not exist");
  return nt(s, t);
}
function Ke(n, t, r) {
  if (!n.eql(n.sqr(t), r))
    throw new Error("Cannot find square root");
}
function jn(n, t) {
  const r = (n.ORDER + Y) / Kn, e = n.pow(t, r);
  return Ke(n, e, t), e;
}
function Zr(n, t) {
  const r = (n.ORDER - Fn) / Vn, e = n.mul(t, vt), s = n.pow(e, r), o = n.mul(t, s), c = n.mul(n.mul(o, vt), s), i = n.mul(o, n.sub(c, n.ONE));
  return Ke(n, i, t), i;
}
function Mr(n) {
  const t = Ft(n), r = Yn(n), e = r(t, t.neg(t.ONE)), s = r(t, e), o = r(t, t.neg(e)), c = (n + kr) / Cn;
  return (i, a) => {
    let u = i.pow(a, c), l = i.mul(u, e);
    const d = i.mul(u, s), f = i.mul(u, o), h = i.eql(i.sqr(l), a), m = i.eql(i.sqr(d), a);
    u = i.cmov(u, l, h), l = i.cmov(f, d, m);
    const g = i.eql(i.sqr(l), a), p = i.cmov(u, l, g);
    return Ke(i, p, a), p;
  };
}
function Yn(n) {
  if (n < Mn)
    throw new Error("sqrt is not defined for small field");
  let t = n - Y, r = 0;
  for (; t % vt === et; )
    t /= vt, r++;
  let e = vt;
  const s = Ft(n);
  for (; de(s, e) === 1; )
    if (e++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (r === 1)
    return jn;
  let o = s.pow(e, t);
  const c = (t + Y) / vt;
  return function(a, u) {
    if (a.is0(u))
      return u;
    if (de(a, u) !== 1)
      throw new Error("Cannot find square root");
    let l = r, d = a.mul(a.ONE, o), f = a.pow(u, t), h = a.pow(u, c);
    for (; !a.eql(f, a.ONE); ) {
      if (a.is0(f))
        return a.ZERO;
      let m = 1, g = a.sqr(f);
      for (; !a.eql(g, a.ONE); )
        if (m++, g = a.sqr(g), m === l)
          throw new Error("Cannot find square root");
      const p = Y << BigInt(l - m - 1), T = a.pow(d, p);
      l = m, d = a.sqr(T), f = a.mul(f, d), h = a.mul(h, T);
    }
    return h;
  };
}
function Kr(n) {
  return n % Kn === Mn ? jn : n % Vn === Fn ? Zr : n % Cn === Dr ? Mr(n) : Yn(n);
}
const Fr = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function zn(n) {
  const t = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "number",
    BITS: "number"
  }, r = Fr.reduce((e, s) => (e[s] = "function", e), t);
  return Me(n, r), n;
}
function ge(n, t, r) {
  if (r < et)
    throw new Error("invalid exponent, negatives unsupported");
  if (r === et)
    return n.ONE;
  if (r === Y)
    return t;
  let e = n.ONE, s = t;
  for (; r > et; )
    r & Y && (e = n.mul(e, s)), s = n.sqr(s), r >>= Y;
  return e;
}
function Rt(n, t, r = false) {
  const e = new Array(t.length).fill(r ? n.ZERO : void 0), s = t.reduce((c, i, a) => n.is0(i) ? c : (e[a] = c, n.mul(c, i)), n.ONE), o = n.inv(s);
  return t.reduceRight((c, i, a) => n.is0(i) ? c : (e[a] = n.mul(c, e[a]), n.mul(c, i)), o), e;
}
function de(n, t) {
  const r = (n.ORDER - Y) / vt, e = n.pow(t, r), s = n.eql(e, n.ONE), o = n.eql(e, n.ZERO), c = n.eql(e, n.neg(n.ONE));
  if (!s && !o && !c)
    throw new Error("invalid Legendre symbol result");
  return s ? 1 : o ? 0 : -1;
}
function Vr(n, t) {
  t !== void 0 && Dt(t);
  const r = t !== void 0 ? t : n.toString(2).length, e = Math.ceil(r / 8);
  return { nBitLength: r, nByteLength: e };
}
function Ft(n, t, r = false, e = {}) {
  if (n <= et)
    throw new Error("invalid field: expected ORDER > 0, got " + n);
  let s, o, c = false, i;
  if (typeof t == "object" && t != null) {
    if (e.sqrt || r)
      throw new Error("cannot specify opts in two arguments");
    const f = t;
    f.BITS && (s = f.BITS), f.sqrt && (o = f.sqrt), typeof f.isLE == "boolean" && (r = f.isLE), typeof f.modFromBytes == "boolean" && (c = f.modFromBytes), i = f.allowedLengths;
  } else
    typeof t == "number" && (s = t), e.sqrt && (o = e.sqrt);
  const { nBitLength: a, nByteLength: u } = Vr(n, s);
  if (u > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let l;
  const d = Object.freeze({
    ORDER: n,
    isLE: r,
    BITS: a,
    BYTES: u,
    MASK: qt(a),
    ZERO: et,
    ONE: Y,
    allowedLengths: i,
    create: (f) => nt(f, n),
    isValid: (f) => {
      if (typeof f != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof f);
      return et <= f && f < n;
    },
    is0: (f) => f === et,
    // is valid and invertible
    isValidNot0: (f) => !d.is0(f) && d.isValid(f),
    isOdd: (f) => (f & Y) === Y,
    neg: (f) => nt(-f, n),
    eql: (f, h) => f === h,
    sqr: (f) => nt(f * f, n),
    add: (f, h) => nt(f + h, n),
    sub: (f, h) => nt(f - h, n),
    mul: (f, h) => nt(f * h, n),
    pow: (f, h) => ge(d, f, h),
    div: (f, h) => nt(f * en(h, n), n),
    // Same as above, but doesn't normalize
    sqrN: (f) => f * f,
    addN: (f, h) => f + h,
    subN: (f, h) => f - h,
    mulN: (f, h) => f * h,
    inv: (f) => en(f, n),
    sqrt: o || ((f) => (l || (l = Kr(n)), l(d, f))),
    toBytes: (f) => r ? kn(f, u) : j(f, u),
    fromBytes: (f, h = true) => {
      if (i) {
        if (!i.includes(f.length) || f.length > u)
          throw new Error("Field.fromBytes: expected " + i + " bytes, got " + f.length);
        const g = new Uint8Array(u);
        g.set(f, r ? 0 : g.length - f.length), f = g;
      }
      if (f.length !== u)
        throw new Error("Field.fromBytes: expected " + u + " bytes, got " + f.length);
      let m = r ? Pn(f) : dt(f);
      if (c && (m = nt(m, n)), !h && !d.isValid(m))
        throw new Error("invalid field element: outside of range 0..ORDER");
      return m;
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (f) => Rt(d, f),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (f, h, m) => m ? h : f
  });
  return Object.freeze(d);
}
function $n(n) {
  if (typeof n != "bigint")
    throw new Error("field order must be bigint");
  const t = n.toString(2).length;
  return Math.ceil(t / 8);
}
function Xn(n) {
  const t = $n(n);
  return t + Math.ceil(t / 2);
}
function Cr(n, t, r = false) {
  const e = n.length, s = $n(t), o = Xn(t);
  if (e < 16 || e < o || e > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + e);
  const c = r ? Pn(n) : dt(n), i = nt(c, t - Y) + Y;
  return r ? kn(i, s) : j(i, s);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Kt = BigInt(0), At = BigInt(1);
function ue(n, t) {
  const r = t.negate();
  return n ? r : t;
}
function Ct(n, t) {
  const r = Rt(n.Fp, t.map((e) => e.Z));
  return t.map((e, s) => n.fromAffine(e.toAffine(r[s])));
}
function Wn(n, t) {
  if (!Number.isSafeInteger(n) || n <= 0 || n > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + n);
}
function Se(n, t) {
  Wn(n, t);
  const r = Math.ceil(t / n) + 1, e = 2 ** (n - 1), s = 2 ** n, o = qt(n), c = BigInt(n);
  return { windows: r, windowSize: e, mask: o, maxNumber: s, shiftBy: c };
}
function nn(n, t, r) {
  const { windowSize: e, mask: s, maxNumber: o, shiftBy: c } = r;
  let i = Number(n & s), a = n >> c;
  i > e && (i -= o, a += At);
  const u = t * e, l = u + Math.abs(i) - 1, d = i === 0, f = i < 0, h = t % 2 !== 0;
  return { nextN: a, offset: l, isZero: d, isNeg: f, isNegF: h, offsetF: u };
}
function jr(n, t) {
  if (!Array.isArray(n))
    throw new Error("array expected");
  n.forEach((r, e) => {
    if (!(r instanceof t))
      throw new Error("invalid point at index " + e);
  });
}
function Yr(n, t) {
  if (!Array.isArray(n))
    throw new Error("array of scalars expected");
  n.forEach((r, e) => {
    if (!t.isValid(r))
      throw new Error("invalid scalar at index " + e);
  });
}
const _e = /* @__PURE__ */ new WeakMap(), Qn = /* @__PURE__ */ new WeakMap();
function ve(n) {
  return Qn.get(n) || 1;
}
function rn(n) {
  if (n !== Kt)
    throw new Error("invalid wNAF");
}
class zr {
  // Parametrized with a given Point class (not individual point)
  constructor(t, r) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = r;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, r, e = this.ZERO) {
    let s = t;
    for (; r > Kt; )
      r & At && (e = e.add(s)), s = s.double(), r >>= At;
    return e;
  }
  /**
   * Creates a wNAF precomputation window. Used for caching.
   * Default window size is set by `utils.precompute()` and is equal to 8.
   * Number of precomputed points depends on the curve size:
   * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
   * - 𝑊 is the window size
   * - 𝑛 is the bitlength of the curve order.
   * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
   * @param point Point instance
   * @param W window size
   * @returns precomputed point tables flattened to a single array
   */
  precomputeWindow(t, r) {
    const { windows: e, windowSize: s } = Se(r, this.bits), o = [];
    let c = t, i = c;
    for (let a = 0; a < e; a++) {
      i = c, o.push(i);
      for (let u = 1; u < s; u++)
        i = i.add(c), o.push(i);
      c = i.double();
    }
    return o;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(t, r, e) {
    if (!this.Fn.isValid(e))
      throw new Error("invalid scalar");
    let s = this.ZERO, o = this.BASE;
    const c = Se(t, this.bits);
    for (let i = 0; i < c.windows; i++) {
      const { nextN: a, offset: u, isZero: l, isNeg: d, isNegF: f, offsetF: h } = nn(e, i, c);
      e = a, l ? o = o.add(ue(f, r[h])) : s = s.add(ue(d, r[u]));
    }
    return rn(e), { p: s, f: o };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, r, e, s = this.ZERO) {
    const o = Se(t, this.bits);
    for (let c = 0; c < o.windows && e !== Kt; c++) {
      const { nextN: i, offset: a, isZero: u, isNeg: l } = nn(e, c, o);
      if (e = i, !u) {
        const d = r[a];
        s = s.add(l ? d.negate() : d);
      }
    }
    return rn(e), s;
  }
  getPrecomputes(t, r, e) {
    let s = _e.get(r);
    return s || (s = this.precomputeWindow(r, t), t !== 1 && (typeof e == "function" && (s = e(s)), _e.set(r, s))), s;
  }
  cached(t, r, e) {
    const s = ve(t);
    return this.wNAF(s, this.getPrecomputes(s, t, e), r);
  }
  unsafe(t, r, e, s) {
    const o = ve(t);
    return o === 1 ? this._unsafeLadder(t, r, s) : this.wNAFUnsafe(o, this.getPrecomputes(o, t, e), r, s);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, r) {
    Wn(r, this.bits), Qn.set(t, r), _e.delete(t);
  }
  hasCache(t) {
    return ve(t) !== 1;
  }
}
function $r(n, t, r, e) {
  let s = t, o = n.ZERO, c = n.ZERO;
  for (; r > Kt || e > Kt; )
    r & At && (o = o.add(s)), e & At && (c = c.add(s)), s = s.double(), r >>= At, e >>= At;
  return { p1: o, p2: c };
}
function Xr(n, t, r, e) {
  jr(r, n), Yr(e, t);
  const s = r.length, o = e.length;
  if (s !== o)
    throw new Error("arrays of points and scalars must have equal length");
  const c = n.ZERO, i = Yt(BigInt(s));
  let a = 1;
  i > 12 ? a = i - 3 : i > 4 ? a = i - 2 : i > 0 && (a = 2);
  const u = qt(a), l = new Array(Number(u) + 1).fill(c), d = Math.floor((t.BITS - 1) / a) * a;
  let f = c;
  for (let h = d; h >= 0; h -= a) {
    l.fill(c);
    for (let g = 0; g < o; g++) {
      const p = e[g], T = Number(p >> BigInt(h) & u);
      l[T] = l[T].add(r[g]);
    }
    let m = c;
    for (let g = l.length - 1, p = c; g > 0; g--)
      p = p.add(l[g]), m = m.add(p);
    if (f = f.add(m), h !== 0)
      for (let g = 0; g < a; g++)
        f = f.double();
  }
  return f;
}
function sn(n, t, r) {
  if (t) {
    if (t.ORDER !== n)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return zn(t), t;
  } else
    return Ft(n, { isLE: r });
}
function Wr(n, t, r = {}, e) {
  if (e === void 0 && (e = n === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${n} CURVE object`);
  for (const a of ["p", "n", "h"]) {
    const u = t[a];
    if (!(typeof u == "bigint" && u > Kt))
      throw new Error(`CURVE.${a} must be positive bigint`);
  }
  const s = sn(t.p, r.Fp, e), o = sn(t.n, r.Fn, e), i = ["Gx", "Gy", "a", "b"];
  for (const a of i)
    if (!s.isValid(t[a]))
      throw new Error(`CURVE.${a} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: s, Fn: o };
}
const Qr = dt;
function Bt(n, t) {
  if (zt(n), zt(t), n < 0 || n >= 1 << 8 * t)
    throw new Error("invalid I2OSP input: " + n);
  const r = Array.from({ length: t }).fill(0);
  for (let e = t - 1; e >= 0; e--)
    r[e] = n & 255, n >>>= 8;
  return new Uint8Array(r);
}
function Jr(n, t) {
  const r = new Uint8Array(n.length);
  for (let e = 0; e < n.length; e++)
    r[e] = n[e] ^ t[e];
  return r;
}
function zt(n) {
  if (!Number.isSafeInteger(n))
    throw new Error("number expected");
}
function Jn(n) {
  if (!me(n) && typeof n != "string")
    throw new Error("DST must be Uint8Array or string");
  return typeof n == "string" ? Wt(n) : n;
}
function ts(n, t, r, e) {
  J(n), zt(r), t = Jn(t), t.length > 255 && (t = e(V(Wt("H2C-OVERSIZE-DST-"), t)));
  const { outputLen: s, blockLen: o } = e, c = Math.ceil(r / s);
  if (r > 65535 || c > 255)
    throw new Error("expand_message_xmd: invalid lenInBytes");
  const i = V(t, Bt(t.length, 1)), a = Bt(0, o), u = Bt(r, 2), l = new Array(c), d = e(V(a, n, u, Bt(0, 1), i));
  l[0] = e(V(d, Bt(1, 1), i));
  for (let h = 1; h <= c; h++) {
    const m = [Jr(d, l[h - 1]), Bt(h + 1, 1), i];
    l[h] = e(V(...m));
  }
  return V(...l).slice(0, r);
}
function es(n, t, r, e, s) {
  if (J(n), zt(r), t = Jn(t), t.length > 255) {
    const o = Math.ceil(2 * e / 8);
    t = s.create({ dkLen: o }).update(Wt("H2C-OVERSIZE-DST-")).update(t).digest();
  }
  if (r > 65535 || t.length > 255)
    throw new Error("expand_message_xof: invalid lenInBytes");
  return s.create({ dkLen: r }).update(n).update(Bt(r, 2)).update(t).update(Bt(t.length, 1)).digest();
}
function oe(n, t, r) {
  Me(r, {
    p: "bigint",
    m: "number",
    k: "number",
    hash: "function"
  });
  const { p: e, k: s, m: o, hash: c, expand: i, DST: a } = r;
  if (!Pr(r.hash))
    throw new Error("expected valid hash");
  J(n), zt(t);
  const u = e.toString(2).length, l = Math.ceil((u + s) / 8), d = t * o * l;
  let f;
  if (i === "xmd")
    f = ts(n, a, d, c);
  else if (i === "xof")
    f = es(n, a, d, s, c);
  else if (i === "_internal_pass")
    f = n;
  else
    throw new Error('expand must be "xmd" or "xof"');
  const h = new Array(t);
  for (let m = 0; m < t; m++) {
    const g = new Array(o);
    for (let p = 0; p < o; p++) {
      const T = l * (p + m * o), R = f.subarray(T, T + l);
      g[p] = nt(Qr(R), e);
    }
    h[m] = g;
  }
  return h;
}
function tr(n, t) {
  const r = t.map((e) => Array.from(e).reverse());
  return (e, s) => {
    const [o, c, i, a] = r.map((d) => d.reduce((f, h) => n.add(n.mul(f, e), h))), [u, l] = Rt(n, [c, a], true);
    return e = n.mul(o, u), s = n.mul(s, n.mul(i, l)), { x: e, y: s };
  };
}
const ns = Wt("HashToScalar-");
function on(n, t, r) {
  if (typeof t != "function")
    throw new Error("mapToCurve() must be defined");
  function e(o) {
    return n.fromAffine(t(o));
  }
  function s(o) {
    const c = o.clearCofactor();
    return c.equals(n.ZERO) ? n.ZERO : (c.assertValidity(), c);
  }
  return {
    defaults: r,
    hashToCurve(o, c) {
      const i = Object.assign({}, r, c), a = oe(o, 2, i), u = e(a[0]), l = e(a[1]);
      return s(u.add(l));
    },
    encodeToCurve(o, c) {
      const i = r.encodeDST ? { DST: r.encodeDST } : {}, a = Object.assign({}, r, i, c), u = oe(o, 1, a), l = e(u[0]);
      return s(l);
    },
    /** See {@link H2CHasher} */
    mapToCurve(o) {
      if (!Array.isArray(o))
        throw new Error("expected array of bigints");
      for (const c of o)
        if (typeof c != "bigint")
          throw new Error("expected array of bigints");
      return s(e(o));
    },
    // hash_to_scalar can produce 0: https://www.rfc-editor.org/errata/eid8393
    // RFC 9380, draft-irtf-cfrg-bbs-signatures-08
    hashToScalar(o, c) {
      const i = n.Fn.ORDER, a = Object.assign({}, r, { p: i, m: 1, DST: ns }, c);
      return oe(o, 1, a)[0][0];
    }
  };
}
class er extends ke {
  constructor(t, r) {
    super(), this.finished = false, this.destroyed = false, Pe(t);
    const e = Nt(r);
    if (this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const s = this.blockLen, o = new Uint8Array(s);
    o.set(e.length > s ? t.create().update(e).digest() : e);
    for (let c = 0; c < o.length; c++)
      o[c] ^= 54;
    this.iHash.update(o), this.oHash = t.create();
    for (let c = 0; c < o.length; c++)
      o[c] ^= 106;
    this.oHash.update(o), mt(o);
  }
  update(t) {
    return Zt(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Zt(this), J(t, this.outputLen), this.finished = true, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t || (t = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: r, iHash: e, finished: s, destroyed: o, blockLen: c, outputLen: i } = this;
    return t = t, t.finished = s, t.destroyed = o, t.blockLen = c, t.outputLen = i, t.oHash = r._cloneInto(t.oHash), t.iHash = e._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Fe = (n, t, r) => new er(n, t).update(r).digest();
Fe.create = (n, t) => new er(n, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const cn = (n, t) => (n + (n >= 0 ? t : -t) / ht) / t;
function rs(n, t, r) {
  const [[e, s], [o, c]] = t, i = cn(c * n, r), a = cn(-s * n, r);
  let u = n - i * e - a * o, l = -i * s - a * c;
  const d = u < Ot, f = l < Ot;
  d && (u = -u), f && (l = -l);
  const h = qt(Math.ceil(Yt(r) / 2)) + W;
  if (u < Ot || u >= h || l < Ot || l >= h)
    throw new Error("splitScalar (endomorphism): failed, k=" + n);
  return { k1neg: d, k1: u, k2neg: f, k2: l };
}
const Ot = BigInt(0), W = BigInt(1), ht = BigInt(2), Pt = BigInt(3), He = BigInt(4);
function le(n, t) {
  const { BYTES: r } = n;
  let e;
  if (typeof t == "bigint")
    e = t;
  else {
    let s = Mt("private key", t);
    try {
      e = n.fromBytes(s);
    } catch {
      throw new Error(`invalid private key: expected ui8a of size ${r}, got ${typeof t}`);
    }
  }
  if (!n.isValidNot0(e))
    throw new Error("invalid private key: out of range [1..N-1]");
  return e;
}
function ss(n, t = {}) {
  const r = Wr("weierstrass", n, t), { Fp: e, Fn: s } = r;
  let o = r.CURVE;
  const { h: c, n: i } = o;
  Me(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object",
    wrapPrivateKey: "boolean"
  });
  const { endo: a } = t;
  if (a && (!e.is0(o.a) || typeof a.beta != "bigint" || !Array.isArray(a.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = is(e, s);
  function l() {
    if (!e.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function d(q, b, w) {
    const { x: O, y: L } = b.toAffine(), Z = e.toBytes(O);
    if (Je(w, "isCompressed"), w) {
      l();
      const x = !e.isOdd(L);
      return V(os(x), Z);
    } else
      return V(Uint8Array.of(4), Z, e.toBytes(L));
  }
  function f(q) {
    tn(q, void 0, "Point");
    const { publicKey: b, publicKeyUncompressed: w } = u, O = q.length, L = q[0], Z = q.subarray(1);
    if (O === b && (L === 2 || L === 3)) {
      const x = e.fromBytes(Z);
      if (!e.isValid(x))
        throw new Error("bad point: is not on curve, wrong x");
      const _ = g(x);
      let A;
      try {
        A = e.sqrt(_);
      } catch (tt) {
        const C = tt instanceof Error ? ": " + tt.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + C);
      }
      l();
      const G = e.isOdd(A);
      return (L & 1) === 1 !== G && (A = e.neg(A)), { x, y: A };
    } else if (O === w && L === 4) {
      const x = e.BYTES, _ = e.fromBytes(Z.subarray(0, x)), A = e.fromBytes(Z.subarray(x, x * 2));
      if (!p(_, A))
        throw new Error("bad point: is not on curve");
      return { x: _, y: A };
    } else
      throw new Error(`bad point: got length ${O}, expected compressed=${b} or uncompressed=${w}`);
  }
  const h = t.toBytes || d, m = t.fromBytes || f;
  function g(q) {
    const b = e.sqr(q), w = e.mul(b, q);
    return e.add(e.add(w, e.mul(q, o.a)), o.b);
  }
  function p(q, b) {
    const w = e.sqr(b), O = g(q);
    return e.eql(w, O);
  }
  if (!p(o.Gx, o.Gy))
    throw new Error("bad curve params: generator point");
  const T = e.mul(e.pow(o.a, Pt), He), R = e.mul(e.sqr(o.b), BigInt(27));
  if (e.is0(e.add(T, R)))
    throw new Error("bad curve params: a or b");
  function y(q, b, w = false) {
    if (!e.isValid(b) || w && e.is0(b))
      throw new Error(`bad point coordinate ${q}`);
    return b;
  }
  function E(q) {
    if (!(q instanceof B))
      throw new Error("ProjectivePoint expected");
  }
  function S(q) {
    if (!a || !a.basises)
      throw new Error("no endo");
    return rs(q, a.basises, s.ORDER);
  }
  const I = Re((q, b) => {
    const { X: w, Y: O, Z: L } = q;
    if (e.eql(L, e.ONE))
      return { x: w, y: O };
    const Z = q.is0();
    b == null && (b = Z ? e.ONE : e.inv(L));
    const x = e.mul(w, b), _ = e.mul(O, b), A = e.mul(L, b);
    if (Z)
      return { x: e.ZERO, y: e.ZERO };
    if (!e.eql(A, e.ONE))
      throw new Error("invZ was invalid");
    return { x, y: _ };
  }), N = Re((q) => {
    if (q.is0()) {
      if (t.allowInfinityPoint && !e.is0(q.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: w } = q.toAffine();
    if (!e.isValid(b) || !e.isValid(w))
      throw new Error("bad point: x or y not field elements");
    if (!p(b, w))
      throw new Error("bad point: equation left != right");
    if (!q.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return true;
  });
  function H(q, b, w, O, L) {
    return w = new B(e.mul(w.X, q), w.Y, w.Z), b = ue(O, b), w = ue(L, w), b.add(w);
  }
  class B {
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(b, w, O) {
      this.X = y("x", b), this.Y = y("y", w, true), this.Z = y("z", O), Object.freeze(this);
    }
    static CURVE() {
      return o;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(b) {
      const { x: w, y: O } = b || {};
      if (!b || !e.isValid(w) || !e.isValid(O))
        throw new Error("invalid affine point");
      if (b instanceof B)
        throw new Error("projective point not allowed");
      return e.is0(w) && e.is0(O) ? B.ZERO : new B(w, O, e.ONE);
    }
    static fromBytes(b) {
      const w = B.fromAffine(m(tn(b, void 0, "point")));
      return w.assertValidity(), w;
    }
    static fromHex(b) {
      return B.fromBytes(Mt("pointHex", b));
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     *
     * @param windowSize
     * @param isLazy true will defer table computation until the first multiplication
     * @returns
     */
    precompute(b = 8, w = true) {
      return F.createCache(this, b), w || this.multiply(Pt), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      N(this);
    }
    hasEvenY() {
      const { y: b } = this.toAffine();
      if (!e.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !e.isOdd(b);
    }
    /** Compare one point to another. */
    equals(b) {
      E(b);
      const { X: w, Y: O, Z: L } = this, { X: Z, Y: x, Z: _ } = b, A = e.eql(e.mul(w, _), e.mul(Z, L)), G = e.eql(e.mul(O, _), e.mul(x, L));
      return A && G;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new B(this.X, e.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: b, b: w } = o, O = e.mul(w, Pt), { X: L, Y: Z, Z: x } = this;
      let _ = e.ZERO, A = e.ZERO, G = e.ZERO, U = e.mul(L, L), tt = e.mul(Z, Z), C = e.mul(x, x), K = e.mul(L, Z);
      return K = e.add(K, K), G = e.mul(L, x), G = e.add(G, G), _ = e.mul(b, G), A = e.mul(O, C), A = e.add(_, A), _ = e.sub(tt, A), A = e.add(tt, A), A = e.mul(_, A), _ = e.mul(K, _), G = e.mul(O, G), C = e.mul(b, C), K = e.sub(U, C), K = e.mul(b, K), K = e.add(K, G), G = e.add(U, U), U = e.add(G, U), U = e.add(U, C), U = e.mul(U, K), A = e.add(A, U), C = e.mul(Z, x), C = e.add(C, C), U = e.mul(C, K), _ = e.sub(_, U), G = e.mul(C, tt), G = e.add(G, G), G = e.add(G, G), new B(_, A, G);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      E(b);
      const { X: w, Y: O, Z: L } = this, { X: Z, Y: x, Z: _ } = b;
      let A = e.ZERO, G = e.ZERO, U = e.ZERO;
      const tt = o.a, C = e.mul(o.b, Pt);
      let K = e.mul(w, Z), ot = e.mul(O, x), ct = e.mul(L, _), Ht = e.add(w, O), X = e.add(Z, x);
      Ht = e.mul(Ht, X), X = e.add(K, ot), Ht = e.sub(Ht, X), X = e.add(w, L);
      let at = e.add(Z, _);
      return X = e.mul(X, at), at = e.add(K, ct), X = e.sub(X, at), at = e.add(O, L), A = e.add(x, _), at = e.mul(at, A), A = e.add(ot, ct), at = e.sub(at, A), U = e.mul(tt, X), A = e.mul(C, ct), U = e.add(A, U), A = e.sub(ot, U), U = e.add(ot, U), G = e.mul(A, U), ot = e.add(K, K), ot = e.add(ot, K), ct = e.mul(tt, ct), X = e.mul(C, X), ot = e.add(ot, ct), ct = e.sub(K, ct), ct = e.mul(tt, ct), X = e.add(X, ct), K = e.mul(ot, X), G = e.add(G, K), K = e.mul(at, X), A = e.mul(Ht, A), A = e.sub(A, K), K = e.mul(Ht, ot), U = e.mul(at, U), U = e.add(U, K), new B(A, G, U);
    }
    subtract(b) {
      return this.add(b.negate());
    }
    is0() {
      return this.equals(B.ZERO);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(b) {
      const { endo: w } = t;
      if (!s.isValidNot0(b))
        throw new Error("invalid scalar: out of range");
      let O, L;
      const Z = (x) => F.cached(this, x, (_) => Ct(B, _));
      if (w) {
        const { k1neg: x, k1: _, k2neg: A, k2: G } = S(b), { p: U, f: tt } = Z(_), { p: C, f: K } = Z(G);
        L = tt.add(K), O = H(w.beta, U, C, x, A);
      } else {
        const { p: x, f: _ } = Z(b);
        O = x, L = _;
      }
      return Ct(B, [O, L])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(b) {
      const { endo: w } = t, O = this;
      if (!s.isValid(b))
        throw new Error("invalid scalar: out of range");
      if (b === Ot || O.is0())
        return B.ZERO;
      if (b === W)
        return O;
      if (F.hasCache(this))
        return this.multiply(b);
      if (w) {
        const { k1neg: L, k1: Z, k2neg: x, k2: _ } = S(b), { p1: A, p2: G } = $r(B, O, Z, _);
        return H(w.beta, A, G, L, x);
      } else
        return F.unsafe(O, b);
    }
    multiplyAndAddUnsafe(b, w, O) {
      const L = this.multiplyUnsafe(w).add(b.multiplyUnsafe(O));
      return L.is0() ? void 0 : L;
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(b) {
      return I(this, b);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: b } = t;
      return c === W ? true : b ? b(B, this) : F.unsafe(this, i).is0();
    }
    clearCofactor() {
      const { clearCofactor: b } = t;
      return c === W ? this : b ? b(B, this) : this.multiplyUnsafe(c);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(c).is0();
    }
    toBytes(b = true) {
      return Je(b, "isCompressed"), this.assertValidity(), h(B, this, b);
    }
    toHex(b = true) {
      return jt(this.toBytes(b));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    // TODO: remove
    get px() {
      return this.X;
    }
    get py() {
      return this.X;
    }
    get pz() {
      return this.Z;
    }
    toRawBytes(b = true) {
      return this.toBytes(b);
    }
    _setWindowSize(b) {
      this.precompute(b);
    }
    static normalizeZ(b) {
      return Ct(B, b);
    }
    static msm(b, w) {
      return Xr(B, s, b, w);
    }
    static fromPrivateKey(b) {
      return B.BASE.multiply(le(s, b));
    }
  }
  B.BASE = new B(o.Gx, o.Gy, e.ONE), B.ZERO = new B(e.ZERO, e.ONE, e.ZERO), B.Fp = e, B.Fn = s;
  const M = s.BITS, F = new zr(B, t.endo ? Math.ceil(M / 2) : M);
  return B.BASE.precompute(8), B;
}
function os(n) {
  return Uint8Array.of(n ? 2 : 3);
}
function cs(n, t) {
  const r = n.ORDER;
  let e = Ot;
  for (let m = r - W; m % ht === Ot; m /= ht)
    e += W;
  const s = e, o = ht << s - W - W, c = o * ht, i = (r - W) / c, a = (i - W) / ht, u = c - W, l = o, d = n.pow(t, i), f = n.pow(t, (i + W) / ht);
  let h = (m, g) => {
    let p = d, T = n.pow(g, u), R = n.sqr(T);
    R = n.mul(R, g);
    let y = n.mul(m, R);
    y = n.pow(y, a), y = n.mul(y, T), T = n.mul(y, g), R = n.mul(y, m);
    let E = n.mul(R, T);
    y = n.pow(E, l);
    let S = n.eql(y, n.ONE);
    T = n.mul(R, f), y = n.mul(E, p), R = n.cmov(T, R, S), E = n.cmov(y, E, S);
    for (let I = s; I > W; I--) {
      let N = I - ht;
      N = ht << N - W;
      let H = n.pow(E, N);
      const B = n.eql(H, n.ONE);
      T = n.mul(R, p), p = n.mul(p, p), H = n.mul(E, p), R = n.cmov(T, R, B), E = n.cmov(H, E, B);
    }
    return { isValid: S, value: R };
  };
  if (n.ORDER % He === Pt) {
    const m = (n.ORDER - Pt) / He, g = n.sqrt(n.neg(t));
    h = (p, T) => {
      let R = n.sqr(T);
      const y = n.mul(p, T);
      R = n.mul(R, y);
      let E = n.pow(R, m);
      E = n.mul(E, y);
      const S = n.mul(E, g), I = n.mul(n.sqr(E), T), N = n.eql(I, p);
      let H = n.cmov(S, E, N);
      return { isValid: N, value: H };
    };
  }
  return h;
}
function nr(n, t) {
  zn(n);
  const { A: r, B: e, Z: s } = t;
  if (!n.isValid(r) || !n.isValid(e) || !n.isValid(s))
    throw new Error("mapToCurveSimpleSWU: invalid opts");
  const o = cs(n, s);
  if (!n.isOdd)
    throw new Error("Field does not have .isOdd()");
  return (c) => {
    let i, a, u, l, d, f, h, m;
    i = n.sqr(c), i = n.mul(i, s), a = n.sqr(i), a = n.add(a, i), u = n.add(a, n.ONE), u = n.mul(u, e), l = n.cmov(s, n.neg(a), !n.eql(a, n.ZERO)), l = n.mul(l, r), a = n.sqr(u), f = n.sqr(l), d = n.mul(f, r), a = n.add(a, d), a = n.mul(a, u), f = n.mul(f, l), d = n.mul(f, e), a = n.add(a, d), h = n.mul(i, u);
    const { isValid: g, value: p } = o(a, f);
    m = n.mul(i, c), m = n.mul(m, p), h = n.cmov(h, u, g), m = n.cmov(m, p, g);
    const T = n.isOdd(c) === n.isOdd(m);
    m = n.cmov(n.neg(m), m, T);
    const R = Rt(n, [l], true)[0];
    return h = n.mul(h, R), { x: h, y: m };
  };
}
function is(n, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + n.BYTES,
    publicKeyUncompressed: 1 + 2 * n.BYTES,
    publicKeyHasPrefix: true,
    signature: 2 * t.BYTES
  };
}
function an(n) {
  const { CURVE: t, curveOpts: r } = as(n), e = ss(t, r);
  return ds(n, e);
}
function as(n) {
  const t = {
    a: n.a,
    b: n.b,
    p: n.Fp.ORDER,
    n: n.n,
    h: n.h,
    Gx: n.Gx,
    Gy: n.Gy
  }, r = n.Fp;
  let e = n.allowedPrivateKeyLengths ? Array.from(new Set(n.allowedPrivateKeyLengths.map((c) => Math.ceil(c / 2)))) : void 0;
  const s = Ft(t.n, {
    BITS: n.nBitLength,
    allowedLengths: e,
    modFromBytes: n.wrapPrivateKey
  }), o = {
    Fp: r,
    Fn: s,
    allowInfinityPoint: n.allowInfinityPoint,
    endo: n.endo,
    isTorsionFree: n.isTorsionFree,
    clearCofactor: n.clearCofactor,
    fromBytes: n.fromBytes,
    toBytes: n.toBytes
  };
  return { CURVE: t, curveOpts: o };
}
function fs(n, t, r) {
  function e(s) {
    const o = n.sqr(s), c = n.mul(o, s);
    return n.add(n.add(c, n.mul(s, t)), r);
  }
  return e;
}
function ds(n, t) {
  const { Fp: r, Fn: e } = t;
  function s(c) {
    return Dn(c, W, e.ORDER);
  }
  const o = fs(r, n.a, n.b);
  return Object.assign({}, {
    CURVE: n,
    Point: t,
    ProjectivePoint: t,
    normPrivateKeyToScalar: (c) => le(e, c),
    weierstrassEquation: o,
    isWithinCurveOrder: s
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const us = BigInt(0), re = BigInt(1), fn = BigInt(2), kt = BigInt(3);
function ls(n) {
  const t = [];
  for (; n > re; n >>= re)
    (n & re) === us ? t.unshift(0) : (n & kt) === kt ? (t.unshift(-1), n += re) : t.unshift(1);
  return t;
}
function Ae(n) {
  if (!Array.isArray(n) || n.length === 0)
    throw new Error("expected non-empty array");
}
function hs(n, t, r, e) {
  const { Fp2: s, Fp12: o } = n, { twistType: c, ateLoopSize: i, xNegative: a, postPrecompute: u } = e;
  let l;
  if (c === "multiplicative")
    l = (y, E, S, I, N, H) => o.mul014(I, y, s.mul(E, N), s.mul(S, H));
  else if (c === "divisive")
    l = (y, E, S, I, N, H) => o.mul034(I, s.mul(S, H), s.mul(E, N), y);
  else
    throw new Error("bls: unknown twist type");
  const d = s.div(s.ONE, s.mul(s.ONE, fn));
  function f(y, E, S, I) {
    const N = s.sqr(S), H = s.sqr(I), B = s.mulByB(s.mul(H, kt)), M = s.mul(B, kt), F = s.sub(s.sub(s.sqr(s.add(S, I)), H), N), q = s.sub(B, N), b = s.mul(s.sqr(E), kt), w = s.neg(F);
    return y.push([q, b, w]), E = s.mul(s.mul(s.mul(s.sub(N, M), E), S), d), S = s.sub(s.sqr(s.mul(s.add(N, M), d)), s.mul(s.sqr(B), kt)), I = s.mul(N, F), { Rx: E, Ry: S, Rz: I };
  }
  function h(y, E, S, I, N, H) {
    const B = s.sub(S, s.mul(H, I)), M = s.sub(E, s.mul(N, I)), F = s.sub(s.mul(B, N), s.mul(M, H)), q = s.neg(B), b = M;
    y.push([F, q, b]);
    const w = s.sqr(M), O = s.mul(w, M), L = s.mul(w, E), Z = s.add(s.sub(O, s.mul(L, fn)), s.mul(s.sqr(B), I));
    return E = s.mul(M, Z), S = s.sub(s.mul(s.sub(L, Z), B), s.mul(O, S)), I = s.mul(I, O), { Rx: E, Ry: S, Rz: I };
  }
  const m = ls(i), g = Re((y) => {
    const E = y, { x: S, y: I } = E.toAffine(), N = S, H = I, B = s.neg(I);
    let M = N, F = H, q = s.ONE;
    const b = [];
    for (const w of m) {
      const O = [];
      ({ Rx: M, Ry: F, Rz: q } = f(O, M, F, q)), w && ({ Rx: M, Ry: F, Rz: q } = h(O, M, F, q, N, w === -1 ? B : H)), b.push(O);
    }
    if (u) {
      const w = b[b.length - 1];
      u(M, F, q, N, H, h.bind(null, w));
    }
    return b;
  });
  function p(y, E = false) {
    let S = o.ONE;
    if (y.length) {
      const I = y[0][0].length;
      for (let N = 0; N < I; N++) {
        S = o.sqr(S);
        for (const [H, B, M] of y)
          for (const [F, q, b] of H[N])
            S = l(F, q, b, S, B, M);
      }
    }
    return a && (S = o.conjugate(S)), E ? o.finalExponentiate(S) : S;
  }
  function T(y, E = true) {
    const S = [];
    Ct(t, y.map(({ g1: I }) => I)), Ct(r, y.map(({ g2: I }) => I));
    for (const { g1: I, g2: N } of y) {
      if (I.is0() || N.is0())
        throw new Error("pairing is not available for ZERO point");
      I.assertValidity(), N.assertValidity();
      const H = I.toAffine();
      S.push([g(N), H.x, H.y]);
    }
    return p(S, E);
  }
  function R(y, E, S = true) {
    return T([{ g1: y, g2: E }], S);
  }
  return {
    Fp12: o,
    // NOTE: we re-export Fp12 here because pairing results are Fp12!
    millerLoopBatch: p,
    pairing: R,
    pairingBatch: T,
    calcPairingPrecomputes: g
  };
}
function dn(n, t, r, e, s) {
  const { Fp12: o, pairingBatch: c } = n;
  function i(d) {
    return d instanceof t.Point ? d : t.Point.fromHex(d);
  }
  function a(d) {
    return d instanceof r.Point ? d : r.Point.fromHex(d);
  }
  function u(d) {
    if (!(d instanceof r.Point))
      throw new Error(`expected valid message hashed to ${s ? "G1" : "G2"} curve`);
    return d;
  }
  const l = s ? (d, f) => ({ g1: f, g2: d }) : (d, f) => ({ g1: d, g2: f });
  return {
    // P = pk x G
    getPublicKey(d) {
      const f = le(t.Point.Fn, d);
      return t.Point.BASE.multiply(f);
    },
    // S = pk x H(m)
    sign(d, f, h) {
      if (h != null)
        throw new Error("sign() expects 2 arguments");
      const m = le(t.Point.Fn, f);
      return u(d).assertValidity(), d.multiply(m);
    },
    // Checks if pairing of public key & hash is equal to pairing of generator & signature.
    // e(P, H(m)) == e(G, S)
    // e(S, G) == e(H(m), P)
    verify(d, f, h, m) {
      if (m != null)
        throw new Error("verify() expects 3 arguments");
      d = a(d), h = i(h);
      const g = h.negate(), p = t.Point.BASE, T = u(f), R = d, y = c([l(g, T), l(p, R)]);
      return o.eql(y, o.ONE);
    },
    // https://ethresear.ch/t/fast-verification-of-multiple-bls-signatures/5407
    // e(G, S) = e(G, SUM(n)(Si)) = MUL(n)(e(G, Si))
    // TODO: maybe `{message: G2Hex, publicKey: G1Hex}[]` instead?
    verifyBatch(d, f, h) {
      if (Ae(f), h.length !== f.length)
        throw new Error("amount of public keys and messages should be equal");
      const m = a(d), g = f, p = h.map(i), T = /* @__PURE__ */ new Map();
      for (let E = 0; E < p.length; E++) {
        const S = p[E], I = g[E];
        let N = T.get(I);
        N === void 0 && (N = [], T.set(I, N)), N.push(S);
      }
      const R = [], y = t.Point.BASE;
      try {
        for (const [E, S] of T) {
          const I = S.reduce((N, H) => N.add(H));
          R.push(l(I, E));
        }
        return R.push(l(y.negate(), m)), o.eql(c(R), o.ONE);
      } catch {
        return false;
      }
    },
    // Adds a bunch of public key points together.
    // pk1 + pk2 + pk3 = pkA
    aggregatePublicKeys(d) {
      Ae(d), d = d.map((h) => i(h));
      const f = d.reduce((h, m) => h.add(m), t.Point.ZERO);
      return f.assertValidity(), f;
    },
    // Adds a bunch of signature points together.
    // pk1 + pk2 + pk3 = pkA
    aggregateSignatures(d) {
      Ae(d), d = d.map((h) => a(h));
      const f = d.reduce((h, m) => h.add(m), r.Point.ZERO);
      return f.assertValidity(), f;
    },
    hash(d, f) {
      J(d);
      const h = f ? { DST: f } : void 0;
      return r.hashToCurve(d, h);
    },
    Signature: e
  };
}
function bs(n) {
  const { Fp: t, Fr: r, Fp2: e, Fp6: s, Fp12: o } = n.fields, c = an(n.G1), i = Object.assign(c, on(c.Point, n.G1.mapToCurve, {
    ...n.htfDefaults,
    ...n.G1.htfDefaults
  })), a = an(n.G2), u = Object.assign(a, on(a.Point, n.G2.mapToCurve, {
    ...n.htfDefaults,
    ...n.G2.htfDefaults
  })), l = hs(n.fields, i.Point, u.Point, {
    ...n.params,
    postPrecompute: n.postPrecompute
  }), { millerLoopBatch: d, pairing: f, pairingBatch: h, calcPairingPrecomputes: m } = l, g = dn(l, i, u, n.G2.Signature, false), p = dn(l, u, i, n.G1.ShortSignature, true), T = n.randomBytes || gr, R = () => {
    const x = Xn(r.ORDER);
    return Cr(T(x), r.ORDER);
  }, y = {
    randomSecretKey: R,
    randomPrivateKey: R,
    calcPairingPrecomputes: m
  }, { ShortSignature: E } = n.G1, { Signature: S } = n.G2;
  function I(x, _) {
    return x instanceof i.Point ? x : p.hash(Mt("point", x), _ == null ? void 0 : _.DST);
  }
  function N(x, _) {
    return x instanceof u.Point ? x : g.hash(Mt("point", x), _ == null ? void 0 : _.DST);
  }
  function H(x) {
    return g.getPublicKey(x).toBytes(true);
  }
  function B(x) {
    return p.getPublicKey(x).toBytes(true);
  }
  function M(x, _, A) {
    const G = N(x, A), U = g.sign(G, _);
    return x instanceof u.Point ? U : S.toBytes(U);
  }
  function F(x, _, A) {
    const G = I(x, A), U = p.sign(G, _);
    return x instanceof i.Point ? U : E.toBytes(U);
  }
  function q(x, _, A, G) {
    const U = N(_, G);
    return g.verify(x, U, A);
  }
  function b(x, _, A, G) {
    const U = I(_, G);
    return p.verify(x, U, A);
  }
  function w(x) {
    const _ = g.aggregatePublicKeys(x);
    return x[0] instanceof i.Point ? _ : _.toBytes(true);
  }
  function O(x) {
    const _ = g.aggregateSignatures(x);
    return x[0] instanceof u.Point ? _ : S.toBytes(_);
  }
  function L(x) {
    const _ = p.aggregateSignatures(x);
    return x[0] instanceof i.Point ? _ : E.toBytes(_);
  }
  function Z(x, _, A, G) {
    const U = _.map((tt) => N(tt, G));
    return g.verifyBatch(x, U, A);
  }
  return i.Point.BASE.precompute(4), {
    longSignatures: g,
    shortSignatures: p,
    millerLoopBatch: d,
    pairing: f,
    pairingBatch: h,
    verifyBatch: Z,
    fields: {
      Fr: r,
      Fp: t,
      Fp2: e,
      Fp6: s,
      Fp12: o
    },
    params: {
      ateLoopSize: n.params.ateLoopSize,
      twistType: n.params.twistType,
      // deprecated
      r: n.params.r,
      G1b: n.G1.b,
      G2b: n.G2.b
    },
    utils: y,
    // deprecated
    getPublicKey: H,
    getPublicKeyForShortSignatures: B,
    sign: M,
    signShortSignature: F,
    verify: q,
    verifyShortSignature: b,
    aggregatePublicKeys: w,
    aggregateSignatures: O,
    aggregateShortSignatures: L,
    G1: i,
    G2: u,
    Signature: S,
    ShortSignature: E
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const un = BigInt(0), bt = BigInt(1), Q = BigInt(2), ln = BigInt(3);
function Ve(n, t, r, e, s = 1, o) {
  const c = BigInt(o === void 0 ? e : o), i = r ** BigInt(e), a = [];
  for (let u = 0; u < s; u++) {
    const l = BigInt(u + 1), d = [];
    for (let f = 0, h = bt; f < e; f++) {
      const m = (l * h - l) / c % i;
      d.push(n.pow(t, m)), h *= r;
    }
    a.push(d);
  }
  return a;
}
function ms(n, t, r) {
  const e = t.pow(r, (n.ORDER - bt) / ln), s = t.pow(r, (n.ORDER - bt) / Q);
  function o(f, h) {
    const m = t.mul(t.frobeniusMap(f, 1), e), g = t.mul(t.frobeniusMap(h, 1), s);
    return [m, g];
  }
  const c = t.pow(r, (n.ORDER ** Q - bt) / ln), i = t.pow(r, (n.ORDER ** Q - bt) / Q);
  if (!t.eql(i, t.neg(t.ONE)))
    throw new Error("psiFrobenius: PSI2_Y!==-1");
  function a(f, h) {
    return [t.mul(f, c), t.neg(h)];
  }
  const u = (f) => (h, m) => {
    const g = m.toAffine(), p = f(g.x, g.y);
    return h.fromAffine({ x: p[0], y: p[1] });
  }, l = u(o), d = u(a);
  return { psi: o, psi2: a, G2psi: l, G2psi2: d, PSI_X: e, PSI_Y: s, PSI2_X: c, PSI2_Y: i };
}
const hn = (n, t) => {
  if (t.length !== 2)
    throw new Error("invalid tuple");
  const r = t.map((e) => n.create(e));
  return { c0: r[0], c1: r[1] };
};
class gs {
  constructor(t, r = {}) {
    this.MASK = bt;
    const e = t.ORDER, s = e * e;
    this.Fp = t, this.ORDER = s, this.BITS = Yt(s), this.BYTES = Math.ceil(Yt(s) / 8), this.isLE = t.isLE, this.ZERO = { c0: t.ZERO, c1: t.ZERO }, this.ONE = { c0: t.ONE, c1: t.ZERO }, this.Fp_NONRESIDUE = t.create(r.NONRESIDUE || BigInt(-1)), this.Fp_div2 = t.div(t.ONE, Q), this.NONRESIDUE = hn(t, r.FP2_NONRESIDUE), this.FROBENIUS_COEFFICIENTS = Ve(t, this.Fp_NONRESIDUE, t.ORDER, 2)[0], this.mulByB = r.Fp2mulByB, Object.seal(this);
  }
  fromBigTuple(t) {
    return hn(this.Fp, t);
  }
  create(t) {
    return t;
  }
  isValid({ c0: t, c1: r }) {
    function e(s, o) {
      return typeof s == "bigint" && un <= s && s < o;
    }
    return e(t, this.ORDER) && e(r, this.ORDER);
  }
  is0({ c0: t, c1: r }) {
    return this.Fp.is0(t) && this.Fp.is0(r);
  }
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  eql({ c0: t, c1: r }, { c0: e, c1: s }) {
    return this.Fp.eql(t, e) && this.Fp.eql(r, s);
  }
  neg({ c0: t, c1: r }) {
    return { c0: this.Fp.neg(t), c1: this.Fp.neg(r) };
  }
  pow(t, r) {
    return ge(this, t, r);
  }
  invertBatch(t) {
    return Rt(this, t);
  }
  // Normalized
  add(t, r) {
    const { c0: e, c1: s } = t, { c0: o, c1: c } = r;
    return {
      c0: this.Fp.add(e, o),
      c1: this.Fp.add(s, c)
    };
  }
  sub({ c0: t, c1: r }, { c0: e, c1: s }) {
    return {
      c0: this.Fp.sub(t, e),
      c1: this.Fp.sub(r, s)
    };
  }
  mul({ c0: t, c1: r }, e) {
    const { Fp: s } = this;
    if (typeof e == "bigint")
      return { c0: s.mul(t, e), c1: s.mul(r, e) };
    const { c0: o, c1: c } = e;
    let i = s.mul(t, o), a = s.mul(r, c);
    const u = s.sub(i, a), l = s.sub(s.mul(s.add(t, r), s.add(o, c)), s.add(i, a));
    return { c0: u, c1: l };
  }
  sqr({ c0: t, c1: r }) {
    const { Fp: e } = this, s = e.add(t, r), o = e.sub(t, r), c = e.add(t, t);
    return { c0: e.mul(s, o), c1: e.mul(c, r) };
  }
  // NonNormalized stuff
  addN(t, r) {
    return this.add(t, r);
  }
  subN(t, r) {
    return this.sub(t, r);
  }
  mulN(t, r) {
    return this.mul(t, r);
  }
  sqrN(t) {
    return this.sqr(t);
  }
  // Why inversion for bigint inside Fp instead of Fp2? it is even used in that context?
  div(t, r) {
    const { Fp: e } = this;
    return this.mul(t, typeof r == "bigint" ? e.inv(e.create(r)) : this.inv(r));
  }
  inv({ c0: t, c1: r }) {
    const { Fp: e } = this, s = e.inv(e.create(t * t + r * r));
    return { c0: e.mul(s, e.create(t)), c1: e.mul(s, e.create(-r)) };
  }
  sqrt(t) {
    const { Fp: r } = this, e = this, { c0: s, c1: o } = t;
    if (r.is0(o))
      return de(r, s) === 1 ? e.create({ c0: r.sqrt(s), c1: r.ZERO }) : e.create({ c0: r.ZERO, c1: r.sqrt(r.div(s, this.Fp_NONRESIDUE)) });
    const c = r.sqrt(r.sub(r.sqr(s), r.mul(r.sqr(o), this.Fp_NONRESIDUE)));
    let i = r.mul(r.add(c, s), this.Fp_div2);
    de(r, i) === -1 && (i = r.sub(i, c));
    const u = r.sqrt(i), l = e.create({ c0: u, c1: r.div(r.mul(o, this.Fp_div2), u) });
    if (!e.eql(e.sqr(l), t))
      throw new Error("Cannot find square root");
    const d = l, f = e.neg(d), { re: h, im: m } = e.reim(d), { re: g, im: p } = e.reim(f);
    return m > p || m === p && h > g ? d : f;
  }
  // Same as sgn0_m_eq_2 in RFC 9380
  isOdd(t) {
    const { re: r, im: e } = this.reim(t), s = r % Q, o = r === un, c = e % Q;
    return BigInt(s || o && c) == bt;
  }
  // Bytes util
  fromBytes(t) {
    const { Fp: r } = this;
    if (t.length !== this.BYTES)
      throw new Error("fromBytes invalid length=" + t.length);
    return { c0: r.fromBytes(t.subarray(0, r.BYTES)), c1: r.fromBytes(t.subarray(r.BYTES)) };
  }
  toBytes({ c0: t, c1: r }) {
    return V(this.Fp.toBytes(t), this.Fp.toBytes(r));
  }
  cmov({ c0: t, c1: r }, { c0: e, c1: s }, o) {
    return {
      c0: this.Fp.cmov(t, e, o),
      c1: this.Fp.cmov(r, s, o)
    };
  }
  reim({ c0: t, c1: r }) {
    return { re: t, im: r };
  }
  Fp4Square(t, r) {
    const e = this, s = e.sqr(t), o = e.sqr(r);
    return {
      first: e.add(e.mulByNonresidue(o), s),
      // b² * Nonresidue + a²
      second: e.sub(e.sub(e.sqr(e.add(t, r)), s), o)
      // (a + b)² - a² - b²
    };
  }
  // multiply by u + 1
  mulByNonresidue({ c0: t, c1: r }) {
    return this.mul({ c0: t, c1: r }, this.NONRESIDUE);
  }
  frobeniusMap({ c0: t, c1: r }, e) {
    return {
      c0: t,
      c1: this.Fp.mul(r, this.FROBENIUS_COEFFICIENTS[e % 2])
    };
  }
}
class ys {
  constructor(t) {
    this.MASK = bt, this.Fp2 = t, this.ORDER = t.ORDER, this.BITS = 3 * t.BITS, this.BYTES = 3 * t.BYTES, this.isLE = t.isLE, this.ZERO = { c0: t.ZERO, c1: t.ZERO, c2: t.ZERO }, this.ONE = { c0: t.ONE, c1: t.ZERO, c2: t.ZERO };
    const { Fp: r } = t, e = Ve(t, t.NONRESIDUE, r.ORDER, 6, 2, 3);
    this.FROBENIUS_COEFFICIENTS_1 = e[0], this.FROBENIUS_COEFFICIENTS_2 = e[1], Object.seal(this);
  }
  add({ c0: t, c1: r, c2: e }, { c0: s, c1: o, c2: c }) {
    const { Fp2: i } = this;
    return {
      c0: i.add(t, s),
      c1: i.add(r, o),
      c2: i.add(e, c)
    };
  }
  sub({ c0: t, c1: r, c2: e }, { c0: s, c1: o, c2: c }) {
    const { Fp2: i } = this;
    return {
      c0: i.sub(t, s),
      c1: i.sub(r, o),
      c2: i.sub(e, c)
    };
  }
  mul({ c0: t, c1: r, c2: e }, s) {
    const { Fp2: o } = this;
    if (typeof s == "bigint")
      return {
        c0: o.mul(t, s),
        c1: o.mul(r, s),
        c2: o.mul(e, s)
      };
    const { c0: c, c1: i, c2: a } = s, u = o.mul(t, c), l = o.mul(r, i), d = o.mul(e, a);
    return {
      // t0 + (c1 + c2) * (r1 * r2) - (T1 + T2) * (u + 1)
      c0: o.add(u, o.mulByNonresidue(o.sub(o.mul(o.add(r, e), o.add(i, a)), o.add(l, d)))),
      // (c0 + c1) * (r0 + r1) - (T0 + T1) + T2 * (u + 1)
      c1: o.add(o.sub(o.mul(o.add(t, r), o.add(c, i)), o.add(u, l)), o.mulByNonresidue(d)),
      // T1 + (c0 + c2) * (r0 + r2) - T0 + T2
      c2: o.sub(o.add(l, o.mul(o.add(t, e), o.add(c, a))), o.add(u, d))
    };
  }
  sqr({ c0: t, c1: r, c2: e }) {
    const { Fp2: s } = this;
    let o = s.sqr(t), c = s.mul(s.mul(t, r), Q), i = s.mul(s.mul(r, e), Q), a = s.sqr(e);
    return {
      c0: s.add(s.mulByNonresidue(i), o),
      // T3 * (u + 1) + T0
      c1: s.add(s.mulByNonresidue(a), c),
      // T4 * (u + 1) + T1
      // T1 + (c0 - c1 + c2)² + T3 - T0 - T4
      c2: s.sub(s.sub(s.add(s.add(c, s.sqr(s.add(s.sub(t, r), e))), i), o), a)
    };
  }
  addN(t, r) {
    return this.add(t, r);
  }
  subN(t, r) {
    return this.sub(t, r);
  }
  mulN(t, r) {
    return this.mul(t, r);
  }
  sqrN(t) {
    return this.sqr(t);
  }
  create(t) {
    return t;
  }
  isValid({ c0: t, c1: r, c2: e }) {
    const { Fp2: s } = this;
    return s.isValid(t) && s.isValid(r) && s.isValid(e);
  }
  is0({ c0: t, c1: r, c2: e }) {
    const { Fp2: s } = this;
    return s.is0(t) && s.is0(r) && s.is0(e);
  }
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  neg({ c0: t, c1: r, c2: e }) {
    const { Fp2: s } = this;
    return { c0: s.neg(t), c1: s.neg(r), c2: s.neg(e) };
  }
  eql({ c0: t, c1: r, c2: e }, { c0: s, c1: o, c2: c }) {
    const { Fp2: i } = this;
    return i.eql(t, s) && i.eql(r, o) && i.eql(e, c);
  }
  sqrt(t) {
    return Zn();
  }
  // Do we need division by bigint at all? Should be done via order:
  div(t, r) {
    const { Fp2: e } = this, { Fp: s } = e;
    return this.mul(t, typeof r == "bigint" ? s.inv(s.create(r)) : this.inv(r));
  }
  pow(t, r) {
    return ge(this, t, r);
  }
  invertBatch(t) {
    return Rt(this, t);
  }
  inv({ c0: t, c1: r, c2: e }) {
    const { Fp2: s } = this;
    let o = s.sub(s.sqr(t), s.mulByNonresidue(s.mul(e, r))), c = s.sub(s.mulByNonresidue(s.sqr(e)), s.mul(t, r)), i = s.sub(s.sqr(r), s.mul(t, e)), a = s.inv(s.add(s.mulByNonresidue(s.add(s.mul(e, c), s.mul(r, i))), s.mul(t, o)));
    return { c0: s.mul(a, o), c1: s.mul(a, c), c2: s.mul(a, i) };
  }
  // Bytes utils
  fromBytes(t) {
    const { Fp2: r } = this;
    if (t.length !== this.BYTES)
      throw new Error("fromBytes invalid length=" + t.length);
    const e = r.BYTES;
    return {
      c0: r.fromBytes(t.subarray(0, e)),
      c1: r.fromBytes(t.subarray(e, e * 2)),
      c2: r.fromBytes(t.subarray(2 * e))
    };
  }
  toBytes({ c0: t, c1: r, c2: e }) {
    const { Fp2: s } = this;
    return V(s.toBytes(t), s.toBytes(r), s.toBytes(e));
  }
  cmov({ c0: t, c1: r, c2: e }, { c0: s, c1: o, c2: c }, i) {
    const { Fp2: a } = this;
    return {
      c0: a.cmov(t, s, i),
      c1: a.cmov(r, o, i),
      c2: a.cmov(e, c, i)
    };
  }
  fromBigSix(t) {
    const { Fp2: r } = this;
    if (!Array.isArray(t) || t.length !== 6)
      throw new Error("invalid Fp6 usage");
    return {
      c0: r.fromBigTuple(t.slice(0, 2)),
      c1: r.fromBigTuple(t.slice(2, 4)),
      c2: r.fromBigTuple(t.slice(4, 6))
    };
  }
  frobeniusMap({ c0: t, c1: r, c2: e }, s) {
    const { Fp2: o } = this;
    return {
      c0: o.frobeniusMap(t, s),
      c1: o.mul(o.frobeniusMap(r, s), this.FROBENIUS_COEFFICIENTS_1[s % 6]),
      c2: o.mul(o.frobeniusMap(e, s), this.FROBENIUS_COEFFICIENTS_2[s % 6])
    };
  }
  mulByFp2({ c0: t, c1: r, c2: e }, s) {
    const { Fp2: o } = this;
    return {
      c0: o.mul(t, s),
      c1: o.mul(r, s),
      c2: o.mul(e, s)
    };
  }
  mulByNonresidue({ c0: t, c1: r, c2: e }) {
    const { Fp2: s } = this;
    return { c0: s.mulByNonresidue(e), c1: t, c2: r };
  }
  // Sparse multiplication
  mul1({ c0: t, c1: r, c2: e }, s) {
    const { Fp2: o } = this;
    return {
      c0: o.mulByNonresidue(o.mul(e, s)),
      c1: o.mul(t, s),
      c2: o.mul(r, s)
    };
  }
  // Sparse multiplication
  mul01({ c0: t, c1: r, c2: e }, s, o) {
    const { Fp2: c } = this;
    let i = c.mul(t, s), a = c.mul(r, o);
    return {
      // ((c1 + c2) * b1 - T1) * (u + 1) + T0
      c0: c.add(c.mulByNonresidue(c.sub(c.mul(c.add(r, e), o), a)), i),
      // (b0 + b1) * (c0 + c1) - T0 - T1
      c1: c.sub(c.sub(c.mul(c.add(s, o), c.add(t, r)), i), a),
      // (c0 + c2) * b0 - T0 + T1
      c2: c.add(c.sub(c.mul(c.add(t, e), s), i), a)
    };
  }
}
class ps {
  constructor(t, r) {
    this.MASK = bt;
    const { Fp2: e } = t, { Fp: s } = e;
    this.Fp6 = t, this.ORDER = e.ORDER, this.BITS = 2 * t.BITS, this.BYTES = 2 * t.BYTES, this.isLE = t.isLE, this.ZERO = { c0: t.ZERO, c1: t.ZERO }, this.ONE = { c0: t.ONE, c1: t.ZERO }, this.FROBENIUS_COEFFICIENTS = Ve(e, e.NONRESIDUE, s.ORDER, 12, 1, 6)[0], this.X_LEN = r.X_LEN, this.finalExponentiate = r.Fp12finalExponentiate;
  }
  create(t) {
    return t;
  }
  isValid({ c0: t, c1: r }) {
    const { Fp6: e } = this;
    return e.isValid(t) && e.isValid(r);
  }
  is0({ c0: t, c1: r }) {
    const { Fp6: e } = this;
    return e.is0(t) && e.is0(r);
  }
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  neg({ c0: t, c1: r }) {
    const { Fp6: e } = this;
    return { c0: e.neg(t), c1: e.neg(r) };
  }
  eql({ c0: t, c1: r }, { c0: e, c1: s }) {
    const { Fp6: o } = this;
    return o.eql(t, e) && o.eql(r, s);
  }
  sqrt(t) {
    Zn();
  }
  inv({ c0: t, c1: r }) {
    const { Fp6: e } = this;
    let s = e.inv(e.sub(e.sqr(t), e.mulByNonresidue(e.sqr(r))));
    return { c0: e.mul(t, s), c1: e.neg(e.mul(r, s)) };
  }
  div(t, r) {
    const { Fp6: e } = this, { Fp2: s } = e, { Fp: o } = s;
    return this.mul(t, typeof r == "bigint" ? o.inv(o.create(r)) : this.inv(r));
  }
  pow(t, r) {
    return ge(this, t, r);
  }
  invertBatch(t) {
    return Rt(this, t);
  }
  // Normalized
  add({ c0: t, c1: r }, { c0: e, c1: s }) {
    const { Fp6: o } = this;
    return {
      c0: o.add(t, e),
      c1: o.add(r, s)
    };
  }
  sub({ c0: t, c1: r }, { c0: e, c1: s }) {
    const { Fp6: o } = this;
    return {
      c0: o.sub(t, e),
      c1: o.sub(r, s)
    };
  }
  mul({ c0: t, c1: r }, e) {
    const { Fp6: s } = this;
    if (typeof e == "bigint")
      return { c0: s.mul(t, e), c1: s.mul(r, e) };
    let { c0: o, c1: c } = e, i = s.mul(t, o), a = s.mul(r, c);
    return {
      c0: s.add(i, s.mulByNonresidue(a)),
      // T1 + T2 * v
      // (c0 + c1) * (r0 + r1) - (T1 + T2)
      c1: s.sub(s.mul(s.add(t, r), s.add(o, c)), s.add(i, a))
    };
  }
  sqr({ c0: t, c1: r }) {
    const { Fp6: e } = this;
    let s = e.mul(t, r);
    return {
      // (c1 * v + c0) * (c0 + c1) - AB - AB * v
      c0: e.sub(e.sub(e.mul(e.add(e.mulByNonresidue(r), t), e.add(t, r)), s), e.mulByNonresidue(s)),
      c1: e.add(s, s)
    };
  }
  // NonNormalized stuff
  addN(t, r) {
    return this.add(t, r);
  }
  subN(t, r) {
    return this.sub(t, r);
  }
  mulN(t, r) {
    return this.mul(t, r);
  }
  sqrN(t) {
    return this.sqr(t);
  }
  // Bytes utils
  fromBytes(t) {
    const { Fp6: r } = this;
    if (t.length !== this.BYTES)
      throw new Error("fromBytes invalid length=" + t.length);
    return {
      c0: r.fromBytes(t.subarray(0, r.BYTES)),
      c1: r.fromBytes(t.subarray(r.BYTES))
    };
  }
  toBytes({ c0: t, c1: r }) {
    const { Fp6: e } = this;
    return V(e.toBytes(t), e.toBytes(r));
  }
  cmov({ c0: t, c1: r }, { c0: e, c1: s }, o) {
    const { Fp6: c } = this;
    return {
      c0: c.cmov(t, e, o),
      c1: c.cmov(r, s, o)
    };
  }
  // Utils
  // toString() {
  //   return '' + 'Fp12(' + this.c0 + this.c1 + '* w');
  // },
  // fromTuple(c: [Fp6, Fp6]) {
  //   return new Fp12(...c);
  // }
  fromBigTwelve(t) {
    const { Fp6: r } = this;
    return {
      c0: r.fromBigSix(t.slice(0, 6)),
      c1: r.fromBigSix(t.slice(6, 12))
    };
  }
  // Raises to q**i -th power
  frobeniusMap(t, r) {
    const { Fp6: e } = this, { Fp2: s } = e, { c0: o, c1: c, c2: i } = e.frobeniusMap(t.c1, r), a = this.FROBENIUS_COEFFICIENTS[r % 12];
    return {
      c0: e.frobeniusMap(t.c0, r),
      c1: e.create({
        c0: s.mul(o, a),
        c1: s.mul(c, a),
        c2: s.mul(i, a)
      })
    };
  }
  mulByFp2({ c0: t, c1: r }, e) {
    const { Fp6: s } = this;
    return {
      c0: s.mulByFp2(t, e),
      c1: s.mulByFp2(r, e)
    };
  }
  conjugate({ c0: t, c1: r }) {
    return { c0: t, c1: this.Fp6.neg(r) };
  }
  // Sparse multiplication
  mul014({ c0: t, c1: r }, e, s, o) {
    const { Fp6: c } = this, { Fp2: i } = c;
    let a = c.mul01(t, e, s), u = c.mul1(r, o);
    return {
      c0: c.add(c.mulByNonresidue(u), a),
      // T1 * v + T0
      // (c1 + c0) * [o0, o1+o4] - T0 - T1
      c1: c.sub(c.sub(c.mul01(c.add(r, t), e, i.add(s, o)), a), u)
    };
  }
  mul034({ c0: t, c1: r }, e, s, o) {
    const { Fp6: c } = this, { Fp2: i } = c, a = c.create({
      c0: i.mul(t.c0, e),
      c1: i.mul(t.c1, e),
      c2: i.mul(t.c2, e)
    }), u = c.mul01(r, s, o), l = c.mul01(c.add(t, r), i.add(e, s), o);
    return {
      c0: c.add(c.mulByNonresidue(u), a),
      c1: c.sub(l, c.add(a, u))
    };
  }
  // A cyclotomic group is a subgroup of Fp^n defined by
  //   GΦₙ(p) = {α ∈ Fpⁿ : α^Φₙ(p) = 1}
  // The result of any pairing is in a cyclotomic subgroup
  // https://eprint.iacr.org/2009/565.pdf
  // https://eprint.iacr.org/2010/354.pdf
  _cyclotomicSquare({ c0: t, c1: r }) {
    const { Fp6: e } = this, { Fp2: s } = e, { c0: o, c1: c, c2: i } = t, { c0: a, c1: u, c2: l } = r, { first: d, second: f } = s.Fp4Square(o, u), { first: h, second: m } = s.Fp4Square(a, i), { first: g, second: p } = s.Fp4Square(c, l), T = s.mulByNonresidue(p);
    return {
      c0: e.create({
        c0: s.add(s.mul(s.sub(d, o), Q), d),
        // 2 * (T3 - c0c0)  + T3
        c1: s.add(s.mul(s.sub(h, c), Q), h),
        // 2 * (T5 - c0c1)  + T5
        c2: s.add(s.mul(s.sub(g, i), Q), g)
      }),
      // 2 * (T7 - c0c2)  + T7
      c1: e.create({
        c0: s.add(s.mul(s.add(T, a), Q), T),
        // 2 * (T9 + c1c0) + T9
        c1: s.add(s.mul(s.add(f, u), Q), f),
        // 2 * (T4 + c1c1) + T4
        c2: s.add(s.mul(s.add(m, l), Q), m)
      })
    };
  }
  // https://eprint.iacr.org/2009/565.pdf
  _cyclotomicExp(t, r) {
    let e = this.ONE;
    for (let s = this.X_LEN - 1; s >= 0; s--)
      e = this._cyclotomicSquare(e), Lr(r, s) && (e = this.mul(e, t));
    return e;
  }
}
function ws(n) {
  const t = Ft(n.ORDER), r = new gs(t, n), e = new ys(r), s = new ps(e, n);
  return { Fp: t, Fp2: r, Fp6: e, Fp12: s };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $ = BigInt(0), he = BigInt(1), st = BigInt(2), ye = BigInt(3), $t = BigInt(4), St = BigInt("0xd201000000010000"), xs = Yt(St), Tt = {
  p: BigInt("0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab"),
  n: BigInt("0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001"),
  h: BigInt("0x396c8c005555e1568c00aaab0000aaab"),
  a: $,
  b: $t,
  Gx: BigInt("0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb"),
  Gy: BigInt("0x08b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1")
}, Es = Ft(Tt.n, {
  modFromBytes: true,
  isLE: true
}), { Fp: v, Fp2: P, Fp6: Bs, Fp12: k } = ws({
  ORDER: Tt.p,
  X_LEN: xs,
  // Finite extension field over irreducible polynominal.
  // Fp(u) / (u² - β) where β = -1
  FP2_NONRESIDUE: [he, he],
  Fp2mulByB: ({ c0: n, c1: t }) => {
    const r = v.mul(n, $t), e = v.mul(t, $t);
    return { c0: v.sub(r, e), c1: v.add(r, e) };
  },
  Fp12finalExponentiate: (n) => {
    const t = St, r = k.div(k.frobeniusMap(n, 6), n), e = k.mul(k.frobeniusMap(r, 2), r), s = k.conjugate(k._cyclotomicExp(e, t)), o = k.mul(k.conjugate(k._cyclotomicSquare(e)), s), c = k.conjugate(k._cyclotomicExp(o, t)), i = k.conjugate(k._cyclotomicExp(c, t)), a = k.mul(k.conjugate(k._cyclotomicExp(i, t)), k._cyclotomicSquare(s)), u = k.conjugate(k._cyclotomicExp(a, t)), l = k.frobeniusMap(k.mul(s, i), 2), d = k.frobeniusMap(k.mul(c, e), 3), f = k.frobeniusMap(k.mul(a, k.conjugate(e)), 1), h = k.mul(k.mul(u, k.conjugate(o)), e);
    return k.mul(k.mul(k.mul(l, d), f), h);
  }
}), { G2psi: bn, G2psi2: Ss } = ms(v, P, P.div(P.ONE, P.NONRESIDUE)), Oe = Object.freeze({
  DST: "BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_",
  encodeDST: "BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL_",
  p: v.ORDER,
  m: 2,
  k: 128,
  expand: "xmd",
  hash: Un
}), Ce = {
  p: P.ORDER,
  n: Tt.n,
  h: BigInt("0x5d543a95414e7f1091d50792876a202cd91de4547085abaa68a205b2e5a7ddfa628f1cb4d9e82ef21537e293a6691ae1616ec6e786f0c70cf1c38e31c7238e5"),
  a: P.ZERO,
  b: P.fromBigTuple([$t, $t]),
  Gx: P.fromBigTuple([
    BigInt("0x024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8"),
    BigInt("0x13e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e")
  ]),
  Gy: P.fromBigTuple([
    BigInt("0x0ce5d527727d6e118cc9cdc6da2e351aadfd9baa8cbdd3a76d429a695160d12c923ac9cc3baca289e193548608b82801"),
    BigInt("0x0606c4a02ea734cc32acd2b02bc28b99cb3e287e85a763af267492ab572e99ab3f370d275cec1da1aaa9075ff05f79be")
  ])
}, pe = Qt(v.toBytes($), { infinity: true, compressed: true });
function we(n) {
  n = n.slice();
  const t = n[0] & 224, r = !!(t >> 7 & 1), e = !!(t >> 6 & 1), s = !!(t >> 5 & 1);
  return n[0] &= 31, { compressed: r, infinity: e, sort: s, value: n };
}
function Qt(n, t) {
  if (n[0] & 224)
    throw new Error("setMask: non-empty mask");
  return t.compressed && (n[0] |= 128), t.infinity && (n[0] |= 64), t.sort && (n[0] |= 32), n;
}
function _s(n, t, r) {
  const { BYTES: e, ORDER: s } = v, o = t.is0(), { x: c, y: i } = t.toAffine();
  if (r) {
    if (o)
      return pe.slice();
    const a = !!(i * st / s);
    return Qt(j(c, e), { compressed: true, sort: a });
  } else
    return o ? V(Uint8Array.of(64), new Uint8Array(2 * e - 1)) : V(j(c, e), j(i, e));
}
function Ie(n) {
  n.assertValidity();
  const { BYTES: t, ORDER: r } = v, { x: e, y: s } = n.toAffine();
  if (n.is0())
    return pe.slice();
  const o = !!(s * st / r);
  return Qt(j(e, t), { compressed: true, sort: o });
}
function vs(n) {
  const { compressed: t, infinity: r, sort: e, value: s } = we(n), { BYTES: o, ORDER: c } = v;
  if (s.length === 48 && t) {
    const i = dt(s), a = v.create(i & qt(v.BITS));
    if (r) {
      if (a !== $)
        throw new Error("invalid G1 point: non-empty, at infinity, with compression");
      return { x: $, y: $ };
    }
    const u = v.add(v.pow(a, ye), v.create(Tt.b));
    let l = v.sqrt(u);
    if (!l)
      throw new Error("invalid G1 point: compressed point");
    return l * st / c !== BigInt(e) && (l = v.neg(l)), { x: v.create(a), y: v.create(l) };
  } else if (s.length === 96 && !t) {
    const i = dt(s.subarray(0, o)), a = dt(s.subarray(o));
    if (r) {
      if (i !== $ || a !== $)
        throw new Error("G1: non-empty point at infinity");
      return D.G1.Point.ZERO.toAffine();
    }
    return { x: v.create(i), y: v.create(a) };
  } else
    throw new Error("invalid G1 point: expected 48/96 bytes");
}
function mn(n) {
  const { infinity: t, sort: r, value: e } = we(Mt("signatureHex", n, 48)), s = v.ORDER, o = D.G1.Point, c = dt(e);
  if (t)
    return o.ZERO;
  const i = v.create(c & qt(v.BITS)), a = v.add(v.pow(i, ye), v.create(Tt.b));
  let u = v.sqrt(a);
  if (!u)
    throw new Error("invalid G1 point: compressed");
  const l = BigInt(r);
  u * st / s !== l && (u = v.neg(u));
  const d = o.fromAffine({ x: i, y: u });
  return d.assertValidity(), d;
}
function As(n, t, r) {
  const { BYTES: e, ORDER: s } = v, o = t.is0(), { x: c, y: i } = t.toAffine();
  if (r) {
    if (o)
      return V(pe, j($, e));
    const a = !!(i.c1 === $ ? i.c0 * st / s : i.c1 * st / s);
    return V(Qt(j(c.c1, e), { compressed: true, sort: a }), j(c.c0, e));
  } else {
    if (o)
      return V(Uint8Array.of(64), new Uint8Array(4 * e - 1));
    const { re: a, im: u } = P.reim(c), { re: l, im: d } = P.reim(i);
    return V(j(u, e), j(a, e), j(d, e), j(l, e));
  }
}
function Ne(n) {
  n.assertValidity();
  const { BYTES: t } = v;
  if (n.is0())
    return V(pe, j($, t));
  const { x: r, y: e } = n.toAffine(), { re: s, im: o } = P.reim(r), { re: c, im: i } = P.reim(e), u = !!((i > $ ? i * st : c * st) / v.ORDER & he), l = s;
  return V(Qt(j(o, t), { sort: u, compressed: true }), j(l, t));
}
function Os(n) {
  const { BYTES: t, ORDER: r } = v, { compressed: e, infinity: s, sort: o, value: c } = we(n);
  if (!e && !s && o || // 00100000
  !e && s && o || // 01100000
  o && s && e)
    throw new Error("invalid encoding flag: " + (n[0] & 224));
  const i = (a, u, l) => dt(a.slice(u, l));
  if (c.length === 96 && e) {
    if (s) {
      if (c.reduce((m, g) => m !== 0 ? g + 1 : g, 0) > 0)
        throw new Error("invalid G2 point: compressed");
      return { x: P.ZERO, y: P.ZERO };
    }
    const a = i(c, 0, t), u = i(c, t, 2 * t), l = P.create({ c0: v.create(u), c1: v.create(a) }), d = P.add(P.pow(l, ye), Ce.b);
    let f = P.sqrt(d);
    const h = f.c1 === $ ? f.c0 * st / r : f.c1 * st / r ? he : $;
    return f = o && h > 0 ? f : P.neg(f), { x: l, y: f };
  } else if (c.length === 192 && !e) {
    if (s) {
      if (c.reduce((f, h) => f !== 0 ? h + 1 : h, 0) > 0)
        throw new Error("invalid G2 point: uncompressed");
      return { x: P.ZERO, y: P.ZERO };
    }
    const a = i(c, 0 * t, 1 * t), u = i(c, 1 * t, 2 * t), l = i(c, 2 * t, 3 * t), d = i(c, 3 * t, 4 * t);
    return { x: P.fromBigTuple([u, a]), y: P.fromBigTuple([d, l]) };
  } else
    throw new Error("invalid G2 point: expected 96/192 bytes");
}
function gn(n) {
  const { ORDER: t } = v, { infinity: r, sort: e, value: s } = we(Mt("signatureHex", n)), o = D.G2.Point, c = s.length / 2;
  if (c !== 48 && c !== 96)
    throw new Error("invalid compressed signature length, expected 96/192 bytes");
  const i = dt(s.slice(0, c)), a = dt(s.slice(c));
  if (r)
    return o.ZERO;
  const u = v.create(i & qt(v.BITS)), l = v.create(a), d = P.create({ c0: l, c1: u }), f = P.add(P.pow(d, ye), Ce.b);
  let h = P.sqrt(f);
  if (!h)
    throw new Error("Failed to find a square root");
  const { re: m, im: g } = P.reim(h), p = BigInt(e), T = g > $ && g * st / t !== p, R = g === $ && m * st / t !== p;
  (T || R) && (h = P.neg(h));
  const y = o.fromAffine({ x: d, y: h });
  return y.assertValidity(), y;
}
const D = bs({
  // Fields
  fields: {
    Fp: v,
    Fp2: P,
    Fp6: Bs,
    Fp12: k,
    Fr: Es
  },
  // G1: y² = x³ + 4
  G1: {
    ...Tt,
    Fp: v,
    htfDefaults: { ...Oe, m: 1, DST: "BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_" },
    wrapPrivateKey: true,
    allowInfinityPoint: true,
    // Checks is the point resides in prime-order subgroup.
    // point.isTorsionFree() should return true for valid points
    // It returns false for shitty points.
    // https://eprint.iacr.org/2021/1130.pdf
    isTorsionFree: (n, t) => {
      const r = BigInt("0x5f19672fdf76ce51ba69c6076a0f77eaddb3a93be6f89688de17d813620a00022e01fffffffefffe"), e = new n(v.mul(t.X, r), t.Y, t.Z);
      return t.multiplyUnsafe(St).negate().multiplyUnsafe(St).equals(e);
    },
    // Clear cofactor of G1
    // https://eprint.iacr.org/2019/403
    clearCofactor: (n, t) => t.multiplyUnsafe(St).add(t),
    mapToCurve: Rs,
    fromBytes: vs,
    toBytes: _s,
    ShortSignature: {
      fromBytes(n) {
        return J(n), mn(n);
      },
      fromHex(n) {
        return mn(n);
      },
      toBytes(n) {
        return Ie(n);
      },
      toRawBytes(n) {
        return Ie(n);
      },
      toHex(n) {
        return jt(Ie(n));
      }
    }
  },
  G2: {
    ...Ce,
    Fp: P,
    // https://datatracker.ietf.org/doc/html/rfc9380#name-clearing-the-cofactor
    // https://datatracker.ietf.org/doc/html/rfc9380#name-cofactor-clearing-for-bls12
    hEff: BigInt("0xbc69f08f2ee75b3584c6a0ea91b352888e2a8e9145ad7689986ff031508ffe1329c2f178731db956d82bf015d1212b02ec0ec69d7477c1ae954cbc06689f6a359894c0adebbf6b4e8020005aaa95551"),
    htfDefaults: { ...Oe },
    wrapPrivateKey: true,
    allowInfinityPoint: true,
    mapToCurve: Hs,
    // Checks is the point resides in prime-order subgroup.
    // point.isTorsionFree() should return true for valid points
    // It returns false for shitty points.
    // https://eprint.iacr.org/2021/1130.pdf
    // Older version: https://eprint.iacr.org/2019/814.pdf
    isTorsionFree: (n, t) => t.multiplyUnsafe(St).negate().equals(bn(n, t)),
    // Maps the point into the prime-order subgroup G2.
    // clear_cofactor_bls12381_g2 from RFC 9380.
    // https://eprint.iacr.org/2017/419.pdf
    // prettier-ignore
    clearCofactor: (n, t) => {
      const r = St;
      let e = t.multiplyUnsafe(r).negate(), s = bn(n, t), o = t.double();
      return o = Ss(n, o), o = o.subtract(s), s = e.add(s), s = s.multiplyUnsafe(r).negate(), o = o.add(s), o = o.subtract(e), o.subtract(t);
    },
    fromBytes: Os,
    toBytes: As,
    Signature: {
      fromBytes(n) {
        return J(n), gn(n);
      },
      fromHex(n) {
        return gn(n);
      },
      toBytes(n) {
        return Ne(n);
      },
      toRawBytes(n) {
        return Ne(n);
      },
      toHex(n) {
        return jt(Ne(n));
      }
    }
  },
  params: {
    ateLoopSize: St,
    // The BLS parameter x for BLS12-381
    r: Tt.n,
    // order; z⁴ − z² + 1; CURVE.n from other curves
    xNegative: true,
    twistType: "multiplicative"
  },
  htfDefaults: Oe
}), Is = tr(P, [
  // xNum
  [
    [
      "0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97d6",
      "0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97d6"
    ],
    [
      "0x0",
      "0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71a"
    ],
    [
      "0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71e",
      "0x8ab05f8bdd54cde190937e76bc3e447cc27c3d6fbd7063fcd104635a790520c0a395554e5c6aaaa9354ffffffffe38d"
    ],
    [
      "0x171d6541fa38ccfaed6dea691f5fb614cb14b4e7f4e810aa22d6108f142b85757098e38d0f671c7188e2aaaaaaaa5ed1",
      "0x0"
    ]
  ],
  // xDen
  [
    [
      "0x0",
      "0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa63"
    ],
    [
      "0xc",
      "0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa9f"
    ],
    ["0x1", "0x0"]
    // LAST 1
  ],
  // yNum
  [
    [
      "0x1530477c7ab4113b59a4c18b076d11930f7da5d4a07f649bf54439d87d27e500fc8c25ebf8c92f6812cfc71c71c6d706",
      "0x1530477c7ab4113b59a4c18b076d11930f7da5d4a07f649bf54439d87d27e500fc8c25ebf8c92f6812cfc71c71c6d706"
    ],
    [
      "0x0",
      "0x5c759507e8e333ebb5b7a9a47d7ed8532c52d39fd3a042a88b58423c50ae15d5c2638e343d9c71c6238aaaaaaaa97be"
    ],
    [
      "0x11560bf17baa99bc32126fced787c88f984f87adf7ae0c7f9a208c6b4f20a4181472aaa9cb8d555526a9ffffffffc71c",
      "0x8ab05f8bdd54cde190937e76bc3e447cc27c3d6fbd7063fcd104635a790520c0a395554e5c6aaaa9354ffffffffe38f"
    ],
    [
      "0x124c9ad43b6cf79bfbf7043de3811ad0761b0f37a1e26286b0e977c69aa274524e79097a56dc4bd9e1b371c71c718b10",
      "0x0"
    ]
  ],
  // yDen
  [
    [
      "0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa8fb",
      "0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa8fb"
    ],
    [
      "0x0",
      "0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffa9d3"
    ],
    [
      "0x12",
      "0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaa99"
    ],
    ["0x1", "0x0"]
    // LAST 1
  ]
].map((n) => n.map((t) => P.fromBigTuple(t.map(BigInt))))), Ns = tr(v, [
  // xNum
  [
    "0x11a05f2b1e833340b809101dd99815856b303e88a2d7005ff2627b56cdb4e2c85610c2d5f2e62d6eaeac1662734649b7",
    "0x17294ed3e943ab2f0588bab22147a81c7c17e75b2f6a8417f565e33c70d1e86b4838f2a6f318c356e834eef1b3cb83bb",
    "0xd54005db97678ec1d1048c5d10a9a1bce032473295983e56878e501ec68e25c958c3e3d2a09729fe0179f9dac9edcb0",
    "0x1778e7166fcc6db74e0609d307e55412d7f5e4656a8dbf25f1b33289f1b330835336e25ce3107193c5b388641d9b6861",
    "0xe99726a3199f4436642b4b3e4118e5499db995a1257fb3f086eeb65982fac18985a286f301e77c451154ce9ac8895d9",
    "0x1630c3250d7313ff01d1201bf7a74ab5db3cb17dd952799b9ed3ab9097e68f90a0870d2dcae73d19cd13c1c66f652983",
    "0xd6ed6553fe44d296a3726c38ae652bfb11586264f0f8ce19008e218f9c86b2a8da25128c1052ecaddd7f225a139ed84",
    "0x17b81e7701abdbe2e8743884d1117e53356de5ab275b4db1a682c62ef0f2753339b7c8f8c8f475af9ccb5618e3f0c88e",
    "0x80d3cf1f9a78fc47b90b33563be990dc43b756ce79f5574a2c596c928c5d1de4fa295f296b74e956d71986a8497e317",
    "0x169b1f8e1bcfa7c42e0c37515d138f22dd2ecb803a0c5c99676314baf4bb1b7fa3190b2edc0327797f241067be390c9e",
    "0x10321da079ce07e272d8ec09d2565b0dfa7dccdde6787f96d50af36003b14866f69b771f8c285decca67df3f1605fb7b",
    "0x6e08c248e260e70bd1e962381edee3d31d79d7e22c837bc23c0bf1bc24c6b68c24b1b80b64d391fa9c8ba2e8ba2d229"
  ],
  // xDen
  [
    "0x8ca8d548cff19ae18b2e62f4bd3fa6f01d5ef4ba35b48ba9c9588617fc8ac62b558d681be343df8993cf9fa40d21b1c",
    "0x12561a5deb559c4348b4711298e536367041e8ca0cf0800c0126c2588c48bf5713daa8846cb026e9e5c8276ec82b3bff",
    "0xb2962fe57a3225e8137e629bff2991f6f89416f5a718cd1fca64e00b11aceacd6a3d0967c94fedcfcc239ba5cb83e19",
    "0x3425581a58ae2fec83aafef7c40eb545b08243f16b1655154cca8abc28d6fd04976d5243eecf5c4130de8938dc62cd8",
    "0x13a8e162022914a80a6f1d5f43e7a07dffdfc759a12062bb8d6b44e833b306da9bd29ba81f35781d539d395b3532a21e",
    "0xe7355f8e4e667b955390f7f0506c6e9395735e9ce9cad4d0a43bcef24b8982f7400d24bc4228f11c02df9a29f6304a5",
    "0x772caacf16936190f3e0c63e0596721570f5799af53a1894e2e073062aede9cea73b3538f0de06cec2574496ee84a3a",
    "0x14a7ac2a9d64a8b230b3f5b074cf01996e7f63c21bca68a81996e1cdf9822c580fa5b9489d11e2d311f7d99bbdcc5a5e",
    "0xa10ecf6ada54f825e920b3dafc7a3cce07f8d1d7161366b74100da67f39883503826692abba43704776ec3a79a1d641",
    "0x95fc13ab9e92ad4476d6e3eb3a56680f682b4ee96f7d03776df533978f31c1593174e4b4b7865002d6384d168ecdd0a",
    "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
    // LAST 1
  ],
  // yNum
  [
    "0x90d97c81ba24ee0259d1f094980dcfa11ad138e48a869522b52af6c956543d3cd0c7aee9b3ba3c2be9845719707bb33",
    "0x134996a104ee5811d51036d776fb46831223e96c254f383d0f906343eb67ad34d6c56711962fa8bfe097e75a2e41c696",
    "0xcc786baa966e66f4a384c86a3b49942552e2d658a31ce2c344be4b91400da7d26d521628b00523b8dfe240c72de1f6",
    "0x1f86376e8981c217898751ad8746757d42aa7b90eeb791c09e4a3ec03251cf9de405aba9ec61deca6355c77b0e5f4cb",
    "0x8cc03fdefe0ff135caf4fe2a21529c4195536fbe3ce50b879833fd221351adc2ee7f8dc099040a841b6daecf2e8fedb",
    "0x16603fca40634b6a2211e11db8f0a6a074a7d0d4afadb7bd76505c3d3ad5544e203f6326c95a807299b23ab13633a5f0",
    "0x4ab0b9bcfac1bbcb2c977d027796b3ce75bb8ca2be184cb5231413c4d634f3747a87ac2460f415ec961f8855fe9d6f2",
    "0x987c8d5333ab86fde9926bd2ca6c674170a05bfe3bdd81ffd038da6c26c842642f64550fedfe935a15e4ca31870fb29",
    "0x9fc4018bd96684be88c9e221e4da1bb8f3abd16679dc26c1e8b6e6a1f20cabe69d65201c78607a360370e577bdba587",
    "0xe1bba7a1186bdb5223abde7ada14a23c42a0ca7915af6fe06985e7ed1e4d43b9b3f7055dd4eba6f2bafaaebca731c30",
    "0x19713e47937cd1be0dfd0b8f1d43fb93cd2fcbcb6caf493fd1183e416389e61031bf3a5cce3fbafce813711ad011c132",
    "0x18b46a908f36f6deb918c143fed2edcc523559b8aaf0c2462e6bfe7f911f643249d9cdf41b44d606ce07c8a4d0074d8e",
    "0xb182cac101b9399d155096004f53f447aa7b12a3426b08ec02710e807b4633f06c851c1919211f20d4c04f00b971ef8",
    "0x245a394ad1eca9b72fc00ae7be315dc757b3b080d4c158013e6632d3c40659cc6cf90ad1c232a6442d9d3f5db980133",
    "0x5c129645e44cf1102a159f748c4a3fc5e673d81d7e86568d9ab0f5d396a7ce46ba1049b6579afb7866b1e715475224b",
    "0x15e6be4e990f03ce4ea50b3b42df2eb5cb181d8f84965a3957add4fa95af01b2b665027efec01c7704b456be69c8b604"
  ],
  // yDen
  [
    "0x16112c4c3a9c98b252181140fad0eae9601a6de578980be6eec3232b5be72e7a07f3688ef60c206d01479253b03663c1",
    "0x1962d75c2381201e1a0cbd6c43c348b885c84ff731c4d59ca4a10356f453e01f78a4260763529e3532f6102c2e49a03d",
    "0x58df3306640da276faaae7d6e8eb15778c4855551ae7f310c35a5dd279cd2eca6757cd636f96f891e2538b53dbf67f2",
    "0x16b7d288798e5395f20d23bf89edb4d1d115c5dbddbcd30e123da489e726af41727364f2c28297ada8d26d98445f5416",
    "0xbe0e079545f43e4b00cc912f8228ddcc6d19c9f0f69bbb0542eda0fc9dec916a20b15dc0fd2ededda39142311a5001d",
    "0x8d9e5297186db2d9fb266eaac783182b70152c65550d881c5ecd87b6f0f5a6449f38db9dfa9cce202c6477faaf9b7ac",
    "0x166007c08a99db2fc3ba8734ace9824b5eecfdfa8d0cf8ef5dd365bc400a0051d5fa9c01a58b1fb93d1a1399126a775c",
    "0x16a3ef08be3ea7ea03bcddfabba6ff6ee5a4375efa1f4fd7feb34fd206357132b920f5b00801dee460ee415a15812ed9",
    "0x1866c8ed336c61231a1be54fd1d74cc4f9fb0ce4c6af5920abc5750c4bf39b4852cfe2f7bb9248836b233d9d55535d4a",
    "0x167a55cda70a6e1cea820597d94a84903216f763e13d87bb5308592e7ea7d4fbc7385ea3d529b35e346ef48bb8913f55",
    "0x4d2f259eea405bd48f010a01ad2911d9c6dd039bb61a6290e591b36e636a5c871a5c29f4f83060400f8b49cba8f6aa8",
    "0xaccbb67481d033ff5852c1e48c50c477f94ff8aefce42d28c0f9a88cea7913516f968986f7ebbea9684b529e2561092",
    "0xad6b9514c767fe3c3613144b45f1496543346d98adf02267d5ceef9a00d9b8693000763e3b90ac11e99b138573345cc",
    "0x2660400eb2e4f3b628bdd0d53cd76f2bf565b94e72927c1cb748df27942480e420517bd8714cc80d1fadc1326ed06f7",
    "0xe0fa1d816ddc03e6b24255e0d7819c171c40f65e273b853324efcd6356caa205ca2f570f13497804415473a1d634b8f",
    "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
    // LAST 1
  ]
].map((n) => n.map((t) => BigInt(t)))), Ts = nr(v, {
  A: v.create(BigInt("0x144698a3b8e9433d693a02c96d4982b0ea985383ee66a8d8e8981aefd881ac98936f8da0e0f97f5cf428082d584c1d")),
  B: v.create(BigInt("0x12e2908d11688030018b12e8753eee3b2016c1f0f24f4070a0b9c14fcef35ef55a23215a316ceaa5d1cc48e98e172be0")),
  Z: v.create(BigInt(11))
}), qs = nr(P, {
  A: P.create({ c0: v.create($), c1: v.create(BigInt(240)) }),
  // A' = 240 * I
  B: P.create({ c0: v.create(BigInt(1012)), c1: v.create(BigInt(1012)) }),
  // B' = 1012 * (1 + I)
  Z: P.create({ c0: v.create(BigInt(-2)), c1: v.create(BigInt(-1)) })
  // Z: -(2 + I)
});
function Rs(n) {
  const { x: t, y: r } = Ts(v.create(n[0]));
  return Ns(t, r);
}
function Hs(n) {
  const { x: t, y: r } = qs(P.fromBigTuple(n));
  return Is(t, r);
}
const Gs = BigInt(0), Vt = BigInt(1), Us = BigInt(2), Ls = BigInt(7), Ps = BigInt(256), ks = BigInt(113), rr = [], sr = [], or = [];
for (let n = 0, t = Vt, r = 1, e = 0; n < 24; n++) {
  [r, e] = [e, (2 * r + 3 * e) % 5], rr.push(2 * (5 * e + r)), sr.push((n + 1) * (n + 2) / 2 % 64);
  let s = Gs;
  for (let o = 0; o < 7; o++)
    t = (t << Vt ^ (t >> Ls) * ks) % Ps, t & Us && (s ^= Vt << (Vt << /* @__PURE__ */ BigInt(o)) - Vt);
  or.push(s);
}
const cr = Rn(or, true), Ds = cr[0], Zs = cr[1], yn = (n, t, r) => r > 32 ? Sr(n, t, r) : Er(n, t, r), pn = (n, t, r) => r > 32 ? _r(n, t, r) : Br(n, t, r);
function Ms(n, t = 24) {
  const r = new Uint32Array(10);
  for (let e = 24 - t; e < 24; e++) {
    for (let c = 0; c < 10; c++)
      r[c] = n[c] ^ n[c + 10] ^ n[c + 20] ^ n[c + 30] ^ n[c + 40];
    for (let c = 0; c < 10; c += 2) {
      const i = (c + 8) % 10, a = (c + 2) % 10, u = r[a], l = r[a + 1], d = yn(u, l, 1) ^ r[i], f = pn(u, l, 1) ^ r[i + 1];
      for (let h = 0; h < 50; h += 10)
        n[c + h] ^= d, n[c + h + 1] ^= f;
    }
    let s = n[2], o = n[3];
    for (let c = 0; c < 24; c++) {
      const i = sr[c], a = yn(s, o, i), u = pn(s, o, i), l = rr[c];
      s = n[l], o = n[l + 1], n[l] = a, n[l + 1] = u;
    }
    for (let c = 0; c < 50; c += 10) {
      for (let i = 0; i < 10; i++)
        r[i] = n[c + i];
      for (let i = 0; i < 10; i++)
        n[c + i] ^= ~r[(i + 2) % 10] & r[(i + 4) % 10];
    }
    n[0] ^= Ds[e], n[1] ^= Zs[e];
  }
  mt(r);
}
class je extends ke {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(t, r, e, s = false, o = 24) {
    if (super(), this.pos = 0, this.posOut = 0, this.finished = false, this.destroyed = false, this.enableXOF = false, this.blockLen = t, this.suffix = r, this.outputLen = e, this.enableXOF = s, this.rounds = o, Dt(e), !(0 < t && t < 200))
      throw new Error("only keccak-f1600 function is supported");
    this.state = new Uint8Array(200), this.state32 = dr(this.state);
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    ze(this.state32), Ms(this.state32, this.rounds), ze(this.state32), this.posOut = 0, this.pos = 0;
  }
  update(t) {
    Zt(this), t = Nt(t), J(t);
    const { blockLen: r, state: e } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const c = Math.min(r - this.pos, s - o);
      for (let i = 0; i < c; i++)
        e[this.pos++] ^= t[o++];
      this.pos === r && this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = true;
    const { state: t, suffix: r, pos: e, blockLen: s } = this;
    t[e] ^= r, (r & 128) !== 0 && e === s - 1 && this.keccak(), t[s - 1] ^= 128, this.keccak();
  }
  writeInto(t) {
    Zt(this, false), J(t), this.finish();
    const r = this.state, { blockLen: e } = this;
    for (let s = 0, o = t.length; s < o; ) {
      this.posOut >= e && this.keccak();
      const c = Math.min(e - this.posOut, o - s);
      t.set(r.subarray(this.posOut, this.posOut + c), s), this.posOut += c, s += c;
    }
    return t;
  }
  xofInto(t) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(t);
  }
  xof(t) {
    return Dt(t), this.xofInto(new Uint8Array(t));
  }
  digestInto(t) {
    if (In(t, this), this.finished)
      throw new Error("digest() was already called");
    return this.writeInto(t), this.destroy(), t;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = true, mt(this.state);
  }
  _cloneInto(t) {
    const { blockLen: r, suffix: e, outputLen: s, rounds: o, enableXOF: c } = this;
    return t || (t = new je(r, e, s, c, o)), t.state32.set(this.state32), t.pos = this.pos, t.posOut = this.posOut, t.finished = this.finished, t.rounds = o, t.suffix = e, t.outputLen = s, t.enableXOF = c, t.destroyed = this.destroyed, t;
  }
}
const Ks = (n, t, r) => mr((e = {}) => new je(t, n, e.dkLen === void 0 ? r : e.dkLen, true)), Fs = Ks(31, 136, 256 / 8);
function Vs(n, t, r) {
  return Pe(n), r === void 0 && (r = new Uint8Array(n.outputLen)), Fe(n, Nt(r), Nt(t));
}
const Te = /* @__PURE__ */ Uint8Array.from([0]), wn = /* @__PURE__ */ Uint8Array.of();
function Cs(n, t, r, e = 32) {
  Pe(n), Dt(e);
  const s = n.outputLen;
  if (e > 255 * s)
    throw new Error("Length should be <= 255*HashLen");
  const o = Math.ceil(e / s);
  r === void 0 && (r = wn);
  const c = new Uint8Array(o * s), i = Fe.create(n, t), a = i._cloneInto(), u = new Uint8Array(i.outputLen);
  for (let l = 0; l < o; l++)
    Te[0] = l + 1, a.update(l === 0 ? wn : u).update(r).update(Te).digestInto(u), c.set(u, s * l), i._cloneInto(a);
  return i.destroy(), a.destroy(), mt(u, Te), c.slice(0, e);
}
const js = (n, t, r, e, s) => Cs(n, Vs(n, t, r), e, s), Ys = Un, it = 48, rt = 96;
const _Ge = class _Ge {
  /**
   * @internal constructor
   */
  constructor(t) {
    __privateAdd(this, _t2);
    __privateAdd(this, _e2);
    __privateSet(this, _t2, t);
    const r = D.G1.ProjectivePoint.fromPrivateKey(__privateGet(this, _t2));
    __privateSet(this, _e2, r);
  }
  /**
   * Create a random transport secret key
   */
  static random() {
    return new _Ge(D.utils.randomPrivateKey());
  }
  /**
   * Deserialize TransportSecretKey from a bytestring
   *
   * The passed value would typically be a string previously returned
   * by calling serialize on a randomly-created TransportSecretKey.
   */
  static deserialize(t) {
    if (t.length !== 32)
      throw new Error("Invalid size for transport secret key");
    return new _Ge(t);
  }
  /**
   * Return the encoding of the transport public key; this value is
   * sent to the IC
   */
  publicKeyBytes() {
    return __privateGet(this, _e2).toRawBytes(true);
  }
  /**
   * Return the transport secret key value
   *
   * Applications would not normally need to call this
   */
  serialize() {
    return __privateGet(this, _t2);
  }
};
_t2 = new WeakMap();
_e2 = new WeakMap();
let Ge = _Ge;
function ro(n) {
  if (n.length != 48)
    return false;
  try {
    return D.G1.ProjectivePoint.fromHex(n), true;
  } catch {
    return false;
  }
}
function It(n) {
  let t = n.length;
  const r = new Uint8Array(8 + t);
  for (let e = 7; e >= 0; e--)
    r[e] = t & 255, t >>>= 8;
  return r.set(n, 8), r;
}
var zs = /* @__PURE__ */ ((n) => (n.KEY_1 = "key_1", n.TEST_KEY_1 = "test_key_1", n))(zs || {});
function xn(n) {
  const t = new Uint8Array(n.length / 2);
  for (let r = 0; r < n.length; r += 2)
    t[r / 2] = parseInt(n.substring(r, r + 2), 16);
  return t;
}
const _ce = class _ce {
  /**
   * @internal constructor
   */
  constructor(t) {
    __privateAdd(this, _t3);
    __privateSet(this, _t3, t);
  }
  /**
   * Read a MasterPublicKey from the bytestring encoding
   *
   * Normally the bytes provided here will have been returned by
   * the `vetkd_public_key` management canister interface.
   */
  static deserialize(t) {
    return new _ce(D.G2.ProjectivePoint.fromHex(t));
  }
  /**
   * Derive a canister master key from the subnet master key
   *
   * To create the derived public key in VetKD, a two step derivation is performed. The first step
   * creates a key that is specific to the canister that is making VetKD requests to the
   * management canister, sometimes called canister master key.
   *
   * This function can be used to compute canister master keys knowing just the subnet master key
   * plus the canister identity. This avoids having to interact with the IC for performing this
   * computation.
   */
  deriveCanisterKey(t) {
    const r = "ic-vetkd-bls12-381-g2-canister-id", e = this.publicKeyBytes(), s = new Uint8Array([
      ...It(e),
      ...It(t)
    ]), o = Ye(s, r), c = D.G2.ProjectivePoint.BASE.multiply(o);
    return new Xt(__privateGet(this, _t3).add(c));
  }
  /**
   * Return the bytestring encoding of the master public key
   */
  publicKeyBytes() {
    return __privateGet(this, _t3).toRawBytes(true);
  }
  /**
   * Return the hardcoded master public key used on IC
   *
   * This allows performing public key derivation offline
   */
  static productionKey(t = "key_1") {
    if (t == "key_1")
      return _ce.deserialize(
        xn(
          "a9caf9ae8af0c7c7272f8a122133e2e0c7c0899b75e502bda9e109ca8193ded3ef042ed96db1125e1bdaad77d8cc60d917e122fe2501c45b96274f43705edf0cfd455bc66c3c060faa2fcd15486e76351edf91fecb993797273bbc8beaa47404"
        )
      );
    if (t == "test_key_1")
      return _ce.deserialize(
        xn(
          "ad86e8ff845912f022a0838a502d763fdea547c9948f8cb20ea7738dd52c1c38dcb4c6ca9ac29f9ac690fc5ad7681cb41922b8dffbd65d94bff141f5fb5b6624eccc03bf850f222052df888cf9b1e47203556d7522271cbb879b2ef4b8c2bfb1"
        )
      );
    throw new Error(
      "Unknown MasterPublicKeyId value for productionKey"
    );
  }
};
_t3 = new WeakMap();
let ce = _ce;
const _Xt = class _Xt {
  /**
   * @internal constructor
   *
   * This is public for typing reasons but there should be no need
   * for an application to call this.
   */
  constructor(t) {
    __privateAdd(this, _t4);
    __privateSet(this, _t4, t);
  }
  /**
   * Read a DerivedPublicKey from the bytestring encoding
   *
   * Normally the bytes provided here will have been returned by
   * the `vetkd_public_key` management canister interface.
   */
  static deserialize(t) {
    return new _Xt(
      D.G2.ProjectivePoint.fromHex(t)
    );
  }
  /**
   * Perform second-stage derivation of a public key
   *
   * To create the derived public key in VetKD, a two step derivation is performed. The first step
   * creates a key that is specific to the canister that is making VetKD requests to the
   * management canister, sometimes called canister master key. The second step incorporates the
   * "derivation context" value provided to the `vetkd_public_key` management canister interface.
   *
   * If `vetkd_public_key` is invoked with an empty derivation context, it simply returns the
   * canister master key. Then the second derivation step can be done offline, using this
   * function. This is useful if you wish to derive multiple keys without having to interact with
   * the IC each time.
   *
   * If `context` is empty, then this simply returns the underlying key. This matches the behavior
   * of `vetkd_public_key`
   */
  deriveSubKey(t) {
    if (t.length === 0)
      return this;
    {
      const r = "ic-vetkd-bls12-381-g2-context", e = this.publicKeyBytes(), s = new Uint8Array([
        ...It(e),
        ...It(t)
      ]), o = Ye(s, r), c = D.G2.ProjectivePoint.BASE.multiply(o);
      return new _Xt(this.getPoint().add(c));
    }
  }
  /**
   * Return the bytestring encoding of the derived public key
   *
   * Applications would not normally need to call this, unless they
   * are using VetKD for creating a random beacon, in which case
   * these bytes are used by anyone verifying the beacon.
   */
  publicKeyBytes() {
    return __privateGet(this, _t4).toRawBytes(true);
  }
  /**
   * @internal getter returning the point element of the derived public key
   *
   * Applications would not normally need to call this
   */
  getPoint() {
    return __privateGet(this, _t4);
  }
};
_t4 = new WeakMap();
let Xt = _Xt;
function Ye(n, t) {
  const r = {
    p: D.params.r,
    m: 1,
    DST: t
  }, e = Object.assign(
    {},
    // @ts-expect-error (https://github.com/paulmillr/noble-curves/issues/179)
    D.G2.CURVE.htfDefaults,
    r
  );
  return oe(n, 1, e)[0][0];
}
function En(n) {
  return typeof n == "string" ? new TextEncoder().encode(n) : n;
}
function Jt(n, t, r) {
  const e = new Uint8Array();
  return js(Ys, n, e, t, r);
}
function $s(n, t) {
  const r = "BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_AUG_", e = n.publicKeyBytes(), s = new Uint8Array([...e, ...t]);
  return D.G1.ProjectivePoint.fromAffine(
    D.G1.hashToCurve(s, {
      DST: r
    }).toAffine()
  );
}
function ir(n, t, r) {
  const e = n.publicKeyBytes(), s = new Uint8Array([...e, ...t]), c = Object.assign(
    {},
    // @ts-expect-error (https://github.com/paulmillr/noble-curves/issues/179)
    D.G1.CURVE.htfDefaults,
    {
      DST: "BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_AUG_"
    }
  );
  return D.verifyShortSignature(
    r,
    s,
    n.getPoint(),
    c
  );
}
const _xe = class _xe {
  /**
   * @internal constructor
   *
   * This is public for typing reasons but there is no reason for an application
   * to call this constructor.
   */
  constructor(t) {
    __privateAdd(this, _t5);
    __privateAdd(this, _e3);
    __privateSet(this, _t5, t), __privateSet(this, _e3, t.toRawBytes(true));
  }
  /**
   * Return the VetKey bytes, aka the BLS signature
   *
   * Use the raw bytes only if your design makes use of the fact that VetKeys
   * are BLS signatures (eg for random beacon or threshold BLS signature
   * generation). If you are using VetKD for key distribution, instead use
   * deriveSymmetricKey or asHkdfCryptoKey
   */
  signatureBytes() {
    return __privateGet(this, _e3);
  }
  /**
   * Return the serialization of the VetKey
   *
   * This is the byte encoding of the unencrypted VetKey.
   */
  serialize() {
    return __privateGet(this, _e3);
  }
  /**
   * Derive a symmetric key of the requested length from the VetKey
   *
   * As an alternative to this function consider using asDerivedKeyMaterial,
   * which uses the WebCrypto API and prevents export of the underlying key.
   *
   * The `domainSep` parameter should be a string unique to your application and
   * also your usage of the resulting key. For example say your application
   * "my-app" is deriving two keys, one for usage "foo" and the other for
   * "bar". You might use as domain separators "my-app-foo" and "my-app-bar".
   *
   * The returned Uint8Array will be `outputLength` bytes long.
   */
  deriveSymmetricKey(t, r) {
    return Jt(__privateGet(this, _e3), t, r);
  }
  /**
   * Return a DerivedKeyMaterial type which is suitable for further key derivation
   */
  async asDerivedKeyMaterial() {
    return be.setup(__privateGet(this, _e3));
  }
  /**
   * Deserialize a VetKey from the 48 byte encoding of the BLS signature
   *
   * This deserializes the same value as returned by serialize (or signatureBytes)
   */
  static deserialize(t) {
    return new _xe(D.G1.ProjectivePoint.fromHex(t));
  }
  /**
   * @internal getter returning the point object of the VetKey
   *
   * Applications would not usually need to call this
   */
  getPoint() {
    return __privateGet(this, _t5);
  }
};
_t5 = new WeakMap();
_e3 = new WeakMap();
let xe = _xe;
const se = 12;
const _be = class _be {
  /**
   * @internal constructor
   */
  constructor(t) {
    __privateAdd(this, _t6);
    __privateSet(this, _t6, t);
  }
  static fromCryptoKey(t) {
    return new _be(t);
  }
  /**
   * @internal constructor
   */
  static async setup(t) {
    const e = await globalThis.crypto.subtle.importKey(
      "raw",
      t,
      "HKDF",
      false,
      ["deriveKey"]
    );
    return new _be(e);
  }
  /**
   * Return the CryptoKey
   */
  getCryptoKey() {
    return __privateGet(this, _t6);
  }
  /**
   * Return a WebCrypto CryptoKey handle suitable for AES-GCM encryption/decryption
   *
   * The key is derived using HKDF with the provided domain separator
   *
   * The CryptoKey is not exportable
   */
  async deriveAesGcmCryptoKey(t) {
    const e = {
      name: "HKDF",
      hash: "SHA-256",
      length: 256,
      info: En(t),
      salt: new Uint8Array()
    }, s = {
      name: "AES-GCM",
      length: 256
    };
    return globalThis.crypto.subtle.deriveKey(
      e,
      __privateGet(this, _t6),
      s,
      false,
      ["encrypt", "decrypt"]
    );
  }
  /**
   * Encrypt the provided message using AES-GCM and a key derived using HKDF
   *
   * The GCM key is derived using HKDF with the provided domain separator
   */
  async encryptMessage(t, r) {
    const e = await this.deriveAesGcmCryptoKey(r), s = globalThis.crypto.getRandomValues(
      new Uint8Array(se)
    ), o = new Uint8Array(
      await globalThis.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: s },
        e,
        En(t)
      )
    );
    return new Uint8Array([...s, ...o]);
  }
  /**
   * Decrypt the provided ciphertext using AES-GCM and a key derived using HKDF
   *
   * The GCM key is derived using HKDF with the provided domain separator
   */
  async decryptMessage(t, r) {
    if (t.length < se + 16)
      throw new Error(
        "Invalid ciphertext, too short to possibly be valid"
      );
    const s = t.slice(0, se), o = t.slice(se), c = await this.deriveAesGcmCryptoKey(r);
    try {
      const i = await globalThis.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: s },
        c,
        o
      );
      return new Uint8Array(i);
    } catch {
      throw new Error("Decryption failed");
    }
  }
};
_t6 = new WeakMap();
let be = _be;
const _ar = class _ar {
  /**
   * @internal constructor
   */
  constructor(t, r, e) {
    __privateAdd(this, _t7);
    __privateAdd(this, _e4);
    __privateAdd(this, _n2);
    __privateSet(this, _t7, t), __privateSet(this, _e4, r), __privateSet(this, _n2, e);
  }
  /**
   * Parse an encrypted key returned by the `vetkd_derive_encrypted_key`
   * managment canister interface
   */
  static deserialize(t) {
    if (t.length !== it + rt + it)
      throw new Error("Invalid EncryptedVetKey serialization");
    const r = D.G1.ProjectivePoint.fromHex(
      t.subarray(0, it)
    ), e = D.G2.ProjectivePoint.fromHex(
      t.subarray(it, it + rt)
    ), s = D.G1.ProjectivePoint.fromHex(
      t.subarray(it + rt)
    );
    return new _ar(r, e, s);
  }
  /**
   * Decrypt the encrypted key returning a VetKey
   */
  decryptAndVerify(t, r, e) {
    const s = D.G1.ProjectivePoint.BASE, o = D.G2.ProjectivePoint.BASE.negate(), c = D.fields.Fp12.ONE, i = D.pairingBatch([
      { g1: __privateGet(this, _t7), g2: o },
      { g1: s, g2: __privateGet(this, _e4) }
    ]);
    if (!D.fields.Fp12.eql(i, c))
      throw new Error("Invalid VetKey");
    const a = __privateGet(this, _n2).subtract(
      __privateGet(this, _t7).multiply(
        D.G1.normPrivateKeyToScalar(t.serialize())
      )
    );
    if (ir(r, e, a))
      return new xe(a);
    throw new Error("Invalid VetKey");
  }
};
_t7 = new WeakMap();
_e4 = new WeakMap();
_n2 = new WeakMap();
let ar = _ar;
const Bn = new Uint8Array([
  73,
  67,
  32,
  73,
  66,
  69,
  0,
  1
]), Et = 8;
function Sn(n, t, r) {
  const e = new Uint8Array([...n, ...t, ...r]);
  return Ye(
    e,
    "ic-vetkd-bls12-381-ibe-hash-to-mask"
    /* HashToMask */
  );
}
function fr(n, t) {
  if (n.length !== t.length)
    throw new Error("xorBuf arguments should have the same length");
  const r = new Uint8Array(n.length);
  for (let e = 0; e < n.length; e++)
    r[e] = n[e] ^ t[e];
  return r;
}
function _n(n, t) {
  if (t.length !== 576)
    throw new Error("Unexpected size for Gt element");
  const r = Jt(
    t,
    "ic-vetkd-bls12-381-ibe-mask-seed",
    n.length
  );
  return fr(r, n);
}
function vn(n, t) {
  const r = "ic-vetkd-bls12-381-ibe-mask-msg-".concat(
    n.length.toString().padStart(20, "0")
  ), e = Jt(t, r, 32), s = Fs(e, { dkLen: n.length });
  return fr(n, s);
}
function An(n) {
  const t = D.fields.Fp12.toBytes(n), r = new Uint8Array(576), e = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  for (let s = 0; s < 12; ++s)
    for (let o = 0; o < 48; ++o)
      r[48 * s + o] = t[48 * e[s] + o];
  return r;
}
function On(n, t) {
  if (n.length !== t.length)
    return false;
  let r = 0;
  for (let e = 0; e < n.length; ++e)
    r |= n[e] ^ t[e];
  return r == 0;
}
const _ie = class _ie {
  constructor(t) {
    __privateAdd(this, _t8);
    __privateSet(this, _t8, t);
  }
  /**
   * Create an identity from a byte string
   */
  static fromBytes(t) {
    return new _ie(t);
  }
  /**
   * Create an identity from a string
   */
  static fromString(t) {
    return _ie.fromBytes(new TextEncoder().encode(t));
  }
  /**
   * Create an identity from a Principal
   */
  static fromPrincipal(t) {
    return _ie.fromBytes(t.toUint8Array());
  }
  /**
   * @internal getter returning the encoded
   */
  getBytes() {
    return __privateGet(this, _t8);
  }
};
_t8 = new WeakMap();
let ie = _ie;
const _t = 32;
const _ae = class _ae {
  constructor(t) {
    __privateAdd(this, _t9);
    if (t.length !== _t)
      throw new Error("IBE seed must be exactly IBE_SEED_BYTES long");
    __privateSet(this, _t9, t);
  }
  /**
   * Create a seed for IBE encryption from a byte string
   *
   * This input should be randomly chosen by a secure random number generator.
   * If the seed is not securely generated the IBE scheme will be insecure.
   *
   * At least 128 bits (16 bytes) must be provided.
   *
   * If the input is exactly 256 bits it is used directly. Otherwise the input
   * is hashed with HKDF to produce a 256 bit seed.
   */
  static fromBytes(t) {
    if (t.length < 16)
      throw new Error(
        "Insufficient input material for IbeSeed derivation"
      );
    return t.length == _t ? new _ae(t) : new _ae(
      Jt(
        t,
        "ic-vetkd-bls12-381-ibe-hash-seed",
        _t
      )
    );
  }
  /**
   * Create a random seed for IBE encryption
   */
  static random() {
    return new _ae(
      globalThis.crypto.getRandomValues(new Uint8Array(_t))
    );
  }
  /**
   * @internal getter returning the seed bytes
   */
  getBytes() {
    return __privateGet(this, _t9);
  }
};
_t9 = new WeakMap();
let ae = _ae;
const qe = Et + _t + rt;
const _Ue = class _Ue {
  /**
   * Private constructor
   */
  constructor(t, r, e, s) {
    __privateAdd(this, _t10);
    __privateAdd(this, _e5);
    __privateAdd(this, _n3);
    __privateAdd(this, _r2);
    __privateSet(this, _t10, t), __privateSet(this, _e5, r), __privateSet(this, _n3, e), __privateSet(this, _r2, s);
  }
  /**
   * Helper function for determining the size of an IBE ciphertext in bytes.
   */
  static ciphertextSize(t) {
    if (t < 0)
      throw new Error(
        "IbeCiphertext.ciphertextSize argument cannot be negative"
      );
    return t + qe;
  }
  /**
   * Helper function for determining the size of an IBE plaintext in bytes.
   */
  static plaintextSize(t) {
    if (t < qe)
      throw new Error(
        "IbeCiphertext.plaintextSize given ciphertext size is too small to be valid"
      );
    return t - qe;
  }
  /**
   * Serialize the IBE ciphertext to a bytestring
   */
  serialize() {
    const t = __privateGet(this, _e5).toRawBytes(true);
    return new Uint8Array([
      ...__privateGet(this, _t10),
      ...t,
      ...__privateGet(this, _n3),
      ...__privateGet(this, _r2)
    ]);
  }
  /**
   * Deserialize an IBE ciphertext
   */
  static deserialize(t) {
    if (t.length < Et + rt + _t)
      throw new Error("Invalid IBE ciphertext");
    const r = t.subarray(0, Et), e = D.G2.ProjectivePoint.fromHex(
      t.subarray(Et, Et + rt)
    ), s = t.subarray(
      Et + rt,
      Et + rt + _t
    ), o = t.subarray(Et + rt + _t);
    if (!On(r, Bn))
      throw new Error("Unexpected header for IBE ciphertext");
    return new _Ue(r, e, s, o);
  }
  /**
   * Encrypt a message using IBE, returning the ciphertext
   *
   * Any user who is able to retrieve the VetKey for the specified derived public key and
   * identity will be able to decrypt this message.
   *
   * There is no fixed upper bound on the size of the message that can be encrypted using
   * this scheme. However, internally during the encryption process several heap allocations
   * are performed which are approximately the same length as the message itself, so
   * encrypting or decrypting very large messages may result in memory allocation errors.
   *
   * If you anticipate using IBE to encrypt very large messages, consider using IBE just to
   * encrypt a symmetric key, and then using a standard cipher such as AES-GCM to encrypt the
   * data.
   *
   * The seed parameter must be a randomly generated value that was generated just for this
   * one message. Using it for a second message, or for any other purpose, compromises the
   * security of the IBE scheme.
   */
  static encrypt(t, r, e, s) {
    const o = Bn, c = Sn(o, s.getBytes(), e), i = $s(t, r.getBytes()), a = D.fields.Fp12.pow(
      D.pairing(i, t.getPoint()),
      c
    ), u = D.G2.ProjectivePoint.BASE.multiply(c), l = _n(s.getBytes(), An(a)), d = vn(e, s.getBytes());
    return new _Ue(o, u, l, d);
  }
  /**
   * Decrypt an IBE ciphertext, returning the message
   *
   * There is no fixed upper bound on the size of the message that can be encrypted using
   * this scheme. However, internally during the encryption process several heap allocations
   * are performed which are approximately the same length as the message itself, so
   * encrypting or decrypting very large messages may result in memory allocation errors.
   */
  decrypt(t) {
    const r = _n(
      __privateGet(this, _n3),
      An(D.pairing(t.getPoint(), __privateGet(this, _e5)))
    ), e = vn(__privateGet(this, _r2), r), s = Sn(__privateGet(this, _t10), r, e);
    if (On(
      D.G2.ProjectivePoint.BASE.multiply(s).toRawBytes(true),
      __privateGet(this, _e5).toRawBytes(true)
    ))
      return e;
    throw new Error("Decryption failed");
  }
};
_t10 = new WeakMap();
_e5 = new WeakMap();
_n3 = new WeakMap();
_r2 = new WeakMap();
let Ue = _Ue;
const Xs = 32;
const _Le = class _Le {
  /**
   * Private constructor
   */
  constructor(t, r, e) {
    __privateAdd(this, _t11);
    __privateAdd(this, _e6);
    __privateAdd(this, _n4);
    __privateAdd(this, _r3);
    __privateSet(this, _t11, t), __privateSet(this, _e6, r), __privateSet(this, _n4, e), __privateSet(this, _r3, _Le.computeVrfHash(t, r, e));
  }
  static computeVrfHash(t, r, e) {
    const s = new Uint8Array([
      ...It(t.serialize()),
      ...It(r.publicKeyBytes()),
      ...It(e)
    ]);
    return Jt(
      s,
      "ic-vetkd-bls12-381-g2-vrf",
      Xs
    );
  }
  /**
   * Serialize a VrfOutput to a byte string
   */
  serialize() {
    return new Uint8Array([
      ...__privateGet(this, _t11).serialize(),
      ...__privateGet(this, _e6).publicKeyBytes(),
      ...__privateGet(this, _n4)
    ]);
  }
  /**
   * Deserialize and verify a VrfOutput
   *
   * Note this verifies the VrfOutput with respect to the derived public key
   * and VRF input which are included in the struct. It is the responsibility
   * of the application to examine the return value of `publicKey` and `input`
   * and ensure these values make sense in the context where this VRF is being
   * used.
   */
  static deserialize(t) {
    if (t.length < it + rt)
      throw new Error(
        "VrfOutput.deserialize input too short to possibly be valid"
      );
    const r = xe.deserialize(t.slice(0, it)), e = Xt.deserialize(
      t.slice(it, it + rt)
    ), s = t.slice(it + rt);
    if (!ir(e, s, r.getPoint()))
      throw new Error("VrfOutput.deserialize proof is invalid");
    return new _Le(r, e, s);
  }
  /**
   * Return the public key under which this VRF output was derived
   */
  publicKey() {
    return __privateGet(this, _e6);
  }
  /**
   * Return the input that was used to create this VRF output
   */
  input() {
    return __privateGet(this, _n4);
  }
  /**
   * Return the VRF output
   *
   * This is a random-looking value which was provably generated by some party with
   * access to the VRF secret key.
   */
  output() {
    return __privateGet(this, _r3);
  }
};
_t11 = new WeakMap();
_e6 = new WeakMap();
_n4 = new WeakMap();
_r3 = new WeakMap();
let Le = _Le;
export {
  be as DerivedKeyMaterial,
  Xt as DerivedPublicKey,
  ar as EncryptedVetKey,
  Ue as IbeCiphertext,
  ie as IbeIdentity,
  ae as IbeSeed,
  ce as MasterPublicKey,
  zs as MasterPublicKeyId,
  Ge as TransportSecretKey,
  xe as VetKey,
  Le as VrfOutput,
  $s as augmentedHashToG1,
  Jt as deriveSymmetricKey,
  Ye as hashToScalar,
  ro as isValidTransportPublicKey,
  ir as verifyBlsSignature
};
