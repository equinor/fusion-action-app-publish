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
    bundle.getEntry("app-manifest.json") ??
    bundle.getEntries().find((entry) => entry.entryName.endsWith("/app-manifest.json"));
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
      .then((manifest) => {
        console.log(JSON.stringify(manifest));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unknown error";
        core.error(`Failed to load manifest: ${message}`);
        process.exit(1);
      });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.error(`Failed to load manifest: ${message}`);
    process.exit(1);
  }
}
