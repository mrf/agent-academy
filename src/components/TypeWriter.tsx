import { useEffect, useRef, useState } from "react";
import { Text, useInput } from "ink";
import { TIMING, COLORS } from "../constants.js";

const SPEED_MAP = {
  fast: TIMING.typewriterFast,
  normal: TIMING.typewriterNormal,
  dramatic: TIMING.typewriterDramatic,
} as const;

type Segment = { text: string; isCode: boolean };

/** Split text on backticks: odd-indexed parts are code spans. */
function parseSegments(text: string): Segment[] {
  return text
    .split("`")
    .map((part, i) => ({ text: part, isCode: i % 2 === 1 }))
    .filter((s) => s.text.length > 0);
}

function displayLength(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.text.length, 0);
}

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
  const segments = parseSegments(text);
  const fullLength = displayLength(segments);

  const [charIndex, setCharIndex] = useState(0);
  const completedRef = useRef(false);
  const animating = !noAnimation && charIndex < fullLength;

  // Skip to end on any keypress during animation
  useInput(() => setCharIndex(fullLength), { isActive: animating });

  // Reset completion tracking when text shrinks (new text entirely)
  useEffect(() => {
    if (fullLength < charIndex) {
      setCharIndex(0);
      completedRef.current = false;
    }
  }, [fullLength, charIndex]);

  // Handle noAnimation: render full text and fire onComplete
  useEffect(() => {
    if (!noAnimation) return;
    setCharIndex(fullLength);
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [noAnimation, fullLength, onComplete]);

  // Typewriter interval
  useEffect(() => {
    if (noAnimation) return;
    if (charIndex >= fullLength) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const interval = setInterval(() => {
      setCharIndex((prev) => {
        if (prev >= fullLength) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, SPEED_MAP[speed]);

    return () => clearInterval(interval);
  }, [fullLength, speed, noAnimation, charIndex, onComplete]);

  // Render segments up to charIndex, code spans in amber
  let remaining = charIndex;
  const rendered = segments.map((seg, i) => {
    if (remaining <= 0) return null;
    const visible = seg.text.slice(0, remaining);
    remaining -= seg.text.length;
    return (
      <Text key={i} color={seg.isCode ? COLORS.amber : color} bold={bold} dimColor={dimColor}>
        {visible}
      </Text>
    );
  });

  return (
    <Text color={color} bold={bold} dimColor={dimColor}>
      {rendered}
    </Text>
  );
}
