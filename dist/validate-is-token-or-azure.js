import { a as setFailed, i as info, o as setOutput, r as getInput, s as warning, t as debug } from "./core.js";
import * as path$1 from "node:path";
import { fileURLToPath } from "node:url";
//#region src/core/validate-is-token-or-azure.ts
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
/**
* Enumeration of supported authentication types
* Used to identify which authentication method is being used
* @example
* if (authType === AUTH_TYPES.TOKEN) { ... }
*/
var AUTH_TYPES = {
	TOKEN: "token",
	SERVICE_PRINCIPAL: "service-principal"
};
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
function validateFusionToken(token) {
	if (!token || typeof token !== "string" || token.trim() === "") return {
		isValid: false,
		error: "Input 'fusion-token' must be a non-empty string."
	};
	if (!/^BEARER [A-Za-z0-9._-]+$/.test(token)) return {
		isValid: false,
		error: "Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by valid token characters."
	};
	return {
		isValid: true,
		error: null
	};
}
/**
* Detects the authentication type and validates credentials
*
* Detection logic (in order of precedence):
* 1. If both token and complete Azure credentials provided: Use Service Principal (prefers SP)
* 2. If only token provided: Use token authentication
* 3. If complete Azure credentials provided: Use Service Principal
* 4. If partial Azure credentials: Error (all 2 required)
* 5. No credentials: Error
*
* @param credentials - Object containing all potential credential inputs
* @returns AuthDetectionResult with detected authType, isValid flag, and error message
* @example
* const result = detectAndValidateAuthType({
*   fusionToken: 'BEARER abc123',
*   azureClientId: '',
*   azureTenantId: ''
* });
* // Returns: { authType: 'token', isValid: true, error: null }
*/
function detectAndValidateAuthType(credentials) {
	const { fusionToken, azureClientId, azureTenantId } = credentials;
	const trimmedFusionToken = fusionToken?.trim() ?? "";
	const trimmedAzureClientId = azureClientId?.trim() ?? "";
	const trimmedAzureTenantId = azureTenantId?.trim() ?? "";
	const hasAzureCredentials = trimmedAzureClientId && trimmedAzureTenantId;
	const hasPartialAzureCredentials = trimmedAzureClientId || trimmedAzureTenantId;
	if (trimmedFusionToken && hasAzureCredentials) {
		info("Both token and Azure credentials provided. Using Service Principal authentication.");
		return {
			authType: AUTH_TYPES.SERVICE_PRINCIPAL,
			isValid: true,
			error: null
		};
	}
	if (trimmedFusionToken && !hasPartialAzureCredentials) return {
		authType: AUTH_TYPES.TOKEN,
		isValid: true,
		error: null
	};
	if (hasAzureCredentials) return {
		authType: AUTH_TYPES.SERVICE_PRINCIPAL,
		isValid: true,
		error: null
	};
	if (hasPartialAzureCredentials && !hasAzureCredentials) return {
		authType: null,
		isValid: false,
		error: "All Azure credentials ('azure-client-id', 'azure-tenant-id') must be provided when using Service Principal authentication."
	};
	return {
		authType: null,
		isValid: false,
		error: "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id') must be provided."
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
function detectAzureResourceId(environment, inputAzureResourceId, azureClientId) {
	if (!azureClientId) {
		info("No Azure Client ID provided, skipping Azure Resource ID detection.");
		return "";
	}
	if (inputAzureResourceId) {
		info("Using user-provided Azure Resource ID.");
		inputAzureResourceId = inputAzureResourceId.includes("/.default") ? inputAzureResourceId.replace("/.default", "") : inputAzureResourceId;
		return inputAzureResourceId.trim();
	}
	info("No Azure Resource ID provided. Detecting default based on environment.");
	if ([
		"ci",
		"fqa",
		"tr",
		"next"
	].includes(environment.toLowerCase())) {
		info(`Environment '${environment}' detected. Using non-production Azure Resource ID.`);
		return "api://fusion.equinor.com/nonprod";
	} else if (environment.toLowerCase() === "fprd") {
		info(`Environment '${environment}' detected. Using production Azure Resource ID.`);
		return "api://fusion.equinor.com/prod";
	} else {
		warning(`Unrecognized environment '${environment}'. Defaulting to non-production Azure resource ID.`);
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
function validateIsTokenOrAzure() {
	let fusionToken = getInput("fusion-token");
	let azureClientId = getInput("azure-client-id");
	let azureTenantId = getInput("azure-tenant-id");
	let inputAzureResourceId = getInput("azure-resource-id");
	let environment = getInput("environment");
	if (!fusionToken) fusionToken = process.env.INPUT_FUSION_TOKEN ?? "";
	if (!azureClientId) azureClientId = process.env.INPUT_AZURE_CLIENT_ID ?? "";
	if (!azureTenantId) azureTenantId = process.env.INPUT_AZURE_TENANT_ID ?? "";
	if (!inputAzureResourceId) inputAzureResourceId = process.env.INPUT_AZURE_RESOURCE_ID ?? "";
	if (!environment) environment = process.env.INPUT_ENVIRONMENT ?? "ci";
	const azureResourceId = detectAzureResourceId(environment, inputAzureResourceId, azureClientId);
	const credentials = {
		fusionToken,
		azureClientId,
		azureTenantId,
		azureResourceId
	};
	debug(`Azure Client ID provided: ${!!azureClientId}`);
	debug(`Azure Tenant ID provided: ${!!azureTenantId}`);
	debug(`Azure Resource ID provided: ${!!inputAzureResourceId}`);
	debug(`Fusion Token provided: ${!!fusionToken}`);
	const authResult = detectAndValidateAuthType(credentials);
	if (!authResult.isValid) {
		const message = authResult.error ?? "Authentication validation failed.";
		setFailed(message);
		return;
	}
	setOutput("auth-type", authResult.authType);
	setOutput("is-token", authResult.authType === AUTH_TYPES.TOKEN);
	setOutput("is-service-principal", authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL);
	setOutput("azure-client-id", credentials.azureClientId);
	setOutput("azure-tenant-id", credentials.azureTenantId);
	setOutput("azure-resource-id", credentials.azureResourceId);
	if (authResult.authType === AUTH_TYPES.TOKEN) {
		const tokenValidation = validateFusionToken(credentials.fusionToken.trim());
		if (!tokenValidation.isValid) {
			const message = tokenValidation.error ?? "Invalid fusion token.";
			setFailed(message);
			return;
		}
		info("Fusion token validation passed.");
	} else if (authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL) {
		setOutput("azure-client-id", credentials.azureClientId);
		setOutput("azure-tenant-id", credentials.azureTenantId);
		setOutput("azure-resource-id", credentials.azureResourceId);
		info("Azure Service Principal credentials validated.");
	}
}
if (process.argv[1] && path$1.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) validateIsTokenOrAzure();
//#endregion
export { AUTH_TYPES, detectAndValidateAuthType, detectAzureResourceId, validateFusionToken, validateIsTokenOrAzure };

//# sourceMappingURL=validate-is-token-or-azure.js.map