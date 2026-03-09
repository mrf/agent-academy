import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { renderInk, cleanup } from "../helpers/render-ink.js";
import { Text } from "ink";
import {
  useTerminalSize,
  TerminalGuard,
  MIN_WIDTH,
} from "../../src/lib/terminal.js";

// ── Mock stdout with controllable columns/rows ────────────────────────
let fakeStdout: EventEmitter & { columns: number; rows: number };

vi.mock("ink", async () => {
  const actual = await vi.importActual<typeof import("ink")>("ink");
  return {
    ...actual,
    useStdout: () => ({
      stdout: fakeStdout,
      write: vi.fn(),
    }),
  };
});

beforeEach(() => {
  fakeStdout = Object.assign(new EventEmitter(), { columns: 80, rows: 24 });
});

afterEach(cleanup);

// ── useTerminalSize ───────────────────────────────────────────────────

function SizeProbe(): React.ReactNode {
  const { columns, rows } = useTerminalSize();
  return <Text>{`${columns}x${rows}`}</Text>;
}

describe("useTerminalSize", () => {
  it("returns current columns and rows", () => {
    fakeStdout.columns = 120;
    fakeStdout.rows = 40;
    const inst = renderInk(<SizeProbe />);
    expect(inst.lastFrame()).toContain("120x40");
  });

  it("defaults to 80x24 when stdout has no size", () => {
    (fakeStdout as Record<string, unknown>).columns = undefined;
    (fakeStdout as Record<string, unknown>).rows = undefined;
    const inst = renderInk(<SizeProbe />);
    expect(inst.lastFrame()).toContain("80x24");
  });
});

// ── MIN_WIDTH constant ────────────────────────────────────────────────

describe("MIN_WIDTH", () => {
  it("is 60", () => {
    expect(MIN_WIDTH).toBe(60);
  });
});

// ── TerminalGuard ─────────────────────────────────────────────────────

describe("TerminalGuard", () => {
  it("renders children when columns >= MIN_WIDTH", () => {
    fakeStdout.columns = MIN_WIDTH;
    const inst = renderInk(
      <TerminalGuard>
        <Text>child content</Text>
      </TerminalGuard>,
    );
    expect(inst.lastFrame()).toContain("child content");
  });

  it("renders children when terminal is wider than MIN_WIDTH", () => {
    fakeStdout.columns = 120;
    const inst = renderInk(
      <TerminalGuard>
        <Text>wide terminal</Text>
      </TerminalGuard>,
    );
    expect(inst.lastFrame()).toContain("wide terminal");
  });

  it("shows warning when terminal is too narrow", () => {
    fakeStdout.columns = 40;
    const inst = renderInk(
      <TerminalGuard>
        <Text>hidden content</Text>
      </TerminalGuard>,
    );
    const frame = inst.lastFrame()!;
    expect(frame).toContain("Terminal too narrow");
    expect(frame).toContain(`${MIN_WIDTH}`);
    expect(frame).toContain("40");
    expect(frame).not.toContain("hidden content");
  });

  it("shows warning at exactly MIN_WIDTH - 1", () => {
    fakeStdout.columns = MIN_WIDTH - 1;
    const inst = renderInk(
      <TerminalGuard>
        <Text>hidden</Text>
      </TerminalGuard>,
    );
    expect(inst.lastFrame()).toContain("Terminal too narrow");
    expect(inst.lastFrame()).not.toContain("hidden");
  });
});
