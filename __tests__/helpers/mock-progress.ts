import type { SaveData } from "../../src/types.js";

const DEFAULT_SAVE_DATA: SaveData = {
  schemaVersion: 1,
  completedMissions: [],
  starRatings: {},
  fxp: 0,
  clearanceLevel: "recruit",
  achievements: [],
  quizStats: { correct: 0, total: 0 },
  infiniteModeStats: { correct: 0, total: 0, sessionsPlayed: 0, fxpEarned: 0 },
  infiniteModeUnlocked: false,
  firstRunComplete: false,
  lastPlayedAt: 0,
  handlerEverUsed: false,
  legacyModeUnlocked: false,
};

export function createSaveData(overrides?: Partial<SaveData>): SaveData {
  return { ...DEFAULT_SAVE_DATA, ...overrides };
}

export function createCompletedSaveData(): SaveData {
  return createSaveData({
    completedMissions: [
      "mission-01",
      "mission-02",
      "mission-03",
      "mission-04",
      "mission-05",
      "mission-06",
      "mission-07",
      "mission-08",
      "mission-09",
      "mission-10",
      "mission-11",
      "mission-12",
    ],
    starRatings: {
      "mission-01": 3,
      "mission-02": 3,
      "mission-03": 3,
      "mission-04": 2,
      "mission-05": 3,
      "mission-06": 2,
      "mission-07": 3,
      "mission-08": 3,
      "mission-09": 2,
      "mission-10": 3,
      "mission-11": 3,
      "mission-12": 3,
    },
    fxp: 9600,
    clearanceLevel: "elite",
    achievements: ["first-blood", "perfect-mission", "speed-demon"],
    quizStats: { correct: 40, total: 48 },
    infiniteModeStats: { correct: 20, total: 25, sessionsPlayed: 3, fxpEarned: 400 },
    infiniteModeUnlocked: true,
    firstRunComplete: true,
    lastPlayedAt: Date.now(),
    handlerEverUsed: true,
    legacyModeUnlocked: false,
  });
}
