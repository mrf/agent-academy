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
import { Achievements } from "./screens/Achievements.js";
import { Achievement } from "./components/Achievement.js";
import {
  loadProgress,
  saveMissionComplete,
  resetProgress,
  markHandlerUsed,
  updateLastPlayed,
  updateClearanceLevel,
} from "./store/progress.js";
import {
  checkMissionComplete,
  checkPersistence,
  checkHandlerOpen,
  checkClearanceRankUp,
} from "./lib/achievements.js";
import type { Achievement as AchievementDef } from "./lib/achievements.js";
import type { WrongAnswer } from "./types.js";
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
  const isLastMission =
    state.missionContext.currentMissionIndex === MISSIONS.length - 1;
  const overlayOpen = state.overlay.handler || state.overlay.help;

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

  const handleOpenAchievements = useCallback(() => {
    state.navigateTo("achievements");
  }, [state]);

  const handleAchievementsClose = useCallback(() => {
    state.navigateTo("missionMap");
  }, [state]);

  const handleAcceptBriefing = useCallback(() => {
    missionStartRef.current = Date.now();
    state.navigateTo("mission");
  }, [state]);

  const handleMissionComplete = useCallback(
    (stars: 1 | 2 | 3, fxpEarned: number, coverRemaining: number, wrongAnswers: WrongAnswer[]) => {
      const mission = MISSIONS[state.missionContext.currentMissionIndex];
      let infiniteModeJustUnlocked = false;
      const prevLevel = loadProgress().clearanceLevel;

      if (mission) {
        const quizTotal = mission.steps.filter((s) => s.type !== "print").length;
        const quizCorrect = Math.max(0, quizTotal - wrongAnswers.length);
        ({ infiniteModeJustUnlocked } = saveMissionComplete(mission.id, stars, fxpEarned, quizCorrect, quizTotal));
      }

      const newProgress = loadProgress();
      const rankUp = checkClearanceRankUp(prevLevel, newProgress.completedMissions.length);
      if (rankUp) {
        updateClearanceLevel(rankUp.newLevel);
        enqueueAchievements(rankUp.achievement);
      }

      const durationMs = Date.now() - missionStartRef.current;
      const unlocked = checkMissionComplete({
        missionId: mission?.id ?? "",
        stars,
        durationMs,
      });
      enqueueAchievements(...unlocked);

      if (infiniteModeJustUnlocked) {
        enqueueAchievements({
          id: "INFINITE_MODE_UNLOCKED",
          header: "ACCESS GRANTED",
          title: "DEEP COVER OPERATIONS UNLOCKED",
          description: "Infinite mode is now available on the mission map",
        });
      }

      state.setMissionContext({ stars, fxpEarned, coverRemaining, wrongAnswers });
      state.navigateTo("debrief");
    },
    [state, enqueueAchievements],
  );

  const handleDebriefContinue = useCallback(() => {
    state.navigateTo(isLastMission ? "credits" : "missionMap");
  }, [state, isLastMission]);

  const handleAchievementDismiss = useCallback(() => {
    setAchievementQueue((prev) => prev.slice(1));
  }, []);

  // App-level keyboard routing — always active so ESC/? work during missions
  useInput((input, key) => {
    // Quit confirmation on mission map
    if (confirmQuit) {
      if (input === "y" || input === "Y") {
        app.exit();
      } else if (input === "n" || input === "N" || key.escape || key.return) {
        setConfirmQuit(false);
      }
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

    // '?' opens handler overlay (only in mission with API key, no overlay already open)
    if (input === "?" && state.screen === "mission" && hasApiKey && !overlayOpen) {
      handlerOpensRef.current += 1;
      markHandlerUsed();
      state.openOverlay("handler");

      const pet = checkHandlerOpen(handlerOpensRef.current);
      if (pet) {
        enqueueAchievements(pet);
      }
      return;
    }

    // 'h' opens help overlay (not during mission to avoid text input conflicts)
    if (input === "h" && state.screen !== "mission" && !overlayOpen) {
      state.openOverlay("help");
      return;
    }

    // 'q' on mission map prompts exit
    if (input === "q" && state.screen === "missionMap" && !overlayOpen) {
      setConfirmQuit(true);
      return;
    }
  });

  function renderScreen() {
    switch (state.screen) {
      case "logo":
        return (
          <Logo
            onContinue={handleLogoComplete}
            clearanceLevel={progress.firstRunComplete ? progress.clearanceLevel : undefined}
          />
        );
      case "onboarding":
        return <Onboarding onContinue={handleOnboardingComplete} />;
      case "missionMap":
        return (
          <MissionMap
            onSelectMission={handleSelectMission}
            onSelectInfiniteMode={handleSelectInfiniteMode}
            onOpenCredits={handleOpenCredits}
            onOpenAchievements={handleOpenAchievements}
            overlayOpen={overlayOpen}
          />
        );
      case "credits":
        return <Credits onClose={handleCreditsClose} />;
      case "achievements":
        return <Achievements onClose={handleAchievementsClose} />;
      case "briefing":
        if (!currentMission) return null;
        return (
          <Briefing
            mission={currentMission}
            clearanceLevel={progress.clearanceLevel}
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
            overlayOpen={overlayOpen}
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
            wrongAnswers={state.missionContext.wrongAnswers}
            isLastMission={isLastMission}
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
            label={achievementQueue[0].label}
            onDismiss={handleAchievementDismiss}
            noAnimation={noAnimation}
          />
        </Box>
      )}

      {confirmQuit && (
        <Box position="absolute" flexDirection="column" alignItems="center" width="100%">
          <Box
            borderStyle="single"
            borderColor={COLORS.cyan}
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
