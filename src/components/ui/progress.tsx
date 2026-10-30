"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    // Rendered at the end of the filled part, so it moves with the progress.
    label?: React.ReactNode;
    indicatorClassName?: string;
    labelClassName?: string;
  }
>(
  (
    { className, indicatorClassName, labelClassName, value, label, ...props },
    ref,
  ) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "relative h-full w-full flex-1 rounded-full bg-primary transition-transform duration-300 ease-in-out",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      >
        {label && (
          <span
            className={cn(
              "absolute inset-y-0 right-2.5 flex items-center text-xs font-medium whitespace-nowrap text-primary-foreground",
              labelClassName,
            )}
          >
            {label}
          </span>
        )}
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  ),
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
