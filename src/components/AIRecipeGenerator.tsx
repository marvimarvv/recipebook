"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Clock,
  Users,
  Flame,
  Loader2,
  Check,
  Sun,
  Moon,
  Coffee,
  Cake,
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
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useStore } from "@/store/useStore";
import { GeneratedRecipe, MealPlan } from "@/types";
import { checkMistralAPI } from "@/lib/mistral";
import { PREFERENCE_CHIP_CLASSES } from "@/lib/preferenceChips";
import { useMealPlanGeneration } from "@/hooks/useMealPlanGeneration";
import MealPlanSettingsDialog from "@/components/MealPlanSettingsDialog";
import FoodMorphLoader from "@/components/FoodMorphLoader";

const mealTypeIcons: Record<string, React.ReactNode> = {
  breakfast: <Sun className="h-5 w-5" />,
  lunch: <Coffee className="h-5 w-5" />,
  dinner: <Moon className="h-5 w-5" />,
  snack: <Cake className="h-5 w-5" />,
};

const mealTypeColors: Record<string, string> = {
  breakfast: "bg-linear-to-br from-amber-500 to-orange-500",
  lunch: "bg-linear-to-br from-blue-500 to-cyan-500",
  dinner: "bg-linear-to-br from-purple-500 to-pink-500",
  snack: "bg-linear-to-br from-green-500 to-emerald-500",
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
  const generationOptions = useStore((state) => state.generationOptions);

  const { generation, isStale, generateWeek, saveWeekMealPlan } =
    useMealPlanGeneration();

  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  const isGenerating = generation.status === "generating";
  const weekMealPlan = generation.result;
  const hasNoPreferences =
    preferences.cuisines.length === 0 &&
    preferences.diets.length === 0 &&
    preferences.likes.length === 0;
  const enjoyGroups = [
    {
      label: "Cuisines",
      values: preferences.cuisines,
      chipClassName: PREFERENCE_CHIP_CLASSES.cuisines,
    },
    {
      label: "Diets",
      values: preferences.diets,
      chipClassName: PREFERENCE_CHIP_CLASSES.diets,
    },
    {
      label: "Favorites",
      values: preferences.likes,
      chipClassName: PREFERENCE_CHIP_CLASSES.likes,
    },
  ].filter((group) => group.values.length > 0);
  const avoidGroups = [
    {
      label: "Allergies",
      values: preferences.allergies,
      chipClassName: PREFERENCE_CHIP_CLASSES.allergies,
    },
    {
      label: "Avoid",
      values: preferences.dislikes,
      chipClassName: PREFERENCE_CHIP_CLASSES.dislikes,
    },
  ].filter((group) => group.values.length > 0);
  const enabledMeals = [
    nutritionSettings.mealPlan.breakfast && "Breakfast",
    nutritionSettings.mealPlan.lunch && "Lunch",
    nutritionSettings.mealPlan.dinner && "Dinner",
    nutritionSettings.mealPlan.snacks &&
      `${nutritionSettings.mealPlan.snackCount} ${nutritionSettings.mealPlan.snackCount === 1 ? "snack" : "snacks"}`,
  ].filter((meal): meal is string => Boolean(meal));

  // Check Mistral API availability on component mount
  useEffect(() => {
    const checkAPI = async () => {
      try {
        const available = await checkMistralAPI();
        setApiAvailable(available);
      } catch {
        setApiAvailable(false);
      }
    };
    checkAPI();
  }, []);

  const handleGenerateMealPlan = async () => {
    const useAI = apiAvailable ?? (await checkMistralAPI());
    await generateWeek(useAI);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Recipe Generator</h2>
          <p className="text-muted-foreground">
            Generate personalized meal plans based on your preferences
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      {/* Generation Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="py-12 text-center"
          >
            <FoodMorphLoader />
            <h3 className="mb-2 text-xl font-semibold">
              {apiAvailable
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

      {!isGenerating && (
        <>
          {/* Stale plan / empty preferences nudges */}
          {weekMealPlan && isStale && (
            <Alert variant="warning">
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>Your settings have changed</AlertTitle>
              <AlertDescription>
                Preferences, nutrition goals, or generation options were updated
                since this week&apos;s plan was generated. Regenerate to apply
                your latest settings.
              </AlertDescription>
            </Alert>
          )}
          {hasNoPreferences && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No preferences set yet</AlertTitle>
              <AlertDescription>
                You haven&apos;t added any cuisines, diets, or liked foods, so
                the plan will be generic. Use Edit settings to personalize it.
              </AlertDescription>
            </Alert>
          )}

          {/* Current settings summary */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Your meal plan settings</CardTitle>
                  <CardDescription>
                    {weekMealPlan
                      ? isStale
                        ? "Your current settings differ from this generated plan"
                        : "These settings were used for your current plan"
                      : "These settings will shape your generated plan"}
                  </CardDescription>
                </div>
                <MealPlanSettingsDialog />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  title: "What you enjoy",
                  groups: enjoyGroups,
                  empty: "No favorites selected",
                },
                {
                  title: "What to avoid",
                  groups: avoidGroups,
                  empty: "No restrictions",
                },
              ].map((column) => (
                <section
                  key={column.title}
                  className="flex flex-col gap-4 rounded-lg bg-muted/50 p-4"
                >
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {column.title}
                  </h4>
                  {column.groups.length > 0 ? (
                    column.groups.map((group) => (
                      <div key={group.label} className="flex flex-col gap-2">
                        <span className="text-sm font-medium">
                          {group.label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {group.values.map((value) => (
                            <Badge
                              key={`${group.label}-${value}`}
                              variant="outline"
                              className={`font-medium ${group.chipClassName}`}
                            >
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {column.empty}
                    </p>
                  )}
                </section>
              ))}
              <section className="flex flex-col gap-4 rounded-lg bg-muted/50 p-4">
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Meals
                  </h4>
                  <span className="text-sm">
                    <span className="capitalize">
                      {preferences.cookingLevel}
                    </span>{" "}
                    cook · {preferences.mealFrequency} meals per day
                  </span>
                  <span className="text-sm">
                    <span className="capitalize">
                      {generationOptions.cookingTime}
                    </span>{" "}
                    cooking time · {generationOptions.difficulty} difficulty
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledMeals.length > 0 ? (
                      enabledMeals.map((meal) => (
                        <Badge
                          key={meal}
                          variant="outline"
                          className="border-stone-200 bg-background font-medium text-stone-700 dark:border-stone-700 dark:text-stone-300"
                        >
                          {meal}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No meals enabled
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Nutrition
                  </h4>
                  <span className="text-sm">
                    <span className="text-lg font-semibold">
                      {nutritionSettings.dailyCalories}
                    </span>{" "}
                    kcal per day
                  </span>
                  <div className="flex h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-cyan-500"
                      style={{ width: `${nutritionSettings.proteinGoal}%` }}
                    />
                    <div
                      className="h-full bg-linear-to-r from-amber-500 to-orange-500"
                      style={{ width: `${nutritionSettings.carbGoal}%` }}
                    />
                    <div
                      className="h-full bg-linear-to-r from-green-500 to-emerald-500"
                      style={{ width: `${nutritionSettings.fatGoal}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {nutritionSettings.proteinGoal}% protein ·{" "}
                    {nutritionSettings.carbGoal}% carbs ·{" "}
                    {nutritionSettings.fatGoal}% fat
                  </span>
                </div>
              </section>
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
