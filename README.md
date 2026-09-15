# ほげ走

ブラウザで遊べる、紅茶ファンタジー風の横スクロール・ローグライクランゲームです。

## 主な機能

- ユーザー名だけで開始（Supabase Anonymous Sign-In）
- PC / スマホ対応
- PC：ジャンプ `Space / W / ↑`、しゃがみ `S / ↓`
- スマホ：上フリックでジャンプ、下フリックでしゃがみ
- スタート前にキーバインド変更可能
- 紅茶カップを集めてランダム3択の強化
- プレイヤーごとの自己ベスト TOP5 ランキング
- 走行・ジャンプ・着地・しゃがみの専用アニメーション
- うさぎ・紅茶モチーフのHUD / 能力選択UI
- GitHub Pagesでそのまま公開可能

## Supabase設定

1. SupabaseでProjectを作成します。
2. Dashboard の **SQL Editor** で `supabase.sql` を実行します。
3. Authentication の **Anonymous Sign-Ins** を有効にします。
4. Project URL と Publishable key を確認します。
5. `config.js` を書き換えます。

```js
window.HOGE_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseKey: "sb_publishable_xxxxxxxxxxxxx"
};
```

ブラウザ側には **service_role key を置かないでください**。

## GitHub Pagesへのアップロード

1. このフォルダをZIPから解凍します。
2. GitHubのリポジトリで **Add file → Upload files** を選びます。
3. `index.html`、`styles.css`、`game.js`、`config.js`、`supabase.sql`、`README.md`、`assets/` をアップロードします。
4. **Settings → Pages** で `main` / `/(root)` を公開対象にします。

## 現在の画像ファイル構成

```text
assets/
├── backgrounds/
│   ├── stage-bg.png
│   └── ability-select-bg.png
├── ui/
│   ├── title-logo.png
│   ├── title-key-art.png
│   └── hud/
│       ├── score.png
│       ├── tea-cup.png
│       ├── next-item.png
│       ├── best.png
│       └── build.png
├── player/
│   ├── portrait.jpg
│   ├── idle.png
│   ├── gameover.png
│   ├── run/
│   │   └── run-01.png ～ run-16.png
│   ├── jump/
│   │   ├── up.png
│   │   ├── apex.png
│   │   └── down.png
│   ├── landing/
│   │   └── land-1.png ～ land-3.png
│   └── slide/
│       └── slide-1.png ～ slide-3.png
├── enemies/
│   └── enemy-sheet.png
├── items/
│   └── tea-cup.png
└── upgrades/
    ├── double-jump.png
    ├── jump-boots.png
    ├── shield.png
    ├── magnet.png
    ├── slow-clock.png
    ├── tiny-charm.png
    ├── revive.png
    └── tea-sensor.png
```

画像はすべて `assets/` 以下へ用途別に整理済みです。ルート直下の重複画像や、現在のコードから使用されていない旧素材は削除しています。


## v21 画像パス修正 / GitHub Pages キャッシュ対策

画像フォルダ構成は以下に統一しています。

```text
assets/
├─ backgrounds/
├─ enemies/
├─ items/
├─ player/
├─ ui/
│  └─ hud/
└─ upgrades/
```

特にタイトル画像は `assets/ui/title-key-art.png`、タイトルロゴは `assets/ui/title-logo.png` を参照します。
`index.html` / `styles.css` / `game.js` の画像参照をこの階層へ統一し、GitHub Pagesで旧ファイルがキャッシュされないよう `?v=21` を付与しています。
