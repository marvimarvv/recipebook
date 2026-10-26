"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import { FOOD_SHAPES, createMorphInterpolators } from "@/lib/foodShapes";

const HOLD_SECONDS = 0.5;
const MORPH_SECONDS = 0.6;
const CYCLE_SECONDS = HOLD_SECONDS + MORPH_SECONDS;

// "primary" sits on the Recap's mesh gradient, where the theme gradient would
// blend into the background.
export default function FoodMorphLoader({
  tone = "gradient",
}: {
  tone?: "gradient" | "primary";
}) {
  const gradientId = useId();
  const fill =
    tone === "primary" ? "hsl(var(--primary))" : `url(#${gradientId})`;
  const prefersReducedMotion = useReducedMotion();
  const d = useMotionValue(FOOD_SHAPES[0].path);
  const [staticIndex, setStaticIndex] = useState(0);

  const interpolators = useMemo(() => createMorphInterpolators(), []);

  useEffect(() => {
    if (prefersReducedMotion) {
      const id = setInterval(
        () => setStaticIndex((i) => (i + 1) % FOOD_SHAPES.length),
        CYCLE_SECONDS * 1000,
      );
      return () => clearInterval(id);
    }

    let index = 0;
    let cancelled = false;
    let controls: AnimationPlaybackControls | undefined;

    const morphNext = () => {
      const interpolator = interpolators[index];
      controls = animate(0, 1, {
        duration: MORPH_SECONDS,
        delay: HOLD_SECONDS,
        ease: "easeInOut",
        onUpdate: (progress) => d.set(interpolator(progress)),
        onComplete: () => {
          if (cancelled) return;
          index = (index + 1) % FOOD_SHAPES.length;
          d.set(FOOD_SHAPES[index].path);
          morphNext();
        },
      });
    };
    morphNext();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [prefersReducedMotion, interpolators, d]);

  return (
    <div
      role="img"
      aria-label="Generating meal plan"
      className="relative mx-auto mb-6 h-24 w-24"
    >
      <div
        className={
          tone === "primary"
            ? "absolute inset-2 rounded-full bg-white/50 blur-xl"
            : "absolute inset-2 rounded-full bg-linear-to-br from-primary/30 to-secondary/30 blur-xl"
        }
      />
      <svg viewBox="0 0 24 24" className="relative h-full w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
            <stop
              offset="100%"
              style={{ stopColor: "hsl(var(--secondary))" }}
            />
          </linearGradient>
        </defs>
        {prefersReducedMotion ? (
          <AnimatePresence mode="wait">
            <motion.path
              key={FOOD_SHAPES[staticIndex].name}
              d={FOOD_SHAPES[staticIndex].path}
              fill={fill}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
        ) : (
          <motion.g
            style={{ originX: "50%", originY: "50%" }}
            animate={{ scale: [1, 1, 0.9, 1.06, 1], y: [0, 0, 0.6, -0.8, 0] }}
            transition={{
              duration: CYCLE_SECONDS,
              times: [0, 0.4, 0.6, 0.85, 1],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.path d={d} fill={fill} />
          </motion.g>
        )}
      </svg>
    </div>
  );
}
