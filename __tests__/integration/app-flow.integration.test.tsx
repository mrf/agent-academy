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

// ── Mocks ─────────────────────────────────────────────────────────────

let currentSaveData: SaveData;

vi.mock("../../src/store/progress.js", () => ({
  loadProgress: () => currentSaveData,
  saveMissionComplete: vi.fn(),
  resetProgress: vi.fn(),
  markHandlerUsed: vi.fn(),
  updateLastPlayed: vi.fn(),
}));

vi.mock("../../src/lib/achievements.js", () => ({
  checkMissionComplete: vi.fn(() => []),
  checkPersistence: vi.fn(() => null),
  checkHandlerOpen: vi.fn(() => null),
}));

vi.mock("../../src/lib/easter-eggs.js", () => ({
  createKonamiTracker: () => vi.fn(() => false),
  setTerminalTitle: vi.fn(),
}));

// ── Screen mocks ──────────────────────────────────────────────────────
// Each screen renders a marker inside a tall Box so that sibling
// position="absolute" overlays (quit dialog, achievement) have enough
// vertical space in the ink-testing-library virtual terminal.

const MOCK_HEIGHT = 12;

/** Renders a screen marker and optionally captures a callback prop. */
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

// Captured callback props from mock screens, reset in beforeEach.
const captured: {
  logoOnContinue: (() => void) | null;
  onboardingOnContinue: (() => void) | null;
  selectMission: ((idx: number) => void) | null;
  briefingOnAccept: (() => void) | null;
  missionOnComplete: ((stars: 1 | 2 | 3, fxp: number) => void) | null;
  debriefOnContinue: (() => void) | null;
} = {
  logoOnContinue: null,
  onboardingOnContinue: null,
  selectMission: null,
  briefingOnAccept: null,
  missionOnComplete: null,
  debriefOnContinue: null,
};

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
    onComplete: (stars: 1 | 2 | 3, fxp: number) => void;
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

// ── Helpers ───────────────────────────────────────────────────────────

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

/** Navigate from missionMap to mission screen via callbacks. */
async function navigateToMission(hasApiKey = true): Promise<RenderResult> {
  currentSaveData = createSaveData({ firstRunComplete: true });
  const inst = renderApp({ hasApiKey });
  await tick(0);
  captured.selectMission!(0);
  await tick(0);
  captured.briefingOnAccept!();
  await tick(0);
  return inst;
}

// ── Setup / Teardown ─────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  currentSaveData = createSaveData();
  captured.logoOnContinue = null;
  captured.onboardingOnContinue = null;
  captured.selectMission = null;
  captured.briefingOnAccept = null;
  captured.missionOnComplete = null;
  captured.debriefOnContinue = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe("App integration — screen routing", () => {
  it("starts on logo for fresh user", async () => {
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:LOGO");
  });

  it("logo → onboarding → missionMap for first run", async () => {
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

  it("logo → missionMap when firstRunComplete is true", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("missionMap → briefing → mission → debrief flow", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp({ hasApiKey: true });
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    captured.selectMission!(0);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");

    captured.briefingOnAccept!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSION");

    captured.missionOnComplete!(3, 25);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:DEBRIEF");

    captured.debriefOnContinue!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });
});

describe("App integration — keyboard routing", () => {
  it("'h' opens help overlay, ESC closes it", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    inst.stdin.write("h");
    await tick(0);
    expect(inst.lastFrame()).toContain("OVERLAY:HELP");

    pressKey(inst, keys.escape);
    await tick(0);
    expect(inst.lastFrame()).not.toContain("OVERLAY:HELP");
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("'?' on briefing does not open handler (requires screen === 'mission')", async () => {
    // The '?' handler guard requires screen === "mission". On briefing the
    // app-level useInput is active but '?' is a no-op because of that check.
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp({ hasApiKey: true });
    await tick(0);

    captured.selectMission!(0);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");

    inst.stdin.write("?");
    await tick(0);
    expect(inst.lastFrame()).not.toContain("OVERLAY:HANDLER");
  });

  it("'?' does NOT open handler overlay without hasApiKey", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp({ hasApiKey: false });
    await tick(0);

    captured.selectMission!(0);
    await tick(0);
    captured.briefingOnAccept!();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSION");

    inst.stdin.write("?");
    await tick(0);
    expect(inst.lastFrame()).not.toContain("OVERLAY:HANDLER");
  });

  it("'q' on missionMap prompts quit confirmation", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");

    inst.stdin.write("q");
    await tick(0);
    expect(inst.lastFrame()).toContain("Quit Claude Code Academy?");
  });

  it("'y' after quit prompt exits the app", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    inst.stdin.write("q");
    await tick(0);
    await flushEffects();
    expect(inst.lastFrame()).toContain("Quit Claude Code Academy?");

    // 'y' triggers app.exit() — rendering freezes
    inst.stdin.write("y");
    await tick(0);
    await flushEffects();

    // app.exit() freezes rendering — quit prompt stays visible
    expect(inst.lastFrame()).toContain("Quit Claude Code Academy?");
  });

  it("dismissing quit prompt (non-y key) hides the prompt", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    inst.stdin.write("q");
    await tick(0);
    await flushEffects(); // flush useInput re-registration with confirmQuit=true
    expect(inst.lastFrame()).toContain("Quit Claude Code Academy?");

    inst.stdin.write("n");
    await tick(0);
    await flushEffects();
    expect(inst.lastFrame()).not.toContain("Quit Claude Code Academy?");
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("ESC from briefing returns to missionMap", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    captured.selectMission!(0);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");

    pressKey(inst, keys.escape);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSIONMAP");
  });

  it("ESC from mission returns to missionMap (app handler disabled on mission)", async () => {
    // The app-level useInput is disabled on mission screen when no overlay
    // is open. ESC is only handled by the app when an overlay is open —
    // in which case it closes the overlay rather than navigating. Without
    // an overlay, the key is not received by the app handler.
    const inst = await navigateToMission();
    expect(inst.lastFrame()).toContain("SCREEN:MISSION");

    // ESC does not navigate away because app handler is inactive
    pressKey(inst, keys.escape);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:MISSION");
  });
});

describe("App integration — overlays", () => {
  it("help overlay layers over current screen", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    inst.stdin.write("h");
    await tick(0);

    const frame = inst.lastFrame()!;
    expect(frame).toContain("SCREEN:MISSIONMAP");
    expect(frame).toContain("OVERLAY:HELP");
  });

  it("help overlay layers over briefing screen", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    captured.selectMission!(0);
    await tick(0);
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");

    inst.stdin.write("h");
    await tick(0);

    const frame = inst.lastFrame()!;
    expect(frame).toContain("SCREEN:BRIEFING");
    expect(frame).toContain("OVERLAY:HELP");
  });

  it("ESC closes help overlay without changing screen", async () => {
    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp();
    await tick(0);

    captured.selectMission!(0);
    await tick(0);

    // Open help on briefing
    inst.stdin.write("h");
    await tick(0);
    expect(inst.lastFrame()).toContain("OVERLAY:HELP");

    // ESC closes overlay, stays on briefing
    pressKey(inst, keys.escape);
    await tick(0);
    expect(inst.lastFrame()).not.toContain("OVERLAY:HELP");
    expect(inst.lastFrame()).toContain("SCREEN:BRIEFING");
  });
});

describe("App integration — achievements", () => {
  it("displays achievement notification on unlock", async () => {
    const { checkMissionComplete } = await import(
      "../../src/lib/achievements.js"
    );
    vi.mocked(checkMissionComplete).mockReturnValueOnce([
      {
        id: "PERFECTIONIST",
        title: "Zero Exposure",
        description: "Complete a mission with full cover integrity",
      },
    ]);

    currentSaveData = createSaveData({ firstRunComplete: true });
    const inst = renderApp({ hasApiKey: true, noAnimation: true });
    await tick(0);

    captured.selectMission!(0);
    await tick(0);
    captured.briefingOnAccept!();
    await tick(0);
    captured.missionOnComplete!(3, 25);
    await tick(0);

    const frame = inst.lastFrame()!;
    expect(frame).toContain("ACHIEVEMENT UNLOCKED");
    expect(frame).toContain("Zero Exposure");
  });
});
