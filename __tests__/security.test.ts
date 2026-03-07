import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { safeApiError } from "../src/ai/client.js";
import { extractJson, safeJsonParse } from "../src/ai/json-utils.js";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(import.meta.dirname, relativePath), "utf-8");
}

// ── safeApiError: API key not leaked ────────────────────────────────

describe("safeApiError hides API key", () => {
  it("returns only message string, not full error object", () => {
    const err = new Error("Request failed");
    (err as Record<string, unknown>).apiKey = "sk-ant-abc123-secret";
    const result = safeApiError(err);
    expect(result).toBe("Request failed");
    expect(result).not.toContain("sk-ant-");
  });

  it("returns generic message for non-Error values", () => {
    expect(safeApiError("sk-ant-leaked-key")).toBe("Unknown error occurred.");
  });

  it("returns generic message for null/undefined", () => {
    expect(safeApiError(null)).toBe("Unknown error occurred.");
    expect(safeApiError(undefined)).toBe("Unknown error occurred.");
  });

  it("returns error.message for plain Error objects", () => {
    expect(safeApiError(new Error("something went wrong"))).toBe("something went wrong");
  });
});

// ── Input length caps ───────────────────────────────────────────────

describe("input length caps", () => {
  it("instructor.ts caps input at 500 characters", () => {
    const src = readSrc("../src/ai/instructor.ts");
    expect(src).toContain("MAX_INPUT_LENGTH = 500");
    expect(src).toContain(".slice(0, MAX_INPUT_LENGTH)");
  });

  it("evaluator.ts caps input at 200 characters", () => {
    const src = readSrc("../src/ai/evaluator.ts");
    expect(src).toContain("MAX_INPUT = 200");
    expect(src).toContain(".slice(0, MAX_INPUT)");
  });
});

// ── JSON extraction handles malicious input ─────────────────────────

describe("extractJson handles malicious input", () => {
  it("does not pollute Object prototype via __proto__", () => {
    safeJsonParse('{"__proto__": {"admin": true}}', null);
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
  });

  it("does not pollute Object prototype via constructor", () => {
    safeJsonParse('{"constructor": {"prototype": {"pwned": true}}}', null);
    expect(({} as Record<string, unknown>).pwned).toBeUndefined();
  });

  it("handles extremely long input without crashing", () => {
    const huge = "{" + '"k":"' + "x".repeat(100_000) + '"}';
    expect(() => safeJsonParse(huge, null)).not.toThrow();
  });

  it("handles nested depth bomb gracefully", () => {
    const deep = "[".repeat(200) + "1" + "]".repeat(200);
    expect(() => safeJsonParse(deep, null)).not.toThrow();
  });

  it("strips markdown fences from malicious payloads", () => {
    const input = '```json\n{"role":"admin","escalate":true}\n```';
    const result = extractJson(input);
    expect(result).toBe('{"role":"admin","escalate":true}');
    expect(JSON.parse(result).role).toBe("admin");
  });

  it("returns raw text for non-JSON (no accidental eval)", () => {
    const xss = '<script>alert("xss")</script>';
    expect(extractJson(xss)).toBe(xss);
    expect(safeJsonParse(xss, "safe")).toBe("safe");
  });
});
