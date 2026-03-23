import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { COLORS, TIMING } from "../constants.js";
import { renderStars } from "../lib/stars.js";
import type { Mission, WrongAnswer } from "../types.js";

interface DebriefProps {
  mission: Mission;
  stars: 1 | 2 | 3;
  fxpEarned: number;
  coverRemaining: number;
  wrongAnswers: WrongAnswer[];
  onContinue: () => void;
}

function renderCoverBlocks(remaining: number): string {
  return Array.from({ length: 3 }, (_, i) =>
    i < remaining ? "\u25A0" : "\u25A1"
  ).join(" ");
}

export function Debrief({
  mission,
  stars,
  fxpEarned,
  coverRemaining,
  wrongAnswers,
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

  const starString = renderStars(starsRevealed);
  const objectivesMetCount = Math.ceil(
    (mission.objectives.length * stars) / 3
  );

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
          <Text color={COLORS.cyan} bold>
            FXP EARNED:{" "}
          </Text>
          <Text color={COLORS.amber} bold>
            {fxpDisplay}
          </Text>
        </Box>

        {/* Cover integrity */}
        <Box marginBottom={1}>
          <Text color={COLORS.cyan} bold>
            COVER INTEGRITY:{" "}
          </Text>
          <Text color={COLORS.warmWhite}>
            {renderCoverBlocks(coverRemaining)}
          </Text>
        </Box>

        {/* Objectives summary */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color={COLORS.cyan} bold>
            OBJECTIVES:
          </Text>
          {mission.objectives.map((obj, i) => {
            const met = i < objectivesMetCount;
            return (
              <Text key={i} color={met ? COLORS.green : COLORS.warmWhite}>
                {`  ${met ? "[x]" : "[ ]"} ${obj}`}
              </Text>
            );
          })}
        </Box>

        {/* Wrong answers review */}
        {wrongAnswers.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color={COLORS.red} bold>
              REVIEW — WRONG ANSWERS:
            </Text>
            {wrongAnswers.map((wa, i) => (
              <Box key={i} flexDirection="column" marginLeft={2} marginTop={1}>
                <Text color={COLORS.warmWhite}>
                  {`${i + 1}. ${wa.question}`}
                </Text>
                <Text color={COLORS.green}>
                  {`   Correct: ${wa.correctAnswer}`}
                </Text>
                <Text color={COLORS.gray}>
                  {`   ${wa.explanation}`}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Continue prompt */}
        {animDone && (
          <Box justifyContent="center" marginTop={1}>
            <Text color={COLORS.amber} bold>
              [ENTER] Return to mission map
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
