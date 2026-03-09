import { render, cleanup } from "ink-testing-library";
import type { ReactElement } from "react";
import { vi } from "vitest";

export type RenderResult = ReturnType<typeof render>;

export function renderInk(tree: ReactElement): RenderResult {
  return render(tree);
}

export { cleanup };

// Key constants matching terminal escape sequences
export const keys = {
  enter: "\r",
  escape: "\u001B",
  arrowUp: "\u001B[A",
  arrowDown: "\u001B[B",
  arrowRight: "\u001B[C",
  arrowLeft: "\u001B[D",
  space: " ",
  backspace: "\u007F",
  delete: "\u001B[3~",
  tab: "\t",
} as const;

export function pressKey(instance: RenderResult, key: string): void {
  instance.stdin.write(key);
}

export function type(instance: RenderResult, text: string): void {
  for (const char of text) {
    instance.stdin.write(char);
  }
}

/** Advance fake timers by `ms`, then flush pending React state updates. */
export async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.advanceTimersByTimeAsync(0);
}
