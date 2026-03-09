import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { TypeWriter } from "../components/TypeWriter.js";
import { QuizStep } from "../components/QuizStep.js";
import { CommandStep } from "../components/CommandStep.js";
import { StatusBar } from "../components/StatusBar.js";
import { BottomBar } from "../components/BottomBar.js";
import { saveStepProgress } from "../store/progress.js";
import { COLORS } from "../constants.js";
import type { Mission as MissionType, Step } from "../types.js";

interface MissionProps {
  mission: MissionType;
  onComplete: (stars: 1 | 2 | 3, fxp: number, coverRemaining: number) => void;
  hasApiKey: boolean;
  noAnimation: boolean;
}

type Phase = "step" | "waitEnter" | "coverBlown";

const FXP_PER_CORRECT = 10;
const FXP_PER_PRINT = 5;
const MAX_COVER = 3;

function computeStars(hits: number): 1 | 2 | 3 {
  if (hits === 0) return 3;
  if (hits === 1) return 2;
  return 1;
}

function getAvailableActions(
  phase: Phase,
  hasApiKey: boolean,
): string[] {
  const actions: string[] = [];
  if (phase === "waitEnter") {
    actions.push("continue");
  }
  if (phase === "coverBlown") {
    actions.push("restart");
  }
  if (hasApiKey) {
    actions.push("handler");
  }
  actions.push("menu");
  return actions;
}

export function Mission({
  mission,
  onComplete,
  hasApiKey,
  noAnimation,
}: MissionProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [coverIntegrity, setCoverIntegrity] = useState(MAX_COVER);
  const [fxpEarned, setFxpEarned] = useState(0);
  const [phase, setPhase] = useState<Phase>("step");

  // Refs track latest values to avoid stale closures in advanceStep.
  // fxpEarned state is still needed for rendering; hits is only used
  // in the onComplete callback, so it lives exclusively in a ref.
  const fxpEarnedRef = useRef(0);
  const hitsRef = useRef(0);

  // Track mission ID to reset state if mission changes
  const missionIdRef = useRef(mission.id);
  if (missionIdRef.current !== mission.id) {
    missionIdRef.current = mission.id;
    setCurrentStepIndex(0);
    setCoverIntegrity(MAX_COVER);
    setFxpEarned(0);
    setPhase("step");
    fxpEarnedRef.current = 0;
    hitsRef.current = 0;
  }

  const currentStep = mission.steps[currentStepIndex] as Step;
  const missionNumber = parseInt(mission.id.replace(/\D/g, ""), 10) || 1;

  useEffect(() => {
    saveStepProgress(mission.id, currentStepIndex);
  }, [mission.id, currentStepIndex]);

  const advanceStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= mission.steps.length) {
      onComplete(computeStars(hitsRef.current), fxpEarnedRef.current, coverIntegrity);
    } else {
      setCurrentStepIndex(nextIndex);
      setPhase("step");
    }
  }, [currentStepIndex, mission.steps.length, coverIntegrity, onComplete]);

  const handlePrintComplete = useCallback(() => {
    fxpEarnedRef.current += FXP_PER_PRINT;
    setFxpEarned(fxpEarnedRef.current);
    setPhase("waitEnter");
  }, []);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (correct) {
        fxpEarnedRef.current += FXP_PER_CORRECT;
        setFxpEarned(fxpEarnedRef.current);
      } else {
        const newCover = coverIntegrity - 1;
        setCoverIntegrity(newCover);
        hitsRef.current += 1;
        if (newCover <= 0) {
          setPhase("coverBlown");
          return;
        }
      }
      advanceStep();
    },
    [coverIntegrity, advanceStep],
  );

  useInput(
    (_input, key) => {
      if (key.return) {
        if (phase === "waitEnter") {
          advanceStep();
        } else if (phase === "coverBlown") {
          setCurrentStepIndex(0);
          setCoverIntegrity(MAX_COVER);
          hitsRef.current = 0;
          setPhase("step");
        }
      }
    },
    { isActive: phase === "waitEnter" || phase === "coverBlown" },
  );

  const isFocused = phase === "step";

  function renderStep(step: Step) {
    switch (step.type) {
      case "print":
        return (
          <TypeWriter
            text={step.text}
            speed={step.speed}
            onComplete={handlePrintComplete}
            noAnimation={noAnimation}
          />
        );
      case "quiz":
        return (
          <QuizStep
            step={step}
            onAnswer={handleAnswer}
            isFocused={isFocused}
          />
        );
      case "command":
        return (
          <CommandStep
            step={step}
            onAnswer={handleAnswer}
            isFocused={isFocused}
          />
        );
      case "ai":
        return (
          <Text color={COLORS.gray}>
            [AI Step — coming soon] {step.prompt}
          </Text>
        );
    }
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <StatusBar
        coverIntegrity={coverIntegrity}
        fxp={fxpEarned}
        missionNumber={missionNumber}
        codename={mission.codename}
        currentStep={currentStepIndex + 1}
        totalSteps={mission.steps.length}
        hasApiKey={hasApiKey}
      />

      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        {phase === "coverBlown" ? (
          <Box
            borderStyle="double"
            borderColor={COLORS.red}
            paddingX={2}
            paddingY={1}
            flexDirection="column"
            gap={1}
          >
            <Text color={COLORS.red} bold>
              ██  COVER BLOWN  ██
            </Text>
            <Text color={COLORS.red}>
              Your identity has been compromised. Mission failed.
            </Text>
            <Text color={COLORS.gray}>
              FXP earned this attempt will be retained.
            </Text>
          </Box>
        ) : (
          renderStep(currentStep)
        )}
      </Box>

      <BottomBar
        currentStep={currentStepIndex + 1}
        totalSteps={mission.steps.length}
        availableActions={getAvailableActions(phase, hasApiKey)}
      />
    </Box>
  );
}
