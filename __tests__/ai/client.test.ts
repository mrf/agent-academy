import { describe, it, expect, vi } from "vitest";

const { mockClient, MockAPIError } = vi.hoisted(() => {
  const client = {
    messages: { create: vi.fn() },
  };

  class MockAPIError extends Error {
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
  }

  return { mockClient: client, MockAPIError };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = mockClient.messages;
    static APIError = MockAPIError;
  },
}));

const { safeApiError, client } = await import("../../src/ai/client.js");
const Anthropic = (await import("@anthropic-ai/sdk")).default;

// ── safeApiError ─────────────────────────────────────────────────────

describe("safeApiError", () => {
  describe("APIError handling", () => {
    it("returns auth message for 401", () => {
      const err = new Anthropic.APIError(401, null, "Unauthorized", {});
      expect(safeApiError(err)).toBe(
        "API key appears invalid. Check ANTHROPIC_API_KEY.",
      );
    });

    it("returns rate limit message for 429", () => {
      const err = new Anthropic.APIError(429, null, "Too many requests", {});
      expect(safeApiError(err)).toBe(
        "Rate limited. Wait a moment and try again.",
      );
    });

    it("returns overloaded message for 529", () => {
      const err = new Anthropic.APIError(529, null, "Overloaded", {});
      expect(safeApiError(err)).toBe(
        "API is overloaded. Try again shortly.",
      );
    });

    it("returns raw message for other API errors", () => {
      const err = new Anthropic.APIError(
        500,
        null,
        "Internal server error",
        {},
      );
      expect(safeApiError(err)).toBe("Internal server error");
    });
  });

  describe("non-API errors", () => {
    it("returns message for network errors", () => {
      const err = new TypeError("fetch failed");
      expect(safeApiError(err)).toBe("fetch failed");
    });

    it("returns message for generic Error", () => {
      expect(safeApiError(new Error("something broke"))).toBe(
        "something broke",
      );
    });

    it("returns unknown message for non-Error values", () => {
      expect(safeApiError("string error")).toBe("Unknown error occurred.");
      expect(safeApiError(42)).toBe("Unknown error occurred.");
      expect(safeApiError(null)).toBe("Unknown error occurred.");
      expect(safeApiError(undefined)).toBe("Unknown error occurred.");
    });
  });

  describe("API key stripping", () => {
    it("never exposes API key attached to error object", () => {
      const err = new Error("Request failed");
      (err as Record<string, unknown>).apiKey = "sk-ant-secret-key";
      const result = safeApiError(err);
      expect(result).toBe("Request failed");
      expect(result).not.toContain("sk-ant-");
    });

    it("returns only string, not the error object", () => {
      const err = new Anthropic.APIError(401, null, "invalid x-api-key", {});
      const result = safeApiError(err);
      expect(typeof result).toBe("string");
      expect(result).toBe(
        "API key appears invalid. Check ANTHROPIC_API_KEY.",
      );
    });
  });
});

// ── Client instance ──────────────────────────────────────────────────

describe("client instance", () => {
  it("is an Anthropic client", () => {
    expect(client).toBeInstanceOf(Anthropic);
  });

  it("has messages.create method", () => {
    expect(typeof client.messages.create).toBe("function");
  });
});
