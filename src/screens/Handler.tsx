import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { askHandler, getHandlerUsage } from "../ai/instructor.js";
import { safeApiError } from "../ai/client.js";
import { COLORS, TIMING } from "../constants.js";
import { getLoadingMessage } from "../lib/easter-eggs.js";
import { useTerminalSize } from "../lib/terminal.js";

type Message = { role: "user" | "assistant"; content: string };

const VISIBLE_MESSAGES = 8;
const LOW_CREDITS_THRESHOLD = 5;

interface HandlerProps {
  missionTitle: string;
  topicContext: string;
  onClose: () => void;
}

export function Handler({ missionTitle, topicContext, onClose }: HandlerProps) {
  const { columns } = useTerminalSize();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dots, setDots] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");
  const [usage, setUsage] = useState(getHandlerUsage);
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
      setLoadingMsg(getLoadingMessage());
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
        setUsage(getHandlerUsage());
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

  const hiddenCount = Math.max(0, history.length - VISIBLE_MESSAGES);
  const visibleHistory = history.slice(-VISIBLE_MESSAGES);
  const remaining = usage.cap - usage.used;
  const isLowCredits = remaining > 0 && remaining <= LOW_CREDITS_THRESHOLD;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLORS.cyan}
      paddingX={2}
      paddingY={1}
      width={Math.min(60, columns - 4)}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color={COLORS.cyan} bold>{"[ HANDLER "}</Text>
        <Text color={isLowCredits ? COLORS.red : COLORS.gray}>
          [{remaining}/{usage.cap} remaining]
        </Text>
        <Text color={COLORS.cyan} bold>{" ]"}</Text>
      </Box>
      {isLowCredits && (
        <Box justifyContent="center" marginBottom={1}>
          <Text color={COLORS.red}>low handler credits</Text>
        </Box>
      )}

      {hiddenCount > 0 && (
        <Box marginBottom={1}>
          <Text color={COLORS.gray} dimColor>
            ({hiddenCount} earlier {hiddenCount === 1 ? "message" : "messages"})
          </Text>
        </Box>
      )}

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
            {loadingMsg} {dots}
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
          {"> "}
        </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Ask your handler..."
        />
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Text color={COLORS.gray} dimColor>
          {isStreaming ? "[ESC] Cancel" : "[ESC] Close"}
        </Text>
      </Box>
    </Box>
  );
}
