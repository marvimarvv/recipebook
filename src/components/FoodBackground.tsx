"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { FOOD_SHAPES, createMorphInterpolators } from "@/lib/foodShapes";
import { useStore } from "@/store/useStore";

// Each background shape gets one of these click reactions, assigned in turn.
type Behavior = "morph" | "burst" | "jiggle";
const BEHAVIORS: Behavior[] = ["morph", "burst", "jiggle"];

interface ShapeConfig {
  id: number;
  food: number;
  left: number; // % of viewport width
  top: number; // % of viewport height
  size: number; // px
  blur: number; // px, deeper shapes are softer
  opacity: number;
  driftX: number[];
  driftY: number[];
  rotate: number[];
  durX: number;
  durY: number;
  durR: number;
  breathe: number;
  behavior: Behavior;
}

const SHAPE_COUNT = 14;
// The effect is off on phones: below tablet size, or in landscape phones whose
// height is short.
const SHOW_QUERY = "(min-width: 640px) and (min-height: 500px)";
// Every shape gets its own opacity, evenly spread across this range.
const MIN_OPACITY = 0.05;
const MAX_OPACITY = 0.17;
// While the Recap is open the shapes rise above its mesh gradient, turn white
// and get this much more visible. Shapes render at the lifted opacity inside a
// wrapper at 1 / LIFT, which CSS raises to 1 when lifted.
const LIFT = 2.5;
const PARTICLE_COUNT = 7;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Biased toward the left/right margins so more shapes sit outside the content
// column and stay reachable for clicks.
function randomPosition() {
  const side = Math.random() < 0.5;
  return {
    left:
      Math.random() < 0.7 ? (side ? rand(3, 22) : rand(78, 97)) : rand(3, 97),
    top: rand(6, 94),
  };
}

function makeConfig(id: number, opacity: number): ShapeConfig {
  const depth = Math.random(); // 0 = far, 1 = near
  const reach = 30 + depth * 60;
  return {
    id,
    food: Math.floor(Math.random() * FOOD_SHAPES.length),
    ...randomPosition(),
    size: 70 + depth * 90,
    blur: (1 - depth) * 2.5,
    opacity,
    driftX: [0, rand(-reach, reach), rand(-reach, reach), 0],
    driftY: [0, rand(-reach, reach), rand(-reach, reach), 0],
    rotate: [rand(-12, 0), rand(0, 14), rand(-10, 10)],
    durX: rand(22, 38) - depth * 8,
    durY: rand(26, 44) - depth * 8,
    durR: rand(18, 30),
    breathe: rand(5, 8),
    behavior: BEHAVIORS[id % BEHAVIORS.length],
  };
}

// The configs are random, so they are built once on the client and the server
// snapshot is empty - this keeps hydration markup identical.
let cachedConfigs: ShapeConfig[] | null = null;
function getClientConfigs() {
  if (!cachedConfigs) {
    const count = SHAPE_COUNT;
    const opacities = Array.from(
      { length: count },
      (_, i) => MIN_OPACITY + ((MAX_OPACITY - MIN_OPACITY) * i) / (count - 1),
    ).sort(() => Math.random() - 0.5);
    cachedConfigs = opacities.map((opacity, i) => makeConfig(i, opacity));
  }
  return cachedConfigs;
}
const getServerConfigs = (): ShapeConfig[] | null => null;
const subscribe = () => () => {};

function subscribeToShowQuery(onChange: () => void) {
  const query = window.matchMedia(SHOW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getShouldShow = () => window.matchMedia(SHOW_QUERY).matches;
const getShouldShowOnServer = () => false;

interface ShapeHandle {
  path: SVGPathElement;
  click: () => void;
}
type Registry = Map<number, ShapeHandle>;

// Page content sits above this layer, so the shapes never receive pointer
// events themselves. Instead a document-level click handler hit-tests them,
// but only for clicks that landed on empty page background - never on
// controls, text, cards or other things with a visible surface.
const INTERACTIVE =
  'a,button,input,select,textarea,label,summary,canvas,svg,img,video,[role="button"],[role="tab"],[contenteditable]';

function isEmptyBackground(el: Element) {
  if (el.closest(INTERACTIVE)) return false;
  // A transparent element inside a card or panel still sits on that surface,
  // so every ancestor up to <body> must be see-through as well.
  for (let node: Element | null = el; node && node !== document.body;) {
    // The Recap's mesh gradient counts as page background.
    if (node.hasAttribute("data-food-backdrop")) break;
    const style = getComputedStyle(node);
    if (style.backgroundImage !== "none") return false;
    const bg = style.backgroundColor;
    if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return false;
    node = node.parentElement;
  }
  return ![...el.childNodes].some(
    (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
  );
}

interface BackgroundShapeProps {
  config: ShapeConfig;
  registry: RefObject<Registry>;
  onPop: () => void;
  reduced: boolean;
  gradientId: string;
  interpolators: ReturnType<typeof createMorphInterpolators>;
}

function BackgroundShape({
  config,
  registry,
  onPop,
  reduced,
  gradientId,
  interpolators,
}: BackgroundShapeProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const foodRef = useRef(config.food);
  const busyRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const [pos, setPos] = useState({ left: config.left, top: config.top });
  const [burstKey, setBurstKey] = useState(0);

  const d = useMotionValue(FOOD_SHAPES[config.food].path);
  const opacity = config.opacity * LIFT;
  const glow = useMotionValue(opacity); // wrapper opacity, brightens on click
  const presence = useMotionValue(1); // shape-only opacity, particles unaffected
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  const tilt = useMotionValue(0);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  const flash = () => {
    animate(glow, [opacity, opacity * 2.2, opacity], {
      duration: 0.7,
    });
  };

  // Fade out, swap to the next food, fade back in (used instead of morphing
  // when the user prefers reduced motion).
  const fadeSwap = () => {
    animate(presence, 0, {
      duration: 0.4,
      onComplete: () => {
        foodRef.current = (foodRef.current + 1) % FOOD_SHAPES.length;
        d.set(FOOD_SHAPES[foodRef.current].path);
        animate(presence, 1, {
          duration: 0.6,
          onComplete: () => {
            busyRef.current = false;
          },
        });
      },
    });
  };

  const morph = () => {
    const from = foodRef.current;
    const interpolate = interpolators[from];
    animate(0, 1, {
      duration: 0.6,
      ease: "easeInOut",
      onUpdate: (p) => d.set(interpolate(p)),
      onComplete: () => {
        foodRef.current = (from + 1) % FOOD_SHAPES.length;
        d.set(FOOD_SHAPES[foodRef.current].path);
        busyRef.current = false;
      },
    });
    animate(scaleX, [1, 0.82, 1.14, 1], { duration: 0.6 });
    animate(scaleY, [1, 1.12, 0.9, 1], { duration: 0.6 });
  };

  const burst = () => {
    setBurstKey((k) => k + 1);
    animate(presence, 0, { duration: 0.25 });
    later(() => {
      setPos(randomPosition());
      foodRef.current = Math.floor(Math.random() * FOOD_SHAPES.length);
      d.set(FOOD_SHAPES[foodRef.current].path);
      scaleX.set(0.6);
      scaleY.set(0.6);
      animate(scaleX, 1, { duration: 1.4 });
      animate(scaleY, 1, { duration: 1.4 });
      animate(presence, 1, {
        duration: 1.4,
        onComplete: () => {
          busyRef.current = false;
        },
      });
    }, 1000);
  };

  const jiggle = () => {
    animate(tilt, [0, -12, 10, -6, 3, 0], { duration: 0.8 });
    animate(scaleX, [1, 1.18, 0.9, 1.06, 1], { duration: 0.8 });
    animate(scaleY, [1, 0.85, 1.1, 0.96, 1], {
      duration: 0.8,
      onComplete: () => {
        busyRef.current = false;
      },
    });
  };

  const handleClick = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    flash();
    // A burst shape counts as popped even when reduced motion swaps the
    // animation for a fade.
    if (config.behavior === "burst") onPop();
    if (reduced) {
      fadeSwap();
    } else if (config.behavior === "morph") {
      morph();
    } else if (config.behavior === "burst") {
      burst();
    } else {
      jiggle();
    }
  };

  // Re-registered every render so `click` always sees the latest closures.
  useEffect(() => {
    const map = registry.current;
    if (pathRef.current) {
      map.set(config.id, { path: pathRef.current, click: handleClick });
    }
    return () => {
      map.delete(config.id);
    };
  });

  // Reduced motion: no drift, just a slow, staggered cross-fade between foods.
  useEffect(() => {
    if (!reduced) return;
    const id = window.setInterval(
      () => {
        if (busyRef.current) return;
        busyRef.current = true;
        fadeSwap();
      },
      12000 + config.id * 1700,
    );
    return () => window.clearInterval(id);
    // fadeSwap only touches stable refs and motion values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, config.id]);

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: config.size,
        height: config.size,
        marginLeft: -config.size / 2,
        marginTop: -config.size / 2,
        opacity: glow,
      }}
    >
      <motion.div
        className="h-full w-full"
        style={{ filter: `blur(${config.blur}px)` }}
        animate={
          reduced
            ? undefined
            : {
                x: config.driftX,
                y: config.driftY,
                rotate: config.rotate,
                scaleX: [1, 1.04, 0.98, 1],
                scaleY: [1, 0.96, 1.03, 1],
              }
        }
        transition={{
          x: {
            duration: config.durX,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          },
          y: {
            duration: config.durY,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          },
          rotate: {
            duration: config.durR,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          },
          scaleX: {
            duration: config.breathe,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          },
          scaleY: {
            duration: config.breathe * 1.15,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          },
        }}
      >
        <motion.div
          className="h-full w-full"
          style={{ scaleX, scaleY, rotate: tilt, opacity: presence }}
        >
          <svg viewBox="0 0 24 24" className="h-full w-full overflow-visible">
            <motion.path d={d} ref={pathRef} fill={`url(#${gradientId})`} />
            {/* Cross-fades in over the gradient while lifted into the Recap. */}
            <motion.path
              d={d}
              fill="white"
              className="opacity-0 transition-opacity duration-700 group-data-[lifted=true]:opacity-100"
            />
          </svg>
        </motion.div>
        {burstKey > 0 && !reduced && (
          <svg
            key={burstKey}
            viewBox="0 0 24 24"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          >
            {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
              const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + burstKey;
              return (
                <motion.circle
                  key={i}
                  fill={`url(#${gradientId})`}
                  initial={{ cx: 12, cy: 12, r: 1.6, opacity: 1 }}
                  animate={{
                    cx: 12 + Math.cos(angle) * 15,
                    cy: 12 + Math.sin(angle) * 15,
                    r: 0.3,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              );
            })}
          </svg>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function FoodBackground() {
  const gradientId = useId();
  const reduced = useReducedMotion() ?? false;
  const configs = useSyncExternalStore(
    subscribe,
    getClientConfigs,
    getServerConfigs,
  );
  const interpolators = useMemo(() => createMorphInterpolators(), []);
  const registry = useRef<Registry>(new Map());
  const [popped, setPopped] = useState(0);
  const lifted = useStore((state) => state.recapPhase !== "closed");
  const shouldShow = useSyncExternalStore(
    subscribeToShowQuery,
    getShouldShow,
    getShouldShowOnServer,
  );

  useEffect(() => {
    const map = registry.current;
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !isEmptyBackground(e.target)) {
        return;
      }
      for (const { path, click } of map.values()) {
        const ctm = path.getScreenCTM();
        if (!ctm) continue;
        const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
          ctm.inverse(),
        );
        if (path.isPointInFill(point)) {
          click();
          return;
        }
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!shouldShow) return null;

  return (
    <>
      <div
        aria-hidden="true"
        data-lifted={lifted}
        className="group pointer-events-none fixed inset-0 z-0 overflow-hidden data-[lifted=true]:z-61"
      >
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
              <stop
                offset="100%"
                style={{ stopColor: "hsl(var(--secondary))" }}
              />
            </linearGradient>
          </defs>
        </svg>
        {/* opacity-40 = 1 / LIFT, so unlifted shapes look as they always did. */}
        <div className="absolute inset-0 opacity-40 transition-opacity duration-700 group-data-[lifted=true]:opacity-100">
          {configs?.map((config) => (
            <BackgroundShape
              key={config.id}
              config={config}
              registry={registry}
              onPop={() => setPopped((n) => n + 1)}
              reduced={reduced}
              gradientId={gradientId}
              interpolators={interpolators}
            />
          ))}
        </div>
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "var(--noise-3)" }}
        />
      </div>
      {popped > 0 && (
        <div
          role="status"
          aria-label={`${popped} ${popped === 1 ? "shape" : "shapes"} popped`}
          data-lifted={lifted}
          className="pointer-events-none fixed left-1/2 z-40 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-2 border-primary bg-white text-foreground tabular-nums data-[lifted=true]:z-63"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <motion.span
            key={popped}
            aria-hidden="true"
            className={popped >= 100 ? "text-sm" : "text-lg"}
            initial={reduced ? false : { scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 14 }}
          >
            {popped}
          </motion.span>
        </div>
      )}
    </>
  );
}
