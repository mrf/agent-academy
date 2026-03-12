import { Box, Text } from "ink";
import { COLORS } from "../constants.js";

interface BottomBarProps {
  currentStep: number;
  totalSteps: number;
  availableActions: string[];
}

const ACTION_LABELS: Record<string, string> = {
  continue: "[ENTER] Continue",
  restart: "[ENTER] Restart Mission",
  skip: "[ANY] Skip",
  handler: "[?] Handler",
  menu: "[ESC] Menu",
  submit: "[ENTER] Submit",
};

export function BottomBar({
  currentStep,
  totalSteps,
  availableActions,
}: BottomBarProps) {
  const progress = totalSteps > 0 ? currentStep / totalSteps : 0;
  const barWidth = 20;
  const filled = Math.round(progress * barWidth);
  const empty = barWidth - filled;

  const progressBar = "\u2588".repeat(filled) + "\u2591".repeat(empty);

  const keybindings = availableActions.map(
    (action) => ACTION_LABELS[action] ?? `[${action}]`
  );

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      width="100%"
      paddingX={1}
    >
      <Box gap={1}>
        <Text color={COLORS.gray} wrap="truncate">PROGRESS</Text>
        <Text color={COLORS.amber} wrap="truncate">{progressBar}</Text>
        <Text color={COLORS.warmWhite} wrap="truncate">
          {currentStep}/{totalSteps}
        </Text>
      </Box>
      <Box gap={2}>
        {keybindings.map((label) => (
          <Text key={label} color={COLORS.amber} wrap="truncate">
            {label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
