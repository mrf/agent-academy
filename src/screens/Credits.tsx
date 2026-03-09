import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { COLORS } from "../constants.js";
import { useTerminalSize } from "../lib/terminal.js";

interface CreditsProps {
  onClose: () => void;
}

export function Credits({ onClose }: CreditsProps) {
  const [phase, setPhase] = useState<"display" | "destruct" | "wipe">(
    "display",
  );
  const [countdown, setCountdown] = useState(3);
  const [wipeProgress, setWipeProgress] = useState(0);
  const { columns: cols, rows } = useTerminalSize();
  const contentWidth = Math.max(20, cols - 8);

  useInput((_input, key) => {
    if (phase === "display" && (key.return || key.escape)) {
      setPhase("destruct");
    }
  });

  // Self-destruct countdown
  useEffect(() => {
    if (phase !== "destruct") return;
    if (countdown <= 0) {
      setPhase("wipe");
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 800);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Screen-wipe animation
  useEffect(() => {
    if (phase !== "wipe") return;
    if (wipeProgress >= rows) {
      onClose();
      return;
    }
    const timer = setTimeout(() => setWipeProgress((prev) => prev + 1), 20);
    return () => clearTimeout(timer);
  }, [phase, wipeProgress, rows, onClose]);

  if (phase === "wipe") {
    return (
      <Box flexDirection="column" height={rows}>
        {Array.from({ length: wipeProgress }).map((_, i) => (
          <Text key={i} color={COLORS.red}>
            {"\u2588".repeat(cols)}
          </Text>
        ))}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={COLORS.cyan}
        paddingX={2}
        paddingY={1}
      >
        <Box justifyContent="center" marginBottom={1}>
          <Text color={COLORS.red} bold>
            [ DECLASSIFIED ]
          </Text>
        </Box>

        <Text color={COLORS.gray}>
          {"─".repeat(contentWidth)}
        </Text>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.warmWhite} bold>
            PERSONNEL FILE
          </Text>
          <Text color={COLORS.warmWhite}>
            Classification: TOP SECRET // EYES ONLY
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.cyan} bold>
            PROJECT
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color={COLORS.warmWhite}>Claude Code Academy</Text>
            <Text color={COLORS.warmWhite}>Terminal Training Division</Text>
            <Text color={COLORS.warmWhite} dimColor>
              "Learn by doing. Survive by knowing."
            </Text>
          </Box>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.cyan} bold>
            DEVELOPED BY
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color={COLORS.warmWhite}>Anthropic</Text>
            <Text color={COLORS.warmWhite}>Powered by Claude</Text>
          </Box>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.cyan} bold>
            FIELD OPERATIVE
          </Text>
          <Box marginLeft={2} flexDirection="column">
            <Text color={COLORS.warmWhite}>You</Text>
            <Text color={COLORS.warmWhite}>Status: FULL CLEARANCE</Text>
            <Text color={COLORS.warmWhite}>Commendation: Distinguished Service</Text>
          </Box>
        </Box>

        <Box marginTop={1}>
          <Text color={COLORS.gray}>
            {"─".repeat(contentWidth)}
          </Text>
        </Box>

        {phase === "display" && (
          <Box marginTop={1} justifyContent="center">
            <Text color={COLORS.gray} dimColor>[ENTER/ESC] Dismiss</Text>
          </Box>
        )}

        {phase === "destruct" && (
          <Box marginTop={1} justifyContent="center">
            <Text color={COLORS.red} bold>
              This document will self-destruct in {countdown}...
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
