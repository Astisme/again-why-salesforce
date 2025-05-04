#!/usr/bin/env bash
#
# Usage:
#   ./format-and-push.sh <deno-task> [<log-file>] [<commit-message>]
#
# Example:
#   ./format-and-push.sh fmt mylog.log "chore: apply deno fmt"

set -eox pipefail

TASK="$1" # the Deno task to run (e.g. "fmt", "lint")
LOG_FILE="${2:-stdout.log}"
COMMIT_MSG="${3:-"chore: auto-run deno $TASK"}"

if [[ -z "$TASK" ]]; then
  echo "❌  Missing <deno-task> argument"
  echo "Usage: $0 <deno-task> [<log-file>] [<commit-message>]"
  exit 1
fi

echo "▶  Running deno task: $TASK"
# If LOG_FILE is empty, output to stdout, otherwise to the specified file
deno task "$TASK" > "$LOG_FILE" 2>&1

echo "▶  Checking for changes…"
DIFF_FILE=$(mktemp)
(git diff;  git diff --staged) > "$DIFF_FILE"
# Grab the size of the diff file
SIZE=$(stat --format=%s "$DIFF_FILE" 2>/dev/null || stat -f%z "$DIFF_FILE")

rm -f "$DIFF_FILE"
if [[ "$SIZE" -eq 0 ]]; then
  echo "✅  No changes from 'deno task $TASK'"
  #rm -f "$LOG_FILE"
  exit 0
fi

echo "Detected task changes — committing…"
git config user.name "github-actions[bot]"
git config user.email "github-actions@github.bot"
git commit -am "$COMMIT_MSG"

# Extract the branch name from GITHUB_REF
if [[ "$GITHUB_REF" == refs/pull/* ]]; then
  # For pull requests, extract the PR number
  PR_NUMBER=$(echo $GITHUB_REF | sed -e 's/refs\/pull\/\([0-9]*\)\/merge/\1/')
  
  # Use GITHUB_HEAD_REF directly for pull requests - this is more reliable
  if [ -n "$GITHUB_HEAD_REF" ]; then
    BRANCH=$GITHUB_HEAD_REF
  else
    # Try to extract branch from git, but don't fail if unsuccessful
    BRANCH=$(git show-ref | grep "pull/${PR_NUMBER}/head" | cut -d/ -f4) || true
  fi
else
  # For direct branch pushes
  BRANCH="${GITHUB_REF#refs/heads/}"
fi

# Final fallback - if BRANCH is still empty, use a default or fail gracefully
if [ -z "$BRANCH" ]; then
  echo "⚠️ Could not determine target branch, using PR number as reference"
  BRANCH="pr-${PR_NUMBER}"
fi

echo "▶ Pushing to ${BRANCH}"
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}" "$BRANCH"
