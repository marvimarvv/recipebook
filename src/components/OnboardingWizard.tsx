"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HoverArrowCursor } from "@/components/ui/hover-arrow-cursor";
import { FitText } from "@/components/ui/fit-text";
import { Progress } from "@/components/ui/progress";
import PreferenceCategoryCards, {
  createEmptyPreferenceCardsProgress,
  type PreferenceCardsProgress,
  type PreferenceFooterState,
} from "@/components/PreferenceCategoryCards";
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
    Component: PreferenceCategoryCards,
  },
  {
    key: "nutrition",
    title: "Set your nutrition goals",
    Component: NutritionSettings,
  },
  {
    key: "additional",
    title: "Fine-tune your recipe experience",
    Component: AdditionalSettings,
  },
] as const;

export default function OnboardingWizard({ onFinish }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [headerAction, setHeaderAction] = useState<StepHeaderAction | null>(
    null,
  );
  const [preferenceProgress, setPreferenceProgress] =
    useState<PreferenceCardsProgress>(createEmptyPreferenceCardsProgress);
  const [preferenceFooter, setPreferenceFooter] =
    useState<PreferenceFooterState | null>(null);
  const [showMacroWarning, setShowMacroWarning] = useState(false);
  const completeOnboarding = useStore((state) => state.completeOnboarding);
  const startGeneration = useStore((state) => state.startGeneration);
  const nutritionSettings = useStore((state) => state.nutritionSettings);
  const { generateWeek } = useMealPlanGeneration();

  const registerHeaderAction = useCallback(
    (action: StepHeaderAction | null) => setHeaderAction(action),
    [],
  );

  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;
  const current = STEPS[step];
  const macroTotal =
    nutritionSettings.proteinGoal +
    nutritionSettings.carbGoal +
    nutritionSettings.fatGoal;

  // Step 1 (preferences) drives its own footer label/target via
  // onFooterStateChange - every other step keeps the plain Back/Next pair.
  const activeFooter = step === 0 ? preferenceFooter : null;
  const showBackButton = activeFooter
    ? activeFooter.back !== null
    : !isFirstStep;
  const nextLabel = activeFooter ? activeFooter.next.label : "Next";

  const handleSkip = () => {
    completeOnboarding();
    onFinish();
  };

  // Memoized: passed down to PreferenceCategoryCards as onRequestPrevStep/
  // onRequestNextStep, which are effect dependencies there - unstable
  // identities would re-trigger that effect (and its onFooterStateChange
  // call) on every render, looping forever.
  const handleBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const handleNext = useCallback(async () => {
    if (current.key === "nutrition" && macroTotal !== 100) {
      setShowMacroWarning(true);
      return;
    }

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
    void generateWeek(useAI);
  }, [
    current.key,
    macroTotal,
    isLastStep,
    completeOnboarding,
    onFinish,
    startGeneration,
    generateWeek,
  ]);

  const CurrentComponent = current.Component;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <Progress
          className="h-5 flex-1"
          value={((step + 1) / STEPS.length) * 100}
          label={`Step ${step + 1} of ${STEPS.length}`}
        />
        <button
          type="button"
          onClick={handleSkip}
          className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Skip setup
        </button>
      </div>

      <FitText
        as="h1"
        minSize={20}
        maxSize={44}
        className="mb-4 text-center font-bold"
        textClassName="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
      >
        Let&apos;s set up your RecipeBook
      </FitText>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <FitText
              as="h2"
              minSize={14}
              maxSize={24}
              className="flex-1 font-semibold"
            >
              {current.title}
            </FitText>
            {headerAction && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={headerAction.onClick}
                aria-label={headerAction.label}
                title={headerAction.label}
              >
                {headerAction.icon && (
                  <headerAction.icon className="mr-2 h-4 w-4" />
                )}
                Reset
              </Button>
            )}
          </div>

          {step === 0 ? (
            <PreferenceCategoryCards
              hideHeader
              onRegisterAction={registerHeaderAction}
              progress={preferenceProgress}
              onProgressChange={setPreferenceProgress}
              isFirstOverallStep={isFirstStep}
              onRequestPrevStep={handleBack}
              onRequestNextStep={handleNext}
              onFooterStateChange={setPreferenceFooter}
            />
          ) : (
            <CurrentComponent
              hideHeader
              onRegisterAction={registerHeaderAction}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-5 z-50 mt-8 flex items-center justify-between rounded-lg border bg-background/95 p-4 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        {showBackButton ? (
          <Button
            variant="outline"
            onClick={
              activeFooter?.back ? activeFooter.back.onClick : handleBack
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        ) : (
          <span />
        )}
        {isLastStep ? (
          <Button onClick={handleNext}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate My Week
          </Button>
        ) : (
          <HoverArrowCursor>
            {({ x, y, labelRef }) => (
              <Button
                onClick={activeFooter ? activeFooter.next.onClick : handleNext}
                className="transition-transform hover:scale-105"
              >
                <motion.span
                  ref={labelRef}
                  style={{ x, y }}
                  className="flex items-center"
                >
                  {nextLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </motion.span>
              </Button>
            )}
          </HoverArrowCursor>
        )}
      </div>

      <AlertDialog open={showMacroWarning} onOpenChange={setShowMacroWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Macros don&apos;t add up to 100%
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your protein, carb, and fat goals currently total {macroTotal}%.
              Adjust the sliders so they add up to exactly 100% before
              continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowMacroWarning(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
