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
const wantsReset = args.includes("--reset");

if (wantsReset) {
  const { createInterface } = await import("node:readline");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(
      "\x1B[33mWARNING: This will permanently erase ALL progress, stars, FXP, and achievements.\x1B[0m\n" +
        "Type CONFIRM to proceed (or anything else to cancel): ",
      resolve,
    );
  });
  rl.close();
  if (answer !== "CONFIRM") {
    console.log("Reset cancelled. Your progress is safe.");
    process.exit(0);
  }
}

const reset = wantsReset;

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
