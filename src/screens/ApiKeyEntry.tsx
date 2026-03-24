import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { COLORS } from "../constants.js";

interface ApiKeyEntryProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function ApiKeyEntry({ onSuccess, onBack }: ApiKeyEntryProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter an API key.");
      return;
    }
    if (!trimmed.startsWith("sk-ant-")) {
      setError("Key should start with sk-ant-  — check and try again.");
      return;
    }
    process.env.ANTHROPIC_API_KEY = trimmed;
    onSuccess();
  };

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" padding={1}>
      <Box
        borderStyle="double"
        borderColor={COLORS.cyan}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Box justifyContent="center" marginBottom={1}>
          <Text color={COLORS.cyan} bold>
            [ API KEY REQUIRED ]
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color={COLORS.warmWhite}>
            Deep Cover Operations generates questions using the Claude API.
          </Text>
          <Text color={COLORS.warmWhite}>
            An ANTHROPIC_API_KEY is required to proceed.
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color={COLORS.amber} bold>
            How to get a key:
          </Text>
          <Text color={COLORS.warmWhite}>
            1. Visit{" "}
            <Text color={COLORS.cyan} underline>
              https://console.anthropic.com
            </Text>
          </Text>
          <Text color={COLORS.warmWhite}>
            2. Go to API Keys and create a new key
          </Text>
          <Text color={COLORS.warmWhite}>
            3. Paste it below (estimated cost: ~$0.15 for full curriculum)
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color={COLORS.amber} bold>
            Enter API key:
          </Text>
          <Box>
            <Text color={COLORS.cyan}>{"> "}</Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              mask="*"
            />
          </Box>
        </Box>

        {error && (
          <Box marginBottom={1}>
            <Text color={COLORS.amber}>⚠ {error}</Text>
          </Box>
        )}

        <Text color={COLORS.gray}>
          [ENTER] Confirm  [ESC] Back to mission map
        </Text>
      </Box>
    </Box>
  );
}
