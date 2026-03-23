import { type ReactNode, useState, useEffect } from "react";
import { useStdout, Box, Text } from "ink";
import { COLORS } from "../constants.js";

export const MIN_WIDTH = 60;
export const OPTIMAL_WIDTH = 80;

const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;

type TerminalSize = {
  columns: number;
  rows: number;
};

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();

  const [size, setSize] = useState<TerminalSize>({
    columns: stdout.columns ?? DEFAULT_COLUMNS,
    rows: stdout.rows ?? DEFAULT_ROWS,
  });

  useEffect(() => {
    function onResize(): void {
      setSize({
        columns: stdout.columns ?? DEFAULT_COLUMNS,
        rows: stdout.rows ?? DEFAULT_ROWS,
      });
    }

    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}

type TerminalGuardProps = {
  children: ReactNode;
};

export function TerminalGuard({ children }: TerminalGuardProps): ReactNode {
  const { columns } = useTerminalSize();

  if (columns < MIN_WIDTH) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        borderStyle="double"
        borderColor={COLORS.amber}
        padding={1}
        marginTop={1}
      >
        <Text color={COLORS.amber} bold>
          [ SIGNAL DEGRADED ]
        </Text>
        <Text color={COLORS.amber}>
          Terminal width insufficient for secure communications.
        </Text>
        <Text color={COLORS.amber}>
          Expand to {MIN_WIDTH}+ columns to proceed. (Currently {columns})
        </Text>
      </Box>
    );
  }

  return <>{children}</>;
}
