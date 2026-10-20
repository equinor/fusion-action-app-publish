import { a as setFailed, i as info, o as setOutput, r as getInput, s as warning } from "./core.js";
import { n as getOctokit, t as context } from "./github.js";
import { extractAppMetadata } from "./extract-metadata.js";
import * as fs from "node:fs";
import * as path$1 from "node:path";
import { fileURLToPath } from "node:url";
//#region src/core/check-meta-comment.ts
/**
* check-meta-comment.ts
*
* Checks if a meta comment already exists on the PR to avoid duplicate comments
*
* This module is used to detect existing deployment comments before posting a new one,
* preventing duplicate comments when the action runs multiple times (e.g., on retries).
*
* Uses GitHub's Issues API to:
* - List all comments on the PR
* - Search for meta-comment identifier (HTML comment)
* - Report existence back to caller
*
* This enables workflows to conditionally post comments:
* - Skip posting if comment already exists
* - Post fresh comment on first deployment
*/
/**
* Checks if a meta comment already exists on the PR
*
* Detection:
* - Requires GITHUB_TOKEN environment variable (for API access)
* - Determines PR number from GitHub context or tag (pr-{number} format)
* - Queries GitHub API for all comments on the issue
* - Searches for meta-comment identifier: `<!-- fusion-app-publish-meta -->`
*
* Sets GitHub Action output:
* - `exists`: 'true' if comment found, 'false' otherwise
*
* Gracefully handles:
* - Missing GITHUB_TOKEN (returns false, logs info)
* - Non-PR context (returns false, logs info)
* - API errors (logs warning, returns false, continues)
*
* @returns Promise resolving to true if meta comment exists, false otherwise
* @throws Only throws after calling core.setFailed() on unexpected errors
* @example
* const exists = await checkMetaComment();
* if (!exists) {
*   await postPrComment(meta, env, tag, appUrl, appAdminUrl);
* }
*/
async function checkMetaComment() {
	try {
		const token = process.env.GITHUB_TOKEN;
		if (!token) {
			info("GITHUB_TOKEN not available");
			return false;
		}
		const context$1 = context;
		const tag = getInput("tag");
		const artifact = getInput("artifact");
		const workingDirectory = getInput("working-directory") || ".";
		const artifactPath = path$1.resolve(workingDirectory, artifact);
		if (!fs.existsSync(artifactPath)) throw new Error(`Artifact not found: ${artifactPath}`);
		const appName = (await extractAppMetadata(artifactPath)).name;
		const prNumber = context$1.payload.pull_request?.number || (tag?.startsWith("pr-") ? parseInt(tag.replace("pr-", ""), 10) : null);
		if (!prNumber) {
			info("Not a PR deployment, no meta comment check needed");
			return false;
		}
		const octokit = getOctokit(token);
		try {
			const exists = (await octokit.rest.issues.listComments({
				owner: context$1.repo.owner,
				repo: context$1.repo.repo,
				issue_number: prNumber
			})).data.some((comment) => comment.body?.includes(`### 🚀 ${tag.toLocaleUpperCase()} Deployed`) && comment.body?.includes(appName));
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
if (process.argv[1] && path$1.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) checkMetaComment();
//#endregion
export { checkMetaComment };

//# sourceMappingURL=check-meta-comment.js.map