import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Credits } from "../../src/screens/Credits.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  tick,
  type RenderResult,
} from "../helpers/render-ink.js";

beforeEach(() => {
  vi.useFakeTimers();
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

describe("Credits", () => {
  // ── Display phase ───────────────────────────────────────────────

  it("renders DECLASSIFIED header", () => {
    const { lastFrame } = renderCredits();
    expect(lastFrame()).toContain("DECLASSIFIED");
  });

  it("renders personnel file content", () => {
    const { lastFrame } = renderCredits();
    const frame = lastFrame();
    expect(frame).toContain("PERSONNEL FILE");
    expect(frame).toContain("TOP SECRET");
  });

  it("shows project info", () => {
    const { lastFrame } = renderCredits();
    const frame = lastFrame();
    expect(frame).toContain("Claude Code Academy");
    expect(frame).toContain("Terminal Training Division");
  });

  it("shows developer info", () => {
    const { lastFrame } = renderCredits();
    const frame = lastFrame();
    expect(frame).toContain("Anthropic");
    expect(frame).toContain("Powered by Claude");
  });

  it("shows dismiss prompt in display phase", () => {
    const { lastFrame } = renderCredits();
    expect(lastFrame()).toContain("[ENTER/ESC] Dismiss");
  });

  // ── Self-destruct countdown ─────────────────────────────────────

  it("enters destruct phase on enter key", async () => {
    const inst = renderCredits();

    pressKey(inst, keys.enter);
    await tick(0);

    expect(inst.lastFrame()).toContain("self-destruct in 3");
  });

  it("enters destruct phase on escape key", async () => {
    const inst = renderCredits();

    pressKey(inst, keys.escape);
    await tick(0);

    expect(inst.lastFrame()).toContain("self-destruct in 3");
  });

  it("does not enter destruct phase on other keys", async () => {
    const inst = renderCredits();

    pressKey(inst, "a");
    await tick(0);

    expect(inst.lastFrame()).toContain("[ENTER/ESC] Dismiss");
    expect(inst.lastFrame()).not.toContain("self-destruct");
  });

  it("counts down from 3 to 1", async () => {
    const inst = renderCredits();

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

    pressKey(inst, keys.enter);
    await tick(0);

    // Only partway through countdown
    await tick(800);
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Cleanup ─────────────────────────────────────────────────────

  it("unmounts cleanly during display phase", () => {
    const inst = renderCredits();
    expect(() => inst.unmount()).not.toThrow();
  });

  it("unmounts cleanly during destruct phase", async () => {
    const inst = renderCredits();

    pressKey(inst, keys.enter);
    await tick(400);

    expect(() => inst.unmount()).not.toThrow();
  });
});
