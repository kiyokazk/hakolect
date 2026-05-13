# Phase 1-B 本番反映段取り

更新日: 2026-05-13
目的: DnD系 / スマホ対応 / 本番反映を1セットで owner 確認へ渡す。

## 1. ローカルで最低限やること

### 実装者確認
```bash
cd ~/TerraceK/projects/hakolect/backend
source .venv/bin/activate
python -m compileall app

cd ~/TerraceK/projects/hakolect/frontend
npm run build
```

### 実ブラウザ確認者へ渡すもの
- `docs/PHASE1B_BROWSER_VERIFICATION_PACK.md`
- `docs/PHASE1B_OBSERVATION_POINTS.md`
- `docs/PRE_RELEASE_CHECKLIST.md`

### 最小3手順
1. bookmark drag → folder drop
2. bookmark reorder
3. 390px前後のスマホ幅確認

### 回収形式
- pass / fail / 症状

## 2. 本番反映

### 反映前
- 最新コードを production deploy 作業者が取得
- 必要なら DB バックアップを先に実施
  ```bash
  cd /opt/hakolect/app
  RETENTION_DAYS=14 ./backup_hakolect_db.sh /opt/hakolect/app/data/hakolect.db /opt/hakolect/backups
  ```

### 反映コマンド
```bash
cd /opt/hakolect/app
git fetch origin
git checkout <deploy-target-branch-or-commit>
git pull --ff-only

docker compose up --build -d
```

### 反映直後の最低確認
```bash
curl http://127.0.0.1:8000/api/hakolect/health
curl -I http://127.0.0.1:3000/hakolect/
```

## 3. owner 向け確認URL
- 本番URL: `https://tool.terracek.com/hakolect/`

## 4. owner 向け最小確認観点

### A. DnDで別フォルダ移動
- ブックマークをドラッグして別フォルダ、または Unsorted へ移動できる
- drop先が見える
- 移動後に所属先が変わる

### B. 同一フォルダ内並び替え
- ブックマークを同一フォルダ内で前後に並び替えできる
- 挿入位置が分かる
- 並び替え後の順序が維持される

### C. スマホ幅確認
- 1列表示
- `…` メニューが見える
- 詳細画面が崩れない

## 5. owner へ渡す時の文面要点
- 確認URL
- 上記3観点のみ依頼
- fail の場合は「どの手順で / 何が起きたか」を返してもらう
