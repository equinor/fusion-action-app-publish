import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowSummaryData } from "../core/generate-workflow-summary";
import { generateWorkflowSummary, main } from "../core/generate-workflow-summary";

// Mock modules
vi.mock("@actions/core");
vi.mock("node:fs", () => ({
  promises: {
    appendFile: vi.fn(),
  },
}));

import * as core from "@actions/core";

describe("generate-workflow-summary.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the fs.appendFile mock to resolve successfully by default
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);
    process.env = { ...originalEnv };
    process.env.GITHUB_STEP_SUMMARY = "/tmp/step-summary.md";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateWorkflowSummary", () => {
    it("should generate complete workflow summary with all data", async () => {
      const summaryData: WorkflowSummaryData = {
        appName: "my-fusion-app",
        appVersion: "1.2.3",
        environment: "fprd",
        tag: "v1.2.3",
        appUrl: "https://fusion.equinor.com/apps/my-fusion-app",
      };

      await generateWorkflowSummary(summaryData);

      const expectedContent =
        "## 🚀 my-fusion-app 1.2.3 published to fprd\n\n" +
        "**Tag:** v1.2.3\n" +
        "**App URL:** https://fusion.equinor.com/apps/my-fusion-app\n";

      expect(fs.appendFile).toHaveBeenCalledWith("/tmp/step-summary.md", expectedContent);
      expect(core.info).toHaveBeenCalledWith(
        "Workflow summary generated: my-fusion-app 1.2.3 published to fprd",
      );
    });

    it("should generate summary without app URL when not provided", async () => {
      const summaryData: WorkflowSummaryData = {
        appName: "test-app",
        appVersion: "0.1.0",
        environment: "ci",
        tag: "v0.1.0-alpha",
      };

      await generateWorkflowSummary(summaryData);

      const expectedContent =
        "## 🚀 test-app 0.1.0 published to ci\n\n" + "**Tag:** v0.1.0-alpha\n";

      expect(fs.appendFile).toHaveBeenCalledWith("/tmp/step-summary.md", expectedContent);
      expect(core.info).toHaveBeenCalledWith(
        "Workflow summary generated: test-app 0.1.0 published to ci",
      );
    });

    it("should handle empty string app URL", async () => {
      const summaryData: WorkflowSummaryData = {
        appName: "test-app",
        appVersion: "1.0.0",
        environment: "fqa",
        tag: "v1.0.0",
        appUrl: "",
      };

      await generateWorkflowSummary(summaryData);

      const expectedContent = "## 🚀 test-app 1.0.0 published to fqa\n\n" + "**Tag:** v1.0.0\n";

      expect(fs.appendFile).toHaveBeenCalledWith("/tmp/step-summary.md", expectedContent);
    });

    it("should throw error when required data is missing", async () => {
      const incompleteData = {
        appName: "test-app",
        appVersion: "", // Missing version
        environment: "fprd",
        tag: "v1.0.0",
      } as WorkflowSummaryData;

      await expect(generateWorkflowSummary(incompleteData)).rejects.toThrow(
        "Missing required summary data: appName, appVersion, environment, and tag are required",
      );

      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    it("should throw error when appName is missing", async () => {
      const incompleteData = {
        appName: "",
        appVersion: "1.0.0",
        environment: "fprd",
        tag: "v1.0.0",
      } as WorkflowSummaryData;

      await expect(generateWorkflowSummary(incompleteData)).rejects.toThrow(
        "Missing required summary data: appName, appVersion, environment, and tag are required",
      );
    });

    it("should handle file system errors gracefully", async () => {
      const summaryData: WorkflowSummaryData = {
        appName: "test-app",
        appVersion: "1.0.0",
        environment: "fprd",
        tag: "v1.0.0",
        appUrl: "https://example.com",
      };

      const fsError = new Error("Permission denied");
      vi.mocked(fs.appendFile).mockRejectedValue(fsError);

      await expect(generateWorkflowSummary(summaryData)).rejects.toThrow("Permission denied");
      expect(core.error).toHaveBeenCalledWith(
        "Failed to generate workflow summary: Error: Permission denied",
      );
    });

    it("should use default GITHUB_STEP_SUMMARY when environment variable is missing", async () => {
      delete process.env.GITHUB_STEP_SUMMARY;

      const summaryData: WorkflowSummaryData = {
        appName: "test-app",
        appVersion: "1.0.0",
        environment: "ci",
        tag: "v1.0.0",
      };

      await generateWorkflowSummary(summaryData);

      expect(fs.appendFile).toHaveBeenCalledWith("", expect.any(String));
    });
  });

  describe("main", () => {
    beforeEach(() => {
      vi.mocked(core.getInput).mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          "app-name": "main-test-app",
          "app-version": "2.0.0",
          environment: "fprd",
          tag: "v2.0.0",
          "app-url": "https://fusion.equinor.com/apps/main-test-app",
        };
        return inputs[name] || "";
      });
    });

    it("should read inputs and generate summary successfully", async () => {
      await main();

      const expectedContent =
        "## 🚀 main-test-app 2.0.0 published to fprd\n\n" +
        "**Tag:** v2.0.0\n" +
        "**App URL:** https://fusion.equinor.com/apps/main-test-app\n";

      expect(fs.appendFile).toHaveBeenCalledWith("/tmp/step-summary.md", expectedContent);
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it("should fall back to environment variables when inputs are empty", async () => {
      vi.mocked(core.getInput).mockReturnValue("");

      process.env.INPUT_APP_NAME = "env-test-app";
      process.env.INPUT_APP_VERSION = "3.0.0";
      process.env.INPUT_ENVIRONMENT = "ci";
      process.env.INPUT_TAG = "v3.0.0-beta";
      process.env.INPUT_APP_URL = "https://fusion.ci.fusion-dev.net/apps/env-test-app";

      await main();

      const expectedContent =
        "## 🚀 env-test-app 3.0.0 published to ci\n\n" +
        "**Tag:** v3.0.0-beta\n" +
        "**App URL:** https://fusion.ci.fusion-dev.net/apps/env-test-app\n";

      expect(fs.appendFile).toHaveBeenCalledWith("/tmp/step-summary.md", expectedContent);
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it("should handle missing required inputs gracefully", async () => {
      vi.mocked(core.getInput).mockReturnValue("");
      // Don't set environment variables, leaving inputs empty

      await main();

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining("Missing required summary data"),
      );
    });

    it("should handle errors and call setFailed", async () => {
      vi.mocked(core.getInput).mockImplementation(() => {
        throw new Error("Input error");
      });

      await main();

      expect(core.setFailed).toHaveBeenCalledWith("Action failed with error Error: Input error");
    });

    it("should handle undefined app URL in environment variables", async () => {
      vi.mocked(core.getInput).mockReturnValue("");

      process.env.INPUT_APP_NAME = "test-app";
      process.env.INPUT_APP_VERSION = "1.0.0";
      process.env.INPUT_ENVIRONMENT = "ci";
      process.env.INPUT_TAG = "v1.0.0";
      // INPUT_APP_URL is intentionally not set

      await main();

      const expectedContent = "## 🚀 test-app 1.0.0 published to ci\n\n" + "**Tag:** v1.0.0\n";

      expect(fs.appendFile).toHaveBeenCalledWith("/tmp/step-summary.md", expectedContent);
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });
});
