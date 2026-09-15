# ほげ走（v17 PNG復帰版）

この版では、**WebP 読み込みをやめて PNG をそのまま読む構成**に戻しています。
基本PC想定で使いやすいように、画像アセット参照をすべて PNG に戻しました。

## 主な修正
- `assets/logo/title-logo.png`
- `assets/background/title-key-art.png`
- `assets/background/stage-bg.png`
- `assets/enemy/enemy-sheet.png`
- `assets/collectible/tea-cup.png`
- `assets/ui/ability-select.png`

上記を実ファイルとして同梱し、`index.html` / `styles.css` / `game.js` の参照先も PNG に差し替えています。

## 維持している仕様
- ティーカップ収集物の画像差し替え
- アビリティ閾値: 100 → 200 → 300 → …
- かわいいアビリティ選択UI
- プレイヤーのミニキャラ素材
- キーバインド変更
- スマホ操作対応（既存実装）

## 補足
- v15で入れた遅延読み込みロジックは残していますが、読み込む実体は PNG です。
- PC想定のため、見た目優先でPNGをそのまま使います。
