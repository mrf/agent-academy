import type {
  Mission,
  PrintStep,
  QuizStep,
  CommandStep,
  AIStep,
} from "../../src/types.js";

export function createPrintStep(overrides?: Partial<PrintStep>): PrintStep {
  return {
    type: "print",
    text: "Test briefing text.",
    ...overrides,
  };
}

export function createQuizStep(overrides?: Partial<QuizStep>): QuizStep {
  return {
    type: "quiz",
    question: "What is the correct answer?",
    options: ["Alpha", "Bravo", "Charlie", "Delta"],
    correct: 1,
    explanation: "Bravo is the correct answer.",
    ...overrides,
  };
}

export function createCommandStep(
  overrides?: Partial<CommandStep>,
): CommandStep {
  return {
    type: "command",
    question: "Type the command to list files.",
    expectedAnswer: "ls",
    acceptedVariants: ["ls", "ls -la", "ls -a"],
    explanation: "The ls command lists directory contents.",
    ...overrides,
  };
}

export function createAIStep(overrides?: Partial<AIStep>): AIStep {
  return {
    type: "ai",
    prompt: "Explain what this code does.",
    criteria: "Response should demonstrate understanding of code reading.",
    ...overrides,
  };
}

export function createMission(overrides?: Partial<Mission>): Mission {
  return {
    id: "mission-test",
    codename: "TEST OPS",
    title: "Test Mission",
    objectives: ["Verify test infrastructure works"],
    steps: [
      createPrintStep(),
      createQuizStep(),
      createCommandStep(),
    ],
    ...overrides,
  };
}
