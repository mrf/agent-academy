import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export type CheckResult = {
  name: string;
  pass: boolean;
  detail: string;
};

const ROOT = resolve(import.meta.dirname, "../..");

const SOURCE_EXT = /\.(ts|tsx|js|jsx)$/;
const SKIP_DIRS = new Set(["node_modules", "dist"]);
const API_KEY_PATTERN = /(?:sk-ant-[a-zA-Z0-9-]{20,}|sk-[a-zA-Z0-9]{20,})/;
const LOGGED_KEY_PATTERN =
  /console\.(log|error|warn|info|debug)\s*\(.*(?:apiKey|api_key|ANTHROPIC_API_KEY|process\.env)/i;

function relativePath(absolute: string): string {
  return absolute.replace(ROOT + "/", "");
}

function walkDir(
  dir: string,
  filter: (entry: { name: string; isFile: boolean }) => boolean,
): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      results.push(...walkDir(full, filter));
    } else if (filter({ name: entry.name, isFile: entry.isFile() })) {
      results.push(full);
    }
  }
  return results;
}

function srcFiles(dir: string): string[] {
  return walkDir(dir, (e) => e.isFile && SOURCE_EXT.test(e.name));
}

function findMatchingFiles(
  dir: string,
  pattern: RegExp,
  perLine = false,
): string[] {
  const hits: string[] = [];
  for (const file of srcFiles(dir)) {
    const content = readFileSync(file, "utf-8");
    if (perLine) {
      if (content.split("\n").some((line) => pattern.test(line))) {
        hits.push(relativePath(file));
      }
    } else if (pattern.test(content)) {
      hits.push(relativePath(file));
    }
  }
  return hits;
}

export function checkNoHardcodedKeys(): CheckResult {
  const hits = findMatchingFiles(join(ROOT, "src"), API_KEY_PATTERN);
  return {
    name: "No hardcoded API keys in source",
    pass: hits.length === 0,
    detail: hits.length ? `Found in: ${hits.join(", ")}` : "Clean",
  };
}

export function checkNoEnvInDist(): CheckResult {
  const distDir = join(ROOT, "dist");
  if (!existsSync(distDir)) {
    return { name: "No .env files in dist/", pass: true, detail: "dist/ not built yet" };
  }
  const envFiles = walkDir(distDir, (e) => e.isFile && e.name.startsWith(".env"))
    .map(relativePath);
  return {
    name: "No .env files in dist/",
    pass: envFiles.length === 0,
    detail: envFiles.length ? `Found: ${envFiles.join(", ")}` : "Clean",
  };
}

export function checkFilesArray(): CheckResult {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  const files: string[] = pkg.files ?? [];
  const allDist = files.length > 0 && files.every((f: string) => f.startsWith("dist"));
  return {
    name: "package.json files array only includes dist/",
    pass: allDist,
    detail: allDist ? `files: ${JSON.stringify(files)}` : `Unexpected entries: ${JSON.stringify(files)}`,
  };
}

export function checkApiKeyNotLogged(): CheckResult {
  const hits = findMatchingFiles(join(ROOT, "src"), LOGGED_KEY_PATTERN, true);
  return {
    name: "API key never logged or exposed in error messages",
    pass: hits.length === 0,
    detail: hits.length ? `Potential leaks in: ${hits.join(", ")}` : "Clean",
  };
}

export function checkGracefulMissingKey(): CheckResult {
  const clientPath = join(ROOT, "src/ai/client.ts");
  const content = readFileSync(clientPath, "utf-8");
  const hasSafeError = content.includes("safeApiError");
  const hasNoKeyScreen = existsSync(join(ROOT, "src/screens/NoApiKey.tsx"));
  return {
    name: "AI functions handle missing API key gracefully",
    pass: hasSafeError && hasNoKeyScreen,
    detail: [
      hasSafeError ? "safeApiError present" : "safeApiError missing",
      hasNoKeyScreen ? "NoApiKey screen present" : "NoApiKey screen missing",
    ].join("; "),
  };
}

export function checkAppExists(): CheckResult {
  const appPath = join(ROOT, "src/app.tsx");
  if (!existsSync(appPath)) {
    return { name: "App component exists", pass: false, detail: "src/app.tsx not found" };
  }
  return { name: "App component exists", pass: true, detail: "src/app.tsx found" };
}

export function runAllChecks(): CheckResult[] {
  return [
    checkNoHardcodedKeys(),
    checkNoEnvInDist(),
    checkFilesArray(),
    checkApiKeyNotLogged(),
    checkGracefulMissingKey(),
    checkAppExists(),
  ];
}

export function formatChecklist(results: CheckResult[]): string {
  const lines = results.map(
    (r) => `${r.pass ? "PASS" : "FAIL"} ${r.name}\n     ${r.detail}`,
  );
  const passed = results.filter((r) => r.pass).length;
  lines.push(`\n${passed}/${results.length} checks passed`);
  return lines.join("\n");
}
