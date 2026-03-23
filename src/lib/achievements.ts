import { loadProgress, unlockAchievement } from "../store/progress.js";
import { MISSIONS } from "../data/curriculum.js";
import type { ClearanceLevel } from "../types.js";

export type Achievement = {
  id: string;
  title: string;
  description?: string;
  label?: string;
};

const ACHIEVEMENT_LIST: Achievement[] = [
  {
    id: "SPEEDRUNNER",
    title: "Speed of Light",
    description: "Complete a mission in under 2 minutes",
  },
  {
    id: "PERFECTIONIST",
    title: "Zero Exposure",
    description: "Complete a mission with full cover integrity",
  },
  {
    id: "NIGHT_OWL",
    title: "Dark Hours Operative",
    description: "Operate between 0100 and 0500",
  },
  {
    id: "PERSISTENCE",
    title: "The Sleeper Awakens",
    description: "Return to duty after 7+ days away",
  },
  {
    id: "HANDLERS_PET",
    title: "Handler's Pet",
    description: "Contact handler 10 times in one session",
  },
  {
    id: "GHOST_PROTOCOL",
    title: "Ghost Protocol",
    description: "Complete all missions without ever contacting handler",
  },
  {
    id: "FULL_CLEARANCE",
    title: "Full Clearance",
    description: "Complete all 8 missions",
  },
];

const ACHIEVEMENTS = new Map(ACHIEVEMENT_LIST.map((a) => [a.id, a]));

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.get(id);
}

export type MissionCompleteContext = {
  missionId: string;
  stars: 1 | 2 | 3;
  durationMs: number;
};

export function checkMissionComplete(
  ctx: MissionCompleteContext,
): Achievement[] {
  const unlocked: Achievement[] = [];

  if (ctx.durationMs < 2 * 60 * 1000) {
    tryUnlock("SPEEDRUNNER", unlocked);
  }

  if (ctx.stars === 3) {
    tryUnlock("PERFECTIONIST", unlocked);
  }

  const hour = new Date().getHours();
  if (hour >= 1 && hour < 5) {
    tryUnlock("NIGHT_OWL", unlocked);
  }

  const progress = loadProgress();
  const allComplete = MISSIONS.every((m) =>
    progress.completedMissions.includes(m.id),
  );

  if (allComplete) {
    tryUnlock("FULL_CLEARANCE", unlocked);

    if (!progress.handlerEverUsed) {
      tryUnlock("GHOST_PROTOCOL", unlocked);
    }
  }

  return unlocked;
}

export function checkPersistence(): Achievement | null {
  const progress = loadProgress();
  if (!progress.lastPlayedAt) return null;

  const daysSince =
    (Date.now() - progress.lastPlayedAt) / (1000 * 60 * 60 * 24);
  if (daysSince >= 7) {
    return tryUnlock("PERSISTENCE");
  }
  return null;
}

export function checkHandlerOpen(
  handlerOpensThisSession: number,
): Achievement | null {
  if (handlerOpensThisSession >= 10) {
    return tryUnlock("HANDLERS_PET");
  }
  return null;
}

// Clearance level thresholds (missions completed required)
export const CLEARANCE_THRESHOLDS = {
  operative: 4,
  elite: 8,
} as const;

export function computeClearanceLevel(completedCount: number): ClearanceLevel {
  if (completedCount >= CLEARANCE_THRESHOLDS.elite) return "elite";
  if (completedCount >= CLEARANCE_THRESHOLDS.operative) return "operative";
  return "recruit";
}

export type RankUpResult = {
  achievement: Achievement;
  newLevel: ClearanceLevel;
};

export function checkClearanceRankUp(
  previousLevel: ClearanceLevel,
  completedCount: number,
): RankUpResult | null {
  const newLevel = computeClearanceLevel(completedCount);
  if (newLevel === previousLevel) return null;
  return {
    achievement: {
      id: `RANKUP_${newLevel.toUpperCase()}`,
      title: newLevel.toUpperCase(),
      label: "CLEARANCE UPGRADED",
    },
    newLevel,
  };
}

/**
 * Attempt to unlock an achievement by id.
 * Returns the Achievement if newly unlocked, null otherwise.
 * When `into` is provided, newly unlocked achievements are also pushed to the array.
 */
function tryUnlock(id: string, into?: Achievement[]): Achievement | null {
  const def = ACHIEVEMENTS.get(id);
  if (!def || !unlockAchievement(def.id)) return null;
  into?.push(def);
  return def;
}
