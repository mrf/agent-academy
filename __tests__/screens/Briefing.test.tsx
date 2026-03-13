import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Briefing } from "../../src/screens/Briefing.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  tick,
} from "../helpers/render-ink.js";
import { createMission } from "../helpers/mock-missions.js";
import { TIMING } from "../../src/constants.js";
import type { Mission, ClearanceLevel } from "../../src/types.js";

// ── Setup / Teardown ─────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Helpers ──────────────────────────────────────────────────────────

/** Generous upper bound on typewriter duration to ensure animation completes. */
const TYPEWRITER_COMPLETE = TIMING.typewriterDramatic * 500;

function renderBriefing(overrides: {
  mission?: Mission;
  clearanceLevel?: ClearanceLevel;
  onAccept?: () => void;
} = {}) {
  const {
    mission = createMission(),
    clearanceLevel = "recruit",
    onAccept = vi.fn(),
  } = overrides;
  return renderInk(
    <Briefing
      mission={mission}
      clearanceLevel={clearanceLevel}
      onAccept={onAccept}
    />,
  );
}

async function renderAndComplete(overrides: {
  mission?: Mission;
  clearanceLevel?: ClearanceLevel;
  onAccept?: () => void;
} = {}) {
  const inst = renderBriefing(overrides);
  await tick(TYPEWRITER_COMPLETE);
  return inst;
}

// ── Rendering ────────────────────────────────────────────────────────

describe("Briefing", () => {
  it("renders MISSION BRIEFING header", async () => {
    const inst = renderBriefing();
    await tick(0);
    expect(inst.lastFrame()).toContain("[ MISSION BRIEFING ]");
  });

  it("renders mission number and codename via TypeWriter", async () => {
    const inst = await renderAndComplete({
      mission: createMission({ id: "mission-03", codename: "SHADOW NET" }),
    });

    expect(inst.lastFrame()).toContain("MISSION:     03 — SHADOW NET");
  });

  it("renders objectives as checklist items", async () => {
    const inst = await renderAndComplete({
      mission: createMission({
        objectives: ["Learn git basics", "Create a branch"],
      }),
    });
    const frame = inst.lastFrame()!;

    expect(frame).toContain("OBJECTIVES:");
    expect(frame).toContain("[ ] Learn git basics");
    expect(frame).toContain("[ ] Create a branch");
  });

  it("renders intel from mission briefing field", async () => {
    const inst = await renderAndComplete({
      mission: createMission({ briefing: "Top secret intel here." }),
    });

    expect(inst.lastFrame()).toContain("Top secret intel here.");
  });

  it("falls back to codename when no briefing field exists", async () => {
    const inst = await renderAndComplete({
      mission: createMission({ codename: "GHOST PROTOCOL" }),
    });

    expect(inst.lastFrame()).toContain("GHOST PROTOCOL");
  });

  // ── TypeWriter integration ──────────────────────────────────────

  it("TypeWriter reveals text progressively (not all at once)", async () => {
    const inst = renderBriefing();
    await tick(0);

    // After a short time, only partial text should be visible
    await tick(TIMING.typewriterDramatic * 5);
    expect(inst.lastFrame()).not.toContain("OBJECTIVES:");

    // After full duration, complete text is visible
    await tick(TYPEWRITER_COMPLETE);
    expect(inst.lastFrame()).toContain("OBJECTIVES:");
  });

  // ── Accept prompt visibility ──────────────────────────────────

  it("does not show accept prompt before typing completes", async () => {
    const inst = renderBriefing();
    await tick(TIMING.typewriterDramatic * 3);

    expect(inst.lastFrame()).not.toContain("[ENTER] Accept mission");
  });

  it("shows accept prompt after typing completes", async () => {
    const inst = await renderAndComplete();

    expect(inst.lastFrame()).toContain("[ENTER] Accept mission");
  });

  // ── ENTER key behavior ────────────────────────────────────────

  it("ENTER before typing completes does NOT call onAccept", async () => {
    const onAccept = vi.fn();
    const inst = renderBriefing({ onAccept });

    await tick(TIMING.typewriterDramatic * 3);
    pressKey(inst, keys.enter);
    await tick(0);

    expect(onAccept).not.toHaveBeenCalled();
  });

  it("ENTER after typing completes calls onAccept", async () => {
    const onAccept = vi.fn();
    const inst = await renderAndComplete({ onAccept });

    pressKey(inst, keys.enter);
    await tick(0);

    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("non-ENTER keys do not call onAccept after typing completes", async () => {
    const onAccept = vi.fn();
    const inst = await renderAndComplete({ onAccept });

    pressKey(inst, keys.space);
    pressKey(inst, keys.escape);
    pressKey(inst, "a");
    await tick(0);

    expect(onAccept).not.toHaveBeenCalled();
  });

  // ── Clearance level variants ──────────────────────────────────

  it.each<ClearanceLevel>(["recruit", "operative", "elite"])(
    "renders clearance level '%s' in uppercase",
    async (level) => {
      const inst = await renderAndComplete({ clearanceLevel: level });

      expect(inst.lastFrame()).toContain(`CLEARANCE:   ${level.toUpperCase()}`);
    },
  );
});
