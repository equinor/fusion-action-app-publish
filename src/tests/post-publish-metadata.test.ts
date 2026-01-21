import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAppUrl, postPrComment } from "../core/post-publish-metadata";
import type { AppMetadata } from "../types";

vi.mock("@actions/core");

vi.mock("@actions/github", () => {
  const mockContext = {
    repo: { owner: "test-owner", repo: "test-repo" },
    payload: {},
  };

  return {
    context: mockContext,
    getOctokit: vi.fn(),
  };
});

import * as core from "@actions/core";
import * as github from "@actions/github";

describe("post-publish-metadata.ts", () => {
  let mockOctokit: { rest: { issues: { createComment: ReturnType<typeof vi.fn> } } };

  beforeEach(() => {
    vi.clearAllMocks();

    mockOctokit = {
      rest: {
        issues: {
          createComment: vi.fn().mockResolvedValue({}),
        },
      },
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as any);

    // Reset context for each test
    github.context.payload = {};

    delete process.env.GITHUB_TOKEN;
  });

  describe("generateAppUrl", () => {
    it("should generate URL for fprd environment", () => {
      const manifest = { key: "my-app", name: "my-app" };
      const env = "fprd";
      const tag = "latest";

      const result = generateAppUrl(manifest, env, tag);

      expect(result).toBe("https://fusion.equinor.com/apps/my-app");
    });

    it("should generate URL with tag parameter for non-latest tags", () => {
      const manifest = { key: "my-app", name: "my-app" };
      const env = "fqa";
      const tag = "v1.2.3";

      const result = generateAppUrl(manifest, env, tag);

      expect(result).toBe("https://fusion.fqa.fusion-dev.net/apps/my-app?$tag=v1.2.3");
    });

    it("should generate URL when key is present", () => {
      const meta = { key: "my-app", name: "my-app" };
      const env = "ci";
      const tag = "latest";

      const result = generateAppUrl(meta, env, tag);

      expect(result).toBe("https://fusion.ci.fusion-dev.net/apps/my-app");
    });

    it("should generate URL with different environment", () => {
      const meta = { key: "my-app", name: "my-app" };
      const env = "tr";
      const tag = "latest";

      const result = generateAppUrl(meta, env, tag);

      expect(result).toBe("https://fusion.tr.fusion-dev.net/apps/my-app");
    });

    it("should handle all supported environments", () => {
      const manifest = { key: "test-app", name: "test-app" };
      const tag = "latest";

      expect(generateAppUrl(manifest, "ci", tag)).toBe(
        "https://fusion.ci.fusion-dev.net/apps/test-app",
      );

      expect(generateAppUrl(manifest, "fqa", tag)).toBe(
        "https://fusion.fqa.fusion-dev.net/apps/test-app",
      );

      expect(generateAppUrl(manifest, "fprd", tag)).toBe(
        "https://fusion.equinor.com/apps/test-app",
      );

      expect(generateAppUrl(manifest, "tr", tag)).toBe(
        "https://fusion.tr.fusion-dev.net/apps/test-app",
      );

      expect(generateAppUrl(manifest, "next", tag)).toBe(
        "https://fusion.next.fusion-dev.net/apps/test-app",
      );
    });

    it("should default to fprd URL for unknown environments", () => {
      const manifest = { key: "my-app", name: "my-app" };
      const env = "unknown-env";
      const tag = "latest";

      const result = generateAppUrl(manifest, env, tag);

      expect(result).toBe("https://fusion.equinor.com/apps/my-app");
    });

    it("should handle PR tags correctly", () => {
      const manifest = { key: "my-app", name: "my-app" };
      const env = "ci";
      const tag = "pr-123";

      const result = generateAppUrl(manifest, env, tag);

      expect(result).toBe("https://fusion.ci.fusion-dev.net/apps/my-app?$tag=pr-123");
    });

    it("should throw error when no app identifier found", () => {
      const meta = {
        description: "An app without key",
        name: "test",
      } as unknown as AppMetadata;
      const env = "fprd";
      const tag = "latest";

      expect(() => generateAppUrl(meta, env, tag)).toThrow("App key not found in metadata");
    });
  });

  describe("postPrComment", () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = "test-token";
    });

    it("should post comment for PR deployment", async () => {
      const meta = {
        name: "Test App",
        version: "1.0.0",
        key: "test-app",
        description: "A test application",
      };

      github.context.payload = { pull_request: { number: 123 } };

      await postPrComment(
        meta,
        "fprd",
        "v1.0.0",
        "https://fusion.equinor.com/apps/test-app",
        "https://fusion.equinor.com/admin/test-app",
      );

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        issue_number: 123,
        body: expect.stringContaining("🚀 Application Deployed Successfully"),
      });

      const calledWith = mockOctokit.rest.issues.createComment.mock.calls[0][0];
      expect(calledWith.body).toContain("Test App");
      expect(calledWith.body).toContain("1.0.0");
      expect(calledWith.body).toContain("FPRD");
      expect(calledWith.body).toContain("A test application");
    });

    it("should extract PR number from pr- tag", async () => {
      const meta = { name: "Test App", key: "test-app", version: "1.0.0" };
      github.context.payload = {}; // No PR in payload

      await postPrComment(
        meta,
        "ci",
        "pr-456",
        "https://fusion.ci.fusion-dev.net/apps/test-app",
        "https://admin.url",
      );

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({ issue_number: 456 }),
      );
    });

    it("should skip comment when no PR number available", async () => {
      const meta = { name: "Test App", key: "test-app", version: "1.0.0" };
      github.context.payload = {}; // No PR context

      await postPrComment(meta, "fprd", "v1.0.0", "https://app.url", "https://admin.url");

      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
      expect(vi.mocked(core.info)).toHaveBeenCalledWith("Not a PR deployment, skipping PR comment");
    });

    it("should skip comment when GITHUB_TOKEN not available", async () => {
      delete process.env.GITHUB_TOKEN;
      const meta = { name: "Test App", key: "test-app", version: "1.0.0" };

      await postPrComment(meta, "fprd", "v1.0.0", "https://app.url", "https://admin.url");

      expect(vi.mocked(core.info)).toHaveBeenCalledWith(
        "GITHUB_TOKEN not available, skipping PR comment",
      );
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
    });

    it("should handle comment creation errors gracefully", async () => {
      const meta = { name: "Test App", key: "test-app", version: "1.0.0" };
      github.context.payload = { pull_request: { number: 123 } };

      mockOctokit.rest.issues.createComment.mockRejectedValue(new Error("API Error"));

      await postPrComment(meta, "fprd", "v1.0.0", "https://app.url", "https://admin.url");

      expect(vi.mocked(core.warning)).toHaveBeenCalledWith("Failed to post PR comment: API Error");
    });

    it("should use fallback values for missing metadata fields", async () => {
      const meta = { name: "test-app", key: "test-app" }; // Missing version, description
      github.context.payload = { pull_request: { number: 123 } };

      await postPrComment(meta, "fprd", "v1.0.0", "https://app.url", "https://admin.url");

      const calledWith = mockOctokit.rest.issues.createComment.mock.calls[0][0];
      expect(calledWith.body).toContain("**Application:** test-app");
      expect(calledWith.body).toContain("**Version:** unknown");
      expect(calledWith.body).not.toContain("**Description:**");
    });

    it("should include all required sections in comment body", async () => {
      const meta = {
        name: "Test App",
        version: "1.0.0",
        key: "test-app",
        entry: { path: "./bundle.js" },
      };
      github.context.payload = { pull_request: { number: 123 } };

      await postPrComment(
        meta,
        "fprd",
        "v1.0.0",
        "https://fusion.equinor.com/apps/test-app",
        "https://admin.url",
      );

      const calledWith = mockOctokit.rest.issues.createComment.mock.calls[0][0];
      const body = calledWith.body;

      expect(body).toContain("🚀 Application Deployed Successfully");
      expect(body).toContain("🔗 Access Links");
      expect(body).toContain("📋 Deployment Details");
      expect(body).toContain("Bundle:** ./bundle.js");
      expect(body).toContain("fusion-action-app-publish");
    });
  });
});
