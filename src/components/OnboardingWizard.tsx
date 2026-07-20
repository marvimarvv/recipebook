"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  Heart,
  Settings,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import FoodPreferences from "@/components/FoodPreferences";
import KnownRecipes from "@/components/KnownRecipes";
import NutritionSettings from "@/components/NutritionSettings";
import { useStore } from "@/store/useStore";
import { useMealPlanGeneration } from "@/hooks/useMealPlanGeneration";
import { checkMistralAPI } from "@/lib/mistral";

interface OnboardingWizardProps {
  onFinish: () => void;
}

const STEPS = [
  {
    key: "preferences",
    title: "Tell us your food preferences",
    description: "Cuisines, diets, allergies, likes and dislikes.",
    icon: ChefHat,
    Component: FoodPreferences,
  },
  {
    key: "recipes",
    title: "Add recipes you already love",
    description: "Optional - save any favorites you already know how to make.",
    icon: Heart,
    Component: KnownRecipes,
  },
  {
    key: "nutrition",
    title: "Set your nutrition goals",
    description: "Daily calories and macro targets.",
    icon: Settings,
    Component: NutritionSettings,
  },
] as const;

export default function OnboardingWizard({ onFinish }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const completeOnboarding = useStore((state) => state.completeOnboarding);
  const startGeneration = useStore((state) => state.startGeneration);
  const { generateWeek } = useMealPlanGeneration();

  const isLastStep = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleSkip = () => {
    completeOnboarding();
    onFinish();
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleNext = async () => {
    if (!isLastStep) {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
      return;
    }

    // Final step: kick off generation, complete onboarding, and hand off to
    // the Generate tab immediately - it shares generation state via the
    // store, so it will pick up the in-progress/completed plan there.
    completeOnboarding();
    onFinish();
    startGeneration(7); // immediate "generating" feedback on the Generate tab

    const useAI = await checkMistralAPI();
    void generateWeek(
      {
        cookingTime: "medium",
        difficulty: "medium",
        includeAllPreferences: true,
        randomize: false,
      },
      useAI,
    );
  };

  const CurrentComponent = current.Component;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
          Let&apos;s set up your RecipeBook
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          A few quick steps, then we&apos;ll generate your first week of meals
          automatically.
        </p>
      </div>

      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="underline-offset-4 hover:underline"
          >
            Skip setup
          </button>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
              <current.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{current.title}</h2>
              <p className="text-sm text-muted-foreground">
                {current.description}
              </p>
            </div>
          </div>

          <CurrentComponent />
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext}>
          {isLastStep ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate My Week
            </>
          ) : (
            <>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
