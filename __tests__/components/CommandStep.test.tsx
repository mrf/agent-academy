import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderInk, cleanup, keys } from "../helpers/render-ink.js";
import { createCommandStep } from "../helpers/mock-missions.js";
import type { RenderResult } from "../helpers/render-ink.js";

// ── Mock evaluator ──────────────────────────────────────────────────

const mockEvaluateAnswer = vi.fn();
const mockLocalMatch = vi.fn();

vi.mock("../../src/ai/evaluator.js", () => ({
  evaluateAnswer: (...args: unknown[]) => mockEvaluateAnswer(...args),
  localMatch: (...args: unknown[]) => mockLocalMatch(...args),
}));

const { CommandStep } = await import("../../src/components/CommandStep.js");

// ── Helpers ─────────────────────────────────────────────────────────

const CORRECT_RESULT = { correct: true, feedback: "Correct.", score: 100 };
const WRONG_RESULT = { correct: false, feedback: "Incorrect.", score: 0 };

function renderStep(
  overrides?: Parameters<typeof createCommandStep>[0],
  options?: { isFocused?: boolean; hasApiKey?: boolean },
) {
  const step = createCommandStep(overrides);
  const onAnswer = vi.fn();
  const instance = renderInk(
    <CommandStep
      step={step}
      onAnswer={onAnswer}
      isFocused={options?.isFocused ?? true}
      hasApiKey={options?.hasApiKey ?? true}
    />,
  );
  return { instance, step, onAnswer };
}

// Save real setTimeout before vi.useFakeTimers() replaces it.
// React 19 uses queueMicrotask to schedule batch flushes, so a real
// setTimeout(0) is needed to yield past the microtask queue for renders.
const realSetTimeout = globalThis.setTimeout;
function delay(ms = 30): Promise<void> {
  return new Promise(function (resolve) { realSetTimeout(resolve, ms); });
}

// Write each character with a real event-loop yield between them so
// React re-renders and TextInput sees the updated value prop.
async function submitAnswer(instance: RenderResult, answer: string): Promise<void> {
  for (const char of answer) {
    instance.stdin.write(char);
    await delay();
  }
  instance.stdin.write(keys.enter);
  await delay();
}

// Flush fake timers AND let the real event loop process React renders.
async function flush(ms = 0): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await delay();
}

// ── Setup / Teardown ────────────────────────────────────────────────

beforeEach(() => {
  // Only fake setTimeout/setInterval/Date.
  // Leave queueMicrotask real so React 19 can flush batched state updates.
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
  });
  mockEvaluateAnswer.mockReset().mockResolvedValue(WRONG_RESULT);
  mockLocalMatch.mockReset().mockReturnValue(WRONG_RESULT);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Rendering ───────────────────────────────────────────────────────

describe("CommandStep rendering", () => {
  it("renders question text", () => {
    const { instance } = renderStep();

    expect(instance.lastFrame()).toContain("Type the command to list files.");
  });

  it("renders text input with prompt character", () => {
    const { instance } = renderStep();

    expect(instance.lastFrame()).toContain(">");
  });
});

// ── Correct answer ──────────────────────────────────────────────────

describe("CommandStep correct answer", () => {
  it("shows CONFIRMED for exact match", async () => {
    mockEvaluateAnswer.mockResolvedValue(CORRECT_RESULT);
    const { instance } = renderStep();

    await submitAnswer(instance, "ls");
    await flush();

    expect(instance.lastFrame()).toContain("CONFIRMED");
  });

  it("shows CONFIRMED for accepted variant", async () => {
    mockEvaluateAnswer.mockResolvedValue(CORRECT_RESULT);
    const { instance } = renderStep();

    await submitAnswer(instance, "ls -la");
    await flush();

    expect(instance.lastFrame()).toContain("CONFIRMED");
  });

  it("passes arguments to evaluateAnswer", async () => {
    mockEvaluateAnswer.mockResolvedValue(CORRECT_RESULT);
    const { instance, step } = renderStep();

    await submitAnswer(instance, "ls");
    await flush();

    expect(mockEvaluateAnswer).toHaveBeenCalledWith(
      step.question,
      "ls",
      step.expectedAnswer,
      step.acceptedVariants,
    );
  });

  it("shows explanation after correct answer", async () => {
    mockEvaluateAnswer.mockResolvedValue(CORRECT_RESULT);
    const { instance, step } = renderStep();

    await submitAnswer(instance, "ls");
    await flush();

    expect(instance.lastFrame()).toContain(step.explanation);
  });

  it("calls onAnswer(true) after Enter on result", async () => {
    mockEvaluateAnswer.mockResolvedValue(CORRECT_RESULT);
    const { instance, onAnswer } = renderStep();

    await submitAnswer(instance, "ls");
    await flush();

    expect(onAnswer).not.toHaveBeenCalled();

    instance.stdin.write(keys.enter);
    await delay();

    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});

// ── Case-insensitive matching ───────────────────────────────────────

describe("CommandStep case-insensitive input", () => {
  it("trims whitespace from input before evaluating", async () => {
    mockEvaluateAnswer.mockResolvedValue(CORRECT_RESULT);
    const { instance } = renderStep();

    await submitAnswer(instance, "  ls  ");
    await flush();

    expect(mockEvaluateAnswer).toHaveBeenCalledWith(
      expect.any(String),
      "ls",
      expect.any(String),
      expect.any(Array),
    );
  });
});

// ── Wrong answer ────────────────────────────────────────────────────

describe("CommandStep wrong answer", () => {
  it("shows COMPROMISED for wrong answer", async () => {
    mockEvaluateAnswer.mockResolvedValue(WRONG_RESULT);
    const { instance } = renderStep();

    await submitAnswer(instance, "pwd");
    await flush();

    expect(instance.lastFrame()).toContain("COMPROMISED");
  });

  it("shows expected answer after wrong answer", async () => {
    mockEvaluateAnswer.mockResolvedValue(WRONG_RESULT);
    const { instance, step } = renderStep();

    await submitAnswer(instance, "pwd");
    await flush();

    expect(instance.lastFrame()).toContain(step.expectedAnswer);
  });

  it("shows explanation after wrong answer", async () => {
    mockEvaluateAnswer.mockResolvedValue(WRONG_RESULT);
    const { instance, step } = renderStep();

    await submitAnswer(instance, "pwd");
    await flush();

    expect(instance.lastFrame()).toContain(step.explanation);
  });

  it("calls onAnswer(false) after Enter on result", async () => {
    mockEvaluateAnswer.mockResolvedValue(WRONG_RESULT);
    const { instance, onAnswer } = renderStep();

    await submitAnswer(instance, "pwd");
    await flush();

    expect(onAnswer).not.toHaveBeenCalled();

    instance.stdin.write(keys.enter);
    await delay();

    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});

// ── Verifying phase ─────────────────────────────────────────────────

describe("CommandStep verifying phase", () => {
  it("shows Verifying while evaluating", async () => {
    mockEvaluateAnswer.mockReturnValue(new Promise(() => {}));
    const { instance } = renderStep();

    await submitAnswer(instance, "ls");

    expect(instance.lastFrame()).toContain("Verifying");
  });

  it("hides input prompt while verifying", async () => {
    mockEvaluateAnswer.mockReturnValue(new Promise(() => {}));
    const { instance } = renderStep();

    await submitAnswer(instance, "ls");

    const frame = instance.lastFrame();
    expect(frame).toContain("Verifying");
    expect(frame).not.toContain(">");
  });
});

// ── Secret commands ─────────────────────────────────────────────────

describe("CommandStep secret commands", () => {
  it("shows secret response for 'sudo !!'", async () => {
    const { instance } = renderStep();

    await submitAnswer(instance, "sudo !!");

    expect(instance.lastFrame()).toContain("sudo won't help you here");
    expect(mockEvaluateAnswer).not.toHaveBeenCalled();
  });

  it("shows secret response for 'rm -rf /'", async () => {
    const { instance } = renderStep();

    await submitAnswer(instance, "rm -rf /");

    expect(instance.lastFrame()).toContain("Please don't do this in production");
    expect(mockEvaluateAnswer).not.toHaveBeenCalled();
  });

  it("shows secret response for 'clear'", async () => {
    const { instance } = renderStep();

    await submitAnswer(instance, "clear");

    expect(instance.lastFrame()).toContain("your conscience never will be");
    expect(mockEvaluateAnswer).not.toHaveBeenCalled();
  });

  it("is case-insensitive for secret commands", async () => {
    const { instance } = renderStep();

    await submitAnswer(instance, "CLEAR");

    expect(instance.lastFrame()).toContain("your conscience never will be");
  });

  it("clears input after secret command and stays in input phase", async () => {
    const { instance } = renderStep();

    await submitAnswer(instance, "clear");

    const frame = instance.lastFrame();
    expect(frame).toContain("your conscience never will be");
    // Still in input phase (prompt visible)
    expect(frame).toContain(">");
  });
});

// ── Help hint ───────────────────────────────────────────────────────

describe("CommandStep help hint", () => {
  it("shows help hint when typing 'help'", async () => {
    const { instance } = renderStep();

    await submitAnswer(instance, "help");

    expect(instance.lastFrame()).toContain("Intel:");
    expect(mockEvaluateAnswer).not.toHaveBeenCalled();
  });

  it("reveals first third of answer in hint for longer answers", async () => {
    const { instance } = renderStep({
      expectedAnswer: "docker-compose",
      acceptedVariants: ["docker-compose"],
    });

    await submitAnswer(instance, "help");

    // "docker-compose" is 14 chars, ceil(14/3) = 5, so reveals "docke"
    expect(instance.lastFrame()).toContain('docke...');
  });

  it("shows length hint for short answers (3 chars or less)", async () => {
    const { instance } = renderStep({
      expectedAnswer: "ls",
      acceptedVariants: ["ls"],
    });

    await submitAnswer(instance, "help");

    expect(instance.lastFrame()).toContain("2 characters long");
  });

  it("is case-insensitive for help command", async () => {
    const { instance } = renderStep();

    await submitAnswer(instance, "HELP");

    expect(instance.lastFrame()).toContain("Intel:");
  });
});

// ── Input behavior ──────────────────────────────────────────────────

describe("CommandStep input behavior", () => {
  it("does not submit empty input", async () => {
    const { instance } = renderStep();

    instance.stdin.write(keys.enter);
    await flush();

    expect(mockEvaluateAnswer).not.toHaveBeenCalled();
  });

  it("does not submit whitespace-only input", async () => {
    const { instance } = renderStep();

    await submitAnswer(instance, "   ");

    expect(mockEvaluateAnswer).not.toHaveBeenCalled();
  });

  it("input is locked after submission (no double submit)", async () => {
    let resolveEval: (v: { correct: boolean; feedback: string; score: number }) => void;
    mockEvaluateAnswer.mockReturnValue(
      new Promise((r) => { resolveEval = r; }),
    );
    const { instance } = renderStep();

    await submitAnswer(instance, "ls");
    // Try submitting again during pausing phase
    await submitAnswer(instance, "pwd");

    expect(mockEvaluateAnswer).toHaveBeenCalledTimes(1);

    resolveEval!({ correct: true, feedback: "OK", score: 100 });
    await flush();
  });
});

// ── Self-assessment (no API key) ────────────────────────────────────

describe("CommandStep self-assessment (hasApiKey=false)", () => {
  it("uses localMatch instead of evaluateAnswer", async () => {
    mockLocalMatch.mockReturnValue(CORRECT_RESULT);
    const { instance } = renderStep(undefined, { hasApiKey: false });

    await submitAnswer(instance, "ls");
    await flush();

    expect(mockLocalMatch).toHaveBeenCalled();
    expect(mockEvaluateAnswer).not.toHaveBeenCalled();
  });

  it("shows CONFIRMED on local match success", async () => {
    mockLocalMatch.mockReturnValue(CORRECT_RESULT);
    const { instance } = renderStep(undefined, { hasApiKey: false });

    await submitAnswer(instance, "ls");
    await flush();

    expect(instance.lastFrame()).toContain("CONFIRMED");
  });

  it("shows self-assess prompt when local match fails", async () => {
    mockLocalMatch.mockReturnValue(WRONG_RESULT);
    const { instance } = renderStep(undefined, { hasApiKey: false });

    await submitAnswer(instance, "list files");
    await flush();

    const frame = instance.lastFrame();
    expect(frame).toContain("Comms are down, agent");
    expect(frame).toContain("Did your answer match?");
    expect(frame).toContain("list files");
    // Expected answer should NOT be revealed during self-assessment
    expect(frame).not.toContain("Expected:");
  });

  it("treats Y as correct in self-assessment", async () => {
    mockLocalMatch.mockReturnValue(WRONG_RESULT);
    const { instance, onAnswer } = renderStep(undefined, { hasApiKey: false });

    await submitAnswer(instance, "list files");
    await flush();

    instance.stdin.write("y");
    await flush();

    expect(instance.lastFrame()).toContain("CONFIRMED");

    instance.stdin.write(keys.enter);
    await delay();
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("treats N as incorrect in self-assessment", async () => {
    mockLocalMatch.mockReturnValue(WRONG_RESULT);
    const { instance, onAnswer } = renderStep(undefined, { hasApiKey: false });

    await submitAnswer(instance, "list files");
    await flush();

    instance.stdin.write("n");
    await flush();

    const frame = instance.lastFrame();
    expect(frame).toContain("COMPROMISED");
    // Expected answer is revealed only after self-assessment result
    expect(frame).toContain("Expected:");

    instance.stdin.write(keys.enter);
    await delay();
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("ignores non-Y/N keys during self-assessment", async () => {
    mockLocalMatch.mockReturnValue(WRONG_RESULT);
    const { instance } = renderStep(undefined, { hasApiKey: false });

    await submitAnswer(instance, "list files");
    await flush();

    instance.stdin.write("x");
    await flush();

    expect(instance.lastFrame()).toContain("Did your answer match?");
  });
});
