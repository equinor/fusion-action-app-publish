import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { i as info, g as getInput, s as setOutput, w as warning, a as setFailed } from "./core.js";
import { c as context, g as getOctokit } from "./github.js";
async function checkMetaComment() {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      info("GITHUB_TOKEN not available");
      return false;
    }
    const context$1 = context;
    const tag = getInput("tag");
    const prNumber = context$1.payload.pull_request?.number || (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);
    if (!prNumber) {
      info("Not a PR deployment, no meta comment check needed");
      return false;
    }
    const octokit = getOctokit(token);
    try {
      const comments = await octokit.rest.issues.listComments({
        owner: context$1.repo.owner,
        repo: context$1.repo.repo,
        issue_number: prNumber
      });
      const exists = comments.data.some(
        (comment) => comment.body?.includes(`### 🚀 ${tag.toLocaleUpperCase()} Deployed`)
      );
      if (exists) {
        info(`Meta comment already exists on PR #${prNumber}, will skip posting`);
        setOutput("exists", "true");
      } else {
        info(`No existing meta comment found on PR #${prNumber}`);
        setOutput("exists", "false");
      }
      return exists;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      warning(`Failed to check for existing meta comment: ${message}`);
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setFailed(`Check meta comment failed: ${message}`);
    throw error;
  }
}
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  checkMetaComment();
}
export {
  checkMetaComment
};
//# sourceMappingURL=check-meta-comment.js.map
