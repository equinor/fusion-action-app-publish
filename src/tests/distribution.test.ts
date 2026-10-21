import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.join(__dirname, "..", "..");
let directory: string;

beforeAll(async () => {
  directory = realpathSync(mkdtempSync(path.join(tmpdir(), "fusion-distribution-test-")));
  writeFileSync(path.join(directory, "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(path.join(directory, "app.manifest.json"), "{}");
  writeFileSync(path.join(directory, "artifact.zip"), "");
  writeFileSync(path.join(directory, "artifact.txt"), "");
  cpSync(path.join(repoRoot, "dist"), path.join(directory, "committed"), { recursive: true });
  await build({
    root: repoRoot,
    configFile: path.join(repoRoot, "vite.config.ts"),
    logLevel: "silent",
    build: { outDir: path.join(directory, "built") },
  });
}, 30000);

afterAll(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
});

function runNode(args: string[], artifact = "") {
  const outputFile = path.join(directory, "github-output");
  writeFileSync(outputFile, "");
  const result = spawnSync(process.execPath, args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 10000,
    env: {
      PATH: process.env.PATH,
      INPUT_ARTIFACT: artifact,
      GITHUB_OUTPUT: outputFile,
    },
  });
  if (result.error) throw result.error;
  expect(result.signal).toBeNull();
  return { ...result, output: readFileSync(outputFile, "utf8") };
}

describe.each(["committed", "built"])("%s distribution", (distribution) => {
  it("loads every ESM bundle in Node without node_modules", () => {
    const dist = path.join(directory, distribution);
    const modules = readdirSync(dist)
      .filter((file) => file.endsWith(".js"))
      .map((file) => pathToFileURL(path.join(dist, file)).href);
    expect(modules.length).toBeGreaterThanOrEqual(8);
    const result = runNode([
      "--input-type=module",
      "--eval",
      "for (const file of process.argv.slice(1)) await import(file);",
      ...modules,
    ]);
    expect(result.stderr).toBe("");
    expect(result.status, result.stdout).toBe(0);
  });

  it("validates an artifact using the executable entry point", () => {
    const artifact = path.join(directory, "artifact.zip");
    const result = runNode([path.join(directory, distribution, "validate-artifact.js")], artifact);
    expect(result.stderr).toBe("");
    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("Artifact validation passed.");
    expect(result.output).toMatch(/artifact-path<<[^\n]+\n/);
    expect(result.output).toContain(`\n${artifact}\n`);
    expect(result.output).toMatch(/artifact-provided<<[^\n]+\ntrue\n/);
  });

  it("preserves source-based publishing when no artifact is provided", () => {
    const result = runNode([path.join(directory, distribution, "validate-artifact.js")]);
    expect(result.stderr).toBe("");
    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain("No artifact provided.");
    expect(result.output).toMatch(/artifact-provided<<[^\n]+\nfalse\n/);
    expect(result.output).not.toContain("artifact-path");
  });

  it.each([
    ["missing.zip", "Artifact file does not exist at path:"],
    ["artifact.txt", "Artifact file must be one of the following types: .zip"],
  ])("rejects an invalid artifact: %s", (artifact, message) => {
    const result = runNode([path.join(directory, distribution, "validate-artifact.js")], artifact);
    expect(result.stderr).toBe("");
    expect(result.status, result.stdout).toBe(1);
    expect(result.stdout).toContain(`::error::${message}`);
    expect(result.output).toBe("");
  });
});
