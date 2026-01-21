import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const execState = vi.hoisted(() => ({
  stdout: "",
  stderr: "",
  lastCommand: "",
}));

const setExecResult = (stdout: string, stderr = "") => {
  execState.stdout = stdout;
  execState.stderr = stderr;
  execState.lastCommand = "";
};

vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node:child_process", () => {
  const execMock = vi.fn(async (command: string) => {
    execState.lastCommand = command;
    return { stdout: execState.stdout, stderr: execState.stderr };
  });

  const promisifySym = Symbol.for("nodejs.util.promisify.custom");
  if (!(promisifySym in execMock)) {
    Reflect.defineProperty(execMock, promisifySym, {
      value: execMock,
      configurable: true,
    });
  }

  return { exec: execMock };
});

import * as fs from "node:fs";
import * as core from "@actions/core";
import * as postPublish from "../core/post-publish-metadata";
import type { AppMetadata } from "../types";

describe("post-publish-metadata orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractAppMetadata", () => {
    it("extracts metadata from zip and maps key", async () => {
      setExecResult(JSON.stringify({ name: "my-app", version: "1.0.0" }));

      const result = await postPublish.extractAppMetadata("/tmp/app.zip");

      expect(result.name).toBe("my-app");
      expect(result.version).toBe("1.0.0");
      expect(result.key).toBe("my-app");
    });

    it("throws for non-zip artifacts", async () => {
      await expect(postPublish.extractAppMetadata("/tmp/app.txt")).rejects.toThrow(
        "Unsupported artifact format: .txt. Only .zip files are supported.",
      );
    });

    it("throws when metadata.json is missing", async () => {
      setExecResult("");

      await expect(postPublish.extractAppMetadata("/tmp/app.zip")).rejects.toThrow(
        "metadata.json not found in artifact",
      );
    });

    it("throws when metadata.json is invalid", async () => {
      setExecResult("not-json");

      await expect(postPublish.extractAppMetadata("/tmp/app.zip")).rejects.toThrow(
        "Invalid JSON format in metadata.json",
      );
    });
  });

  describe("postPublishMetadata", () => {
    const baseInputs: Record<string, string> = {
      artifact: "release.zip",
      env: "fprd",
      tag: "latest",
      "working-directory": ".",
    };

    const meta: AppMetadata = {
      name: "demo-app",
      version: "2.0.0",
      key: "demo-app",
      description: "Demo application",
    };

    const mockInputs = (overrides?: Partial<Record<string, string>>) => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        return overrides?.[input] ?? baseInputs[input] ?? "";
      });
    };

    it("sets outputs and posts PR comment on success", async () => {
      mockInputs();
      vi.mocked(fs.existsSync).mockReturnValue(true);

      setExecResult(JSON.stringify(meta));

      await postPublish.postPublishMetadata();

      const expectedAppUrl = "https://fusion.equinor.com/apps/demo-app";
      const expectedAdminUrl = "https://fusion.equinor.com/apps/app-admin/apps/demo-app";

      expect(execState.lastCommand).toContain(path.resolve("./", "release.zip"));
      expect(core.setOutput).toHaveBeenCalledWith("app-name", "demo-app");
      expect(core.setOutput).toHaveBeenCalledWith("app-version", "2.0.0");
      expect(core.setOutput).toHaveBeenCalledWith("app-key", "demo-app");
      expect(core.setOutput).toHaveBeenCalledWith("app-url", expectedAppUrl);
      expect(core.setOutput).toHaveBeenCalledWith("app-admin-url", expectedAdminUrl);
      expect(core.setOutput).toHaveBeenCalledWith(
        "publish-info",
        "🚀 **demo-app** v2.0.0 deployed to **FPRD**\n[Open Application](https://fusion.equinor.com/apps/demo-app)",
      );
    });

    it("uses working-directory when resolving artifact path", async () => {
      mockInputs({ "working-directory": "dist", tag: "v1.2.3" });
      vi.mocked(fs.existsSync).mockReturnValue(true);

      setExecResult(JSON.stringify(meta));

      await postPublish.postPublishMetadata();

      expect(execState.lastCommand).toContain(path.resolve("dist", "release.zip"));
    });

    it("fails when artifact is missing", async () => {
      mockInputs({ "working-directory": "dist" });
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await postPublish.postPublishMetadata();

      expect(core.setFailed).toHaveBeenCalledWith(
        `Post-publish metadata failed: Artifact not found: ${path.resolve("dist", "release.zip")}`,
      );
    });

    it("fails when metadata extraction errors", async () => {
      mockInputs();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      setExecResult("not-json");

      await postPublish.postPublishMetadata();

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid JSON format in metadata.json"),
      );
    });
  });
});
