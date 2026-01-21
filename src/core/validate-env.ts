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

import * as core from "@actions/core";

/** Prefix used for PR preview deployments */
const PR_TAG_PREFIX = "pr-";

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
export function validateEnv(): void {
  const prNR = core.getInput("prNR");
  const env = core.getInput("env");
  const tag = core.getInput("tag");

  // If prNR is provided, set the tag output accordingly
  if (prNR) {
    core.info(`prNR provided: ${prNR}`);
    core.setOutput("tag", `${PR_TAG_PREFIX}${prNR}`);
    core.setOutput("env", "ci");
    return;
  }

  // Validate that the env input is provided
  if (!env) {
    core.setFailed("Input 'env' is required.");
    return;
  }

  // Validate that the env input is one of the allowed values
  const allowedEnvs = ["ci", "tr", "fprd", "fqa", "next"];
  if (!allowedEnvs.includes(env)) {
    core.setFailed(`Input 'env' must be one of the following values: ${allowedEnvs.join(", ")}.`);
    return;
  }

  // Validate that the tag input is provided
  if (!tag) {
    core.setFailed("Input 'tag' is required.");
    return;
  }

  // If all validations pass
  core.info("Environment validation passed.");
  core.setOutput("env", env);
  core.setOutput("tag", tag);
}

// Execute if called directly
if (require.main === module) {
  validateEnv();
}
