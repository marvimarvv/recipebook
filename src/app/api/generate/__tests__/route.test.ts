import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const body = {
  preferences: {
    cuisines: [],
    diets: [],
    allergies: [],
    dislikes: [],
    likes: [],
    cookingLevel: "beginner",
    mealFrequency: 3,
  },
  nutritionSettings: {
    dailyCalories: 2000,
    proteinGoal: 30,
    carbGoal: 40,
    fatGoal: 30,
    mealPlan: {
      breakfast: true,
      lunch: true,
      dinner: true,
      snacks: false,
      snackCount: 0,
    },
  },
  options: { cookingTime: "quick", difficulty: "easy" },
  dayLabel: "Monday",
};

function request() {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function completion(content: string, finish_reason = "stop") {
  return new Response(
    JSON.stringify({ choices: [{ message: { content }, finish_reason }] }),
    { status: 200 },
  );
}

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("/api/generate", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.MISTRAL_API_KEY = "test-key";
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.MISTRAL_API_KEY;
  });

  it("requests JSON mode with a sane token budget", async () => {
    fetchMock.mockResolvedValue(
      completion(JSON.stringify({ day: { meals: { breakfast: [] } } })),
    );
    const { POST } = await loadRoute();
    const res = await POST(request());

    expect(res.status).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.response_format).toEqual({ type: "json_object" });
    expect(sent.max_tokens).toBeGreaterThanOrEqual(4096);
  });

  it("flags truncated output as retryable", async () => {
    fetchMock.mockResolvedValue(completion('{"day": {"meals": {', "length"));
    const { POST } = await loadRoute();
    const res = await POST(request());

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ retryable: true });
  });

  it("passes rate limits through as 429 with Retry-After", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"message":"rate limited"}', {
        status: 429,
        headers: { "retry-after": "2" },
      }),
    );
    const { POST } = await loadRoute();
    const res = await POST(request());

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("2");
    expect(await res.json()).toMatchObject({ retryable: true });
  });

  it("does not retry auth failures", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"message":"Unauthorized"}', { status: 401 }),
    );
    const { POST } = await loadRoute();
    const res = await POST(request());

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      error: "Unauthorized",
      retryable: false,
    });
  });

  it("rejects responses without a meals object", async () => {
    fetchMock.mockResolvedValue(completion('{"hello": "world"}'));
    const { POST } = await loadRoute();
    const res = await POST(request());

    expect(res.status).toBe(502);
  });

  it("health check uses the models endpoint and tolerates 429", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429 }));
    const { GET } = await loadRoute();
    const res = await GET();

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.mistral.ai/v1/models");
    expect(await res.json()).toMatchObject({ available: true });
  });
});
