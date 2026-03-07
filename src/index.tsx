#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import App from "./app.js";

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
  const { VERSION } = await import("./constants.js");
  console.log(VERSION);
  process.exit(0);
}

const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
const noAnimation = args.includes("--no-animation");
const reset = args.includes("--reset");

const { waitUntilExit } = render(
  <App hasApiKey={hasApiKey} noAnimation={noAnimation} reset={reset} />,
);
await waitUntilExit();
