// Step types — discriminated union on `type` field

export type PrintStep = {
  type: "print";
  text: string;
  speed?: "fast" | "normal" | "dramatic";
};

export type QuizStep = {
  type: "quiz";
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
};

export type CommandStep = {
  type: "command";
  question: string;
  expectedAnswer: string;
  acceptedVariants: string[];
  explanation: string;
};

export type AIStep = {
  type: "ai";
  prompt: string;
};

export type Step = PrintStep | QuizStep | CommandStep | AIStep;

// Mission

export type Mission = {
  id: string;
  codename: string;
  title: string;
  objectives: string[];
  steps: Step[];
};

// Navigation

export type Screen =
  | "logo"
  | "onboarding"
  | "missionMap"
  | "briefing"
  | "mission"
  | "debrief";

export type Overlay = {
  handler: boolean;
  help: boolean;
};

// Game config

export interface GameConfig {
  noAnimation: boolean;
}

// Mission runtime state

export type Answer = {
  stepIndex: number;
  correct: boolean;
};

export type MissionState = {
  currentMissionIndex: number;
  currentStepIndex: number;
  coverIntegrity: number;
  answers: Answer[];
  fxpEarned: number;
};

// Persistence

export type ClearanceLevel = "recruit" | "operative" | "elite";

export type QuizStats = {
  correct: number;
  total: number;
};

export type SaveData = {
  schemaVersion: number;
  completedMissions: string[];
  starRatings: Record<string, 1 | 2 | 3>;
  fxp: number;
  clearanceLevel: ClearanceLevel;
  achievements: string[];
  quizStats: QuizStats;
  infiniteModeUnlocked: boolean;
  firstRunComplete: boolean;
  lastPlayedAt: number;
  handlerEverUsed: boolean;
};
