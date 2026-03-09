import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { useScreenState } from "./hooks/useScreenState.js";
import { TerminalGuard } from "./lib/terminal.js";
import { ScreenTransition } from "./components/ScreenTransition.js";
import { Logo } from "./screens/Logo.js";
import { Onboarding } from "./screens/Onboarding.js";
import { MissionMap } from "./screens/MissionMap.js";
import { Briefing } from "./screens/Briefing.js";
import { Mission } from "./screens/Mission.js";
import { Debrief } from "./screens/Debrief.js";
import { InfiniteMode } from "./screens/InfiniteMode.js";
import { HelpOverlay } from "./screens/HelpOverlay.js";
import { Handler } from "./screens/Handler.js";
import { Credits } from "./screens/Credits.js";
import { Achievement } from "./components/Achievement.js";
import {
  loadProgress,
  saveMissionComplete,
  resetProgress,
  markHandlerUsed,
  updateLastPlayed,
} from "./store/progress.js";
import {
  checkMissionComplete,
  checkPersistence,
  checkHandlerOpen,
} from "./lib/achievements.js";
import type { Achievement as AchievementDef } from "./lib/achievements.js";
import { MISSIONS } from "./data/curriculum.js";
import { COLORS } from "./constants.js";

interface AppProps {
  hasApiKey: boolean;
  noAnimation: boolean;
  reset: boolean;
}

export default function App({ hasApiKey, noAnimation, reset }: AppProps) {
  const app = useApp();
  const [progress] = useState(loadProgress);

  const skipToMap = !reset && progress.firstRunComplete;
  const state = useScreenState(skipToMap ? "missionMap" : "logo");

  const [confirmQuit, setConfirmQuit] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([]);
  const missionStartRef = useRef(0);
  const handlerOpensRef = useRef(0);

  const enqueueAchievements = useCallback(
    (...items: AchievementDef[]) => {
      if (items.length > 0) {
        setAchievementQueue((prev) => [...prev, ...items]);
      }
    },
    [],
  );

  // Check persistence achievement and update last-played timestamp on startup
  useEffect(() => {
    const persisted = checkPersistence();
    if (persisted) {
      enqueueAchievements(persisted);
    }
    updateLastPlayed();
  }, [enqueueAchievements]);

  // Handle reset on mount
  useEffect(() => {
    if (reset) {
      resetProgress();
    }
  }, [reset]);

  // Derived state
  const currentMission = MISSIONS[state.missionContext.currentMissionIndex];
  const overlayOpen = state.overlay.handler || state.overlay.help;
  const isInputActive =
    state.screen === "mission" && !overlayOpen;

  const handleLogoComplete = useCallback(() => {
    const prog = loadProgress();
    state.navigateTo(prog.firstRunComplete ? "missionMap" : "onboarding");
  }, [state]);

  const handleOnboardingComplete = useCallback(() => {
    state.navigateTo("missionMap");
  }, [state]);

  const handleSelectMission = useCallback(
    (missionIndex: number) => {
      state.setMissionContext({ currentMissionIndex: missionIndex });
      state.navigateTo("briefing");
    },
    [state],
  );

  const handleSelectInfiniteMode = useCallback(() => {
    state.navigateTo("infiniteMode");
  }, [state]);

  const handleInfiniteModeBack = useCallback(() => {
    state.navigateTo("missionMap");
  }, [state]);

  const handleOpenCredits = useCallback(() => {
    state.navigateTo("credits");
  }, [state]);

  const handleCreditsClose = useCallback(() => {
    state.navigateTo("missionMap");
  }, [state]);

  const handleAcceptBriefing = useCallback(() => {
    missionStartRef.current = Date.now();
    state.navigateTo("mission");
  }, [state]);

  const handleMissionComplete = useCallback(
    (stars: 1 | 2 | 3, fxpEarned: number, coverRemaining: number) => {
      const mission = MISSIONS[state.missionContext.currentMissionIndex];
      if (mission) {
        saveMissionComplete(mission.id, stars, fxpEarned);
      }

      const durationMs = Date.now() - missionStartRef.current;
      const unlocked = checkMissionComplete({
        missionId: mission?.id ?? "",
        stars,
        durationMs,
      });
      enqueueAchievements(...unlocked);

      state.setMissionContext({ stars, fxpEarned, coverRemaining });
      state.navigateTo("debrief");
    },
    [state, enqueueAchievements],
  );

  const handleDebriefContinue = useCallback(() => {
    state.navigateTo("missionMap");
  }, [state]);

  const handleAchievementDismiss = useCallback(() => {
    setAchievementQueue((prev) => prev.slice(1));
  }, []);

  // App-level keyboard routing
  useInput(
    (input, key) => {
      // Quit confirmation on mission map
      if (confirmQuit) {
        if (input === "y" || input === "Y") {
          app.exit();
        }
        setConfirmQuit(false);
        return;
      }

      // Close overlay with ESC
      if (key.escape) {
        if (overlayOpen) {
          state.closeOverlay();
          return;
        }
        // ESC navigates to missionMap from mission/briefing
        if (state.screen === "mission" || state.screen === "briefing") {
          state.navigateTo("missionMap");
          return;
        }
      }

      // '?' opens handler overlay (only in mission with API key)
      if (input === "?" && state.screen === "mission" && hasApiKey) {
        handlerOpensRef.current += 1;
        markHandlerUsed();
        state.openOverlay("handler");

        const pet = checkHandlerOpen(handlerOpensRef.current);
        if (pet) {
          enqueueAchievements(pet);
        }
        return;
      }

      // 'h' opens help overlay
      if (input === "h" && !isInputActive) {
        state.openOverlay("help");
        return;
      }

      // 'q' on mission map prompts exit
      if (input === "q" && state.screen === "missionMap" && !overlayOpen) {
        setConfirmQuit(true);
        return;
      }
    },
    { isActive: !isInputActive || overlayOpen },
  );

  function renderScreen() {
    switch (state.screen) {
      case "logo":
        return <Logo onContinue={handleLogoComplete} />;
      case "onboarding":
        return <Onboarding onContinue={handleOnboardingComplete} />;
      case "missionMap":
        return (
          <MissionMap
            onSelectMission={handleSelectMission}
            onSelectInfiniteMode={handleSelectInfiniteMode}
            onOpenCredits={handleOpenCredits}
          />
        );
      case "credits":
        return <Credits onClose={handleCreditsClose} />;
      case "briefing":
        if (!currentMission) return null;
        return (
          <Briefing
            mission={currentMission}
            clearanceLevel={loadProgress().clearanceLevel}
            onAccept={handleAcceptBriefing}
          />
        );
      case "mission":
        if (!currentMission) return null;
        return (
          <Mission
            mission={currentMission}
            onComplete={handleMissionComplete}
            hasApiKey={hasApiKey}
            noAnimation={noAnimation}
          />
        );
      case "debrief":
        if (!currentMission) return null;
        return (
          <Debrief
            mission={currentMission}
            stars={state.missionContext.stars}
            fxpEarned={state.missionContext.fxpEarned}
            coverRemaining={state.missionContext.coverRemaining}
            onContinue={handleDebriefContinue}
          />
        );
      case "infiniteMode":
        return (
          <InfiniteMode
            onBack={handleInfiniteModeBack}
            overlayOpen={overlayOpen}
          />
        );
    }
  }

  return (
    <TerminalGuard>
      <ScreenTransition screenKey={state.screen} noAnimation={noAnimation}>
        {renderScreen()}
      </ScreenTransition>

      {state.overlay.help && (
        <Box position="absolute" flexDirection="column" alignItems="center" width="100%">
          <HelpOverlay screen={state.screen} onClose={state.closeOverlay} />
        </Box>
      )}

      {state.overlay.handler && currentMission && (
        <Box position="absolute" flexDirection="column" alignItems="center" width="100%">
          <Handler
            missionTitle={currentMission.title}
            topicContext={currentMission.objectives.join(", ")}
            onClose={state.closeOverlay}
          />
        </Box>
      )}

      {achievementQueue.length > 0 && (
        <Box position="absolute" flexDirection="column" alignItems="center" width="100%">
          <Achievement
            name={achievementQueue[0].title}
            description={achievementQueue[0].description}
            onDismiss={handleAchievementDismiss}
            noAnimation={noAnimation}
          />
        </Box>
      )}

      {confirmQuit && (
        <Box position="absolute" flexDirection="column" alignItems="center" width="100%">
          <Box
            borderStyle="single"
            borderColor={COLORS.amber}
            paddingX={2}
            paddingY={1}
          >
            <Text color={COLORS.amber} bold>
              Quit Claude Code Academy? (y/N)
            </Text>
          </Box>
        </Box>
      )}
    </TerminalGuard>
  );
}
