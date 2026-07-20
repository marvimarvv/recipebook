"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChefHat,
  Clock,
  Users,
  Flame,
  Loader2,
  Check,
  Sun,
  Moon,
  Coffee,
  Cake,
  Bot,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useStore } from "@/store/useStore";
import {
  GeneratedRecipe,
  MealPlan,
  COOKING_TIME_OPTIONS,
  DIFFICULTY_OPTIONS,
} from "@/types";
import { checkMistralAPI } from "@/lib/mistral";
import { useMealPlanGeneration } from "@/hooks/useMealPlanGeneration";

const mealTypeIcons: Record<string, React.ReactNode> = {
  breakfast: <Sun className="h-5 w-5" />,
  lunch: <Coffee className="h-5 w-5" />,
  dinner: <Moon className="h-5 w-5" />,
  snack: <Cake className="h-5 w-5" />,
};

const mealTypeColors: Record<string, string> = {
  breakfast: "bg-gradient-to-br from-amber-500 to-orange-500",
  lunch: "bg-gradient-to-br from-blue-500 to-cyan-500",
  dinner: "bg-gradient-to-br from-purple-500 to-pink-500",
  snack: "bg-gradient-to-br from-green-500 to-emerald-500",
};

function DayMealsGrid({ meals }: { meals: MealPlan["meals"] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {Object.entries(meals).map(([mealType, recipes]) => {
        if (!recipes || recipes.length === 0) return null;
        const key = mealType === "snacks" ? "snack" : mealType;

        return recipes.map((recipe: GeneratedRecipe, index: number) => (
          <Card
            key={`${mealType}-${index}`}
            className="transition-shadow hover:shadow-lg"
          >
            <CardHeader className={`pb-0 ${mealTypeColors[key]}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  {mealTypeIcons[key]}
                  <CardTitle className="text-white">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-white">
                  {recipe.nutrition.calories} cal
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold">{recipe.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {recipe.description}
                  </p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{recipe.prepTime + recipe.cookTime} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{recipe.servings} serving</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-muted-foreground" />
                  <span>{recipe.nutrition.calories} cal</span>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Protein: {recipe.nutrition.protein}g</span>
                  <span>Carbs: {recipe.nutrition.carbs}g</span>
                  <span>Fat: {recipe.nutrition.fat}g</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ));
      })}
    </div>
  );
}

export default function AIRecipeGenerator() {
  const preferences = useStore((state) => state.preferences);
  const nutritionSettings = useStore((state) => state.nutritionSettings);

  const { generation, isSnapshotStale, generateWeek, saveWeekMealPlan } =
    useMealPlanGeneration();

  const [generationOptions, setGenerationOptions] = useState({
    cookingTime: "medium" as (typeof COOKING_TIME_OPTIONS)[number],
    difficulty: "medium" as (typeof DIFFICULTY_OPTIONS)[number],
    includeAllPreferences: true,
    randomize: false,
  });
  const [useMistralAPI, setUseMistralAPI] = useState(true);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  const isGenerating = generation.status === "generating";
  const weekMealPlan = generation.result;
  const isStale = isSnapshotStale(generationOptions);
  const hasNoPreferences =
    preferences.cuisines.length === 0 &&
    preferences.diets.length === 0 &&
    preferences.likes.length === 0;

  // Check Mistral API availability on component mount
  useEffect(() => {
    const checkAPI = async () => {
      try {
        const available = await checkMistralAPI();
        setApiAvailable(available);
      } catch (error) {
        setApiAvailable(false);
      }
    };
    checkAPI();
  }, []);

  const handleGenerateMealPlan = async () => {
    await generateWeek(
      generationOptions,
      useMistralAPI && apiAvailable === true,
    );
  };

  const handleSaveMealPlan = () => {
    saveWeekMealPlan();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Recipe Generator</h2>
          <p className="text-muted-foreground">
            Generate personalized meal plans based on your preferences
          </p>
        </div>
      </div>

      {/* API Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mistral AI Integration</CardTitle>
          <CardDescription>
            Your Mistral API key is configured and ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {apiAvailable === true && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
                  <span className="text-sm font-medium">
                    Mistral AI: Connected
                  </span>
                </div>
              )}
              {apiAvailable === false && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">
                    Mistral AI: Connection failed
                  </span>
                </div>
              )}
              {apiAvailable === null && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">
                    Checking Mistral AI connection...
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Use AI</span>
              <Switch
                checked={useMistralAPI}
                onCheckedChange={setUseMistralAPI}
                disabled={apiAvailable === false}
              />
            </div>
          </div>
          {apiAvailable === false && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Mistral API connection failed. Using mock data for
                demonstration.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Generation Options */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Options</CardTitle>
          <CardDescription>
            Customize how AI generates your meal plan
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Cooking Time
              </label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={generationOptions.cookingTime}
                onValueChange={(value) => {
                  if (!value) return;
                  setGenerationOptions({
                    ...generationOptions,
                    cookingTime: value as (typeof COOKING_TIME_OPTIONS)[number],
                  });
                }}
              >
                {COOKING_TIME_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Difficulty
              </label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={generationOptions.difficulty}
                onValueChange={(value) => {
                  if (!value) return;
                  setGenerationOptions({
                    ...generationOptions,
                    difficulty: value as (typeof DIFFICULTY_OPTIONS)[number],
                  });
                }}
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Include All Preferences
              </label>
              <Switch
                checked={generationOptions.includeAllPreferences}
                onCheckedChange={(checked) =>
                  setGenerationOptions({
                    ...generationOptions,
                    includeAllPreferences: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Randomize Selection</label>
              <Switch
                checked={generationOptions.randomize}
                onCheckedChange={(checked) =>
                  setGenerationOptions({
                    ...generationOptions,
                    randomize: checked,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={handleGenerateMealPlan}
            disabled={isGenerating}
            className="min-w-[150px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : weekMealPlan ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Week
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Meal Plan
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Stale plan / empty preferences nudges */}
      {weekMealPlan && isStale && (
        <Alert variant="warning">
          <RefreshCw className="h-4 w-4" />
          <AlertTitle>Your settings have changed</AlertTitle>
          <AlertDescription>
            Preferences, nutrition goals, or generation options were updated
            since this week&apos;s plan was generated. Regenerate to apply your
            latest settings.
          </AlertDescription>
        </Alert>
      )}
      {hasNoPreferences && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No preferences set yet</AlertTitle>
          <AlertDescription>
            You haven&apos;t added any cuisines, diets, or liked foods, so the
            plan will be generic. Visit the Preferences tab to personalize it.
          </AlertDescription>
        </Alert>
      )}

      {/* Preferences Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Preferences Summary</CardTitle>
          <CardDescription>
            {weekMealPlan
              ? isStale
                ? "These are your current settings - they differ from the ones used for the plan below"
                : "This week's plan was generated using these settings"
              : "AI will use these preferences to generate your meal plan"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium">Cuisines</h4>
              {preferences.cuisines.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferences.cuisines.map((cuisine) => (
                    <Badge key={cuisine} variant="secondary">
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No cuisines selected
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-2 font-medium">Diets</h4>
              {preferences.diets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferences.diets.map((diet) => (
                    <Badge key={diet} variant="secondary">
                      {diet}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No diets selected
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-2 font-medium">Allergies</h4>
              {preferences.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {preferences.allergies.map((allergy) => (
                    <Badge key={allergy} variant="destructive">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No allergies specified
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-2 font-medium">Nutrition Goals</h4>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Calories:</span>{" "}
                  {nutritionSettings.dailyCalories} kcal/day
                </p>
                <p className="text-sm">
                  <span className="font-medium">Macros:</span> P:{" "}
                  {nutritionSettings.proteinGoal}% | C:{" "}
                  {nutritionSettings.carbGoal}% | F: {nutritionSettings.fatGoal}
                  %
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-12 text-center"
          >
            <motion.div
              className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              {useMistralAPI && apiAvailable ? (
                <Bot className="h-10 w-10 text-primary-foreground" />
              ) : (
                <ChefHat className="h-10 w-10 text-primary-foreground" />
              )}
            </motion.div>
            <h3 className="mb-2 text-xl font-semibold">
              {useMistralAPI && apiAvailable
                ? "Mistral AI is Generating Your Week..."
                : "Cooking Up Something Delicious..."}
            </h3>
            <p className="mb-4 text-muted-foreground">
              Day {generation.currentDay} of {generation.totalDays} done
            </p>
            <div className="mx-auto max-w-sm">
              <Progress
                value={(generation.currentDay / generation.totalDays) * 100}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Week Meal Plan Display */}
      <AnimatePresence>
        {weekMealPlan && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Generated Weekly Meal Plan</CardTitle>
                    <CardDescription>
                      Week of{" "}
                      {weekMealPlan.weekStartDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                  <Button onClick={handleSaveMealPlan}>
                    <Check className="mr-2 h-4 w-4" />
                    Save Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Total Nutrition Summary */}
                <div className="mb-6 grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-bold">
                      {weekMealPlan.totalNutrition.calories}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Calories (week)
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-bold">
                      {weekMealPlan.totalNutrition.protein}g
                    </div>
                    <div className="text-sm text-muted-foreground">Protein</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-bold">
                      {weekMealPlan.totalNutrition.carbs}g
                    </div>
                    <div className="text-sm text-muted-foreground">Carbs</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-bold">
                      {weekMealPlan.totalNutrition.fat}g
                    </div>
                    <div className="text-sm text-muted-foreground">Fat</div>
                  </div>
                </div>

                {/* Day-by-day accordion */}
                <Accordion type="single" collapsible defaultValue="day-0">
                  {weekMealPlan.days.map((day, index) => (
                    <AccordionItem key={day.id} value={`day-${index}`}>
                      <AccordionTrigger>
                        <div className="flex flex-1 items-center justify-between pr-4">
                          <span className="font-medium">
                            {day.date.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {day.totalNutrition.calories} cal
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <DayMealsGrid meals={day.meals} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!isGenerating && !weekMealPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>Ready to Generate?</EmptyTitle>
              <EmptyDescription>
                Click the button above to let AI create a personalized week of
                meal plans based on your preferences and nutrition goals!
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setGenerationOptions({
                      cookingTime: "quick",
                      difficulty: "easy",
                      includeAllPreferences: true,
                      randomize: false,
                    })
                  }
                >
                  Quick Setup
                </Button>
                <Button onClick={handleGenerateMealPlan}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Now
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </motion.div>
      )}
    </motion.div>
  );
}
