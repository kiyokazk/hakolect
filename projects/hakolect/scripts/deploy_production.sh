#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/hakolect/app}"
PERSIST_DIR="${PERSIST_DIR:-${HOST_DATA_DIR:-/opt/hakolect/persist}}"
BACKUP_DIR="${BACKUP_DIR:-/opt/hakolect/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DEPLOY_REF="${1:-}"
DB_PATH="$PERSIST_DIR/hakolect.db"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8000/api/hakolect/health}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3000/hakolect/}"

if [ -z "$DEPLOY_REF" ]; then
  echo "Usage: $0 <deploy-target-branch-or-commit>" >&2
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "App directory is not a git checkout: $APP_DIR" >&2
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  echo "Production DB not found: $DB_PATH" >&2
  exit 1
fi

mkdir -p "$PERSIST_DIR" "$BACKUP_DIR"

read_counts() {
  python3 - "$1" <<'PY2'
import sqlite3
import sys

db_path = sys.argv[1]
conn = sqlite3.connect(db_path)
cur = conn.cursor()
bookmark_count = cur.execute("select count(*) from bookmarks").fetchone()[0]
folder_count = cur.execute("select count(*) from folders").fetchone()[0]
print(f"{bookmark_count} {folder_count}")
PY2
}

cd "$APP_DIR"

echo "[1/6] pre-deploy backup"
RETENTION_DAYS="$RETENTION_DAYS" ./backup_hakolect_db.sh "$DB_PATH" "$BACKUP_DIR"

read -r BEFORE_BOOKMARKS BEFORE_FOLDERS <<<"$(read_counts "$DB_PATH")"
echo "Pre-deploy counts: bookmarks=$BEFORE_BOOKMARKS folders=$BEFORE_FOLDERS"

echo "[2/6] fetch deploy target"
git fetch origin
CURRENT_BRANCH="$(git branch --show-current || true)"
git checkout "$DEPLOY_REF"
if [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" = "$DEPLOY_REF" ]; then
  git pull --ff-only origin "$CURRENT_BRANCH"
fi

echo "[3/6] lock persistent data mount"
export HOST_DATA_DIR="$PERSIST_DIR"

echo "[4/6] rebuild services"
docker compose up --build -d

echo "[5/6] health checks"
curl --fail --silent "$HEALTH_URL" >/dev/null
curl --fail --silent --head "$FRONTEND_URL" >/dev/null

echo "[6/6] post-deploy data safety checks"
read -r AFTER_BOOKMARKS AFTER_FOLDERS <<<"$(read_counts "$DB_PATH")"
echo "Post-deploy counts: bookmarks=$AFTER_BOOKMARKS folders=$AFTER_FOLDERS"

if [ "$AFTER_BOOKMARKS" -lt "$BEFORE_BOOKMARKS" ] || [ "$AFTER_FOLDERS" -lt "$BEFORE_FOLDERS" ]; then
  echo "Count regression detected. bookmarks: $BEFORE_BOOKMARKS -> $AFTER_BOOKMARKS, folders: $BEFORE_FOLDERS -> $AFTER_FOLDERS" >&2
  exit 1
fi

echo "Deploy completed safely."
