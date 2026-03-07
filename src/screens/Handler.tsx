import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { askHandler } from "../ai/instructor.js";
import { safeApiError } from "../ai/client.js";
import { COLORS, TIMING } from "../constants.js";

type Message = { role: "user" | "assistant"; content: string };

interface HandlerProps {
  missionTitle: string;
  topicContext: string;
  onClose: () => void;
}

export function Handler({ missionTitle, topicContext, onClose }: HandlerProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dots, setDots] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const chunkBufferRef = useRef("");
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuestionRef = useRef("");

  function clearFlushTimer(): void {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }

  // Thinking dots animation
  useEffect(() => {
    if (!isStreaming || streamedText.length > 0) return;
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, TIMING.thinkingDots);
    return () => clearInterval(id);
  }, [isStreaming, streamedText.length]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clearFlushTimer();
    };
  }, []);

  const flushBuffer = useCallback(() => {
    const text = chunkBufferRef.current;
    if (text) {
      chunkBufferRef.current = "";
      setStreamedText((prev) => prev + text);
    }
  }, []);

  const handleChunk = useCallback(
    (text: string) => {
      chunkBufferRef.current += text;
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flushBuffer();
      }, TIMING.tokenBuffer);
    },
    [flushBuffer],
  );

  const sendQuestion = useCallback(
    async (question: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsStreaming(true);
      setStreamedText("");
      setError(null);
      setDots("");
      chunkBufferRef.current = "";
      lastQuestionRef.current = question;

      try {
        const response = await askHandler({
          question,
          missionTitle,
          topicContext,
          conversationHistory: history,
          onChunk: handleChunk,
          signal: controller.signal,
        });

        if (response) {
          setHistory((prev) => [
            ...prev,
            { role: "user", content: question },
            { role: "assistant", content: response },
          ]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : safeApiError(err));
      } finally {
        clearFlushTimer();
        flushBuffer();
        setIsStreaming(false);
      }
    },
    [missionTitle, topicContext, history, handleChunk, flushBuffer],
  );

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming) return;

      if (error) {
        // Retry last question on Enter after error
        setError(null);
        sendQuestion(lastQuestionRef.current);
        setInput("");
        return;
      }

      setInput("");
      sendQuestion(trimmed);
    },
    [isStreaming, error, sendQuestion],
  );

  useInput((_input, key) => {
    if (key.escape) {
      if (isStreaming) {
        abortRef.current?.abort();
      } else {
        onClose();
      }
    }
  });

  // Show last few messages of history for context
  const visibleHistory = history.slice(-4);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLORS.cyan}
      paddingX={2}
      paddingY={1}
      width={60}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color={COLORS.cyan} bold>
          [ HANDLER ]
        </Text>
      </Box>

      {visibleHistory.map((msg, i) => (
        <Box key={i} marginBottom={i % 2 === 1 ? 1 : 0}>
          <Text
            color={msg.role === "user" ? COLORS.amber : COLORS.warmWhite}
            wrap="wrap"
          >
            {msg.role === "user" ? "> " : ""}
            {msg.content}
          </Text>
        </Box>
      ))}

      {isStreaming && streamedText.length === 0 && (
        <Box marginBottom={1}>
          <Text color={COLORS.gray} italic>
            Handler is reviewing intel {dots}
          </Text>
        </Box>
      )}

      {streamedText.length > 0 && (isStreaming || history.length === 0) && (
        <Box marginBottom={1}>
          <Text color={COLORS.warmWhite} wrap="wrap">
            {streamedText}
          </Text>
        </Box>
      )}

      {error && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={COLORS.red}>{error}</Text>
          <Text color={COLORS.gray}>Press Enter to retry</Text>
        </Box>
      )}

      <Box>
        <Text color={COLORS.amber} bold>
          {"? "}
        </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Ask your handler..."
        />
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Text color={COLORS.gray}>
          {isStreaming ? "ESC to cancel" : "ESC to close"}
        </Text>
      </Box>
    </Box>
  );
}
