"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/store/useStore";
import { StepHeaderAction } from "@/types";

interface NutritionSettingsProps {
  hideHeader?: boolean;
  onRegisterAction?: (action: StepHeaderAction | null) => void;
}

export default function NutritionSettings({
  hideHeader,
  onRegisterAction,
}: NutritionSettingsProps = {}) {
  const nutritionSettings = useStore((state) => state.nutritionSettings);
  const setNutritionSettings = useStore((state) => state.setNutritionSettings);

  const [caloriesInput, setCaloriesInput] = useState(
    nutritionSettings.dailyCalories,
  );
  const [proteinInput, setProteinInput] = useState(
    nutritionSettings.proteinGoal,
  );
  const [carbsInput, setCarbsInput] = useState(nutritionSettings.carbGoal);
  const [fatInput, setFatInput] = useState(nutritionSettings.fatGoal);

  const handleCaloriesChange = (value: number[]) => {
    setCaloriesInput(value[0]);
    setNutritionSettings({ ...nutritionSettings, dailyCalories: value[0] });
  };

  const handleMacroChange = (
    macro: "proteinGoal" | "carbGoal" | "fatGoal",
    value: number[],
  ) => {
    const newSettings = { ...nutritionSettings, [macro]: value[0] };

    // Ensure macros add up to 100%
    let total =
      newSettings.proteinGoal + newSettings.carbGoal + newSettings.fatGoal;
    if (total > 100) {
      // Adjust other macros proportionally
      const excess = total - 100;
      if (macro === "proteinGoal") {
        newSettings.carbGoal = Math.max(0, newSettings.carbGoal - excess / 2);
        newSettings.fatGoal = Math.max(0, newSettings.fatGoal - excess / 2);
      } else if (macro === "carbGoal") {
        newSettings.proteinGoal = Math.max(
          0,
          newSettings.proteinGoal - excess / 2,
        );
        newSettings.fatGoal = Math.max(0, newSettings.fatGoal - excess / 2);
      } else {
        newSettings.proteinGoal = Math.max(
          0,
          newSettings.proteinGoal - excess / 2,
        );
        newSettings.carbGoal = Math.max(0, newSettings.carbGoal - excess / 2);
      }
    }

    setNutritionSettings(newSettings);
    setProteinInput(newSettings.proteinGoal);
    setCarbsInput(newSettings.carbGoal);
    setFatInput(newSettings.fatGoal);
  };

  const handleReset = () => {
    setNutritionSettings({
      dailyCalories: 2000,
      proteinGoal: 30,
      carbGoal: 40,
      fatGoal: 30,
      mealPlan: {
        breakfast: true,
        lunch: true,
        dinner: true,
        snacks: false,
        snackCount: 2,
      },
    });
    setCaloriesInput(2000);
    setProteinInput(30);
    setCarbsInput(40);
    setFatInput(30);
  };

  useEffect(() => {
    if (!onRegisterAction) return;
    onRegisterAction({ label: "Reset", icon: RotateCcw, onClick: handleReset });
    return () => onRegisterAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterAction]);

  const macroCards = [
    {
      key: "proteinGoal",
      title: "Protein",
      description: "Essential for muscle growth and repair",
      icon: <Dumbbell className="h-6 w-6" />,
      value: proteinInput,
      color: "from-blue-500 to-cyan-500",
      onChange: (value: number[]) => handleMacroChange("proteinGoal", value),
    },
    {
      key: "carbGoal",
      title: "Carbohydrates",
      description: "Primary energy source",
      icon: <Wheat className="h-6 w-6" />,
      value: carbsInput,
      color: "from-amber-500 to-orange-500",
      onChange: (value: number[]) => handleMacroChange("carbGoal", value),
    },
    {
      key: "fatGoal",
      title: "Fats",
      description: "Important for hormone production",
      icon: <Droplets className="h-6 w-6" />,
      value: fatInput,
      color: "from-green-500 to-emerald-500",
      onChange: (value: number[]) => handleMacroChange("fatGoal", value),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Nutrition Settings</h2>
            <p className="text-muted-foreground">
              Set your daily calorie and macronutrient goals
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      )}

      {/* Daily Calories Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <CardTitle>Daily Calories</CardTitle>
          </div>
          <CardDescription>
            Set your target daily calorie intake
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Slider
                value={[caloriesInput]}
                onValueChange={handleCaloriesChange}
                min={1000}
                max={4000}
                step={100}
                className="w-full max-w-2xl"
              />
            </div>
            <div className="flex items-center justify-between">
              <input
                type="number"
                value={caloriesInput}
                onChange={(e) => {
                  const value = Math.max(
                    1000,
                    Math.min(4000, parseInt(e.target.value) || 2000),
                  );
                  setCaloriesInput(value);
                  setNutritionSettings({
                    ...nutritionSettings,
                    dailyCalories: value,
                  });
                }}
                className="w-32 border-none bg-transparent text-center text-3xl font-bold focus:outline-none focus:ring-0"
              />
              <span className="text-muted-foreground">calories/day</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1000</span>
              <span>2000</span>
              <span>3000</span>
              <span>4000</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Macronutrient Distribution */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {macroCards.map((macro) => (
          <Card key={macro.key}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {macro.icon}
                <CardTitle>{macro.title}</CardTitle>
              </div>
              <CardDescription>{macro.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Slider
                    value={[macro.value]}
                    onValueChange={macro.onChange}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{macro.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${macro.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${macro.value}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Macro Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Macronutrient Summary</CardTitle>
          <CardDescription>
            Your current macronutrient distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <div className="font-medium">Protein</div>
                <div className="text-muted-foreground">{proteinInput}%</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Carbs</div>
                <div className="text-muted-foreground">{carbsInput}%</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Fats</div>
                <div className="text-muted-foreground">{fatInput}%</div>
              </div>
              <div className="text-center">
                <div className="font-medium">Total</div>
                <div className="text-muted-foreground">
                  {proteinInput + carbsInput + fatInput}%
                </div>
              </div>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                style={{ width: `${proteinInput}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                style={{ width: `${carbsInput}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                style={{ width: `${fatInput}%` }}
              />
            </div>

            {proteinInput + carbsInput + fatInput !== 100 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm text-amber-600 dark:text-amber-400"
              >
                Macros should add up to 100% (
                {proteinInput + carbsInput + fatInput}%)
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
