import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { g as getInput, a as setFailed, i as info, s as setOutput } from "./core.js";
function validateArtifact() {
  const artifact = getInput("artifact");
  if (!artifact) {
    setFailed("Input 'artifact' is required. Please provide the path to the artifact file.");
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
}
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  validateArtifact();
}
export {
  validateArtifact
};
//# sourceMappingURL=validate-artifact.js.map
