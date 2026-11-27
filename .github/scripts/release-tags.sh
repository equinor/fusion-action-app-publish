#!/usr/bin/env bash
set -euo pipefail

RESOLVE_ONLY=0
if [[ "$#" -gt 1 ]]; then
  echo "Usage: $0 [--resolve-release-sha]" >&2
  exit 1
elif [[ "$#" -eq 1 ]]; then
  case "$1" in
    --resolve-release-sha)
      RESOLVE_ONLY=1
      ;;
    *)
      echo "Error: Unknown argument '$1'. Usage: $0 [--resolve-release-sha]" >&2
      exit 1
      ;;
  esac
fi

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

resolve_remote_ref_oid() {
  local tag_name="$1"
  git ls-remote --tags origin "refs/tags/${tag_name}" | awk 'NR==1 { print $1 }'
}

resolve_version_introducing_sha() {
  local target_version="$1"
  local sha=""
  local prev_sha=""

  while IFS= read -r sha; do
    local commit_version=""
    if git cat-file -e "${sha}:package.json" 2>/dev/null; then
      commit_version=$(
        git show "${sha}:package.json" | node -e '
          const fs = require("node:fs");
          try {
            const pkg = JSON.parse(fs.readFileSync(0, "utf8"));
            if (typeof pkg.version === "string") process.stdout.write(pkg.version);
          } catch {}
        '
      )
    fi
    if [[ "${commit_version}" != "${target_version}" ]]; then
      break
    fi
    prev_sha="${sha}"
  done < <(git rev-list --first-parent HEAD)

  printf '%s' "${prev_sha}"
}

RELEASE_SHA=$(resolve_version_introducing_sha "${VERSION}")
if [[ -z "${RELEASE_SHA}" ]]; then
  echo "Error: Could not find committed package.json with version '${VERSION}' at HEAD (${HEAD_SHA})." >&2
  exit 1
fi

if [[ "${RESOLVE_ONLY}" == "1" ]]; then
  printf '%s\n' "${RELEASE_SHA}"
  exit 0
fi

REMOTE_TAG_SHA=$(resolve_remote_tag_sha "${TAG}")

# Never overwrite an existing release tag that points to a different commit.
if [[ -n "${REMOTE_TAG_SHA}" && "${REMOTE_TAG_SHA}" != "${RELEASE_SHA}" ]]; then
  echo "Tag ${TAG} already exists on origin at ${REMOTE_TAG_SHA} (release commit is ${RELEASE_SHA}); skipping tag and release creation."
  exit 0
fi

# Require the caller to check out and validate RELEASE_SHA before publishing it.
if [[ "${HEAD_SHA}" != "${RELEASE_SHA}" ]]; then
  echo "Error: HEAD (${HEAD_SHA}) does not match the version-introducing commit (${RELEASE_SHA}); check out ${RELEASE_SHA} and run validation against it before publishing ${TAG}." >&2
  exit 1
fi

if [[ -z "${REMOTE_TAG_SHA}" ]]; then
  if LOCAL_TAG_SHA=$(git rev-parse -q --verify "refs/tags/${TAG}^{commit}" 2>/dev/null); then
    if [[ "${LOCAL_TAG_SHA}" != "${RELEASE_SHA}" ]]; then
      echo "Error: Local tag ${TAG} already exists at ${LOCAL_TAG_SHA} (release commit is ${RELEASE_SHA}); refusing to overwrite." >&2
      exit 1
    fi
  else
    git tag "${TAG}" "${RELEASE_SHA}"
  fi

  echo "Creating and pushing immutable release tag ${TAG} at ${RELEASE_SHA}"
  git push origin "refs/tags/${TAG}"
else
  echo "Tag ${TAG} already points to release commit (${RELEASE_SHA}); verifying GitHub Release and floating tags."
fi

if gh release view "${TAG}" >/dev/null 2>&1; then
  echo "GitHub Release ${TAG} already exists; skipping release creation."
else
  NOTES_FILE=$(mktemp)

  if git cat-file -e "${RELEASE_SHA}:CHANGELOG.md" 2>/dev/null; then
    git show "${RELEASE_SHA}:CHANGELOG.md" | node -e '
      const fs = require("node:fs");
      const version = process.argv[1];
      const notesFile = process.argv[2];
      const content = fs.readFileSync(0, "utf8");
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
  fi

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

MINOR_ALIAS="v${MAJOR}.${MINOR}"
MAJOR_ALIAS="v${MAJOR}"

# Capture raw remote alias ref OIDs before listing release tags so a concurrent
# publisher advancing vX or vX.Y invalidates --force-with-lease instead of
# letting this run move floating aliases backwards.
MINOR_ALIAS_RAW_OID=$(resolve_remote_ref_oid "${MINOR_ALIAS}")
MAJOR_ALIAS_RAW_OID=$(resolve_remote_ref_oid "${MAJOR_ALIAS}")
MINOR_ALIAS_COMMIT_SHA=$(resolve_remote_tag_sha "${MINOR_ALIAS}")
MAJOR_ALIAS_COMMIT_SHA=$(resolve_remote_tag_sha "${MAJOR_ALIAS}")

ALL_MAJOR_TAGS=$(
  git ls-remote --tags origin "refs/tags/v${MAJOR}.*" |
    awk '$2 !~ /\^\{\}$/ { sub(/^refs\/tags\//, "", $2); print $2 }'
)

update_floating_tag() {
  local alias_tag="$1"
  local expected_raw_oid="$2"
  local current_commit_sha="$3"

  if [[ "${current_commit_sha}" == "${RELEASE_SHA}" ]]; then
    echo "Floating tag ${alias_tag} already points to ${RELEASE_SHA}; skipping."
    return 0
  fi

  echo "Updating floating tag ${alias_tag} -> ${RELEASE_SHA} (lease: ${expected_raw_oid:-<absent>})"
  git tag -f "${alias_tag}" "${RELEASE_SHA}"
  git push origin --force-with-lease="refs/tags/${alias_tag}:${expected_raw_oid}" "refs/tags/${alias_tag}"
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
  update_floating_tag "${MINOR_ALIAS}" "${MINOR_ALIAS_RAW_OID}" "${MINOR_ALIAS_COMMIT_SHA}"
else
  echo "Skipping floating tag ${MINOR_ALIAS}: a newer patch tag already exists."
fi

if [[ "${UPDATE_MAJOR}" == "1" ]]; then
  update_floating_tag "${MAJOR_ALIAS}" "${MAJOR_ALIAS_RAW_OID}" "${MAJOR_ALIAS_COMMIT_SHA}"
else
  echo "Skipping floating tag ${MAJOR_ALIAS}: a newer release tag already exists."
fi
