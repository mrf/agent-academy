import type { Mission } from "../types.js";

export const MISSIONS: Mission[] = [
  // ─── MISSION 01 ─────────────────────────────────────────────────────
  {
    id: "mission-01",
    codename: "FIRST CONTACT",
    title: "What Is Claude Code?",
    objectives: [
      "Understand what Claude Code is and how it works",
      "Know how it differs from chat-based AI assistants",
      "Identify Claude Code's key capabilities",
    ],
    steps: [
      {
        type: "print",
        text: "Welcome to the Terminal Training Division, recruit. Your first mission: understand the tool that will define your career as a field operative.\n\nClaude Code is an agentic AI coding assistant built by Anthropic. Unlike browser-based chat interfaces, it lives in your terminal — right where the code is.",
        speed: "dramatic",
      },
      {
        type: "print",
        text: "What makes Claude Code 'agentic'? It doesn't just suggest code — it takes action. It reads your files, edits your codebase, runs shell commands, and searches through your project. All with your permission, all in your terminal.\n\nThink of it as an AI pair programmer with direct access to your development environment.",
      },
      {
        type: "quiz",
        question:
          "What makes Claude Code different from a browser-based AI chat?",
        options: [
          "It uses a different AI model",
          "It runs in your terminal and can directly modify your code",
          "It only works with Python",
          "It requires a GUI application",
        ],
        correct: 1,
        explanation:
          "Claude Code runs directly in your terminal with access to your filesystem, letting it read, edit, and create files rather than just suggesting code in a chat window.",
      },
      {
        type: "print",
        text: "Claude Code understands project context automatically. When you start a conversation, it can explore your directory structure, read relevant files, and understand how your codebase fits together.\n\nYou don't need to copy-paste code into a chat window. Tell Claude Code what you need and it figures out what to read.",
      },
      {
        type: "quiz",
        question: "Which of these can Claude Code do directly?",
        options: [
          "Deploy to production servers",
          "Read files and edit code in your project",
          "Replace your entire development team",
          "Write code only in JavaScript",
        ],
        correct: 1,
        explanation:
          "Claude Code can read, write, and edit files in your project, run commands, and search your codebase. It works with any programming language.",
      },
      {
        type: "command",
        question:
          "What single command do you type in your terminal to launch Claude Code?",
        expectedAnswer: "claude",
        acceptedVariants: [
          "claude",
          "the claude command",
          "run claude",
          "type claude",
        ],
        explanation:
          "Just type 'claude' in your terminal to start an interactive session. Simple as that.",
      },
      {
        type: "print",
        text: "Mission complete, recruit. You now know the fundamentals: Claude Code is an agentic AI assistant that lives in your terminal, reads your codebase, and takes action on your behalf.\n\nNext mission: we get it installed on your machine.",
      },
    ],
  },

  // ─── MISSION 02 ─────────────────────────────────────────────────────
  {
    id: "mission-02",
    codename: "DEAD DROP",
    title: "Installation & Setup",
    objectives: [
      "Know the prerequisites for running Claude Code",
      "Install Claude Code correctly",
      "Set up authentication",
    ],
    steps: [
      {
        type: "print",
        text: "Before you can operate in the field, you need your equipment. This mission covers the dead drop — picking up Claude Code and getting it operational.\n\nPay attention. A botched installation means a blown cover.",
        speed: "dramatic",
      },
      {
        type: "print",
        text: "Prerequisites are minimal. You need Node.js version 18 or higher and npm (which comes bundled with Node.js). Claude Code runs on macOS, Linux, and Windows via WSL2.\n\nIf you're unsure about your Node version, run: node --version",
      },
      {
        type: "quiz",
        question:
          "What is the minimum Node.js version required for Claude Code?",
        options: ["Node.js 14", "Node.js 16", "Node.js 18", "Node.js 20"],
        correct: 2,
        explanation:
          "Claude Code requires Node.js 18 or higher. Run 'node --version' to check your current version.",
      },
      {
        type: "print",
        text: "Installation is a single npm command. Once installed globally, you authenticate with 'claude login' which opens a secure browser-based flow.\n\nAlternatively, set the ANTHROPIC_API_KEY environment variable directly. Either method works — choose what fits your workflow.",
      },
      {
        type: "quiz",
        question: "How do you authenticate Claude Code after installation?",
        options: [
          "Edit a config file manually",
          "Run 'claude login' or set ANTHROPIC_API_KEY",
          "Create an account in the terminal",
          "Authentication is automatic",
        ],
        correct: 1,
        explanation:
          "'claude login' opens a browser-based authentication flow. You can also set the ANTHROPIC_API_KEY environment variable for headless environments.",
      },
      {
        type: "command",
        question: "What npm command installs Claude Code globally?",
        expectedAnswer: "npm install -g @anthropic-ai/claude-code",
        acceptedVariants: [
          "npm install -g @anthropic-ai/claude-code",
          "npm i -g @anthropic-ai/claude-code",
          "npm install --global @anthropic-ai/claude-code",
          "npm i --global @anthropic-ai/claude-code",
        ],
        explanation:
          "'npm install -g @anthropic-ai/claude-code' installs Claude Code globally, making the 'claude' command available everywhere.",
      },
      {
        type: "print",
        text: "Equipment secured, recruit. You've got the prerequisites, the install command, and two authentication methods in your toolkit.\n\nYour terminal is now a command center. Time to learn what it can do.",
      },
    ],
  },

  // ─── MISSION 03 ─────────────────────────────────────────────────────
  {
    id: "mission-03",
    codename: "BRASS COMPASS",
    title: "Tools of the Trade",
    objectives: [
      "Identify Claude Code's core built-in tools",
      "Understand how the Edit tool works with str_replace",
      "Know when to use each tool",
    ],
    steps: [
      {
        type: "print",
        text: "Every operative needs to know their tools. Claude Code comes equipped with a set of built-in tools — each designed for a specific operation.\n\nMaster these tools and you master the field.",
        speed: "dramatic",
      },
      {
        type: "print",
        text: "Claude Code's core toolset includes six primary tools:\n\n- Read — reads file contents with line numbers\n- Edit — modifies existing files using str_replace\n- Write — creates new files or completely rewrites existing ones\n- Bash — runs shell commands\n- Glob — finds files by name patterns\n- Grep — searches file contents by pattern",
        speed: "fast",
      },
      {
        type: "quiz",
        question: "Which tool does Claude Code use to read file contents?",
        options: [
          "Bash with cat command",
          "The Read tool",
          "The Write tool",
          "The Glob tool",
        ],
        correct: 1,
        explanation:
          "The Read tool is purpose-built for reading files. While 'cat' via Bash would work, Claude Code prefers dedicated tools over shell equivalents.",
      },
      {
        type: "print",
        text: "The Edit tool is Claude Code's precision instrument. It uses str_replace to swap specific text in a file. There's one critical rule: the old_str you're replacing must appear exactly once in the file.\n\nIf old_str matches zero times or more than once, the edit fails. This is a safety feature — it forces precision and prevents accidental changes to the wrong location.",
      },
      {
        type: "quiz",
        question: "Why must str_replace's old_str be unique in the file?",
        options: [
          "It's a performance optimization",
          "To prevent accidental changes to the wrong location",
          "Because the tool can only process one character at a time",
          "It's a limitation that will be fixed later",
        ],
        correct: 1,
        explanation:
          "The uniqueness requirement is a deliberate safety constraint. It ensures Claude Code modifies exactly the intended location and prevents ambiguous edits.",
      },
      {
        type: "command",
        question:
          "What tool does Claude Code use to modify existing files?",
        expectedAnswer: "Edit",
        acceptedVariants: [
          "Edit",
          "the Edit tool",
          "str_replace",
          "Edit tool",
          "edit",
        ],
        explanation:
          "The Edit tool (which uses str_replace under the hood) is Claude Code's primary tool for modifying existing file content.",
      },
      {
        type: "print",
        text: "Claude Code prefers dedicated tools over Bash equivalents. Use Read instead of cat, Glob instead of find, and Grep instead of grep.\n\nDedicated tools provide better output formatting, handle edge cases, and give Claude Code clearer signals about what happened. Save Bash for commands that have no dedicated equivalent.",
      },
      {
        type: "quiz",
        question:
          "When should you use the Bash tool instead of a dedicated tool?",
        options: [
          "Always — Bash is more powerful",
          "When there's no dedicated tool for the operation",
          "Only for running tests",
          "Never — Bash is deprecated",
        ],
        correct: 1,
        explanation:
          "Use Bash when no dedicated tool covers the operation — like running tests, installing packages, or executing project-specific scripts. For file operations, prefer the dedicated tools.",
      },
      {
        type: "print",
        text: "Debrief: you've mapped Claude Code's full toolkit. Six tools, each with a purpose. The Edit tool's uniqueness constraint isn't a limitation — it's your safety net.\n\nRight tool, right job. That principle will serve you well in the field.",
      },
    ],
  },

  // ─── MISSION 04 ─────────────────────────────────────────────────────
  {
    id: "mission-04",
    codename: "PHANTOM PROTOCOL",
    title: "The CLAUDE.md File",
    objectives: [
      "Understand CLAUDE.md's purpose and function",
      "Know where CLAUDE.md files can be placed",
      "Write effective project instructions",
    ],
    steps: [
      {
        type: "print",
        text: "Every operation needs standing orders — rules that persist across sessions, instructions that never expire. In Claude Code, those orders live in a file called CLAUDE.md.\n\nThis is the phantom protocol. Invisible to the end user, always guiding the agent.",
        speed: "dramatic",
      },
      {
        type: "print",
        text: "CLAUDE.md is a Markdown file that provides persistent instructions to Claude Code. It's automatically loaded at the start of every conversation — no manual setup required.\n\nThink of it as your project's standing orders. Coding standards, architecture decisions, workflow rules — anything Claude Code should always know.",
      },
      {
        type: "quiz",
        question: "When is CLAUDE.md loaded by Claude Code?",
        options: [
          "Only when you reference it explicitly",
          "Automatically at the start of every conversation",
          "When you run a special command to load it",
          "Only during the first session in a project",
        ],
        correct: 1,
        explanation:
          "CLAUDE.md is loaded automatically at the start of every conversation. Its contents are always available to Claude Code without any manual action.",
      },
      {
        type: "print",
        text: "CLAUDE.md files can exist at multiple levels. A project-level file sits at your repository root. A user-level file at ~/.claude/CLAUDE.md applies across all your projects.\n\nAll discovered CLAUDE.md files are loaded together — they're additive. Set personal defaults at the user level and project-specific rules at the project level.",
        speed: "fast",
      },
      {
        type: "quiz",
        question: "Where does the user-level CLAUDE.md file live?",
        options: [
          "In each project's root directory",
          "At ~/.claude/CLAUDE.md",
          "In /etc/claude/config.md",
          "It's set via an environment variable",
        ],
        correct: 1,
        explanation:
          "The user-level CLAUDE.md lives at ~/.claude/CLAUDE.md. Its instructions apply across all your Claude Code sessions in every project.",
      },
      {
        type: "command",
        question:
          "Where do you place a CLAUDE.md for project-wide instructions?",
        expectedAnswer: "project root",
        acceptedVariants: [
          "project root",
          "the project root",
          "root of the project",
          "repository root",
          "repo root",
          "./CLAUDE.md",
          "in the project root",
          "at the project root",
        ],
        explanation:
          "Place CLAUDE.md at your project's root directory. Claude Code automatically discovers and loads it from there.",
      },
      {
        type: "print",
        text: "What goes in a good CLAUDE.md? Keep it actionable and concise:\n\n- Tech stack and language versions\n- Coding conventions (naming, formatting, patterns)\n- Testing requirements and commands\n- Architecture decisions and constraints\n- Workflow rules (commit style, branch naming)\n\nAvoid lengthy prose. Claude Code works best with clear, direct instructions.",
        speed: "fast",
      },
      {
        type: "quiz",
        question: "What should you NOT put in CLAUDE.md?",
        options: [
          "Coding standards and conventions",
          "Tech stack information",
          "Your API keys and secrets",
          "Testing commands and patterns",
        ],
        correct: 2,
        explanation:
          "Never put secrets, API keys, or credentials in CLAUDE.md. It's a checked-in file visible to anyone with repo access. Use environment variables for sensitive data.",
      },
      {
        type: "print",
        text: "Protocol established, operative. CLAUDE.md is your most powerful configuration tool — persistent instructions that survive across every session.\n\nKeep it concise, keep it current, and never put secrets in it. Standing orders received.",
      },
    ],
  },

  // ─── MISSION 05 ─────────────────────────────────────────────────────
  {
    id: "mission-05",
    codename: "SIGNAL CHAIN",
    title: "Conversation Flow",
    objectives: [
      "Understand how conversations with Claude Code work",
      "Use slash commands effectively",
      "Write effective prompts",
    ],
    steps: [
      {
        type: "print",
        text: "Communication is everything in the field. This mission covers how you talk to Claude Code — and how it talks back.\n\nMaster the signal chain and you control the operation.",
        speed: "dramatic",
      },
      {
        type: "print",
        text: "A Claude Code conversation is multi-turn. You type a prompt, Claude reads files, runs commands, and responds. Each exchange builds on the previous context.\n\nClaude Code doesn't just answer questions — it takes action. A single prompt might trigger multiple tool calls: reading files, searching code, editing files, and running tests.",
      },
      {
        type: "quiz",
        question:
          "What might happen when you send a single prompt to Claude Code?",
        options: [
          "It always responds with text only",
          "It may trigger multiple tool calls like reading, editing, and testing",
          "It only processes one file at a time",
          "It requires separate commands for each action",
        ],
        correct: 1,
        explanation:
          "Claude Code is agentic — a single prompt can trigger a chain of tool calls. It might read files for context, make edits, then run tests to verify, all from one prompt.",
      },
      {
        type: "print",
        text: "Slash commands give you direct control over the session:\n\n- /help — show available commands\n- /cost — display token usage and estimated cost\n- /compact — manually compress conversation history\n- /clear — reset conversation, start fresh\n- /config — view or modify settings\n- /doctor — diagnose common issues",
        speed: "fast",
      },
      {
        type: "quiz",
        question: "What does the /compact command do?",
        options: [
          "Compresses and minifies your source code",
          "Manually compresses conversation history to free context",
          "Compacts the project's database",
          "Creates a compact summary of your project files",
        ],
        correct: 1,
        explanation:
          "/compact triggers manual compression of your conversation history. It summarizes earlier messages to free up context space while preserving key information.",
      },
      {
        type: "command",
        question:
          "What slash command shows your current token usage and cost?",
        expectedAnswer: "/cost",
        acceptedVariants: [
          "/cost",
          "cost",
          "slash cost",
          "the /cost command",
        ],
        explanation:
          "/cost displays your current session's token usage and estimated API cost.",
      },
      {
        type: "print",
        text: "Effective prompting makes the difference between a good session and a great one. Be specific about what you want. Reference file paths directly. Describe the desired outcome, not just the problem.\n\nBad: 'fix the bug'\nGood: 'The login function in src/auth.ts throws on empty passwords. Add validation before the API call.'",
      },
      {
        type: "command",
        question:
          "What slash command clears your conversation history and starts fresh?",
        expectedAnswer: "/clear",
        acceptedVariants: [
          "/clear",
          "clear",
          "slash clear",
          "the /clear command",
        ],
        explanation:
          "/clear resets your conversation history, giving you a fresh context window. Useful when switching between unrelated tasks.",
      },
      {
        type: "print",
        text: "Signal chain established. You know how conversations flow, which slash commands control your session, and how to write prompts that get results.\n\nNext up: the most critical resource management skill — your context window.",
      },
    ],
  },

  // ─── MISSION 06 ─────────────────────────────────────────────────────
  {
    id: "mission-06",
    codename: "GLASS HIGHWAY",
    title: "Context Window Management",
    objectives: [
      "Understand what the context window is and how it works",
      "Know what fills up context and how to monitor it",
      "Manage context effectively with /compact",
      "Leverage CLAUDE.md for persistent context",
    ],
    steps: [
      {
        type: "print",
        text: "Every intelligence channel has bandwidth limits. In Claude Code, that limit is the context window — the total amount of information Claude can hold in working memory.\n\nFill it carelessly and you lose critical intel. Manage it wisely and you operate without limits.",
        speed: "dramatic",
      },
      {
        type: "print",
        text: "The context window is measured in tokens — roughly 4 characters per token. It includes everything: your messages, Claude's responses, file contents from Read operations, command outputs, and system instructions.\n\nWhen the context window fills up, older information gets compressed or dropped.",
      },
      {
        type: "quiz",
        question: "What is a 'token' in context window terms?",
        options: [
          "A security credential for API access",
          "Roughly 4 characters of text",
          "A type of API key",
          "A billing unit unrelated to text length",
        ],
        correct: 1,
        explanation:
          "Tokens are the unit of measurement for context windows. One token is roughly 4 characters of English text. Everything in your conversation consumes tokens.",
      },
      {
        type: "print",
        text: "What fills your context fastest? Large file reads are the biggest consumer. Reading a 1000-line file dumps all those lines into context. Long command outputs from Bash are another common culprit.\n\nClaude Code tries to read only what's needed — but awareness of context consumption is your responsibility too.",
      },
      {
        type: "quiz",
        question:
          "Which operation typically consumes the most context tokens?",
        options: [
          "Sending a short prompt",
          "Running a quick Bash command",
          "Reading a large file with the Read tool",
          "Using a slash command",
        ],
        correct: 2,
        explanation:
          "Reading large files dumps their entire contents into the context window. A single Read of a large file can consume thousands of tokens.",
      },
      {
        type: "command",
        question:
          "What slash command manually triggers context compaction?",
        expectedAnswer: "/compact",
        acceptedVariants: [
          "/compact",
          "compact",
          "slash compact",
          "the /compact command",
        ],
        explanation:
          "/compact manually triggers summarization of your conversation history, freeing context space while preserving essential information.",
      },
      {
        type: "print",
        text: "Context compaction isn't just manual. Claude Code automatically compacts when the conversation approaches the context limit. But proactive management is always better than reactive recovery.",
      },
      {
        type: "print",
        text: "Strategies for lean context management:\n\n- Read specific line ranges instead of entire files when possible\n- Use Grep to find relevant code instead of reading everything\n- Keep prompts focused — one task per conversation works best\n- Use /compact before switching tasks in the same session\n- Start fresh with /clear when changing projects entirely",
        speed: "fast",
      },
      {
        type: "quiz",
        question:
          "What is the best approach when working on unrelated tasks?",
        options: [
          "Keep everything in one long conversation",
          "Use /clear or start a new session between tasks",
          "Ignore context limits — Claude handles it automatically",
          "Only work on one task per day",
        ],
        correct: 1,
        explanation:
          "Starting fresh with /clear between unrelated tasks prevents context pollution. Each task gets a clean context window focused on the relevant code.",
      },
      {
        type: "command",
        question:
          "What file persists its instructions across context compaction?",
        expectedAnswer: "CLAUDE.md",
        acceptedVariants: [
          "CLAUDE.md",
          "claude.md",
          "the CLAUDE.md file",
          "CLAUDE.md file",
        ],
        explanation:
          "CLAUDE.md content persists through compaction — it's re-loaded every time. This makes it the ideal place for instructions that must always be available.",
      },
      {
        type: "print",
        text: "Debrief: you now see the glass highway — transparent, carrying all your data, but with finite capacity. Read surgically, compact proactively, and let CLAUDE.md carry your standing orders.\n\nContext management separates rookies from operatives.",
      },
    ],
  },

  // ─── MISSION 07 ─────────────────────────────────────────────────────
  {
    id: "mission-07",
    codename: "IRON CURTAIN",
    title: "Permissions & Safety",
    objectives: [
      "Understand Claude Code's permission system",
      "Know the different permission modes",
      "Configure tool permissions in settings",
      "Understand when to use dangerous overrides",
    ],
    steps: [
      {
        type: "print",
        text: "Security is non-negotiable. Claude Code can read your files, run commands, and modify your codebase. That power requires safeguards.\n\nThis mission covers the iron curtain — the permission system that keeps you in control.",
        speed: "dramatic",
      },
      {
        type: "print",
        text: "By default, Claude Code operates on an ask-first basis. Before running a tool — reading a file, executing a command, editing code — it requests your approval.\n\nYou can approve or deny each action individually. This is the safest mode and the default for good reason.",
      },
      {
        type: "quiz",
        question: "What is Claude Code's default permission behavior?",
        options: [
          "It runs all tools automatically",
          "It asks for approval before each tool use",
          "It only allows read operations",
          "It requires admin privileges to run",
        ],
        correct: 1,
        explanation:
          "By default, Claude Code asks for your approval before each tool use. This gives you full visibility and control over what actions it takes.",
      },
      {
        type: "print",
        text: "For experienced operatives, Claude Code offers ways to streamline permissions. You can configure allowedTools in your settings — specific tools that run without prompting.\n\nThere's also a nuclear option: --dangerously-skip-permissions. This flag disables ALL permission checks. It exists for CI pipelines and automated scripts — never for interactive use.",
      },
      {
        type: "quiz",
        question:
          "When is --dangerously-skip-permissions appropriate to use?",
        options: [
          "During normal development work",
          "When you're in a hurry",
          "Only in CI pipelines and automated scripts",
          "Whenever you trust your codebase",
        ],
        correct: 2,
        explanation:
          "--dangerously-skip-permissions is designed exclusively for CI/CD and scripted environments where human approval isn't possible. Using it interactively removes your safety net.",
      },
      {
        type: "command",
        question:
          "What CLI flag disables all permission checks for Claude Code?",
        expectedAnswer: "--dangerously-skip-permissions",
        acceptedVariants: [
          "--dangerously-skip-permissions",
          "dangerously-skip-permissions",
          "the --dangerously-skip-permissions flag",
          "dangerously skip permissions",
        ],
        explanation:
          "The flag is intentionally named to be alarming — it's a reminder that you're removing a critical safety layer.",
      },
      {
        type: "print",
        text: "Permission settings live in two locations. User-level settings at ~/.claude/settings.json apply everywhere. Project-level settings at .claude/settings.json apply to that repository only.",
      },
      {
        type: "print",
        text: "The settings file supports two key arrays:\n\n- allowedTools — tools that run without asking (e.g., Read, Glob, Grep)\n- deniedTools — tools that are blocked entirely\n\nBash commands can be granular. You might allow 'Bash(npm test)' so Claude can run tests freely, while keeping other Bash commands gated behind approval.",
        speed: "fast",
      },
      {
        type: "quiz",
        question:
          "What settings key lets you auto-approve specific tools?",
        options: [
          "autoApprove",
          "allowedTools",
          "permissions",
          "trustedTools",
        ],
        correct: 1,
        explanation:
          "The allowedTools array in settings.json lists tools that Claude Code can run without prompting. You can be granular — even allowing particular Bash commands by pattern.",
      },
      {
        type: "command",
        question:
          "What settings key blocks specific tools from being used entirely?",
        expectedAnswer: "deniedTools",
        acceptedVariants: [
          "deniedTools",
          "denied tools",
          "deniedTools array",
          "the deniedTools key",
        ],
        explanation:
          "The deniedTools array in settings.json blocks specific tools completely, providing a hard security boundary.",
      },
      {
        type: "print",
        text: "The iron curtain stands, operative. You control what Claude Code can and cannot do. Default to safety — ask-first permissions. Allowlist only what you trust. Reserve the nuclear option for machines, not humans.\n\nSecurity isn't a feature. It's a discipline.",
      },
    ],
  },

  // ─── MISSION 08 ─────────────────────────────────────────────────────
  {
    id: "mission-08",
    codename: "DEEP COVER",
    title: "Advanced Workflows",
    objectives: [
      "Use Claude Code in non-interactive headless mode",
      "Understand piping and scripting patterns",
      "Configure hooks for automated workflows",
      "Master subagents and multi-session orchestration",
    ],
    steps: [
      {
        type: "print",
        text: "You've completed basic training. Now we go deep cover — advanced workflows that separate field operatives from headquarters analysts.\n\nHeadless mode, piping, hooks, subagents, and multi-session orchestration. This is the final exam.",
        speed: "dramatic",
      },
      {
        type: "print",
        text: "Headless mode lets you run Claude Code non-interactively. Instead of starting a conversation, you pass a prompt directly and get a result back.\n\nThis is the foundation for scripting, automation, and CI/CD integration.",
      },
      {
        type: "quiz",
        question: "What is headless mode in Claude Code?",
        options: [
          "A mode that hides the terminal window",
          "Non-interactive mode where you pass a prompt and get a result",
          "A mode that disables all AI features",
          "A mode that only works on remote servers",
        ],
        correct: 1,
        explanation:
          "Headless mode runs Claude Code non-interactively with a one-shot prompt. It's designed for scripting, automation, and CI/CD pipelines.",
      },
      {
        type: "print",
        text: "Piping works naturally with Claude Code. Pipe content in:\n\necho 'explain this function' | claude\ncat complex.ts | claude -p 'review this code'\n\nOr pipe output out:\n\nclaude -p 'generate a tsconfig' > tsconfig.json\n\nClaude Code plays well with Unix philosophy — small tools, composed together.",
        speed: "fast",
      },
      {
        type: "quiz",
        question: "What happens when you pipe text into Claude Code?",
        options: [
          "It saves the piped text to a file",
          "The piped text becomes input prompt or context",
          "It ignores piped input entirely",
          "It enters interactive mode with the text pre-loaded",
        ],
        correct: 1,
        explanation:
          "Piped text becomes input to Claude Code. Combined with -p for a prompt, you can feed file contents or command output as context for Claude to work with.",
      },
      {
        type: "command",
        question:
          "What flag enables headless (non-interactive) mode with a direct prompt?",
        expectedAnswer: "-p",
        acceptedVariants: [
          "-p",
          "--print",
          "the -p flag",
          "-p flag",
          "claude -p",
          "--print flag",
        ],
        explanation:
          "The -p (or --print) flag runs Claude Code in headless mode. Usage: claude -p 'your prompt here'",
      },
      {
        type: "print",
        text: "Power move: combine headless mode with output formatting. The --output-format flag controls how results come back. Use 'json' for structured output that other tools and scripts can parse reliably.",
      },
      {
        type: "print",
        text: "The Agent tool spawns subagents — independent Claude instances that handle subtasks in parallel. Need to search a large codebase, analyze multiple files, or explore complex architecture? Subagents divide and conquer.\n\nThey get their own context windows, keeping the main conversation clean and focused.",
      },
      {
        type: "quiz",
        question: "What is the primary benefit of using subagents?",
        options: [
          "They're cheaper than the main agent",
          "They handle subtasks in parallel without cluttering the main context",
          "They can access external APIs that the main agent cannot",
          "They always run faster than the main agent",
        ],
        correct: 1,
        explanation:
          "Subagents handle subtasks independently with their own context windows. This keeps the main conversation focused while parallelizing complex work.",
      },
      {
        type: "print",
        text: "Hooks are shell commands that execute in response to Claude Code events. You can configure hooks that run before or after specific tool calls — like running a linter after every Edit, or logging Bash commands for audit trails.\n\nHooks are configured in your settings file under the 'hooks' key.",
      },
      {
        type: "command",
        question:
          "What settings key configures automated commands that run on Claude Code events?",
        expectedAnswer: "hooks",
        acceptedVariants: [
          "hooks",
          "the hooks key",
          "hooks setting",
          "hooks configuration",
        ],
        explanation:
          "The 'hooks' key in settings.json configures shell commands that run automatically in response to Claude Code events like tool calls.",
      },
      {
        type: "quiz",
        question:
          "When would you combine --max-turns with headless mode?",
        options: [
          "To make Claude respond faster",
          "To limit how many agentic actions Claude takes before stopping",
          "To set a maximum session duration",
          "To enable parallel processing",
        ],
        correct: 1,
        explanation:
          "--max-turns limits the number of agentic turns in headless mode. This prevents runaway automation and keeps scripted Claude Code usage predictable and bounded.",
      },
      {
        type: "command",
        question:
          "What flag controls the output format in headless mode?",
        expectedAnswer: "--output-format",
        acceptedVariants: [
          "--output-format",
          "output-format",
          "--output-format json",
          "the --output-format flag",
          "output format flag",
        ],
        explanation:
          "--output-format controls how Claude Code returns results. Use '--output-format json' for machine-readable structured output in scripts and CI pipelines.",
      },
      {
        type: "print",
        text: "Congratulations, operative. You've completed deep cover training. From first contact to advanced workflows, you now command the full arsenal of Claude Code.\n\nHeadless mode for automation. Subagents for parallel ops. Hooks for custom workflows. Permissions for security. CLAUDE.md for persistence.\n\nYou have full clearance. Use it wisely.",
        speed: "dramatic",
      },
    ],
  },
];
