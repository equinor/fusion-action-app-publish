import { exec as exec$1 } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { c as coreExports } from "./core.js";
import { g as githubExports } from "./github.js";
const exec = promisify(exec$1);
async function extractAppMetadata(artifactPath) {
  try {
    const artifactExtension = path.extname(artifactPath).toLowerCase();
    if (artifactExtension !== ".zip") {
      throw new Error(
        `Unsupported artifact format: ${artifactExtension}. Only .zip files are supported.`
      );
    }
    const { stdout, stderr } = await exec(
      `unzip -p "${artifactPath}" "*/metadata.json"`
    );
    if (stderr) {
      coreExports.warning(`Warning from unzip: ${stderr}`);
    }
    const metadataContent = stdout.trim();
    if (!metadataContent) {
      throw new Error("metadata.json not found in artifact");
    }
    try {
      const metadata = JSON.parse(metadataContent);
      metadata.key = metadata.name;
      return metadata;
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Unknown parse error";
      throw new Error(`Invalid JSON format in metadata.json: ${message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    coreExports.error(`Failed to extract app metadata: ${message}`);
    throw error;
  }
}
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
    next: "https://fusion.next.fusion-dev.net"
  };
  const baseUrl = envUrls[env] || envUrls.fprd;
  if (!tag.startsWith("latest")) {
    return `${baseUrl}/apps/${appKey}?$tag=${tag}`;
  }
  return `${baseUrl}/apps/${appKey}`;
}
async function postPrComment(meta, env, tag, appUrl, appAdminUrl) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      coreExports.info("GITHUB_TOKEN not available, skipping PR comment");
      return;
    }
    const octokit = githubExports.getOctokit(token);
    const context = githubExports.context;
    const prNumber = context.payload.pull_request?.number || (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);
    if (!prNumber) {
      coreExports.info("Not a PR deployment, skipping PR comment");
      return;
    }
    const appName = meta.name;
    const appVersion = meta.version || "unknown";
    const appDescription = meta.description || "";
    const commentBody = `<!-- fusion-app-publish-meta -->
## 🚀 Application Deployed Successfully

  **Application:** ${appName}  
  **Version:** ${appVersion}  
  **Environment:** ${env.toUpperCase()}  
  **Tag:** ${tag}  

  ${appDescription ? `**Description:** ${appDescription}

` : ""}

  ### 🔗 Access Links
  - **Application:** [Open ${appName}](${appUrl})
  - **Fusion App Admin:** [Manage in Fusion App Admin](${appAdminUrl})
  - **App Config:** [View app config](${appAdminUrl}/config)

  ### 📋 Deployment Details
  - **App Key:** \`${meta.key}\`
  - **Bundle:** ${meta.entry?.path || "Not specified"}
  - **Build Time:** ${(/* @__PURE__ */ new Date()).toISOString()}

  ---
  *Deployed via [fusion-action-app-publish](https://github.com/equinor/fusion-action-app-publish)*`;
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: commentBody
    });
    coreExports.info(`Posted deployment comment to PR #${prNumber}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    coreExports.warning(`Failed to post PR comment: ${message}`);
  }
}
async function postPublishMetadata() {
  try {
    const artifact = coreExports.getInput("artifact");
    const env = coreExports.getInput("env");
    const tag = coreExports.getInput("tag");
    const workingDirectory = coreExports.getInput("working-directory") || ".";
    coreExports.info(`Processing artifact: ${artifact}`);
    coreExports.info(`Environment: ${env}`);
    coreExports.info(`Tag: ${tag}`);
    const artifactPath = path.resolve(workingDirectory, artifact);
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }
    const meta = await extractAppMetadata(artifactPath);
    const appName = meta.name;
    const appVersion = meta.version || "unknown";
    const appKey = meta.key;
    coreExports.info(`App Name: ${appName}`);
    coreExports.info(`App Version: ${appVersion}`);
    coreExports.info(`App Key: ${appKey}`);
    const appUrl = generateAppUrl(meta, env, tag);
    coreExports.info(`App URL: ${appUrl}`);
    coreExports.setOutput("app-name", appName);
    coreExports.setOutput("app-version", appVersion);
    coreExports.setOutput("app-key", appKey);
    coreExports.setOutput("app-url", appUrl);
    const appAdminBaseUrl = appUrl.split("/apps/")[0];
    const appAdminUrl = `${appAdminBaseUrl}/apps/app-admin/apps/${appKey}`;
    coreExports.setOutput("app-admin-url", appAdminUrl);
    const publishInfo = `🚀 **${appName}** v${appVersion} deployed to **${env.toUpperCase()}**
[Open Application](${appUrl})`;
    coreExports.setOutput("publish-info", publishInfo);
    await postPrComment(meta, env, tag, appUrl, appAdminUrl);
    coreExports.info("Post-publish metadata processing completed successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    coreExports.setFailed(`Post-publish metadata failed: ${message}`);
  }
}
if (require.main === module) {
  postPublishMetadata();
}
export {
  extractAppMetadata,
  generateAppUrl,
  postPrComment,
  postPublishMetadata
};
//# sourceMappingURL=post-publish-metadata.js.map
