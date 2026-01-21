#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const node_child_process = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const require$$1 = require("node:util");
const core = require("./core.js");
const github = require("./github.js");
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
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const exec = require$$1.promisify(node_child_process.exec);
async function extractAppMetadata(artifactPath) {
  try {
    const artifactExtension = path__namespace.extname(artifactPath).toLowerCase();
    if (artifactExtension !== ".zip") {
      throw new Error(
        `Unsupported artifact format: ${artifactExtension}. Only .zip files are supported.`
      );
    }
    const { stdout, stderr } = await exec(
      `unzip -p "${artifactPath}" "*/metadata.json"`
    );
    if (stderr) {
      core.coreExports.warning(`Warning from unzip: ${stderr}`);
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
    core.coreExports.error(`Failed to extract app metadata: ${message}`);
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
      core.coreExports.info("GITHUB_TOKEN not available, skipping PR comment");
      return;
    }
    const octokit = github.githubExports.getOctokit(token);
    const context = github.githubExports.context;
    const prNumber = context.payload.pull_request?.number || (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);
    if (!prNumber) {
      core.coreExports.info("Not a PR deployment, skipping PR comment");
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
    core.coreExports.info(`Posted deployment comment to PR #${prNumber}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.coreExports.warning(`Failed to post PR comment: ${message}`);
  }
}
async function postPublishMetadata() {
  try {
    const artifact = core.coreExports.getInput("artifact");
    const env = core.coreExports.getInput("env");
    const tag = core.coreExports.getInput("tag");
    const workingDirectory = core.coreExports.getInput("working-directory") || ".";
    core.coreExports.info(`Processing artifact: ${artifact}`);
    core.coreExports.info(`Environment: ${env}`);
    core.coreExports.info(`Tag: ${tag}`);
    const artifactPath = path__namespace.resolve(workingDirectory, artifact);
    if (!fs__namespace.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }
    const meta = await extractAppMetadata(artifactPath);
    const appName = meta.name;
    const appVersion = meta.version || "unknown";
    const appKey = meta.key;
    core.coreExports.info(`App Name: ${appName}`);
    core.coreExports.info(`App Version: ${appVersion}`);
    core.coreExports.info(`App Key: ${appKey}`);
    const appUrl = generateAppUrl(meta, env, tag);
    core.coreExports.info(`App URL: ${appUrl}`);
    core.coreExports.setOutput("app-name", appName);
    core.coreExports.setOutput("app-version", appVersion);
    core.coreExports.setOutput("app-key", appKey);
    core.coreExports.setOutput("app-url", appUrl);
    const appAdminBaseUrl = appUrl.split("/apps/")[0];
    const appAdminUrl = `${appAdminBaseUrl}/apps/app-admin/apps/${appKey}`;
    core.coreExports.setOutput("app-admin-url", appAdminUrl);
    const publishInfo = `🚀 **${appName}** v${appVersion} deployed to **${env.toUpperCase()}**
[Open Application](${appUrl})`;
    core.coreExports.setOutput("publish-info", publishInfo);
    await postPrComment(meta, env, tag, appUrl, appAdminUrl);
    core.coreExports.info("Post-publish metadata processing completed successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.coreExports.setFailed(`Post-publish metadata failed: ${message}`);
  }
}
if (require.main === module) {
  postPublishMetadata();
}
exports.extractAppMetadata = extractAppMetadata;
exports.generateAppUrl = generateAppUrl;
exports.postPrComment = postPrComment;
exports.postPublishMetadata = postPublishMetadata;
//# sourceMappingURL=post-publish-metadata.cjs.map
