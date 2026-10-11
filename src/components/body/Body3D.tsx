"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import type { MuscleScores } from "@/lib/muscles";
import type { MuscleId } from "@/lib/types";
import { buildMuscles, J, SEGMENTS, TORSO_DEPTH, TORSO_PROFILE, type LimbSeg } from "./anatomy";
import { colorFor, type Palette } from "./palette";

export type Body3DProps = {
  scores: MuscleScores;
  palette: Palette;
  highlighted?: MuscleId[];
  onSelect?: (m: MuscleId) => void;
  view?: "front" | "back";
  autoRotate?: boolean;
};

const SKIN = "#465063";
const sphere = new THREE.SphereGeometry(1, 32, 24);

function Limb({ seg, mirror }: { seg: LimbSeg; mirror: boolean }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = seg.a.clone();
    const b = seg.b.clone();
    if (mirror) {
      a.x *= -1;
      b.x *= -1;
    }
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid, quaternion: quat, length: dir.length() };
  }, [seg, mirror]);
  return (
    <mesh position={position} quaternion={quaternion}>
      {/* CylinderGeometry: top radius = end b (top is +y, which points a→b) */}
      <cylinderGeometry args={[seg.rB, seg.rA, length, 28, 1]} />
      <meshStandardMaterial color={SKIN} roughness={0.7} />
    </mesh>
  );
}

function Joint({ p, r, mirror, scale }: { p: THREE.Vector3; r: number; mirror?: boolean; scale?: [number, number, number] }) {
  return (
    <mesh
      geometry={sphere}
      position={[mirror ? -p.x : p.x, p.y, p.z]}
      scale={scale ? [scale[0] * r, scale[1] * r, scale[2] * r] : r}
    >
      <meshStandardMaterial color={SKIN} roughness={0.7} />
    </mesh>
  );
}

function Mannequin() {
  const torso = useMemo(() => {
    const g = new THREE.LatheGeometry(
      TORSO_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
      48,
    );
    g.scale(1, 1, TORSO_DEPTH);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={torso}>
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      {/* head */}
      <mesh geometry={sphere} position={[0, 1.665, 0.005]} scale={[0.088, 0.112, 0.1]}>
        <meshStandardMaterial color={SKIN} roughness={0.6} />
      </mesh>
      {[false, true].map((m) => (
        <group key={String(m)}>
          <Limb seg={SEGMENTS.upperArm} mirror={m} />
          <Limb seg={SEGMENTS.forearm} mirror={m} />
          <Limb seg={SEGMENTS.thigh} mirror={m} />
          <Limb seg={SEGMENTS.shin} mirror={m} />
          <Joint p={J.shoulder} r={0.052} mirror={m} />
          <Joint p={J.elbow} r={0.041} mirror={m} />
          <Joint p={J.knee} r={0.058} mirror={m} />
          <Joint p={J.ankle} r={0.036} mirror={m} />
          {/* hand */}
          <Joint p={new THREE.Vector3(J.wrist.x + 0.012, J.wrist.y - 0.075, J.wrist.z + 0.005)} r={0.04} mirror={m} scale={[0.7, 1.6, 0.9]} />
          {/* foot */}
          <mesh geometry={sphere} position={[m ? -0.115 : 0.115, 0.04, 0.04]} scale={[0.042, 0.04, 0.11]}>
            <meshStandardMaterial color={SKIN} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Muscles({ scores, palette, highlighted, onSelect }: Omit<Body3DProps, "view" | "autoRotate">) {
  const parts = useMemo(() => buildMuscles(), []);
  const [hover, setHover] = useState<MuscleId | null>(null);
  const hi = useMemo(() => new Set(highlighted ?? []), [highlighted]);

  useEffect(() => {
    document.body.style.cursor = hover && onSelect ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover, onSelect]);

  const click = (m: MuscleId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // was a drag/rotate, not a tap
    onSelect?.(m);
  };

  return (
    <group>
      {parts.map((p, i) => {
        const active = hi.has(p.muscle);
        const isHover = hover === p.muscle;
        return (
          <mesh
            key={i}
            geometry={sphere}
            position={p.position}
            quaternion={p.quaternion}
            scale={p.scale}
            onClick={click(p.muscle)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(p.muscle);
            }}
            onPointerOut={() => setHover((h) => (h === p.muscle ? null : h))}
          >
            <meshStandardMaterial
              color={colorFor(scores[p.muscle], palette)}
              roughness={0.42}
              metalness={0.05}
              emissive={active ? "#ffffff" : isHover ? "#ffffff" : "#000000"}
              emissiveIntensity={active ? 0.35 : isHover ? 0.15 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Controls({ view, autoRotate }: { view?: "front" | "back"; autoRotate?: boolean }) {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.setAzimuthalAngle(view === "back" ? Math.PI : 0);
    c.update();
  }, [view]);
  return (
    <OrbitControls
      ref={ref}
      target={[0, 0.92, 0]}
      enablePan={false}
      minDistance={1.6}
      maxDistance={4.2}
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.82}
      autoRotate={autoRotate}
      autoRotateSpeed={1.2}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.9}
    />
  );
}

export default function Body3D(props: Body3DProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 1.05, 3.4], fov: 32, near: 0.1, far: 20 }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      style={{ touchAction: "none" }}
    >
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#dbe4ff", "#15171c", 0.7]} />
      <directionalLight position={[2, 4, 3]} intensity={1.7} />
      <directionalLight position={[-2.5, 2.5, -3]} intensity={0.9} color="#a5b4fc" />
      <directionalLight position={[0, -1, 2]} intensity={0.25} />
      <group position={[0, 0, 0]}>
        <Mannequin />
        <Muscles {...props} />
      </group>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={2} blur={2.4} far={1} />
      <Controls view={props.view} autoRotate={props.autoRotate} />
    </Canvas>
  );
}
