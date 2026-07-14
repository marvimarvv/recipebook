"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function getCssColor(varName: string): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim(); // e.g. "24 88% 52%"
  const parts = raw.split(" ");
  return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
}

function generateGrainTexture(size: number): THREE.CanvasTexture {
  // Step 1 – raw random noise
  const raw = document.createElement("canvas");
  raw.width = size;
  raw.height = size;
  const rawCtx = raw.getContext("2d")!;
  const imgData = rawCtx.createImageData(size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 200) + 30;
    imgData.data[i] = v;
    imgData.data[i + 1] = v;
    imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
  }
  rawCtx.putImageData(imgData, 0, 0);

  // Step 2 – blur pass for organic softness
  const blurred = document.createElement("canvas");
  blurred.width = size;
  blurred.height = size;
  const blurCtx = blurred.getContext("2d")!;
  blurCtx.filter = "blur(1.5px)";
  blurCtx.drawImage(raw, 0, 0);

  const tex = new THREE.CanvasTexture(blurred);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

// ---------------------------------------------------------------------------
// A soft, extruded 4-pointed "sparkle" star — the AI centrepiece.
// ---------------------------------------------------------------------------

function useSparkleGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape();
    const outer = 1;
    const inner = 0.3;
    const points = 4;
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = i * step - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.14,
      bevelSegments: 5,
      curveSegments: 16,
    });
    geo.center();
    return geo;
  }, []);
}

function CentralSparkle({
  color,
  grainTexture,
}: {
  color: string;
  grainTexture: THREE.CanvasTexture;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useSparkleGeometry();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    meshRef.current.rotation.z = t * 0.25;
    meshRef.current.rotation.y = Math.sin(t * 0.6) * 0.35;
    meshRef.current.rotation.x = Math.cos(t * 0.5) * 0.2;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={1.05}>
      <meshStandardMaterial
        color={color}
        roughness={0.95}
        metalness={0}
        bumpMap={grainTexture}
        bumpScale={0.04}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Ingredient sphere orbiting in a tilted plane
// ---------------------------------------------------------------------------

interface IngredientProps {
  color: string;
  size: number;
  radius: number;
  speed: number;
  offset: number;
  tilt: [number, number, number];
  grainTexture: THREE.CanvasTexture;
}

function OrbitingIngredient({
  color,
  size,
  radius,
  speed,
  offset,
  tilt,
  grainTexture,
}: IngredientProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime * speed + offset;
    meshRef.current.position.x = Math.cos(t) * radius;
    meshRef.current.position.z = Math.sin(t) * radius;
    meshRef.current.rotation.y += 0.008;
    meshRef.current.rotation.x += 0.005;
  });

  return (
    <group rotation={tilt}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshStandardMaterial
          color={color}
          roughness={0.95}
          metalness={0}
          bumpMap={grainTexture}
          bumpScale={0.09}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Subtle orbit path ring
// ---------------------------------------------------------------------------

function OrbitRing({
  radius,
  tilt,
  color,
}: {
  radius: number;
  tilt: [number, number, number];
  color: string;
}) {
  return (
    <mesh rotation={tilt}>
      <torusGeometry args={[radius, 0.006, 8, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.12} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Static data – 6 ingredients across 3 tilted orbital planes
// ---------------------------------------------------------------------------

type IngredientData = Omit<IngredientProps, "grainTexture">;

const INGREDIENTS: IngredientData[] = [
  // Ring 1 – slight tilt
  {
    color: "#e8877a",
    size: 0.28,
    radius: 2.2,
    speed: 0.35,
    offset: 0,
    tilt: [0.3, 0, 0],
  }, // apple
  {
    color: "#a7c489",
    size: 0.3,
    radius: 2.2,
    speed: 0.35,
    offset: Math.PI,
    tilt: [0.3, 0, 0],
  }, // lime
  // Ring 2 – medium tilt
  {
    color: "#f2d98a",
    size: 0.22,
    radius: 2.8,
    speed: 0.28,
    offset: 0,
    tilt: [0.7, 0, 0.4],
  }, // lemon
  {
    color: "#b9a0d1",
    size: 0.18,
    radius: 2.8,
    speed: 0.28,
    offset: Math.PI,
    tilt: [0.7, 0, 0.4],
  }, // plum
  // Ring 3 – steep tilt
  {
    color: "#f0ad82",
    size: 0.24,
    radius: 2.5,
    speed: 0.32,
    offset: Math.PI / 2,
    tilt: [1.1, 0, -0.3],
  }, // peach
  {
    color: "#cdd88f",
    size: 0.2,
    radius: 2.5,
    speed: 0.32,
    offset: -Math.PI / 2,
    tilt: [1.1, 0, -0.3],
  }, // pear
];

const ORBIT_RINGS: { radius: number; tilt: [number, number, number] }[] = [
  { radius: 2.2, tilt: [0.3, 0, 0] },
  { radius: 2.8, tilt: [0.7, 0, 0.4] },
  { radius: 2.5, tilt: [1.1, 0, -0.3] },
];

// ---------------------------------------------------------------------------
// Scene – reads CSS vars at mount, creates grain texture once
// ---------------------------------------------------------------------------

function Scene() {
  const primaryColor = getCssColor("--primary");
  const secondaryColor = getCssColor("--secondary");
  const grainTexture = useMemo(() => generateGrainTexture(256), []);

  return (
    <>
      {/* Soft, even studio lighting for a matte clay-render look */}
      <hemisphereLight args={["#ffffff", "#efe6d8", 1.15]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-4, -1, -2]} intensity={0.35} />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
        <CentralSparkle color={primaryColor} grainTexture={grainTexture} />

        {ORBIT_RINGS.map((ring, i) => (
          <OrbitRing
            key={i}
            radius={ring.radius}
            tilt={ring.tilt}
            color={secondaryColor}
          />
        ))}

        {INGREDIENTS.map((ing, i) => (
          <OrbitingIngredient key={i} {...ing} grainTexture={grainTexture} />
        ))}
      </Float>
    </>
  );
}

// ---------------------------------------------------------------------------
// Exported component – wrapped in a pointer-events-none container so it
// doesn't interfere with page interaction
// ---------------------------------------------------------------------------

export default function HeroScene() {
  return (
    <div className="relative w-full h-[200px] md:h-[360px] pointer-events-none">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.4, 6.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
      {/* Fine film-grain overlay for an organic, matte-render feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.22,
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}
