import { type ReactNode, useEffect, useState } from "react";
import { Box, Text, useStdout } from "ink";
import { TIMING } from "../constants.js";

interface ScreenTransitionProps {
  screenKey: string;
  noAnimation?: boolean;
  children: ReactNode;
}

type Phase = "idle" | "wipe" | "draw";

export function ScreenTransition({
  screenKey,
  noAnimation = false,
  children,
}: ScreenTransitionProps) {
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const frameInterval = Math.max(Math.floor(TIMING.screenTransition / 2 / rows), 5);

  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleLines, setVisibleLines] = useState(rows);
  const [currentKey, setCurrentKey] = useState(screenKey);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Detect screen key change
  useEffect(() => {
    if (screenKey === currentKey) return;

    if (noAnimation) {
      setCurrentKey(screenKey);
      return;
    }

    setPendingKey(screenKey);
    setPhase("wipe");
    setVisibleLines(rows);
  }, [screenKey, currentKey, noAnimation, rows]);

  // Wipe phase: clear lines top-to-bottom
  useEffect(() => {
    if (phase !== "wipe") return;

    const timer = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setPhase("draw");
          if (pendingKey) setCurrentKey(pendingKey);
          setPendingKey(null);
          return 0;
        }
        return prev - 1;
      });
    }, frameInterval);

    return () => clearInterval(timer);
  }, [phase, rows, pendingKey, frameInterval]);

  // Draw phase: reveal lines top-to-bottom
  useEffect(() => {
    if (phase !== "draw") return;

    setVisibleLines(0);

    const timer = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= rows) {
          clearInterval(timer);
          setPhase("idle");
          return rows;
        }
        return prev + 1;
      });
    }, frameInterval);

    return () => clearInterval(timer);
  }, [phase, rows, frameInterval]);

  if (noAnimation || phase === "idle") {
    return <>{children}</>;
  }

  return (
    <Box flexDirection="column" height={rows}>
      {phase === "wipe" && (
        <>
          {Array.from({ length: rows - visibleLines }).map((_, i) => (
            <Text key={`blank-${i}`}> </Text>
          ))}
          <Box height={visibleLines} overflow="hidden">
            {children}
          </Box>
        </>
      )}
      {phase === "draw" && (
        <Box height={visibleLines} overflow="hidden">
          {children}
        </Box>
      )}
    </Box>
  );
}
