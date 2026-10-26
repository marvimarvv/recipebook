"use client";

import { ReactNode, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MAIN_MEALS,
  MAX_SNACKS,
  caloriesPerMeal,
  canToggleOffMeal,
  countDailyMeals,
  type MainMeal,
} from "@/lib/mealPlan";
import { useStore } from "@/store/useStore";
import { NutritionSettings, StepHeaderAction, UserPreferences } from "@/types";

type CookingLevel = UserPreferences["cookingLevel"];
type MealPlanSettings = NutritionSettings["mealPlan"];

export const COOKING_LEVELS: CookingLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export const DEFAULT_MEAL_PLAN: MealPlanSettings = {
  breakfast: true,
  lunch: true,
  dinner: true,
  snacks: false,
  snackCount: 2,
};

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Store actions shared by the dialog cards and the wizard's sections. Every
// meal plan change keeps the derived "meals per day" in sync.
export function useMealSettings() {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);
  const nutritionSettings = useStore((state) => state.nutritionSettings);
  const setNutritionSettings = useStore((state) => state.setNutritionSettings);

  const setMealPlan = (changes: Partial<MealPlanSettings>) => {
    const mealPlan = { ...nutritionSettings.mealPlan, ...changes };
    setNutritionSettings((prev) => ({ ...prev, mealPlan }));
    setPreferences((prev) => ({
      ...prev,
      mealFrequency: countDailyMeals(mealPlan),
    }));
  };

  return {
    cookingLevel: preferences.cookingLevel,
    mealPlan: nutritionSettings.mealPlan,
    dailyCalories: nutritionSettings.dailyCalories,
    setCookingLevel: (cookingLevel: CookingLevel) =>
      setPreferences((prev) => ({ ...prev, cookingLevel })),
    setMealPlan,
    reset: () => {
      setPreferences((prev) => ({
        ...prev,
        cookingLevel: "intermediate",
        mealFrequency: countDailyMeals(DEFAULT_MEAL_PLAN),
      }));
      setNutritionSettings((prev) => ({
        ...prev,
        mealPlan: DEFAULT_MEAL_PLAN,
      }));
    },
  };
}

export function CookingLevelPicker({
  value,
  onChange,
}: {
  value: CookingLevel;
  onChange: (level: CookingLevel) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COOKING_LEVELS.map((level) => (
        <Button
          key={level}
          variant={value === level ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(level)}
        >
          {capitalize(level)}
        </Button>
      ))}
    </div>
  );
}

// Breakfast/lunch/dinner toggles; the last active meal can't be switched off.
// `children` render as extra toggles in the same grid.
export function MealToggles({
  mealPlan,
  onChange,
  className = "grid grid-cols-3 gap-2",
  children,
}: {
  mealPlan: MealPlanSettings;
  onChange: (changes: Partial<MealPlanSettings>) => void;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={className}>
      {MAIN_MEALS.map((meal: MainMeal) => (
        <Button
          key={meal}
          variant={mealPlan[meal] ? "default" : "outline"}
          disabled={!canToggleOffMeal(mealPlan, meal)}
          aria-pressed={mealPlan[meal]}
          onClick={() => onChange({ [meal]: !mealPlan[meal] })}
        >
          {capitalize(meal)}
        </Button>
      ))}
      {children}
    </div>
  );
}

export function SnackStepper({
  count,
  onChange,
}: {
  count: number;
  onChange: (count: number) => void;
}) {
  const clamp = (value: number) => Math.max(0, Math.min(MAX_SNACKS, value));
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium">Number of snacks</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Fewer snacks"
          onClick={() => onChange(clamp(count - 1))}
          disabled={count <= 0}
        >
          -
        </Button>
        <span className="min-w-8 text-center text-lg font-medium">{count}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="More snacks"
          onClick={() => onChange(clamp(count + 1))}
          disabled={count >= MAX_SNACKS}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function CaloriesPerMealHint({
  dailyCalories,
  mealPlan,
}: {
  dailyCalories: number;
  mealPlan: MealPlanSettings;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      Each meal should contain approximately{" "}
      <span className="font-medium text-foreground">
        {caloriesPerMeal(dailyCalories, mealPlan)} calories
      </span>
      {mealPlan.snacks && mealPlan.snackCount > 0 && " (snacks included)"}
    </p>
  );
}

interface AdditionalSettingsProps {
  hideHeader?: boolean;
  compact?: boolean;
  onRegisterAction?: (action: StepHeaderAction | null) => void;
}

// Card layout used by the meal-plan settings dialog. The onboarding wizard's
// "Fine-tune" step uses the sectioned AdditionalSections instead.
export default function AdditionalSettings({
  hideHeader,
  compact = false,
  onRegisterAction,
}: AdditionalSettingsProps = {}) {
  const {
    cookingLevel,
    mealPlan,
    dailyCalories,
    setCookingLevel,
    setMealPlan,
    reset,
  } = useMealSettings();

  useEffect(() => {
    if (!onRegisterAction) return;
    onRegisterAction({
      label: "Reset fine-tuning",
      icon: RotateCcw,
      onClick: reset,
    });
    return () => onRegisterAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterAction]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={compact ? "flex flex-col gap-4" : "space-y-6"}
    >
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-bold">Additional Settings</h2>
          <p className="text-muted-foreground">
            Fine-tune your recipe recommendations
          </p>
        </div>
      )}

      <Card className={compact ? "shadow-none" : undefined}>
        <CardHeader className={compact ? "p-4 pb-2" : undefined}>
          <CardTitle>Cooking Level</CardTitle>
          <CardDescription>How complex your recipes should be</CardDescription>
        </CardHeader>
        <CardContent className={compact ? "p-4 pt-2" : undefined}>
          <CookingLevelPicker value={cookingLevel} onChange={setCookingLevel} />
        </CardContent>
      </Card>

      {/* Meal Plan Settings */}
      <Card className={compact ? "shadow-none" : undefined}>
        <CardHeader className={compact ? "p-4 pb-2" : undefined}>
          <CardTitle>Meal Plan Settings</CardTitle>
          <CardDescription>
            Configure which meals to include in your daily plan
          </CardDescription>
        </CardHeader>
        <CardContent className={compact ? "space-y-4 p-4 pt-2" : "space-y-4"}>
          <MealToggles
            mealPlan={mealPlan}
            onChange={setMealPlan}
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            <Button
              variant={mealPlan.snacks ? "default" : "outline"}
              aria-pressed={mealPlan.snacks}
              onClick={() => setMealPlan({ snacks: !mealPlan.snacks })}
            >
              Snacks
            </Button>
          </MealToggles>

          {mealPlan.snacks && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="border-t pt-4"
            >
              <SnackStepper
                count={mealPlan.snackCount}
                onChange={(snackCount) => setMealPlan({ snackCount })}
              />
            </motion.div>
          )}

          <CaloriesPerMealHint
            dailyCalories={dailyCalories}
            mealPlan={mealPlan}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
