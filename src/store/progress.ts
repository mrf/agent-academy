import Conf from "conf";
import type { SaveData } from "../types.js";

const DEFAULT_SAVE_DATA: SaveData = {
  schemaVersion: 1,
  completedMissions: [],
  starRatings: {},
  fxp: 0,
  clearanceLevel: "recruit",
  achievements: [],
  quizStats: { correct: 0, total: 0 },
  infiniteModeUnlocked: false,
  firstRunComplete: false,
  lastPlayedAt: 0,
  handlerEverUsed: false,
};

// In-memory fallback for environments where conf fails (FUSE/WSL2)
let memoryStore: SaveData = { ...DEFAULT_SAVE_DATA };
let usingMemory = false;

// Partial progress: missionId -> stepIndex
let partialProgress: Record<string, number> = {};

function createConf(): Conf<SaveData> | null {
  try {
    return new Conf<SaveData>({
      projectName: "claude-code-academy",
      defaults: DEFAULT_SAVE_DATA,
      migrations: {
        ">=1.0.0": (store) => {
          if (!store.has("schemaVersion")) {
            store.set("schemaVersion", 1);
          }
        },
      },
    });
  } catch {
    usingMemory = true;
    return null;
  }
}

const store = createConf();

function safeGet(): SaveData {
  if (usingMemory || !store) return { ...memoryStore };
  try {
    return store.store;
  } catch {
    usingMemory = true;
    return { ...memoryStore };
  }
}

function safeSet(data: SaveData): void {
  if (usingMemory || !store) {
    memoryStore = { ...data };
    return;
  }
  try {
    store.store = data;
  } catch {
    usingMemory = true;
    memoryStore = { ...data };
  }
}

export function loadProgress(): SaveData {
  return safeGet();
}

export function saveProgress(data: SaveData): void {
  safeSet(data);
}

export function saveMissionComplete(
  missionId: string,
  stars: 1 | 2 | 3,
  fxpEarned: number,
): void {
  const data = safeGet();

  if (!data.completedMissions.includes(missionId)) {
    data.completedMissions.push(missionId);
  }

  const existing = data.starRatings[missionId];
  if (!existing || stars > existing) {
    data.starRatings[missionId] = stars;
  }

  data.fxp += fxpEarned;

  // Clear partial progress for this mission
  delete partialProgress[missionId];

  safeSet(data);
}

export function saveStepProgress(
  missionId: string,
  stepIndex: number,
): void {
  partialProgress[missionId] = stepIndex;
}

export function getPartialProgress(missionId: string): number | null {
  return partialProgress[missionId] ?? null;
}

export function resetProgress(): void {
  memoryStore = { ...DEFAULT_SAVE_DATA };
  partialProgress = {};
  if (!usingMemory && store) {
    try {
      store.clear();
      // Re-apply defaults after clear
      store.store = { ...DEFAULT_SAVE_DATA };
    } catch {
      usingMemory = true;
    }
  }
}

export function unlockAchievement(name: string): boolean {
  const data = safeGet();
  if (data.achievements.includes(name)) {
    return false;
  }
  data.achievements.push(name);
  safeSet(data);
  return true;
}

export function markHandlerUsed(): void {
  const data = safeGet();
  if (!data.handlerEverUsed) {
    data.handlerEverUsed = true;
    safeSet(data);
  }
}

export function updateLastPlayed(): void {
  const data = safeGet();
  data.lastPlayedAt = Date.now();
  safeSet(data);
}

export function hasSaveData(): boolean {
  const data = safeGet();
  return (
    data.completedMissions.length > 0 ||
    data.fxp > 0 ||
    data.firstRunComplete
  );
}
