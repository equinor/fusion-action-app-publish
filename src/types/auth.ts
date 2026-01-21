/**
 * Type representing the authentication method being used
 * - 'token': Direct Fusion token authentication
 * - 'service-principal': Azure Service Principal (OIDC) authentication
 */
export type AuthType = "token" | "service-principal";

/**
 * Result of validating credentials
 * @property isValid - Whether the credentials passed validation
 * @property error - Error message if validation failed, null if valid
 */
export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Result of detecting and validating the authentication type
 * @property authType - Detected authentication type ('token' or 'service-principal')
 * @property isValid - Whether credentials are valid for the detected type
 * @property error - Error message describing why validation failed, null if valid
 */
export interface AuthDetectionResult {
  authType: AuthType | null;
  isValid: boolean;
  error: string | null;
}

/**
 * Container for all credential inputs from GitHub Action environment
 * @property fusionToken - Direct Fusion API token (optional, used with token auth)
 * @property azureClientId - Azure AD application ID (required for Service Principal auth)
 * @property azureTenantId - Azure AD tenant ID (required for Service Principal auth)
 * @property azureResourceId - Azure resource ID for Fusion (required for Service Principal auth)
 */
export interface Credentials {
  fusionToken: string;
  azureClientId: string;
  azureTenantId: string;
  azureResourceId: string;
}
