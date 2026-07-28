#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCK_DIR="${TMPDIR:-/tmp}/beemmb-notification-worker.lock"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "notification worker is already running" >&2
  exit 0
fi

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

trap cleanup EXIT

cd "$REPO_ROOT"
npm run worker:notifications -- 100
