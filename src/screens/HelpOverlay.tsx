import { Box, Text, useInput } from "ink";
import { COLORS } from "../constants.js";
import { useTerminalSize } from "../lib/terminal.js";
import type { Screen } from "../types.js";

interface HelpOverlayProps {
  screen: Screen;
  onClose: () => void;
}

type KeyBinding = { key: string; label: string };

const GLOBAL_BINDINGS: KeyBinding[] = [
  { key: "h", label: "Toggle help" },
  { key: "q", label: "Quit" },
];

const SCREEN_BINDINGS: Partial<Record<Screen, KeyBinding[]>> = {
  mission: [
    { key: "?", label: "Ask handler (requires API key)" },
    { key: "ESC", label: "Return to menu" },
    { key: "ENTER", label: "Continue" },
    { key: "UP/DOWN", label: "Navigate" },
  ],
  missionMap: [
    { key: "ENTER", label: "Start mission" },
    { key: "UP/DOWN", label: "Select mission" },
    { key: "q", label: "Quit" },
  ],
  infiniteMode: [
    { key: "R", label: "Report bad question" },
    { key: "ESC", label: "Back" },
    { key: "ENTER", label: "Confirm / Continue" },
    { key: "UP/DOWN", label: "Navigate" },
  ],
};

// Quiz and command bindings shown when inside a mission
const STEP_BINDINGS: Record<string, KeyBinding[]> = {
  quiz: [
    { key: "UP/DOWN", label: "Select answer" },
    { key: "ENTER", label: "Confirm answer" },
  ],
  command: [
    { key: "(type)", label: "Enter answer" },
    { key: "ENTER", label: "Submit" },
  ],
};

function KeyRow({ binding }: { binding: KeyBinding }) {
  return (
    <Box gap={1}>
      <Text color={COLORS.amber} bold>
        {`[${binding.key}]`.padEnd(12)}
      </Text>
      <Text color={COLORS.warmWhite}>{binding.label}</Text>
    </Box>
  );
}

function Section({ title, bindings }: { title: string; bindings: KeyBinding[] }) {
  return (
    <Box flexDirection="column">
      <Text color={COLORS.cyan} bold>
        {title}
      </Text>
      {bindings.map((b) => (
        <KeyRow key={b.key + b.label} binding={b} />
      ))}
    </Box>
  );
}

export function HelpOverlay({ screen, onClose }: HelpOverlayProps) {
  const { columns } = useTerminalSize();

  useInput((_input, key) => {
    if (key.escape || _input === "h") {
      onClose();
    }
  });

  const contextBindings = SCREEN_BINDINGS[screen] ?? [];

  // Show step-type hints when in a mission
  const stepSections =
    screen === "mission"
      ? Object.entries(STEP_BINDINGS).map(([type, bindings]) => (
          <Section key={type} title={`${type.toUpperCase()} STEPS`} bindings={bindings} />
        ))
      : [];

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLORS.cyan}
      paddingX={2}
      paddingY={1}
      alignSelf="center"
      width={Math.min(44, columns - 4)}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text color={COLORS.cyan} bold>
          [ KEYBINDINGS ]
        </Text>
      </Box>

      <Section title="GLOBAL" bindings={GLOBAL_BINDINGS} />

      {contextBindings.length > 0 && (
        <Box marginTop={1}>
          <Section title={screen.toUpperCase()} bindings={contextBindings} />
        </Box>
      )}

      {stepSections.map((section) => (
        <Box key={section.key} marginTop={1}>
          {section}
        </Box>
      ))}

      <Box justifyContent="center" marginTop={1}>
        <Text color={COLORS.gray} dimColor>[ESC/h] Close</Text>
      </Box>
    </Box>
  );
}
