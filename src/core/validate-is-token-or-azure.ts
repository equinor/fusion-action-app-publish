/**
 * validate-is-token-or-azure.ts
 *
 * Validates and detects the authentication method for the GitHub Action
 *
 * This module provides authentication validation for two methods:
 * 1. **Direct Token**: User provides pre-acquired Fusion API token
 * 2. **Azure Service Principal (OIDC)**: User provides Azure AD credentials for OIDC flow
 *
 * The module handles:
 * - Token format validation (must start with 'BEARER ')
 * - Azure credential detection and validation (requires all 3 fields)
 * - Authentication type prioritization when both methods provided
 *
 * Used as part of GitHub Action workflows to ensure authentication credentials
 * are valid before attempting to publish the application.
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "@actions/core";
import type { AuthDetectionResult, AuthType, Credentials, ValidationResult } from "../types/auth";

/**
 * Enumeration of supported authentication types
 * Used to identify which authentication method is being used
 * @example
 * if (authType === AUTH_TYPES.TOKEN) { ... }
 */
export const AUTH_TYPES = {
  TOKEN: "token",
  SERVICE_PRINCIPAL: "service-principal",
} as const satisfies Record<string, AuthType>;

/**
 * Validates Fusion token format and structure
 *
 * Checks that the token:
 * - Is a non-empty string
 * - Starts with 'BEARER ' (case-sensitive)
 * - Contains only valid token characters after the prefix (alphanumeric, ., _, -)
 *
 * @param token - The Fusion token to validate
 * @returns ValidationResult with isValid flag and error message if validation fails
 * @example
 * const result = validateFusionToken('BEARER abc123-._');
 * if (result.isValid) { ... }
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
 * Detects the authentication type and validates credentials
 *
 * Detection logic (in order of precedence):
 * 1. If both token and complete Azure credentials provided: Use Service Principal (prefers SP)
 * 2. If only token provided: Use token authentication
 * 3. If complete Azure credentials provided: Use Service Principal
 * 4. If partial Azure credentials: Error (all 3 required)
 * 5. No credentials: Error
 *
 * @param credentials - Object containing all potential credential inputs
 * @returns AuthDetectionResult with detected authType, isValid flag, and error message
 * @example
 * const result = detectAndValidateAuthType({
 *   fusionToken: 'BEARER abc123',
 *   azureClientId: '',
 *   azureTenantId: '',
 *   azureResourceId: ''
 * });
 * // Returns: { authType: 'token', isValid: true, error: null }
 */
export function detectAndValidateAuthType(credentials: Credentials): AuthDetectionResult {
  const { fusionToken, azureClientId, azureTenantId, azureResourceId } = credentials;

  // Trim and check for non-empty credentials
  const trimmedFusionToken = fusionToken?.trim() ?? "";
  const trimmedAzureClientId = azureClientId?.trim() ?? "";
  const trimmedAzureTenantId = azureTenantId?.trim() ?? "";
  const trimmedAzureResourceId = azureResourceId?.trim() ?? "";

  // Check if Azure Service Principal credentials are provided
  const hasAzureCredentials =
    trimmedAzureClientId && trimmedAzureTenantId;
  const hasPartialAzureCredentials =
    trimmedAzureClientId || trimmedAzureTenantId || trimmedAzureResourceId;

  // If we have both token and Azure credentials
  if (trimmedFusionToken && hasAzureCredentials) {
    // Prefer Service Principal when both are provided
    core.info("Both token and Azure credentials provided. Using Service Principal authentication.");
    return {
      authType: AUTH_TYPES.SERVICE_PRINCIPAL,
      isValid: true,
      error: null,
    };
  }

  // If we have a token and no Azure credentials
  if (trimmedFusionToken && !hasPartialAzureCredentials) {
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
 * Detects the appropriate Azure Resource ID based on environment and input
 *
 * Logic:
 * 1. If user provides an inputAzureResourceId, use it (after trimming and removing '/.default' if present)
 * 2. If no inputAzureResourceId, determine default based on environment:
 *    - For 'ci', 'fqa', 'tr', 'next': Use non-production resource ID
 *    - For 'fprd': Use production resource ID
 *    - For unrecognized environments: Log warning and default to non-production resource ID
 *
 * @param environment - The deployment environment (e.g., 'ci', 'fqa', 'tr', 'next', 'fprd')
 * @param inputAzureResourceId - Optional user-provided Azure Resource ID
 * @param azureClientId - Optional Azure Client ID
 * @returns The detected Azure Resource ID to use for authentication
 * @example
 * const resourceId = detectAzureResourceId('ci', '');
 * // Returns: '5a842df8-3238-415d-b168-9f16a6a6031b' (non-production resource ID)
 */
export function detectAzureResourceId(
  environment: string,
  inputAzureResourceId?: string,
  azureClientId?: string,
): string {
  if (!azureClientId) {
    core.info("No Azure Client ID provided, skipping Azure Resource ID detection.");
    return ""; // If no Azure Client ID, we won't be using Azure authentication, so return empty resource ID
  }
  if (inputAzureResourceId) {
    core.info("Using user-provided Azure Resource ID.");
    inputAzureResourceId = inputAzureResourceId.includes("/.default")
      ? inputAzureResourceId.replace("/.default", "")
      : inputAzureResourceId;
    return inputAzureResourceId.trim();
  }

  core.info("No Azure Resource ID provided. Detecting default based on environment.");
  core.warning(
    "Scopes detection provide new scopes, these are not implemented in app-service, this will fail if used for now.",
  );
  const nonProductionEnvironments = ["ci", "fqa", "tr", "next"];

  // Default resource ID based on environment
  if (nonProductionEnvironments.includes(environment.toLowerCase())) {
    core.info(`Environment '${environment}' detected. Using non-production Azure Resource ID.`);
    return "api://fusion.equinor.com/nonprod";
  } else if (environment.toLowerCase() === "fprd") {
    core.info(`Environment '${environment}' detected. Using production Azure Resource ID.`);
    return "api://fusion.equinor.com/prod";
  } else {
    core.warning(
      `Unrecognized environment '${environment}'. Defaulting to non-production Azure resource ID.`,
    );
    return "api://fusion.equinor.com/nonprod";
  }
}

/**
 * Main function to validate the authentication inputs
 *
 * This is the primary entry point for authentication validation:
 * 1. Collects all authentication inputs from GitHub Action environment
 * 2. Calls detectAndValidateAuthType to determine auth method and validate
 * 3. Sets GitHub Action outputs for downstream reference:
 *    - auth-type: The authentication method used (token or service-principal)
 *    - isToken: Boolean indicating token authentication
 *    - isServicePrincipal: Boolean indicating SP authentication
 * 4. Fails the action if validation fails
 *
 * This function is typically called directly as the entry point when the module
 * is executed in a GitHub Action workflow.
 *
 * @throws Does not throw, but calls core.setFailed() on validation errors
 */
export function validateIsTokenOrAzure(): void {
  // Get all authentication inputs from GitHub Action
  // Using core.getInput with hyphenated names - it automatically converts to INPUT_* env vars
  let fusionToken = core.getInput("fusion-token");
  let azureClientId = core.getInput("azure-client-id");
  let azureTenantId = core.getInput("azure-tenant-id");
  let inputAzureResourceId = core.getInput("azure-resource-id");
  let environment = core.getInput("environment");

  // Fallback to direct environment variables if core.getInput returns empty
  // This handles cases where input names might not be resolved correctly
  if (!fusionToken) {
    fusionToken = process.env.INPUT_FUSION_TOKEN ?? "";
  }
  if (!azureClientId) {
    azureClientId = process.env.INPUT_AZURE_CLIENT_ID ?? "";
  }
  if (!azureTenantId) {
    azureTenantId = process.env.INPUT_AZURE_TENANT_ID ?? "";
  }
  if (!inputAzureResourceId) {
    inputAzureResourceId = process.env.INPUT_AZURE_RESOURCE_ID ?? "";
  }
  if (!environment) {
    environment = process.env.INPUT_ENVIRONMENT ?? "ci";
  }

  const azureResourceId = detectAzureResourceId(environment, inputAzureResourceId, azureClientId);

  const credentials: Credentials = {
    fusionToken,
    azureClientId,
    azureTenantId,
    azureResourceId,
  };

  // Log for debugging (will appear in GitHub Action logs)
  core.debug(`Azure Client ID provided: ${!!azureClientId}`);
  core.debug(`Azure Tenant ID provided: ${!!azureTenantId}`);
  core.debug(`Azure Resource ID provided: ${!!inputAzureResourceId}`);
  core.debug(`Fusion Token provided: ${!!fusionToken}`);

  // Detect authentication type and validate credentials
  const authResult = detectAndValidateAuthType(credentials);

  if (!authResult.isValid) {
    const message = authResult.error ?? "Authentication validation failed.";
    core.setFailed(message);
    return;
  }

  // Set outputs for authentication type information
  core.setOutput("auth-type", authResult.authType);
  core.setOutput("is-token", authResult.authType === AUTH_TYPES.TOKEN);
  core.setOutput("is-service-principal", authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL);
  core.setOutput("azure-client-id", credentials.azureClientId);
  core.setOutput("azure-tenant-id", credentials.azureTenantId);
  core.setOutput("azure-resource-id", credentials.azureResourceId);

  // If using token authentication, validate the token format
  if (authResult.authType === AUTH_TYPES.TOKEN) {
    const tokenValidation = validateFusionToken(credentials.fusionToken.trim());

    if (!tokenValidation.isValid) {
      const message = tokenValidation.error ?? "Invalid fusion token.";
      core.setFailed(message);
      return;
    }

    core.info("Fusion token validation passed.");
  } else if (authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL) {
    core.setOutput("azure-client-id", credentials.azureClientId);
    core.setOutput("azure-tenant-id", credentials.azureTenantId);
    core.setOutput("azure-resource-id", credentials.azureResourceId);
    core.info("Azure Service Principal credentials validated.");
  }
}

// Execute if called directly
const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  validateIsTokenOrAzure();
}
