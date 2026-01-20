export type AuthType = "token" | "service-principal";

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface AuthDetectionResult {
  authType: AuthType | null;
  isValid: boolean;
  error: string | null;
}

export interface Credentials {
  fusionToken: string;
  azureClientId: string;
  azureTenantId: string;
  azureResourceId: string;
}
