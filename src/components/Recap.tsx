"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  Flame,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import FoodMorphLoader from "@/components/FoodMorphLoader";
import FoodBurst, {
  FOOD_BURST_MS,
  createFoodBurst,
  type BurstPiece,
} from "@/components/FoodBurst";
import MeshGradient from "@/components/MeshGradient";
import {
  SectionAccordion,
  type StepSections,
} from "@/components/SectionedStep";
import { useFoodPreferenceSections } from "@/components/PreferenceCategoryCards";
import { useNutritionSections } from "@/components/NutritionSections";
import { useFineTuneSections } from "@/components/AdditionalSections";
import { useMealPlanGeneration } from "@/hooks/useMealPlanGeneration";
import { checkMistralAPI } from "@/lib/mistral";
import { canCloseRecap, remainingHoldMs } from "@/lib/recap";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

// The generating view stays up at least this long so it never just flashes
// (the fallback generator can finish almost instantly).
const MIN_GENERATING_MS = 2000;
// "Your week is ready" beat before the Recap fades out over the meal plan.
const READY_MS = 700;

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

interface RecapProps {
  // Called once the week is ready, right before the Recap fades out over the
  // meal plan.
  onFinish: () => void;
}

// The Recap: the full-screen overview at the end of the onboarding wizard.
// Every choice, grouped by step and editable in place; the week is generated
// from here and the Recap stays up until it's ready.
//
// The mesh and the content are separate fixed layers (z-60 / z-62) so the
// background shapes can rise in between (z-61, see FoodBackground) - which is
// also why this isn't a native <dialog>: the top layer would cover them.
// Surfaces only use backdrop blur from `sm` up, where those shapes exist:
// on phones it blurs nothing but a smooth gradient and makes the fade-in stutter.
export default function Recap({ onFinish }: RecapProps) {
  const open = useStore((state) => state.recapPhase !== "closed");
  const prefersReducedMotion = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            key="recap-mesh"
            data-food-backdrop
            className="fixed inset-0 z-60"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.3 : 0.6 }}
          >
            <MeshGradient />
          </motion.div>
        )}
        {open && <RecapContent key="recap-content" onFinish={onFinish} />}
      </AnimatePresence>
    </MotionConfig>
  );
}

const STEP_CARDS: { title: string; icon: LucideIcon }[] = [
  { title: "Food preferences", icon: Utensils },
  { title: "Nutrition goals", icon: Flame },
  { title: "Fine-tune", icon: SlidersHorizontal },
];
const NUTRITION_STEP = 1;

function RecapContent({ onFinish }: RecapProps) {
  const phase = useStore((state) => state.recapPhase);
  const dispatchRecap = useStore((state) => state.dispatchRecap);
  const generation = useStore((state) => state.generation);
  const completeOnboarding = useStore((state) => state.completeOnboarding);
  const setGenerationError = useStore((state) => state.setGenerationError);
  const nutritionSettings = useStore((state) => state.nutritionSettings);
  const { generateWeek } = useMealPlanGeneration();
  const prefersReducedMotion = useReducedMotion();

  const steps: StepSections[] = [
    useFoodPreferenceSections(),
    useNutritionSections(),
    useFineTuneSections(),
  ];
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [burst, setBurst] = useState<BurstPiece[] | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isEditable = phase === "review" || phase === "error";
  const showCards = isEditable;
  const macroTotal =
    nutritionSettings.proteinGoal +
    nutritionSettings.carbGoal +
    nutritionSettings.fatGoal;
  const macrosIndex = steps[NUTRITION_STEP].sections.findIndex(
    (section) => section.key === "macros",
  );

  // Move focus into the Recap, and back to whatever opened it on close (if
  // that still exists - after generation the wizard is gone).
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!canCloseRecap(phase)) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatchRecap("close");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [phase, dispatchRecap]);

  const toggleStep = (index: number) => {
    setExpandedStep((current) => (current === index ? null : index));
    setOpenSection(null);
  };

  const showMacros = () => {
    setExpandedStep(NUTRITION_STEP);
    setOpenSection(macrosIndex);
  };

  const runGeneration = async (event: "burstDone" | "retry") => {
    dispatchRecap(event);
    const startedAt = Date.now();
    try {
      const useAI = await checkMistralAPI();
      await generateWeek(useAI);
      if (useStore.getState().generation.status !== "success") {
        throw new Error("Generation did not finish");
      }
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Generation failed",
      );
      dispatchRecap("failed");
      return;
    }
    await wait(remainingHoldMs(startedAt, Date.now(), MIN_GENERATING_MS));
    dispatchRecap("generated");
    await wait(READY_MS);
    // Mount the meal plan behind the Recap, then fade the Recap out over it.
    completeOnboarding();
    onFinish();
    dispatchRecap("left");
  };

  const handleGenerate = async () => {
    dispatchRecap("generate");
    if (!prefersReducedMotion) {
      setBurst(createFoodBurst());
      await wait(FOOD_BURST_MS);
    }
    void runGeneration("burstDone");
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Review your choices"
      className="fixed inset-0 z-62 overflow-x-hidden overflow-y-auto overscroll-contain"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.6 } }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pt-6 md:pt-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1">
            {/* Only fades: removing it would shrink the header row and nudge
                everything below. */}
            <motion.p
              initial={false}
              animate={{ opacity: showCards ? 1 : 0 }}
              aria-hidden={!showCards}
              className="text-foreground/75"
            >
              Here&apos;s everything you picked. Open a step to change anything.
            </motion.p>
          </div>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full bg-background/60 hover:bg-background/80 sm:backdrop-blur-sm"
            onClick={() => dispatchRecap("close")}
            disabled={!canCloseRecap(phase)}
            aria-label="Back to the wizard"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-6 flex flex-1 flex-col">
          <AnimatePresence mode="popLayout">
            {showCards ? (
              <motion.div
                key="cards"
                className="space-y-3"
                exit={{ opacity: 0, y: -32 }}
                transition={{ duration: 0.4 }}
              >
                {phase === "error" && (
                  <ErrorBanner
                    onBackToReview={() => dispatchRecap("backToReview")}
                  />
                )}
                {STEP_CARDS.map((card, index) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + index * 0.08, duration: 0.35 }}
                  >
                    <RecapStepCard
                      index={index}
                      title={card.title}
                      icon={card.icon}
                      step={steps[index]}
                      expanded={expandedStep === index}
                      onToggle={() => toggleStep(index)}
                      openSection={expandedStep === index ? openSection : null}
                      onToggleSection={(section) =>
                        setOpenSection((current) =>
                          current === section ? null : section,
                        )
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              phase !== "celebrating" && (
                <GeneratingView
                  key="generating"
                  ready={phase === "leaving"}
                  currentDay={generation.currentDay}
                  totalDays={generation.totalDays}
                />
              )
            )}
          </AnimatePresence>
        </div>

        {/* popLayout: the leaving footer stops taking up space right away, so
            the generating view is centered where it will stay instead of
            jumping once the footer is gone. The gap above it is the column's
            margin: popLayout pins it at its offset, so a margin of its own
            would be added twice. */}
        <AnimatePresence mode="popLayout">
          {(isEditable || phase === "celebrating") && (
            <motion.div
              key="footer"
              className="sticky bottom-0 flex flex-col items-center gap-3 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 22,
                delay: 0.4,
              }}
            >
              {macroTotal !== 100 && isEditable && (
                <button
                  type="button"
                  onClick={showMacros}
                  className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-sm sm:backdrop-blur-sm"
                >
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Macros add up to {macroTotal}% ·{" "}
                  <span className="font-semibold underline underline-offset-2">
                    Fix it
                  </span>
                </button>
              )}
              <div className="relative w-full md:w-auto">
                {burst && <FoodBurst pieces={burst} />}
                <motion.div layoutId="recap-generate">
                  <Button
                    size="lg"
                    className="h-14 w-full rounded-full bg-white px-10 text-lg text-primary shadow-xl shadow-primary/20 transition-transform hover:scale-[1.03] hover:bg-white/90 md:min-w-80"
                    disabled={macroTotal !== 100 || !isEditable}
                    onClick={() =>
                      phase === "error"
                        ? void runGeneration("retry")
                        : void handleGenerate()
                    }
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {phase === "error" ? "Try again" : "Generate My Week"}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function RecapStepCard({
  index,
  title,
  icon: Icon,
  step,
  expanded,
  onToggle,
  openSection,
  onToggleSection,
}: {
  index: number;
  title: string;
  icon: LucideIcon;
  step: StepSections;
  expanded: boolean;
  onToggle: () => void;
  openSection: number | null;
  onToggleSection: (index: number) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const panelId = `recap-step-${index}`;

  return (
    <div className="rounded-2xl border bg-card/85 shadow-sm sm:backdrop-blur-md">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-4 text-left md:px-5"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">
            Step {index + 1}
          </span>
          <span className="block text-lg font-semibold">{title}</span>
        </span>
        <span className="hidden text-sm text-primary sm:inline">
          {expanded ? "Done" : "Edit"}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {/* Summary and sections swap at the same time, each animating its own
          height, so the card resizes in one smooth motion instead of
          collapsing to its header first. */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="sections"
            id={panelId}
            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
            animate={{
              height: "auto",
              opacity: 1,
              transitionEnd: { overflow: "visible" },
            }}
            exit={{ height: 0, opacity: 0, overflow: "hidden" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
          >
            <SectionAccordion
              className="px-3 pb-3 md:px-4 md:pb-4"
              idPrefix={`recap-${index}`}
              sections={step.sections}
              openIndex={openSection}
              getSummary={step.getSummary}
              emptyLabel={step.emptyLabel}
              renderContent={step.renderContent}
              onToggleSection={onToggleSection}
            />
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
            className="overflow-hidden"
          >
            <dl className="space-y-1.5 px-4 pb-4 text-sm md:px-5">
              {step.sections.map((section, sectionIndex) => {
                const summary = step.getSummary(sectionIndex);
                return (
                  <div key={section.key} className="flex gap-2">
                    <dt className="shrink-0 text-muted-foreground">
                      {section.title}
                    </dt>
                    <dd
                      className={cn(
                        "min-w-0 flex-1 truncate pr-0.5 text-right",
                        summary === null && "text-muted-foreground italic",
                      )}
                    >
                      {summary ?? step.emptyLabel(sectionIndex)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GeneratingView({
  ready,
  currentDay,
  totalDays,
}: {
  ready: boolean;
  currentDay: number;
  totalDays: number;
}) {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center pb-16 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Shares its layoutId with the "Generate My Week" button, which morphs
          into this loader. */}
      <motion.div layoutId="recap-generate" className="mb-2">
        <FoodMorphLoader tone="primary" />
      </motion.div>
      <div
        role="status"
        className="w-full max-w-sm rounded-2xl bg-background/75 px-6 py-5 sm:backdrop-blur-md"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.h3
            key={ready ? "ready" : "cooking"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-1 text-xl font-semibold"
          >
            {ready ? "Your week is ready!" : "Cooking up your week…"}
          </motion.h3>
        </AnimatePresence>
        <p className="mb-4 text-sm text-muted-foreground">
          Day {currentDay} of {totalDays} done
        </p>
        <Progress value={(currentDay / totalDays) * 100} />
      </div>
    </motion.div>
  );
}

function ErrorBanner({ onBackToReview }: { onBackToReview: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-card/90 p-4 sm:backdrop-blur-md"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="font-medium">
          Something went wrong while cooking up your week.
        </p>
        <p className="text-sm text-muted-foreground">
          Try again, or change something first.
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onBackToReview}>
        Back to summary
      </Button>
    </div>
  );
}
