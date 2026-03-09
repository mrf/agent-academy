# Claude Code Academy

**Terminal Training Division** — learn Claude Code patterns through interactive spy-themed missions.

You've been recruited by the Claude Code Terminal Training Division. Your handler is an AI instructor. Each lesson is a mission briefing followed by field assessments. Complete all missions to earn full clearance.

## Quick Start

```bash
npx claude-code-academy
```

No install required. Runs anywhere Node.js is available.

## What Is This?

An interactive terminal game that teaches Claude Code patterns and best practices. You run missions, answer field assessments, and get real-time AI feedback from your handler instead of reading documentation.

## Features

- **8 spy-themed missions** — from FIRST CONTACT to DEEP COVER, covering everything from setup to advanced workflows
- **AI-powered handler** — ask questions mid-mission and get real answers, not pre-baked tooltips
- **Dynamic field assessments** — AI-generated questions for infinite replay after the core curriculum
- **Free-text evaluation** — answer in your own words; the AI evaluates correctness, not string matching
- **Achievement system** — unlock spy-themed accomplishments as you progress
- **Progress tracking** — your clearance level and field experience persist between sessions
- **Classified terminal aesthetic** — WarGames-meets-Hacknet visual design

## Requirements

- **Node.js >= 20**
- **ANTHROPIC_API_KEY** (optional) — enables the AI handler, dynamic quiz generation, and free-text evaluation. Without it, the game falls back to the static curriculum.

### Setting Up Your API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npx claude-code-academy
```

Get your key from the [Anthropic Console](https://console.anthropic.com/).

## Tech Stack

- [Ink v6](https://github.com/vadimdemedes/ink) — React for the terminal
- TypeScript
- [Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk) — powers the AI handler and dynamic assessments

## License

MIT

## Links

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/build-with-claude/claude-code)
- [Anthropic](https://www.anthropic.com)
