import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createKonamiTracker,
  getLoadingMessage,
  setTerminalTitle,
} from "../../src/lib/easter-eggs.js";

// -- createKonamiTracker ------------------------------------------------------

const ARROW_KEY_MAP = {
  up: "upArrow",
  down: "downArrow",
  left: "leftArrow",
  right: "rightArrow",
} as const;

function arrow(dir: "up" | "down" | "left" | "right") {
  return { input: "", key: { [ARROW_KEY_MAP[dir]]: true } };
}

function letter(ch: string) {
  return { input: ch, key: {} };
}

const FULL_KONAMI = [
  arrow("up"), arrow("up"), arrow("down"), arrow("down"),
  arrow("left"), arrow("right"), arrow("left"), arrow("right"),
  letter("b"), letter("a"),
];

function feedSequence(
  tracker: ReturnType<typeof createKonamiTracker>,
  steps: { input: string; key: Record<string, boolean> }[],
): boolean[] {
  return steps.map(({ input, key }) => tracker(input, key));
}

describe("createKonamiTracker", () => {
  it("detects the full konami sequence", () => {
    const tracker = createKonamiTracker();

    const results = feedSequence(tracker, FULL_KONAMI);

    expect(results.slice(0, -1)).toEqual(Array(9).fill(false));
    expect(results.at(-1)).toBe(true);
  });

  it("resets on wrong key", () => {
    const tracker = createKonamiTracker();

    tracker("", { upArrow: true });
    tracker("", { upArrow: true });
    tracker("", { downArrow: true });
    tracker("x", {});

    const results = feedSequence(tracker, FULL_KONAMI);

    expect(results.at(-1)).toBe(true);
  });

  it("partial sequence does not trigger", () => {
    const tracker = createKonamiTracker();
    const partial = FULL_KONAMI.slice(0, 6);

    const results = feedSequence(tracker, partial);

    expect(results).toEqual(Array(6).fill(false));
  });
});

// -- getLoadingMessage --------------------------------------------------------

describe("getLoadingMessage", () => {
  it("returns a string", () => {
    const msg = getLoadingMessage();

    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("never returns the same message twice in a row", () => {
    let previous = getLoadingMessage();
    for (let i = 0; i < 100; i++) {
      const current = getLoadingMessage();
      expect(current).not.toBe(previous);
      previous = current;
    }
  });

  it("cycles through all messages", () => {
    const seen = new Set<string>();
    // 15 messages × 10 attempts each should be more than enough
    for (let i = 0; i < 150; i++) {
      seen.add(getLoadingMessage());
    }

    // The source has 15 loading messages
    expect(seen.size).toBe(15);
  });
});

// -- setTerminalTitle ---------------------------------------------------------

describe("setTerminalTitle", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  it("writes correct escape sequence to stdout", () => {
    setTerminalTitle("Test Title");

    expect(writeSpy).toHaveBeenCalledOnce();
    expect(writeSpy).toHaveBeenCalledWith("\x1b]0;Test Title\x07");
  });

  it("embeds recruiting context in the escape sequence", () => {
    setTerminalTitle("Agent Academy — RECRUITING");

    expect(writeSpy).toHaveBeenCalledWith(
      "\x1b]0;Agent Academy — RECRUITING\x07",
    );
  });

  it("embeds full clearance context in the escape sequence", () => {
    setTerminalTitle("CCA — FULL CLEARANCE");

    expect(writeSpy).toHaveBeenCalledWith(
      "\x1b]0;CCA — FULL CLEARANCE\x07",
    );
  });
});
