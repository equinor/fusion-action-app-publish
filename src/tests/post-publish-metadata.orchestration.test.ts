import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const zipState = vi.hoisted(() => ({
  metadata: null as any,
  rawData: null as string | null,
  shouldThrowOnInit: false,
  shouldThrowOnGetEntry: false,
  shouldThrowOnGetData: false,
  zipPath: "",
}));

const setZipMetadata = (metadata: any) => {
  zipState.metadata = metadata;
  zipState.rawData = null;
  zipState.shouldThrowOnInit = false;
  zipState.shouldThrowOnGetEntry = false;
  zipState.shouldThrowOnGetData = false;
};

const setZipRawData = (rawData: string) => {
  zipState.metadata = null;
  zipState.rawData = rawData;
  zipState.shouldThrowOnInit = false;
  zipState.shouldThrowOnGetEntry = false;
  zipState.shouldThrowOnGetData = false;
};

const setZipError = (errorType: "init" | "getEntry" | "getData") => {
  if (errorType === "init") {
    zipState.shouldThrowOnInit = true;
  } else if (errorType === "getEntry") {
    zipState.shouldThrowOnGetEntry = true;
  } else if (errorType === "getData") {
    zipState.shouldThrowOnGetData = true;
  }
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

vi.mock("adm-zip", () => {
  const buildEntry = () => ({
    entryName: "metadata.json",
    getDataAsync: vi.fn((callback: (data: Buffer, err?: Error) => void) => {
      if (zipState.shouldThrowOnGetData) {
        callback(Buffer.from(""), new Error("Failed to read"));
        return;
      }
      const payload = zipState.rawData ?? JSON.stringify(zipState.metadata ?? {});
      callback(Buffer.from(payload));
    }),
  });

  class AdmZipMock {
    constructor(filepath: string) {
      zipState.zipPath = filepath;

      if (zipState.shouldThrowOnInit) {
        throw new Error("ADM-ZIP: Invalid filename");
      }
    }

    getEntry() {
      if (zipState.shouldThrowOnGetEntry || (!zipState.metadata && !zipState.rawData)) {
        return null;
      }
      return buildEntry();
    }

    getEntries() {
      if (zipState.shouldThrowOnGetEntry || (!zipState.metadata && !zipState.rawData)) {
        return [];
      }
      return [buildEntry()];
    }
  }

  return {
    default: AdmZipMock,
  };
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
      setZipMetadata({ name: "my-app", version: "1.0.0", appKey: "my-app" });

      const result = await postPublish.extractAppMetadata("/tmp/app.zip");

      expect(result.name).toBe("my-app");
      expect(result.version).toBe("1.0.0");
      expect(result.key).toBe("my-app");
      expect(zipState.zipPath).toBe("/tmp/app.zip");
    });

    it("throws for non-zip artifacts", async () => {
      await expect(postPublish.extractAppMetadata("/tmp/app.txt")).rejects.toThrow(
        "Unsupported artifact format: .txt. Only .zip files are supported.",
      );
    });

    it("throws when metadata.json is missing", async () => {
      setZipMetadata(null);

      await expect(postPublish.extractAppMetadata("/tmp/app.zip")).rejects.toThrow(
        "Metadata file not found in bundle",
      );
    });

    it("throws when metadata.json is invalid", async () => {
      setZipRawData("not-json");

      await expect(postPublish.extractAppMetadata("/tmp/app.zip")).rejects.toThrow(
        "Failed to parse metadata file",
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

      setZipMetadata({ name: meta.name, version: meta.version, appKey: meta.key });

      await postPublish.postPublishMetadata();

      const expectedAppUrl = "https://fusion.equinor.com/apps/demo-app";
      const expectedAdminUrl = "https://fusion.equinor.com/apps/app-admin/apps/demo-app";

      expect(zipState.zipPath).toBe(path.resolve("./", "release.zip"));
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

      setZipMetadata({ name: meta.name, version: meta.version, appKey: meta.key });

      await postPublish.postPublishMetadata();

      expect(zipState.zipPath).toBe(path.resolve("dist", "release.zip"));
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
      setZipRawData("not-json");

      await postPublish.postPublishMetadata();

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse metadata file"),
      );
    });
  });
});
