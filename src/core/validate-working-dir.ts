import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "@actions/core";
import type { FusionApp, PackageJson } from "../types/fusion-app";

type FusionAppResult = {
  app?: FusionApp;
  isValid: boolean;
};

/**
 * Searches for a Fusion application in the specified working directory.
 *
 * @param workingDirectory - The directory to search for the Fusion app.
 * @returns An object containing the Fusion app metadata and validity status.
 */
export function findFusionApp(workingDirectory: string): FusionAppResult {
  const data = { app: undefined, isValid: false } as FusionAppResult;

  try {
    const packageJsonPath = path.join(workingDirectory, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as PackageJson;
        const appName = packageJson.name;
        const version = packageJson.version;

        if (isFusionApp(packageJson)) {
          data.app = {
            name: appName || "unknown",
            path: workingDirectory,
            version: version,
          };
          data.isValid = true;
        }
      } catch (parseError) {
        core.warning(
          `⚠️ Could not parse ${packageJsonPath}: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }
    }
  } catch (patternError) {
    core.warning(
      `⚠️ Pattern ${workingDirectory} failed: ${patternError instanceof Error ? patternError.message : String(patternError)}`,
    );
  }

  return data;
}

/**
 * Determines if the provided package.json represents a Fusion application.
 *
 * @param packageJson - The package.json content as an object.
 * @returns True if it's a Fusion app, false otherwise.
 */
export function isFusionApp(packageJson: PackageJson): boolean {
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Must have Fusion dependencies
  const fusionDeps = Object.keys(allDeps).filter((dep) => dep.startsWith("@equinor/fusion"));
  const hasFusionDeps = fusionDeps.length > 0;

  if (!hasFusionDeps) return false;

  // Strong indicators it's an app
  const hasCli = !!allDeps["@equinor/fusion-framework-cli"];
  const hasReactApp = !!allDeps["@equinor/fusion-framework-react-app"];

  if (hasCli || hasReactApp) return true;

  const scripts = packageJson.scripts || {};
  const hasAppScripts = Object.keys(scripts).some(
    (script) =>
      (scripts[script] || "").includes("fusion-framework-cli app") ||
      (scripts[script] || "").includes("ffc app"),
  );

  const hasAppConfig = !!(packageJson.fusion || packageJson.fusionApp);

  return hasCli || hasReactApp || hasAppScripts || hasAppConfig;
}

export function testIsFusionApp() {
  const workingDirectory = core.getInput("working-directory") || ".";
  const result = findFusionApp(workingDirectory);

  if (result.isValid && result.app) {
    core.info(
      `✅ Found Fusion app: ${result.app.name} at ${result.app.path} (version: ${result.app.version || "N/A"})`,
    );
  } else {
    core.error(`❌ No valid Fusion app found in directory: ${workingDirectory}`);
  }
}

// Execute if called directly
const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  testIsFusionApp();
}
