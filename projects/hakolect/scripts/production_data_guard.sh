#!/usr/bin/env bash
set -euo pipefail

PHASE="${1:?Usage: production_data_guard.sh <pre|post> <user@host> [app_dir] [backup_dir]}"
TARGET_HOST="${2:?Usage: production_data_guard.sh <pre|post> <user@host> [app_dir] [backup_dir]}"
APP_DIR="${3:-/opt/hakolect/app}"
BACKUP_DIR="${4:-/opt/hakolect/backups}"

if [[ "$PHASE" != "pre" && "$PHASE" != "post" ]]; then
  echo "phase must be pre or post" >&2
  exit 1
fi

ssh "$TARGET_HOST" "APP_DIR='$APP_DIR' BACKUP_DIR='$BACKUP_DIR' PHASE='$PHASE' bash -s" <<'REMOTE'
set -euo pipefail
cd "$APP_DIR"

HOST_DATA_DIR="$(grep "^HOST_DATA_DIR=" .env 2>/dev/null | cut -d= -f2- || true)"
if [[ -n "$HOST_DATA_DIR" ]]; then
  DB_PATH="$HOST_DATA_DIR/hakolect.db"
else
  DB_PATH="$APP_DIR/data/hakolect.db"
fi
export DB_PATH PHASE

if [[ "$PHASE" == "pre" ]]; then
  RETENTION_DAYS="${RETENTION_DAYS:-14}" ./backup_hakolect_db.sh "$DB_PATH" "$BACKUP_DIR"
fi

if [[ "$PHASE" == "post" ]]; then
  curl -fsS http://127.0.0.1:8000/api/hakolect/health >/tmp/hakolect-health.json
fi

python3 - <<PY
import json, sqlite3, os
phase = os.environ['PHASE']
db_path = os.environ['DB_PATH']
out = {'phase': phase, 'db_path': db_path}
if phase == 'post':
    with open('/tmp/hakolect-health.json') as f:
        out['health'] = json.load(f)
con = sqlite3.connect(db_path)
cur = con.cursor()
for table in ['bookmarks', 'folders', 'tags', 'bookmark_tags']:
    out[table] = cur.execute(f'select count(*) from {table}').fetchone()[0]
out['recent'] = cur.execute('select id, title, source, created_at from bookmarks order by id desc limit 5').fetchall()
con.close()
print(json.dumps(out, ensure_ascii=False))
PY
REMOTE
