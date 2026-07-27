"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  UserPreferences,
  NutritionSettings,
  Recipe,
  MealPlan,
  WeekMealPlan,
  ToastMessage,
} from "@/types";

export type GenerationStatus = "idle" | "generating" | "success" | "error";

export interface GenerationState {
  status: GenerationStatus;
  currentDay: number; // number of days completed so far (0-7)
  totalDays: number;
  result: WeekMealPlan | null;
  error: string | null;
  // JSON snapshot of the preferences/nutrition/options used to produce `result`,
  // used to detect when the displayed plan is stale relative to current settings.
  snapshot: string | null;
}

const defaultGenerationState: GenerationState = {
  status: "idle",
  currentDay: 0,
  totalDays: 7,
  result: null,
  error: null,
  snapshot: null,
};

interface AppState {
  // Onboarding
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  restartOnboarding: () => void;

  // User Preferences
  preferences: UserPreferences;
  setPreferences: (
    preferences: UserPreferences | ((prev: UserPreferences) => UserPreferences),
  ) => void;

  // Nutrition Settings
  nutritionSettings: NutritionSettings;
  setNutritionSettings: (
    settings:
      NutritionSettings | ((prev: NutritionSettings) => NutritionSettings),
  ) => void;

  // Recipes
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;

  // Meal Plans (legacy single-day, kept for backwards compatibility)
  mealPlans: MealPlan[];
  addMealPlan: (mealPlan: MealPlan) => void;
  updateMealPlan: (id: string, mealPlan: Partial<MealPlan>) => void;
  deleteMealPlan: (id: string) => void;

  // Week Meal Plans
  weekMealPlans: WeekMealPlan[];
  addWeekMealPlan: (weekMealPlan: WeekMealPlan) => void;
  deleteWeekMealPlan: (id: string) => void;

  // Meal plan generation (shared between the onboarding wizard and the
  // Generate tab so progress/results survive the wizard handoff)
  generation: GenerationState;
  startGeneration: (totalDays: number) => void;
  setGenerationProgress: (currentDay: number) => void;
  setGenerationResult: (result: WeekMealPlan, snapshot: string) => void;
  setGenerationError: (error: string) => void;
  resetGeneration: () => void;

  // Toast Messages
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;

  // Reset
  reset: () => void;
}

const defaultPreferences: UserPreferences = {
  cuisines: [],
  diets: [],
  allergies: [],
  dislikes: [],
  likes: [],
  cookingLevel: "intermediate",
  mealFrequency: 3,
};

const defaultNutritionSettings: NutritionSettings = {
  dailyCalories: 2000,
  proteinGoal: 30,
  carbGoal: 40,
  fatGoal: 30,
  mealPlan: {
    breakfast: true,
    lunch: true,
    dinner: true,
    snacks: false,
    snackCount: 2,
  },
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Onboarding
      hasCompletedOnboarding: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      restartOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
          generation: defaultGenerationState,
        }),

      // User Preferences
      preferences: defaultPreferences,
      setPreferences: (
        preferences:
          UserPreferences | ((prev: UserPreferences) => UserPreferences),
      ) =>
        set({
          preferences:
            typeof preferences === "function"
              ? preferences(get().preferences)
              : preferences,
        }),

      // Nutrition Settings
      nutritionSettings: defaultNutritionSettings,
      setNutritionSettings: (
        settings:
          NutritionSettings | ((prev: NutritionSettings) => NutritionSettings),
      ) =>
        set({
          nutritionSettings:
            typeof settings === "function"
              ? settings(get().nutritionSettings)
              : settings,
        }),

      // Recipes
      recipes: [] as Recipe[],
      addRecipe: (recipe: Recipe) =>
        set((state) => ({ recipes: [...state.recipes, recipe] })),
      updateRecipe: (id: string, updates: Partial<Recipe>) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id ? { ...recipe, ...updates } : recipe,
          ),
        })),
      deleteRecipe: (id: string) =>
        set((state) => ({
          recipes: state.recipes.filter((recipe) => recipe.id !== id),
        })),
      toggleFavorite: (id: string) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === id
              ? { ...recipe, isFavorite: !recipe.isFavorite }
              : recipe,
          ),
        })),

      // Meal Plans
      mealPlans: [] as MealPlan[],
      addMealPlan: (mealPlan: MealPlan) =>
        set((state) => ({ mealPlans: [...state.mealPlans, mealPlan] })),
      updateMealPlan: (id: string, updates: Partial<MealPlan>) =>
        set((state) => ({
          mealPlans: state.mealPlans.map((mealPlan) =>
            mealPlan.id === id ? { ...mealPlan, ...updates } : mealPlan,
          ),
        })),
      deleteMealPlan: (id: string) =>
        set((state) => ({
          mealPlans: state.mealPlans.filter((mealPlan) => mealPlan.id !== id),
        })),

      // Week Meal Plans
      weekMealPlans: [] as WeekMealPlan[],
      addWeekMealPlan: (weekMealPlan: WeekMealPlan) =>
        set((state) => ({
          weekMealPlans: [...state.weekMealPlans, weekMealPlan],
        })),
      deleteWeekMealPlan: (id: string) =>
        set((state) => ({
          weekMealPlans: state.weekMealPlans.filter(
            (weekMealPlan) => weekMealPlan.id !== id,
          ),
        })),

      // Meal plan generation (not persisted - resets each session)
      generation: defaultGenerationState,
      startGeneration: (totalDays: number) =>
        set({
          generation: {
            ...defaultGenerationState,
            status: "generating",
            totalDays,
          },
        }),
      setGenerationProgress: (currentDay: number) =>
        set((state) => ({
          generation: { ...state.generation, currentDay },
        })),
      setGenerationResult: (result: WeekMealPlan, snapshot: string) =>
        set((state) => ({
          generation: {
            ...state.generation,
            status: "success",
            result,
            snapshot,
            error: null,
            currentDay: state.generation.totalDays,
          },
        })),
      setGenerationError: (error: string) =>
        set((state) => ({
          generation: { ...state.generation, status: "error", error },
        })),
      resetGeneration: () => set({ generation: defaultGenerationState }),

      // Toast Messages
      toasts: [] as ToastMessage[],
      addToast: (toast: Omit<ToastMessage, "id">) =>
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
        })),
      removeToast: (id: string) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),

      // Reset
      reset: () =>
        set({
          hasCompletedOnboarding: false,
          preferences: defaultPreferences,
          nutritionSettings: defaultNutritionSettings,
          recipes: [] as Recipe[],
          mealPlans: [] as MealPlan[],
          weekMealPlans: [] as WeekMealPlan[],
          generation: defaultGenerationState,
          toasts: [] as ToastMessage[],
        }),
    }),
    {
      name: "recipebook-storage",
      version: 1,
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        preferences: state.preferences,
        nutritionSettings: state.nutritionSettings,
        recipes: state.recipes,
        mealPlans: state.mealPlans,
        weekMealPlans: state.weekMealPlans,
      }),
      // Revive Date fields (zustand persist round-trips through JSON, so Dates
      // come back as strings) and mark pre-existing users as already onboarded
      // so they aren't forced through the setup wizard retroactively.
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as Record<string, any>;

        if (Array.isArray(state.recipes)) {
          state.recipes = state.recipes.map((recipe: any) => ({
            ...recipe,
            createdAt: recipe.createdAt
              ? new Date(recipe.createdAt)
              : new Date(),
          }));
        }
        if (Array.isArray(state.mealPlans)) {
          state.mealPlans = state.mealPlans.map((mealPlan: any) => ({
            ...mealPlan,
            date: mealPlan.date ? new Date(mealPlan.date) : new Date(),
          }));
        }
        if (Array.isArray(state.weekMealPlans)) {
          state.weekMealPlans = state.weekMealPlans.map((weekPlan: any) => ({
            ...weekPlan,
            weekStartDate: weekPlan.weekStartDate
              ? new Date(weekPlan.weekStartDate)
              : new Date(),
            days: Array.isArray(weekPlan.days)
              ? weekPlan.days.map((day: any) => ({
                  ...day,
                  date: day.date ? new Date(day.date) : new Date(),
                }))
              : [],
          }));
        }

        if (version < 1 && state.hasCompletedOnboarding === undefined) {
          const hasExistingData =
            (Array.isArray(state.recipes) && state.recipes.length > 0) ||
            (Array.isArray(state.mealPlans) && state.mealPlans.length > 0) ||
            (Array.isArray(state.weekMealPlans) &&
              state.weekMealPlans.length > 0) ||
            (state.preferences &&
              [
                ...(state.preferences.cuisines ?? []),
                ...(state.preferences.diets ?? []),
                ...(state.preferences.allergies ?? []),
              ].length > 0);
          state.hasCompletedOnboarding = Boolean(hasExistingData);
        }

        return state;
      },
    },
  ),
);

// Selectors for better performance
export const usePreferences = () => useStore((state) => state.preferences);
export const useNutritionSettings = () =>
  useStore((state) => state.nutritionSettings);
export const useRecipes = () => useStore((state) => state.recipes);
export const useMealPlans = () => useStore((state) => state.mealPlans);
export const useWeekMealPlans = () => useStore((state) => state.weekMealPlans);
export const useToasts = () => useStore((state) => state.toasts);

export const useAddRecipe = () => useStore((state) => state.addRecipe);
export const useUpdateRecipe = () => useStore((state) => state.updateRecipe);
export const useDeleteRecipe = () => useStore((state) => state.deleteRecipe);
export const useToggleFavorite = () =>
  useStore((state) => state.toggleFavorite);

export const useAddToast = () => useStore((state) => state.addToast);
export const useRemoveToast = () => useStore((state) => state.removeToast);
