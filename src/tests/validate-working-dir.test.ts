import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findFusionApp, isFusionApp } from "../core/validate-working-dir";
import type { PackageJson } from "../types/fusion-app";

vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  setOutput: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import * as fs from "node:fs";
import * as core from "@actions/core";

describe("validate-working-dir.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isFusionApp", () => {
    describe("Fusion dependency requirement", () => {
      it("should return false when no Fusion dependencies", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            react: "^18.0.0",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });

      it("should return false when only @equinor/fusion-* dependency (no app signals)", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });

      it("should return false when only @equinor/fusion-* in devDependencies (no app signals)", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          devDependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });
    });

    describe("App indicators", () => {
      it("should return true when has @equinor/fusion-framework-cli", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
            "@equinor/fusion-framework-cli": "^1.0.0",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });

      it("should return true when build script runs fusion app command", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          scripts: {
            build: "ffc app build",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });

      it("should return true when start script runs fusion app command", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          scripts: {
            start: "fusion-framework-cli app serve",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });

      it("should return true when script uses fusion-framework-cli with app command", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          scripts: {
            dev: "fusion-framework-cli app dev",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });

      it("should return true when script uses ffc alias with app command", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          scripts: {
            dev: "ffc app dev",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });

      it("should return true when has fusion config", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          fusion: {
            id: "my-app",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });

      it("should return true when has fusionApp config", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          fusionApp: {
            id: "my-app",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });

      it("should return false when only private flag is set (no app signals)", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          private: true,
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });
    });

    describe("Library exclusions", () => {
      it("should return false for publishable library (has main, not private, no app scripts)", () => {
        const packageJson: PackageJson = {
          name: "@my-org/my-lib",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          main: "dist/index.js",
          private: false,
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });

      it("should return false for publishable library (has module, not private, no app scripts)", () => {
        const packageJson: PackageJson = {
          name: "@my-org/my-lib",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          module: "dist/index.esm.js",
          private: false,
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });

      it("should return false for publishable library (has exports, not private, no app scripts)", () => {
        const packageJson: PackageJson = {
          name: "@my-org/my-lib",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          exports: {
            ".": {
              import: "./dist/index.esm.js",
              require: "./dist/index.js",
            },
          },
          private: false,
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });

      it("should return false for library with exports but is private (no app signals)", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          exports: {
            ".": "./dist/index.js",
          },
          private: true,
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });

      it("should return true for library with main but has app scripts", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          main: "dist/index.js",
          scripts: {
            build: "ffc app build",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });

      it("should return true for library with main but has Fusion config", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          main: "dist/index.js",
          fusion: {
            id: "my-app",
          },
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(true);
      });
    });

    describe("Edge cases", () => {
      it("should handle empty package.json", () => {
        const packageJson: PackageJson = {};

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });

      it("should handle package.json with no dependencies", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });

      it("should return false when scripts object is empty and no other app signals", () => {
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          scripts: {},
        };

        const result = isFusionApp(packageJson);
        expect(result).toBe(false);
      });
    });
  });

  describe("findFusionApp", () => {
    describe("Success cases", () => {
      it("should find Fusion app when package.json exists and is valid", () => {
        const workingDir = "/path/to/app";
        const packageJson: PackageJson = {
          name: "my-fusion-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          private: true,
          fusionApp: { id: "my-fusion-app" },
        };

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(true);
        expect(result.app).toEqual({
          name: "my-fusion-app",
          path: workingDir,
          version: "1.0.0",
        });
        expect(fs.existsSync).toHaveBeenCalledWith(path.join(workingDir, "package.json"));
        expect(fs.readFileSync).toHaveBeenCalledWith(path.join(workingDir, "package.json"), "utf8");
      });

      it("should set name to 'unknown' when package.json has no name", () => {
        const workingDir = "/path/to/app";
        const packageJson: PackageJson = {
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          private: true,
          fusionApp: { id: "my-app" },
        };

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(true);
        expect(result.app?.name).toBe("unknown");
      });

      it("should handle missing version gracefully", () => {
        const workingDir = "/path/to/app";
        const packageJson: PackageJson = {
          name: "my-app",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          private: true,
          fusionApp: { id: "my-app" },
        };

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(true);
        expect(result.app?.version).toBeUndefined();
      });
    });

    describe("Failure cases", () => {
      it("should return invalid result when package.json does not exist", () => {
        const workingDir = "/path/to/app";

        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(false);
        expect(result.app).toBeUndefined();
      });

      it("should return invalid result when package.json is not a Fusion app", () => {
        const workingDir = "/path/to/app";
        const packageJson: PackageJson = {
          name: "not-fusion",
          version: "1.0.0",
          dependencies: {
            react: "^18.0.0",
          },
        };

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(false);
        expect(result.app).toBeUndefined();
      });

      it("should log warning and return invalid when package.json is malformed", () => {
        const workingDir = "/path/to/app";
        const malformedJson = "{ invalid json }";

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(malformedJson);

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(false);
        expect(result.app).toBeUndefined();
        expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("Could not parse"));
      });

      it("should handle fs.existsSync error gracefully", () => {
        const workingDir = "/path/to/app";
        const error = new Error("Permission denied");

        vi.mocked(fs.existsSync).mockImplementation(() => {
          throw error;
        });

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(false);
        expect(result.app).toBeUndefined();
        expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("Pattern"));
      });

      it("should handle fs.readFileSync error gracefully", () => {
        const workingDir = "/path/to/app";
        const error = new Error("File read error");

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation(() => {
          throw error;
        });

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(false);
        expect(result.app).toBeUndefined();
        expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("Could not parse"));
      });
    });

    describe("Different directory paths", () => {
      it("should handle relative paths", () => {
        const workingDir = "./apps/my-app";
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          private: true,
          scripts: {
            build: "ffc app build",
          },
        };

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(true);
        expect(result.app?.path).toBe(workingDir);
      });

      it("should handle absolute paths", () => {
        const workingDir = "/home/user/workspace/apps/my-app";
        const packageJson: PackageJson = {
          name: "my-app",
          version: "1.0.0",
          dependencies: {
            "@equinor/fusion-framework": "^1.0.0",
          },
          private: true,
          scripts: {
            build: "ffc app build",
          },
        };

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

        const result = findFusionApp(workingDir);

        expect(result.isValid).toBe(true);
        expect(result.app?.path).toBe(workingDir);
      });
    });
  });
});
