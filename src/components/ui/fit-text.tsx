"use client";

import * as React from "react";
import fitty from "fitty";
import { cn } from "@/lib/utils";

interface FitTextProps {
  as?: "h1" | "h2" | "h3" | "p" | "div";
  minSize?: number;
  maxSize?: number;
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
}

// Keeps text on one line at the largest font size that fits the wrapper's
// width. fitty measures against the parent, so the heading element is the
// block wrapper and the inner span is what gets resized.
export function FitText({
  as: Tag = "div",
  minSize = 14,
  maxSize = 48,
  className,
  textClassName,
  children,
}: FitTextProps) {
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [fitted, setFitted] = React.useState(false);

  React.useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const instance = fitty(el, { minSize, maxSize, multiLine: false });
    const onFit = () => setFitted(true);
    el.addEventListener("fit", onFit);
    // Custom fonts change glyph widths once loaded.
    void document.fonts?.ready.then(() => instance.fit());

    return () => {
      el.removeEventListener("fit", onFit);
      instance.unsubscribe();
    };
  }, [minSize, maxSize]);

  return (
    <Tag className={cn("min-w-0", className)}>
      <span
        ref={textRef}
        className={cn(
          "inline-block whitespace-nowrap transition-opacity duration-200",
          fitted ? "opacity-100" : "opacity-0",
          textClassName,
        )}
      >
        {children}
      </span>
    </Tag>
  );
}
