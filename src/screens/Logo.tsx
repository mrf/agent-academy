import { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TypeWriter } from "../components/TypeWriter.js";
import { COLORS, VERSION } from "../constants.js";

const ASCII_LOGO = ` ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
██║     ██║     ███████║██║   ██║██║  ██║█████╗
██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝`;

const PHASES = ["logo", "subtitle", "division", "prompt", "ready"] as const;
type Phase = (typeof PHASES)[number];

interface LogoProps {
  onContinue: () => void;
}

export function Logo({ onContinue }: LogoProps) {
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
        <Text color={COLORS.warmWhite}>
          <TypeWriter
            text={ASCII_LOGO}
            speed="dramatic"
            onComplete={advancePhase}
          />
        </Text>

        {phaseIdx >= 1 && (
          <Box marginTop={1}>
            <Text color={COLORS.cyan} bold>
              <TypeWriter
                text="[ C O D E   A C A D E M Y ]"
                speed="dramatic"
                onComplete={advancePhase}
              />
            </Text>
          </Box>
        )}

        {phaseIdx >= 2 && (
          <Box marginTop={1} alignItems="center">
            <Text dimColor>
              <TypeWriter
                text={"TERMINAL TRAINING DIVISION\nCLEARANCE LEVEL: PENDING"}
                speed="normal"
                onComplete={advancePhase}
              />
            </Text>
          </Box>
        )}

        {phaseIdx >= 3 && (
          <Box marginTop={1}>
            <Text color={COLORS.amber}>
              <TypeWriter
                text="> PRESS [ENTER] TO BEGIN RECRUITMENT"
                speed="normal"
                onComplete={advancePhase}
              />
            </Text>
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
