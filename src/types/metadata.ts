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

export interface ExecResult {
  stdout: string;
  stderr: string;
}
