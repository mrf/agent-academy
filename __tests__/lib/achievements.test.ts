import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSaveData } from "../helpers/mock-progress.js";

vi.mock("../../src/store/progress.js", () => ({
  loadProgress: vi.fn(),
  unlockAchievement: vi.fn(),
}));

import {
  checkMissionComplete,
  checkPersistence,
  checkHandlerOpen,
  type MissionCompleteContext,
} from "../../src/lib/achievements.js";
import { loadProgress, unlockAchievement } from "../../src/store/progress.js";
import { MISSIONS } from "../../src/data/curriculum.js";

const mockLoadProgress = vi.mocked(loadProgress);
const mockUnlockAchievement = vi.mocked(unlockAchievement);

const allMissionIds = MISSIONS.map((m) => m.id);

const ONE_MINUTE_MS = 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function makeCtx(overrides?: Partial<MissionCompleteContext>): MissionCompleteContext {
  return {
    missionId: "mission-01",
    stars: 1,
    durationMs: 300_000,
    ...overrides,
  };
}

function findAchievement(result: { id: string }[], id: string) {
  return result.find((a) => a.id === id);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  mockLoadProgress.mockReturnValue(createSaveData());
  mockUnlockAchievement.mockReturnValue(true);
});

// -- checkMissionComplete ----------------------------------------------------

describe("checkMissionComplete", () => {
  it("triggers SPEEDRUNNER for completion under 60 seconds", () => {
    const result = checkMissionComplete(makeCtx({ durationMs: 50_000 }));

    expect(mockUnlockAchievement).toHaveBeenCalledWith("SPEEDRUNNER");
    const speedrunner = findAchievement(result, "SPEEDRUNNER");
    expect(speedrunner).toBeDefined();
    expect(speedrunner!.title).toBe("Speed of Light");
    expect(speedrunner!.description).toBeTruthy();
  });

  it("does not trigger SPEEDRUNNER for completion >= 60 seconds", () => {
    checkMissionComplete(makeCtx({ durationMs: ONE_MINUTE_MS }));

    expect(mockUnlockAchievement).not.toHaveBeenCalledWith("SPEEDRUNNER");
  });

  it("triggers PERFECTIONIST for 3 stars", () => {
    const result = checkMissionComplete(makeCtx({ stars: 3 }));

    expect(mockUnlockAchievement).toHaveBeenCalledWith("PERFECTIONIST");
    const perfectionist = findAchievement(result, "PERFECTIONIST");
    expect(perfectionist).toBeDefined();
    expect(perfectionist!.title).toBe("Zero Exposure");
    expect(perfectionist!.description).toBeTruthy();
  });

  it("does not trigger PERFECTIONIST for < 3 stars", () => {
    checkMissionComplete(makeCtx({ stars: 2 }));

    expect(mockUnlockAchievement).not.toHaveBeenCalledWith("PERFECTIONIST");
  });

  it("triggers FULL_CLEARANCE when all missions are completed", () => {
    mockLoadProgress.mockReturnValue(
      createSaveData({ completedMissions: allMissionIds }),
    );

    const result = checkMissionComplete(makeCtx({ missionId: "mission-12", stars: 2 }));

    expect(mockUnlockAchievement).toHaveBeenCalledWith("FULL_CLEARANCE");
    const fullClearance = findAchievement(result, "FULL_CLEARANCE");
    expect(fullClearance).toBeDefined();
    expect(fullClearance!.title).toBe("Full Clearance");
    expect(fullClearance!.description).toBeTruthy();
  });

  it("does not trigger FULL_CLEARANCE when missions are incomplete", () => {
    mockLoadProgress.mockReturnValue(
      createSaveData({ completedMissions: ["mission-01", "mission-02"] }),
    );

    checkMissionComplete(makeCtx({ missionId: "mission-02", stars: 2 }));

    expect(mockUnlockAchievement).not.toHaveBeenCalledWith("FULL_CLEARANCE");
  });

  it("triggers GHOST_PROTOCOL when all missions done without handler", () => {
    mockLoadProgress.mockReturnValue(
      createSaveData({
        completedMissions: allMissionIds,
        handlerEverUsed: false,
      }),
    );

    const result = checkMissionComplete(makeCtx({ missionId: "mission-12", stars: 2 }));

    expect(mockUnlockAchievement).toHaveBeenCalledWith("GHOST_PROTOCOL");
    const ghost = findAchievement(result, "GHOST_PROTOCOL");
    expect(ghost).toBeDefined();
    expect(ghost!.title).toBe("Ghost Protocol");
    expect(ghost!.description).toBeTruthy();
  });

  it("does not trigger GHOST_PROTOCOL if handler was used", () => {
    mockLoadProgress.mockReturnValue(
      createSaveData({
        completedMissions: allMissionIds,
        handlerEverUsed: true,
      }),
    );

    checkMissionComplete(makeCtx({ missionId: "mission-12", stars: 2 }));

    expect(mockUnlockAchievement).not.toHaveBeenCalledWith("GHOST_PROTOCOL");
  });
});

// -- NIGHT_OWL ---------------------------------------------------------------

describe("checkMissionComplete NIGHT_OWL", () => {
  it("triggers between 1am and 5am", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 7, 3, 0, 0));

    const result = checkMissionComplete(makeCtx());

    expect(mockUnlockAchievement).toHaveBeenCalledWith("NIGHT_OWL");
    const nightOwl = findAchievement(result, "NIGHT_OWL");
    expect(nightOwl).toBeDefined();
    expect(nightOwl!.title).toBe("Dark Hours Operative");
    expect(nightOwl!.description).toBeTruthy();
  });

  it("does not trigger at noon", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 7, 12, 0, 0));

    checkMissionComplete(makeCtx());

    expect(mockUnlockAchievement).not.toHaveBeenCalledWith("NIGHT_OWL");
  });

  it("does not trigger at exactly 5am", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 7, 5, 0, 0));

    checkMissionComplete(makeCtx());

    expect(mockUnlockAchievement).not.toHaveBeenCalledWith("NIGHT_OWL");
  });
});

// -- checkPersistence --------------------------------------------------------

describe("checkPersistence", () => {
  it("triggers PERSISTENCE for 7+ days gap", () => {
    mockLoadProgress.mockReturnValue(
      createSaveData({ lastPlayedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 }),
    );

    const result = checkPersistence();

    expect(result).not.toBeNull();
    expect(result!.id).toBe("PERSISTENCE");
    expect(result!.title).toBe("The Sleeper Awakens");
    expect(result!.description).toBeTruthy();
    expect(mockUnlockAchievement).toHaveBeenCalledWith("PERSISTENCE");
  });

  it("returns null for recent play (< 7 days)", () => {
    mockLoadProgress.mockReturnValue(
      createSaveData({ lastPlayedAt: Date.now() - SEVEN_DAYS_MS + 60_000 }),
    );

    const result = checkPersistence();

    expect(result).toBeNull();
    expect(mockUnlockAchievement).not.toHaveBeenCalled();
  });

  it("returns null when lastPlayedAt is 0", () => {
    mockLoadProgress.mockReturnValue(createSaveData({ lastPlayedAt: 0 }));

    const result = checkPersistence();

    expect(result).toBeNull();
  });
});

// -- checkHandlerOpen --------------------------------------------------------

describe("checkHandlerOpen", () => {
  it("triggers HANDLERS_PET at 10 opens", () => {
    const result = checkHandlerOpen(10);

    expect(result).not.toBeNull();
    expect(result!.id).toBe("HANDLERS_PET");
    expect(result!.title).toBe("Handler's Pet");
    expect(result!.description).toBeTruthy();
    expect(mockUnlockAchievement).toHaveBeenCalledWith("HANDLERS_PET");
  });

  it("triggers HANDLERS_PET for more than 10 opens", () => {
    const result = checkHandlerOpen(15);

    expect(result).not.toBeNull();
    expect(result!.id).toBe("HANDLERS_PET");
  });

  it("returns null for fewer than 10 opens", () => {
    const result = checkHandlerOpen(9);

    expect(result).toBeNull();
    expect(mockUnlockAchievement).not.toHaveBeenCalled();
  });
});

// -- Achievement shape -------------------------------------------------------

describe("achievement shape", () => {
  it("each unlocked achievement has id, title, and description", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 7, 3, 0, 0));
    mockLoadProgress.mockReturnValue(
      createSaveData({
        completedMissions: allMissionIds,
        handlerEverUsed: false,
      }),
    );

    const result = checkMissionComplete(
      makeCtx({ missionId: "mission-12", stars: 3, durationMs: 59_000 }),
    );

    for (const achievement of result) {
      expect(achievement.id).toEqual(expect.any(String));
      expect(achievement.title).toEqual(expect.any(String));
      expect(achievement.description).toEqual(expect.any(String));
      expect(achievement.id.length).toBeGreaterThan(0);
      expect(achievement.title.length).toBeGreaterThan(0);
      expect(achievement.description.length).toBeGreaterThan(0);
    }
  });
});

// -- unlockAchievement interaction -------------------------------------------

describe("unlockAchievement interaction", () => {
  it("does not return achievement when unlockAchievement returns false", () => {
    mockUnlockAchievement.mockReturnValue(false);

    const result = checkMissionComplete(
      makeCtx({ stars: 3, durationMs: 59_000 }),
    );

    expect(result).toHaveLength(0);
    expect(mockUnlockAchievement).toHaveBeenCalled();
  });
});
