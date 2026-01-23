import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { c as coreExports } from "./core.js";
function findFusionApp(workingDirectory) {
  const data = { app: void 0, isValid: false };
  try {
    const packageJsonPath = path.join(workingDirectory, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        const appName = packageJson.name;
        const version = packageJson.version;
        if (isFusionApp(packageJson)) {
          data.app = {
            name: appName || "unknown",
            path: workingDirectory,
            version
          };
          data.isValid = true;
        }
      } catch (parseError) {
        coreExports.warning(
          `⚠️ Could not parse ${packageJsonPath}: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    }
  } catch (patternError) {
    coreExports.warning(
      `⚠️ Pattern ${workingDirectory} failed: ${patternError instanceof Error ? patternError.message : String(patternError)}`
    );
  }
  return data;
}
function isFusionApp(packageJson) {
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  const fusionDeps = Object.keys(allDeps).filter((dep) => dep.startsWith("@equinor/fusion"));
  const hasFusionDeps = fusionDeps.length > 0;
  if (!hasFusionDeps) return false;
  const hasCli = !!allDeps["@equinor/fusion-framework-cli"];
  const hasReactApp = !!allDeps["@equinor/fusion-framework-react-app"];
  if (hasCli || hasReactApp) return true;
  const scripts = packageJson.scripts || {};
  const hasAppScripts = Object.keys(scripts).some(
    (script) => (scripts[script] || "").includes("fusion-framework-cli app") || (scripts[script] || "").includes("ffc app")
  );
  const hasAppConfig = !!(packageJson.fusion || packageJson.fusionApp);
  return hasCli || hasReactApp || hasAppScripts || hasAppConfig;
}
function testIsFusionApp() {
  const workingDirectory = coreExports.getInput("working-directory") || process.env.INPUT_WORKING_DIRECTORY || ".";
  const result = findFusionApp(workingDirectory);
  if (result.isValid && result.app) {
    coreExports.info(
      `✅ Found Fusion app: ${result.app.name} at ${result.app.path} (version: ${result.app.version || "N/A"})`
    );
  } else {
    coreExports.error(`❌ No valid Fusion app found in directory: ${workingDirectory}`);
  }
}
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  testIsFusionApp();
}
export {
  findFusionApp,
  isFusionApp,
  testIsFusionApp
};
//# sourceMappingURL=validate-working-dir.js.map
