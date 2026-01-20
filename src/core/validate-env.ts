/**
 * validate-env.ts
 * Validates the env and prNR inputs for the GitHub Action
 * Used as part of GitHub Action workflows to ensure correct environment is provided
 */

import * as core from "@actions/core";

const PR_TAG_PREFIX = "pr-";

/**
 * Main function to validate the env input
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
