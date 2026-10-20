import { f as __toESM, n as error } from "./core.js";
import { t as require_adm_zip } from "./adm-zip.js";
import * as path$1 from "node:path";
//#region src/core/extract-metadata.ts
/**
* extract-metadata.ts
*
* Loads metadata from a Fusion application bundle (zip) file
*
* This module extracts application metadata (name, version, appKey) from the bundle's
* metadata.json file. The metadata is used for deployment tracking and URL generation.
*
* Throws an error if the metadata.json file is missing or cannot be parsed.
*/
var import_adm_zip = /* @__PURE__ */ __toESM(require_adm_zip(), 1);
/**
* Loads the metadata from a bundle zip file.
* @param bundle - The AdmZip instance representing the bundle.
* @returns A promise resolving to an object containing name and version.
* @throws If metadata.json is missing or cannot be parsed.
*/
var loadMetadata = (bundle) => {
	const metadataEntry = bundle.getEntry("metadata.json") ?? bundle.getEntries().find((entry) => entry.entryName.endsWith("/metadata.json"));
	if (!metadataEntry) throw new Error("Metadata file not found in bundle");
	return new Promise((resolve, reject) => {
		metadataEntry.getDataAsync((data, err) => {
			if (err) return reject(new Error("Failed to read metadata file", { cause: err }));
			try {
				return resolve(JSON.parse(String(data)));
			} catch (error) {
				reject(new Error("Failed to parse metadata file", { cause: error }));
			}
		});
	});
};
/**
* Extracts app metadata from the artifact
* Uses AdmZip library to read the metadata directly from the zip file
* without extracting to temporary files for better performance and security
* @param artifactPath - Path to the artifact
* @returns Parsed app metadata with mapped fields
*/
async function extractAppMetadata(artifactPath) {
	try {
		const artifactExtension = path$1.extname(artifactPath).toLowerCase();
		if (artifactExtension !== ".zip") throw new Error(`Unsupported artifact format: ${artifactExtension}. Only .zip files are supported.`);
		const metadata = await loadMetadata(new import_adm_zip.default(artifactPath));
		return {
			name: metadata.name,
			version: metadata.version,
			key: metadata.appKey || metadata.name
		};
	} catch (error$1) {
		const message = error$1 instanceof Error ? error$1.message : "Unknown error";
		error(`Failed to extract app metadata: ${message}`);
		throw error$1;
	}
}
//#endregion
export { extractAppMetadata, loadMetadata };

//# sourceMappingURL=extract-metadata.js.map