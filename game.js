// ============================================================
// СТЕНА ВОРОНА — dark fantasy tower defense
// Ванильный JS, Canvas API, Web Audio API. Без внешних ассетов.
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // пиксельная чёткость

const W = canvas.width;   // 480
const H = canvas.height;  // 720
const WALL_Y = 160;       // линия стены — орки идут к этой высоте
const SIDE_MARGIN = 52;   // ширина полосы с деревьями по бокам
const FIRE_COOLDOWN = 0.85; // сек между выстрелами лучника

// ------------------------------------------------------------
// gameState — единый источник истины
// ------------------------------------------------------------
const gameState = {
  screen: 'menu', // menu | playing | paused | settings | about | gameover
  wallHP: 100,
  wallMaxHP: 100,
  score: 0,
  wave: 1,
  orcs: [],
  projectiles: [],
  particles: [],
  betweenWaves: false,
  waveMessageTimer: 0,
  soundOn: true,
};

let waveManager = null;
let lastTime = 0;

// ============================================================
// ЗВУК — процедурный, без файлов (Web Audio API)
// ============================================================
const SoundEngine = {
  ctx: null,
  master: null,
  ready: false,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = gameState.soundOn ? 0.55 : 0;
    this.master.connect(this.ctx.destination);
    this.startAmbience();
    this.ready = true;
  },
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  setEnabled(on) {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  },
  noiseBuffer(duration) {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.max(1, sr * duration), sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  },
  playShoot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.11);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g).connect(this.master);
    osc.start(t); osc.stop(t + 0.15);
  },
  playHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.08);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
  },
  playDeath() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.35);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g).connect(this.master);
    osc.start(t); osc.stop(t + 0.42);
  },
  playWallHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.42, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g).connect(this.master);
    osc.start(t); osc.stop(t + 0.32);
  },
  playThunder() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(1.5);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 260;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
  },
  playClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(g).connect(this.master);
    osc.start(t); osc.stop(t + 0.06);
  },
  startAmbience() {
    // фоновый гул ветра/дождя, тихий и зацикленный
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2);
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(bp).connect(g).connect(this.master);
    src.start();
  }
};

function unlockAudioOnce() {
  SoundEngine.init();
  SoundEngine.resume();
  document.removeEventListener('pointerdown', unlockAudioOnce);
}
document.addEventListener('pointerdown', unlockAudioOnce);

// ============================================================
// ПИКСЕЛЬ-АРТ: спрайты через офскрин-канвас без сглаживания
// ============================================================
function makeSprite(pixelMap, palette, scale) {
  const rows = pixelMap.length;
  const cols = pixelMap[0].length;
  const off = document.createElement('canvas');
  off.width = cols; off.height = rows;
  const octx = off.getContext('2d');
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const code = pixelMap[y][x];
      if (code !== '.' && palette[code]) {
        octx.fillStyle = palette[code];
        octx.fillRect(x, y, 1, 1);
      }
    }
  }
  return { canvas: off, w: cols * scale, h: rows * scale };
}
function drawSprite(sprite, x, y) {
  ctx.drawImage(sprite.canvas, x - sprite.w / 2, y - sprite.h / 2, sprite.w, sprite.h);
}

// --- Лучник: капюшон, плащ, лук, колчан (14x16) ---
const ARCHER_MAP = [
  ".....hhhh.....",
  "....hHHHHh....",
  "....HffffH....",
  "....HffffH....",
  ".....Hffh.....",
  "......hh......",
  "....cCCCCc....",
  "...cCCCCCCc...",
  "b..cCCCCCCc..a",
  "bs.cCCCCCCc..a",
  "b..cCCCCCCc...",
  "....cCCCCc....",
  ".....cCCc.....",
  ".....lCCl.....",
  ".....l..l.....",
  "....ll..ll....",
];
const ARCHER_PALETTE = {
  h: '#232733', H: '#343a49', f: '#c9a876',
  c: '#17311f', C: '#25452f',
  b: '#6b3a2a', s: '#d8c48a', l: '#20160c', a: '#8a6a3a',
};
const archerSprite = makeSprite(ARCHER_MAP, ARCHER_PALETTE, 3.4);

// --- Орк: клыки, доспех, топор (14x16), обычный и "раненый" (красная вспышка) ---
const ORC_MAP = [
  "....gggggg....",
  "...gGGGGGGg...",
  "..gGe.tt.eGg..",
  "..gG.tttt.Gg..",
  "...gGGGGGGg...",
  "....gGGGGg....",
  "...aAAAAAAa...",
  "..aAAAAAAAAa..",
  "w.aAAAAAAAAa..",
  "w.aAAAAAAAAa.x",
  "x.aAAAAAAAAa.x",
  "..aAAAAAAAAa..",
  "...aAAAAAAa...",
  "....a....a....",
  "....k....k....",
  "...kk....kk...",
];
const ORC_PALETTE = {
  g: '#2f4a2a', G: '#3f6a38', e: '#e23c2c', t: '#e8e0c8',
  a: '#332d26', A: '#4a4234', w: '#5a3a22', x: '#9a9a9a', k: '#100e0a',
};
const ORC_PALETTE_HURT = {
  g: '#7a2a24', G: '#9a3a2c', e: '#fff2a0', t: '#fff2e0',
  a: '#5a2420', A: '#7a3428', w: '#5a3a22', x: '#e8c8c8', k: '#100e0a',
};
const orcSpriteNormal = makeSprite(ORC_MAP, ORC_PALETTE, 2.6);
const orcSpriteHurt = makeSprite(ORC_MAP, ORC_PALETTE_HURT, 2.6);

// --- Стрела ---
const ARROW_MAP = [
  "..k..",
  ".kkk.",
  "ssssk",
  ".kkk.",
  "..k..",
];
const ARROW_PALETTE = { k: '#e8d9b0', s: '#6b3a2a' };
const arrowSprite = makeSprite(ARROW_MAP, ARROW_PALETTE, 3);

// ============================================================
// ДЕКОР МЕСТНОСТИ — вычисляется один раз при загрузке
// ============================================================
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rnd = seededRandom(1337);

// травяные спеклы (текстура земли)
const grassSpecks = [];
for (let i = 0; i < 260; i++) {
  grassSpecks.push({
    x: rnd() * W,
    y: WALL_Y + rnd() * (H - WALL_Y),
    size: rnd() < 0.5 ? 1 : 2,
    tone: rnd(),
  });
}

// мелкие камни-декорации
const rocks = [];
for (let i = 0; i < 16; i++) {
  const x = SIDE_MARGIN + 20 + rnd() * (W - SIDE_MARGIN * 2 - 40);
  const y = WALL_Y + 40 + rnd() * (H - WALL_Y - 70);
  rocks.push({ x, y, w: 6 + rnd() * 8, h: 4 + rnd() * 5 });
}

// деревья: нижняя линия (откуда идут орки, крупные — для укрытия) + боковые колонны до стены
const trees = [];
for (let x = -10; x < W + 16; x += 17 + rnd() * 5) {
  trees.push({ x, y: H - 2 + rnd() * 10, scale: 1.5 + rnd() * 0.7, row: 'bottom' });
}
for (let side = 0; side < 2; side++) {
  const baseX = side === 0 ? 16 : W - 16;
  for (let y = WALL_Y + 50; y < H - 10; y += 42 + rnd() * 16) {
    const jitter = (rnd() - 0.5) * 10;
    trees.push({ x: baseX + jitter, y, scale: 1.15 + rnd() * 0.5, row: 'side' });
  }
}

function drawTree(t) {
  const s = t.scale;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.scale(s, s);
  // ствол
  ctx.fillStyle = '#150e08';
  ctx.fillRect(-5, -10, 10, 24);
  ctx.fillStyle = 'rgba(60,45,30,0.4)';
  ctx.fillRect(-5, -10, 3, 24);
  // тёмные хвойные ярусы — крупнее и гуще
  for (let i = 0; i < 4; i++) {
    const w = 40 - i * 7;
    const y = -14 - i * 17;
    ctx.fillStyle = i % 2 === 0 ? '#0f1a10' : '#152014';
    ctx.beginPath();
    ctx.moveTo(0, y - 26);
    ctx.lineTo(-w / 2, y);
    ctx.lineTo(w / 2, y);
    ctx.closePath();
    ctx.fill();
  }
  // лёгкая подсветка кроны сбоку (лунный свет)
  ctx.fillStyle = 'rgba(60,80,60,0.25)';
  ctx.beginPath();
  ctx.moveTo(4, -92);
  ctx.lineTo(-6, -20);
  ctx.lineTo(14, -20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}


// ============================================================
// ДОЖДЬ И МОЛНИЯ
// ============================================================
const raindrops = [];
for (let i = 0; i < 140; i++) {
  raindrops.push({
    x: rnd() * (W + 100) - 50,
    y: rnd() * H,
    len: 10 + rnd() * 12,
    speed: 420 + rnd() * 220,
  });
}
let lightning = { flash: 0, timer: 3 + rnd() * 4 };

function updateRain(dt) {
  for (const d of raindrops) {
    d.y += d.speed * dt;
    d.x -= d.speed * 0.18 * dt;
    if (d.y > H) { d.y = -20; d.x = rnd() * (W + 100) - 50; }
  }
  lightning.timer -= dt;
  if (lightning.timer <= 0) {
    lightning.flash = 0.55;
    lightning.timer = 5 + rnd() * 7;
    const delay = 250 + rnd() * 500;
    setTimeout(() => SoundEngine.playThunder(), delay);
  }
  if (lightning.flash > 0) lightning.flash = Math.max(0, lightning.flash - dt * 2.2);
}
function drawRain() {
  ctx.strokeStyle = 'rgba(190,200,220,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of raindrops) {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - 6, d.y + d.len);
  }
  ctx.stroke();
  if (lightning.flash > 0) {
    ctx.fillStyle = `rgba(220,225,255,${lightning.flash * 0.6})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ============================================================
// СУЩНОСТИ
// ============================================================
class Archer {
  constructor() {
    this.x = W / 2;
    this.y = WALL_Y - 26;
    this.cooldown = 0;
  }
  update(dt) { if (this.cooldown > 0) this.cooldown -= dt; }
  canShoot() { return this.cooldown <= 0; }
  shoot(targetX, targetY) {
    this.cooldown = FIRE_COOLDOWN;
    gameState.projectiles.push(new Projectile(this.x, this.y, targetX, targetY));
    SoundEngine.playShoot();
  }
  // отрисовка лучника происходит внутри drawWall() — так он корректно
  // оказывается позади зубцов стены
}

class Orc {
  constructor(wave) {
    const margin = SIDE_MARGIN + 30;
    this.x = margin + Math.random() * (W - margin * 2);
    this.y = H + 20;
    this.speed = 30 + wave * 3.5 + Math.random() * 8;
    this.maxHp = 18 + wave * 6;
    this.hp = this.maxHp;
    this.radius = 15;
    this.hitFlash = 0;
    this.reachedWall = false;
    this.bob = Math.random() * Math.PI * 2;
  }
  update(dt) {
    this.y -= this.speed * dt;
    this.bob += dt * 6;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.y <= WALL_Y + 12 && !this.reachedWall) this.reachedWall = true;
  }
  takeDamage(dmg) {
    this.hp -= dmg;
    this.hitFlash = 0.14;
    if (this.hp > 0) SoundEngine.playHit(); else SoundEngine.playDeath();
  }
  draw() {
    const wob = Math.sin(this.bob) * 1.5;
    const sprite = this.hitFlash > 0 ? orcSpriteHurt : orcSpriteNormal;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 20, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSprite(sprite, this.x + wob, this.y);
    const barW = 28;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(this.x - barW / 2, this.y - 30, barW, 4);
    ctx.fillStyle = '#c0302a';
    ctx.fillRect(this.x - barW / 2, this.y - 30, barW * Math.max(this.hp / this.maxHp, 0), 4);
  }
}

class Projectile {
  constructor(x, y, targetX, targetY) {
    this.x = x; this.y = y;
    const dx = targetX - x, dy = targetY - y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 640;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
    this.angle = Math.atan2(dy, dx);
    this.radius = 5;
    this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20) this.dead = true;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.drawImage(arrowSprite.canvas, -arrowSprite.w / 2, -arrowSprite.h / 2, arrowSprite.w, arrowSprite.h);
    ctx.restore();
  }
}

class Particle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 140;
    this.vy = (Math.random() - 0.5) * 140;
    this.life = 0.35;
  }
  update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; }
  draw() {
    ctx.fillStyle = `rgba(180,30,20,${Math.max(this.life / 0.35, 0)})`;
    ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
  }
}

const archer = new Archer();

// ============================================================
// ФОН: небо, луна, стена, земля, декор, дождь
// ============================================================
let mistOffset = 0;
let sceneTime = 0;
const torchFlicker = { a: 0, b: 0 };

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, WALL_Y + 60);
  sky.addColorStop(0, '#100813');
  sky.addColorStop(0.55, '#1e1024');
  sky.addColorStop(1, '#33141c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, WALL_Y + 60);

  const mx = W - 90, my = 86;
  for (let i = 3; i >= 0; i--) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(180,30,30,${0.06 * (4 - i)})`;
    ctx.arc(mx, my, 46 + i * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.fillStyle = '#c23a2e';
  ctx.arc(mx, my, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.arc(mx - 12, my - 8, 38, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(dt) {
  const grad = ctx.createLinearGradient(0, WALL_Y, 0, H);
  grad.addColorStop(0, '#182417');
  grad.addColorStop(1, '#0c130c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, WALL_Y, W, H - WALL_Y);

  for (const s of grassSpecks) {
    ctx.fillStyle = s.tone > 0.6 ? 'rgba(90,120,80,0.35)' : 'rgba(10,18,10,0.5)';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }

  for (const r of rocks) {
    ctx.fillStyle = '#3a382f';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.w, r.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y + r.h * 0.5, r.w * 0.8, r.h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const path = ctx.createLinearGradient(0, WALL_Y, 0, H);
  path.addColorStop(0, 'rgba(80,70,50,0.10)');
  path.addColorStop(1, 'rgba(80,70,50,0.02)');
  ctx.fillStyle = path;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 30, H);
  ctx.lineTo(W / 2 - 8, WALL_Y + 10);
  ctx.lineTo(W / 2 + 8, WALL_Y + 10);
  ctx.lineTo(W / 2 + 30, H);
  ctx.closePath();
  ctx.fill();

  // боковые деревья — чистый фон, орки в их полосу не заходят (см. SIDE_MARGIN)
  trees.filter(t => t.row === 'side').forEach(drawTree);
}

const CRENEL_TOP = WALL_Y - 40;
const CRENEL_H = 24;
const CRENEL_W = 24;
const TOOTH_W = CRENEL_W * 0.62;

function drawWall(showArcher) {
  // тело стены / боевой ход
  const wallGrad = ctx.createLinearGradient(0, WALL_Y - 20, 0, WALL_Y + 40);
  wallGrad.addColorStop(0, '#3a3a40');
  wallGrad.addColorStop(1, '#1c1c22');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, WALL_Y - 20, W, 60);

  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  const blockW = 28, blockH = 14;
  for (let row = 0, y = WALL_Y - 20; y < WALL_Y + 40; row++, y += blockH) {
    const offset = (row % 2) * (blockW / 2);
    for (let x = -blockW + offset; x < W; x += blockW) {
      ctx.strokeRect(x, y, blockW, blockH);
    }
  }

  // лучник стоит НА боевом ходу, позади зубцов — рисуем до зубцов,
  // чтобы затем они частично перекрыли его нижнюю часть
  if (showArcher) {
    ctx.save();
    if (archer.cooldown > 0) ctx.globalAlpha = 0.75;
    drawSprite(archerSprite, archer.x, archer.y);
    ctx.restore();
  }

  // зубцы стены — с проёмом ровно там, где стоит лучник
  for (let x = -12; x < W; x += CRENEL_W) {
    const toothCenter = x + TOOTH_W / 2;
    if (showArcher && Math.abs(toothCenter - archer.x) < TOOTH_W * 0.8) continue; // проём для лучника
    ctx.fillStyle = '#131318';
    ctx.fillRect(x, CRENEL_TOP, TOOTH_W, CRENEL_H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, CRENEL_TOP, TOOTH_W, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + TOOTH_W - 3, CRENEL_TOP, 3, CRENEL_H);
  }
  // тень основания зубцов на боевом ходу
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, CRENEL_TOP + CRENEL_H, W, 4);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, WALL_Y + 18, W, 6);

  torchFlicker.a = 0.75 + Math.random() * 0.25;
  torchFlicker.b = 0.75 + Math.random() * 0.25;
  drawTorch(24, WALL_Y - 2, torchFlicker.a, sceneTime);
  drawTorch(W - 24, WALL_Y - 2, torchFlicker.b, sceneTime);
}

function drawFlameLayer(x, y, size, color, alpha) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.65, y - size * 0.15, x, y + size * 0.55);
  ctx.quadraticCurveTo(x - size * 0.65, y - size * 0.15, x, y - size);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTorch(x, y, flicker, t) {
  // кованый кронштейн на стене
  ctx.fillStyle = '#1c1410';
  ctx.fillRect(x - 5, y + 16, 10, 8);
  ctx.fillStyle = '#2e2118';
  ctx.fillRect(x - 3, y - 6, 6, 24);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x - 3, y - 6, 2, 24);

  const sway = Math.sin(t * 8 + x * 0.3) * 2.5;

  // мягкое свечение вокруг пламени
  const glowR = 26 * flicker;
  const glow = ctx.createRadialGradient(x, y - 16, 2, x, y - 16, glowR);
  glow.addColorStop(0, `rgba(255,190,90,${0.5 * flicker})`);
  glow.addColorStop(1, 'rgba(255,140,30,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - 16, glowR, 0, Math.PI * 2);
  ctx.fill();

  // многослойное пламя (тёмно-красный -> оранжевый -> жёлтый)
  drawFlameLayer(x + sway, y - 12, 15 * flicker, '#c73a1e', 0.85);
  drawFlameLayer(x + sway * 0.75, y - 17, 12 * flicker, '#ff8a2e', 0.9);
  drawFlameLayer(x + sway * 0.45, y - 21, 8 * flicker, '#ffe08a', 0.95);

  // редкие искры
  for (let i = 0; i < 2; i++) {
    const sparkT = (t * 1.6 + i * 3.7 + x) % 3;
    const sy = y - 20 - sparkT * 16;
    const alpha = Math.max(0, 1 - sparkT / 3);
    ctx.fillStyle = `rgba(255,200,120,${alpha * 0.8})`;
    ctx.fillRect(x + sway + Math.sin(sparkT * 6 + i) * 4, sy, 1.5, 1.5);
  }
}

function drawMist(dt) {
  mistOffset += dt * 10;
  ctx.fillStyle = 'rgba(200,200,220,0.045)';
  for (let i = 0; i < 3; i++) {
    const y = H - 80 - i * 60;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 20) {
      ctx.lineTo(x, y + Math.sin((x + mistOffset * (i + 1)) * 0.02) * 8);
    }
    ctx.lineTo(W, y + 40);
    ctx.lineTo(0, y + 40);
    ctx.closePath();
    ctx.fill();
  }
}

const ravens = [
  { x: 60, y: 190, t: 0 },
  { x: 340, y: 240, t: 2 },
  { x: 180, y: 300, t: 4 },
];
function drawRavens(dt) {
  ctx.fillStyle = '#0a0608';
  ravens.forEach(r => {
    r.t += dt;
    const flap = Math.sin(r.t * 6) * 6;
    const rx = (r.x + r.t * 18) % (W + 40) - 20;
    ctx.beginPath();
    ctx.moveTo(rx - 10, r.y);
    ctx.lineTo(rx, r.y - flap);
    ctx.lineTo(rx + 10, r.y);
    ctx.lineTo(rx, r.y + 3);
    ctx.closePath();
    ctx.fill();
  });
}

function drawScene(dt, showArcher) {
  sceneTime += dt;
  drawSky();
  drawGround(dt);
  drawWall(showArcher);
  drawMist(dt);
  updateRain(dt);
  drawRain();
}

// ============================================================
// ВОЛНЫ
// ============================================================
class WaveManager {
  constructor() { this.toSpawn = 0; this.spawnTimer = 0; this.spawnInterval = 1.0; }
  startWave(wave) {
    this.toSpawn = 4 + wave * 2;
    this.spawnInterval = Math.max(1.2 - wave * 0.05, 0.35);
    this.spawnTimer = 0;
  }
  update(dt) {
    if (this.toSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        gameState.orcs.push(new Orc(gameState.wave));
        this.toSpawn--;
        this.spawnTimer = this.spawnInterval;
      }
    }
  }
  waveCleared() { return this.toSpawn === 0 && gameState.orcs.length === 0; }
}

// ============================================================
// ОСНОВНОЙ ЦИКЛ
// ============================================================
function update(dt) {
  if (gameState.screen !== 'playing') return;
  archer.update(dt);

  if (gameState.betweenWaves) {
    gameState.waveMessageTimer -= dt;
    if (gameState.waveMessageTimer <= 0) {
      gameState.betweenWaves = false;
      waveManager.startWave(gameState.wave);
    }
    return;
  }

  waveManager.update(dt);
  for (const orc of gameState.orcs) orc.update(dt);

  gameState.orcs = gameState.orcs.filter(orc => {
    if (orc.reachedWall) {
      gameState.wallHP -= 8;
      SoundEngine.playWallHit();
      return false;
    }
    return true;
  });

  for (const p of gameState.projectiles) p.update(dt);

  for (const p of gameState.projectiles) {
    if (p.dead) continue;
    for (const orc of gameState.orcs) {
      if (orc.hp <= 0) continue;
      const dist = Math.hypot(p.x - orc.x, p.y - orc.y);
      if (dist < orc.radius) {
        orc.takeDamage(18);
        p.dead = true;
        for (let i = 0; i < 6; i++) gameState.particles.push(new Particle(orc.x, orc.y));
        if (orc.hp <= 0) gameState.score += 10;
        break;
      }
    }
  }
  gameState.projectiles = gameState.projectiles.filter(p => !p.dead);
  gameState.orcs = gameState.orcs.filter(orc => orc.hp > 0);

  for (const pt of gameState.particles) pt.update(dt);
  gameState.particles = gameState.particles.filter(pt => pt.life > 0);

  updateHUD();

  if (gameState.wallHP <= 0) {
    gameState.wallHP = 0;
    endGame();
    return;
  }

  if (waveManager.waveCleared() && !gameState.betweenWaves) {
    gameState.wallHP = Math.min(gameState.wallHP + 5, gameState.wallMaxHP);
    gameState.wave++;
    gameState.betweenWaves = true;
    gameState.waveMessageTimer = 4;
  }
}

function draw(dt) {
  if (gameState.screen === 'menu' || gameState.screen === 'settings' || gameState.screen === 'about') {
    drawScene(dt, false);
    drawRavens(dt);
    trees.filter(t => t.row === 'bottom').forEach(drawTree);
    return;
  }
  drawScene(dt, true);

  // орки: сортируем по y, чтобы дальние (только что заспавнившиеся) рисовались
  // раньше и корректно прятались за нижним рядом деревьев
  const sortedOrcs = [...gameState.orcs].sort((a, b) => a.y - b.y);
  for (const orc of sortedOrcs) orc.draw();

  // нижний ряд деревьев рисуется поверх орков — создаёт эффект,
  // что орки идут ИЗ леса и на миг скрываются за стволами/кронами
  trees.filter(t => t.row === 'bottom').forEach(drawTree);

  for (const p of gameState.projectiles) p.draw();
  for (const pt of gameState.particles) pt.draw();

  if (gameState.betweenWaves) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, H / 2 - 40, W, 80);
    ctx.fillStyle = '#e8d9b0';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ВОЛНА ${gameState.wave}`, W / 2, H / 2);
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText('приближается...', W / 2, H / 2 + 22);
  }
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05) || 0;
  lastTime = timestamp;
  update(dt);
  draw(dt);
  requestAnimationFrame(loop);
}

// ============================================================
// HUD / ЭКРАНЫ
// ============================================================
function updateHUD() {
  document.getElementById('hp-value').textContent = gameState.wallHP;
  document.getElementById('score-value').textContent = gameState.score;
  document.getElementById('wave-value').textContent = gameState.wave;
}

function showScreen(name) {
  const screens = ['menu-screen', 'pause-screen', 'settings-screen', 'about-screen', 'gameover-screen'];
  screens.forEach(id => document.getElementById(id).classList.add('hidden'));
  const hud = document.getElementById('hud');
  if (name === 'playing') {
    hud.classList.remove('hidden');
  } else {
    hud.classList.add('hidden');
    const map = { menu: 'menu-screen', paused: 'pause-screen', settings: 'settings-screen', about: 'about-screen', gameover: 'gameover-screen' };
    document.getElementById(map[name]).classList.remove('hidden');
  }
  gameState.screen = name;
}

function startNewGame() {
  gameState.wallHP = gameState.wallMaxHP;
  gameState.score = 0;
  gameState.wave = 1;
  gameState.orcs = [];
  gameState.projectiles = [];
  gameState.particles = [];
  gameState.betweenWaves = false;
  archer.cooldown = 0;
  waveManager = new WaveManager();
  waveManager.startWave(gameState.wave);
  updateHUD();
  showScreen('playing');
}

function endGame() {
  document.getElementById('final-wave').textContent = gameState.wave;
  document.getElementById('final-score').textContent = gameState.score;
  showScreen('gameover');
}

// ============================================================
// ВВОД
// ============================================================
canvas.addEventListener('click', (e) => {
  if (gameState.screen !== 'playing' || gameState.betweenWaves) return;
  if (!archer.canShoot()) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;
  archer.shoot(clickX, clickY);
});

// ============================================================
// КНОПКИ UI
// ============================================================
function withClick(id, fn) {
  document.getElementById(id).addEventListener('click', () => { SoundEngine.playClick(); fn(); });
}
withClick('play-btn', startNewGame);
withClick('settings-btn', () => showScreen('settings'));
withClick('about-btn', () => showScreen('about'));
withClick('settings-back-btn', () => showScreen('menu'));
withClick('about-back-btn', () => showScreen('menu'));
withClick('pause-btn', () => showScreen('paused'));
withClick('resume-btn', () => showScreen('playing'));
withClick('restart-btn', startNewGame);
withClick('menu-btn', () => showScreen('menu'));
withClick('retry-btn', startNewGame);
withClick('gameover-menu-btn', () => showScreen('menu'));

document.getElementById('sound-toggle').addEventListener('change', (e) => {
  gameState.soundOn = e.target.checked;
  SoundEngine.setEnabled(gameState.soundOn);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (gameState.screen === 'playing') showScreen('paused');
    else if (gameState.screen === 'paused') showScreen('playing');
  }
});

// ============================================================
// СТАРТ
// ============================================================
showScreen('menu');
requestAnimationFrame(loop);
