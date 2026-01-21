/**
 * Main entry point for the Fusion Action App Publish library
 *
 * This module exports all public functions used for validating and publishing Fusion applications
 * through GitHub Actions. It provides a clean API for:
 * - Validating inputs (artifact, environment, authentication)
 * - Extracting and processing application metadata
 * - Posting deployment information to GitHub PRs
 */

export { checkMetaComment } from "./core/check-meta-comment";
export {
  extractAppMetadata,
  generateAppUrl,
  postPrComment,
  postPublishMetadata,
} from "./core/post-publish-metadata";
export { validateArtifact } from "./core/validate-artifact";
export { validateEnv } from "./core/validate-env";
export {
  AUTH_TYPES,
  detectAndValidateAuthType,
  validateFusionToken,
  validateIsTokenOrAzure,
} from "./core/validate-is-token-or-azure";
export * from "./types";
