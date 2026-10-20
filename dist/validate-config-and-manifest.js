import { a as setFailed, i as info } from "./core.js";
import * as fs from "node:fs";
import * as path$1 from "node:path";
//#region src/core/validate-config-and-manifest.ts
/**
* Validates that both the manifest file and config file (if provided) exist and are valid JSON
*/
async function validateConfigAndManifest() {
	try {
		const config = process.env.INPUT_CONFIG;
		const manifestFile = "./app.manifest.json";
		const cwd = process.cwd();
		if (!fs.existsSync(manifestFile)) throw new Error(`Manifest file not found: ${path$1.join(cwd, manifestFile)}`);
		try {
			const manifestContent = fs.readFileSync(manifestFile, "utf-8");
			JSON.parse(manifestContent);
			info(`✓ Manifest file is valid JSON: ${manifestFile}`);
		} catch (error) {
			throw new Error(`Manifest file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
		}
		if (config) {
			if (!fs.existsSync(config)) throw new Error(`Config file not found: ${path$1.join(cwd, config)}`);
			try {
				const configContent = fs.readFileSync(config, "utf-8");
				JSON.parse(configContent);
				info(`✓ Config file is valid JSON: ${config}`);
			} catch (error) {
				throw new Error(`Config file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
			}
		} else info("No config file provided (optional)");
		info("✓ All file validations passed");
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
validateConfigAndManifest();
//#endregion
export { validateConfigAndManifest };

//# sourceMappingURL=validate-config-and-manifest.js.map