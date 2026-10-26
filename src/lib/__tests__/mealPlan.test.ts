import { describe, expect, it } from "vitest";
import {
  canToggleOffMeal,
  caloriesPerMeal,
  countDailyMeals,
} from "../mealPlan";

const DEFAULT_PLAN = {
  breakfast: true,
  lunch: true,
  dinner: true,
  snacks: false,
  snackCount: 2,
};

describe("countDailyMeals", () => {
  it("ignores the snack count while snacks are off", () => {
    expect(countDailyMeals(DEFAULT_PLAN)).toBe(3);
  });

  it("adds the snack count once snacks are on", () => {
    expect(countDailyMeals({ ...DEFAULT_PLAN, snacks: true })).toBe(5);
  });
});

describe("caloriesPerMeal", () => {
  it("splits daily calories across the three default meals", () => {
    expect(caloriesPerMeal(2000, DEFAULT_PLAN)).toBe(667);
  });

  it("counts snacks as meals in the split", () => {
    expect(caloriesPerMeal(2000, { ...DEFAULT_PLAN, snacks: true })).toBe(400);
  });
});

describe("canToggleOffMeal", () => {
  it("allows switching off a meal while another main meal stays on", () => {
    expect(canToggleOffMeal(DEFAULT_PLAN, "lunch")).toBe(true);
  });

  it("locks the last active main meal", () => {
    const onlyDinner = { ...DEFAULT_PLAN, breakfast: false, lunch: false };
    expect(canToggleOffMeal(onlyDinner, "dinner")).toBe(false);
  });

  it("always allows switching a meal back on", () => {
    const onlyDinner = { ...DEFAULT_PLAN, breakfast: false, lunch: false };
    expect(canToggleOffMeal(onlyDinner, "lunch")).toBe(true);
  });
});
