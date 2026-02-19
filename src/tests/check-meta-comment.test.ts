import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkMetaComment } from "../core/check-meta-comment";

vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  setOutput: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@actions/github", () => ({
  getOctokit: vi.fn(),
  context: {
    payload: {},
    repo: {
      owner: "equinor",
      repo: "fusion-action-app-publish",
    },
  },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock("../core/post-publish-metadata", () => ({
  extractAppMetadata: vi.fn().mockResolvedValue({
    name: "test-app",
    version: "1.0.0",
    key: "test-app",
  }),
}));

import * as fs from "node:fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { extractAppMetadata } from "../core/post-publish-metadata";

describe("check-meta-comment.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  describe("Token validation", () => {
    it("should return false when GITHUB_TOKEN is not available", async () => {
      vi.mocked(core.getInput).mockReturnValue("latest");
      delete process.env.GITHUB_TOKEN;

      const result = await checkMetaComment();

      expect(result).toBe(false);
      expect(core.info).toHaveBeenCalledWith("GITHUB_TOKEN not available");
    });
  });

  describe("PR context detection", () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = "fake-token";
    });

    it("should return false when not a PR deployment (no PR number)", async () => {
      vi.mocked(core.getInput).mockReturnValue("latest");
      vi.mocked(github.context as any).payload = {};

      const result = await checkMetaComment();

      expect(result).toBe(false);
      expect(core.info).toHaveBeenCalledWith("Not a PR deployment, no meta comment check needed");
    });

    it("should extract PR number from pull_request context", async () => {
      vi.mocked(core.getInput).mockReturnValue("latest");
      vi.mocked(github.context as any).payload = { pull_request: { number: 42 } };

      const mockOctokit = {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({ data: [] }),
          },
        },
      };
      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await checkMetaComment();

      expect(result).toBe(false);
      expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledWith({
        owner: "equinor",
        repo: "fusion-action-app-publish",
        issue_number: 42,
      });
    });

    it("should extract PR number from tag when not in context", async () => {
      vi.mocked(core.getInput).mockReturnValue("pr-123");
      vi.mocked(github.context as any).payload = {};

      const mockOctokit = {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({ data: [] }),
          },
        },
      };
      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await checkMetaComment();

      expect(result).toBe(false);
      expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledWith({
        owner: "equinor",
        repo: "fusion-action-app-publish",
        issue_number: 123,
      });
    });
  });

  describe("Meta comment detection", () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = "fake-token";
      vi.mocked(core.getInput).mockReturnValue("latest");
      vi.mocked(github.context as any).payload = {
        pull_request: { number: 42 },
      };
    });

    it("should return true when meta comment exists", async () => {
      const mockComments = [
        { id: 1, body: "Some comment" },
        {
          id: 2,
          body: "### 🚀 LATEST Deployed\ntest-app preview [application](https://example.com) in Fusion PR Portal.",
        },
      ];

      const mockOctokit = {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({ data: mockComments }),
          },
        },
      };
      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await checkMetaComment();

      expect(result).toBe(true);
      expect(core.setOutput).toHaveBeenCalledWith("exists", "true");
      expect(core.info).toHaveBeenCalledWith(
        "Meta comment already exists on PR #42, will skip posting",
      );
    });

    it("should return false when meta comment does not exist", async () => {
      const mockComments = [
        { id: 1, body: "Some comment" },
        { id: 2, body: "Another comment" },
      ];

      const mockOctokit = {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({ data: mockComments }),
          },
        },
      };
      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await checkMetaComment();

      expect(result).toBe(false);
      expect(core.setOutput).toHaveBeenCalledWith("exists", "false");
      expect(core.info).toHaveBeenCalledWith("No existing meta comment found on PR #42");
    });

    it("should return false when no comments exist on PR", async () => {
      const mockOctokit = {
        rest: {
          issues: {
            listComments: vi.fn().mockResolvedValue({ data: [] }),
          },
        },
      };
      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await checkMetaComment();

      expect(result).toBe(false);
      expect(core.setOutput).toHaveBeenCalledWith("exists", "false");
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = "fake-token";
      vi.mocked(core.getInput).mockReturnValue("latest");
      vi.mocked(github.context as any).payload = {
        pull_request: { number: 42 },
      };
    });

    it("should handle API errors gracefully and return false", async () => {
      const mockError = new Error("API Error");
      const mockOctokit = {
        rest: {
          issues: {
            listComments: vi.fn().mockRejectedValue(mockError),
          },
        },
      };
      vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

      const result = await checkMetaComment();

      expect(result).toBe(false);
      expect(core.warning).toHaveBeenCalledWith(
        "Failed to check for existing meta comment: API Error",
      );
    });

    it("should handle generic errors and fail", async () => {
      const mockError = new Error("Unknown error");
      vi.mocked(core.getInput).mockImplementation(() => {
        throw mockError;
      });

      await expect(checkMetaComment()).rejects.toThrow("Unknown error");
      expect(core.setFailed).toHaveBeenCalledWith("Check meta comment failed: Unknown error");
    });
  });
});
