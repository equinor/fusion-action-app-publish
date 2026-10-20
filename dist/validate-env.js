import { a as setFailed, i as info, o as setOutput, r as getInput } from "./core.js";
import * as path$1 from "node:path";
import { fileURLToPath } from "node:url";
//#region src/core/validate-env.ts
/**
* validate-env.ts
*
* Validates the env and prNR inputs for the GitHub Action
*
* This module handles validation of the deployment environment, with support for:
* - Pull Request preview deployments (prNR input creates pr-{number} tag)
* - Standard environment deployments (ci, tr, fprd, fqa, next)
*
* Deployment logic:
* - If prNR is provided: Uses 'ci' environment with tag 'pr-{number}'
* - Otherwise: Validates env is in allowed list and requires tag input
*
* Used as part of GitHub Action workflows to ensure the correct environment is targeted
* for the application deployment.
*/
/** Prefix used for PR preview deployments */
var PR_TAG_PREFIX = "pr-";
/**
* Validates the environment and optional PR number inputs
*
* Validation logic:
* 1. If prNR provided: Sets environment to 'ci' and creates tag as 'pr-{number}'
* 2. Otherwise: Validates 'env' input is one of allowed values (ci, tr, fprd, fqa, next)
* 3. Validates 'tag' input is provided for non-PR deployments
*
* Sets GitHub Action outputs:
* - `env`: The validated deployment environment
* - `tag`: The deployment tag (either 'pr-{number}' or user-provided tag)
*
* Fails the GitHub Action if validation fails
*
* @throws Does not throw, but calls core.setFailed() on validation errors
* @example
* // PR deployment
* // With inputs: prNR=123
* validateEnv(); // Sets env='ci', tag='pr-123'
*
* @example
* // Standard deployment
* // With inputs: env='fprd', tag='v1.0.0'
* validateEnv(); // Sets env='fprd', tag='v1.0.0'
*/
function validateEnv() {
	const prNR = getInput("prNR");
	const env = getInput("env");
	const tag = getInput("tag");
	if (prNR && env) {
		setFailed("Inputs 'prNR' and 'env' cannot be used together.");
		return;
	}
	if (prNR) {
		info(`prNR provided: ${prNR}`);
		setOutput("tag", `${PR_TAG_PREFIX}${prNR}`);
		setOutput("env", "ci");
		return;
	}
	if (!env) {
		setFailed("Input 'env' is required.");
		return;
	}
	const allowedEnvs = [
		"ci",
		"tr",
		"fprd",
		"fqa",
		"next"
	];
	if (!allowedEnvs.includes(env)) {
		setFailed(`Input 'env' must be one of the following values: ${allowedEnvs.join(", ")}.`);
		return;
	}
	if (!tag) {
		setFailed("Input 'tag' is required.");
		return;
	}
	info("Environment validation passed.");
	setOutput("env", env);
	setOutput("tag", tag);
}
if (process.argv[1] && path$1.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) validateEnv();
//#endregion
export { validateEnv };

//# sourceMappingURL=validate-env.js.map