import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { TypeWriter } from "../components/TypeWriter.js";
import { loadProgress, saveProgress } from "../store/progress.js";
import { COLORS } from "../constants.js";

const INTRO_LINES = [
  "You have been recruited by the Claude Code Terminal Training Division.",
  "Your mission: master the Claude Code CLI through field training.",
  "Your field training begins now, recruit. Prove yourself worthy of full clearance.",
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
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={1}
    >
      <Box
        borderStyle="double"
        borderColor={COLORS.cyan}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Box justifyContent="center" marginBottom={1}>
          <Text color={COLORS.cyan} bold>
            [ ORIENTATION ]
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
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
              [ENTER] Begin
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
