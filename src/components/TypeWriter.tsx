import { useEffect, useRef, useState } from "react";
import { Text } from "ink";
import { TIMING } from "../constants.js";

const SPEED_MAP = {
  fast: TIMING.typewriterFast,
  normal: TIMING.typewriterNormal,
  dramatic: TIMING.typewriterDramatic,
} as const;

interface TypeWriterProps {
  text: string;
  speed?: "fast" | "normal" | "dramatic";
  onComplete?: () => void;
  noAnimation?: boolean;
  color?: string;
  bold?: boolean;
  dimColor?: boolean;
}

export function TypeWriter({
  text,
  speed = "normal",
  onComplete,
  noAnimation = false,
  color,
  bold,
  dimColor,
}: TypeWriterProps) {
  const [charIndex, setCharIndex] = useState(0);
  const completedRef = useRef(false);

  // Reset completion tracking when text shrinks (new text entirely)
  useEffect(() => {
    if (text.length < charIndex) {
      setCharIndex(0);
      completedRef.current = false;
    }
  }, [text, charIndex]);

  // Handle noAnimation: render full text and fire onComplete
  useEffect(() => {
    if (!noAnimation) return;
    setCharIndex(text.length);
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [noAnimation, text, onComplete]);

  // Typewriter interval
  useEffect(() => {
    if (noAnimation) return;
    if (charIndex >= text.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const interval = setInterval(() => {
      setCharIndex((prev) => {
        if (prev >= text.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, SPEED_MAP[speed]);

    return () => clearInterval(interval);
  }, [text, speed, noAnimation, charIndex, onComplete]);

  return (
    <Text color={color} bold={bold} dimColor={dimColor}>
      {text.slice(0, charIndex)}
    </Text>
  );
}
