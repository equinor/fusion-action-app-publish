/**
 * validate-artifact.ts
 *
 * Validates the artifact input for the GitHub Action
 *
 * This module handles validation of the artifact file provided by the user, ensuring:
 * - The artifact file path is provided and not empty
 * - The artifact file exists on the filesystem
 * - The artifact is a .zip file (currently the only supported format)
 *
 * Used as part of GitHub Action workflows to ensure the correct artifact file is provided
 * before attempting to publish the application.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "@actions/core";

/**
 * Validates the artifact file input for the GitHub Action
 *
 * Performs the following checks:
 * 1. If artifact is not provided, skips validation (artifact is optional for source-based publish)
 * 2. File exists at the specified path
 * 3. File has a .zip extension (only supported format)
 *
 * Sets GitHub Action outputs:
 * - `artifact-path`: The resolved absolute path to the validated artifact (on success)
 * - `artifact-provided`: 'true' if artifact was provided, 'false' otherwise
 *
 * Fails the GitHub Action with an error message if validation fails
 *
 * @throws Does not throw, but calls core.setFailed() on validation errors
 * @example
 * // In GitHub Action workflow
 * validateArtifact(); // Validates artifact input and sets output for next step
 */
export function validateArtifact(): void {
  // Get the artifact input from GitHub Action inputs
  const artifact = core.getInput("artifact");

  // If artifact is not provided, skip validation (source-based publish)
  if (!artifact) {
    core.info("No artifact provided. The action will publish from the working directory.");
    core.warning(
      "Source-based publish: metadata outputs (app-name, app-version, publish-info) and PR comments will not be available.",
    );
    core.setOutput("artifact-provided", "false");
    return;
  }

  // Validate that the artifact file exists
  const artifactPath = path.resolve(artifact);
  if (!fs.existsSync(artifactPath)) {
    core.setFailed(`Artifact file does not exist at path: ${artifactPath}`);
    return;
  }

  // Validate that the artifact is a .zip file (only zip format supported for now)
  const validExtensions = [".zip"];
  const artifactExtension = path.extname(artifactPath).toLowerCase();
  if (!validExtensions.includes(artifactExtension)) {
    core.setFailed(
      `Artifact file must be one of the following types: ${validExtensions.join(", ")}`,
    );
    return;
  }

  // If all validations pass
  core.info("Artifact validation passed.");

  // Set the artifact path as an output for use in subsequent steps
  core.setOutput("artifact-path", artifactPath);
  core.setOutput("artifact-provided", "true");
}

// Execute if called directly
const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  validateArtifact();
}
