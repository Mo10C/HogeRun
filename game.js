(() => {
  "use strict";

  const CONFIG = window.HOGE_CONFIG || {};
  const ONLINE_CONFIGURED =
    typeof CONFIG.supabaseUrl === "string" &&
    typeof CONFIG.supabaseKey === "string" &&
    CONFIG.supabaseUrl.startsWith("https://") &&
    !CONFIG.supabaseUrl.includes("YOUR_SUPABASE") &&
    !CONFIG.supabaseKey.includes("YOUR_SUPABASE");

  const $ = (id) => document.getElementById(id);
  const els = {
    loginScreen: $("login-screen"),
    gameScreen: $("game-screen"),
    loginForm: $("login-form"),
    usernameInput: $("username-input"),
    loginError: $("login-error"),
    userBadge: $("user-badge"),
    currentUsername: $("current-username"),
    renameButton: $("rename-button"),
    canvas: $("game-canvas"),
    scoreLabel: $("score-label"),
    coinLabel: $("coin-label"),
    upgradeLabel: $("upgrade-label"),
    bestLabel: $("best-label"),
    startOverlay: $("start-overlay"),
    startTitle: $("start-title"),
    startDescription: $("start-description"),
    startButton: $("start-button"),
    overlayEyebrow: $("overlay-eyebrow"),
    overlayCharacter: $("overlay-character"),
    overlayNote: $("overlay-note"),
    upgradeOverlay: $("upgrade-overlay"),
    upgradeCards: $("upgrade-cards"),
    jumpButton: $("jump-button"),
    duckButton: $("duck-button"),
    buildList: $("build-list"),
    rankingStatus: $("ranking-status"),
    rankingList: $("ranking-list"),
    refreshRanking: $("refresh-ranking")
  };

  const ctx = els.canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const PLAYER_SPRITE_SHEET = new Image();
  PLAYER_SPRITE_SHEET.src = "./player-bunny-sprites.png";
  let playerSpriteReady = false;
  PLAYER_SPRITE_SHEET.addEventListener("load", () => { playerSpriteReady = true; });

  const PLAYER_SPRITE = {
    cols: 4,
    rows: 4,
    cellW: 317,
    cellH: 317,
    runFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    jumpFrames: [8, 9, 10, 11],
    crouchFrames: [12, 13, 14, 15],
    idleFrames: [0, 4],
    startFrame: 0,
    gameOverFrame: 15
  };

  let supabaseClient = null;
  let currentUserId = null;
  let currentUsername = "";
  let currentBest = 0;
  let currentRunId = null;
  let finishingRun = false;

  const game = {
    phase: "idle", // idle | playing | upgrade | gameover
    lastTime: performance.now(),
    elapsed: 0,
    distance: 0,
    coins: 0,
    nextUpgradeAt: 10,
    worldSpeed: 330,
    enemyTimer: 0.9,
    coinTimer: 0.4,
    enemies: [],
    coinObjects: [],
    particles: [],
    flash: 0,
    duckHeld: false,
    player: {
      x: 142,
      y: 430 - 62,
      w: 42,
      h: 62,
      standH: 62,
      crouchH: 34,
      vy: 0,
      onGround: true,
      crouching: false,
      airJumpsUsed: 0,
      invincible: 0
    },
    upgrades: null,
    upgradeLevels: {},
    upgradeHistory: []
  };

  const GROUND_Y = 430;
  const GRAVITY = 1950;
  const BASE_JUMP = 720;

  const UPGRADE_DEFS = [
    {
      id: "double_jump",
      icon: "⇧⇧",
      name: "二段ジャンプ",
      desc: "空中ジャンプ回数 +1。最大3回まで重ね掛け可能。",
      max: 3,
      apply: () => { game.upgrades.extraAirJumps += 1; }
    },
    {
      id: "jump_boots",
      icon: "靴",
      name: "バネ靴",
      desc: "ジャンプ力 +12%。高い敵配置を越えやすくなる。",
      max: 4,
      apply: () => { game.upgrades.jumpBoost *= 1.12; }
    },
    {
      id: "shield",
      icon: "盾",
      name: "ほげシールド",
      desc: "敵との衝突を1回無効化。取るたびに1枚追加。",
      max: 6,
      apply: () => { game.upgrades.shield += 1; }
    },
    {
      id: "magnet",
      icon: "磁",
      name: "ティーカップ磁石",
      desc: "近くの紅茶カップを吸い寄せる範囲が広くなる。",
      max: 4,
      apply: () => { game.upgrades.magnetRadius += 72; }
    },
    {
      id: "slow_clock",
      icon: "時",
      name: "のろのろ時計",
      desc: "敵と紅茶カップの流れる速度を7%低下。重ね掛け可能。",
      max: 4,
      apply: () => { game.upgrades.speedFactor *= 0.93; }
    },
    {
      id: "tiny_charm",
      icon: "小",
      name: "ちびチャーム",
      desc: "当たり判定を少し小さくして、ギリギリ回避しやすくする。",
      max: 3,
      apply: () => { game.upgrades.hitboxInset += 3; }
    },
    {
      id: "revive",
      icon: "羽",
      name: "復活の羽",
      desc: "致命的な衝突を1回だけ無効化し、短時間無敵になる。",
      max: 3,
      apply: () => { game.upgrades.revive += 1; }
    },
    {
      id: "coin_sense",
      icon: "金",
      name: "ティーセンサー",
      desc: "紅茶カップの出現間隔が短くなり、次の強化を狙いやすくなる。",
      max: 3,
      apply: () => { game.upgrades.coinSpawnFactor *= 0.88; }
    }
  ];

  function resetUpgrades() {
    game.upgrades = {
      extraAirJumps: 0,
      jumpBoost: 1,
      shield: 0,
      magnetRadius: 62,
      speedFactor: 1,
      hitboxInset: 0,
      revive: 0,
      coinSpawnFactor: 1
    };
    game.upgradeLevels = {};
    game.upgradeHistory = [];
  }

  function resetGame() {
    game.phase = "idle";
    game.elapsed = 0;
    game.distance = 0;
    game.coins = 0;
    game.nextUpgradeAt = 10;
    game.worldSpeed = 330;
    game.enemyTimer = 0.85;
    game.coinTimer = 0.35;
    game.enemies = [];
    game.coinObjects = [];
    game.particles = [];
    game.flash = 0;
    game.duckHeld = false;
    game.player.x = 142;
    game.player.h = game.player.standH;
    game.player.y = GROUND_Y - game.player.h;
    game.player.vy = 0;
    game.player.onGround = true;
    game.player.crouching = false;
    game.player.airJumpsUsed = 0;
    game.player.invincible = 0;
    resetUpgrades();
    updateHud();
    renderBuild();
  }

  function validateUsername(value) {
    const username = value.trim().replace(/\s+/g, " ");
    if (!username) return { ok: false, message: "プレイヤー名を入力してください。" };
    if (username.length > 16) return { ok: false, message: "プレイヤー名は16文字以内にしてください。" };
    if (/[<>]/.test(username)) return { ok: false, message: "< と > は名前に使用できません。" };
    return { ok: true, username };
  }

  async function initializeOnline() {
    if (!ONLINE_CONFIGURED) {
      els.loginError.textContent = "※ config.js が未設定です。今はオフライン練習モードで遊べます。ランキングを使うにはREADMEのSupabase設定を行ってください。";
      els.rankingStatus.textContent = "Supabase未設定";
      return;
    }

    if (!window.supabase?.createClient) {
      els.loginError.textContent = "Supabaseライブラリを読み込めませんでした。インターネット接続を確認してください。";
      return;
    }

    supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

    const { data: sessionData } = await supabaseClient.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    if (!sessionUser) return;

    currentUserId = sessionUser.id;
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", currentUserId)
      .maybeSingle();

    if (profile?.username) {
      currentUsername = profile.username;
      enterGameScreen();
    }
  }

  async function loginWithUsername(username) {
    els.loginError.textContent = "";

    if (!ONLINE_CONFIGURED || !supabaseClient) {
      currentUsername = username;
      currentUserId = `offline-${crypto.randomUUID()}`;
      localStorage.setItem("hoge-run-offline-name", username);
      enterGameScreen();
      return;
    }

    let { data: userData } = await supabaseClient.auth.getUser();
    let user = userData?.user;

    if (!user) {
      const { data, error } = await supabaseClient.auth.signInAnonymously();
      if (error) throw new Error(`匿名ログインに失敗しました: ${error.message}`);
      user = data.user;
    }

    if (!user) throw new Error("ユーザー情報を取得できませんでした。");

    const { error: profileError } = await supabaseClient
      .from("profiles")
      .upsert({ id: user.id, username }, { onConflict: "id" });

    if (profileError) throw new Error(`名前の保存に失敗しました: ${profileError.message}`);

    currentUserId = user.id;
    currentUsername = username;
    enterGameScreen();
  }

  function enterGameScreen() {
    els.loginScreen.classList.add("hidden");
    els.gameScreen.classList.remove("hidden");
    els.userBadge.classList.remove("hidden");
    els.currentUsername.textContent = currentUsername;
    resetGame();
    showStartOverlay("ほげ走", "ジャンプとしゃがみで敵をかわして、紅茶の入ったカップを10杯集めるたびにランダム強化！", "スタート", { variant: "start", eyebrow: "WELCOME TO THE TEA KINGDOM", note: "ふしぎな紅茶の国を駆け抜けよう！", characterSrc: "./player-start.png" });
    refreshLeaderboard();
  }

  function showLoginForRename() {
    if (game.phase === "playing" || game.phase === "upgrade") return;
    els.gameScreen.classList.add("hidden");
    els.loginScreen.classList.remove("hidden");
    els.userBadge.classList.add("hidden");
    els.usernameInput.value = currentUsername;
    els.usernameInput.focus();
  }

  async function startRun() {
    if (game.phase === "playing" || game.phase === "upgrade") return;
    resetGame();
    currentRunId = null;
    finishingRun = false;

    if (ONLINE_CONFIGURED && supabaseClient) {
      const { data, error } = await supabaseClient.rpc("start_game");
      if (error) {
        showStartOverlay("開始できませんでした", `Supabase: ${error.message}`, "もう一度", { variant: "gameover", eyebrow: "SYSTEM MESSAGE", note: "もう一度押して再挑戦できます。", characterSrc: "./player-gameover.png" });
        return;
      }
      currentRunId = data;
    }

    els.startOverlay.classList.add("hidden");
    game.phase = "playing";
    game.lastTime = performance.now();
  }

  async function finishRun(reason = "敵にぶつかった！") {
    if (finishingRun || game.phase === "gameover") return;
    finishingRun = true;
    game.phase = "gameover";

    const finalScore = Math.max(0, Math.floor(game.distance));
    currentBest = Math.max(currentBest, finalScore);
    els.bestLabel.textContent = `${currentBest}m`;

    let saveMessage = ONLINE_CONFIGURED ? "ランキングへ保存中..." : "オフライン練習モード";
    showStartOverlay("GAME OVER", `${reason}　${finalScore}m / ${game.coins} TEA\n${saveMessage}`, "もう一回", { variant: "gameover", eyebrow: "OOPS! TEA TIME OVER", note: "紅茶をこぼしちゃった… もう一回走ろう！", characterSrc: "./player-gameover.png" });

    if (ONLINE_CONFIGURED && supabaseClient && currentRunId) {
      const { error } = await supabaseClient.rpc("finish_game", {
        p_run_id: currentRunId,
        p_score: finalScore,
        p_coins: game.coins
      });

      if (error) {
        els.startDescription.textContent = `${reason}　${finalScore}m / ${game.coins} TEA　※保存失敗: ${error.message}`;
      } else {
        els.startDescription.textContent = `${reason}　${finalScore}m / ${game.coins} TEA　ランキング保存完了！`;
        await refreshLeaderboard();
      }
    }

    finishingRun = false;
  }

  function showStartOverlay(title, description, buttonLabel, options = {}) {
    const {
      variant = "start",
      eyebrow = variant === "gameover" ? "GAME OVER" : "WELCOME TO THE TEA KINGDOM",
      note = variant === "gameover" ? "紅茶をこぼしちゃった… もう一回走ろう！" : "ふしぎな紅茶の国を駆け抜けよう！",
      characterSrc = variant === "gameover" ? "./player-gameover.png" : "./player-start.png"
    } = options;

    els.startTitle.textContent = title;
    els.startDescription.textContent = description;
    els.startButton.textContent = buttonLabel;
    els.overlayEyebrow.textContent = eyebrow;
    els.overlayNote.textContent = note;
    els.overlayCharacter.src = characterSrc;
    els.startOverlay.classList.remove("overlay-start", "overlay-gameover");
    els.startOverlay.classList.add(variant === "gameover" ? "overlay-gameover" : "overlay-start");
    els.startOverlay.classList.remove("hidden");
  }

  function updateHud() {
    els.scoreLabel.textContent = `${Math.floor(game.distance)}m`;
    els.coinLabel.textContent = String(game.coins);
    els.upgradeLabel.textContent = `${Math.max(0, game.nextUpgradeAt - game.coins)}`;
    els.bestLabel.textContent = `${currentBest}m`;
  }

  function jump() {
    if (game.phase !== "playing") return;
    const p = game.player;
    const power = BASE_JUMP * game.upgrades.jumpBoost;

    if (p.onGround) {
      p.vy = -power;
      p.onGround = false;
      p.crouching = false;
      p.h = p.standH;
      p.airJumpsUsed = 0;
      puff(p.x + 20, GROUND_Y - 4, 5, "#f6dfb5");
    } else if (p.airJumpsUsed < game.upgrades.extraAirJumps) {
      p.vy = -power * 0.93;
      p.airJumpsUsed += 1;
      puff(p.x + 20, p.y + p.h, 7, "#b7f0ff");
    }
  }

  function setDuck(held) {
    game.duckHeld = held;
  }

  function updatePlayer(dt) {
    const p = game.player;
    if (p.invincible > 0) p.invincible = Math.max(0, p.invincible - dt);

    const shouldCrouch = game.duckHeld && p.onGround;
    if (shouldCrouch !== p.crouching) {
      p.crouching = shouldCrouch;
      p.h = shouldCrouch ? p.crouchH : p.standH;
      p.y = GROUND_Y - p.h;
    }

    if (!p.onGround && game.duckHeld) p.vy += 900 * dt;

    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;

    if (p.y + p.h >= GROUND_Y) {
      p.y = GROUND_Y - p.h;
      p.vy = 0;
      p.onGround = true;
      p.airJumpsUsed = 0;
    } else {
      p.onGround = false;
    }
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function choose(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function spawnEnemy() {
    const roll = Math.random();
    let enemy;

    if (roll < 0.57) {
      const veggie = choose(["carrot", "tomato", "broccoli", "eggplant"]);
      const dims = {
        carrot: [36, 58],
        tomato: [48, 44],
        broccoli: [52, 58],
        eggplant: [40, 58]
      }[veggie];
      enemy = { kind: veggie, x: 1000, y: GROUND_Y - dims[1], w: dims[0], h: dims[1], dead: false };
    } else if (roll < 0.79) {
      enemy = { kind: "zombie", x: 1000, y: GROUND_Y - 72, w: 44, h: 72, dead: false };
    } else {
      // 立っていると当たるが、しゃがむと頭上を抜ける高さ。
      enemy = { kind: "ghost", x: 1000, y: 360, w: 62, h: 32, dead: false };
    }

    game.enemies.push(enemy);
  }

  function spawnCoins() {
    const count = Math.floor(randomBetween(3, 7));
    const baseX = 1000;
    const pattern = choose(["line", "arc", "high"]);

    for (let i = 0; i < count; i += 1) {
      let y = GROUND_Y - 72;
      if (pattern === "arc") y -= Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 84;
      if (pattern === "high") y = GROUND_Y - 145;
      game.coinObjects.push({ x: baseX + i * 34, y, w: 20, h: 20, collected: false, spin: Math.random() * 10 });
    }
  }

  function playerHitbox() {
    const p = game.player;
    const inset = Math.min(10, game.upgrades.hitboxInset);
    return {
      x: p.x + 7 + inset,
      y: p.y + 5 + inset,
      w: p.w - 14 - inset * 2,
      h: p.h - 8 - inset * 2
    };
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function handleEnemyCollision(enemy) {
    if (game.player.invincible > 0) return;

    if (game.upgrades.shield > 0) {
      game.upgrades.shield -= 1;
      enemy.dead = true;
      game.player.invincible = 0.6;
      game.flash = 0.18;
      puff(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 12, "#ffd84d");
      renderBuild();
      return;
    }

    if (game.upgrades.revive > 0) {
      game.upgrades.revive -= 1;
      enemy.dead = true;
      game.player.invincible = 1.8;
      game.flash = 0.35;
      puff(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 16, "#ffffff");
      renderBuild();
      return;
    }

    finishRun(enemy.kind === "ghost" ? "お化けに捕まった！" : enemy.kind === "zombie" ? "ゾンビにぶつかった！" : "野菜に激突した！");
  }

  function collectCoin(coin) {
    if (coin.collected) return;
    coin.collected = true;
    game.coins += 1;
    game.distance += 4;
    puff(coin.x + 10, coin.y + 10, 5, "#ffe66d");
    updateHud();

    if (game.coins >= game.nextUpgradeAt && game.phase === "playing") {
      game.nextUpgradeAt += 10;
      openUpgradeSelection();
    }
  }

  function updateWorld(dt) {
    game.elapsed += dt;
    game.worldSpeed = Math.min(720, 330 + game.elapsed * 7.2) * game.upgrades.speedFactor;
    game.distance += (game.worldSpeed * dt) / 12;

    game.enemyTimer -= dt;
    if (game.enemyTimer <= 0) {
      spawnEnemy();
      const difficulty = Math.min(0.35, game.elapsed / 180);
      game.enemyTimer = randomBetween(0.92 - difficulty, 1.55 - difficulty * 0.65);
    }

    game.coinTimer -= dt;
    if (game.coinTimer <= 0) {
      spawnCoins();
      game.coinTimer = randomBetween(0.75, 1.25) * game.upgrades.coinSpawnFactor;
    }

    const speed = game.worldSpeed;
    const pBox = playerHitbox();

    for (const enemy of game.enemies) {
      enemy.x -= speed * dt;
      if (!enemy.dead && intersects(pBox, enemy)) handleEnemyCollision(enemy);
    }
    game.enemies = game.enemies.filter((enemy) => !enemy.dead && enemy.x + enemy.w > -60);

    const px = game.player.x + game.player.w / 2;
    const py = game.player.y + game.player.h / 2;
    for (const coin of game.coinObjects) {
      coin.spin += dt * 9;
      coin.x -= speed * dt;
      const cx = coin.x + coin.w / 2;
      const cy = coin.y + coin.h / 2;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < game.upgrades.magnetRadius) {
        const pull = Math.min(1, dt * (5 + (game.upgrades.magnetRadius - dist) / 35));
        coin.x += dx * pull;
        coin.y += dy * pull;
      }
      if (!coin.collected && intersects(pBox, coin)) collectCoin(coin);
    }
    game.coinObjects = game.coinObjects.filter((coin) => !coin.collected && coin.x + coin.w > -40);

    updateParticles(dt);
    if (game.flash > 0) game.flash = Math.max(0, game.flash - dt);
    updateHud();
  }

  function puff(x, y, amount, color) {
    for (let i = 0; i < amount; i += 1) {
      game.particles.push({
        x,
        y,
        vx: randomBetween(-90, 90),
        vy: randomBetween(-160, -30),
        life: randomBetween(0.25, 0.55),
        size: choose([4, 6, 8]),
        color
      });
    }
  }

  function updateParticles(dt) {
    for (const p of game.particles) {
      p.life -= dt;
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    game.particles = game.particles.filter((p) => p.life > 0);
  }

  function availableUpgrades() {
    const candidates = UPGRADE_DEFS.filter((item) => (game.upgradeLevels[item.id] || 0) < item.max);
    return candidates.length >= 3 ? candidates : UPGRADE_DEFS;
  }

  function randomUpgradeChoices() {
    const pool = [...availableUpgrades()];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }

  function openUpgradeSelection() {
    game.phase = "upgrade";
    els.upgradeCards.innerHTML = "";

    for (const item of randomUpgradeChoices()) {
      const button = document.createElement("button");
      button.className = "upgrade-card";
      button.type = "button";
      const currentLevel = game.upgradeLevels[item.id] || 0;
      button.innerHTML = `
        <span class="icon">${escapeHtml(item.icon)}</span>
        <span class="name">${escapeHtml(item.name)} <small>Lv.${currentLevel + 1}</small></span>
        <span class="desc">${escapeHtml(item.desc)}</span>
      `;
      button.addEventListener("click", () => chooseUpgrade(item));
      els.upgradeCards.appendChild(button);
    }

    els.upgradeOverlay.classList.remove("hidden");
  }

  function chooseUpgrade(item) {
    const level = game.upgradeLevels[item.id] || 0;
    if (level >= item.max) return;
    item.apply();
    game.upgradeLevels[item.id] = level + 1;
    game.upgradeHistory.push(item.id);
    els.upgradeOverlay.classList.add("hidden");
    renderBuild();
    updateHud();
    game.phase = "playing";
    game.lastTime = performance.now();

    // まとめて大量に紅茶カップを拾った場合は、次の10杯到達分も続けて選ばせる。
    if (game.coins >= game.nextUpgradeAt) {
      game.nextUpgradeAt += 10;
      setTimeout(openUpgradeSelection, 80);
    }
  }

  function renderBuild() {
    const entries = Object.entries(game.upgradeLevels).filter(([, level]) => level > 0);
    if (!entries.length) {
      els.buildList.innerHTML = '<span class="muted">まだ強化なし</span>';
      return;
    }

    els.buildList.innerHTML = entries.map(([id, level]) => {
      const item = UPGRADE_DEFS.find((def) => def.id === id);
      return `<span class="build-chip">${escapeHtml(item?.name || id)} Lv.${level}</span>`;
    }).join("");
  }

  async function refreshLeaderboard() {
    if (!ONLINE_CONFIGURED || !supabaseClient) {
      els.rankingStatus.textContent = "オンラインランキングはSupabase設定後に有効になります。";
      els.rankingList.innerHTML = "";
      return;
    }

    els.rankingStatus.textContent = "読み込み中...";
    const { data, error } = await supabaseClient.rpc("get_leaderboard", { p_limit: 30 });
    if (error) {
      els.rankingStatus.textContent = `ランキング取得失敗: ${error.message}`;
      return;
    }

    const rows = data || [];
    const me = rows.find((row) => row.user_id === currentUserId);
    currentBest = me?.best_score || 0;
    updateHud();

    els.rankingStatus.textContent = rows.length ? `TOP ${rows.length}` : "まだ記録がありません。最初のランナーになろう。";
    els.rankingList.innerHTML = rows.map((row) => `
      <li class="ranking-item ${row.user_id === currentUserId ? "me" : ""}">
        <span class="rank-name" title="${escapeHtml(row.username)}">${escapeHtml(row.username)}</span>
        <span class="rank-score">${Number(row.best_score).toLocaleString()}m</span>
      </li>
    `).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function drawBackground() {
    const w = els.canvas.width;
    const h = els.canvas.height;

    ctx.fillStyle = "#dff1ff";
    ctx.fillRect(0, 0, w, h);

    // ふんわりした夕空グラデーション帯
    ctx.fillStyle = "#ffd8e8";
    ctx.fillRect(0, 0, w, 120);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(0, 120, w, 40);

    // レモンスライスの月
    ctx.fillStyle = "#fff1a8";
    ctx.fillRect(738, 54, 84, 84);
    ctx.fillStyle = "#ffe57d";
    ctx.fillRect(746, 62, 68, 68);
    ctx.fillStyle = "#fff8cf";
    ctx.fillRect(774, 62, 6, 68);
    ctx.fillRect(746, 92, 68, 6);

    // 雲
    const cloudOffset = -((game.distance * 0.32) % 420);
    for (let i = -1; i < 4; i += 1) {
      drawCloud(cloudOffset + i * 420 + 70, 78 + (i % 2) * 40);
    }

    // ガーランド
    drawBunting(-((game.distance * 0.7) % 160));

    // 遠景のティーカップ丘
    const hillOffset = -((game.distance * 0.85) % 260);
    for (let i = -1; i < 6; i += 1) {
      const x = hillOffset + i * 260;
      drawTeaHill(x, GROUND_Y - 88 + (i % 2) * 12, i);
    }

    // 中景のティーポットハウス / カップタワー
    const propOffset = -((game.distance * 1.5) % 240);
    for (let i = -1; i < 6; i += 1) {
      const x = propOffset + i * 240;
      if (i % 2 === 0) {
        drawTeapotHouse(x + 25, GROUND_Y - 22);
      } else {
        drawCupTower(x + 30, GROUND_Y - 16);
      }
    }

    // 手前の生垣と角砂糖
    const hedgeOffset = -((game.distance * 2.7) % 120);
    for (let x = hedgeOffset - 120; x < w + 120; x += 120) {
      ctx.fillStyle = "#9cd67a";
      ctx.fillRect(x, GROUND_Y - 28, 54, 20);
      ctx.fillRect(x + 10, GROUND_Y - 38, 34, 12);
      ctx.fillStyle = "#fdfdfb";
      ctx.fillRect(x + 68, GROUND_Y - 26, 18, 18);
      ctx.fillRect(x + 82, GROUND_Y - 18, 18, 18);
      ctx.fillStyle = "#e9e6da";
      ctx.fillRect(x + 68, GROUND_Y - 26, 18, 3);
      ctx.fillRect(x + 82, GROUND_Y - 18, 18, 3);
    }

    // 地面
    ctx.fillStyle = "#6e5544";
    ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);
    ctx.fillStyle = "#b78463";
    ctx.fillRect(0, GROUND_Y, w, 14);
    ctx.fillStyle = "#f6f1ea";
    const groundOffset = -((game.distance * 4) % 52);
    for (let x = groundOffset - 52; x < w + 52; x += 52) {
      ctx.fillRect(x + 5, GROUND_Y + 24, 20, 10);
      ctx.fillRect(x + 29, GROUND_Y + 24, 20, 10);
      ctx.fillRect(x + 5, GROUND_Y + 38, 20, 10);
      ctx.fillRect(x + 29, GROUND_Y + 38, 20, 10);
      ctx.fillStyle = "#e0d3c5";
      ctx.fillRect(x + 23, GROUND_Y + 24, 3, 24);
      ctx.fillRect(x + 5, GROUND_Y + 35, 44, 3);
      ctx.fillStyle = "#f6f1ea";
    }
  }

  function drawBunting(offset) {
    for (let x = offset - 160; x < els.canvas.width + 160; x += 160) {
      ctx.fillStyle = "#8d7bb6";
      ctx.fillRect(x, 132, 160, 3);
      const colors = ["#ff8fab", "#ffd166", "#7bd389", "#7aa6ff"];
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(x + 16 + i * 36, 135, 16, 16);
      }
    }
  }

  function drawTeaHill(x, baseY, seed) {
    ctx.fillStyle = seed % 2 === 0 ? "#d8c8f0" : "#c7e8d5";
    ctx.fillRect(x, baseY, 168, 56);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x + 14 + i * 30, baseY + 10 + (i % 2) * 8, 14, 14);
    }
    ctx.fillStyle = "#fffaf2";
    ctx.fillRect(x + 46, baseY - 28, 74, 20);
    ctx.fillStyle = "#f6c5dc";
    ctx.fillRect(x + 52, baseY - 34, 62, 12);
    ctx.fillStyle = "#8a6a5d";
    ctx.fillRect(x + 58, baseY - 26, 50, 8);
    ctx.fillStyle = "#fffaf2";
    ctx.fillRect(x + 118, baseY - 22, 10, 16);
    ctx.fillRect(x + 128, baseY - 16, 6, 6);
  }

  function drawTeapotHouse(x, groundY) {
    ctx.fillStyle = "#f9d6a4";
    ctx.fillRect(x + 10, groundY - 54, 76, 42);
    ctx.fillRect(x + 18, groundY - 66, 60, 18);
    ctx.fillStyle = "#fff6e8";
    ctx.fillRect(x + 0, groundY - 40, 14, 18);
    ctx.fillRect(x + 82, groundY - 40, 18, 14);
    ctx.fillRect(x + 90, groundY - 36, 10, 6);
    ctx.fillStyle = "#b86f50";
    ctx.fillRect(x + 40, groundY - 78, 18, 12);
    ctx.fillRect(x + 32, groundY - 12, 32, 12);
    ctx.fillStyle = "#7f5d4d";
    ctx.fillRect(x + 20, groundY - 50, 16, 14);
    ctx.fillRect(x + 56, groundY - 50, 16, 14);
    ctx.fillStyle = "#dff1ff";
    ctx.fillRect(x + 24, groundY - 46, 8, 8);
    ctx.fillRect(x + 60, groundY - 46, 8, 8);
  }

  function drawCupTower(x, groundY) {
    ctx.fillStyle = "#fff7ef";
    ctx.fillRect(x + 8, groundY - 26, 48, 14);
    ctx.fillStyle = "#e6b5d2";
    ctx.fillRect(x + 14, groundY - 34, 38, 12);
    ctx.fillStyle = "#8c6b5b";
    ctx.fillRect(x + 18, groundY - 30, 30, 5);
    ctx.fillStyle = "#fff7ef";
    ctx.fillRect(x + 24, groundY - 56, 40, 14);
    ctx.fillRect(x + 58, groundY - 52, 8, 8);
    ctx.fillStyle = "#b0dfc1";
    ctx.fillRect(x + 28, groundY - 64, 32, 12);
    ctx.fillStyle = "#8c6b5b";
    ctx.fillRect(x + 32, groundY - 60, 24, 5);
  }

  function drawCloud(x, y) {
    ctx.fillStyle = "rgba(255,255,255,.88)";
    ctx.fillRect(x, y + 16, 80, 24);
    ctx.fillRect(x + 18, y, 32, 44);
    ctx.fillRect(x + 46, y + 8, 34, 34);
  }

  function drawCoin(coin) {
    const squeeze = Math.max(8, Math.round(Math.abs(Math.sin(coin.spin)) * 18));
    const x = Math.round(coin.x + (20 - squeeze) / 2);
    const y = Math.round(coin.y);

    // 受け皿
    ctx.fillStyle = "#e7d8ee";
    ctx.fillRect(x - 1, y + 16, squeeze + 2, 4);

    // カップ本体
    ctx.fillStyle = "#fff8f4";
    ctx.fillRect(x, y + 4, squeeze, 12);
    ctx.fillStyle = "#f3b4cc";
    ctx.fillRect(x + 2, y + 2, Math.max(4, squeeze - 4), 4);
    ctx.fillStyle = "#7d523c";
    ctx.fillRect(x + 3, y + 6, Math.max(3, squeeze - 6), 5);

    // 取っ手
    if (squeeze > 11) {
      ctx.fillStyle = "#fff8f4";
      ctx.fillRect(x + squeeze, y + 7, 3, 6);
      ctx.fillRect(x + squeeze + 2, y + 8, 2, 4);
    }

    // 湯気
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(x + 4, y - 3, 2, 4);
    ctx.fillRect(x + squeeze - 6, y - 1, 2, 4);
  }

  function drawFallbackPlayer() {
    const p = game.player;
    const blink = p.invincible > 0 && Math.floor(p.invincible * 12) % 2 === 0;
    if (blink) return;

    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const crouch = p.crouching;

    if (crouch) {
      ctx.fillStyle = "#222733";
      ctx.fillRect(x + 6, y + 22, 34, 10);
      ctx.fillStyle = "#e45757";
      ctx.fillRect(x + 11, y + 10, 25, 16);
      ctx.fillStyle = "#ffd6a5";
      ctx.fillRect(x + 4, y + 3, 19, 16);
      ctx.fillStyle = "#222733";
      ctx.fillRect(x + 6, y, 20, 6);
      ctx.fillRect(x + 8, y + 31, 12, 3);
      ctx.fillRect(x + 28, y + 31, 12, 3);
    } else {
      const legPhase = Math.floor((game.elapsed * 11) % 2);
      ctx.fillStyle = "#e45757";
      ctx.fillRect(x + 10, y + 22, 25, 26);
      ctx.fillStyle = "#ffd6a5";
      ctx.fillRect(x + 9, y + 4, 25, 23);
      ctx.fillStyle = "#222733";
      ctx.fillRect(x + 7, y, 30, 8);
      ctx.fillRect(x + 30, y + 10, 4, 5);
      ctx.fillStyle = "#34445d";
      if (p.onGround) {
        if (legPhase) {
          ctx.fillRect(x + 10, y + 46, 10, 14);
          ctx.fillRect(x + 28, y + 45, 10, 9);
        } else {
          ctx.fillRect(x + 9, y + 45, 10, 9);
          ctx.fillRect(x + 27, y + 46, 10, 14);
        }
      } else {
        ctx.fillRect(x + 10, y + 46, 10, 12);
        ctx.fillRect(x + 28, y + 43, 10, 11);
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 8, y + 58, 14, 4);
      ctx.fillRect(x + 27, y + 58, 14, 4);
    }

    if (game.upgrades.shield > 0) {
      ctx.strokeStyle = "#ffe66d";
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 8, y - 8, p.w + 16, p.h + 16);
    }
  }

  function getPlayerFrameIndex() {
    const p = game.player;

    if (p.crouching) {
      return PLAYER_SPRITE.crouchFrames[Math.floor((game.elapsed * 10) % PLAYER_SPRITE.crouchFrames.length)];
    }

    if (!p.onGround) {
      if (p.vy < -320) return PLAYER_SPRITE.jumpFrames[0];
      if (p.vy < -80) return PLAYER_SPRITE.jumpFrames[1];
      if (p.vy < 180) return PLAYER_SPRITE.jumpFrames[2];
      return PLAYER_SPRITE.jumpFrames[3];
    }

    if (game.phase === "idle" || game.phase === "gameover") {
      return PLAYER_SPRITE.idleFrames[Math.floor((performance.now() / 360) % PLAYER_SPRITE.idleFrames.length)];
    }

    if (game.phase === "upgrade") {
      return PLAYER_SPRITE.idleFrames[Math.floor((performance.now() / 420) % PLAYER_SPRITE.idleFrames.length)];
    }

    return PLAYER_SPRITE.runFrames[Math.floor((game.elapsed * 14) % PLAYER_SPRITE.runFrames.length)];
  }

  function drawPlayer() {
    const p = game.player;
    const blink = p.invincible > 0 && Math.floor(p.invincible * 12) % 2 === 0;
    if (blink) return;

    if (!playerSpriteReady || !PLAYER_SPRITE_SHEET.complete) {
      drawFallbackPlayer();
      return;
    }

    const frameIndex = getPlayerFrameIndex();
    const frameCol = frameIndex % PLAYER_SPRITE.cols;
    const frameRow = Math.floor(frameIndex / PLAYER_SPRITE.cols);

    const sx = frameCol * PLAYER_SPRITE.cellW;
    const sy = frameRow * PLAYER_SPRITE.cellH;

    const drawScale = p.crouching ? 0.92 : (!p.onGround ? 0.98 : 1);
    const drawW = Math.round(136 * drawScale);
    const drawH = Math.round(136 * drawScale);
    const bob = (game.phase === "idle" || game.phase === "upgrade") ? Math.sin(performance.now() / 220) * 2 : 0;
    const drawX = Math.round(p.x - 46 + (p.crouching ? 0 : 0));
    const drawY = Math.round(GROUND_Y - drawH - (p.crouching ? -6 : 10) + bob);

    ctx.drawImage(
      PLAYER_SPRITE_SHEET,
      sx,
      sy,
      PLAYER_SPRITE.cellW,
      PLAYER_SPRITE.cellH,
      drawX,
      drawY,
      drawW,
      drawH
    );

    if (game.upgrades.shield > 0) {
      ctx.strokeStyle = "#ffe66d";
      ctx.lineWidth = 4;
      ctx.strokeRect(drawX + 16, drawY + 8, drawW - 30, drawH - 18);
    }
  }

  function drawEnemy(enemy) {
    const x = Math.round(enemy.x);
    const y = Math.round(enemy.y);

    switch (enemy.kind) {
      case "carrot":
        ctx.fillStyle = "#42a55c";
        ctx.fillRect(x + 11, y, 7, 16);
        ctx.fillRect(x + 20, y + 3, 7, 16);
        ctx.fillStyle = "#f28c28";
        ctx.fillRect(x + 7, y + 14, 24, 25);
        ctx.fillRect(x + 11, y + 39, 16, 12);
        ctx.fillRect(x + 15, y + 51, 8, 7);
        drawEnemyEyes(x + 10, y + 23, 18);
        break;
      case "tomato":
        ctx.fillStyle = "#e84855";
        ctx.fillRect(x + 4, y + 8, 40, 30);
        ctx.fillRect(x + 10, y + 3, 28, 38);
        ctx.fillStyle = "#3da35d";
        ctx.fillRect(x + 19, y, 10, 10);
        ctx.fillRect(x + 10, y + 5, 28, 5);
        drawEnemyEyes(x + 12, y + 18, 20);
        break;
      case "broccoli":
        ctx.fillStyle = "#3f9b4f";
        ctx.fillRect(x + 2, y, 48, 25);
        ctx.fillRect(x + 8, y - 6, 16, 14);
        ctx.fillRect(x + 28, y - 7, 16, 14);
        ctx.fillStyle = "#79b85d";
        ctx.fillRect(x + 18, y + 22, 16, 36);
        drawEnemyEyes(x + 15, y + 10, 20);
        break;
      case "eggplant":
        ctx.fillStyle = "#6c4aa4";
        ctx.fillRect(x + 6, y + 12, 30, 40);
        ctx.fillRect(x + 11, y + 7, 22, 50);
        ctx.fillStyle = "#4ba35d";
        ctx.fillRect(x + 9, y, 24, 12);
        drawEnemyEyes(x + 8, y + 22, 18);
        break;
      case "zombie":
        ctx.fillStyle = "#78a85a";
        ctx.fillRect(x + 8, y, 29, 27);
        ctx.fillStyle = "#2c3442";
        ctx.fillRect(x + 5, y + 25, 34, 32);
        ctx.fillStyle = "#6d4f39";
        ctx.fillRect(x + 7, y + 56, 12, 16);
        ctx.fillRect(x + 27, y + 56, 12, 16);
        ctx.fillStyle = "#ffefef";
        ctx.fillRect(x + 13, y + 9, 5, 5);
        ctx.fillRect(x + 28, y + 9, 5, 5);
        ctx.fillStyle = "#301f35";
        ctx.fillRect(x + 14, y + 10, 3, 3);
        ctx.fillRect(x + 29, y + 10, 3, 3);
        break;
      case "ghost":
        ctx.fillStyle = "#f6f2ff";
        ctx.fillRect(x + 8, y, 46, 25);
        ctx.fillRect(x, y + 8, 62, 18);
        ctx.fillRect(x + 5, y + 22, 12, 10);
        ctx.fillRect(x + 25, y + 22, 12, 10);
        ctx.fillRect(x + 45, y + 22, 12, 10);
        ctx.fillStyle = "#5c477a";
        ctx.fillRect(x + 17, y + 10, 7, 8);
        ctx.fillRect(x + 39, y + 10, 7, 8);
        break;
      default:
        break;
    }
  }

  function drawEnemyEyes(x, y, gap) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, 7, 7);
    ctx.fillRect(x + gap, y, 7, 7);
    ctx.fillStyle = "#28222c";
    ctx.fillRect(x + 2, y + 2, 4, 4);
    ctx.fillRect(x + gap + 2, y + 2, 4, 4);
  }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 3));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    drawBackground();
    for (const coin of game.coinObjects) drawCoin(coin);
    for (const enemy of game.enemies) drawEnemy(enemy);
    drawPlayer();
    drawParticles();

    if (game.flash > 0) {
      ctx.globalAlpha = Math.min(0.6, game.flash * 2.2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, els.canvas.width, els.canvas.height);
      ctx.globalAlpha = 1;
    }

    if (game.phase === "playing" && game.elapsed < 4) {
      ctx.fillStyle = "rgba(17,19,26,.72)";
      ctx.fillRect(24, 24, 300, 42);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px monospace";
      ctx.fillText("TEA RUN  JUMP ↑ / SPACE   DUCK ↓", 40, 51);
    }
  }

  function tick(now) {
    const dt = Math.min(0.034, Math.max(0, (now - game.lastTime) / 1000));
    game.lastTime = now;

    if (game.phase === "playing") {
      updatePlayer(dt);
      updateWorld(dt);
    } else {
      updateParticles(dt);
    }

    draw();
    requestAnimationFrame(tick);
  }

  function bindEvents() {
    els.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const result = validateUsername(els.usernameInput.value);
      if (!result.ok) {
        els.loginError.textContent = result.message;
        return;
      }

      const submit = els.loginForm.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "ログイン中...";
      try {
        await loginWithUsername(result.username);
      } catch (error) {
        els.loginError.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        submit.disabled = false;
        submit.textContent = "この名前で遊ぶ";
      }
    });

    els.renameButton.addEventListener("click", showLoginForRename);
    els.startButton.addEventListener("click", startRun);
    els.refreshRanking.addEventListener("click", refreshLeaderboard);

    window.addEventListener("keydown", (event) => {
      if (["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code)) event.preventDefault();
      if ((event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") && !event.repeat) jump();
      if (event.code === "ArrowDown" || event.code === "KeyS") setDuck(true);
    }, { passive: false });

    window.addEventListener("keyup", (event) => {
      if (event.code === "ArrowDown" || event.code === "KeyS") setDuck(false);
    });

    els.jumpButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      jump();
    });

    const duckOn = (event) => { event.preventDefault(); setDuck(true); };
    const duckOff = (event) => { event.preventDefault(); setDuck(false); };
    els.duckButton.addEventListener("pointerdown", duckOn);
    els.duckButton.addEventListener("pointerup", duckOff);
    els.duckButton.addEventListener("pointercancel", duckOff);
    els.duckButton.addEventListener("pointerleave", duckOff);

    els.canvas.addEventListener("pointerdown", (event) => {
      if (window.matchMedia("(pointer: coarse)").matches && game.phase === "playing") {
        event.preventDefault();
        jump();
      }
    });

    window.addEventListener("blur", () => setDuck(false));
  }

  async function boot() {
    resetGame();
    bindEvents();
    const offlineName = localStorage.getItem("hoge-run-offline-name");
    if (offlineName) els.usernameInput.value = offlineName;
    await initializeOnline();
    requestAnimationFrame(tick);
  }

  boot().catch((error) => {
    console.error(error);
    els.loginError.textContent = `初期化エラー: ${error instanceof Error ? error.message : String(error)}`;
  });
})();
