import * as path from "node:path";
import { e as error } from "./core.js";
import { A as AdmZip } from "./adm-zip.js";
const loadMetadata = (bundle) => {
  const metadataEntry = bundle.getEntry("metadata.json") ?? bundle.getEntries().find((entry) => entry.entryName.endsWith("/metadata.json"));
  if (!metadataEntry) {
    throw new Error("Metadata file not found in bundle");
  }
  return new Promise((resolve, reject) => {
    metadataEntry.getDataAsync((data, err) => {
      if (err) {
        return reject(new Error("Failed to read metadata file", { cause: err }));
      }
      try {
        return resolve(JSON.parse(String(data)));
      } catch (error2) {
        reject(new Error("Failed to parse metadata file", { cause: error2 }));
      }
    });
  });
};
async function extractAppMetadata(artifactPath) {
  try {
    const artifactExtension = path.extname(artifactPath).toLowerCase();
    if (artifactExtension !== ".zip") {
      throw new Error(
        `Unsupported artifact format: ${artifactExtension}. Only .zip files are supported.`
      );
    }
    const zip = new AdmZip(artifactPath);
    const metadata = await loadMetadata(zip);
    const appMetadata = {
      name: metadata.name,
      version: metadata.version,
      key: metadata.appKey || metadata.name
    };
    return appMetadata;
  } catch (error$1) {
    const message = error$1 instanceof Error ? error$1.message : "Unknown error";
    error(`Failed to extract app metadata: ${message}`);
    throw error$1;
  }
}
export {
  extractAppMetadata,
  loadMetadata
};
//# sourceMappingURL=extract-metadata.js.map
