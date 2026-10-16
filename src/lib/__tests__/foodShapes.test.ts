import { describe, expect, it } from "vitest";
import { FOOD_SHAPES, createMorphInterpolators } from "../foodShapes";

describe("foodShapes", () => {
  it("has uniquely named, closed outlines", () => {
    const names = FOOD_SHAPES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const shape of FOOD_SHAPES) {
      expect(shape.path.startsWith("M")).toBe(true);
      expect(shape.path.endsWith("Z")).toBe(true);
    }
  });

  it("creates one interpolator per shape that yields path strings", () => {
    const interpolators = createMorphInterpolators();
    expect(interpolators).toHaveLength(FOOD_SHAPES.length);
    for (const interpolate of interpolators) {
      expect(typeof interpolate(0)).toBe("string");
      expect(typeof interpolate(0.5)).toBe("string");
      expect(typeof interpolate(1)).toBe("string");
    }
  });
});
