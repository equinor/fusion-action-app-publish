/**
 * post-publish-metadata.ts
 * Posts metadata about the published application for the GitHub Action
 * Used as part of GitHub Action workflows to provide publish information
 */

import { exec as execCallback } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

import * as core from "@actions/core";
import * as github from "@actions/github";

import type { AppMetadata, ExecResult } from "../types/metadata";

const exec = promisify(execCallback);

/**
 * Extracts app metadata from the artifact
 * Uses `unzip -p` to read the metadata directly from the zip file
 * without extracting to temporary files for better performance and security
 * @param artifactPath - Path to the artifact
 * @returns Parsed app metadata with mapped fields
 */
export async function extractAppMetadata(artifactPath: string): Promise<AppMetadata> {
  try {
    const artifactExtension = path.extname(artifactPath).toLowerCase();
    if (artifactExtension !== ".zip") {
      throw new Error(
        `Unsupported artifact format: ${artifactExtension}. Only .zip files are supported.`,
      );
    }

    const { stdout, stderr }: ExecResult = await exec(
      `unzip -p "${artifactPath}" "*/metadata.json"`,
    );

    if (stderr) {
      core.warning(`Warning from unzip: ${stderr}`);
    }

    const metadataContent = stdout.trim();
    if (!metadataContent) {
      throw new Error("metadata.json not found in artifact");
    }

    try {
      const metadata: AppMetadata = JSON.parse(metadataContent);
      metadata.key = metadata.name;
      return metadata;
    } catch (parseError: unknown) {
      const message = parseError instanceof Error ? parseError.message : "Unknown parse error";
      throw new Error(`Invalid JSON format in metadata.json: ${message}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.error(`Failed to extract app metadata: ${message}`);
    throw error;
  }
}

/**
 * Generates application URL based on environment and app info
 * @param meta - App metadata object
 * @param env - Environment (ci, fqa, fprd, tr, next)
 * @param tag - Deployment tag
 * @returns Application URL
 */
export function generateAppUrl(meta: AppMetadata, env: string, tag: string): string {
  const appKey = meta.key;

  if (!appKey) {
    throw new Error("App key not found in metadata");
  }

  // Environment-specific Fusion portal base URLs
  const envUrls: Record<string, string> = {
    ci: "https://fusion.ci.fusion-dev.net",
    fqa: "https://fusion.fqa.fusion-dev.net",
    fprd: "https://fusion.equinor.com",
    tr: "https://fusion.tr.fusion-dev.net",
    next: "https://fusion.next.fusion-dev.net",
  };

  const baseUrl = envUrls[env] || envUrls.fprd;

  // Construct application URL
  if (!tag.startsWith("latest")) {
    return `${baseUrl}/apps/${appKey}?$tag=${tag}`;
  }

  return `${baseUrl}/apps/${appKey}`;
}

/**
 * Posts a comment to the PR with the application URL and deployment info
 * @param meta - App metadata object
 * @param env - Environment
 * @param tag - Deployment tag
 * @param appUrl - Application URL
 * @param appAdminUrl - Application Admin URL
 */
export async function postPrComment(
  meta: AppMetadata,
  env: string,
  tag: string,
  appUrl: string,
  appAdminUrl: string,
): Promise<void> {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      core.info("GITHUB_TOKEN not available, skipping PR comment");
      return;
    }

    const octokit = github.getOctokit(token);
    const context = github.context;

    // Only post comment for PR events or when PR number is available
    const prNumber =
      context.payload.pull_request?.number ||
      (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);

    if (!prNumber) {
      core.info("Not a PR deployment, skipping PR comment");
      return;
    }

    const appName = meta.name;
    const appVersion = meta.version || "unknown";
    const appDescription = meta.description || "";

    // Create formatted comment with deployment details
    const commentBody = `## 🚀 Application Deployed Successfully

  **Application:** ${appName}  
  **Version:** ${appVersion}  
  **Environment:** ${env.toUpperCase()}  
  **Tag:** ${tag}  

  ${appDescription ? `**Description:** ${appDescription}\n\n` : ""}

  ### 🔗 Access Links
  - **Application:** [Open ${appName}](${appUrl})
  - **Fusion App Admin:** [Manage in Fusion App Admin](${appAdminUrl})
  - **App Config:** [View app config](${appAdminUrl}/config)

  ### 📋 Deployment Details
  - **App Key:** \`${meta.key}\`
  - **Bundle:** ${meta.entry?.path || "Not specified"}
  - **Build Time:** ${new Date().toISOString()}

  ---
  *Deployed via [fusion-action-app-publish](https://github.com/equinor/fusion-action-app-publish)*`;

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: commentBody,
    });

    core.info(`Posted deployment comment to PR #${prNumber}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.warning(`Failed to post PR comment: ${message}`);
  }
}

/**
 * Main function to extract metadata and post publish information
 */
export async function postPublishMetadata(): Promise<void> {
  try {
    const artifact = core.getInput("artifact");
    const env = core.getInput("env");
    const tag = core.getInput("tag");
    const workingDirectory = core.getInput("working-directory") || ".";

    core.info(`Processing artifact: ${artifact}`);
    core.info(`Environment: ${env}`);
    core.info(`Tag: ${tag}`);

    // Resolve artifact path
    const artifactPath = path.resolve(workingDirectory, artifact);

    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    // Extract app metadata from artifact
    const meta = await extractAppMetadata(artifactPath);

    const appName = meta.name;
    const appVersion = meta.version || "unknown";
    const appKey = meta.key;

    core.info(`App Name: ${appName}`);
    core.info(`App Version: ${appVersion}`);
    core.info(`App Key: ${appKey}`);

    // Generate application URL
    const appUrl = generateAppUrl(meta, env, tag);
    core.info(`App URL: ${appUrl}`);

    // Set outputs for use in other steps
    core.setOutput("app-name", appName);
    core.setOutput("app-version", appVersion);
    core.setOutput("app-key", appKey);
    core.setOutput("app-url", appUrl);

    // Generate app admin URL
    const appAdminBaseUrl = appUrl.split("/apps/")[0];
    const appAdminUrl = `${appAdminBaseUrl}/apps/app-admin/apps/${appKey}`;
    core.setOutput("app-admin-url", appAdminUrl);

    // Create formatted publish info for PR comments
    const publishInfo = `🚀 **${appName}** v${appVersion} deployed to **${env.toUpperCase()}**\n[Open Application](${appUrl})`;
    core.setOutput("publish-info", publishInfo);

    // Post comment to PR if applicable
    await postPrComment(meta, env, tag, appUrl, appAdminUrl);

    core.info("Post-publish metadata processing completed successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.setFailed(`Post-publish metadata failed: ${message}`);
  }
}

// Execute if called directly
if (require.main === module) {
  postPublishMetadata();
}
