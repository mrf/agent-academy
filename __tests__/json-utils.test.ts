import { describe, it, expect } from "vitest";
import {
  extractJson,
  safeJsonParse,
  GeneratedQuizSchema,
  EvaluationSchema,
} from "../src/ai/json-utils.js";

// ── extractJson ─────────────────────────────────────────────────────

describe("extractJson", () => {
  it("strips markdown code fences from JSON", () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("strips fences without json language tag", () => {
    const input = '```\n[1, 2, 3]\n```';
    expect(extractJson(input)).toBe("[1, 2, 3]");
  });

  it("strips preamble text before JSON object", () => {
    const input = 'Here is the result:\n{"key": "value"}';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("strips preamble text before JSON array", () => {
    const input = "Sure, here you go:\n[1, 2, 3]";
    expect(extractJson(input)).toBe("[1, 2, 3]");
  });

  it("returns raw text when it already starts with {", () => {
    const input = '{"already": "json"}';
    expect(extractJson(input)).toBe('{"already": "json"}');
  });

  it("returns raw text when it already starts with [", () => {
    const input = '["a", "b"]';
    expect(extractJson(input)).toBe('["a", "b"]');
  });

  it("returns empty string unchanged", () => {
    expect(extractJson("")).toBe("");
  });

  it("returns plain text with no JSON markers unchanged", () => {
    expect(extractJson("no json here")).toBe("no json here");
  });
});

// ── safeJsonParse ───────────────────────────────────────────────────

describe("safeJsonParse", () => {
  it("parses valid JSON from markdown fences", () => {
    const input = '```json\n{"a": 1}\n```';
    expect(safeJsonParse(input, null)).toEqual({ a: 1 });
  });

  it("handles empty string by returning fallback", () => {
    expect(safeJsonParse("", "fallback")).toBe("fallback");
  });

  it("handles truncated JSON by returning fallback", () => {
    expect(safeJsonParse('{"key": "val', [])).toEqual([]);
  });

  it("handles invalid JSON by returning fallback", () => {
    expect(safeJsonParse("not json at all", 42)).toBe(42);
  });
});

// ── GeneratedQuizSchema ─────────────────────────────────────────────

describe("GeneratedQuizSchema", () => {
  const validQuiz = [
    {
      question: "What is 2+2?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      explanation: "Basic arithmetic.",
    },
  ];

  it("validates a correct quiz shape", () => {
    const result = GeneratedQuizSchema.safeParse(validQuiz);
    expect(result.success).toBe(true);
  });

  it("validates multiple quiz items", () => {
    const multi = [
      { ...validQuiz[0] },
      {
        question: "Another?",
        options: ["a", "b", "c", "d"],
        correct: 0,
        explanation: "Yes.",
      },
    ];
    const result = GeneratedQuizSchema.safeParse(multi);
    expect(result.success).toBe(true);
  });

  it("rejects when question field is missing", () => {
    const bad = [
      {
        options: ["a", "b", "c", "d"],
        correct: 0,
        explanation: "Missing question.",
      },
    ];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects when explanation field is missing", () => {
    const bad = [
      {
        question: "Q?",
        options: ["a", "b", "c", "d"],
        correct: 0,
      },
    ];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects wrong option count (3 options)", () => {
    const bad = [
      {
        question: "Q?",
        options: ["a", "b", "c"],
        correct: 0,
        explanation: "Too few options.",
      },
    ];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects wrong option count (5 options)", () => {
    const bad = [
      {
        question: "Q?",
        options: ["a", "b", "c", "d", "e"],
        correct: 0,
        explanation: "Too many options.",
      },
    ];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects correct index out of range (4)", () => {
    const bad = [
      {
        question: "Q?",
        options: ["a", "b", "c", "d"],
        correct: 4,
        explanation: "Index too high.",
      },
    ];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects correct index out of range (-1)", () => {
    const bad = [
      {
        question: "Q?",
        options: ["a", "b", "c", "d"],
        correct: -1,
        explanation: "Negative index.",
      },
    ];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects non-integer correct index", () => {
    const bad = [
      {
        question: "Q?",
        options: ["a", "b", "c", "d"],
        correct: 1.5,
        explanation: "Float index.",
      },
    ];
    expect(GeneratedQuizSchema.safeParse(bad).success).toBe(false);
  });
});

// ── EvaluationSchema ────────────────────────────────────────────────

describe("EvaluationSchema", () => {
  const validEval = {
    correct: true,
    feedback: "Well done!",
    score: 85,
  };

  it("validates a correct evaluation shape", () => {
    const result = EvaluationSchema.safeParse(validEval);
    expect(result.success).toBe(true);
  });

  it("validates score at boundaries (0 and 100)", () => {
    expect(
      EvaluationSchema.safeParse({ correct: false, feedback: "F", score: 0 })
        .success,
    ).toBe(true);
    expect(
      EvaluationSchema.safeParse({ correct: true, feedback: "A+", score: 100 })
        .success,
    ).toBe(true);
  });

  it("rejects score above 100", () => {
    const bad = { correct: true, feedback: "Too high", score: 101 };
    expect(EvaluationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects score below 0", () => {
    const bad = { correct: false, feedback: "Negative", score: -1 };
    expect(EvaluationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects wrong type for correct (string instead of boolean)", () => {
    const bad = { correct: "yes", feedback: "Wrong type", score: 50 };
    expect(EvaluationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects wrong type for score (string instead of number)", () => {
    const bad = { correct: true, feedback: "Wrong type", score: "high" };
    expect(EvaluationSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects missing feedback field", () => {
    const bad = { correct: true, score: 50 };
    expect(EvaluationSchema.safeParse(bad).success).toBe(false);
  });
});
