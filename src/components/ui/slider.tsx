"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    { className, value, onValueChange, min = 0, max = 100, step = 1, style, ...props },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange([parseFloat(e.target.value)]);
    };

    // Fill only the portion left of the thumb; keep the rest white so the track stays visible.
    const percent = Math.min(
      100,
      Math.max(0, ((value[0] - min) / (max - min)) * 100),
    );

    return (
      <input
        type="range"
        ref={ref}
        value={value[0]}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full border border-input bg-background accent-primary",
          className,
        )}
        style={{
          background: `linear-gradient(to right, hsl(var(--secondary)) ${percent}%, hsl(var(--background)) ${percent}%)`,
          ...style,
        }}
        {...props}
      />
    );
  },
);
Slider.displayName = "Slider";

export { Slider };
export default Slider;
