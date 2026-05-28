# OPERATIONS.md — hakolect

## 1. Destructive operation rule

Production or shared verification data must not be deleted silently.

Before any destructive action (`DELETE`, reset, seed overwrite, folder cleanup, DB replacement), follow this order:

1. Share the target list first.
2. Take a DB backup.
3. Execute the change.
4. Report the result in the same work turn.

If a bookmark might have been added by a user, do **not** delete it without explicit approval.
When ownership is unclear, move or label it for review instead of removing it.

## 2. Demo seed safety

`backend/seed_demo.py --force` is intentionally limited.
It only replaces data when the current database is recognized as demo-only.
If non-demo bookmarks exist, the script refuses to wipe them.

## 3. Canonical backup implementation

The production canonical backup implementation is:

- script: `/opt/hakolect/app/backup_hakolect_db.sh`
- cron file: `/etc/cron.d/hakolect-db-backup`
- log file: `/var/log/hakolect-db-backup.log`
- persistent DB dir: `/opt/hakolect/persist`

This repository keeps the same script at:

- `backup_hakolect_db.sh`

Do **not** treat `scripts/backup_db.py` as the production standard.
If it remains locally for experiments, it is non-canonical and must not override the shell-script based production runbook.

## 4. Manual backup command

```bash
cd /opt/hakolect/app
RETENTION_DAYS=14 ./backup_hakolect_db.sh /opt/hakolect/persist/hakolect.db /opt/hakolect/backups
```

## 5. Recommended cron (production)

```cron
15 3 * * * root RETENTION_DAYS=14 /opt/hakolect/app/backup_hakolect_db.sh /opt/hakolect/persist/hakolect.db /opt/hakolect/backups >> /var/log/hakolect-db-backup.log 2>&1
```

## 6. Manual verification after backup

After a manual run, confirm all of the following:

1. command output includes `Created backup:`
2. a new archive exists at `/opt/hakolect/backups/hakolect.db.YYYYMMDD-HHMMSS.tar.gz`
3. `/opt/hakolect/backups/latest.tar.gz` points to the newest archive
4. `/var/log/hakolect-db-backup.log` has no recent error output
5. if the cron entry was changed, `/etc/cron.d/hakolect-db-backup` still points to the same script path

## 7. Minimum backup policy

- Daily local backup: keep 7–14 generations.
- Extra backup before deploys, schema changes, or bulk cleanup.
- Off-host copy is recommended as the next hardening step.
- Treat `/var/log/hakolect-db-backup.log` as the first failure signal.

## 8. Restore memo

Example restore flow:

```bash
cp /opt/hakolect/persist/hakolect.db /opt/hakolect/persist/hakolect.db.before-restore-$(date +%Y%m%d-%H%M%S)
cp /opt/hakolect/backups/latest.tar.gz /tmp/hakolect-latest.tar.gz
mkdir -p /tmp/hakolect-restore && tar -xzf /tmp/hakolect-latest.tar.gz -C /tmp/hakolect-restore
cp /tmp/hakolect-restore/hakolect.db.* /opt/hakolect/persist/hakolect.db
```

Do the restore only while the app is stopped or while you have confirmed the replacement procedure for the current deploy setup.

## 9. Canonical runbook

The detailed backup/restore runbook lives in:
- `docs/BACKUP_RUNBOOK.md`
- `~/TerraceK/vault/TerraceK_Vault/yui/projects/hakolect/BACKUP_RUNBOOK.md`


## 10. Production deploy safety

Production deploys must use git-based updates only. Do not transfer the working tree with `tar`, `scp`, or `rsync` unless `data/` is explicitly excluded.

Canonical safe path:

```bash
cd /opt/hakolect/app
HOST_DATA_DIR=/opt/hakolect/persist ./scripts/deploy_production.sh <deploy-target-branch-or-commit>
```

Safety guarantees in the script:

1. DB backup before deploy
2. persistent DB path fixed to `/opt/hakolect/persist/hakolect.db`
3. `docker compose` runs with `HOST_DATA_DIR=/opt/hakolect/persist`
4. post-deploy bookmark/folder count regression check
