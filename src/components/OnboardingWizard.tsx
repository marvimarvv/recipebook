"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  Settings,
  SlidersHorizontal,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import FoodPreferences from "@/components/FoodPreferences";
import NutritionSettings from "@/components/NutritionSettings";
import AdditionalSettings from "@/components/AdditionalSettings";
import { useStore } from "@/store/useStore";
import { useMealPlanGeneration } from "@/hooks/useMealPlanGeneration";
import { checkMistralAPI } from "@/lib/mistral";
import { StepHeaderAction } from "@/types";

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
    key: "nutrition",
    title: "Set your nutrition goals",
    description: "Daily calories and macro targets.",
    icon: Settings,
    Component: NutritionSettings,
  },
  {
    key: "additional",
    title: "Fine-tune your recipe experience",
    description: "Cooking skill level, meal plan, and meals per day.",
    icon: SlidersHorizontal,
    Component: AdditionalSettings,
  },
] as const;

export default function OnboardingWizard({ onFinish }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [headerAction, setHeaderAction] = useState<StepHeaderAction | null>(
    null,
  );
  const completeOnboarding = useStore((state) => state.completeOnboarding);
  const startGeneration = useStore((state) => state.startGeneration);
  const { generateWeek } = useMealPlanGeneration();

  const registerHeaderAction = useCallback(
    (action: StepHeaderAction | null) => setHeaderAction(action),
    [],
  );

  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
            {headerAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={headerAction.onClick}
              >
                {headerAction.icon && (
                  <headerAction.icon className="mr-2 h-4 w-4" />
                )}
                {headerAction.label}
              </Button>
            )}
          </div>

          <CurrentComponent
            hideHeader
            onRegisterAction={registerHeaderAction}
          />
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-5 z-50 mt-8 flex items-center justify-between rounded-lg border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {!isFirstStep ? (
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <span />
        )}
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
