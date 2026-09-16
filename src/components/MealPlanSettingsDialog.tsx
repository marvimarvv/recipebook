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
import FoodPreferences from "@/components/FoodPreferences";
import AdditionalSettings from "@/components/AdditionalSettings";
import NutritionSettings from "@/components/NutritionSettings";

export default function MealPlanSettingsDialog() {
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
