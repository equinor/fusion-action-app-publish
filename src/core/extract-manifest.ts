import path from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "@actions/core";
import AdmZip from "adm-zip";

/**
 * The shape of the manifest loaded from the bundle zip file.
 * Normally contains more fields, but we only care about appKey here.
 * Used for publish config.
 */
export type Manifest = {
  appKey: string;
} & Record<string, unknown>;

/**
 * Loads the manifest from a bundle zip file.
 * @param bundle - The AdmZip instance representing the bundle.
 * @returns A promise resolving to an object containing the manifest.
 * @throws If app.manifest.json is missing or cannot be parsed.
 */
export const loadManifest = (bundle: AdmZip): Promise<Manifest> => {
  const manifestEntry =
    bundle.getEntry("app.manifest.json") ??
    bundle.getEntries().find((entry) => entry.entryName.endsWith("/app.manifest.json"));
  if (!manifestEntry) {
    throw new Error("Manifest file not found in bundle");
  }
  return new Promise((resolve, reject) => {
    manifestEntry.getDataAsync((data, err) => {
      if (err) {
        return reject(new Error("Failed to read manifest file", { cause: err }));
      }
      try {
        console.log(JSON.parse(String(data)));
        return resolve(JSON.parse(String(data)));
      } catch (error) {
        reject(new Error("Failed to parse manifest file", { cause: error }));
      }
    });
  });
};

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  try {
    const zipPath = process.env.INPUT_ARTIFACT || core.getInput("artifact");
    const bundle = new AdmZip(zipPath);

    loadManifest(bundle)
      .then((manifest) => console.log(manifest))
      .catch((error) => console.error(error));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to load manifest: ${message}`);
    throw error;
  }
}
