"use client";

import { useCallback, useImperativeHandle, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

export type SwipeDirection = "left" | "right";

export interface SwipeCardStackHandle {
  /** Programmatically resolve the top card, e.g. from a button click. */
  swipe: (direction: SwipeDirection) => void;
}

interface SwipeCardStackProps<T> {
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  onDecide: (item: T, direction: SwipeDirection) => void;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
  stackHandleRef?: React.Ref<SwipeCardStackHandle>;
}

const SWIPE_DISTANCE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;
const VISIBLE_DEPTH = 3; // cards rendered behind the top card

// Cards behind the top one fan out: scaled down, peeking below, slightly rotated.
function fanTransform(depth: number) {
  return {
    y: depth * 12,
    scale: 1 - depth * 0.05,
    rotate: depth * 5,
  };
}

export function SwipeCardStack<T>({
  items,
  renderCard,
  onDecide,
  leftLabel = "Skip",
  rightLabel = "Add",
  className,
  stackHandleRef,
}: SwipeCardStackProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const dragRotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [40, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, -40], [1, 0]);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  const commit = useCallback(
    async (direction: SwipeDirection) => {
      const top = items[0];
      if (!top) return;
      const flyDistance = (containerRef.current?.offsetWidth ?? 400) + 200;
      if (!prefersReducedMotion) {
        await controls.start({
          x: direction === "right" ? flyDistance : -flyDistance,
          rotate: direction === "right" ? 24 : -24,
          transition: { duration: 0.3, ease: "easeOut" },
        });
      } else {
        await controls.start({ opacity: 0, transition: { duration: 0.15 } });
      }
      x.set(0);
      controls.set({ x: 0, rotate: 0, opacity: 1 });
      onDecide(top, direction);
    },
    [items, onDecide, controls, x, prefersReducedMotion],
  );

  useImperativeHandle(stackHandleRef, () => ({ swipe: commit }), [commit]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    const past =
      Math.abs(info.offset.x) > SWIPE_DISTANCE_THRESHOLD ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY_THRESHOLD;
    if (past) {
      void commit(info.offset.x > 0 ? "right" : "left");
    } else {
      controls.start({
        x: 0,
        transition: { type: "spring", stiffness: 400, damping: 30 },
      });
      x.set(0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") void commit("right");
    if (event.key === "ArrowLeft") void commit("left");
  };

  const visible = items.slice(0, VISIBLE_DEPTH + 1);

  return (
    <div
      ref={containerRef}
      role="group"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex items-center justify-center outline-none",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {visible
          .map((item, depth) => {
            const isTop = depth === 0;
            const fan = fanTransform(depth);
            return (
              <motion.div
                key={depth}
                className="absolute inset-0"
                style={{
                  zIndex: VISIBLE_DEPTH - depth,
                  pointerEvents: isTop ? "auto" : "none",
                }}
                initial={false}
                animate={
                  isTop
                    ? undefined
                    : { y: fan.y, scale: fan.scale, rotate: fan.rotate }
                }
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {isTop ? (
                  <motion.div
                    drag={prefersReducedMotion ? false : "x"}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.6}
                    onDragEnd={handleDragEnd}
                    animate={controls}
                    style={{
                      x,
                      rotate: prefersReducedMotion ? 0 : dragRotate,
                      opacity: prefersReducedMotion ? undefined : opacity,
                      touchAction: "none",
                      userSelect: "none",
                    }}
                    className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  >
                    {!prefersReducedMotion && (
                      <>
                        <motion.div
                          style={{ opacity: likeOpacity }}
                          className="pointer-events-none absolute left-4 top-4 z-10 rotate-[-12deg] rounded-md border-4 border-green-500 px-3 py-1 text-lg font-bold text-green-500"
                        >
                          {rightLabel}
                        </motion.div>
                        <motion.div
                          style={{ opacity: nopeOpacity }}
                          className="pointer-events-none absolute right-4 top-4 z-10 rotate-[12deg] rounded-md border-4 border-destructive px-3 py-1 text-lg font-bold text-destructive"
                        >
                          {leftLabel}
                        </motion.div>
                      </>
                    )}
                    {renderCard(item)}
                  </motion.div>
                ) : (
                  renderCard(item)
                )}
              </motion.div>
            );
          })
          .reverse()}
      </AnimatePresence>
    </div>
  );
}
