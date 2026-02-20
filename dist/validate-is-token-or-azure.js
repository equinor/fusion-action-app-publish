import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { g as getInput, d as debug, a as setFailed, s as setOutput, i as info, w as warning } from "./core.js";
const AUTH_TYPES = {
  TOKEN: "token",
  SERVICE_PRINCIPAL: "service-principal"
};
function validateFusionToken(token) {
  if (!token || typeof token !== "string" || token.trim() === "") {
    return {
      isValid: false,
      error: "Input 'fusion-token' must be a non-empty string."
    };
  }
  const tokenPattern = /^BEARER [A-Za-z0-9._-]+$/;
  if (!tokenPattern.test(token)) {
    return {
      isValid: false,
      error: "Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by valid token characters."
    };
  }
  return {
    isValid: true,
    error: null
  };
}
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
  if (trimmedFusionToken && !hasPartialAzureCredentials) {
    return {
      authType: AUTH_TYPES.TOKEN,
      isValid: true,
      error: null
    };
  }
  if (hasAzureCredentials) {
    return {
      authType: AUTH_TYPES.SERVICE_PRINCIPAL,
      isValid: true,
      error: null
    };
  }
  if (hasPartialAzureCredentials && !hasAzureCredentials) {
    return {
      authType: null,
      isValid: false,
      error: "All Azure credentials ('azure-client-id', 'azure-tenant-id') must be provided when using Service Principal authentication."
    };
  }
  return {
    authType: null,
    isValid: false,
    error: "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id') must be provided."
  };
}
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
  warning(
    "Scopes detection provide new scopes, these are not implemented in app-service, this will fail if used for now."
  );
  const nonProductionEnvironments = ["ci", "fqa", "tr", "next"];
  if (nonProductionEnvironments.includes(environment.toLowerCase())) {
    info(`Environment '${environment}' detected. Using non-production Azure Resource ID.`);
    return "api://fusion.equinor.com/nonprod";
  } else if (environment.toLowerCase() === "fprd") {
    info(`Environment '${environment}' detected. Using production Azure Resource ID.`);
    return "api://fusion.equinor.com/prod";
  } else {
    warning(
      `Unrecognized environment '${environment}'. Defaulting to non-production Azure resource ID.`
    );
    return "api://fusion.equinor.com/nonprod";
  }
}
function validateIsTokenOrAzure() {
  let fusionToken = getInput("fusion-token");
  let azureClientId = getInput("azure-client-id");
  let azureTenantId = getInput("azure-tenant-id");
  let inputAzureResourceId = getInput("azure-resource-id");
  let environment = getInput("environment");
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
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  validateIsTokenOrAzure();
}
export {
  AUTH_TYPES,
  detectAndValidateAuthType,
  detectAzureResourceId,
  validateFusionToken,
  validateIsTokenOrAzure
};
//# sourceMappingURL=validate-is-token-or-azure.js.map
