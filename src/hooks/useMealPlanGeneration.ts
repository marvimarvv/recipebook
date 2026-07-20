"use client";

import { useCallback, useMemo } from "react";
import { useStore } from "@/store/useStore";
import {
  GeneratedRecipe,
  MealPlan,
  NutritionSettings,
  UserPreferences,
  WeekMealPlan,
  WEEKDAY_LABELS,
} from "@/types";
import {
  checkMistralAPI,
  generateDayMealPlan,
  GenerationOptions,
} from "@/lib/mistral";

// Builds a snapshot string of everything that influences the generated plan,
// so we can detect when the displayed plan is stale relative to current settings.
export function buildGenerationSnapshot(
  preferences: UserPreferences,
  nutritionSettings: NutritionSettings,
  options: GenerationOptions,
): string {
  return JSON.stringify({ preferences, nutritionSettings, options });
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toGeneratedRecipes(
  mealsByType: Record<string, any[]> | undefined,
): MealPlan["meals"] {
  const meals: MealPlan["meals"] = {};
  if (!mealsByType) return meals;

  Object.entries(mealsByType).forEach(([mealType, mealRecipes]) => {
    if (!Array.isArray(mealRecipes)) return;
    const recipes: GeneratedRecipe[] = mealRecipes.map((recipe: any) => ({
      id: `${mealType}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: recipe.name || "Untitled Recipe",
      description: recipe.description || "",
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      prepTime: recipe.prepTime || 0,
      cookTime: recipe.cookTime || 0,
      servings: recipe.servings || 1,
      nutrition: recipe.nutrition || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
      mealType: mealType as "breakfast" | "lunch" | "dinner" | "snack",
      tags: recipe.tags || [],
    }));

    const key = mealType === "snack" ? "snacks" : mealType;
    (meals as any)[key] = recipes;
  });

  return meals;
}

// Deterministic mock generator, used as a fallback when Mistral is
// unavailable or a day's request fails. Scales portions by nutrition goals
// and varies slightly per day so a week doesn't look identical.
function buildMockDay(
  nutritionSettings: NutritionSettings,
  dayIndex: number,
): MealPlan["meals"] {
  const scale = (fraction: number) => ({
    calories: Math.round(nutritionSettings.dailyCalories * fraction),
    protein: Math.round(
      (nutritionSettings.dailyCalories *
        fraction *
        (nutritionSettings.proteinGoal / 100)) /
        4,
    ),
    carbs: Math.round(
      (nutritionSettings.dailyCalories *
        fraction *
        (nutritionSettings.carbGoal / 100)) /
        4,
    ),
    fat: Math.round(
      (nutritionSettings.dailyCalories *
        fraction *
        (nutritionSettings.fatGoal / 100)) /
        9,
    ),
  });

  const mockMeals: Record<string, Omit<GeneratedRecipe, "id" | "nutrition">> = {
    breakfast: {
      name: "Greek Yogurt Parfait",
      description:
        "A protein-packed breakfast with layers of yogurt, granola, and fresh berries",
      ingredients: [
        "1 cup Greek yogurt",
        "1/2 cup granola",
        "1/2 cup mixed berries",
        "1 tbsp honey",
      ],
      instructions: [
        "Layer yogurt, granola, and berries in a bowl",
        "Drizzle with honey",
        "Serve immediately",
      ],
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      mealType: "breakfast",
      tags: ["healthy", "quick", "high-protein"],
    },
    lunch: {
      name: "Grilled Chicken Quinoa Bowl",
      description:
        "A balanced lunch with grilled chicken, quinoa, and fresh vegetables",
      ingredients: [
        "1 chicken breast",
        "1/2 cup cooked quinoa",
        "1/2 cup mixed greens",
        "1/4 avocado",
      ],
      instructions: [
        "Grill chicken breast",
        "Cook quinoa",
        "Assemble bowl with all ingredients",
      ],
      prepTime: 15,
      cookTime: 20,
      servings: 1,
      mealType: "lunch",
      tags: ["high-protein", "balanced", "healthy"],
    },
    dinner: {
      name: "Baked Salmon with Sweet Potato",
      description:
        "A nutritious dinner with omega-3 rich salmon and fiber-packed sweet potato",
      ingredients: [
        "1 salmon fillet",
        "1 medium sweet potato",
        "1 cup broccoli",
        "1 tbsp olive oil",
      ],
      instructions: [
        "Preheat oven to 400°F",
        "Bake salmon and sweet potato for 20 minutes",
        "Steam broccoli and serve together",
      ],
      prepTime: 10,
      cookTime: 25,
      servings: 1,
      mealType: "dinner",
      tags: ["omega-3", "nutritious", "baked"],
    },
    snack: {
      name: "Apple with Almond Butter",
      description: "A simple and healthy snack option",
      ingredients: ["1 medium apple", "2 tbsp almond butter"],
      instructions: ["Slice apple", "Spread almond butter on apple slices"],
      prepTime: 2,
      cookTime: 0,
      servings: 1,
      mealType: "snack",
      tags: ["quick", "healthy", "vegetarian"],
    },
  };

  const meals: MealPlan["meals"] = {};

  if (nutritionSettings.mealPlan.breakfast) {
    meals.breakfast = [
      {
        ...mockMeals.breakfast,
        id: `breakfast-${dayIndex}-${Date.now()}`,
        nutrition: scale(0.2),
      },
    ];
  }
  if (nutritionSettings.mealPlan.lunch) {
    meals.lunch = [
      {
        ...mockMeals.lunch,
        id: `lunch-${dayIndex}-${Date.now()}`,
        nutrition: scale(0.4),
      },
    ];
  }
  if (nutritionSettings.mealPlan.dinner) {
    meals.dinner = [
      {
        ...mockMeals.dinner,
        id: `dinner-${dayIndex}-${Date.now()}`,
        nutrition: scale(0.3),
      },
    ];
  }
  if (nutritionSettings.mealPlan.snacks) {
    meals.snacks = Array.from(
      { length: nutritionSettings.mealPlan.snackCount },
      (_, i) => ({
        ...mockMeals.snack,
        id: `snack-${dayIndex}-${i}-${Date.now()}`,
        nutrition: scale(0.05),
      }),
    );
  }

  return meals;
}

function sumNutrition(meals: MealPlan["meals"]) {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  Object.values(meals).forEach((recipes) => {
    recipes?.forEach((recipe) => {
      total.calories += recipe.nutrition.calories;
      total.protein += recipe.nutrition.protein;
      total.carbs += recipe.nutrition.carbs;
      total.fat += recipe.nutrition.fat;
    });
  });
  return total;
}

export function useMealPlanGeneration() {
  const preferences = useStore((state) => state.preferences);
  const nutritionSettings = useStore((state) => state.nutritionSettings);
  const generation = useStore((state) => state.generation);
  const startGeneration = useStore((state) => state.startGeneration);
  const setGenerationProgress = useStore(
    (state) => state.setGenerationProgress,
  );
  const setGenerationResult = useStore((state) => state.setGenerationResult);
  const setGenerationError = useStore((state) => state.setGenerationError);
  const resetGeneration = useStore((state) => state.resetGeneration);
  const addWeekMealPlan = useStore((state) => state.addWeekMealPlan);
  const addToast = useStore((state) => state.addToast);

  const isStale = useMemo(() => {
    if (!generation.result || !generation.snapshot) return false;
    // Options aren't tracked in the store, so we compare only preferences +
    // nutrition here; the caller can pass the full snapshot for exact checks
    // via isSnapshotStale below when generation options are also available.
    try {
      const snapshot = JSON.parse(generation.snapshot);
      return (
        JSON.stringify(snapshot.preferences) !== JSON.stringify(preferences) ||
        JSON.stringify(snapshot.nutritionSettings) !==
          JSON.stringify(nutritionSettings)
      );
    } catch {
      return false;
    }
  }, [generation.result, generation.snapshot, preferences, nutritionSettings]);

  const isSnapshotStale = useCallback(
    (options: GenerationOptions) => {
      if (!generation.result || !generation.snapshot) return false;
      return (
        generation.snapshot !==
        buildGenerationSnapshot(preferences, nutritionSettings, options)
      );
    },
    [generation.result, generation.snapshot, preferences, nutritionSettings],
  );

  const generateWeek = useCallback(
    async (options: GenerationOptions, useAI: boolean) => {
      const totalDays = 7;
      startGeneration(totalDays);

      const weekStartDate = startOfWeek(new Date());
      const days: MealPlan[] = [];
      let usedFallback = false;

      for (let i = 0; i < totalDays; i++) {
        const dayDate = addDays(weekStartDate, i);
        const dayLabel = WEEKDAY_LABELS[i];
        let mealsByType: Record<string, any[]> | undefined;

        if (useAI) {
          try {
            const day = await generateDayMealPlan(
              preferences,
              nutritionSettings,
              options,
              dayLabel,
            );
            mealsByType = day?.meals;
            if (!mealsByType) throw new Error("Empty response");
          } catch (error) {
            usedFallback = true;
            mealsByType = undefined;
          }
        }

        const meals = mealsByType
          ? toGeneratedRecipes(mealsByType)
          : buildMockDay(nutritionSettings, i);

        days.push({
          id: `${dayDate.getTime()}`,
          date: dayDate,
          meals,
          totalNutrition: sumNutrition(meals),
        });

        setGenerationProgress(i + 1);
      }

      const weekMealPlan: WeekMealPlan = {
        id: Date.now().toString(),
        weekStartDate,
        days,
        totalNutrition: days.reduce(
          (acc, day) => ({
            calories: acc.calories + day.totalNutrition.calories,
            protein: acc.protein + day.totalNutrition.protein,
            carbs: acc.carbs + day.totalNutrition.carbs,
            fat: acc.fat + day.totalNutrition.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 },
        ),
      };

      const snapshot = buildGenerationSnapshot(
        preferences,
        nutritionSettings,
        options,
      );
      setGenerationResult(weekMealPlan, snapshot);

      if (usedFallback) {
        addToast({
          title: "Some days used mock data",
          description:
            "AI generation failed for one or more days, so mock recipes were used instead.",
          type: "warning",
        });
      } else {
        addToast({
          title: "Weekly Meal Plan Generated",
          description: "Your personalized 7-day meal plan is ready!",
          type: "success",
        });
      }

      return weekMealPlan;
    },
    [
      preferences,
      nutritionSettings,
      startGeneration,
      setGenerationProgress,
      setGenerationResult,
      addToast,
    ],
  );

  const saveWeekMealPlan = useCallback(() => {
    if (!generation.result) return;
    addWeekMealPlan(generation.result);
    addToast({
      title: "Meal Plan Saved",
      description: "Your weekly meal plan has been saved to your collection.",
      type: "success",
    });
  }, [generation.result, addWeekMealPlan, addToast]);

  return {
    generation,
    isStale,
    isSnapshotStale,
    generateWeek,
    resetGeneration,
    saveWeekMealPlan,
    checkMistralAPI,
  };
}
