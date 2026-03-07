import { describe, it, expect, afterEach } from "vitest";
import { BottomBar } from "../../src/components/BottomBar.js";
import { renderInk, cleanup } from "../helpers/render-ink.js";
import { COLORS } from "../../src/constants.js";

// Must match barWidth in BottomBar.tsx
const BAR_WIDTH = 20;

afterEach(cleanup);

describe("BottomBar", () => {
  // ── Progress bar fill ratio ───────────────────────────────────────

  it("renders a fully empty progress bar when currentStep is 0", () => {
    const inst = renderInk(
      <BottomBar currentStep={0} totalSteps={5} availableActions={[]} />,
    );
    const frame = inst.lastFrame()!;
    expect(frame).toContain("░".repeat(BAR_WIDTH));
    expect(frame).not.toContain("█");
  });

  it("renders a fully filled progress bar when currentStep equals totalSteps", () => {
    const inst = renderInk(
      <BottomBar currentStep={10} totalSteps={10} availableActions={[]} />,
    );
    const frame = inst.lastFrame()!;
    expect(frame).toContain("█".repeat(BAR_WIDTH));
    expect(frame).not.toContain("░");
  });

  it("renders correct fill ratio for partial progress", () => {
    const inst = renderInk(
      <BottomBar currentStep={1} totalSteps={2} availableActions={[]} />,
    );
    const half = BAR_WIDTH / 2;
    expect(inst.lastFrame()!).toContain("█".repeat(half) + "░".repeat(half));
  });

  it("renders empty bar when totalSteps is 0 (no division by zero)", () => {
    const inst = renderInk(
      <BottomBar currentStep={0} totalSteps={0} availableActions={[]} />,
    );
    expect(inst.lastFrame()!).toContain("░".repeat(BAR_WIDTH));
  });

  // ── Step counter ──────────────────────────────────────────────────

  it("displays the step counter as currentStep/totalSteps", () => {
    const inst = renderInk(
      <BottomBar currentStep={3} totalSteps={7} availableActions={[]} />,
    );
    expect(inst.lastFrame()!).toContain("3/7");
  });

  // ── Action labels ────────────────────────────────────────────────

  it("shows correct labels for known actions", () => {
    const inst = renderInk(
      <BottomBar
        currentStep={0}
        totalSteps={1}
        availableActions={["continue", "menu", "intel"]}
      />,
    );
    const frame = inst.lastFrame()!;
    expect(frame).toContain("[ENTER] continue");
    expect(frame).toContain("[ESC] menu");
    expect(frame).toContain("[H] intel");
  });

  it("shows submit and handler labels", () => {
    const inst = renderInk(
      <BottomBar
        currentStep={0}
        totalSteps={1}
        availableActions={["submit", "handler"]}
      />,
    );
    const frame = inst.lastFrame()!;
    expect(frame).toContain("[ENTER] submit");
    expect(frame).toContain("[?] handler");
  });

  it("falls back to bracketed action name for unknown actions", () => {
    const inst = renderInk(
      <BottomBar
        currentStep={0}
        totalSteps={1}
        availableActions={["mystery"]}
      />,
    );
    expect(inst.lastFrame()!).toContain("[mystery]");
  });

  // ── Progress updates ─────────────────────────────────────────────

  it("progress bar updates when steps complete (re-render)", () => {
    const quarter = BAR_WIDTH / 4;
    const inst = renderInk(
      <BottomBar currentStep={1} totalSteps={4} availableActions={[]} />,
    );
    expect(inst.lastFrame()!).toContain("█".repeat(quarter) + "░".repeat(BAR_WIDTH - quarter));

    inst.rerender(
      <BottomBar currentStep={3} totalSteps={4} availableActions={[]} />,
    );
    expect(inst.lastFrame()!).toContain("█".repeat(quarter * 3) + "░".repeat(quarter));
  });

  // ── Color constants ────────────────────────────────────────────────
  // ink-testing-library strips ANSI codes, so we cannot assert color
  // application on the rendered frame. Instead we verify the COLORS
  // values the component imports haven't drifted from expected hex.

  it("uses the expected COLORS hex values", () => {
    expect(COLORS.gray).toBe("#6B6B6B");
    expect(COLORS.amber).toBe("#FFB627");
    expect(COLORS.warmWhite).toBe("#E8E6E3");
  });
});
