# hakolect operations

## Destructive operation rule

For production bookmark deletions or other destructive data changes:

1. Do not delete user-added bookmarks without explicit approval.
2. Share the target list first.
3. Take a DB backup before execution.
4. Report the executed result immediately after the change.

## Daily backup

Recommended cron:

```cron
15 3 * * * /opt/hakolect/app/scripts/backup_hakolect_db.sh /opt/hakolect/app/data/hakolect.db /opt/hakolect/backups >> /var/log/hakolect-db-backup.log 2>&1
```

- retention: 14 days
- backup path: `/opt/hakolect/backups`
- latest symlink: `/opt/hakolect/backups/latest.tar.gz`

## Restore outline

1. Stop application writes if possible.
2. Extract the chosen archive into a temporary directory.
3. Replace `/opt/hakolect/app/data/hakolect.db` with the extracted DB file.
4. Restart the app with `docker compose up -d` from `/opt/hakolect/app`.
5. Verify `GET /api/hakolect/health` and bookmark visibility.
