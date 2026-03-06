import * as fs from "node:fs";
import { i as info, e as error, g as getInput, a as setFailed } from "./core.js";
async function generateWorkflowSummary(data) {
  if (!data.appName || !data.appVersion || !data.environment || !data.tag) {
    throw new Error(
      "Missing required summary data: appName, appVersion, environment, and tag are required"
    );
  }
  try {
    const title = `${data.appName} ${data.appVersion} published to ${data.environment}`;
    let summaryContent = `## 🚀 ${title}

`;
    summaryContent += `**Tag:** ${data.tag}
`;
    if (data.appUrl) {
      summaryContent += `**App URL:** ${data.appUrl}
`;
    }
    await fs.promises.appendFile(process.env.GITHUB_STEP_SUMMARY || "", summaryContent);
    info(`Workflow summary generated: ${title}`);
  } catch (error$1) {
    error(`Failed to generate workflow summary: ${error$1}`);
    throw error$1;
  }
}
async function main() {
  try {
    const appName = getInput("app-name") || process.env.INPUT_APP_NAME || "";
    const appVersion = getInput("app-version") || process.env.INPUT_APP_VERSION || "";
    const environment = getInput("environment") || process.env.INPUT_ENVIRONMENT || "";
    const tag = getInput("tag") || process.env.INPUT_TAG || "";
    const appUrl = getInput("app-url") || process.env.INPUT_APP_URL || "";
    const summaryData = {
      appName,
      appVersion,
      environment,
      tag,
      appUrl: appUrl || void 0
    };
    await generateWorkflowSummary(summaryData);
  } catch (error2) {
    setFailed(`Action failed with error ${error2}`);
  }
}
export {
  generateWorkflowSummary,
  main
};
//# sourceMappingURL=generate-workflow-summary.js.map
