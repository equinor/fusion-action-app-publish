import * as fs from "node:fs";
import * as path from "node:path";
import * as core from "@actions/core";

/**
 * Validates that both the manifest file and config file (if provided) exist and are valid JSON
 */
export async function validateConfigAndManifest(): Promise<void> {
  try {
    const config = process.env.INPUT_CONFIG;
    const manifestFile = "./app.manifest.json";
    const cwd = process.cwd();

    // Validate manifest exists
    if (!fs.existsSync(manifestFile)) {
      throw new Error(`Manifest file not found: ${path.join(cwd, manifestFile)}`);
    }

    // Validate manifest is valid JSON
    try {
      const manifestContent = fs.readFileSync(manifestFile, "utf-8");
      JSON.parse(manifestContent);
      core.info(`✓ Manifest file is valid JSON: ${manifestFile}`);
    } catch (error) {
      throw new Error(
        `Manifest file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Validate config file if provided
    if (config) {
      if (!fs.existsSync(config)) {
        throw new Error(`Config file not found: ${path.join(cwd, config)}`);
      }

      // Validate config is valid JSON
      try {
        const configContent = fs.readFileSync(config, "utf-8");
        JSON.parse(configContent);
        core.info(`✓ Config file is valid JSON: ${config}`);
      } catch (error) {
        throw new Error(
          `Config file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      core.info("No config file provided (optional)");
    }

    core.info("✓ All file validations passed");
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

validateConfigAndManifest();
