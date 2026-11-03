"use client";

import { useState } from "react";
import { Gauge, SlidersHorizontal, Timer } from "lucide-react";
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
import {
  SectionAccordion,
  type StepSections,
} from "@/components/SectionedStep";
import { useFoodPreferenceSections } from "@/components/PreferenceCategoryCards";
import { useNutritionSections } from "@/components/NutritionSections";
import { useFineTuneSections } from "@/components/AdditionalSections";
import { useStore } from "@/store/useStore";
import { COOKING_TIME_OPTIONS, DIFFICULTY_OPTIONS } from "@/types";

const RECIPE_SECTIONS = [
  { key: "cooking-time", title: "Cooking time", icon: Timer },
  { key: "difficulty", title: "Difficulty", icon: Gauge },
] as const;

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

// Cooking time and difficulty only exist in the dialog, so they get the same
// section shape the wizard steps use.
function useRecipeOptionSections(): StepSections {
  const generationOptions = useStore((state) => state.generationOptions);
  const setGenerationOptions = useStore((state) => state.setGenerationOptions);

  const fields = [
    { key: "cookingTime", options: COOKING_TIME_OPTIONS },
    { key: "difficulty", options: DIFFICULTY_OPTIONS },
  ] as const;

  return {
    sections: RECIPE_SECTIONS,
    renderContent: (index) => {
      const { key, options } = fields[index];
      return (
        <ToggleGroup
          type="single"
          variant="outline"
          className="w-full"
          value={generationOptions[key]}
          onValueChange={(value) => {
            if (value)
              setGenerationOptions({ ...generationOptions, [key]: value });
          }}
        >
          {options.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground"
            >
              {capitalize(option)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    },
    getSummary: (index) => capitalize(generationOptions[fields[index].key]),
    hasValue: () => true,
    emptyLabel: () => "None",
  };
}

export default function MealPlanSettingsDialog() {
  const groups: {
    id: string;
    title: string;
    description: string;
    step: StepSections;
  }[] = [
    {
      id: "food",
      title: "Food preferences",
      description: "Choose what you enjoy and what your plan should avoid.",
      step: useFoodPreferenceSections(),
    },
    {
      id: "nutrition",
      title: "Nutrition goals",
      description: "Adjust daily calories and macronutrient targets.",
      step: useNutritionSections(),
    },
    {
      id: "fine-tune",
      title: "Meal preferences",
      description: "Set your cooking level and daily meal structure.",
      step: useFineTuneSections(),
    },
    {
      id: "recipe",
      title: "Recipe options",
      description: "Choose how long and how challenging recipes should be.",
      step: useRecipeOptionSections(),
    },
  ];
  // One open section per group, like the Recap.
  const [open, setOpen] = useState<Record<string, number | null>>({});

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
          {groups.map(({ id, title, description, step }) => (
            <section key={id} className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <SectionAccordion
                idPrefix={`settings-${id}`}
                sections={step.sections}
                openIndex={open[id] ?? null}
                getSummary={step.getSummary}
                emptyLabel={step.emptyLabel}
                renderContent={step.renderContent}
                onToggleSection={(index) =>
                  setOpen((current) => ({
                    ...current,
                    [id]: current[id] === index ? null : index,
                  }))
                }
              />
            </section>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
