import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSaveData } from "../helpers/mock-progress.js";

// Hoist mock functions so they're available in both mock factories and tests
const { mockAppendFileSync, mockMkdirSync } = vi.hoisted(() => ({
  mockAppendFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
}));

// Mock conf with in-memory implementation (deep clone to match real Conf's JSON round-trip)
vi.mock("conf", () => ({
  default: class MockConf {
    private data: Record<string, unknown>;
    constructor(opts?: { defaults?: Record<string, unknown> }) {
      this.data = structuredClone(opts?.defaults ?? {});
    }
    get store() {
      return structuredClone(this.data);
    }
    set store(val: Record<string, unknown>) {
      this.data = structuredClone(val);
    }
    has(key: string) {
      return key in this.data;
    }
    set(key: string, val: unknown) {
      (this.data as Record<string, unknown>)[key] = structuredClone(val);
    }
    clear() {
      this.data = {};
    }
  },
}));

// Mock node:fs for reportBadQuestion
vi.mock("node:fs", () => ({
  appendFileSync: mockAppendFileSync,
  mkdirSync: mockMkdirSync,
}));

const progress = await import("../../src/store/progress.js");

describe("progress store", () => {
  beforeEach(() => {
    progress.resetProgress();
    mockAppendFileSync.mockReset();
    mockMkdirSync.mockReset();
  });

  describe("loadProgress", () => {
    it("returns default SaveData initially", () => {
      expect(progress.loadProgress()).toEqual(createSaveData());
    });
  });

  describe("saveProgress / loadProgress round-trip", () => {
    it("persists and retrieves data", () => {
      const custom = createSaveData({ fxp: 500, firstRunComplete: true });
      progress.saveProgress(custom);
      expect(progress.loadProgress()).toEqual(custom);
    });
  });

  describe("saveMissionComplete", () => {
    it("adds mission to completedMissions", () => {
      progress.saveMissionComplete("m-01", 2, 100);
      expect(progress.loadProgress().completedMissions).toContain("m-01");
    });

    it("does not duplicate mission on repeat completion", () => {
      progress.saveMissionComplete("m-01", 2, 100);
      progress.saveMissionComplete("m-01", 3, 50);
      const missions = progress.loadProgress().completedMissions;
      expect(missions.filter((m) => m === "m-01")).toHaveLength(1);
    });

    it("updates stars only if higher", () => {
      progress.saveMissionComplete("m-01", 2, 100);
      progress.saveMissionComplete("m-01", 1, 50);
      expect(progress.loadProgress().starRatings["m-01"]).toBe(2);

      progress.saveMissionComplete("m-01", 3, 50);
      expect(progress.loadProgress().starRatings["m-01"]).toBe(3);
    });

    it("accumulates FXP", () => {
      progress.saveMissionComplete("m-01", 2, 100);
      progress.saveMissionComplete("m-02", 3, 200);
      expect(progress.loadProgress().fxp).toBe(300);
    });

    it("clears partial progress for completed mission", () => {
      progress.saveStepProgress("m-01", 3);
      expect(progress.getPartialProgress("m-01")).toBe(3);

      progress.saveMissionComplete("m-01", 2, 100);
      expect(progress.getPartialProgress("m-01")).toBeNull();
    });

    it("records improved mission when replay yields higher stars", () => {
      progress.saveMissionComplete("m-01", 2, 100);
      progress.saveMissionComplete("m-01", 3, 50);
      expect(progress.loadProgress().improvedMissions).toContain("m-01");
    });

    it("does not record improved mission on first completion", () => {
      progress.saveMissionComplete("m-01", 3, 100);
      expect(progress.loadProgress().improvedMissions).not.toContain("m-01");
    });

    it("does not record improved mission when replay yields same or lower stars", () => {
      progress.saveMissionComplete("m-01", 3, 100);
      progress.saveMissionComplete("m-01", 2, 50);
      expect(progress.loadProgress().improvedMissions).not.toContain("m-01");
    });

    it("does not duplicate improved mission in list", () => {
      progress.saveMissionComplete("m-01", 1, 100);
      progress.saveMissionComplete("m-01", 2, 50);
      progress.saveMissionComplete("m-01", 3, 50);
      const improved = progress.loadProgress().improvedMissions;
      expect(improved.filter((m) => m === "m-01")).toHaveLength(1);
    });
  });

  describe("saveStepProgress / getPartialProgress", () => {
    it("round-trips step progress", () => {
      progress.saveStepProgress("m-01", 5);
      expect(progress.getPartialProgress("m-01")).toBe(5);
    });

    it("returns null for unknown mission", () => {
      expect(progress.getPartialProgress("unknown")).toBeNull();
    });

    it("overwrites previous step index", () => {
      progress.saveStepProgress("m-01", 2);
      progress.saveStepProgress("m-01", 7);
      expect(progress.getPartialProgress("m-01")).toBe(7);
    });
  });

  describe("resetProgress", () => {
    it("wipes all data back to defaults", () => {
      progress.saveMissionComplete("m-01", 3, 500);
      progress.saveStepProgress("m-01", 4);
      progress.unlockAchievement("test-ach");

      progress.resetProgress();

      expect(progress.loadProgress()).toEqual(createSaveData());
      expect(progress.getPartialProgress("m-01")).toBeNull();
    });
  });

  describe("unlockAchievement", () => {
    it("adds achievement and returns true", () => {
      expect(progress.unlockAchievement("first-blood")).toBe(true);
      expect(progress.loadProgress().achievements).toContain("first-blood");
    });

    it("returns false for duplicate", () => {
      progress.unlockAchievement("first-blood");
      expect(progress.unlockAchievement("first-blood")).toBe(false);
    });

    it("does not duplicate achievement in list", () => {
      progress.unlockAchievement("first-blood");
      progress.unlockAchievement("first-blood");
      expect(progress.loadProgress().achievements).toEqual(["first-blood"]);
    });
  });

  describe("markHandlerUsed", () => {
    it("sets handlerEverUsed flag", () => {
      expect(progress.loadProgress().handlerEverUsed).toBe(false);
      progress.markHandlerUsed();
      expect(progress.loadProgress().handlerEverUsed).toBe(true);
    });

    it("is idempotent", () => {
      progress.markHandlerUsed();
      progress.markHandlerUsed();
      expect(progress.loadProgress().handlerEverUsed).toBe(true);
    });
  });

  describe("updateLastPlayed", () => {
    it("updates timestamp", () => {
      const before = Date.now();
      progress.updateLastPlayed();
      const after = Date.now();
      const ts = progress.loadProgress().lastPlayedAt;
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe("saveInfiniteResult", () => {
    it("accumulates stats correctly", () => {
      progress.saveInfiniteResult(8, 10, 200);
      progress.saveInfiniteResult(5, 10, 150);

      const data = progress.loadProgress();
      expect(data.infiniteModeStats).toEqual({
        correct: 13,
        total: 20,
        sessionsPlayed: 2,
        fxpEarned: 350,
      });
      expect(data.fxp).toBe(350);
    });
  });

  describe("reportBadQuestion", () => {
    it("writes to JSONL", () => {
      progress.reportBadQuestion("What is X?", "git", "easy");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(".claude-code-academy"),
        { recursive: true },
      );
      expect(mockAppendFileSync).toHaveBeenCalledOnce();
      const [path, content] = mockAppendFileSync.mock.calls[0];
      expect(path).toContain("reported-questions.jsonl");
      const parsed = JSON.parse((content as string).trim());
      expect(parsed.question).toBe("What is X?");
      expect(parsed.topic).toBe("git");
      expect(parsed.difficulty).toBe("easy");
      expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("does not throw when fs operations fail", () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error("EACCES");
      });
      expect(() =>
        progress.reportBadQuestion("q", "t", "d"),
      ).not.toThrow();
    });
  });

  describe("toggleLegacyMode", () => {
    it("toggles and returns new state", () => {
      expect(progress.toggleLegacyMode()).toBe(true);
      expect(progress.loadProgress().legacyModeUnlocked).toBe(true);

      expect(progress.toggleLegacyMode()).toBe(false);
      expect(progress.loadProgress().legacyModeUnlocked).toBe(false);
    });
  });

  describe("hasSaveData", () => {
    it("returns false for fresh data", () => {
      expect(progress.hasSaveData()).toBe(false);
    });

    it("returns true after completing a mission", () => {
      progress.saveMissionComplete("m-01", 2, 100);
      expect(progress.hasSaveData()).toBe(true);
    });

    it("returns true when fxp > 0", () => {
      progress.saveProgress(createSaveData({ fxp: 10 }));
      expect(progress.hasSaveData()).toBe(true);
    });

    it("returns true when firstRunComplete", () => {
      progress.saveProgress(createSaveData({ firstRunComplete: true }));
      expect(progress.hasSaveData()).toBe(true);
    });
  });
});

// Memory fallback — conf constructor throws
describe("memory fallback when conf throws", () => {
  it("falls back to in-memory storage", async () => {
    vi.resetModules();

    vi.doMock("conf", () => ({
      default: class ThrowingConf {
        constructor() {
          throw new Error("FUSE/WSL2 not supported");
        }
      },
    }));
    vi.doMock("node:fs", () => ({
      appendFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    }));

    const fallback = await import("../../src/store/progress.js");

    const data = fallback.loadProgress();
    expect(data).toEqual(createSaveData());

    fallback.saveMissionComplete("m-01", 3, 100);
    const updated = fallback.loadProgress();
    expect(updated.completedMissions).toContain("m-01");
    expect(updated.fxp).toBe(100);
  });
});
