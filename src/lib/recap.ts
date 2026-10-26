// Pure state machine for the Recap: the full-screen overview at the end of
// the onboarding wizard that the week is generated from. Kept free of
// React/UI concerns so it can be unit tested in isolation.

export type RecapPhase =
  | "closed"
  | "review" // editing choices, "Generate My Week" available
  | "celebrating" // food burst out of the button, before generation starts
  | "generating"
  | "error"
  | "leaving"; // week is ready, the Recap fades out over the meal plan

export type RecapEvent =
  | "open"
  | "close"
  | "generate"
  | "burstDone"
  | "generated"
  | "failed"
  | "retry"
  | "backToReview"
  | "left";

const TRANSITIONS: Record<
  RecapPhase,
  Partial<Record<RecapEvent, RecapPhase>>
> = {
  closed: { open: "review" },
  review: { close: "closed", generate: "celebrating" },
  celebrating: { burstDone: "generating" },
  generating: { generated: "leaving", failed: "error" },
  error: { retry: "generating", backToReview: "review", close: "closed" },
  leaving: { left: "closed" },
};

/**
 * The phase after `event`, or `phase` unchanged when the event doesn't apply
 * (e.g. closing while the week is generating).
 */
export function nextRecapPhase(
  phase: RecapPhase,
  event: RecapEvent,
): RecapPhase {
  return TRANSITIONS[phase][event] ?? phase;
}

/** Whether the user can dismiss the Recap (X / Escape) in this phase. */
export function canCloseRecap(phase: RecapPhase): boolean {
  return nextRecapPhase(phase, "close") === "closed";
}

/**
 * How much longer the generating view must stay up so it never just flashes,
 * given when it started and the minimum time it should show.
 */
export function remainingHoldMs(
  startedAt: number,
  now: number,
  minMs: number,
): number {
  return Math.max(0, minMs - (now - startedAt));
}
