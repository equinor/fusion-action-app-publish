import { a as setFailed, i as info, o as setOutput, r as getInput, s as warning } from "./core.js";
import { n as getOctokit, t as context } from "./github.js";
import { extractAppMetadata } from "./extract-metadata.js";
import * as fs from "node:fs";
import * as path$1 from "node:path";
import { fileURLToPath } from "node:url";
//#region src/core/post-publish-metadata.ts
/**
* post-publish-metadata.ts
* Posts metadata about the published application for the GitHub Action
* Used as part of GitHub Action workflows to provide publish information
*/
/**
* Generates application URL based on environment and app info
*
* URLs are constructed based on the environment:
* - ci: https://fusion.ci.fusion-dev.net
* - fqa: https://fusion.fqa.fusion-dev.net
* - fprd: https://fusion.equinor.com (production)
* - tr: https://fusion.tr.fusion-dev.net
* - next: https://next.fusion.ci.fusion-dev.net
*
* For non-latest tags, includes tag as query parameter for version tracking
*
* @param meta - App metadata containing application key
* @param env - Deployment environment (ci, fqa, fprd, tr, next)
* @param tag - Deployment tag/version identifier
* @returns Full application URL to access the deployed application
* @throws Error if app key is not found in metadata
* @example
* const url = generateAppUrl(meta, 'fprd', 'v1.0.0');
* // Returns: https://fusion.equinor.com/apps/my-app?$tag[my-app]=v1.0.0
*/
function generateAppUrl(meta, env, tag) {
	const appKey = meta.key;
	if (!appKey) throw new Error("App key not found in metadata");
	const envUrls = {
		ci: "https://fusion.ci.fusion-dev.net",
		fqa: "https://fusion.fqa.fusion-dev.net",
		fprd: "https://fusion.equinor.com",
		tr: "https://fusion.tr.fusion-dev.net",
		next: "https://next.fusion.ci.fusion-dev.net"
	};
	const baseUrl = envUrls[env] || envUrls.fprd;
	if (!tag.startsWith("latest")) return `${baseUrl}/apps/${appKey}?$tag[${appKey}]=${tag}`;
	return `${baseUrl}/apps/${appKey}`;
}
/**
* Posts a comment to the PR with the application URL and deployment info
*
* This function:
* - Checks for GITHUB_TOKEN availability (required for posting comments)
* - Detects PR number from GitHub context or tag (for pr-{number} format)
* - Creates a formatted Markdown comment with:
*   - Application name, version, environment, tag
*   - Direct links to the deployed application
*   - Deployment metadata for tracking
* - Uses meta comment identifier to allow checking for existing comments
*
* If not in a PR context (no PR number available), this function silently returns
* without posting.
*
* @param meta - App metadata object
* @param tag - Deployment tag/version
* @param appUrl - Generated application URL
* @throws Does not throw, but logs warnings on failure
*/
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
/**
* Main function to extract metadata and post publish information
*
* This is the primary orchestration function that:
* 1. Reads GitHub Action inputs (artifact, environment, tag, working directory)
* 2. Resolves the artifact file path
* 3. Extracts application metadata from the artifact's metadata.json
* 4. Generates application URLs for different contexts
* 5. Sets GitHub Action outputs for downstream steps:
*    - app-name: Application name from metadata
*    - app-version: Application semantic version
*    - app-key: Application unique identifier
*    - app-url: URL to access deployed application
*    - app-admin-url: URL to access app admin panel
*    - publish-info: Formatted summary for notifications
* 6. Posts deployment comment to PR (if applicable)
*
* This function is typically called directly as the entry point when the module
* is executed in a GitHub Action workflow.
*
* @throws Does not throw, but calls core.setFailed() on errors
*/
async function postPublishMetadata() {
	try {
		const artifact = getInput("artifact");
		const env = getInput("env");
		const tag = getInput("tag");
		const workingDirectory = getInput("working-directory") || ".";
		info(`Processing artifact: ${artifact}`);
		info(`Environment: ${env}`);
		info(`Tag: ${tag}`);
		const artifactPath = path$1.resolve(workingDirectory, artifact);
		if (!fs.existsSync(artifactPath)) throw new Error(`Artifact not found: ${artifactPath}`);
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
		const publishInfo = `🚀 **${appName}** v${appVersion} deployed to **${env.toUpperCase()}**\n[Open Application](${appUrl})`;
		setOutput("publish-info", publishInfo);
		await postPrComment(meta, tag, appUrl);
		info("Post-publish metadata processing completed successfully");
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		setFailed(`Post-publish metadata failed: ${message}`);
	}
}
if (process.argv[1] && path$1.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) postPublishMetadata();
//#endregion
export { generateAppUrl, postPrComment, postPublishMetadata };

//# sourceMappingURL=post-publish-metadata.js.map