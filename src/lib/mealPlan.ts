// Pure helpers for the daily meal plan (which meals and how many snacks).

import type { MealPlan, NutritionSettings, WeekMealPlan } from "../types";

type MealPlanSettings = NutritionSettings["mealPlan"];
export type MainMeal = "breakfast" | "lunch" | "dinner";

export const MAIN_MEALS: readonly MainMeal[] = ["breakfast", "lunch", "dinner"];
export const MAX_SNACKS = 5;

/** Main meals plus snacks (when enabled) - what "meals per day" derives from. */
export function countDailyMeals(mealPlan: MealPlanSettings): number {
  const mainMeals = MAIN_MEALS.filter((meal) => mealPlan[meal]).length;
  return mainMeals + (mealPlan.snacks ? mealPlan.snackCount : 0);
}

/** Daily calories split evenly across every meal and snack. */
export function caloriesPerMeal(
  dailyCalories: number,
  mealPlan: MealPlanSettings,
): number {
  const meals = countDailyMeals(mealPlan);
  return meals > 0 ? Math.round(dailyCalories / meals) : dailyCalories;
}

/** At least one main meal must stay on, so the last active one is locked. */
export function canToggleOffMeal(
  mealPlan: MealPlanSettings,
  meal: MainMeal,
): boolean {
  return !mealPlan[meal] || MAIN_MEALS.some((m) => m !== meal && mealPlan[m]);
}

/** A week plan as it comes back out of localStorage: JSON turns Dates into strings. */
export type StoredWeekMealPlan = Omit<
  WeekMealPlan,
  "weekStartDate" | "days"
> & {
  weekStartDate: string | Date;
  days: (Omit<MealPlan, "date"> & { date: string | Date })[];
};

/** Turns the stored date strings of a week plan back into Dates. */
export function reviveWeekMealPlan(plan: StoredWeekMealPlan): WeekMealPlan {
  return {
    ...plan,
    weekStartDate: new Date(plan.weekStartDate),
    days: plan.days.map((day) => ({ ...day, date: new Date(day.date) })),
  };
}
