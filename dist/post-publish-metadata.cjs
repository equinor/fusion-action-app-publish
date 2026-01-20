#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("node:fs");
const path = require("node:path");
const node_util = require("node:util");
const node_child_process = require("node:child_process");
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
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const exec = node_util.promisify(node_child_process.exec);
async function extractAppMetadata(artifactPath) {
  try {
    const artifactExtension = path__namespace.extname(artifactPath).toLowerCase();
    if (artifactExtension !== ".zip") {
      throw new Error(`Unsupported artifact format: ${artifactExtension}. Only .zip files are supported.`);
    }
    const { stdout, stderr } = await exec(`unzip -p "${artifactPath}" "*/metadata.json"`);
    if (stderr) {
      core__namespace.warning(`Warning from unzip: ${stderr}`);
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
      throw new Error(`Invalid JSON format in metadata.json: ${parseError.message}`);
    }
  } catch (error) {
    core__namespace.error(`Failed to extract app metadata: ${error.message}`);
    throw error;
  }
}
function generateAppUrl(meta, env, tag) {
  const appKey = meta.key;
  if (!appKey) {
    throw new Error("App key not found in metadata");
  }
  const envUrls = {
    "ci": "https://fusion.ci.fusion-dev.net",
    "fqa": "https://fusion.fqa.fusion-dev.net",
    "fprd": "https://fusion.equinor.com",
    "tr": "https://fusion.tr.fusion-dev.net",
    "next": "https://fusion.next.fusion-dev.net"
  };
  const baseUrl = envUrls[env] || envUrls["fprd"];
  if (!tag.startsWith("latest")) {
    return `${baseUrl}/apps/${appKey}?$tag=${tag}`;
  }
  return `${baseUrl}/apps/${appKey}`;
}
async function postPrComment(meta, env, tag, appUrl, appAdminUrl) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core__namespace.info("GITHUB_TOKEN not available, skipping PR comment");
      return;
    }
    const octokit = github__namespace.getOctokit(token);
    const context = github__namespace.context;
    const prNumber = context.payload.pull_request?.number || (tag && tag.startsWith("pr-") ? parseInt(tag.replace("pr-", "")) : null);
    if (!prNumber) {
      core__namespace.info("Not a PR deployment, skipping PR comment");
      return;
    }
    const appName = meta.name;
    const appVersion = meta.version || "unknown";
    const appDescription = meta.description || "";
    const commentBody = `## 🚀 Application Deployed Successfully

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
    core__namespace.info(`Posted deployment comment to PR #${prNumber}`);
  } catch (error) {
    core__namespace.warning(`Failed to post PR comment: ${error.message}`);
  }
}
async function postPublishMetadata() {
  try {
    const artifact = core__namespace.getInput("artifact");
    const env = core__namespace.getInput("env");
    const tag = core__namespace.getInput("tag");
    const workingDirectory = core__namespace.getInput("working-directory") || ".";
    core__namespace.info(`Processing artifact: ${artifact}`);
    core__namespace.info(`Environment: ${env}`);
    core__namespace.info(`Tag: ${tag}`);
    const artifactPath = path__namespace.resolve(workingDirectory, artifact);
    if (!fs__namespace.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }
    const meta = await extractAppMetadata(artifactPath);
    const appName = meta.name;
    const appVersion = meta.version || "unknown";
    const appKey = meta.key;
    core__namespace.info(`App Name: ${appName}`);
    core__namespace.info(`App Version: ${appVersion}`);
    core__namespace.info(`App Key: ${appKey}`);
    const appUrl = generateAppUrl(meta, env, tag);
    core__namespace.info(`App URL: ${appUrl}`);
    core__namespace.setOutput("app-name", appName);
    core__namespace.setOutput("app-version", appVersion);
    core__namespace.setOutput("app-key", appKey);
    core__namespace.setOutput("app-url", appUrl);
    const appAdminBaseUrl = appUrl.split("/apps/")[0];
    const appAdminUrl = `${appAdminBaseUrl}/apps/app-admin/apps/${appKey}`;
    core__namespace.setOutput("app-admin-url", appAdminUrl);
    const publishInfo = `🚀 **${appName}** v${appVersion} deployed to **${env.toUpperCase()}**
[Open Application](${appUrl})`;
    core__namespace.setOutput("publish-info", publishInfo);
    await postPrComment(meta, env, tag, appUrl, appAdminUrl);
    core__namespace.info("Post-publish metadata processing completed successfully");
  } catch (error) {
    core__namespace.setFailed(`Post-publish metadata failed: ${error.message}`);
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
