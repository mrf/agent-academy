import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logo } from "../../src/screens/Logo.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  tick,
  type RenderResult,
} from "../helpers/render-ink.js";
import { TIMING, VERSION } from "../../src/constants.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Character lengths of each phase's TypeWriter text
const LOGO_LEN = 257;
const SUBTITLE_LEN = 17; // "[ A C A D E M Y ]"
const DIVISION_LEN = 51; // "TERMINAL TRAINING DIVISION\nCLEARANCE LEVEL: PENDING"
const PROMPT_LEN = 26; // "[ENTER] Begin recruitment"

/** Enough time for a TypeWriter to finish a string of given length. */
function twDuration(length: number, speed: "dramatic" | "normal") {
  const interval =
    speed === "dramatic" ? TIMING.typewriterDramatic : TIMING.typewriterNormal;
  return interval * (length + 2);
}

// Phase completion helpers — each separated so React can process state between phases
async function completeLogo() {
  await tick(twDuration(LOGO_LEN, "dramatic"));
}
async function completeSubtitle() {
  await tick(twDuration(SUBTITLE_LEN, "dramatic"));
}
async function completeDivision() {
  await tick(twDuration(DIVISION_LEN, "normal"));
}
async function completePrompt() {
  await tick(twDuration(PROMPT_LEN, "normal"));
}

async function renderLogo(
  onContinue = vi.fn(),
): Promise<RenderResult & { onContinue: ReturnType<typeof vi.fn> }> {
  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);
  const inst = renderInk(<Logo onContinue={onContinue} />);
  await tick(0);
  stdoutSpy.mockRestore();
  return Object.assign(inst, { onContinue });
}

// ── Tests ───────────────────────────────────────────────────────────

describe("Logo", () => {
  // ── ASCII art rendering ─────────────────────────────────────────

  it("renders ASCII logo characters as the typewriter progresses", async () => {
    const { lastFrame } = await renderLogo();

    await tick(TIMING.typewriterDramatic * 5);
    expect(lastFrame()).toContain("█");
  });

  it("starts in logo phase — subtitle/division/prompt not yet visible", async () => {
    const { lastFrame } = await renderLogo();

    const frame = lastFrame();
    expect(frame).not.toContain("A C A D E M Y");
    expect(frame).not.toContain("TERMINAL TRAINING DIVISION");
    expect(frame).not.toContain("PRESS [ENTER]");
  });

  // ── Phase progression ───────────────────────────────────────────

  it("advances to subtitle phase after logo typewriter completes", async () => {
    const { lastFrame } = await renderLogo();

    await completeLogo();
    // Extra tick so the subtitle TypeWriter mounts and starts typing
    await tick(TIMING.typewriterDramatic * 3);

    // Subtitle has begun — partial text from "[ A C A D E M Y ]"
    expect(lastFrame()).toContain("[ A");
  });

  it("advances to division phase after subtitle completes", async () => {
    const { lastFrame } = await renderLogo();

    await completeLogo();
    await completeSubtitle();
    await tick(TIMING.typewriterNormal * 3);

    // Division has begun — partial text from "TERMINAL TRAINING DIVISION"
    expect(lastFrame()).toContain("TER");
  });

  it("advances to prompt phase after division completes", async () => {
    const { lastFrame } = await renderLogo();

    await completeLogo();
    await completeSubtitle();
    await completeDivision();
    await tick(TIMING.typewriterNormal * 3);

    // Prompt has begun — partial text from "[ENTER] Begin recruitment"
    expect(lastFrame()).toContain("[E");
  });

  it("shows version after all phases complete (ready phase)", async () => {
    const { lastFrame } = await renderLogo();

    await completeLogo();
    await completeSubtitle();
    await completeDivision();
    await completePrompt();

    expect(lastFrame()).toContain(`v${VERSION}`);
  });

  // ── ENTER key ─────────────────────────────────────────────────────

  it("calls onContinue when ENTER is pressed", async () => {
    const onContinue = vi.fn();
    const inst = await renderLogo(onContinue);

    pressKey(inst, keys.enter);
    await tick(0);

    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("calls onContinue on each ENTER press", async () => {
    const onContinue = vi.fn();
    const inst = await renderLogo(onContinue);

    pressKey(inst, keys.enter);
    await tick(0);
    pressKey(inst, keys.enter);
    await tick(0);

    expect(onContinue).toHaveBeenCalledTimes(2);
  });

  it("does not call onContinue for non-ENTER keys", async () => {
    const onContinue = vi.fn();
    const inst = await renderLogo(onContinue);

    pressKey(inst, keys.space);
    await tick(0);
    pressKey(inst, keys.arrowUp);
    await tick(0);
    inst.stdin.write("a");
    await tick(0);

    expect(onContinue).not.toHaveBeenCalled();
  });

  // ── Full boot sequence ────────────────────────────────────────────

  it("completes full boot sequence without errors", async () => {
    const { lastFrame } = await renderLogo();

    await completeLogo();
    await completeSubtitle();
    await completeDivision();
    await completePrompt();

    const frame = lastFrame();
    expect(frame).toContain("█");
    expect(frame).toContain("A C A D E M Y");
    expect(frame).toContain("TERMINAL TRAINING DIVISION");
    expect(frame).toContain("[ENTER] Begin recruitment");
    expect(frame).toContain(`v${VERSION}`);
  });

  it("does not set terminal title on mount (handled by app)", async () => {
    const spy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    renderInk(<Logo onContinue={vi.fn()} />);
    await tick(0);

    // Terminal title is now set by the App component, not Logo
    expect(spy).not.toHaveBeenCalledWith(
      expect.stringContaining("Agent Academy"),
    );
  });

  // ── Cleanup ───────────────────────────────────────────────────────

  it("unmounts cleanly during animation", async () => {
    const inst = await renderLogo();

    await tick(TIMING.typewriterDramatic * 10);

    expect(() => inst.unmount()).not.toThrow();
  });
});
