#!/usr/bin/env bash
#
# Usage:
#   ./format-and-push.sh <deno-task> [<commit-message>]
#
# Example:
#   ./format-and-push.sh fmt "chore: apply deno fmt"
#   ./format-and-push.sh lint "chore: apply deno lint fixes"

set -eo pipefail

TASK="$1" # the Deno task to run (e.g. "fmt", "lint")
COMMIT_MSG="${2:-"chore: auto-run deno $TASK"}"
DIFF_FILE=".github/.diff_${TASK}.patch"

if [[ -z "$TASK" ]]; then
  echo "❌  Missing <deno-task> argument"
  echo "Usage: $0 <deno-task> [<commit-message>]"
  exit 1
fi

echo "▶  Running deno task: $TASK"
deno task "$TASK"

echo "▶  Checking for changes…"
git diff --output="$DIFF_FILE"

# Grab the size of the diff file
SIZE=$(stat --format=%s "$DIFF_FILE" 2>/dev/null || stat -f%z "$DIFF_FILE")

if [[ "$SIZE" -eq 0 ]]; then
  echo "✅  No changes from 'deno task $TASK'"
  rm -f "$DIFF_FILE"
  exit 0
fi

echo "Detected task changes — committing…"
git config user.name "github-actions[bot]"
git config user.email "github-actions@github.bot"
git commit -am "$COMMIT_MSG"

# Push back to the current PR branch:
#   GITHUB_REF: refs/pull/<pr-number>/merge or refs/heads/<branch>
#   We want the head branch name:
BRANCH="${GITHUB_REF##*/}"

echo "▶  Pushing to ${BRANCH}"
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}" "$BRANCH"
