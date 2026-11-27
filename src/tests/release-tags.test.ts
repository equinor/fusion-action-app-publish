import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.join(__dirname, "..", "..");
const releaseScriptPath = path.join(repoRoot, ".github", "scripts", "release-tags.sh");
const ciWorkflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");
const releaseWorkflowPath = path.join(repoRoot, ".github", "workflows", "release.yml");
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
  runScript: (args?: string[]) => { status: number | null; stdout: string; stderr: string };
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
  git(originDir, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(root, ["clone", originDir, workDir]);
  git(workDir, ["checkout", "-B", "main"]);

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

  const runScript = (args: string[] = []) => {
    const result = spawnSync("bash", [releaseScriptPath, ...args], {
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
  it("separates Changesets PR management in ci.yml from release publication in release.yml", () => {
    const ciWorkflow = readFileSync(ciWorkflowPath, "utf8");
    const releaseWorkflow = readFileSync(releaseWorkflowPath, "utf8");

    expect(ciWorkflow).toContain("pr-title: '🤖 Release - Fusion Action App Publish'");
    expect(ciWorkflow).toContain("create-github-releases: false");
    expect(ciWorkflow).toContain("push-with-git-cli: true");
    expect(ciWorkflow).toContain("version-script: pnpm run changeset:version");
    expect(ciWorkflow).toContain("steps.changesets.outputs.has-changesets");
    expect(ciWorkflow).toContain("steps.changesets.outputs.pr-number");
    expect(ciWorkflow).not.toContain("release-tags.sh");
    expect(ciWorkflow).not.toMatch(/git tag -f\b/);
    expect(ciWorkflow).not.toContain("git push origin --tags --force");

    expect(releaseWorkflow).toContain("types: [closed]");
    expect(releaseWorkflow).toContain("workflow_dispatch:");
    expect(releaseWorkflow).toContain("github.ref == 'refs/heads/main'");
    expect(releaseWorkflow).toContain("github.event.pull_request.merged == true");
    expect(releaseWorkflow).toContain("github.event.pull_request.base.ref == 'main'");
    expect(releaseWorkflow).toContain(
      "github.event.pull_request.head.ref == 'changeset-release/main'",
    );
    expect(releaseWorkflow).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository",
    );
    expect(releaseWorkflow).toContain("github.event.pull_request.merge_commit_sha");
    expect(releaseWorkflow).not.toMatch(/^concurrency:/m);
    expect(releaseWorkflow).toContain("    concurrency:\n      group: release-main");
    expect(releaseWorkflow).toContain("--resolve-release-sha");
    expect(releaseWorkflow).toMatch(/git checkout --detach "\$\{RELEASE_SHA\}"/);
    expect(releaseWorkflow).toContain("run: pnpm run test:ci");
    expect(releaseWorkflow).toContain("run: pnpm run lint");
    expect(releaseWorkflow).toContain("run: pnpm run build");
    expect(releaseWorkflow.indexOf("--resolve-release-sha")).toBeLessThan(
      releaseWorkflow.indexOf("uses: $/.github/workflows/actions/node-setup"),
    );
    expect(releaseWorkflow.indexOf("run: pnpm run build")).toBeLessThan(
      releaseWorkflow.indexOf("Create GitHub Release and Update Action Tags"),
    );
    expect(releaseWorkflow).toMatch(/bash "\$\{RUNNER_TEMP\}\/release-tags\.sh"/);
    expect(releaseWorkflow).not.toMatch(/git tag -f\b/);
    expect(releaseWorkflow).not.toContain("git push origin --tags --force");
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

    const createCallsBefore = fixture
      .ghCalls()
      .filter((call) => call.args[0] === "release" && call.args[1] === "create").length;

    // Running directly on a non-release commit refuses to publish without checking out RELEASE_SHA.
    const directNonReleaseRun = fixture.runScript();
    expect(directNonReleaseRun.status).toBe(1);
    expect(directNonReleaseRun.stderr).toContain("does not match the version-introducing commit");
    expect(fixture.remoteTagSha("v2.2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.2.2")).not.toBe(ciOnlySha);

    // Following release.yml's resolve -> checkout -> publish flow stays idempotent with no changes.
    const resolved = fixture.runScript(["--resolve-release-sha"]);
    expect(resolved.status).toBe(0);
    expect(resolved.stdout.trim()).toBe(v222Sha);

    git(fixture.workDir, ["checkout", "--detach", resolved.stdout.trim()]);
    const idempotentRun = fixture.runScript();
    expect(idempotentRun.status).toBe(0);
    expect(idempotentRun.stdout).toContain(`already points to release commit (${v222Sha})`);
    expect(idempotentRun.stdout).toContain("GitHub Release v2.2.2 already exists");
    expect(fixture.remoteTagSha("v2.2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v222Sha);
    expect(
      fixture.ghCalls().filter((call) => call.args[0] === "release" && call.args[1] === "create")
        .length,
    ).toBe(createCallsBefore);
  });

  it("refuses to publish an earlier release SHA until checked out, then recovers cleanly via --resolve-release-sha", () => {
    const fixture = createGitFixture(
      "2.2.2",
      "# Changelog\n\n## 2.2.2\n\n### Patch Changes\n\n- Initial 2.2.2 fix\n",
    );
    const v222Sha = git(fixture.workDir, ["rev-parse", "HEAD"]);
    expect(fixture.runScript().status).toBe(0);

    // Version-bump commit lands, but its release run fails or is dropped before tagging.
    const versionBumpSha = fixture.commit("Version Packages (2.2.3)", {
      "package.json": `${JSON.stringify({ name: "fusion-action-app-publish", version: "2.2.3" }, null, 2)}\n`,
      "CHANGELOG.md":
        "# Changelog\n\n## 2.2.3\n\n### Patch Changes\n\n- Fix 2.2.3\n\n## 2.2.2\n\n- Initial 2.2.2 fix\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);

    // Later non-release commit advances main.
    const followUpDocsSha = fixture.commit("docs: clarify readme", {
      "README.md": "follow-up docs\n",
      "CHANGELOG.md": "# Changelog\n\n## 2.2.3\n\n### Patch Changes\n\n- Mutated later docs\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);

    // Without checking out RELEASE_SHA first, release-tags.sh refuses to tag an unvalidated earlier commit.
    const unvalidatedRun = fixture.runScript();
    expect(unvalidatedRun.status).toBe(1);
    expect(unvalidatedRun.stderr).toContain("does not match the version-introducing commit");
    expect(fixture.remoteTagSha("v2.2.3")).toBe("");
    expect(fixture.remoteTagSha("v2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v222Sha);

    // Resolving RELEASE_SHA first allows release.yml to check it out, validate it, and then publish it.
    const resolved = fixture.runScript(["--resolve-release-sha"]);
    expect(resolved.status).toBe(0);
    expect(resolved.stdout.trim()).toBe(versionBumpSha);

    git(fixture.workDir, ["checkout", "--detach", resolved.stdout.trim()]);
    const recoveryRun = fixture.runScript();

    expect(recoveryRun.status).toBe(0);
    expect(fixture.remoteTagSha("v2.2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2.2.3")).toBe(versionBumpSha);
    expect(fixture.remoteTagSha("v2.2.3")).not.toBe(followUpDocsSha);
    expect(fixture.remoteTagSha("v2.2")).toBe(versionBumpSha);
    expect(fixture.remoteTagSha("v2")).toBe(versionBumpSha);

    const v223Release = fixture
      .ghCalls()
      .find((call) => call.args[1] === "create" && call.args[2] === "v2.2.3");
    expect(v223Release?.notes).toContain("Fix 2.2.3");
    expect(v223Release?.notes).not.toContain("Mutated later docs");
  });

  it("finishes incomplete GitHub Release and floating alias updates on retry after main advances", () => {
    const fixture = createGitFixture(
      "2.2.2",
      "# Changelog\n\n## 2.2.2\n\n### Patch Changes\n\n- Initial 2.2.2 fix\n",
    );
    const v222Sha = git(fixture.workDir, ["rev-parse", "HEAD"]);
    expect(fixture.runScript().status).toBe(0);

    const versionBumpSha = fixture.commit("Version Packages (2.2.3)", {
      "package.json": `${JSON.stringify({ name: "fusion-action-app-publish", version: "2.2.3" }, null, 2)}\n`,
      "CHANGELOG.md":
        "# Changelog\n\n## 2.2.3\n\n### Patch Changes\n\n- Partial failure fix 2.2.3\n\n## 2.2.2\n\n- Initial 2.2.2 fix\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);
    git(fixture.workDir, ["tag", "v2.2.3", versionBumpSha]);
    git(fixture.workDir, ["push", "origin", "refs/tags/v2.2.3"]);

    expect(fixture.remoteTagSha("v2.2.3")).toBe(versionBumpSha);
    expect(fixture.remoteTagSha("v2.2")).toBe(v222Sha);
    expect(fixture.remoteTagSha("v2")).toBe(v222Sha);

    const followUpSha = fixture.commit("docs: update after partial failure", {
      "README.md": "after partial failure\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);

    // Resolve and check out RELEASE_SHA just as release.yml does before running validation & publish.
    const resolved = fixture.runScript(["--resolve-release-sha"]);
    expect(resolved.status).toBe(0);
    expect(resolved.stdout.trim()).toBe(versionBumpSha);

    git(fixture.workDir, ["checkout", "--detach", resolved.stdout.trim()]);
    const retryRun = fixture.runScript();
    expect(retryRun.status).toBe(0);
    expect(fixture.remoteTagSha("v2.2.3")).toBe(versionBumpSha);
    expect(fixture.remoteTagSha("v2.2.3")).not.toBe(followUpSha);
    expect(fixture.remoteTagSha("v2.2")).toBe(versionBumpSha);
    expect(fixture.remoteTagSha("v2")).toBe(versionBumpSha);

    const v223Release = fixture
      .ghCalls()
      .find((call) => call.args[1] === "create" && call.args[2] === "v2.2.3");
    expect(v223Release).toBeDefined();
    expect(v223Release?.notes).toContain("Partial failure fix 2.2.3");
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

  it("refuses to move floating aliases backwards when a concurrent publisher advances them after the snapshot", () => {
    const fixture = createGitFixture(
      "2.2.2",
      "# Changelog\n\n## 2.2.2\n\n### Patch Changes\n\n- Initial 2.2.2 fix\n",
    );
    expect(fixture.runScript().status).toBe(0);

    const v223Sha = fixture.commit("Version Packages (2.2.3)", {
      "package.json": `${JSON.stringify({ name: "fusion-action-app-publish", version: "2.2.3" }, null, 2)}\n`,
      "CHANGELOG.md":
        "# Changelog\n\n## 2.2.3\n\n### Patch Changes\n\n- Fix 2.2.3\n\n## 2.2.2\n\n- Initial 2.2.2 fix\n",
    });
    git(fixture.workDir, ["push", "origin", "main"]);

    const concurrentDir = path.join(fixture.root, "concurrent");
    git(fixture.root, ["clone", "--branch", "main", fixture.originDir, concurrentDir]);
    writeFileSync(
      path.join(concurrentDir, "package.json"),
      `${JSON.stringify({ name: "fusion-action-app-publish", version: "2.2.4" }, null, 2)}\n`,
      "utf8",
    );
    git(concurrentDir, ["add", "package.json"]);
    git(concurrentDir, ["commit", "-m", "Version Packages (2.2.4)"]);
    const concurrentV224Sha = git(concurrentDir, ["rev-parse", "HEAD"]);
    git(concurrentDir, ["push", "origin", "main"]);

    const realGit = spawnSync("which", ["git"], { encoding: "utf8" }).stdout.trim();
    const wrapperDir = path.join(fixture.root, "race-bin");
    spawnSync("mkdir", ["-p", wrapperDir]);
    const gitWrapperPath = path.join(wrapperDir, "git");
    writeFileSync(
      gitWrapperPath,
      `#!/usr/bin/env bash
set -euo pipefail
"${realGit}" "$@"
if [[ "$*" == *"ls-remote --tags origin refs/tags/v2.*"* ]]; then
  "${realGit}" --git-dir="${fixture.originDir}" update-ref refs/tags/v2.2.4 "${concurrentV224Sha}"
  "${realGit}" --git-dir="${fixture.originDir}" update-ref refs/tags/v2.2 "${concurrentV224Sha}"
  "${realGit}" --git-dir="${fixture.originDir}" update-ref refs/tags/v2 "${concurrentV224Sha}"
fi
`,
      "utf8",
    );
    chmodSync(gitWrapperPath, 0o755);

    const raceResult = spawnSync("bash", [releaseScriptPath], {
      cwd: fixture.workDir,
      encoding: "utf8",
      timeout: 10000,
      env: {
        PATH: `${wrapperDir}:${fixture.ghBinDir}:${process.env.PATH ?? ""}`,
        MOCK_GH_LOG: fixture.ghLogPath,
        MOCK_GH_RELEASES: fixture.existingReleasesPath,
      },
    });

    expect(raceResult.status).not.toBe(0);
    expect(fixture.remoteTagSha("v2.2.3")).toBe(v223Sha);
    expect(fixture.remoteTagSha("v2.2")).toBe(concurrentV224Sha);
    expect(fixture.remoteTagSha("v2")).toBe(concurrentV224Sha);
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
