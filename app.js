import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const TOYS = [
  { id: "classic-plug", name: "Classic plug", blurb: "Teardrop bulb, narrow neck, flared base.", icon: "\u25cf", anal: true, moldable: true, defaults: { insertable: 75, maxDia: 28, neckDia: 16, baseDia: 50, baseThick: 8, tip: 6, curve: 0, beads: 1 } },
  { id: "taper-plug", name: "Long taper", blurb: "Slow cone into a short neck. Easier first insert.", icon: "\u25b2", anal: true, moldable: true, defaults: { insertable: 90, maxDia: 30, neckDia: 17, baseDia: 52, baseThick: 8, tip: 4, curve: 0, beads: 1 } },
  { id: "beaded-plug", name: "Beaded plug", blurb: "Two or three bulbs plus a retrieval flare.", icon: "\u25ce", anal: true, moldable: true, defaults: { insertable: 95, maxDia: 27, neckDia: 15, baseDia: 50, baseThick: 8, tip: 5, curve: 0, beads: 3 } },
  { id: "curved-plug", name: "Curved P-spot", blurb: "Bent shaft, fat head, mandatory flare.", icon: "\u2937", anal: true, moldable: false, defaults: { insertable: 85, maxDia: 29, neckDia: 16, baseDia: 54, baseThick: 9, tip: 7, curve: 28, beads: 1 } },
  { id: "straight-dildo", name: "Straight shaft", blurb: "Rounded tip, gentle taper. Base optional unless anal.", icon: "\u2502", anal: false, moldable: true, defaults: { insertable: 140, maxDia: 32, neckDia: 28, baseDia: 55, baseThick: 10, tip: 8, curve: 0, beads: 1 } }
];

const PRESETS = {
  starter: { label: "Starter", insertable: 70, maxDia: 25, neckDia: 14 },
  regular: { label: "Regular", insertable: 85, maxDia: 32, neckDia: 18 },
  large: { label: "Large", insertable: 110, maxDia: 42, neckDia: 22 }
};

const state = {
  step: 0, product: "solid", toy: TOYS[0], anal: true,
  insertable: 75, maxDia: 28, neckDia: 16, baseDia: 50, baseThick: 8,
  tip: 6, curve: 0, beads: 1, wall: 3.6, iceHandle: true, preset: "starter",
  checks: { material: false, finish: false, base: false, adult: false, ice: false }
};

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { return t * t * (3 - 2 * t); }
function minBaseDia() { return Math.max(state.maxDia * 1.35 + 8, state.maxDia + 16, 38); }

function enforceSafety() {
  if (state.anal) {
    state.baseDia = Math.max(state.baseDia, minBaseDia());
    state.neckDia = clamp(state.neckDia, 10, state.maxDia * 0.78);
  } else {
    state.neckDia = clamp(state.neckDia, 12, state.maxDia);
  }
  state.tip = clamp(state.tip, 3, state.maxDia * 0.45);
  state.baseThick = clamp(state.baseThick, 6, 16);
  state.wall = clamp(state.wall, 2.4, 6);
  if (state.product === "ice-mold" && !state.toy.moldable) applyToy(TOYS[0]);
}

function applyToy(toy) {
  state.toy = toy;
  state.anal = toy.anal;
  Object.assign(state, toy.defaults);
  if (toy.id === "beaded-plug") state.beads = 3;
  enforceSafety();
}

function applyPreset(key) {
  state.preset = key;
  const p = PRESETS[key];
  state.insertable = p.insertable;
  state.maxDia = p.maxDia;
  state.neckDia = p.neckDia;
  if (state.toy.id === "straight-dildo") state.insertable = Math.round(p.insertable * 1.4);
  enforceSafety();
  state.baseDia = Math.max(state.baseDia, minBaseDia());
}

function plugRadius(z, total, maxR, neckR, tipR, kind, beads) {
  const t = clamp(z / total, 0, 1);
  if (kind === "taper-plug") {
    if (t < 0.78) return lerp(tipR, maxR, Math.pow(t / 0.78, 0.85));
    if (t < 0.88) return lerp(maxR, neckR, smooth((t - 0.78) / 0.10));
    return neckR;
  }
  if (kind === "beaded-plug") {
    const n = clamp(beads | 0, 2, 4);
    const usable = 0.86, each = usable / n;
    if (t >= usable) return neckR;
    const i = Math.min(n - 1, Math.floor(t / each));
    const local = (t - i * each) / each, mid = 0.45;
    const amp = (i === n - 1) ? maxR : lerp(maxR * 0.72, maxR, i / (n - 1));
    const valley = neckR;
    if (local < mid) return lerp(i === 0 ? tipR : valley, amp, smooth(local / mid));
    return lerp(amp, valley, smooth((local - mid) / (1 - mid)));
  }
  if (kind === "straight-dildo") {
    if (t < 0.08) return lerp(tipR * 0.35, tipR, t / 0.08);
    if (t < 0.22) return lerp(tipR, maxR, smooth((t - 0.08) / 0.14));
    if (t < 0.88) return lerp(maxR, neckR, (t - 0.22) / 0.66 * 0.25);
    return lerp(lerp(maxR, neckR, 0.25), neckR, (t - 0.88) / 0.12);
  }
  if (t < 0.07) return lerp(0.4, tipR, t / 0.07);
  if (t < 0.42) return lerp(tipR, maxR, smooth((t - 0.07) / 0.35));
  if (t < 0.58) return maxR;
  if (t < 0.78) return lerp(maxR, neckR, smooth((t - 0.58) / 0.20));
  return neckR;
}

function parallelTransport(tangents) {
  const frames = [];
  let n = new THREE.Vector3(0, 0, 1);
  if (Math.abs(tangents[0].dot(n)) > 0.9) n.set(1, 0, 0);
  let b = new THREE.Vector3().crossVectors(tangents[0], n).normalize();
  n = new THREE.Vector3().crossVectors(b, tangents[0]).normalize();
  frames.push({ n: n.clone(), b: b.clone() });
  for (let i = 1; i < tangents.length; i++) {
    const t0 = tangents[i - 1], t1 = tangents[i];
    const axis = new THREE.Vector3().crossVectors(t0, t1);
    if (axis.lengthSq() < 1e-10) { frames.push({ n: n.clone(), b: b.clone() }); continue; }
    axis.normalize();
    const angle = Math.acos(clamp(t0.dot(t1), -1, 1));
    n.applyAxisAngle(axis, angle).normalize();
    b = new THREE.Vector3().crossVectors(n, t1).normalize().multiplyScalar(-1);
    n = new THREE.Vector3().crossVectors(t1, b).normalize();
    frames.push({ n: n.clone(), b: b.clone() });
  }
  return frames;
}

class MeshBuf {
  constructor() { this.p = []; this.idx = []; }
  vert(x, y, z) { this.p.push(x, y, z); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  finish(extra = {}) {
    const pos = new Float32Array(this.p);
    const nrm = new Float32Array(pos.length);
    const indices = new Uint32Array(this.idx);
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
      const ax = pos[ia], ay = pos[ia + 1], az = pos[ia + 2];
      const bx = pos[ib], by = pos[ib + 1], bz = pos[ib + 2];
      const cx = pos[ic], cy = pos[ic + 1], cz = pos[ic + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      nrm[ia] += nx; nrm[ia + 1] += ny; nrm[ia + 2] += nz;
      nrm[ib] += nx; nrm[ib + 1] += ny; nrm[ib + 2] += nz;
      nrm[ic] += nx; nrm[ic + 1] += ny; nrm[ic + 2] += nz;
    }
    for (let i = 0; i < nrm.length; i += 3) {
      const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
      nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
    }
    return { pos, nrm, indices, ...extra };
  }
}

function offsetMesh(mesh, dx, dy, dz) {
  const pos = new Float32Array(mesh.pos);
  for (let i = 0; i < pos.length; i += 3) { pos[i] += dx; pos[i + 1] += dy; pos[i + 2] += dz; }
  return { ...mesh, pos };
}

function mergeMeshes(meshes) {
  const buf = new MeshBuf();
  let vol = 0;
  meshes.forEach(m => {
    const base = buf.p.length / 3;
    for (let i = 0; i < m.pos.length; i++) buf.p.push(m.pos[i]);
    for (let i = 0; i < m.indices.length; i++) buf.idx.push(m.indices[i] + base);
    vol += m.volumeMm3 || 0;
  });
  return buf.finish({ volumeMm3: vol });
}

function buildSolidPlug() {
  enforceSafety();
  const kind = state.toy.id;
  const insertable = state.insertable;
  const maxR = state.maxDia / 2, neckR = state.neckDia / 2, tipR = state.tip / 2;
  const baseR = state.baseDia / 2, baseT = state.baseThick;
  const curve = kind === "curved-plug" ? state.curve : 0;
  const ringsBody = 72, segs = 48;
  const path = [], radii = [];
  for (let i = 0; i <= ringsBody; i++) {
    const u = i / ringsBody, z = u * insertable;
    const r = plugRadius(z, insertable, maxR, neckR, tipR, kind, state.beads);
    const bend = (curve / 180) * Math.PI, ang = u * bend;
    const rad = bend < 1e-4 ? 1e9 : insertable / bend;
    const px = bend < 1e-4 ? 0 : rad * (1 - Math.cos(ang));
    const pz = bend < 1e-4 ? z : rad * Math.sin(ang);
    path.push(new THREE.Vector3(px, 0, pz));
    radii.push(r);
  }
  const last = path[path.length - 1], prev = path[path.length - 2];
  const tangent = new THREE.Vector3().subVectors(last, prev).normalize();
  for (let i = 1; i <= 16; i++) {
    const u = i / 16;
    path.push(last.clone().addScaledVector(tangent, u * (baseT * 0.35)));
    radii.push(lerp(neckR, baseR, smooth(u)));
  }
  const baseStart = path[path.length - 1].clone();
  for (let i = 1; i <= 6; i++) {
    const u = i / 6;
    path.push(baseStart.clone().addScaledVector(tangent, u * baseT * 0.65));
    radii.push(baseR);
  }
  const tangents = [];
  for (let i = 0; i < path.length; i++) {
    let t;
    if (i === 0) t = new THREE.Vector3().subVectors(path[1], path[0]);
    else if (i === path.length - 1) t = new THREE.Vector3().subVectors(path[i], path[i - 1]);
    else t = new THREE.Vector3().subVectors(path[i + 1], path[i - 1]);
    if (t.lengthSq() < 1e-12) t.set(0, 0, 1);
    tangents.push(t.normalize());
  }
  const frames = parallelTransport(tangents);
  const buf = new MeshBuf();
  const rings = path.length;
  const ring = (i, s) => i * segs + (s % segs);
  for (let i = 0; i < rings; i++) {
    const { n, b } = frames[i], p = path[i];
    const r = Math.max(radii[i], i === 0 ? 0.4 : radii[i]);
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const q = p.clone().addScaledVector(n, Math.cos(a) * r).addScaledVector(b, Math.sin(a) * r);
      buf.vert(q.x, q.y, q.z);
    }
  }
  const tipCenter = path[0].clone().addScaledVector(tangents[0], -Math.min(tipR * 0.6, 2.2));
  const baseCenter = path[rings - 1].clone().addScaledVector(tangents[rings - 1], 0.2);
  const tipIndex = buf.vert(tipCenter.x, tipCenter.y, tipCenter.z);
  const baseIndex = buf.vert(baseCenter.x, baseCenter.y, baseCenter.z);
  for (let i = 0; i < rings - 1; i++) {
    for (let s = 0; s < segs; s++) {
      const a = ring(i, s), b = ring(i, s + 1), c = ring(i + 1, s), d = ring(i + 1, s + 1);
      buf.tri(a, c, b); buf.tri(b, c, d);
    }
  }
  for (let s = 0; s < segs; s++) {
    buf.tri(tipIndex, ring(0, s + 1), ring(0, s));
    buf.tri(baseIndex, ring(rings - 1, s), ring(rings - 1, s + 1));
  }
  const volumeMm3 = Math.PI * ((maxR * maxR + neckR * neckR) / 2) * insertable * 0.72 + Math.PI * baseR * baseR * baseT;
  return buf.finish({ volumeMm3, insertable, baseR, maxR });
}

function cavityRadiusAt(zBody) {
  const kind = state.toy.id === "curved-plug" ? "classic-plug" : state.toy.id;
  const maxR = state.maxDia / 2, neckR = state.neckDia / 2, tipR = state.tip / 2;
  const L = state.insertable, baseT = state.baseThick;
  if (zBody <= L) return plugRadius(zBody, L, maxR, neckR, tipR, kind, state.beads);
  const u = clamp((zBody - L) / baseT, 0, 1);
  return lerp(neckR, state.baseDia / 2, smooth(u));
}

function moldLayout() {
  const bottom = 10, body = state.insertable + state.baseThick, topLip = 6;
  const H = bottom + body + topLip;
  const maxR = Math.max(state.maxDia, state.baseDia) / 2;
  const wall = state.wall, margin = 11;
  const W = 2 * (maxR + margin), D = maxR + wall + margin;
  return { bottom, body, topLip, H, W, D, wall, maxR };
}

function buildMoldHalf(side) {
  enforceSafety();
  const { bottom, body, H, W, D } = moldLayout();
  const halfSegs = 20, zCount = 56, zTip = bottom, zTop = bottom + body, xs = W / 2;
  const buf = new MeshBuf();
  function zAt(i) { return (i / zCount) * H; }
  function rCav(z) {
    if (z < zTip || z > zTop) return 0;
    return Math.max(cavityRadiusAt(z - zTip), 0.6);
  }
  const inner = [];
  for (let i = 0; i <= zCount; i++) {
    const z = zAt(i), r = rCav(z);
    inner[i] = [];
    for (let k = 0; k <= halfSegs; k++) {
      const theta = (k / halfSegs) * Math.PI;
      inner[i][k] = r > 0.01 ? buf.vert(r * Math.cos(theta), side * r * Math.sin(theta), z) : null;
    }
  }
  for (let i = 0; i < zCount; i++) {
    if (rCav(zAt(i)) < 0.05 || rCav(zAt(i + 1)) < 0.05) continue;
    for (let k = 0; k < halfSegs; k++) {
      const a = inner[i][k], b = inner[i][k + 1], c = inner[i + 1][k + 1], d = inner[i + 1][k];
      if (side > 0) buf.quad(a, d, c, b); else buf.quad(a, b, c, d);
    }
  }
  let tipRing = 0;
  while (tipRing < zCount && rCav(zAt(tipRing)) < 0.05) tipRing++;
  if (inner[tipRing] && inner[tipRing][0] != null) {
    const mid = buf.vert(0, 0, zAt(tipRing));
    for (let k = 0; k < halfSegs; k++) {
      if (side > 0) buf.tri(mid, inner[tipRing][k + 1], inner[tipRing][k]);
      else buf.tri(mid, inner[tipRing][k], inner[tipRing][k + 1]);
    }
  }
  function addStrip(xOuter) {
    const col = [];
    for (let i = 0; i <= zCount; i++) {
      const z = zAt(i), r = rCav(z);
      const xInner = xOuter > 0 ? Math.max(r, 0) : -Math.max(r, 0);
      col[i] = { o: buf.vert(xOuter, 0, z), n: buf.vert(xInner, 0, z) };
    }
    for (let i = 0; i < zCount; i++) {
      const a = col[i].o, b = col[i].n, c = col[i + 1].n, d = col[i + 1].o;
      if (side > 0) { if (xOuter < 0) buf.quad(a, d, c, b); else buf.quad(a, b, c, d); }
      else { if (xOuter < 0) buf.quad(a, b, c, d); else buf.quad(a, d, c, b); }
    }
  }
  addStrip(-xs); addStrip(xs);
  for (let i = 0; i < tipRing; i++) {
    const z0 = zAt(i), z1 = zAt(i + 1);
    const a = buf.vert(-xs, 0, z0), b = buf.vert(xs, 0, z0), c = buf.vert(xs, 0, z1), d = buf.vert(-xs, 0, z1);
    if (side > 0) buf.quad(a, d, c, b); else buf.quad(a, b, c, d);
  }
  const yOut = side * D;
  const br = [buf.vert(-xs, yOut, 0), buf.vert(xs, yOut, 0), buf.vert(xs, yOut, H), buf.vert(-xs, yOut, H)];
  if (side > 0) buf.quad(br[0], br[1], br[2], br[3]); else buf.quad(br[0], br[3], br[2], br[1]);
  const xp = [buf.vert(xs, 0, 0), buf.vert(xs, yOut, 0), buf.vert(xs, yOut, H), buf.vert(xs, 0, H)];
  if (side > 0) buf.quad(xp[0], xp[1], xp[2], xp[3]); else buf.quad(xp[0], xp[3], xp[2], xp[1]);
  const xn = [buf.vert(-xs, 0, 0), buf.vert(-xs, 0, H), buf.vert(-xs, yOut, H), buf.vert(-xs, yOut, 0)];
  if (side > 0) buf.quad(xn[0], xn[1], xn[2], xn[3]); else buf.quad(xn[0], xn[3], xn[2], xn[1]);
  const bt = [buf.vert(-xs, 0, 0), buf.vert(-xs, yOut, 0), buf.vert(xs, yOut, 0), buf.vert(xs, 0, 0)];
  if (side > 0) buf.quad(bt[0], bt[1], bt[2], bt[3]); else buf.quad(bt[0], bt[3], bt[2], bt[1]);
  const pourR = state.baseDia / 2;
  const hole = [];
  for (let k = 0; k <= halfSegs; k++) {
    const theta = (k / halfSegs) * Math.PI;
    hole.push(buf.vert(pourR * Math.cos(theta), side * pourR * Math.sin(theta), H));
  }
  const tL0 = buf.vert(-xs, 0, H), tL1 = buf.vert(-xs, yOut, H), tR1 = buf.vert(xs, yOut, H), tR0 = buf.vert(xs, 0, H);
  const backMid = buf.vert(0, yOut, H);
  if (side > 0) {
    buf.tri(tL0, tL1, hole[halfSegs]); buf.tri(tL1, backMid, hole[halfSegs]);
    buf.tri(tR0, hole[0], tR1); buf.tri(tR1, hole[0], backMid);
    for (let k = 0; k < halfSegs; k++) buf.tri(hole[k], hole[k + 1], backMid);
  } else {
    buf.tri(tL0, hole[halfSegs], tL1); buf.tri(tL1, hole[halfSegs], backMid);
    buf.tri(tR0, tR1, hole[0]); buf.tri(tR1, backMid, hole[0]);
    for (let k = 0; k < halfSegs; k++) buf.tri(hole[k + 1], hole[k], backMid);
  }
  const volumeMm3 = W * D * H - Math.PI * (state.maxDia / 2) ** 2 * state.insertable * 0.5;
  return buf.finish({ volumeMm3: Math.max(volumeMm3, 1000), part: side > 0 ? "halfA" : "halfB" });
}

function buildHandleZ() {
  const baseR = state.baseDia / 2 - 0.6;
  const baseT = Math.max(state.baseThick, 8);
  const stemR = Math.max(3.2, state.neckDia * 0.22);
  const stemLen = state.insertable * 0.38;
  const knobR = stemR * 1.55, segs = 36;
  const buf = new MeshBuf();
  function ring(r, z) {
    const ids = [];
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      ids.push(buf.vert(Math.cos(a) * r, Math.sin(a) * r, z));
    }
    return ids;
  }
  function stitch(a, b) {
    for (let s = 0; s < segs; s++) {
      const a0 = a[s], a1 = a[(s + 1) % segs], b0 = b[s], b1 = b[(s + 1) % segs];
      buf.tri(a0, b0, a1); buf.tri(a1, b0, b1);
    }
  }
  function cap(ids, z, up) {
    const c = buf.vert(0, 0, z);
    for (let s = 0; s < segs; s++) {
      if (up) buf.tri(c, ids[s], ids[(s + 1) % segs]);
      else buf.tri(c, ids[(s + 1) % segs], ids[s]);
    }
  }
  const z1 = baseT, z2 = baseT + stemLen * 0.82, z3 = baseT + stemLen;
  const r0 = ring(baseR, 0), r1 = ring(baseR, z1), r2 = ring(stemR, z1);
  const r3 = ring(stemR, z2), r4 = ring(knobR, z2 + (z3 - z2) * 0.45), r5 = ring(stemR * 0.4, z3);
  stitch(r0, r1); cap(r0, 0, false);
  for (let s = 0; s < segs; s++) {
    const a0 = r1[s], a1 = r1[(s + 1) % segs], b0 = r2[s], b1 = r2[(s + 1) % segs];
    buf.tri(a0, a1, b0); buf.tri(a1, b1, b0);
  }
  stitch(r2, r3); stitch(r3, r4); stitch(r4, r5); cap(r5, z3, true);
  return buf.finish({ volumeMm3: Math.PI * baseR * baseR * baseT + Math.PI * stemR * stemR * stemLen, part: "handle" });
}

function buildPeg() {
  const segs = 24, r = 2.6, h = 12;
  const buf = new MeshBuf(), a = [], b = [];
  for (let s = 0; s < segs; s++) {
    const ang = (s / segs) * Math.PI * 2;
    a.push(buf.vert(Math.cos(ang) * r, Math.sin(ang) * r, 0));
    b.push(buf.vert(Math.cos(ang) * r, Math.sin(ang) * r, h));
  }
  for (let s = 0; s < segs; s++) {
    const a0 = a[s], a1 = a[(s + 1) % segs], b0 = b[s], b1 = b[(s + 1) % segs];
    buf.tri(a0, b0, a1); buf.tri(a1, b0, b1);
  }
  const c0 = buf.vert(0, 0, 0), c1 = buf.vert(0, 0, h);
  for (let s = 0; s < segs; s++) {
    buf.tri(c0, a[(s + 1) % segs], a[s]);
    buf.tri(c1, b[s], b[(s + 1) % segs]);
  }
  return buf.finish({ volumeMm3: Math.PI * r * r * h, part: "peg" });
}

function toBinaryStl(mesh, name) {
  const tris = mesh.indices.length / 3;
  const buf = new ArrayBuffer(84 + tris * 50);
  const view = new DataView(buf);
  const header = new TextEncoder().encode(("GIVRE " + name).slice(0, 80));
  for (let i = 0; i < header.length; i++) view.setUint8(i, header[i]);
  view.setUint32(80, tris, true);
  let o = 84;
  const p = mesh.pos;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const ia = mesh.indices[i] * 3, ib = mesh.indices[i + 1] * 3, ic = mesh.indices[i + 2] * 3;
    const ax = p[ia], ay = p[ia + 1], az = p[ia + 2];
    const bx = p[ib], by = p[ib + 1], bz = p[ib + 2];
    const cx = p[ic], cy = p[ic + 1], cz = p[ic + 2];
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const l = Math.hypot(nx, ny, nz) || 1;
    view.setFloat32(o, nx / l, true); o += 4;
    view.setFloat32(o, ny / l, true); o += 4;
    view.setFloat32(o, nz / l, true); o += 4;
    [ax, ay, az, bx, by, bz, cx, cy, cz].forEach(v => { view.setFloat32(o, v, true); o += 4; });
    view.setUint16(o, 0, true); o += 2;
  }
  return buf;
}

function downloadMesh(mesh, name) {
  const blob = new Blob([toBinaryStl(mesh, name)], { type: "model/stl" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function fileBase() {
  return `givre_${state.product === "ice-mold" ? "ice_" : ""}${state.toy.id}_${state.insertable}x${state.maxDia}`;
}

const view = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
view.insertBefore(renderer.domElement, view.firstChild);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 1, 4000);
camera.position.set(90, 70, 140);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.AmbientLight(0xffe8dc, 0.55));
const key = new THREE.DirectionalLight(0xffd8c8, 1.15);
key.position.set(80, 120, 60);
scene.add(key);
scene.add(new THREE.DirectionalLight(0x8899cc, 0.4));
const floor = new THREE.GridHelper(280, 28, 0x3a3036, 0x2a2228);
floor.rotation.x = Math.PI / 2;
scene.add(floor);
const group = new THREE.Group();
scene.add(group);

function geoFrom(mesh) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(mesh.pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(mesh.nrm, 3));
  geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  return geo;
}

let framedFor = "";
function frameGroup(force) {
  const key = state.product + state.toy.id;
  if (!force && framedFor === key) return;
  framedFor = key;
  const box = new THREE.Box3().setFromObject(group);
  if (!isFinite(box.min.x)) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const maxDim = Math.max(size.x, size.y, size.z, 40);
  camera.position.set(center.x + maxDim * 0.95, center.y + maxDim * 0.6, center.z + maxDim * 1.15);
}

function refreshMesh(reframe = false) {
  while (group.children.length) group.remove(group.children[0]);
  if (state.product === "solid") {
    const g = buildSolidPlug();
    const mesh = new THREE.Mesh(geoFrom(g), new THREE.MeshStandardMaterial({ color: 0xe8b4a4, roughness: 0.35, metalness: 0.05 }));
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);
    window._exports = { solid: g };
    const grams = (g.volumeMm3 * 0.00124).toFixed(0);
    document.getElementById("hudDims").textContent =
      `${state.insertable} mm \u00b7 \u00d8${state.maxDia} / neck \u00d8${state.neckDia} / base \u00d8${state.baseDia} \u00b7 ~${grams} g`;
    document.getElementById("hudNote").textContent =
      "Drag to orbit \u00b7 solid body. Bambu still needs supports and a body-safe finish plan.";
  } else {
    const A = buildMoldHalf(1), B = buildMoldHalf(-1), handle = buildHandleZ(), peg = buildPeg(), ice = buildSolidPlug();
    const gap = 18;
    const mA = new THREE.Mesh(geoFrom(A), new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.45, metalness: 0.05, transparent: true, opacity: 0.88 }));
    const mB = new THREE.Mesh(geoFrom(B), new THREE.MeshStandardMaterial({ color: 0xb7c2cc, roughness: 0.45, metalness: 0.05, transparent: true, opacity: 0.88 }));
    mA.position.y = gap; mB.position.y = -gap;
    group.add(mA, mB);
    const iceM = new THREE.Mesh(geoFrom(ice), new THREE.MeshStandardMaterial({ color: 0x9ad7ef, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.45 }));
    iceM.position.z = moldLayout().bottom;
    group.add(iceM);
    if (state.iceHandle) {
      const h = new THREE.Mesh(geoFrom(handle), new THREE.MeshStandardMaterial({ color: 0xe08a6a, roughness: 0.4, metalness: 0.05 }));
      h.rotation.x = Math.PI;
      h.position.z = moldLayout().bottom + state.insertable + state.baseThick;
      group.add(h);
    }
    window._exports = { halfA: A, halfB: B, handle, peg, ice };
    const iceMl = (Math.PI * (state.maxDia / 2) ** 2 * state.insertable * 0.7 / 1000).toFixed(0);
    document.getElementById("hudDims").textContent =
      `two-part mold \u00b7 cavity ${state.insertable}\u00d7\u00d8${state.maxDia} mm \u00b7 ~${iceMl} ml ice`;
    document.getElementById("hudNote").textContent =
      "Clamshell opened for view. Print both halves + handle. Line with a bag, fill, freeze, split.";
  }
  frameGroup(reframe);
}

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
function tick() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(tick); }
resize(); tick();

const wizard = document.getElementById("wizard");
function slider(id, label, min, max, step, value, unit = " mm") {
  return `<label class="row"><span>${label}</span><b>${value}${unit}</b></label>\n<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" />`;
}

function renderWizard() {
  for (let i = 0; i < 4; i++) {
    document.getElementById("d" + i).className = "step-dot" + (i === state.step ? " on" : i < state.step ? " done" : "");
  }
  if (state.step === 0) {
    wizard.innerHTML = `<h2>1 \u00b7 Product & shape</h2>
      <div class="presets">
        <button class="preset ${state.product === "solid" ? "on" : ""}" data-p="solid">Solid toy</button>
        <button class="preset ${state.product === "ice-mold" ? "on" : ""}" data-p="ice-mold">Ice mold</button>
      </div>
      <div class="grid" id="toys" style="margin-top:12px"></div>
      <label class="row" style="margin-top:16px"><span>Intended use</span></label>
      <div class="presets">
        <button class="preset ${state.anal ? "on" : ""}" data-anal="1">Anal \u2014 force flared base</button>
        <button class="preset ${!state.anal ? "on" : ""}" data-anal="0">External / vaginal</button>
      </div>
      ${state.product === "ice-mold" ? `<div class="badbox">A one-piece inverse plug cannot release: the bulb is wider than the neck. This is a <b>two-part clamshell</b>.</div>
      <div class="warnbox">Keep the <b>printed retrieval handle</b>. Ice can burn tissue. Let it sit until wet.</div>` : `<div class="warnbox">Anything meant to go in a rectum needs a flared base wider than the bulb.</div>`}
      <div class="nav"><button class="primary" id="next">Continue</button></div>`;
    const wrap = wizard.querySelector("#toys");
    TOYS.forEach(t => {
      const blocked = state.product === "ice-mold" && !t.moldable;
      const d = document.createElement("div");
      d.className = "toy" + (state.toy.id === t.id ? " selected" : "");
      d.style.opacity = blocked ? 0.4 : 1;
      d.innerHTML = `<div class="icon">${t.icon}</div><div><b>${t.name}</b><span>${blocked ? "Straight molds only." : t.blurb}</span></div><div class="badge">${t.anal ? "anal base" : "shaft"}</div>`;
      d.onclick = () => { if (blocked) return; applyToy(t); if (t.anal) state.anal = true; refreshMesh(true); renderWizard(); };
      wrap.appendChild(d);
    });
    wizard.querySelectorAll("[data-p]").forEach(btn => {
      btn.onclick = () => {
        state.product = btn.dataset.p;
        if (state.product === "ice-mold" && !state.toy.moldable) applyToy(TOYS[0]);
        state.anal = true; framedFor = ""; refreshMesh(true); renderWizard();
      };
    });
    wizard.querySelectorAll("[data-anal]").forEach(btn => {
      btn.onclick = () => { state.anal = btn.dataset.anal === "1"; if (state.anal) enforceSafety(); refreshMesh(); renderWizard(); };
    });
    wizard.querySelector("#next").onclick = () => { state.step = 1; renderWizard(); };
  } else if (state.step === 1) {
    wizard.innerHTML = `<h2>2 \u00b7 Size preset</h2>
      <p style="color:var(--muted);margin:0 0 12px;font-size:13px">Diameters are the wide point, not circumference.</p>
      <div class="presets" id="presets"></div>
      <div class="stats">
        <div class="stat"><b>${state.insertable} mm</b><span>insertable length</span></div>
        <div class="stat"><b>${state.maxDia} mm</b><span>max diameter</span></div>
        <div class="stat"><b>${(state.maxDia * Math.PI).toFixed(0)} mm</b><span>approx girth</span></div>
        <div class="stat"><b>${state.baseDia} mm</b><span>base diameter</span></div>
      </div>
      <div class="okbox">Beginner plugs usually sit around 22\u201328 mm wide.</div>
      <div class="nav"><button class="ghost" id="back">Back</button><button class="primary" id="next">Fine-tune</button></div>`;
    const box = wizard.querySelector("#presets");
    Object.entries(PRESETS).forEach(([k, p]) => {
      const b = document.createElement("button");
      b.className = "preset" + (state.preset === k ? " on" : "");
      b.textContent = p.label;
      b.onclick = () => { applyPreset(k); refreshMesh(); renderWizard(); };
      box.appendChild(b);
    });
    wizard.querySelector("#back").onclick = () => { state.step = 0; renderWizard(); };
    wizard.querySelector("#next").onclick = () => { state.step = 2; renderWizard(); };
  } else if (state.step === 2) {
    const extraBead = state.toy.id === "beaded-plug" ? slider("beads", "Beads", 2, 4, 1, state.beads, "") : "";
    const extraCurve = state.product === "solid" && state.toy.id === "curved-plug" ? slider("curve", "Bend", 8, 45, 1, state.curve, "\u00b0") : "";
    const extraMold = state.product === "ice-mold" ? `${slider("wall", "Mold wall", 2.4, 6, 0.2, state.wall)}
      <label class="row"><span>Printed retrieval handle</span></label>
      <div class="presets">
        <button class="preset ${state.iceHandle ? "on" : ""}" data-h="1">On \u2014 ice on a plastic flare</button>
        <button class="preset ${!state.iceHandle ? "on" : ""}" data-h="0">Off \u2014 all ice</button>
      </div>` : "";
    wizard.innerHTML = `<h2>3 \u00b7 Fine-tune</h2>
      ${slider("insertable", "Insertable length", 45, 220, 1, state.insertable)}
      ${slider("maxDia", "Max diameter", 18, 60, 1, state.maxDia)}
      ${slider("neckDia", "Neck diameter", 10, 50, 1, state.neckDia)}
      ${slider("baseDia", "Base / flare diameter", 30, 90, 1, state.baseDia)}
      ${slider("baseThick", "Base thickness", 6, 16, 1, state.baseThick)}
      ${slider("tip", "Tip bluntness", 3, 20, 1, state.tip)}
      ${extraBead}${extraCurve}${extraMold}
      ${state.anal ? `<div class="warnbox">Minimum flare for this bulb: ${minBaseDia().toFixed(0)} mm.</div>` : ""}
      <div class="nav"><button class="ghost" id="back">Back</button><button class="primary" id="next">Export</button></div>`;
    ["insertable","maxDia","neckDia","baseDia","baseThick","tip","beads","curve","wall"].forEach(key => {
      const el = wizard.querySelector("#" + key);
      if (!el) return;
      el.addEventListener("input", () => {
        state[key] = Number(el.value);
        enforceSafety();
        if (key === "baseDia" && state.anal) { state.baseDia = Math.max(state.baseDia, minBaseDia()); el.value = state.baseDia; }
        const label = el.previousElementSibling;
        if (label && label.querySelector("b")) {
          const u = key === "curve" ? "\u00b0" : key === "beads" ? "" : " mm";
          label.querySelector("b").textContent = el.value + u;
        }
        refreshMesh();
      });
    });
    wizard.querySelectorAll("[data-h]").forEach(btn => {
      btn.onclick = () => { state.iceHandle = btn.dataset.h === "1"; refreshMesh(); renderWizard(); };
    });
    wizard.querySelector("#back").onclick = () => { state.step = 1; renderWizard(); };
    wizard.querySelector("#next").onclick = () => { state.step = 3; renderWizard(); };
  } else if (state.product === "ice-mold") {
    const ready = state.checks.adult && state.checks.base && state.checks.ice;
    wizard.innerHTML = `<h2>4 \u00b7 Ice mold files</h2>
      <div class="stats">
        <div class="stat"><b>${fileBase()}_halfA.stl</b><span>clamshell +Y</span></div>
        <div class="stat"><b>${fileBase()}_halfB.stl</b><span>clamshell \u2212Y</span></div>
        <div class="stat"><b>${fileBase()}_handle.stl</b><span>retrieval flare + stem</span></div>
        <div class="stat"><b>${fileBase()}_peg.stl</b><span>optional peg</span></div>
      </div>
      <div class="okbox"><b>How to use</b><br>Print halves in PETG, 5+ walls. Rubber-band, stand pour-up. Seat the handle. Line with a bag, fill, freeze, warm, split.</div>
      <div class="badbox">Ice can stick, crack, and an all-ice flare can get lost internally. Wait until wet.</div>
      <div class="checks">
        <label><input type="checkbox" data-k="adult" ${state.checks.adult?"checked":""}> I am an adult making this for consenting adults.</label>
        <label><input type="checkbox" data-k="base" ${state.checks.base?"checked":""}> I will keep a flared retrieval base.</label>
        <label><input type="checkbox" data-k="ice" ${state.checks.ice?"checked":""}> I will not insert ice freezer-dry.</label>
      </div>
      <div class="nav">
        <button class="ghost" id="back">Back</button>
        <button class="primary" id="dl" ${ready ? "" : "disabled"} style="opacity:${ready?1:0.45}">Download mold set</button>
        <button class="ghost" id="plate" ${ready ? "" : "disabled"}>One plate STL</button>
      </div>`;
    wizard.querySelectorAll("input[type=checkbox]").forEach(cb => {
      cb.onchange = () => { state.checks[cb.dataset.k] = cb.checked; renderWizard(); };
    });
    wizard.querySelector("#back").onclick = () => { state.step = 2; renderWizard(); };
    wizard.querySelector("#dl").onclick = () => {
      if (!ready) return;
      const ex = window._exports;
      downloadMesh(ex.halfA, fileBase() + "_halfA.stl");
      setTimeout(() => downloadMesh(ex.halfB, fileBase() + "_halfB.stl"), 250);
      setTimeout(() => downloadMesh(ex.handle, fileBase() + "_handle.stl"), 500);
      setTimeout(() => downloadMesh(ex.peg, fileBase() + "_peg.stl"), 750);
    };
    wizard.querySelector("#plate").onclick = () => {
      if (!ready) return;
      const { W } = moldLayout(), ex = window._exports;
      downloadMesh(mergeMeshes([
        offsetMesh(ex.halfA, 0, 0, 0),
        offsetMesh(ex.halfB, W + 8, 0, 0),
        offsetMesh(ex.handle, (W + 8) * 2, 0, 0),
        offsetMesh(ex.peg, (W + 8) * 2 + state.baseDia + 10, 0, 0)
      ]), fileBase() + "_plate.stl");
    };
  } else {
    const ready = state.checks.material && state.checks.finish && state.checks.base && state.checks.adult;
    const grams = ((window._exports && window._exports.solid && window._exports.solid.volumeMm3 || 0) * 0.00124).toFixed(0);
    wizard.innerHTML = `<h2>4 \u00b7 Print file</h2>
      <div class="stats">
        <div class="stat"><b>${fileBase()}.stl</b><span>binary STL \u00b7 mm</span></div>
        <div class="stat"><b>~${grams} g</b><span>solid PLA estimate</span></div>
      </div>
      <div class="badbox"><b>Raw FDM prints are not body-safe insertables.</b> Use as a silicone mold master, or sand and seal.</div>
      <div class="okbox">Import the STL in Bambu Studio. Tip-up or on the side with tree supports. Then export a .gcode.3mf from Studio.</div>
      <div class="checks">
        <label><input type="checkbox" data-k="adult" ${state.checks.adult?"checked":""}> I am an adult making this for consenting adults.</label>
        <label><input type="checkbox" data-k="base" ${state.checks.base?"checked":""}> I will not grind off the flared base.</label>
        <label><input type="checkbox" data-k="material" ${state.checks.material?"checked":""}> I will not insert an unfinished PLA/PETG print.</label>
        <label><input type="checkbox" data-k="finish" ${state.checks.finish?"checked":""}> I have a finish or cast-silicone plan, or this is display only.</label>
      </div>
      <div class="nav">
        <button class="ghost" id="back">Back</button>
        <button class="primary" id="dl" ${ready ? "" : "disabled"} style="opacity:${ready?1:0.45}">Download STL</button>
      </div>`;
    wizard.querySelectorAll("input[type=checkbox]").forEach(cb => {
      cb.onchange = () => { state.checks[cb.dataset.k] = cb.checked; renderWizard(); };
    });
    wizard.querySelector("#back").onclick = () => { state.step = 2; renderWizard(); };
    wizard.querySelector("#dl").onclick = () => {
      if (!ready) return;
      downloadMesh(window._exports.solid, fileBase() + ".stl");
    };
  }
}

applyToy(TOYS[0]);
applyPreset("starter");
renderWizard();
refreshMesh(true);
