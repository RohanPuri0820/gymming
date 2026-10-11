// Builds the 3D body mesh: one smooth, sculpted surface (signed distance field →
// surface nets → smoothing) with every vertex tagged by muscle group.
// Output: public/body.bin. Run: node scripts/build-body.mjs
import { writeFileSync } from "node:fs";
import * as THREE from "three";
import { buildMuscles, J, SEGMENTS, TORSO_DEPTH, TORSO_PROFILE } from "../src/components/body/anatomy.ts";
import { MUSCLES } from "../src/lib/muscles.ts";

const STEP = 0.0065;
const BOX = { min: [-0.44, -0.02, -0.21], max: [0.44, 1.81, 0.21] };

/* ---------- SDF primitives ---------- */

const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

function ellipsoid(c, r, quat) {
  const inv = quat ? new THREE.Quaternion(...quat).invert() : null;
  const v = new THREE.Vector3();
  const rmin = Math.min(...r);
  return (x, y, z) => {
    v.set(x - c[0], y - c[1], z - c[2]);
    if (inv) v.applyQuaternion(inv);
    const k0 = Math.hypot(v.x / r[0], v.y / r[1], v.z / r[2]);
    return (k0 - 1) * rmin;
  };
}

// Tapered capsule between a (radius ra) and b (radius rb)
function roundCone(a, b, ra, rb) {
  const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l2 = ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2;
  return (x, y, z) => {
    const pa = [x - a[0], y - a[1], z - a[2]];
    const t = Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / l2));
    const d = Math.hypot(pa[0] - ba[0] * t, pa[1] - ba[1] * t, pa[2] - ba[2] * t);
    return d - (ra + (rb - ra) * t);
  };
}

function torsoRadius(y) {
  const p = TORSO_PROFILE;
  if (y <= p[0][1] || y >= p[p.length - 1][1]) return 0;
  for (let i = 0; i < p.length - 1; i++) {
    if (y >= p[i][1] && y <= p[i + 1][1]) {
      const t = (y - p[i][1]) / (p[i + 1][1] - p[i][1]);
      // smoothstep between profile points avoids visible rings
      const s = t * t * (3 - 2 * t);
      return p[i][0] + (p[i + 1][0] - p[i][0]) * s;
    }
  }
  return 0;
}

const TORSO_LO = TORSO_PROFILE[0][1];
const TORSO_HI = TORSO_PROFILE[TORSO_PROFILE.length - 1][1];
function torso(x, y, z) {
  const yc = Math.max(TORSO_LO + 0.01, Math.min(TORSO_HI - 0.01, y));
  const r = Math.max(0.02, torsoRadius(yc));
  const rz = r * TORSO_DEPTH;
  const d = (Math.hypot(x / r, z / rz) - 1) * rz;
  return Math.max(d, TORSO_LO - y, y - TORSO_HI);
}

/* ---------- body ---------- */

const arr = (v) => [v.x, v.y, v.z];
const mir = (v) => [-v[0], v[1], v[2]];
const base = [torso];
base.push(ellipsoid([0, 1.665, 0.005], [0.085, 0.108, 0.098])); // head
base.push(ellipsoid([0, 1.585, 0.035], [0.05, 0.05, 0.05])); // jaw/chin mass
base.push(roundCone([0, 1.44, -0.008], [0, 1.6, 0.0], 0.052, 0.046)); // neck
for (const side of [1, -1]) {
  const f = (v) => (side === 1 ? arr(v) : mir(arr(v)));
  for (const seg of Object.values(SEGMENTS)) base.push(roundCone(f(seg.a), f(seg.b), seg.rA, seg.rB));
  // shoulder girdle bridging torso and arm
  base.push(roundCone([0.06 * side, 1.43, -0.01], f(J.shoulder), 0.055, 0.052));
  // hip/upper-thigh mass so legs blend into the pelvis
  base.push(ellipsoid([0.08 * side, 0.85, 0.0], [0.075, 0.08, 0.075]));
  // hand
  const w = f(J.wrist);
  base.push(ellipsoid([w[0] + 0.012 * side, w[1] - 0.075, w[2] + 0.005], [0.028, 0.065, 0.038]));
  // foot
  base.push(roundCone([0.112 * side, 0.045, -0.035], [0.118 * side, 0.03, 0.125], 0.042, 0.03));
}

const muscles = buildMuscles();
const muscleIndex = new Map(MUSCLES.map((m, i) => [m.id, i]));
// How much each group sinks below the skin (bigger = flatter bulge)
const SINK = { abdominals: 0.012, chest: 0.008, "lower back": 0.008, "middle back": 0.007, adductors: 0.008 };
const mfns = muscles.map((m) => ({
  id: muscleIndex.get(m.muscle),
  sink: SINK[m.muscle] ?? 0.005,
  f: ellipsoid(m.position, m.scale, m.quaternion),
}));

function sdBase(x, y, z) {
  let d = 1e9;
  for (const f of base) d = smin(d, f(x, y, z), 0.035);
  return d;
}
function sdf(x, y, z) {
  let d = sdBase(x, y, z);
  for (const m of mfns) d = smin(d, m.f(x, y, z) + m.sink, 0.022);
  return d;
}

/* ---------- surface nets ---------- */

const nx = Math.ceil((BOX.max[0] - BOX.min[0]) / STEP) + 1;
const ny = Math.ceil((BOX.max[1] - BOX.min[1]) / STEP) + 1;
const nz = Math.ceil((BOX.max[2] - BOX.min[2]) / STEP) + 1;
const P = (i, a) => BOX.min[a] + i * STEP;
console.log(`grid ${nx}×${ny}×${nz} = ${(nx * ny * nz / 1e6).toFixed(1)}M samples`);

const field = new Float32Array(nx * ny * nz);
const idx = (i, j, k) => i + nx * (j + ny * k);
console.time("sdf");
for (let k = 0; k < nz; k++)
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) field[idx(i, j, k)] = sdf(P(i, 0), P(j, 1), P(k, 2));
console.timeEnd("sdf");

const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
const cidx = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
const pos = [];
const CORNERS = [];
for (let c = 0; c < 8; c++) CORNERS.push([c & 1, (c >> 1) & 1, (c >> 2) & 1]);
const EDGES = [];
for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
  const d = CORNERS[a].map((v, t) => Math.abs(v - CORNERS[b][t])).reduce((s, v) => s + v, 0);
  if (d === 1) EDGES.push([a, b]);
}

for (let k = 0; k < nz - 1; k++)
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const vals = CORNERS.map(([a, b, c]) => field[idx(i + a, j + b, k + c)]);
      let mask = 0;
      vals.forEach((v, c) => v < 0 && (mask |= 1 << c));
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of EDGES) {
        const va = vals[a], vb = vals[b];
        if (va < 0 === vb < 0) continue;
        const t = va / (va - vb);
        const ca = CORNERS[a], cb = CORNERS[b];
        sx += ca[0] + (cb[0] - ca[0]) * t;
        sy += ca[1] + (cb[1] - ca[1]) * t;
        sz += ca[2] + (cb[2] - ca[2]) * t;
        n++;
      }
      cellVert[cidx(i, j, k)] = pos.length / 3;
      pos.push(P(i, 0) + (sx / n) * STEP, P(j, 1) + (sy / n) * STEP, P(k, 2) + (sz / n) * STEP);
    }

const tris = [];
// For each grid edge with a sign change, connect the 4 cells around it
for (let k = 1; k < nz - 1; k++)
  for (let j = 1; j < ny - 1; j++)
    for (let i = 1; i < nx - 1; i++) {
      const v0 = field[idx(i, j, k)];
      for (let axis = 0; axis < 3; axis++) {
        const [di, dj, dk] = axis === 0 ? [1, 0, 0] : axis === 1 ? [0, 1, 0] : [0, 0, 1];
        if (i + di >= nx || j + dj >= ny || k + dk >= nz) continue;
        const v1 = field[idx(i + di, j + dj, k + dk)];
        if (v0 < 0 === v1 < 0) continue;
        // the four cells sharing this edge
        let cells;
        if (axis === 0) cells = [[i, j - 1, k - 1], [i, j, k - 1], [i, j, k], [i, j - 1, k]];
        else if (axis === 1) cells = [[i - 1, j, k - 1], [i - 1, j, k], [i, j, k], [i, j, k - 1]];
        else cells = [[i - 1, j - 1, k], [i, j - 1, k], [i, j, k], [i - 1, j, k]];
        const q = cells.map(([a, b, c]) => cellVert[cidx(a, b, c)]);
        if (q.some((x) => x < 0)) continue;
        const flip = v0 < 0 ? axis !== 1 : axis === 1;
        if (flip) tris.push(q[0], q[1], q[2], q[0], q[2], q[3]);
        else tris.push(q[0], q[2], q[1], q[0], q[3], q[2]);
      }
    }
// Make every triangle face outward (along the SDF gradient)
const e = 0.002;
let flipped = 0;
for (let t = 0; t < tris.length; t += 3) {
  const [a, b, c] = [tris[t] * 3, tris[t + 1] * 3, tris[t + 2] * 3];
  const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
  const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const cx = (pos[a] + pos[b] + pos[c]) / 3, cy = (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, cz = (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3;
  const g = [
    sdf(cx + e, cy, cz) - sdf(cx - e, cy, cz),
    sdf(cx, cy + e, cz) - sdf(cx, cy - e, cz),
    sdf(cx, cy, cz + e) - sdf(cx, cy, cz - e),
  ];
  if (n[0] * g[0] + n[1] * g[1] + n[2] * g[2] < 0) {
    [tris[t + 1], tris[t + 2]] = [tris[t + 2], tris[t + 1]];
    flipped++;
  }
}
console.log(`flipped ${flipped} triangles`);
const nv = pos.length / 3;
console.log(`${nv} vertices, ${tris.length / 3} triangles`);

/* ---------- Taubin smoothing (removes grid stair-steps without shrinking) ---------- */

const nbrs = Array.from({ length: nv }, () => new Set());
for (let t = 0; t < tris.length; t += 3) {
  const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
  nbrs[a].add(b).add(c);
  nbrs[b].add(a).add(c);
  nbrs[c].add(a).add(b);
}
const nb = nbrs.map((s) => [...s]);
function smoothPass(lambda) {
  const out = new Float32Array(pos.length);
  for (let v = 0; v < nv; v++) {
    let x = 0, y = 0, z = 0;
    for (const u of nb[v]) { x += pos[u * 3]; y += pos[u * 3 + 1]; z += pos[u * 3 + 2]; }
    const n = nb[v].length || 1;
    out[v * 3] = pos[v * 3] + lambda * (x / n - pos[v * 3]);
    out[v * 3 + 1] = pos[v * 3 + 1] + lambda * (y / n - pos[v * 3 + 1]);
    out[v * 3 + 2] = pos[v * 3 + 2] + lambda * (z / n - pos[v * 3 + 2]);
  }
  for (let i = 0; i < pos.length; i++) pos[i] = out[i];
}
for (let it = 0; it < 6; it++) { smoothPass(0.5); smoothPass(-0.53); }

/* ---------- tag vertices with their muscle ---------- */

const SKIN = 255;
const ids = new Uint8Array(nv);
const cover = new Uint8Array(nv); // 0..255: how strongly the vertex is painted
const groove = new Uint8Array(nv); // 0..255: darker line between neighbouring regions
const ABS = muscleIndex.get("abdominals");
for (let v = 0; v < nv; v++) {
  const [x, y, z] = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
  // nearest and second-nearest region (abs parts count separately → six-pack lines)
  let best = SKIN, bestD = 1e9, bestPart = -1, second = 1e9;
  mfns.forEach((m, part) => {
    const d = m.f(x, y, z);
    if (d < bestD) {
      if (best !== SKIN && (best !== m.id || m.id === ABS)) second = bestD;
      bestD = d; best = m.id; bestPart = part;
    } else if (d < second && (m.id !== best || (m.id === ABS && part !== bestPart))) second = d;
  });
  const PAINT = 0.009, FEATHER = 0.005;
  const c = Math.min(1, Math.max(0, (PAINT - bestD) / FEATHER));
  ids[v] = c > 0 ? best : SKIN;
  cover[v] = Math.round(c * 255);
  const g = second < PAINT ? Math.max(0, 1 - (second - bestD) / 0.0035) : 0;
  groove[v] = Math.round(g * 255);
}
const edge = groove;
// Picking uses ids; give unpainted vertices next to a muscle that muscle's id so taps near borders still hit
/* ---------- write ---------- */

// Format "BDY2": [magic, vertexCount, indexCount] u32 · bbox min/max f32×6 ·
// positions u16×3 (quantised to the bbox) · indices u16|u32 · id u8 · groove u8 · coverage u8
const wide = nv > 65535;
const header = new Uint32Array([0x42445932, nv, tris.length]);
const bbox = new Float32Array([...BOX.min, ...BOX.max]);
const positions = new Uint16Array(nv * 3);
for (let v = 0; v < nv * 3; v++) {
  const a = v % 3;
  positions[v] = Math.round(((pos[v] - BOX.min[a]) / (BOX.max[a] - BOX.min[a])) * 65535);
}
const index = wide ? new Uint32Array(tris) : new Uint16Array(tris);
const pad = new Uint8Array((4 - ((nv * 6) % 4)) % 4); // keep the index array 4-byte aligned
const parts = [header, bbox, positions, pad, index, ids, edge, cover];
const total = parts.reduce((t, p) => t + p.byteLength, 0);
const buf = Buffer.alloc(total);
let off = 0;
for (const p of parts) {
  Buffer.from(p.buffer, p.byteOffset, p.byteLength).copy(buf, off);
  off += p.byteLength;
}
writeFileSync("public/body.bin", buf);
console.log(`wrote public/body.bin (${(total / 1024).toFixed(0)} KB)`);
