"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChefHat,
  Heart,
  AlertCircle,
  Utensils,
  X,
  Undo2,
  SkipForward,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  SwipeCardStack,
  type SwipeCardStackHandle,
  type SwipeDirection,
} from "@/components/ui/swipe-card-stack";
import { useStore } from "@/store/useStore";
import {
  CUISINE_OPTIONS,
  DIET_OPTIONS,
  ALLERGY_OPTIONS,
  FOOD_OPTIONS,
  UserPreferences,
  WizardStepProps,
} from "@/types";

type DeckKey = "cuisines" | "diets" | "allergies" | "foods";

type PreferenceArrays = Pick<
  UserPreferences,
  "cuisines" | "diets" | "allergies" | "likes" | "dislikes"
>;

interface SwipeDecisionRecord {
  item: string;
  direction: SwipeDirection;
  prevArrays: PreferenceArrays;
}

export interface SwipeDeckProgress {
  decided: Record<DeckKey, SwipeDecisionRecord[]>;
  freeTextDone: Record<DeckKey, boolean>;
  skipped: Record<DeckKey, boolean>;
}

export function createEmptySwipeDeckProgress(): SwipeDeckProgress {
  return {
    decided: { cuisines: [], diets: [], allergies: [], foods: [] },
    freeTextDone: {
      cuisines: false,
      diets: false,
      allergies: false,
      foods: false,
    },
    skipped: { cuisines: false, diets: false, allergies: false, foods: false },
  };
}

interface DeckConfig {
  key: DeckKey;
  title: string;
  subtitle: string;
  icon: typeof ChefHat;
  options: string[];
  rightLabel: string;
  leftLabel: string;
  freeTextLabel: string;
  freeTextPlaceholder: string;
}

// Cuisines already overlap with the diet options (Vegetarian, Vegan, Keto, Paleo);
// those are asked about once, in the diets deck.
const CUISINE_DECK_OPTIONS = CUISINE_OPTIONS.filter(
  (option) => !["Vegetarian", "Vegan", "Keto", "Paleo"].includes(option),
);

const DECKS: DeckConfig[] = [
  {
    key: "cuisines",
    title: "Cuisines",
    subtitle: "Swipe right for cuisines you love, left to skip.",
    icon: ChefHat,
    options: CUISINE_DECK_OPTIONS,
    rightLabel: "Love it",
    leftLabel: "Skip",
    freeTextLabel: "Any other cuisines you love?",
    freeTextPlaceholder: "e.g. Korean",
  },
  {
    key: "diets",
    title: "Diets",
    subtitle: "Swipe right for diets that match your lifestyle.",
    icon: Heart,
    options: DIET_OPTIONS.filter((option) => option !== "None"),
    rightLabel: "That's me",
    leftLabel: "Skip",
    freeTextLabel: "Any other diets to add?",
    freeTextPlaceholder: "e.g. FODMAP",
  },
  {
    key: "allergies",
    title: "Allergies & Restrictions",
    subtitle: "Swipe right if you need to avoid it, left if it's fine.",
    icon: AlertCircle,
    options: ALLERGY_OPTIONS.filter((option) => option !== "None"),
    rightLabel: "Avoid",
    leftLabel: "Fine",
    freeTextLabel: "Any other allergies or restrictions?",
    freeTextPlaceholder: "e.g. Sulfites",
  },
  {
    key: "foods",
    title: "Foods",
    subtitle: "Swipe right if you love it, left if it's not for you.",
    icon: Utensils,
    options: FOOD_OPTIONS,
    rightLabel: "Love it",
    leftLabel: "Not for me",
    freeTextLabel: "Anything else you love or dislike?",
    freeTextPlaceholder: "",
  },
];

function isDeckFinished(deck: DeckConfig, progress: SwipeDeckProgress) {
  if (progress.skipped[deck.key]) return true;
  const decidedItems = new Set(progress.decided[deck.key].map((d) => d.item));
  const remaining = deck.options.filter((option) => !decidedItems.has(option));
  return remaining.length === 0 && progress.freeTextDone[deck.key];
}

interface PreferenceSwipeDeckProps extends WizardStepProps {
  // Lifted by the wizard so Back/Next preserves progress across remounts;
  // falls back to internal state for standalone usage.
  progress?: SwipeDeckProgress;
  onProgressChange?: (
    progress:
      SwipeDeckProgress | ((prev: SwipeDeckProgress) => SwipeDeckProgress),
  ) => void;
}

export default function PreferenceSwipeDeck({
  hideHeader,
  onRegisterAction,
  onCanProceedChange,
  progress: progressProp,
  onProgressChange: onProgressChangeProp,
}: PreferenceSwipeDeckProps) {
  const preferences = useStore((state) => state.preferences);
  const setPreferences = useStore((state) => state.setPreferences);
  const stackHandleRef = useRef<SwipeCardStackHandle>(null);
  const [freeTextValue, setFreeTextValue] = useState("");
  const [freeTextDislikeValue, setFreeTextDislikeValue] = useState("");
  const [internalProgress, setInternalProgress] = useState<SwipeDeckProgress>(
    createEmptySwipeDeckProgress,
  );
  const progress = progressProp ?? internalProgress;
  const onProgressChange = onProgressChangeProp ?? setInternalProgress;

  const activeDeckIndex = DECKS.findIndex(
    (deck) => !isDeckFinished(deck, progress),
  );
  const finished = activeDeckIndex === -1;
  const activeDeck = finished ? null : DECKS[activeDeckIndex];

  useEffect(() => {
    onCanProceedChange?.(finished);
  }, [finished, onCanProceedChange]);

  useEffect(() => {
    setFreeTextValue("");
    setFreeTextDislikeValue("");
  }, [activeDeck?.key]);

  const remaining = useMemo(() => {
    if (!activeDeck) return [];
    const decidedItems = new Set(
      progress.decided[activeDeck.key].map((d) => d.item),
    );
    return activeDeck.options.filter((option) => !decidedItems.has(option));
  }, [activeDeck, progress.decided]);

  const showFreeText = Boolean(activeDeck) && remaining.length === 0;

  const handleResetAll = () => {
    setPreferences((prev) => ({
      ...prev,
      cuisines: [],
      diets: [],
      allergies: [],
      likes: [],
      dislikes: [],
    }));
    onProgressChange(createEmptySwipeDeckProgress());
  };

  useEffect(() => {
    if (!onRegisterAction) return;
    onRegisterAction({ label: "Reset All", onClick: handleResetAll });
    return () => onRegisterAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterAction]);

  const applyDecision = (
    deck: DeckConfig,
    item: string,
    direction: SwipeDirection,
  ) => {
    const prevArrays: PreferenceArrays = {
      cuisines: preferences.cuisines,
      diets: preferences.diets,
      allergies: preferences.allergies,
      likes: preferences.likes,
      dislikes: preferences.dislikes,
    };

    setPreferences((prev) => {
      if (deck.key === "foods") {
        if (direction === "right") {
          return {
            ...prev,
            likes: prev.likes.includes(item)
              ? prev.likes
              : [...prev.likes, item],
            dislikes: prev.dislikes.filter((v) => v !== item),
          };
        }
        return {
          ...prev,
          dislikes: prev.dislikes.includes(item)
            ? prev.dislikes
            : [...prev.dislikes, item],
          likes: prev.likes.filter((v) => v !== item),
        };
      }
      const arrayKey = deck.key as "cuisines" | "diets" | "allergies";
      if (direction === "right") {
        return {
          ...prev,
          [arrayKey]: prev[arrayKey].includes(item)
            ? prev[arrayKey]
            : [...prev[arrayKey], item],
        };
      }
      return {
        ...prev,
        [arrayKey]: prev[arrayKey].filter((v) => v !== item),
      };
    });

    onProgressChange((prev) => ({
      ...prev,
      decided: {
        ...prev.decided,
        [deck.key]: [
          ...prev.decided[deck.key],
          { item, direction, prevArrays },
        ],
      },
    }));
  };

  const handleUndo = () => {
    if (!activeDeck) return;
    const deckHistory = progress.decided[activeDeck.key];
    const last = deckHistory[deckHistory.length - 1];
    if (!last) return;
    setPreferences((prev) => ({ ...prev, ...last.prevArrays }));
    onProgressChange((prev) => ({
      ...prev,
      decided: {
        ...prev.decided,
        [activeDeck.key]: prev.decided[activeDeck.key].slice(0, -1),
      },
    }));
  };

  const handleSkipCategory = () => {
    if (!activeDeck) return;
    onProgressChange((prev) => ({
      ...prev,
      skipped: { ...prev.skipped, [activeDeck.key]: true },
    }));
  };

  const handleFreeTextAdd = (
    targetKey: "likes" | "dislikes" | DeckKey,
    value: string,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setPreferences((prev) => {
      const key = targetKey as keyof PreferenceArrays;
      return prev[key].includes(trimmed)
        ? prev
        : { ...prev, [key]: [...prev[key], trimmed] };
    });
  };

  const handleContinueFromFreeText = () => {
    if (!activeDeck) return;
    if (activeDeck.key === "foods") {
      handleFreeTextAdd("likes", freeTextValue);
      handleFreeTextAdd("dislikes", freeTextDislikeValue);
    } else {
      handleFreeTextAdd(activeDeck.key, freeTextValue);
    }
    setFreeTextValue("");
    setFreeTextDislikeValue("");
    onProgressChange((prev) => ({
      ...prev,
      freeTextDone: { ...prev.freeTextDone, [activeDeck.key]: true },
    }));
  };

  const canUndo = Boolean(
    activeDeck && progress.decided[activeDeck.key].length > 0,
  );

  return (
    <div className="mx-auto max-w-md">
      {!hideHeader && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Food Preferences</h2>
        </div>
      )}

      <div className="mb-4 flex items-center justify-center gap-2">
        {DECKS.map((deck, index) => (
          <div
            key={deck.key}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < activeDeckIndex || finished
                ? "bg-primary"
                : index === activeDeckIndex
                  ? "bg-primary/50"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {finished ? (
          <motion.div
            key="finished"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/40 bg-primary/5 text-center">
              <CardHeader>
                <CardTitle>All set!</CardTitle>
                <CardDescription>
                  Your food preferences are saved. Tap Next to continue.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ) : showFreeText ? (
          <motion.div
            key={`${activeDeck!.key}-free-text`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{activeDeck!.title}</CardTitle>
                <CardDescription>{activeDeck!.freeTextLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeDeck!.key === "foods" ? (
                  <>
                    <FreeTextInput
                      label="Foods you love"
                      placeholder="e.g. Kimchi"
                      value={freeTextValue}
                      onChange={setFreeTextValue}
                    />
                    <FreeTextInput
                      label="Foods you dislike"
                      placeholder="e.g. Anchovies"
                      value={freeTextDislikeValue}
                      onChange={setFreeTextDislikeValue}
                    />
                  </>
                ) : (
                  <FreeTextInput
                    label={activeDeck!.title}
                    placeholder={activeDeck!.freeTextPlaceholder}
                    value={freeTextValue}
                    onChange={setFreeTextValue}
                  />
                )}
                <Button className="w-full" onClick={handleContinueFromFreeText}>
                  <Check className="mr-2 h-4 w-4" />
                  Continue
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <ActiveDeckCards
            key={activeDeck!.key}
            deck={activeDeck!}
            remaining={remaining}
            stackHandleRef={stackHandleRef}
            canUndo={canUndo}
            onDecide={applyDecision}
            onUndo={handleUndo}
            onSkip={handleSkipCategory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ActiveDeckCards({
  deck,
  remaining,
  stackHandleRef,
  canUndo,
  onDecide,
  onUndo,
  onSkip,
}: {
  deck: DeckConfig;
  remaining: string[];
  stackHandleRef: RefObject<SwipeCardStackHandle>;
  canUndo: boolean;
  onDecide: (deck: DeckConfig, item: string, direction: SwipeDirection) => void;
  onUndo: () => void;
  onSkip: () => void;
}) {
  const DeckIcon = deck.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="mb-3 text-center">
        <h3 className="text-lg font-semibold">{deck.title}</h3>
        <p className="text-sm text-muted-foreground">{deck.subtitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {remaining.length} left
        </p>
      </div>

      <SwipeCardStack
        items={remaining}
        stackHandleRef={stackHandleRef}
        leftLabel={deck.leftLabel}
        rightLabel={deck.rightLabel}
        className="mx-auto h-64 w-full max-w-xs"
        renderCard={(item) => (
          <Card className="flex h-full w-full flex-col items-center justify-center gap-2 shadow-lg">
            <CardContent className="flex flex-col items-center gap-2 pt-6">
              <DeckIcon className="h-8 w-8 text-primary" />
              <p className="text-xl font-semibold">{item}</p>
            </CardContent>
          </Card>
        )}
        onDecide={(item, direction) => onDecide(deck, item, direction)}
      />

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => stackHandleRef.current?.swipe("left")}
          aria-label={deck.leftLabel}
        >
          <X className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <Undo2 className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => stackHandleRef.current?.swipe("right")}
          aria-label={deck.rightLabel}
        >
          <Check className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          <SkipForward className="h-3 w-3" />
          Skip this category
        </button>
      </div>
    </motion.div>
  );
}

function FreeTextInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
