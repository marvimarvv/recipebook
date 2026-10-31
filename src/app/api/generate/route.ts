import { NextRequest, NextResponse } from "next/server";

// This route proxies requests to the Mistral AI API using a server-only
// API key. It must never be exposed to the client (no NEXT_PUBLIC_ prefix),
// otherwise it would be extractable from the shipped JS bundle.
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? "";
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODELS_URL = "https://api.mistral.ai/v1/models";
const MODEL = process.env.MISTRAL_MODEL ?? "mistral-small-latest";

// A full day (3-5 recipes with ingredients + steps) needs roughly 1.5-3k
// tokens. The model's own output limit is far higher, so this is only a
// safety cap; the old 1800 cap regularly truncated the JSON mid-object.
const MAX_TOKENS = Number(process.env.MISTRAL_MAX_TOKENS) || 4096;
// Abort before the hosting platform kills the function, so the client gets
// a clean, retryable error instead of an opaque gateway timeout.
const REQUEST_TIMEOUT_MS = Number(process.env.MISTRAL_TIMEOUT_MS) || 25_000;

function errorResponse(
  error: string,
  status: number,
  retryable: boolean,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error, retryable }, { status, headers });
}

interface GenerateDayRequestBody {
  preferences: {
    cuisines: string[];
    diets: string[];
    allergies: string[];
    dislikes: string[];
    likes: string[];
    cookingLevel: string;
    mealFrequency: number;
  };
  nutritionSettings: {
    dailyCalories: number;
    proteinGoal: number;
    carbGoal: number;
    fatGoal: number;
    mealPlan: {
      breakfast: boolean;
      lunch: boolean;
      dinner: boolean;
      snacks: boolean;
      snackCount: number;
    };
  };
  options: {
    cookingTime: string;
    difficulty: string;
  };
  dayLabel: string;
}

// Health check: does the server have a Mistral key configured and reachable?
// Uses the cheap models-list endpoint instead of a chat completion, so it
// doesn't burn completion quota or count against the chat rate limit.
export async function GET() {
  if (!MISTRAL_API_KEY) {
    return NextResponse.json({ available: false, reason: "missing_key" });
  }

  try {
    const response = await fetch(MISTRAL_MODELS_URL, {
      headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
      signal: AbortSignal.timeout(5_000),
    });
    // A 429 still proves the key is valid; generation retries on rate limits,
    // so don't throw away the whole week to mock data because of it.
    const available = response.ok || response.status === 429;
    if (!available) {
      console.error(`Mistral health check failed: HTTP ${response.status}`);
    }
    return NextResponse.json({
      available,
      reason: available ? undefined : `http_${response.status}`,
    });
  } catch (error) {
    console.error("Mistral health check error:", error);
    return NextResponse.json({ available: false, reason: "unreachable" });
  }
}

// Generate meals for a single day. Called once per weekday so a single
// truncated/oversized response can't take down the whole week's plan.
export async function POST(request: NextRequest) {
  let body: GenerateDayRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { preferences, nutritionSettings, options, dayLabel } = body ?? {};
  if (
    !preferences ||
    !nutritionSettings ||
    !options ||
    typeof dayLabel !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!MISTRAL_API_KEY) {
    return errorResponse(
      "Mistral API is not configured on the server",
      503,
      false,
    );
  }

  const prompt = buildDayPrompt(
    preferences,
    nutritionSettings,
    options,
    dayLabel,
  );

  let response: Response;
  try {
    response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a professional nutritionist and chef. You create personalized daily meal plans based on user preferences, dietary restrictions, and nutrition goals. Always respond with a single valid JSON object in the exact format specified, and nothing else.",
          },
          { role: "user", content: prompt },
        ],
        // JSON mode: the API guarantees syntactically valid JSON output,
        // instead of us stripping markdown fences and hoping.
        response_format: { type: "json_object" },
        // Lower temperature keeps the structure reliable; the prompt already
        // asks for variety across days.
        temperature: 0.5,
        max_tokens: MAX_TOKENS,
        stream: false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    console.error(
      `Mistral request for ${dayLabel} ${timedOut ? "timed out" : "failed"}:`,
      error,
    );
    return errorResponse(
      timedOut ? "Mistral request timed out" : "Could not reach Mistral",
      504,
      true,
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(
      `Mistral returned HTTP ${response.status} for ${dayLabel}: ${errorText.slice(0, 500)}`,
    );
    let message = "Failed to generate meal plan";
    try {
      message = JSON.parse(errorText)?.message ?? message;
    } catch {
      // non-JSON error body
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      return errorResponse(
        "Mistral rate limit reached",
        429,
        true,
        retryAfter ? { "Retry-After": retryAfter } : undefined,
      );
    }
    // Auth / bad request errors won't fix themselves on retry.
    const retryable = response.status >= 500;
    return errorResponse(message, 502, retryable);
  }

  let data: {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
  };
  try {
    data = await response.json();
  } catch {
    return errorResponse("Unreadable response from Mistral", 502, true);
  }

  const choice = data.choices?.[0];
  if (choice?.finish_reason === "length") {
    console.error(
      `Mistral output for ${dayLabel} hit max_tokens (${MAX_TOKENS}) and was truncated`,
    );
    return errorResponse("AI response was truncated", 502, true);
  }

  const content = choice?.message?.content ?? "";
  const cleaned = content.replace(/```json\n?|```/g, "").trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    console.error(
      `Failed to parse Mistral response for ${dayLabel}:`,
      parseError,
      cleaned.slice(0, 300),
    );
    return errorResponse("Invalid response format from AI", 502, true);
  }

  const day = (parsed.day ?? parsed.mealPlan ?? parsed) as {
    meals?: unknown;
  };
  if (!day || typeof day.meals !== "object" || day.meals === null) {
    console.error(
      `Mistral response for ${dayLabel} has no meals object:`,
      cleaned.slice(0, 300),
    );
    return errorResponse("AI response is missing meals", 502, true);
  }

  return NextResponse.json({ day });
}

function buildDayPrompt(
  preferences: GenerateDayRequestBody["preferences"],
  nutritionSettings: GenerateDayRequestBody["nutritionSettings"],
  options: GenerateDayRequestBody["options"],
  dayLabel: string,
): string {
  const preferencesParts: string[] = [];

  if (preferences.cuisines?.length > 0) {
    preferencesParts.push(
      `Preferred cuisines: ${preferences.cuisines.join(", ")}`,
    );
  }
  if (preferences.diets?.length > 0) {
    preferencesParts.push(
      `Dietary preferences: ${preferences.diets.join(", ")}`,
    );
  }
  if (preferences.allergies?.length > 0) {
    preferencesParts.push(
      `Allergies to avoid: ${preferences.allergies.join(", ")}`,
    );
  }
  if (preferences.likes?.length > 0) {
    preferencesParts.push(`Liked foods: ${preferences.likes.join(", ")}`);
  }
  if (preferences.dislikes?.length > 0) {
    preferencesParts.push(`Disliked foods: ${preferences.dislikes.join(", ")}`);
  }
  preferencesParts.push(`Cooking level: ${preferences.cookingLevel}`);
  preferencesParts.push(`Meals per day: ${preferences.mealFrequency}`);

  const nutritionParts = [
    `Daily calories: ${nutritionSettings.dailyCalories}`,
    `Macronutrient distribution: ${nutritionSettings.proteinGoal}% protein, ${nutritionSettings.carbGoal}% carbs, ${nutritionSettings.fatGoal}% fat`,
  ];

  const mealPlanParts: string[] = [];
  if (nutritionSettings.mealPlan.breakfast) mealPlanParts.push("breakfast");
  if (nutritionSettings.mealPlan.lunch) mealPlanParts.push("lunch");
  if (nutritionSettings.mealPlan.dinner) mealPlanParts.push("dinner");
  if (nutritionSettings.mealPlan.snacks) {
    mealPlanParts.push(`${nutritionSettings.mealPlan.snackCount} snacks`);
  }

  return `Generate a personalized meal plan for ${dayLabel} with the following requirements:

USER PREFERENCES:
${preferencesParts.join("\n")}

NUTRITION GOALS:
${nutritionParts.join("\n")}

MEAL PLAN SETTINGS:
Include: ${mealPlanParts.join(", ") || "all meals"}

GENERATION OPTIONS:
Cooking time: ${options.cookingTime}
Difficulty: ${options.difficulty}

Vary the recipes from what you'd suggest for other days of the week - avoid repeating the same dish.

KEEP IT CONCISE:
- Only include the meal types listed under "Include" (omit the others or use an empty array).
- "description": one short sentence.
- "ingredients": at most 10 items, each with a quantity (e.g. "150 g chicken breast").
- "instructions": at most 6 short steps.
- "tags": at most 4.

RESPONSE FORMAT:
Respond with a valid JSON object in this exact format (no markdown, no commentary):
{
  "day": {
    "totalNutrition": {
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    },
    "meals": {
      "breakfast": [
        {
          "name": "string",
          "description": "string",
          "ingredients": ["string"],
          "instructions": ["string"],
          "prepTime": number,
          "cookTime": number,
          "servings": number,
          "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
          "mealType": "breakfast",
          "tags": ["string"]
        }
      ],
      "lunch": [...],
      "dinner": [...],
      "snacks": [...]
    }
  }
}

Make sure the meal plan respects the user's nutrition goals and preferences. Be creative and provide varied, delicious recipes.`;
}
