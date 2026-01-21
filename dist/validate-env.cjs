#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const core = require("./core.js");
const PR_TAG_PREFIX = "pr-";
function validateEnv() {
  const prNR = core.coreExports.getInput("prNR");
  const env = core.coreExports.getInput("env");
  const tag = core.coreExports.getInput("tag");
  if (prNR) {
    core.coreExports.info(`prNR provided: ${prNR}`);
    core.coreExports.setOutput("tag", `${PR_TAG_PREFIX}${prNR}`);
    core.coreExports.setOutput("env", "ci");
    return;
  }
  if (!env) {
    core.coreExports.setFailed("Input 'env' is required.");
    return;
  }
  const allowedEnvs = ["ci", "tr", "fprd", "fqa", "next"];
  if (!allowedEnvs.includes(env)) {
    core.coreExports.setFailed(`Input 'env' must be one of the following values: ${allowedEnvs.join(", ")}.`);
    return;
  }
  if (!tag) {
    core.coreExports.setFailed("Input 'tag' is required.");
    return;
  }
  core.coreExports.info("Environment validation passed.");
  core.coreExports.setOutput("env", env);
  core.coreExports.setOutput("tag", tag);
}
if (require.main === module) {
  validateEnv();
}
exports.validateEnv = validateEnv;
//# sourceMappingURL=validate-env.cjs.map
