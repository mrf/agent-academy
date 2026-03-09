import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock @anthropic-ai/sdk at module level ─────────────────────────
// This lets the real client.ts instantiate Anthropic, while we control
// what messages.create returns — exercising the full pipeline.

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

// ── Inline helpers (avoid importing mock-ai.ts which has its own vi.mock) ──

type MessageResponse = {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
};

function createMessageResponse(content: string): MessageResponse {
  return {
    id: "msg_test_123",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: content }],
    model: "claude-haiku-4-5-20251001",
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

type ApiError = Error & { status: number };

function createApiError(status: number, message: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.name = "APIError";
  return error;
}

// Import after mock — these go through client.ts → json-utils.ts
const { evaluateAnswer } = await import("../../src/ai/evaluator.js");
const { generateFieldAssessments } = await import("../../src/ai/quiz-gen.js");

// ── Fixtures ───────────────────────────────────────────────────────

const VALID_QUIZ_QUESTION = {
  question: "What does 'git status' show?",
  options: [
    "Commit history",
    "Working tree status",
    "Remote URLs",
    "Branch list",
  ] as [string, string, string, string],
  correct: 1,
  explanation: "git status shows the state of the working directory.",
};

/** Produces response text without the leading '[' — callApi prepends it before parsing. */
function quizResponseText(questions = [VALID_QUIZ_QUESTION]): string {
  return JSON.stringify(questions).slice(1);
}

const EVAL_FALLBACK = {
  correct: false,
  feedback: "Could not evaluate. Try again.",
  score: 0,
};

beforeEach(() => {
  mockCreate.mockReset();
});

// ── evaluateAnswer → safeJsonParse pipeline ────────────────────────

describe("evaluateAnswer pipeline (SDK → client → evaluator → json-utils)", () => {
  it("parses a valid evaluation through the full pipeline", async () => {
    mockCreate.mockResolvedValue(
      createMessageResponse('"correct": true, "feedback": "Nailed it.", "score": 95}'),
    );

    const result = await evaluateAnswer("What is git?", "a VCS", "version control", ["vcs"]);

    expect(result).toEqual({ correct: true, feedback: "Nailed it.", score: 95 });
  });

  it("returns fallback when API returns malformed JSON", async () => {
    mockCreate.mockResolvedValue(
      createMessageResponse("sure, the answer is correct! great job"),
    );

    const result = await evaluateAnswer("Q?", "ans", "exp", ["exp"]);

    expect(result).toEqual(EVAL_FALLBACK);
  });

  it("returns fallback when API returns JSON that fails zod schema", async () => {
    // correct should be boolean, not string
    mockCreate.mockResolvedValue(
      createMessageResponse('"correct": "yes", "feedback": "Good", "score": 50}'),
    );

    const result = await evaluateAnswer("Q?", "ans", "exp", ["exp"]);

    expect(result).toEqual(EVAL_FALLBACK);
  });

  it("returns fallback when API returns partial/truncated JSON", async () => {
    mockCreate.mockResolvedValue(
      createMessageResponse('"correct": true, "fee'),
    );

    const result = await evaluateAnswer("Q?", "ans", "exp", ["exp"]);

    expect(result).toEqual(EVAL_FALLBACK);
  });

  it("degrades to local match on API network error", async () => {
    mockCreate.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await evaluateAnswer("Q?", "closure", "closure", ["closure"]);

    expect(result).toEqual({ correct: true, feedback: "Correct.", score: 100 });
  });

  it("degrades to local match on API 500 error", async () => {
    mockCreate.mockRejectedValue(createApiError(500, "Internal server error"));

    const result = await evaluateAnswer("Q?", "wrong", "expected", ["expected"]);

    expect(result).toEqual({ correct: false, feedback: "Could not evaluate. Try again.", score: 0 });
  });

  it("degrades to local match on API 429 rate limit", async () => {
    mockCreate.mockRejectedValue(createApiError(429, "Rate limited"));

    const result = await evaluateAnswer("Q?", "expected", "expected", ["expected", "alt"]);

    expect(result).toEqual({ correct: true, feedback: "Correct.", score: 100 });
  });
});

// ── generateFieldAssessments → zod validation pipeline ─────────────

describe("generateFieldAssessments pipeline (SDK → client → quiz-gen → json-utils → zod)", () => {
  it("parses valid quiz questions through the full pipeline", async () => {
    mockCreate.mockResolvedValue(
      createMessageResponse(quizResponseText()),
    );

    const result = await generateFieldAssessments("git basics", "recruit");

    expect(result).toEqual([VALID_QUIZ_QUESTION]);
  });

  it("validates all zod fields end-to-end (4-tuple options, int correct 0-3)", async () => {
    const q = {
      question: "Pick one",
      options: ["A", "B", "C", "D"] as [string, string, string, string],
      correct: 3,
      explanation: "D is correct.",
    };
    mockCreate.mockResolvedValue(
      createMessageResponse(quizResponseText([q])),
    );

    const result = await generateFieldAssessments("test", "operative");

    expect(result).toHaveLength(1);
    expect(result[0].correct).toBe(3);
    expect(result[0].options).toHaveLength(4);
  });

  it("returns empty array when API returns malformed JSON", async () => {
    mockCreate.mockResolvedValue(
      createMessageResponse("Here are some quiz questions for you!"),
    );

    const result = await generateFieldAssessments("git", "recruit");

    expect(result).toEqual([]);
  });

  it("returns empty array when zod validation fails (missing fields)", async () => {
    const bad = [{ question: "Q?", notAnOption: true }];
    mockCreate.mockResolvedValue(
      createMessageResponse(JSON.stringify(bad).slice(1)),
    );

    const result = await generateFieldAssessments("git", "recruit");

    expect(result).toEqual([]);
  });

  it("returns empty array when zod validation fails (wrong correct index)", async () => {
    const bad = [{
      question: "Q?",
      options: ["A", "B", "C", "D"],
      correct: 5, // out of range
      explanation: "Wrong index.",
    }];
    mockCreate.mockResolvedValue(
      createMessageResponse(JSON.stringify(bad).slice(1)),
    );

    const result = await generateFieldAssessments("git", "recruit");

    expect(result).toEqual([]);
  });

  it("retries once on empty result then succeeds", async () => {
    mockCreate
      .mockResolvedValueOnce(createMessageResponse("garbage"))
      .mockResolvedValueOnce(createMessageResponse(quizResponseText()));

    const result = await generateFieldAssessments("git", "recruit");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toEqual([VALID_QUIZ_QUESTION]);
  });

  it("retries once on empty result and still returns empty if retry fails", async () => {
    mockCreate
      .mockResolvedValueOnce(createMessageResponse("bad"))
      .mockResolvedValueOnce(createMessageResponse("also bad"));

    const result = await generateFieldAssessments("git", "recruit");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toEqual([]);
  });

  it("propagates API error (no catch in quiz-gen)", async () => {
    mockCreate.mockRejectedValue(createApiError(500, "Server error"));

    await expect(
      generateFieldAssessments("git", "recruit"),
    ).rejects.toThrow("Server error");
  });

  it("propagates network error", async () => {
    mockCreate.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      generateFieldAssessments("git", "recruit"),
    ).rejects.toThrow("ECONNREFUSED");
  });
});

// ── Cost control: batch limit ──────────────────────────────────────

describe("quiz-gen cost control (batch limit through full pipeline)", () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue(
      createMessageResponse(quizResponseText()),
    );
  });

  it("clamps batches to MAX_BATCHES (5) even when requesting more", async () => {
    await generateFieldAssessments("git", "recruit", 5, 20);

    expect(mockCreate).toHaveBeenCalledTimes(5);
  });

  it("clamps batches to minimum of 1 when 0 is passed", async () => {
    await generateFieldAssessments("git", "recruit", 5, 0);

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("clamps batches to minimum of 1 when negative is passed", async () => {
    await generateFieldAssessments("git", "recruit", 5, -3);

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("accumulates results across multiple batches", async () => {
    const q1 = { ...VALID_QUIZ_QUESTION, question: "Q1?" };
    const q2 = { ...VALID_QUIZ_QUESTION, question: "Q2?" };

    mockCreate
      .mockResolvedValueOnce(createMessageResponse(quizResponseText([q1])))
      .mockResolvedValueOnce(createMessageResponse(quizResponseText([q2])));

    const result = await generateFieldAssessments("git", "recruit", 1, 2);

    expect(result).toEqual([q1, q2]);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
