import { useEffect, useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { TypeWriter } from "../components/TypeWriter.js";
import { COLORS } from "../constants.js";
import type { Mission, ClearanceLevel } from "../types.js";

interface BriefingProps {
  mission: Mission;
  clearanceLevel: ClearanceLevel;
  onAccept: () => void;
}

export function Briefing({ mission, clearanceLevel, onAccept }: BriefingProps) {
  const [typingDone, setTypingDone] = useState(false);

  const missionNumber = mission.id.replace("mission-", "");

  useEffect(() => {
    process.stdout.write(
      `\x1b]0;CCA — Mission ${missionNumber}: ${mission.codename}\x07`,
    );
  }, [missionNumber, mission.codename]);

  const handleComplete = useCallback(() => setTypingDone(true), []);

  useInput((_input, key) => {
    if (key.return && typingDone) {
      onAccept();
    }
  });

  const intel = mission.briefing ?? mission.codename;

  const headerText = [
    `MISSION:     ${missionNumber} — ${mission.codename}`,
    `CLEARANCE:   ${clearanceLevel.toUpperCase()}`,
    `HANDLER:     Instructor Haiku`,
    ``,
    `OBJECTIVES:`,
    ...mission.objectives.map((obj) => `  [ ] ${obj}`),
    ``,
    `INTEL:`,
  ].join("\n");

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
            [ MISSION BRIEFING ]
          </Text>
        </Box>

        <Text color={COLORS.warmWhite}>{headerText}</Text>

        <TypeWriter
          text={`  ${intel}`}
          speed="dramatic"
          onComplete={handleComplete}
          color={COLORS.warmWhite}
        />

        {typingDone && (
          <Box justifyContent="space-between" marginTop={1}>
            <Text color={COLORS.gray}>[ESC] Back</Text>
            <Text color={COLORS.amber} bold>
              [ENTER] Accept mission
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
