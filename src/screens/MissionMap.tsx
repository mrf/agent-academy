import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { MISSIONS } from "../data/curriculum.js";
import { loadProgress } from "../store/progress.js";
import { COLORS } from "../constants.js";

interface MissionMapProps {
  onSelectMission: (missionIndex: number) => void;
  onSelectInfiniteMode?: () => void;
}

export function MissionMap({
  onSelectMission,
  onSelectInfiniteMode,
}: MissionMapProps) {
  const progress = loadProgress();
  const completedCount = progress.completedMissions.length;
  const allComplete = completedCount >= MISSIONS.length;

  const firstUncompletedIndex = MISSIONS.findIndex(
    (m) => !progress.completedMissions.includes(m.id),
  );
  const initialIndex = firstUncompletedIndex === -1 ? 0 : firstUncompletedIndex;

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [pulseBright, setPulseBright] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setPulseBright((v) => !v), 500);
    return () => clearInterval(timer);
  }, []);

  const maxIndex = allComplete ? MISSIONS.length : MISSIONS.length - 1;

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(maxIndex, i + 1));
    } else if (key.return) {
      if (isInfiniteSelected && onSelectInfiniteMode) {
        onSelectInfiniteMode();
      } else {
        const mission = MISSIONS[selectedIndex];
        if (mission && isMissionUnlocked(mission.id, progress.completedMissions)) {
          onSelectMission(selectedIndex);
        }
      }
    }
  });

  const isInfiniteSelected =
    selectedIndex === MISSIONS.length && allComplete;
  const clearanceLabel = progress.clearanceLevel.toUpperCase();
  const fxpFormatted = progress.fxp.toLocaleString();

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
          <Text color={COLORS.cyan} bold>
            [ MISSION SELECT ]
          </Text>
        </Box>

        <Box marginBottom={1} gap={4}>
          <Text color={COLORS.cyan}>
            CLEARANCE: <Text bold>{clearanceLabel}</Text>
          </Text>
          <Text color={COLORS.cyan}>
            FXP: <Text bold>{fxpFormatted}</Text>
          </Text>
        </Box>

        <Text color={COLORS.gray}>
          {"────────────────────────────────────────"}
        </Text>

        <Box marginTop={1} />

        {MISSIONS.map((mission, i) => {
          const isCompleted = progress.completedMissions.includes(mission.id);
          const isUnlocked = isMissionUnlocked(
            mission.id,
            progress.completedMissions,
          );
          const isCurrent = !isCompleted && isUnlocked;
          const isLocked = !isCompleted && !isCurrent;
          const isSelected = selectedIndex === i;
          const num = String(i + 1).padStart(2, "0");

          return (
            <Box key={mission.id} flexDirection="column">
              <Box>
                <Text color={isSelected ? COLORS.amber : undefined}>
                  {isSelected ? "> " : "  "}
                </Text>

                {isCompleted && <Text color={COLORS.green}>[x] </Text>}
                {isCurrent && (
                  <Text color={COLORS.amber} dimColor={!pulseBright}>
                    {"[>] "}
                  </Text>
                )}
                {isLocked && <Text dimColor>{"[ ] "}</Text>}

                <Text
                  color={missionColor(isCompleted, isCurrent)}
                  dimColor={isLocked}
                  bold={isSelected}
                >
                  {num} {mission.codename}
                </Text>

                <Text>{"  "}</Text>
                {isCompleted && (
                  <MissionRating
                    stars={progress.starRatings[mission.id] ?? 0}
                  />
                )}
                {isCurrent && (
                  <Text color={COLORS.amber} dimColor={!pulseBright} bold>
                    IN PROGRESS
                  </Text>
                )}
                {isLocked && <Text dimColor>LOCKED</Text>}
              </Box>

              {i < MISSIONS.length - 1 && (
                <Box>
                  <Text dimColor>
                    {"   "}
                    {isCompleted ? "|" : ":"}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}

        <Box marginTop={1} />

        <Box>
          <Text color={isInfiniteSelected ? COLORS.amber : undefined}>
            {isInfiniteSelected ? "> " : "  "}
          </Text>
          {allComplete ? (
            <>
              <Text color={COLORS.cyan} dimColor={!pulseBright}>
                {"[>] "}
              </Text>
              <Text color={COLORS.cyan} bold={isInfiniteSelected}>
                ?? DEEP COVER OPERATIONS
              </Text>
              <Text color={COLORS.cyan}>{"  UNLOCKED"}</Text>
            </>
          ) : (
            <>
              <Text dimColor>{"[ ] "}</Text>
              <Text dimColor>{"?? "}</Text>
              <Text dimColor>
                {"\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588"}
              </Text>
              <Text dimColor>{"  CLASSIFIED"}</Text>
            </>
          )}
        </Box>

        <Box marginTop={1} />

        <Text color={COLORS.gray}>
          {"[UP/DOWN] Navigate  [ENTER] Start Mission"}
        </Text>
      </Box>
    </Box>
  );
}

function missionColor(
  isCompleted: boolean,
  isCurrent: boolean,
): string | undefined {
  if (isCompleted) return COLORS.warmWhite;
  if (isCurrent) return COLORS.amber;
  return undefined;
}

interface MissionRatingProps {
  stars: number;
}

function MissionRating({ stars }: MissionRatingProps) {
  return (
    <>
      <Text color={COLORS.gold}>{starString(stars)}</Text>
      <Text color={COLORS.warmWhite}>{"  "}{missionFxp(stars)} FXP</Text>
    </>
  );
}

function isMissionUnlocked(
  missionId: string,
  completedMissions: string[],
): boolean {
  const index = MISSIONS.findIndex((m) => m.id === missionId);
  if (index === 0) return true;
  const prevMission = MISSIONS[index - 1];
  return prevMission ? completedMissions.includes(prevMission.id) : false;
}

function starString(rating: number): string {
  const filled = "\u2605"; // ★
  const empty = "\u2606"; // ☆
  return filled.repeat(rating) + empty.repeat(3 - rating);
}

function missionFxp(stars: number): number {
  return stars * 100 + 40;
}
