import path__default from "node:path";
import { fileURLToPath } from "node:url";
import { g as getInput, e as error } from "./core.js";
import { A as AdmZip } from "./adm-zip.js";
const loadManifest = (bundle) => {
  const manifestEntry = bundle.getEntry("app-manifest.json") ?? bundle.getEntries().find((entry) => entry.entryName.endsWith("/app-manifest.json"));
  if (!manifestEntry) {
    throw new Error("Manifest file not found in bundle");
  }
  return new Promise((resolve, reject) => {
    manifestEntry.getDataAsync((data, err) => {
      if (err) {
        return reject(new Error("Failed to read manifest file", { cause: err }));
      }
      try {
        return resolve(JSON.parse(String(data)));
      } catch (error2) {
        reject(new Error("Failed to parse manifest file", { cause: error2 }));
      }
    });
  });
};
const isDirectExecution = process.argv[1] && path__default.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  try {
    const zipPath = process.env.INPUT_ARTIFACT || getInput("artifact");
    const bundle = new AdmZip(zipPath);
    loadManifest(bundle).then((manifest) => {
      console.log(JSON.stringify(manifest));
    }).catch((error$1) => {
      const message = error$1 instanceof Error ? error$1.message : "Unknown error";
      error(`Failed to load manifest: ${message}`);
      process.exit(1);
    });
  } catch (error$1) {
    const message = error$1 instanceof Error ? error$1.message : "Unknown error";
    error(`Failed to load manifest: ${message}`);
    process.exit(1);
  }
}
export {
  loadManifest
};
//# sourceMappingURL=extract-manifest.js.map
