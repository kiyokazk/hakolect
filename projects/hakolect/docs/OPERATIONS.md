# hakolect operations

## Destructive operation rule

For production bookmark deletions or other destructive data changes:

1. Do not delete user-added bookmarks without explicit approval.
2. Share the target list first.
3. Take a DB backup before execution.
4. Report the executed result immediately after the change.

## Canonical backup / restore runbook

The production-standard backup implementation is based on:

- script: `/opt/hakolect/app/backup_hakolect_db.sh`
- cron: `/etc/cron.d/hakolect-db-backup`
- log: `/var/log/hakolect-db-backup.log`

The detailed runbook is `docs/BACKUP_RUNBOOK.md`.
It defines:
- backup destination
- daily execution time
- manual backup procedure
- generated files and latest symlink checks
- restore steps
- operational cautions
- responsibility scope
- Vault storage path

If `scripts/backup_db.py` exists locally, treat it as non-canonical helper code only. Do not use it as the production handoff path unless the cron and runbook are rewritten together.

## UI release verification

For UI interaction changes, use `docs/PRE_RELEASE_CHECKLIST.md` before owner-facing confirmation.
It standardizes:
- fixed record fields
- click → open state → DOM mount → visible observation points
- smoke test coverage for grid/list, detail panel states, mobile width, edge positioning, and production `/hakolect/`
- owner handoff conditions
