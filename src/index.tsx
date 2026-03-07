#!/usr/bin/env node
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

// Restore terminal state on uncaught exceptions
process.on("uncaughtException", (error) => {
  process.stderr.write("\x1B[?25h\x1B[?1049l\x1B[0m");
  console.error("\n[SIGNAL LOST] Unexpected error:");
  console.error(error);
  process.exit(1);
});

const { waitUntilExit } = render(
  hasApiKey ? (
    <App hasApiKey={hasApiKey} noAnimation={noAnimation} reset={reset} />
  ) : (
    <NoApiKey />
  ),
);
await waitUntilExit();
