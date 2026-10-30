class BrainJuiceAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 爽快レーザー射撃音
  playShoot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // ドパガキ撃破・破裂音
  playPop(multiplier = 1) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // ピッチをコンボによって少し上げる
    const baseFreq = Math.min(220 + multiplier * 25, 900);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    // ノイズも混ぜて爆発感を増す
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.12);
    noise.stop(now + 0.08);
  }

  // パチンコ風「ピロピロピロピロ〜ン！」確定音（脳汁大量分泌）
  playJackpot() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, index) => {
      const now = this.ctx.currentTime + index * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    });
  }

  // FEVER突入ファンファーレ
  playFeverStart() {
    if (!this.ctx) return;
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach(freq => {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.4);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  // 被弾音
  playHit() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.3);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

const sound = new BrainJuiceAudio();

// ==========================================
// ゲームエンジン & ドパガキ演出
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('gameWrapper');
const feverBg = document.getElementById('feverBg');
const scoreText = document.getElementById('scoreText');
const comboBadge = document.getElementById('comboBadge');
const comboText = document.getElementById('comboText');
const livesContainer = document.getElementById('livesContainer');
const dopamineBar = document.getElementById('dopamineBar');
const gaugePct = document.getElementById('gaugePct');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const feverCutIn = document.getElementById('feverCutIn');
const cutInInner = document.getElementById('cutInInner');

let width = 0;
let height = 0;

function resize() {
  const rect = wrapper.getBoundingClientRect();
  width = canvas.width = rect.width;
  height = canvas.height = rect.height;
}
window.addEventListener('resize', resize);

// ゲーム状態
let isPlaying = false;
let score = 0;
let combo = 0;
let comboTimer = 0;
let lives = 3;
let dopamine = 0;
let isFever = false;
let feverTime = 0;
let shakeIntensity = 0;
let frameCount = 0;

// 自機
const player = {
  x: 0,
  y: 0,
  w: 46,
  h: 30,
  speed: 7,
  isMovingLeft: false,
  isMovingRight: false,
  shootCooldown: 0
};

// エンティティ群
let bullets = [];
let enemyBullets = [];
let invaders = [];
let particles = [];
let floatingTexts = [];

// キラキラテキスト一覧（ドパガキ専用スラング＆快楽ワード）
const DOPAMINE_WORDS = [
  "脳汁ドバッ!!", "脳漿炸裂!!", "脳イキ確定!!", "神の連撃!!",
  "全ツッパ!!", "極上快感!!", "ぶっ飛びィ!!", "確変昇天!!",
  "超絶気持ちイイ!!", "完全勝利!!"
];

// インベーダー生成
function createInvaders() {
  invaders = [];
  const rows = 4;
  const cols = Math.min(8, Math.floor(width / 50));
  const startX = (width - cols * 44) / 2;
  const startY = 50;

  const types = [
    { emoji: '👾', pts: 100, hp: 1, color: '#ff0055' },
    { emoji: '💀', pts: 150, hp: 1, color: '#ffdd00' },
    { emoji: '🤡', pts: 200, hp: 2, color: '#00ffcc' },
    { emoji: '👹', pts: 350, hp: 3, color: '#ff3300' }
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = types[r % types.length];
      invaders.push({
        x: startX + c * 44,
        y: startY + r * 42,
        w: 32,
        h: 32,
        emoji: type.emoji,
        pts: type.pts,
        hp: type.hp,
        maxHp: type.hp,
        color: type.color,
        bobOffset: Math.random() * Math.PI * 2
      });
    }
  }
}

let invaderDir = 1;
let invaderSpeed = 1.2;

// 破片パーティクル発生
function spawnParticles(x, y, color, count = 20, isBig = false) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = (Math.random() * 6 + 2) * (isBig ? 1.8 : 1);
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - (isBig ? 3 : 1),
      size: Math.random() * 5 + 3,
      color: color || `hsl(${Math.random() * 360}, 100%, 65%)`,
      life: 1.0,
      decay: Math.random() * 0.03 + 0.02,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.2
    });
  }
}

// ド派手ポップアップテキスト
function addFloatingText(text, x, y, size = 18, color = '#ffea00') {
  floatingTexts.push({
    text: text,
    x: x,
    y: y,
    size: size,
    color: color,
    alpha: 1.0,
    vy: -2.2,
    scale: 1.6
  });
}

// 画面揺れ発動
function triggerShake(amt) {
  shakeIntensity = Math.min(shakeIntensity + amt, 25);
}

// 脳汁フィーバー発動
function activateFever() {
  if (isFever) return;
  isFever = true;
  feverTime = 380; // 約6秒
  dopamine = 100;
  sound.playFeverStart();
  sound.playJackpot();
  triggerShake(20);

  // カットイン演出
  feverCutIn.classList.remove('opacity-0');
  cutInInner.classList.remove('scale-50');
  cutInInner.classList.add('scale-110');
  
  setTimeout(() => {
    feverCutIn.classList.add('opacity-0');
    cutInInner.classList.remove('scale-110');
    cutInInner.classList.add('scale-50');
  }, 700);

  // 背景と枠のネオン点滅
  feverBg.style.opacity = '0.35';
  wrapper.classList.add('fever-border');
}

function endFever() {
  isFever = false;
  dopamine = 0;
  feverBg.style.opacity = '0';
  wrapper.classList.remove('fever-border');
}

// ショット発射
function shootBullet() {
  if (!isPlaying) return;
  sound.playShoot();

  if (isFever) {
    // FEVER時: 脳汁5方向スプレッド弾 + 超連射
    for (let angle = -24; angle <= 24; angle += 12) {
      const rad = (angle * Math.PI) / 180;
      bullets.push({
        x: player.x,
        y: player.y - 15,
        vx: Math.sin(rad) * 14,
        vy: -Math.cos(rad) * 14,
        w: 8,
        h: 18,
        rainbow: true,
        fever: true
      });
    }
  } else {
    // 通常時: 2連ツイン極太弾
    bullets.push({
      x: player.x - 12,
      y: player.y - 12,
      vx: 0,
      vy: -11,
      w: 5,
      h: 15,
      color: '#00ffff'
    });
    bullets.push({
      x: player.x + 12,
      y: player.y - 12,
      vx: 0,
      vy: -11,
      w: 5,
      h: 15,
      color: '#ff00aa'
    });
  }
}

// ゲームリセット / スタート
function startGame() {
  sound.init();
  resize();
  isPlaying = true;
  score = 0;
  combo = 0;
  lives = 3;
  dopamine = 0;
  isFever = false;
  bullets = [];
  enemyBullets = [];
  particles = [];
  floatingTexts = [];
  player.x = width / 2;
  player.y = height - 50;

  createInvaders();
  startScreen.classList.add('hidden');
  updateUI();
}

function gameOver() {
  isPlaying = false;
  startScreen.classList.remove('hidden');
  startScreen.innerHTML = `
    <h2 class="text-4xl md:text-5xl font-black text-red-500 drop-shadow-[0_0_20px_#ff0000] animate-bounce">
      昇 天 終 了
    </h2>
    <div class="my-2 bg-purple-950/90 p-4 rounded-2xl border-2 border-yellow-400">
      <p class="text-xs text-yellow-300 font-bold">獲得した脳汁ポイント</p>
      <p class="text-3xl font-black text-yellow-400">${score.toLocaleString()}</p>
    </div>
    <button id="restartBtn" class="mt-4 px-10 py-4 bg-gradient-to-r from-pink-600 via-purple-600 to-yellow-500 rounded-full text-2xl font-black glow-btn border-2 border-yellow-300 text-white cursor-pointer">
      もう一発キメる (RETRY)
    </button>
  `;
  document.getElementById('restartBtn').addEventListener('click', startGame);
}

function updateUI() {
  scoreText.innerText = score.toLocaleString();
  livesContainer.innerHTML = '❤️'.repeat(Math.max(0, lives));
  
  gaugePct.innerText = Math.floor(dopamine);
  dopamineBar.style.width = `${Math.min(100, dopamine)}%`;

  if (combo > 1) {
    comboBadge.classList.remove('hidden');
    comboText.innerText = combo;
  } else {
    comboBadge.classList.add('hidden');
  }
}

// ==========================================
// メインアップデート＆描画ループ
// ==========================================
function update() {
  frameCount++;

  // 画面シェイク減衰
  if (shakeIntensity > 0) {
    shakeIntensity *= 0.9;
    if (shakeIntensity < 0.2) shakeIntensity = 0;
  }

  if (!isPlaying) return;

  // 自機移動
  if (player.isMovingLeft && player.x - player.w / 2 > 10) {
    player.x -= player.speed;
  }
  if (player.isMovingRight && player.x + player.w / 2 < width - 10) {
    player.x += player.speed;
  }

  // 自動連射 (FEVER時は超絶ガトリング)
  const fireInterval = isFever ? 4 : 10;
  player.shootCooldown++;
  if (player.shootCooldown >= fireInterval) {
    shootBullet();
    player.shootCooldown = 0;
  }

  // FEVERカウントダウン
  if (isFever) {
    feverTime--;
    dopamine = (feverTime / 380) * 100;
    if (feverTime <= 0) {
      endFever();
    }
  }

  // コンボタイマー減衰
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer <= 0) {
      combo = 0;
      updateUI();
    }
  }

  // 弾の更新
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    // 弾の軌跡パーティクル（脳汁キラキラ）
    if (Math.random() > 0.4) {
      particles.push({
        x: b.x,
        y: b.y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        color: b.rainbow ? `hsl(${frameCount * 15 % 360}, 100%, 70%)` : '#00ffff',
        life: 0.5,
        decay: 0.08,
        shape: 'circle',
        rotation: 0,
        vRot: 0
      });
    }

    // 画面外
    if (b.y < -20 || b.x < -20 || b.x > width + 20) {
      bullets.splice(i, 1);
    }
  }

  // 敵弾更新
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    eb.y += eb.vy;

    // 自機との当たり判定
    const dist = Math.hypot(eb.x - player.x, eb.y - player.y);
    if (dist < player.w / 2 + 5) {
      enemyBullets.splice(i, 1);
      lives--;
      triggerShake(16);
      sound.playHit();
      spawnParticles(player.x, player.y, '#ff0055', 30, true);
      addFloatingText("痛恨被弾!!", player.x, player.y - 20, 22, "#ff0033");
      updateUI();
      if (lives <= 0) {
        gameOver();
        return;
      }
      continue;
    }

    if (eb.y > height + 20) {
      enemyBullets.splice(i, 1);
    }
  }

  // インベーダー移動ロジック
  let hitEdge = false;
  invaders.forEach(inv => {
    inv.x += invaderDir * invaderSpeed;
    if (inv.x < 15 || inv.x > width - 45) {
      hitEdge = true;
    }

    // たまに敵弾発射
    if (Math.random() < 0.003 && !isFever) {
      enemyBullets.push({
        x: inv.x + inv.w / 2,
        y: inv.y + inv.h,
        vy: 4.5
      });
    }
  });

  if (hitEdge) {
    invaderDir *= -1;
    invaders.forEach(inv => {
      inv.y += 14;
      // 最前線突破チェック
      if (inv.y + inv.h >= player.y - 10) {
        gameOver();
      }
    });
    invaderSpeed = Math.min(invaderSpeed + 0.15, 6.0);
  }

  // 弾とインベーダーの衝突
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ii = invaders.length - 1; ii >= 0; ii--) {
      const inv = invaders[ii];
      if (
        b.x > inv.x &&
        b.x < inv.x + inv.w &&
        b.y > inv.y &&
        b.y < inv.y + inv.h
      ) {
        bullets.splice(bi, 1);
        inv.hp--;

        if (inv.hp <= 0) {
          // 撃破演出
          combo++;
          comboTimer = 75; // 約1.2秒キープ
          const ptsAdded = inv.pts * (1 + Math.floor(combo / 5)) * (isFever ? 3 : 1);
          score += ptsAdded;

          // 脳汁ゲージチャージ
          if (!isFever) {
            dopamine = Math.min(100, dopamine + 6.5);
            if (dopamine >= 100) {
              activateFever();
            }
          }

          // SE & 画面揺れ
          sound.playPop(combo);
          triggerShake(isFever ? 9 : 4);

          // 派手なパーティクル爆散
          spawnParticles(inv.x + inv.w / 2, inv.y + inv.h / 2, inv.color, isFever ? 35 : 18, isFever);

          // 脳汁ワード浮遊演出
          if (combo % 3 === 0 || isFever) {
            const word = DOPAMINE_WORDS[Math.floor(Math.random() * DOPAMINE_WORDS.length)];
            addFloatingText(word, inv.x, inv.y - 10, 20, isFever ? '#ff00ff' : '#00ffff');
          } else {
            addFloatingText(`+${ptsAdded}`, inv.x, inv.y, 16, '#ffe600');
          }

          invaders.splice(ii, 1);
          updateUI();

          // 全滅したら即座に次ウェーブ召喚（無限ループ）
          if (invaders.length === 0) {
            sound.playJackpot();
            addFloatingText("WAVE CLEAR 脳汁全開!!", width / 2 - 100, height / 2, 28, '#00ff88');
            invaderSpeed += 0.8;
            createInvaders();
          }
        } else {
          // 被弾フラッシュ
          spawnParticles(inv.x + inv.w / 2, inv.y + inv.h / 2, '#ffffff', 5);
        }
        break;
      }
    }
  }

  // パーティクル更新
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vRot;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // フローティングテキスト更新
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.scale = Math.max(1, ft.scale * 0.94);
    ft.alpha -= 0.02;
    if (ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}

function draw() {
  ctx.save();

  // 画面シェイク適用
  if (shakeIntensity > 0) {
    const ox = (Math.random() - 0.5) * shakeIntensity * 2;
    const oy = (Math.random() - 0.5) * shakeIntensity * 2;
    ctx.translate(ox, oy);
  }

  // 画面クリア（残像トレイル）
  ctx.fillStyle = isFever ? 'rgba(25, 0, 45, 0.4)' : 'rgba(5, 0, 15, 0.45)';
  ctx.fillRect(-20, -20, width + 40, height + 40);

  // グリッドネオン（サイバー感）
  ctx.strokeStyle = isFever ? 'rgba(255, 0, 128, 0.15)' : 'rgba(0, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const step = 40;
  const offset = (frameCount * 1.5) % step;
  for (let y = offset; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // インベーダー描画
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  invaders.forEach(inv => {
    const bob = Math.sin(frameCount * 0.1 + inv.bobOffset) * 3;
    
    // 背後オーラ
    ctx.fillStyle = inv.color;
    ctx.beginPath();
    ctx.arc(inv.x + inv.w / 2, inv.y + inv.h / 2 + bob, 18, 0, Math.PI * 2);
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 絵文字キャラクター
    ctx.font = '26px sans-serif';
    ctx.fillText(inv.emoji, inv.x + inv.w / 2, inv.y + inv.h / 2 + bob);

    // ボス格HPゲージ
    if (inv.maxHp > 1) {
      const barW = 28;
      const curW = (inv.hp / inv.maxHp) * barW;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(inv.x + (inv.w - barW) / 2, inv.y - 6 + bob, barW, 4);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(inv.x + (inv.w - barW) / 2, inv.y - 6 + bob, curW, 4);
    }
  });

  // 敵弾描画（トゲトゲの魔力弾）
  enemyBullets.forEach(eb => {
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // 自機描画（スーパーネオン戦闘機）
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowColor = isFever ? '#ffff00' : '#00ffff';
  ctx.shadowBlur = 20;

  // 宇宙船ボディ
  const pColor = isFever ? `hsl(${frameCount * 20 % 360}, 100%, 60%)` : '#00ffff';
  ctx.fillStyle = pColor;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(player.w / 2, 14);
  ctx.lineTo(player.w / 4, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(-player.w / 4, 8);
  ctx.lineTo(-player.w / 2, 14);
  ctx.closePath();
  ctx.fill();

  // コックピット
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, -2, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // スラスター噴射
  const thrust = Math.random() * 8 + 8;
  ctx.fillStyle = isFever ? '#ff00bb' : '#ff9900';
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(0, 10 + thrust);
  ctx.lineTo(8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 弾描画（極太レーザー & 虹色バースト）
  bullets.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.rainbow) {
      const hue = (frameCount * 25) % 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
      ctx.shadowColor = `hsl(${hue}, 100%, 75%)`;
      ctx.shadowBlur = 15;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    } else {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    }
    ctx.restore();
  });

  // パーティクル描画
  particles.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
  });

  // フローティング脳汁テキスト
  floatingTexts.forEach(ft => {
    ctx.save();
    ctx.translate(ft.x, ft.y);
    ctx.scale(ft.scale, ft.scale);
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = `900 ${ft.size}px 'Mochiy Pop One', sans-serif`;
    ctx.fillStyle = ft.color;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.strokeText(ft.text, 0, 0);
    ctx.fillText(ft.text, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ==========================================
// 入力・タッチイベント管理
// ==========================================
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') player.isMovingLeft = true;
  if (e.key === 'ArrowRight' || e.key === 'd') player.isMovingRight = true;
  if (e.key === ' ' || e.key === 'z') shootBullet();
});

window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') player.isMovingLeft = false;
  if (e.key === 'ArrowRight' || e.key === 'd') player.isMovingRight = false;
});

// モバイル用ボタン
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const shotBtn = document.getElementById('shotBtn');

const bindTouch = (elem, onPress, onRelease) => {
  elem.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); });
  elem.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); });
  elem.addEventListener('mousedown', onPress);
  elem.addEventListener('mouseup', onRelease);
  elem.addEventListener('mouseleave', onRelease);
};

bindTouch(leftBtn, () => player.isMovingLeft = true, () => player.isMovingLeft = false);
bindTouch(rightBtn, () => player.isMovingRight = true, () => player.isMovingRight = false);
bindTouch(shotBtn, () => shootBullet(), () => {});

// キャンバス上のスワイプ / ドラッグによる直感移動
let isDragging = false;
function handlePointerMove(clientX) {
  if (!isPlaying) return;
  const rect = canvas.getBoundingClientRect();
  const relativeX = clientX - rect.left;
  player.x = Math.max(player.w / 2, Math.min(width - player.w / 2, relativeX));
}

canvas.addEventListener('mousedown', (e) => { isDragging = true; handlePointerMove(e.clientX); });
window.addEventListener('mousemove', (e) => { if (isDragging) handlePointerMove(e.clientX); });
window.addEventListener('mouseup', () => { isDragging = false; });

canvas.addEventListener('touchstart', (e) => {
  isDragging = true;
  if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (isDragging && e.touches[0]) {
    handlePointerMove(e.touches[0].clientX);
  }
}, { passive: false });

window.addEventListener('touchend', () => { isDragging = false; });

startBtn.addEventListener('click', startGame);

window.onload = function () {
  resize();
  gameLoop();
};
