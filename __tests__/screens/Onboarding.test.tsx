import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { Onboarding } from "../../src/screens/Onboarding.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  type RenderResult,
} from "../helpers/render-ink.js";
import { TIMING } from "../../src/constants.js";

vi.mock("../../src/store/progress.js", () => ({
  loadProgress: vi.fn(() => ({
    schemaVersion: 1,
    completedMissions: [],
    starRatings: {},
    fxp: 0,
    clearanceLevel: "recruit",
    achievements: [],
    quizStats: { correct: 0, total: 0 },
    infiniteModeStats: { correct: 0, total: 0, sessionsPlayed: 0, fxpEarned: 0 },
    infiniteModeUnlocked: false,
    firstRunComplete: false,
    lastPlayedAt: 0,
    handlerEverUsed: false,
    legacyModeUnlocked: false,
  })),
  saveProgress: vi.fn(),
}));

import { loadProgress, saveProgress } from "../../src/store/progress.js";

const INTRO_LINES = [
  "You have been recruited by the Claude Code Terminal Training Division.",
  "Your mission: master the Claude Code CLI through field training.",
  "Learn Claude Code by doing.",
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(loadProgress).mockClear();
  vi.mocked(saveProgress).mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.advanceTimersByTimeAsync(0);
}

function renderOnboarding(onContinue = vi.fn()): {
  instance: RenderResult;
  onContinue: ReturnType<typeof vi.fn>;
} {
  const instance = renderInk(<Onboarding onContinue={onContinue} />);
  return { instance, onContinue };
}

/** Advance timers enough to finish typing a line of text. */
async function typeOutLine(text: string, speed: "normal" | "fast" = "normal"): Promise<void> {
  const interval = speed === "fast" ? TIMING.typewriterFast : TIMING.typewriterNormal;
  await tick(interval * text.length);
  await tick(0);
}

/** Type all three intro lines to completion. */
async function typeAllLines(): Promise<void> {
  await typeOutLine(INTRO_LINES[0]);
  await typeOutLine(INTRO_LINES[1]);
  await typeOutLine(INTRO_LINES[2], "fast");
}

// ── Rendering ──────────────────────────────────────────────────────

describe("Onboarding", () => {
  it("renders spy-themed intro text as first line", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await typeOutLine(INTRO_LINES[0]);

    const frame = instance.lastFrame();
    expect(frame).toContain("recruited");
    expect(frame).toContain("Claude Code Terminal Training Division");
  });

  it("renders all three intro lines with spy theme", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await typeAllLines();

    const frame = instance.lastFrame();
    expect(frame).toContain("recruited");
    expect(frame).toContain("master the Claude Code CLI");
    expect(frame).toContain("Learn Claude Code by doing");
  });

  // ── TypeWriter line progression ──────────────────────────────────

  it("starts with only the first line visible", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await tick(TIMING.typewriterNormal * 5);
    const frame = instance.lastFrame();

    expect(frame).toContain("You h");
    expect(frame).not.toContain("mission");
  });

  it("shows second line after first line completes", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await typeOutLine(INTRO_LINES[0]);
    await tick(TIMING.typewriterNormal * 4);
    const frame = instance.lastFrame();

    expect(frame).toContain(INTRO_LINES[0]);
    expect(frame).toContain("Your");
  });

  it("shows third line after second line completes", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await typeOutLine(INTRO_LINES[0]);
    await typeOutLine(INTRO_LINES[1]);

    await tick(TIMING.typewriterFast * 3);
    const frame = instance.lastFrame();

    expect(frame).toContain(INTRO_LINES[0]);
    expect(frame).toContain(INTRO_LINES[1]);
    expect(frame).toContain("Lea");
  });

  // ── ENTER key behavior ───────────────────────────────────────────

  it("ENTER does nothing before all lines are typed", async () => {
    const { instance, onContinue } = renderOnboarding();
    await tick(0);

    await tick(TIMING.typewriterNormal * 5);
    pressKey(instance, keys.enter);
    await tick(0);

    expect(onContinue).not.toHaveBeenCalled();
  });

  it("ENTER does nothing after first line but before all done", async () => {
    const { instance, onContinue } = renderOnboarding();
    await tick(0);

    await typeOutLine(INTRO_LINES[0]);
    pressKey(instance, keys.enter);
    await tick(0);

    expect(onContinue).not.toHaveBeenCalled();
  });

  it("shows [ENTER] prompt after all lines complete", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await typeAllLines();

    expect(instance.lastFrame()).toContain("[ENTER] Begin");
  });

  it("does not show [ENTER] prompt before all lines complete", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await typeOutLine(INTRO_LINES[0]);

    expect(instance.lastFrame()).not.toContain("[ENTER] Begin");
  });

  it("ENTER calls onContinue after all lines are typed", async () => {
    const { instance, onContinue } = renderOnboarding();
    await tick(0);

    await typeAllLines();

    pressKey(instance, keys.enter);
    await tick(0);

    expect(onContinue).toHaveBeenCalledOnce();
  });

  // ── Progress persistence ─────────────────────────────────────────

  it("sets firstRunComplete in progress on ENTER", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await typeAllLines();

    pressKey(instance, keys.enter);
    await tick(0);

    expect(loadProgress).toHaveBeenCalled();
    expect(saveProgress).toHaveBeenCalledWith(
      expect.objectContaining({ firstRunComplete: true }),
    );
  });

  it("does not save progress before ENTER is pressed", async () => {
    renderOnboarding();
    await tick(0);

    await typeAllLines();

    expect(saveProgress).not.toHaveBeenCalled();
  });

  // ── Edge cases ───────────────────────────────────────────────────

  it("ignores non-ENTER keys after all lines complete", async () => {
    const { instance, onContinue } = renderOnboarding();
    await tick(0);

    await typeAllLines();

    pressKey(instance, keys.space);
    pressKey(instance, keys.arrowUp);
    pressKey(instance, "a");
    await tick(0);

    expect(onContinue).not.toHaveBeenCalled();
  });

  it("last line uses fast speed", async () => {
    const { instance } = renderOnboarding();
    await tick(0);

    await typeOutLine(INTRO_LINES[0]);
    await typeOutLine(INTRO_LINES[1]);

    await tick(TIMING.typewriterFast * INTRO_LINES[2].length);
    await tick(0);

    expect(instance.lastFrame()).toContain(INTRO_LINES[2]);
  });
});
