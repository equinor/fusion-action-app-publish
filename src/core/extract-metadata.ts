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
import * as path from "node:path";
import * as core from "@actions/core";
import AdmZip from "adm-zip";
import type { AppMetadata } from "../types";

/**
 * The shape of the metadata loaded from the bundle zip file.
 */
export type BundleMetadata = {
  appKey: string;
  name: string;
  version: string;
};

/**
 * Loads the metadata from a bundle zip file.
 * @param bundle - The AdmZip instance representing the bundle.
 * @returns A promise resolving to an object containing name and version.
 * @throws If metadata.json is missing or cannot be parsed.
 */
export const loadMetadata = (bundle: AdmZip): Promise<BundleMetadata> => {
  // Attempt to retrieve the metadata.json entry from the zip bundle
  const metadataEntry =
    bundle.getEntry("metadata.json") ??
    bundle.getEntries().find((entry) => entry.entryName.endsWith("/metadata.json"));
  if (!metadataEntry) {
    // If not found, throw an error
    throw new Error("Metadata file not found in bundle");
  }
  // Read the metadata entry asynchronously
  return new Promise((resolve, reject) => {
    metadataEntry.getDataAsync((data, err) => {
      if (err) {
        // Reject if reading the file fails
        return reject(new Error("Failed to read metadata file", { cause: err }));
      }
      try {
        // Parse the metadata as JSON and resolve
        return resolve(JSON.parse(String(data)));
      } catch (error) {
        // Reject if parsing fails
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
export async function extractAppMetadata(artifactPath: string): Promise<AppMetadata> {
  try {
    const artifactExtension = path.extname(artifactPath).toLowerCase();
    if (artifactExtension !== ".zip") {
      throw new Error(
        `Unsupported artifact format: ${artifactExtension}. Only .zip files are supported.`,
      );
    }

    const zip = new AdmZip(artifactPath);
    const metadata = await loadMetadata(zip);

    // Map the metadata to AppMetadata format
    const appMetadata: AppMetadata = {
      name: metadata.name,
      version: metadata.version,
      key: metadata.appKey || metadata.name,
    };

    return appMetadata;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    core.error(`Failed to extract app metadata: ${message}`);
    throw error;
  }
}
