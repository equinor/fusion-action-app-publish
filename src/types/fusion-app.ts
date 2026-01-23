/**
 * Represents a Fusion application with its metadata
 */
export interface FusionApp {
  name: string;
  path: string;
  version?: string;
}

/**
 * Package.json structure for type safety
 */
export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  fusion?: Record<string, unknown>;
  fusionApp?: Record<string, unknown>;
  private?: boolean;
  main?: string;
  module?: string;
  exports?: Record<string, unknown>;
}
