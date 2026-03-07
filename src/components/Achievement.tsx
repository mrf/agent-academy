import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { COLORS, TIMING } from "../constants.js";

interface AchievementProps {
  name: string;
  description?: string;
  /** Called when the notification finishes dismissing */
  onDismiss?: () => void;
  /** Whether animations are disabled (--no-animation) */
  noAnimation?: boolean;
}

type Phase = "enter" | "display" | "exit" | "done";

const SLIDE_FRAMES = 5;
const SLIDE_INTERVAL = 40;

export function Achievement({
  name,
  description,
  onDismiss,
  noAnimation = false,
}: AchievementProps) {
  const [phase, setPhase] = useState<Phase>(noAnimation ? "display" : "enter");
  const [slideOffset, setSlideOffset] = useState(noAnimation ? 0 : SLIDE_FRAMES);

  // Terminal bell on mount
  useEffect(() => {
    process.stdout.write("\x07");
  }, []);

  // Slide-in animation
  useEffect(() => {
    if (phase !== "enter") return;

    const timer = setInterval(() => {
      setSlideOffset((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setPhase("display");
          return 0;
        }
        return prev - 1;
      });
    }, SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [phase]);

  // Display timer (3 seconds)
  useEffect(() => {
    if (phase !== "display") return;

    const timer = setTimeout(() => {
      if (noAnimation) {
        setPhase("done");
      } else {
        setPhase("exit");
        setSlideOffset(0);
      }
    }, TIMING.achievementDisplay);

    return () => clearTimeout(timer);
  }, [phase, noAnimation]);

  // Slide-out animation
  useEffect(() => {
    if (phase !== "exit") return;

    const timer = setInterval(() => {
      setSlideOffset((prev) => {
        if (prev >= SLIDE_FRAMES) {
          clearInterval(timer);
          setPhase("done");
          return SLIDE_FRAMES;
        }
        return prev + 1;
      });
    }, SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [phase]);

  // Notify parent when done
  useEffect(() => {
    if (phase === "done") {
      onDismiss?.();
    }
  }, [phase, onDismiss]);

  if (phase === "done") return null;

  // When sliding, we reduce visible height to simulate sliding off-screen
  const boxHeight = description ? 5 : 4;
  const visibleHeight = Math.max(0, boxHeight - slideOffset);

  if (visibleHeight <= 0) return null;

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      height={visibleHeight}
      overflow="hidden"
    >
      <Box
        borderStyle="double"
        borderColor={COLORS.reward}
        paddingX={2}
        flexDirection="column"
        alignItems="center"
      >
        <Text color={COLORS.reward} bold>
          ACHIEVEMENT UNLOCKED
        </Text>
        <Text color={COLORS.primary} bold>
          {name}
        </Text>
        {description && <Text color={COLORS.dim}>{description}</Text>}
      </Box>
    </Box>
  );
}
