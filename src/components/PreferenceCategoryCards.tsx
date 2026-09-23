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
  ChevronDown,
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
import { cn } from "@/lib/utils";
import {
  getNextTarget,
  getPrevTarget,
  summarizeSelection,
} from "@/lib/preferenceWizard";
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
  // Indices of substeps that have been opened at least once (via tab, the
  // footer button, or on load for the first substep).
  visited: number[];
}

export function createEmptyPreferenceCardsProgress(): PreferenceCardsProgress {
  return { activeIndex: 0, visited: [0] };
}

// The single source of truth the wizard's footer button reads from - see
// `onFooterStateChange` below.
export interface PreferenceFooterState {
  next: { label: string; onClick: () => void };
  back: { onClick: () => void } | null;
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
  // Whether this is the wizard's very first step (so "Back" from the first
  // substep has no main step to fall back to).
  isFirstOverallStep?: boolean;
  onRequestPrevStep?: () => void;
  onRequestNextStep?: () => void;
  // Lets the wizard's single footer button drive/reflect substep navigation.
  onFooterStateChange?: (state: PreferenceFooterState | null) => void;
}

export default function PreferenceCategoryCards({
  hideHeader,
  onRegisterAction,
  progress: progressProp,
  onProgressChange: onProgressChangeProp,
  isFirstOverallStep = false,
  onRequestPrevStep,
  onRequestNextStep,
  onFooterStateChange,
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
  const visited = useMemo(() => new Set(progress.visited), [progress.visited]);

  const desktopTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Pending scroll/focus target set by footer-driven navigation; the desktop
  // tab is focused immediately (no reflow), the mobile accordion consumes it
  // once its expand animation finishes (see MobilePreferenceAccordion below).
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    desktopTabRefs.current[pendingFocusIndex]?.focus();
  }, [pendingFocusIndex]);

  const goTo = (index: number, options?: { autoScroll?: boolean }) => {
    onProgressChange((prev) => ({
      activeIndex: index,
      visited: prev.visited.includes(index)
        ? prev.visited
        : [...prev.visited, index],
    }));
    if (options?.autoScroll) setPendingFocusIndex(index);
  };

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

  // Single source of truth for the wizard footer button's label, target and
  // behavior - see getNextTarget/getPrevTarget in lib/preferenceWizard.
  useEffect(() => {
    if (!onFooterStateChange) return;

    const nextTarget = getNextTarget(CATEGORIES, activeIndex, visited);
    const prevTarget = getPrevTarget(activeIndex);

    const back: PreferenceFooterState["back"] =
      prevTarget.type === "substep"
        ? { onClick: () => goTo(prevTarget.index, { autoScroll: true }) }
        : isFirstOverallStep
          ? null
          : { onClick: () => onRequestPrevStep?.() };

    onFooterStateChange({
      next: {
        label: nextTarget.label,
        onClick: () =>
          nextTarget.type === "substep"
            ? goTo(nextTarget.index, { autoScroll: true })
            : onRequestNextStep?.(),
      },
      back,
    });

    return () => onFooterStateChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onFooterStateChange,
    activeIndex,
    progress.visited,
    isFirstOverallStep,
    onRequestPrevStep,
    onRequestNextStep,
  ]);

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

      {/* Desktop: tabs + single active card. Free navigation is optional -
          the footer button remains the primary way to advance. */}
      <div className="hidden space-y-6 md:block">
        <div
          role="tablist"
          aria-label="Preference categories"
          className="flex flex-wrap gap-2"
        >
          {CATEGORIES.map((category, index) => {
            const count = preferences[category.key].length;
            const isVisited = visited.has(index);
            return (
              <Button
                key={category.key}
                ref={(el) => {
                  desktopTabRefs.current[index] = el;
                }}
                role="tab"
                id={`preference-tab-${category.key}`}
                aria-selected={index === activeIndex}
                aria-controls={`preference-tabpanel-${category.key}`}
                tabIndex={index === activeIndex ? 0 : -1}
                variant={index === activeIndex ? "default" : "outline"}
                size="sm"
                onClick={() => goTo(index)}
              >
                {isVisited && <Check className="mr-1.5 h-3.5 w-3.5" />}
                {category.title}
                {count > 0 && (
                  <span className="ml-1.5 opacity-70">{count}</span>
                )}
              </Button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`preference-tabpanel-${activeCategory.key}`}
          aria-labelledby={`preference-tab-${activeCategory.key}`}
        >
          <AnimatePresence mode="wait">
            <ActiveCategoryCard
              key={activeCategory.key}
              category={activeCategory}
              selected={preferences[activeCategory.key]}
              onToggle={toggle}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile: summary accordion, exactly one section open at all times. */}
      <MobilePreferenceAccordion
        activeIndex={activeIndex}
        visited={visited}
        preferences={preferences}
        onToggle={toggle}
        onOpenSection={(index) => goTo(index)}
        pendingFocusIndex={pendingFocusIndex}
        onPendingFocusHandled={() => setPendingFocusIndex(null)}
      />
    </motion.div>
  );
}

function ActiveCategoryCard({
  category,
  selected,
  onToggle,
}: {
  category: CategoryConfig;
  selected: string[];
  onToggle: (key: CategoryKey, item: string) => void;
}) {
  const CategoryIcon = category.icon;
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
        <CardContent>
          <SubstepContent
            category={category}
            selected={selected}
            onToggle={(item) => onToggle(category.key, item)}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Shared between the desktop card and the mobile accordion panels so the
// chip picker + custom input only exists once.
function SubstepContent({
  category,
  selected,
  onToggle,
}: {
  category: CategoryConfig;
  selected: string[];
  onToggle: (item: string) => void;
}) {
  const [freeTextValue, setFreeTextValue] = useState("");
  return (
    <BadgeGroup
      options={category.options}
      selected={selected}
      onToggle={onToggle}
      freeTextPlaceholder={category.freeTextPlaceholder}
      freeTextValue={freeTextValue}
      onFreeTextChange={setFreeTextValue}
      emoji={category.emoji}
    />
  );
}

// Scroll offset so a newly-opened accordion section doesn't sit flush
// against the top edge (and would clear any sticky header placed above it).
const MOBILE_SCROLL_TOP_OFFSET = 16;

function MobilePreferenceAccordion({
  activeIndex,
  visited,
  preferences,
  onToggle,
  onOpenSection,
  pendingFocusIndex,
  onPendingFocusHandled,
}: {
  activeIndex: number;
  visited: Set<number>;
  preferences: UserPreferences;
  onToggle: (key: CategoryKey, item: string) => void;
  onOpenSection: (index: number) => void;
  pendingFocusIndex: number | null;
  onPendingFocusHandled: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const headerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const scrollAndFocus = (index: number) => {
    if (pendingFocusIndex !== index) return;
    const header = headerRefs.current[index];
    if (header) {
      const top =
        header.getBoundingClientRect().top +
        window.scrollY -
        MOBILE_SCROLL_TOP_OFFSET;
      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      header.focus();
    }
    onPendingFocusHandled();
  };

  return (
    <div className="divide-y rounded-lg border md:hidden">
      {CATEGORIES.map((category, index) => {
        const isOpen = index === activeIndex;
        const isVisited = visited.has(index);
        const selected = preferences[category.key];
        const summary = summarizeSelection(selected);
        const headerId = `preference-accordion-header-${category.key}`;
        const panelId = `preference-accordion-panel-${category.key}`;
        const CategoryIcon = category.icon;

        return (
          <div key={category.key}>
            <button
              ref={(el) => {
                headerRefs.current[index] = el;
              }}
              id={headerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => {
                if (!isOpen) onOpenSection(index);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <CategoryIcon className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-medium">
                  {isVisited && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  <span className="truncate">{category.title}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {summary ?? (isVisited ? "Nothing selected" : "Optional")}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
                  onAnimationComplete={() => scrollAndFocus(index)}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 px-4 pb-4">
                    <p className="text-sm text-muted-foreground">
                      {category.subtitle}
                    </p>
                    <SubstepContent
                      category={category}
                      selected={selected}
                      onToggle={(item) => onToggle(category.key, item)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
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
