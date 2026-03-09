import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Handler } from "../../src/screens/Handler.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  type,
  type RenderResult,
} from "../helpers/render-ink.js";
import { TIMING } from "../../src/constants.js";

// ── Mocks ─────────────────────────────────────────────────────────────

vi.mock("../../src/ai/instructor.js", () => ({
  askHandler: vi.fn(),
}));

vi.mock("../../src/lib/easter-eggs.js", () => ({
  getLoadingMessage: vi.fn(() => "Decrypting"),
}));

vi.mock("../../src/ai/client.js", () => ({
  safeApiError: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
  ),
}));

import { askHandler } from "../../src/ai/instructor.js";

const mockAskHandler = vi.mocked(askHandler);

// ── Setup / Teardown ──────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockAskHandler.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Helpers ───────────────────────────────────────────────────────────

async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.advanceTimersByTimeAsync(0);
}

interface HandlerTestProps {
  missionTitle: string;
  topicContext: string;
  onClose: () => void;
}

function defaultProps(overrides?: Partial<HandlerTestProps>): HandlerTestProps {
  return {
    missionTitle: "SHADOW NET",
    topicContext: "Learn about Claude Code CLI",
    onClose: overrides?.onClose ?? vi.fn(),
    ...overrides,
  };
}

async function renderHandler(
  props: HandlerTestProps,
): Promise<RenderResult> {
  const inst = renderInk(<Handler {...props} />);
  await tick(0);
  return inst;
}

/** Submit a question into the text input */
async function submitQuestion(
  inst: RenderResult,
  question: string,
): Promise<void> {
  type(inst, question);
  pressKey(inst, keys.enter);
  await tick(0);
}

/**
 * Configure mockAskHandler to call onChunk with the given chunks,
 * then resolve with the full text.
 */
function mockStreamingResponse(chunks: string[]): void {
  mockAskHandler.mockImplementation(async (opts) => {
    const full = chunks.join("");
    for (const chunk of chunks) {
      opts.onChunk(chunk);
    }
    return full;
  });
}

/**
 * Configure mockAskHandler to call onChunk progressively,
 * returning a promise that the caller can resolve later.
 */
function mockPendingResponse(): {
  sendChunk: (text: string) => void;
  resolve: (fullText: string) => void;
  reject: (err: Error) => void;
} {
  let onChunk: ((text: string) => void) | null = null;
  let resolveFn: ((value: string) => void) | null = null;
  let rejectFn: ((err: Error) => void) | null = null;

  mockAskHandler.mockImplementation(async (opts) => {
    onChunk = opts.onChunk;
    return new Promise<string>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
  });

  return {
    sendChunk: (text: string) => onChunk?.(text),
    resolve: (fullText: string) => resolveFn?.(fullText),
    reject: (err: Error) => rejectFn?.(err),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("Handler", () => {
  // ── Rendering ─────────────────────────────────────────────────────

  it("renders HANDLER header", async () => {
    const props = defaultProps();
    const inst = await renderHandler(props);
    expect(inst.lastFrame()).toContain("[ HANDLER ]");
  });

  it("renders input placeholder", async () => {
    const props = defaultProps();
    const inst = await renderHandler(props);
    expect(inst.lastFrame()).toContain("Ask your handler...");
  });

  it("renders ESC to close hint when idle", async () => {
    const props = defaultProps();
    const inst = await renderHandler(props);
    expect(inst.lastFrame()).toContain("ESC to close");
  });

  // ── Thinking animation ────────────────────────────────────────────

  it("shows thinking animation while waiting for response", async () => {
    const pending = mockPendingResponse();
    const props = defaultProps();
    const inst = await renderHandler(props);

    await submitQuestion(inst, "How do I use Claude?");

    // Flush the tokenBuffer so streamedText stays empty
    await tick(TIMING.tokenBuffer + 1);

    const frame = inst.lastFrame()!;
    expect(frame).toContain("Decrypting");

    // Advance dots animation
    await tick(TIMING.thinkingDots);
    const frameWithDot = inst.lastFrame()!;
    expect(frameWithDot).toMatch(/Decrypting\s*\.+/);

    // Clean up
    pending.resolve("response");
    await tick(0);
  });

  it("shows ESC to cancel while streaming", async () => {
    const pending = mockPendingResponse();
    const props = defaultProps();
    const inst = await renderHandler(props);

    await submitQuestion(inst, "Hello");
    await tick(TIMING.tokenBuffer + 1);

    expect(inst.lastFrame()).toContain("ESC to cancel");

    pending.resolve("done");
    await tick(0);
  });

  // ── Streaming response ────────────────────────────────────────────

  it("displays streamed text progressively", async () => {
    const pending = mockPendingResponse();
    const props = defaultProps();
    const inst = await renderHandler(props);

    await submitQuestion(inst, "What is Claude?");

    // Send first chunk
    pending.sendChunk("Claude is ");
    await tick(TIMING.tokenBuffer + 1);

    expect(inst.lastFrame()).toContain("Claude is");

    // Send second chunk
    pending.sendChunk("an AI assistant");
    await tick(TIMING.tokenBuffer + 1);

    expect(inst.lastFrame()).toContain("Claude is an AI assistant");

    pending.resolve("Claude is an AI assistant");
    await tick(0);
  });

  // ── Conversation history ──────────────────────────────────────────

  it("maintains conversation history between questions", async () => {
    mockStreamingResponse(["First answer"]);
    const props = defaultProps();
    const inst = await renderHandler(props);

    // Ask first question
    await submitQuestion(inst, "Question one");
    await tick(TIMING.tokenBuffer + 1);

    // History should show the user message
    const frame1 = inst.lastFrame()!;
    expect(frame1).toContain("> Question one");
    expect(frame1).toContain("First answer");

    // Ask second question - askHandler should receive history
    mockStreamingResponse(["Second answer"]);
    await submitQuestion(inst, "Question two");
    await tick(TIMING.tokenBuffer + 1);

    // Verify askHandler received conversation history
    const lastCall = mockAskHandler.mock.calls[1]!;
    expect(lastCall[0].conversationHistory).toEqual([
      { role: "user", content: "Question one" },
      { role: "assistant", content: "First answer" },
    ]);

    const frame2 = inst.lastFrame()!;
    expect(frame2).toContain("> Question two");
    expect(frame2).toContain("Second answer");
  });

  // ── Error state ───────────────────────────────────────────────────

  it("shows error message and retry prompt on failure", async () => {
    mockAskHandler.mockRejectedValueOnce(new Error("API rate limit"));
    const props = defaultProps();
    const inst = await renderHandler(props);

    await submitQuestion(inst, "Break it");
    await tick(TIMING.tokenBuffer + 1);

    const frame = inst.lastFrame()!;
    expect(frame).toContain("API rate limit");
    expect(frame).toContain("Press Enter to retry");
  });

  it("retries last question on Enter after error", async () => {
    mockAskHandler.mockRejectedValueOnce(new Error("Temporary failure"));
    const props = defaultProps();
    const inst = await renderHandler(props);

    await submitQuestion(inst, "My question");
    await tick(TIMING.tokenBuffer + 1);

    // Now set up success for retry
    mockStreamingResponse(["Recovered answer"]);

    // Type something so input is non-empty (handleSubmit checks trimmed)
    type(inst, "retry");
    pressKey(inst, keys.enter);
    await tick(TIMING.tokenBuffer + 1);

    // askHandler should have been called again with the original question
    expect(mockAskHandler).toHaveBeenCalledTimes(2);
    expect(mockAskHandler.mock.calls[1]![0].question).toBe("My question");
  });

  // ── ESC behavior ──────────────────────────────────────────────────

  it("ESC calls onClose when not streaming", async () => {
    const onClose = vi.fn();
    const props = defaultProps({ onClose });
    const inst = await renderHandler(props);

    pressKey(inst, keys.escape);
    await tick(0);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ESC aborts streaming instead of closing", async () => {
    const pending = mockPendingResponse();
    const onClose = vi.fn();
    const props = defaultProps({ onClose });
    const inst = await renderHandler(props);

    await submitQuestion(inst, "Stream me");

    pressKey(inst, keys.escape);
    await tick(0);

    // Should not close the overlay while streaming
    expect(onClose).not.toHaveBeenCalled();

    // Clean up - the abort causes askHandler to resolve with ""
    pending.resolve("");
    await tick(0);
  });

  // ── AbortController ───────────────────────────────────────────────

  it("passes signal to askHandler for abort support", async () => {
    const pending = mockPendingResponse();
    const props = defaultProps();
    const inst = await renderHandler(props);

    await submitQuestion(inst, "Abort test");

    // Verify signal was passed
    const call = mockAskHandler.mock.calls[0]!;
    expect(call[0].signal).toBeInstanceOf(AbortSignal);

    pending.resolve("");
    await tick(0);
  });

  // ── Input guarding ────────────────────────────────────────────────

  it("ignores empty input submission", async () => {
    const props = defaultProps();
    const inst = await renderHandler(props);

    pressKey(inst, keys.enter);
    await tick(0);

    expect(mockAskHandler).not.toHaveBeenCalled();
  });
});
