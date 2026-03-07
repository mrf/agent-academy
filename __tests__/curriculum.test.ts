import { describe, it, expect } from "vitest";
import { MISSIONS } from "../src/data/curriculum.js";
import type { Step, QuizStep, CommandStep } from "../src/types.js";

// ── Helpers ─────────────────────────────────────────────────────────

function stepsOfType<T extends Step>(type: T["type"]): T[] {
  return MISSIONS.flatMap((m) => m.steps.filter((s) => s.type === type)) as T[];
}

// ── Required fields ─────────────────────────────────────────────────

describe("mission structure", () => {
  it("has at least one mission", () => {
    expect(MISSIONS.length).toBeGreaterThan(0);
  });

  it.each(MISSIONS.map((m) => [m.id, m]))(
    "%s has all required fields",
    (_id, mission) => {
      expect(mission.id).toBeTruthy();
      expect(mission.codename).toBeTruthy();
      expect(mission.title).toBeTruthy();
      expect(mission.objectives.length).toBeGreaterThan(0);
      expect(mission.steps.length).toBeGreaterThan(0);
    },
  );
});

// ── CommandStep variants ────────────────────────────────────────────

describe("CommandStep acceptedVariants", () => {
  const commandSteps = stepsOfType<CommandStep>("command");

  it("has at least one CommandStep in the curriculum", () => {
    expect(commandSteps.length).toBeGreaterThan(0);
  });

  it.each(commandSteps.map((s) => [s.expectedAnswer, s]))(
    "command '%s' has at least 2 acceptedVariants",
    (_answer, step) => {
      expect(step.acceptedVariants.length).toBeGreaterThanOrEqual(2);
    },
  );
});

// ── QuizStep options ────────────────────────────────────────────────

describe("QuizStep options", () => {
  const quizSteps = stepsOfType<QuizStep>("quiz");

  it("has at least one QuizStep in the curriculum", () => {
    expect(quizSteps.length).toBeGreaterThan(0);
  });

  it.each(quizSteps.map((s, i) => [`quiz #${i + 1}: ${s.question.slice(0, 50)}`, s]))(
    "%s has exactly 4 options",
    (_label, step) => {
      expect(step.options).toHaveLength(4);
    },
  );

  it.each(quizSteps.map((s, i) => [`quiz #${i + 1}`, s]))(
    "%s has correct index 0-3",
    (_label, step) => {
      expect(step.correct).toBeGreaterThanOrEqual(0);
      expect(step.correct).toBeLessThanOrEqual(3);
    },
  );
});

// ── Interactive step ratio ──────────────────────────────────────────

describe("interactive step ratio", () => {
  it.each(MISSIONS.map((m) => [m.id, m]))(
    "%s has at least 40%% interactive steps",
    (_id, mission) => {
      const interactive = mission.steps.filter(
        (s) => s.type === "quiz" || s.type === "command" || s.type === "ai",
      );
      const ratio = interactive.length / mission.steps.length;
      expect(ratio).toBeGreaterThanOrEqual(0.4);
    },
  );
});
