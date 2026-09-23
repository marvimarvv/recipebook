import { describe, expect, it } from "vitest";
import {
  getNextTarget,
  getPrevTarget,
  summarizeSelection,
} from "../preferenceWizard";

const SUBSTEPS = [
  { title: "Cuisines" },
  { title: "Diets" },
  { title: "Allergies" },
  { title: "Foods you love" },
  { title: "Foods to avoid" },
];

describe("getNextTarget", () => {
  it("advances sequentially to the immediate next substep", () => {
    const target = getNextTarget(SUBSTEPS, 0, new Set([0]));
    expect(target).toEqual({
      type: "substep",
      index: 1,
      label: "Next: Diets",
    });
  });

  it("skips substeps that were already visited (e.g. via a tab jump)", () => {
    const target = getNextTarget(SUBSTEPS, 0, new Set([0, 1, 2]));
    expect(target).toEqual({
      type: "substep",
      index: 3,
      label: "Next: Foods you love",
    });
  });

  it("continues to the next main step once every later substep is visited, without looping back", () => {
    // Substeps 0 and 1 are unvisited, but they're *before* currentIndex, so
    // they must never be offered again.
    const target = getNextTarget(SUBSTEPS, 2, new Set([2, 3, 4]));
    expect(target).toEqual({ type: "nextStep", label: "Continue to Step 2" });
  });

  it("continues to the next main step when jumping straight to the last substep", () => {
    const lastIndex = SUBSTEPS.length - 1;
    const target = getNextTarget(SUBSTEPS, lastIndex, new Set([lastIndex]));
    expect(target).toEqual({ type: "nextStep", label: "Continue to Step 2" });
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
