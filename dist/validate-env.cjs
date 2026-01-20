#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("@actions/core");
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
const PR_TAG_PREFIX = "pr-";
function validateEnv() {
  const prNR = core__namespace.getInput("prNR");
  const env = core__namespace.getInput("env");
  const tag = core__namespace.getInput("tag");
  if (prNR) {
    core__namespace.info(`prNR provided: ${prNR}`);
    core__namespace.setOutput("tag", `${PR_TAG_PREFIX}${prNR}`);
    core__namespace.setOutput("env", "ci");
    return;
  }
  if (!env) {
    core__namespace.setFailed("Input 'env' is required.");
    return;
  }
  const allowedEnvs = ["ci", "tr", "fprd", "fqa", "next"];
  if (!allowedEnvs.includes(env)) {
    core__namespace.setFailed(`Input 'env' must be one of the following values: ${allowedEnvs.join(", ")}.`);
    return;
  }
  if (!tag) {
    core__namespace.setFailed("Input 'tag' is required.");
    return;
  }
  core__namespace.info("Environment validation passed.");
  core__namespace.setOutput("env", env);
  core__namespace.setOutput("tag", tag);
}
if (require.main === module) {
  validateEnv();
}
exports.validateEnv = validateEnv;
//# sourceMappingURL=validate-env.cjs.map
