import { describe, it, expect } from "vitest";
import { MODELS, COLORS, TIMING, VERSION } from "../src/constants.js";
import type { Screen, ClearanceLevel } from "../src/types.js";

// ── COLORS ──────────────────────────────────────────────────────────

describe("COLORS", () => {
  it("all values are valid #RRGGBB hex strings", () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const [key, value] of Object.entries(COLORS)) {
      expect(value, `COLORS.${key}`).toMatch(hexPattern);
    }
  });
});

// ── TIMING ──────────────────────────────────────────────────────────

describe("TIMING", () => {
  it("all values are positive numbers", () => {
    for (const [key, value] of Object.entries(TIMING)) {
      expect(value, `TIMING.${key}`).toBeGreaterThan(0);
    }
  });

  it("typewriter speeds are ordered: fast < normal < dramatic", () => {
    expect(TIMING.typewriterFast).toBeLessThan(TIMING.typewriterNormal);
    expect(TIMING.typewriterNormal).toBeLessThan(TIMING.typewriterDramatic);
  });
});

// ── MODELS ──────────────────────────────────────────────────────────

describe("MODELS", () => {
  it("all values are non-empty strings matching claude model ID pattern", () => {
    const claudeIdPattern = /^claude-[a-z0-9]+-[\w.-]+$/;
    for (const [key, value] of Object.entries(MODELS)) {
      expect(value, `MODELS.${key}`).toMatch(claudeIdPattern);
    }
  });
});

// ── VERSION ─────────────────────────────────────────────────────────

describe("VERSION", () => {
  it("matches package.json version", async () => {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json");
    expect(VERSION).toBe(pkg.version);
  });

  it("is a valid semver string", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ── Screen type ─────────────────────────────────────────────────────

describe("Screen type", () => {
  const allScreens: Screen[] = [
    "logo",
    "onboarding",
    "missionMap",
    "briefing",
    "mission",
    "debrief",
    "infiniteMode",
    "credits",
  ];

  it("covers all expected screen values", () => {
    expect(allScreens).toHaveLength(8);
  });

  it("rejects invalid screen values", () => {
    const isScreen = (v: string): v is Screen =>
      (allScreens as string[]).includes(v);
    expect(isScreen("logo")).toBe(true);
    expect(isScreen("nonexistent")).toBe(false);
  });
});

// ── ClearanceLevel type ─────────────────────────────────────────────

describe("ClearanceLevel type", () => {
  const allLevels: ClearanceLevel[] = ["recruit", "operative", "elite"];

  it("covers recruit, operative, and elite", () => {
    expect(allLevels).toHaveLength(3);
  });

  it("rejects invalid clearance levels", () => {
    const isClearanceLevel = (v: string): v is ClearanceLevel =>
      (allLevels as string[]).includes(v);
    expect(isClearanceLevel("recruit")).toBe(true);
    expect(isClearanceLevel("operative")).toBe(true);
    expect(isClearanceLevel("elite")).toBe(true);
    expect(isClearanceLevel("admin")).toBe(false);
  });
});
