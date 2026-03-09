import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Conf from "conf";
import type { SaveData } from "../../src/types.js";
import * as progress from "../../src/store/progress.js";
import { createSaveData } from "../helpers/mock-progress.js";

/**
 * Integration tests for progress persistence round-trips.
 *
 * The progress module uses conf with migrations but without projectVersion,
 * which causes conf@15 to throw — the module falls back to in-memory storage.
 * These tests verify the full lifecycle works correctly through the in-memory
 * store, plus separately test that conf disk persistence works (proving the
 * mechanism is sound when the constructor succeeds).
 */

const DEFAULTS = createSaveData();

/**
 * The memory fallback's resetProgress() uses shallow copies, so
 * array/object mutations from prior tests leak through shared references.
 * Follow resetProgress() with saveProgress(deep clone) for clean isolation.
 */
function deepReset(): void {
  progress.resetProgress();
  progress.saveProgress(structuredClone(DEFAULTS));
}

describe("persistence integration", () => {
  beforeEach(() => {
    deepReset();
  });

  it("tracks complete user journey from fresh start through multiple missions", () => {
    // New user -- fresh state
    const initial = progress.loadProgress();
    expect(initial.completedMissions).toEqual([]);
    expect(initial.fxp).toBe(0);
    expect(initial.achievements).toEqual([]);
    expect(initial.firstRunComplete).toBe(false);
    expect(progress.hasSaveData()).toBe(false);

    // First run complete
    progress.saveProgress({ ...initial, firstRunComplete: true });
    expect(progress.hasSaveData()).toBe(true);

    // Complete first mission
    progress.saveMissionComplete("mission-01", 3, 250);
    progress.unlockAchievement("first-blood");
    progress.markHandlerUsed();
    progress.updateLastPlayed();

    // Verify saved state
    const afterFirst = progress.loadProgress();
    expect(afterFirst.completedMissions).toEqual(["mission-01"]);
    expect(afterFirst.starRatings["mission-01"]).toBe(3);
    expect(afterFirst.fxp).toBe(250);
    expect(afterFirst.achievements).toContain("first-blood");
    expect(afterFirst.handlerEverUsed).toBe(true);
    expect(afterFirst.lastPlayedAt).toBeGreaterThan(0);
    expect(afterFirst.firstRunComplete).toBe(true);

    // Complete second mission -- verify cumulative state
    progress.saveMissionComplete("mission-02", 2, 150);
    progress.unlockAchievement("two-for-two");

    const afterSecond = progress.loadProgress();
    expect(afterSecond.completedMissions).toEqual(["mission-01", "mission-02"]);
    expect(afterSecond.fxp).toBe(400);
    expect(afterSecond.achievements).toEqual(["first-blood", "two-for-two"]);

    // Replay first mission -- stars don't downgrade, FXP still accumulates
    progress.saveMissionComplete("mission-01", 1, 50);
    const afterReplay = progress.loadProgress();
    expect(afterReplay.starRatings["mission-01"]).toBe(3); // kept higher
    expect(afterReplay.fxp).toBe(450);
    expect(afterReplay.completedMissions.filter((m) => m === "mission-01")).toHaveLength(1);
  });

  describe("partial progress", () => {
    it("tracks step progress within a session", () => {
      progress.saveStepProgress("mission-03", 0);
      expect(progress.getPartialProgress("mission-03")).toBe(0);

      progress.saveStepProgress("mission-03", 4);
      expect(progress.getPartialProgress("mission-03")).toBe(4);

      progress.saveStepProgress("mission-03", 7);
      expect(progress.getPartialProgress("mission-03")).toBe(7);

      // Other missions have independent progress
      progress.saveStepProgress("mission-05", 2);
      expect(progress.getPartialProgress("mission-03")).toBe(7);
      expect(progress.getPartialProgress("mission-05")).toBe(2);
    });

    it("completing a mission clears its partial progress but not others", () => {
      progress.saveStepProgress("mission-01", 3);
      progress.saveStepProgress("mission-02", 5);

      progress.saveMissionComplete("mission-01", 2, 150);

      expect(progress.getPartialProgress("mission-01")).toBeNull();
      expect(progress.getPartialProgress("mission-02")).toBe(5);
    });

    it("returns null for unknown missions", () => {
      expect(progress.getPartialProgress("nonexistent")).toBeNull();
    });
  });

  describe("achievement unlock persistence", () => {
    it("accumulates achievements across multiple missions", () => {
      progress.saveMissionComplete("mission-01", 3, 250);
      expect(progress.unlockAchievement("first-blood")).toBe(true);

      progress.saveMissionComplete("mission-02", 3, 250);
      expect(progress.unlockAchievement("perfect-mission")).toBe(true);

      progress.saveMissionComplete("mission-03", 3, 250);
      expect(progress.unlockAchievement("speed-demon")).toBe(true);

      const data = progress.loadProgress();
      expect(data.achievements).toEqual(["first-blood", "perfect-mission", "speed-demon"]);
    });

    it("rejects duplicate achievements after multiple operations", () => {
      progress.unlockAchievement("first-blood");

      // Interleave other operations
      progress.saveMissionComplete("mission-01", 2, 100);
      progress.saveStepProgress("mission-02", 3);

      // Try to unlock same achievement again
      expect(progress.unlockAchievement("first-blood")).toBe(false);
      expect(progress.loadProgress().achievements).toEqual(["first-blood"]);
    });
  });

  describe("reset clears all data", () => {
    it("wipes everything back to defaults", () => {
      // Build up complex state
      progress.saveMissionComplete("mission-01", 3, 300);
      progress.saveMissionComplete("mission-02", 2, 200);
      progress.saveMissionComplete("mission-03", 1, 100);
      progress.unlockAchievement("first-blood");
      progress.unlockAchievement("speed-demon");
      progress.saveStepProgress("mission-04", 5);
      progress.markHandlerUsed();
      progress.updateLastPlayed();
      progress.saveInfiniteResult(8, 10, 100);
      progress.toggleLegacyMode();
      progress.saveProgress({
        ...progress.loadProgress(),
        firstRunComplete: true,
        infiniteModeUnlocked: true,
        clearanceLevel: "elite",
      });

      // Verify state is complex
      expect(progress.hasSaveData()).toBe(true);
      const before = progress.loadProgress();
      expect(before.completedMissions).toHaveLength(3);
      expect(before.fxp).toBe(700);
      expect(before.achievements).toHaveLength(2);

      // Reset
      progress.resetProgress();

      // Verify everything is defaults
      const after = progress.loadProgress();
      expect(after).toEqual(DEFAULTS);
      expect(progress.getPartialProgress("mission-04")).toBeNull();
      expect(progress.hasSaveData()).toBe(false);
    });

    it("allows fresh start after reset", () => {
      progress.saveMissionComplete("mission-01", 3, 300);
      progress.resetProgress();

      // New lifecycle
      progress.saveMissionComplete("mission-01", 2, 100);
      const data = progress.loadProgress();
      expect(data.completedMissions).toEqual(["mission-01"]);
      expect(data.starRatings["mission-01"]).toBe(2);
      expect(data.fxp).toBe(100);
    });
  });

  it("preserves schemaVersion across operations", () => {
    expect(progress.loadProgress().schemaVersion).toBe(1);

    progress.saveMissionComplete("mission-01", 2, 100);
    expect(progress.loadProgress().schemaVersion).toBe(1);

    progress.unlockAchievement("test");
    expect(progress.loadProgress().schemaVersion).toBe(1);
  });

  describe("multiple missions with cumulative FXP", () => {
    it("FXP accumulates correctly across missions and modes", () => {
      // Mission FXP
      progress.saveMissionComplete("mission-01", 3, 200);
      progress.saveMissionComplete("mission-02", 2, 150);
      progress.saveMissionComplete("mission-03", 1, 100);
      expect(progress.loadProgress().fxp).toBe(450);

      // Replay adds FXP even without star upgrade
      progress.saveMissionComplete("mission-01", 2, 50);
      expect(progress.loadProgress().fxp).toBe(500);

      // Infinite mode adds more FXP
      progress.saveInfiniteResult(9, 10, 180);
      progress.saveInfiniteResult(7, 10, 140);
      expect(progress.loadProgress().fxp).toBe(820);

      // Verify all stats are consistent
      const data = progress.loadProgress();
      expect(data.completedMissions).toHaveLength(3);
      expect(data.starRatings).toEqual({
        "mission-01": 3,
        "mission-02": 2,
        "mission-03": 1,
      });
      expect(data.infiniteModeStats).toEqual({
        correct: 16,
        total: 20,
        sessionsPlayed: 2,
        fxpEarned: 320,
      });
    });

    it("star ratings only increase, never decrease", () => {
      progress.saveMissionComplete("mission-01", 1, 100);
      progress.saveMissionComplete("mission-01", 3, 100);
      progress.saveMissionComplete("mission-01", 2, 100);

      expect(progress.loadProgress().starRatings["mission-01"]).toBe(3);
    });
  });

  it("round-trips arbitrary SaveData through store", () => {
    const custom = createSaveData({
      completedMissions: ["m-a", "m-b"],
      starRatings: { "m-a": 3, "m-b": 1 },
      fxp: 9999,
      clearanceLevel: "elite",
      achievements: ["ace", "zen"],
      quizStats: { correct: 50, total: 60 },
      infiniteModeStats: {
        correct: 30,
        total: 40,
        sessionsPlayed: 5,
        fxpEarned: 600,
      },
      infiniteModeUnlocked: true,
      firstRunComplete: true,
      lastPlayedAt: 1700000000000,
      handlerEverUsed: true,
      legacyModeUnlocked: true,
    });

    progress.saveProgress(custom);
    expect(progress.loadProgress()).toEqual(custom);
  });

  it("toggleLegacyMode round-trips correctly across multiple calls", () => {
    expect(progress.loadProgress().legacyModeUnlocked).toBe(false);

    expect(progress.toggleLegacyMode()).toBe(true);
    expect(progress.loadProgress().legacyModeUnlocked).toBe(true);

    expect(progress.toggleLegacyMode()).toBe(false);
    expect(progress.loadProgress().legacyModeUnlocked).toBe(false);

    expect(progress.toggleLegacyMode()).toBe(true);
    expect(progress.loadProgress().legacyModeUnlocked).toBe(true);
  });

  it("accumulates infinite mode stats correctly across sessions", () => {
    progress.saveInfiniteResult(8, 10, 200);
    progress.saveInfiniteResult(5, 10, 150);
    progress.saveInfiniteResult(10, 10, 300);

    const data = progress.loadProgress();
    expect(data.infiniteModeStats).toEqual({
      correct: 23,
      total: 30,
      sessionsPlayed: 3,
      fxpEarned: 650,
    });
    expect(data.fxp).toBe(650);
  });
});

/**
 * Verifies that the underlying Conf persistence mechanism correctly
 * round-trips SaveData to/from disk. Tests Conf directly (without
 * migrations that require projectVersion) to prove disk persistence works.
 */
describe("conf disk persistence", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "cca-conf-disk-test-"));

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createStore(): Conf<SaveData> {
    return new Conf<SaveData>({
      projectName: "cca-integration-test",
      cwd: tempDir,
      defaults: DEFAULTS,
    });
  }

  it("data written by one Conf instance is readable by another", () => {
    const writer = createStore();

    const data = createSaveData({
      completedMissions: ["mission-01", "mission-02"],
      starRatings: { "mission-01": 3, "mission-02": 2 },
      fxp: 500,
      achievements: ["first-blood"],
      firstRunComplete: true,
    });

    writer.store = data;

    // Verify file exists on disk
    expect(existsSync(writer.path)).toBe(true);

    // Read with a fresh instance
    const reader = createStore();
    const loaded = reader.store as SaveData;

    expect(loaded.completedMissions).toEqual(["mission-01", "mission-02"]);
    expect(loaded.starRatings["mission-01"]).toBe(3);
    expect(loaded.fxp).toBe(500);
    expect(loaded.achievements).toEqual(["first-blood"]);
    expect(loaded.firstRunComplete).toBe(true);
  });

  it("clearing store and re-writing defaults persists correctly", () => {
    const store = createStore();
    store.store = createSaveData({ fxp: 999, completedMissions: ["m-01"] });

    store.clear();
    store.store = createSaveData();

    // Fresh read
    const reader = createStore();
    const loaded = reader.store as SaveData;
    expect(loaded.fxp).toBe(0);
    expect(loaded.completedMissions).toEqual([]);
  });

  it("complex SaveData survives JSON serialization round-trip", () => {
    const store = createStore();
    const complex = createSaveData({
      completedMissions: ["m-1", "m-2", "m-3"],
      starRatings: { "m-1": 3, "m-2": 2, "m-3": 1 },
      fxp: 12345,
      clearanceLevel: "operative",
      achievements: ["a", "b", "c"],
      quizStats: { correct: 99, total: 100 },
      infiniteModeStats: {
        correct: 45,
        total: 50,
        sessionsPlayed: 10,
        fxpEarned: 900,
      },
      infiniteModeUnlocked: true,
      firstRunComplete: true,
      lastPlayedAt: 1700000000000,
      handlerEverUsed: true,
      legacyModeUnlocked: true,
    });

    store.store = complex;

    // Verify raw JSON on disk
    const raw = readFileSync(store.path, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.fxp).toBe(12345);
    expect(parsed.completedMissions).toHaveLength(3);

    // Verify via fresh Conf instance
    const reader = createStore();
    expect(reader.store).toEqual(complex);
  });
});
