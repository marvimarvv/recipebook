"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getNextTarget,
  getPrevTarget,
  shouldShowOptInPrompt,
} from "@/lib/preferenceWizard";

// Shared shell for onboarding steps split into sections: tabs + a single
// active card on desktop, an accordion on mobile, and a footer button that
// walks through the sections before moving on to the next wizard step.

export interface SectionConfig {
  key: string;
  title: string;
  icon: LucideIcon;
  // Optional sections open on an opt-in prompt asking `prompt` until the
  // user says yes or the section holds a value.
  optional?: boolean;
  prompt?: string;
}

// A step's sections and how to edit/preview them, shared by the wizard step
// and the Recap so each editor only exists once.
export interface StepSections {
  sections: readonly SectionConfig[];
  renderContent: (index: number) => ReactNode;
  // Short preview, or `null` when the section holds nothing worth previewing.
  getSummary: (index: number) => string | null;
  // Whether the section holds a value, which skips its opt-in prompt.
  hasValue: (index: number) => boolean;
  // The Recap's muted stand-in when `getSummary` returns `null`.
  emptyLabel: (index: number) => string;
}

export interface SectionProgress {
  activeIndex: number;
  // Indices of sections that have been opened at least once (via tab, the
  // footer button, or on load for the first section).
  visited: number[];
  // Indices of optional sections where the user answered "Yes" to the opt-in
  // prompt, so reopening shows the content directly.
  optInConfirmed: number[];
  // Indices of optional sections where the user answered "No" and the step
  // handles that answer itself (see `onOptInNo`), so the prompt stays answered.
  optInDeclined: number[];
}

export function createEmptySectionProgress(): SectionProgress {
  return {
    activeIndex: 0,
    visited: [0],
    optInConfirmed: [],
    optInDeclined: [],
  };
}

export type SectionProgressChange = (
  progress: SectionProgress | ((prev: SectionProgress) => SectionProgress),
) => void;

// Lifted by the wizard so Back/Next preserves position across remounts;
// falls back to internal state for standalone usage.
export function useSectionProgress(
  progressProp?: SectionProgress,
  onProgressChangeProp?: SectionProgressChange,
): [SectionProgress, SectionProgressChange] {
  const [internalProgress, setInternalProgress] = useState<SectionProgress>(
    createEmptySectionProgress,
  );
  return [
    progressProp ?? internalProgress,
    onProgressChangeProp ?? setInternalProgress,
  ];
}

// The single source of truth the wizard's footer button reads from - see
// `onFooterStateChange` below.
export interface SectionFooterState {
  // `leavesStep` is true when the button moves on to the next wizard step
  // rather than another section of this one.
  next: { label: string; onClick: () => void; leavesStep: boolean };
  back: { onClick: () => void } | null;
  // The active section is showing its opt-in prompt, whose answer buttons
  // are the way forward (the wizard's last step hides its footer button).
  awaitingOptIn: boolean;
}

// The wizard-facing props every sectioned step forwards to SectionedStep.
export interface SectionedStepNavigationProps {
  progress?: SectionProgress;
  onProgressChange?: SectionProgressChange;
  // Whether this is the wizard's very first step (so "Back" from the first
  // section has no main step to fall back to).
  isFirstOverallStep?: boolean;
  onRequestPrevStep?: () => void;
  onRequestNextStep?: () => void;
  // Lets the wizard's single footer button drive/reflect section navigation.
  onFooterStateChange?: (state: SectionFooterState | null) => void;
}

interface SectionedStepProps extends Omit<
  SectionedStepNavigationProps,
  "progress" | "onProgressChange"
> {
  progress: SectionProgress;
  onProgressChange: SectionProgressChange;
  // Prefix for the tab/accordion element ids, unique per step.
  idPrefix: string;
  ariaLabel: string;
  sections: readonly SectionConfig[];
  renderContent: (index: number) => ReactNode;
  // Short preview for the collapsed mobile header, or `null` when the
  // section holds nothing worth previewing.
  getSummary: (index: number) => string | null;
  // Whether the section holds a value, which skips its opt-in prompt.
  hasValue: (index: number) => boolean;
  // Shown next to the desktop tab title when greater than zero.
  getCount?: (index: number) => number;
  // Footer label once every later section has been visited.
  nextStepLabel: string;
  // The opt-in prompt's "No" button, which moves on to the next step.
  optInNoLabel: string;
  // Run on top of recording the answer. Passing `onOptInNo` keeps the user
  // in this step instead of moving on (e.g. in the wizard's last step, where
  // moving on would start generation).
  onOptInYes?: (index: number) => void;
  onOptInNo?: (index: number) => void;
}

export default function SectionedStep({
  progress,
  onProgressChange,
  isFirstOverallStep = false,
  onRequestPrevStep,
  onRequestNextStep,
  onFooterStateChange,
  idPrefix,
  ariaLabel,
  sections,
  renderContent,
  getSummary,
  hasValue,
  getCount,
  nextStepLabel,
  optInNoLabel,
  onOptInYes,
  onOptInNo,
}: SectionedStepProps) {
  const activeIndex = Math.min(
    Math.max(progress.activeIndex, 0),
    sections.length - 1,
  );
  const activeSection = sections[activeIndex];
  const visited = useMemo(() => new Set(progress.visited), [progress.visited]);
  const optInConfirmed = useMemo(
    () => new Set(progress.optInConfirmed),
    [progress.optInConfirmed],
  );
  const optInDeclined = useMemo(
    () => new Set(progress.optInDeclined ?? []),
    [progress.optInDeclined],
  );

  const desktopTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Pending scroll/focus target set by footer-driven navigation; the desktop
  // tab is focused immediately (no reflow), the mobile accordion consumes it
  // once its expand animation finishes (see MobileSectionAccordion below).
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    desktopTabRefs.current[pendingFocusIndex]?.focus();
  }, [pendingFocusIndex]);

  const goTo = (index: number, options?: { autoScroll?: boolean }) => {
    onProgressChange((prev) => ({
      ...prev,
      activeIndex: index,
      visited: prev.visited.includes(index)
        ? prev.visited
        : [...prev.visited, index],
    }));
    if (options?.autoScroll) setPendingFocusIndex(index);
  };

  const showOptIn = (index: number) =>
    shouldShowOptInPrompt(
      sections[index],
      optInConfirmed.has(index) || optInDeclined.has(index),
      hasValue(index),
    );
  const awaitingOptIn = showOptIn(activeIndex);

  // Single source of truth for the wizard footer button's label, target and
  // behavior - see getNextTarget/getPrevTarget in lib/preferenceWizard.
  useEffect(() => {
    if (!onFooterStateChange) return;

    const nextTarget = getNextTarget(
      sections,
      activeIndex,
      visited,
      nextStepLabel,
    );
    const prevTarget = getPrevTarget(activeIndex);

    const back: SectionFooterState["back"] =
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
        leavesStep: nextTarget.type === "nextStep",
      },
      back,
      awaitingOptIn,
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
    awaitingOptIn,
  ]);

  const confirmOptIn = (index: number) => {
    onProgressChange((prev) =>
      prev.optInConfirmed.includes(index)
        ? prev
        : { ...prev, optInConfirmed: [...prev.optInConfirmed, index] },
    );
    onOptInYes?.(index);
  };

  const declineOptIn = (index: number) => {
    if (!onOptInNo) {
      onRequestNextStep?.();
      return;
    }
    onProgressChange((prev) => {
      const declined = prev.optInDeclined ?? [];
      return declined.includes(index)
        ? prev
        : { ...prev, optInDeclined: [...declined, index] };
    });
    onOptInNo(index);
  };

  return (
    <>
      {/* Desktop: tabs + single active card. Free navigation is optional -
          the footer button remains the primary way to advance. */}
      <div className="hidden space-y-6 md:block">
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="flex flex-wrap gap-2"
        >
          {sections.map((section, index) => {
            const count = getCount?.(index) ?? 0;
            const isVisited = visited.has(index);
            const isActive = index === activeIndex;
            return (
              <Button
                key={section.key}
                ref={(el) => {
                  desktopTabRefs.current[index] = el;
                }}
                role="tab"
                id={`${idPrefix}-tab-${section.key}`}
                aria-selected={isActive}
                aria-controls={`${idPrefix}-tabpanel-${section.key}`}
                tabIndex={isActive ? 0 : -1}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(section.optional && !isActive && "border-dashed")}
                onClick={() => goTo(index)}
              >
                {isVisited && <Check className="mr-1.5 h-3.5 w-3.5" />}
                {section.title}
                {count > 0 ? (
                  <span className="ml-1.5 opacity-70">{count}</span>
                ) : (
                  section.optional && (
                    <span className="ml-1.5 text-xs opacity-60">Optional</span>
                  )
                )}
              </Button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${idPrefix}-tabpanel-${activeSection.key}`}
          aria-labelledby={`${idPrefix}-tab-${activeSection.key}`}
        >
          <AnimatedHeight>
            <AnimatePresence mode="wait">
              <ActiveSectionCard
                key={activeSection.key}
                section={activeSection}
                showOptIn={showOptIn(activeIndex)}
                optInNoLabel={optInNoLabel}
                onOptInYes={() => confirmOptIn(activeIndex)}
                onOptInNo={() => declineOptIn(activeIndex)}
              >
                {renderContent(activeIndex)}
              </ActiveSectionCard>
            </AnimatePresence>
          </AnimatedHeight>
        </div>
      </div>

      {/* Mobile: summary accordion, exactly one section open at all times. */}
      <SectionAccordion
        className="md:hidden"
        idPrefix={idPrefix}
        sections={sections}
        openIndex={activeIndex}
        visited={visited}
        optIn={{
          show: showOptIn,
          noLabel: optInNoLabel,
          onYes: confirmOptIn,
          onNo: declineOptIn,
        }}
        getSummary={getSummary}
        renderContent={renderContent}
        onToggleSection={(index) => {
          if (index !== activeIndex) goTo(index);
        }}
        pendingFocusIndex={pendingFocusIndex}
        onPendingFocusHandled={() => setPendingFocusIndex(null)}
      />
    </>
  );
}

/**
 * Animates its own height to follow its content, so swapping what's inside
 * (another section's card, an opt-in prompt for its editor) doesn't make
 * everything below jump. Never clips: the active-card glow and chip bursts
 * stay visible, and a growing card briefly overlaps what's below instead.
 */
export function AnimatedHeight({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      // AnimatePresence's "wait" mode leaves it empty for a moment between
      // two cards - hold the old height instead of dipping to 0.
      if (content.offsetHeight > 0) setHeight(content.offsetHeight);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}

function ActiveSectionCard({
  section,
  showOptIn,
  optInNoLabel,
  onOptInYes,
  onOptInNo,
  children,
}: {
  section: SectionConfig;
  showOptIn: boolean;
  optInNoLabel: string;
  onOptInYes: () => void;
  onOptInNo: () => void;
  children: ReactNode;
}) {
  const SectionIcon = section.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="preference-active-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SectionIcon className="h-6 w-6 text-primary" />
            <CardTitle>{section.title}</CardTitle>
            {section.optional && <Badge variant="outline">Optional</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {showOptIn ? (
            <OptInPrompt
              question={section.prompt ?? section.title}
              noLabel={optInNoLabel}
              onYes={onOptInYes}
              onNo={onOptInNo}
            />
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Shown first inside an optional section so it can't be skipped unnoticed.
// "No" is the primary action: it keeps the guided flow moving.
function OptInPrompt({
  question,
  noLabel,
  onYes,
  onNo,
}: {
  question: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="space-y-5 rounded-xl bg-linear-to-br from-primary to-secondary p-4 text-white md:p-6">
      <p className="text-xl font-semibold">{question}</p>
      <div className="flex gap-3">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="flex-none border-white/70 bg-transparent px-5 text-white hover:bg-white/15 hover:text-white md:flex-1"
          onClick={onYes}
        >
          Yes
        </Button>
        <Button
          type="button"
          size="lg"
          className="flex-1 bg-white px-4 whitespace-nowrap text-primary hover:bg-white/90"
          onClick={onNo}
        >
          {noLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Summary accordion of a step's sections: the wizard's mobile layout, and the
 * Recap's at every size. The caller decides what toggling a header does - the
 * wizard always keeps one section open, the Recap lets every one close.
 */
export function SectionAccordion({
  className,
  idPrefix,
  sections,
  openIndex,
  visited,
  optIn,
  getSummary,
  emptyLabel,
  renderContent,
  onToggleSection,
  pendingFocusIndex = null,
  onPendingFocusHandled,
}: {
  className?: string;
  idPrefix: string;
  sections: readonly SectionConfig[];
  // `null` when every section is closed.
  openIndex: number | null;
  // Omit outside the guided flow: no check marks, no "Not yet" hints.
  visited?: Set<number>;
  // Omit to always show a section's content, never its opt-in prompt.
  optIn?: {
    show: (index: number) => boolean;
    noLabel: string;
    onYes: (index: number) => void;
    onNo: (index: number) => void;
  };
  getSummary: (index: number) => string | null;
  // Muted label when `getSummary` returns `null`; defaults to the guided
  // flow's "Optional" / "Nothing selected" / "Not yet".
  emptyLabel?: (index: number) => string;
  renderContent: (index: number) => ReactNode;
  onToggleSection: (index: number) => void;
  pendingFocusIndex?: number | null;
  onPendingFocusHandled?: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const headerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const scrollAndFocus = (index: number) => {
    if (pendingFocusIndex !== index) return;
    const header = headerRefs.current[index];
    if (header) {
      // The header's scroll-margin keeps it off the top edge.
      header.scrollIntoView({
        block: "start",
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      header.focus({ preventScroll: true });
    }
    onPendingFocusHandled?.();
  };

  return (
    <div className={cn("space-y-3", className)}>
      {sections.map((section, index) => {
        const isOpen = index === openIndex;
        const isVisited = visited?.has(index) ?? false;
        const summary = getSummary(index);
        const headerId = `${idPrefix}-accordion-header-${section.key}`;
        const panelId = `${idPrefix}-accordion-panel-${section.key}`;
        const SectionIcon = section.icon;

        return (
          <div
            key={section.key}
            className={cn(
              "rounded-xl border bg-card transition-[scale,box-shadow] duration-300 motion-reduce:transition-none",
              isOpen &&
                "preference-active-border scale-[1.01] shadow-md shadow-primary/10",
            )}
          >
            <button
              ref={(el) => {
                headerRefs.current[index] = el;
              }}
              id={headerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => onToggleSection(index)}
              className="flex w-full scroll-mt-4 items-center gap-3 px-4 py-3 text-left"
            >
              <SectionIcon className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-medium">
                  {isVisited && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  <span className="truncate">{section.title}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {summary ??
                    emptyLabel?.(index) ??
                    (section.optional
                      ? "Optional"
                      : isVisited
                        ? "Nothing selected"
                        : "Not yet")}
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
                  // Clip only while expanding/collapsing so chip emoji
                  // bursts can rise past the panel edge once it's open.
                  initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transitionEnd: { overflow: "visible" },
                  }}
                  exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
                  onAnimationComplete={() => scrollAndFocus(index)}
                >
                  {/* Answering "Yes" swaps the prompt for the full editor. */}
                  <AnimatedHeight>
                    <div className="px-4 pt-1 pb-4">
                      {optIn?.show(index) ? (
                        <OptInPrompt
                          question={section.prompt ?? section.title}
                          noLabel={optIn.noLabel}
                          onYes={() => optIn.onYes(index)}
                          onNo={() => optIn.onNo(index)}
                        />
                      ) : (
                        renderContent(index)
                      )}
                    </div>
                  </AnimatedHeight>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
