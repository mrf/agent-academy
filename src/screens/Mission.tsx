import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { TypeWriter } from "../components/TypeWriter.js";
import { QuizStep } from "../components/QuizStep.js";
import { CommandStep } from "../components/CommandStep.js";
import { AIStep } from "../components/AIStep.js";
import { StatusBar } from "../components/StatusBar.js";
import { BottomBar } from "../components/BottomBar.js";
import { saveStepProgress } from "../store/progress.js";
import { COLORS } from "../constants.js";
import type { Mission as MissionType, Step, WrongAnswer } from "../types.js";

interface MissionProps {
  mission: MissionType;
  onComplete: (stars: 1 | 2 | 3, fxp: number, coverRemaining: number, wrongAnswers: WrongAnswer[]) => void;
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

function extractWrongAnswer(step: Step): WrongAnswer | null {
  if (step.type === "quiz") {
    return {
      question: step.question,
      correctAnswer: step.options[step.correct],
      explanation: step.explanation,
    };
  }
  if (step.type === "command") {
    return {
      question: step.question,
      correctAnswer: step.expectedAnswer,
      explanation: step.explanation,
    };
  }
  if (step.type === "ai") {
    return {
      question: step.prompt,
      correctAnswer: "(open-ended)",
      explanation: step.criteria ?? "This was an open-ended prompt.",
    };
  }
  return null;
}

function getAvailableActions(
  phase: Phase,
  hasApiKey: boolean,
  stepType?: Step["type"],
): string[] {
  const actions: string[] = [];
  if (phase === "step" && stepType === "print") {
    actions.push("skip");
  }
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
  const wrongAnswersRef = useRef<WrongAnswer[]>([]);

  // Track the highest step reached so already-seen print steps can
  // skip animation on cover-blown restart.
  const [seenUpTo, setSeenUpTo] = useState(-1);

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
    wrongAnswersRef.current = [];
    setSeenUpTo(-1);
  }

  const currentStep = mission.steps[currentStepIndex] as Step;
  const missionNumber = parseInt(mission.id.replace(/\D/g, ""), 10) || 1;

  useEffect(() => {
    saveStepProgress(mission.id, currentStepIndex);
  }, [mission.id, currentStepIndex]);

  const advanceStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    setSeenUpTo((prev) => Math.max(prev, currentStepIndex));
    if (nextIndex >= mission.steps.length) {
      onComplete(computeStars(hitsRef.current), fxpEarnedRef.current, coverIntegrity, wrongAnswersRef.current);
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
    (correct: boolean | null) => {
      if (correct === null) {
        // Eval failed: advance without scoring (no FXP, no cover penalty)
        advanceStep();
        return;
      }
      if (correct) {
        fxpEarnedRef.current += FXP_PER_CORRECT;
        setFxpEarned(fxpEarnedRef.current);
      } else {
        const wrong = extractWrongAnswer(currentStep);
        if (wrong) wrongAnswersRef.current.push(wrong);
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
    [currentStep, coverIntegrity, advanceStep],
  );

  useInput(
    (_input, key) => {
      if (key.return) {
        if (phase === "waitEnter") {
          advanceStep();
        } else if (phase === "coverBlown") {
          setSeenUpTo((prev) => Math.max(prev, currentStepIndex));
          setCurrentStepIndex(0);
          setCoverIntegrity(MAX_COVER);
          hitsRef.current = 0;
          wrongAnswersRef.current = [];
          fxpEarnedRef.current = 0;
          setFxpEarned(0);
          setPhase("step");
        }
      }
    },
    { isActive: phase === "waitEnter" || phase === "coverBlown" },
  );

  const isFocused = phase === "step";

  function renderStep(step: Step) {
    const skipAnim = noAnimation || currentStepIndex <= seenUpTo;
    switch (step.type) {
      case "print":
        return (
          <TypeWriter
            key={currentStepIndex}
            text={step.text}
            speed={step.speed}
            onComplete={handlePrintComplete}
            noAnimation={skipAnim}
          />
        );
      case "quiz":
        return (
          <QuizStep
            key={currentStepIndex}
            step={step}
            onAnswer={handleAnswer}
            isFocused={isFocused}
          />
        );
      case "command":
        return (
          <CommandStep
            key={currentStepIndex}
            step={step}
            onAnswer={handleAnswer}
            isFocused={isFocused}
            hasApiKey={hasApiKey}
          />
        );
      case "ai":
        return (
          <AIStep
            key={currentStepIndex}
            step={step}
            onAnswer={handleAnswer}
            isFocused={isFocused}
            hasApiKey={hasApiKey}
          />
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

      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
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
              FXP from this attempt has been lost. Try again, operative.
            </Text>
          </Box>
        ) : (
          renderStep(currentStep)
        )}
      </Box>

      <BottomBar
        currentStep={currentStepIndex + 1}
        totalSteps={mission.steps.length}
        availableActions={getAvailableActions(phase, hasApiKey, currentStep.type)}
      />
    </Box>
  );
}
