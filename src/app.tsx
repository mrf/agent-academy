import { useCallback, useState } from "react";
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
import { loadProgress, saveMissionComplete, resetProgress } from "./store/progress.js";
import { MISSIONS } from "./data/curriculum.js";
import { COLORS } from "./constants.js";

interface AppProps {
  hasApiKey: boolean;
  noAnimation: boolean;
  reset: boolean;
}

export default function App({ hasApiKey, noAnimation, reset }: AppProps) {
  const app = useApp();
  const progress = loadProgress();

  const skipToMap = !reset && progress.firstRunComplete;
  const state = useScreenState(skipToMap ? "missionMap" : "logo");

  const [confirmQuit, setConfirmQuit] = useState(false);

  // Handle reset on first render
  const [resetHandled, setResetHandled] = useState(false);
  if (reset && !resetHandled) {
    resetProgress();
    setResetHandled(true);
  }

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

  const handleAcceptBriefing = useCallback(() => {
    state.navigateTo("mission");
  }, [state]);

  const handleMissionComplete = useCallback(
    (stars: 1 | 2 | 3, fxp: number) => {
      const mission = MISSIONS[state.missionContext.currentMissionIndex];
      if (mission) {
        saveMissionComplete(mission.id, stars, fxp);
      }
      state.setMissionContext({ stars, fxpEarned: fxp });
      state.navigateTo("debrief");
    },
    [state],
  );

  const handleDebriefContinue = useCallback(() => {
    state.navigateTo("missionMap");
  }, [state]);

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
        state.openOverlay("handler");
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
          />
        );
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
            coverRemaining={3}
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

      {state.overlay.handler && (
        <Box position="absolute" flexDirection="column" alignItems="center" width="100%">
          <Box
            borderStyle="single"
            borderColor={COLORS.cyan}
            paddingX={2}
            paddingY={1}
            width={50}
          >
            <Text color={COLORS.cyan}>
              [ HANDLER ] AI overlay coming soon...{"\n"}
              Press ESC to close.
            </Text>
          </Box>
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
