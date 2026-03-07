import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { TypeWriter } from "../components/TypeWriter.js";
import { loadProgress, saveProgress } from "../store/progress.js";
import { COLORS } from "../constants.js";

const INTRO_LINES = [
  "You have been recruited by the Claude Code Terminal Training Division.",
  "Your mission: master the Claude Code CLI through field training.",
  "Learn Claude Code by doing.",
] as const;

interface OnboardingProps {
  onContinue: () => void;
}

export function Onboarding({ onContinue }: OnboardingProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const handleLineComplete = useCallback(() => {
    if (lineIndex < INTRO_LINES.length - 1) {
      setLineIndex((prev) => prev + 1);
    } else {
      setAllDone(true);
    }
  }, [lineIndex]);

  useInput((_input, key) => {
    if (allDone && key.return) {
      const data = loadProgress();
      data.firstRunComplete = true;
      saveProgress(data);
      onContinue();
    }
  });

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      {INTRO_LINES.slice(0, lineIndex + 1).map((line, i) => (
        <TypeWriter
          key={i}
          text={line}
          speed={i === INTRO_LINES.length - 1 ? "fast" : "normal"}
          onComplete={i === lineIndex ? handleLineComplete : undefined}
        />
      ))}
      {allDone && (
        <Text color={COLORS.amber} bold>
          [ENTER] to begin
        </Text>
      )}
    </Box>
  );
}
