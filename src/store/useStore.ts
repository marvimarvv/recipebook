"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserPreferences, NutritionSettings, Recipe, MealPlan, ToastMessage } from '@/types'

interface AppState {
  // User Preferences
  preferences: UserPreferences
  setPreferences: (preferences: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => void
  
  // Nutrition Settings
  nutritionSettings: NutritionSettings
  setNutritionSettings: (settings: NutritionSettings | ((prev: NutritionSettings) => NutritionSettings)) => void
  
  // Recipes
  recipes: Recipe[]
  addRecipe: (recipe: Recipe) => void
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void
  deleteRecipe: (id: string) => void
  toggleFavorite: (id: string) => void
  
  // Meal Plans
  mealPlans: MealPlan[]
  addMealPlan: (mealPlan: MealPlan) => void
  updateMealPlan: (id: string, mealPlan: Partial<MealPlan>) => void
  deleteMealPlan: (id: string) => void
  
  // Toast Messages
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
  
  // Reset
  reset: () => void
}

const defaultPreferences: UserPreferences = {
  cuisines: [],
  diets: [],
  allergies: [],
  dislikes: [],
  likes: [],
  cookingLevel: 'intermediate',
  mealFrequency: 3
}

const defaultNutritionSettings: NutritionSettings = {
  dailyCalories: 2000,
  proteinGoal: 30,
  carbGoal: 40,
  fatGoal: 30,
  mealPlan: {
    breakfast: true,
    lunch: true,
    dinner: true,
    snacks: true,
    snackCount: 2
  }
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // User Preferences
      preferences: defaultPreferences,
      setPreferences: (preferences) => 
        set({ preferences: typeof preferences === 'function' ? preferences(useStore.getState().preferences) : preferences }),
      
      // Nutrition Settings
      nutritionSettings: defaultNutritionSettings,
      setNutritionSettings: (settings) => 
        set({ nutritionSettings: typeof settings === 'function' ? settings(useStore.getState().nutritionSettings) : settings }),
      
      // Recipes
      recipes: [],
      addRecipe: (recipe) => 
        set((state) => ({ recipes: [...state.recipes, recipe] })),
      updateRecipe: (id, updates) => 
        set((state) => ({
          recipes: state.recipes.map(recipe => 
            recipe.id === id ? { ...recipe, ...updates } : recipe
          )
        })),
      deleteRecipe: (id) => 
        set((state) => ({ recipes: state.recipes.filter(recipe => recipe.id !== id) })),
      toggleFavorite: (id) => 
        set((state) => ({
          recipes: state.recipes.map(recipe => 
            recipe.id === id ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe
          )
        })),
      
      // Meal Plans
      mealPlans: [],
      addMealPlan: (mealPlan) => 
        set((state) => ({ mealPlans: [...state.mealPlans, mealPlan] })),
      updateMealPlan: (id, updates) => 
        set((state) => ({
          mealPlans: state.mealPlans.map(mealPlan => 
            mealPlan.id === id ? { ...mealPlan, ...updates } : mealPlan
          )
        })),
      deleteMealPlan: (id) => 
        set((state) => ({ mealPlans: state.mealPlans.filter(mealPlan => mealPlan.id !== id) })),
      
      // Toast Messages
      toasts: [],
      addToast: (toast) => 
        set((state) => ({
          toasts: [...state.toasts, { 
            ...toast, 
            id: Date.now().toString() 
          }]
        })),
      removeToast: (id) => 
        set((state) => ({ toasts: state.toasts.filter(toast => toast.id !== id) })),
      
      // Reset
      reset: () => 
        set({
          preferences: defaultPreferences,
          nutritionSettings: defaultNutritionSettings,
          recipes: [],
          mealPlans: [],
          toasts: []
        })
    }),
    {
      name: 'recipebook-storage',
      partialize: (state) => ({
        preferences: state.preferences,
        nutritionSettings: state.nutritionSettings,
        recipes: state.recipes,
        mealPlans: state.mealPlans
      })
    }
  )
)

// Selectors for better performance
export const usePreferences = () => useStore(state => state.preferences)
export const useNutritionSettings = () => useStore(state => state.nutritionSettings)
export const useRecipes = () => useStore(state => state.recipes)
export const useMealPlans = () => useStore(state => state.mealPlans)
export const useToasts = () => useStore(state => state.toasts)

export const useAddRecipe = () => useStore(state => state.addRecipe)
export const useUpdateRecipe = () => useStore(state => state.updateRecipe)
export const useDeleteRecipe = () => useStore(state => state.deleteRecipe)
export const useToggleFavorite = () => useStore(state => state.toggleFavorite)

export const useAddToast = () => useStore(state => state.addToast)
export const useRemoveToast = () => useStore(state => state.removeToast)
