/**
 * validate-is-token-or-azure.ts
 * Validates the token or Azure credentials input for the GitHub Action
 * Used as part of GitHub Action workflows to ensure correct authentication is provided
 */

import * as core from "@actions/core";
import type { AuthDetectionResult, AuthType, Credentials, ValidationResult } from "../types/auth";

// Authentication types enum
export const AUTH_TYPES = {
  TOKEN: "token",
  SERVICE_PRINCIPAL: "service-principal",
} as const satisfies Record<string, AuthType>;

/**
 * Validates fusion token format and structure
 * @param token - The fusion token to validate
 * @returns Validation result with isValid boolean and error message if any
 */
export function validateFusionToken(token: string): ValidationResult {
  // Validate that the fusion-token is a non-empty string
  if (!token || typeof token !== "string" || token.trim() === "") {
    return {
      isValid: false,
      error: "Input 'fusion-token' must be a non-empty string.",
    };
  }

  // Validate the format of the fusion-token
  const tokenPattern = /^BEARER [A-Za-z0-9._-]+$/;
  if (!tokenPattern.test(token)) {
    return {
      isValid: false,
      error:
        "Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by valid token characters.",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Detects authentication type and validates Service Principal credentials
 * @param credentials - Object containing all credential inputs
 * @returns Detection result with authType, isValid boolean, and error message if any
 */
export function detectAndValidateAuthType(credentials: Credentials): AuthDetectionResult {
  const { fusionToken, azureClientId, azureTenantId, azureResourceId } = credentials;

  // Check if Azure Service Principal credentials are provided
  const hasAzureCredentials = azureClientId && azureTenantId && azureResourceId;
  const hasPartialAzureCredentials = azureClientId || azureTenantId || azureResourceId;

  // If we have both token and Azure credentials
  if (fusionToken && hasAzureCredentials) {
    // Prefer Service Principal when both are provided
    core.info("Both token and Azure credentials provided. Using Service Principal authentication.");
    return {
      authType: AUTH_TYPES.SERVICE_PRINCIPAL,
      isValid: true,
      error: null,
    };
  }

  // If we have a token and no Azure credentials
  if (fusionToken && !hasPartialAzureCredentials) {
    return {
      authType: AUTH_TYPES.TOKEN,
      isValid: true,
      error: null,
    };
  }

  // If we have all Azure credentials
  if (hasAzureCredentials) {
    return {
      authType: AUTH_TYPES.SERVICE_PRINCIPAL,
      isValid: true,
      error: null,
    };
  }

  // If we have partial Azure credentials (invalid state)
  if (hasPartialAzureCredentials && !hasAzureCredentials) {
    return {
      authType: null,
      isValid: false,
      error:
        "All Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided when using Service Principal authentication.",
    };
  }

  // No valid credentials provided
  return {
    authType: null,
    isValid: false,
    error:
      "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided.",
  };
}

/**
 * Main function to validate the authentication inputs
 */
export function validateIsTokenOrAzure(): void {
  // Get all authentication inputs from GitHub Action
  const credentials: Credentials = {
    fusionToken: core.getInput("fusion-token"),
    azureClientId: core.getInput("azure-client-id"),
    azureTenantId: core.getInput("azure-tenant-id"),
    azureResourceId: core.getInput("azure-resource-id"),
  };

  // Detect authentication type and validate credentials
  const authResult = detectAndValidateAuthType(credentials);

  if (!authResult.isValid) {
    const message = authResult.error ?? "Authentication validation failed.";
    core.setFailed(message);
    return;
  }

  // Set outputs for authentication type information
  core.setOutput("auth-type", authResult.authType);
  core.setOutput("isToken", authResult.authType === AUTH_TYPES.TOKEN);
  core.setOutput("isServicePrincipal", authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL);

  // If using token authentication, validate the token format
  if (authResult.authType === AUTH_TYPES.TOKEN) {
    const tokenValidation = validateFusionToken(credentials.fusionToken);

    if (!tokenValidation.isValid) {
      const message = tokenValidation.error ?? "Invalid fusion token.";
      core.setFailed(message);
      return;
    }

    core.info("Fusion token validation passed.");
  } else if (authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL) {
    core.info("Azure Service Principal credentials validated.");
  }
}

// Execute if called directly
if (require.main === module) {
  validateIsTokenOrAzure();
}
