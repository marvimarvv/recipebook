import type { CSSProperties } from "react";

// Matte mesh gradient behind the Recap: soft theme-colored blobs drifting
// slowly (CSS `mesh-blob` animation, still under reduced motion) with grain
// on top. Colors come from the theme tokens, so dark mode follows along.
// The softness comes from the gradient's falloff alone - a blur filter on
// blobs this size stalls the Recap's opening frame on iPhones.
const BLOBS = [
  {
    color: "--primary",
    style: { left: "-20%", top: "-25%", width: "70vmax", height: "70vmax" },
    dx: "8vmax",
    dy: "6vmax",
    duration: "26s",
    delay: "0s",
  },
  {
    color: "--secondary",
    style: { right: "-25%", top: "5%", width: "65vmax", height: "65vmax" },
    dx: "-6vmax",
    dy: "9vmax",
    duration: "30s",
    delay: "-8s",
  },
  {
    color: "--accent",
    style: { left: "5%", bottom: "-35%", width: "75vmax", height: "75vmax" },
    dx: "7vmax",
    dy: "-7vmax",
    duration: "22s",
    delay: "-4s",
  },
  {
    color: "--primary",
    style: { right: "-15%", bottom: "-20%", width: "45vmax", height: "45vmax" },
    dx: "-5vmax",
    dy: "-5vmax",
    duration: "28s",
    delay: "-14s",
  },
];

export default function MeshGradient() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      {BLOBS.map((blob, index) => (
        <div
          key={index}
          className="mesh-blob absolute rounded-full opacity-80"
          style={
            {
              ...blob.style,
              background: `radial-gradient(circle at center, hsl(var(${blob.color})) 0%, hsl(var(${blob.color}) / 0.55) 30%, hsl(var(${blob.color}) / 0.15) 52%, transparent 70%)`,
              "--mesh-dx": blob.dx,
              "--mesh-dy": blob.dy,
              "--mesh-duration": blob.duration,
              "--mesh-delay": blob.delay,
            } as unknown as CSSProperties
          }
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "var(--noise-grain)",
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  );
}
