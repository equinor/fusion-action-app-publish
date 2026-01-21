#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("./core.js");
const github = require("./github.js");
async function checkMetaComment() {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core.coreExports.info("GITHUB_TOKEN not available");
      return false;
    }
    const context = github.githubExports.context;
    const tag = core.coreExports.getInput("tag");
    const prNumber = context.payload.pull_request?.number || (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);
    if (!prNumber) {
      core.coreExports.info("Not a PR deployment, no meta comment check needed");
      return false;
    }
    const octokit = github.githubExports.getOctokit(token);
    try {
      const comments = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber
      });
      const exists = comments.data.some(
        (comment) => comment.body?.includes("<!-- fusion-app-publish-meta -->")
      );
      if (exists) {
        core.coreExports.info(`Meta comment already exists on PR #${prNumber}, will skip posting`);
        core.coreExports.setOutput("exists", "true");
      } else {
        core.coreExports.info(`No existing meta comment found on PR #${prNumber}`);
        core.coreExports.setOutput("exists", "false");
      }
      return exists;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      core.coreExports.warning(`Failed to check for existing meta comment: ${message}`);
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.coreExports.setFailed(`Check meta comment failed: ${message}`);
    throw error;
  }
}
if (require.main === module) {
  checkMetaComment();
}
exports.checkMetaComment = checkMetaComment;
//# sourceMappingURL=check-meta-comment.cjs.map
