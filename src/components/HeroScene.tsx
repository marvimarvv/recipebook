"use client";

import { useRef, useMemo, ReactNode, JSX } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
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
  bumpMap,
  bumpScale = 1,
  side,
}: {
  map: THREE.CanvasTexture;
  emissive?: string;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
  side?: THREE.Side;
}) {
  return (
    <meshLambertMaterial
      color="#ffffff"
      map={map}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissive ? 0.1 : 0}
      bumpMap={bumpMap ?? null}
      bumpScale={bumpScale}
      side={side ?? THREE.FrontSide}
    />
  );
}

// ---------------------------------------------------------------------------
// Logo coin – the header badge as a 3D object: a soft beveled disc with the
// brand gradient and a raised fork + knife relief (lucide "Utensils").
// ---------------------------------------------------------------------------

const ICON_COLOR = "#fdf8f0";
const Z_ICON = 0.19;

// Shared handle proportions – both utensils end in the same straight
// handle with a rounded end.
const HANDLE_HALF_W = 0.042;
const HANDLE_TOP_Y = 0.06;
const HANDLE_END_Y = -0.46;

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

  // Fork – one silhouette: four round-tipped tines with rounded gaps, a palm
  // that flares smoothly out of the handle.
  const forkGeometry = useMemo(() => {
    const tineHalfW = 0.028;
    const tineTipY = 0.5;
    const gapBottomY = 0.27;
    const palmY = 0.24;
    const tineCenters = [0.15, 0.05, -0.05, -0.15];
    const palmHalfW = tineCenters[0] + tineHalfW;

    const shape = new THREE.Shape();
    shape.moveTo(HANDLE_HALF_W, HANDLE_END_Y);
    shape.lineTo(HANDLE_HALF_W, HANDLE_TOP_Y);
    shape.quadraticCurveTo(palmHalfW, HANDLE_TOP_Y + 0.05, palmHalfW, palmY);
    tineCenters.forEach((cx, i) => {
      shape.lineTo(cx + tineHalfW, tineTipY - tineHalfW);
      shape.absarc(cx, tineTipY - tineHalfW, tineHalfW, 0, Math.PI, false);
      const next = tineCenters[i + 1];
      if (next !== undefined) {
        const gapR = (cx - next - 2 * tineHalfW) / 2;
        shape.lineTo(cx - tineHalfW, gapBottomY + gapR);
        shape.absarc(
          (cx + next) / 2,
          gapBottomY + gapR,
          gapR,
          0,
          Math.PI,
          true,
        );
      }
    });
    shape.lineTo(-palmHalfW, palmY);
    shape.quadraticCurveTo(
      -palmHalfW,
      HANDLE_TOP_Y + 0.05,
      -HANDLE_HALF_W,
      HANDLE_TOP_Y,
    );
    shape.lineTo(-HANDLE_HALF_W, HANDLE_END_Y);
    shape.absarc(0, HANDLE_END_Y, HANDLE_HALF_W, Math.PI, 2 * Math.PI, false);

    return extrudeIconShape(shape);
  }, []);

  // Knife – straight spine on one side, curved belly on the other, tapering
  // to a rounded point; same handle as the fork.
  const knifeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(HANDLE_HALF_W, HANDLE_END_Y);
    shape.lineTo(HANDLE_HALF_W, HANDLE_TOP_Y);
    shape.quadraticCurveTo(0.15, 0.12, 0.155, 0.24);
    shape.quadraticCurveTo(0.16, 0.44, 0.06, 0.55);
    shape.quadraticCurveTo(0.01, 0.6, -0.025, 0.56);
    shape.quadraticCurveTo(-0.045, 0.5, -0.045, 0.3);
    shape.lineTo(-HANDLE_HALF_W, HANDLE_TOP_Y);
    shape.lineTo(-HANDLE_HALF_W, HANDLE_END_Y);
    shape.absarc(0, HANDLE_END_Y, HANDLE_HALF_W, Math.PI, 2 * Math.PI, false);

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
// Sculpting helpers – ingredients are built from displaced spheres, lathes of
// analytic profiles and bent leaf planes, so silhouettes stay smooth and
// organic instead of reading as stacked primitives.
// ---------------------------------------------------------------------------

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// Samples a radius-at-height function into lathe points, packed densely
// toward the poles where the curvature is highest.
function profilePoints(
  radiusAt: (y: number) => number,
  yMin: number,
  yMax: number,
  samples = 64,
): THREE.Vector2[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const y =
      yMin + ((yMax - yMin) * (1 - Math.cos((Math.PI * i) / samples))) / 2;
    return new THREE.Vector2(Math.max(radiusAt(y), 0.0005), y);
  });
}

// Traces the outline of a 2D signed distance field (r = distance from the
// axis) into lathe points. Blending shapes as distance fields gives real
// fillets – e.g. the concave neck where a lemon swells into its tip.
function implicitProfile(
  sdf: (r: number, y: number) => number,
  yBound: number,
  samples = 80,
): THREE.Vector2[] {
  const root = (f: (x: number) => number, inside: number, outside: number) => {
    let a = inside;
    let b = outside;
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (f(m) < 0) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  const yMin = root((y) => sdf(0, y), 0, -yBound);
  const yMax = root((y) => sdf(0, y), 0, yBound);
  return profilePoints(
    (y) => (sdf(0, y) < 0 ? root((r) => sdf(r, y), 0, yBound) : 0),
    yMin,
    yMax,
    samples,
  );
}

// Polynomial smooth minimum of two distances.
function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
}

function displace(geo: THREE.BufferGeometry, fn: (v: THREE.Vector3) => void) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    fn(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
}

// computeVertexNormals leaves a visible seam where spheres and lathes
// duplicate vertices for UVs; average normals across coincident positions.
function smoothNormals(geo: THREE.BufferGeometry) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  const n = new THREE.Vector3();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    n.set(0, 0, 0);
    for (const i of list) {
      n.x += nor.getX(i);
      n.y += nor.getY(i);
      n.z += nor.getZ(i);
    }
    n.normalize();
    for (const i of list) nor.setXYZ(i, n.x, n.y, n.z);
  }
  nor.needsUpdate = true;
  return geo;
}

// Points the gradient's v axis along world height, so every sculpt is
// lighter on top no matter how it was built or rotated. `planar` also
// projects u from x, so grain on a sideways lathe doesn't streak.
function uvFromHeight(geo: THREE.BufferGeometry, planar = false) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox!;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, (pos.getY(i) - min.y) / (max.y - min.y));
    if (planar) uv.setX(i, (pos.getX(i) - min.x) / (max.x - min.x));
  }
  uv.needsUpdate = true;
  return geo;
}

interface LeafOptions {
  length: number;
  width: number; // half width at the widest point
  outline: (t: number) => number; // 0..1 half-width along the length
  droop?: number; // tip bends back (−z)
  cup?: number; // edges curl forward (+z)
  fold?: number; // V-fold along the midrib
  wave?: number; // crinkle along the margin
  twist?: number;
}

// A leaf in the XY plane, base at the origin, growing along +y with its upper
// face toward +z. UVs run across (u) and along (v) the blade.
function makeLeafGeometry({
  length,
  width,
  outline,
  droop = 0,
  cup = 0,
  fold = 0,
  wave = 0,
  twist = 0,
}: LeafOptions) {
  const geo = new THREE.PlaneGeometry(1, 1, 10, 28);
  displace(geo, (v) => {
    const s = v.x * 2;
    const t = v.y + 0.5;
    const hw = width * outline(t);
    const x = s * hw;
    const z =
      -droop * t * t * length +
      cup * s * s * hw +
      fold * Math.abs(s) * hw +
      wave * Math.sin(t * 19) * s * s * hw;
    const a = twist * t;
    v.set(
      x * Math.cos(a) - z * Math.sin(a),
      t * length,
      x * Math.sin(a) + z * Math.cos(a),
    );
  });
  return smoothNormals(geo);
}

const LEAF_OUTLINES = {
  // Ovate, widest below the middle, pointed tip – basil, lemon leaf
  ovate: (t: number) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.8),
  // Narrow, pointed – carrot leaflets
  lance: (t: number) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 1.2),
  // Broad base tapering to a point – tomato and blueberry sepals
  sepal: (t: number) => Math.pow(1 - t, 1.1) * Math.min(1, 0.35 + t * 5),
};

// Even per-texel pigment jitter over whatever is already painted.
function addGrain(ctx: CanvasRenderingContext2D, size: number, amount: number) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// Leaf color map: a base→tip gradient with a pale midrib and side veins drawn
// in UV space, then the same pigment grain as the other surfaces.
function makeLeafTexture(tip: string, base: string, veins = 6) {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, tip);
  g.addColorStop(1, base);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255, 252, 225, 0.2)";
  ctx.lineCap = "round";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(size / 2, size);
  ctx.lineTo(size / 2, size * 0.04);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (let i = 1; i <= veins; i++) {
    const y = size * (1 - i / (veins + 1.5));
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(size / 2, y);
      ctx.quadraticCurveTo(
        size / 2 + dir * size * 0.28,
        y - size * 0.05,
        size / 2 + dir * size * 0.47,
        y - size * 0.16,
      );
      ctx.stroke();
    }
  }

  addGrain(ctx, size, 14);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Height map for skin relief: soft dots (citrus pores, avocado pebbling) on
// mid gray, tiled across the surface.
function makeBumpTexture(
  dots: number,
  radius: number,
  repeat: [number, number],
) {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < dots; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = radius * (0.6 + Math.random() * 0.8);
    const dark = Math.random() < 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, dark ? "rgba(40,40,40,0.5)" : "rgba(220,220,220,0.5)");
    g.addColorStop(1, "rgba(128,128,128,0)");
    ctx.fillStyle = g;
    // Draw wrapped copies so the tile repeats seamlessly
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  return tex;
}

function useLeafTexture(tip: string, base: string, veins?: number) {
  return useMemo(() => makeLeafTexture(tip, base, veins), [tip, base, veins]);
}

function useBump(dots: number, radius: number, repeat: [number, number]) {
  const [rx, ry] = repeat;
  return useMemo(
    () => makeBumpTexture(dots, radius, [rx, ry]),
    [dots, radius, rx, ry],
  );
}

function Leaf({
  geometry,
  map,
  ...props
}: {
  geometry: THREE.BufferGeometry;
  map: THREE.CanvasTexture;
} & ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh geometry={geometry}>
        <InkMaterial map={map} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

type Vec3 = [number, number, number];
type StalkPoints = [Vec3, Vec3, Vec3];

// A thin stalk following a quadratic curve.
function Stalk({
  points,
  radius,
  map,
}: {
  points: StalkPoints;
  radius: number;
  map: THREE.CanvasTexture;
}) {
  const geometry = useMemo(() => {
    const [a, b, c] = points.map((p) => new THREE.Vector3(...p));
    return new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(a, b, c),
      12,
      radius,
      8,
    );
  }, [points, radius]);
  return (
    <mesh geometry={geometry}>
      <InkMaterial map={map} />
    </mesh>
  );
}

// Star of sepals around a stem, lying on (and curling off) a fruit's top.
function Calyx({
  count,
  length,
  width,
  tilt,
  droop,
  map,
  y,
  inset = 0,
}: {
  count: number;
  length: number;
  width: number;
  tilt: number;
  droop: number;
  map: THREE.CanvasTexture;
  y: number;
  inset?: number;
}) {
  const geometry = useMemo(
    () =>
      makeLeafGeometry({
        length,
        width,
        outline: LEAF_OUTLINES.sepal,
        droop,
        cup: 0.25,
        twist: 0.3,
      }),
    [length, width, droop],
  );
  return (
    <group position={[0, y, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} rotation={[0, (i / count) * Math.PI * 2 + i * 0.15, 0]}>
          <Leaf
            geometry={geometry}
            map={map}
            position={[0, 0, -inset]}
            rotation={[-Math.PI / 2 + tilt + (i % 2) * 0.12, 0, 0]}
          />
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Ingredients – sculpted, recognizable produce with grainy baked gradients.
// Lighter tops read as gentle sky light; the baked stipple keeps them
// print-like.
// ---------------------------------------------------------------------------

const TOMATO_STEM: StalkPoints = [
  [0, 0.2, 0],
  [0, 0.27, 0],
  [0.03, 0.3, 0],
];

function Tomato() {
  const gradient = useGrainy("#f47a55", "#b92e1c");
  const sepals = useLeafTexture("#6f9e47", "#3f6a2b", 0);
  const stem = useGrainy("#5f8c3d", "#456d2c");
  const geometry = useMemo(() => {
    const R = 0.3;
    const geo = new THREE.SphereGeometry(R, 96, 64);
    displace(geo, (v) => {
      const theta = Math.acos(THREE.MathUtils.clamp(v.y / R, -1, 1));
      const phi = Math.atan2(v.z, v.x);
      // Five soft lobes separated by narrow creases, strongest on the
      // shoulders and fading toward the blossom end.
      const crease = Math.pow(Math.abs(Math.cos(2.5 * phi)), 10);
      const weight =
        Math.pow(Math.sin(theta), 0.7) *
        (1 - 0.75 * smoothstep(0.4, 1, theta / Math.PI));
      const lobe = 1 - 0.1 * crease * weight + 0.02 * weight;
      v.x *= lobe;
      v.z *= lobe;
      // Rounder shoulders, flatter underside
      v.y *= v.y > 0 ? 0.86 : 0.74;
      // Stem-end dimple and a slightly flattened blossom end
      v.y -= 0.03 * Math.exp(-Math.pow(theta / 0.26, 2));
      v.y += 0.03 * Math.exp(-Math.pow((Math.PI - theta) / 0.45, 2));
    });
    return smoothNormals(geo);
  }, []);
  return (
    <group>
      <mesh geometry={geometry}>
        <InkMaterial map={gradient} emissive="#b92e1c" />
      </mesh>
      <Calyx
        count={5}
        length={0.14}
        width={0.05}
        tilt={0.2}
        droop={-0.45}
        map={sepals}
        y={0.225}
      />
      <Stalk points={TOMATO_STEM} radius={0.013} map={stem} />
    </group>
  );
}

const AVOCADO_BULB_Y = -0.1; // center of the round lower body

// Builds the half-lathe skin, the flat cut face and the flesh texture
// painted to that face's exact outline.
function buildHalvedAvocado() {
  const sdf = (r: number, y: number) =>
    smin(
      Math.hypot(r, y - AVOCADO_BULB_Y) - 0.225,
      Math.hypot(r, y - 0.19) - 0.115,
      0.11,
    );
  // The neck leans a little to one side, like a real fruit
  const lean = (y: number) => 0.03 * smoothstep(-0.05, 0.3, y);
  const points = implicitProfile(sdf, 0.6, 72);

  const skinGeo = new THREE.LatheGeometry(points, 48, Math.PI / 2, Math.PI);
  displace(skinGeo, (v) => {
    v.x += lean(v.y);
  });
  smoothNormals(skinGeo);
  uvFromHeight(skinGeo);

  const outline = new THREE.Shape();
  points.forEach((p, i) =>
    i === 0
      ? outline.moveTo(p.x + lean(p.y), p.y)
      : outline.lineTo(p.x + lean(p.y), p.y),
  );
  for (let i = points.length - 1; i >= 0; i--) {
    outline.lineTo(-points[i].x + lean(points[i].y), points[i].y);
  }
  const faceGeo = new THREE.ShapeGeometry(outline, 1);
  const extent = 0.32;
  remapUVsToXY(faceGeo, extent);

  // Flesh: buttery yellow around the pit, greening toward a bright rim
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const toCanvas = (x: number, y: number): [number, number] => [
    (x / (2 * extent) + 0.5) * size,
    (1 - (y / (2 * extent) + 0.5)) * size,
  ];
  ctx.beginPath();
  points.forEach((p, i) =>
    ctx[i ? "lineTo" : "moveTo"](...toCanvas(p.x + lean(p.y), p.y)),
  );
  for (let i = points.length - 1; i >= 0; i--) {
    ctx.lineTo(...toCanvas(-points[i].x + lean(points[i].y), points[i].y));
  }
  ctx.closePath();
  const [cx, cy] = toCanvas(0, AVOCADO_BULB_Y + 0.03);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 1.35);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.34);
  g.addColorStop(0, "#f2e7a0");
  g.addColorStop(0.55, "#dfe08a");
  g.addColorStop(0.85, "#a9c95e");
  g.addColorStop(1, "#7fae45");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#6e9e3c";
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#2f4a22";
  ctx.stroke();
  addGrain(ctx, size, 12);
  const fleshTex = new THREE.CanvasTexture(canvas);
  fleshTex.colorSpace = THREE.SRGBColorSpace;

  return { skinGeometry: skinGeo, faceGeometry: faceGeo, flesh: fleshTex };
}

// Halved avocado – pebbled skin on the back, the cut face shows the pale
// flesh and the pit, so it reads instantly whenever it turns toward you.
function Avocado() {
  const skin = useGrainy("#678f43", "#2d4520");
  const pit = useGrainy("#a3714a", "#5a3820");
  const pebble = useBump(900, 4, [6, 3]);
  const { skinGeometry, faceGeometry, flesh } = useMemo(
    () => buildHalvedAvocado(),
    [],
  );

  return (
    <group>
      <mesh geometry={skinGeometry}>
        <InkMaterial
          map={skin}
          emissive="#2d4520"
          bumpMap={pebble}
          bumpScale={1.5}
        />
      </mesh>
      <mesh geometry={faceGeometry}>
        <InkMaterial map={flesh} />
      </mesh>
      <mesh
        position={[0.004, AVOCADO_BULB_Y + 0.03, 0]}
        scale={[1, 1.08, 0.72]}
      >
        <sphereGeometry args={[0.1, 48, 32]} />
        <InkMaterial map={pit} emissive="#5a3820" />
      </mesh>
    </group>
  );
}

const LEMON_TWIG: StalkPoints = [
  [-0.3, 0, 0],
  [-0.34, 0.01, 0],
  [-0.36, 0.04, 0],
];

function Lemon() {
  const gradient = useGrainy("#f9e06a", "#dba22a");
  const pores = useBump(1400, 2.5, [6, 3.5]);
  const leaf = useLeafTexture("#7fae55", "#4b7a35", 5);
  const stem = useGrainy("#7a8a3c");
  const geometry = useMemo(() => {
    const A = 0.265;
    const B = 0.2;
    // Elliptical body blended into a nub at each end; the stem end is the
    // smaller, blunter one.
    const sdf = (r: number, y: number) => {
      const body = (Math.hypot(r / B, y / A) - 1) * B;
      const tip = Math.hypot(r, y - 0.272) - 0.042;
      const stemEnd = Math.hypot(r, y + 0.27) - 0.036;
      return smin(smin(body, tip, 0.07), stemEnd, 0.06);
    };
    const geo = new THREE.LatheGeometry(implicitProfile(sdf, 0.5, 96), 64);
    // Lay it on its side and give the body a faint, uneven bulge
    geo.rotateZ(-Math.PI / 2);
    displace(geo, (v) => {
      const k =
        1 +
        0.025 * Math.sin(v.x * 9 + 1.3) * Math.cos(Math.atan2(v.z, v.y) * 2);
      v.y *= k;
      v.z *= k * 0.96;
    });
    smoothNormals(geo);
    return uvFromHeight(geo, true);
  }, []);
  const leafGeometry = useMemo(
    () =>
      makeLeafGeometry({
        length: 0.22,
        width: 0.065,
        outline: LEAF_OUTLINES.ovate,
        droop: 0.35,
        cup: 0.3,
        fold: 0.25,
        twist: 0.4,
      }),
    [],
  );
  return (
    <group>
      <mesh geometry={geometry}>
        <InkMaterial
          map={gradient}
          emissive="#dba22a"
          bumpMap={pores}
          bumpScale={1.2}
        />
      </mesh>
      {/* Stem end, with a short twig and one leaf */}
      <Stalk points={LEMON_TWIG} radius={0.011} map={stem} />
      <Leaf
        geometry={leafGeometry}
        map={leaf}
        position={[-0.355, 0.035, 0]}
        rotation={[-0.5, 0.2, 0.9]}
      />
    </group>
  );
}

function Berry({
  radius,
  gradient,
  crown,
  ...props
}: {
  radius: number;
  gradient: THREE.CanvasTexture;
  crown: THREE.CanvasTexture;
} & ThreeElements["group"]) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 48, 32);
    displace(geo, (v) => {
      const theta = Math.acos(THREE.MathUtils.clamp(v.y / radius, -1, 1));
      v.y *= 0.86;
      // Crater at the blossom end, ringed by the crown
      v.y -= radius * 0.22 * Math.exp(-Math.pow(theta / 0.32, 2));
    });
    return smoothNormals(geo);
  }, [radius]);
  return (
    <group {...props}>
      <mesh geometry={geometry}>
        <InkMaterial map={gradient} emissive="#363d73" />
      </mesh>
      <Calyx
        count={5}
        length={radius * 0.3}
        width={radius * 0.2}
        tilt={0.55}
        droop={-0.2}
        map={crown}
        y={radius * 0.7}
        inset={radius * 0.14}
      />
    </group>
  );
}

// A little cluster reads as "blueberries" far better than a lone sphere.
function Blueberry() {
  const gradient = useGrainy("#8b97c9", "#363d73");
  const crown = useGrainy("#6f79a8", "#3b4272");
  return (
    <group>
      <Berry
        radius={0.16}
        gradient={gradient}
        crown={crown}
        rotation={[0.25, 0, 0.1]}
      />
      <Berry
        radius={0.13}
        gradient={gradient}
        crown={crown}
        position={[0.22, -0.06, -0.06]}
        rotation={[0.1, 1, -0.55]}
      />
      <Berry
        radius={0.115}
        gradient={gradient}
        crown={crown}
        position={[-0.1, -0.1, 0.17]}
        rotation={[0.6, -0.4, 0.4]}
      />
    </group>
  );
}

// Carrot greens: a few curved stalks fanning out, each ending in a spray of
// narrow leaflets.
const CARROT_STALKS = [
  { azimuth: 0, lean: 0.15, length: 0.32 },
  { azimuth: 1.4, lean: 0.5, length: 0.26 },
  { azimuth: 2.6, lean: 0.35, length: 0.3 },
  { azimuth: 3.9, lean: 0.55, length: 0.24 },
  { azimuth: 5.1, lean: 0.3, length: 0.28 },
].map(({ azimuth, lean, length }) => {
  const tip: Vec3 = [Math.sin(lean) * length, Math.cos(lean) * length, 0];
  const mid: Vec3 = [Math.sin(lean) * length * 0.25, length * 0.6, 0];
  const points: StalkPoints = [[0, 0, 0], mid, tip];
  const curve = new THREE.QuadraticBezierCurve3(
    ...(points.map((p) => new THREE.Vector3(...p)) as [
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
    ]),
  );
  // Paired leaflets along the outer half, angled off the stalk
  const leaflets = [0.55, 0.75, 0.92].flatMap((t) => {
    const p = curve.getPoint(t);
    const dir = curve.getTangent(t);
    const angle = Math.atan2(dir.x, dir.y);
    return [-1, 1].map((side) => ({
      position: [p.x, p.y, p.z] as Vec3,
      rotation: [0.2 * side, 0, -angle - side * 0.7] as Vec3,
      scale: 0.75 + t * 0.35,
    }));
  });
  leaflets.push({ position: tip, rotation: [0, 0, -lean], scale: 1 });
  return { azimuth, points, leaflets };
});

function CarrotGreens({ y }: { y: number }) {
  const map = useLeafTexture("#86bb5f", "#4e8436", 3);
  const stalk = useGrainy("#6fa04c", "#4e8436");
  const leaflet = useMemo(
    () =>
      makeLeafGeometry({
        length: 0.08,
        width: 0.017,
        outline: LEAF_OUTLINES.lance,
        droop: 0.3,
        fold: 0.3,
      }),
    [],
  );
  return (
    <group position={[0, y, 0]}>
      {CARROT_STALKS.map(({ azimuth, points, leaflets }, i) => (
        <group key={i} rotation={[0, azimuth, 0]}>
          <Stalk points={points} radius={0.009} map={stalk} />
          {leaflets.map((props, j) => (
            <Leaf key={j} geometry={leaflet} map={map} {...props} />
          ))}
        </group>
      ))}
    </group>
  );
}

function Carrot() {
  const gradient = useGrainy("#f6a35a", "#cf5c14");
  const geometry = useMemo(() => {
    const L = 0.6;
    const R = 0.09;
    // Long taper to a slightly rounded tip, domed crown at the top
    const radiusAt = (y: number) => {
      const t = (y + 0.3) / L;
      const taper = R * Math.pow(Math.max(t, 0), 0.8);
      const s = Math.max(t - 0.84, 0) / 0.16;
      return taper * Math.sqrt(Math.max(1 - s * s, 0));
    };
    const geo = new THREE.LatheGeometry(
      profilePoints(radiusAt, -0.3, 0.3, 90),
      48,
    );
    // Shallow growth rings that don't quite wrap all the way around, plus a
    // gentle bend along the length.
    const rings = [0.12, 0.21, 0.3, 0.38, 0.47, 0.55, 0.62, 0.7, 0.78];
    displace(geo, (v) => {
      const t = (v.y + 0.3) / L;
      const phi = Math.atan2(v.z, v.x);
      let k = 1;
      rings.forEach((rt, i) => {
        const arc = 0.5 + 0.5 * Math.cos(phi - i * 2.3);
        k -= 0.09 * arc * Math.exp(-Math.pow((t - rt) / 0.012, 2));
      });
      v.x = v.x * k + 0.035 * Math.sin((1 - t) * Math.PI * 0.6) * (1 - t);
      v.z *= k;
    });
    smoothNormals(geo);
    return geo;
  }, []);
  return (
    <group rotation={[0.2, 0, 0.5]}>
      <mesh geometry={geometry}>
        <InkMaterial map={gradient} emissive="#cf5c14" />
      </mesh>
      <CarrotGreens y={0.29} />
    </group>
  );
}

const BASIL_PETIOLE: StalkPoints = [
  [0, -0.24, 0],
  [0, -0.3, -0.01],
  [0.02, -0.36, -0.03],
];

// Basil – an ovate blade with a folded midrib, cupped edges and veins, plus a
// smaller leaf turned a quarter round the stem, so one of them always faces
// the camera as the sprig spins.
function HerbLeaf() {
  const map = useLeafTexture("#86bf62", "#3f7031");
  const stem = useGrainy("#5b8f3e");
  const geometry = useMemo(
    () =>
      makeLeafGeometry({
        length: 0.5,
        width: 0.15,
        outline: LEAF_OUTLINES.ovate,
        droop: 0.22,
        cup: 0.35,
        fold: 0.3,
        wave: 0.05,
        twist: 0.15,
      }),
    [],
  );
  return (
    <group rotation={[-0.4, 0, 0.2]}>
      <Leaf geometry={geometry} map={map} position={[0, -0.24, 0]} />
      <Leaf
        geometry={geometry}
        map={map}
        position={[0, -0.27, 0]}
        rotation={[0.25, Math.PI / 2, 0.9]}
        scale={0.62}
      />
      <Stalk points={BASIL_PETIOLE} radius={0.011} map={stem} />
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

// Flat, even light – shading comes mostly from the baked gradients, so the
// objects read as printed ink rather than lit plastic.
function Lights() {
  return (
    <>
      <hemisphereLight args={["#fff8ee", "#e6dac6", 1.3]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 4]} intensity={0.85} color="#fff2e2" />
      <directionalLight position={[-4, -1, -2]} intensity={0.25} />
    </>
  );
}

function Scene() {
  const primaryColor = getCssColor("--primary");
  const secondaryColor = getCssColor("--secondary");

  return (
    <>
      <Lights />

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
    <div className="pointer-events-none relative h-[340px] max-h-[30vh] w-full">
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
