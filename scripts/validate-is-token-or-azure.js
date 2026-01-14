
/**
 * validate-token.js
 * Validates the token or Azure credentials input for the GitHub Action
 * Used as part of GitHub Action workflows to ensure correct token is provided
 */

const core = require('@actions/core');

// Main function to validate the token input
function validateIsTokenOrAzure() {
  // Get the fusion-token input from GitHub Action inputs
  const fusionToken = core.getInput('fusion-token');
  const azureClientId = core.getInput('azure-client-id');
  const azureTenantId = core.getInput('azure-tenant-id');
  const azureResourceId = core.getInput('azure-resource-id');

  // Check if either fusion-token or all Azure credentials are provided
  if (!fusionToken && !(azureClientId && azureTenantId && azureResourceId)) {
    core.setFailed("Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided.");
    return;
  }

  // If Azure credentials are provided, skip fusion-token validation
  if (!fusionToken && (azureClientId && azureTenantId && azureResourceId)) {
    core.info("Azure credentials provided, skipping fusion-token validation.");
    core.setOutput('isToken', false);
    return;
  }

  // Validate that the fusion-token is a non-empty string
  if (typeof fusionToken !== 'string' || fusionToken.trim() === '') {
    core.setFailed("Input 'fusion-token' must be a non-empty string.");
    return;
  }

  // Validate the format of the fusion-token
  const tokenPattern = /^BEARER [A-Za-z0-9]/;
  if (!tokenPattern.test(fusionToken)) {
    core.setFailed("Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by alphanumeric characters.");
    return;
  }

  // If all validations pass
  core.info("Fusion token validation passed.");
  core.setOutput('isToken', true);
}

validateIsTokenOrAzure();