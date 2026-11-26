import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.join(__dirname, "..", "..");
const releaseScriptPath = path.join(repoRoot, ".github", "scripts", "release-tags.sh");
const ciWorkflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      GIT_AUTHOR_NAME: "Test Author",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test Committer",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout.trim();
}

interface MockGhCall {
  args: string[];
  notes?: string;
}

interface Fixture {
  root: string;
  originDir: string;
  workDir: string;
  ghBinDir: string;
  ghLogPath: string;
  existingReleasesPath: string;
  commit: (message: string, files: Record<string, string>) => string;
  runScript: () => { status: number | null; stdout: string; stderr: string };
  remoteTagSha: (tag: string) => string;
  ghCalls: () => MockGhCall[];
}

function createGitFixture(initialVersion: string, initialChangelog: string): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), "fusion-release-tags-test-"));
  temporaryDirectories.push(root);

  const originDir = path.join(root, "origin.git");
  const workDir = path.join(root, "work");
  const ghBinDir = path.join(root, "bin");
  const ghLogPath = path.join(root, "gh-calls.jsonl");
  const existingReleasesPath = path.join(root, "existing-releases.txt");

  git(root, ["init", "--bare", originDir]);
  git(root, ["clone", originDir, workDir]);
  git(workDir, ["checkout", "-b", "main"]);

  writeFileSync(existingReleasesPath, "", "utf8");
  writeFileSync(ghLogPath, "", "utf8");

  // Create a mock `gh` CLI that records release calls and simulates release existence.
  spawnSync("mkdir", ["-p", ghBinDir]);
  const ghStubPath = path.join(ghBinDir, "gh");
  writeFileSync(
    ghStubPath,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const logPath = process.env.MOCK_GH_LOG;
const releasesPath = process.env.MOCK_GH_RELEASES;
const existing = new Set(
  fs.readFileSync(releasesPath, "utf8").split(/\\r?\\n/).filter(Boolean),
);

if (args[0] === "release" && args[1] === "view") {
  const tag = args[2];
  fs.appendFileSync(logPath, JSON.stringify({ args }) + "\\n");
  process.exit(existing.has(tag) ? 0 : 1);
}

if (args[0] === "release" && args[1] === "create") {
  const tag = args[2];
  const notesIndex = args.indexOf("--notes-file");
  const notes = notesIndex >= 0 ? fs.readFileSync(args[notesIndex + 1], "utf8") : undefined;
  fs.appendFileSync(logPath, JSON.stringify({ args, notes }) + "\\n");
  existing.add(tag);
  fs.writeFileSync(releasesPath, Array.from(existing).join("\\n") + "\\n");
  process.exit(0);
}

console.error("Unexpected gh invocation:", args);
process.exit(2);
`,
    "utf8",
  );
  chmodSync(ghStubPath, 0o755);

  const commit = (message: string, files: Record<string, string>): string => {
    for (const [relativePath, content] of Object.entries(files)) {
      writeFileSync(path.join(workDir, relativePath), content, "utf8");
    }
    git(workDir, ["add", "."]);
    git(workDir, ["commit", "-m", message]);
    return git(workDir, ["rev-parse", "HEAD"]);
  };

  commit(`Version Packages (${initialVersion})`, {
    "package.json": `${JSON.stringify({ name: "fusion-action-app-publish", version: initialVersion }, null, 2)}\n`,
    "CHANGELOG.md": initialChangelog,
  });
  git(workDir, ["push", "-u", "origin", "main"]);

  const runScript = () => {
    const result = spawnSync("bash", [releaseScriptPath], {
      cwd: workDir,
      encoding: "utf8",
      timeout: 10000,
      env: {
        PATH: `${ghBinDir}:${process.env.PATH ?? ""}`,
        MOCK_GH_LOG: ghLogPath,
        MOCK_GH_RELEASES: existingReleasesPath,
      },
    });
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  };

  const remoteTagSha = (tag: string): string => {
    const out = git(workDir, [
      "ls-remote",
      "--tags",
      "origin",
      `refs/tags/${tag}`,
      `refs/tags/${tag}^{}`,
    ]);
    if (!out) return "";
    const lines = out.split(/\r?\n/).filter(Boolean);
    const peeled = lines.find((line) => line.endsWith("^{}"));
    return (peeled ?? lines[0]).split(/\s+/)[0];
  };

  const ghCalls = (): MockGhCall[] =>
    readFileSync(ghLogPath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as MockGhCall);

  return {
    root,
    originDir,
    workDir,
    ghBinDir,
    ghLogPath,
    existingReleasesPath,
    commit,
    runScript,
    remoteTagSha,
    ghCalls,
  };
}

describe("CI release tag and GitHub Release automation", () => {
  it("delegates tagging to release-tags.sh without force-pushing all tags in ci.yml", () => {
    const ciWorkflow = readFileSync(ciWorkflowPath, "utf8");

    expect(ciWorkflow).toContain("bash .github/scripts/release-tags.sh");
    expect(ciWorkflow).toContain("create-github-releases: false");
    expect(ciWorkflow).not.toMatch(/git tag -f\b/);
    expect(ciWorkflow).not.toContain("git push origin --tags --force");
  });

  it("does not overwrite an existing patch tag or move floating aliases on non-release commits", () => {
    const fixture = createGitFixture(
      "2.2.2",
      "# Changelog\n\n## 2.2.2\n\n### Patch Changes\n\n- Initial 2.2.2 fix\n",
    );
    const v222Sha = git(fixture.workDir, ["rev-parse", "HEAD"]);

    // Initial release creates v2.2.2, v2.2, v2 and GitHub Release.
    const initialRun = fixture.runScript();
    expect(initialRun.status).toBe(0);
    expect(fixture.remoteTagSha("v2.2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v222Sha);

    // Non-release commit without a version bump (e.g., CI-only PR #131).
    const ciOnlySha = fixture.commit("ci: add workflow dependency lockfile", {
      "README.md": "updated docs only\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);
    // Even if local tag cache is missing, origin must still guard v2.2.2.
    git(fixture.workDir, ["tag", "-d", "v2.2.2"]);

    const callsBefore = fixture.ghCalls().length;
    const nonReleaseRun = fixture.runScript();

    expect(nonReleaseRun.status).toBe(0);
    expect(nonReleaseRun.stdout).toContain("already exists on origin");
    expect(fixture.remoteTagSha("v2.2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.2.2")).not.toBe(ciOnlySha);
    expect(fixture.ghCalls().length).toBe(callsBefore);
  });

  it("refuses to attach a missing release tag to a later non-release commit after a failed version-bump run", () => {
    const fixture = createGitFixture(
      "2.2.2",
      "# Changelog\n\n## 2.2.2\n\n### Patch Changes\n\n- Initial 2.2.2 fix\n",
    );
    const v222Sha = git(fixture.workDir, ["rev-parse", "HEAD"]);
    expect(fixture.runScript().status).toBe(0);

    // Version-bump commit lands, but its CI run fails before tagging (v2.2.3 is still missing).
    const versionBumpSha = fixture.commit("Version Packages (2.2.3)", {
      "package.json": `${JSON.stringify({ name: "fusion-action-app-publish", version: "2.2.3" }, null, 2)}\n`,
      "CHANGELOG.md":
        "# Changelog\n\n## 2.2.3\n\n### Patch Changes\n\n- Fix 2.2.3\n\n## 2.2.2\n\n- Initial 2.2.2 fix\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);

    // Next docs/CI-only commit keeps package.json at 2.2.3.
    const followUpDocsSha = fixture.commit("docs: clarify readme", {
      "README.md": "follow-up docs\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);

    const callsBefore = fixture.ghCalls().length;
    const docsRun = fixture.runScript();

    expect(docsRun.status).toBe(0);
    expect(docsRun.stdout).toContain("did not introduce version 2.2.3");
    expect(fixture.remoteTagSha("v2.2.3")).toBe("");
    expect(fixture.remoteTagSha("v2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v222Sha);
    expect(fixture.ghCalls().length).toBe(callsBefore);

    // Re-running on the actual version-bump commit publishes v2.2.3 at the right SHA.
    git(fixture.workDir, ["checkout", versionBumpSha]);
    const rerunResult = fixture.runScript();

    expect(rerunResult.status).toBe(0);
    expect(fixture.remoteTagSha("v2.2.3")).toBe(versionBumpSha);
    expect(fixture.remoteTagSha("v2.2.3")).not.toBe(followUpDocsSha);
    expect(fixture.remoteTagSha("v2.2")).toBe(versionBumpSha);
    expect(fixture.remoteTagSha("v2")).toBe(versionBumpSha);
  });

  it("publishes a new unused patch version with matching changelog release notes while preserving prior patch tags", () => {
    const fixture = createGitFixture(
      "2.2.2",
      "# Changelog\n\n## 2.2.2\n\n### Patch Changes\n\n- Initial 2.2.2 fix\n",
    );
    const v222Sha = git(fixture.workDir, ["rev-parse", "HEAD"]);
    expect(fixture.runScript().status).toBe(0);

    // Subsequent Version Packages merge allocates v2.2.3 and updates CHANGELOG.md.
    const v223Sha = fixture.commit("Version Packages (2.2.3)", {
      "package.json": `${JSON.stringify({ name: "fusion-action-app-publish", version: "2.2.3" }, null, 2)}\n`,
      "CHANGELOG.md": [
        "# Changelog",
        "",
        "## 2.2.3",
        "",
        "### Patch Changes",
        "",
        "- Keep published vX.Y.Z tags immutable and publish GitHub Releases.",
        "",
        "## 2.2.2",
        "",
        "### Patch Changes",
        "",
        "- Initial 2.2.2 fix",
        "",
      ].join("\n"),
    });
    git(fixture.workDir, ["push", "origin", "main"]);

    const releaseRun = fixture.runScript();
    expect(releaseRun.status).toBe(0);

    // Previous patch tag stays at v2.2.2; new patch tag and floating aliases advance to v2.2.3.
    expect(fixture.remoteTagSha("v2.2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.2.3")).toBe(v223Sha);
    expect(fixture.remoteTagSha("v2.2")).toBe(v223Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v223Sha);

    const createCalls = fixture
      .ghCalls()
      .filter((call) => call.args[0] === "release" && call.args[1] === "create");
    const v223Release = createCalls.find((call) => call.args[2] === "v2.2.3");

    expect(v223Release).toBeDefined();
    expect(v223Release?.args).toContain("--verify-tag");
    expect(v223Release?.args).toContain("--title");
    expect(v223Release?.notes).toContain("Keep published vX.Y.Z tags immutable");
    expect(v223Release?.notes).not.toContain("Initial 2.2.2 fix");
  });

  it("retries GitHub Release creation idempotently when the release tag already points to HEAD without moving newer floating aliases backwards", () => {
    const fixture = createGitFixture(
      "2.2.2",
      "# Changelog\n\n## 2.2.2\n\n### Patch Changes\n\n- Initial 2.2.2 fix\n",
    );
    const v222Sha = git(fixture.workDir, ["rev-parse", "HEAD"]);
    expect(fixture.runScript().status).toBe(0);

    const v223Sha = fixture.commit("Version Packages (2.2.3)", {
      "package.json": `${JSON.stringify({ name: "fusion-action-app-publish", version: "2.2.3" }, null, 2)}\n`,
      "CHANGELOG.md":
        "# Changelog\n\n## 2.2.3\n\n### Patch Changes\n\n- Fix 2.2.3\n\n## 2.2.2\n\n- Initial 2.2.2 fix\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);
    expect(fixture.runScript().status).toBe(0);

    // Simulate re-running on the older v2.2.2 commit with a missing GitHub Release.
    git(fixture.workDir, ["checkout", v222Sha]);
    writeFileSync(fixture.existingReleasesPath, "v2.2.3\n", "utf8");

    const retryRun = fixture.runScript();
    expect(retryRun.status).toBe(0);
    expect(fixture.remoteTagSha("v2.2.2")).toBe(v222Sha);
    // Floating tags must NOT regress from v2.2.3 back to v2.2.2.
    expect(fixture.remoteTagSha("v2.2")).toBe(v223Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v223Sha);
  });

  it("marks prereleases with --prerelease and never moves floating major/minor tags", () => {
    const fixture = createGitFixture(
      "2.2.2",
      "# Changelog\n\n## 2.2.2\n\n### Patch Changes\n\n- Initial 2.2.2 fix\n",
    );
    const v222Sha = git(fixture.workDir, ["rev-parse", "HEAD"]);
    expect(fixture.runScript().status).toBe(0);

    const rcSha = fixture.commit("Version Packages (2.3.0-rc.1)", {
      "package.json": `${JSON.stringify({ name: "fusion-action-app-publish", version: "2.3.0-rc.1" }, null, 2)}\n`,
      "CHANGELOG.md": "# Changelog\n\n## 2.3.0-rc.1\n\n- Release candidate\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);

    const rcRun = fixture.runScript();
    expect(rcRun.status).toBe(0);
    expect(fixture.remoteTagSha("v2.3.0-rc.1")).toBe(rcSha);
    expect(fixture.remoteTagSha("v2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.3")).toBe("");

    const rcRelease = fixture
      .ghCalls()
      .find((call) => call.args[1] === "create" && call.args[2] === "v2.3.0-rc.1");
    expect(rcRelease?.args).toContain("--prerelease");
  });

  it.each([
    "not-a-semver",
    "02.2.3",
    "2.02.3",
    "2.2.03",
    "2.3.0-01",
    "2.3.0-rc..1",
    "2.3.0-",
    "2.3.0-rc.1.",
  ])("fails loudly if package.json contains malformed semantic version %s", (malformedVersion) => {
    const fixture = createGitFixture(malformedVersion, "# Changelog\n");
    const result = fixture.runScript();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Invalid semantic version");
    expect(fixture.ghCalls()).toHaveLength(0);
  });
});
