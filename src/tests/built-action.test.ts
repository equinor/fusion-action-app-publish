import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import AdmZip from "adm-zip";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Built action in Node.js", () => {
  const directory = realpathSync(mkdtempSync(path.join(tmpdir(), "fusion-built-action-")));
  const outputDirectory = path.join(directory, "dist");
  const artifact = path.join(directory, "app-bundle.zip");
  const manifest = { appKey: "smoke-test", version: "1.0.0" };

  beforeAll(async () => {
    writeFileSync(path.join(directory, "package.json"), '{"type":"module"}');
    writeFileSync(path.join(directory, "app.manifest.json"), JSON.stringify(manifest));
    const zip = new AdmZip();
    zip.addFile("app-manifest.json", Buffer.from(JSON.stringify(manifest)));
    zip.writeZip(artifact);

    await build({
      configFile: path.resolve(__dirname, "../../vite.config.ts"),
      logLevel: "silent",
      build: { outDir: outputDirectory },
    });
  }, 30000);

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  const runNode = (args: string[], inputs: Record<string, string> = {}) =>
    spawnSync(process.execPath, args, {
      cwd: directory,
      encoding: "utf8",
      timeout: 10000,
      env: {
        PATH: process.env.PATH,
        INPUT_ARTIFACT: "",
        ...inputs,
      },
    });

  it.each([
    "check-meta-comment",
    "validate-artifact",
    "validate-env",
    "validate-is-token-or-azure",
    "validate-config-and-manifest",
    "post-publish-metadata",
    "extract-manifest",
    "extract-metadata",
  ])("loads %s without installed runtime dependencies", (entry) => {
    const url = pathToFileURL(path.join(outputDirectory, `${entry}.js`)).href;
    const result = runNode(["--input-type=module", "-e", `await import(${JSON.stringify(url)})`]);

    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("runs artifact validation with a bundle", () => {
    const result = runNode([path.join(outputDirectory, "validate-artifact.js")], {
      INPUT_ARTIFACT: artifact,
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Artifact validation passed.");
    expect(result.stdout).toContain(`::set-output name=artifact-path::${artifact}`);
    expect(result.stdout).toContain("::set-output name=artifact-provided::true");
  });

  it("preserves source-based publishing without an artifact", () => {
    const result = runNode([path.join(outputDirectory, "validate-artifact.js")]);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("::set-output name=artifact-provided::false");
  });

  it("fails explicitly when the artifact does not exist", () => {
    const result = runNode([path.join(outputDirectory, "validate-artifact.js")], {
      INPUT_ARTIFACT: path.join(directory, "missing.zip"),
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("::error::Artifact file does not exist at path:");
  });

  it("extracts the manifest using the bundled ZIP dependency", () => {
    const result = runNode([path.join(outputDirectory, "extract-manifest.js")], {
      INPUT_ARTIFACT: artifact,
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(manifest);
  });
});
