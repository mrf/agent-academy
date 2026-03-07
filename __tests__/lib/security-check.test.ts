import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CheckResult } from "../../src/lib/security-check.js";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

import { readFileSync, existsSync, readdirSync } from "node:fs";
import {
  checkNoHardcodedKeys,
  checkNoEnvInDist,
  checkFilesArray,
  checkApiKeyNotLogged,
  checkGracefulMissingKey,
  checkAppExists,
  runAllChecks,
  formatChecklist,
} from "../../src/lib/security-check.js";

const mockReadFileSync = vi.mocked(readFileSync);
const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);

function makeDirent(name: string, isDir: boolean) {
  return {
    name,
    isFile: () => !isDir,
    isDirectory: () => isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    path: "",
    parentPath: "",
  } as unknown as ReturnType<typeof readdirSync>[number];
}

beforeEach(() => {
  vi.clearAllMocks();
});

// -- checkNoHardcodedKeys -----------------------------------------------------

describe("checkNoHardcodedKeys", () => {
  it("passes when no API key patterns found in source", () => {
    mockReaddirSync.mockReturnValue([makeDirent("clean.ts", false)] as never);
    mockReadFileSync.mockReturnValue('const x = "hello";');

    const result = checkNoHardcodedKeys();

    expect(result.pass).toBe(true);
    expect(result.detail).toBe("Clean");
  });

  it("fails when sk-ant- pattern found in source", () => {
    mockReaddirSync.mockReturnValue([makeDirent("bad.ts", false)] as never);
    mockReadFileSync.mockReturnValue(
      'const key = "sk-ant-api03-aBcDeFgHiJkLmNoPqRsT";',
    );

    const result = checkNoHardcodedKeys();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain("Found in:");
  });

  it("fails when sk- pattern found in source", () => {
    mockReaddirSync.mockReturnValue([makeDirent("leak.tsx", false)] as never);
    mockReadFileSync.mockReturnValue(
      'const key = "sk-abcdefghijklmnopqrstuvwxyz";',
    );

    const result = checkNoHardcodedKeys();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain("Found in:");
  });

  it("skips node_modules and dist directories", () => {
    mockReaddirSync.mockImplementation((dir: unknown) => {
      const d = String(dir);
      if (d.endsWith("src")) {
        return [
          makeDirent("node_modules", true),
          makeDirent("dist", true),
          makeDirent("app.ts", false),
        ] as never;
      }
      return [] as never;
    });
    mockReadFileSync.mockReturnValue('const safe = "no keys here";');

    const result = checkNoHardcodedKeys();

    expect(result.pass).toBe(true);
  });
});

// -- checkNoEnvInDist ---------------------------------------------------------

describe("checkNoEnvInDist", () => {
  it("passes when dist/ does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    const result = checkNoEnvInDist();

    expect(result.pass).toBe(true);
    expect(result.detail).toBe("dist/ not built yet");
  });

  it("passes when dist/ has no .env files", () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent("index.js", false),
    ] as never);

    const result = checkNoEnvInDist();

    expect(result.pass).toBe(true);
    expect(result.detail).toBe("Clean");
  });

  it("fails when .env file found in dist/", () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent(".env", false),
    ] as never);

    const result = checkNoEnvInDist();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain("Found:");
  });

  it("fails when .env.local found in dist/", () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([
      makeDirent(".env.local", false),
    ] as never);

    const result = checkNoEnvInDist();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain(".env.local");
  });
});

// -- checkFilesArray ----------------------------------------------------------

describe("checkFilesArray", () => {
  it("passes when files array only contains dist/ entries", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ files: ["dist/"] }));

    const result = checkFilesArray();

    expect(result.pass).toBe(true);
    expect(result.detail).toContain("dist/");
  });

  it("passes with multiple dist entries", () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ files: ["dist/index.js", "dist/lib/"] }),
    );

    const result = checkFilesArray();

    expect(result.pass).toBe(true);
  });

  it("fails when files array includes non-dist entries", () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ files: ["dist/", "src/"] }),
    );

    const result = checkFilesArray();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain("Unexpected entries");
  });

  it("fails when files array is empty", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ files: [] }));

    const result = checkFilesArray();

    expect(result.pass).toBe(false);
  });

  it("fails when files key is missing", () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({}));

    const result = checkFilesArray();

    expect(result.pass).toBe(false);
  });
});

// -- checkApiKeyNotLogged -----------------------------------------------------

describe("checkApiKeyNotLogged", () => {
  it("passes when no logging of key variables found", () => {
    mockReaddirSync.mockReturnValue([makeDirent("safe.ts", false)] as never);
    mockReadFileSync.mockReturnValue('console.log("hello world");');

    const result = checkApiKeyNotLogged();

    expect(result.pass).toBe(true);
    expect(result.detail).toBe("Clean");
  });

  it("fails when console.log contains apiKey", () => {
    mockReaddirSync.mockReturnValue([makeDirent("leak.ts", false)] as never);
    mockReadFileSync.mockReturnValue('console.log("Key:", apiKey);');

    const result = checkApiKeyNotLogged();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain("Potential leaks in:");
  });

  it("fails when console.error contains ANTHROPIC_API_KEY", () => {
    mockReaddirSync.mockReturnValue([makeDirent("debug.ts", false)] as never);
    mockReadFileSync.mockReturnValue(
      "console.error(ANTHROPIC_API_KEY);",
    );

    const result = checkApiKeyNotLogged();

    expect(result.pass).toBe(false);
  });

  it("fails when console.warn contains process.env", () => {
    mockReaddirSync.mockReturnValue([makeDirent("env.ts", false)] as never);
    mockReadFileSync.mockReturnValue(
      "console.warn(process.env.ANTHROPIC_API_KEY);",
    );

    const result = checkApiKeyNotLogged();

    expect(result.pass).toBe(false);
  });

  it("fails when console.debug contains api_key", () => {
    mockReaddirSync.mockReturnValue([makeDirent("dbg.tsx", false)] as never);
    mockReadFileSync.mockReturnValue('console.debug("val", api_key);');

    const result = checkApiKeyNotLogged();

    expect(result.pass).toBe(false);
  });
});

// -- checkGracefulMissingKey --------------------------------------------------

describe("checkGracefulMissingKey", () => {
  it("passes when safeApiError is present and NoApiKey screen exists", () => {
    mockReadFileSync.mockReturnValue("export { safeApiError }");
    mockExistsSync.mockReturnValue(true);

    const result = checkGracefulMissingKey();

    expect(result.pass).toBe(true);
    expect(result.detail).toContain("safeApiError present");
    expect(result.detail).toContain("NoApiKey screen present");
  });

  it("fails when safeApiError is missing from client", () => {
    mockReadFileSync.mockReturnValue("export const client = new Anthropic();");
    mockExistsSync.mockReturnValue(true);

    const result = checkGracefulMissingKey();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain("safeApiError missing");
  });

  it("fails when NoApiKey screen does not exist", () => {
    mockReadFileSync.mockReturnValue("export { safeApiError }");
    mockExistsSync.mockReturnValue(false);

    const result = checkGracefulMissingKey();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain("NoApiKey screen missing");
  });

  it("fails when both safeApiError and NoApiKey screen are missing", () => {
    mockReadFileSync.mockReturnValue("export const client = {};");
    mockExistsSync.mockReturnValue(false);

    const result = checkGracefulMissingKey();

    expect(result.pass).toBe(false);
    expect(result.detail).toContain("safeApiError missing");
    expect(result.detail).toContain("NoApiKey screen missing");
  });
});

// -- checkAppExists -----------------------------------------------------------

describe("checkAppExists", () => {
  it("passes when src/app.tsx exists", () => {
    mockExistsSync.mockReturnValue(true);

    const result = checkAppExists();

    expect(result.pass).toBe(true);
    expect(result.detail).toBe("src/app.tsx found");
  });

  it("fails when src/app.tsx does not exist", () => {
    mockExistsSync.mockReturnValue(false);

    const result = checkAppExists();

    expect(result.pass).toBe(false);
    expect(result.detail).toBe("src/app.tsx not found");
  });
});

// -- formatChecklist ----------------------------------------------------------

describe("formatChecklist", () => {
  it("formats passing results with PASS prefix", () => {
    const results: CheckResult[] = [
      { name: "Test A", pass: true, detail: "All good" },
    ];

    const output = formatChecklist(results);

    expect(output).toContain("PASS Test A");
    expect(output).toContain("All good");
    expect(output).toContain("1/1 checks passed");
  });

  it("formats failing results with FAIL prefix", () => {
    const results: CheckResult[] = [
      { name: "Test B", pass: false, detail: "Something wrong" },
    ];

    const output = formatChecklist(results);

    expect(output).toContain("FAIL Test B");
    expect(output).toContain("Something wrong");
    expect(output).toContain("0/1 checks passed");
  });

  it("counts mixed pass/fail correctly", () => {
    const results: CheckResult[] = [
      { name: "A", pass: true, detail: "ok" },
      { name: "B", pass: false, detail: "bad" },
      { name: "C", pass: true, detail: "ok" },
    ];

    const output = formatChecklist(results);

    expect(output).toContain("2/3 checks passed");
  });

  it("handles empty results array", () => {
    const output = formatChecklist([]);

    expect(output).toContain("0/0 checks passed");
  });
});

// -- runAllChecks -------------------------------------------------------------

describe("runAllChecks", () => {
  it("returns exactly 6 check results", () => {
    // Set up mocks so all checks can execute without throwing
    mockReaddirSync.mockReturnValue([makeDirent("app.ts", false)] as never);
    mockReadFileSync.mockImplementation((path: unknown) => {
      const p = String(path);
      if (p.endsWith("package.json")) return JSON.stringify({ files: ["dist/"] });
      if (p.endsWith("client.ts")) return "safeApiError";
      return "const x = 1;";
    });
    mockExistsSync.mockReturnValue(true);

    const results = runAllChecks();

    expect(results).toHaveLength(6);
    for (const r of results) {
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("pass");
      expect(r).toHaveProperty("detail");
    }
  });

  it("includes all expected check names", () => {
    mockReaddirSync.mockReturnValue([] as never);
    mockReadFileSync.mockImplementation((path: unknown) => {
      const p = String(path);
      if (p.endsWith("package.json")) return JSON.stringify({ files: ["dist/"] });
      return "safeApiError";
    });
    mockExistsSync.mockReturnValue(true);

    const results = runAllChecks();
    const names = results.map((r) => r.name);

    expect(names).toContain("No hardcoded API keys in source");
    expect(names).toContain("No .env files in dist/");
    expect(names).toContain("package.json files array only includes dist/");
    expect(names).toContain("API key never logged or exposed in error messages");
    expect(names).toContain("AI functions handle missing API key gracefully");
    expect(names).toContain("App component exists");
  });
});
