#!/usr/bin/env bash
#
# Usage:
#   ./format-and-push.sh <deno-task> [<log-file>] [<commit-message>]
#
# Example:
#   ./format-and-push.sh fmt mylog.log "chore: apply deno fmt"

set -eo pipefail

TASK="$1" # the Deno task to run (e.g. "fmt", "lint")
LOG_FILE="$2"
COMMIT_MSG="${3:-"chore: auto-run deno $TASK"}"

if [[ -z "$TASK" ]]; then
  echo "❌  Missing <deno-task> argument"
  echo "Usage: $0 <deno-task> [<log-file>] [<commit-message>]"
  exit 1
fi

echo "▶  Running deno task: $TASK"
# If LOG_FILE is empty, output to stdout, otherwise to the specified file
if [[ -z "$LOG_FILE" ]]; then
  deno task "$TASK"
else
  deno task "$TASK" > "$LOG_FILE"
fi
deno task "$TASK" > "$LOG_FILE"

echo "▶  Checking for changes…"
git diff --output="$LOG_FILE"

# Grab the size of the log file
SIZE=$(stat --format=%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE")

if [[ "$SIZE" -eq 0 ]]; then
  echo "✅  No changes from 'deno task $TASK'"
  rm -f "$LOG_FILE"
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
