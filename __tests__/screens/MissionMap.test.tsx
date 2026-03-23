import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MissionMap } from "../../src/screens/MissionMap.js";
import { MISSIONS } from "../../src/data/curriculum.js";
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
const mockToggleLegacyMode = vi.fn<() => boolean>();

vi.mock("../../src/store/progress.js", () => ({
  loadProgress: () => mockLoadProgress(),
  toggleLegacyMode: () => mockToggleLegacyMode(),
}));

const mockKonamiCheck = vi.fn<
  (input: string, key: Record<string, boolean>) => boolean
>();

vi.mock("../../src/lib/easter-eggs.js", () => ({
  createKonamiTracker: () => mockKonamiCheck,
  setTerminalTitle: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function freshProgress(overrides?: Partial<SaveData>): SaveData {
  return {
    schemaVersion: 1,
    completedMissions: [],
    starRatings: {},
    improvedMissions: [],
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

function allCompleteProgress(): SaveData {
  const starRatings: Record<string, 1 | 2 | 3> = {};
  for (const m of MISSIONS) {
    starRatings[m.id] = 3;
  }
  return freshProgress({
    completedMissions: MISSIONS.map((m) => m.id),
    starRatings,
    fxp: 9999,
    clearanceLevel: "elite",
    infiniteModeUnlocked: true,
  });
}

function renderMap(
  overrides?: Partial<{
    onSelectMission: ReturnType<typeof vi.fn>;
    onSelectInfiniteMode: ReturnType<typeof vi.fn>;
    onOpenCredits: ReturnType<typeof vi.fn>;
  }>,
): RenderResult {
  return renderInk(
    <MissionMap
      onSelectMission={overrides?.onSelectMission ?? vi.fn()}
      onSelectInfiniteMode={overrides?.onSelectInfiniteMode ?? vi.fn()}
      onOpenCredits={overrides?.onOpenCredits ?? vi.fn()}
    />,
  );
}

// ── Setup / Teardown ──────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockLoadProgress.mockReturnValue(freshProgress());
  mockToggleLegacyMode.mockReturnValue(true);
  mockKonamiCheck.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe("MissionMap", () => {
  it("renders all missions with correct codenames", () => {
    const inst = renderMap();
    const frame = inst.lastFrame()!;

    for (const mission of MISSIONS) {
      expect(frame).toContain(mission.codename);
    }
  });

  it("shows title subtitle for selected mission", () => {
    const inst = renderMap();
    const frame = inst.lastFrame()!;

    // Initially mission 0 is selected; its title should be visible
    expect(frame).toContain(MISSIONS[0].title);
    // Non-selected missions should not show their titles
    expect(frame).not.toContain(MISSIONS[1].title);
  });

  it("title subtitle updates when selection changes", async () => {
    const inst = renderMap();

    pressKey(inst, keys.arrowDown);
    await tick(0);

    const frame = inst.lastFrame()!;
    expect(frame).toContain(MISSIONS[1].title);
    expect(frame).not.toContain(MISSIONS[0].title);
  });

  it("locked missions show LOCKED label", () => {
    const inst = renderMap();
    const frame = inst.lastFrame()!;

    // With fresh progress only mission 0 is unlocked; the rest are locked
    expect(frame).toContain("LOCKED");
  });

  it("infinite mode entry is redacted before Full Clearance", () => {
    const inst = renderMap();
    const frame = inst.lastFrame()!;

    expect(frame).toContain("CLASSIFIED");
    expect(frame).toContain("\u2588"); // block character
    expect(frame).not.toContain("DEEP COVER OPERATIONS");
  });

  it("completed missions show star ratings", () => {
    mockLoadProgress.mockReturnValue(
      freshProgress({
        completedMissions: ["mission-01"],
        starRatings: { "mission-01": 2 },
        fxp: 240,
      }),
    );

    const inst = renderMap();
    const frame = inst.lastFrame()!;

    // 2 filled + 1 empty: ★★☆
    expect(frame).toContain("\u2605\u2605\u2606");
    expect(frame).toContain("FXP");
  });

  it("improved missions show ▲ upgrade indicator", () => {
    mockLoadProgress.mockReturnValue(
      freshProgress({
        completedMissions: ["mission-01"],
        starRatings: { "mission-01": 3 },
        improvedMissions: ["mission-01"],
        fxp: 340,
      }),
    );

    const inst = renderMap();
    const frame = inst.lastFrame()!;

    expect(frame).toContain("\u25b2");
  });

  it("non-improved missions do not show ▲ indicator", () => {
    mockLoadProgress.mockReturnValue(
      freshProgress({
        completedMissions: ["mission-01"],
        starRatings: { "mission-01": 2 },
        fxp: 240,
      }),
    );

    const inst = renderMap();
    const frame = inst.lastFrame()!;

    expect(frame).not.toContain("\u25b2");
  });

  it("arrow keys navigate between missions", async () => {
    const inst = renderMap();

    // Initially first uncompleted (index 0) is selected
    expect(inst.lastFrame()!).toMatch(/>\s+.*01.*FIRST CONTACT/);

    // Move down to mission 2
    pressKey(inst, keys.arrowDown);
    await tick(0);
    expect(inst.lastFrame()!).toMatch(/>\s+.*02/);

    // Move back up
    pressKey(inst, keys.arrowUp);
    await tick(0);
    expect(inst.lastFrame()!).toMatch(/>\s+.*01.*FIRST CONTACT/);
  });

  it("up arrow does not go above first mission", () => {
    const inst = renderMap();

    pressKey(inst, keys.arrowUp);

    expect(inst.lastFrame()!).toMatch(/>\s+.*01.*FIRST CONTACT/);
  });

  it("enter selects unlocked mission", () => {
    const onSelectMission = vi.fn();
    const inst = renderMap({ onSelectMission });

    // Mission 0 is unlocked
    pressKey(inst, keys.enter);

    expect(onSelectMission).toHaveBeenCalledWith(0);
  });

  it("enter on locked mission does nothing", async () => {
    const onSelectMission = vi.fn();
    const inst = renderMap({ onSelectMission });

    // Navigate to mission 1 (locked — mission 0 not completed)
    pressKey(inst, keys.arrowDown);
    await tick(0);
    pressKey(inst, keys.enter);

    expect(onSelectMission).not.toHaveBeenCalled();
  });

  it("infinite mode entry shown and selectable after Full Clearance", async () => {
    mockLoadProgress.mockReturnValue(allCompleteProgress());
    const onSelectInfiniteMode = vi.fn();

    const inst = renderMap({ onSelectInfiniteMode });
    const frame = inst.lastFrame()!;

    expect(frame).toContain("DEEP COVER OPERATIONS");
    expect(frame).toContain("UNLOCKED");

    // Navigate to infinite mode (one past last mission)
    for (let i = 0; i < MISSIONS.length; i++) {
      pressKey(inst, keys.arrowDown);
    }
    await tick(0);
    pressKey(inst, keys.enter);

    expect(onSelectInfiniteMode).toHaveBeenCalledOnce();
  });

  it("konami code triggers toggleLegacyMode", async () => {
    mockKonamiCheck.mockReturnValue(true);

    const inst = renderMap();
    inst.stdin.write("a");
    await tick(0);

    expect(mockToggleLegacyMode).toHaveBeenCalled();
    expect(inst.lastFrame()!).toContain("LEGACY MODE ACTIVATED");
  });

  it("'c' opens credits after Full Clearance", () => {
    mockLoadProgress.mockReturnValue(allCompleteProgress());
    const onOpenCredits = vi.fn();

    const inst = renderMap({ onOpenCredits });
    inst.stdin.write("c");

    expect(onOpenCredits).toHaveBeenCalledOnce();
  });

  it("'c' does not open credits before Full Clearance", () => {
    const onOpenCredits = vi.fn();
    const inst = renderMap({ onOpenCredits });

    inst.stdin.write("c");

    expect(onOpenCredits).not.toHaveBeenCalled();
  });

  it("shows progress indicator with completed/total missions", () => {
    mockLoadProgress.mockReturnValue(
      freshProgress({
        completedMissions: ["mission-01", "mission-02"],
        fxp: 480,
      }),
    );

    const inst = renderMap();
    const frame = inst.lastFrame()!;

    expect(frame).toContain(`2/${MISSIONS.length}`);
    expect(frame).toContain("MISSIONS");
  });

  it("shows 0/total missions when no missions completed", () => {
    const inst = renderMap();
    const frame = inst.lastFrame()!;

    expect(frame).toContain(`0/${MISSIONS.length}`);
    expect(frame).toContain("MISSIONS");
  });

  it("'q' does not trigger any callbacks", () => {
    const onSelectMission = vi.fn();
    const onSelectInfiniteMode = vi.fn();
    const onOpenCredits = vi.fn();

    const inst = renderMap({
      onSelectMission,
      onSelectInfiniteMode,
      onOpenCredits,
    });
    inst.stdin.write("q");

    expect(onSelectMission).not.toHaveBeenCalled();
    expect(onSelectInfiniteMode).not.toHaveBeenCalled();
    expect(onOpenCredits).not.toHaveBeenCalled();
  });
});
