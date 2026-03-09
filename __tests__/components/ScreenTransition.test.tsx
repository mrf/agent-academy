import type { ComponentProps } from "react";
import { Text } from "ink";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScreenTransition } from "../../src/components/ScreenTransition.js";
import { renderInk, cleanup, tick, type RenderResult } from "../helpers/render-ink.js";
import { TIMING } from "../../src/constants.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// stdout.rows is undefined in ink-testing-library, so defaults to 24
const ROWS = 24;
const FRAME_INTERVAL = Math.max(
  Math.floor(TIMING.screenTransition / 2 / ROWS),
  5,
);
// Each phase needs ROWS+1 ticks: ROWS decrements/increments + 1 to hit boundary
const PHASE_TICKS = ROWS + 1;
const PHASE_DURATION = PHASE_TICKS * FRAME_INTERVAL;

type Props = ComponentProps<typeof ScreenTransition>;

/** Render and flush React effects so the component is in idle phase. */
async function renderScreenTransition(
  props: Props,
): Promise<RenderResult> {
  const inst = renderInk(<ScreenTransition {...props} />);
  await tick(0);
  return inst;
}

/** Rerender with a new screenKey, triggering the transition animation. */
function triggerTransition(
  inst: RenderResult,
  props: Props,
): void {
  inst.rerender(<ScreenTransition {...props} />);
}

/** Advance past the full wipe, draw, and idle transition.
 *  Uses small increments so React can process phase changes. */
async function completeTransition(): Promise<void> {
  for (let i = 0; i < PHASE_TICKS * 3; i++) {
    await tick(FRAME_INTERVAL);
  }
}

describe("ScreenTransition", () => {
  // ── Basic rendering ─────────────────────────────────────────

  it("renders children when visible (idle phase)", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      children: <Text>Hello World</Text>,
    });
    expect(inst.lastFrame()).toBe("Hello World");
  });

  // ── noAnimation ─────────────────────────────────────────────

  it("noAnimation renders immediately without transition", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      noAnimation: true,
      children: <Text>Immediate</Text>,
    });
    expect(inst.lastFrame()).toBe("Immediate");
  });

  it("noAnimation updates content immediately on screenKey change", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      noAnimation: true,
      children: <Text>Screen A</Text>,
    });
    expect(inst.lastFrame()).toBe("Screen A");

    triggerTransition(inst, {
      screenKey: "b",
      noAnimation: true,
      children: <Text>Screen B</Text>,
    });
    await tick(0);
    expect(inst.lastFrame()).toBe("Screen B");
  });

  // ── Wipe / draw animation phases ───────────────────────────

  it("screenKey change triggers wipe phase", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      children: <Text>Screen A</Text>,
    });
    expect(inst.lastFrame()).toBe("Screen A");

    triggerTransition(inst, {
      screenKey: "b",
      children: <Text>Screen B</Text>,
    });
    await tick(FRAME_INTERVAL * 3);

    // During wipe, output is wrapped in a Box layout -- not plain text
    expect(inst.lastFrame()).not.toBe("Screen B");
  });

  it("wipe phase progresses over time", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      children: <Text>Content</Text>,
    });

    triggerTransition(inst, {
      screenKey: "b",
      children: <Text>Content</Text>,
    });
    await tick(FRAME_INTERVAL * 2);
    const earlyFrame = inst.lastFrame();

    await tick(FRAME_INTERVAL * 5);
    const laterFrame = inst.lastFrame();

    // Frames differ as more lines are blanked out
    expect(laterFrame).not.toBe(earlyFrame);
  });

  it("draw phase follows wipe phase", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      children: <Text>Content</Text>,
    });

    triggerTransition(inst, {
      screenKey: "b",
      children: <Text>Content</Text>,
    });

    // Advance past wipe into draw phase
    await tick(PHASE_DURATION + FRAME_INTERVAL);

    // Still in transition (draw phase), not idle yet
    expect(inst.lastFrame()).not.toBe("Content");
  });

  it("transition completes and returns to idle showing children", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      children: <Text>Screen A</Text>,
    });
    expect(inst.lastFrame()).toBe("Screen A");

    triggerTransition(inst, {
      screenKey: "b",
      children: <Text>Screen B</Text>,
    });
    await completeTransition();

    expect(inst.lastFrame()).toBe("Screen B");
  });

  // ── Children content ────────────────────────────────────────

  it("children updated after transition completes", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      children: <Text>Old Content</Text>,
    });
    expect(inst.lastFrame()).toBe("Old Content");

    triggerTransition(inst, {
      screenKey: "b",
      children: <Text>New Content</Text>,
    });
    await completeTransition();

    expect(inst.lastFrame()).toBe("New Content");
  });

  // ── Edge cases ──────────────────────────────────────────────

  it("same screenKey does not trigger transition", async () => {
    const inst = await renderScreenTransition({
      screenKey: "a",
      children: <Text>Stable</Text>,
    });
    expect(inst.lastFrame()).toBe("Stable");

    triggerTransition(inst, {
      screenKey: "a",
      children: <Text>Stable</Text>,
    });
    await tick(FRAME_INTERVAL * 5);

    // Still idle -- no transition triggered
    expect(inst.lastFrame()).toBe("Stable");
  });

  it("clears intervals on unmount during transition", async () => {
    const spy = vi.spyOn(globalThis, "clearInterval");
    const inst = await renderScreenTransition({
      screenKey: "a",
      children: <Text>Content</Text>,
    });

    triggerTransition(inst, {
      screenKey: "b",
      children: <Text>Content</Text>,
    });
    await tick(FRAME_INTERVAL * 3);

    inst.unmount();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
