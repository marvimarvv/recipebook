import type { CSSProperties } from "react";
import { PLANT_SHAPES } from "@/lib/foodShapes";

export interface BurstPiece {
  path: string;
  size: number; // px
  dx: number; // px
  dy: number; // px
  rotate: number; // deg
  delay: number; // s
}

const PIECE_COUNT = 14;
export const FOOD_BURST_MS = 1200;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Random fruit and vegetables flying up and out. Built in the click handler
 * (not during render) since it's random.
 */
export function createFoodBurst(): BurstPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    // Fan out over the upper half, evenly spread with some jitter.
    const angle =
      Math.PI + (Math.PI * (i + 0.5)) / PIECE_COUNT + rand(-0.15, 0.15);
    const distance = rand(140, 280);
    return {
      path: PLANT_SHAPES[i % PLANT_SHAPES.length].path,
      size: rand(24, 46),
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rotate: rand(-260, 260),
      delay: rand(0, 0.12),
    };
  });
}

// White silhouettes bursting out of the element this sits in (which must be
// `relative`). Pure CSS animation, see `food-burst` in globals.css.
export default function FoodBurst({ pieces }: { pieces: BurstPiece[] }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-1/2 h-0 w-0"
    >
      {pieces.map((piece, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          className="food-burst-piece absolute drop-shadow-sm"
          style={
            {
              width: piece.size,
              height: piece.size,
              marginLeft: -piece.size / 2,
              marginTop: -piece.size / 2,
              "--burst-dx": `${piece.dx}px`,
              "--burst-dy": `${piece.dy}px`,
              "--burst-rot": `${piece.rotate}deg`,
              "--burst-delay": `${piece.delay}s`,
            } as CSSProperties
          }
        >
          <path d={piece.path} fill="white" />
        </svg>
      ))}
    </span>
  );
}
