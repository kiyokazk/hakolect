# Phase 1-B browser verification pack

更新日: 2026-05-13
対象: bookmark DnD / move / reorder の最短人手確認

## 1. 起動コマンド
最短確認は Docker 経路を優先する。

```bash
cd ~/TerraceK/projects/hakolect
docker compose up --build -d
```

ローカル dev で見る場合のみ:

```bash
# backend
cd ~/TerraceK/projects/hakolect/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# frontend
cd ~/TerraceK/projects/hakolect/frontend
npm run dev
```

## 2. 確認URL
- Docker 経路: `http://localhost:3000/hakolect/`
- frontend dev 経路: `http://localhost:5173/hakolect/`

確認対象は以下 3 本に絞る。

## 3. 確認手順
### 手順1: bookmark drag -> folder drop
1. 一覧から任意の bookmark card をつかむ
2. 左サイドバーの別フォルダ、または `Unsorted` へ hover する
3. drop して、一覧とフォルダ件数の変化を見る

### 手順2: bookmark reorder
1. 同一フォルダ内で bookmark card を 1 枚つかむ
2. 別の card の前後位置へ drag する
3. drop して、挿入位置どおりの順序へ入るかを見る

### 手順3: detail open 状態で再確認
1. 任意 bookmark の detail を開く
2. detail を開いたまま、手順1 または手順2 を 1 回行う
3. drop 先ハイライトと結果表示が detail 干渉なしで読めるかを見る

## 4. 成功条件
- folder hover 時に drop 先が背景または境界で即読める
- `Unsorted` drop は通常 folder と同じ感覚で成立する
- reorder 時に挿入位置が線または余白変化で読める
- drop 後に一覧の並び / 所属先 / 件数が即更新される
- detail open 状態でも drop 先や結果が右パネルに埋もれない

## 5. 失敗時に見てほしい症状
- drag 中に drop 先ハイライトが出ない
- `Unsorted` だけ drop できない、または反応が弱い
- reorder の挿入位置が見えず、どこへ入るか判断できない
- drop 後に見た目が更新されない、または別位置へ飛ぶ
- detail open 時に hover / menu / panel の積層が崩れる
- console error / network error が発生する

## 6. 記録時の最小メモ
- Browser / OS / viewport
- 実施URL (`3000` or `5173`)
- 3手順の pass / fail
- fail の場合は症状を 1 件ずつ固定
