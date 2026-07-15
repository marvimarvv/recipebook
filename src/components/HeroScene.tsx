"use client";

import { useRef, useMemo, ReactNode } from "react";
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

// Risograph-style color texture: a smooth gradient with a fine, single-texel
// pigment grain baked in (paper-tooth jitter + sparse light/dark speckle).
function makeGrainyTexture(
  from: string,
  to: string,
  diagonal = false,
  size = 320,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = diagonal
    ? ctx.createLinearGradient(0, 0, size, size) // top-left → bottom-right
    : ctx.createLinearGradient(0, 0, 0, size); // top → bottom
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const jitter = (Math.random() - 0.5) * 14;
    const speck = Math.random() < 0.04 ? (Math.random() < 0.5 ? -22 : 18) : 0;
    const n = jitter + speck;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ExtrudeGeometry writes UVs in raw shape coordinates; remap them into [0, 1]
// so a gradient map spans the whole shape (face, bevel and rim) seamlessly.
function remapUVsToXY(geo: THREE.BufferGeometry, extent: number) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(
      i,
      pos.getX(i) / (2 * extent) + 0.5,
      pos.getY(i) / (2 * extent) + 0.5,
    );
  }
  uv.needsUpdate = true;
}

// Smooths a lathe profile with a low-tension Catmull-Rom spline so rounded
// fruit silhouettes (pear/avocado, carrot) don't show polygon kinks.
function smoothProfile(
  points: THREE.Vector2[],
  samples: number,
): THREE.Vector2[] {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p.x, p.y, 0)),
    false,
    "catmullrom",
    0.15,
  );
  return curve
    .getPoints(samples)
    .map((p) => new THREE.Vector2(Math.max(p.x, 0.0008), p.y));
}

function useGrainy(from: string, to?: string, diagonal = false) {
  const toColor = to ?? from;
  return useMemo(
    () => makeGrainyTexture(from, toColor, diagonal),
    [from, toColor, diagonal],
  );
}

// ---------------------------------------------------------------------------
// Ink material – Lambert has no specular term at all, so surfaces read as
// pigment on paper instead of lit plastic. All color/grain lives in the map.
// ---------------------------------------------------------------------------

function InkMaterial({
  map,
  emissive,
}: {
  map: THREE.CanvasTexture;
  emissive?: string;
}) {
  return (
    <meshLambertMaterial
      color="#ffffff"
      map={map}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissive ? 0.1 : 0}
    />
  );
}

// ---------------------------------------------------------------------------
// Logo coin – the header badge as a 3D object: a soft beveled disc with the
// brand gradient and a raised fork + knife relief (lucide "Utensils").
// ---------------------------------------------------------------------------

const ICON_COLOR = "#fdf8f0";
const Z_ICON = 0.19;

function LogoCoin({
  primary,
  secondary,
}: {
  primary: string;
  secondary: string;
}) {
  const gradient = useGrainy(primary, secondary, true);
  const iconTexture = useGrainy(ICON_COLOR);

  const coinGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1.0, 0, Math.PI * 2, false);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 48,
    });
    geo.center();
    remapUVsToXY(geo, 1.1);
    return geo;
  }, []);

  // Shared handle proportions – both utensils end in the same tapered,
  // pointed-tip handle shape.
  const HANDLE_HALF_W = 0.042;
  const HANDLE_TOP_Y = 0.08;
  const HANDLE_STRAIGHT_BOTTOM_Y = -0.4;
  const HANDLE_TIP_Y = -0.5;

  function extrudeIconShape(shape: THREE.Shape) {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
      curveSegments: 16,
    });
    geo.center();
    remapUVsToXY(geo, 0.55);
    return geo;
  }

  // Fork – a single flat silhouette: four tapered tines merging through a
  // trapezoid palm into the shared handle, matching a real fork's outline.
  const forkGeometry = useMemo(() => {
    const tineHalfW = 0.032;
    const tineBaseY = 0.3;
    const tineTipY = 0.5;
    const tineCenters = [0.15, 0.05, -0.05, -0.15];
    const palmHalfW = tineCenters[0] + tineHalfW;

    const shape = new THREE.Shape();
    shape.moveTo(0, HANDLE_TIP_Y);
    shape.lineTo(HANDLE_HALF_W, HANDLE_STRAIGHT_BOTTOM_Y);
    shape.lineTo(HANDLE_HALF_W, HANDLE_TOP_Y);
    shape.lineTo(palmHalfW, tineBaseY);
    tineCenters.forEach((cx, i) => {
      shape.lineTo(cx, tineTipY);
      const baseLeftX = cx - tineHalfW;
      shape.lineTo(baseLeftX, tineBaseY);
      if (i < tineCenters.length - 1) {
        const nextBaseRightX = tineCenters[i + 1] + tineHalfW;
        shape.lineTo(nextBaseRightX, tineBaseY);
      }
    });
    shape.lineTo(-HANDLE_HALF_W, HANDLE_TOP_Y);
    shape.lineTo(-HANDLE_HALF_W, HANDLE_STRAIGHT_BOTTOM_Y);
    shape.lineTo(0, HANDLE_TIP_Y);

    return extrudeIconShape(shape);
  }, []);

  // Knife – straight spine on one side, curved belly on the other, tapering
  // to a point; same handle as the fork.
  const knifeGeometry = useMemo(() => {
    const bladeTipY = 0.58;

    const shape = new THREE.Shape();
    shape.moveTo(0, HANDLE_TIP_Y);
    shape.lineTo(HANDLE_HALF_W, HANDLE_STRAIGHT_BOTTOM_Y);
    shape.lineTo(HANDLE_HALF_W, HANDLE_TOP_Y);
    shape.lineTo(0.15, 0.2);
    shape.quadraticCurveTo(0.19, 0.3, 0.17, 0.42);
    shape.quadraticCurveTo(0.14, 0.52, 0.02, bladeTipY);
    shape.quadraticCurveTo(-0.04, 0.45, -0.05, 0.3);
    shape.lineTo(-HANDLE_HALF_W, HANDLE_TOP_Y);
    shape.lineTo(-HANDLE_HALF_W, HANDLE_STRAIGHT_BOTTOM_Y);
    shape.lineTo(0, HANDLE_TIP_Y);

    return extrudeIconShape(shape);
  }, []);

  const iconMaterial = <InkMaterial map={iconTexture} />;

  return (
    <group scale={1.275}>
      <mesh geometry={coinGeometry}>
        <InkMaterial map={gradient} />
      </mesh>

      <mesh geometry={forkGeometry} position={[-0.33, 0, Z_ICON - 0.02]}>
        {iconMaterial}
      </mesh>
      <mesh geometry={knifeGeometry} position={[0.33, 0, Z_ICON - 0.02]}>
        {iconMaterial}
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Ingredients – small primitive sculpts with grainy baked gradients. Lighter
// tops read as gentle sky light; the baked stipple keeps them print-like.
// ---------------------------------------------------------------------------

function Tomato() {
  const gradient = useGrainy("#f2704f", "#c1341f");
  const green = useGrainy("#4d7a35");
  return (
    <group>
      <mesh scale={[1, 0.82, 1]}>
        <sphereGeometry args={[0.3, 48, 48]} />
        <InkMaterial map={gradient} emissive="#c1341f" />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <coneGeometry args={[0.05, 0.09, 12]} />
        <InkMaterial map={green} />
      </mesh>
    </group>
  );
}

function Avocado() {
  const gradient = useGrainy("#5d8243", "#2b4421");
  const stem = useGrainy("#3a2e22");
  const geometry = useMemo(() => {
    const rawPts = [
      new THREE.Vector2(0.001, -0.34),
      new THREE.Vector2(0.16, -0.3),
      new THREE.Vector2(0.26, -0.12),
      new THREE.Vector2(0.22, 0.06),
      new THREE.Vector2(0.13, 0.22),
      new THREE.Vector2(0.09, 0.3),
      new THREE.Vector2(0.001, 0.36),
    ];
    return new THREE.LatheGeometry(smoothProfile(rawPts, 48), 48);
  }, []);
  return (
    <group>
      <mesh geometry={geometry}>
        <InkMaterial map={gradient} emissive="#2b4421" />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <InkMaterial map={stem} />
      </mesh>
    </group>
  );
}

function Lemon() {
  const gradient = useGrainy("#f7dc5c", "#e0a828");
  const material = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: "#ffffff",
        map: gradient,
        emissive: new THREE.Color("#e0a828"),
        emissiveIntensity: 0.1,
      }),
    [gradient],
  );
  return (
    <group>
      <mesh scale={[1.35, 1, 1]} material={material}>
        <sphereGeometry args={[0.22, 48, 48]} />
      </mesh>
      <mesh position={[0.31, 0, 0]} scale={[1.6, 0.8, 0.8]} material={material}>
        <sphereGeometry args={[0.05, 24, 24]} />
      </mesh>
      <mesh
        position={[-0.31, 0, 0]}
        scale={[1.6, 0.8, 0.8]}
        material={material}
      >
        <sphereGeometry args={[0.05, 24, 24]} />
      </mesh>
    </group>
  );
}

function Blueberry() {
  const gradient = useGrainy("#7583bd", "#39417a");
  const calyx = useGrainy("#232a52");
  return (
    <group>
      <mesh scale={[1, 0.88, 1]}>
        <sphereGeometry args={[0.17, 48, 48]} />
        <InkMaterial map={gradient} emissive="#39417a" />
      </mesh>
      <mesh position={[0, 0.145, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.055, 0.014, 8, 24]} />
        <InkMaterial map={calyx} />
      </mesh>
    </group>
  );
}

function Carrot() {
  const gradient = useGrainy("#f29a4b", "#d05f16");
  const green = useGrainy("#5b8f3e");
  const geometry = useMemo(() => {
    const rawPts = [
      new THREE.Vector2(0.001, -0.3),
      new THREE.Vector2(0.045, -0.12),
      new THREE.Vector2(0.075, 0.08),
      new THREE.Vector2(0.09, 0.2),
      new THREE.Vector2(0.055, 0.26),
      new THREE.Vector2(0.001, 0.27),
    ];
    return new THREE.LatheGeometry(smoothProfile(rawPts, 40), 40);
  }, []);
  return (
    <group rotation={[0.2, 0, 0.5]}>
      <mesh geometry={geometry}>
        <InkMaterial map={gradient} emissive="#d05f16" />
      </mesh>
      {[0, 0.45, -0.45].map((rz, i) => (
        <mesh
          key={i}
          position={[Math.sin(rz) * 0.06, 0.36, 0]}
          rotation={[0, 0, rz]}
        >
          <capsuleGeometry args={[0.025, 0.16, 4, 8]} />
          <InkMaterial map={green} />
        </mesh>
      ))}
    </group>
  );
}

function HerbLeaf() {
  const gradient = useGrainy("#79b25b", "#3f7031");
  const stem = useGrainy("#5b8f3e");
  const geometry = useMemo(() => {
    const leaf = new THREE.Shape();
    leaf.moveTo(0, -0.26);
    leaf.quadraticCurveTo(0.2, -0.05, 0, 0.28);
    leaf.quadraticCurveTo(-0.2, -0.05, 0, -0.26);
    const geo = new THREE.ExtrudeGeometry(leaf, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 24,
    });
    geo.center();
    remapUVsToXY(geo, 0.3);
    return geo;
  }, []);
  return (
    <group rotation={[-0.4, 0, 0.2]}>
      <mesh geometry={geometry}>
        <InkMaterial map={gradient} emissive="#3f7031" />
      </mesh>
      <mesh position={[0, -0.31, 0]}>
        <capsuleGeometry args={[0.015, 0.12, 4, 8]} />
        <InkMaterial map={stem} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Orbit machinery
// ---------------------------------------------------------------------------

const INGREDIENT_SCALE = 1.35;

interface OrbitProps {
  radius: number;
  speed: number;
  offset: number;
  tilt: [number, number, number];
  itemScale?: number;
  children: ReactNode;
}

function OrbitingItem({
  radius,
  speed,
  offset,
  tilt,
  itemScale = 1,
  children,
}: OrbitProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime * speed + offset;
    groupRef.current.position.x = Math.cos(t) * radius;
    groupRef.current.position.z = Math.sin(t) * radius;
    // Slow tumble only around y so sculpted shapes stay recognizable
    groupRef.current.rotation.y += 0.004;
  });

  return (
    <group rotation={tilt}>
      <group ref={groupRef} scale={INGREDIENT_SCALE * itemScale}>
        {children}
      </group>
    </group>
  );
}

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

type IngredientKind =
  "tomato" | "avocado" | "lemon" | "blueberry" | "carrot" | "herb";

const KIND_TO_COMPONENT: Record<IngredientKind, () => JSX.Element> = {
  tomato: Tomato,
  avocado: Avocado,
  lemon: Lemon,
  blueberry: Blueberry,
  carrot: Carrot,
  herb: HerbLeaf,
};

// Ring tilts are kept low (mostly rotation around a shallow angle) so orbits
// read as flat, wide ellipses rather than tall, Ferris-wheel-like loops.
const RING_TILT: [number, number, number][] = [
  [0.15, 0, 0.05],
  [0.3, 0, 0.18],
  [0.45, 0, -0.12],
];

const ORBIT_ITEMS: ({ kind: IngredientKind } & Omit<OrbitProps, "children">)[] =
  [
    // Ring 1
    {
      kind: "tomato",
      radius: 2.2,
      speed: 0.35,
      offset: 0,
      tilt: RING_TILT[0],
    },
    {
      kind: "avocado",
      radius: 2.2,
      speed: 0.35,
      offset: Math.PI,
      tilt: RING_TILT[0],
    },
    // Ring 2
    {
      kind: "lemon",
      radius: 2.8,
      speed: 0.28,
      offset: 0,
      tilt: RING_TILT[1],
    },
    {
      kind: "blueberry",
      radius: 2.8,
      speed: 0.28,
      offset: Math.PI,
      tilt: RING_TILT[1],
    },
    // Ring 3
    {
      kind: "carrot",
      radius: 2.5,
      speed: 0.32,
      offset: Math.PI / 2,
      tilt: RING_TILT[2],
    },
    {
      kind: "herb",
      radius: 2.5,
      speed: 0.32,
      offset: -Math.PI / 2,
      tilt: RING_TILT[2],
    },
    // A few smaller leaves scattered in the gaps between the fruits
    {
      kind: "herb",
      radius: 2.2,
      speed: 0.35,
      offset: Math.PI / 2,
      tilt: RING_TILT[0],
      itemScale: 0.55,
    },
    {
      kind: "herb",
      radius: 2.8,
      speed: 0.28,
      offset: Math.PI / 2,
      tilt: RING_TILT[1],
      itemScale: 0.5,
    },
    {
      kind: "herb",
      radius: 2.8,
      speed: 0.28,
      offset: (3 * Math.PI) / 2,
      tilt: RING_TILT[1],
      itemScale: 0.45,
    },
    {
      kind: "herb",
      radius: 2.5,
      speed: 0.32,
      offset: 0,
      tilt: RING_TILT[2],
      itemScale: 0.6,
    },
  ];

const ORBIT_RINGS: { radius: number; tilt: [number, number, number] }[] = [
  { radius: 2.2, tilt: RING_TILT[0] },
  { radius: 2.8, tilt: RING_TILT[1] },
  { radius: 2.5, tilt: RING_TILT[2] },
];

// ---------------------------------------------------------------------------
// Scene – reads CSS vars at mount
// ---------------------------------------------------------------------------

function Scene() {
  const primaryColor = getCssColor("--primary");
  const secondaryColor = getCssColor("--secondary");

  return (
    <>
      {/* Flat, even light – shading comes mostly from the baked gradients,
          so the objects read as printed ink rather than lit plastic */}
      <hemisphereLight args={["#fff8ee", "#ede4d3", 1.5]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={0.45} color="#fff2e2" />
      <directionalLight position={[-4, -1, -2]} intensity={0.25} />

      {/* Static center — no float/sway, so it stays put while ingredients orbit */}
      <LogoCoin primary={primaryColor} secondary={secondaryColor} />

      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
        {ORBIT_RINGS.map((ring, i) => (
          <OrbitRing
            key={i}
            radius={ring.radius}
            tilt={ring.tilt}
            color={secondaryColor}
          />
        ))}

        {ORBIT_ITEMS.map(({ kind, ...orbit }, i) => {
          const Ingredient = KIND_TO_COMPONENT[kind];
          return (
            <OrbitingItem key={`${kind}-${i}`} {...orbit}>
              <Ingredient />
            </OrbitingItem>
          );
        })}
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
    <div className="pointer-events-none relative h-[340px] w-full md:h-[560px]">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.4, 6.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
      {/* Fine film-grain overlay for an organic, printed feel */}
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
