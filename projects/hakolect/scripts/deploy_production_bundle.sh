#!/usr/bin/env bash
set -euo pipefail

TARGET_HOST="${1:?Usage: deploy_production_bundle.sh <user@host> [app_dir]}"
APP_DIR="${2:-/opt/hakolect/app}"

COPYFILE_DISABLE=1 tar \
  --exclude-vcs \
  --exclude='./data' \
  --exclude='./backend/data' \
  --exclude='./frontend/node_modules' \
  --exclude='./frontend/dist' \
  --exclude='./backend/.venv' \
  --exclude='./backend/__pycache__' \
  --exclude='./backend/app/__pycache__' \
  --exclude='./test-results' \
  --exclude='./tmp_playwright_check.js' \
  --exclude='./tmp_playwright_check.spec.js' \
  --exclude='./.DS_Store' \
  -czf - . \
  | ssh "$TARGET_HOST" "mkdir -p '$APP_DIR' && tar xzf - -C '$APP_DIR'"

echo "Synced application bundle to $TARGET_HOST:$APP_DIR (data/ excluded)"
