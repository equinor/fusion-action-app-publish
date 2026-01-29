import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { c as coreExports } from "./core.js";
import { g as githubExports } from "./github.js";
async function checkMetaComment() {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      coreExports.info("GITHUB_TOKEN not available");
      return false;
    }
    const context = githubExports.context;
    const tag = coreExports.getInput("tag");
    const prNumber = context.payload.pull_request?.number || (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);
    if (!prNumber) {
      coreExports.info("Not a PR deployment, no meta comment check needed");
      return false;
    }
    const octokit = githubExports.getOctokit(token);
    try {
      const comments = await octokit.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber
      });
      const exists = comments.data.some(
        (comment) => comment.body?.includes(`### 🚀 ${tag.toLocaleUpperCase()} Deployed`)
      );
      if (exists) {
        coreExports.info(`Meta comment already exists on PR #${prNumber}, will skip posting`);
        coreExports.setOutput("exists", "true");
      } else {
        coreExports.info(`No existing meta comment found on PR #${prNumber}`);
        coreExports.setOutput("exists", "false");
      }
      return exists;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      coreExports.warning(`Failed to check for existing meta comment: ${message}`);
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    coreExports.setFailed(`Check meta comment failed: ${message}`);
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
