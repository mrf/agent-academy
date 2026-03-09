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
      <Box padding={1}>
        <Text color={COLORS.amber}>
          Terminal too narrow (need {MIN_WIDTH}+ cols, currently {columns})
        </Text>
      </Box>
    );
  }

  return <>{children}</>;
}
