import { a as setFailed, i as info, o as setOutput, r as getInput, s as warning } from "./core.js";
import * as fs from "node:fs";
import * as path$1 from "node:path";
import { fileURLToPath } from "node:url";
//#region src/core/validate-artifact.ts
/**
* validate-artifact.ts
*
* Validates the artifact input for the GitHub Action
*
* This module handles validation of the artifact file provided by the user, ensuring:
* - The artifact file path is provided and not empty
* - The artifact file exists on the filesystem
* - The artifact is a .zip file (currently the only supported format)
*
* Used as part of GitHub Action workflows to ensure the correct artifact file is provided
* before attempting to publish the application.
*/
/**
* Validates the artifact file input for the GitHub Action
*
* Performs the following checks:
* 1. If artifact is not provided, skips validation (artifact is optional for source-based publish)
* 2. File exists at the specified path
* 3. File has a .zip extension (only supported format)
*
* Sets GitHub Action outputs:
* - `artifact-path`: The resolved absolute path to the validated artifact (on success)
* - `artifact-provided`: 'true' if artifact was provided, 'false' otherwise
*
* Fails the GitHub Action with an error message if validation fails
*
* @throws Does not throw, but calls core.setFailed() on validation errors
* @example
* // In GitHub Action workflow
* validateArtifact(); // Validates artifact input and sets output for next step
*/
function validateArtifact() {
	const artifact = getInput("artifact");
	if (!artifact) {
		info("No artifact provided. The action will publish from the working directory.");
		warning("Source-based publish: metadata outputs (app-name, app-version, publish-info) and PR comments will not be available.");
		setOutput("artifact-provided", "false");
		return;
	}
	const artifactPath = path$1.resolve(artifact);
	if (!fs.existsSync(artifactPath)) {
		setFailed(`Artifact file does not exist at path: ${artifactPath}`);
		return;
	}
	const validExtensions = [".zip"];
	const artifactExtension = path$1.extname(artifactPath).toLowerCase();
	if (!validExtensions.includes(artifactExtension)) {
		setFailed(`Artifact file must be one of the following types: ${validExtensions.join(", ")}`);
		return;
	}
	info("Artifact validation passed.");
	setOutput("artifact-path", artifactPath);
	setOutput("artifact-provided", "true");
}
if (process.argv[1] && path$1.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) validateArtifact();
//#endregion
export { validateArtifact };

//# sourceMappingURL=validate-artifact.js.map