import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { COLORS } from "../constants.js";
import { MISSIONS } from "../data/curriculum.js";
import { renderStars } from "../lib/stars.js";
import { useTerminalSize } from "../lib/terminal.js";
import { loadProgress } from "../store/progress.js";

interface CreditsProps {
  onClose: () => void;
}

export function Credits({ onClose }: CreditsProps) {
  const [phase, setPhase] = useState<"summary" | "credits" | "destruct" | "wipe">(
    "summary",
  );
  const [countdown, setCountdown] = useState(3);
  const [wipeProgress, setWipeProgress] = useState(0);
  const { columns: cols, rows } = useTerminalSize();
  const contentWidth = Math.max(20, cols - 8);

  const progress = loadProgress();
  const totalStars = Object.values(progress.starRatings).reduce(
    (sum, s) => sum + s,
    0,
  );
  const maxStars = MISSIONS.length * 3;
  const perfectMissions = Object.values(progress.starRatings).filter(
    (s) => s === 3,
  ).length;
  const improvable = MISSIONS.filter(
    (m) => (progress.starRatings[m.id] ?? 0) < 3,
  );

  useInput((_input, key) => {
    switch (phase) {
      case "summary":
        if (key.return) setPhase("credits");
        if (key.escape) onClose();
        break;
      case "credits":
        if (key.return) setPhase("destruct");
        if (key.escape) setPhase("summary");
        break;
      case "destruct":
        if (key.escape) {
          setCountdown(3);
          setPhase("credits");
        }
        break;
      case "wipe":
        if (key.escape) {
          setCountdown(3);
          setWipeProgress(0);
          setPhase("credits");
        }
        break;
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

  if (phase === "summary") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor={COLORS.gold}
          paddingX={2}
          paddingY={1}
        >
          <Box justifyContent="center" marginBottom={1}>
            <Text color={COLORS.gold} bold>
              [ FINAL DEBRIEF — TRAINING COMPLETE ]
            </Text>
          </Box>

          <Box justifyContent="center" marginBottom={1}>
            <Text color={COLORS.warmWhite}>
              Congratulations, operative. You have completed all training
              modules.
            </Text>
          </Box>

          <Text color={COLORS.gray}>
            {"─".repeat(contentWidth)}
          </Text>

          {/* Overall stats */}
          <Box marginTop={1} flexDirection="column">
            <Box gap={2}>
              <Text color={COLORS.cyan} bold>CLEARANCE:</Text>
              <Text color={COLORS.amber} bold>
                {progress.clearanceLevel.toUpperCase()}
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={COLORS.cyan} bold>TOTAL FXP:</Text>
              <Text color={COLORS.amber} bold>
                {progress.fxp.toLocaleString()}
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={COLORS.cyan} bold>MISSIONS:</Text>
              <Text color={COLORS.warmWhite}>
                {progress.completedMissions.length}/{MISSIONS.length} complete
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={COLORS.cyan} bold>STARS:</Text>
              <Text color={COLORS.gold}>
                {totalStars}/{maxStars}
              </Text>
              {perfectMissions === MISSIONS.length && (
                <Text color={COLORS.gold} bold> PERFECT</Text>
              )}
            </Box>
          </Box>

          <Text color={COLORS.gray}>
            {"\n" + "─".repeat(contentWidth)}
          </Text>

          {/* Per-mission breakdown */}
          <Box marginTop={1} flexDirection="column">
            <Text color={COLORS.cyan} bold>MISSION PERFORMANCE:</Text>
            {MISSIONS.map((mission, i) => {
              const stars = progress.starRatings[mission.id] ?? 0;
              const num = String(i + 1).padStart(2, "0");
              return (
                <Box key={mission.id} gap={1}>
                  <Text color={COLORS.warmWhite}>
                    {num} {mission.codename}
                  </Text>
                  <Text color={COLORS.gold}>{renderStars(stars)}</Text>
                </Box>
              );
            })}
          </Box>

          {/* Replay suggestions */}
          {improvable.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text color={COLORS.gray}>
                {"─".repeat(contentWidth)}
              </Text>
              <Text color={COLORS.amber}>
                {improvable.length} mission{improvable.length > 1 ? "s" : ""} below 3 stars — replay to improve your rating.
              </Text>
            </Box>
          )}

          <Box marginTop={1} justifyContent="center">
            <Text color={COLORS.gray} dimColor>
              [ENTER] Continue to credits  [ESC] Exit
            </Text>
          </Box>
        </Box>
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

        {phase === "credits" && (
          <Box marginTop={1} justifyContent="center">
            <Text color={COLORS.gray} dimColor>[ENTER] Self-destruct  [ESC] Back</Text>
          </Box>
        )}

        {phase === "destruct" && (
          <Box marginTop={1} flexDirection="column" alignItems="center">
            <Text color={COLORS.red} bold>
              This document will self-destruct in {countdown}...
            </Text>
            <Text color={COLORS.gray} dimColor>[ESC] Abort</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
