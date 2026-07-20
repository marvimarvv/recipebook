"use client";

import { UserPreferences, NutritionSettings } from "@/types";

export interface GenerationOptions {
  cookingTime: string;
  difficulty: string;
  includeAllPreferences: boolean;
  randomize: boolean;
}

// Client-side helpers that call our own server-side API route
// (src/app/api/generate/route.ts) instead of talking to Mistral directly.
// This keeps the Mistral API key server-only and out of the browser bundle.

// Health check: is the AI backend configured and reachable?
export async function checkMistralAPI(): Promise<boolean> {
  try {
    const response = await fetch("/api/generate", { method: "GET" });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.available);
  } catch (error) {
    return false;
  }
}

// Generate a single day's meals via the server route.
export async function generateDayMealPlan(
  preferences: UserPreferences,
  nutritionSettings: NutritionSettings,
  options: GenerationOptions,
  dayLabel: string,
): Promise<any> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences, nutritionSettings, options, dayLabel }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to generate meal plan");
  }

  return data?.day ?? null;
}
