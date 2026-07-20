import { NextRequest, NextResponse } from "next/server";

// This route proxies requests to the Mistral AI API using a server-only
// API key. It must never be exposed to the client (no NEXT_PUBLIC_ prefix),
// otherwise it would be extractable from the shipped JS bundle.
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? "";
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = process.env.MISTRAL_MODEL ?? "mistral-small-latest";

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
    includeAllPreferences: boolean;
    randomize: boolean;
  };
  dayLabel: string;
}

// Health check: does the server have a Mistral key configured and reachable?
export async function GET() {
  if (!MISTRAL_API_KEY) {
    return NextResponse.json({ available: false });
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: 'Say "hello"' }],
        temperature: 0.2,
        max_tokens: 5,
        stream: false,
      }),
    });
    return NextResponse.json({ available: response.ok });
  } catch (error) {
    return NextResponse.json({ available: false });
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
    return NextResponse.json(
      { error: "Mistral API is not configured on the server" },
      { status: 503 },
    );
  }

  try {
    const prompt = buildDayPrompt(
      preferences,
      nutritionSettings,
      options,
      dayLabel,
    );

    const response = await fetch(MISTRAL_API_URL, {
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
              "You are a professional nutritionist and chef. You create personalized daily meal plans based on user preferences, dietary restrictions, and nutrition goals. Always respond with valid JSON in the exact format specified, and nothing else.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1800,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorBody?.message ?? "Failed to generate meal plan" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/```json\n?|```/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse Mistral response:", parseError);
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 502 },
      );
    }

    const day = parsed.day ?? parsed.mealPlan ?? parsed;
    return NextResponse.json({ day });
  } catch (error) {
    console.error("Mistral generate route error:", error);
    return NextResponse.json(
      { error: "Unexpected server error while generating meal plan" },
      { status: 500 },
    );
  }
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
Include all preferences: ${options.includeAllPreferences ? "yes" : "no"}
Randomize: ${options.randomize ? "yes" : "no"}

Vary the recipes from what you'd suggest for other days of the week - avoid repeating the same dish.

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
