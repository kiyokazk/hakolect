#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${1:-/opt/hakolect/app/data/hakolect.db}"
BACKUP_DIR="${2:-/opt/hakolect/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$BACKUP_DIR"
if [ ! -f "$DB_PATH" ]; then
  echo "Database not found: $DB_PATH" >&2
  exit 1
fi

BASENAME="$(basename "$DB_PATH")"
SNAPSHOT="$TMP_DIR/${BASENAME}.${STAMP}"
ARCHIVE="$BACKUP_DIR/${BASENAME}.${STAMP}.tar.gz"
LATEST_LINK="$BACKUP_DIR/latest.tar.gz"

cp "$DB_PATH" "$SNAPSHOT"
tar -C "$TMP_DIR" -czf "$ARCHIVE" "$(basename "$SNAPSHOT")"
ln -sfn "$ARCHIVE" "$LATEST_LINK"

find "$BACKUP_DIR" -type f -name "${BASENAME}.*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Created backup: $ARCHIVE"
