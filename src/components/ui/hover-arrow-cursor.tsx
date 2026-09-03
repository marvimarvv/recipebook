"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface HoverArrowCursorRenderProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
  /** Attach to the moving label so its size can be used to clamp bounds. */
  labelRef: (node: HTMLElement | null) => void;
}

interface HoverArrowCursorProps {
  children: (props: HoverArrowCursorRenderProps) => ReactNode;
  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Tracks the pointer over the wrapped element and hands back spring motion
// values so the caller's own label can follow it, clamped within bounds.
export function HoverArrowCursor({
  children,
  className,
}: HoverArrowCursorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelNodeRef = useRef<HTMLElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 400, damping: 30, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 400, damping: 30, mass: 0.5 });

  const labelRef = useCallback((node: HTMLElement | null) => {
    labelNodeRef.current = node;
  }, []);

  // Clamps so the label (its size depends on its own content) never
  // overflows past the wrapped element's edges.
  const clampToBounds = (rawX: number, rawY: number) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: rawX, y: rawY };
    const labelWidth = labelNodeRef.current?.offsetWidth ?? 0;
    const labelHeight = labelNodeRef.current?.offsetHeight ?? 0;
    const maxX = Math.max(0, (containerRect.width - labelWidth) / 2);
    const maxY = Math.max(0, (containerRect.height - labelHeight) / 2);
    return { x: clamp(rawX, -maxX, maxX), y: clamp(rawY, -maxY, maxY) };
  };

  const offsetFromCenter = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2),
    };
  };

  const handleMouseEnter = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsHovered(true);
    if (prefersReducedMotion) return;
    // Snap to the entry point instantly so the label starts following from
    // wherever the pointer arrived, instead of catching up from center.
    const { x: rawX, y: rawY } = offsetFromCenter(event);
    const { x: clampedX, y: clampedY } = clampToBounds(rawX, rawY);
    springX.jump(clampedX);
    springY.jump(clampedY);
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const { x: rawX, y: rawY } = offsetFromCenter(event);
    const { x: clampedX, y: clampedY } = clampToBounds(rawX, rawY);
    x.set(clampedX);
    y.set(clampedY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn("inline-flex", isHovered && "cursor-none", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {children({ x: springX, y: springY, labelRef })}
    </div>
  );
}
