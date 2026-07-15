# UNLOCK SERIES — original layout refactored

元の正常に表示されていた画面構成を維持したまま、入力処理を整理した版です。

## 主な変更
- Safari/iPhoneの日本語IME対策をPage 1とPage 3へ追加
- IME変換中の中間イベントを確定文字として処理しない
- BOOKやMOONなど、正しい連続文字を削除しない
- 全角英字を半角英字へ自動変換
- 英字入力処理を `bindLatinInput()` に共通化
- ブラウザのピンチズーム制限を解除
- 判定結果へ `aria-live` を追加
- 開始画面にABCキーボードの補足を追加

## GitHubへの反映
現在のリポジトリ直下にある `index.html` を、このファイルへ置き換えてください。

既存の `assets` フォルダはそのまま残します。

```text
index.html
assets/
  page1.webp
  page_common.webp
  memory_photo.webp
  ending.mp4
```

ファイル名の大文字・小文字も完全一致が必要です。

## 注意
WebページからSafariのキーボードを強制的にABCへ切り替えることはできません。
この版では、日本語キーボード利用時でも二重入力が起きにくいよう、
IMEの変換途中と確定後を区別して処理しています。
