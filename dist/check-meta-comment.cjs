#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("@actions/core");
const github = require("@actions/github");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const core__namespace = /* @__PURE__ */ _interopNamespaceDefault(core);
const github__namespace = /* @__PURE__ */ _interopNamespaceDefault(github);
async function checkMetaComment() {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core__namespace.info("GITHUB_TOKEN not available");
      return false;
    }
    const context = github__namespace.context;
    const tag = core__namespace.getInput("tag");
    const prNumber = context.payload.pull_request?.number || (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);
    if (!prNumber) {
      core__namespace.info("Not a PR deployment, no meta comment check needed");
      return false;
    }
    const octokit = github__namespace.getOctokit(token);
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
        core__namespace.info(`Meta comment already exists on PR #${prNumber}, will skip posting`);
        core__namespace.setOutput("exists", "true");
      } else {
        core__namespace.info(`No existing meta comment found on PR #${prNumber}`);
        core__namespace.setOutput("exists", "false");
      }
      return exists;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      core__namespace.warning(`Failed to check for existing meta comment: ${message}`);
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core__namespace.setFailed(`Check meta comment failed: ${message}`);
    throw error;
  }
}
if (require.main === module) {
  checkMetaComment();
}
exports.checkMetaComment = checkMetaComment;
//# sourceMappingURL=check-meta-comment.cjs.map
