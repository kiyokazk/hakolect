# Phase 1-B 観測ポイント

更新日: 2026-05-13

実ブラウザ確認者から fail が返ったとき、論点を一点に絞って切り分けるための観測ポイント。

## 1. bookmark drag → folder drop

### pass 条件
- ドラッグ開始時にカードまたは一覧項目が持ち上がったと分かる
- drop 先フォルダ / Unsorted に受け皿ハイライトが出る
- ドロップ後に所属フォルダが変わる

### fail 時に見たい症状
- そもそもドラッグ開始できない
- ドラッグ中 overlay は出るが drop 先が光らない
- drop 先は光るが、ドロップ後に所属が変わらない
- drop 後に一覧更新が起きない / 元位置へ戻る

### 切り分け論点
- drag 開始失敗
- droppable 判定失敗
- update API 反映失敗
- query 再取得 / optimistic state 差し戻り失敗

## 2. bookmark reorder

### pass 条件
- 同一フォルダまたは Unsorted 内で順序変更できる
- drop 後に並び順が変わる
- 再描画後も順序が維持される

### fail 時に見たい症状
- reorder 自体が始まらない
- ドロップしても順序が変わらない
- 一瞬変わるがすぐ戻る
- search/tag 条件なしでも reorder 無効表示のまま

### 切り分け論点
- sortable id / collision 判定不整合
- sort_order 更新 API 失敗
- selectedFolderId / activeTag / searchKeyword 条件で reorder が抑止されている
- optimistic reorder と再取得結果の不一致

## 3. スマホ幅確認（390px前後）

### pass 条件
- 1列表示
- `…` 常時表示
- 詳細オーバーレイが縦破綻しない

### fail 時に見たい症状
- 2列になる
- `…` が hover 前提で消える
- 詳細オーバーレイの Save/Cancel やタグ欄が見切れる
- drawer / menu / detail の積層が壊れる

### 切り分け論点
- grid/list のブレークポイント設定
- カードメニュー表示条件
- 詳細オーバーレイ高さ / overflow 設定
- z-index 競合

## 4. 共有フォーマット

確認結果は以下で十分。

- 手順: `drag → folder drop` / `reorder` / `390px確認`
- 判定: `pass` or `fail`
- 症状: 一言で固定

例:
- `bookmark drag → folder drop / fail / drop先は光るが所属が変わらない`
- `reorder / fail / 一瞬並び替わるが再描画後に戻る`
- `390px確認 / pass / 1列・…常時表示・詳細収まりOK`
