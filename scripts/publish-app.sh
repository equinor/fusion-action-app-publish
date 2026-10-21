#!/usr/bin/env bash
set -eo pipefail

if [[ -z "${INPUT_ENV:-}" || -z "${INPUT_TAG:-}" || -z "${RUNNER_TEMP:-}" ]]; then
  echo "::error::Resolved publish environment, tag and runner temporary directory are required."
  exit 1
fi

# An empty token still selects token auth in the CLI instead of Azure credentials.
if [[ -z "${FUSION_TOKEN:-}" ]]; then
  unset FUSION_TOKEN
fi

existing_version_args=()
cli_package="@equinor/fusion-framework-cli@latest"
case "${INPUT_ALLOW_EXISTING_VERSION:-false}" in
  ""|false) ;;
  true)
    existing_version_args+=(--allow-existing-version)
    cli_package="@equinor/fusion-framework-cli@15.7.0"
    ;;
  *)
    echo "::error::Input 'allow-existing-version' must be 'true' or 'false'."
    exit 1
    ;;
esac

snapshot_args=()
if [[ -n "${INPUT_SNAPSHOT:-}" ]]; then
  case "${INPUT_SNAPSHOT}" in
    false|0|no) ;;
    true) snapshot_args+=(--snapshot) ;;
    *) snapshot_args+=(--snapshot "${INPUT_SNAPSHOT}") ;;
  esac
fi

config_args=()
if [[ -n "${INPUT_CONFIG:-}" ]]; then
  config_args+=(--config "${INPUT_CONFIG}")
fi
artifact_args=()
if [[ -n "${INPUT_ARTIFACT:-}" ]]; then
  artifact_args+=("${INPUT_ARTIFACT}")
fi

mkdir -p "${RUNNER_TEMP}/fusion-app-publish"
publish_args=(
  --prefix "${RUNNER_TEMP}/fusion-app-publish" -y -p "${cli_package}" ffc app publish
  --env "${INPUT_ENV}" --tag "${INPUT_TAG}"
  "${existing_version_args[@]}" "${snapshot_args[@]}" "${config_args[@]}" "${artifact_args[@]}"
)

if [[ "${#existing_version_args[@]}" -eq 0 ]]; then
  npx "${publish_args[@]}"
  exit 0
fi

publish_log="$(mktemp "${RUNNER_TEMP}/fusion-app-publish.XXXXXX")"
trap 'rm -f "${publish_log}"' EXIT
npx "${publish_args[@]}" 2>&1 | tee "${publish_log}"

# Logs are used only for the notice, never to decide whether publishing succeeded.
node --input-type=module - "${publish_log}" <<'NODE'
import { readFileSync } from "node:fs";
import { stripVTControlCharacters } from "node:util";

const marker = "Existing application version ";
const suffix = ` was re-tagged "${process.env.INPUT_TAG}" in environment "${process.env.INPUT_ENV}".`;
const confirmation = stripVTControlCharacters(readFileSync(process.argv[2], "utf8"))
  .split(/[\r\n]+/)
  .map((line) => line.trim())
  .findLast((line) => line.includes(marker) && line.endsWith(suffix));
if (confirmation) {
  const message = confirmation.slice(confirmation.indexOf(marker));
  const escaped = message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  console.log(`::notice::${escaped}`);
}
NODE
