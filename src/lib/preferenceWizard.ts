// Pure navigation logic for the "Food preferences" onboarding step's substeps.
// Kept free of React/UI concerns so it can be unit tested in isolation and
// shared between the desktop tabs and the mobile accordion.

export interface SubstepMeta {
  title: string;
}

export type FooterNextTarget =
  | { type: "substep"; index: number; label: string }
  | { type: "nextStep"; label: string };

export type FooterBackTarget =
  { type: "substep"; index: number } | { type: "prevStep" };

/**
 * The footer button's destination: the next unvisited substep after
 * `currentIndex`, in config order. If everything after `currentIndex` has
 * already been visited, the destination is the wizard's next main step -
 * we never loop back to an earlier unvisited substep.
 */
export function getNextTarget<T extends SubstepMeta>(
  substeps: readonly T[],
  currentIndex: number,
  visited: ReadonlySet<number>,
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
  return { type: "nextStep", label: "Continue to Step 2" };
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
