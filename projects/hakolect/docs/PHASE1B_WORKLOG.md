# Phase 1-B Worklog

更新日: 2026-05-13

## 着手順
1. ブックマーク移動
2. ブックマーク並び替え
3. フォルダ移動
4. フォルダ並び替え

## 最初の実装痕跡
- `frontend/src/utils/folderTree.js` を追加
  - `flattenFolders`
  - `getFolderPath`
  - `getFolderLabelMap`
- `ContentArea.jsx` / `DetailPanel.jsx` / `FolderTree.jsx` で共通化開始
- `frontend/src/components/dnd/BookmarkDndProvider.jsx` を追加
  - bookmark DnD 状態集約
  - folder / unsorted drop target 解決
  - reorder / move の分岐
- `frontend/src/components/dnd/bookmarkDndLogic.js` を追加
  - drop target 解釈
  - reorder ローカル計算
  - unsorted への move 解決

## 実操作前の確認
- `node --input-type=module` で DnD ロジックの純粋関数確認
  - `folder:unsorted -> null`
  - `bookmark:3` を `bookmark:1` 位置へ reorder すると `3,1,2`
- `npm run build` 通過

## 実ブラウザ確認パック
- `docs/PHASE1B_BROWSER_VERIFICATION_PACK.md` を追加
- 起動コマンド / 確認URL / 最小3手順 / 成功条件 / 失敗症状 を固定
- 確認対象は `bookmark drag -> folder drop` / `bookmark reorder` / `detail open 状態での再確認`

## 意図
- Phase 1-B の DnD / move 導線で必要になるフォルダ木の参照ロジックを先に1箇所へ寄せる
- Phase 1-C のフルフォルダパス表示とも衝突しない土台にする
