# Phase 1-A API差分メモ

更新日: 2026-05-13
ブランチ: `feat/hakolect-phase1a-api-safety`

## このターンで実装修正した項目

- `BookmarkUpdate` から `url` 更新を禁止
  - `url` を送ると `ValidationError` になる状態まで確認
- `source` の既定値を `manual` に統一
  - schema / ORM 作成値の両方で適用
- `POST /bookmarks` で server-side metadata 補完を追加
  - title / description / ogp_image_url / favicon_url が欠けている場合に取得
- duplicate URL スキップ時のログ出力を追加

## 仕様との差分（このターンで実装修正したもの）

### 1. ブックマーク一覧レスポンスキー
対応:
- APIで `bookmarks` を追加
- 既存画面互換のため `items` も併記
- `unsorted_count` はUI都合で継続

### 2. `folder_path`
対応:
- bookmark 応答で `folder_path` を返すよう追加

### 3. `tags` の形
対応:
- bookmark 応答は仕様寄りに `tags: ["frontend", "deploy"]` へ変更
- フロントは旧形式/新形式の両方を扱えるよう吸収

### 4. 409 エラー形
対応:
- 仕様どおり
```json
{ "detail": "URL already exists", "existing_bookmark_id": 5 }
```
- フロント側も新旧両方を吸収

## owner判断が混ざりやすい項目

### A. `POST /bookmarks` の責務境界
論点:
- 仕様上は backend が metadata を取得する
- 現フロントは Quick Add で `fetch-meta` を先に叩いてから `POST /bookmarks` している

現時点の扱い:
- backend 側でも metadata 補完するようにして、安全側へ寄せた
- Quick Add の先読みは残している
- ただし「フロント先読みを残すか / backend 主体へ寄せ切るか」は運用・UX判断が残る

### B. duplicate 時ログの置き場所・観測方法
論点:
- アプリログで十分か
- 今後、Slack route 側の観測まで必要か

現時点の扱い:
- backend の duplicate 検知箇所で info ログ出力を追加
- どこまでを『運用ログ要件』に含めるかは整理余地あり
