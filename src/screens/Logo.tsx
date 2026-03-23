import { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TypeWriter } from "../components/TypeWriter.js";
import { COLORS, VERSION } from "../constants.js";
import type { ClearanceLevel } from "../types.js";

const ASCII_LOGO = ` ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗     ██████╗ ██████╗ ██████╗ ███████╗
██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝
██║     ██║     ███████║██║   ██║██║  ██║█████╗      ██║     ██║   ██║██║  ██║█████╗
██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝      ██║     ██║   ██║██║  ██║██╔══╝
╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗    ╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝`;

const PHASES = ["logo", "subtitle", "division", "prompt", "ready"] as const;
type Phase = (typeof PHASES)[number];

interface LogoProps {
  onContinue: () => void;
  clearanceLevel?: ClearanceLevel;
}

export function Logo({ onContinue, clearanceLevel }: LogoProps) {
  const [phase, setPhase] = useState<Phase>("logo");

  const advancePhase = useCallback(
    () => setPhase((p) => PHASES[PHASES.indexOf(p) + 1] ?? p),
    [],
  );

  useEffect(() => {
    process.stdout.write("\x1b]0;Claude Code Academy — RECRUITING\x07");
  }, []);

  useInput((_input, key) => {
    if (key.return) {
      onContinue();
    }
  });

  const phaseIdx = PHASES.indexOf(phase);

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
        alignItems="center"
      >
        <TypeWriter
          text={ASCII_LOGO}
          speed="dramatic"
          onComplete={advancePhase}
          color={COLORS.warmWhite}
        />

        {phaseIdx >= 1 && (
          <Box marginTop={1}>
            <TypeWriter
              text="[ A C A D E M Y ]"
              speed="dramatic"
              onComplete={advancePhase}
              color={COLORS.cyan}
              bold
            />
          </Box>
        )}

        {phaseIdx >= 2 && (
          <Box marginTop={1} alignItems="center">
            <TypeWriter
              text={`TERMINAL TRAINING DIVISION\nCLEARANCE LEVEL: ${(clearanceLevel ?? "pending").toUpperCase()}`}
              speed="normal"
              onComplete={advancePhase}
              dimColor
            />
          </Box>
        )}

        {phaseIdx >= 3 && (
          <Box marginTop={1}>
            <TypeWriter
              text="[ENTER] Begin recruitment"
              speed="normal"
              onComplete={advancePhase}
              color={COLORS.amber}
            />
          </Box>
        )}

        {phaseIdx >= 4 && (
          <Box marginTop={1}>
            <Text dimColor>v{VERSION}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
