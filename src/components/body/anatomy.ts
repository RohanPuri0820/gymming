// Procedural anatomy for the 3D body map. Units ≈ metres, y up, figure faces +z.
// Every muscle is an ellipsoid fitted to the surface of a simple mannequin, so the
// whole figure is generated in code (no model download) and each group is tappable.
import * as THREE from "three";
import type { MuscleId } from "@/lib/types";

export type Ellipsoid = {
  muscle: MuscleId;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
};

export type LimbSeg = { a: THREE.Vector3; b: THREE.Vector3; rA: number; rB: number };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---- Skeleton (right side; left is mirrored) ----
export const J = {
  shoulder: v(0.2, 1.4, -0.005),
  elbow: v(0.265, 1.12, -0.02),
  wrist: v(0.3, 0.87, 0.02),
  hip: v(0.092, 0.9, 0),
  knee: v(0.105, 0.5, 0.012),
  ankle: v(0.11, 0.09, -0.015),
};

export const SEGMENTS = {
  upperArm: { a: J.shoulder, b: J.elbow, rA: 0.05, rB: 0.04 },
  forearm: { a: J.elbow, b: J.wrist, rA: 0.042, rB: 0.03 },
  thigh: { a: J.hip, b: J.knee, rA: 0.088, rB: 0.058 },
  shin: { a: J.knee, b: J.ankle, rA: 0.055, rB: 0.036 },
} satisfies Record<string, LimbSeg>;

// ---- Torso: lathe profile (radius by height), squashed front-to-back ----
export const TORSO_DEPTH = 0.62;
export const TORSO_PROFILE: [number, number][] = [
  [0.0, 0.79],
  [0.07, 0.8],
  [0.13, 0.84],
  [0.155, 0.9],
  [0.152, 0.97],
  [0.136, 1.04],
  [0.143, 1.12],
  [0.162, 1.22],
  [0.178, 1.32],
  [0.176, 1.39],
  [0.15, 1.44],
  [0.075, 1.48],
  [0.0, 1.495],
];

function torsoRadius(y: number): number {
  const p = TORSO_PROFILE;
  for (let i = 0; i < p.length - 1; i++) {
    if (y >= p[i][1] && y <= p[i + 1][1]) {
      const t = (y - p[i][1]) / (p[i + 1][1] - p[i][1]);
      return p[i][0] + (p[i + 1][0] - p[i][0]) * t;
    }
  }
  return 0;
}

const q = (e: THREE.Euler) => {
  const qq = new THREE.Quaternion().setFromEuler(e);
  return [qq.x, qq.y, qq.z, qq.w] as [number, number, number, number];
};

/** Ellipsoid on the torso surface, `embed` = fraction of its depth sunk below the skin. */
function onTorso(
  muscle: MuscleId,
  x: number,
  y: number,
  side: "front" | "back",
  r: [number, number, number],
  opts: { rotZ?: number; rotY?: number; embed?: number } = {},
): Ellipsoid {
  const R = torsoRadius(y);
  const zs = TORSO_DEPTH * Math.sqrt(Math.max(0, R * R - x * x));
  const sign = side === "front" ? 1 : -1;
  const embed = opts.embed ?? 0.55;
  return {
    muscle,
    position: [x, y, sign * (zs - r[2] * embed)],
    quaternion: q(new THREE.Euler(0, (opts.rotY ?? 0) * sign, opts.rotZ ?? 0)),
    scale: r,
  };
}

/** Ellipsoid wrapped on a limb segment at parameter t, pushed out toward `dir`. */
function onLimb(
  muscle: MuscleId,
  seg: LimbSeg,
  t: number,
  dir: THREE.Vector3,
  r: [number, number, number],
  embed = 0.55,
): Ellipsoid {
  const axis = seg.b.clone().sub(seg.a).normalize();
  const p = seg.a.clone().lerp(seg.b, t);
  const out = dir.clone().sub(axis.clone().multiplyScalar(dir.dot(axis))).normalize();
  const limbR = seg.rA + (seg.rB - seg.rA) * t;
  p.add(out.clone().multiplyScalar(limbR - r[2] * embed));
  const x = new THREE.Vector3().crossVectors(axis, out).normalize();
  const m = new THREE.Matrix4().makeBasis(x, axis, out);
  const qq = new THREE.Quaternion().setFromRotationMatrix(m);
  return { muscle, position: [p.x, p.y, p.z], quaternion: [qq.x, qq.y, qq.z, qq.w], scale: r };
}

const FRONT = v(0, 0, 1);
const BACK = v(0, 0, -1);
const INNER = v(-1, 0, 0); // right side: inner is toward -x
const OUTER = v(1, 0, 0);

function rightSide(): Ellipsoid[] {
  const S = SEGMENTS;
  return [
    // Torso front
    onTorso("chest", 0.088, 1.315, "front", [0.092, 0.074, 0.055], { rotZ: 0.12, embed: 0.62 }),
    onTorso("abdominals", 0.037, 1.19, "front", [0.035, 0.036, 0.024], { embed: 0.6 }),
    onTorso("abdominals", 0.037, 1.115, "front", [0.035, 0.035, 0.024], { embed: 0.6 }),
    onTorso("abdominals", 0.037, 1.04, "front", [0.034, 0.037, 0.024], { embed: 0.6 }),
    onTorso("abdominals", 0.034, 0.955, "front", [0.032, 0.048, 0.022], { embed: 0.6 }),
    onTorso("abdominals", 0.112, 1.07, "front", [0.04, 0.1, 0.03], { rotZ: -0.12, rotY: 0.55, embed: 0.6 }),
    // Shoulders (deltoid caps)
    {
      muscle: "shoulders",
      position: [J.shoulder.x + 0.016, J.shoulder.y - 0.01, 0],
      quaternion: q(new THREE.Euler(0, 0, -0.35)),
      scale: [0.068, 0.088, 0.075],
    },
    // Torso back
    onTorso("traps", 0.058, 1.435, "back", [0.085, 0.052, 0.05], { rotZ: -0.35, embed: 0.6 }),
    onTorso("traps", 0.0, 1.355, "back", [0.055, 0.085, 0.03], { embed: 0.65 }),
    onTorso("middle back", 0.062, 1.285, "back", [0.055, 0.075, 0.03], { rotZ: 0.25, embed: 0.6 }),
    onTorso("lats", 0.112, 1.2, "back", [0.07, 0.15, 0.038], { rotZ: -0.28, rotY: 0.35, embed: 0.62 }),
    onTorso("lower back", 0.038, 1.03, "back", [0.038, 0.09, 0.028], { embed: 0.6 }),
    onTorso("glutes", 0.072, 0.86, "back", [0.088, 0.09, 0.062], { embed: 0.52 }),
    onTorso("abductors", 0.14, 0.905, "back", [0.038, 0.065, 0.055], { rotY: 1.2 }),
    // Arms
    onLimb("biceps", S.upperArm, 0.55, FRONT, [0.036, 0.1, 0.032], 0.6),
    onLimb("triceps", S.upperArm, 0.45, BACK, [0.04, 0.11, 0.034], 0.6),
    onLimb("forearms", S.forearm, 0.3, FRONT.clone().add(INNER.clone().multiplyScalar(0.4)), [0.034, 0.095, 0.03], 0.6),
    onLimb("forearms", S.forearm, 0.3, BACK.clone().add(OUTER.clone().multiplyScalar(0.4)), [0.032, 0.095, 0.028], 0.6),
    // Legs
    onLimb("quadriceps", S.thigh, 0.42, FRONT.clone().add(OUTER.clone().multiplyScalar(0.25)), [0.07, 0.19, 0.052], 0.62),
    onLimb("quadriceps", S.thigh, 0.8, FRONT.clone().add(INNER.clone().multiplyScalar(0.8)), [0.038, 0.065, 0.032], 0.6),
    onLimb("adductors", S.thigh, 0.28, INNER.clone().add(FRONT.clone().multiplyScalar(0.2)), [0.038, 0.13, 0.04], 0.6),
    onLimb("hamstrings", S.thigh, 0.45, BACK, [0.066, 0.18, 0.046], 0.6),
    onLimb("calves", S.shin, 0.27, BACK.clone().add(INNER.clone().multiplyScalar(0.45)), [0.034, 0.1, 0.036], 0.58),
    onLimb("calves", S.shin, 0.25, BACK.clone().add(OUTER.clone().multiplyScalar(0.45)), [0.031, 0.095, 0.034], 0.58),
  ];
}

function mirror(e: Ellipsoid): Ellipsoid {
  // Reflect across the x = 0 plane: negate x position, and negate the y and z
  // components of the quaternion.
  const [x, y, z] = e.position;
  const [qx, qy, qz, qw] = e.quaternion;
  return { ...e, position: [-x, y, z], quaternion: [qx, -qy, -qz, qw] };
}

export function buildMuscles(): Ellipsoid[] {
  const right = rightSide();
  const out: Ellipsoid[] = [];
  for (const e of right) {
    out.push(e);
    if (Math.abs(e.position[0]) > 0.005) out.push(mirror(e));
  }
  // Neck sits on the midline
  out.push({ muscle: "neck", position: [0, 1.52, -0.005], quaternion: [0, 0, 0, 1], scale: [0.052, 0.065, 0.05] });
  return out;
}
