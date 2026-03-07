// Konami Code tracker: Up Up Down Down Left Right Left Right B A

const KONAMI_SEQUENCE = [
  "up", "up", "down", "down", "left", "right", "left", "right", "b", "a",
] as const;

type KonamiKey = (typeof KONAMI_SEQUENCE)[number];
type InkKey = {
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
};

function mapToKonamiKey(input: string, key: InkKey): KonamiKey | null {
  if (key.upArrow) return "up";
  if (key.downArrow) return "down";
  if (key.leftArrow) return "left";
  if (key.rightArrow) return "right";
  if (input === "b") return "b";
  if (input === "a") return "a";
  return null;
}

export function createKonamiTracker(): (
  input: string,
  key: InkKey,
) => boolean {
  let position = 0;

  return (input, key) => {
    const current = mapToKonamiKey(input, key);
    if (!current) {
      position = 0;
      return false;
    }

    if (current === KONAMI_SEQUENCE[position]) {
      position++;
      if (position >= KONAMI_SEQUENCE.length) {
        position = 0;
        return true;
      }
    } else {
      position = current === KONAMI_SEQUENCE[0] ? 1 : 0;
    }

    return false;
  };
}

// Spy-themed loading messages for AI calls

const LOADING_MESSAGES = [
  "Decrypting intelligence briefing",
  "Contacting handler via secure channel",
  "Routing through proxy servers",
  "Authenticating field credentials",
  "Sweeping for surveillance",
  "Accessing classified database",
  "Establishing encrypted uplink",
  "Analyzing intercepted transmissions",
  "Cross-referencing agent dossiers",
  "Running counter-intelligence sweep",
  "Consulting with station chief",
  "Verifying dead drop contents",
  "Processing coded message",
  "Scanning for hostile operatives",
  "Initializing secure terminal",
];

let lastMessageIndex = -1;

export function getLoadingMessage(): string {
  let index: number;
  do {
    index = Math.floor(Math.random() * LOADING_MESSAGES.length);
  } while (index === lastMessageIndex);
  lastMessageIndex = index;
  return LOADING_MESSAGES[index];
}

// Terminal title helper

export function setTerminalTitle(title: string): void {
  process.stdout.write(`\x1b]0;${title}\x07`);
}
