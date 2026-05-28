# hakolect operations

## Destructive operation rule

For production bookmark deletions or other destructive data changes:

1. Do not delete user-added bookmarks without explicit approval.
2. Share the target list first.
3. Take a DB backup before execution.
4. Report the executed result immediately after the change.

## Production data safety invariants

1. Production DB must live outside `/opt/hakolect/app` in a persistent host path such as `/opt/hakolect/persist`.
2. Application deploy payloads must never include `data/` or `backend/data/`.
3. Pre-deploy backup and post-deploy count checks are mandatory before owner-facing confirmation.

## Canonical backup / restore runbook

The production-standard backup implementation is based on:

- script: `/opt/hakolect/app/backup_hakolect_db.sh`
- cron: `/etc/cron.d/hakolect-db-backup`
- log: `/var/log/hakolect-db-backup.log`

The detailed runbook is `docs/BACKUP_RUNBOOK.md`.
It defines:
- backup destination
- persistent DB mount outside repo deploy tree
- daily execution time
- manual backup procedure
- generated files and latest symlink checks
- restore steps
- operational cautions
- responsibility scope
- Vault storage path

If `scripts/backup_db.py` exists locally, treat it as non-canonical helper code only. Do not use it as the production handoff path unless the cron and runbook are rewritten together.

## Deploy guard scripts

Use these scripts for production updates:

- `scripts/deploy_production_bundle.sh <user@host> /opt/hakolect/app`
  - syncs the app bundle while excluding `data/` and other local-only artifacts
- `scripts/production_data_guard.sh pre <user@host> /opt/hakolect/app /opt/hakolect/backups`
  - takes a backup and prints current bookmark/folder counts
- `scripts/production_data_guard.sh post <user@host> /opt/hakolect/app /opt/hakolect/backups`
  - checks health and prints post-deploy counts for comparison

## UI release verification

For UI interaction changes, use `docs/PRE_RELEASE_CHECKLIST.md` before owner-facing confirmation.
It standardizes:
- fixed record fields
- click → open state → DOM mount → visible observation points
- smoke test coverage for grid/list, detail panel states, mobile width, edge positioning, and production `/hakolect/`
- owner handoff conditions


## Canonical production deploy

Use `scripts/deploy_production.sh` for production deploys. It enforces:
- DB backup before deploy
- persistent DB mount via `/opt/hakolect/persist`
- git-based code update instead of working-tree archive transfer
- post-deploy bookmark/folder count regression checks
