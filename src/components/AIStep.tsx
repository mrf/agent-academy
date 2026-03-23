import { type ReactNode, useState, useCallback, useRef } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useSpinner } from "../hooks/useSpinner.js";
import { COLORS } from "../constants.js";
import type { AIStep as AIStepType } from "../types.js";
import { evaluateAIResponse } from "../ai/evaluator.js";

interface AIStepProps {
  step: AIStepType;
  onAnswer: (correct: boolean | null) => void;
  isFocused: boolean;
  hasApiKey?: boolean;
}

type Phase = "input" | "evaluating" | "selfAssess" | "result";

const MAX_INPUT_LENGTH = 500;

interface ResultBannerProps {
  evalFailed: boolean;
  correct: boolean;
  feedback: string;
}

function ResultBanner({ evalFailed, correct, feedback }: ResultBannerProps): ReactNode {
  if (evalFailed) {
    return (
      <Text color={COLORS.amber} bold>
        ⚠ UNABLE TO VERIFY — Comms down. Could not evaluate your response.
        Moving on.
      </Text>
    );
  }

  if (correct) {
    return (
      <>
        <Text color={COLORS.green} bold>
          ✔ CONFIRMED
        </Text>
        {feedback && (
          <Box marginTop={1}>
            <Text color={COLORS.gray}>{feedback}</Text>
          </Box>
        )}
      </>
    );
  }

  return (
    <>
      <Text color={COLORS.red} bold>
        ✘ COMPROMISED
      </Text>
      {feedback && (
        <Box marginTop={1}>
          <Text color={COLORS.gray}>{feedback}</Text>
        </Box>
      )}
    </>
  );
}

export function AIStep({ step, onAnswer, isFocused, hasApiKey = true }: AIStepProps) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const spinner = useSpinner(phase === "evaluating");
  const [correct, setCorrect] = useState(false);
  const [evalFailed, setEvalFailed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const correctRef = useRef(false);
  const evalFailedRef = useRef(false);

  const finishWithResult = useCallback(
    (isCorrect: boolean, failed?: boolean, feedbackText?: string) => {
      correctRef.current = isCorrect;
      evalFailedRef.current = !!failed;
      setCorrect(isCorrect);
      setEvalFailed(!!failed);
      setFeedback(feedbackText ?? "");
      setPhase("result");
    },
    [],
  );

  useInput(
    (_input, key) => {
      if (key.return && phaseRef.current === "result") {
        onAnswer(evalFailedRef.current ? null : correctRef.current);
      }
    },
    { isActive: isFocused },
  );

  const handleSubmit = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (phase !== "input" || !trimmed) return;

      if (!hasApiKey) {
        setPhase("selfAssess");
        return;
      }

      setPhase("evaluating");

      const result = await evaluateAIResponse(
        step.prompt,
        trimmed,
        step.criteria,
      );

      finishWithResult(result.correct, result.evalFailed, result.feedback);
    },
    [phase, step, hasApiKey, finishWithResult],
  );

  const handleChange = useCallback((newValue: string) => {
    if (newValue.length <= MAX_INPUT_LENGTH) {
      setValue(newValue);
    }
  }, []);

  useInput(
    (input) => {
      const char = input.toLowerCase();
      if (char === "y") {
        finishWithResult(true, false, "Self-assessed as correct.");
      } else if (char === "n") {
        finishWithResult(false, false, "Self-assessed as incorrect.");
      }
    },
    { isActive: isFocused && phase === "selfAssess" },
  );

  return (
    <Box flexDirection="column" gap={1}>
      <Text color={COLORS.cyan} bold>
        {step.prompt}
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
            focus={isFocused}
            placeholder="Type your response..."
          />
        </Box>
      )}

      {phase === "evaluating" && (
        <Box marginTop={1}>
          <Text color={COLORS.gray} dimColor>
            {spinner} Analyzing response...
          </Text>
        </Box>
      )}

      {phase === "selfAssess" && (
        <Box flexDirection="column" gap={1}>
          <Text color={COLORS.amber} dimColor>
            Comms are down, agent. Assess your own response.
          </Text>
          <Text color={COLORS.warmWhite}>
            Your response:{" "}
            <Text color={COLORS.cyan} bold>
              {value}
            </Text>
          </Text>
          <Text color={COLORS.amber} bold>
            Did you give a thoughtful, relevant answer? [Y/N]
          </Text>
        </Box>
      )}

      {phase === "result" && (
        <Box flexDirection="column">
          <ResultBanner
            evalFailed={evalFailed}
            correct={correct}
            feedback={feedback}
          />
          <Box marginTop={1}>
            <Text color={COLORS.gray} dimColor>
              [Enter] to continue
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
