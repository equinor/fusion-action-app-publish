#!/usr/bin/env bash
set -euo pipefail

NOTES_FILE=""
cleanup() {
  if [[ -n "${NOTES_FILE}" ]]; then
    rm -f "${NOTES_FILE}"
  fi
}
trap cleanup EXIT

PARSED_VERSION=$(
  node -e '
    const pkg = require("./package.json");
    const version = typeof pkg.version === "string" ? pkg.version : "";
    const semverRe = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?$/;
    const match = version.match(semverRe);
    if (!match) {
      console.error(`Error: Invalid semantic version in package.json: '\''${version}'\''`);
      process.exit(1);
    }
    console.log([version, match[1], match[2], match[3], match[4] ?? ""].join("\t"));
  '
)

IFS=$'\t' read -r VERSION MAJOR MINOR PATCH PRERELEASE <<<"${PARSED_VERSION}"
TAG="v${VERSION}"
HEAD_SHA=$(git rev-parse HEAD)

resolve_remote_tag_sha() {
  local tag_name="$1"
  git ls-remote --tags origin "refs/tags/${tag_name}" "refs/tags/${tag_name}^{}" |
    awk '$2 ~ /\^\{\}$/ { sha=$1 } $2 !~ /\^\{\}$/ && sha == "" { sha=$1 } END { print sha }'
}

REMOTE_TAG_SHA=$(resolve_remote_tag_sha "${TAG}")

# Non-release pushes to main keep the already-tagged package.json version.
# Never overwrite an existing release tag or move floating aliases for non-release commits.
if [[ -n "${REMOTE_TAG_SHA}" && "${REMOTE_TAG_SHA}" != "${HEAD_SHA}" ]]; then
  echo "Tag ${TAG} already exists on origin at ${REMOTE_TAG_SHA} (HEAD is ${HEAD_SHA}); skipping tag and release creation."
  exit 0
fi

if [[ -z "${REMOTE_TAG_SHA}" ]]; then
  if git rev-parse -q --verify HEAD^ >/dev/null 2>&1 && git cat-file -e HEAD^:package.json 2>/dev/null; then
    PREV_VERSION=$(
      git show HEAD^:package.json | node -e '
        const fs = require("node:fs");
        const pkg = JSON.parse(fs.readFileSync(0, "utf8"));
        if (typeof pkg.version === "string") process.stdout.write(pkg.version);
      '
    )
    if [[ "${PREV_VERSION}" == "${VERSION}" ]]; then
      echo "HEAD (${HEAD_SHA}) did not introduce version ${VERSION} (parent already has ${PREV_VERSION}); skipping tag and release creation. Re-run CI on the version-bump commit to publish ${TAG}."
      exit 0
    fi
  fi

  if LOCAL_TAG_SHA=$(git rev-parse -q --verify "refs/tags/${TAG}^{commit}" 2>/dev/null); then
    if [[ "${LOCAL_TAG_SHA}" != "${HEAD_SHA}" ]]; then
      echo "Error: Local tag ${TAG} already exists at ${LOCAL_TAG_SHA} (HEAD is ${HEAD_SHA}); refusing to overwrite." >&2
      exit 1
    fi
  else
    git tag "${TAG}" "${HEAD_SHA}"
  fi

  echo "Creating and pushing immutable release tag ${TAG} at ${HEAD_SHA}"
  git push origin "refs/tags/${TAG}"
else
  echo "Tag ${TAG} already points to HEAD (${HEAD_SHA}); verifying GitHub Release and floating tags."
fi

if gh release view "${TAG}" >/dev/null 2>&1; then
  echo "GitHub Release ${TAG} already exists; skipping release creation."
else
  NOTES_FILE=$(mktemp)

  node -e '
    const fs = require("node:fs");
    const version = process.argv[1];
    const notesFile = process.argv[2];
    if (!fs.existsSync("CHANGELOG.md")) process.exit(0);
    const content = fs.readFileSync("CHANGELOG.md", "utf8");
    const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^## ${escaped}\\r?\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m");
    const match = content.match(pattern);
    if (match) {
      const body = match[1].trim();
      if (body) {
        fs.writeFileSync(notesFile, `${body}\n`, "utf8");
      }
    }
  ' "${VERSION}" "${NOTES_FILE}"

  RELEASE_ARGS=("release" "create" "${TAG}" "--verify-tag" "--title" "${TAG}")
  if [[ -n "${PRERELEASE}" ]]; then
    RELEASE_ARGS+=("--prerelease")
  fi
  if [[ -s "${NOTES_FILE}" ]]; then
    RELEASE_ARGS+=("--notes-file" "${NOTES_FILE}")
  else
    RELEASE_ARGS+=("--generate-notes")
  fi

  echo "Creating GitHub Release ${TAG}"
  gh "${RELEASE_ARGS[@]}"
fi

if [[ -n "${PRERELEASE}" ]]; then
  echo "Skipping floating major/minor tags for prerelease ${TAG}."
  exit 0
fi

ALL_MAJOR_TAGS=$(
  git ls-remote --tags origin "refs/tags/v${MAJOR}.*" |
    awk '$2 !~ /\^\{\}$/ { sub(/^refs\/tags\//, "", $2); print $2 }'
)

update_floating_tag() {
  local alias_tag="$1"
  local current_sha
  current_sha=$(resolve_remote_tag_sha "${alias_tag}")
  if [[ "${current_sha}" == "${HEAD_SHA}" ]]; then
    echo "Floating tag ${alias_tag} already points to ${HEAD_SHA}; skipping."
    return 0
  fi

  echo "Updating floating tag ${alias_tag} -> ${HEAD_SHA}"
  git tag -f "${alias_tag}" "${HEAD_SHA}"
  git push origin --force "refs/tags/${alias_tag}"
}

FLOAT_DECISION=$(
  ALL_MAJOR_TAGS="${ALL_MAJOR_TAGS}" node -e '
    const major = Number(process.argv[1]);
    const minor = Number(process.argv[2]);
    const patch = Number(process.argv[3]);
    const tags = (process.env.ALL_MAJOR_TAGS || "").split(/\r?\n/).filter(Boolean);
    let highestMinor = true;
    let highestMajor = true;
    const re = new RegExp(`^v${major}\\.(\\d+)\\.(\\d+)$`);
    for (const tag of tags) {
      const m = tag.match(re);
      if (!m) continue;
      const tMinor = Number(m[1]);
      const tPatch = Number(m[2]);
      if (tMinor === minor && tPatch > patch) highestMinor = false;
      if (tMinor > minor || (tMinor === minor && tPatch > patch)) highestMajor = false;
    }
    console.log(`${highestMinor ? "1" : "0"} ${highestMajor ? "1" : "0"}`);
  ' "${MAJOR}" "${MINOR}" "${PATCH}"
)

read -r UPDATE_MINOR UPDATE_MAJOR <<<"${FLOAT_DECISION}"

if [[ "${UPDATE_MINOR}" == "1" ]]; then
  update_floating_tag "v${MAJOR}.${MINOR}"
else
  echo "Skipping floating tag v${MAJOR}.${MINOR}: a newer patch tag already exists."
fi

if [[ "${UPDATE_MAJOR}" == "1" ]]; then
  update_floating_tag "v${MAJOR}"
else
  echo "Skipping floating tag v${MAJOR}: a newer release tag already exists."
fi
