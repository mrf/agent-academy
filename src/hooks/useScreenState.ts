import { useState, useCallback } from "react";
import type { Screen, Overlay } from "../types.js";

export type MissionContext = {
  currentMissionIndex: number;
  stars: 1 | 2 | 3;
  fxpEarned: number;
  coverRemaining: number;
};

export type ScreenState = {
  screen: Screen;
  overlay: Overlay;
  missionContext: MissionContext;
  navigateTo: (screen: Screen) => void;
  openOverlay: (type: keyof Overlay) => void;
  closeOverlay: () => void;
  setMissionContext: (ctx: Partial<MissionContext>) => void;
};

const CLOSED_OVERLAY: Overlay = { handler: false, help: false };

const DEFAULT_MISSION_CONTEXT: MissionContext = {
  currentMissionIndex: 0,
  stars: 1,
  fxpEarned: 0,
  coverRemaining: 3,
};

export function useScreenState(initialScreen: Screen = "logo"): ScreenState {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [overlay, setOverlay] = useState<Overlay>(CLOSED_OVERLAY);
  const [missionContext, setMissionContextState] = useState<MissionContext>(
    DEFAULT_MISSION_CONTEXT,
  );

  const navigateTo = useCallback((next: Screen) => {
    setOverlay(CLOSED_OVERLAY);
    setScreen(next);
  }, []);

  const openOverlay = useCallback((type: keyof Overlay) => {
    setOverlay((prev) => ({ ...prev, [type]: true }));
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlay(CLOSED_OVERLAY);
  }, []);

  const setMissionContext = useCallback((ctx: Partial<MissionContext>) => {
    setMissionContextState((prev) => ({ ...prev, ...ctx }));
  }, []);

  return {
    screen,
    overlay,
    missionContext,
    navigateTo,
    openOverlay,
    closeOverlay,
    setMissionContext,
  };
}
