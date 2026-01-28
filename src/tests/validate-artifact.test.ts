import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateArtifact } from "../core/validate-artifact";

vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  setOutput: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

import * as fs from "node:fs";
import * as core from "@actions/core";

describe("validate-artifact.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Input validation", () => {
    it("should fail when artifact input is not provided", () => {
      vi.mocked(core.getInput).mockReturnValue("");

      validateArtifact();

      expect(core.getInput).toHaveBeenCalledWith("artifact");
      expect(core.setFailed).toHaveBeenCalledWith(
        "Input 'artifact' is required. Please provide the path to the artifact file.",
      );
    });

    it("should fail when artifact input is undefined", () => {
      vi.mocked(core.getInput).mockReturnValue(undefined as unknown as string);

      validateArtifact();

      expect(core.setFailed).toHaveBeenCalledWith(
        "Input 'artifact' is required. Please provide the path to the artifact file.",
      );
    });

    it("should fail when artifact input is null", () => {
      vi.mocked(core.getInput).mockReturnValue(null as unknown as string);

      validateArtifact();

      expect(core.setFailed).toHaveBeenCalledWith(
        "Input 'artifact' is required. Please provide the path to the artifact file.",
      );
    });
  });

  describe("File existence validation", () => {
    it("should fail when artifact file does not exist", () => {
      vi.mocked(core.getInput).mockReturnValue("non-existent-file.zip");
      vi.mocked(fs.existsSync).mockReturnValue(false);

      validateArtifact();

      const expectedPath = path.resolve("non-existent-file.zip");
      expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
      expect(core.setFailed).toHaveBeenCalledWith(
        `Artifact file does not exist at path: ${expectedPath}`,
      );
    });

    it("should pass file existence check when file exists", () => {
      vi.mocked(core.getInput).mockReturnValue("existing-file.zip");
      vi.mocked(fs.existsSync).mockReturnValue(true);

      validateArtifact();

      expect(fs.existsSync).toHaveBeenCalled();
      // Should not fail on file existence
      const failedCalls = vi.mocked(core.setFailed).mock.calls;
      expect(failedCalls.some((call) => (call[0] as string).includes("does not exist"))).toBe(
        false,
      );
    });
  });

  describe("File extension validation", () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it("should fail for unsupported file extension .txt", () => {
      vi.mocked(core.getInput).mockReturnValue("test-file.txt");

      validateArtifact();

      expect(core.setFailed).toHaveBeenCalledWith(
        "Artifact file must be one of the following types: .zip",
      );
    });

    it("should fail for unsupported file extension .pdf", () => {
      vi.mocked(core.getInput).mockReturnValue("test-file.pdf");

      validateArtifact();

      expect(core.setFailed).toHaveBeenCalledWith(
        "Artifact file must be one of the following types: .zip",
      );
    });

    it("should fail for file without extension", () => {
      vi.mocked(core.getInput).mockReturnValue("test-file");

      validateArtifact();

      expect(core.setFailed).toHaveBeenCalledWith(
        "Artifact file must be one of the following types: .zip",
      );
    });

    it("should pass for .zip extension", () => {
      vi.mocked(core.getInput).mockReturnValue("test-file.zip");

      validateArtifact();

      expect(core.setFailed).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith("Artifact validation passed.");
    });

    it("should fail for .tar extension (no longer supported)", () => {
      vi.mocked(core.getInput).mockReturnValue("test-file.tar");

      validateArtifact();

      expect(core.setFailed).toHaveBeenCalledWith(
        "Artifact file must be one of the following types: .zip",
      );
    });

    it("should fail for .rar extension (no longer supported)", () => {
      vi.mocked(core.getInput).mockReturnValue("test-file.rar");

      validateArtifact();

      expect(core.setFailed).toHaveBeenCalledWith(
        "Artifact file must be one of the following types: .zip",
      );
    });

    it("should handle case insensitive extensions (.ZIP)", () => {
      vi.mocked(core.getInput).mockReturnValue("test-file.ZIP");

      validateArtifact();

      expect(core.setFailed).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith("Artifact validation passed.");
    });
  });

  describe("Output setting", () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it("should set artifact-path output when validation passes", () => {
      const artifactFile = "test-file.zip";
      vi.mocked(core.getInput).mockReturnValue(artifactFile);

      validateArtifact();

      const expectedPath = path.resolve(artifactFile);
      expect(core.setOutput).toHaveBeenCalledWith("artifact-path", expectedPath);
    });

    it("should set absolute path for relative input", () => {
      const artifactFile = "./relative/path/test-file.zip";
      vi.mocked(core.getInput).mockReturnValue(artifactFile);

      validateArtifact();

      const expectedPath = path.resolve(artifactFile);
      expect(core.setOutput).toHaveBeenCalledWith("artifact-path", expectedPath);
    });

    it("should handle already absolute paths", () => {
      const absolutePath = "/absolute/path/test-file.zip";
      vi.mocked(core.getInput).mockReturnValue(absolutePath);

      validateArtifact();

      expect(core.setOutput).toHaveBeenCalledWith("artifact-path", absolutePath);
    });
  });

  describe("Complete validation flow", () => {
    it("should complete successful validation with all checks", () => {
      vi.mocked(core.getInput).mockReturnValue("valid-artifact.zip");
      vi.mocked(fs.existsSync).mockReturnValue(true);

      validateArtifact();

      // Verify all expected calls happened
      expect(core.getInput).toHaveBeenCalledWith("artifact");
      expect(fs.existsSync).toHaveBeenCalled();
      expect(core.setFailed).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith("Artifact validation passed.");
      expect(core.setOutput).toHaveBeenCalledWith(
        "artifact-path",
        path.resolve("valid-artifact.zip"),
      );
    });
  });
});
