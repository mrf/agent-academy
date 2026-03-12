import { describe, it, expect } from "vitest";
import React, { createElement } from "react";
import { render } from "ink-testing-library";
import { useScreenState } from "../../src/hooks/useScreenState.js";
import type { ScreenState } from "../../src/hooks/useScreenState.js";

function renderHook(
  ...args: Parameters<typeof useScreenState>
): { result: { current: ScreenState }; cleanup: () => void } {
  const ref = { current: null as ScreenState | null };
  function TestComponent() {
    ref.current = useScreenState(...args);
    return createElement("ink-text", null, "");
  }
  const { cleanup } = render(createElement(TestComponent));
  return { result: ref as { current: ScreenState }, cleanup };
}

describe("useScreenState", () => {
  it("defaults initial screen to 'logo'", () => {
    const { result, cleanup } = renderHook();
    expect(result.current.screen).toBe("logo");
    cleanup();
  });

  it("accepts a custom initial screen", () => {
    const { result, cleanup } = renderHook("missionMap");
    expect(result.current.screen).toBe("missionMap");
    cleanup();
  });

  it("navigateTo() changes screen", () => {
    const { result, cleanup } = renderHook();
    React.act(() => {
      result.current.navigateTo("briefing");
    });
    expect(result.current.screen).toBe("briefing");
    cleanup();
  });

  it("navigateTo() closes all overlays", () => {
    const { result, cleanup } = renderHook();
    React.act(() => {
      result.current.openOverlay("handler");
    });
    expect(result.current.overlay.handler).toBe(true);

    React.act(() => {
      result.current.navigateTo("credits");
    });
    expect(result.current.overlay).toEqual({ handler: false, help: false });
    cleanup();
  });

  it("openOverlay('handler') sets handler to true", () => {
    const { result, cleanup } = renderHook();
    React.act(() => {
      result.current.openOverlay("handler");
    });
    expect(result.current.overlay.handler).toBe(true);
    expect(result.current.overlay.help).toBe(false);
    cleanup();
  });

  it("openOverlay('help') sets help to true", () => {
    const { result, cleanup } = renderHook();
    React.act(() => {
      result.current.openOverlay("help");
    });
    expect(result.current.overlay.help).toBe(true);
    expect(result.current.overlay.handler).toBe(false);
    cleanup();
  });

  it("closeOverlay() resets all overlays to false", () => {
    const { result, cleanup } = renderHook();
    React.act(() => {
      result.current.openOverlay("handler");
      result.current.openOverlay("help");
    });
    React.act(() => {
      result.current.closeOverlay();
    });
    expect(result.current.overlay).toEqual({ handler: false, help: false });
    cleanup();
  });

  it("setMissionContext() partially updates context", () => {
    const { result, cleanup } = renderHook();
    React.act(() => {
      result.current.setMissionContext({ stars: 3, fxpEarned: 100 });
    });
    expect(result.current.missionContext.stars).toBe(3);
    expect(result.current.missionContext.fxpEarned).toBe(100);
    cleanup();
  });

  it("setMissionContext() preserves unset fields", () => {
    const { result, cleanup } = renderHook();
    React.act(() => {
      result.current.setMissionContext({ currentMissionIndex: 5 });
    });
    expect(result.current.missionContext).toEqual({
      currentMissionIndex: 5,
      stars: 1,
      fxpEarned: 0,
      coverRemaining: 3,
      wrongAnswers: [],
    });
    cleanup();
  });

  it("default mission context has index:0, stars:1, fxpEarned:0", () => {
    const { result, cleanup } = renderHook();
    expect(result.current.missionContext).toEqual({
      currentMissionIndex: 0,
      stars: 1,
      fxpEarned: 0,
      coverRemaining: 3,
      wrongAnswers: [],
    });
    cleanup();
  });
});
