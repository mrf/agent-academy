import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import Conf from "conf";
import type { SaveData } from "../types.js";

const DEFAULT_SAVE_DATA: SaveData = {
  schemaVersion: 1,
  completedMissions: [],
  starRatings: {},
  improvedMissions: [],
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

// In-memory fallback for environments where conf fails (FUSE/WSL2)
let memoryStore: SaveData = structuredClone(DEFAULT_SAVE_DATA);
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
  if (usingMemory || !store) return structuredClone(memoryStore);
  try {
    return store.store;
  } catch {
    usingMemory = true;
    return structuredClone(memoryStore);
  }
}

function safeSet(data: SaveData): void {
  if (usingMemory || !store) {
    memoryStore = structuredClone(data);
    return;
  }
  try {
    store.store = data;
  } catch {
    usingMemory = true;
    memoryStore = structuredClone(data);
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

  const alreadyCompleted = data.completedMissions.includes(missionId);
  if (!alreadyCompleted) {
    data.completedMissions.push(missionId);
  }

  const existing = data.starRatings[missionId];
  if (!existing || stars > existing) {
    data.starRatings[missionId] = stars;
    if (alreadyCompleted && existing) {
      if (!data.improvedMissions.includes(missionId)) {
        data.improvedMissions.push(missionId);
      }
    }
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
  memoryStore = structuredClone(DEFAULT_SAVE_DATA);
  partialProgress = {};
  if (!usingMemory && store) {
    try {
      store.clear();
      // Re-apply defaults after clear
      store.store = structuredClone(DEFAULT_SAVE_DATA);
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

export function saveInfiniteResult(
  correct: number,
  total: number,
  fxpEarned: number,
): void {
  const data = safeGet();
  const stats = data.infiniteModeStats ?? {
    correct: 0,
    total: 0,
    sessionsPlayed: 0,
    fxpEarned: 0,
  };
  stats.correct += correct;
  stats.total += total;
  stats.sessionsPlayed += 1;
  stats.fxpEarned += fxpEarned;
  data.infiniteModeStats = stats;
  data.fxp += fxpEarned;
  safeSet(data);
}

export function reportBadQuestion(
  question: string,
  topic: string,
  difficulty: string,
): void {
  const dir = join(homedir(), ".claude-code-academy");
  try {
    mkdirSync(dir, { recursive: true });
    const entry = JSON.stringify({
      question,
      topic,
      difficulty,
      ts: new Date().toISOString(),
    });
    appendFileSync(join(dir, "reported-questions.jsonl"), entry + "\n");
  } catch {
    // best-effort logging
  }
}

export function toggleLegacyMode(): boolean {
  const data = safeGet();
  data.legacyModeUnlocked = !data.legacyModeUnlocked;
  safeSet(data);
  return data.legacyModeUnlocked;
}

export function hasSaveData(): boolean {
  const data = safeGet();
  return (
    data.completedMissions.length > 0 ||
    data.fxp > 0 ||
    data.firstRunComplete
  );
}
