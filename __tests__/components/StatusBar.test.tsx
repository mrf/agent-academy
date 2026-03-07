import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StatusBar } from "../../src/components/StatusBar.js";
import { renderInk, cleanup, type RenderResult } from "../helpers/render-ink.js";

afterEach(() => {
  cleanup();
});

async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.advanceTimersByTimeAsync(0);
}

const defaultProps = {
  coverIntegrity: 3,
  fxp: 150,
  missionNumber: 1,
  codename: "SHADOW PROTOCOL",
  currentStep: 2,
  totalSteps: 5,
  hasApiKey: false,
};

function renderStatusBar(overrides: Partial<typeof defaultProps> = {}): RenderResult {
  return renderInk(<StatusBar {...defaultProps} {...overrides} />);
}

// ── Cover integrity blocks ──────────────────────────────────────────

describe("StatusBar - cover integrity", () => {
  it("renders 3 filled blocks at full integrity", () => {
    const inst = renderStatusBar({ coverIntegrity: 3 });
    const frame = inst.lastFrame();
    expect(frame).toContain("■ ■ ■");
    expect(frame).not.toContain("□");
  });

  it("renders 2 filled and 1 empty block at integrity 2", () => {
    const inst = renderStatusBar({ coverIntegrity: 2 });
    const frame = inst.lastFrame();
    expect(frame).toContain("■ ■ □");
  });

  it("renders 1 filled and 2 empty blocks at integrity 1", () => {
    const inst = renderStatusBar({ coverIntegrity: 1 });
    const frame = inst.lastFrame();
    expect(frame).toContain("■ □ □");
  });

  it("renders 3 empty blocks at integrity 0", () => {
    const inst = renderStatusBar({ coverIntegrity: 0 });
    const frame = inst.lastFrame();
    expect(frame).toContain("□ □ □");
    expect(frame).not.toContain("■");
  });

  it("wraps cover blocks in brackets", () => {
    const inst = renderStatusBar({ coverIntegrity: 3 });
    expect(inst.lastFrame()).toContain("[■ ■ ■]");
  });
});

// ── FXP display ─────────────────────────────────────────────────────

describe("StatusBar - FXP", () => {
  it("renders the FXP label and value", () => {
    const inst = renderStatusBar({ fxp: 250 });
    const frame = inst.lastFrame();
    expect(frame).toContain("FXP:");
    expect(frame).toContain("250");
  });

  it("renders zero FXP", () => {
    const inst = renderStatusBar({ fxp: 0 });
    expect(inst.lastFrame()).toContain("0");
  });
});

// ── Mission info ────────────────────────────────────────────────────

describe("StatusBar - mission info", () => {
  it("renders mission number zero-padded and codename", () => {
    const inst = renderStatusBar({ missionNumber: 3, codename: "NIGHTFALL" });
    const frame = inst.lastFrame();
    expect(frame).toContain("MISSION 03: NIGHTFALL");
  });

  it("does not pad two-digit mission numbers", () => {
    const inst = renderStatusBar({ missionNumber: 12, codename: "ENDGAME" });
    expect(inst.lastFrame()).toContain("MISSION 12: ENDGAME");
  });

  it("renders step counter", () => {
    const inst = renderStatusBar({ currentStep: 3, totalSteps: 7 });
    expect(inst.lastFrame()).toContain("STEP 3/7");
  });
});

// ── API key / HANDLER indicator ─────────────────────────────────────

describe("StatusBar - HANDLER indicator", () => {
  it("shows HANDLER text when hasApiKey is true", () => {
    const inst = renderStatusBar({ hasApiKey: true });
    expect(inst.lastFrame()).toContain("[? HANDLER]");
  });

  it("does not show HANDLER text when hasApiKey is false", () => {
    const inst = renderStatusBar({ hasApiKey: false });
    expect(inst.lastFrame()).not.toContain("HANDLER");
  });
});

// ── Flash animation on cover loss ───────────────────────────────────

describe("StatusBar - flash on cover loss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("triggers flash state when cover integrity drops", async () => {
    const inst = renderInk(
      <StatusBar {...defaultProps} coverIntegrity={3} />,
    );
    await tick(0);

    // Re-render with lower integrity to trigger flash
    inst.rerender(<StatusBar {...defaultProps} coverIntegrity={2} />);
    await tick(0);

    // The component should be in flash state (red color).
    // We can't directly inspect ink color props, but we can verify
    // the component renders without error during flash state.
    const frame = inst.lastFrame();
    expect(frame).toContain("■ ■ □");

    // After 400ms the flash should clear
    await tick(400);
    const frameAfter = inst.lastFrame();
    expect(frameAfter).toContain("■ ■ □");
  });

  it("does not flash when cover integrity stays the same", async () => {
    const inst = renderInk(
      <StatusBar {...defaultProps} coverIntegrity={3} />,
    );
    await tick(0);

    // Re-render with same integrity
    inst.rerender(<StatusBar {...defaultProps} coverIntegrity={3} />);
    await tick(0);

    // Should still render normally
    expect(inst.lastFrame()).toContain("[■ ■ ■]");
  });
});
