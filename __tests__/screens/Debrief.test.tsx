import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Debrief } from "../../src/screens/Debrief.js";
import { renderInk, cleanup, keys, pressKey, type RenderResult } from "../helpers/render-ink.js";
import { TIMING } from "../../src/constants.js";
import { createMission } from "../helpers/mock-missions.js";
import type { Mission } from "../../src/types.js";

const STAR_FILLED = "\u2605";
const STAR_EMPTY = "\u2606";

const STAR_DELAY = 400;

function renderDebrief(overrides: {
  mission?: Mission;
  stars?: 1 | 2 | 3;
  fxpEarned?: number;
  coverRemaining?: number;
  onContinue?: () => void;
} = {}): RenderResult {
  const {
    mission = createMission(),
    stars = 1,
    fxpEarned = 0,
    coverRemaining = 3,
    onContinue = vi.fn(),
  } = overrides;
  return renderInk(
    <Debrief
      mission={mission}
      stars={stars}
      fxpEarned={fxpEarned}
      coverRemaining={coverRemaining}
      onContinue={onContinue}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(0);
}

// ── Basic rendering ─────────────────────────────────────────────────

describe("Debrief", () => {
  it("renders MISSION DEBRIEF header", async () => {
    const inst = renderDebrief();
    await tick(0);
    expect(inst.lastFrame()).toContain("MISSION DEBRIEF");
  });

  it("renders mission objectives", async () => {
    const inst = renderDebrief({
      mission: createMission({ objectives: ["Hack the mainframe"] }),
    });
    await tick(0);
    expect(inst.lastFrame()).toContain("Hack the mainframe");
    expect(inst.lastFrame()).toContain("OBJECTIVES");
  });

  it("renders cover remaining", async () => {
    const inst = renderDebrief({ coverRemaining: 2 });
    await tick(0);
    expect(inst.lastFrame()).toContain("COVER INTEGRITY REMAINING: 2/3");
  });

  it("renders cover remaining at 0", async () => {
    const inst = renderDebrief({ coverRemaining: 0 });
    await tick(0);
    expect(inst.lastFrame()).toContain("COVER INTEGRITY REMAINING: 0/3");
  });

  // ── Star reveal animation ───────────────────────────────────────────

  describe("star reveal animation", () => {
    it("starts with no stars filled", async () => {
      const inst = renderDebrief({ stars: 3 });
      await tick(0);
      const frame = inst.lastFrame()!;
      expect(frame).toContain(STAR_EMPTY.repeat(3));
      expect(frame).not.toContain(STAR_FILLED);
    });

    it("reveals 1 star after one delay", async () => {
      const inst = renderDebrief({ stars: 2 });
      await tick(STAR_DELAY);
      const frame = inst.lastFrame()!;
      expect(frame).toContain(STAR_FILLED + STAR_EMPTY.repeat(2));
    });

    it("reveals all 2 stars after two delays", async () => {
      const inst = renderDebrief({ stars: 2 });
      await tick(STAR_DELAY);
      await tick(STAR_DELAY);
      const frame = inst.lastFrame()!;
      expect(frame).toContain(STAR_FILLED.repeat(2) + STAR_EMPTY);
    });

    it("reveals all 3 stars after three delays", async () => {
      const inst = renderDebrief({ stars: 3 });
      await tick(STAR_DELAY);
      await tick(STAR_DELAY);
      await tick(STAR_DELAY);
      const frame = inst.lastFrame()!;
      expect(frame).toContain(STAR_FILLED.repeat(3));
      expect(frame).not.toContain(STAR_EMPTY);
    });

    it("stops revealing at the given star count (1 star)", async () => {
      const inst = renderDebrief({ stars: 1 });
      await tick(STAR_DELAY);
      expect(inst.lastFrame()).toContain(STAR_FILLED + STAR_EMPTY.repeat(2));

      // After another delay, still only 1 star
      await tick(STAR_DELAY);
      expect(inst.lastFrame()).toContain(STAR_FILLED + STAR_EMPTY.repeat(2));
    });
  });

  // ── FXP count-up animation ─────────────────────────────────────────

  describe("FXP count-up animation", () => {
    it("starts at 0 FXP", async () => {
      const inst = renderDebrief({ fxpEarned: 5 });
      await tick(0);
      expect(inst.lastFrame()).toContain("FXP EARNED: 0");
    });

    it("does not count up until stars are fully revealed", async () => {
      const inst = renderDebrief({ stars: 2, fxpEarned: 5 });
      // Reveal only 1 of 2 stars
      await tick(STAR_DELAY);
      // Wait for what would be several FXP ticks
      await tick(TIMING.fxpTick * 3);
      expect(inst.lastFrame()).toContain("FXP EARNED: 0");
    });

    it("counts up FXP after stars are revealed", async () => {
      const inst = renderDebrief({ fxpEarned: 3 });
      // Reveal the 1 star
      await tick(STAR_DELAY);
      // Now FXP should start counting
      await tick(TIMING.fxpTick);
      expect(inst.lastFrame()).toContain("FXP EARNED: 1");
    });

    it("counts up to the full fxpEarned value", async () => {
      const fxp = 5;
      const inst = renderDebrief({ fxpEarned: fxp });
      await tick(STAR_DELAY);
      for (let i = 0; i < fxp; i++) {
        await tick(TIMING.fxpTick);
      }
      expect(inst.lastFrame()).toContain(`FXP EARNED: ${fxp}`);
    });

    it("does not count past fxpEarned", async () => {
      const fxp = 2;
      const inst = renderDebrief({ fxpEarned: fxp });
      await tick(STAR_DELAY);
      for (let i = 0; i < fxp + 5; i++) {
        await tick(TIMING.fxpTick);
      }
      expect(inst.lastFrame()).toContain(`FXP EARNED: ${fxp}`);
    });
  });

  // ── ENTER key / onContinue ─────────────────────────────────────────

  describe("ENTER key / onContinue", () => {
    it("does not show continue prompt before animation completes", async () => {
      const inst = renderDebrief({ fxpEarned: 5 });
      await tick(0);
      expect(inst.lastFrame()).not.toContain("Return to Mission Map");
    });

    it("shows continue prompt after all animations complete", async () => {
      const fxp = 3;
      const inst = renderDebrief({ fxpEarned: fxp });
      await tick(STAR_DELAY);
      for (let i = 0; i < fxp; i++) {
        await tick(TIMING.fxpTick);
      }
      // Extra flush for animDone state update
      await tick(0);
      expect(inst.lastFrame()).toContain("Return to Mission Map");
    });

    it("ENTER does not call onContinue before animations finish", async () => {
      const onContinue = vi.fn();
      const inst = renderDebrief({ fxpEarned: 5, onContinue });
      await tick(0);
      pressKey(inst, keys.enter);
      await tick(0);
      expect(onContinue).not.toHaveBeenCalled();
    });

    it("ENTER calls onContinue after animations finish", async () => {
      const fxp = 2;
      const onContinue = vi.fn();
      const inst = renderDebrief({ fxpEarned: fxp, onContinue });
      await tick(STAR_DELAY);
      for (let i = 0; i < fxp; i++) {
        await tick(TIMING.fxpTick);
      }
      // Extra flush for animDone state update
      await tick(0);
      pressKey(inst, keys.enter);
      await tick(0);
      expect(onContinue).toHaveBeenCalledOnce();
    });

    it("non-ENTER keys do not call onContinue", async () => {
      const onContinue = vi.fn();
      const inst = renderDebrief({ onContinue });
      // fxpEarned=0 so animation is done immediately after star reveal
      await tick(STAR_DELAY);
      pressKey(inst, keys.space);
      pressKey(inst, keys.escape);
      await tick(0);
      expect(onContinue).not.toHaveBeenCalled();
    });

    it("shows continue prompt when fxpEarned is 0 (after star reveal only)", async () => {
      const inst = renderDebrief();
      await tick(STAR_DELAY);
      // Extra flush for animDone state update
      await tick(0);
      expect(inst.lastFrame()).toContain("Return to Mission Map");
    });
  });

  // ── Multiple objectives ────────────────────────────────────────────

  describe("objectives display", () => {
    it("renders all objectives with checkmarks", async () => {
      const objectives = ["Obj A", "Obj B", "Obj C"];
      const inst = renderDebrief({
        mission: createMission({ objectives }),
      });
      await tick(0);
      const frame = inst.lastFrame()!;
      for (const obj of objectives) {
        expect(frame).toContain(obj);
      }
      expect(frame).toContain("\u2713");
    });
  });
});
