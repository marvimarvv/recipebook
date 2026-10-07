"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import FoodPreferences from "@/components/FoodPreferences";
import AdditionalSettings from "@/components/AdditionalSettings";
import NutritionSettings from "@/components/NutritionSettings";
import { useStore } from "@/store/useStore";
import { COOKING_TIME_OPTIONS, DIFFICULTY_OPTIONS } from "@/types";

export default function MealPlanSettingsDialog() {
  const generationOptions = useStore((state) => state.generationOptions);
  const setGenerationOptions = useStore((state) => state.setGenerationOptions);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Edit settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meal plan settings</DialogTitle>
          <DialogDescription>
            Update the preferences and nutrition goals used for your next meal
            plan.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold">Food preferences</h3>
              <p className="text-sm text-muted-foreground">
                Choose what you enjoy and what your plan should avoid.
              </p>
            </div>
            <FoodPreferences hideHeader compact />
          </section>
          <section className="flex flex-col gap-4 border-t pt-8">
            <div>
              <h3 className="text-base font-semibold">Meal preferences</h3>
              <p className="text-sm text-muted-foreground">
                Set your cooking level and daily meal structure.
              </p>
            </div>
            <AdditionalSettings hideHeader compact />
          </section>
          <section className="flex flex-col gap-4 border-t pt-8">
            <div>
              <h3 className="text-base font-semibold">Recipe options</h3>
              <p className="text-sm text-muted-foreground">
                Choose how long and how challenging recipes should be.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Cooking time</span>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={generationOptions.cookingTime}
                  onValueChange={(value) => {
                    if (value) {
                      setGenerationOptions({
                        ...generationOptions,
                        cookingTime:
                          value as (typeof COOKING_TIME_OPTIONS)[number],
                      });
                    }
                  }}
                >
                  {COOKING_TIME_OPTIONS.map((option) => (
                    <ToggleGroupItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Difficulty</span>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={generationOptions.difficulty}
                  onValueChange={(value) => {
                    if (value) {
                      setGenerationOptions({
                        ...generationOptions,
                        difficulty:
                          value as (typeof DIFFICULTY_OPTIONS)[number],
                      });
                    }
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
          </section>
          <section className="flex flex-col gap-4 border-t pt-8">
            <div>
              <h3 className="text-base font-semibold">Nutrition goals</h3>
              <p className="text-sm text-muted-foreground">
                Adjust daily calories and macronutrient targets.
              </p>
            </div>
            <NutritionSettings hideHeader compact />
          </section>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
