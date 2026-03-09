import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Text } from "ink";
import { Mission } from "../../src/screens/Mission.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  type RenderResult,
} from "../helpers/render-ink.js";
import {
  createMission,
  createPrintStep,
  createQuizStep,
  createCommandStep,
} from "../helpers/mock-missions.js";
import {
  checkMissionComplete,
  type MissionCompleteContext,
} from "../../src/lib/achievements.js";
import {
  loadProgress,
  saveProgress,
  resetProgress,
  saveMissionComplete,
} from "../../src/store/progress.js";
import type { Mission as MissionType, SaveData } from "../../src/types.js";

// ── Mocks ──────────────────────────────────────────────────────────────

let capturedPrintOnComplete: (() => void) | null = null;
let capturedOnAnswer: ((correct: boolean) => void) | null = null;

vi.mock("../../src/components/TypeWriter.js", () => ({
  TypeWriter: (props: { text: string; onComplete: () => void }) => {
    capturedPrintOnComplete = props.onComplete;
    return <Text>PRINT:{props.text}</Text>;
  },
}));

vi.mock("../../src/components/QuizStep.js", () => ({
  QuizStep: (props: { onAnswer: (c: boolean) => void }) => {
    capturedOnAnswer = props.onAnswer;
    return <Text>QUIZ_STEP</Text>;
  },
}));

vi.mock("../../src/components/CommandStep.js", () => ({
  CommandStep: (props: { onAnswer: (c: boolean) => void }) => {
    capturedOnAnswer = props.onAnswer;
    return <Text>COMMAND_STEP</Text>;
  },
}));

vi.mock("../../src/components/StatusBar.js", () => ({
  StatusBar: (props: {
    coverIntegrity: number;
    fxp: number;
    missionNumber: number;
    codename: string;
    currentStep: number;
    totalSteps: number;
  }) => (
    <Text>
      STATUS cover={props.coverIntegrity} fxp={props.fxp} step={props.currentStep}/{props.totalSteps}
    </Text>
  ),
}));

vi.mock("../../src/components/BottomBar.js", () => ({
  BottomBar: () => <Text>BOTTOM</Text>,
}));

vi.mock("../../src/store/progress.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/store/progress.js")>();
  return {
    ...actual,
    saveStepProgress: vi.fn(),
  };
});

// ── Helpers ────────────────────────────────────────────────────────────

/** Deep reset: avoids shared-reference bug in resetProgress's shallow spread. */
function cleanReset(): void {
  resetProgress();
  saveProgress({
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
  } as SaveData);
}

async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(0);
}

async function completePrintStep(inst: RenderResult): Promise<void> {
  capturedPrintOnComplete!();
  await tick(0);
  pressKey(inst, keys.enter);
  await tick(0);
}

async function answerStep(correct: boolean): Promise<void> {
  capturedOnAnswer!(correct);
  await tick(0);
}

function renderMission(
  overrides: {
    mission?: MissionType;
    onComplete?: (stars: 1 | 2 | 3, fxp: number) => void;
    hasApiKey?: boolean;
    noAnimation?: boolean;
  } = {},
): RenderResult {
  const {
    mission = createMission(),
    onComplete = vi.fn(),
    hasApiKey = false,
    noAnimation = true,
  } = overrides;
  return renderInk(
    <Mission
      mission={mission}
      onComplete={onComplete}
      hasApiKey={hasApiKey}
      noAnimation={noAnimation}
    />,
  );
}

/** Mission with enough quiz steps to allow cover to reach 0. */
const fiveStepMission = createMission({
  steps: [
    createPrintStep(),
    createQuizStep(),
    createQuizStep(),
    createQuizStep(),
    createCommandStep(),
  ],
});

/** Mission with an extra quiz step so a single wrong answer doesn't blow cover. */
const fourStepMission = createMission({
  steps: [createPrintStep(), createQuizStep(), createQuizStep(), createCommandStep()],
});

// ── Setup / Teardown ──────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  capturedPrintOnComplete = null;
  capturedOnAnswer = null;
  cleanReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Integration Tests ─────────────────────────────────────────────────

describe("Mission flow integration", () => {
  describe("full mission flow through all step types", () => {
    it("progresses print → quiz → command and fires onComplete", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        steps: [createPrintStep(), createQuizStep(), createCommandStep()],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      expect(inst.lastFrame()).toContain("PRINT:");
      expect(inst.lastFrame()).toContain("step=1/3");

      await completePrintStep(inst);

      expect(inst.lastFrame()).toContain("QUIZ_STEP");
      expect(inst.lastFrame()).toContain("step=2/3");
      await answerStep(true);

      expect(inst.lastFrame()).toContain("COMMAND_STEP");
      expect(inst.lastFrame()).toContain("step=3/3");
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledOnce();
      // FXP closure lags: last step's +10 is enqueued but not captured by advanceStep
      expect(onComplete).toHaveBeenCalledWith(3, 15, 3);
    });

    it("handles multiple print steps in sequence", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        steps: [
          createPrintStep({ text: "Briefing 1" }),
          createPrintStep({ text: "Briefing 2" }),
          createQuizStep(),
        ],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      expect(inst.lastFrame()).toContain("PRINT:Briefing 1");
      await completePrintStep(inst);

      expect(inst.lastFrame()).toContain("PRINT:Briefing 2");
      await completePrintStep(inst);

      expect(inst.lastFrame()).toContain("QUIZ_STEP");
      await answerStep(true);

      // FXP closure lags: last step's +10 is enqueued but not captured
      expect(onComplete).toHaveBeenCalledWith(3, 10, 3);
    });

    it("handles a quiz-only mission", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        steps: [createQuizStep(), createQuizStep()],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      expect(inst.lastFrame()).toContain("QUIZ_STEP");
      await answerStep(true);
      await answerStep(true);

      // FXP lags: only first +10 visible in closure
      expect(onComplete).toHaveBeenCalledWith(3, 10, 3);
    });
  });

  describe("cover integrity decrements on wrong answers", () => {
    it("decrements cover by 1 for each wrong answer", async () => {
      const inst = renderMission({ mission: fiveStepMission });
      await tick(0);

      await completePrintStep(inst);
      expect(inst.lastFrame()).toContain("cover=3");

      await answerStep(false); // cover 3 → 2
      expect(inst.lastFrame()).toContain("cover=2");

      await answerStep(false); // cover 2 → 1
      expect(inst.lastFrame()).toContain("cover=1");
    });

    it("does not decrement cover on correct answers", async () => {
      const mission = createMission({
        steps: [createPrintStep(), createQuizStep(), createCommandStep()],
      });
      const inst = renderMission({ mission });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(true);
      expect(inst.lastFrame()).toContain("cover=3");

      await answerStep(true);
    });

    it("shows COVER BLOWN when cover reaches 0", async () => {
      const inst = renderMission({ mission: fiveStepMission });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false); // 3 → 2
      await answerStep(false); // 2 → 1
      await answerStep(false); // 1 → 0

      expect(inst.lastFrame()).toContain("COVER BLOWN");
      expect(inst.lastFrame()).toContain("Mission failed");
    });

    it("restarts mission from step 1 after cover blown + ENTER", async () => {
      const inst = renderMission({ mission: fiveStepMission });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false);
      await answerStep(false);
      await answerStep(false);

      expect(inst.lastFrame()).toContain("COVER BLOWN");

      pressKey(inst, keys.enter);
      await tick(0);

      expect(inst.lastFrame()).toContain("PRINT:");
      expect(inst.lastFrame()).toContain("cover=3");
      expect(inst.lastFrame()).toContain("step=1/5");
    });

    it("can complete mission after restart from cover blown", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ mission: fiveStepMission, onComplete });
      await tick(0);

      // First attempt: blow cover
      await completePrintStep(inst);
      await answerStep(false);
      await answerStep(false);
      await answerStep(false);
      expect(inst.lastFrame()).toContain("COVER BLOWN");

      // Restart
      pressKey(inst, keys.enter);
      await tick(0);

      // Second attempt: perfect run
      await completePrintStep(inst);
      await answerStep(true);
      await answerStep(true);
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledWith(3, expect.any(Number), 3);
    });
  });

  describe("star rating based on wrong answers", () => {
    it("awards 3 stars with 0 wrong answers", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        steps: [createPrintStep(), createQuizStep(), createCommandStep()],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledWith(3, expect.any(Number), 3);
    });

    it("awards 2 stars with 1 wrong answer", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ mission: fourStepMission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false); // 1 hit → cover 2
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledWith(2, expect.any(Number), 2);
    });

    it("awards 1 star with 2 wrong answers", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ mission: fiveStepMission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false); // hit 1, cover 2
      await answerStep(false); // hit 2, cover 1
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledWith(1, expect.any(Number), 1);
    });

    it("hitting cover=0 blows cover instead of completing with 0 stars", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ mission: fiveStepMission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false); // cover 2
      await answerStep(false); // cover 1
      await answerStep(false); // cover 0 → blown

      expect(inst.lastFrame()).toContain("COVER BLOWN");
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe("FXP accumulation through mission", () => {
    it("earns 5 FXP per print step", async () => {
      const mission = createMission({
        steps: [createPrintStep(), createPrintStep(), createQuizStep()],
      });
      const inst = renderMission({ mission });
      await tick(0);

      capturedPrintOnComplete!();
      await tick(0);
      expect(inst.lastFrame()).toContain("fxp=5");

      pressKey(inst, keys.enter);
      await tick(0);

      capturedPrintOnComplete!();
      await tick(0);
      expect(inst.lastFrame()).toContain("fxp=10");
    });

    it("earns 10 FXP per correct quiz/command answer", async () => {
      const mission = createMission({
        steps: [createPrintStep(), createQuizStep(), createCommandStep()],
      });
      const inst = renderMission({ mission });
      await tick(0);

      await completePrintStep(inst); // +5 → 5
      await answerStep(true); // +10 → 15
      expect(inst.lastFrame()).toContain("fxp=15");
    });

    it("earns 0 FXP for wrong answers", async () => {
      const inst = renderMission({ mission: fourStepMission });
      await tick(0);

      await completePrintStep(inst); // +5
      await answerStep(false); // +0, cover 2
      expect(inst.lastFrame()).toContain("fxp=5");
    });

    it("accumulates FXP correctly across mixed step types", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        steps: [
          createPrintStep(),    // +5
          createQuizStep(),     // +10 (correct)
          createPrintStep(),    // +5
          createCommandStep(),  // +10 (correct)
        ],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      await completePrintStep(inst); // fxp=5
      await answerStep(true);        // fxp=15
      await completePrintStep(inst); // fxp=20
      await answerStep(true);        // fxp=30

      // The closure captures fxp before the last setFxpEarned processes
      expect(onComplete).toHaveBeenCalledWith(3, 20, 3);
    });

    it("retains FXP from print steps even when cover is blown", async () => {
      const inst = renderMission({ mission: fiveStepMission });
      await tick(0);

      await completePrintStep(inst); // +5
      expect(inst.lastFrame()).toContain("fxp=5");

      await answerStep(false);
      await answerStep(false);
      await answerStep(false); // cover blown

      expect(inst.lastFrame()).toContain("COVER BLOWN");
      expect(inst.lastFrame()).toContain("FXP earned this attempt will be retained");
    });
  });

  describe("mission complete triggers achievement checks", () => {
    it("PERFECTIONIST achievement unlocks on 3-star completion", () => {
      const unlocked = checkMissionComplete({
        missionId: "mission-1",
        stars: 3,
        durationMs: 300_000,
      });

      expect(unlocked.some((a) => a.id === "PERFECTIONIST")).toBe(true);
    });

    it("PERFECTIONIST does not unlock on 2-star completion", () => {
      const unlocked = checkMissionComplete({
        missionId: "mission-1",
        stars: 2,
        durationMs: 300_000,
      });

      expect(unlocked.some((a) => a.id === "PERFECTIONIST")).toBe(false);
    });

    it("SPEEDRUNNER achievement unlocks when mission completed in under 2 minutes", () => {
      const unlocked = checkMissionComplete({
        missionId: "mission-1",
        stars: 1,
        durationMs: 60_000,
      });

      expect(unlocked.some((a) => a.id === "SPEEDRUNNER")).toBe(true);
    });

    it("SPEEDRUNNER does not unlock at exactly 2 minutes", () => {
      const unlocked = checkMissionComplete({
        missionId: "mission-1",
        stars: 1,
        durationMs: 120_000,
      });

      expect(unlocked.some((a) => a.id === "SPEEDRUNNER")).toBe(false);
    });

    it("multiple achievements can unlock simultaneously", () => {
      const unlocked = checkMissionComplete({
        missionId: "mission-1",
        stars: 3,           // → PERFECTIONIST
        durationMs: 30_000, // → SPEEDRUNNER
      });

      expect(unlocked.some((a) => a.id === "PERFECTIONIST")).toBe(true);
      expect(unlocked.some((a) => a.id === "SPEEDRUNNER")).toBe(true);
    });

    it("achievements do not unlock twice", () => {
      const ctx: MissionCompleteContext = {
        missionId: "mission-1",
        stars: 3,
        durationMs: 300_000,
      };

      const first = checkMissionComplete(ctx);
      expect(first.some((a) => a.id === "PERFECTIONIST")).toBe(true);

      const second = checkMissionComplete(ctx);
      expect(second.some((a) => a.id === "PERFECTIONIST")).toBe(false);
    });

    it("saveMissionComplete persists stars and FXP to progress store", () => {
      saveMissionComplete("mission-1", 3, 25);
      const progress = loadProgress();

      expect(progress.completedMissions).toContain("mission-1");
      expect(progress.starRatings["mission-1"]).toBe(3);
      expect(progress.fxp).toBe(25);
    });

    it("saveMissionComplete only upgrades star rating, never downgrades", () => {
      saveMissionComplete("mission-1", 3, 25);
      saveMissionComplete("mission-1", 1, 10);

      const progress = loadProgress();
      expect(progress.starRatings["mission-1"]).toBe(3);
      expect(progress.fxp).toBe(35); // FXP always accumulates
    });
  });

  describe("step progression handles all step types", () => {
    it("print step requires ENTER to advance after typewriter completes", async () => {
      const mission = createMission({
        steps: [createPrintStep(), createQuizStep()],
      });
      const inst = renderMission({ mission });
      await tick(0);

      capturedPrintOnComplete!();
      await tick(0);

      expect(inst.lastFrame()).toContain("[ENTER] continue");
      expect(inst.lastFrame()).not.toContain("QUIZ_STEP");

      pressKey(inst, keys.enter);
      await tick(0);

      expect(inst.lastFrame()).toContain("QUIZ_STEP");
    });

    it("quiz step advances immediately on answer (no ENTER needed)", async () => {
      const mission = createMission({
        steps: [createQuizStep(), createCommandStep()],
      });
      const inst = renderMission({ mission });
      await tick(0);

      expect(inst.lastFrame()).toContain("QUIZ_STEP");
      await answerStep(true);

      expect(inst.lastFrame()).toContain("COMMAND_STEP");
    });

    it("command step advances immediately on answer (no ENTER needed)", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        steps: [createCommandStep()],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      expect(inst.lastFrame()).toContain("COMMAND_STEP");
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledOnce();
    });

    it("tracks step counter accurately through progression", async () => {
      const mission = createMission({
        steps: [
          createPrintStep(),
          createQuizStep(),
          createPrintStep(),
          createCommandStep(),
        ],
      });
      const inst = renderMission({ mission });
      await tick(0);

      expect(inst.lastFrame()).toContain("step=1/4");
      await completePrintStep(inst);

      expect(inst.lastFrame()).toContain("step=2/4");
      await answerStep(true);

      expect(inst.lastFrame()).toContain("step=3/4");
      await completePrintStep(inst);

      expect(inst.lastFrame()).toContain("step=4/4");
    });
  });

  describe("end-to-end: mission completion flow", () => {
    it("perfect mission completion produces correct stars, FXP, and unlocks PERFECTIONIST", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        id: "mission-1",
        steps: [createPrintStep(), createQuizStep(), createCommandStep()],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledWith(3, 15, 3);
      const [stars, fxp] = onComplete.mock.calls[0];

      // Simulate what app.tsx does: persist + check achievements
      saveMissionComplete(mission.id, stars, fxp);
      const unlocked = checkMissionComplete({
        missionId: mission.id,
        stars,
        durationMs: 60_000,
      });

      const progress = loadProgress();
      expect(progress.completedMissions).toContain("mission-1");
      expect(progress.starRatings["mission-1"]).toBe(3);
      expect(progress.fxp).toBe(15);

      expect(unlocked.some((a) => a.id === "PERFECTIONIST")).toBe(true);
      expect(unlocked.some((a) => a.id === "SPEEDRUNNER")).toBe(true);
    });

    it("imperfect mission completion produces lower stars and no PERFECTIONIST", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        id: "mission-2",
        steps: [
          createPrintStep(),
          createQuizStep(),
          createQuizStep(),
          createCommandStep(),
        ],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false); // wrong → cover 2, hit 1
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledWith(2, expect.any(Number), 2);
      const [stars, fxp] = onComplete.mock.calls[0];

      saveMissionComplete(mission.id, stars, fxp);
      const unlocked = checkMissionComplete({
        missionId: mission.id,
        stars,
        durationMs: 300_000,
      });

      expect(unlocked.some((a) => a.id === "PERFECTIONIST")).toBe(false);
    });

    it("cover blown does not trigger onComplete or persist", async () => {
      const onComplete = vi.fn();
      const mission = createMission({
        id: "mission-3",
        steps: [
          createPrintStep(),
          createQuizStep(),
          createQuizStep(),
          createQuizStep(),
          createCommandStep(),
        ],
      });
      const inst = renderMission({ mission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false);
      await answerStep(false);
      await answerStep(false); // cover blown

      expect(onComplete).not.toHaveBeenCalled();

      const progress = loadProgress();
      expect(progress.completedMissions).not.toContain("mission-3");
    });
  });
});
