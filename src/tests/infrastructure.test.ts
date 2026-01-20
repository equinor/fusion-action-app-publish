import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Script Infrastructure Tests", () => {
  it("All source files exist in the expected structure", async () => {
    const repoRoot = path.join(__dirname, "..", "..");
    const srcDir = path.join(repoRoot, "src");
    const coreDir = path.join(srcDir, "core");
    const typesDir = path.join(srcDir, "types");
    const utilsDir = path.join(srcDir, "utils");

    const expectedCoreFiles = [
      "check-meta-comment.ts",
      "validate-artifact.ts",
      "validate-env.ts",
      "validate-is-token-or-azure.ts",
      "post-publish-metadata.ts",
    ];

    const expectedTypeFiles = ["auth.ts", "metadata.ts", "index.ts"];

    const pathsToCheck = [
      { target: srcDir, label: "src directory" },
      { target: coreDir, label: "core directory" },
      { target: typesDir, label: "types directory" },
      { target: utilsDir, label: "utils directory" },
      { target: path.join(srcDir, "index.ts"), label: "src/index.ts" },
    ];

    for (const { target, label } of pathsToCheck) {
      try {
        await fs.access(target);
      } catch {
        throw new Error(`Expected ${label} not found`);
      }
    }

    for (const file of expectedCoreFiles) {
      const filePath = path.join(coreDir, file);
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Expected core file ${file} not found`);
      }
    }

    for (const file of expectedTypeFiles) {
      const filePath = path.join(typesDir, file);
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Expected types file ${file} not found`);
      }
    }
  });

  it("Core files have required dependencies imported", async () => {
    const repoRoot = path.join(__dirname, "..", "..");
    const coreDir = path.join(repoRoot, "src", "core");
    const files = [
      "validate-artifact.ts",
      "validate-env.ts",
      "validate-is-token-or-azure.ts",
      "post-publish-metadata.ts",
    ];

    for (const file of files) {
      const filePath = path.join(coreDir, file);
      const content = await fs.readFile(filePath, "utf8");

      // Check that @actions/core is imported (single or double quotes)
      expect(content).toMatch(/['"]@actions\/core['"]/);

      // Check that it has basic functionality
      expect(content.length).toBeGreaterThan(100);
    }
  });

  it("post-publish-metadata.ts exports functions", async () => {
    const repoRoot = path.join(__dirname, "..", "..");
    const filePath = path.join(repoRoot, "src", "core", "post-publish-metadata.ts");
    const content = await fs.readFile(filePath, "utf8");

    // Check that functions are exported
    expect(content).toContain("export");
  });

  it("Scripts contain expected functionality keywords", async () => {
    const scriptChecks = [
      {
        file: "validate-artifact.ts",
        keywords: ["artifact", "zip", "existsSync"],
      },
      {
        file: "validate-env.ts",
        keywords: ["env", "prNR", "tag", "ci", "fprd"],
      },
      {
        file: "validate-is-token-or-azure.ts",
        keywords: ["fusion-token", "azure-client-id", "BEARER", "isToken"],
      },
      {
        file: "post-publish-metadata.ts",
        keywords: ["metadata", "github", "postPrComment", "extractAppMetadata"],
      },
      {
        file: "check-meta-comment.ts",
        keywords: ["meta", "comment", "check", "pr"],
      },
    ];

    const repoRoot = path.join(__dirname, "..", "..");
    const srcDir = path.join(repoRoot, "src", "core");

    for (const { file, keywords } of scriptChecks) {
      const filePath = path.join(srcDir, file);
      const content = await fs.readFile(filePath, "utf8");

      for (const keyword of keywords) {
        expect(content.toLowerCase()).toContain(keyword.toLowerCase());
      }
    }
  });

  it("Vitest configuration is valid", async () => {
    const repoRoot = path.join(__dirname, "..", "..");
    const configPath = path.join(repoRoot, "vitest.config.ts");
    try {
      await fs.access(configPath);
    } catch {
      throw new Error("vitest.config.ts not found");
    }
  });

  it("Package.json has test scripts configured", async () => {
    const repoRoot = path.join(__dirname, "..", "..");
    const packageJsonPath = path.join(repoRoot, "package.json");
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent);

    expect(packageJson.scripts).toHaveProperty("test");
    expect(packageJson.scripts.test).toBe("vitest");
    expect(packageJson.devDependencies).toHaveProperty("vitest");
  });
});
