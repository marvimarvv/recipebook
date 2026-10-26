import { describe, expect, it } from "vitest";
import {
  getNextTarget,
  getPrevTarget,
  isDefaultMacroSplit,
  shouldShowOptInPrompt,
  summarizeSelection,
} from "../preferenceWizard";

const SUBSTEPS = [
  { title: "Cuisines" },
  { title: "Foods you love" },
  { title: "Foods to avoid" },
  { title: "Diet & allergies", optional: true },
];

describe("getNextTarget", () => {
  it("advances sequentially to the immediate next substep", () => {
    const target = getNextTarget(SUBSTEPS, 0, new Set([0]));
    expect(target).toEqual({
      type: "substep",
      index: 1,
      label: "Next: Foods you love",
    });
  });

  it("skips substeps that were already visited (e.g. via a tab jump)", () => {
    const target = getNextTarget(SUBSTEPS, 0, new Set([0, 1]));
    expect(target).toEqual({
      type: "substep",
      index: 2,
      label: "Next: Foods to avoid",
    });
  });

  it("continues to the next main step once every later substep is visited, without looping back", () => {
    // Substep 0 is unvisited, but it's *before* currentIndex, so it must
    // never be offered again.
    const target = getNextTarget(SUBSTEPS, 1, new Set([1, 2, 3]));
    expect(target).toEqual({ type: "nextStep", label: "Continue to Step 2" });
  });

  it("offers an unvisited optional substep so its opt-in prompt is seen", () => {
    const target = getNextTarget(SUBSTEPS, 2, new Set([0, 1, 2]));
    expect(target).toEqual({
      type: "substep",
      index: 3,
      label: "Next: Diet & allergies",
    });
  });

  it("continues to the next main step from inside the optional substep", () => {
    const lastIndex = SUBSTEPS.length - 1;
    const target = getNextTarget(SUBSTEPS, lastIndex, new Set([lastIndex]));
    expect(target).toEqual({ type: "nextStep", label: "Continue to Step 2" });
  });

  it("uses the given label for the next main step", () => {
    const target = getNextTarget(
      [{ title: "Daily calories" }, { title: "Macros", optional: true }],
      1,
      new Set([0, 1]),
      "Continue to last step",
    );
    expect(target).toEqual({
      type: "nextStep",
      label: "Continue to last step",
    });
  });
});

describe("isDefaultMacroSplit", () => {
  it("is true for the balanced 30/40/30 default", () => {
    expect(
      isDefaultMacroSplit({ proteinGoal: 30, carbGoal: 40, fatGoal: 30 }),
    ).toBe(true);
  });

  it("is false once any macro differs from the default", () => {
    expect(
      isDefaultMacroSplit({ proteinGoal: 35, carbGoal: 40, fatGoal: 25 }),
    ).toBe(false);
  });
});

describe("getPrevTarget", () => {
  it("goes to the previous main step from the first substep", () => {
    expect(getPrevTarget(0)).toEqual({ type: "prevStep" });
  });

  it("goes to the previous substep in config order, ignoring visited state", () => {
    expect(getPrevTarget(3)).toEqual({ type: "substep", index: 2 });
  });
});

describe("summarizeSelection", () => {
  it("returns null when nothing is selected", () => {
    expect(summarizeSelection([])).toBeNull();
  });

  it("joins up to maxItems and returns the rest as a +N suffix", () => {
    expect(
      summarizeSelection(["Italian", "Mexican", "Thai", "Greek", "French"]),
    ).toBe("Italian, Mexican +3");
  });

  it("does not append a +N suffix when everything fits", () => {
    expect(summarizeSelection(["Italian", "Mexican"])).toBe("Italian, Mexican");
  });
});

describe("shouldShowOptInPrompt", () => {
  const optional = { title: "Diet & allergies", optional: true };

  it("shows for an optional substep that is unconfirmed and empty", () => {
    expect(shouldShowOptInPrompt(optional, false, false)).toBe(true);
  });

  it("hides once the user said yes", () => {
    expect(shouldShowOptInPrompt(optional, true, false)).toBe(false);
  });

  it("hides when something is already selected", () => {
    expect(shouldShowOptInPrompt(optional, false, true)).toBe(false);
  });

  it("never shows for a core substep", () => {
    expect(shouldShowOptInPrompt({ title: "Cuisines" }, false, false)).toBe(
      false,
    );
  });
});
