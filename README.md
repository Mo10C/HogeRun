# ほげ走 v18 — PNG直置き・確実読み込み版

スクリーンショットで画像が表示されずフォールバック描画になっていたため、GitHubブラウザアップロードで事故りにくいように構成を変更しました。

## 重要
この版は **assets フォルダを廃止** しています。
画像を含む全ファイルが `hoge-run` の1階層に入っています。

GitHubではZIPを解凍し、`hoge-run` フォルダ内のファイルを **全部選択して** `Add file → Upload files` へドラッグしてください。

## 修正内容
- WebPを使用しない
- PNGをそのまま使用
- サブフォルダを使用しない
- 全画像をゲーム起動時から読み込み開始
- スタート時に全ゲーム画像の読込完了を確認してから開始
- 読み込み失敗時はゲームを開始せずエラーを表示
- `?v=18` を付けてGitHub Pages/ブラウザの古いキャッシュを回避
- 背景・敵・ティーカップ・メインキャラ・アビリティUIをすべて実画像で使用

## GitHubに必ずアップロードする画像
- title-logo.png
- title-key-art.png
- stage-bg.png
- enemy-sheet.png
- tea-cup.png
- ability-select.png
- player-idle.png
- player-run-1.png / 2 / 3
- player-jump-up.png / apex / down.png
- player-slide-1.png / 2 / 3
- player-gameover.png
