import { useState, useCallback, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { QuizStep } from "../components/QuizStep.js";
import { generateFieldAssessments } from "../ai/quiz-gen.js";
import { MISSIONS } from "../data/curriculum.js";
import {
  loadProgress,
  saveInfiniteResult,
  reportBadQuestion,
} from "../store/progress.js";
import { COLORS } from "../constants.js";
import { useTerminalSize } from "../lib/terminal.js";
import type { ClearanceLevel, QuizStep as QuizStepType } from "../types.js";

type Phase =
  | "topic-select"
  | "difficulty-select"
  | "confirm"
  | "generating"
  | "quiz"
  | "summary";

interface InfiniteModeProps {
  onBack: () => void;
  overlayOpen: boolean;
}

const DIFFICULTY_TIERS = [
  {
    label: "RECRUIT - Recognition-level recall",
    value: "recruit" as ClearanceLevel,
    key: "recruit",
  },
  {
    label: "OPERATIVE - Understanding & comparison",
    value: "operative" as ClearanceLevel,
    key: "operative",
  },
  {
    label: "ELITE - Applied scenario questions",
    value: "elite" as ClearanceLevel,
    key: "elite",
  },
];

const QUESTIONS_PER_BATCH = 5;
const EST_COST_PER_BATCH = 0.02;
const FXP_PER_CORRECT = 15;

function accuracyColor(correct: number, total: number): string {
  if (total === 0) return COLORS.red;
  const ratio = correct / total;
  if (ratio >= 0.8) return COLORS.green;
  if (ratio >= 0.5) return COLORS.amber;
  return COLORS.red;
}

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

export function InfiniteMode({ onBack, overlayOpen }: InfiniteModeProps) {
  const { columns } = useTerminalSize();
  const contentWidth = Math.max(20, columns - 8);
  const progress = loadProgress();
  const [phase, setPhase] = useState<Phase>("topic-select");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<ClearanceLevel | null>(null);
  const [questions, setQuestions] = useState<QuizStepType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [fxpEarned, setFxpEarned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [dots, setDots] = useState(".");
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Loading dots animation
  useEffect(() => {
    if (phase !== "generating") return;
    const timer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(timer);
  }, [phase]);

  const topicItems = MISSIONS.filter((m) =>
    progress.completedMissions.includes(m.id),
  ).map((m, idx) => ({
    label: `${String(idx + 1).padStart(2, "0")} ${m.title}`,
    value: m.title,
    key: m.id,
  }));

  const stats = progress.infiniteModeStats;

  const handleTopicSelect = useCallback(
    (item: { value: string }) => {
      setSelectedTopic(item.value);
      setPhase("difficulty-select");
    },
    [],
  );

  const handleDifficultySelect = useCallback(
    (item: { value: ClearanceLevel }) => {
      setSelectedDifficulty(item.value);
      setPhase("confirm");
    },
    [],
  );

  const startGeneration = useCallback(async () => {
    if (!selectedTopic || !selectedDifficulty) return;
    setPhase("generating");
    setError(null);
    try {
      const result = await generateFieldAssessments(
        selectedTopic,
        selectedDifficulty,
        QUESTIONS_PER_BATCH,
        1,
      );
      if (!mountedRef.current) return;
      if (result.length === 0) {
        setError("No questions generated. Check your API key.");
        setPhase("confirm");
        return;
      }
      const quizSteps: QuizStepType[] = result.map((q) => ({
        type: "quiz" as const,
        question: q.question,
        options: q.options,
        correct: q.correct as 0 | 1 | 2 | 3,
        explanation: q.explanation,
      }));
      setQuestions(quizSteps);
      setCurrentIndex(0);
      setCorrect(0);
      setTotal(0);
      setFxpEarned(0);
      setPhase("quiz");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Generation failed");
      setPhase("confirm");
    }
  }, [selectedTopic, selectedDifficulty]);

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      const newTotal = total + 1;
      const newCorrect = correct + (isCorrect ? 1 : 0);
      const fxp = isCorrect ? FXP_PER_CORRECT : 0;
      setTotal(newTotal);
      setCorrect(newCorrect);
      setFxpEarned((prev) => prev + fxp);
      setReported(false);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= questions.length) {
        saveInfiniteResult(newCorrect, newTotal, fxpEarned + fxp);
        setPhase("summary");
      } else {
        setCurrentIndex(nextIndex);
      }
    },
    [total, correct, currentIndex, questions.length, fxpEarned],
  );

  useInput(
    (input, key) => {
      if (key.escape && !overlayOpen) {
        if (phase === "topic-select") {
          onBack();
        } else if (phase === "difficulty-select") {
          setPhase("topic-select");
        } else if (phase === "confirm") {
          setPhase("difficulty-select");
        } else if (phase === "summary") {
          onBack();
        }
        return;
      }

      if (key.return && phase === "confirm") {
        startGeneration();
        return;
      }

      if (key.return && phase === "summary") {
        setPhase("topic-select");
        return;
      }

      // Report bad question
      if (
        (input === "r" || input === "R") &&
        phase === "quiz" &&
        !reported
      ) {
        const q = questions[currentIndex];
        if (q) {
          reportBadQuestion(
            q.question,
            selectedTopic ?? "",
            selectedDifficulty ?? "",
          );
          setReported(true);
        }
      }
    },
    { isActive: phase !== "generating" },
  );

  const currentQuestion = questions[currentIndex];

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
          <Text color={COLORS.cyan} bold>
            [ DEEP COVER OPERATIONS ]
          </Text>
        </Box>

        {phase === "topic-select" && (
          <Box flexDirection="column" gap={1}>
            {stats && stats.sessionsPlayed > 0 && (
              <Box gap={4} marginBottom={1}>
                <Text color={COLORS.gray}>
                  Sessions:{" "}
                  <Text color={COLORS.amber}>{stats.sessionsPlayed}</Text>
                </Text>
                <Text color={COLORS.gray}>
                  Lifetime:{" "}
                  <Text color={COLORS.amber}>
                    {stats.correct}/{stats.total}
                  </Text>
                </Text>
                <Text color={COLORS.gray}>
                  FXP earned:{" "}
                  <Text color={COLORS.amber}>{stats.fxpEarned}</Text>
                </Text>
              </Box>
            )}
            <Text color={COLORS.cyan}>
              Select mission topic for field assessment:
            </Text>
            {topicItems.length === 0 ? (
              <Text color={COLORS.red}>
                No completed missions. Complete a mission first to unlock field
                assessments.
              </Text>
            ) : (
              <SelectInput
                items={topicItems}
                onSelect={handleTopicSelect}
                indicatorComponent={CustomIndicator}
                itemComponent={CustomItem}
              />
            )}
            <Text color={COLORS.gray}>[ESC] Back to mission map</Text>
          </Box>
        )}

        {phase === "difficulty-select" && (
          <Box flexDirection="column" gap={1}>
            <Text color={COLORS.cyan}>
              Topic:{" "}
              <Text color={COLORS.amber} bold>
                {selectedTopic}
              </Text>
            </Text>
            <Text color={COLORS.cyan}>Select clearance tier:</Text>
            <SelectInput
              items={DIFFICULTY_TIERS}
              onSelect={handleDifficultySelect}
              indicatorComponent={CustomIndicator}
              itemComponent={CustomItem}
            />
            <Text color={COLORS.gray}>[ESC] Back</Text>
          </Box>
        )}

        {phase === "confirm" && (
          <Box flexDirection="column" gap={1}>
            <Text color={COLORS.cyan}>
              Topic:{" "}
              <Text color={COLORS.amber} bold>
                {selectedTopic}
              </Text>
            </Text>
            <Text color={COLORS.cyan}>
              Clearance Tier:{" "}
              <Text color={COLORS.amber} bold>
                {selectedDifficulty?.toUpperCase()}
              </Text>
            </Text>
            <Text color={COLORS.cyan}>
              Questions:{" "}
              <Text color={COLORS.amber} bold>
                {QUESTIONS_PER_BATCH}
              </Text>
            </Text>
            <Text color={COLORS.gray}>
              {"─".repeat(contentWidth)}
            </Text>
            <Text color={COLORS.cyan}>
              Est. API cost:{" "}
              <Text color={COLORS.amber} bold>
                ~${EST_COST_PER_BATCH.toFixed(2)}
              </Text>
            </Text>
            {error && (
              <Text color={COLORS.red} bold>
                {error}
              </Text>
            )}
            <Box marginTop={1} gap={2}>
              <Text color={COLORS.amber} bold>
                [ENTER] Begin assessment
              </Text>
              <Text color={COLORS.gray}>[ESC] Back</Text>
            </Box>
          </Box>
        )}

        {phase === "generating" && (
          <Box flexDirection="column" gap={1}>
            <Text color={COLORS.cyan}>
              Generating field assessment{dots}
            </Text>
            <Text color={COLORS.gray} dimColor>
              Contacting HQ for {selectedDifficulty}-level intel on{" "}
              {selectedTopic}...
            </Text>
          </Box>
        )}

        {phase === "quiz" && currentQuestion && (
          <Box flexDirection="column" gap={1}>
            <Box justifyContent="space-between">
              <Text color={COLORS.cyan}>
                Q {currentIndex + 1}/{questions.length}
              </Text>
              <Text color={COLORS.amber}>
                FXP: <Text bold>{fxpEarned}</Text>
              </Text>
              <Text color={COLORS.green}>
                {correct}/{total} correct
              </Text>
            </Box>
            <Text color={COLORS.gray}>
              {"─".repeat(contentWidth)}
            </Text>
            <QuizStep
              key={currentIndex}
              step={currentQuestion}
              onAnswer={handleAnswer}
              isFocused
            />
            <Box marginTop={1}>
              <Text color={reported ? COLORS.green : COLORS.gray}>
                {reported ? "[R] Reported" : "[R] Report bad question"}
              </Text>
            </Box>
          </Box>
        )}

        {phase === "summary" && (
          <Box flexDirection="column" gap={1}>
            <Text color={COLORS.cyan} bold>
              {"── ASSESSMENT COMPLETE ──"}
            </Text>
            <Text color={COLORS.warmWhite}>
              Score:{" "}
              <Text bold color={COLORS.amber}>
                {correct}/{total}
              </Text>
            </Text>
            <Text color={COLORS.warmWhite}>
              Accuracy:{" "}
              <Text bold color={accuracyColor(correct, total)}>
                {total > 0 ? Math.round((correct / total) * 100) : 0}%
              </Text>
            </Text>
            <Text color={COLORS.warmWhite}>
              FXP earned:{" "}
              <Text bold color={COLORS.amber}>
                +{fxpEarned}
              </Text>
            </Text>
            <Box marginTop={1} gap={2}>
              <Text color={COLORS.amber} bold>
                [ENTER] New assessment
              </Text>
              <Text color={COLORS.gray}>[ESC] Back to mission map</Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
