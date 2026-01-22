import { c as coreExports } from "./core.js";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
const PR_TAG_PREFIX = "pr-";
function validateEnv() {
  const prNR = coreExports.getInput("prNR");
  const env = coreExports.getInput("env");
  const tag = coreExports.getInput("tag");
  if (prNR) {
    coreExports.info(`prNR provided: ${prNR}`);
    coreExports.setOutput("tag", `${PR_TAG_PREFIX}${prNR}`);
    coreExports.setOutput("env", "ci");
    return;
  }
  if (!env) {
    coreExports.setFailed("Input 'env' is required.");
    return;
  }
  const allowedEnvs = ["ci", "tr", "fprd", "fqa", "next"];
  if (!allowedEnvs.includes(env)) {
    coreExports.setFailed(`Input 'env' must be one of the following values: ${allowedEnvs.join(", ")}.`);
    return;
  }
  if (!tag) {
    coreExports.setFailed("Input 'tag' is required.");
    return;
  }
  coreExports.info("Environment validation passed.");
  coreExports.setOutput("env", env);
  coreExports.setOutput("tag", tag);
}
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  validateEnv();
}
export {
  validateEnv
};
//# sourceMappingURL=validate-env.js.map
