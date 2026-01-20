/**
 * check-meta-comment.ts
 * Checks if a meta comment already exists on the PR to avoid duplicate comments
 */

import * as core from "@actions/core";
import * as github from "@actions/github";

/**
 * Checks if a meta comment already exists on the PR
 * @returns true if meta comment exists, false otherwise
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
        comment.body?.includes("<!-- fusion-app-publish-meta -->"),
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
if (require.main === module) {
  checkMetaComment();
}
