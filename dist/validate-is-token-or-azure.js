import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { c as coreExports } from "./core.js";
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
  const { fusionToken, azureClientId, azureTenantId, azureResourceId } = credentials;
  const trimmedFusionToken = fusionToken?.trim() ?? "";
  const trimmedAzureClientId = azureClientId?.trim() ?? "";
  const trimmedAzureTenantId = azureTenantId?.trim() ?? "";
  const trimmedAzureResourceId = azureResourceId?.trim() ?? "";
  const hasAzureCredentials = trimmedAzureClientId && trimmedAzureTenantId && trimmedAzureResourceId;
  const hasPartialAzureCredentials = trimmedAzureClientId || trimmedAzureTenantId || trimmedAzureResourceId;
  if (trimmedFusionToken && hasAzureCredentials) {
    coreExports.info("Both token and Azure credentials provided. Using Service Principal authentication.");
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
      error: "All Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided when using Service Principal authentication."
    };
  }
  return {
    authType: null,
    isValid: false,
    error: "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided."
  };
}
function detectAzureResourceId(environment, inputAzureResourceId, azureClientId) {
  if (!azureClientId) {
    coreExports.info("No Azure Client ID provided, skipping Azure Resource ID detection.");
    return "";
  }
  if (inputAzureResourceId) {
    coreExports.info("Using user-provided Azure Resource ID.");
    inputAzureResourceId = inputAzureResourceId.includes("/.default") ? inputAzureResourceId.replace("/.default", "") : inputAzureResourceId;
    return inputAzureResourceId.trim();
  }
  coreExports.info("No Azure Resource ID provided. Detecting default based on environment.");
  coreExports.warning(
    "Scopes detection provide new scopes, these are not implemented in app-service, this will fail if used for now."
  );
  const nonProductionEnvironments = ["ci", "fqa", "tr", "next"];
  if (nonProductionEnvironments.includes(environment.toLowerCase())) {
    coreExports.info(`Environment '${environment}' detected. Using non-production Azure Resource ID.`);
    return "api://fusion.equinor.com/nonprod";
  } else if (environment.toLowerCase() === "fprd") {
    coreExports.info(`Environment '${environment}' detected. Using production Azure Resource ID.`);
    return "api://fusion.equinor.com/prod";
  } else {
    coreExports.warning(
      `Unrecognized environment '${environment}'. Defaulting to non-production Azure resource ID.`
    );
    return "api://fusion.equinor.com/nonprod";
  }
}
function validateIsTokenOrAzure() {
  let fusionToken = coreExports.getInput("fusion-token");
  let azureClientId = coreExports.getInput("azure-client-id");
  let azureTenantId = coreExports.getInput("azure-tenant-id");
  let inputAzureResourceId = coreExports.getInput("azure-resource-id");
  let environment = coreExports.getInput("environment");
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
  coreExports.debug(`Azure Client ID provided: ${!!azureClientId}`);
  coreExports.debug(`Azure Tenant ID provided: ${!!azureTenantId}`);
  coreExports.debug(`Azure Resource ID provided: ${!!inputAzureResourceId}`);
  coreExports.debug(`Fusion Token provided: ${!!fusionToken}`);
  const authResult = detectAndValidateAuthType(credentials);
  if (!authResult.isValid) {
    const message = authResult.error ?? "Authentication validation failed.";
    coreExports.setFailed(message);
    return;
  }
  coreExports.setOutput("auth-type", authResult.authType);
  coreExports.setOutput("isToken", authResult.authType === AUTH_TYPES.TOKEN);
  coreExports.setOutput("isServicePrincipal", authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL);
  coreExports.setOutput("azureClientId", credentials.azureClientId);
  coreExports.setOutput("azureTenantId", credentials.azureTenantId);
  coreExports.setOutput("azureResourceId", credentials.azureResourceId);
  if (authResult.authType === AUTH_TYPES.TOKEN) {
    const tokenValidation = validateFusionToken(credentials.fusionToken.trim());
    if (!tokenValidation.isValid) {
      const message = tokenValidation.error ?? "Invalid fusion token.";
      coreExports.setFailed(message);
      return;
    }
    coreExports.info("Fusion token validation passed.");
  } else if (authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL) {
    coreExports.setOutput("azureClientId", credentials.azureClientId);
    coreExports.setOutput("azureTenantId", credentials.azureTenantId);
    coreExports.setOutput("azureResourceId", credentials.azureResourceId);
    coreExports.info("Azure Service Principal credentials validated.");
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
