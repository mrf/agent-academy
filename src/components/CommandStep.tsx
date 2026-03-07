import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { COLORS, TIMING } from "../constants.js";
import type { CommandStep as CommandStepType } from "../types.js";

interface CommandStepProps {
  step: CommandStepType;
  onAnswer: (correct: boolean) => void;
  isFocused: boolean;
}

type Phase = "input" | "pausing" | "result";

type SecretResponse = {
  message: string;
  color: string;
};

const SECRET_COMMANDS: Record<string, SecretResponse> = {
  "sudo !!": {
    message:
      "Nice try, agent. sudo won't help you here. +0 FXP but respect.",
    color: COLORS.amber,
  },
  "rm -rf /": {
    message:
      "CRITICAL: we've flagged your psych profile. Just kidding. Please don't do this in production.",
    color: COLORS.red,
  },
  clear: {
    message: "Your screen is clear, but your conscience never will be.",
    color: COLORS.gray,
  },
};

const STRIP_PREFIXES = /^(the|a|use)\s+/i;
const MAX_INPUT_LENGTH = 200;

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(STRIP_PREFIXES, "");
}

function checkAnswer(input: string, acceptedVariants: string[]): boolean {
  const normalizedInput = normalize(input);
  return acceptedVariants.some(
    (variant) => normalize(variant) === normalizedInput,
  );
}

function getHelpHint(step: CommandStepType): string {
  const answer = step.expectedAnswer;
  if (answer.length <= 3) return `Intel: the answer is ${answer.length} characters long.`;
  const revealed = answer.slice(0, Math.ceil(answer.length / 3));
  return `Intel: the answer starts with "${revealed}..."`;
}

export function CommandStep({ step, onAnswer, isFocused }: CommandStepProps) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [correct, setCorrect] = useState(false);
  const [secretResponse, setSecretResponse] = useState<SecretResponse | null>(
    null,
  );
  const [helpHint, setHelpHint] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (phase !== "input" || !trimmed) return;

      const lower = trimmed.toLowerCase();

      if (lower === "help") {
        setHelpHint(getHelpHint(step));
        setValue("");
        return;
      }

      const secret = SECRET_COMMANDS[lower];
      if (secret) {
        setSecretResponse(secret);
        setValue("");
        return;
      }

      const isCorrect = checkAnswer(trimmed, step.acceptedVariants);
      setCorrect(isCorrect);
      setPhase("pausing");

      setTimeout(() => {
        setPhase("result");
      }, TIMING.pauseBeforeResult);

      const delay = isCorrect
        ? TIMING.pauseBeforeResult + TIMING.pauseAfterConfirmed
        : TIMING.pauseBeforeResult + TIMING.pauseAfterCompromised;

      setTimeout(() => {
        onAnswer(isCorrect);
      }, delay);
    },
    [phase, step, onAnswer],
  );

  const handleChange = useCallback((newValue: string) => {
    if (newValue.length <= MAX_INPUT_LENGTH) {
      setValue(newValue);
    }
  }, []);

  // Dismiss secret response / help hint on any key
  useInput(
    (_input, _key) => {
      if (secretResponse) {
        setSecretResponse(null);
      }
      if (helpHint) {
        setHelpHint(null);
      }
    },
    { isActive: isFocused && (!!secretResponse || !!helpHint) },
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Text color={COLORS.cyan} bold>
        {step.question}
      </Text>

      {phase === "input" && (
        <Box>
          <Text color={COLORS.amber} bold>
            {">"}{" "}
          </Text>
          <TextInput
            value={value}
            onChange={handleChange}
            onSubmit={handleSubmit}
            focus={isFocused && !secretResponse && !helpHint}
            placeholder="Type your answer..."
          />
        </Box>
      )}

      {secretResponse && (
        <Text color={secretResponse.color}>{secretResponse.message}</Text>
      )}

      {helpHint && <Text color={COLORS.gray}>{helpHint}</Text>}

      {phase === "pausing" && (
        <Text color={COLORS.gray} dimColor>
          Verifying...
        </Text>
      )}

      {phase === "result" && (
        <Box flexDirection="column">
          {correct ? (
            <Text color={COLORS.green} bold>
              ✔ CONFIRMED
            </Text>
          ) : (
            <>
              <Text color={COLORS.red} bold>
                ✘ COMPROMISED
              </Text>
              <Text color={COLORS.warmWhite}>
                Expected:{" "}
                <Text color={COLORS.green} bold>
                  {step.expectedAnswer}
                </Text>
              </Text>
            </>
          )}
          <Text color={COLORS.gray}>{step.explanation}</Text>
        </Box>
      )}
    </Box>
  );
}
