import { describe, it, expect, vi, afterEach } from "vitest";
import { NoApiKey } from "../../src/screens/NoApiKey.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  type RenderResult,
} from "../helpers/render-ink.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderNoApiKey(
  onContinue = vi.fn(),
): RenderResult & { onContinue: ReturnType<typeof vi.fn> } {
  const inst = renderInk(<NoApiKey onContinue={onContinue} />);
  return Object.assign(inst, { onContinue });
}

describe("NoApiKey", () => {
  it("renders SIGNAL INTERRUPTED header", () => {
    const { lastFrame } = renderNoApiKey();
    expect(lastFrame()).toContain("SIGNAL INTERRUPTED");
  });

  it("shows API key setup instructions", () => {
    const { lastFrame } = renderNoApiKey();
    const frame = lastFrame();
    expect(frame).toContain("Setup Instructions");
    expect(frame).toContain("ANTHROPIC_API_KEY");
    expect(frame).toContain("console.anthropic.com");
  });

  it("shows cost estimate", () => {
    const { lastFrame } = renderNoApiKey();
    expect(lastFrame()).toContain("$0.05-0.15 per mission");
  });

  it("calls onContinue on any key press", () => {
    const onContinue = vi.fn();
    const inst = renderNoApiKey(onContinue);

    pressKey(inst, "a");
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("calls onContinue on enter", () => {
    const onContinue = vi.fn();
    const inst = renderNoApiKey(onContinue);

    pressKey(inst, keys.enter);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("calls onContinue on each key press", () => {
    const onContinue = vi.fn();
    const inst = renderNoApiKey(onContinue);

    pressKey(inst, "x");
    pressKey(inst, "y");
    pressKey(inst, keys.space);

    expect(onContinue).toHaveBeenCalledTimes(3);
  });

  it("shows continue without AI prompt", () => {
    const { lastFrame } = renderNoApiKey();
    expect(lastFrame()).toContain("[ANY KEY] Continue without AI");
  });
});
