import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.join(__dirname, "..", "..");
const manifest = readFileSync(path.join(repoRoot, "action.yml"), "utf8");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function publishStep(config: boolean): string {
  const name = config ? "Publish with config (if provided)" : "Publish App Bundle";
  const step = manifest.split(`    - name: ${name}\n`)[1]?.split("\n    - name:")[0];
  if (!step) throw new Error(`Publish step not found: ${name}`);
  return step;
}

function publishScript(config: boolean): string {
  const script = publishStep(config).match(/^ {6}run: (.+)$/m)?.[1];
  if (!script) throw new Error(`Publish script not found (config=${config})`);

  return script.replaceAll(`\${{ github.action_path }}`, repoRoot);
}

function runPublish(options: {
  config: boolean;
  tag?: string;
  snapshot?: string;
  artifact?: string;
  exitCode?: number;
  error?: string;
  stdout?: string;
  allowExistingVersion?: string;
  env?: string;
  token?: string | null;
}) {
  const directory = mkdtempSync(path.join(tmpdir(), "fusion-publish-test-"));
  temporaryDirectories.push(directory);
  const calls = path.join(directory, "calls");
  const continuation = path.join(directory, "continuation");
  const auth = path.join(directory, "auth");
  const child = spawnSync(
    "bash",
    [
      "--noprofile",
      "--norc",
      "-e",
      "-o",
      "pipefail",
      "-c",
      `
npx() {
  printf '%s\\0' "$@" >> "$CALLS"
  if [[ "\${FUSION_TOKEN+x}" == x ]]; then
    printf '%s' "$FUSION_TOKEN" > "$AUTH_CAPTURE"
  fi
  printf '%s\\n' "$CLI_STDOUT"
  printf '%s\\n' "$CLI_ERROR" >&2
  return "$CLI_EXIT"
}
export -f npx
${publishScript(options.config)}
printf '%s' 'continued' > "$CONTINUATION"
`,
    ],
    {
      cwd: directory,
      encoding: "utf8",
      timeout: 5000,
      env: {
        PATH: process.env.PATH,
        RUNNER_TEMP: directory,
        CALLS: calls,
        CLI_EXIT: String(options.exitCode ?? 0),
        CLI_ERROR: options.error ?? "",
        CLI_STDOUT: options.stdout ?? "",
        CONTINUATION: continuation,
        AUTH_CAPTURE: auth,
        FUSION_TOKEN: options.token === null ? undefined : (options.token ?? "controlled-token"),
        INPUT_CONFIG: options.config ? "config with spaces.ts" : "",
        INPUT_ARTIFACT: options.artifact ?? "bundle with spaces.zip",
        INPUT_SNAPSHOT: options.snapshot ?? "",
        INPUT_ALLOW_EXISTING_VERSION: options.allowExistingVersion ?? "",
        INPUT_ENV: options.env ?? "ci",
        INPUT_TAG: options.tag ?? "latest",
      },
    },
  );
  if (child.error) throw child.error;
  expect(child.signal).toBeNull();
  const args = existsSync(calls) ? readFileSync(calls, "utf8").split("\0").slice(0, -1) : [];
  return {
    child,
    args,
    directory,
    continued: existsSync(continuation),
    token: existsSync(auth) ? readFileSync(auth, "utf8") : undefined,
    logs: readdirSync(directory).filter((name) => name.startsWith("fusion-app-publish.")),
  };
}

describe.each([false, true])("Publish shell (config=%s)", (config) => {
  it.each([{ env: "" }, { tag: "" }])("rejects a missing resolved target: %j", (target) => {
    const { child, args, continued } = runPublish({ config, ...target });

    expect(child.status).toBe(1);
    expect(child.stdout).toContain("::error::Resolved publish environment, tag");
    expect(args).toEqual([]);
    expect(continued).toBe(false);
  });

  it("wires the input and resolved target through the action environment", () => {
    const step = publishStep(config);
    expect(step).toContain(`INPUT_CONFIG: \${{ inputs.config }}`);
    expect(step).toContain(`INPUT_ALLOW_EXISTING_VERSION: \${{ inputs.allow-existing-version }}`);
    expect(step).toContain(`INPUT_ENV: \${{ steps.validate-env.outputs.env }}`);
    expect(step).toContain(`INPUT_TAG: \${{ steps.validate-env.outputs.tag }}`);
    expect(step).not.toContain("continue-on-error");
  });

  it.each(["latest", "pr-42"])("passes the exact resolved %s target and quoted paths", (tag) => {
    const { child, args, directory } = runPublish({ config, tag });

    expect(child.status).toBe(0);
    expect(args).toEqual([
      "--prefix",
      path.join(directory, "fusion-app-publish"),
      "-y",
      "-p",
      "@equinor/fusion-framework-cli@latest",
      "ffc",
      "app",
      "publish",
      "--env",
      "ci",
      "--tag",
      tag,
      ...(config ? ["--config", "config with spaces.ts"] : []),
      "bundle with spaces.zip",
    ]);
  });

  it.each(["", "false", "true"])(
    "forwards allow-existing-version=%s without changing ordinary success",
    (allowExistingVersion) => {
      const { child, args, continued, token } = runPublish({ config, allowExistingVersion });

      expect(child.status).toBe(0);
      expect(continued).toBe(true);
      expect(token).toBe("controlled-token");
      expect(args[4]).toBe(
        `@equinor/fusion-framework-cli@${allowExistingVersion === "true" ? "15.7.0" : "latest"}`,
      );
      expect(args.includes("--allow-existing-version")).toBe(allowExistingVersion === "true");
      expect(child.stdout).not.toContain("::notice::");
    },
  );

  it.each(["false", "true"])(
    "omits an empty token for Azure authentication with allow-existing-version=%s",
    (allowExistingVersion) => {
      const { child, continued, token } = runPublish({
        config,
        allowExistingVersion,
        token: "",
      });

      expect(child.status).toBe(0);
      expect(continued).toBe(true);
      expect(token).toBeUndefined();
    },
  );

  it("preserves an absent token for Azure authentication", () => {
    const { child, token } = runPublish({ config, token: null });

    expect(child.status).toBe(0);
    expect(token).toBeUndefined();
  });

  it.each([
    { tag: "latest", version: "19.2.0+8421b01", env: "fqa" },
    { tag: "latest", version: "18.0.0+older-commit", env: "fqa" },
    { tag: "pr-42", version: "19.2.0+8421b01", env: "ci" },
  ])(
    "reports successful recovery for $tag at $version and allows continuation",
    ({ tag, version, env }) => {
      const message = `Existing application version bundle-app@${version} was re-tagged "${tag}" in environment "${env}".`;
      const { child, args, continued, logs } = runPublish({
        config,
        tag,
        env,
        allowExistingVersion: "true",
        error: `\u001b[34m[app:publish]\u001b[0m ℹ ${message}`,
      });

      expect(child.status).toBe(0);
      expect(continued).toBe(true);
      expect(args.slice(4)).toEqual([
        "@equinor/fusion-framework-cli@15.7.0",
        "ffc",
        "app",
        "publish",
        "--env",
        env,
        "--tag",
        tag,
        "--allow-existing-version",
        ...(config ? ["--config", "config with spaces.ts"] : []),
        "bundle with spaces.zip",
      ]);
      expect(child.stdout).toContain(`::notice::${message}`);
      expect(child.stdout.match(/::notice::/g)).toHaveLength(1);
      expect(logs).toEqual([]);
    },
  );

  it("preserves source snapshot arguments when recovery is enabled", () => {
    const { child, args } = runPublish({
      config,
      artifact: "",
      snapshot: "pr-42",
      tag: "pr-42",
      allowExistingVersion: "true",
    });

    expect(child.status).toBe(0);
    expect(args.slice(args.indexOf("--tag") + 2)).toEqual([
      "--allow-existing-version",
      "--snapshot",
      "pr-42",
      ...(config ? ["--config", "config with spaces.ts"] : []),
    ]);
  });

  it.each(["yes", "TRUE", "1", "false --allow-existing-version"])(
    "rejects invalid opt-in %s before invoking the CLI",
    (allowExistingVersion) => {
      const { child, args, continued } = runPublish({ config, allowExistingVersion });

      expect(child.status).toBe(1);
      expect(child.stdout).toContain("::error::Input 'allow-existing-version'");
      expect(args).toEqual([]);
      expect(continued).toBe(false);
    },
  );

  it.each([
    { snapshot: "", expected: [] },
    { snapshot: "false", expected: [] },
    { snapshot: "true", expected: ["--snapshot"] },
    { snapshot: "pr-42", expected: ["--snapshot", "pr-42"] },
  ])("preserves source publishing with snapshot=$snapshot", ({ snapshot, expected }) => {
    const { child, args } = runPublish({ config, artifact: "", snapshot });

    expect(child.status).toBe(0);
    expect(args.slice(args.indexOf("--tag") + 2)).toEqual([
      ...expected,
      ...(config ? ["--config", "config with spaces.ts"] : []),
    ]);
  });

  it.each([
    "409 - Version is already published, please generate a new release",
    "409 - Unrelated upload conflict",
    "409 - Failed to tag application",
    "401 - Authentication failed",
    "Failed to discover apps service",
    "Network request failed",
    "Invalid bundle manifest",
    "Failed to upload config",
  ])("propagates CLI failure without retrying or recovering: %s", (error) => {
    const { child, args } = runPublish({ config, exitCode: 1, error });

    expect(child.status).toBe(1);
    expect(child.stderr).toContain(error);
    expect(args.filter((arg) => arg === "ffc")).toHaveLength(1);
    expect(args).not.toContain("tag");
    expect(child.stdout).not.toContain("::notice::");
  });

  it.each([
    "409 - Version is already published, please generate a new release",
    "409 - Unrelated upload conflict",
    "Failed to tag application",
    "401 - Authentication failed",
    "Failed to discover apps service",
    "Network request failed",
    "Invalid bundle manifest",
    "Failed to upload config",
  ])("fails closed even when opted in: %s", (error) => {
    const { child, args, continued, logs } = runPublish({
      config,
      allowExistingVersion: "true",
      exitCode: 7,
      error,
      stdout:
        'Existing application version bundle-app@1.0.0 was re-tagged "latest" in environment "ci".',
    });

    expect(child.status).toBe(7);
    expect(child.stdout).toContain(error);
    expect(child.stdout).not.toContain("::notice::");
    expect(args.filter((arg) => arg === "ffc")).toHaveLength(1);
    expect(continued).toBe(false);
    expect(logs).toEqual([]);
  });

  it("ignores confirmations for another target and incomplete recovery messages", () => {
    const { child } = runPublish({
      config,
      allowExistingVersion: "true",
      stdout: [
        "Bundle version already exists; proceeding to tagging.",
        'Existing application version bundle-app@1.0.0 was re-tagged "preview" in environment "ci".',
        'Existing application version bundle-app@1.0.0 was re-tagged "latest" in environment "fprd".',
      ].join("\n"),
    });

    expect(child.status).toBe(0);
    expect(child.stdout).not.toContain("::notice::");
  });

  it("escapes workflow-command data in recovery notices", () => {
    const { child } = runPublish({
      config,
      allowExistingVersion: "true",
      stdout:
        'Existing application version app%name@1.0.0 was re-tagged "latest" in environment "ci".',
    });

    expect(child.stdout).toContain("::notice::Existing application version app%25name@1.0.0");
  });
});

it("keeps metadata steps on the successful publish path and does not summarize failures as published", () => {
  const checkMeta = manifest
    .split("    - name: Check Meta Comment\n")[1]
    ?.split("\n    - name:")[0];
  const metadata = manifest
    .split("    - name: Post Publish Metadata\n")[1]
    ?.split("\n    - name:")[0];
  const summary = manifest.split("    - name: Workflow Summary\n")[1]?.split("\n    - name:")[0];

  expect(checkMeta).toContain("if: steps.validate-artifact.outputs.artifact-provided == 'true'");
  expect(metadata).toContain("steps.check-meta.outputs.exists == 'false'");
  expect(metadata).not.toContain("always()");
  expect(metadata).not.toContain("steps.publish.");
  expect(summary).toContain("if: success()");
  expect(manifest).toMatch(/allow-existing-version:\n(?: {4}.*\n)* {4}default: 'false'/);
});
