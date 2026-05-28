# Hakolect バックアップ運用手順

## 1. 正本

Hakolect の本番バックアップ運用の正本は、**shell script + system cron** です。

- 実行スクリプト: `/opt/hakolect/app/backup_hakolect_db.sh`
- cron 定義: `/etc/cron.d/hakolect-db-backup`
- DB: `/opt/hakolect/persist/hakolect.db`
- 保存先: `/opt/hakolect/backups`
- ログ: `/var/log/hakolect-db-backup.log`
- 最新バックアップ参照: `/opt/hakolect/backups/latest.tar.gz`

リポジトリ側の正本ファイルは `backup_hakolect_db.sh`。
`/opt/hakolect/app/backup_hakolect_db.sh` と同一内容で維持する。

`scripts/backup_db.py` は本番運用の正本ではない。残る場合も非推奨の補助コードとして扱い、手順書では参照しない。

## 2. 定時実行

毎日 03:15 (Asia/Tokyo):

```cron
15 3 * * * root RETENTION_DAYS=14 /opt/hakolect/app/backup_hakolect_db.sh /opt/hakolect/persist/hakolect.db /opt/hakolect/backups >> /var/log/hakolect-db-backup.log 2>&1
```

確認対象:
- cron ファイル: `/etc/cron.d/hakolect-db-backup`
- 実行パスが `/opt/hakolect/app/backup_hakolect_db.sh` になっていること
- `RETENTION_DAYS=14` が付いていること

## 3. 手動実行手順

```bash
cd /opt/hakolect/app
RETENTION_DAYS=14 ./backup_hakolect_db.sh /opt/hakolect/persist/hakolect.db /opt/hakolect/backups
```

## 4. 手動実行後の確認観点

以下をすべて確認する。

1. 標準出力に `Created backup:` が出る
2. `/opt/hakolect/backups` に新しい `hakolect.db.YYYYMMDD-HHMMSS.tar.gz` ができている
3. `/opt/hakolect/backups/latest.tar.gz` が最新アーカイブを指している
4. `/var/log/hakolect-db-backup.log` に直近エラーがない
5. 保持世代を超えた古い archive が削除される設定になっている

確認コマンド例:

```bash
ls -lt /opt/hakolect/backups | head
readlink /opt/hakolect/backups/latest.tar.gz
tail -n 20 /var/log/hakolect-db-backup.log
cat /etc/cron.d/hakolect-db-backup
```

## 5. 復旧手順

1. Hakolect への書き込みを止める。可能なら API を止める。
2. 念のため現行 DB を退避する。
3. `latest.tar.gz` または対象世代 archive を展開して DB を戻す。
4. API を再起動する。
5. health と画面確認を行う。

例:

```bash
cd /opt/hakolect/app
cp /opt/hakolect/persist/hakolect.db /opt/hakolect/persist/hakolect.db.before-restore-$(date +%Y%m%d-%H%M%S)
mkdir -p /tmp/hakolect-restore
rm -f /tmp/hakolect-restore/*
tar -xzf /opt/hakolect/backups/latest.tar.gz -C /tmp/hakolect-restore
cp /tmp/hakolect-restore/hakolect.db.* /opt/hakolect/persist/hakolect.db
docker compose up -d hakolect-api
curl http://127.0.0.1:8000/api/hakolect/health
```

## 6. 運用上の注意

- 本番 DB は `/opt/hakolect/app` 配下に置かない。`/opt/hakolect/persist` のような永続領域に分離する
- アプリ反映は `git pull` か `scripts/deploy_production_bundle.sh` を使い、`data/` を deploy 対象から除外する

- デプロイ、スキーマ変更、大量削除の前には定時実行を待たず手動バックアップを追加で取る
- restore は DB ファイル置換なので、書き込み中には実施しない
- 同一ホスト内バックアップのみなので、ホスト障害には弱い
- 次段階の改善候補はオフホスト退避
- `/var/log/hakolect-db-backup.log` は logrotate 等で別管理してよい

## 7. 反映時の最小安全手順

cron やスクリプトを更新する場合は以下で進める。

1. repo の `backup_hakolect_db.sh` と文書を同一 commit で更新
2. 本番へ `backup_hakolect_db.sh` を配置
3. `/etc/cron.d/hakolect-db-backup` の実行パスと引数を確認
4. 手動で 1 回実行
5. 生成物 / latest / log を確認
6. 問題なければ cron はそのまま継続利用

## 8. production deploy runbook

本番 deploy は `scripts/deploy_production.sh` を使う。

```bash
cd /opt/hakolect/app
HOST_DATA_DIR=/opt/hakolect/persist ./scripts/deploy_production.sh <deploy-target-branch-or-commit>
```

この script は次をまとめて行う。

1. deploy 前 backup
2. pre/post の bookmark 件数・folder 件数比較
3. `docker compose up --build -d` 前に `HOST_DATA_DIR=/opt/hakolect/persist` を固定
4. health / frontend 応答確認

`tar` / `scp` / `rsync` で working tree を丸ごと転送する運用は避ける。やむを得ず archive 転送する場合も `data/` を必ず除外する。

## 9. 参照資料

- リポジトリ内: `OPERATIONS.md`, `docs/OPERATIONS.md`, `docs/BACKUP_RUNBOOK.md`
- Vault 内: `~/TerraceK/vault/TerraceK_Vault/yui/projects/hakolect/BACKUP_RUNBOOK.md`
