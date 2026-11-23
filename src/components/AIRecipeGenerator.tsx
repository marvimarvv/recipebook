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
  CalendarDays,
  Coffee,
  Cake,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useStore } from "@/store/useStore";
import { GeneratedRecipe, MealPlan } from "@/types";
import { checkMistralAPI } from "@/lib/mistral";
import { PREFERENCE_CHIP_CLASSES } from "@/lib/preferenceChips";
import { useMealPlanGeneration } from "@/hooks/useMealPlanGeneration";
import MealPlanSettingsDialog from "@/components/MealPlanSettingsDialog";
import { GeneratingView } from "@/components/Recap";
import { SectionAccordion } from "@/components/SectionedStep";

const mealTypeIcons: Record<GeneratedRecipe["mealType"], LucideIcon> = {
  breakfast: Sun,
  lunch: Coffee,
  dinner: Moon,
  snack: Cake,
};

const mealTypeLabels: Record<GeneratedRecipe["mealType"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

// Same colors as the macro bar in the settings summary below.
const MACROS = [
  { key: "protein", label: "protein", color: "from-blue-500 to-cyan-500" },
  { key: "carbs", label: "carbs", color: "from-amber-500 to-orange-500" },
  { key: "fat", label: "fat", color: "from-green-500 to-emerald-500" },
] as const;

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snacks"] as const;

function dayRecipes(meals: MealPlan["meals"]) {
  return MEAL_ORDER.flatMap((mealType) =>
    (meals[mealType] ?? []).map((recipe) => ({
      recipe,
      mealType: (mealType === "snacks"
        ? "snack"
        : mealType) as GeneratedRecipe["mealType"],
    })),
  );
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatWeekRange(start: Date, end: Date) {
  const monthDay = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // "Nov 23 – 29, 2026", or "Nov 30 – Dec 6, 2026" across a month boundary.
  const to =
    start.getMonth() === end.getMonth() ? end.getDate() : monthDay(end);
  return `${monthDay(start)} – ${to}, ${end.getFullYear()}`;
}

function MealCard({
  recipe,
  mealType,
}: {
  recipe: GeneratedRecipe;
  mealType: GeneratedRecipe["mealType"];
}) {
  const Icon = mealTypeIcons[mealType];
  const macroTotal =
    recipe.nutrition.protein + recipe.nutrition.carbs + recipe.nutrition.fat;

  return (
    <article className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary">
          <Icon className="h-4 w-4 text-primary-foreground" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {mealTypeLabels[mealType]}
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-lg leading-snug font-semibold">{recipe.name}</h4>
        <p className="text-sm text-muted-foreground">{recipe.description}</p>
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="bg-background font-medium"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {recipe.prepTime + recipe.cookTime} min
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
        </span>
        <span className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-muted-foreground" />
          {recipe.nutrition.calories} cal
        </span>
      </div>

      <div className="mt-auto space-y-1.5 border-t pt-3">
        {macroTotal > 0 && (
          <div
            aria-hidden
            className="flex h-1.5 overflow-hidden rounded-full bg-background"
          >
            {MACROS.map((macro) => (
              <div
                key={macro.key}
                className={`h-full bg-linear-to-r ${macro.color}`}
                style={{
                  width: `${(recipe.nutrition[macro.key] / macroTotal) * 100}%`,
                }}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground tabular-nums">
          {MACROS.map(
            (macro) => `${recipe.nutrition[macro.key]} g ${macro.label}`,
          ).join(" · ")}
        </p>
      </div>
    </article>
  );
}

function DayMealsGrid({ meals }: { meals: MealPlan["meals"] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {dayRecipes(meals).map(({ recipe, mealType }, index) => (
        <MealCard
          key={`${mealType}-${recipe.id}-${index}`}
          recipe={recipe}
          mealType={mealType}
        />
      ))}
    </div>
  );
}

export default function AIRecipeGenerator() {
  const preferences = useStore((state) => state.preferences);
  const nutritionSettings = useStore((state) => state.nutritionSettings);
  const generationOptions = useStore((state) => state.generationOptions);
  const restartOnboarding = useStore((state) => state.restartOnboarding);

  const { generation, isStale, generateWeek, saveWeekMealPlan } =
    useMealPlanGeneration();

  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(0);

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost">
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart setup
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restart the setup wizard?</AlertDialogTitle>
                <AlertDialogDescription>
                  This walks you through Preferences and Nutrition again and
                  generates a new week when you finish. Your existing meal plans
                  won&apos;t be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => restartOnboarding()}>
                  Restart
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          >
            <GeneratingView
              className="py-12"
              title={
                apiAvailable
                  ? "Mistral AI is Generating Your Week…"
                  : "Cooking up something delicious…"
              }
              currentDay={generation.currentDay}
              totalDays={generation.totalDays}
            />
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
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold">Your week</h3>
                <p className="text-sm text-muted-foreground">
                  {formatWeekRange(
                    weekMealPlan.weekStartDate,
                    weekMealPlan.days[weekMealPlan.days.length - 1]?.date ??
                      weekMealPlan.weekStartDate,
                  )}
                </p>
              </div>
              <Button onClick={handleSaveMealPlan} className="self-start">
                <Check className="mr-2 h-4 w-4" />
                Save Plan
              </Button>
            </div>
            <SectionAccordion
              idPrefix="week"
              sections={weekMealPlan.days.map((day) => ({
                key: day.id,
                title: formatDay(day.date),
                icon: CalendarDays,
              }))}
              openIndex={openDay}
              getSummary={(index) => {
                const day = weekMealPlan.days[index];
                const names = dayRecipes(day.meals).map(
                  ({ recipe }) => recipe.name,
                );
                return `${day.totalNutrition.calories.toLocaleString("en-US")} cal · ${names.join(", ")}`;
              }}
              emptyLabel={() => "No meals"}
              renderContent={(index) => (
                <DayMealsGrid meals={weekMealPlan.days[index].meals} />
              )}
              onToggleSection={(index) =>
                setOpenDay((current) => (current === index ? null : index))
              }
            />
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
