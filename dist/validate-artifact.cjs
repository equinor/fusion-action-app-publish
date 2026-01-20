#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("@actions/core");
const fs = require("node:fs");
const path = require("node:path");
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
const core__namespace = /* @__PURE__ */ _interopNamespaceDefault(core);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
function validateArtifact() {
  const artifact = core__namespace.getInput("artifact");
  if (!artifact) {
    core__namespace.setFailed("Input 'artifact' is required.");
    return;
  }
  const artifactPath = path__namespace.resolve(artifact);
  if (!fs__namespace.existsSync(artifactPath)) {
    core__namespace.setFailed(`Artifact file does not exist at path: ${artifactPath}`);
    return;
  }
  const validExtensions = [".zip"];
  const artifactExtension = path__namespace.extname(artifactPath).toLowerCase();
  if (!validExtensions.includes(artifactExtension)) {
    core__namespace.setFailed(`Artifact file must be one of the following types: ${validExtensions.join(", ")}`);
    return;
  }
  core__namespace.info("Artifact validation passed.");
  core__namespace.setOutput("artifact-path", artifactPath);
}
if (require.main === module) {
  validateArtifact();
}
exports.validateArtifact = validateArtifact;
//# sourceMappingURL=validate-artifact.cjs.map
