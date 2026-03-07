import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockStreamFn = vi.fn();
const mockSafeApiError = vi.fn((err: unknown) => {
  if (err instanceof Error) return err.message;
  return "Unknown error occurred.";
});

vi.mock("../../src/ai/client.js", () => ({
  client: {
    messages: {
      stream: mockStreamFn,
    },
  },
  safeApiError: mockSafeApiError,
}));

function createMockStream(chunks: string[], stopReason = "end_turn") {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) {
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text },
        };
      }
    },
    abort: vi.fn(),
    finalMessage: vi.fn(async () => ({ stop_reason: stopReason })),
  };
}

function defaultOptions(overrides: Record<string, unknown> = {}) {
  return {
    question: "How do I use Claude Code?",
    missionTitle: "Test Mission",
    topicContext: "CLI basics",
    conversationHistory: [] as Array<{
      role: "user" | "assistant";
      content: string;
    }>,
    onChunk: vi.fn(),
    ...overrides,
  };
}

describe("askHandler", () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>;
  let time: number;

  beforeEach(() => {
    vi.resetModules();
    mockStreamFn.mockReset();
    mockSafeApiError.mockClear();
    time = 100_000;
    dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => {
      time += 3000;
      return time;
    });
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  async function getAskHandler() {
    const mod = await import("../../src/ai/instructor.js");
    return mod.askHandler;
  }

  it("streams responses via onChunk callback", async () => {
    const askHandler = await getAskHandler();
    const stream = createMockStream(["Hello", " world"]);
    mockStreamFn.mockReturnValue(stream);

    const onChunk = vi.fn();
    const result = await askHandler(defaultOptions({ onChunk }));

    expect(onChunk).toHaveBeenCalledWith("Hello");
    expect(onChunk).toHaveBeenCalledWith(" world");
    expect(result).toBe("Hello world");
  });

  it("enforces 500 char input cap", async () => {
    const askHandler = await getAskHandler();
    const stream = createMockStream(["ok"]);
    mockStreamFn.mockReturnValue(stream);

    const longQuestion = "x".repeat(600);
    await askHandler(defaultOptions({ question: longQuestion }));

    const callArgs = mockStreamFn.mock.calls[0][0];
    const userMessage = callArgs.messages[callArgs.messages.length - 1];
    expect(userMessage.content).toHaveLength(500);
  });

  it("sliding window history keeps last 8 messages", async () => {
    const askHandler = await getAskHandler();
    const stream = createMockStream(["ok"]);
    mockStreamFn.mockReturnValue(stream);

    const history = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `message-${i}`,
    }));

    await askHandler(defaultOptions({ conversationHistory: history }));

    const callArgs = mockStreamFn.mock.calls[0][0];
    // 8 from history window + 1 new user message = 9
    expect(callArgs.messages).toHaveLength(9);
    // First message should be message-4 (12 - 8 = 4)
    expect(callArgs.messages[0].content).toBe("message-4");
  });

  it("system prompt includes scope boundary", async () => {
    const askHandler = await getAskHandler();
    const stream = createMockStream(["ok"]);
    mockStreamFn.mockReturnValue(stream);

    await askHandler(defaultOptions());

    const callArgs = mockStreamFn.mock.calls[0][0];
    expect(callArgs.system).toContain(
      "Only answer questions about Claude Code",
    );
    expect(callArgs.system).toContain("Test Mission");
    expect(callArgs.system).toContain("CLI basics");
  });

  it("AbortController signal cancels streaming", async () => {
    const askHandler = await getAskHandler();
    const controller = new AbortController();

    const err = new Error("Request aborted");
    err.name = "AbortError";

    const stream = {
      async *[Symbol.asyncIterator]() {
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "partial" },
        };
        throw err;
      },
      abort: vi.fn(),
      finalMessage: vi.fn(),
    };
    mockStreamFn.mockReturnValue(stream);
    controller.abort();

    const result = await askHandler(
      defaultOptions({ signal: controller.signal }),
    );
    expect(result).toBe("");
  });

  it("session cap of 20 questions returns credits-used message", async () => {
    const askHandler = await getAskHandler();

    mockStreamFn.mockImplementation(() => createMockStream(["ok"]));
    for (let i = 0; i < 20; i++) {
      await askHandler(defaultOptions());
    }

    const onChunk = vi.fn();
    const result = await askHandler(defaultOptions({ onChunk }));

    expect(result).toContain("Handler credits used");
    expect(onChunk).toHaveBeenCalledWith(
      expect.stringContaining("Handler credits used"),
    );
  });

  it("appends '...' when stop_reason is max_tokens", async () => {
    const askHandler = await getAskHandler();
    const stream = createMockStream(["truncated response"], "max_tokens");
    mockStreamFn.mockReturnValue(stream);

    const onChunk = vi.fn();
    const result = await askHandler(defaultOptions({ onChunk }));

    expect(result).toBe("truncated response...");
    expect(onChunk).toHaveBeenCalledWith("...");
  });

  it("error handling returns safeApiError message", async () => {
    const askHandler = await getAskHandler();
    const apiError = new Error("Rate limited");

    const stream = {
      async *[Symbol.asyncIterator]() {
        throw apiError;
      },
      abort: vi.fn(),
      finalMessage: vi.fn(),
    };
    mockStreamFn.mockReturnValue(stream);
    mockSafeApiError.mockReturnValue(
      "Rate limited. Wait a moment and try again.",
    );

    await expect(askHandler(defaultOptions())).rejects.toThrow(
      "Rate limited. Wait a moment and try again.",
    );
    expect(mockSafeApiError).toHaveBeenCalledWith(apiError);
  });
});
