#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const fs = require("node:fs");
const path = require("node:path");
const core = require("./core.js");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
function validateArtifact() {
  const artifact = core.coreExports.getInput("artifact");
  if (!artifact) {
    core.coreExports.setFailed("Input 'artifact' is required.");
    return;
  }
  const artifactPath = path__namespace.resolve(artifact);
  if (!fs__namespace.existsSync(artifactPath)) {
    core.coreExports.setFailed(`Artifact file does not exist at path: ${artifactPath}`);
    return;
  }
  const validExtensions = [".zip"];
  const artifactExtension = path__namespace.extname(artifactPath).toLowerCase();
  if (!validExtensions.includes(artifactExtension)) {
    core.coreExports.setFailed(
      `Artifact file must be one of the following types: ${validExtensions.join(", ")}`
    );
    return;
  }
  core.coreExports.info("Artifact validation passed.");
  core.coreExports.setOutput("artifact-path", artifactPath);
}
if (require.main === module) {
  validateArtifact();
}
exports.validateArtifact = validateArtifact;
//# sourceMappingURL=validate-artifact.cjs.map
