import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateDayMealPlan, retryDelayMs } from "../mistral";
import type { NutritionSettings, UserPreferences } from "@/types";

const args = [
  {} as UserPreferences,
  {} as NutritionSettings,
  { cookingTime: "quick", difficulty: "easy" },
  "Monday",
] as const;

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), { status, headers });
}

describe("generateDayMealPlan", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("retries retryable errors and succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ error: "Mistral rate limit reached", retryable: true }, 429, {
          "retry-after": "1",
        }),
      )
      .mockResolvedValueOnce(json({ day: { meals: { lunch: [] } } }));

    const promise = generateDayMealPlan(...args);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ meals: { lunch: [] } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops immediately on non-retryable errors", async () => {
    fetchMock.mockResolvedValue(
      json({ error: "Unauthorized", retryable: false }, 502),
    );

    const promise = generateDayMealPlan(...args);
    const assertion = expect(promise).rejects.toThrow("Unauthorized");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after 3 attempts with the last error", async () => {
    fetchMock.mockImplementation(async () =>
      json({ error: "AI response was truncated", retryable: true }, 502),
    );

    const promise = generateDayMealPlan(...args);
    const assertion = expect(promise).rejects.toThrow(
      "AI response was truncated",
    );
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("retryDelayMs", () => {
  it("honours Retry-After, capped at 10s", () => {
    expect(retryDelayMs(1, "3")).toBe(3000);
    expect(retryDelayMs(1, "120")).toBe(10_000);
  });

  it("backs off exponentially otherwise", () => {
    expect(retryDelayMs(1)).toBeGreaterThanOrEqual(1000);
    expect(retryDelayMs(3)).toBeGreaterThanOrEqual(4000);
  });
});
