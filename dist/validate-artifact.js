import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { g as getInput, i as info, w as warning, s as setOutput, a as setFailed } from "./core.js";
function validateArtifact() {
  const artifact = getInput("artifact");
  if (!artifact) {
    info("No artifact provided. The action will publish from the working directory.");
    warning(
      "Source-based publish: metadata outputs (app-name, app-version, publish-info) and PR comments will not be available."
    );
    setOutput("artifact-provided", "false");
    return;
  }
  const artifactPath = path.resolve(artifact);
  if (!fs.existsSync(artifactPath)) {
    setFailed(`Artifact file does not exist at path: ${artifactPath}`);
    return;
  }
  const validExtensions = [".zip"];
  const artifactExtension = path.extname(artifactPath).toLowerCase();
  if (!validExtensions.includes(artifactExtension)) {
    setFailed(
      `Artifact file must be one of the following types: ${validExtensions.join(", ")}`
    );
    return;
  }
  info("Artifact validation passed.");
  setOutput("artifact-path", artifactPath);
  setOutput("artifact-provided", "true");
}
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  validateArtifact();
}
export {
  validateArtifact
};
//# sourceMappingURL=validate-artifact.js.map
