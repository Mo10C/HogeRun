# ほげ走（v15 軽量化＋遅延読み込み版）

この版では、見た目をできるだけ変えずに、**初回読み込みを軽くしつつ、メインキャラの走行表示が見切れにくいよう修正**しています。

## 今回の修正

### 1. 軽量化
- 重い画像を PNG から **WebP** に変換
  - `assets/logo/title-logo.webp`
  - `assets/background/title-key-art.webp`
  - `assets/background/stage-bg.webp`
  - `assets/enemy/enemy-sheet.webp`
- これにより、プロジェクト全体サイズを **約9.6MB → 約1.7MB** まで削減

### 2. 遅延読み込み
- タイトル画面で必要な素材だけ先に読み込み
- ステージ背景・敵シート・プレイヤー各モーションは、**スタートボタン押下後に読み込む方式** に変更
- スタートボタン押下時は「読み込み中…」表示を出すよう変更

### 3. 走行キャラの見切れ修正
- 走行中の描画サイズと位置を調整
- 走行時の上下揺れが二重に加算されていた問題を修正
- これにより、走行中にキャラが下側へ食い込みすぎて見切れる症状を軽減

## 主なファイル

```text
hoge-run/
├─ index.html
├─ styles.css
├─ game.js
├─ README.md
├─ config.js
├─ supabase.sql
└─ assets/
   ├─ logo/
   │  └─ title-logo.webp
   ├─ background/
   │  ├─ title-key-art.webp
   │  └─ stage-bg.webp
   ├─ enemy/
   │  └─ enemy-sheet.webp
   └─ player/
      ├─ idle.png
      ├─ run-1.png
      ├─ run-2.png
      ├─ run-3.png
      ├─ jump-up.png
      ├─ jump-apex.png
      ├─ jump-down.png
      ├─ slide-1.png
      ├─ slide-2.png
      ├─ slide-3.png
      └─ gameover.png
```

## GitHub へのアップロード
1. ZIP を解凍
2. GitHub のリポジトリを開く
3. **Add file → Upload files**
4. 解凍した `hoge-run` の中身をそのままアップロード
5. Commit して反映



## v16 追加変更
- 紅茶の収集アイテムを、生成したうさぎティーカップ画像から作った透過素材に差し替え。
- 新素材: `assets/collectible/tea-cup.webp`
- アビリティ画面に生成画像 `assets/ui/ability-select.webp` を使用し、動的な3択カードをその上に重ねるUIへ変更。
- アビリティ獲得閾値を **100杯 → 200杯 → 300杯 → …** と100杯ずつ増える方式へ変更。
