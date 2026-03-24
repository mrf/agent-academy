import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InfiniteMode } from "../../src/screens/InfiniteMode.js";
import { MISSIONS } from "../../src/data/curriculum.js";
import { TIMING } from "../../src/constants.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  tick,
  type RenderResult,
} from "../helpers/render-ink.js";
import type { SaveData } from "../../src/types.js";

// ── Mocks ─────────────────────────────────────────────────────────────

const mockLoadProgress = vi.fn<() => SaveData>();
const mockSaveInfiniteResult = vi.fn();
const mockReportBadQuestion = vi.fn();

vi.mock("../../src/store/progress.js", () => ({
  loadProgress: () => mockLoadProgress(),
  saveInfiniteResult: (...args: unknown[]) => mockSaveInfiniteResult(...args),
  reportBadQuestion: (...args: unknown[]) => mockReportBadQuestion(...args),
}));

const mockGenerateFieldAssessments = vi.fn();

vi.mock("../../src/ai/quiz-gen.js", () => ({
  generateFieldAssessments: (...args: unknown[]) =>
    mockGenerateFieldAssessments(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function freshProgress(overrides?: Partial<SaveData>): SaveData {
  return {
    schemaVersion: 1,
    completedMissions: [],
    starRatings: {},
    fxp: 0,
    clearanceLevel: "recruit",
    achievements: [],
    quizStats: { correct: 0, total: 0 },
    infiniteModeStats: {
      correct: 0,
      total: 0,
      sessionsPlayed: 0,
      fxpEarned: 0,
    },
    infiniteModeUnlocked: false,
    firstRunComplete: false,
    lastPlayedAt: 0,
    handlerEverUsed: false,
    legacyModeUnlocked: false,
    ...overrides,
  };
}

function withCompletedMissions(ids: string[]): SaveData {
  const starRatings: Record<string, 1 | 2 | 3> = {};
  for (const id of ids) starRatings[id] = 3;
  return freshProgress({
    completedMissions: ids,
    starRatings,
    fxp: 500,
    clearanceLevel: "operative",
  });
}

function fakeApiResults(count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Question ${i + 1}?`,
    options: [
      `Wrong A${i}`,
      `Wrong B${i}`,
      `Correct ${i}`,
      `Wrong D${i}`,
    ] as [string, string, string, string],
    correct: 2 as 0 | 1 | 2 | 3,
    explanation: `Explanation ${i + 1}`,
  }));
}

function renderInfiniteMode(
  overrides: { onBack?: ReturnType<typeof vi.fn>; overlayOpen?: boolean } = {},
): RenderResult {
  const { onBack = vi.fn(), overlayOpen = false } = overrides;
  return renderInk(<InfiniteMode onBack={onBack} overlayOpen={overlayOpen} />);
}

/**
 * Press a key and flush React's scheduler + faked setImmediate so the
 * re-render triggered by the key press is complete before we continue.
 * Multiple flush cycles are needed because React 18's scheduler chains
 * setImmediates: render → layout effects → passive effects (useEffect).
 */
async function press(inst: RenderResult, key: string): Promise<void> {
  pressKey(inst, key);
  for (let i = 0; i < 3; i++) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

/** Navigate: topic → difficulty → confirm → generate → quiz */
async function navigateToQuiz(
  inst: RenderResult,
  opts: { topicIndex?: number; difficultyIndex?: number } = {},
): Promise<void> {
  const { topicIndex = 0, difficultyIndex = 0 } = opts;

  // Select topic
  for (let i = 0; i < topicIndex; i++) await press(inst, keys.arrowDown);
  await press(inst, keys.enter);

  // Select difficulty
  for (let i = 0; i < difficultyIndex; i++) await press(inst, keys.arrowDown);
  await press(inst, keys.enter);

  // Confirm — begin assessment (enter handled by useInput, not SelectInput)
  await press(inst, keys.enter);
  // Extra flush for async startGeneration promise chain
  await tick(0);
}

/** Answer the current quiz question (correct answer is at index 2) */
async function answerQuestion(inst: RenderResult, chooseCorrect = true): Promise<void> {
  if (chooseCorrect) {
    await press(inst, keys.arrowDown);
    await press(inst, keys.arrowDown);
  }
  await press(inst, keys.enter);

  // Wait for result phase to appear
  await tick(TIMING.pauseBeforeResult);
  await tick(0);

  // Press Enter to continue past the result
  await press(inst, keys.enter);
}

// ── Setup / Teardown ──────────────────────────────────────────────────

const COMPLETED_IDS = [MISSIONS[0]!.id, MISSIONS[1]!.id];

beforeEach(() => {
  vi.useFakeTimers();
  mockLoadProgress.mockReturnValue(withCompletedMissions(COMPLETED_IDS));
  mockGenerateFieldAssessments.mockResolvedValue(fakeApiResults());
  mockSaveInfiniteResult.mockReset();
  mockReportBadQuestion.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe("InfiniteMode", () => {
  // ── Topic selection ─────────────────────────────────────────────────

  describe("topic selection", () => {
    it("renders DEEP COVER OPERATIONS header", () => {
      const inst = renderInfiniteMode();
      expect(inst.lastFrame()).toContain("DEEP COVER OPERATIONS");
    });

    it("renders completed mission topics as selectable items", () => {
      const inst = renderInfiniteMode();
      const frame = inst.lastFrame()!;
      expect(frame).toContain(MISSIONS[0]!.title);
      expect(frame).toContain(MISSIONS[1]!.title);
    });

    it("does not render uncompleted mission topics", () => {
      const inst = renderInfiniteMode();
      const frame = inst.lastFrame()!;
      if (MISSIONS[2]) {
        expect(frame).not.toContain(MISSIONS[2].title);
      }
    });

    it("shows lifetime stats when sessions have been played", () => {
      const progress = withCompletedMissions(COMPLETED_IDS);
      progress.infiniteModeStats = {
        correct: 10,
        total: 15,
        sessionsPlayed: 3,
        fxpEarned: 150,
      };
      mockLoadProgress.mockReturnValue(progress);

      const inst = renderInfiniteMode();
      const frame = inst.lastFrame()!;
      expect(frame).toContain("3");
      expect(frame).toContain("10/15");
      expect(frame).toContain("150");
    });

    it("shows ESC back hint", () => {
      const inst = renderInfiniteMode();
      expect(inst.lastFrame()).toContain("Back to mission map");
    });
  });

  // ── Difficulty selection ────────────────────────────────────────────

  describe("difficulty selection", () => {
    it("navigates to difficulty select after choosing a topic", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter);

      const frame = inst.lastFrame()!;
      expect(frame).toContain("RECRUIT");
      expect(frame).toContain("OPERATIVE");
      expect(frame).toContain("ELITE");
      expect(frame).toContain("Select clearance tier");
    });

    it("shows selected topic name in difficulty phase", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter);

      const frame = inst.lastFrame()!;
      expect(frame).toContain(MISSIONS[0]!.title);
      expect(frame).toContain("Select clearance tier");
    });

    it("ESC goes back to topic selection", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic → difficulty
      await press(inst, keys.escape); // difficulty → topic

      expect(inst.lastFrame()).toContain("Select mission topic");
    });
  });

  // ── Confirm phase ──────────────────────────────────────────────────

  describe("confirm phase", () => {
    it("shows topic, tier, and question count", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic
      await press(inst, keys.enter); // difficulty (recruit)

      const frame = inst.lastFrame()!;
      expect(frame).toContain(MISSIONS[0]!.title);
      expect(frame).toContain("RECRUIT");
      expect(frame).toContain("5");
      expect(frame).toContain("Begin assessment");
    });

    it("shows estimated API cost", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter);
      await press(inst, keys.enter);

      expect(inst.lastFrame()).toContain("$0.02");
    });

    it("ESC goes back to difficulty selection", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic
      await press(inst, keys.enter); // difficulty → confirm
      await press(inst, keys.escape); // confirm → difficulty

      expect(inst.lastFrame()).toContain("Select clearance tier");
    });
  });

  // ── Quiz generation & quiz loop ────────────────────────────────────

  describe("quiz loop", () => {
    it("shows generating phase while waiting for API", async () => {
      mockGenerateFieldAssessments.mockReturnValue(new Promise(() => {}));

      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic
      await press(inst, keys.enter); // difficulty
      await press(inst, keys.enter); // confirm

      expect(inst.lastFrame()).toContain("Generating field assessment");
    });

    it("shows [ESC] Cancel hint during generating phase", async () => {
      mockGenerateFieldAssessments.mockReturnValue(new Promise(() => {}));

      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic
      await press(inst, keys.enter); // difficulty
      await press(inst, keys.enter); // confirm

      expect(inst.lastFrame()).toContain("[ESC] Cancel");
    });

    it("ESC during generating aborts and returns to confirm", async () => {
      mockGenerateFieldAssessments.mockReturnValue(new Promise(() => {}));

      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic
      await press(inst, keys.enter); // difficulty
      await press(inst, keys.enter); // confirm → generating

      expect(inst.lastFrame()).toContain("Generating field assessment");

      await press(inst, keys.escape);

      const frame = inst.lastFrame()!;
      expect(frame).toContain("Begin assessment");
      expect(frame).not.toContain("Generating field assessment");
    });

    it("ESC during generating does not show error", async () => {
      mockGenerateFieldAssessments.mockReturnValue(new Promise(() => {}));

      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic
      await press(inst, keys.enter); // difficulty
      await press(inst, keys.enter); // confirm
      await press(inst, keys.escape); // cancel generation

      const frame = inst.lastFrame()!;
      expect(frame).not.toContain("Generation failed");
      expect(frame).not.toContain("Error");
    });

    it("renders quiz questions after generation", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);

      const frame = inst.lastFrame()!;
      expect(frame).toContain("Q 1/5");
      expect(frame).toContain("Question 1?");
      expect(frame).toContain("FXP:");
    });

    it("advances to next question after answering", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);
      await answerQuestion(inst, true);

      const frame = inst.lastFrame()!;
      expect(frame).toContain("Q 2/5");
      expect(frame).toContain("Question 2?");
    });

    it("tracks correct/total score during quiz", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);
      await answerQuestion(inst, true);

      expect(inst.lastFrame()).toContain("1/1 correct");
    });

    it("tracks FXP earned for correct answers", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);
      await answerQuestion(inst, true);

      expect(inst.lastFrame()).toContain("15");
    });

    it("does not earn FXP for wrong answers", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);
      await answerQuestion(inst, false);

      const frame = inst.lastFrame()!;
      expect(frame).toContain("FXP:");
      expect(frame).toContain("0/1 correct");
    });
  });

  // ── Summary phase ──────────────────────────────────────────────────

  describe("summary", () => {
    async function completeSingleQuestionQuiz(
      inst: RenderResult,
      correct: boolean,
    ): Promise<void> {
      mockGenerateFieldAssessments.mockResolvedValue(fakeApiResults(1));
      await navigateToQuiz(inst);
      await answerQuestion(inst, correct);
    }

    it("shows assessment complete after all questions answered", async () => {
      const inst = renderInfiniteMode();
      await completeSingleQuestionQuiz(inst, true);
      expect(inst.lastFrame()).toContain("ASSESSMENT COMPLETE");
    });

    it("shows final score", async () => {
      const inst = renderInfiniteMode();
      await completeSingleQuestionQuiz(inst, true);
      expect(inst.lastFrame()).toContain("1/1");
    });

    it("shows accuracy percentage", async () => {
      const inst = renderInfiniteMode();
      await completeSingleQuestionQuiz(inst, true);
      expect(inst.lastFrame()).toContain("100%");
    });

    it("shows FXP earned in summary", async () => {
      const inst = renderInfiniteMode();
      await completeSingleQuestionQuiz(inst, true);
      expect(inst.lastFrame()).toContain("+15");
    });

    it("saves infinite result on completion", async () => {
      const inst = renderInfiniteMode();
      await completeSingleQuestionQuiz(inst, true);
      expect(mockSaveInfiniteResult).toHaveBeenCalledWith(1, 1, 15);
    });

    it("ENTER returns to topic selection", async () => {
      const inst = renderInfiniteMode();
      await completeSingleQuestionQuiz(inst, true);
      await press(inst, keys.enter);

      expect(inst.lastFrame()).toContain("Select mission topic");
    });

    it("ESC calls onBack from summary", async () => {
      const onBack = vi.fn();
      const inst = renderInfiniteMode({ onBack });
      await completeSingleQuestionQuiz(inst, true);
      await press(inst, keys.escape);

      expect(onBack).toHaveBeenCalledOnce();
    });
  });

  // ── Report bad question ─────────────────────────────────────────────

  describe("report bad question [R]", () => {
    it("pressing R reports the current question", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);

      await press(inst, "r");

      expect(mockReportBadQuestion).toHaveBeenCalledWith(
        "Question 1?",
        MISSIONS[0]!.title,
        "recruit",
      );
    });

    it("shows reported confirmation after pressing R", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);

      await press(inst, "R");

      expect(inst.lastFrame()).toContain("Reported");
    });

    it("does not double-report on second R press", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);

      await press(inst, "r");
      await press(inst, "r");

      expect(mockReportBadQuestion).toHaveBeenCalledTimes(1);
    });

    it("reported state resets on next question", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst);

      await press(inst, "r");
      expect(inst.lastFrame()).toContain("Reported");

      await answerQuestion(inst, true);

      expect(inst.lastFrame()).toContain("Report bad question");
    });
  });

  // ── Back navigation ─────────────────────────────────────────────────

  describe("back navigation", () => {
    it("ESC on topic-select calls onBack", async () => {
      const onBack = vi.fn();
      const inst = renderInfiniteMode({ onBack });
      await press(inst, keys.escape);

      expect(onBack).toHaveBeenCalledOnce();
    });

    it("ESC on difficulty-select goes back to topic-select", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic → difficulty
      await press(inst, keys.escape); // difficulty → topic

      expect(inst.lastFrame()).toContain("Select mission topic");
    });

    it("ESC on confirm goes back to difficulty-select", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic
      await press(inst, keys.enter); // difficulty → confirm
      await press(inst, keys.escape); // confirm → difficulty

      expect(inst.lastFrame()).toContain("Select clearance tier");
    });

    it("ESC does not fire when overlayOpen is true", async () => {
      const onBack = vi.fn();
      const inst = renderInfiniteMode({ onBack, overlayOpen: true });
      await press(inst, keys.escape);

      expect(onBack).not.toHaveBeenCalled();
    });
  });

  // ── Error handling ──────────────────────────────────────────────────

  describe("error handling", () => {
    /** Navigate topic -> difficulty -> confirm -> submit (flushes async result) */
    async function submitFromConfirm(inst: RenderResult): Promise<void> {
      await press(inst, keys.enter); // topic
      await press(inst, keys.enter); // difficulty
      await press(inst, keys.enter); // confirm
      await tick(0);
    }

    it("shows error when generation fails", async () => {
      mockGenerateFieldAssessments.mockRejectedValue(
        new Error("API key invalid"),
      );

      const inst = renderInfiniteMode();
      await submitFromConfirm(inst);

      expect(inst.lastFrame()).toContain("API key invalid");
    });

    it("returns to confirm phase on error so user can retry", async () => {
      mockGenerateFieldAssessments.mockRejectedValue(
        new Error("Network error"),
      );

      const inst = renderInfiniteMode();
      await submitFromConfirm(inst);

      const frame = inst.lastFrame()!;
      expect(frame).toContain("Network error");
      expect(frame).toContain("Begin assessment");
    });

    it("shows fallback message for non-Error throws", async () => {
      mockGenerateFieldAssessments.mockRejectedValue("something broke");

      const inst = renderInfiniteMode();
      await submitFromConfirm(inst);

      expect(inst.lastFrame()).toContain("Generation failed");
    });

    it("shows API key message when zero questions returned", async () => {
      mockGenerateFieldAssessments.mockResolvedValue([]);

      const inst = renderInfiniteMode();
      await submitFromConfirm(inst);

      const frame = inst.lastFrame()!;
      expect(frame).toContain("No questions generated");
      expect(frame).toContain("API key");
    });

    it("can retry after error", async () => {
      mockGenerateFieldAssessments.mockRejectedValueOnce(
        new Error("Temporary failure"),
      );
      mockGenerateFieldAssessments.mockResolvedValue(fakeApiResults());

      const inst = renderInfiniteMode();
      await submitFromConfirm(inst);

      expect(inst.lastFrame()).toContain("Temporary failure");

      // Retry from confirm screen
      await press(inst, keys.enter);
      await tick(0);

      expect(inst.lastFrame()).toContain("Q 1/5");
    });
  });

  // ── Difficulty tier selection ───────────────────────────────────────

  describe("difficulty tiers", () => {
    it("passes operative difficulty to generator", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst, { difficultyIndex: 1 });

      expect(mockGenerateFieldAssessments).toHaveBeenCalledWith(
        MISSIONS[0]!.title,
        "operative",
        5,
        1,
        expect.any(AbortSignal),
      );
    });

    it("passes elite difficulty to generator", async () => {
      const inst = renderInfiniteMode();
      await navigateToQuiz(inst, { difficultyIndex: 2 });

      expect(mockGenerateFieldAssessments).toHaveBeenCalledWith(
        MISSIONS[0]!.title,
        "elite",
        5,
        1,
        expect.any(AbortSignal),
      );
    });

    it("shows selected difficulty on confirm screen", async () => {
      const inst = renderInfiniteMode();
      await press(inst, keys.enter); // topic

      await press(inst, keys.arrowDown); // operative
      await press(inst, keys.enter); // select operative → confirm

      expect(inst.lastFrame()).toContain("OPERATIVE");
    });
  });
});
