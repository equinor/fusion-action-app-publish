import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { g as getInput, a as setFailed, i as info, s as setOutput } from "./core.js";
const PR_TAG_PREFIX = "pr-";
function validateEnv() {
  const prNR = getInput("prNR");
  const env = getInput("env");
  const tag = getInput("tag");
  if (prNR && env) {
    setFailed("Inputs 'prNR' and 'env' cannot be used together.");
    return;
  }
  if (prNR) {
    info(`prNR provided: ${prNR}`);
    setOutput("tag", `${PR_TAG_PREFIX}${prNR}`);
    setOutput("env", "ci");
    return;
  }
  if (!env) {
    setFailed("Input 'env' is required.");
    return;
  }
  const allowedEnvs = ["ci", "tr", "fprd", "fqa", "next"];
  if (!allowedEnvs.includes(env)) {
    setFailed(`Input 'env' must be one of the following values: ${allowedEnvs.join(", ")}.`);
    return;
  }
  if (!tag) {
    setFailed("Input 'tag' is required.");
    return;
  }
  info("Environment validation passed.");
  setOutput("env", env);
  setOutput("tag", tag);
}
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  validateEnv();
}
export {
  validateEnv
};
//# sourceMappingURL=validate-env.js.map
