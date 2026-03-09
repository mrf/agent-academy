import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { COLORS } from "../constants.js";

interface NoApiKeyProps {
  onContinue: () => void;
}

export function NoApiKey({ onContinue }: NoApiKeyProps) {
  const [dismissed, setDismissed] = useState(false);
  useInput(
    () => {
      setDismissed(true);
      onContinue();
    },
    { isActive: !dismissed },
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
        borderColor={COLORS.red}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        alignItems="center"
      >
        <Text color={COLORS.red} bold>
          [ SIGNAL INTERRUPTED ]
        </Text>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.warmWhite}>
            No ANTHROPIC_API_KEY detected in environment.
          </Text>
          <Text color={COLORS.warmWhite}>
            AI-powered missions require an API key to function.
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.cyan} bold>
            Setup Instructions:
          </Text>
          <Text color={COLORS.warmWhite}>
            1. Get your API key at{" "}
            <Text color={COLORS.cyan} underline>
              https://console.anthropic.com
            </Text>
          </Text>
          <Text color={COLORS.warmWhite}>
            2. Export it in your shell:
          </Text>
          <Text color={COLORS.amber}>
            {"   "}export ANTHROPIC_API_KEY=sk-ant-...
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.gray}>
            Estimated cost: ~$0.05-0.15 per mission (Haiku-class models)
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color={COLORS.amber}>
            {">"} Press any key to continue without AI features
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
