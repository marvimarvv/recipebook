"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ChefHat, Cookie, RotateCcw, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CaloriesPerMealHint,
  CookingLevelPicker,
  MealToggles,
  SnackStepper,
  capitalize,
  useMealSettings,
} from "@/components/AdditionalSettings";
import SectionedStep, {
  createEmptySectionProgress,
  useSectionProgress,
  type SectionConfig,
  type SectionedStepNavigationProps,
  type StepSections,
} from "@/components/SectionedStep";
import { MAIN_MEALS, caloriesPerMeal } from "@/lib/mealPlan";
import { useStore } from "@/store/useStore";
import { WizardStepProps } from "@/types";

const SECTIONS: SectionConfig[] = [
  { key: "cooking-level", title: "Cooking level", icon: ChefHat },
  { key: "meals", title: "Meals", icon: UtensilsCrossed },
  {
    key: "snacks",
    title: "Snacks",
    icon: Cookie,
    optional: true,
    prompt: "Do you want snacks between meals?",
  },
];
const [COOKING_LEVEL_INDEX, MEALS_INDEX, SNACKS_INDEX] = [0, 1, 2];

/**
 * The Fine-tune step's sections, shared by the wizard step and the Recap.
 * Snacks has no summary while off; the wizard shows "No snacks" only once the
 * opt-in prompt was answered, the Recap always (via `emptyLabel`).
 */
export function useFineTuneSections(): StepSections {
  const {
    cookingLevel,
    mealPlan,
    dailyCalories,
    setCookingLevel,
    setMealPlan,
  } = useMealSettings();

  return {
    sections: SECTIONS,
    renderContent: (index) => {
      if (index === COOKING_LEVEL_INDEX) {
        return (
          <CookingLevelPicker value={cookingLevel} onChange={setCookingLevel} />
        );
      }
      if (index === MEALS_INDEX) {
        return (
          <div className="space-y-4">
            <MealToggles mealPlan={mealPlan} onChange={setMealPlan} />
            <CaloriesPerMealHint
              dailyCalories={dailyCalories}
              mealPlan={mealPlan}
            />
          </div>
        );
      }
      return mealPlan.snacks ? (
        <div className="space-y-4">
          <SnackStepper
            count={mealPlan.snackCount}
            onChange={(snackCount) => setMealPlan({ snackCount })}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMealPlan({ snacks: false })}
          >
            Remove snacks
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">No snacks</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMealPlan({ snacks: true })}
          >
            Add snacks
          </Button>
        </div>
      );
    },
    getSummary: (index) => {
      if (index === COOKING_LEVEL_INDEX) return capitalize(cookingLevel);
      if (index === MEALS_INDEX) {
        const meals = MAIN_MEALS.filter((meal) => mealPlan[meal])
          .map(capitalize)
          .join(", ");
        return `${meals} · ≈ ${caloriesPerMeal(dailyCalories, mealPlan)} cal`;
      }
      if (!mealPlan.snacks) return null;
      return `${mealPlan.snackCount} ${mealPlan.snackCount === 1 ? "snack" : "snacks"}`;
    },
    hasValue: (index) => index !== SNACKS_INDEX || mealPlan.snacks,
    emptyLabel: (index) => (index === SNACKS_INDEX ? "No snacks" : "None"),
  };
}

type AdditionalSectionsProps = WizardStepProps & SectionedStepNavigationProps;

// The onboarding wizard's "Fine-tune" step, split into the same tab/accordion
// sections as the earlier steps. The meal-plan settings dialog keeps the card
// layout in AdditionalSettings.
export default function AdditionalSections({
  onRegisterAction,
  progress: progressProp,
  onProgressChange: onProgressChangeProp,
  ...navigation
}: AdditionalSectionsProps) {
  const { setMealPlan, reset } = useMealSettings();
  const { sections, renderContent, getSummary, hasValue } =
    useFineTuneSections();
  const dispatchRecap = useStore((state) => state.dispatchRecap);
  const [progress, onProgressChange] = useSectionProgress(
    progressProp,
    onProgressChangeProp,
  );

  useEffect(() => {
    if (!onRegisterAction) return;
    onRegisterAction({
      label: "Reset fine-tuning",
      icon: RotateCcw,
      onClick: () => {
        reset();
        onProgressChange(createEmptySectionProgress());
      },
    });
    return () => onRegisterAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterAction]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <SectionedStep
        {...navigation}
        progress={progress}
        onProgressChange={onProgressChange}
        idPrefix="fine-tune"
        ariaLabel="Fine-tune settings"
        sections={sections}
        renderContent={renderContent}
        getSummary={(index) =>
          getSummary(index) ??
          (index === SNACKS_INDEX &&
          progress.optInDeclined?.includes(SNACKS_INDEX)
            ? "No snacks"
            : null)
        }
        hasValue={hasValue}
        nextStepLabel="Generate My Week"
        optInNoLabel="No snacks"
        onOptInYes={() => setMealPlan({ snacks: true })}
        // The last step has no next step to move on to: "No snacks" opens the
        // Recap, the week is generated from there.
        onOptInNo={() => {
          setMealPlan({ snacks: false });
          dispatchRecap("open");
        }}
      />
    </motion.div>
  );
}
