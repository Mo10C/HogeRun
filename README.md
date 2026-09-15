# ほげ走

ブラウザだけで公開できる、ドット絵の横スクロール・ローグライクランゲームです。

## 入っている機能

- ユーザー名だけでログイン（裏側はSupabase Anonymous Sign-In）
- PC / スマホ対応
- ジャンプ：Space / W / ↑
- しゃがみ：S / ↓
- スマホ用 JUMP / DUCK ボタン
- キーバインド設定：ジャンプ3枠・しゃがみ2枠をゲーム画面から任意変更可能（ブラウザ保存）
- 野菜4種（にんじん・トマト・ブロッコリー・なす）
- ゾンビ
- しゃがみで避ける低空のお化け
- 紅茶の入ったカップ収集
- 10杯ごとにランダム3択の強化
- 二段ジャンプ / バネ靴 / シールド / ティーカップ磁石 / スロー / 当たり判定縮小 / 復活 / ティーセンサー
- 1プレイごとに強化がリセットされるローグライク方式
- Supabaseへの記録保存
- プレイヤーごとの自己ベストランキング TOP30
- サーバー時刻を使った簡易スコア検証
- 操作キャラを白うさぎメイドのスプライトに差し替え済み
- 待機モーション / しゃがみ専用アニメ / ジャンプ専用コマを実装
- ゲームオーバー時のキャラ演出を追加
- タイトルロゴをキャラに合わせてかわいく調整
- 画面配色をキャラクターに合わせたパステル基調へ調整
- npm / Node / ビルド作業不要
- GitHub Pagesでそのまま公開可能

---

# 1. Supabaseを準備する

1. https://supabase.com/ で新しいProjectを作成します。
2. Supabase Dashboard の **SQL Editor** を開きます。
3. このフォルダの `supabase.sql` の中身を全部コピーして実行します。
4. Authentication の設定で **Anonymous Sign-Ins** を有効にします。
5. Project URL と Publishable key を確認します。

> Anonymous Sign-Inを使うため、プレイヤーはメールアドレスやパスワードを入力しません。
> セッションはブラウザに保存されます。ブラウザデータを消したり別端末へ移ると別ユーザー扱いになります。

---

# 2. config.jsを書き換える

`config.js` を開いて、以下の2か所だけ変更します。

```js
window.HOGE_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseKey: "sb_publishable_xxxxxxxxxxxxx"
};
```

**service_roleキーは絶対に入れないでください。**
ブラウザ側に置くのはPublishable keyです。

---

# 3. GitHubへ「ブラウザから」アップロードする

Gitコマンドは不要です。

1. GitHubを開く
2. **New repository** で新しいリポジトリを作成
3. リポジトリ画面で **Add file → Upload files**
4. このフォルダの中にあるファイルをすべてドラッグ＆ドロップ
   - `index.html`
   - `styles.css`
   - `game.js`
   - `config.js`
   - `supabase.sql`
   - `README.md`
   - `player-bunny-sprites.png`
   - `player-portrait.jpg`
   - `player-start.png`
   - `player-idle.png`
   - `player-jump.png`
   - `player-crouch.png`
   - `player-gameover.png`
5. 下部の **Commit changes** を押す

ZIPファイルそのものではなく、**ZIPを解凍した中身**をアップロードしてください。

---

# 4. GitHub Pagesで公開する

1. GitHubリポジトリの **Settings**
2. 左メニューの **Pages**
3. Build and deployment の Source を **Deploy from a branch**
4. Branch を **main**、Folder を **/(root)**
5. **Save**

公開URLが表示されたら完成です。

例：

```text
https://あなたのGitHubユーザー名.github.io/リポジトリ名/
```

---

# 5. 遊び方

### PC

初期設定：

- ジャンプ：`Space` / `W` / `↑`
- しゃがみ：`S` / `↓`

ゲーム画面の **KEY CONFIG / 操作キー設定** から各キーをクリックし、その後に割り当てたいキーを押すと変更できます。設定はブラウザに保存されます。

### スマホ

- ゲーム画面を**上フリック**：ジャンプ
- ゲーム画面を**下フリック**：しゃがみ（約0.65秒）
- 短いタップや横フリックでは操作しないため、誤操作しにくい仕様です。
- 画面下の `JUMP` / `DUCK` ボタンも引き続き使用できます。

### 敵

- 野菜・ゾンビ：基本的にジャンプで回避
- お化け：低空を飛んでくるのでしゃがんで回避

### 強化

紅茶の入ったカップを10杯集めるたび、ゲームが一時停止してランダムな強化が3つ表示されます。
1つ選ぶとゲーム再開。強化内容はプレイごとにリセットされます。

---

# 注意：ユーザー名だけログインについて

このゲームでは「簡単に遊べること」を優先して、パスワードを使いません。
内部的にはSupabaseの匿名ユーザーIDを使ってランキングを分けています。

そのため：

- 同じブラウザではセッションを維持できます。
- 別端末から同じ名前を入力すると、別ユーザーとして扱われます。
- 同じ表示名を複数人が使うこともできます。

将来「名前＋4桁PIN」などに変更すれば、端末を跨いだアカウント復旧も可能です。

---

# ファイル構成

```text
hoge-run/
├── index.html
├── styles.css
├── game.js
├── config.js
├── supabase.sql
├── player-bunny-sprites.png
├── player-portrait.jpg
├── player-start.png
├── player-idle.png
├── player-jump.png
├── player-crouch.png
├── player-gameover.png
└── README.md
```

敵・背景・紅茶カップはCanvasで描画しています。
操作キャラは、`player-bunny-sprites.png` のスプライトシートを使ってゲーム内へ組み込んでいます。
走行・待機・ジャンプ・しゃがみでアニメーションを切り替えています。
またログイン画面では `player-portrait.jpg`、開始演出やゲームオーバー演出では `player-start.png` や `player-gameover.png` などの補助画像を表示しています。

背景は、著作物をそのまま再現せず、"不思議なティーパーティーの国"をイメージしたオリジナルの紅茶ファンタジー風にしています。


## 最新差し替え

- 操作キャラのメインスプライトは、新しく生成した**全身がしっかり入った4×4の走行アニメーションシート**へ差し替え済みです。
- 走行時の見切れや崩れを防ぐため、スプライトシートのコマサイズとゲーム側の表示倍率も調整しています。
