import type { LucideIcon } from "lucide-react";

// Shared UI Types
export interface StepHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

// Recipe Types
export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  servings: number;
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  tags: string[];
  image?: string;
  createdAt: Date;
  isFavorite: boolean;
}

// Food Preferences Types
export interface FoodPreferences {
  id: string;
  name: string;
  category: "cuisine" | "diet" | "allergy" | "dislike" | "like";
  items: string[];
}

export interface UserPreferences {
  cuisines: string[];
  diets: string[];
  allergies: string[];
  dislikes: string[];
  likes: string[];
  cookingLevel: "beginner" | "intermediate" | "advanced";
  mealFrequency: number; // meals per day
}

// Nutrition Settings Types
export interface NutritionSettings {
  dailyCalories: number;
  proteinGoal: number; // percentage
  carbGoal: number; // percentage
  fatGoal: number; // percentage
  mealPlan: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    snacks: boolean;
    snackCount: number;
  };
}

// AI Generation Types
export interface GeneratedRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  tags: string[];
}

export interface MealPlan {
  id: string;
  date: Date;
  meals: {
    breakfast?: GeneratedRecipe[];
    lunch?: GeneratedRecipe[];
    dinner?: GeneratedRecipe[];
    snacks?: GeneratedRecipe[];
  };
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface AIGenerationOptions {
  mealTypes: ("breakfast" | "lunch" | "dinner" | "snack")[];
  includeSnacks: boolean;
  snackCount: number;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  cookingTime: "quick" | "medium" | "long";
  difficulty: "easy" | "medium" | "hard";
}

// A full week (7 days) meal plan made up of individual daily plans
export interface WeekMealPlan {
  id: string;
  weekStartDate: Date;
  days: MealPlan[]; // exactly 7 entries, Monday - Sunday
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

// UI State Types
export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: "success" | "error" | "warning" | "info";
}

export interface ModalState {
  isOpen: boolean;
  title: string;
  content: React.ReactNode;
  onClose?: () => void;
}

// Predefined options
export const CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Chinese",
  "Indian",
  "Japanese",
  "Mediterranean",
  "American",
  "French",
  "Thai",
  "Greek",
  "Spanish",
  "Middle Eastern",
  "Vegetarian",
  "Vegan",
  "Keto",
  "Paleo",
];

export const DIET_OPTIONS = [
  "None",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Keto",
  "Paleo",
  "Low Carb",
  "Low Fat",
  "Gluten Free",
  "Dairy Free",
  "Nut Free",
];

export const ALLERGY_OPTIONS = [
  "None",
  "Gluten",
  "Dairy",
  "Eggs",
  "Nuts",
  "Peanuts",
  "Shellfish",
  "Fish",
  "Soy",
  "Wheat",
  "Sesame",
];

export const COOKING_LEVEL_OPTIONS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
export const MEAL_TYPE_OPTIONS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;
export const COOKING_TIME_OPTIONS = ["quick", "medium", "long"] as const;
export const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"] as const;
