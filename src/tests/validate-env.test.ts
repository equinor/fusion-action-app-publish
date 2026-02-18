import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateEnv } from "../core/validate-env";

vi.mock("@actions/core");

import * as core from "@actions/core";

describe("validate-env.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PR number handling", () => {
    it("should set tag and env outputs when prNR is provided", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "123";
        if (input === "env") return "";
        if (input === "tag") return "";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.info)).toHaveBeenCalledWith("prNR provided: 123");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("tag", "pr-123");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("env", "ci");
      expect(vi.mocked(core.setFailed)).not.toHaveBeenCalled();
    });

    it("should handle prNR with different values", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "456";
        if (input === "env") return "";
        if (input === "tag") return "";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.info)).toHaveBeenCalledWith("prNR provided: 456");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("tag", "pr-456");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("env", "ci");
    });

    it("should return early when prNR is provided (skip other validations)", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "123";
        if (input === "env") return ""; // Invalid env, but should be ignored
        if (input === "tag") return ""; // Missing tag, but should be ignored
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).not.toHaveBeenCalled();
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("tag", "pr-123");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("env", "ci");
    });
  });

  describe("Environment validation (when no prNR)", () => {
    it("should fail when env input is not provided", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "";
        if (input === "tag") return "v1.0.0";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith("Input 'env' is required.");
    });

    it("should fail when env input is undefined", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return undefined as unknown as string;
        if (input === "tag") return "v1.0.0";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith("Input 'env' is required.");
    });

    it("should fail for invalid environment value", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "invalid-env";
        if (input === "tag") return "v1.0.0";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith(
        "Input 'env' must be one of the following values: ci, tr, fprd, fqa, next.",
      );
    });

    it("should fail for case sensitive environment (uppercase)", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "CI";
        if (input === "tag") return "v1.0.0";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith(
        "Input 'env' must be one of the following values: ci, tr, fprd, fqa, next.",
      );
    });

    describe("Valid environments", () => {
      const validEnvs = ["ci", "tr", "fprd", "fqa", "next"];

      validEnvs.forEach((env) => {
        it(`should pass for valid environment: ${env}`, () => {
          vi.mocked(core.getInput).mockImplementation((input: string) => {
            if (input === "prNR") return "";
            if (input === "env") return env;
            if (input === "tag") return "v1.0.0";
            return "";
          });

          validateEnv();

          expect(vi.mocked(core.setFailed)).not.toHaveBeenCalled();
          expect(vi.mocked(core.info)).toHaveBeenCalledWith("Environment validation passed.");
        });
      });
    });
  });

  describe("Tag validation (when no prNR)", () => {
    it("should fail when tag input is not provided", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "ci";
        if (input === "tag") return "";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith("Input 'tag' is required.");
    });

    it("should fail when tag input is undefined", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "ci";
        if (input === "tag") return undefined as unknown as string;
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith("Input 'tag' is required.");
    });

    it("should fail when tag input is null", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "ci";
        if (input === "tag") return null as unknown as string;
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalledWith("Input 'tag' is required.");
    });
  });

  describe("Output setting (successful validation)", () => {
    it("should set env and tag outputs when validation passes", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "fqa";
        if (input === "tag") return "v2.1.0";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("env", "fqa");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("tag", "v2.1.0");
      expect(vi.mocked(core.info)).toHaveBeenCalledWith("Environment validation passed.");
    });

    it("should handle different valid combinations", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "fprd";
        if (input === "tag") return "latest";
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("env", "fprd");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("tag", "latest");
    });
  });

  describe("Complete validation flows", () => {
    it("should complete successful validation with env and tag", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "";
        if (input === "env") return "next";
        if (input === "tag") return "v1.2.3-beta";
        return "";
      });

      validateEnv();

      // Verify all expected calls happened
      expect(vi.mocked(core.getInput)).toHaveBeenCalledWith("prNR");
      expect(vi.mocked(core.getInput)).toHaveBeenCalledWith("env");
      expect(vi.mocked(core.getInput)).toHaveBeenCalledWith("tag");
      expect(vi.mocked(core.setFailed)).not.toHaveBeenCalled();
      expect(vi.mocked(core.info)).toHaveBeenCalledWith("Environment validation passed.");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("env", "next");
      expect(vi.mocked(core.setOutput)).toHaveBeenCalledWith("tag", "v1.2.3-beta");
    });

    it("should fail when prNR and env/tag provided ", () => {
      vi.mocked(core.getInput).mockImplementation((input: string) => {
        if (input === "prNR") return "999";
        if (input === "env") return "ci"; // This should be ignored
        if (input === "tag") return ""; // This should be ignored
        return "";
      });

      validateEnv();

      expect(vi.mocked(core.setFailed)).toHaveBeenCalled();
    });
  });
});
