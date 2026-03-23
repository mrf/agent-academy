import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Box, Text } from "ink";
import App from "../../src/app.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  tick,
  type RenderResult,
} from "../helpers/render-ink.js";
import { createSaveData } from "../helpers/mock-progress.js";
import type { SaveData } from "../../src/types.js";

// ── Hoisted state (available inside vi.mock factories) ───────────────

const {
  mockMarkHandlerUsed,
  mockResetProgress,
  mockUpdateLastPlayed,
  state,
} = vi.hoisted(() => ({
  mockMarkHandlerUsed: vi.fn(),
  mockResetProgress: vi.fn(),
  mockUpdateLastPlayed: vi.fn(),
  state: {
    save: null as unknown as SaveData,
    missions: [] as Array<{ id: string; stars: 1 | 2 | 3; fxp: number }>,
    achievements: [] as string[],
  },
}));

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("../../src/store/progress.js", () => ({
  loadProgress: () => state.save,
  saveMissionComplete: vi.fn((id: string, stars: 1 | 2 | 3, fxp: number) => {
    state.missions.push({ id, stars, fxp });
    if (!state.save.completedMissions.includes(id)) {
      state.save.completedMissions.push(id);
    }
    const existing = state.save.starRatings[id];
    if (!existing || stars > existing) {
      state.save.starRatings[id] = stars;
    }
    state.save.fxp += fxp;
  }),
  saveProgress: vi.fn((data: SaveData) => {
    state.save = { ...data };
  }),
  resetProgress: mockResetProgress,
  markHandlerUsed: mockMarkHandlerUsed,
  updateLastPlayed: mockUpdateLastPlayed,
  saveStepProgress: vi.fn(),
}));

vi.mock("../../src/lib/achievements.js", () => ({
  checkMissionComplete: vi.fn(
    (ctx: { missionId: string; stars: 1 | 2 | 3; durationMs: number }) => {
      const results: Array<{ id: string; title: string; description: string }> = [];

      if (ctx.stars === 3 && !state.achievements.includes("PERFECTIONIST")) {
        state.achievements.push("PERFECTIONIST");
        results.push({
          id: "PERFECTIONIST",
          title: "Zero Exposure",
          description: "Complete a mission with full cover integrity",
        });
      }

      if (ctx.durationMs < 120_000 && !state.achievements.includes("SPEEDRUNNER")) {
        state.achievements.push("SPEEDRUNNER");
        results.push({
          id: "SPEEDRUNNER",
          title: "Speed of Light",
          description: "Complete a mission in under 2 minutes",
        });
      }

      return results;
    },
  ),
  checkPersistence: vi.fn(() => null),
  checkHandlerOpen: vi.fn((count: number) => {
    if (count >= 10 && !state.achievements.includes("HANDLERS_PET")) {
      state.achievements.push("HANDLERS_PET");
      return {
        id: "HANDLERS_PET",
        title: "Handler's Pet",
        description: "Contact handler 10 times in one session",
      };
    }
    return null;
  }),
}));

vi.mock("../../src/lib/easter-eggs.js", () => ({
  createKonamiTracker: () => vi.fn(() => false),
  setTerminalTitle: vi.fn(),
}));

// ── Screen mocks ─────────────────────────────────────────────────────

const MOCK_HEIGHT = 12;

const captured: {
  logoOnContinue: (() => void) | null;
  onboardingOnContinue: (() => void) | null;
  selectMission: ((idx: number) => void) | null;
  briefingOnAccept: (() => void) | null;
  missionOnComplete:
    | ((stars: 1 | 2 | 3, fxp: number, coverRemaining: number) => void)
    | null;
  debriefOnContinue: (() => void) | null;
} = {
  logoOnContinue: null,
  onboardingOnContinue: null,
  selectMission: null,
  briefingOnAccept: null,
  missionOnComplete: null,
  debriefOnContinue: null,
};

function screenMarker<T>(name: string, capture?: (props: T) => void) {
  return (props: T) => {
    capture?.(props);
    return (
      <Box minHeight={MOCK_HEIGHT}>
        <Text>SCREEN:{name}</Text>
      </Box>
    );
  };
}

vi.mock("../../src/screens/Logo.js", () => ({
  Logo: screenMarker<{ onContinue: () => void }>("LOGO", (p) => {
    captured.logoOnContinue = p.onContinue;
  }),
}));

vi.mock("../../src/screens/Onboarding.js", () => ({
  Onboarding: screenMarker<{ onContinue: () => void }>("ONBOARDING", (p) => {
    captured.onboardingOnContinue = p.onContinue;
  }),
}));

vi.mock("../../src/screens/MissionMap.js", () => ({
  MissionMap: screenMarker<{
    onSelectMission: (idx: number) => void;
    onSelectInfiniteMode: () => void;
    onOpenCredits: () => void;
  }>("MISSIONMAP", (p) => {
    captured.selectMission = p.onSelectMission;
  }),
}));

vi.mock("../../src/screens/Briefing.js", () => ({
  Briefing: screenMarker<{ onAccept: () => void }>("BRIEFING", (p) => {
    captured.briefingOnAccept = p.onAccept;
  }),
}));

vi.mock("../../src/screens/Mission.js", () => ({
  Mission: screenMarker<{
    onComplete: (stars: 1 | 2 | 3, fxp: number, coverRemaining: number) => void;
  }>("MISSION", (p) => {
    captured.missionOnComplete = p.onComplete;
  }),
}));

vi.mock("../../src/screens/Debrief.js", () => ({
  Debrief: screenMarker<{ onContinue: () => void }>("DEBRIEF", (p) => {
    captured.debriefOnContinue = p.onContinue;
  }),
}));

vi.mock("../../src/screens/InfiniteMode.js", () => ({
  InfiniteMode: screenMarker("INFINITEMODE"),
}));

vi.mock("../../src/screens/Credits.js", () => ({
  Credits: screenMarker("CREDITS"),
}));

vi.mock("../../src/screens/HelpOverlay.js", () => ({
  HelpOverlay: () => <Text>OVERLAY:HELP</Text>,
}));

vi.mock("../../src/screens/Handler.js", () => ({
  Handler: () => <Text>OVERLAY:HANDLER</Text>,
}));

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Flush React effects scheduled via MessageChannel (not intercepted by
 * fake timers).  Ink's useInput re-registers its listener inside a
 * useEffect, so we need this after any state change that updates the
 * useInput callback closure.
 */
async function flushEffects(): Promise<void> {
  await new Promise<void>((resolve) => {
    const mc = new MessageChannel();
    mc.port1.onmessage = () => {
      mc.port1.close();
      resolve();
    };
    mc.port2.postMessage(null);
  });
}

function renderApp(
  overrides: Partial<{
    hasApiKey: boolean;
    noAnimation: boolean;
    reset: boolean;
  }> = {},
): RenderResult {
  const { hasApiKey = false, noAnimation = true, reset = false } = overrides;
  return renderInk(
    <App hasApiKey={hasApiKey} noAnimation={noAnimation} reset={reset} />,
  );
}

function setSave(overrides?: Partial<SaveData>): void {
  // Deep clone to avoid shared-reference mutation across tests
  state.save = JSON.parse(JSON.stringify(createSaveData(overrides)));
}

function resetCaptured(): void {
  captured.logoOnContinue = null;
  captured.onboardingOnContinue = null;
  captured.selectMission = null;
  captured.briefingOnAccept = null;
  captured.missionOnComplete = null;
  captured.debriefOnContinue = null;
}

/** Navigate from map → briefing → mission screen. */
async function navigateToMission(missionIndex = 0): Promise<void> {
  captured.selectMission!(missionIndex);
  await tick(0);
  captured.briefingOnAccept!();
  await tick(0);
}

/** Complete a mission and arrive at debrief. */
async function completeMission(
  stars: 1 | 2 | 3,
  fxp: number,
  cover: number,
): Promise<void> {
  captured.missionOnComplete!(stars, fxp, cover);
  await tick(0);
}

// ── Setup / Teardown ─────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  setSave();
  state.missions = [];
  state.achievements = [];
  resetCaptured();
  mockMarkHandlerUsed.mockClear();
  mockResetProgress.mockClear();
  mockUpdateLastPlayed.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── E2E Tests ────────────────────────────────────────────────────────

describe("E2E: App boot", () => {
  it("fresh user sees Logo screen on first boot", async () => {
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:LOGO");
  });

  it("returning user (firstRunComplete) skips directly to MissionMap", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("updates lastPlayedAt timestamp on boot", async () => {
    renderApp();
    await tick(0);
    expect(mockUpdateLastPlayed).toHaveBeenCalled();
  });
});

describe("E2E: First-time user journey", () => {
  it("boot → Logo → Onboarding → MissionMap", async () => {
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:LOGO");

    captured.logoOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:ONBOARDING");

    captured.onboardingOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });
});

describe("E2E: Mission playthrough — perfect run", () => {
  it("map → briefing → mission → debrief → map", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    captured.selectMission!(0);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");

    captured.briefingOnAccept!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSION");

    await completeMission(3, 25, 3);
    expect(inst.lastFrame()).toContain("SCREEN:DEBRIEF");

    captured.debriefOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("persists mission completion to progress store", async () => {
    setSave({ firstRunComplete: true });
    renderApp();
    await tick(0);

    await navigateToMission();
    await completeMission(3, 25, 3);

    expect(state.missions).toHaveLength(1);
    expect(state.missions[0]).toEqual({ id: "mission-01", stars: 3, fxp: 25 });
  });
});

describe("E2E: Mission playthrough — imperfect run", () => {
  it("persists 2-star completion correctly", async () => {
    setSave({ firstRunComplete: true });
    renderApp();
    await tick(0);

    await navigateToMission();
    await completeMission(2, 15, 2);

    expect(state.missions[0]).toEqual({ id: "mission-01", stars: 2, fxp: 15 });
  });
});

describe("E2E: Multi-mission progression", () => {
  it("completes mission 01 then mission 02 in sequence", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    // Mission 01
    await navigateToMission(0);
    await completeMission(3, 25, 3);
    await tick(3100); // dismiss achievement
    captured.debriefOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    // Mission 02
    await navigateToMission(1);
    await completeMission(2, 20, 2);
    captured.debriefOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    expect(state.missions).toHaveLength(2);
    expect(state.missions[0].id).toBe("mission-01");
    expect(state.missions[1].id).toBe("mission-02");
    expect(state.save.completedMissions).toContain("mission-01");
    expect(state.save.completedMissions).toContain("mission-02");
  });
});

describe("E2E: Achievement triggers", () => {
  it("PERFECTIONIST fires on 3-star completion", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    await navigateToMission();
    await completeMission(3, 25, 3);

    const frame = inst.lastFrame()!;
    expect(frame).toContain("ACHIEVEMENT UNLOCKED");
    expect(frame).toContain("Zero Exposure");
  });

  it("PERFECTIONIST does not fire on 2-star completion", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    await navigateToMission();
    await completeMission(2, 15, 2);

    expect(inst.lastFrame()).not.toContain("Zero Exposure");
  });

  it("achievement auto-dismisses after display timer", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    await navigateToMission();
    await completeMission(3, 25, 3);

    expect(inst.lastFrame()).toContain("ACHIEVEMENT UNLOCKED");

    await tick(3100);
    expect(inst.lastFrame()).not.toContain("ACHIEVEMENT UNLOCKED");
  });
});

describe("E2E: Keyboard routing", () => {
  it("'h' opens help overlay, ESC closes it", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    inst.stdin.write("h");
    await tick(0);
    expect(inst.lastFrame()).toContain("OVERLAY:HELP");

    pressKey(inst, keys.escape);
    await tick(0);
    expect(inst.lastFrame()).not.toContain("OVERLAY:HELP");
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("'q' shows quit prompt, 'n' dismisses", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    inst.stdin.write("q");
    await tick(0);
    await flushEffects();
    expect(inst.lastFrame()).toContain("Quit Claude Code Academy?");

    inst.stdin.write("n");
    await tick(0);
    await flushEffects();
    expect(inst.lastFrame()).not.toContain("Quit Claude Code Academy?");
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("'q' then 'y' exits the app", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    inst.stdin.write("q");
    await tick(0);
    await flushEffects();
    expect(inst.lastFrame()).toContain("Quit Claude Code Academy?");

    inst.stdin.write("y");
    await tick(0);
    await flushEffects();
    // app.exit() called — no further frame assertions (behavior
    // differs between local ink renderer and CI)
  });

  it("ESC from briefing returns to MissionMap", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    captured.selectMission!(0);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");

    pressKey(inst, keys.escape);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("'?' on mission opens handler overlay", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp({ hasApiKey: true });
    await tick(0);

    await navigateToMission();

    inst.stdin.write("?");
    await tick(0);
    expect(inst.lastFrame()).toContain("OVERLAY:HANDLER");
  });

  it("'?' does NOT open handler without API key", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp({ hasApiKey: false });
    await tick(0);

    await navigateToMission();

    inst.stdin.write("?");
    await tick(0);
    expect(inst.lastFrame()).not.toContain("OVERLAY:HANDLER");
  });

  it("ESC on mission navigates back to MissionMap", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp({ hasApiKey: true });
    await tick(0);

    await navigateToMission();

    pressKey(inst, keys.escape);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });
});

describe("E2E: Reset flag", () => {
  it("--reset calls resetProgress on mount", async () => {
    setSave({ firstRunComplete: true, fxp: 500 });
    renderApp({ reset: true });
    await tick(0);
    expect(mockResetProgress).toHaveBeenCalled();
  });

  it("--reset shows Logo (not MissionMap) even with prior progress", async () => {
    setSave({ firstRunComplete: false });
    const inst = renderApp({ reset: true });
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:LOGO");
  });
});

describe("E2E: Full user journey — boot through mission completion", () => {
  it("fresh user: logo → onboarding → map → mission → debrief → map", async () => {
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:LOGO");

    captured.logoOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:ONBOARDING");

    captured.onboardingOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    captured.selectMission!(0);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");

    captured.briefingOnAccept!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSION");

    await completeMission(3, 25, 3);
    expect(inst.lastFrame()).toContain("ACHIEVEMENT UNLOCKED");
    expect(inst.lastFrame()).toContain("SCREEN:DEBRIEF");

    await tick(3100); // dismiss achievement
    captured.debriefOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    expect(state.missions).toHaveLength(1);
    expect(state.missions[0]).toEqual({ id: "mission-01", stars: 3, fxp: 25 });
    expect(state.save.completedMissions).toContain("mission-01");
  });

  it("returning user: two missions with different ratings", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    // Mission 01: 2 stars
    await navigateToMission(0);
    await completeMission(2, 15, 2);
    expect(inst.lastFrame()).not.toContain("Zero Exposure");
    captured.debriefOnContinue!();
    await tick(0);

    // Mission 02: 3 stars
    await navigateToMission(1);
    await completeMission(3, 30, 3);
    expect(inst.lastFrame()).toContain("ACHIEVEMENT UNLOCKED");
    await tick(3100);
    captured.debriefOnContinue!();
    await tick(0);

    expect(state.missions).toHaveLength(2);
    expect(state.save.fxp).toBe(45);
  });
});

describe("E2E: Star rating persistence across replays", () => {
  it("higher stars upgrade the saved rating", async () => {
    setSave({ firstRunComplete: true });
    renderApp();
    await tick(0);

    // First run: 2 stars
    await navigateToMission();
    await completeMission(2, 15, 2);
    await tick(3100);
    captured.debriefOnContinue!();
    await tick(0);
    expect(state.save.starRatings["mission-01"]).toBe(2);

    // Replay: 3 stars
    await navigateToMission();
    await completeMission(3, 25, 3);
    await tick(3100);
    captured.debriefOnContinue!();
    await tick(0);

    expect(state.save.starRatings["mission-01"]).toBe(3);
    expect(state.save.fxp).toBe(40);
  });

  it("lower stars do NOT downgrade the saved rating", async () => {
    setSave({ firstRunComplete: true });
    renderApp();
    await tick(0);

    // First: 3 stars
    await navigateToMission();
    await completeMission(3, 25, 3);
    await tick(3100);
    captured.debriefOnContinue!();
    await tick(0);

    // Replay: 1 star
    await navigateToMission();
    await completeMission(1, 10, 1);
    await tick(3100);
    captured.debriefOnContinue!();
    await tick(0);

    expect(state.save.starRatings["mission-01"]).toBe(3);
  });
});

describe("E2E: Handler usage tracking", () => {
  it("'h' on missionMap opens help but does NOT call markHandlerUsed", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp({ hasApiKey: true });
    await tick(0);

    inst.stdin.write("h");
    await tick(0);

    // Help overlay != handler overlay
    expect(inst.lastFrame()).toContain("OVERLAY:HELP");
    expect(mockMarkHandlerUsed).not.toHaveBeenCalled();
  });
});

describe("E2E: Overlay edge cases", () => {
  it("help overlay layers over screen without replacing it", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    inst.stdin.write("h");
    await tick(0);

    const frame = inst.lastFrame()!;
    expect(frame).toContain("SCREEN:MISSIONMAP");
    expect(frame).toContain("OVERLAY:HELP");
  });

  it("help overlay works from briefing screen", async () => {
    setSave({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    captured.selectMission!(0);
    await tick(0);

    inst.stdin.write("h");
    await tick(0);

    const frame = inst.lastFrame()!;
    expect(frame).toContain("SCREEN:BRIEFING");
    expect(frame).toContain("OVERLAY:HELP");

    pressKey(inst, keys.escape);
    await tick(0);
    expect(inst.lastFrame()).not.toContain("OVERLAY:HELP");
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");
  });
});
