import { f as __toESM, n as error, r as getInput } from "./core.js";
import { t as require_adm_zip } from "./adm-zip.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
//#region src/core/extract-manifest.ts
/**
* extract-manifest.ts
*
* Loads application manifest from a Fusion application bundle (zip) file
*
* This module extracts the app-manifest.json file from the bundle to retrieve
* the application configuration, particularly the appKey which is essential for
* deployment and identification purposes.
*
* The manifest loading is performant as it uses AdmZip to read directly from
* the zip without extracting to temporary files.
*/
var import_adm_zip = /* @__PURE__ */ __toESM(require_adm_zip(), 1);
/**
* Loads the manifest from a bundle zip file.
* @param bundle - The AdmZip instance representing the bundle.
* @returns A promise resolving to an object containing the manifest.
* @throws If app.manifest.json is missing or cannot be parsed.
*/
var loadManifest = (bundle) => {
	const manifestEntry = bundle.getEntry("app-manifest.json") ?? bundle.getEntries().find((entry) => entry.entryName.endsWith("/app-manifest.json"));
	if (!manifestEntry) throw new Error("Manifest file not found in bundle");
	return new Promise((resolve, reject) => {
		manifestEntry.getDataAsync((data, err) => {
			if (err) return reject(new Error("Failed to read manifest file", { cause: err }));
			try {
				return resolve(JSON.parse(String(data)));
			} catch (error) {
				reject(new Error("Failed to parse manifest file", { cause: error }));
			}
		});
	});
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try {
	const zipPath = process.env.INPUT_ARTIFACT || getInput("artifact");
	loadManifest(new import_adm_zip.default(zipPath)).then((manifest) => {
		console.log(JSON.stringify(manifest));
	}).catch((error$1) => {
		const message = error$1 instanceof Error ? error$1.message : "Unknown error";
		error(`Failed to load manifest: ${message}`);
		process.exit(1);
	});
} catch (error$2) {
	const message = error$2 instanceof Error ? error$2.message : "Unknown error";
	error(`Failed to load manifest: ${message}`);
	process.exit(1);
}
//#endregion
export { loadManifest };

//# sourceMappingURL=extract-manifest.js.map