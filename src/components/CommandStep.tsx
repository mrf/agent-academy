import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { COLORS, TIMING } from "../constants.js";
import type { CommandStep as CommandStepType } from "../types.js";
import { evaluateAnswer, localMatch } from "../ai/evaluator.js";

interface CommandStepProps {
  step: CommandStepType;
  onAnswer: (correct: boolean) => void;
  isFocused: boolean;
  hasApiKey?: boolean;
}

type Phase = "input" | "pausing" | "selfAssess" | "result";

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

const MAX_INPUT_LENGTH = 200;

function getHelpHint(step: CommandStepType): string {
  const answer = step.expectedAnswer;
  if (answer.length <= 3) return `Intel: the answer is ${answer.length} characters long.`;
  const revealed = answer.slice(0, Math.ceil(answer.length / 3));
  return `Intel: the answer starts with "${revealed}..."`;
}

export function CommandStep({ step, onAnswer, isFocused, hasApiKey = true }: CommandStepProps) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [correct, setCorrect] = useState(false);
  const [secretResponse, setSecretResponse] = useState<SecretResponse | null>(
    null,
  );
  const [helpHint, setHelpHint] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const answerTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => clearTimeout(answerTimerRef.current);
  }, []);

  const finishWithResult = useCallback(
    (isCorrect: boolean) => {
      setCorrect(isCorrect);
      setPhase("result");

      const delay = isCorrect
        ? TIMING.pauseAfterConfirmed
        : TIMING.pauseAfterCompromised;

      answerTimerRef.current = setTimeout(() => {
        onAnswer(isCorrect);
      }, delay);
    },
    [onAnswer],
  );

  const handleSubmit = useCallback(
    async (input: string) => {
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

      if (!hasApiKey) {
        // Offline mode: try local match first, then self-assessment
        const local = localMatch(trimmed, step.acceptedVariants);
        if (local.correct) {
          finishWithResult(true);
          return;
        }
        // Local match failed — ask agent to self-assess
        setUserAnswer(trimmed);
        setPhase("selfAssess");
        return;
      }

      // Online mode: use API evaluation with local fallback
      setPhase("pausing");

      const result = await evaluateAnswer(
        step.question,
        trimmed,
        step.expectedAnswer,
        step.acceptedVariants,
      );

      finishWithResult(result.correct);
    },
    [phase, step, hasApiKey, finishWithResult],
  );

  const handleChange = useCallback((newValue: string) => {
    if (newValue.length <= MAX_INPUT_LENGTH) {
      setValue(newValue);
    }
  }, []);

  useInput(
    () => {
      if (secretResponse) setSecretResponse(null);
      if (helpHint) setHelpHint(null);
    },
    { isActive: isFocused && (!!secretResponse || !!helpHint) },
  );

  useInput(
    (input) => {
      const char = input.toLowerCase();
      if (char === "y") {
        finishWithResult(true);
      } else if (char === "n") {
        finishWithResult(false);
      }
    },
    { isActive: isFocused && phase === "selfAssess" },
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
        <Box marginTop={1}>
          <Text color={COLORS.gray} dimColor>
            Verifying...
          </Text>
        </Box>
      )}

      {phase === "selfAssess" && (
        <Box flexDirection="column" gap={1}>
          <Text color={COLORS.amber} dimColor>
            Comms are down, agent. Verify your own intel.
          </Text>
          <Text color={COLORS.warmWhite}>
            Your answer:{" "}
            <Text color={COLORS.cyan} bold>
              {userAnswer}
            </Text>
          </Text>
          <Text color={COLORS.warmWhite}>
            Expected:{" "}
            <Text color={COLORS.green} bold>
              {step.expectedAnswer}
            </Text>
          </Text>
          <Text color={COLORS.amber} bold>
            Did your answer match? [Y/N]
          </Text>
        </Box>
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
          <Box marginTop={1}>
            <Text color={COLORS.gray}>{step.explanation}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
