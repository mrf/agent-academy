import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { COLORS } from "../constants.js";

interface StatusBarProps {
  coverIntegrity: number;
  fxp: number;
  missionNumber: number;
  codename: string;
  currentStep: number;
  totalSteps: number;
  hasApiKey: boolean;
  noAnimation?: boolean;
}

export function StatusBar({
  coverIntegrity,
  fxp,
  missionNumber,
  codename,
  currentStep,
  totalSteps,
  hasApiKey,
  noAnimation = false,
}: StatusBarProps) {
  const [flashRed, setFlashRed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [prevCover, setPrevCover] = useState(coverIntegrity);

  // Flash red, show warning, and ring terminal bell when cover integrity drops
  useEffect(() => {
    if (coverIntegrity < prevCover) {
      setFlashRed(true);
      setShowWarning(true);
      if (!noAnimation) {
        process.stdout.write("\x07");
      }
      const flashTimer = setTimeout(() => setFlashRed(false), 400);
      const warnTimer = setTimeout(() => setShowWarning(false), 1500);
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(warnTimer);
      };
    }
    setPrevCover(coverIntegrity);
  }, [coverIntegrity, prevCover, noAnimation]);

  const coverBlocks = Array.from({ length: 3 }, (_, i) =>
    i < coverIntegrity ? "\u25A0" : "\u25A1"
  ).join(" ");

  function getCoverColor(): string {
    if (flashRed || coverIntegrity <= 1) return COLORS.red;
    return COLORS.green;
  }

  const coverColor = getCoverColor();
  const missionNum = String(missionNumber).padStart(2, "0");

  return (
    <Box flexDirection="column" width="100%">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        width="100%"
        paddingX={1}
      >
        <Box gap={2}>
          <Text color={coverColor} bold wrap="truncate">
            [{coverBlocks}]
          </Text>
          <Text wrap="truncate">
            <Text color={COLORS.gray}>FXP: </Text>
            <Text color={COLORS.amber} bold>{fxp}</Text>
          </Text>
          <Text wrap="truncate">
            <Text color={COLORS.cyan} bold>MISSION {missionNum}: {codename}</Text>
          </Text>
          <Text color={COLORS.gray} wrap="truncate">
            STEP {currentStep}/{totalSteps}
          </Text>
        </Box>
        {hasApiKey && (
          <Text color={COLORS.amber} wrap="truncate">
            [? HANDLER]
          </Text>
        )}
      </Box>
      {showWarning && (
        <Box width="100%" paddingX={1}>
          <Text color={COLORS.red} bold>
            ⚠ COVER COMPROMISED
          </Text>
        </Box>
      )}
    </Box>
  );
}
