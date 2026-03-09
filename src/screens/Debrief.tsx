import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { COLORS, TIMING } from "../constants.js";
import type { Mission } from "../types.js";

interface DebriefProps {
  mission: Mission;
  stars: 1 | 2 | 3;
  fxpEarned: number;
  coverRemaining: number;
  onContinue: () => void;
}

const STAR_FILLED = "\u2605";
const STAR_EMPTY = "\u2606";

function objectiveColor(passed: boolean, stars: 1 | 2 | 3): string {
  if (passed) return COLORS.green;
  if (stars === 2) return COLORS.amber;
  return COLORS.red;
}

export function Debrief({
  mission,
  stars,
  fxpEarned,
  coverRemaining,
  onContinue,
}: DebriefProps) {
  const [starsRevealed, setStarsRevealed] = useState(0);
  const [fxpDisplay, setFxpDisplay] = useState(0);
  const [animDone, setAnimDone] = useState(false);

  // Star reveal: show one star at a time
  useEffect(() => {
    if (starsRevealed >= stars) return;
    const timer = setTimeout(() => {
      setStarsRevealed((prev) => prev + 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [starsRevealed, stars]);

  // FXP count-up: starts after stars are revealed
  useEffect(() => {
    if (starsRevealed < stars) return;
    if (fxpDisplay >= fxpEarned) {
      setAnimDone(true);
      return;
    }
    const timer = setTimeout(() => {
      setFxpDisplay((prev) => Math.min(prev + 1, fxpEarned));
    }, TIMING.fxpTick);
    return () => clearTimeout(timer);
  }, [starsRevealed, stars, fxpDisplay, fxpEarned]);

  useInput((_input, key) => {
    if (key.return && animDone) {
      onContinue();
    }
  });

  const starString =
    STAR_FILLED.repeat(starsRevealed) +
    STAR_EMPTY.repeat(3 - starsRevealed);

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
            [ MISSION DEBRIEF ]
          </Text>
        </Box>

        {/* Star rating */}
        <Box justifyContent="center" marginBottom={1}>
          <Text color={COLORS.gold} bold>
            {starString}
          </Text>
        </Box>

        {/* FXP earned */}
        <Box marginBottom={1}>
          <Text color={COLORS.green} bold>
            FXP EARNED: {fxpDisplay}
          </Text>
        </Box>

        {/* Cover integrity */}
        <Box marginBottom={1}>
          <Text color={COLORS.warmWhite}>
            COVER INTEGRITY REMAINING: {coverRemaining}/3
          </Text>
        </Box>

        {/* Objectives summary */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color={COLORS.warmWhite} bold>
            OBJECTIVES:
          </Text>
          {mission.objectives.map((obj, i) => {
            const passed = stars === 3 || i < Math.ceil(mission.objectives.length * (stars / 3));
            const mark = passed ? "\u2713" : "\u2717";
            return (
              <Text key={i} color={objectiveColor(passed, stars)}>
                {"  "}{mark}{" "}{obj}
              </Text>
            );
          })}
        </Box>

        {/* Continue prompt */}
        {animDone && (
          <Box justifyContent="flex-end" marginTop={1}>
            <Text color={COLORS.amber} bold>
              [ENTER] Return to mission map
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
