"use client";

import { UserPreferences, NutritionSettings } from "@/types";

export interface GenerationOptions {
  cookingTime: "quick" | "medium" | "long";
  difficulty: "easy" | "medium" | "hard";
}

// Shape of a single recipe as returned by the AI backend. Fields are
// optional/loosely typed since this is unvalidated JSON from an LLM
// response; callers apply their own defaults for missing fields.
export interface RawGeneratedRecipe {
  name?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  tags?: string[];
}

export interface RawDayMealPlan {
  meals?: Record<string, RawGeneratedRecipe[]>;
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
  } catch {
    return false;
  }
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 10_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exponential backoff with jitter, honouring Retry-After (seconds) if given.
export function retryDelayMs(attempt: number, retryAfter?: string | null) {
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(retryAfterSeconds * 1000, MAX_DELAY_MS);
  }
  const exponential = BASE_DELAY_MS * 2 ** (attempt - 1);
  return Math.min(exponential + Math.random() * 500, MAX_DELAY_MS);
}

// Generate a single day's meals via the server route. Transient failures
// (rate limits, timeouts, truncated/invalid AI output, network errors) are
// retried a few times before giving up.
export async function generateDayMealPlan(
  preferences: UserPreferences,
  nutritionSettings: NutritionSettings,
  options: GenerationOptions,
  dayLabel: string,
): Promise<RawDayMealPlan | null> {
  let lastError = "Failed to generate meal plan";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences,
          nutritionSettings,
          options,
          dayLabel,
        }),
      });
    } catch {
      lastError = "Network error";
      if (attempt < MAX_ATTEMPTS) await sleep(retryDelayMs(attempt));
      continue;
    }

    const data = await response.json().catch(() => null);

    if (response.ok && data?.day?.meals) {
      return data.day;
    }

    lastError =
      data?.error ||
      (response.ok ? "Empty response" : `HTTP ${response.status}`);

    // Server says it's permanent (bad key, bad request, not configured).
    // Gateway errors without a JSON body (e.g. platform timeouts) have no
    // flag, so treat them as retryable.
    const retryable = data?.retryable ?? response.status >= 429;
    if (!retryable || attempt === MAX_ATTEMPTS) break;

    await sleep(retryDelayMs(attempt, response.headers.get("retry-after")));
  }

  throw new Error(lastError);
}
