/**
 * Application metadata extracted from the artifact's metadata.json file
 * This metadata is used to generate deployment URLs and track application information
 *
 * @property name - Application name (mapped to 'key' for URL generation)
 * @property version - Application semantic version (optional)
 * @property description - Human-readable application description (optional)
 * @property key - Application unique identifier (set equal to 'name' during extraction)
 * @property entry - Application entry point configuration (optional)
 * @property entry.path - Path to the application's main entry file (optional)
 */
export interface AppMetadata {
  name: string;
  version?: string;
  description?: string;
  key: string;
  entry?: {
    path?: string;
  };
  [key: string]: unknown;
}

/**
 * Result of executing a shell command via child_process.exec()
 * @property stdout - Standard output from the command
 * @property stderr - Standard error output from the command
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
}
