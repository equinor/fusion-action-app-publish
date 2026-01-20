import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_TYPES,
  detectAndValidateAuthType,
  validateFusionToken,
  validateIsTokenOrAzure,
} from "../core/validate-is-token-or-azure";

vi.mock("@actions/core");

import * as core from "@actions/core";

describe("validate-is-token-or-azure.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateFusionToken function", () => {
    it("should return valid for correct token format", () => {
      const result = validateFusionToken("BEARER eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });

    it("should return invalid for empty token", () => {
      const result = validateFusionToken("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Input 'fusion-token' must be a non-empty string.");
    });

    it("should return invalid for null token", () => {
      const result = validateFusionToken(null as unknown as string);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Input 'fusion-token' must be a non-empty string.");
    });

    it("should return invalid for token without BEARER prefix", () => {
      const result = validateFusionToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Input 'fusion-token' is not in the correct format");
    });

    it("should return invalid for token with special characters", () => {
      const result = validateFusionToken("BEARER token@#$");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Input 'fusion-token' is not in the correct format");
    });

    it("should return valid for token with valid characters including dots, dashes, underscores", () => {
      const result = validateFusionToken("BEARER eyJhbGciOi.JIUzI1NiIsInR5c_CI6IkpXVCJ9-token");
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });
  });

  describe("detectAndValidateAuthType function", () => {
    it("should return TOKEN type for valid token without Azure credentials", () => {
      const credentials = {
        fusionToken: "BEARER token123",
        azureClientId: "",
        azureTenantId: "",
        azureResourceId: "",
      };

      const result = detectAndValidateAuthType(credentials);
      expect(result.authType).toBe(AUTH_TYPES.TOKEN);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });

    it("should return SERVICE_PRINCIPAL type for valid Azure credentials", () => {
      const credentials = {
        fusionToken: "",
        azureClientId: "client-123",
        azureTenantId: "tenant-456",
        azureResourceId: "resource-789",
      };

      const result = detectAndValidateAuthType(credentials);
      expect(result.authType).toBe(AUTH_TYPES.SERVICE_PRINCIPAL);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });

    it("should return invalid for partial Azure credentials", () => {
      const credentials = {
        fusionToken: "",
        azureClientId: "client-123",
        azureTenantId: "",
        azureResourceId: "",
      };

      const result = detectAndValidateAuthType(credentials);
      expect(result.authType).toBe(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("All Azure credentials");
    });

    it("should prefer SERVICE_PRINCIPAL when both token and Azure credentials are provided", () => {
      const credentials = {
        fusionToken: "BEARER token123",
        azureClientId: "client-123",
        azureTenantId: "tenant-456",
        azureResourceId: "resource-789",
      };

      const result = detectAndValidateAuthType(credentials);
      expect(result.authType).toBe(AUTH_TYPES.SERVICE_PRINCIPAL);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });

    it("should return invalid when no credentials are provided", () => {
      const credentials = {
        fusionToken: "",
        azureClientId: "",
        azureTenantId: "",
        azureResourceId: "",
      };

      const result = detectAndValidateAuthType(credentials);
      expect(result.authType).toBe(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Either 'fusion-token' or all Azure credentials");
    });
  });

  describe("Integration tests with main function", () => {
    it("should fail when neither fusion-token nor Azure credentials are provided", () => {
      vi.mocked(core.getInput).mockImplementation((_input: string) => {
        return ""; // All inputs empty
      });

      validateIsTokenOrAzure();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith(
        "Either 'fusion-token' or all Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided.",
      );
    });

    it("should fail when only some Azure credentials are provided", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "fusion-token") return "";
        if (input === "azure-client-id") return "client-123";
        if (input === "azure-tenant-id") return "";
        if (input === "azure-resource-id") return "";
        return "";
      });

      validateIsTokenOrAzure();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith(
        "All Azure credentials ('azure-client-id', 'azure-tenant-id', 'azure-resource-id') must be provided when using Service Principal authentication.",
      );
    });

    it("should pass and set correct outputs when all Azure credentials are provided", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "fusion-token") return "";
        if (input === "azure-client-id") return "client-123";
        if (input === "azure-tenant-id") return "tenant-456";
        if (input === "azure-resource-id") return "resource-789";
        return "";
      });

      validateIsTokenOrAzure();

      expect(vi.mocked(core.info)).toHaveBeenCalledWith(
        "Azure Service Principal credentials validated.",
      );
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("auth-type", "service-principal");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("isToken", false);
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("isServicePrincipal", true);
      expect(vi.mocked(core.setFailed)).not.toHaveBeenCalled();
    });

    it("should pass and set correct outputs for valid token", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "fusion-token") return "BEARER eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
        return "";
      });

      validateIsTokenOrAzure();

      expect(vi.mocked(core.info)).toHaveBeenCalledWith("Fusion token validation passed.");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("auth-type", "token");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("isToken", true);
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("isServicePrincipal", false);
      expect(vi.mocked(core.setFailed)).not.toHaveBeenCalled();
    });

    it("should fail for invalid token format", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "fusion-token") return "invalid-token";
        return "";
      });

      validateIsTokenOrAzure();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith(
        "Input 'fusion-token' is not in the correct format. It should start with 'BEARER ' followed by valid token characters.",
      );
    });

    it("should prefer Service Principal when both credentials are provided", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "fusion-token") return "BEARER valid-token";
        if (input === "azure-client-id") return "client-123";
        if (input === "azure-tenant-id") return "tenant-456";
        if (input === "azure-resource-id") return "resource-789";
        return "";
      });

      validateIsTokenOrAzure();

      expect(vi.mocked(core.info)).toHaveBeenCalledWith(
        "Both token and Azure credentials provided. Using Service Principal authentication.",
      );
      expect(vi.mocked(core.info)).toHaveBeenCalledWith(
        "Azure Service Principal credentials validated.",
      );
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("auth-type", "service-principal");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("isServicePrincipal", true);
      expect(vi.mocked(core.setFailed)).not.toHaveBeenCalled();
    });
  });
});
