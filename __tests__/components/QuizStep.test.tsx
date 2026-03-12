import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { QuizStep } from "../../src/components/QuizStep.js";
import { createQuizStep } from "../helpers/mock-missions.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  type RenderResult,
} from "../helpers/render-ink.js";
import { TIMING } from "../../src/constants.js";

// Only fake setTimeout/clearTimeout -- leave setImmediate real so React's
// scheduler and ink's reconciler can flush renders normally.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Flush ink's reconciler via setImmediate (one tick for render, one for effects).
async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function renderQuiz(overrides?: Parameters<typeof createQuizStep>[0]) {
  const step = createQuizStep(overrides);
  const onAnswer = vi.fn();
  const instance = renderInk(
    <QuizStep step={step} onAnswer={onAnswer} isFocused={true} />,
  );
  return { instance, step, onAnswer };
}

async function advance(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await flush();
}

// Select the correct answer (index 1 = arrowDown from default).
async function selectCorrectAnswer(instance: RenderResult): Promise<void> {
  pressKey(instance, keys.arrowDown);
  await flush();
  pressKey(instance, keys.enter);
  await flush();
}

// Select the wrong answer (index 0 = default highlight, just press enter).
async function selectWrongAnswer(instance: RenderResult): Promise<void> {
  pressKey(instance, keys.enter);
  await flush();
}

describe("QuizStep", () => {
  it("renders the question text", () => {
    const { instance } = renderQuiz();
    expect(instance.lastFrame()).toContain("What is the correct answer?");
  });

  it("renders all 4 options", () => {
    const { instance } = renderQuiz();
    const frame = instance.lastFrame()!;
    expect(frame).toContain("Alpha");
    expect(frame).toContain("Bravo");
    expect(frame).toContain("Charlie");
    expect(frame).toContain("Delta");
  });

  it("arrow keys navigate between options", async () => {
    const { instance } = renderQuiz();
    const frameBefore = instance.lastFrame()!;

    pressKey(instance, keys.arrowDown);
    await flush();
    const frameAfter = instance.lastFrame()!;

    expect(frameBefore).not.toBe(frameAfter);
  });

  it("enter selects the highlighted option and shows pausing phase", async () => {
    const { instance } = renderQuiz();

    await selectWrongAnswer(instance);

    const frame = instance.lastFrame()!;
    expect(frame).toContain("Verifying...");
  });

  it("correct answer shows CONFIRMED feedback", async () => {
    const { instance } = renderQuiz();

    await selectCorrectAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    const frame = instance.lastFrame()!;
    expect(frame).toContain("CONFIRMED");
  });

  it("wrong answer shows COMPROMISED feedback", async () => {
    const { instance } = renderQuiz();

    await selectWrongAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    const frame = instance.lastFrame()!;
    expect(frame).toContain("COMPROMISED");
  });

  it("calls onAnswer with correct: true after Enter on result", async () => {
    const { instance, onAnswer } = renderQuiz();

    await selectCorrectAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    pressKey(instance, keys.enter);
    await flush();

    expect(onAnswer).toHaveBeenCalledOnce();
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it("calls onAnswer with correct: false after Enter on result", async () => {
    const { instance, onAnswer } = renderQuiz();

    await selectWrongAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    pressKey(instance, keys.enter);
    await flush();

    expect(onAnswer).toHaveBeenCalledOnce();
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("shows explanation text after answering correctly", async () => {
    const { instance } = renderQuiz();

    await selectCorrectAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    const frame = instance.lastFrame()!;
    expect(frame).toContain("Bravo is the correct answer.");
  });

  it("shows explanation text after answering incorrectly", async () => {
    const { instance } = renderQuiz();

    await selectWrongAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    const frame = instance.lastFrame()!;
    expect(frame).toContain("Bravo is the correct answer.");
  });

  it("cannot re-answer after selection (pausing phase ignores input)", async () => {
    const { instance, onAnswer } = renderQuiz();

    await selectWrongAnswer(instance);

    // Additional inputs should be ignored during pausing phase
    pressKey(instance, keys.arrowDown);
    await flush();

    await advance(TIMING.pauseBeforeResult);

    // Now in result phase — only one Enter should trigger onAnswer
    pressKey(instance, keys.enter);
    await flush();

    expect(onAnswer).toHaveBeenCalledOnce();
  });

  it("wrong answer result highlights the correct option", async () => {
    const { instance } = renderQuiz();

    await selectWrongAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    const frame = instance.lastFrame()!;
    expect(frame).toMatch(/Bravo.*✔/);
  });

  it("does not respond to input when isFocused is false", async () => {
    const step = createQuizStep();
    const onAnswer = vi.fn();
    const instance = renderInk(
      <QuizStep step={step} onAnswer={onAnswer} isFocused={false} />,
    );

    pressKey(instance, keys.enter);
    await flush();

    const frame = instance.lastFrame()!;
    expect(frame).not.toContain("Verifying...");
    expect(frame).toContain("Alpha");
  });

  it("shake animation triggers on wrong answer result", async () => {
    const { instance } = renderQuiz();

    await selectWrongAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    const frameAtShake = instance.lastFrame()!;
    expect(frameAtShake).toContain("COMPROMISED");

    // Advance past entire shake sequence (4 frames x 50ms + reset)
    await advance(250);

    const frameAfterShake = instance.lastFrame()!;
    expect(frameAfterShake).toContain("COMPROMISED");
  });

  it("correct answer does not trigger shake animation", async () => {
    const { instance } = renderQuiz();

    await selectCorrectAnswer(instance);
    await advance(TIMING.pauseBeforeResult);

    const frame = instance.lastFrame()!;
    expect(frame).toContain("CONFIRMED");
    expect(frame).not.toContain("COMPROMISED");
  });

  it("works with a different correct answer index", async () => {
    const { instance, onAnswer } = renderQuiz({ correct: 3 });

    // SelectInput supports direct selection via number keys (1-indexed)
    pressKey(instance, "4");
    await flush();

    await advance(TIMING.pauseBeforeResult);

    const frame = instance.lastFrame()!;
    expect(frame).toContain("CONFIRMED");

    pressKey(instance, keys.enter);
    await flush();
    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});
