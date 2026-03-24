import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Credits } from "../../src/screens/Credits.js";
import { MISSIONS } from "../../src/data/curriculum.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  tick,
  type RenderResult,
} from "../helpers/render-ink.js";
import type { SaveData } from "../../src/types.js";

// ── Mocks ─────────────────────────────────────────────────────────────

const mockLoadProgress = vi.fn<() => SaveData>();

vi.mock("../../src/store/progress.js", () => ({
  loadProgress: () => mockLoadProgress(),
}));

function freshProgress(overrides?: Partial<SaveData>): SaveData {
  return {
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
    ...overrides,
  };
}

function allCompleteProgress(): SaveData {
  const starRatings: Record<string, 1 | 2 | 3> = {};
  const completedMissions = MISSIONS.map((m) => {
    starRatings[m.id] = 3;
    return m.id;
  });
  return freshProgress({ completedMissions, starRatings, clearanceLevel: "elite" });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockLoadProgress.mockReturnValue(freshProgress());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderCredits(
  onClose = vi.fn(),
): RenderResult & { onClose: ReturnType<typeof vi.fn> } {
  const inst = renderInk(<Credits onClose={onClose} />);
  return Object.assign(inst, { onClose });
}

/** Advance from summary phase to credits phase */
async function advanceToCredits(inst: RenderResult): Promise<void> {
  pressKey(inst, keys.enter);
  await tick(0);
}

describe("Credits", () => {
  // ── Summary phase (initial) ───────────────────────────────────────

  it("renders final debrief header on initial load", () => {
    const { lastFrame } = renderCredits();
    expect(lastFrame()).toContain("FINAL DEBRIEF");
  });

  it("shows FXP and mission stats in summary phase", () => {
    const { lastFrame } = renderCredits();
    const frame = lastFrame();
    expect(frame).toContain("TOTAL FXP");
    expect(frame).toContain("MISSIONS");
    expect(frame).toContain("STARS");
  });

  it("shows continue prompt in summary phase", () => {
    const { lastFrame } = renderCredits();
    expect(lastFrame()).toContain("Continue to credits");
  });

  // ── Credits phase (after summary) ────────────────────────────────

  it("renders DECLASSIFIED header after advancing from summary", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);
    expect(inst.lastFrame()).toContain("DECLASSIFIED");
  });

  it("renders personnel file content", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);
    const frame = inst.lastFrame();
    expect(frame).toContain("PERSONNEL FILE");
    expect(frame).toContain("TOP SECRET");
  });

  it("shows project info", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);
    const frame = inst.lastFrame();
    expect(frame).toContain("Agent Academy");
    expect(frame).toContain("Terminal Training Division");
  });

  it("shows developer info", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);
    const frame = inst.lastFrame();
    expect(frame).toContain("Anthropic");
    expect(frame).toContain("Powered by Claude");
  });

  it("shows dismiss prompt in credits phase", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);
    expect(inst.lastFrame()).toContain("[ENTER] Self-destruct");
    expect(inst.lastFrame()).toContain("[ESC] Back");
  });

  // ── Self-destruct countdown ─────────────────────────────────────

  it("enters destruct phase on enter key from credits", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);

    pressKey(inst, keys.enter);
    await tick(0);

    expect(inst.lastFrame()).toContain("self-destruct in 3");
  });

  it("escape key from credits goes back to summary", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);

    pressKey(inst, keys.escape);
    await tick(0);

    // ESC from credits returns to summary phase
    expect(inst.lastFrame()).toContain("FINAL DEBRIEF");
    expect(inst.lastFrame()).not.toContain("DECLASSIFIED");
  });

  it("does not enter destruct phase on other keys", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);

    pressKey(inst, "a");
    await tick(0);

    expect(inst.lastFrame()).toContain("[ENTER] Self-destruct");
    expect(inst.lastFrame()).not.toContain("self-destruct in");
  });

  it("counts down from 3 to 1", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);

    pressKey(inst, keys.enter);
    await tick(0);
    expect(inst.lastFrame()).toContain("self-destruct in 3");

    await tick(800);
    expect(inst.lastFrame()).toContain("self-destruct in 2");

    await tick(800);
    expect(inst.lastFrame()).toContain("self-destruct in 1");
  });

  // ── Wipe phase & onClose ────────────────────────────────────────

  it("enters wipe phase after countdown reaches 0", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);

    pressKey(inst, keys.enter);
    await tick(0);

    // 3 → 2 → 1 → 0 (3 intervals of 800ms)
    await tick(800);
    await tick(800);
    await tick(800);
    // Extra tick for React to process phase change to "wipe"
    await tick(100);

    // Wipe phase — display content is gone
    expect(inst.lastFrame()).not.toContain("DECLASSIFIED");
  });

  it("calls onClose after wipe animation completes", async () => {
    const onClose = vi.fn();
    const inst = renderCredits(onClose);
    await advanceToCredits(inst);

    pressKey(inst, keys.enter);
    await tick(0);

    // Countdown: 3 intervals × 800ms
    await tick(800);
    await tick(800);
    await tick(800);
    // Extra tick for phase transition to "wipe"
    await tick(100);

    // Wipe: each row needs its own 20ms setTimeout + React update
    // Tick through all rows generously
    for (let i = 0; i < 30; i++) {
      await tick(20);
    }

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose before sequence completes", async () => {
    const onClose = vi.fn();
    const inst = renderCredits(onClose);
    await advanceToCredits(inst);

    pressKey(inst, keys.enter);
    await tick(0);

    // Only partway through countdown
    await tick(800);
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Cleanup ─────────────────────────────────────────────────────

  it("unmounts cleanly during summary phase", () => {
    const inst = renderCredits();
    expect(() => inst.unmount()).not.toThrow();
  });

  it("unmounts cleanly during credits phase", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);
    expect(() => inst.unmount()).not.toThrow();
  });

  it("unmounts cleanly during destruct phase", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);

    pressKey(inst, keys.enter);
    await tick(400);

    expect(() => inst.unmount()).not.toThrow();
  });

  // ── Konami hint (full clearance only) ───────────────────────────────

  it("shows konami hint in credits phase when all missions complete", async () => {
    mockLoadProgress.mockReturnValue(allCompleteProgress());
    const inst = renderCredits();
    await advanceToCredits(inst);
    const frame = inst.lastFrame();
    expect(frame).toContain("INTEL FRAGMENT");
    expect(frame).toContain("classic code");
    expect(frame).toContain("retro terminal");
  });

  it("does not show konami hint when missions are incomplete", async () => {
    const inst = renderCredits();
    await advanceToCredits(inst);
    expect(inst.lastFrame()).not.toContain("INTEL FRAGMENT");
  });

  it("does not show konami hint in summary phase even when all complete", () => {
    mockLoadProgress.mockReturnValue(allCompleteProgress());
    const { lastFrame } = renderCredits();
    expect(lastFrame()).not.toContain("INTEL FRAGMENT");
  });
});
