"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChefHat,
  Heart,
  AlertCircle,
  Utensils,
  Ban,
  Plus,
  Check,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store/useStore";
import {
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  ALLERGY_OPTIONS,
  FOOD_OPTIONS,
  UserPreferences,
  WizardStepProps,
} from "@/types";

// Every category key maps 1:1 onto a UserPreferences string array.
type CategoryKey = "cuisines" | "diets" | "allergies" | "likes" | "dislikes";

export interface PreferenceCardsProgress {
  activeIndex: number;
}

export function createEmptyPreferenceCardsProgress(): PreferenceCardsProgress {
  return { activeIndex: 0 };
}

interface CategoryConfig {
  key: CategoryKey;
  title: string;
  subtitle: string;
  icon: typeof ChefHat;
  emoji: string;
  options: string[];
  freeTextPlaceholder: string;
}

// Cuisines already overlap with the diet options (Vegetarian, Vegan, Keto, Paleo);
// those are asked about once, in the diets category.
const CUISINE_CARD_OPTIONS = CUISINE_OPTIONS.filter(
  (option) => !["Vegetarian", "Vegan", "Keto", "Paleo"].includes(option),
);

const CATEGORIES: CategoryConfig[] = [
  {
    key: "cuisines",
    title: "Cuisines",
    subtitle: "Tap the cuisines you love.",
    icon: ChefHat,
    emoji: "🥘",
    options: CUISINE_CARD_OPTIONS,
    freeTextPlaceholder: "e.g. Korean",
  },
  {
    key: "diets",
    title: "Diets",
    subtitle: "Tap any diets that match your lifestyle.",
    icon: Heart,
    emoji: "🥗",
    options: DIET_OPTIONS.filter((option) => option !== "None"),
    freeTextPlaceholder: "e.g. FODMAP",
  },
  {
    key: "allergies",
    title: "Allergies",
    subtitle: "Tap anything you must avoid, including restrictions.",
    icon: AlertCircle,
    emoji: "🚫",
    options: ALLERGY_OPTIONS.filter((option) => option !== "None"),
    freeTextPlaceholder: "e.g. Sulfites",
  },
  {
    key: "likes",
    title: "Foods you love",
    subtitle: "Tap the ingredients you want to see more often.",
    icon: Utensils,
    emoji: "❤️",
    options: FOOD_OPTIONS,
    freeTextPlaceholder: "e.g. Kimchi",
  },
  {
    key: "dislikes",
    title: "Foods to avoid",
    subtitle: "Tap anything you'd rather not eat.",
    icon: Ban,
    emoji: "💔",
    options: FOOD_OPTIONS,
    freeTextPlaceholder: "e.g. Anchovies",
  },
];

interface PreferenceCategoryCardsProps extends WizardStepProps {
  // Lifted by the wizard so Back/Next preserves position across remounts;
  // falls back to internal state for standalone usage.
  progress?: PreferenceCardsProgress;
  onProgressChange?: (
    progress:
      | PreferenceCardsProgress
      | ((prev: PreferenceCardsProgress) => PreferenceCardsProgress),
  ) => void;
}

export default function PreferenceCategoryCards({
  hideHeader,
  onRegisterAction,
  progress: progressProp,
  onProgressChange: onProgressChangeProp,
}: PreferenceCategoryCardsProps) {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);
  const [internalProgress, setInternalProgress] =
    useState<PreferenceCardsProgress>(createEmptyPreferenceCardsProgress);
  const progress = progressProp ?? internalProgress;
  const onProgressChange = onProgressChangeProp ?? setInternalProgress;

  const activeIndex = Math.min(
    Math.max(progress.activeIndex, 0),
    CATEGORIES.length - 1,
  );
  const activeCategory = CATEGORIES[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === CATEGORIES.length - 1;

  const goTo = (index: number) => onProgressChange({ activeIndex: index });

  const handleResetAll = () => {
    setPreferences((prev) => ({
      ...prev,
      cuisines: [],
      diets: [],
      allergies: [],
      likes: [],
      dislikes: [],
    }));
    onProgressChange(createEmptyPreferenceCardsProgress());
  };

  useEffect(() => {
    if (!onRegisterAction) return;
    onRegisterAction({ label: "Reset All", onClick: handleResetAll });
    return () => onRegisterAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterAction]);

  const toggle = (key: CategoryKey, item: string) => {
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

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category, index) => {
          const count = preferences[category.key].length;
          return (
            <Button
              key={category.key}
              variant={index === activeIndex ? "default" : "outline"}
              size="sm"
              onClick={() => goTo(index)}
            >
              {count > 0 && <Check className="mr-1.5 h-3.5 w-3.5" />}
              {category.title}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </Button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <ActiveCategoryCard
          key={activeCategory.key}
          category={activeCategory}
          selected={preferences[activeCategory.key]}
          onToggle={toggle}
          onBack={isFirst ? undefined : () => goTo(activeIndex - 1)}
          onContinue={isLast ? undefined : () => goTo(activeIndex + 1)}
        />
      </AnimatePresence>
    </motion.div>
  );
}

function ActiveCategoryCard({
  category,
  selected,
  onToggle,
  onBack,
  onContinue,
}: {
  category: CategoryConfig;
  selected: string[];
  onToggle: (key: CategoryKey, item: string) => void;
  onBack?: () => void;
  onContinue?: () => void;
}) {
  const CategoryIcon = category.icon;
  const [freeTextValue, setFreeTextValue] = useState("");
  const hasEntries = selected.length > 0 || freeTextValue.trim().length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CategoryIcon className="h-6 w-6 text-primary" />
            <CardTitle>{category.title}</CardTitle>
          </div>
          <CardDescription>{category.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BadgeGroup
            options={category.options}
            selected={selected}
            onToggle={(item) => onToggle(category.key, item)}
            freeTextPlaceholder={category.freeTextPlaceholder}
            freeTextValue={freeTextValue}
            onFreeTextChange={setFreeTextValue}
            emoji={category.emoji}
          />
          <div className="flex items-center justify-between">
            {onBack ? (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {onContinue && (
              <Button variant="outline" size="sm" onClick={onContinue}>
                {hasEntries ? "Next" : "Skip"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BadgeGroup({
  options,
  selected,
  onToggle,
  freeTextPlaceholder,
  freeTextValue,
  onFreeTextChange,
  emoji,
}: {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  freeTextPlaceholder: string;
  freeTextValue: string;
  onFreeTextChange: (value: string) => void;
  emoji: string;
}) {
  const prefersReducedMotion = useReducedMotion();
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
    onFreeTextChange("");
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
                className="cursor-pointer select-none px-3 py-1"
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
      <div className="flex max-w-sm gap-2">
        <Input
          value={freeTextValue}
          placeholder={freeTextPlaceholder}
          onChange={(e) => onFreeTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
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
    <span className="pointer-events-none absolute left-1/2 top-0 z-10 h-0 w-0">
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
