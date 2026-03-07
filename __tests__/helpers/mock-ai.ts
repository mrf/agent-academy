import type { Mock } from "vitest";
import { vi } from "vitest";

type MockClient = {
  messages: { create: Mock };
};

type StreamEvent = {
  type: string;
  delta?: { text?: string };
};

type MockStream = {
  [Symbol.asyncIterator](): AsyncIterator<StreamEvent>;
};

export function createMockAnthropicClient(): MockClient {
  return {
    messages: {
      create: vi.fn(),
    },
  };
}

export function createStreamingResponse(chunks: string[]): MockStream {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) {
        yield { type: "content_block_delta", delta: { text } };
      }
    },
  };
}

type MessageResponse = {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
};

export function createMessageResponse(content: string): MessageResponse {
  return {
    id: "msg_test_123",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: content }],
    model: "claude-haiku-4-5-20251001",
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

type ApiError = Error & { status: number };

export function createApiError(status: number, message: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.name = "APIError";
  return error;
}

export function mockAnthropicModule(): MockClient {
  const mockClient = createMockAnthropicClient();

  vi.mock("@anthropic-ai/sdk", () => ({
    default: class MockAnthropic {
      messages = mockClient.messages;
      static APIError = class extends Error {
        status: number;
        constructor(
          status: number,
          _error: unknown,
          message: string,
          _headers: Record<string, string>,
        ) {
          super(message);
          this.status = status;
          this.name = "APIError";
        }
      };
    },
  }));

  return mockClient;
}
