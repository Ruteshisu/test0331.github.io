const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cols = 6;
const rows = 12;
const cellSize = 32;
const colors = ['red', 'green', 'blue', 'yellow', 'purple'];
let grid = Array.from({ length: rows }, () => Array(cols).fill(null));

class Puyo {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
  }
}

class PuyoPair {
  constructor() {
    this.a = new Puyo(2, 0, randomColor());
    this.b = new Puyo(2, -1, randomColor());
    this.orientation = 0;
  }
  move(dx, dy) {
    this.a.x += dx; this.a.y += dy;
    this.b.x += dx; this.b.y += dy;
  }
  rotate() {
    // 壁キック付き回転処理
    const offset = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];
    const oldO = this.orientation;
    const newO = (oldO + 1) % offset.length;
    // 古い座標を退避
    const oldAX = this.a.x, oldAY = this.a.y;
    const oldBX = this.b.x, oldBY = this.b.y;
    // 通常回転
    this.orientation = newO;
    this.b.x = this.a.x + offset[newO].x;
    this.b.y = this.a.y + offset[newO].y;
    // 左右端の壁キック
    if (this.b.x < 0) {
      this.a.x += 1;
      this.b.x += 1;
    } else if (this.b.x >= cols) {
      this.a.x -= 1;
      this.b.x -= 1;
    }
    // 衝突していれば回転前に戻す
    if (isCollision(this)) {
      this.orientation = oldO;
      this.a.x = oldAX; this.a.y = oldAY;
      this.b.x = oldBX; this.b.y = oldBY;
    }
  }
}

function randomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function isCollision(pair) {
  for (let puyo of [pair.a, pair.b]) {
    if (
      puyo.x < 0 || puyo.x >= cols ||
      puyo.y >= rows ||
      (puyo.y >= 0 && grid[puyo.y][puyo.x])
    ) return true;
  }
  return false;
}

/**
 * spawnPair: 新しいぷよペアを生成し、衝突判定でゲームオーバーをハンドルする関数
 * @returns {PuyoPair|null} 生成されたPuyoPairオブジェクト、ゲームオーバー時はnull
 */
function spawnPair() {
  const pair = new PuyoPair();
  if (isCollision(pair)) {
    cancelAnimationFrame(animationId);
    alert('ゲームオーバー');
    return null;
  }
  return pair;
}

/**
 * drawNextPair: 次に落下するぷよペアを nextCanvas に描画する関数
 */
function drawNextPair() {
  const nCanvas = document.getElementById('nextCanvas');
  const nCtx = nCanvas.getContext('2d');
  nCtx.clearRect(0, 0, nCanvas.width, nCanvas.height);
  if (!nextPair) return;
  // 上側のぷよ
  nCtx.fillStyle = nextPair.a.color;
  nCtx.beginPath();
  nCtx.arc(nCanvas.width/2, 16, cellSize/2 - 2, 0, Math.PI*2);
  nCtx.fill();
  // 下側のぷよ
  nCtx.fillStyle = nextPair.b.color;
  nCtx.beginPath();
  nCtx.arc(nCanvas.width/2, 48, cellSize/2 - 2, 0, Math.PI*2);
  nCtx.fill();
}

/**
 * blinkEffect: ゲームキャンバスを0.2秒ごとに3回点滅させる演出
 */
function blinkEffect() {
  const canvasEl = document.getElementById('gameCanvas');
  let count = 0;
  const interval = setInterval(() => {
    canvasEl.style.visibility = (canvasEl.style.visibility === 'hidden' ? 'visible' : 'hidden');
    count++;
    if (count >= 6) {
      clearInterval(interval);
      canvasEl.style.visibility = 'visible';
    }
  }, 200);
}

// --- 初期 active / next ペア生成 ---
let nextPair = spawnPair();
let active = nextPair;
nextPair = spawnPair();
// ネクスト表示 (常に表示)
drawNextPair();

// --- 落下間隔の設定 (通常落下とソフトドロップ) ---
let normalDropInterval = 1000;
let fastDropInterval = 50;
let dropInterval = normalDropInterval;
let lastDrop = Date.now();
let animationId;

// --- UI要素を取得 ---
const scoreElem = document.getElementById('score');
const chainElem = document.getElementById('chain');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

// --- ゲームステート変数 ---
let score = 0;
let chainCount = 0;
let paused = false;

// --- 現在点滅すべきセル位置リストとフラグ ---
let blinkPositions = [];
let blinkOn = true;
// 点滅用Interval ID
let blinkIntervalId = null;

/**
 * detectGroups: 4個以上繋がるグループを検出し、座標リストの配列を返す
 * @returns {Array<Array<[number, number]>>} グループごとのセル座標配列
 */
function detectGroups() {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const groups = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] && !visited[y][x]) {
        const color = grid[y][x];
        const stack = [[x, y]];
        const group = [];
        visited[y][x] = true;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          group.push([cx, cy]);
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
            const nx = cx + dx, ny = cy + dy;
            if (nx>=0 && nx<cols && ny>=0 && ny<rows && !visited[ny][nx] && grid[ny][nx]===color) {
              visited[ny][nx] = true;
              stack.push([nx, ny]);
            }
          });
        }
        if (group.length >= 4) groups.push(group);
      }
    }
  }
  return groups;
}

// --- Pause/Resumeボタン処理 ---
pauseBtn.addEventListener('click', () => {
  if (!paused) {
    paused = true;
    cancelAnimationFrame(animationId);
    pauseBtn.textContent = 'Resume';
    // 点滅処理があれば停止
    if (blinkIntervalId !== null) {
      clearInterval(blinkIntervalId);
      blinkIntervalId = null;
      blinkPositions = [];
      blinkOn = true;
    }
  } else {
    paused = false;
    pauseBtn.textContent = 'Pause';
    lastDrop = Date.now();
    animate();
  }
});

// --- Restartボタン処理 ---
restartBtn.addEventListener('click', () => {
  // active と next を再生成
  nextPair = spawnPair();
  active = nextPair;
  nextPair = spawnPair();
  drawNextPair();
  dropInterval = normalDropInterval;
  score = 0;
  chainCount = 0;
  paused = false;
  pauseBtn.textContent = 'Pause';
  updateUI();
  lastDrop = Date.now();
  animate();
});

// --- UI更新関数 ---
function updateUI() {
  scoreElem.textContent = score;
  chainElem.textContent = chainCount;
}

// 初期UI更新
updateUI();

// キー操作: 左右移動、スペースで回転、下キーでドロップ
document.addEventListener('keydown', (e) => {
  if (!active || paused) return;
  switch (e.code) {
    case 'ArrowLeft':
      active.move(-1, 0);
      if (isCollision(active)) active.move(1, 0);
      break;
    case 'ArrowRight':
      active.move(1, 0);
      if (isCollision(active)) active.move(-1, 0);
      break;
    case 'Space': // 回転キーはスペース
      active.rotate();
      break;
    case 'ArrowDown':
      // ソフトドロップ: 速い落下間隔に設定
      dropInterval = fastDropInterval;
      drop();
      break;
  }
});

// ソフトドロップ解除: ArrowDownキーを離したら通常落下間隔に戻す
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') {
    dropInterval = normalDropInterval;
  }
});

// --- ヘルパー: 指定ミリ秒待機するPromise ---
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

/**
 * processChains: 非同期で連鎖処理を繰り返し、消去・点滅・崩落を行う関数
 */
async function processChains() {
  let localChain = 0;
  while (true) {
    const groups = detectGroups();
    if (groups.length === 0) break;
    // 点滅処理
    blinkPositions = groups.flat();
    for (let i = 0; i < 3; i++) {
      blinkOn = false; draw(); await sleep(200);
      blinkOn = true; draw(); await sleep(200);
    }
    // 完全消去
    blinkPositions.forEach(([x, y]) => grid[y][x] = null);
    blinkPositions = [];
    blinkOn = true;
    // 崩落
    applyGravity();
    localChain++;
    chainCount = localChain;
    // スコア計算
    score += groups.flat().length * 10 * localChain;
    updateUI();
  }
  // 次ペア生成
  active = nextPair;
  nextPair = spawnPair();
  drawNextPair();
  lastDrop = Date.now();
  animate();
}

// Drop処理: 着地時に固定後、非同期でチェインシーケンスを開始する
function drop() {
  if (!active) return;
  // 一マス落下
  active.move(0, 1);
  if (isCollision(active)) {
    // 着地
    active.move(0, -1);
    lock();
    applyGravity();
    // アニメ停止
    paused = true;
    cancelAnimationFrame(animationId);
    // 非同期連鎖シーケンス開始
    startChainSequence();
  } else {
    // 通常落下リセット
    lastDrop = Date.now();
  }
}

/**
 * startChainSequence: 着地後の連鎖を非同期で処理し、演出後にゲーム再開する関数
 */
async function startChainSequence() {
  let localChain = 0;
  while (true) {
    const groups = detectGroups();
    if (groups.length === 0) break;
    // 点滅演出
    blinkPositions = groups.flat();
    for (let i = 0; i < 3; i++) {
      blinkOn = false; draw(); await sleep(200);
      blinkOn = true; draw(); await sleep(200);
    }
    // 完全消去
    blinkPositions.forEach(([x, y]) => grid[y][x] = null);
    blinkPositions = [];
    blinkOn = true;
    // 崩落
    applyGravity();
    localChain++;
    chainCount = localChain;
    // スコア計算
    score += groups.flat().length * 10 * localChain;
    updateUI();
  }
  // 連鎖完了後: 次ペア生成
  active = nextPair;
  nextPair = spawnPair();
  drawNextPair();
  lastDrop = Date.now();
  // ゲーム再開
  paused = false;
  animate();
}

function lock() {
  for (let puyo of [active.a, active.b]) {
    if (puyo.y >= 0) grid[puyo.y][puyo.x] = puyo.color;
  }
}

function clearGroups() {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  let removedCount = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] && !visited[y][x]) {
        const color = grid[y][x];
        const stack = [[x, y]];
        const group = [];
        visited[y][x] = true;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          group.push([cx, cy]);
          [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
            const nx = cx + dx;
            const ny = cy + dy;
            if (
              nx >= 0 && nx < cols &&
              ny >= 0 && ny < rows &&
              !visited[ny][nx] &&
              grid[ny][nx] === color
            ) {
              visited[ny][nx] = true;
              stack.push([nx, ny]);
            }
          });
        }
        if (group.length >= 4) {
          removedCount += group.length;
          group.forEach(([gx, gy]) => grid[gy][gx] = null);
        }
      }
    }
  }
  return removedCount;
}

// --- 重力適用: ブロックが下に空きがある限り落下させる ---
function applyGravity() {
  let moved;
  do {
    moved = false;
    for (let x = 0; x < cols; x++) {
      for (let y = rows - 2; y >= 0; y--) {
        if (grid[y][x] && !grid[y + 1][x]) {
          grid[y + 1][x] = grid[y][x];
          grid[y][x] = null;
          moved = true;
        }
      }
    }
  } while (moved);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // グリッド上のぷよ
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) {
        // 点滅範囲かどうか
        const inBlink = blinkPositions.some(([bx, by])=> bx===x&&by===y);
        if (!inBlink || blinkOn) drawPuyo(x, y, grid[y][x]);
      }
    }
  }
  // アクティブなペア
  if (active) {
    drawPuyo(active.a.x, active.a.y, active.a.color);
    drawPuyo(active.b.x, active.b.y, active.b.color);
  }
}

function drawPuyo(x, y, color) {
  const px = x * cellSize + cellSize / 2;
  const py = y * cellSize + cellSize / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, cellSize / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
}

function animate() {
  if (!paused) {
    const now = Date.now();
    if (now - lastDrop > dropInterval) drop();
    draw();
    animationId = requestAnimationFrame(animate);
  }
}

animate(); 