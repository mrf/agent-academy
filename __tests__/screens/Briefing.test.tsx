import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Briefing } from "../../src/screens/Briefing.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  tick,
  type RenderResult,
} from "../helpers/render-ink.js";
import { createMission, createPrintStep } from "../helpers/mock-missions.js";
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

interface BriefingTestProps {
  mission: Mission;
  clearanceLevel: ClearanceLevel;
  onAccept: () => void;
}

function defaultProps(overrides?: {
  mission?: Mission;
  clearanceLevel?: ClearanceLevel;
  onAccept?: () => void;
}): BriefingTestProps {
  return {
    mission: overrides?.mission ?? createMission(),
    clearanceLevel: overrides?.clearanceLevel ?? "recruit",
    onAccept: overrides?.onAccept ?? vi.fn(),
  };
}

async function renderBriefing(
  props: BriefingTestProps,
): Promise<RenderResult> {
  const inst = renderInk(<Briefing {...props} />);
  await tick(0);
  return inst;
}

function buildBriefingText(mission: Mission, clearanceLevel: ClearanceLevel): string {
  const missionNumber = mission.id.replace("mission-", "");
  const firstPrintStep = mission.steps.find((s) => s.type === "print");
  const intel =
    firstPrintStep && "text" in firstPrintStep
      ? firstPrintStep.text
      : mission.codename;

  return [
    `MISSION:     ${missionNumber} — ${mission.codename}`,
    `CLEARANCE:   ${clearanceLevel.toUpperCase()}`,
    `HANDLER:     Instructor Haiku`,
    ``,
    `OBJECTIVES:`,
    ...mission.objectives.map((obj) => `  [ ] ${obj}`),
    ``,
    `INTEL:`,
    `  ${intel}`,
  ].join("\n");
}

async function completeTypewriter(briefingText: string): Promise<void> {
  await tick(TIMING.typewriterDramatic * briefingText.length);
  await tick(0);
}

/** Render, complete the typewriter, and return the instance + briefing text. */
async function renderAndComplete(
  props: BriefingTestProps,
): Promise<{ inst: RenderResult; text: string }> {
  const inst = await renderBriefing(props);
  const text = buildBriefingText(props.mission, props.clearanceLevel);
  await completeTypewriter(text);
  return { inst, text };
}

// ── Rendering ────────────────────────────────────────────────────────

describe("Briefing", () => {
  it("renders MISSION BRIEFING header", async () => {
    const props = defaultProps();
    const inst = await renderBriefing(props);
    expect(inst.lastFrame()).toContain("[ MISSION BRIEFING ]");
  });

  it("renders mission number and codename via TypeWriter", async () => {
    const mission = createMission({ id: "mission-03", codename: "SHADOW NET" });
    const props = defaultProps({ mission });
    const { inst } = await renderAndComplete(props);

    expect(inst.lastFrame()).toContain("MISSION:     03 — SHADOW NET");
  });

  it("renders objectives as checklist items", async () => {
    const mission = createMission({
      objectives: ["Learn git basics", "Create a branch"],
    });
    const props = defaultProps({ mission });
    const { inst } = await renderAndComplete(props);
    const frame = inst.lastFrame()!;

    expect(frame).toContain("OBJECTIVES:");
    expect(frame).toContain("[ ] Learn git basics");
    expect(frame).toContain("[ ] Create a branch");
  });

  it("renders intel from first print step", async () => {
    const mission = createMission({
      steps: [createPrintStep({ text: "Top secret intel here." })],
    });
    const props = defaultProps({ mission });
    const { inst } = await renderAndComplete(props);

    expect(inst.lastFrame()).toContain("Top secret intel here.");
  });

  it("falls back to codename when no print step exists", async () => {
    const mission = createMission({
      codename: "GHOST PROTOCOL",
      steps: [],
    });
    const props = defaultProps({ mission });
    const { inst } = await renderAndComplete(props);

    expect(inst.lastFrame()).toContain("GHOST PROTOCOL");
  });

  // ── TypeWriter integration ──────────────────────────────────────

  it("TypeWriter reveals text progressively (not all at once)", async () => {
    const props = defaultProps();
    const inst = await renderBriefing(props);

    // After a short time, only partial text should be visible
    await tick(TIMING.typewriterDramatic * 5);
    expect(inst.lastFrame()).not.toContain("OBJECTIVES:");

    // After full duration, complete text is visible
    const text = buildBriefingText(props.mission, props.clearanceLevel);
    await completeTypewriter(text);
    expect(inst.lastFrame()).toContain("OBJECTIVES:");
  });

  // ── Accept prompt visibility ──────────────────────────────────

  it("does not show accept prompt before typing completes", async () => {
    const props = defaultProps();
    const inst = await renderBriefing(props);

    await tick(TIMING.typewriterDramatic * 3);
    expect(inst.lastFrame()).not.toContain("[ENTER] Accept mission");
  });

  it("shows accept prompt after typing completes", async () => {
    const props = defaultProps();
    const { inst } = await renderAndComplete(props);

    expect(inst.lastFrame()).toContain("[ENTER] Accept mission");
  });

  // ── ENTER key behavior ────────────────────────────────────────

  it("ENTER before typing completes does NOT call onAccept", async () => {
    const onAccept = vi.fn();
    const props = defaultProps({ onAccept });
    const inst = await renderBriefing(props);

    await tick(TIMING.typewriterDramatic * 3);
    pressKey(inst, keys.enter);
    await tick(0);

    expect(onAccept).not.toHaveBeenCalled();
  });

  it("ENTER after typing completes calls onAccept", async () => {
    const onAccept = vi.fn();
    const props = defaultProps({ onAccept });
    const { inst } = await renderAndComplete(props);

    pressKey(inst, keys.enter);
    await tick(0);

    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("non-ENTER keys do not call onAccept after typing completes", async () => {
    const onAccept = vi.fn();
    const props = defaultProps({ onAccept });
    const { inst } = await renderAndComplete(props);

    pressKey(inst, keys.space);
    pressKey(inst, keys.escape);
    inst.stdin.write("a");
    await tick(0);

    expect(onAccept).not.toHaveBeenCalled();
  });

  // ── Clearance level variants ──────────────────────────────────

  it.each<ClearanceLevel>(["recruit", "operative", "elite"])(
    "renders clearance level '%s' in uppercase",
    async (level) => {
      const props = defaultProps({ clearanceLevel: level });
      const { inst } = await renderAndComplete(props);

      expect(inst.lastFrame()).toContain(`CLEARANCE:   ${level.toUpperCase()}`);
    },
  );
});
