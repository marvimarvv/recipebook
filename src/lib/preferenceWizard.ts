// Pure navigation logic for the substeps (sections) of the "Food preferences"
// and "Nutrition goals" onboarding steps.
// Kept free of React/UI concerns so it can be unit tested in isolation and
// shared between the desktop tabs and the mobile accordion.

import { DEFAULT_MACRO_SPLIT, type NutritionSettings } from "../types";

export interface SubstepMeta {
  title: string;
  // Optional substeps are visited by the footer like any other, but open on an
  // opt-in prompt (see shouldShowOptInPrompt) rather than forcing a choice.
  optional?: boolean;
}

export type FooterNextTarget =
  | { type: "substep"; index: number; label: string }
  | { type: "nextStep"; label: string };

export type FooterBackTarget =
  { type: "substep"; index: number } | { type: "prevStep" };

/**
 * The footer button's destination: the next unvisited, non-optional substep
 * after `currentIndex`, in config order (optional ones included, so their opt-in
 * prompt is never skipped unseen). If there is none, the destination is the
 * wizard's next main step - we never loop back to an earlier unvisited substep.
 */
export function getNextTarget<T extends SubstepMeta>(
  substeps: readonly T[],
  currentIndex: number,
  visited: ReadonlySet<number>,
  nextStepLabel = "Continue to Step 2",
): FooterNextTarget {
  for (let index = currentIndex + 1; index < substeps.length; index++) {
    if (!visited.has(index)) {
      return {
        type: "substep",
        index,
        label: `Next: ${substeps[index].title}`,
      };
    }
  }
  return { type: "nextStep", label: nextStepLabel };
}

/**
 * The footer "Back" button's destination: always the previous substep in
 * config order (no auto-skip), or the wizard's previous main step from the
 * first substep.
 */
export function getPrevTarget(currentIndex: number): FooterBackTarget {
  if (currentIndex <= 0) return { type: "prevStep" };
  return { type: "substep", index: currentIndex - 1 };
}

/**
 * A short "Italian, Mexican +4" style preview of a selection list, or `null`
 * when nothing is selected (caller decides how to label the empty state).
 */
export function summarizeSelection(
  selected: readonly string[],
  maxItems = 2,
): string | null {
  if (selected.length === 0) return null;
  const shown = selected.slice(0, maxItems).join(", ");
  const remaining = selected.length - maxItems;
  return remaining > 0 ? `${shown} +${remaining}` : shown;
}

/**
 * Whether the macro split is still the balanced default every user starts
 * with - the Macros section's equivalent of "nothing selected".
 */
export function isDefaultMacroSplit(
  settings: Pick<NutritionSettings, "proteinGoal" | "carbGoal" | "fatGoal">,
): boolean {
  return (
    settings.proteinGoal === DEFAULT_MACRO_SPLIT.proteinGoal &&
    settings.carbGoal === DEFAULT_MACRO_SPLIT.carbGoal &&
    settings.fatGoal === DEFAULT_MACRO_SPLIT.fatGoal
  );
}

/**
 * Whether an optional substep should open on its opt-in prompt rather than its
 * content: only until the user has said yes or already has something selected.
 */
export function shouldShowOptInPrompt(
  substep: SubstepMeta,
  confirmed: boolean,
  hasSelection: boolean,
): boolean {
  return Boolean(substep.optional) && !confirmed && !hasSelection;
}
