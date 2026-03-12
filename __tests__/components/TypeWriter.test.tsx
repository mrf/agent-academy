import type { ComponentProps } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TypeWriter } from "../../src/components/TypeWriter.js";
import { renderInk, cleanup, tick, pressKey, keys, type RenderResult } from "../helpers/render-ink.js";
import { TIMING } from "../../src/constants.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Render and flush React effects so setInterval is active. */
async function renderTypeWriter(
  props: ComponentProps<typeof TypeWriter>,
): Promise<RenderResult> {
  const inst = renderInk(<TypeWriter {...props} />);
  await tick(0);
  return inst;
}

// ── Basic rendering ─────────────────────────────────────────────────

describe("TypeWriter", () => {
  it("renders nothing initially, then reveals characters over time", async () => {
    const inst = renderInk(<TypeWriter text="Hello" />);

    // Initially no characters revealed
    expect(inst.lastFrame()).toBe("");

    // Flush effects to start the interval
    await tick(0);

    // After one tick, one character appears
    await tick(TIMING.typewriterNormal);
    expect(inst.lastFrame()).toBe("H");

    // After another tick, two characters
    await tick(TIMING.typewriterNormal);
    expect(inst.lastFrame()).toBe("He");

    // Advance through remaining characters
    await tick(TIMING.typewriterNormal * 3);
    expect(inst.lastFrame()).toBe("Hello");
  });

  // ── Speed variants ──────────────────────────────────────────────

  it("'fast' speed uses shorter interval than 'normal'", async () => {
    const inst = await renderTypeWriter({ text: "AB", speed: "fast" });

    await tick(TIMING.typewriterFast);
    expect(inst.lastFrame()).toBe("A");

    await tick(TIMING.typewriterFast);
    expect(inst.lastFrame()).toBe("AB");
  });

  it("'dramatic' speed uses longer interval", async () => {
    const inst = await renderTypeWriter({ text: "AB", speed: "dramatic" });

    // After 'normal' time, nothing should have appeared yet
    await tick(TIMING.typewriterNormal);
    expect(inst.lastFrame()).toBe("");

    // After 'dramatic' time, first character appears
    await tick(TIMING.typewriterDramatic - TIMING.typewriterNormal);
    expect(inst.lastFrame()).toBe("A");
  });

  // ── noAnimation ─────────────────────────────────────────────────

  it("noAnimation=true renders full text immediately", async () => {
    const inst = await renderTypeWriter({ text: "Instant", noAnimation: true });
    expect(inst.lastFrame()).toBe("Instant");
  });

  // ── onComplete callback ─────────────────────────────────────────

  it("calls onComplete when all text is revealed", async () => {
    const onComplete = vi.fn();
    const inst = await renderTypeWriter({ text: "Hi", onComplete });

    // After one tick, only one char revealed — not complete yet
    await tick(TIMING.typewriterNormal);
    expect(inst.lastFrame()).toBe("H");
    expect(onComplete).not.toHaveBeenCalled();

    // All characters revealed — onComplete fires in the subsequent effect
    await tick(TIMING.typewriterNormal);
    await tick(0); // flush the effect that calls onComplete
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("calls onComplete immediately when noAnimation is true", async () => {
    const onComplete = vi.fn();
    await renderTypeWriter({ text: "Hi", noAnimation: true, onComplete });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  // ── Edge cases ──────────────────────────────────────────────────

  it("handles empty string gracefully", async () => {
    const onComplete = vi.fn();
    const inst = await renderTypeWriter({ text: "", onComplete });

    expect(inst.lastFrame()).toBe("");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("handles multi-line text", async () => {
    const text = "Line 1\nLine 2";
    const inst = await renderTypeWriter({ text });

    await tick(TIMING.typewriterNormal * text.length);
    expect(inst.lastFrame()).toBe("Line 1\nLine 2");
  });

  // ── Skip on keypress ───────────────────────────────────────────

  it("pressing any key during animation skips to full text", async () => {
    const onComplete = vi.fn();
    const inst = await renderTypeWriter({ text: "Hello World", onComplete });

    // Partially animated
    await tick(TIMING.typewriterNormal * 3);
    expect(inst.lastFrame()).toBe("Hel");

    // Press a key to skip
    pressKey(inst, keys.space);
    await tick(0);

    expect(inst.lastFrame()).toBe("Hello World");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("keypress after animation completes does not re-trigger onComplete", async () => {
    const onComplete = vi.fn();
    const inst = await renderTypeWriter({ text: "Hi", onComplete });

    // Complete the animation naturally
    await tick(TIMING.typewriterNormal * 2);
    await tick(0);
    expect(onComplete).toHaveBeenCalledOnce();

    // Pressing a key after completion should not re-trigger
    pressKey(inst, keys.space);
    await tick(0);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  // ── Cleanup ─────────────────────────────────────────────────────

  it("clears interval on unmount (no memory leaks)", async () => {
    const spy = vi.spyOn(globalThis, "clearInterval");
    const inst = await renderTypeWriter({ text: "Long text here" });

    // Let it partially render
    await tick(TIMING.typewriterNormal * 3);
    expect(inst.lastFrame()).toBe("Lon");

    // Unmount while animation is still running
    inst.unmount();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
