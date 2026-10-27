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
import PreferenceCategoryCards from "@/components/PreferenceCategoryCards";
import NutritionSections from "@/components/NutritionSections";
import {
  createEmptySectionProgress,
  type SectionFooterState,
  type SectionProgress,
} from "@/components/SectionedStep";
import AdditionalSections from "@/components/AdditionalSections";
import { AnimatedHeight } from "@/components/SectionedStep";
import { useStore } from "@/store/useStore";
import { StepHeaderAction } from "@/types";

interface OnboardingWizardProps {
  onFinish: () => void;
}

const STEPS = [
  {
    key: "preferences",
    title: "Tell us your food preferences",
  },
  {
    key: "nutrition",
    title: "Set your nutrition goals",
  },
  {
    key: "additional",
    title: "Fine-tune your recipe experience",
  },
] as const;

export default function OnboardingWizard({ onFinish }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [headerAction, setHeaderAction] = useState<StepHeaderAction | null>(
    null,
  );
  const [preferenceProgress, setPreferenceProgress] = useState<SectionProgress>(
    createEmptySectionProgress,
  );
  const [preferenceFooter, setPreferenceFooter] =
    useState<SectionFooterState | null>(null);
  const [nutritionProgress, setNutritionProgress] = useState<SectionProgress>(
    createEmptySectionProgress,
  );
  const [nutritionFooter, setNutritionFooter] =
    useState<SectionFooterState | null>(null);
  const [fineTuneProgress, setFineTuneProgress] = useState<SectionProgress>(
    createEmptySectionProgress,
  );
  const [fineTuneFooter, setFineTuneFooter] =
    useState<SectionFooterState | null>(null);
  const [showMacroWarning, setShowMacroWarning] = useState(false);
  const completeOnboarding = useStore((state) => state.completeOnboarding);
  const dispatchRecap = useStore((state) => state.dispatchRecap);
  const nutritionSettings = useStore((state) => state.nutritionSettings);

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

  // Every step is sectioned and drives the footer's label/target via
  // onFooterStateChange; the plain Back/Next pair is only a fallback until
  // the step has reported its footer state.
  const activeFooter = [preferenceFooter, nutritionFooter, fineTuneFooter][
    step
  ];
  const showBackButton = activeFooter
    ? activeFooter.back !== null
    : !isFirstStep;
  const nextLabel = activeFooter ? activeFooter.next.label : "Next";

  const handleSkip = () => {
    completeOnboarding();
    onFinish();
  };

  // Memoized: passed down to the sectioned steps as onRequestPrevStep/
  // onRequestNextStep, which are effect dependencies there - unstable
  // identities would re-trigger that effect (and its onFooterStateChange
  // call) on every render, looping forever.
  const handleBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const handleNext = useCallback(() => {
    if (current.key === "nutrition" && macroTotal !== 100) {
      setShowMacroWarning(true);
      return;
    }

    if (!isLastStep) {
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
      return;
    }

    // Final step: open the Recap, the week is generated from there.
    dispatchRecap("open");
  }, [current.key, macroTotal, isLastStep, dispatchRecap]);

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

      {/* Steps differ in height: animate it so the footer glides instead of
          snapping when one step replaces another. */}
      <AnimatedHeight>
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
            ) : step === 1 ? (
              <NutritionSections
                hideHeader
                onRegisterAction={registerHeaderAction}
                progress={nutritionProgress}
                onProgressChange={setNutritionProgress}
                isFirstOverallStep={isFirstStep}
                onRequestPrevStep={handleBack}
                onRequestNextStep={handleNext}
                onFooterStateChange={setNutritionFooter}
              />
            ) : (
              <AdditionalSections
                hideHeader
                onRegisterAction={registerHeaderAction}
                progress={fineTuneProgress}
                onProgressChange={setFineTuneProgress}
                isFirstOverallStep={isFirstStep}
                onRequestPrevStep={handleBack}
                onRequestNextStep={handleNext}
                onFooterStateChange={setFineTuneFooter}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AnimatedHeight>

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
        {/* The last step's final button opens the Recap, so it gets its own
            look once the step's sections are done (or before it reports).
            While its opt-in prompt asks about snacks, the prompt's answers
            are the way forward. */}
        {isLastStep && activeFooter?.awaitingOptIn ? (
          <span />
        ) : isLastStep && (activeFooter?.next.leavesStep ?? true) ? (
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
