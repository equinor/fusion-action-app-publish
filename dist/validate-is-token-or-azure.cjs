#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("@actions/core");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const core__namespace = /* @__PURE__ */ _interopNamespaceDefault(core);
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
    core__namespace.info("Both token and Azure credentials provided. Using Service Principal authentication.");
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
    fusionToken: core__namespace.getInput("fusion-token"),
    azureClientId: core__namespace.getInput("azure-client-id"),
    azureTenantId: core__namespace.getInput("azure-tenant-id"),
    azureResourceId: core__namespace.getInput("azure-resource-id")
  };
  const authResult = detectAndValidateAuthType(credentials);
  if (!authResult.isValid) {
    core__namespace.setFailed(authResult.error);
    return;
  }
  core__namespace.setOutput("auth-type", authResult.authType);
  core__namespace.setOutput("isToken", authResult.authType === AUTH_TYPES.TOKEN);
  core__namespace.setOutput("isServicePrincipal", authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL);
  if (authResult.authType === AUTH_TYPES.TOKEN) {
    const tokenValidation = validateFusionToken(credentials.fusionToken);
    if (!tokenValidation.isValid) {
      core__namespace.setFailed(tokenValidation.error);
      return;
    }
    core__namespace.info("Fusion token validation passed.");
  } else if (authResult.authType === AUTH_TYPES.SERVICE_PRINCIPAL) {
    core__namespace.info("Azure Service Principal credentials validated.");
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
