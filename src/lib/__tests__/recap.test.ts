import { describe, expect, it } from "vitest";
import {
  canCloseRecap,
  nextRecapPhase,
  remainingHoldMs,
  type RecapEvent,
  type RecapPhase,
} from "../recap";

const run = (events: RecapEvent[], from: RecapPhase = "closed") =>
  events.reduce(nextRecapPhase, from);

describe("nextRecapPhase", () => {
  it("walks the happy path from open to closed", () => {
    expect(run(["open"])).toBe("review");
    expect(run(["open", "generate"])).toBe("celebrating");
    expect(run(["open", "generate", "burstDone"])).toBe("generating");
    expect(run(["open", "generate", "burstDone", "generated"])).toBe("leaving");
    expect(run(["open", "generate", "burstDone", "generated", "left"])).toBe(
      "closed",
    );
  });

  it("recovers from a failed generation", () => {
    const failed = run(["open", "generate", "burstDone", "failed"]);
    expect(failed).toBe("error");
    expect(nextRecapPhase(failed, "retry")).toBe("generating");
    expect(nextRecapPhase(failed, "backToReview")).toBe("review");
    expect(nextRecapPhase(failed, "close")).toBe("closed");
  });

  it("ignores events that don't apply to the current phase", () => {
    expect(nextRecapPhase("generating", "close")).toBe("generating");
    expect(nextRecapPhase("celebrating", "close")).toBe("celebrating");
    expect(nextRecapPhase("closed", "generate")).toBe("closed");
    expect(nextRecapPhase("review", "open")).toBe("review");
  });
});

describe("canCloseRecap", () => {
  it("only allows closing while reviewing or after an error", () => {
    expect(canCloseRecap("review")).toBe(true);
    expect(canCloseRecap("error")).toBe(true);
    expect(canCloseRecap("celebrating")).toBe(false);
    expect(canCloseRecap("generating")).toBe(false);
    expect(canCloseRecap("leaving")).toBe(false);
  });
});

describe("remainingHoldMs", () => {
  it("returns the rest of the minimum hold", () => {
    expect(remainingHoldMs(1000, 1500, 2000)).toBe(1500);
  });

  it("never goes below zero once the minimum has passed", () => {
    expect(remainingHoldMs(1000, 5000, 2000)).toBe(0);
  });
});
