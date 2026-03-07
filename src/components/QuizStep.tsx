import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { COLORS, TIMING } from "../constants.js";
import type { QuizStep as QuizStepType } from "../types.js";

interface QuizStepProps {
  step: QuizStepType;
  onAnswer: (correct: boolean) => void;
  isFocused: boolean;
}

type Phase = "selecting" | "pausing" | "result";

type ShakeFrame = -1 | 0 | 1;

const SHAKE_SEQUENCE: ShakeFrame[] = [1, 0, -1, 0];
const SHAKE_FRAME_MS = 50;
const SHAKE_BASE_MARGIN = 1;

function CustomIndicator({ isSelected }: { isSelected?: boolean }) {
  return (
    <Text color={isSelected ? COLORS.amber : COLORS.gray}>
      {isSelected ? "> " : "  "}
    </Text>
  );
}

function CustomItem({
  isSelected,
  label,
}: {
  isSelected?: boolean;
  label: string;
}) {
  return (
    <Text color={isSelected ? COLORS.amber : COLORS.gray} bold={isSelected}>
      {label}
    </Text>
  );
}

export function QuizStep({ step, onAnswer, isFocused }: QuizStepProps) {
  const [phase, setPhase] = useState<Phase>("selecting");
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [shakeOffset, setShakeOffset] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const correct = selectedIndex !== -1 && selectedIndex === step.correct;

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const items = useMemo(
    () =>
      step.options.map((option, index) => ({
        label: option,
        value: index,
        key: String(index),
      })),
    [step.options],
  );

  const trackTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const runShake = useCallback(() => {
    SHAKE_SEQUENCE.forEach((frame, i) => {
      trackTimer(() => setShakeOffset(frame), i * SHAKE_FRAME_MS);
    });
    trackTimer(
      () => setShakeOffset(0),
      SHAKE_SEQUENCE.length * SHAKE_FRAME_MS,
    );
  }, [trackTimer]);

  const handleSelect = useCallback(
    (item: { value: number }) => {
      if (phase !== "selecting") return;

      const isCorrect = item.value === step.correct;
      setSelectedIndex(item.value);
      setPhase("pausing");

      trackTimer(() => {
        setPhase("result");
        if (!isCorrect) {
          runShake();
        }
      }, TIMING.pauseBeforeResult);

      const delay = isCorrect
        ? TIMING.pauseBeforeResult + TIMING.pauseAfterConfirmed
        : TIMING.pauseBeforeResult + TIMING.pauseAfterCompromised;

      trackTimer(() => onAnswer(isCorrect), delay);
    },
    [phase, step.correct, onAnswer, runShake, trackTimer],
  );

  return (
    <Box
      flexDirection="column"
      gap={1}
      marginLeft={SHAKE_BASE_MARGIN + shakeOffset}
    >
      <Text color={COLORS.cyan} bold>
        {step.question}
      </Text>

      {phase === "selecting" && (
        <SelectInput
          items={items}
          onSelect={handleSelect}
          isFocused={isFocused}
          indicatorComponent={CustomIndicator}
          itemComponent={CustomItem}
        />
      )}

      {phase === "pausing" && (
        <Box flexDirection="column">
          {items.map((item) => (
            <Box key={item.key}>
              <Text color={COLORS.gray}>
                {item.value === selectedIndex ? "> " : "  "}
              </Text>
              <Text color={COLORS.gray} dimColor>
                {item.label}
              </Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text color={COLORS.gray} dimColor>
              Verifying...
            </Text>
          </Box>
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
              <Box flexDirection="column" marginTop={1}>
                {items.map((item) => (
                  <Box key={item.key}>
                    <Text
                      color={
                        item.value === step.correct
                          ? COLORS.green
                          : item.value === selectedIndex
                            ? COLORS.red
                            : COLORS.gray
                      }
                      bold={item.value === step.correct}
                    >
                      {item.value === step.correct ? "> " : "  "}
                      {item.label}
                      {item.value === step.correct ? " ✔" : ""}
                    </Text>
                  </Box>
                ))}
              </Box>
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
