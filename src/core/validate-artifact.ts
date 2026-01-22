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
 * 1. Artifact input is provided (required field)
 * 2. File exists at the specified path
 * 3. File has a .zip extension (only supported format)
 *
 * Sets GitHub Action outputs:
 * - `artifact-path`: The resolved absolute path to the validated artifact (on success)
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

  // Validate that the artifact input is provided
  if (!artifact) {
    core.setFailed("Input 'artifact' is required.");
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
}

// Execute if called directly
const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  validateArtifact();
}
