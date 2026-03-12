// Model IDs

export const MODELS = {
  HANDLER: "claude-haiku-4-5-20251001",
  GENERATOR: "claude-sonnet-4-20250514",
  EVALUATOR: "claude-haiku-4-5-20251001",
} as const;

// Color palette (hex)

export const COLORS = {
  warmWhite: "#E8E6E3",
  amber: "#FFB627",
  green: "#39FF14",
  dimGreen: "#1A7A0A",
  red: "#FF3131",
  cyan: "#00D4FF",
  gray: "#6B6B6B",
  gold: "#FFD700",
} as const;

// Timing values (milliseconds)

export const TIMING = {
  typewriterFast: 10,
  typewriterNormal: 20,
  typewriterDramatic: 40,
  pauseBeforeResult: 400,
  pauseAfterConfirmed: 600,
  pauseAfterCompromised: 800,
  screenTransition: 200,
  tokenBuffer: 50,
  cursorBlink: 500,
  thinkingDots: 150,
  fxpTick: 30,
  achievementDisplay: 3000,
  evalTimeout: 10_000,
} as const;

// Version

export const VERSION = "0.1.0";
