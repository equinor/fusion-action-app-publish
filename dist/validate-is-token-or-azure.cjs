#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("./core.js");
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
  const hasAzureCredentials = azureClientId && azureTenantId && azureResourceId;
  const hasPartialAzureCredentials = azureClientId || azureTenantId || azureResourceId;
  if (fusionToken && hasAzureCredentials) {
    core.coreExports.info("Both token and Azure credentials provided. Using Service Principal authentication.");
    return {
      authType: AUTH_TYPES.SERVICE_PRINCIPAL,
      isValid: true,
      error: null
    };
  }
  if (fusionToken && !hasPartialAzureCredentials) {
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
function validateIsTokenOrAzure() {
  const credentials = {
    fusionToken: core.coreExports.getInput("fusion-token"),
    azureClientId: core.coreExports.getInput("azure-client-id"),
    azureTenantId: core.coreExports.getInput("azure-tenant-id"),
    azureResourceId: core.coreExports.getInput("azure-resource-id")
  };
  const authResult = detectAndValidateAuthType(credentials);
  if (!authResult.isValid) {
    const message = authResult.error ?? "Authentication validation failed.";
    core.coreExports.setFailed(message);
    return;
  }
  core.coreExports.setOutput("auth-type", authResult.authType);
  core.coreExports.setOutput("isToken", authResult.authType === AUTH_TYPES.TOKEN);
  core.coreExports.setOutput("isServicePrincipal", authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL);
  if (authResult.authType === AUTH_TYPES.TOKEN) {
    const tokenValidation = validateFusionToken(credentials.fusionToken);
    if (!tokenValidation.isValid) {
      const message = tokenValidation.error ?? "Invalid fusion token.";
      core.coreExports.setFailed(message);
      return;
    }
    core.coreExports.info("Fusion token validation passed.");
  } else if (authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL) {
    core.coreExports.info("Azure Service Principal credentials validated.");
  }
}
if (require.main === module) {
  validateIsTokenOrAzure();
}
exports.AUTH_TYPES = AUTH_TYPES;
exports.detectAndValidateAuthType = detectAndValidateAuthType;
exports.validateFusionToken = validateFusionToken;
exports.validateIsTokenOrAzure = validateIsTokenOrAzure;
//# sourceMappingURL=validate-is-token-or-azure.cjs.map
