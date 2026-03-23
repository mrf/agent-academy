import { useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { MISSIONS } from "../data/curriculum.js";
import { loadProgress, toggleLegacyMode } from "../store/progress.js";
import { COLORS } from "../constants.js";
import { createKonamiTracker, setTerminalTitle } from "../lib/easter-eggs.js";
import { renderStars } from "../lib/stars.js";
import { useTerminalSize } from "../lib/terminal.js";

interface MissionMapProps {
  onSelectMission: (missionIndex: number) => void;
  onSelectInfiniteMode?: () => void;
  onOpenCredits?: () => void;
}

export function MissionMap({
  onSelectMission,
  onSelectInfiniteMode,
  onOpenCredits,
}: MissionMapProps) {
  const { columns } = useTerminalSize();
  const progress = loadProgress();
  const completedCount = progress.completedMissions.length;
  const allComplete = completedCount >= MISSIONS.length;

  const firstUncompletedIndex = MISSIONS.findIndex(
    (m) => !progress.completedMissions.includes(m.id),
  );
  const initialIndex = firstUncompletedIndex === -1 ? 0 : firstUncompletedIndex;

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [pulseBright, setPulseBright] = useState(true);
  const [legacyMode, setLegacyMode] = useState(progress.legacyModeUnlocked);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [konamiFlash, setKonamiFlash] = useState(false);
  const konamiCheck = useRef(createKonamiTracker()).current;
  const konamiTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(konamiTimerRef.current);
  }, []);

  useEffect(() => {
    setTerminalTitle(
      allComplete ? "CCA — FULL CLEARANCE" : "Claude Code Academy — RECRUITING",
    );
  }, [allComplete]);

  useEffect(() => {
    const timer = setInterval(() => setPulseBright((v) => !v), 500);
    return () => clearInterval(timer);
  }, []);

  const maxIndex = allComplete ? MISSIONS.length : MISSIONS.length - 1;

  useInput((input, key) => {
    // Konami code tracking
    if (konamiCheck(input, key)) {
      const nowActive = toggleLegacyMode();
      setLegacyMode(nowActive);
      setKonamiFlash(true);
      clearTimeout(konamiTimerRef.current);
      konamiTimerRef.current = setTimeout(() => setKonamiFlash(false), 2000);
    }

    // Credits screen (only after Full Clearance)
    if (input === "c" && allComplete) {
      onOpenCredits?.();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      setLockedMessage(null);
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(maxIndex, i + 1));
      setLockedMessage(null);
    } else if (key.return) {
      if (isInfiniteSelected && onSelectInfiniteMode) {
        onSelectInfiniteMode();
      } else {
        const mission = MISSIONS[selectedIndex];
        if (mission && isMissionUnlocked(mission.id, progress.completedMissions)) {
          onSelectMission(selectedIndex);
        } else if (mission) {
          const prevMission = MISSIONS[selectedIndex - 1];
          const prevNum = String(selectedIndex).padStart(2, "0");
          setLockedMessage(
            prevMission
              ? `Complete Mission ${prevNum} ${prevMission.codename} to unlock this one.`
              : "Complete the previous mission to unlock this one.",
          );
        }
      }
    }
  });

  const isInfiniteSelected =
    selectedIndex === MISSIONS.length && allComplete;
  const clearanceLabel = progress.clearanceLevel.toUpperCase();
  const fxpFormatted = progress.fxp.toLocaleString();

  // Content width inside the bordered box (outer padding + border + inner paddingX)
  const contentWidth = Math.max(20, columns - 8);

  // CRT legacy mode colors
  const crt = legacyMode;
  const primary = crt ? COLORS.green : COLORS.cyan;
  const accent = crt ? COLORS.green : COLORS.amber;
  const dim = crt ? COLORS.dimGreen : COLORS.gray;
  const crtSeparator = "- ".repeat(Math.ceil(contentWidth / 2)).slice(0, contentWidth);

  return (
    <Box flexDirection="column" justifyContent="center" padding={1}>
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={primary}
        paddingX={2}
        paddingY={1}
      >
        {konamiFlash && (
          <Box justifyContent="center" marginBottom={1}>
            <Text color={COLORS.green} bold>
              {legacyMode
                ? ">> LEGACY MODE ACTIVATED <<"
                : ">> LEGACY MODE DEACTIVATED <<"}
            </Text>
          </Box>
        )}

        {crt && (
          <Box justifyContent="center" marginBottom={1}>
            <Text color={dim}>
              {crtSeparator}
            </Text>
          </Box>
        )}

        <Box justifyContent="center" marginBottom={1}>
          <Text color={primary} bold>
            [ MISSION SELECT ]
          </Text>
        </Box>

        <Box marginBottom={1} gap={4}>
          <Text color={primary}>
            CLEARANCE: <Text bold>{clearanceLabel}</Text>
          </Text>
          <Text color={primary}>
            FXP: <Text bold>{fxpFormatted}</Text>
          </Text>
        </Box>

        <Text color={dim}>
          {"─".repeat(contentWidth)}
        </Text>

        {MISSIONS.map((mission, i) => {
          const isCompleted = progress.completedMissions.includes(mission.id);
          const isUnlocked = isMissionUnlocked(
            mission.id,
            progress.completedMissions,
          );
          const isCurrent = !isCompleted && isUnlocked;
          const isLocked = !isCompleted && !isUnlocked;
          const isSelected = selectedIndex === i;
          const num = String(i + 1).padStart(2, "0");
          // CRT scan line effect: alternate dim on even rows
          const scanDim = crt && i % 2 === 0;

          return (
            <Box key={mission.id} flexDirection="column" marginTop={i === 0 ? 1 : 0}>
              <Box>
                <Text color={isSelected ? accent : undefined} dimColor={scanDim}>
                  {isSelected ? "> " : "  "}
                </Text>

                {isCompleted && (
                  <Text color={COLORS.green} dimColor={scanDim}>
                    [x]{" "}
                  </Text>
                )}
                {isCurrent && (
                  <Text color={accent} dimColor={scanDim || !pulseBright}>
                    {"[>] "}
                  </Text>
                )}
                {isLocked && <Text dimColor>{"[ ] "}</Text>}

                <Text
                  color={crt ? COLORS.green : missionColor(isCompleted, isCurrent)}
                  dimColor={isLocked || scanDim}
                  bold={isSelected}
                >
                  {num} {mission.codename}
                </Text>

                <Text dimColor={scanDim}>{"  "}</Text>
                {isCompleted && (
                  <MissionRating
                    stars={progress.starRatings[mission.id] ?? 0}
                    crt={crt}
                    scanDim={scanDim}
                  />
                )}
                {isCurrent && (
                  <Text color={accent} dimColor={scanDim || !pulseBright} bold>
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

        <Box marginTop={1}>
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
              <Text color={primary}>{"  UNLOCKED"}</Text>
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

        {crt && (
          <Box marginTop={1} justifyContent="center">
            <Text color={dim}>
              {crtSeparator}
            </Text>
          </Box>
        )}

        {lockedMessage && (
          <Box marginTop={1}>
            <Text color={accent}>⚠ {lockedMessage}</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text color={dim}>
            {"[UP/DOWN] Navigate  [ENTER] Start mission"}
            {allComplete ? "  [C] Credits" : ""}
          </Text>
        </Box>
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
  crt?: boolean;
  scanDim?: boolean;
}

function MissionRating({ stars, crt, scanDim }: MissionRatingProps) {
  return (
    <>
      <Text color={crt ? COLORS.green : COLORS.gold} dimColor={scanDim}>
        {renderStars(stars)}
      </Text>
      <Text color={crt ? COLORS.green : COLORS.warmWhite} dimColor={scanDim}>
        {"  "}{missionFxp(stars)} FXP
      </Text>
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

function missionFxp(stars: number): number {
  return stars * 100 + 40;
}
