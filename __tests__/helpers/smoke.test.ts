import { describe, it, expect } from "vitest";
import React from "react";
import { Text } from "ink";
import { createSaveData, createCompletedSaveData } from "./mock-progress.js";
import {
  createMission,
  createQuizStep,
  createCommandStep,
  createPrintStep,
  createAIStep,
} from "./mock-missions.js";
import {
  createMockAnthropicClient,
  createStreamingResponse,
  createMessageResponse,
  createApiError,
} from "./mock-ai.js";
import { renderInk, cleanup, keys, pressKey, type } from "./render-ink.js";

// ── mock-progress ──────────────────────────────────────────────────

describe("mock-progress helpers", () => {
  it("createSaveData returns valid default save", () => {
    const save = createSaveData();
    expect(save.schemaVersion).toBe(1);
    expect(save.completedMissions).toEqual([]);
    expect(save.fxp).toBe(0);
    expect(save.clearanceLevel).toBe("recruit");
  });

  it("createSaveData applies overrides", () => {
    const save = createSaveData({ fxp: 500, clearanceLevel: "operative" });
    expect(save.fxp).toBe(500);
    expect(save.clearanceLevel).toBe("operative");
    expect(save.completedMissions).toEqual([]);
  });

  it("createCompletedSaveData returns a fully-progressed save", () => {
    const save = createCompletedSaveData();
    expect(save.completedMissions.length).toBeGreaterThan(0);
    expect(save.fxp).toBeGreaterThan(0);
    expect(save.clearanceLevel).toBe("elite");
    expect(save.firstRunComplete).toBe(true);
    expect(save.infiniteModeUnlocked).toBe(true);
  });
});

// ── mock-missions ──────────────────────────────────────────────────

describe("mock-missions helpers", () => {
  it("createMission returns a valid mission", () => {
    const mission = createMission();
    expect(mission.id).toBe("mission-test");
    expect(mission.codename).toBeTruthy();
    expect(mission.steps.length).toBeGreaterThan(0);
    expect(mission.objectives.length).toBeGreaterThan(0);
  });

  it("createMission accepts overrides", () => {
    const mission = createMission({ id: "custom", title: "Custom" });
    expect(mission.id).toBe("custom");
    expect(mission.title).toBe("Custom");
  });

  it("createQuizStep returns type quiz with 4 options", () => {
    const step = createQuizStep();
    expect(step.type).toBe("quiz");
    expect(step.options).toHaveLength(4);
    expect(step.correct).toBeGreaterThanOrEqual(0);
    expect(step.correct).toBeLessThanOrEqual(3);
  });

  it("createCommandStep returns type command with variants", () => {
    const step = createCommandStep();
    expect(step.type).toBe("command");
    expect(step.acceptedVariants.length).toBeGreaterThanOrEqual(2);
  });

  it("createPrintStep returns type print", () => {
    const step = createPrintStep();
    expect(step.type).toBe("print");
    expect(step.text).toBeTruthy();
  });

  it("createAIStep returns type ai", () => {
    const step = createAIStep();
    expect(step.type).toBe("ai");
    expect(step.prompt).toBeTruthy();
  });
});

// ── mock-ai ────────────────────────────────────────────────────────

describe("mock-ai helpers", () => {
  it("createMockAnthropicClient has messages.create", () => {
    const client = createMockAnthropicClient();
    expect(typeof client.messages.create).toBe("function");
  });

  it("createStreamingResponse yields chunks", async () => {
    const stream = createStreamingResponse(["hello", " world"]);
    const chunks: string[] = [];
    for await (const event of stream) {
      if (event.delta?.text) chunks.push(event.delta.text);
    }
    expect(chunks).toEqual(["hello", " world"]);
  });

  it("createMessageResponse has expected structure", () => {
    const msg = createMessageResponse("test content");
    expect(msg.role).toBe("assistant");
    expect(msg.content[0].text).toBe("test content");
    expect(msg.usage.input_tokens).toBeGreaterThan(0);
  });

  it("createApiError has status and message", () => {
    const err = createApiError(429, "Rate limited");
    expect(err.status).toBe(429);
    expect(err.message).toBe("Rate limited");
  });
});

// ── render-ink ──────────────────────────────────────────────────────

describe("render-ink helpers", () => {
  it("renders <Text>hello</Text> successfully", () => {
    const instance = renderInk(React.createElement(Text, null, "hello"));
    expect(instance.lastFrame()).toBe("hello");
    instance.unmount();
  });

  it("captures multiple frames on rerender", () => {
    const instance = renderInk(React.createElement(Text, null, "first"));
    expect(instance.lastFrame()).toBe("first");
    instance.rerender(React.createElement(Text, null, "second"));
    expect(instance.lastFrame()).toBe("second");
    instance.unmount();
  });

  it("keys object has expected entries", () => {
    expect(keys.enter).toBe("\r");
    expect(keys.escape).toBe("\u001B");
    expect(keys.arrowUp).toBeDefined();
    expect(keys.arrowDown).toBeDefined();
  });

  it("pressKey and type send input to stdin", () => {
    const instance = renderInk(React.createElement(Text, null, "input test"));
    // These should not throw
    pressKey(instance, keys.enter);
    type(instance, "abc");
    instance.unmount();
  });

  it("cleanup does not throw", () => {
    expect(() => cleanup()).not.toThrow();
  });
});
