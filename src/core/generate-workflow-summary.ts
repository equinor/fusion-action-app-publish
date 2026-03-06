/**
 * generate-workflow-summary.ts
 * Generates enhanced workflow summary for GitHub Actions with app metadata
 * Used to provide comprehensive deployment information in GitHub workflow summaries
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "@actions/core";

/**
 * Interface for workflow summary data
 */
export interface WorkflowSummaryData {
  appName: string;
  appVersion: string;
  environment: string;
  tag: string;
  appUrl?: string;
}

/**
 * Generates enhanced workflow summary with app metadata and deployment information
 *
 * Creates a structured GitHub workflow summary following the format:
 * - Title: "{app-name} {app-version} published to {environment}"
 * - Body: Tag and App URL information
 *
 * @param data - Summary data containing app metadata and deployment info
 * @throws Error if required data is missing
 * @example
 * const summaryData = {
 *   appName: 'my-fusion-app',
 *   appVersion: '1.2.3',
 *   environment: 'fprd',
 *   tag: 'v1.2.3',
 *   appUrl: 'https://fusion.equinor.com/apps/my-fusion-app'
 * };
 * await generateWorkflowSummary(summaryData);
 */
export async function generateWorkflowSummary(data: WorkflowSummaryData): Promise<void> {
  // Validate required data
  if (!data.appName || !data.appVersion || !data.environment || !data.tag) {
    throw new Error(
      "Missing required summary data: appName, appVersion, environment, and tag are required",
    );
  }

  try {
    // Generate title following the proposed format
    const title = `${data.appName} ${data.appVersion} published to ${data.environment}`;

    // Build summary content
    let summaryContent = `## 🚀 ${title}\n\n`;
    summaryContent += `**Tag:** ${data.tag}\n`;

    if (data.appUrl) {
      summaryContent += `**App URL:** ${data.appUrl}\n`;
    }

    // Write to GitHub Step Summary
    await fs.promises.appendFile(process.env.GITHUB_STEP_SUMMARY || "", summaryContent);

    core.info(`Workflow summary generated: ${title}`);
  } catch (error) {
    core.error(`Failed to generate workflow summary: ${error}`);
    throw error;
  }
}

/**
 * Main entry point for the workflow summary generation action
 * Reads data from GitHub Action inputs and environment variables
 */
export async function main(): Promise<void> {
  try {
    // Read input data from action outputs/environment
    const appName = core.getInput("app-name") || process.env.INPUT_APP_NAME || "";
    const appVersion = core.getInput("app-version") || process.env.INPUT_APP_VERSION || "";
    const environment = core.getInput("environment") || process.env.INPUT_ENVIRONMENT || "";
    const tag = core.getInput("tag") || process.env.INPUT_TAG || "";
    const appUrl = core.getInput("app-url") || process.env.INPUT_APP_URL || "";

    const summaryData: WorkflowSummaryData = {
      appName,
      appVersion,
      environment,
      tag,
      appUrl: appUrl || undefined,
    };

    await generateWorkflowSummary(summaryData);
  } catch (error) {
    core.setFailed(`Action failed with error ${error}`);
  }
}

// Execute when called directly as a script
const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  void main();
}
