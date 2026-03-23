import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { COLORS } from "../constants.js";

const LIMITED_FEATURES = [
  "AI evaluation of free-form answers",
  "Handler (AI help overlay)",
  "Infinite Mode (AI-generated quizzes)",
] as const;

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
        borderColor={COLORS.amber}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        alignItems="flex-start"
      >
        <Text color={COLORS.amber} bold>
          [ NO API KEY DETECTED ]
        </Text>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.warmWhite}>
            No ANTHROPIC_API_KEY detected in environment.
          </Text>
          <Text color={COLORS.warmWhite}>
            Core gameplay works offline — missions and quizzes run fine.
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.amber} bold>
            Features limited without a key:
          </Text>
          {LIMITED_FEATURES.map((feature) => (
            <Text key={feature} color={COLORS.warmWhite}>
              {"  "}• {feature}
            </Text>
          ))}
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text color={COLORS.cyan} bold>
            To unlock all features:
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

        <Box marginTop={1}>
          <Text color={COLORS.gray}>
            Estimated cost: ~$0.05-0.15 per mission (Haiku-class models)
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color={COLORS.amber}>
            [ANY KEY] Continue
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
