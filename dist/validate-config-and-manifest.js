import * as fs from "node:fs";
import * as path from "node:path";
import { i as info, a as setFailed } from "./core.js";
async function validateConfigAndManifest() {
  try {
    const config = process.env.INPUT_CONFIG;
    const manifestFile = "./app.manifest.json";
    const cwd = process.cwd();
    if (!fs.existsSync(manifestFile)) {
      throw new Error(`Manifest file not found: ${path.join(cwd, manifestFile)}`);
    }
    try {
      const manifestContent = fs.readFileSync(manifestFile, "utf-8");
      JSON.parse(manifestContent);
      info(`✓ Manifest file is valid JSON: ${manifestFile}`);
    } catch (error) {
      throw new Error(
        `Manifest file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (config) {
      if (!fs.existsSync(config)) {
        throw new Error(`Config file not found: ${path.join(cwd, config)}`);
      }
      try {
        const configContent = fs.readFileSync(config, "utf-8");
        JSON.parse(configContent);
        info(`✓ Config file is valid JSON: ${config}`);
      } catch (error) {
        throw new Error(
          `Config file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      info("No config file provided (optional)");
    }
    info("✓ All file validations passed");
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
validateConfigAndManifest();
export {
  validateConfigAndManifest
};
//# sourceMappingURL=validate-config-and-manifest.js.map
