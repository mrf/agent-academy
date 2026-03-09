import { useState } from "react";
import { render } from "ink";
import App from "./app.js";
import { NoApiKey } from "./screens/NoApiKey.js";
import { VERSION } from "./constants.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Claude Code Academy — Terminal Training Division

Usage: claude-code-academy [options]

Options:
  --no-animation  Disable screen transitions and typewriter effects
  --reset         Reset all progress (with confirmation)
  -h, --help      Show this help message
  -v, --version   Show version number`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}

const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
const noAnimation = args.includes("--no-animation");
const reset = args.includes("--reset");

// Restore terminal state: show cursor, exit alt screen, reset attributes, clear title
function restoreTerminal(): boolean {
  return process.stderr.write("\x1B[?25h\x1B[?1049l\x1B[0m\x1B]0;\x1B\\");
}

function handleFatalError(label: string, error: unknown): void {
  restoreTerminal();
  console.error(`\n[SIGNAL LOST] ${label}:`);
  console.error(error);
  process.exit(1);
}

process.on("uncaughtException", (error) => {
  handleFatalError("Unexpected error", error);
});

process.on("unhandledRejection", (reason) => {
  handleFatalError("Unhandled promise rejection", reason);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    restoreTerminal();
    process.exit(0);
  });
}

function Root() {
  const [dismissed, setDismissed] = useState(hasApiKey);

  if (!dismissed) {
    return <NoApiKey onContinue={() => setDismissed(true)} />;
  }

  return <App hasApiKey={hasApiKey} noAnimation={noAnimation} reset={reset} />;
}

const { waitUntilExit } = render(<Root />);
await waitUntilExit();
restoreTerminal();
