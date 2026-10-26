"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChefHat, RotateCcw, Heart, Utensils, Ban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import SectionedStep, {
  createEmptySectionProgress,
  useSectionProgress,
  type SectionConfig,
  type SectionedStepNavigationProps,
  type StepSections,
} from "@/components/SectionedStep";
import { summarizeSelection } from "@/lib/preferenceWizard";
import { useStore } from "@/store/useStore";
import {
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  ALLERGY_OPTIONS,
  LIKE_OPTIONS,
  DISLIKE_OPTIONS,
  UserPreferences,
  WizardStepProps,
} from "@/types";

// Every chip group key maps 1:1 onto a UserPreferences string array.
type PreferenceKey = "cuisines" | "diets" | "allergies" | "likes" | "dislikes";

interface ChipGroupConfig {
  key: PreferenceKey;
  // Only shown when a category holds more than one group.
  label?: string;
  emoji: string;
  options: string[];
  // Omit to hide the free-text input for this group.
  freeTextPlaceholder?: string;
}

interface CategoryConfig extends SectionConfig {
  groups: ChipGroupConfig[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "cuisines",
    title: "Cuisines",
    icon: ChefHat,
    groups: [
      {
        key: "cuisines",
        emoji: "🥘",
        options: CUISINE_OPTIONS,
        freeTextPlaceholder: "e.g. Ethiopian",
      },
    ],
  },
  {
    key: "likes",
    title: "Foods you love",
    icon: Utensils,
    groups: [
      {
        key: "likes",
        emoji: "❤️",
        options: LIKE_OPTIONS,
        freeTextPlaceholder: "e.g. Kimchi",
      },
    ],
  },
  {
    key: "dislikes",
    title: "Foods to avoid",
    icon: Ban,
    groups: [
      {
        key: "dislikes",
        emoji: "💔",
        options: DISLIKE_OPTIONS,
        freeTextPlaceholder: "e.g. Okra",
      },
    ],
  },
  {
    key: "dietary",
    title: "Diet & allergies",
    icon: Heart,
    optional: true,
    prompt: "Do you want to add any diets or allergies?",
    groups: [
      {
        key: "diets",
        label: "Diet",
        emoji: "🥗",
        options: DIET_OPTIONS.filter((option) => option !== "None"),
      },
      {
        key: "allergies",
        label: "Allergies & intolerances",
        emoji: "🚫",
        options: ALLERGY_OPTIONS.filter((option) => option !== "None"),
        freeTextPlaceholder: "e.g. Sulfites",
      },
    ],
  },
];

function getCategorySelection(
  category: CategoryConfig,
  preferences: UserPreferences,
): string[] {
  return category.groups.flatMap((group) => preferences[group.key]);
}

/**
 * The Food preferences step's sections, shared by the wizard step and the
 * Recap.
 */
export function useFoodPreferenceSections(): StepSections & {
  getCount: (index: number) => number;
} {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);

  const toggle = (key: PreferenceKey, item: string) => {
    setPreferences((prev) => {
      const current = prev[key];
      const isSelected = current.includes(item);
      const next: UserPreferences = {
        ...prev,
        [key]: isSelected
          ? current.filter((v) => v !== item)
          : [...current, item],
      };
      // Marking a food as loved clears it from avoided, and vice versa.
      if (!isSelected && (key === "likes" || key === "dislikes")) {
        const other = key === "likes" ? "dislikes" : "likes";
        next[other] = prev[other].filter((v) => v !== item);
      }
      return next;
    });
  };

  const selectionAt = (index: number) =>
    getCategorySelection(CATEGORIES[index], preferences);

  return {
    sections: CATEGORIES,
    renderContent: (index) => (
      <SubstepContent
        category={CATEGORIES[index]}
        preferences={preferences}
        onToggle={toggle}
      />
    ),
    getSummary: (index) => summarizeSelection(selectionAt(index)),
    hasValue: (index) => selectionAt(index).length > 0,
    getCount: (index) => selectionAt(index).length,
    emptyLabel: () => "None",
  };
}

type PreferenceCategoryCardsProps = WizardStepProps &
  SectionedStepNavigationProps;

export default function PreferenceCategoryCards({
  hideHeader,
  onRegisterAction,
  progress: progressProp,
  onProgressChange: onProgressChangeProp,
  ...navigation
}: PreferenceCategoryCardsProps) {
  const setPreferences = useStore((state) => state.setPreferences);
  const { sections, renderContent, getSummary, hasValue, getCount } =
    useFoodPreferenceSections();
  const [progress, onProgressChange] = useSectionProgress(
    progressProp,
    onProgressChangeProp,
  );

  const handleResetAll = () => {
    setPreferences((prev) => ({
      ...prev,
      cuisines: [],
      diets: [],
      allergies: [],
      likes: [],
      dislikes: [],
    }));
    onProgressChange(createEmptySectionProgress());
  };

  useEffect(() => {
    if (!onRegisterAction) return;
    onRegisterAction({
      label: "Reset preferences",
      icon: RotateCcw,
      onClick: handleResetAll,
    });
    return () => onRegisterAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterAction]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {!hideHeader && (
        <div>
          <h2 className="text-2xl font-bold">Food Preferences</h2>
          <p className="text-muted-foreground">
            Pick what you like, one category at a time
          </p>
        </div>
      )}

      <SectionedStep
        {...navigation}
        progress={progress}
        onProgressChange={onProgressChange}
        idPrefix="preference"
        ariaLabel="Preference categories"
        sections={sections}
        renderContent={renderContent}
        getSummary={getSummary}
        hasValue={hasValue}
        getCount={getCount}
        nextStepLabel="Continue to Step 2"
        optInNoLabel="No, go to step 2"
      />
    </motion.div>
  );
}

// Shared between the desktop card and the mobile accordion panels so the
// chip picker + custom input only exists once.
function SubstepContent({
  category,
  preferences,
  onToggle,
}: {
  category: CategoryConfig;
  preferences: UserPreferences;
  onToggle: (key: PreferenceKey, item: string) => void;
}) {
  return (
    <div className="space-y-5">
      {category.groups.map((group) => (
        <div key={group.key} className="space-y-2">
          {group.label && (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
          )}
          <BadgeGroup
            options={group.options}
            selected={preferences[group.key]}
            onToggle={(item) => onToggle(group.key, item)}
            freeTextPlaceholder={group.freeTextPlaceholder}
            emoji={group.emoji}
          />
        </div>
      ))}
    </div>
  );
}

function BadgeGroup({
  options,
  selected,
  onToggle,
  freeTextPlaceholder,
  emoji,
}: {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  freeTextPlaceholder?: string;
  emoji: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [freeTextValue, setFreeTextValue] = useState("");
  const [bursts, setBursts] = useState<{ id: number; option: string }[]>([]);
  const nextBurstId = useRef(0);

  // Custom entries added via free text show up as their own toggleable badges.
  const displayOptions = useMemo(
    () => Array.from(new Set([...options, ...selected])),
    [options, selected],
  );

  const handleToggle = (option: string) => {
    // Only celebrate adding a preference, not removing one.
    if (!selected.includes(option) && !prefersReducedMotion) {
      const id = nextBurstId.current++;
      setBursts((prev) => [...prev, { id, option }]);
    }
    onToggle(option);
  };

  const removeBurst = (id: number) =>
    setBursts((prev) => prev.filter((burst) => burst.id !== id));

  const handleAdd = () => {
    const trimmed = freeTextValue.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed)) handleToggle(trimmed);
    setFreeTextValue("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {displayOptions.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <span key={option} className="relative inline-flex">
              <AnimatePresence>
                {bursts
                  .filter((burst) => burst.option === option)
                  .map((burst) => (
                    <EmojiBurst
                      key={burst.id}
                      emoji={emoji}
                      onDone={() => removeBurst(burst.id)}
                    />
                  ))}
              </AnimatePresence>
              <Badge
                role="button"
                tabIndex={0}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 select-none"
                onClick={() => handleToggle(option)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle(option);
                  }
                }}
              >
                {option}
              </Badge>
            </span>
          );
        })}
      </div>
      {freeTextPlaceholder !== undefined && (
        <div className="flex max-w-sm gap-2">
          <Input
            value={freeTextValue}
            placeholder={freeTextPlaceholder}
            onChange={(e) => setFreeTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

const BURST_PARTICLES = [
  { x: 0, delay: 0, rotate: 0 },
  { x: -20, delay: 0.07, rotate: -16 },
  { x: 20, delay: 0.14, rotate: 16 },
];

function EmojiBurst({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  return (
    <span className="pointer-events-none absolute top-0 left-1/2 z-10 h-0 w-0">
      {BURST_PARTICLES.map((particle, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: particle.x,
            y: -48,
            scale: 1,
            rotate: particle.rotate,
          }}
          transition={{ duration: 0.8, delay: particle.delay, ease: "easeOut" }}
          onAnimationComplete={
            index === BURST_PARTICLES.length - 1 ? onDone : undefined
          }
          className="absolute -translate-x-1/2 text-base leading-none"
        >
          {emoji}
        </motion.span>
      ))}
    </span>
  );
}
