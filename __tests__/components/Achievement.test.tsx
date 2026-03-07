import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Achievement } from "../../src/components/Achievement.js";
import { renderInk, cleanup } from "../helpers/render-ink.js";
import { TIMING } from "../../src/constants.js";

const SLIDE_FRAMES = 5;
const SLIDE_INTERVAL = 40;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Advance fake timers by `ms`, then flush pending React state updates. */
async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  // Multiple zero-flushes to let chained React effects settle
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(0);
}

/** Advance through N slide frames, flushing React state after each one. */
async function advanceSlide(frames: number): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await tick(SLIDE_INTERVAL);
  }
}

// ── Basic rendering ─────────────────────────────────────────────────

describe("Achievement", () => {
  it("renders achievement name", async () => {
    const inst = renderInk(
      <Achievement name="First Blood" noAnimation />,
    );
    await tick(0);
    const frame = inst.lastFrame();
    expect(frame).toContain("First Blood");
    expect(frame).toContain("ACHIEVEMENT UNLOCKED");
  });

  it("renders description when provided", async () => {
    const inst = renderInk(
      <Achievement name="Explorer" description="Discover a hidden area" noAnimation />,
    );
    await tick(0);
    expect(inst.lastFrame()).toContain("Discover a hidden area");
  });

  it("renders without description when not provided", async () => {
    const inst = renderInk(<Achievement name="Solo" noAnimation />);
    await tick(0);
    const frame = inst.lastFrame();
    expect(frame).toContain("Solo");
    expect(frame).not.toContain("undefined");
  });

  // ── Terminal bell ───────────────────────────────────────────────────

  it("writes terminal bell on mount", async () => {
    renderInk(<Achievement name="Bell Test" noAnimation />);
    await tick(0);
    expect(process.stdout.write).toHaveBeenCalledWith("\x07");
  });

  // ── Animation phases ──────────────────────────────────────────────

  describe("animation phases", () => {
    it("starts in enter phase with content hidden", async () => {
      const inst = renderInk(<Achievement name="Hidden" />);
      // Before any timers fire, slideOffset = SLIDE_FRAMES so visibleHeight = 0
      expect(inst.lastFrame()).toBe("");
    });

    it("slides in over SLIDE_FRAMES intervals", async () => {
      const inst = renderInk(<Achievement name="Sliding" />);
      await tick(0);

      // Advance through all slide-in frames
      await advanceSlide(SLIDE_FRAMES);
      expect(inst.lastFrame()).toContain("Sliding");
    });

    it("transitions to exit phase after display timeout", async () => {
      const inst = renderInk(<Achievement name="Phased" />);
      await tick(0);

      // Complete slide-in + trigger phase="display"
      await advanceSlide(SLIDE_FRAMES + 1);
      expect(inst.lastFrame()).toContain("Phased");

      // Wait for display period to trigger exit
      await tick(TIMING.achievementDisplay);
      // Extra flush so exit useEffect registers its setInterval
      await tick(0);

      // Complete slide-out + trigger phase="done"
      await advanceSlide(SLIDE_FRAMES + 1);

      expect(inst.lastFrame()).toBe("");
    });
  });

  // ── onDismiss callback ────────────────────────────────────────────

  describe("onDismiss", () => {
    it("calls onDismiss after full animation cycle completes", async () => {
      const onDismiss = vi.fn();
      const inst = renderInk(
        <Achievement name="Callback" onDismiss={onDismiss} />,
      );
      await tick(0);

      // Slide in + trigger phase="display"
      await advanceSlide(SLIDE_FRAMES + 1);
      expect(onDismiss).not.toHaveBeenCalled();

      // Display
      await tick(TIMING.achievementDisplay);
      await tick(0);
      expect(onDismiss).not.toHaveBeenCalled();

      // Slide out + trigger phase="done"
      await advanceSlide(SLIDE_FRAMES + 1);
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("calls onDismiss after display period with noAnimation", async () => {
      const onDismiss = vi.fn();
      renderInk(
        <Achievement name="Quick" noAnimation onDismiss={onDismiss} />,
      );
      await tick(0);

      expect(onDismiss).not.toHaveBeenCalled();

      await tick(TIMING.achievementDisplay);
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("renders null after phase becomes done", async () => {
      const inst = renderInk(<Achievement name="Gone" noAnimation />);
      await tick(0);

      await tick(TIMING.achievementDisplay);
      expect(inst.lastFrame()).toBe("");
    });
  });

  // ── noAnimation prop ──────────────────────────────────────────────

  describe("noAnimation", () => {
    it("skips slide-in and shows content immediately", async () => {
      const inst = renderInk(<Achievement name="Instant" noAnimation />);
      await tick(0);
      expect(inst.lastFrame()).toContain("Instant");
      expect(inst.lastFrame()).toContain("ACHIEVEMENT UNLOCKED");
    });

    it("skips slide-out and goes directly to done", async () => {
      const onDismiss = vi.fn();
      renderInk(
        <Achievement name="NoDismissAnim" noAnimation onDismiss={onDismiss} />,
      );
      await tick(0);

      await tick(TIMING.achievementDisplay);
      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });
});
