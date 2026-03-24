import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { HelpOverlay } from "../../src/screens/HelpOverlay.js";
import {
  renderInk,
  cleanup,
  keys,
  pressKey,
  type RenderResult,
} from "../helpers/render-ink.js";
import type { Screen } from "../../src/types.js";

afterEach(() => {
  cleanup();
});

/** Flush the setImmediate ink uses to resolve a pending lone ESC byte. */
function flushImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function renderHelp(
  screen: Screen = "missionMap",
  onClose = vi.fn(),
): { instance: RenderResult; onClose: ReturnType<typeof vi.fn> } {
  const instance = renderInk(<HelpOverlay screen={screen} onClose={onClose} />);
  return { instance, onClose };
}

// ── Rendering ─────────────────────────────────────────────────────────

describe("HelpOverlay", () => {
  it("renders KEYBINDINGS title", () => {
    const { instance } = renderHelp();
    expect(instance.lastFrame()).toContain("KEYBINDINGS");
  });

  it("renders in a styled box with border", () => {
    const { instance } = renderHelp();
    const frame = instance.lastFrame();
    // ink-testing-library renders single border style as box-drawing characters
    expect(frame).toContain("─");
    expect(frame).toContain("│");
  });

  it("renders close hint text", () => {
    const { instance } = renderHelp();
    expect(instance.lastFrame()).toContain("[ESC/h] Close");
  });

  // ── Global bindings ─────────────────────────────────────────────────

  it("always shows GLOBAL section", () => {
    const { instance } = renderHelp();
    expect(instance.lastFrame()).toContain("GLOBAL");
  });

  it("shows toggle help binding", () => {
    const { instance } = renderHelp();
    expect(instance.lastFrame()).toContain("[h]");
    expect(instance.lastFrame()).toContain("Toggle help");
  });

  it("shows quit binding", () => {
    const { instance } = renderHelp();
    expect(instance.lastFrame()).toContain("[q]");
    expect(instance.lastFrame()).toContain("Quit");
  });

  // ── missionMap screen bindings ──────────────────────────────────────

  describe("missionMap screen", () => {
    it("shows MISSION SELECT section header", () => {
      const { instance } = renderHelp("missionMap");
      expect(instance.lastFrame()).toContain("MISSION SELECT");
    });

    it("shows Start mission binding", () => {
      const { instance } = renderHelp("missionMap");
      expect(instance.lastFrame()).toContain("[ENTER]");
      expect(instance.lastFrame()).toContain("Start mission");
    });

    it("shows Select mission binding", () => {
      const { instance } = renderHelp("missionMap");
      expect(instance.lastFrame()).toContain("[UP/DOWN]");
      expect(instance.lastFrame()).toContain("Select mission");
    });

    it("does not show step-type sections", () => {
      const { instance } = renderHelp("missionMap");
      const frame = instance.lastFrame();
      expect(frame).not.toContain("FIELD ASSESSMENT STEPS");
      expect(frame).not.toContain("COMMAND CHALLENGE STEPS");
    });
  });

  // ── mission screen bindings ─────────────────────────────────────────

  describe("mission screen", () => {
    it("shows MISSION section header", () => {
      const { instance } = renderHelp("mission");
      expect(instance.lastFrame()).toContain("MISSION");
    });

    it("shows Ask handler binding", () => {
      const { instance } = renderHelp("mission");
      expect(instance.lastFrame()).toContain("[?]");
      expect(instance.lastFrame()).toContain("Ask handler");
    });

    it("shows Return to menu binding", () => {
      const { instance } = renderHelp("mission");
      expect(instance.lastFrame()).toContain("[ESC]");
      expect(instance.lastFrame()).toContain("Return to menu");
    });

    it("shows Continue binding", () => {
      const { instance } = renderHelp("mission");
      expect(instance.lastFrame()).toContain("Continue");
    });

    it("shows Navigate binding", () => {
      const { instance } = renderHelp("mission");
      expect(instance.lastFrame()).toContain("Navigate");
    });

    it("shows FIELD ASSESSMENT STEPS section", () => {
      const { instance } = renderHelp("mission");
      const frame = instance.lastFrame();
      expect(frame).toContain("FIELD ASSESSMENT STEPS");
      expect(frame).toContain("Select answer");
      expect(frame).toContain("Confirm answer");
    });

    it("shows COMMAND CHALLENGE STEPS section", () => {
      const { instance } = renderHelp("mission");
      const frame = instance.lastFrame();
      expect(frame).toContain("COMMAND CHALLENGE STEPS");
      expect(frame).toContain("Enter answer");
      expect(frame).toContain("Submit");
    });
  });

  // ── infiniteMode screen bindings ────────────────────────────────────

  describe("infiniteMode screen", () => {
    it("shows DEEP COVER OPERATIONS section header", () => {
      const { instance } = renderHelp("infiniteMode");
      expect(instance.lastFrame()).toContain("DEEP COVER OPERATIONS");
    });

    it("shows Report bad question binding", () => {
      const { instance } = renderHelp("infiniteMode");
      expect(instance.lastFrame()).toContain("[R]");
      expect(instance.lastFrame()).toContain("Report bad question");
    });

    it("does not show step-type sections", () => {
      const { instance } = renderHelp("infiniteMode");
      const frame = instance.lastFrame();
      expect(frame).not.toContain("FIELD ASSESSMENT STEPS");
      expect(frame).not.toContain("COMMAND CHALLENGE STEPS");
    });
  });

  // ── Screen with no context bindings ─────────────────────────────────

  describe("screen with no specific bindings", () => {
    it("shows only global bindings for logo screen", () => {
      const { instance } = renderHelp("logo");
      const frame = instance.lastFrame();
      expect(frame).toContain("GLOBAL");
      expect(frame).not.toContain("LOGO");
    });

    it("shows only global bindings for onboarding screen", () => {
      const { instance } = renderHelp("onboarding");
      const frame = instance.lastFrame();
      expect(frame).toContain("GLOBAL");
      expect(frame).not.toContain("ONBOARDING");
    });
  });

  // ── Close behavior ──────────────────────────────────────────────────

  describe("closing", () => {
    it("calls onClose when ESC is pressed", async () => {
      const { instance, onClose } = renderHelp();
      pressKey(instance, keys.escape);
      await flushImmediate();
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("calls onClose when h is pressed", () => {
      const { instance, onClose } = renderHelp();
      pressKey(instance, "h");
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not call onClose for other keys", () => {
      const { instance, onClose } = renderHelp();
      pressKey(instance, "a");
      pressKey(instance, keys.enter);
      pressKey(instance, keys.arrowUp);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
