import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMessageResponse } from "../helpers/mock-ai.js";

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("../../src/ai/client.js", () => ({
  client: { messages: { create: mockCreate } },
}));

import { generateFieldAssessments } from "../../src/ai/quiz-gen.js";
import { MODELS } from "../../src/constants.js";

// ── Fixtures ────────────────────────────────────────────────────────

const VALID_QUESTION = {
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

/** Strip the leading '[' that callApi prepends before parsing. */
function validResponseText(questions = [VALID_QUESTION]): string {
  return JSON.stringify(questions).slice(1);
}

function mockValidResponse(questions = [VALID_QUESTION]): void {
  mockCreate.mockResolvedValue(
    createMessageResponse(validResponseText(questions)),
  );
}

type ApiCall = {
  model: string;
  system: Array<{ text: string; cache_control: { type: string } }>;
  messages: Array<{ role: string; content: string }>;
};

function getApiCall(index = 0): ApiCall {
  return mockCreate.mock.calls[index][0] as ApiCall;
}

function findMessage(role: string, callIndex = 0): { role: string; content: string } {
  const call = getApiCall(callIndex);
  const msg = call.messages.find((m) => m.role === role);
  if (!msg) throw new Error(`No ${role} message found in call ${callIndex}`);
  return msg;
}

// ── Tests ───────────────────────────────────────────────────────────

describe("generateFieldAssessments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls API with the Sonnet generator model", async () => {
    mockValidResponse();

    await generateFieldAssessments("git basics", "recruit");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: MODELS.GENERATOR }),
      expect.objectContaining({}),
    );
  });

  it("includes JSON schema and difficulty tiers in system prompt", async () => {
    mockValidResponse();

    await generateFieldAssessments("git basics", "recruit");

    const systemText = getApiCall().system[0].text;
    expect(systemText).toContain('"question"');
    expect(systemText).toContain('"options"');
    expect(systemText).toContain('"correct"');
    expect(systemText).toContain("recruit");
    expect(systemText).toContain("operative");
    expect(systemText).toContain("elite");
  });

  it("uses assistant prefill starting with '['", async () => {
    mockValidResponse();

    await generateFieldAssessments("git basics", "recruit");

    const assistantMessage = findMessage("assistant");
    expect(assistantMessage.content).toBe("[");
  });

  it("prepends '[' to response text before parsing", async () => {
    mockValidResponse();

    const result = await generateFieldAssessments("git basics", "recruit");

    expect(result).toEqual([VALID_QUESTION]);
  });

  it("parses valid JSON response with zod validation", async () => {
    const questions = [
      VALID_QUESTION,
      {
        question: "What is a branch?",
        options: ["A tree", "A pointer to a commit", "A file", "A folder"],
        correct: 1,
        explanation: "A branch is a pointer to a commit.",
      },
    ];
    mockValidResponse(questions);

    const result = await generateFieldAssessments("git", "operative");

    expect(result).toEqual(questions);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when JSON parse fails", async () => {
    mockCreate.mockResolvedValue(createMessageResponse("not valid json %%%"));

    const result = await generateFieldAssessments("git", "recruit");

    expect(result).toEqual([]);
  });

  it("returns empty array when zod validation fails", async () => {
    const badShape = [{ question: "Q?", wrong_field: true }];
    mockCreate.mockResolvedValue(
      createMessageResponse(JSON.stringify(badShape).slice(1)),
    );

    const result = await generateFieldAssessments("git", "recruit");

    expect(result).toEqual([]);
  });

  it("retries once when first call returns empty (parse failure)", async () => {
    mockCreate
      .mockResolvedValueOnce(createMessageResponse("not valid json"))
      .mockResolvedValueOnce(
        createMessageResponse(validResponseText()),
      );

    const result = await generateFieldAssessments("git", "recruit");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toEqual([VALID_QUESTION]);
  });

  it("retries once and still returns empty if retry also fails", async () => {
    mockCreate
      .mockResolvedValueOnce(createMessageResponse("bad"))
      .mockResolvedValueOnce(createMessageResponse("also bad"));

    const result = await generateFieldAssessments("git", "recruit");

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toEqual([]);
  });

  it("clamps batches to MAX_BATCHES (5)", async () => {
    mockValidResponse();

    await generateFieldAssessments("git", "recruit", 5, 10);

    expect(mockCreate).toHaveBeenCalledTimes(5);
  });

  it("clamps batches to minimum of 1", async () => {
    mockValidResponse();

    await generateFieldAssessments("git", "recruit", 5, 0);

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("defaults to 1 batch and 5 count", async () => {
    mockValidResponse();

    await generateFieldAssessments("git", "recruit");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(findMessage("user").content).toContain("5");
  });

  it("accumulates results across multiple batches", async () => {
    const q1 = { ...VALID_QUESTION, question: "Q1?" };
    const q2 = { ...VALID_QUESTION, question: "Q2?" };
    const q3 = { ...VALID_QUESTION, question: "Q3?" };

    mockCreate
      .mockResolvedValueOnce(createMessageResponse(validResponseText([q1])))
      .mockResolvedValueOnce(createMessageResponse(validResponseText([q2])))
      .mockResolvedValueOnce(
        createMessageResponse(validResponseText([q3])),
      );

    const result = await generateFieldAssessments("git", "recruit", 1, 3);

    expect(result).toEqual([q1, q2, q3]);
    expect(result).toHaveLength(3);
  });

  it("handles empty string response gracefully", async () => {
    mockCreate.mockResolvedValue(createMessageResponse(""));

    const result = await generateFieldAssessments("git", "recruit");

    expect(result).toEqual([]);
  });

  it("handles response with non-text content block", async () => {
    mockCreate.mockResolvedValue({
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [{ type: "tool_use", id: "tool_1", name: "t", input: {} }],
      model: "claude-sonnet-4-20250514",
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const result = await generateFieldAssessments("git", "recruit");

    expect(result).toEqual([]);
  });

  it("includes cache_control in system prompt", async () => {
    mockValidResponse();

    await generateFieldAssessments("git", "recruit");

    expect(getApiCall().system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("passes difficulty and topic into user prompt", async () => {
    mockValidResponse();

    await generateFieldAssessments("TypeScript generics", "elite", 3);

    const userContent = findMessage("user").content;
    expect(userContent).toContain("elite");
    expect(userContent).toContain("TypeScript generics");
    expect(userContent).toContain("3");
  });
});
