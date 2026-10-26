"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  PieChart,
  Dumbbell,
  Wheat,
  Droplets,
  RotateCcw,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { MacroSummary } from "@/components/NutritionSettings";
import SectionedStep, {
  createEmptySectionProgress,
  useSectionProgress,
  type SectionConfig,
  type SectionedStepNavigationProps,
  type StepSections,
} from "@/components/SectionedStep";
import { isDefaultMacroSplit } from "@/lib/preferenceWizard";
import { useStore } from "@/store/useStore";
import {
  DEFAULT_MACRO_SPLIT,
  NutritionSettings,
  WizardStepProps,
} from "@/types";

type MacroKey = "proteinGoal" | "carbGoal" | "fatGoal";

const SECTIONS: SectionConfig[] = [
  { key: "calories", title: "Daily calories", icon: Flame },
  {
    key: "macros",
    title: "Macros",
    icon: PieChart,
    optional: true,
    prompt: "Do you want to set your own macro split?",
  },
];
const MACROS_INDEX = 1;

const MACROS: {
  key: MacroKey;
  title: string;
  icon: typeof Dumbbell;
}[] = [
  {
    key: "proteinGoal",
    title: "Protein",
    icon: Dumbbell,
  },
  {
    key: "carbGoal",
    title: "Carbohydrates",
    icon: Wheat,
  },
  {
    key: "fatGoal",
    title: "Fats",
    icon: Droplets,
  },
];

const DEFAULT_CALORIES = 2000;

/**
 * The Nutrition goals step's sections, shared by the wizard step and the
 * Recap.
 */
export function useNutritionSections(): StepSections {
  const nutritionSettings = useStore((state) => state.nutritionSettings);
  const setNutritionSettings = useStore((state) => state.setNutritionSettings);

  const update = (changes: Partial<NutritionSettings>) =>
    setNutritionSettings((prev) => ({ ...prev, ...changes }));

  const { dailyCalories, proteinGoal, carbGoal, fatGoal } = nutritionSettings;

  return {
    sections: SECTIONS,
    renderContent: (index) =>
      index === MACROS_INDEX ? (
        <MacrosContent settings={nutritionSettings} onChange={update} />
      ) : (
        <CaloriesContent
          value={dailyCalories}
          onChange={(value) => update({ dailyCalories: value })}
        />
      ),
    getSummary: (index) =>
      index === MACROS_INDEX
        ? isDefaultMacroSplit(nutritionSettings)
          ? null
          : `Protein ${proteinGoal}% · Carbs ${carbGoal}% · Fats ${fatGoal}%`
        : `${dailyCalories} calories/day`,
    hasValue: (index) =>
      index !== MACROS_INDEX || !isDefaultMacroSplit(nutritionSettings),
    emptyLabel: (index) =>
      index === MACROS_INDEX ? "Balanced default" : "None",
  };
}

type NutritionSectionsProps = WizardStepProps & SectionedStepNavigationProps;

// The onboarding wizard's "Nutrition goals" step, split into the same
// tab/accordion sections as the "Food preferences" step. The meal-plan
// settings dialog keeps the card layout in NutritionSettings.
export default function NutritionSections({
  onRegisterAction,
  progress: progressProp,
  onProgressChange: onProgressChangeProp,
  ...navigation
}: NutritionSectionsProps) {
  const setNutritionSettings = useStore((state) => state.setNutritionSettings);
  const { sections, renderContent, getSummary, hasValue } =
    useNutritionSections();
  const [progress, onProgressChange] = useSectionProgress(
    progressProp,
    onProgressChangeProp,
  );

  const handleReset = () => {
    setNutritionSettings((prev) => ({
      ...prev,
      dailyCalories: DEFAULT_CALORIES,
      ...DEFAULT_MACRO_SPLIT,
    }));
    onProgressChange(createEmptySectionProgress());
  };

  useEffect(() => {
    if (!onRegisterAction) return;
    onRegisterAction({
      label: "Reset nutrition goals",
      icon: RotateCcw,
      onClick: handleReset,
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
        idPrefix="nutrition"
        ariaLabel="Nutrition goals"
        sections={sections}
        renderContent={renderContent}
        getSummary={getSummary}
        hasValue={hasValue}
        nextStepLabel="Continue to last step"
        optInNoLabel="No, go to last step"
      />
    </motion.div>
  );
}

function CaloriesContent({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Slider
          value={[value]}
          onValueChange={([next]) => onChange(next)}
          min={1000}
          max={4000}
          step={100}
          className="w-full"
          aria-label="Daily calories"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>1000</span>
          <span>2000</span>
          <span>3000</span>
          <span>4000</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          aria-label="Daily calories"
          onChange={(e) =>
            onChange(
              Math.max(
                1000,
                Math.min(4000, parseInt(e.target.value) || DEFAULT_CALORIES),
              ),
            )
          }
          className="w-28 border-none bg-transparent text-center text-3xl font-bold focus:ring-0 focus:outline-hidden"
        />
        <span className="text-sm text-muted-foreground">calories/day</span>
      </div>
    </div>
  );
}

function MacrosContent({
  settings,
  onChange,
}: {
  settings: NutritionSettings;
  onChange: (changes: Partial<NutritionSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      {MACROS.map((macro) => {
        const MacroIcon = macro.icon;
        const value = settings[macro.key];
        return (
          <div key={macro.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <MacroIcon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{macro.title}</span>
              <span className="text-lg font-bold tabular-nums">{value}%</span>
            </div>
            {/* Sliders are independent - changing one doesn't redistribute
                the others; the summary below flags a total other than 100%. */}
            <Slider
              value={[value]}
              onValueChange={([next]) =>
                onChange({ [macro.key]: Math.min(100, Math.max(0, next)) })
              }
              min={0}
              max={100}
              step={5}
              className="w-full"
              aria-label={macro.title}
            />
          </div>
        );
      })}
      <MacroSummary
        protein={settings.proteinGoal}
        carbs={settings.carbGoal}
        fat={settings.fatGoal}
        className="shadow-none"
        contentClassName="p-4"
      />
    </div>
  );
}
