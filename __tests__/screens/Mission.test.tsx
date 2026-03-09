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
import type { Mission as MissionType } from "../../src/types.js";

// ── Mocks ──────────────────────────────────────────────────────────────

// Capture onComplete / onAnswer callbacks from child components so tests
// can drive step progression imperatively.
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
  BottomBar: (props: { currentStep: number; totalSteps: number }) => (
    <Text>
      BOTTOM step={props.currentStep}/{props.totalSteps}
    </Text>
  ),
}));

vi.mock("../../src/store/progress.js", () => ({
  saveStepProgress: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────

/** Flush fake timers with extra cycles for React state updates from useInput. */
async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(0);
}

/** Mission with an extra quiz step so a single wrong answer doesn't blow cover. */
const fourStepMission = createMission({
  steps: [createPrintStep(), createQuizStep(), createQuizStep(), createCommandStep()],
});

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

/** Complete a print step: trigger onComplete callback, then press ENTER to advance. */
async function completePrintStep(inst: RenderResult): Promise<void> {
  capturedPrintOnComplete!();
  await tick(0);
  pressKey(inst, keys.enter);
  await tick(0);
}

/** Answer a quiz or command step (correct or incorrect). */
async function answerStep(correct: boolean): Promise<void> {
  capturedOnAnswer!(correct);
  await tick(0);
}

// ── Setup / Teardown ──────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  capturedPrintOnComplete = null;
  capturedOnAnswer = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────────────────────

describe("Mission", () => {
  // ── Step progression ───────────────────────────────────────────────

  describe("step progression", () => {
    it("renders the first step (print) initially", async () => {
      const inst = renderMission();
      await tick(0);
      expect(inst.lastFrame()).toContain("PRINT:");
    });

    it("progresses from print → quiz → command", async () => {
      const inst = renderMission();
      await tick(0);

      // Step 1: print
      expect(inst.lastFrame()).toContain("PRINT:");
      await completePrintStep(inst);

      // Step 2: quiz
      expect(inst.lastFrame()).toContain("QUIZ_STEP");
      await answerStep(true);

      // Step 3: command
      expect(inst.lastFrame()).toContain("COMMAND_STEP");
    });

    it("shows [ENTER] continue prompt after print step completes", async () => {
      const inst = renderMission();
      await tick(0);

      capturedPrintOnComplete!();
      await tick(0);
      expect(inst.lastFrame()).toContain("[ENTER] continue");
    });
  });

  // ── FXP accumulation ──────────────────────────────────────────────

  describe("FXP accumulation", () => {
    it("earns 5 FXP for completing a print step", async () => {
      const inst = renderMission();
      await tick(0);

      capturedPrintOnComplete!();
      await tick(0);
      expect(inst.lastFrame()).toContain("fxp=5");
    });

    it("earns 10 FXP for a correct quiz answer", async () => {
      const inst = renderMission();
      await tick(0);

      await completePrintStep(inst); // +5 FXP
      await answerStep(true); // +10 FXP = 15

      expect(inst.lastFrame()).toContain("fxp=15");
    });

    it("earns no extra FXP for wrong answer", async () => {
      const inst = renderMission({ mission: fourStepMission });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false);

      expect(inst.lastFrame()).toContain("fxp=5");
    });

    it("accumulates FXP across all steps", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ onComplete });
      await tick(0);

      await completePrintStep(inst); // +5
      await answerStep(true); // +10
      await answerStep(true); // +10

      // Refs ensure onComplete receives the up-to-date accumulated FXP
      expect(onComplete).toHaveBeenCalledWith(3, 25, 3);
    });
  });

  // ── Cover integrity ───────────────────────────────────────────────

  describe("cover integrity", () => {
    it("starts at 3", async () => {
      const inst = renderMission();
      await tick(0);
      expect(inst.lastFrame()).toContain("cover=3");
    });

    it("decrements on wrong answer", async () => {
      const inst = renderMission({ mission: fourStepMission });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false);

      expect(inst.lastFrame()).toContain("cover=2");
    });

    it("does not decrement on correct answer", async () => {
      const inst = renderMission();
      await tick(0);

      await completePrintStep(inst);
      await answerStep(true);
      expect(inst.lastFrame()).toContain("cover=3");
    });

    it("shows COVER BLOWN at 0 cover", async () => {
      const inst = renderMission({ mission: fiveStepMission });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false); // cover 3 → 2
      await answerStep(false); // cover 2 → 1
      await answerStep(false); // cover 1 → 0

      expect(inst.lastFrame()).toContain("COVER BLOWN");
    });

    it("restarts mission on ENTER after cover blown", async () => {
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
      expect(inst.lastFrame()).not.toContain("COVER BLOWN");
    });
  });

  // ── Star calculation ──────────────────────────────────────────────

  describe("star calculation", () => {
    it("awards 3 stars with 0 wrong answers (cover=3)", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledWith(3, expect.any(Number), 3);
    });

    it("awards 2 stars with 1 wrong answer (cover=2)", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ mission: fourStepMission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false); // cover 3 → 2
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledWith(2, expect.any(Number), 2);
    });

    it("awards 1 star with 2+ wrong answers (cover=1)", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ mission: fiveStepMission, onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(false); // cover 3 → 2
      await answerStep(false); // cover 2 → 1
      await answerStep(true);
      await answerStep(true);

      expect(onComplete).toHaveBeenCalledWith(1, expect.any(Number), 1);
    });
  });

  // ── Mission complete callback ─────────────────────────────────────

  describe("mission complete callback", () => {
    it("calls onComplete with stars and fxp after last step", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ onComplete });
      await tick(0);

      await completePrintStep(inst); // +5 FXP
      await answerStep(true); // +10 FXP
      await answerStep(true); // +10 FXP

      expect(onComplete).toHaveBeenCalledOnce();
      // Refs ensure onComplete receives the up-to-date accumulated FXP
      expect(onComplete).toHaveBeenCalledWith(3, 25, 3);
    });

    it("does not call onComplete before all steps are done", async () => {
      const onComplete = vi.fn();
      const inst = renderMission({ onComplete });
      await tick(0);

      await completePrintStep(inst);
      await answerStep(true); // one step still remaining

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // ── StatusBar and BottomBar rendering ─────────────────────────────

  describe("StatusBar and BottomBar", () => {
    it("renders StatusBar with correct props", async () => {
      const inst = renderMission();
      await tick(0);
      const frame = inst.lastFrame()!;
      expect(frame).toContain("STATUS");
      expect(frame).toContain("cover=3");
      expect(frame).toContain("fxp=0");
      expect(frame).toContain("step=1/3");
    });

    it("renders BottomBar with step info", async () => {
      const inst = renderMission();
      await tick(0);
      const frame = inst.lastFrame()!;
      expect(frame).toContain("BOTTOM");
      expect(frame).toContain("step=1/3");
    });

    it("updates StatusBar step counter as steps progress", async () => {
      const inst = renderMission();
      await tick(0);

      expect(inst.lastFrame()).toContain("step=1/3");

      await completePrintStep(inst);
      expect(inst.lastFrame()).toContain("step=2/3");

      await answerStep(true);
      expect(inst.lastFrame()).toContain("step=3/3");
    });
  });
});
