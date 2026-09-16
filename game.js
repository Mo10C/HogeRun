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
    menuNameForm: $("menu-name-form"),
    menuUsernameInput: $("menu-username-input"),
    menuNameStatus: $("menu-name-status"),
    menuNameSave: $("menu-name-save"),
    userBadge: $("user-badge"),
    currentUsername: $("current-username"),
    homeUsername: $("home-username"),
    renameButton: $("rename-button"),
    homeButton: $("home-button"),
    canvas: $("game-canvas"),
    scoreLabel: $("score-label"),
    coinLabel: $("coin-label"),
    upgradeLabel: $("upgrade-label"),
    bestLabel: $("best-label"),
    startOverlay: $("start-overlay"),
    startTitle: $("start-title"),
    startDescription: $("start-description"),
    startButton: $("start-button"),
    startPressHint: $("start-press-hint"),
    overlayEyebrow: $("overlay-eyebrow"),
    overlayCharacter: $("overlay-character"),
    resultScene: $("result-scene"),
    resultEncounter: $("result-encounter"),
    resultEnemyCanvas: $("result-enemy-canvas"),
    resultEnemySpeech: $("result-enemy-speech"),
    resultPlayerSpeech: $("result-player-speech"),
    resultNewrecord: $("result-newrecord"),
    overlayNote: $("overlay-note"),
    resultScorePanel: $("result-score-panel"),
    resultScoreValue: $("result-score-value"),
    resultTeaValue: $("result-tea-value"),
    upgradeOverlay: $("upgrade-overlay"),
    upgradeCards: $("upgrade-cards"),
    upgradeConfirm: $("upgrade-confirm"),
    jumpButton: $("jump-button"),
    duckButton: $("duck-button"),
    buildList: $("build-list"),
    buildPop: document.querySelector(".build-pop"),
    rankingStatus: $("ranking-status"),
    rankingList: $("ranking-list"),
    refreshRanking: $("refresh-ranking"),
    gameFrame: document.querySelector(".game-frame"),
    rankingPanel: document.querySelector(".ranking-panel"),
    jumpHelp: $("jump-help"),
    duckHelp: $("duck-help"),
    keybindStatus: $("keybind-status"),
    resetKeybinds: $("reset-keybinds"),
    bootSplash: $("boot-splash"),
    bootStatus: $("boot-status"),
    loadingRunner: $("loading-runner"),
    loadingJumpKeys: $("loading-jump-keys"),
    loadingDuckKeys: $("loading-duck-keys")
  };

  const ctx = els.canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;

  function loadImage(src) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return img;
  }

  function ensureImageLoaded(img, label = "画像") {
    if (!img) return Promise.reject(new Error(`${label} がありません`));
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) return Promise.resolve(img);
    return new Promise((resolve, reject) => {
      const done = () => {
        cleanup();
        if (img.naturalWidth > 0) resolve(img);
        else reject(new Error(`${label} を読み込めませんでした`));
      };
      const fail = () => {
        cleanup();
        reject(new Error(`${label} を読み込めませんでした: ${img.src}`));
      };
      const cleanup = () => {
        img.removeEventListener("load", done);
        img.removeEventListener("error", fail);
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", fail, { once: true });
    });
  }

  const ART = {
    logo: loadImage("./assets/ui/title-logo.png?v=63"),
    background: loadImage("./assets/backgrounds/stage-bg.png?v=63"),
    titleScene: loadImage("./assets/ui/title-key-art.png?v=63"),
    playerIdle: loadImage("./assets/player/idle.png?v=63"),
    playerRuns: Array.from({ length: 16 }, (_, i) => loadImage(`./assets/player/run/run-${String(i + 1).padStart(2, "0")}.png?v=63`)),
    playerLandings: Array.from({ length: 3 }, (_, i) => loadImage(`./assets/player/landing/land-${i + 1}.png?v=63`)),
    playerJumpUp: loadImage("./assets/player/jump/up.png?v=63"),
    playerJumpApex: loadImage("./assets/player/jump/apex.png?v=63"),
    playerJumpDown: loadImage("./assets/player/jump/down.png?v=63"),
    playerSlides: [
      loadImage("./assets/player/slide/slide-1.png?v=63"),
      loadImage("./assets/player/slide/slide-2.png?v=63"),
      loadImage("./assets/player/slide/slide-3.png?v=63")
    ],
    playerGameover: loadImage("./assets/player/gameover.png?v=63"),
    playerHero: loadImage("./assets/ui/title-key-art.png?v=63"),
    enemySheet: loadImage("./assets/enemies/enemy-sheet.png?v=63"),
    teaCup: loadImage("./assets/items/tea-cup.png?v=63"),
    // ウルトラレインボーポテチ（画像が無い場合はコードで描いた仮の袋を表示）
    ultraChips: loadImage("./assets/items/ultra-rainbow-chips.png?v=76"),
    shieldAura: loadImage("./assets/effects/shield-aura.png?v=69")
  };

  let gameplayAssetsPromise = null;
  function ensureGameplayAssets() {
    if (!gameplayAssetsPromise) {
      gameplayAssetsPromise = Promise.all([
        ensureImageLoaded(ART.background, "ステージ背景"),
        ensureImageLoaded(ART.playerIdle, "待機キャラ"),
        ...ART.playerRuns.map((img, i) => ensureImageLoaded(img, `走行キャラ${i + 1}`)),
        ...ART.playerLandings.map((img, i) => ensureImageLoaded(img, `着地${i + 1}`)),
        ensureImageLoaded(ART.playerJumpUp, "ジャンプ上昇"),
        ensureImageLoaded(ART.playerJumpApex, "ジャンプ頂点"),
        ensureImageLoaded(ART.playerJumpDown, "ジャンプ下降"),
        ...ART.playerSlides.map((img, i) => ensureImageLoaded(img, `スライド${i + 1}`)),
        ensureImageLoaded(ART.playerGameover, "ゲームオーバーキャラ"),
        ensureImageLoaded(ART.enemySheet, "敵キャラ"),
        ensureImageLoaded(ART.teaCup, "ティーカップ")
      ]).catch((error) => {
        gameplayAssetsPromise = null;
        throw error;
      });
    }
    return gameplayAssetsPromise;
  }

  async function ensureBootAssets() {
    const checks = [
      [ART.logo, "タイトルロゴ"],
      [ART.titleScene, "タイトル背景"],
      [ART.playerHero, "タイトル画像"]
    ];
    await Promise.all(checks.map(([img, label]) => ensureImageLoaded(img, label)));
    await ensureGameplayAssets();
  }

  function setBootStatus(message) {
    if (els.bootStatus) els.bootStatus.textContent = message;
  }

  let loadingRunnerRaf = 0;
  let loadingRunnerLastFrame = 0;
  let loadingRunnerFrame = 0;

  function animateLoadingRunner(now = performance.now()) {
    if (!els.loadingRunner || !document.body.classList.contains("app-loading")) {
      loadingRunnerRaf = 0;
      return;
    }
    if ((els.loadingRunner?.dataset.loadingKind || "") === "teacup") {
      loadingRunnerLastFrame = now;
      loadingRunnerRaf = requestAnimationFrame(animateLoadingRunner);
      return;
    }
    if (now - loadingRunnerLastFrame >= 42) {
      loadingRunnerFrame = (loadingRunnerFrame + 1) % 16;
      if ((els.loadingRunner?.dataset.loadingKind || "") !== "teacup") { els.loadingRunner.src = `./assets/player/run/run-${String(loadingRunnerFrame + 1).padStart(2, "0")}.png?v=63`; }
      loadingRunnerLastFrame = now;
    }
    loadingRunnerRaf = requestAnimationFrame(animateLoadingRunner);
  }

  function showLoadingScreen(message = "ゲームを準備しています…") {
    setBootStatus(message);
    document.body.classList.remove("app-ready");
    document.body.classList.add("app-loading");
    if (els.bootSplash) els.bootSplash.classList.remove("boot-error");
    if (!loadingRunnerRaf) loadingRunnerRaf = requestAnimationFrame(animateLoadingRunner);
  }

  function revealApp() {
    document.body.classList.remove("app-loading");
    document.body.classList.add("app-ready");
    if (loadingRunnerRaf) {
      cancelAnimationFrame(loadingRunnerRaf);
      loadingRunnerRaf = 0;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function withTimeout(promise, ms, label = "通信") {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}がタイムアウトしました。もう一度お試しください。`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  const ENEMY_SHEET_MAP = {
    carrot: [0, 0],
    tomato: [1, 0],
    broccoli: [2, 0],
    eggplant: [0, 1],
    ghost: [1, 1],
    zombie: [2, 1]
  };


  const ENEMY_DRAW = {
    carrot: { drawH: 92, bob: 4, amp: 1.9 },
    tomato: { drawH: 88, bob: 3, amp: 2.2 },
    broccoli: { drawH: 96, bob: 4, amp: 2.0 },
    eggplant: { drawH: 90, bob: 3, amp: 2.1 },
    zombie: { drawH: 112, bob: 3, amp: 1.6 },
    ghost: { drawH: 102, bob: 8, amp: 2.4, lift: 20, alpha: 0.92 }
  };


  function enemySpeechForKind(kind) {
    // おばけ系2種（ghost / zombie）はホラー側の台詞。
    // 野菜4種は野菜側の台詞に分ける。
    return kind === "ghost" || kind === "zombie" ? "ﾎﾗｹﾞﾔﾚ" : "ﾔｻｲｸｴ";
  }

  function drawResultEnemy(kind) {
    const canvas = els.resultEnemyCanvas;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, canvas.width, canvas.height);
    if (!kind) return;

    const cfg = ENEMY_DRAW[kind];
    const cell = ENEMY_SHEET_MAP[kind];
    const sheet = ART.enemySheet;
    if (!cfg || !cell || !sheet?.complete || !sheet.naturalWidth) return;

    const [col, row] = cell;
    const cellW = sheet.width / 3;
    const cellH = sheet.height / 2;
    const sx = Math.round(col * cellW);
    const sy = Math.round(row * cellH);
    const feetY = canvas.height - 18;
    const drawH = Math.round((cfg.drawH || 94) * 1.05);
    const drawW = Math.round(cellW * (drawH / cellH));
    const drawX = Math.round(canvas.width / 2 - drawW / 2);
    const drawY = Math.round(feetY - drawH - (cfg.lift || 0) * 0.7 + (kind === "ghost" ? 6 : 0));

    c.save();
    c.fillStyle = kind === "ghost" ? "rgba(89, 114, 164, 0.16)" : "rgba(103, 75, 96, 0.18)";
    c.beginPath();
    c.ellipse(canvas.width / 2, feetY + (kind === "ghost" ? 4 : 1), kind === "ghost" ? 25 : 30, kind === "ghost" ? 8 : 10, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = cfg.alpha || 1;
    c.drawImage(sheet, sx, sy, cellW, cellH, drawX, drawY, drawW, drawH);
    c.restore();
  }

  function setResultEncounter(kind) {
    if (!els.resultEncounter) return;
    const playerSpeech = kind === "ghost" || kind === "zombie"
      ? "ホラゲキライ"
      : kind
        ? "ヤサイキライ、、、、"
        : "";
    if (!kind) {
      els.resultEncounter.classList.add("hidden");
      if (els.resultEnemySpeech) els.resultEnemySpeech.textContent = "";
      if (els.resultPlayerSpeech) {
        els.resultPlayerSpeech.textContent = "";
        els.resultPlayerSpeech.classList.add("hidden");
      }
      drawResultEnemy(null);
      return;
    }
    els.resultEncounter.classList.remove("hidden");
    if (els.resultEnemySpeech) els.resultEnemySpeech.textContent = enemySpeechForKind(kind);
    if (els.resultPlayerSpeech) {
      els.resultPlayerSpeech.textContent = playerSpeech;
      els.resultPlayerSpeech.classList.remove("hidden");
    }
    drawResultEnemy(kind);
  }

  const DEFAULT_KEYBINDS = {
    jump: ["Space", "KeyW", "ArrowUp"],
    duck: ["KeyS", "ArrowDown"],
    upgrade1: ["KeyQ", "Digit1"],
    upgrade2: ["KeyW", "Digit2"],
    upgrade3: ["KeyE", "Digit3"]
  };
  const KEYBIND_ACTION_LABELS = {
    jump: "ジャンプ",
    duck: "しゃがみ",
    upgrade1: "能力①（左）",
    upgrade2: "能力②（中央）",
    upgrade3: "能力③（右）"
  };
  const KEYBIND_GROUPS = {
    gameplay: ["jump", "duck"],
    upgrade: ["upgrade1", "upgrade2", "upgrade3"]
  };

  let keybinds = loadKeybinds();
  let listeningBind = null;
  const pressedKeys = new Set();

  function syncDuckFromPressedKeys() {
    const shouldDuck = keybinds.duck.some((code) => code && pressedKeys.has(code));
    setDuck(shouldDuck);
  }

  function clearKeyboardState() {
    pressedKeys.clear();
    setDuck(false);
  }

  function loadKeybinds() {
    const result = Object.fromEntries(
      Object.entries(DEFAULT_KEYBINDS).map(([action, codes]) => [action, [...codes]])
    );
    try {
      const saved = JSON.parse(localStorage.getItem("hoge-run-keybinds") || "null");
      if (saved && typeof saved === "object") {
        for (const [action, defaults] of Object.entries(DEFAULT_KEYBINDS)) {
          if (Array.isArray(saved[action]) && saved[action].length === defaults.length) {
            result[action] = [...saved[action]];
          }
        }
      }
    } catch (_) {}
    return result;
  }

  function saveKeybinds() {
    localStorage.setItem("hoge-run-keybinds", JSON.stringify(keybinds));
  }

  function keyLabel(code) {
    if (!code) return "未設定";
    const labels = {
      Space: "Space",
      ArrowUp: "↑",
      ArrowDown: "↓",
      ArrowLeft: "←",
      ArrowRight: "→",
      Escape: "Esc",
      Enter: "Enter",
      Tab: "Tab",
      Backspace: "Backspace",
      Delete: "Delete",
      ShiftLeft: "L-Shift", ShiftRight: "R-Shift",
      ControlLeft: "L-Ctrl", ControlRight: "R-Ctrl",
      AltLeft: "L-Alt", AltRight: "R-Alt"
    };
    if (labels[code]) return labels[code];
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
    return code;
  }

  function renderKeybinds() {
    document.querySelectorAll(".keybind-button").forEach((button) => {
      const action = button.dataset.action;
      const slot = Number(button.dataset.slot);
      const code = keybinds[action]?.[slot];
      button.textContent = code ? keyLabel(code) : "未設定";
      button.classList.toggle("listening", !!listeningBind && listeningBind.action === action && listeningBind.slot === slot);
    });
    const jumpText = keybinds.jump.filter(Boolean).map(keyLabel).join(" / ") || "未設定";
    const duckText = keybinds.duck.filter(Boolean).map(keyLabel).join(" / ") || "未設定";
    if (game?.phase === "upgrade") refreshUpgradeHotkeyLabels();
  }

  function keybindGroupFor(action) {
    if (KEYBIND_GROUPS.gameplay.includes(action)) return KEYBIND_GROUPS.gameplay;
    if (KEYBIND_GROUPS.upgrade.includes(action)) return KEYBIND_GROUPS.upgrade;
    return [action];
  }

  function assignKey(action, slot, code) {
    const group = keybindGroupFor(action);
    for (const otherAction of group) {
      keybinds[otherAction] = keybinds[otherAction].map((existing, i) => {
        if (otherAction === action && i === slot) return existing;
        return existing === code ? "" : existing;
      });
    }
    keybinds[action][slot] = code;
    saveKeybinds();
    listeningBind = null;
    clearKeyboardState();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    els.keybindStatus.textContent = `${KEYBIND_ACTION_LABELS[action] || action}を「${keyLabel(code)}」に設定しました。`;
    renderKeybinds();
  }

  function resetKeybindsToDefault() {
    keybinds = Object.fromEntries(
      Object.entries(DEFAULT_KEYBINDS).map(([action, codes]) => [action, [...codes]])
    );
    listeningBind = null;
    clearKeyboardState();
    saveKeybinds();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    els.keybindStatus.textContent = "初期設定に戻しました。";
    renderKeybinds();
  }

  let supabaseClient = null;
  let currentUserId = null;
  let currentUsername = "";
  let currentBest = 0;
  let currentRunId = null;
  let finishingRun = false;
  let pendingUpgradeChoice = null;
  let pendingUpgradeCard = null;

  // ===== サウンド（BGM / 効果音） =====
  // assets/audio/ に音声ファイルを置くとそれを再生。無い場合は内蔵のシンセ音で鳴らす。
  const AUDIO_FILES = {
    bgm: "./assets/audio/bgm.mp3",     // 0m〜
    bgm2: "./assets/audio/bgm-2.mp3",  // 15000m〜
    bgm3: "./assets/audio/bgm-3.mp3",  // 30000m〜（45000m〜 は再び bgm-2）
    jump: "./assets/audio/jump.mp3",
    slide: "./assets/audio/slide.mp3",
    tea: "./assets/audio/tea.mp3"
  };
  const AUDIO_VOLUME = { bgm: 0.35, jump: 0.7, slide: 0.6, tea: 0.55 };
  const SOUND_STORAGE_KEY = "hoge-run-sound";
  const BGM_VOLUME_STORAGE_KEY = "hoge-run-bgm-volume";

  const sound = {
    enabled: true,
    bgmVolume: 0.6, // HOME画面のスライダー（0〜1）
    ctx: null,
    master: null,
    bgmGain: null,
    buffers: {},
    loading: null,
    bgmTrack: null, // 再生中のBGM { stage, gain, source | timer, step, nextTime }
    lastPlayed: {}
  };

  try {
    sound.enabled = localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
    const savedBgmVolume = Number(localStorage.getItem(BGM_VOLUME_STORAGE_KEY));
    if (localStorage.getItem(BGM_VOLUME_STORAGE_KEY) !== null && Number.isFinite(savedBgmVolume)) {
      sound.bgmVolume = Math.min(1, Math.max(0, savedBgmVolume));
    }
  } catch (_) { /* storage unavailable */ }

  function ensureAudioContext() {
    if (!sound.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      sound.ctx = new Ctx();
      sound.master = sound.ctx.createGain();
      sound.master.gain.value = 1;
      sound.master.connect(sound.ctx.destination);
      sound.bgmGain = sound.ctx.createGain();
      sound.bgmGain.gain.value = sound.bgmVolume;
      sound.bgmGain.connect(sound.master);
      loadAudioFiles();
    }
    if (sound.ctx.state === "suspended" && !document.hidden) sound.ctx.resume().catch(() => {});
    return sound.ctx;
  }

  function loadAudioFiles() {
    if (sound.loading) return sound.loading;
    sound.loading = Promise.all(Object.entries(AUDIO_FILES).map(async ([key, url]) => {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) return;
        const data = await res.arrayBuffer();
        sound.buffers[key] = await new Promise((resolve, reject) => {
          const p = sound.ctx.decodeAudioData(data, resolve, reject);
          if (p && typeof p.then === "function") p.then(resolve, reject);
        });
        // ファイル版BGMが後から読み込めた場合、再生中の内蔵BGMから切り替える。
        const track = sound.bgmTrack;
        if (track && !track.source && BGM_STAGES[track.stage].file === key) {
          switchBgmStage(track.stage, { force: true });
        }
      } catch (_) { /* ファイル無し → シンセ音を使用 */ }
    }));
    return sound.loading;
  }

  function playBuffer(key, { rate = 1 } = {}) {
    const buffer = sound.buffers[key];
    if (!buffer) return false;
    const src = sound.ctx.createBufferSource();
    const gain = sound.ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    gain.gain.value = AUDIO_VOLUME[key] ?? 0.6;
    src.connect(gain).connect(sound.master);
    src.start();
    return true;
  }

  function synthTone({ type = "sine", from, to = from, dur = 0.12, vol = 0.2, at = 0, dest = null }) {
    const ctx = sound.ctx;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(dest || sound.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function synthNoise({ dur = 0.2, vol = 0.18, freq = 1800 }) {
    const ctx = sound.ctx;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur);
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(sound.master);
    src.start(t);
  }

  function playSfx(name, options = {}) {
    if (!sound.enabled || !ensureAudioContext()) return;
    const now = performance.now();
    // 同じ音が1フレーム内に大量に重ならないよう間引く（磁石で紅茶を一気に取った時など）。
    const minGap = name === "tea" ? 45 : 30;
    if (now - (sound.lastPlayed[name] || 0) < minGap) return;
    sound.lastPlayed[name] = now;

    const rate = options.high ? 1.18 : 1;
    if (playBuffer(name, { rate })) return;

    if (name === "jump") {
      synthTone({ type: "square", from: options.high ? 520 : 380, to: options.high ? 1100 : 820, dur: 0.14, vol: 0.09 });
    } else if (name === "slide") {
      synthNoise({ dur: 0.22, vol: 0.22, freq: 2200 });
    } else if (name === "tea") {
      synthTone({ type: "triangle", from: 1320, dur: 0.07, vol: 0.14 });
      synthTone({ type: "triangle", from: 1760, dur: 0.12, vol: 0.12, at: 0.06 });
    }
  }

  // ===== BGM（距離で切り替え） =====
  // minDistance を超えたらそのBGMに切り替わる。file は AUDIO_FILES のキー。
  // 音声ファイルが無い場合は synth（内蔵BGM）で鳴らす。
  const BGM_STAGES = [
    {
      minDistance: 0,
      file: "bgm",
      synth: {
        bpm: 132, lead: "triangle",
        melody: [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 76, 74],
        bass: [48, 48, 53, 53, 55, 55, 48, 48]
      }
    },
    {
      minDistance: 15000,
      file: "bgm2",
      synth: {
        bpm: 150, lead: "square",
        melody: [74, 78, 81, 78, 76, 79, 83, 79, 74, 78, 81, 86, 85, 81, 78, 76],
        bass: [50, 50, 55, 55, 57, 57, 50, 50]
      }
    },
    {
      minDistance: 30000,
      file: "bgm3",
      synth: {
        bpm: 168, lead: "sawtooth",
        melody: [69, 72, 76, 72, 71, 74, 77, 74, 69, 72, 76, 81, 80, 76, 72, 71],
        bass: [45, 45, 41, 41, 43, 43, 44, 44]
      }
    },
    {
      minDistance: 45000,
      file: "bgm2", // 45000m〜 は bgm-2.mp3 に戻す
      synth: {
        bpm: 150, lead: "square",
        melody: [74, 78, 81, 78, 76, 79, 83, 79, 74, 78, 81, 86, 85, 81, 78, 76],
        bass: [50, 50, 55, 55, 57, 57, 50, 50]
      }
    }
  ];
  const BGM_FADE_SEC = 0.8;
  const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function getBgmStageIndex(distance = game.distance) {
    let index = 0;
    BGM_STAGES.forEach((stage, i) => { if (distance >= stage.minDistance) index = i; });
    return index;
  }

  function scheduleSynthBgm(track) {
    const ctx = sound.ctx;
    const cfg = BGM_STAGES[track.stage].synth;
    const stepDur = 60 / cfg.bpm / 2;
    while (track.nextTime < ctx.currentTime + 0.25) {
      const at = Math.max(0, track.nextTime - ctx.currentTime);
      const step = track.step;
      const note = cfg.melody[step % cfg.melody.length];
      const leadVol = cfg.lead === "triangle" ? 0.08 : 0.035;
      synthTone({ type: cfg.lead, from: midiToHz(note), dur: stepDur * 0.9, vol: leadVol, at, dest: track.gain });
      if (step % 2 === 0) {
        const bass = cfg.bass[(step / 2) % cfg.bass.length];
        synthTone({ type: "sine", from: midiToHz(bass), dur: stepDur * 1.8, vol: 0.13, at, dest: track.gain });
      }
      track.step += 1;
      track.nextTime += stepDur;
    }
  }

  function createBgmTrack(stageIndex, fadeIn) {
    const ctx = sound.ctx;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(fadeIn ? 0.0001 : 1, t);
    if (fadeIn) gain.gain.exponentialRampToValueAtTime(1, t + BGM_FADE_SEC);
    gain.connect(sound.bgmGain);

    const track = { stage: stageIndex, gain, source: null, timer: null, step: 0, nextTime: t + 0.05 };
    const buffer = sound.buffers[BGM_STAGES[stageIndex].file];
    if (buffer) {
      const src = ctx.createBufferSource();
      const fileGain = ctx.createGain();
      src.buffer = buffer;
      src.loop = true;
      fileGain.gain.value = AUDIO_VOLUME.bgm;
      src.connect(fileGain).connect(gain);
      src.start();
      track.source = src;
    } else {
      scheduleSynthBgm(track);
      track.timer = window.setInterval(() => scheduleSynthBgm(track), 100);
    }
    return track;
  }

  function releaseBgmTrack(track, fadeOut) {
    if (!track) return;
    if (track.timer) window.clearInterval(track.timer);
    track.timer = null;
    const ctx = sound.ctx;
    const t = ctx.currentTime;
    const endAt = fadeOut ? t + BGM_FADE_SEC : t;
    try {
      track.gain.gain.cancelScheduledValues(t);
      track.gain.gain.setValueAtTime(Math.max(0.0001, track.gain.gain.value), t);
      if (fadeOut) track.gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
      else track.gain.gain.setValueAtTime(0, t);
    } catch (_) { /* ignore */ }
    if (track.source) {
      try { track.source.stop(endAt + 0.05); } catch (_) { /* already stopped */ }
    }
    window.setTimeout(() => { try { track.gain.disconnect(); } catch (_) { /* ignore */ } }, (endAt - t) * 1000 + 400);
  }

  function switchBgmStage(stageIndex, { force = false } = {}) {
    if (!sound.enabled || !ensureAudioContext()) return;
    const current = sound.bgmTrack;
    if (current && current.stage === stageIndex && !force) return;
    releaseBgmTrack(current, !!current);
    sound.bgmTrack = createBgmTrack(stageIndex, !!current);
  }

  // 走行中に毎フレーム呼ぶ。距離がしきい値を超えたらBGMをクロスフェードで切り替える。
  function updateBgmStage() {
    if (!sound.bgmTrack) return;
    const stageIndex = getBgmStageIndex();
    if (stageIndex !== sound.bgmTrack.stage) switchBgmStage(stageIndex);
  }

  function startBgm() {
    if (!sound.enabled || !ensureAudioContext()) return;
    if (sound.bgmTrack) return;
    sound.bgmTrack = createBgmTrack(getBgmStageIndex(), false);
  }

  function stopBgm() {
    if (!sound.bgmTrack || !sound.ctx) return;
    releaseBgmTrack(sound.bgmTrack, false);
    sound.bgmTrack = null;
  }

  function renderSoundToggle() {
    const button = document.getElementById("sound-toggle");
    if (!button) return;
    button.textContent = sound.enabled ? "♪ サウンド ON" : "♪ サウンド OFF";
    button.classList.toggle("is-off", !sound.enabled);
    button.setAttribute("aria-pressed", sound.enabled ? "true" : "false");
  }

  function renderBgmVolume() {
    const slider = document.getElementById("bgm-volume");
    const label = document.getElementById("bgm-volume-value");
    const percent = Math.round(sound.bgmVolume * 100);
    if (slider) {
      slider.value = String(percent);
      slider.disabled = !sound.enabled;
    }
    if (label) label.textContent = `${percent}%`;
  }

  function setBgmVolume(value) {
    sound.bgmVolume = Math.min(1, Math.max(0, value));
    try { localStorage.setItem(BGM_VOLUME_STORAGE_KEY, String(sound.bgmVolume)); } catch (_) { /* ignore */ }
    if (sound.bgmGain && sound.ctx) {
      sound.bgmGain.gain.setTargetAtTime(sound.bgmVolume, sound.ctx.currentTime, 0.03);
    }
    renderBgmVolume();
  }

  // HOME画面で音量を触った時に少しだけBGMを試聴する
  let bgmPreviewTimer = null;
  function previewBgm() {
    if (!sound.enabled || game.phase === "playing" || game.phase === "upgrade") return;
    if (!ensureAudioContext()) return;
    startBgm();
    if (bgmPreviewTimer) clearTimeout(bgmPreviewTimer);
    bgmPreviewTimer = window.setTimeout(() => {
      bgmPreviewTimer = null;
      if (game.phase !== "playing" && game.phase !== "upgrade") stopBgm();
    }, 1500);
  }

  function setSoundEnabled(enabled) {
    sound.enabled = enabled;
    try { localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off"); } catch (_) { /* ignore */ }
    if (enabled) {
      ensureAudioContext();
      if (game.phase === "playing" || game.phase === "upgrade") startBgm();
      playSfx("tea");
    } else {
      stopBgm();
    }
    renderSoundToggle();
    renderBgmVolume();
  }

  const game = {
    phase: "idle", // idle | playing | upgrade | gameover
    lastTime: performance.now(),
    elapsed: 0,
    distance: 0,
    scrollDistance: 0,
    coins: 0,
    nextUpgradeAt: 100,
    nextUpgradeStep: 2,
    nextUpgradeDiscountCharges: 0,
    worldSpeed: 330,
    enemyTimer: 0.9,
    coinTimer: 0.4,
    postUpgradeGrace: 0,
    enemies: [],
    coinObjects: [],
    popTexts: [],
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
      invincible: 0,
      shieldTimer: 0,
      landingTimer: 0,
      lane: 0,
      slideState: "none",
      slideTimer: 0,
      slideDustTimer: 0
    },
    upgrades: null,
    upgradeLevels: {},
    upgradeHistory: []
  };

  const GROUND_Y = 430;
  const UPPER_GROUND_Y = 304;
  const LANE_UNLOCK_DISTANCE = 20000;
  // 2段目解放後は LANE_CYCLE_DISTANCE ごとに「2段ステージ」と「1段ステージ」を交互に切り替える
  // 20000〜25000m: 2段 / 25000〜30000m: 1段 / 30000〜35000m: 2段 …
  const LANE_CYCLE_DISTANCE = 5000;
  const GRAVITY = 1950;
  const BASE_JUMP = 720;
  // ゴースト本体の見た目の高さ（足元から頭上まで）。2段ジャンプ時はこの高さを越えればかわせる。
  const GHOST_BODY_HEIGHT = 122;
  // レインボー紅茶：RAINBOW_TEA_MIN_DISTANCE 以降、紅茶の出現1回ごとに RAINBOW_TEA_CHANCE の確率で出現。
  const RAINBOW_TEA_MIN_DISTANCE = 5000;
  const RAINBOW_TEA_CHANCE = 0.05;
  const RAINBOW_TEA_VALUE = 50;
  // ウルトラレインボーポテチ：ULTRA_CHIPS_MIN_DISTANCE 以降、紅茶の出現1回ごとに ULTRA_CHIPS_CHANCE の確率で
  // 2段ジャンプでしか届かない高さに流れる。2段ジャンプ中（空中ジャンプ1回以上）でないと取れない。
  const ULTRA_CHIPS_MIN_DISTANCE = 10000;
  const ULTRA_CHIPS_CHANCE = 0.01;
  const ULTRA_CHIPS_VALUE = 100;
  // ティーカップ磁石がこの回数に達した時だけ、ポテチも吸い寄せて取れる
  const ULTRA_CHIPS_MAGNET_LEVEL = 4;
  // ティーセンサー最大レベル時の紅茶カップ出現数の倍率
  const TEA_SENSOR_MAX_COUNT_MULTIPLIER = 2;
  // ほげシールドの無敵時間
  const SHIELD_BASE_SEC = 10;
  const SHIELD_STEP_SEC = 5;
  const ULTRA_CHIPS_Y = 130;        // 2段目解放前：1段目から2段ジャンプで届く高さ
  const ULTRA_CHIPS_Y_UPPER = 36;   // 2段目解放後：2段目から2段ジャンプでのみ届く高さ（上部HUDは通過中だけ薄くする）
  // 2段目解放後、敵が2段目に出る確率（残りは1段目）
  const UPPER_LANE_ENEMY_CHANCE = 0.5;       // 当たり判定の上端Y座標（小さいほど高い）
  const ULTRA_CHIPS_HITBOX = 64;   // 当たり判定サイズ(px)
  const ULTRA_CHIPS_DRAW_H = 114;  // 表示の高さ(px)。紅茶カップ(38px)の3倍

  // 高速域でも「見えてから反応できる時間」と敵同士の間隔を一定以上確保する。
  const MAX_WORLD_SPEED = 720;
  const MIN_ENEMY_REACTION_TIME = 1.55;
  const MIN_ENEMY_SPAWN_DELAY = 0.95;
  const MIN_ENEMY_GAP_PX = 380;
  const GHOST_HITBOX_TOP = 270;

  function isUpperLaneUnlocked(distance = game.distance) {
    if (distance < LANE_UNLOCK_DISTANCE) return false;
    const cycle = Math.floor((distance - LANE_UNLOCK_DISTANCE) / LANE_CYCLE_DISTANCE);
    return cycle % 2 === 0;
  }

  // ステージ（1段/2段）が切り替わった瞬間の処理
  function updateLaneStage() {
    const twoLane = isUpperLaneUnlocked();
    if (game.twoLaneStage === twoLane) return;
    const first = game.twoLaneStage === undefined || game.twoLaneStage === null;
    game.twoLaneStage = twoLane;
    if (first && !twoLane) return;

    if (!twoLane) {
      // 1段に戻る時：2段目の敵・紅茶カップ・高所ポテチを片付ける（プレイヤーは自然に1段目へ落下）
      for (const enemy of game.enemies) {
        if (enemy.lane === 1) puff(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 6, "#ffffff");
      }
      game.enemies = game.enemies.filter((enemy) => enemy.lane !== 1);
      game.coinObjects = game.coinObjects.filter((coin) => !coin.upperLane && !(coin.ultra && coin.y < ULTRA_CHIPS_Y));
    }
    game.popTexts.push({
      x: els.canvas.width / 2,
      y: 190,
      text: twoLane ? "2段ステージ！" : "1段ステージ！",
      life: 1.6,
      big: true
    });
  }

  function getLaneGroundY(lane = game.player.lane) {
    return lane === 1 && isUpperLaneUnlocked() ? UPPER_GROUND_Y : GROUND_Y;
  }

  function movePlayerToLane(targetLane) {
    const p = game.player;
    const nextLane = isUpperLaneUnlocked() && targetLane === 1 ? 1 : 0;
    p.lane = nextLane;
    p.slideState = "none";
    p.slideTimer = 0;
    p.slideDustTimer = 0;
    p.crouching = false;
    p.h = p.standH;
    p.vy = 0;
    p.onGround = true;
    p.landingTimer = 0.08;
    p.y = getLaneGroundY(nextLane) - p.h;
    if (nextLane === 1) {
      puff(p.x + p.w / 2, p.y + p.h - 6, 6, '#d8ecff');
    } else {
      puff(p.x + p.w / 2, p.y + p.h - 2, 6, '#ffe8f1');
    }
  }

  function getStageDifficulty(distance = game.distance) {
    // Difficulty curve v68
    // 0-5000m: basic section
    // 5001m+: 20% jumping vegetables
    // 15000m+: 20% jumping + 20% fast vegetables
    // 20000m+: 30% jumping + 30% fast vegetables, upper lane unlocked
    // 30000m+: 40% jumping + 40% fast vegetables
    if (distance >= 30000) return { jumpChance: 0.40, fastChance: 0.40, upperCoinChance: 0.50 };
    if (distance >= 20000) return { jumpChance: 0.30, fastChance: 0.30, upperCoinChance: 0.38 };
    if (distance >= 15000) return { jumpChance: 0.20, fastChance: 0.20, upperCoinChance: 0.00 };
    if (distance >= 5001) return { jumpChance: 0.20, fastChance: 0.00, upperCoinChance: 0.00 };
    return { jumpChance: 0.00, fastChance: 0.00, upperCoinChance: 0.00 };
  }

  const UPGRADE_DEFS = [
    {
      id: "double_jump",
      icon: "⇧⇧",
      iconImage: "./assets/upgrades/double-jump.png?v=63",
      name: "二段ジャンプ",
      uiDesc: "空中ジャンプ回数 +1。\n最大3回まで重ね掛け可能。",
      desc: "空中ジャンプ回数 +1。最大3回まで重ね掛け可能。",
      max: 3,
      apply: () => { game.upgrades.extraAirJumps += 1; }
    },
    {
      id: "jump_boots",
      icon: "靴",
      iconImage: "./assets/upgrades/jump-boots.png?v=63",
      name: "バネ靴",
      uiDesc: "ジャンプ力 +12%。\n高い敵配置を越えやすくなる。",
      desc: "ジャンプ力 +12%。高い敵配置を越えやすくなる。",
      max: 4,
      apply: () => { game.upgrades.jumpBoost *= 1.12; }
    },
    {
      id: "shield",
      icon: "盾",
      iconImage: "./assets/upgrades/shield.png?v=63",
      name: "ほげシールド",
      uiDesc: "獲得した瞬間から無敵。取るたびに+5秒\n（10秒→15秒→20秒…）",
      desc: "獲得した瞬間から無敵。取るたびに無敵時間が5秒ずつ延びる（10秒→15秒→20秒…）。",
      max: 6,
      apply: () => {
        game.upgrades.shield += 1;
        // Lv1=10秒、以降1回ごとに+5秒（SHIELD_BASE_SEC / SHIELD_STEP_SEC）
        const duration = SHIELD_BASE_SEC + SHIELD_STEP_SEC * (game.upgrades.shield - 1);
        game.player.shieldTimer = Math.max(game.player.shieldTimer || 0, duration);
        game.player.invincible = Math.max(game.player.invincible || 0, duration);
        game.flash = Math.max(game.flash || 0, 0.16);
      }
    },
    {
      id: "magnet",
      icon: "磁",
      iconImage: "./assets/upgrades/magnet.png?v=63",
      name: "ティーカップ磁石",
      uiDesc: "近くの紅茶カップを吸い寄せる\n範囲が広くなる。",
      desc: "近くの紅茶カップを吸い寄せる範囲が広くなる。",
      max: 4,
      apply: () => { game.upgrades.magnetRadius += 72; }
    },
    {
      id: "slow_clock",
      icon: "時",
      iconImage: "./assets/upgrades/slow-clock.png?v=63",
      name: "のろのろ時計",
      uiDesc: "敵と紅茶カップの流れる速度を\n10%低下。重ね掛け可能。",
      desc: "敵と紅茶カップの流れる速度を10%低下。重ね掛け可能。",
      max: 4,
      apply: () => { game.upgrades.speedFactor *= 0.90; }
    },
    {
      id: "tiny_charm",
      icon: "小",
      iconImage: "./assets/upgrades/tiny-charm.png?v=63",
      name: "ちびチャーム",
      uiDesc: "当たり判定を少し小さくして\nギリギリ回避しやすくする。",
      desc: "当たり判定を少し小さくして、ギリギリ回避しやすくする。",
      max: 3,
      apply: () => { game.upgrades.hitboxInset += 3; }
    },
    {
      id: "revive",
      icon: "羽",
      iconImage: "./assets/upgrades/revive.png?v=63",
      name: "復活の羽",
      uiDesc: "致命的な衝突を1回だけ無効化し\n短時間無敵になる。",
      desc: "致命的な衝突を1回だけ無効化し、短時間無敵になる。",
      max: Infinity, // 取得回数の上限なし
      apply: () => { game.upgrades.revive += 1; }
    },
    {
      id: "coin_sense",
      icon: "金",
      iconImage: "./assets/upgrades/tea-sensor.png?v=63",
      name: "ティーセンサー",
      uiDesc: "紅茶カップの出現間隔が短くなる。\n最大Lv3で出現数が2倍！",
      desc: "紅茶カップの出現間隔が短くなる。最大Lv3で紅茶カップの出現数が2倍になる。",
      max: 3,
      apply: () => { game.upgrades.coinSpawnFactor *= 0.88; }
    },
    {
      id: "threshold_reset",
      icon: "100",
      iconImage: "./assets/upgrades/refill-ticket.png?v=72",
      name: "おかわりチケット",
      uiDesc: "次の強化までに必要な\n紅茶カップ数を100にする。",
      desc: "次の強化までに必要な紅茶カップ数を100にする。",
      max: 4,
      apply: () => { applyRefillTicket(); }
    }
  ];

  function getNextUpgradeCost() {
    return game.nextUpgradeDiscountCharges > 0 ? 100 : game.nextUpgradeStep * 100;
  }

  function advanceNextUpgradeThreshold() {
    const cost = getNextUpgradeCost();
    if (game.nextUpgradeDiscountCharges > 0) game.nextUpgradeDiscountCharges -= 1;
    game.upgradeBaseAt = game.nextUpgradeAt; // 今回の強化が発生した杯数
    game.pendingUpgradeCost = cost;          // 次の強化までに必要な杯数
    game.nextUpgradeAt += cost;
    game.nextUpgradeStep += 1;
    return cost;
  }

  // おかわりチケット：すぐに「次の強化までの必要数」を100杯にする。
  // 強化画面が開いた時点で次の必要数は計算済みなので、ここで上書きしないと効果が1回遅れてしまう。
  // すでに100杯になっている場合（チケット連続取得など）は、さらにその次の強化に持ち越す。
  function applyRefillTicket() {
    if (typeof game.upgradeBaseAt === "number" && game.pendingUpgradeCost > 100) {
      game.nextUpgradeAt = game.upgradeBaseAt + 100;
      game.pendingUpgradeCost = 100;
    } else {
      game.nextUpgradeDiscountCharges += 1;
    }
    updateHud();
  }

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
    game.scrollDistance = 0;
    game.coins = 0;
    game.nextUpgradeAt = 100;
    game.nextUpgradeStep = 2;
    game.nextUpgradeDiscountCharges = 0;
    game.upgradeBaseAt = null;
    game.pendingUpgradeCost = 100;
    game.worldSpeed = 330;
    game.enemyTimer = 0.85;
    game.coinTimer = 0.35;
    game.postUpgradeGrace = 0;
    game.enemies = [];
    game.coinObjects = [];
    game.particles = [];
    game.popTexts = [];
    game.hudDimmed = false;
    game.twoLaneStage = null;
    document.querySelector(".in-game-ui")?.classList.remove("hud-dim");
    game.flash = 0;
    game.duckHeld = false;
    pressedKeys.clear();
    game.player.x = 142;
    game.player.h = game.player.standH;
    game.player.y = GROUND_Y - game.player.h;
    game.player.vy = 0;
    game.player.onGround = true;
    game.player.crouching = false;
    game.player.airJumpsUsed = 0;
    game.player.invincible = 0;
    game.player.shieldTimer = 0;
    game.player.landingTimer = 0;
    game.player.lane = 0;
    game.player.slideState = "none";
    game.player.slideTimer = 0;
    game.player.slideDustTimer = 0;
    resetUpgrades();
    document.body.classList.remove("upgrade-active");
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

  function setMenuNameStatus(message = "", tone = "muted") {
    if (els.menuNameStatus) {
      els.menuNameStatus.textContent = message;
      els.menuNameStatus.classList.remove("is-error", "is-success");
      if (tone === "error") els.menuNameStatus.classList.add("is-error");
      if (tone === "success") els.menuNameStatus.classList.add("is-success");
    }
    if (els.loginError) els.loginError.textContent = tone === "error" ? message : "";
  }

  function syncUsernameUi() {
    if (els.currentUsername) els.currentUsername.textContent = currentUsername || "ゲスト";
    if (els.homeUsername) els.homeUsername.textContent = currentUsername || "";
    if (els.usernameInput) els.usernameInput.value = currentUsername || els.usernameInput.value || "";
    if (els.menuUsernameInput && document.activeElement !== els.menuUsernameInput) {
      els.menuUsernameInput.value = currentUsername || els.menuUsernameInput.value || "";
    }
  }

  async function initializeOnline() {
    if (!ONLINE_CONFIGURED) {
      setMenuNameStatus("※ config.js が未設定です。今はオフライン練習モードで遊べます。ランキングを使うにはREADMEのSupabase設定を行ってください。", "muted");
      els.rankingStatus.textContent = "Supabase未設定";
      return;
    }

    if (!window.supabase?.createClient) {
      setMenuNameStatus("Supabaseライブラリを読み込めませんでした。インターネット接続を確認してください。", "error");
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
      localStorage.setItem("hoge-run-offline-name", profile.username);
      syncUsernameUi();
    }
  }

  async function loginWithUsername(username) {
    setMenuNameStatus("名前を保存しています…", "muted");
    await ensureGameplayAssets();

    if (!ONLINE_CONFIGURED || !supabaseClient) {
      currentUsername = username;
      currentUserId = currentUserId || `offline-${crypto.randomUUID()}`;
      localStorage.setItem("hoge-run-offline-name", username);
      syncUsernameUi();
      setMenuNameStatus("名前を保存しました。スタートできます。", "success");
      return;
    }

    const { data: userData } = await withTimeout(
      supabaseClient.auth.getUser(),
      10000,
      "ログイン確認"
    );
    let user = userData?.user;

    if (!user) {
      const { data, error } = await withTimeout(
        supabaseClient.auth.signInAnonymously(),
        10000,
        "匿名ログイン"
      );
      if (error) throw new Error(`匿名ログインに失敗しました: ${error.message}`);
      user = data.user;
    }

    if (!user) throw new Error("ユーザー情報を取得できませんでした。");

    const { error: profileError } = await withTimeout(
      supabaseClient.from("profiles").upsert({ id: user.id, username }, { onConflict: "id" }),
      10000,
      "プレイヤー名の保存"
    );

    if (profileError) throw new Error(`名前の保存に失敗しました: ${profileError.message}`);

    currentUserId = user.id;
    currentUsername = username;
    localStorage.setItem("hoge-run-offline-name", username);
    syncUsernameUi();
    setMenuNameStatus("名前を保存しました。スタートできます。", "success");
  }

  function enterGameScreen() {
    els.loginScreen?.classList.add("hidden");
    els.gameScreen.classList.remove("hidden");
    els.userBadge.classList.remove("hidden");
    requestAnimationFrame(syncRankingHeight);
    syncUsernameUi();
    resetGame();
    showStartOverlay("ほげといっしょに紅茶の国を駆け抜けよう！", "ジャンプとスライディングで敵をかわし、紅茶の国でティーカップを集めよう。100杯ごとにメルヘンな強化を1つ選べます。", "スタート", { variant: "start", eyebrow: "WELCOME TO THE TEA KINGDOM", note: "", characterSrc: "./assets/ui/title-key-art.png?v=63" });
    refreshLeaderboard();
  }

  function showLoginForRename() {
    if (game.phase === "playing" || game.phase === "upgrade") return;
    goHome();
    if (els.menuUsernameInput) els.menuUsernameInput.focus();
  }

  function goHome() {
    clearKeyboardState();
    stopBgm();
    game.phase = "idle";
    currentRunId = null;
    finishingRun = false;
    resetGame();
    syncUsernameUi();
    showStartOverlay(
      "ほげといっしょに紅茶の国を駆け抜けよう！",
      "ジャンプとスライディングで敵をかわし、紅茶の国でティーカップを集めよう。100杯ごとにメルヘンな強化を1つ選べます。",
      "スタート",
      { variant: "start", eyebrow: "WELCOME TO THE TEA KINGDOM", note: "", characterSrc: "./assets/ui/title-key-art.png?v=63" }
    );
  }

  async function startRun() {
    if (game.phase === "playing" || game.phase === "upgrade") return;
    if (sound.enabled) ensureAudioContext();
    const originalLabel = els.startButton.textContent;
    els.startButton.disabled = true;
    els.startButton.textContent = "読み込み中…";
    els.overlayNote.textContent = "ゲーム素材を読み込んでいます…";
    resetGame();
    currentRunId = null;
    finishingRun = false;

    try {
      const enteredName = els.menuUsernameInput?.value ?? currentUsername ?? "";
      const result = validateUsername(enteredName);
      if (!result.ok) {
        setMenuNameStatus(result.message, "error");
        if (els.menuUsernameInput) els.menuUsernameInput.focus();
        return;
      }
      if (result.username !== currentUsername || !currentUserId) {
        await loginWithUsername(result.username);
      } else {
        setMenuNameStatus("", "muted");
        syncUsernameUi();
      }
      await ensureGameplayAssets();

      if (ONLINE_CONFIGURED && supabaseClient) {
        const { data, error } = await supabaseClient.rpc("start_game");
        if (error) {
          showStartOverlay("開始できませんでした", `Supabase: ${error.message}`, "もう一度", { variant: "gameover", eyebrow: "SYSTEM MESSAGE", note: "もう一度押して再挑戦できます。", characterSrc: "./assets/player/gameover.png?v=63" });
          return;
        }
        currentRunId = data;
      }

      els.startOverlay.classList.add("hidden");
      game.phase = "playing";
      game.lastTime = performance.now();
      startBgm();
    } catch (error) {
      showStartOverlay("読み込みに失敗しました", error instanceof Error ? error.message : String(error), "もう一度", { variant: "gameover", eyebrow: "LOAD ERROR", note: "通信状況を確認して再度お試しください。", characterSrc: "./assets/player/gameover.png?v=63" });
    } finally {
      els.startButton.disabled = false;
      els.startButton.textContent = originalLabel;
    }
  }

  async function finishRun(reason = "敵にぶつかった！", context = {}) {
    if (finishingRun || game.phase === "gameover") return;
    finishingRun = true;
    game.phase = "gameover";
    stopBgm();

    const finalScore = Math.max(0, Math.floor(game.distance));
    const previousBest = currentBest;
    const isNewRecord = finalScore > previousBest;
    currentBest = Math.max(currentBest, finalScore);
    els.bestLabel.textContent = `${currentBest}m`;

    const enemyKind = context.enemyKind || null;
    const dislikeMessage = enemyKind === "ghost" || enemyKind === "zombie"
      ? "ホラゲキライ"
      : "ヤサイキライ、、、、";

    showStartOverlay(isNewRecord ? "NEW RECORD" : "GAME OVER", "", "もう一回", {
      variant: "gameover",
      eyebrow: "",
      note: "",
      characterSrc: "./assets/player/gameover.png?v=63",
      resultScore: finalScore,
      resultCoins: game.coins,
      newRecord: isNewRecord,
      enemyKind
    });

    if (ONLINE_CONFIGURED && supabaseClient && currentRunId) {
      const { error } = await supabaseClient.rpc("finish_game", {
        p_run_id: currentRunId,
        p_score: finalScore,
        p_coins: game.coins
      });

      if (error) {
        console.warn("ランキング保存に失敗しました:", error.message);
      } else {
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
      characterSrc = variant === "gameover" ? "./assets/player/gameover.png?v=63" : "./assets/ui/title-key-art.png?v=63",
      resultScore = null,
      resultCoins = null,
      newRecord = false,
      enemyKind = null
    } = options;

    els.startTitle.textContent = title;
    els.startDescription.textContent = description;
    els.startButton.textContent = buttonLabel;
    els.overlayEyebrow.textContent = eyebrow;
    els.overlayNote.textContent = note;
    if (els.overlayNote) els.overlayNote.classList.toggle("hidden", !note);
    els.overlayCharacter.src = characterSrc;
    if (els.startPressHint) {
      els.startPressHint.textContent = variant === "gameover"
        ? "Space またはボタンでリトライ"
        : "Space またはボタンでスタート";
    }
    const isResult = variant === "gameover" && Number.isFinite(Number(resultScore));
    if (els.homeButton) els.homeButton.classList.toggle("hidden", !isResult);
    syncUsernameUi();
    if (els.resultScorePanel) els.resultScorePanel.classList.toggle("hidden", !isResult);
    if (isResult && els.resultScoreValue) els.resultScoreValue.textContent = `${Number(resultScore).toLocaleString()}m`;
    if (isResult && els.resultTeaValue) els.resultTeaValue.textContent = Number(resultCoins || 0).toLocaleString();
    if (els.resultNewrecord) els.resultNewrecord.classList.toggle("hidden", !(isResult && newRecord));
    setResultEncounter(isResult ? enemyKind : null);
    els.startOverlay.classList.remove("overlay-start", "overlay-gameover", "result-mode");
    els.startOverlay.classList.add(variant === "gameover" ? "overlay-gameover" : "overlay-start");
    els.startOverlay.classList.toggle("result-mode", isResult);
    // NEW RECORD時は gameover キャラ・敵・吹き出しを隠し、新記録キャラを大きく表示（styles.css の .is-new-record）
    els.startOverlay.classList.toggle("is-new-record", isResult && newRecord);
    els.startOverlay.classList.remove("hidden");
  }

  function updateHud() {
    els.scoreLabel.textContent = `${Math.floor(game.distance)}m`;
    els.coinLabel.textContent = String(game.coins);
    els.upgradeLabel.textContent = `${Math.max(0, game.nextUpgradeAt - game.coins)}`;
    els.bestLabel.textContent = `${currentBest}m`;
  }

  function setPlayerCrouch(active) {
    const p = game.player;
    if (active === p.crouching && p.h === (active ? p.crouchH : p.standH)) return;
    const feetY = p.y + p.h;
    p.crouching = active;
    p.h = active ? p.crouchH : p.standH;
    p.y = getLaneGroundY(p.lane) - p.h;
    if (!p.onGround) p.y = feetY - p.h;
  }

  function startSlideEnter() {
    const p = game.player;
    if (game.phase === "playing") playSfx("slide");
    p.slideState = "enter";
    p.slideTimer = 0.09;
    p.slideDustTimer = 0.03;
    setPlayerCrouch(true);
  }

  function startSlideHold() {
    const p = game.player;
    p.slideState = "hold";
    p.slideTimer = 0;
    p.slideDustTimer = 0.02;
    setPlayerCrouch(true);
  }

  function startSlideExit() {
    const p = game.player;
    if (p.slideState === "exit" || p.slideState === "none") return;
    p.slideState = "exit";
    p.slideTimer = 0.1;
    setPlayerCrouch(true);
  }

  function finishSlide() {
    const p = game.player;
    p.slideState = "none";
    p.slideTimer = 0;
    p.slideDustTimer = 0;
    setPlayerCrouch(false);
  }

  function jump() {
    if (game.phase !== "playing") return;
    const p = game.player;
    const power = BASE_JUMP * game.upgrades.jumpBoost;

    if (p.onGround && isUpperLaneUnlocked() && p.lane === 0) {
      game.duckHeld = false;
      movePlayerToLane(1);
      playSfx("jump");
      return;
    }

    if (p.onGround) {
      // Preserve the feet position when leaving a slide/crouch.
      // Without this, switching from crouchH to standH puts the collider below ground
      // and the next physics tick immediately snaps the player back to the floor.
      const feetY = p.y + p.h;
      p.slideState = "none";
      p.slideTimer = 0;
      p.slideDustTimer = 0;
      p.crouching = false;
      p.h = p.standH;
      p.y = feetY - p.h;
      game.duckHeld = false;
      p.vy = -power;
      p.onGround = false;
      p.landingTimer = 0;
      p.airJumpsUsed = 0;
      puff(p.x + 20, feetY - 4, 5, "#f6dfb5");
      playSfx("jump");
    } else if (p.airJumpsUsed < game.upgrades.extraAirJumps) {
      p.vy = -power * 0.93;
      p.airJumpsUsed += 1;
      p.landingTimer = 0;
      playSfx("jump", { high: true });
      puff(p.x + 20, p.y + p.h, 7, "#b7f0ff");
    }
  }

  function setDuck(held) {
    game.duckHeld = held;
    const p = game.player;
    if (held && game.phase === "playing" && isUpperLaneUnlocked() && p.onGround && p.lane === 1) {
      movePlayerToLane(0);
      playSfx("slide");
      return;
    }
    if (game.phase !== "playing") return;
    if (!p.onGround || p.lane !== 0) return;
    if (held) {
      if (p.slideState === "none" || p.slideState === "exit") startSlideEnter();
    } else if (p.slideState === "enter" || p.slideState === "hold") {
      startSlideExit();
    }
  }

  function updatePlayer(dt) {
    const p = game.player;
    if (!isUpperLaneUnlocked() && p.lane !== 0) p.lane = 0;
    if (p.shieldTimer > 0) p.shieldTimer = Math.max(0, p.shieldTimer - dt);
    if (p.invincible > 0) p.invincible = Math.max(0, p.invincible - dt);
    if (p.shieldTimer > 0) p.invincible = Math.max(p.invincible, p.shieldTimer);
    if (p.landingTimer > 0) p.landingTimer = Math.max(0, p.landingTimer - dt);

    const laneGroundY = getLaneGroundY(p.lane);
    const wasOnGround = p.onGround;
    const canSlideOnGround = p.onGround && p.lane === 0;

    if (!canSlideOnGround) {
      if (p.slideState !== "none") finishSlide();
    } else {
      if (game.duckHeld) {
        if (p.slideState === "none" || p.slideState === "exit") {
          startSlideEnter();
        }
      } else if (p.slideState === "enter" || p.slideState === "hold") {
        startSlideExit();
      }

      if (p.slideState === "enter") {
        p.slideTimer -= dt;
        if (p.slideTimer <= 0) {
          if (game.duckHeld) startSlideHold();
          else startSlideExit();
        }
      } else if (p.slideState === "hold") {
        setPlayerCrouch(true);
        p.slideDustTimer -= dt;
        if (p.slideDustTimer <= 0) {
          puff(p.x - 8, laneGroundY - 16, 2, "rgba(255,255,255,0.92)");
          puff(p.x + 8, laneGroundY - 10, 1, "rgba(218,232,255,0.9)");
          p.slideDustTimer = 0.05;
        }
      } else if (p.slideState === "exit") {
        p.slideTimer -= dt;
        if (p.slideTimer <= 0) finishSlide();
      }
    }

    if (!p.onGround && game.duckHeld) p.vy += 900 * dt;

    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;

    if (p.y + p.h >= laneGroundY) {
      p.y = laneGroundY - p.h;
      p.vy = 0;
      p.onGround = true;
      p.airJumpsUsed = 0;
      if (!wasOnGround) p.landingTimer = 0.18;
      if (game.duckHeld && p.lane === 0) {
        if (p.slideState === "none") startSlideEnter();
      } else if (!game.duckHeld && p.slideState === "none") {
        setPlayerCrouch(false);
      }
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

  function getEnemySpawnX(speedMul = 1) {
    const p = game.player;
    const effectiveSpeed = Math.max(330, game.worldSpeed) * Math.max(1, speedMul);

    // プレイヤー位置から最低1.55秒ぶんの反応距離を確保。
    let spawnX = Math.max(1000, p.x + effectiveSpeed * MIN_ENEMY_REACTION_TIME + 220);

    // 直前の敵との間隔を確保。後続が高速個体なら追いつく分も先に広げる。
    const liveEnemies = game.enemies.filter((enemy) => !enemy.dead);
    if (liveEnemies.length) {
      const rightmost = liveEnemies.reduce((a, b) => (a.x > b.x ? a : b));
      const baseGap = Math.max(MIN_ENEMY_GAP_PX, game.worldSpeed * 0.82);
      const relativeMul = Math.max(0, speedMul - (rightmost.speedMul || 1));
      const catchUpBuffer = game.worldSpeed * relativeMul * 1.8;
      spawnX = Math.max(spawnX, rightmost.x + baseGap + catchUpBuffer);
    }

    return spawnX;
  }

  function enemyHitbox(enemy) {
    if (enemy.kind === "ghost") {
      // ゴーストの判定ルール
      // ・そのまま / 1段ジャンプ（バネ靴込み・上段レーン含む）→ かわせない（画面上端まで縦に伸びた判定）
      // ・スライディング / しゃがみ → かわせる（更新ループ側で判定を除外）
      // ・2段ジャンプ以上 → ゴースト本体の高さだけの判定になり、上を越えればかわせる
      const p = game.player;
      const x = enemy.x + 10;
      const w = Math.max(42, enemy.w - 20);
      if (!p.onGround && p.airJumpsUsed >= 1) {
        const bodyBottom = enemy.y + enemy.h;
        const bodyTop = bodyBottom - GHOST_BODY_HEIGHT;
        return { x, y: bodyTop, w, h: GHOST_BODY_HEIGHT };
      }
      return { x, y: 0, w, h: GROUND_Y - 34 };
    }

    return enemy;
  }

  function spawnEnemy() {
    const roll = Math.random();
    const difficulty = getStageDifficulty();
    let enemy;

    if (roll < 0.57) {
      const veggie = choose(["carrot", "tomato", "broccoli", "eggplant"]);
      const dims = {
        carrot: [36, 58],
        tomato: [48, 44],
        broccoli: [52, 58],
        eggplant: [40, 58]
      }[veggie];
      const useUpperLane = isUpperLaneUnlocked() && Math.random() < UPPER_LANE_ENEMY_CHANCE;
      const baseY = (useUpperLane ? UPPER_GROUND_Y : GROUND_Y) - dims[1];
      const speedMul = Math.random() < difficulty.fastChance ? randomBetween(1.9, 2.1) : 1; // 高速野菜：約2倍速
      enemy = {
        kind: veggie,
        x: getEnemySpawnX(speedMul),
        y: baseY,
        baseY,
        lane: useUpperLane ? 1 : 0,
        w: dims[0],
        h: dims[1],
        dead: false,
        speedMul,
        jumpy: Math.random() < difficulty.jumpChance,
        jumpAmp: 0,
        jumpSpeed: 0,
        jumpPhase: 0,
        jumpActive: false
      };
      if (enemy.jumpy) {
        // メインキャラの通常ジャンプ（約133px）に近い高さ。
        // 画面に入った瞬間から、着地→ジャンプをテンポよく繰り返す。
        enemy.jumpAmp = randomBetween(125, 145);
        enemy.jumpSpeed = randomBetween(1.08, 1.28); // 1秒あたりのジャンプ周期
        enemy.jumpPhase = 0;
        enemy.jumpActive = false;
      }
    } else if (roll < 0.79) {
      const useUpperLane = isUpperLaneUnlocked() && Math.random() < UPPER_LANE_ENEMY_CHANCE;
      const baseY = (useUpperLane ? UPPER_GROUND_Y : GROUND_Y) - 72;
      enemy = { kind: "zombie", x: getEnemySpawnX(1), y: baseY, baseY, lane: useUpperLane ? 1 : 0, w: 44, h: 72, dead: false, speedMul: 1 };
    } else {
      // そのまま・1段ジャンプではかわせず、スライディングか2段ジャンプ以上で回避（判定は enemyHitbox）。
      enemy = { kind: "ghost", x: getEnemySpawnX(1), y: 326, baseY: 326, lane: 0, w: 68, h: 58, dead: false, speedMul: 1 };
    }

    game.enemies.push(enemy);
  }

  function spawnCoins() {
    if (game.distance >= ULTRA_CHIPS_MIN_DISTANCE && Math.random() < ULTRA_CHIPS_CHANCE) {
      game.coinObjects.push({
        x: 1200, y: isUpperLaneUnlocked() ? ULTRA_CHIPS_Y_UPPER : ULTRA_CHIPS_Y, w: ULTRA_CHIPS_HITBOX, h: ULTRA_CHIPS_HITBOX,
        collected: false, spin: Math.random() * 10, ultra: true
      });
    }
    if (game.distance >= RAINBOW_TEA_MIN_DISTANCE && Math.random() < RAINBOW_TEA_CHANCE) {
      // 通常の紅茶の列の代わりに、レインボー紅茶を1個だけ出す。
      const y = choose([GROUND_Y - 72, GROUND_Y - 120]);
      game.coinObjects.push({ x: 1000, y, w: 24, h: 24, collected: false, spin: Math.random() * 10, rainbow: true });
      return;
    }
    let count = Math.floor(randomBetween(3, 7));
    // ティーセンサーが最大レベルなら、1回に出る紅茶カップの数を2倍にする
    const sensor = UPGRADE_DEFS.find((item) => item.id === "coin_sense");
    if (sensor && (game.upgradeLevels.coin_sense || 0) >= sensor.max) count *= TEA_SENSOR_MAX_COUNT_MULTIPLIER;
    const baseX = 1000;
    const difficulty = getStageDifficulty();
    let pattern = choose(["line", "arc", "high"]);
    if (isUpperLaneUnlocked() && Math.random() < difficulty.upperCoinChance) {
      pattern = choose(["upper_line", "upper_arc"]);
    }

    for (let i = 0; i < count; i += 1) {
      let y = GROUND_Y - 72;
      if (pattern === "arc") y -= Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 84;
      if (pattern === "high") y = GROUND_Y - 145;
      if (pattern === "upper_line") y = UPPER_GROUND_Y - 72;
      if (pattern === "upper_arc") y = (UPPER_GROUND_Y - 76) - Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 54;
      game.coinObjects.push({ x: baseX + i * 34, y, w: 20, h: 20, collected: false, spin: Math.random() * 10, upperLane: pattern.startsWith("upper") });
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

    if (game.upgrades.revive > 0) {
      game.upgrades.revive -= 1;
      enemy.dead = true;
      game.player.invincible = 1.8;
      game.flash = 0.35;
      puff(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 16, "#ffffff");
      renderBuild();
      return;
    }

    finishRun(enemy.kind === "ghost" ? "お化けに捕まった！" : enemy.kind === "zombie" ? "ゾンビにぶつかった！" : "野菜に激突した！", { enemyKind: enemy.kind });
  }

  function collectCoin(coin) {
    if (coin.collected) return;
    coin.collected = true;
    const value = coin.ultra ? ULTRA_CHIPS_VALUE : coin.rainbow ? RAINBOW_TEA_VALUE : 1;
    game.coins += value;
    playSfx("tea", { high: !!(coin.rainbow || coin.ultra) });
    game.distance += 4;
    if (coin.ultra) {
      ["#ff6b8b", "#ffb86b", "#ffe66d", "#7be08f", "#6bc8ff", "#b28bff", "#ffffff"].forEach((color) => {
        puff(coin.x + coin.w / 2, coin.y + coin.h / 2, 6, color);
      });
      game.flash = Math.max(game.flash || 0, 0.12);
      game.popTexts.push({ x: coin.x + coin.w / 2, y: coin.y - 8, text: `+${value}`, life: 1.1, big: true });
    } else if (coin.rainbow) {
      ["#ff6b8b", "#ffb86b", "#ffe66d", "#7be08f", "#6bc8ff", "#b28bff"].forEach((color) => {
        puff(coin.x + 12, coin.y + 12, 4, color);
      });
      game.popTexts.push({ x: coin.x + 12, y: coin.y - 6, text: `+${value}`, life: 0.9 });
    } else {
      puff(coin.x + 10, coin.y + 10, 5, "#ffe66d");
    }
    updateHud();

    if (game.coins >= game.nextUpgradeAt && game.phase === "playing") {
      advanceNextUpgradeThreshold();
      openUpgradeSelection();
    }
  }

  function updateWorld(dt) {
    game.elapsed += dt;
    game.worldSpeed = Math.min(MAX_WORLD_SPEED, 330 + game.elapsed * 7.2) * game.upgrades.speedFactor;
    game.distance += (game.worldSpeed * dt) / 12;
    // スクロール演出専用の距離。紅茶カップ取得時の距離ボーナス(+4)を含めず、背景・地面が一定速度で流れるようにする。
    game.scrollDistance += (game.worldSpeed * dt) / 12;
    updateBgmStage();
    updateLaneStage();

    // 能力選択直後の安全時間。
    // 1秒間は新しい敵・紅茶カップを出現させず、選択直後の事故死を防ぐ。
    if (game.postUpgradeGrace > 0) {
      game.postUpgradeGrace = Math.max(0, game.postUpgradeGrace - dt);
    } else {
      game.enemyTimer -= dt;
      if (game.enemyTimer <= 0) {
        spawnEnemy();
        const difficulty = Math.min(0.35, game.elapsed / 180);
        const rawDelay = randomBetween(0.92 - difficulty, 1.55 - difficulty * 0.65);
        // 高速域でも敵が連続しすぎて物理的に回避不能にならないよう下限を固定。
        game.enemyTimer = Math.max(MIN_ENEMY_SPAWN_DELAY, rawDelay);
      }

      game.coinTimer -= dt;
      if (game.coinTimer <= 0) {
        spawnCoins();
        game.coinTimer = randomBetween(0.75, 1.25) * game.upgrades.coinSpawnFactor;
      }
    }

    const speed = game.worldSpeed;
    const pBox = playerHitbox();

    for (const enemy of game.enemies) {
      enemy.x -= speed * dt * (enemy.speedMul || 1);
      if (enemy.jumpy) {
        // 画面に登場したタイミングからジャンプ開始。
        if (!enemy.jumpActive && enemy.x <= els.canvas.width + enemy.w) {
          enemy.jumpActive = true;
          enemy.jumpPhase = 0;
        }

        if (enemy.jumpActive) {
          enemy.jumpPhase = ((enemy.jumpPhase || 0) + dt * (enemy.jumpSpeed || 1.18)) % 1;
          const t = enemy.jumpPhase;
          const hop = 4 * t * (1 - t); // 0→頂点→0 の放物線風ジャンプ
          enemy.y = (enemy.baseY ?? enemy.y) - hop * (enemy.jumpAmp || 132);
        } else if (typeof enemy.baseY === 'number') {
          enemy.y = enemy.baseY;
        }
      } else if (typeof enemy.baseY === 'number') {
        enemy.y = enemy.baseY;
      }
      // 浮遊ゴーストは下スライディング/しゃがみ中なら必ず下をくぐれる。
      // 見た目と当たり判定のズレで接触扱いにならないよう、ghost だけ明示的に除外する。
      const duckingUnderGhost = enemy.kind === "ghost" &&
        game.player.onGround &&
        game.player.lane === 0 &&
        (game.player.crouching || game.player.slideState === "enter" || game.player.slideState === "hold" || game.player.slideState === "exit");

      if (!enemy.dead && !duckingUnderGhost && intersects(pBox, enemyHitbox(enemy))) {
        handleEnemyCollision(enemy);
      }
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
      // ウルトラレインボーポテチは、ティーカップ磁石Lv4の時だけ吸い寄せる
      const magnetMaxed = (game.upgradeLevels.magnet || 0) >= ULTRA_CHIPS_MAGNET_LEVEL;
      if ((!coin.ultra || magnetMaxed) && dist < game.upgrades.magnetRadius) {
        const pull = Math.min(1, dt * (5 + (game.upgrades.magnetRadius - dist) / 35));
        coin.x += dx * pull;
        coin.y += dy * pull;
      }
      // ポテチは「2段ジャンプ中（2段目解放後は2段目から）」または「ティーカップ磁石Lv4」で取れる
      const doubleJumping = !game.player.onGround && game.player.airJumpsUsed >= 1;
      const laneOk = !isUpperLaneUnlocked() || game.player.lane === 1;
      const canTakeUltra = !coin.ultra || magnetMaxed || (doubleJumping && laneOk);
      if (!coin.collected && canTakeUltra && intersects(pBox, coin)) collectCoin(coin);
    }
    game.coinObjects = game.coinObjects.filter((coin) => !coin.collected && coin.x + coin.w > (coin.ultra ? -120 : -40));

    // 高い位置のポテチが画面内にある間は、上部HUDを薄くしてポテチを見えるようにする
    const chipsBehindHud = game.coinObjects.some((coin) => coin.ultra && coin.y < 110 && coin.x < els.canvas.width + 40);
    if (chipsBehindHud !== game.hudDimmed) {
      game.hudDimmed = chipsBehindHud;
      document.querySelector(".in-game-ui")?.classList.toggle("hud-dim", chipsBehindHud);
    }

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
    for (const t of game.popTexts) {
      t.life -= dt;
      t.y -= 46 * dt;
    }
    game.popTexts = game.popTexts.filter((t) => t.life > 0);
  }

  function availableUpgrades() {
    const candidates = UPGRADE_DEFS.filter((item) => (game.upgradeLevels[item.id] || 0) < item.max);
    return candidates.length >= 3 ? candidates : UPGRADE_DEFS;
  }

  function randomUpgradeChoices() {
    const pool = [...new Map(availableUpgrades().map((item) => [item.id, item])).values()];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }

  function getUpgradePresentation(item) {
    const level = game.upgradeLevels[item.id] || 0;
    const totalPicked = game.upgradeHistory.length;
    const roll = Math.random();
    let tier = "silver";
    let tierLabel = "SILVER TEA";
    let tierMark = "◇";

    if (totalPicked >= 4 && roll < 0.22) {
      tier = "gold";
      tierLabel = "GOLDEN TEA";
      tierMark = "✦";
    } else if (roll < 0.34) {
      tier = "bronze";
      tierLabel = "BRONZE TEA";
      tierMark = "♢";
    }

    return {
      level,
      tier,
      tierLabel,
      tierMark,
      nextLevel: level + 1
    };
  }

  function renderUpgradeCardMarkup(item, meta, hotkeyLabel = "") {
    const desc = escapeHtml(item.uiDesc || item.desc).replace(/\n/g, "<br>");
    const iconMarkup = item.iconImage
      ? `<img class="augment-icon-image" src="${item.iconImage}" alt="">`
      : `<span class="icon">${escapeHtml(item.icon)}</span>`;
    return `
      <img class="ability-card-corner ability-card-corner-tl" src="./assets/ui/ranking/corner-flourish.png?v=63" alt="" aria-hidden="true">
      <img class="ability-card-corner ability-card-corner-tr" src="./assets/ui/ranking/corner-flourish.png?v=63" alt="" aria-hidden="true">
      <img class="ability-card-corner ability-card-corner-bl" src="./assets/ui/ranking/corner-flourish.png?v=63" alt="" aria-hidden="true">
      <img class="ability-card-corner ability-card-corner-br" src="./assets/ui/ranking/corner-flourish.png?v=63" alt="" aria-hidden="true">
      <span class="augment-hit-glow" aria-hidden="true"></span>
      <span class="augment-hotkey">${escapeHtml(hotkeyLabel)}</span>
      <span class="augment-select-mark" aria-hidden="true">✓</span>
      <span class="augment-icon-wrap">${iconMarkup}</span>
      <span class="augment-name">${escapeHtml(item.name)}</span>
      <span class="augment-level">Lv.${meta.nextLevel}</span>
      <span class="augment-desc">${desc}</span>
      <span class="augment-pick">この力を選ぶ</span>
    `;
  }

  function selectUpgradeCard(item, button) {
    if (!item || !button) return;
    chooseUpgrade(item, button);
  }

  function getUpgradeHotkeyLabel(index) {
    const action = `upgrade${index + 1}`;
    return (keybinds[action] || []).filter(Boolean).map(keyLabel).join(" / ") || `#${index + 1}`;
  }

  function refreshUpgradeHotkeyLabels() {
    els.upgradeCards?.querySelectorAll('.augment-card').forEach((card, index) => {
      const label = card.querySelector('.augment-hotkey');
      if (label) label.textContent = getUpgradeHotkeyLabel(index);
    });
  }

  function normalizeMenuKeyCode(code) {
    if (/^Numpad[123]$/.test(code)) return `Digit${code.slice(-1)}`;
    return code;
  }

  function getUpgradeIndexForCode(code) {
    const normalized = normalizeMenuKeyCode(code);
    for (let i = 0; i < 3; i += 1) {
      const action = `upgrade${i + 1}`;
      if ((keybinds[action] || []).includes(normalized)) return i;
    }
    return -1;
  }

  function chooseUpgradeByIndex(index) {
    const cards = Array.from(els.upgradeCards?.querySelectorAll('.augment-card') || []);
    const card = cards[index];
    if (!card || card.disabled || !card._upgradeItem) return false;
    chooseUpgrade(card._upgradeItem, card);
    return true;
  }

  function openUpgradeSelection() {
    game.phase = "upgrade";
    pendingUpgradeChoice = null;
    pendingUpgradeCard = null;
    els.upgradeCards.classList.remove('has-selection', 'confirming');
    els.upgradeCards.innerHTML = "";
    randomUpgradeChoices().forEach((item, index) => {
      const meta = getUpgradePresentation(item);
      const button = document.createElement("button");
      button.className = `upgrade-card augment-card slot-${index + 1} ${meta.tier}`;
      button.type = "button";
      button.setAttribute('aria-pressed', 'false');
      button.style.setProperty('--card-delay', `${index * 70}ms`);
      button._upgradeItem = item;
      button.innerHTML = renderUpgradeCardMarkup(item, meta, getUpgradeHotkeyLabel(index));
      button.addEventListener("click", () => chooseUpgrade(item, button));
      els.upgradeCards.appendChild(button);
    });

    document.body.classList.add("upgrade-active");
    els.upgradeOverlay.classList.remove("hidden");
  }

  function chooseUpgrade(item, selectedCard = null) {
    const level = game.upgradeLevels[item.id] || 0;
    if (level >= item.max) return;
    if (els.upgradeCards?.classList.contains('confirming')) return;
    pendingUpgradeChoice = null;
    item.apply();
    game.upgradeLevels[item.id] = level + 1;
    game.upgradeHistory.push(item.id);

    if (selectedCard) {
      els.upgradeCards.classList.add('confirming');
      selectedCard.classList.add("selected", "confirmed");
      selectedCard.classList.remove("unselected");
      const selectedLabel = selectedCard.querySelector('.augment-pick');
      if (selectedLabel) selectedLabel.textContent = '決定！';
      els.upgradeCards.querySelectorAll(".augment-card").forEach((card) => {
        if (card !== selectedCard) card.classList.add("unselected", "not-selected");
        card.disabled = true;
      });
    }

    renderBuild();
    updateHud();

    // 能力を決定した瞬間に画面上の敵を全消去。
    // 紅茶カップは既に存在しているものは残すが、新規出現は再開後1秒間止める。
    game.enemies = [];

    setTimeout(() => {
      els.upgradeOverlay.classList.add("hidden");
      document.body.classList.remove("upgrade-active");
      els.upgradeCards.classList.remove('has-selection');
      pendingUpgradeCard = null;
      game.phase = "playing";
      game.postUpgradeGrace = 1.0;
      game.lastTime = performance.now();

      // 大量に紅茶カップを拾った場合は、次の100杯到達分も続けて選ばせる。
      if (game.coins >= game.nextUpgradeAt) {
        advanceNextUpgradeThreshold();
        setTimeout(openUpgradeSelection, 120);
      }
    }, selectedCard ? 620 : 0);
  }

  function renderBuild() {
    const entries = Object.entries(game.upgradeLevels).filter(([, level]) => level > 0);
    if (!entries.length) {
      els.buildList.innerHTML = "";
      els.buildPop?.classList.add("hidden");
      return;
    }

    els.buildPop?.classList.remove("hidden");
    els.buildList.innerHTML = entries.map(([id, level]) => {
      const item = UPGRADE_DEFS.find((def) => def.id === id);
      const icon = item?.iconImage || './assets/ui/hud/build.png?v=63';
      const name = escapeHtml(item?.name || id);
      let extra = `<span class="build-item-level">Lv.${level}</span>`;
      if (id === 'revive') {
        const charges = Math.max(0, Number(game.upgrades?.revive || 0));
        if (charges > 0) {
          const visibleIcons = Math.min(charges, 6);
          const feathers = Array.from({ length: visibleIcons }, (_, idx) => `
            <img class="revive-charge-icon" src="${icon}" alt="復活の羽 ${idx + 1}" />`).join('');
          const overflow = charges > visibleIcons ? `<span class="revive-charge-more">+${charges - visibleIcons}</span>` : '';
          extra += `<span class="revive-charge-wrap" aria-label="残りの復活回数 ${charges}">${feathers}${overflow}</span>`;
        }
      }
      return `
        <div class="build-item build-item-${escapeHtml(id)}">
          <img class="build-item-icon" src="${icon}" alt="" />
          <div class="build-item-texts">
            <div class="build-item-name-row">
              <span class="build-item-name">${name}</span>
              ${extra}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function syncRankingHeight() {
    if (!els.gameFrame || !els.rankingPanel) return;
    if (window.matchMedia("(max-width: 1100px)").matches) {
      els.rankingPanel.style.height = "";
      return;
    }
    const height = Math.round(els.gameFrame.getBoundingClientRect().height);
    if (height > 0) els.rankingPanel.style.height = `${height}px`;
  }

  async function refreshLeaderboard() {
    if (!ONLINE_CONFIGURED || !supabaseClient) {
      els.rankingStatus.textContent = "オンラインランキングはSupabase設定後に有効になります。";
      els.rankingList.innerHTML = "";
      return;
    }

    els.rankingStatus.textContent = "読み込み中...";
    const { data, error } = await supabaseClient.rpc("get_leaderboard", { p_limit: 5 });
    if (error) {
      els.rankingStatus.textContent = `ランキング取得失敗: ${error.message}`;
      return;
    }

    const rows = (data || []).slice(0, 5);
    const me = rows.find((row) => row.user_id === currentUserId);
    currentBest = me?.best_score || 0;
    updateHud();

    els.rankingStatus.textContent = rows.length ? "" : "まだ記録がありません。最初のランナーになろう。";
    const rankIcons = [
      "./assets/ui/ranking/rank-1.png?v=63",
      "./assets/ui/ranking/rank-2.png?v=63",
      "./assets/ui/ranking/rank-3.png?v=63",
    ];

    els.rankingList.innerHTML = rows.map((row, index) => {
      const marker = index < 3
        ? `<img class="rank-medal" src="${rankIcons[index]}" alt="${index + 1}位" />`
        : `<span class="rank-number-badge">${index + 1}</span>`;
      return `
      <li class="ranking-item ${row.user_id === currentUserId ? "me" : ""}">
        <div class="rank-marker">${marker}</div>
        <div class="rank-meta">
          <span class="rank-name" title="${escapeHtml(row.username)}">${escapeHtml(row.username)}</span>
          <span class="rank-label">BEST SCORE</span>
        </div>
        <span class="rank-score">${Number(row.best_score).toLocaleString()}m</span>
      </li>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function drawImageCover(img, dx, dy, dw, dh) {
    if (!img || !img.complete) return false;
    const imageRatio = img.width / img.height;
    const frameRatio = dw / dh;
    let sx = 0; let sy = 0; let sw = img.width; let sh = img.height;
    if (imageRatio > frameRatio) {
      sw = img.height * frameRatio;
      sx = (img.width - sw) / 2;
    } else if (imageRatio < frameRatio) {
      sh = img.width / frameRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return true;
  }

  function drawMaskedSprite(sprite, dx, dy, dw, dh, options = {}) {
    if (!sprite?.image?.complete) return false;
    const { rotate = 0, alpha = 1 } = options;
    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    if (rotate) ctx.rotate(rotate);
    if (sprite.mask?.length) {
      ctx.beginPath();
      sprite.mask.forEach(([px, py], index) => {
        const x = -dw / 2 + px * dw;
        const y = -dh / 2 + py * dh;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.clip();
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite.image, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    ctx.globalAlpha = 1;
    return true;
  }

  function drawScrollingStageBackground(img, w, h) {
    if (!img?.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return false;

    // 横スクロール用。地面より遅く流して奥行きを出す。
    const imageRatio = img.naturalWidth / img.naturalHeight;
    const frameRatio = w / h;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (imageRatio > frameRatio) {
      sw = img.naturalHeight * frameRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else if (imageRatio < frameRatio) {
      sh = img.naturalWidth / frameRatio;
      sy = (img.naturalHeight - sh) / 2;
    }

    const scrollPx = (game.scrollDistance * 1.35) % w;
    const firstX = -scrollPx;

    // 3枚並べることで常に画面を埋める。画像は反転せず、文字も正向きのまま。
    for (let i = 0; i < 3; i += 1) {
      const dx = Math.round(firstX + i * w);
      ctx.drawImage(img, sx, sy, sw, sh, dx, 0, w + 1, h);
    }

    // 継ぎ目を目立ちにくくする、ごく薄い空気遠近レイヤー。
    const haze = ctx.createLinearGradient(0, 0, 0, h);
    haze.addColorStop(0, "rgba(255,255,255,0.035)");
    haze.addColorStop(0.68, "rgba(255,255,255,0.015)");
    haze.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);
    return true;
  }

  function drawBackground() {
    const w = els.canvas.width;
    const h = els.canvas.height;

    if (!drawScrollingStageBackground(ART.background, w, h)) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#cfe7ff");
      skyGrad.addColorStop(1, "#fff1f7");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fillRect(0, GROUND_Y - 34, w, 18);

    const laneShade = ctx.createLinearGradient(0, GROUND_Y - 4, 0, h);
    laneShade.addColorStop(0, "rgba(255, 245, 234, 0.20)");
    laneShade.addColorStop(1, "rgba(184, 143, 143, 0.34)");
    ctx.fillStyle = laneShade;
    ctx.fillRect(0, GROUND_Y - 4, w, h - GROUND_Y + 4);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillRect(0, GROUND_Y - 4, w, 6);

    const tileOffset = -((game.scrollDistance * 3.2) % 72);
    for (let x = tileOffset - 72; x < w + 72; x += 72) {
      ctx.fillStyle = "rgba(255, 250, 245, 0.64)";
      ctx.fillRect(x + 8, GROUND_Y + 16, 26, 12);
      ctx.fillRect(x + 38, GROUND_Y + 16, 26, 12);
      ctx.fillRect(x + 8, GROUND_Y + 32, 26, 12);
      ctx.fillRect(x + 38, GROUND_Y + 32, 26, 12);
      ctx.fillStyle = "rgba(201, 178, 177, 0.38)";
      ctx.fillRect(x + 35, GROUND_Y + 16, 3, 28);
      ctx.fillRect(x + 8, GROUND_Y + 29, 56, 3);
    }

    const ribbonOffset = -((game.scrollDistance * 0.8) % 160);
    for (let x = ribbonOffset - 160; x < w + 160; x += 160) {
      ctx.fillStyle = "rgba(255, 226, 238, 0.30)";
      ctx.beginPath();
      ctx.ellipse(x + 24, GROUND_Y + 74, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isUpperLaneUnlocked()) {
      const upperGlow = ctx.createLinearGradient(0, UPPER_GROUND_Y - 34, 0, UPPER_GROUND_Y + 26);
      upperGlow.addColorStop(0, "rgba(255,255,255,0.02)");
      upperGlow.addColorStop(0.5, "rgba(255,239,247,0.24)");
      upperGlow.addColorStop(1, "rgba(255,223,235,0.05)");
      ctx.fillStyle = upperGlow;
      ctx.fillRect(0, UPPER_GROUND_Y - 34, w, 64);

      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fillRect(0, UPPER_GROUND_Y - 4, w, 6);
      ctx.fillStyle = "rgba(255, 247, 250, 0.34)";
      ctx.fillRect(0, UPPER_GROUND_Y - 26, w, 18);

      const upperTileOffset = -((game.scrollDistance * 2.8) % 96);
      for (let x = upperTileOffset - 96; x < w + 96; x += 96) {
        ctx.fillStyle = "rgba(244, 248, 255, 0.78)";
        ctx.fillRect(x + 10, UPPER_GROUND_Y + 10, 30, 10);
        ctx.fillRect(x + 44, UPPER_GROUND_Y + 10, 30, 10);
        ctx.fillStyle = "rgba(192, 206, 233, 0.42)";
        ctx.fillRect(x + 40, UPPER_GROUND_Y + 10, 4, 10);
        ctx.fillStyle = "rgba(255, 214, 230, 0.30)";
        ctx.beginPath();
        ctx.ellipse(x + 22, UPPER_GROUND_Y + 34, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawFairyCastle(cx, y, scale) {
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "#fff7fb";
    ctx.fillRect(-120, 8, 240, 54);
    ctx.fillRect(-26, -10, 52, 72);
    ctx.fillStyle = "#f7fbff";
    ctx.fillRect(-104, -8, 44, 70);
    ctx.fillRect(60, -8, 44, 70);
    ctx.fillStyle = "#b0c6f7";
    drawCone(-82, -30, 24, 30);
    drawCone(82, -30, 24, 30);
    drawCone(0, -44, 28, 38);
    ctx.fillStyle = "#f9d6e3";
    ctx.fillRect(-88, 26, 10, 18);
    ctx.fillRect(78, 26, 10, 18);
    ctx.fillStyle = "#aebdf0";
    ctx.fillRect(-10, 22, 20, 30);
    ctx.fillStyle = "#f2bcd2";
    for (const p of [[-110,14],[-72,10],[-36,15],[34,14],[70,10],[106,15]]) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawCone(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - w / 2, y + h);
    ctx.lineTo(x + w / 2, y + h);
    ctx.closePath();
    ctx.fill();
  }

  function drawTeapotVilla(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(143, 170, 204, 0.14)";
    ctx.beginPath(); ctx.ellipse(32, 64, 94, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffdf8";
    ctx.beginPath(); ctx.ellipse(18, 28, 56, 38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-22, 28, 84, 34);
    ctx.beginPath(); ctx.arc(80, 34, 18, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = "#fffdf8"; ctx.lineWidth = 10; ctx.stroke();
    ctx.beginPath(); ctx.arc(-36, 26, 18, Math.PI * 0.3, Math.PI * 1.7); ctx.stroke();
    ctx.fillStyle = "#b3c7f7";
    ctx.beginPath(); ctx.arc(18, 2, 26, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f3d0dc";
    ctx.fillRect(-14, 20, 64, 8);
    ctx.fillStyle = "#9bb0ea";
    ctx.fillRect(4, 39, 28, 23);
    ctx.fillStyle = "#f7ec9f";
    ctx.beginPath(); ctx.arc(18, 11, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTeaSign(x, y, text) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#a38a76";
    ctx.fillRect(0, 0, 6, 52);
    ctx.fillStyle = "#fff8f4";
    ctx.strokeStyle = "#e5cfca";
    ctx.lineWidth = 2;
    roundRect(10, 0, 70, 24, 8, true, true);
    ctx.fillStyle = "#8e7a8c";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(text, 25, 16);
    ctx.restore();
  }

  function drawBunnyBalloon(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(175, 189, 240, 0.18)";
    ctx.beginPath(); ctx.ellipse(0, 0, 54, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f6f4ff";
    ctx.beginPath(); ctx.ellipse(0, 0, 48, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-10, -24, 14, 12);
    ctx.fillRect(6, -22, 12, 10);
    ctx.fillStyle = "#a9bae6";
    ctx.fillRect(18, -4, 14, 10);
    ctx.fillStyle = "#f09cbc";
    ctx.beginPath(); ctx.arc(-12, 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#b9b0c9";
    ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, 40); ctx.stroke();
    ctx.fillStyle = "#fff8f1";
    ctx.fillRect(-12, 40, 24, 12);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
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
    const bob = Math.sin(coin.spin) * 3;
    const img = ART.teaCup;
    const centerX = coin.x + coin.w / 2;
    const centerY = coin.y + coin.h / 2 + bob;

    ctx.save();
    ctx.translate(centerX, centerY);
    const pulse = 1 + Math.sin(coin.spin * 0.7) * 0.035;
    ctx.scale(pulse, pulse);

    if (coin.ultra) {
      drawUltraChips();
      ctx.restore();
      return;
    }
    if (coin.rainbow) {
      drawRainbowTea(img);
      ctx.restore();
      return;
    }

    // 収集物として見つけやすい、やわらかな光だけコードで追加。
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 29);
    glow.addColorStop(0, "rgba(255,245,184,0.62)");
    glow.addColorStop(0.55, "rgba(255,212,232,0.28)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();

    if (img?.complete && img.naturalWidth) {
      const drawH = 38;
      const drawW = Math.round(img.naturalWidth * (drawH / img.naturalHeight));
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // 画像読込前の最低限フォールバック
      ctx.fillStyle = "#fff9f5";
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ce844c";
      ctx.fillRect(-9, -4, 18, 5);
    }
    ctx.restore();
  }



  // レインボー紅茶：虹色に回るオーラ＋色が変わり続けるティーカップ
  function drawRainbowTea(img) {
    const t = game.elapsed;
    const hue = (t * 240) % 360;

    ctx.save();
    ctx.rotate(t * 2.2);
    const ringColors = ["#ff6b8b", "#ffb86b", "#ffe66d", "#7be08f", "#6bc8ff", "#b28bff"];
    ringColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 36, (i / ringColors.length) * Math.PI * 2, ((i + 1) / ringColors.length) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 36);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(0.6, "rgba(255,255,255,0.55)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    // キラキラ
    for (let i = 0; i < 4; i += 1) {
      const a = t * 3 + (i * Math.PI) / 2;
      const r = 30 + Math.sin(t * 6 + i) * 4;
      ctx.fillStyle = `hsl(${(hue + i * 90) % 360}, 95%, 70%)`;
      ctx.fillRect(Math.cos(a) * r - 2, Math.sin(a) * r - 2, 4, 4);
    }

    if (img?.complete && img.naturalWidth) {
      const drawH = 46;
      const drawW = Math.round(img.naturalWidth * (drawH / img.naturalHeight));
      ctx.filter = `hue-rotate(${hue}deg) saturate(1.8)`;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.filter = "none";
    }
  }

  // ウルトラレインボーポテチ：虹色の光線＋画像（未設置なら仮の袋）
  function drawUltraChips() {
    const t = game.elapsed;
    const hue = (t * 300) % 360;
    const size = ULTRA_CHIPS_DRAW_H / 2; // 光・キラキラの半径の基準

    // 回転する虹色の光線
    ctx.save();
    ctx.rotate(t * 1.6);
    for (let i = 0; i < 12; i += 1) {
      ctx.fillStyle = `hsla(${(hue + i * 30) % 360}, 95%, 65%, 0.45)`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const a = (i / 12) * Math.PI * 2;
      ctx.arc(0, 0, size * 1.25, a, a + Math.PI / 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, size * 1.1);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(0.55, "rgba(255,255,255,0.45)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
    ctx.fill();

    const img = ART.ultraChips;
    const tilt = Math.sin(t * 5) * 0.12;
    ctx.save();
    ctx.rotate(tilt);
    if (img?.complete && img.naturalWidth) {
      const drawH = ULTRA_CHIPS_DRAW_H;
      const drawW = Math.round(img.naturalWidth * (drawH / img.naturalHeight));
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      // 仮の袋（画像を置くと自動で差し替わる）
      const h = ULTRA_CHIPS_DRAW_H;
      const w = h * 0.75;
      const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      ["#ff6b8b", "#ffb86b", "#ffe66d", "#7be08f", "#6bc8ff", "#b28bff"].forEach((c, i, arr) => grad.addColorStop(i / (arr.length - 1), c));
      ctx.fillStyle = grad;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w / 2 - 3, h / 2);
      ctx.lineTo(-w / 2 + 3, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ULTRA", 0, -6);
      ctx.fillText("CHIPS", 0, 18);
    }
    ctx.restore();

    // キラキラ
    for (let i = 0; i < 6; i += 1) {
      const a = t * 2.5 + (i * Math.PI) / 3;
      const r = size * 1.05 + Math.sin(t * 7 + i) * 6;
      ctx.fillStyle = `hsl(${(hue + i * 60) % 360}, 100%, 72%)`;
      ctx.fillRect(Math.cos(a) * r - 2.5, Math.sin(a) * r - 2.5, 5, 5);
    }
  }

  function shouldBlinkPlayerBody() {
    const p = game.player;
    return p.invincible > 0 && p.shieldTimer <= 0 && Math.floor(p.invincible * 12) % 2 === 0;
  }

  function shouldShowShieldAura() {
    const p = game.player;
    if (p.shieldTimer <= 0) return false;
    if (p.shieldTimer > 2) return true;
    return Math.floor(p.shieldTimer * 8) % 2 === 0;
  }

  function drawShieldAura() {
    const p = game.player;
    if (!shouldShowShieldAura()) return;

    const centerX = Math.round(p.x + p.w / 2);
    const centerY = Math.round(p.y + p.h / 2);
    const size = p.crouching ? 122 : 148;
    const img = ART.shieldAura;

    if (img?.complete && img.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.drawImage(img, centerX - size / 2, centerY - size / 2 - 4, size, size);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255, 206, 244, 0.95)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 2, p.crouching ? 42 : 50, p.crouching ? 48 : 60, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawFallbackPlayer() {
    const p = game.player;
    if (shouldBlinkPlayerBody()) return;

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

    drawShieldAura();
  }

  function drawPlayerFrame(img, centerX, feetY, drawH, options = {}) {
    if (!img?.complete || !img.naturalWidth) return false;
    const { rotate = 0, alpha = 1, xOffset = 0, yOffset = 0 } = options;
    const drawW = Math.round(img.naturalWidth * (drawH / img.naturalHeight));
    const drawX = Math.round(centerX - drawW / 2 + xOffset);
    const drawY = Math.round(feetY - drawH + yOffset);
    ctx.save();
    ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
    if (rotate) ctx.rotate(rotate);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    ctx.globalAlpha = 1;
    return true;
  }

  function drawPlayer() {
    const p = game.player;
    if (shouldBlinkPlayerBody()) return;

    const feetY = p.y + p.h;
    const centerX = p.x + p.w / 2 + 4;
    let drawn = false;

    if (game.phase === "gameover") {
      drawn = drawPlayerFrame(ART.playerGameover, centerX + 2, feetY + 3, 86, { xOffset: -6 });
    } else if (p.crouching || p.slideState !== "none") {
      const frames = ART.playerSlides;
      const slideIndex = p.slideState === "enter" ? 0 : p.slideState === "exit" ? 2 : 1;
      drawn = drawPlayerFrame(frames[slideIndex] || frames[1] || frames[0], centerX + 5, feetY + 4, 82, { xOffset: 7 });

      if (p.slideState === "hold") {
        const dustBaseY = getLaneGroundY(p.lane) - 8;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.ellipse(Math.round(p.x - 18), Math.round(dustBaseY), 24, 10, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(Math.round(p.x - 38), Math.round(dustBaseY - 8), 16, 7, -0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        ctx.ellipse(Math.round(p.x - 54), Math.round(dustBaseY - 14), 10, 5, -0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (!p.onGround) {
      let img;
      let rotate = 0;
      if (p.vy < -150) {
        img = ART.playerJumpUp;
        rotate = -0.04;
      } else if (p.vy < 170) {
        img = ART.playerJumpApex;
        rotate = 0;
      } else {
        img = ART.playerJumpDown;
        rotate = 0.05;
      }
      drawn = drawPlayerFrame(img, centerX + 3, feetY - 5, 106, { rotate, xOffset: 3 });
    } else if (p.landingTimer > 0 && game.phase === "playing") {
      const frames = ART.playerLandings;
      const progress = 1 - p.landingTimer / 0.18;
      const index = Math.min(frames.length - 1, Math.floor(progress * frames.length));
      drawn = drawPlayerFrame(frames[index], centerX + 3, feetY + 2, 96, { xOffset: 4 });
    } else if (game.phase === "idle" || game.phase === "upgrade") {
      const idleBob = Math.sin(performance.now() / 260) * 2;
      drawn = drawPlayerFrame(ART.playerIdle, centerX + 2, feetY - 2, 108, { yOffset: idleBob * 0.45 });
    } else {
      const frames = ART.playerRuns;
      const index = Math.floor(game.elapsed * 20) % frames.length;
      const strideBob = Math.abs(Math.sin(game.elapsed * 6)) * 2.1;
      drawn = drawPlayerFrame(frames[index], centerX + 6, feetY - 3, 106, { yOffset: -strideBob * 0.28 });
    }

    if (!drawn) {
      drawFallbackPlayer();
      return;
    }

    drawShieldAura();
  }

  function drawEnemy(enemy) {
    const cfg = ENEMY_DRAW[enemy.kind];
    const cell = ENEMY_SHEET_MAP[enemy.kind];
    const sheet = ART.enemySheet;
    if (!cfg || !cell || !sheet?.complete) {
      ctx.fillStyle = "rgba(103, 75, 96, 0.20)";
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h + 2, Math.max(16, enemy.w * 0.56), 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b06e91";
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      return;
    }

    const [col, row] = cell;
    const cellW = sheet.width / 3;
    const cellH = sheet.height / 2;
    const sx = Math.round(col * cellW);
    const sy = Math.round(row * cellH);
    const feetY = enemy.y + enemy.h;
    const bob = Math.sin(game.elapsed * cfg.amp + enemy.x * 0.04) * cfg.bob;
    const drawH = cfg.drawH;
    const drawW = Math.round(cellW * (drawH / cellH));
    const drawX = Math.round(enemy.x + enemy.w / 2 - drawW / 2);
    const drawY = Math.round(feetY - drawH - (cfg.lift || 0) + bob);

    ctx.save();
    ctx.globalAlpha = cfg.alpha || 1;
    const shadowY = enemy.kind === "ghost" ? feetY + 4 : feetY + 2;
    ctx.fillStyle = enemy.kind === "ghost" ? "rgba(89, 114, 164, 0.16)" : "rgba(103, 75, 96, 0.20)";
    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.w / 2, shadowY, Math.max(18, enemy.w * 0.58), enemy.kind === "ghost" ? 8 : 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sheet, sx, sy, cellW, cellH, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  function drawEnemyBaseShadow(width = 48) {
    ctx.fillStyle = "rgba(126, 145, 180, 0.20)";
    ctx.beginPath();
    ctx.ellipse(width / 2, 64, width * 0.44, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFace(cx, cy, mood = "angry") {
    ctx.fillStyle = "#3f3c54";
    ctx.beginPath(); ctx.arc(cx - 8, cy, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8, cy, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3f3c54";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (mood === "angry") {
      ctx.moveTo(cx - 14, cy - 6); ctx.lineTo(cx - 6, cy - 3);
      ctx.moveTo(cx + 14, cy - 6); ctx.lineTo(cx + 6, cy - 3);
      ctx.moveTo(cx - 7, cy + 9); ctx.quadraticCurveTo(cx, cy + 5, cx + 7, cy + 9);
    } else if (mood === "boo") {
      ctx.moveTo(cx - 7, cy + 8); ctx.quadraticCurveTo(cx, cy + 13, cx + 7, cy + 8);
    } else {
      ctx.moveTo(cx - 7, cy + 7); ctx.quadraticCurveTo(cx, cy + 11, cx + 7, cy + 7);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 182, 193, 0.7)";
    ctx.beginPath(); ctx.arc(cx - 14, cy + 6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 14, cy + 6, 3, 0, Math.PI * 2); ctx.fill();
  }

  function drawTinyFeet(leftX, rightX, y) {
    ctx.strokeStyle = "#5e5973";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(leftX, y); ctx.lineTo(leftX - 3, y + 8);
    ctx.moveTo(rightX, y); ctx.lineTo(rightX + 3, y + 8);
    ctx.stroke();
  }

  function drawCuteCarrot() {
    drawEnemyBaseShadow(40);
    ctx.fillStyle = "#58c075";
    ctx.beginPath(); ctx.moveTo(18, 8); ctx.lineTo(10, 24); ctx.lineTo(22, 22); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(28, 8); ctx.lineTo(22, 24); ctx.lineTo(34, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff9e59";
    ctx.beginPath();
    ctx.moveTo(24, 14); ctx.lineTo(40, 26); ctx.lineTo(35, 54); ctx.lineTo(20, 60); ctx.lineTo(7, 48); ctx.lineTo(10, 24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#f28c41"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(19, 27); ctx.lineTo(31, 29); ctx.moveTo(17, 36); ctx.lineTo(29, 38); ctx.stroke();
    drawFace(24, 34, "angry");
    drawTinyFeet(14, 33, 56);
  }

  function drawCuteTomato() {
    drawEnemyBaseShadow(44);
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath(); ctx.arc(26, 34, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6dcf75";
    ctx.beginPath();
    ctx.moveTo(26, 8); ctx.lineTo(20, 17); ctx.lineTo(26, 15); ctx.lineTo(32, 17); ctx.lineTo(29, 10); ctx.lineTo(36, 14);
    ctx.lineTo(32, 20); ctx.lineTo(26, 18); ctx.lineTo(20, 20); ctx.lineTo(16, 14); ctx.closePath(); ctx.fill();
    drawFace(26, 34, "angry");
    drawTinyFeet(15, 36, 54);
  }

  function drawCuteBroccoli() {
    drawEnemyBaseShadow(46);
    ctx.fillStyle = "#7fd56d";
    for (const [cx, cy, r] of [[17,20,14],[31,16,13],[43,22,12],[24,28,15],[37,29,14]]) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#82c79d";
    roundRect(19, 30, 18, 26, 8, true, false);
    drawFace(28, 33, "angry");
    drawTinyFeet(22, 36, 56);
  }

  function drawCuteEggplant() {
    drawEnemyBaseShadow(44);
    ctx.fillStyle = "#8e69d8";
    ctx.beginPath();
    ctx.moveTo(22, 12); ctx.quadraticCurveTo(43, 16, 40, 42); ctx.quadraticCurveTo(38, 60, 22, 59);
    ctx.quadraticCurveTo(10, 58, 9, 44); ctx.quadraticCurveTo(9, 22, 22, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#6ac877";
    ctx.beginPath();
    ctx.moveTo(19, 8); ctx.lineTo(28, 8); ctx.lineTo(31, 15); ctx.lineTo(23, 18); ctx.lineTo(15, 15); ctx.closePath(); ctx.fill();
    drawFace(24, 34, "angry");
    drawTinyFeet(16, 31, 56);
  }

  function drawCuteZombie() {
    drawEnemyBaseShadow(50);
    ctx.fillStyle = "#95d39a";
    roundRect(14, 6, 28, 26, 9, true, false);
    ctx.fillStyle = "#4a556e";
    roundRect(12, 28, 30, 22, 8, true, false);
    ctx.fillStyle = "#6e5976";
    roundRect(7, 22, 10, 18, 5, true, false);
    roundRect(39, 28, 10, 18, 5, true, false);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(23, 18, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(34, 18, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#453d56";
    ctx.beginPath(); ctx.arc(22, 19, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(35, 17, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#453d56"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(22, 27); ctx.lineTo(34, 28); ctx.stroke();
    drawTinyFeet(19, 34, 50);
  }

  function drawCuteGhost() {
    drawEnemyBaseShadow(48);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(9, 32);
    ctx.quadraticCurveTo(10, 6, 30, 6);
    ctx.quadraticCurveTo(50, 6, 51, 30);
    ctx.lineTo(51, 48);
    ctx.quadraticCurveTo(44, 42, 38, 48);
    ctx.quadraticCurveTo(31, 42, 24, 48);
    ctx.quadraticCurveTo(17, 42, 9, 48);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#dae2f2"; ctx.lineWidth = 2; ctx.stroke();
    drawFace(30, 27, "boo");
    ctx.fillStyle = "#6d5fa2";
    ctx.fillRect(16, 4, 8, 8);
    ctx.fillRect(24, 0, 13, 12);
  }

  function drawParticles() {
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 3));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // レインボー紅茶の「+50」表示
    for (const t of game.popTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life * 2.5));
      ctx.font = `900 ${t.big ? 36 : 26}px 'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.strokeText(t.text, t.x, t.y);
      const grad = ctx.createLinearGradient(t.x - 30, 0, t.x + 30, 0);
      ["#ff6b8b", "#ffb86b", "#e6c21f", "#4fc86a", "#3fa9f5", "#9b6bff"].forEach((c, i, arr) => grad.addColorStop(i / (arr.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
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
    els.menuNameForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const result = validateUsername(els.menuUsernameInput?.value || "");
      if (!result.ok) {
        setMenuNameStatus(result.message, "error");
        return;
      }

      if (!els.menuNameSave) return;
      const originalLabel = els.menuNameSave.textContent;
      els.menuNameSave.disabled = true;
      els.menuNameSave.textContent = "保存中...";
      try {
        await loginWithUsername(result.username);
      } catch (error) {
        setMenuNameStatus(error instanceof Error ? error.message : String(error), "error");
      } finally {
        els.menuNameSave.disabled = false;
        els.menuNameSave.textContent = originalLabel;
      }
    });

    els.homeButton?.addEventListener("click", goHome);
    els.startButton.addEventListener("click", startRun);
  els.upgradeConfirm?.addEventListener("click", () => {
    if (!pendingUpgradeChoice || !pendingUpgradeCard) return;
    chooseUpgrade(pendingUpgradeChoice, pendingUpgradeCard);
  });
    els.refreshRanking.addEventListener("click", refreshLeaderboard);
    window.addEventListener("resize", syncRankingHeight);
    if (window.ResizeObserver && els.gameFrame) {
      const rankingHeightObserver = new ResizeObserver(syncRankingHeight);
      rankingHeightObserver.observe(els.gameFrame);
    }

    document.querySelectorAll(".keybind-button").forEach((button) => {
      button.addEventListener("click", () => {
        listeningBind = { action: button.dataset.action, slot: Number(button.dataset.slot) };
        els.keybindStatus.textContent = "割り当てたいキーを押してください。Escでキャンセル。";
        renderKeybinds();
      });
    });
    els.resetKeybinds.addEventListener("click", resetKeybindsToDefault);
    document.getElementById("sound-toggle")?.addEventListener("click", (event) => {
      setSoundEnabled(!sound.enabled);
      event.currentTarget.blur();
    });
    const bgmSlider = document.getElementById("bgm-volume");
    bgmSlider?.addEventListener("input", (event) => {
      setBgmVolume(Number(event.currentTarget.value) / 100);
      previewBgm();
    });
    bgmSlider?.addEventListener("change", (event) => event.currentTarget.blur());
    renderSoundToggle();
    renderBgmVolume();

    window.addEventListener("keydown", (event) => {
      if (listeningBind) {
        event.preventDefault();
        event.stopPropagation();
        clearKeyboardState();
        if (event.code === "Escape") {
          listeningBind = null;
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          els.keybindStatus.textContent = "キー設定をキャンセルしました。";
          renderKeybinds();
          return;
        }
        if (["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(event.code)) {
          els.keybindStatus.textContent = "Shift / Ctrl / Alt / Command単独は設定できません。別のキーを押してください。";
          return;
        }
        assignKey(listeningBind.action, listeningBind.slot, event.code);
        return;
      }

      // Menu/result: Space starts or retries immediately.
      if (!event.repeat && event.code === "Space" && !els.startOverlay.classList.contains("hidden")) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
          event.preventDefault();
          if (!els.startButton.disabled) els.startButton.click();
          return;
        }
      }

      // Ability selection: left-to-right keys are Q/W/E or 1/2/3 by default.
      // Numpad 1/2/3 are treated as aliases for 1/2/3.
      if (game.phase === "upgrade" && !event.repeat) {
        const upgradeIndex = getUpgradeIndexForCode(event.code);
        if (upgradeIndex >= 0) {
          event.preventDefault();
          chooseUpgradeByIndex(upgradeIndex);
          return;
        }
        if ((event.code === "Space" || event.code === "Enter") && pendingUpgradeChoice && pendingUpgradeCard) {
          event.preventDefault();
          chooseUpgrade(pendingUpgradeChoice, pendingUpgradeCard);
          return;
        }
      }

      const allBoundCodes = Object.values(keybinds).flat().filter(Boolean);
      if (allBoundCodes.includes(event.code)) event.preventDefault();

      pressedKeys.add(event.code);

      if (keybinds.jump.includes(event.code) && !event.repeat) {
        jump();
      }
      if (keybinds.duck.includes(event.code)) {
        syncDuckFromPressedKeys();
      }
    }, { passive: false });

    window.addEventListener("keyup", (event) => {
      pressedKeys.delete(event.code);
      if (keybinds.duck.includes(event.code)) {
        syncDuckFromPressedKeys();
      }
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

    // Smartphone swipe controls: swipe up = jump, swipe down = crouch.
    // A plain tap does nothing so it does not accidentally trigger a jump.
    const swipeState = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      startTime: 0
    };
    let mobileDuckTimer = null;

    const resetSwipeState = () => {
      swipeState.active = false;
      swipeState.pointerId = null;
    };

    const triggerMobileDuck = () => {
      if (mobileDuckTimer) clearTimeout(mobileDuckTimer);
      setDuck(true);
      mobileDuckTimer = setTimeout(() => {
        setDuck(false);
        mobileDuckTimer = null;
      }, 650);
    };

    els.canvas.addEventListener("pointerdown", (event) => {
      if (!window.matchMedia("(pointer: coarse)").matches || game.phase !== "playing") return;
      if (event.pointerType === "mouse") return;
      event.preventDefault();
      swipeState.active = true;
      swipeState.pointerId = event.pointerId;
      swipeState.startX = event.clientX;
      swipeState.startY = event.clientY;
      swipeState.startTime = performance.now();
      try { els.canvas.setPointerCapture(event.pointerId); } catch (_) {}
    }, { passive: false });

    els.canvas.addEventListener("pointerup", (event) => {
      if (!swipeState.active || event.pointerId !== swipeState.pointerId) return;
      event.preventDefault();

      const dx = event.clientX - swipeState.startX;
      const dy = event.clientY - swipeState.startY;
      const elapsed = performance.now() - swipeState.startTime;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Require a clear vertical flick: at least 42 px, mostly vertical, within 700 ms.
      if (absY >= 42 && absY > absX * 1.25 && elapsed <= 700 && game.phase === "playing") {
        if (dy < 0) {
          jump();
        } else {
          triggerMobileDuck();
        }
      }

      resetSwipeState();
      try { els.canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    }, { passive: false });

    els.canvas.addEventListener("pointercancel", (event) => {
      if (event.pointerId === swipeState.pointerId) resetSwipeState();
    });

    window.addEventListener("blur", () => {
      clearKeyboardState();
      resetSwipeState();
      if (mobileDuckTimer) {
        clearTimeout(mobileDuckTimer);
        mobileDuckTimer = null;
      }
      setDuck(false);
    });
    window.addEventListener("pagehide", () => {
      clearKeyboardState();
      resetSwipeState();
      if (mobileDuckTimer) { clearTimeout(mobileDuckTimer); mobileDuckTimer = null; }
      setDuck(false);
    });
    document.addEventListener("visibilitychange", () => {
      if (sound.ctx) {
        if (document.hidden) sound.ctx.suspend().catch(() => {});
        else if (sound.enabled) sound.ctx.resume().catch(() => {});
      }
      if (document.hidden) {
        clearKeyboardState();
        resetSwipeState();
        if (mobileDuckTimer) { clearTimeout(mobileDuckTimer); mobileDuckTimer = null; }
        setDuck(false);
      }
    });
  }

  async function boot() {
    showLoadingScreen("画像を読み込んでいます…");

    // イベントは先に登録する。素材の読み込みが失敗してもログイン画面が無反応にならないようにする。
    resetGame();
    renderKeybinds();
    bindEvents();

    await ensureBootAssets();
    setBootStatus("ゲームを準備しています…");
    const offlineName = localStorage.getItem("hoge-run-offline-name");
    if (offlineName) currentUsername = offlineName;
    syncUsernameUi();

    setBootStatus("ランキング機能を確認しています…");
    try {
      await withTimeout(initializeOnline(), 10000, "ランキング接続");
    } catch (error) {
      console.warn("Online initialization skipped:", error);
      setMenuNameStatus("オンライン接続に時間がかかっています。オフラインのままでも遊べます。", "muted");
    }

    enterGameScreen();

    // Canvasを完成状態で1回描画してから画面を公開する。
    draw();
    revealApp();
    requestAnimationFrame(tick);
  }

  boot().catch((error) => {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    setBootStatus(`読み込みエラー: ${message}`);
    if (els.bootSplash) els.bootSplash.classList.add("boot-error");
    window.setTimeout(() => {
      revealApp();
      setMenuNameStatus(`一部素材の読み込みに失敗しました: ${message}`, "error");
    }, 1800);
  });
})();
