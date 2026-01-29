/**
 * check-meta-comment.ts
 *
 * Checks if a meta comment already exists on the PR to avoid duplicate comments
 *
 * This module is used to detect existing deployment comments before posting a new one,
 * preventing duplicate comments when the action runs multiple times (e.g., on retries).
 *
 * Uses GitHub's Issues API to:
 * - List all comments on the PR
 * - Search for meta-comment identifier (HTML comment)
 * - Report existence back to caller
 *
 * This enables workflows to conditionally post comments:
 * - Skip posting if comment already exists
 * - Post fresh comment on first deployment
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "@actions/core";
import * as github from "@actions/github";

/**
 * Checks if a meta comment already exists on the PR
 *
 * Detection:
 * - Requires GITHUB_TOKEN environment variable (for API access)
 * - Determines PR number from GitHub context or tag (pr-{number} format)
 * - Queries GitHub API for all comments on the issue
 * - Searches for meta-comment identifier: `<!-- fusion-app-publish-meta -->`
 *
 * Sets GitHub Action output:
 * - `exists`: 'true' if comment found, 'false' otherwise
 *
 * Gracefully handles:
 * - Missing GITHUB_TOKEN (returns false, logs info)
 * - Non-PR context (returns false, logs info)
 * - API errors (logs warning, returns false, continues)
 *
 * @returns Promise resolving to true if meta comment exists, false otherwise
 * @throws Only throws after calling core.setFailed() on unexpected errors
 * @example
 * const exists = await checkMetaComment();
 * if (!exists) {
 *   await postPrComment(meta, env, tag, appUrl, appAdminUrl);
 * }
 */
export async function checkMetaComment(): Promise<boolean> {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core.info("GITHUB_TOKEN not available");
      return false;
    }

    const context = github.context;
    const tag = core.getInput("tag");

    // Extract PR number from context or tag
    const prNumber =
      context.payload.pull_request?.number ||
      (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);

    if (!prNumber) {
      core.info("Not a PR deployment, no meta comment check needed");
      return false;
    }

    const octokit = github.getOctokit(token);

    try {
      const comments = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
      });

      const exists = comments.data.some((comment) =>
        comment.body?.includes(`### 🚀 ${tag.toLocaleUpperCase()} Deployed`),
      );

      if (exists) {
        core.info(`Meta comment already exists on PR #${prNumber}, will skip posting`);
        core.setOutput("exists", "true");
      } else {
        core.info(`No existing meta comment found on PR #${prNumber}`);
        core.setOutput("exists", "false");
      }

      return exists;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      core.warning(`Failed to check for existing meta comment: ${message}`);
      return false;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.setFailed(`Check meta comment failed: ${message}`);
    throw error;
  }
}

// Execute if called directly
const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  checkMetaComment();
}
