// ============================================================
// СТЕНА ВОРОНА — dark fantasy tower defense
// Ванильный JS, Canvas API, без зависимостей.
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // пиксельная чёткость

const W = canvas.width;   // 480
const H = canvas.height;  // 720
const WALL_Y = 150;       // высота, на которой стоит стена (орки идут к этой линии)

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
  particles: [], // всплески крови/искры при попадании
  betweenWaves: false,
  waveMessageTimer: 0,
  soundOn: true,
};

let waveManager = null;
let lastTime = 0;

// ------------------------------------------------------------
// Утилиты пиксель-арта: рисуем спрайт по маске на офскрин-канвасе,
// затем масштабируем на основной canvas без сглаживания.
// ------------------------------------------------------------
function makeSprite(pixelMap, palette, scale) {
  const rows = pixelMap.length;
  const cols = pixelMap[0].length;
  const off = document.createElement('canvas');
  off.width = cols;
  off.height = rows;
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

// Лучник (12x14), стрела (5x5), орк (12x12) — пиксельные маски
const ARCHER_MAP = [
  '....gg......',
  '...gsgg.....',
  '...gssg.....',
  '....gg......',
  '....bb......',
  '...bbbb.....',
  '..cbbbbc....',
  '...bbbb.....',
  '....bb......',
  '....bb......',
  '...b..b.....',
  '..bb..bb....',
];
const ARCHER_PALETTE = { g: '#c9a876', s: '#7a5230', b: '#3a3f4a', c: '#8a6a3a' };
const archerSprite = makeSprite(ARCHER_MAP, ARCHER_PALETTE, 3);

function orcMap(hurt) {
  const body = hurt ? 'r' : 'o';
  return [
    '..gggg..',
    '.gg44gg.',
    '.g4224g.',
    '..2222..',
    `.${body}${body}${body}${body}${body}${body}.`.slice(0, 8),
    `${body}${body}${body}${body}${body}${body}${body}${body}`,
    `${body}${body}k${body}${body}k${body}${body}`,
    `.${body}${body}${body}${body}${body}${body}.`,
    '..h..h..',
    '..h..h..',
  ];
}
const ORC_PALETTE = { g: '#2f4a2a', '4': '#1f2f1c', '2': '#e23c2c', o: '#3a5a2f', r: '#8a2a2a', k: '#171a10', h: '#141210' };

const ARROW_MAP = [
  '..k..',
  '.kkk.',
  'ssssk',
  '.kkk.',
  '..k..',
];
const ARROW_PALETTE = { k: '#e8d9b0', s: '#6b3a2a' };
const arrowSprite = makeSprite(ARROW_MAP, ARROW_PALETTE, 3);

function drawSprite(sprite, x, y, flipY) {
  ctx.save();
  ctx.translate(x, y);
  if (flipY) ctx.scale(1, -1);
  ctx.drawImage(sprite.canvas, -sprite.w / 2, -sprite.h / 2, sprite.w, sprite.h);
  ctx.restore();
}

// ------------------------------------------------------------
// Классы игровых сущностей
// ------------------------------------------------------------
class Archer {
  constructor() {
    this.x = W / 2;
    this.y = WALL_Y - 22;
  }
  draw() {
    drawSprite(archerSprite, this.x, this.y, false);
  }
}

class Orc {
  constructor(wave) {
    this.x = 40 + Math.random() * (W - 80);
    this.y = H + 20;
    this.speed = 34 + wave * 4 + Math.random() * 10; // px/сек
    this.maxHp = 18 + wave * 6;
    this.hp = this.maxHp;
    this.radius = 16;
    this.hitFlash = 0;
    this.reachedWall = false;
  }
  update(dt) {
    this.y -= this.speed * dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.y <= WALL_Y + 10 && !this.reachedWall) {
      this.reachedWall = true;
    }
  }
  takeDamage(dmg) {
    this.hp -= dmg;
    this.hitFlash = 0.12;
  }
  draw() {
    const sprite = makeSprite(orcMap(this.hitFlash > 0), ORC_PALETTE, this.radius / 4);
    drawSprite(sprite, this.x, this.y, false);
    // полоска HP
    const barW = 26;
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x - barW / 2, this.y - 26, barW, 4);
    ctx.fillStyle = '#c0302a';
    ctx.fillRect(this.x - barW / 2, this.y - 26, barW * Math.max(this.hp / this.maxHp, 0), 4);
  }
}

class Projectile {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    const dx = targetX - x, dy = targetY - y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 620; // px/сек
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

// ------------------------------------------------------------
// Управление волнами
// ------------------------------------------------------------
class WaveManager {
  constructor() {
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.0;
  }
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
  waveCleared() {
    return this.toSpawn === 0 && gameState.orcs.length === 0;
  }
}

const archer = new Archer();

// ------------------------------------------------------------
// Фон: небо, кровавая луна, стена, туман, факелы
// ------------------------------------------------------------
let mistOffset = 0;
const torchFlicker = { a: 0, b: 0 };

function drawBackground(dt) {
  // небо — градиент
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#160a14');
  sky.addColorStop(0.5, '#241226');
  sky.addColorStop(1, '#3a1418');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // кровавая луна
  const mx = W - 90, my = 90;
  for (let i = 3; i >= 0; i--) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(180,30,30,${0.06 * (4 - i)})`;
    ctx.arc(mx, my, 46 + i * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.fillStyle = '#c23a2e';
  ctx.arc(mx, my, 42, 0, Math.PI * 2);
  ctx.fill();

  // силуэт стены замка
  ctx.fillStyle = '#0c0709';
  ctx.fillRect(0, WALL_Y, W, H - WALL_Y);
  // зубцы стены
  const crenelW = 24;
  for (let x = -12; x < W; x += crenelW) {
    ctx.fillRect(x, WALL_Y - 16, crenelW * 0.6, 16);
  }

  // туман — волнистые полупрозрачные полосы
  mistOffset += dt * 12;
  ctx.fillStyle = 'rgba(200,200,220,0.05)';
  for (let i = 0; i < 3; i++) {
    const y = H - 60 - i * 50;
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

  // факелы по бокам стены
  torchFlicker.a = 0.7 + Math.random() * 0.3;
  torchFlicker.b = 0.7 + Math.random() * 0.3;
  drawTorch(30, WALL_Y + 6, torchFlicker.a);
  drawTorch(W - 30, WALL_Y + 6, torchFlicker.b);
}

function drawTorch(x, y, flicker) {
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(x - 3, y, 6, 26);
  ctx.beginPath();
  ctx.fillStyle = `rgba(255,140,30,${0.5 * flicker})`;
  ctx.arc(x, y - 6, 14 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,200,60,${0.9 * flicker})`;
  ctx.beginPath();
  ctx.moveTo(x, y - 20 * flicker);
  ctx.lineTo(x - 6, y - 2);
  ctx.lineTo(x + 6, y - 2);
  ctx.closePath();
  ctx.fill();
}

// вороны для меню
const ravens = [
  { x: 60, y: 200, t: 0 },
  { x: 340, y: 260, t: 2 },
  { x: 180, y: 340, t: 4 },
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

// ------------------------------------------------------------
// Основной игровой цикл
// ------------------------------------------------------------
function update(dt) {
  if (gameState.screen !== 'playing') return;

  if (gameState.betweenWaves) {
    gameState.waveMessageTimer -= dt;
    if (gameState.waveMessageTimer <= 0) {
      gameState.betweenWaves = false;
      waveManager.startWave(gameState.wave);
    }
    return;
  }

  waveManager.update(dt);

  // орки
  for (const orc of gameState.orcs) orc.update(dt);

  // урон стене от достигших орков
  gameState.orcs = gameState.orcs.filter(orc => {
    if (orc.reachedWall) {
      gameState.wallHP -= 8;
      return false;
    }
    return true;
  });

  // стрелы
  for (const p of gameState.projectiles) p.update(dt);

  // коллизии стрела-орк
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

  // частицы
  for (const pt of gameState.particles) pt.update(dt);
  gameState.particles = gameState.particles.filter(pt => pt.life > 0);

  updateHUD();

  // поражение
  if (gameState.wallHP <= 0) {
    gameState.wallHP = 0;
    endGame();
    return;
  }

  // волна зачищена
  if (waveManager.waveCleared() && !gameState.betweenWaves) {
    gameState.wallHP = Math.min(gameState.wallHP + 5, gameState.wallMaxHP);
    gameState.wave++;
    gameState.betweenWaves = true;
    gameState.waveMessageTimer = 4;
  }
}

function draw(dt) {
  if (gameState.screen === 'menu' || gameState.screen === 'settings' || gameState.screen === 'about') {
    drawBackground(dt);
    drawRavens(dt);
    return;
  }
  drawBackground(dt);
  for (const orc of gameState.orcs) orc.draw();
  for (const p of gameState.projectiles) p.draw();
  for (const pt of gameState.particles) pt.draw();
  archer.draw();

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

// ------------------------------------------------------------
// HUD / экраны
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// Ввод: клик по канвасу = выстрел в сторону клика (в ближайшего орка, если рядом)
// ------------------------------------------------------------
canvas.addEventListener('click', (e) => {
  if (gameState.screen !== 'playing' || gameState.betweenWaves) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;
  gameState.projectiles.push(new Projectile(archer.x, archer.y, clickX, clickY));
});

// ------------------------------------------------------------
// Кнопки UI
// ------------------------------------------------------------
document.getElementById('play-btn').addEventListener('click', startNewGame);
document.getElementById('settings-btn').addEventListener('click', () => showScreen('settings'));
document.getElementById('about-btn').addEventListener('click', () => showScreen('about'));
document.getElementById('settings-back-btn').addEventListener('click', () => showScreen('menu'));
document.getElementById('about-back-btn').addEventListener('click', () => showScreen('menu'));

document.getElementById('pause-btn').addEventListener('click', () => showScreen('paused'));
document.getElementById('resume-btn').addEventListener('click', () => showScreen('playing'));
document.getElementById('restart-btn').addEventListener('click', startNewGame);
document.getElementById('menu-btn').addEventListener('click', () => showScreen('menu'));

document.getElementById('retry-btn').addEventListener('click', startNewGame);
document.getElementById('gameover-menu-btn').addEventListener('click', () => showScreen('menu'));

document.getElementById('sound-toggle').addEventListener('change', (e) => {
  gameState.soundOn = e.target.checked;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (gameState.screen === 'playing') showScreen('paused');
    else if (gameState.screen === 'paused') showScreen('playing');
  }
});

// ------------------------------------------------------------
// Старт
// ------------------------------------------------------------
showScreen('menu');
requestAnimationFrame(loop);
