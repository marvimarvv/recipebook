import { describe, expect, it } from "vitest";
import {
  canToggleOffMeal,
  caloriesPerMeal,
  countDailyMeals,
  reviveWeekMealPlan,
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

describe("reviveWeekMealPlan", () => {
  it("turns the stored date strings back into Dates", () => {
    const nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const stored = JSON.parse(
      JSON.stringify({
        id: "1",
        weekStartDate: new Date("2026-11-23T00:00:00Z"),
        days: [
          {
            id: "d1",
            date: new Date("2026-11-24T00:00:00Z"),
            meals: {},
            totalNutrition: nutrition,
          },
        ],
        totalNutrition: nutrition,
      }),
    );
    const plan = reviveWeekMealPlan(stored);
    expect(plan.weekStartDate).toEqual(new Date("2026-11-23T00:00:00Z"));
    expect(plan.days[0].date).toEqual(new Date("2026-11-24T00:00:00Z"));
    expect(plan.id).toBe("1");
  });
});
