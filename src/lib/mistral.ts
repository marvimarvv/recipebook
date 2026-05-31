// Mistral API Configuration
const MISTRAL_API_KEY = 'hYXRYG46tSAXPlsUyaJkaANVDNJwRlRI';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Types for Mistral API
export interface MistralMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MistralRequest {
  model: string;
  messages: MistralMessage[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
}

export interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Default model
const DEFAULT_MODEL = 'mistral-tiny';

// Generate a meal plan using Mistral AI
export async function generateMealPlanWithMistral(
  preferences: any,
  nutritionSettings: any,
  options: any
): Promise<string> {
  try {
    // Build the prompt based on user preferences and settings
    const prompt = buildMealPlanPrompt(preferences, nutritionSettings, options);
    
    const requestData: MistralRequest = {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a professional nutritionist and chef. You create personalized meal plans based on user preferences, dietary restrictions, and nutrition goals. Always respond with valid JSON in the exact format specified.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: false
    };

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate meal plan');
    }

    const data: MistralResponse = await response.json();
    
    // Extract the content from the response
    const content = data.choices[0]?.message?.content || '';
    
    // Try to parse the JSON response
    try {
      // Sometimes Mistral wraps the JSON in markdown code blocks
      const cleanedContent = content.replace(/```json\n?|```/g, '').trim();
      return cleanedContent;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid response format from AI');
    }
    
  } catch (error) {
    console.error('Mistral API error:', error);
    throw error;
  }
}

// Build the prompt for meal plan generation
function buildMealPlanPrompt(
  preferences: any,
  nutritionSettings: any,
  options: any
): string {
  // Build preferences string
  const preferencesParts = [];
  
  if (preferences.cuisines.length > 0) {
    preferencesParts.push(`Preferred cuisines: ${preferences.cuisines.join(', ')}`);
  }
  if (preferences.diets.length > 0) {
    preferencesParts.push(`Dietary preferences: ${preferences.diets.join(', ')}`);
  }
  if (preferences.allergies.length > 0) {
    preferencesParts.push(`Allergies to avoid: ${preferences.allergies.join(', ')}`);
  }
  if (preferences.likes.length > 0) {
    preferencesParts.push(`Liked foods: ${preferences.likes.join(', ')}`);
  }
  if (preferences.dislikes.length > 0) {
    preferencesParts.push(`Disliked foods: ${preferences.dislikes.join(', ')}`);
  }
  
  preferencesParts.push(`Cooking level: ${preferences.cookingLevel}`);
  preferencesParts.push(`Meals per day: ${preferences.mealFrequency}`);

  // Build nutrition settings string
  const nutritionParts = [];
  nutritionParts.push(`Daily calories: ${nutritionSettings.dailyCalories}`);
  nutritionParts.push(`Macronutrient distribution: ${nutritionSettings.proteinGoal}% protein, ${nutritionSettings.carbGoal}% carbs, ${nutritionSettings.fatGoal}% fat`);
  
  // Build meal plan settings
  const mealPlanParts = [];
  if (nutritionSettings.mealPlan.breakfast) mealPlanParts.push('breakfast');
  if (nutritionSettings.mealPlan.lunch) mealPlanParts.push('lunch');
  if (nutritionSettings.mealPlan.dinner) mealPlanParts.push('dinner');
  if (nutritionSettings.mealPlan.snacks) {
    mealPlanParts.push(`${nutritionSettings.mealPlan.snackCount} snacks`);
  }

  // Build the final prompt
  const prompt = `Generate a personalized meal plan for today with the following requirements:

USER PREFERENCES:
${preferencesParts.join('\n')}

NUTRITION GOALS:
${nutritionParts.join('\n')}

MEAL PLAN SETTINGS:
Include: ${mealPlanParts.join(', ') || 'all meals'}

GENERATION OPTIONS:
Cooking time: ${options.cookingTime}
Difficulty: ${options.difficulty}
Include all preferences: ${options.includeAllPreferences ? 'yes' : 'no'}
Randomize: ${options.randomize ? 'yes' : 'no'}

RESPONSE FORMAT:
Respond with a valid JSON object containing the meal plan in this exact format:
{
  "mealPlan": {
    "date": "YYYY-MM-DD",
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
          "nutrition": {
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number
          },
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

  return prompt;
}

// Parse the AI response into structured data
export function parseMealPlanResponse(response: string): any {
  try {
    const data = JSON.parse(response);
    return data.mealPlan || data;
  } catch (error) {
    console.error('Failed to parse meal plan response:', error);
    return null;
  }
}

// Health check for Mistral API
export async function checkMistralAPI(): Promise<boolean> {
  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: 'Say "hello"' }],
        temperature: 0.7,
        max_tokens: 10,
        stream: false
      })
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export { MISTRAL_API_KEY, MISTRAL_API_URL, DEFAULT_MODEL };
