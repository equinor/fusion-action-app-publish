import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { g as getInput, i as info, s as setOutput, a as setFailed, w as warning } from "./core.js";
import { g as getOctokit, c as context } from "./github.js";
import { extractAppMetadata } from "./extract-metadata.js";
function generateAppUrl(meta, env, tag) {
  const appKey = meta.key;
  if (!appKey) {
    throw new Error("App key not found in metadata");
  }
  const envUrls = {
    ci: "https://fusion.ci.fusion-dev.net",
    fqa: "https://fusion.fqa.fusion-dev.net",
    fprd: "https://fusion.equinor.com",
    tr: "https://fusion.tr.fusion-dev.net",
    next: "https://next.fusion.ci.fusion-dev.net"
  };
  const baseUrl = envUrls[env] || envUrls.fprd;
  if (!tag.startsWith("latest")) {
    return `${baseUrl}/apps/${appKey}?$tag=${tag}`;
  }
  return `${baseUrl}/apps/${appKey}`;
}
async function postPrComment(meta, tag, appUrl) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      info("GITHUB_TOKEN not available, skipping PR comment");
      return;
    }
    const octokit = getOctokit(token);
    const context$1 = context;
    const prNumber = context$1.payload.pull_request?.number || (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);
    if (!prNumber) {
      info("Not a PR deployment, skipping PR comment");
      return;
    }
    const appName = meta.name;
    const commentBody = `
### 🚀 ${tag.toLocaleUpperCase()} Deployed
Preview [${appName}](${appUrl}) in Fusion PR Portal.
    `;
    await octokit.rest.issues.createComment({
      owner: context$1.repo.owner,
      repo: context$1.repo.repo,
      issue_number: prNumber,
      body: commentBody
    });
    info(`Posted deployment comment to PR #${prNumber}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    warning(`Failed to post PR comment: ${message}`);
  }
}
async function postPublishMetadata() {
  try {
    const artifact = getInput("artifact");
    const env = getInput("env");
    const tag = getInput("tag");
    const workingDirectory = getInput("working-directory") || ".";
    info(`Processing artifact: ${artifact}`);
    info(`Environment: ${env}`);
    info(`Tag: ${tag}`);
    const artifactPath = path.resolve(workingDirectory, artifact);
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }
    const meta = await extractAppMetadata(artifactPath);
    const appName = meta.name;
    const appVersion = meta.version || "unknown";
    const appKey = meta.key;
    info(`App Name: ${appName}`);
    info(`App Version: ${appVersion}`);
    info(`App Key: ${appKey}`);
    const appUrl = generateAppUrl(meta, env, tag);
    info(`App URL: ${appUrl}`);
    setOutput("app-name", appName);
    setOutput("app-version", appVersion);
    setOutput("app-key", appKey);
    setOutput("app-url", appUrl);
    const publishInfo = `🚀 **${appName}** v${appVersion} deployed to **${env.toUpperCase()}**
[Open Application](${appUrl})`;
    setOutput("publish-info", publishInfo);
    await postPrComment(meta, tag, appUrl);
    info("Post-publish metadata processing completed successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setFailed(`Post-publish metadata failed: ${message}`);
  }
}
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  postPublishMetadata();
}
export {
  generateAppUrl,
  postPrComment,
  postPublishMetadata
};
//# sourceMappingURL=post-publish-metadata.js.map
