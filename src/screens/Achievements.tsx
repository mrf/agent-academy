import { Box, Text, useInput } from "ink";
import { COLORS } from "../constants.js";
import { getAllAchievements } from "../lib/achievements.js";
import type { Achievement as AchievementDef } from "../lib/achievements.js";
import { loadProgress } from "../store/progress.js";
import { useTerminalSize } from "../lib/terminal.js";

interface AchievementsProps {
  onClose: () => void;
}

export function Achievements({ onClose }: AchievementsProps): React.ReactNode {
  const { columns } = useTerminalSize();
  const contentWidth = Math.max(20, columns - 8);
  const progress = loadProgress();
  const unlocked = new Set(progress.achievements);
  const all = getAllAchievements();
  const earnedCount = all.filter((a) => unlocked.has(a.id)).length;

  useInput((_input, key) => {
    if (key.escape || key.return) {
      onClose();
    }
  });

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
            [ CLASSIFIED DOSSIER — ACHIEVEMENTS ]
          </Text>
        </Box>

        <Box marginBottom={1} gap={2}>
          <Text color={COLORS.cyan}>
            EARNED:{" "}
            <Text bold color={earnedCount > 0 ? COLORS.gold : COLORS.gray}>
              {earnedCount}/{all.length}
            </Text>
          </Text>
        </Box>

        <Text color={COLORS.gray}>{"─".repeat(contentWidth)}</Text>

        <Box flexDirection="column" marginTop={1}>
          {all.map((achievement) => (
            <AchievementRow
              key={achievement.id}
              achievement={achievement}
              earned={unlocked.has(achievement.id)}
            />
          ))}
        </Box>

        <Text color={COLORS.gray}>{"─".repeat(contentWidth)}</Text>

        <Box marginTop={1} justifyContent="center">
          <Text color={COLORS.gray} dimColor>
            [ESC] Return to mission map
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

interface AchievementRowProps {
  achievement: AchievementDef;
  earned: boolean;
}

function AchievementRow({ achievement, earned }: AchievementRowProps): React.ReactNode {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box gap={1}>
        <Text color={earned ? COLORS.gold : COLORS.gray}>
          {earned ? "[✓]" : "[ ]"}
        </Text>
        {earned ? (
          <Text color={COLORS.amber} bold>
            {achievement.title}
          </Text>
        ) : (
          <Redacted length={achievement.title.length} />
        )}
      </Box>
      <Box marginLeft={4}>
        {earned ? (
          <Text color={COLORS.warmWhite}>{achievement.description ?? ""}</Text>
        ) : (
          <Redacted length={achievement.description?.length ?? 20} />
        )}
      </Box>
    </Box>
  );
}

function Redacted({ length }: { length: number }): React.ReactNode {
  return (
    <Text color={COLORS.gray} dimColor>
      {"█".repeat(length)}
    </Text>
  );
}
