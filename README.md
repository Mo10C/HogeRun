# ほげ走（完全ミニキャラ化版）

この版は、指定済みのロゴ・背景・敵キャラ素材に加えて、**メインキャラも新規生成したミニキャラ素材へ完全差し替え**した版です。

## 今回の変更

- メインキャラを新規生成
- 背景を透過処理してゲーム用PNGへ分割
- 待機・走行・ジャンプ・スライディング・ゲームオーバーを専用画像化
- 旧ドット絵スプライトをゲームコードから除外
- `game.js` は新しい透過PNGだけを読み込む構成へ変更
- GitHubへそのままアップロードできるよう `assets/` を整理

## 使用しているメインキャラ素材

```text
assets/player/
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

すべて背景透過PNGです。

## 指定済みのゲーム素材

```text
assets/logo/title-logo.png
assets/background/title-key-art.png
assets/background/stage-bg.png
assets/enemy/enemy-sheet.png
```

これらは「○○風」の再現ではなく、指定された画像そのものをゲームのアセットとして読み込んでいます。

## GitHubへアップロード

1. ZIPを解凍
2. GitHubの対象リポジトリを開く
3. **Add file → Upload files**
4. `hoge-run` フォルダの中身をまとめてアップロード
5. **assets フォルダも必ず一緒にアップロード**
6. Commit changes

## Supabase

ランキングを使う場合は `config.js` に Supabase の Project URL と Publishable Key を設定してください。
