/**
 * validate-artifact.js
 * Validates the artifact input for the GitHub Action
 * Used as part of GitHub Action workflows to ensure correct artifact file is provided
 */

const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

// Main function to validate the artifact input
function validateArtifact() {
  // Get the artifact input from GitHub Action inputs
  const artifact = core.getInput('artifact');

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
  const validExtensions = ['.zip'];
  const artifactExtension = path.extname(artifactPath).toLowerCase();
  if (!validExtensions.includes(artifactExtension)) {
    core.setFailed(`Artifact file must be one of the following types: ${validExtensions.join(', ')}`);
    return;
  }

  // If all validations pass
  core.info("Artifact validation passed.");

  // Set the artifact path as an output for use in subsequent steps
  core.setOutput('artifact-path', artifactPath);
}

validateArtifact();