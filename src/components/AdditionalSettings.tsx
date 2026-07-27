"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/store/useStore";
import { StepHeaderAction } from "@/types";

interface AdditionalSettingsProps {
  hideHeader?: boolean;
  onRegisterAction?: (action: StepHeaderAction | null) => void;
}

export default function AdditionalSettings({
  hideHeader,
}: AdditionalSettingsProps = {}) {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);
  const nutritionSettings = useStore((state) => state.nutritionSettings);
  const setNutritionSettings = useStore((state) => state.setNutritionSettings);

  const handleCookingLevelChange = (level: typeof preferences.cookingLevel) => {
    setPreferences((prev) => ({ ...prev, cookingLevel: level }));
  };

  const handleMealFrequencyChange = (frequency: number) => {
    setPreferences((prev) => ({ ...prev, mealFrequency: frequency }));
  };

  const handleMealPlanToggle = (
    mealType: keyof typeof nutritionSettings.mealPlan,
  ) => {
    if (mealType === "snackCount") return;
    setNutritionSettings({
      ...nutritionSettings,
      mealPlan: {
        ...nutritionSettings.mealPlan,
        [mealType]:
          !nutritionSettings.mealPlan[
            mealType as keyof typeof nutritionSettings.mealPlan
          ],
      },
    });
  };

  const handleSnackCountChange = (count: number) => {
    setNutritionSettings({
      ...nutritionSettings,
      mealPlan: {
        ...nutritionSettings.mealPlan,
        snackCount: Math.max(0, Math.min(5, count)),
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-bold">Additional Settings</h2>
          <p className="text-muted-foreground">
            Fine-tune your recipe recommendations
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Additional Settings</CardTitle>
          <CardDescription>
            Fine-tune your recipe recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-medium">Cooking Level</h3>
            <div className="flex gap-2">
              {["beginner", "intermediate", "advanced"].map((level) => (
                <Button
                  key={level}
                  variant={
                    preferences.cookingLevel === level ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    handleCookingLevelChange(
                      level as typeof preferences.cookingLevel,
                    )
                  }
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Meals Per Day</h3>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((freq) => (
                <Button
                  key={freq}
                  variant={
                    preferences.mealFrequency === freq ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleMealFrequencyChange(freq)}
                >
                  {freq}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Plan Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Meal Plan Settings</CardTitle>
          <CardDescription>
            Configure which meals to include in your daily plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {["breakfast", "lunch", "dinner", "snacks"].map((mealType) => (
              <Button
                key={mealType}
                variant={
                  nutritionSettings.mealPlan[
                    mealType as keyof typeof nutritionSettings.mealPlan
                  ]
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  handleMealPlanToggle(
                    mealType as keyof typeof nutritionSettings.mealPlan,
                  )
                }
                className="capitalize"
              >
                {mealType}
              </Button>
            ))}
          </div>

          {nutritionSettings.mealPlan.snacks && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 border-t pt-4"
            >
              <div className="flex items-center justify-between">
                <label className="font-medium">Number of Snacks</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      handleSnackCountChange(
                        nutritionSettings.mealPlan.snackCount - 1,
                      )
                    }
                    disabled={nutritionSettings.mealPlan.snackCount <= 0}
                  >
                    -
                  </Button>
                  <span className="min-w-[2rem] text-center text-lg font-medium">
                    {nutritionSettings.mealPlan.snackCount}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      handleSnackCountChange(
                        nutritionSettings.mealPlan.snackCount + 1,
                      )
                    }
                    disabled={nutritionSettings.mealPlan.snackCount >= 5}
                  >
                    +
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Calorie Calculation Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-sm text-muted-foreground"
      >
        <p>
          Based on your settings, each meal should contain approximately:{" "}
          <span className="font-medium text-foreground">
            {Math.round(
              nutritionSettings.dailyCalories /
                (Object.values(nutritionSettings.mealPlan).filter(Boolean)
                  .length +
                  (nutritionSettings.mealPlan.snacks
                    ? nutritionSettings.mealPlan.snackCount
                    : 0)),
            )}{" "}
            calories
          </span>
        </p>
      </motion.div>
    </motion.div>
  );
}
