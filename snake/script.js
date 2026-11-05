// 1. Settings.
const GRID = 20;            // the board is 20 x 20 squares
const SIZE = 400;           // canvas size in pixels
const CELL = SIZE / GRID;   // one square = 20 pixels

// 2. State.
let snake, dir, nextDir, food, score, speed;
let running = false;   // true while the snake is moving
let over = false;      // true after game over, until you press Start again
let timerId = null;
let soundOn = true;
try { soundOn = localStorage.getItem("snake-sound") !== "off"; } catch (e) {}

// 3. Page elements.
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start");
const muteBtn = document.getElementById("mute");

// 4. Sound (Web Audio, so no audio files are needed).
let audioCtx = null;
function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function tone(freq, delay, dur, type, vol, slideTo) {
  if (!soundOn) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
const sounds = {
  eat()  { tone(660, 0, 0.08, "sine", 0.25); tone(990, 0.07, 0.12, "sine", 0.25); },
  die()  { tone(300, 0, 0.5, "sawtooth", 0.14, 90); },
  win()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, "triangle", 0.25)); }
};

// 4b. Result popup, like the one in Memory Match. It is built here so this game stays self-contained.
const popupStyle = document.createElement("style");
popupStyle.textContent =
  "dialog.result { border: 0; border-radius: 18px; padding: 28px; background: var(--face); color: var(--ink); font-family: var(--font); max-width: 320px; text-align: center; }" +
  "dialog.result::backdrop { background: rgba(58, 74, 44, 0.5); }" +
  "dialog.result h2 { margin: 0 0 8px; font-size: 1.8rem; }" +
  "dialog.result p { margin: 0 0 18px; }";
document.head.appendChild(popupStyle);

const popup = document.createElement("dialog");
popup.className = "result";
const popupTitle = document.createElement("h2");
const popupText = document.createElement("p");
const popupBtn = document.createElement("button");
popupBtn.className = "pill primary";
popupBtn.textContent = "Play again";
popup.append(popupTitle, popupText, popupBtn);
document.body.appendChild(popup);
popupBtn.addEventListener("click", () => { popup.close(); startGame(); });

// Show the popup after a short pause. stillOver() makes sure you haven't
// already started a new game in the meantime.
function showResult(title, text, stillOver) {
  popupTitle.textContent = title;
  popupText.textContent = text;
  setTimeout(() => { if (stillOver() && !popup.open) popup.showModal(); }, 400);
}

// 5. Helpers.
function getBest() {
  try { return Number(localStorage.getItem("snake-best")) || 0; } catch (e) { return 0; }
}
function saveBest(n) {
  try { localStorage.setItem("snake-best", String(n)); } catch (e) {}
}
function setStatus(text) { statusEl.textContent = text; }

// Put the food on a random empty square. Returns false if the board is full.
function placeFood() {
  const taken = new Set(snake.map((s) => s.x + "," + s.y));
  const free = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!taken.has(x + "," + y)) free.push({ x, y });
    }
  }
  if (free.length === 0) { food = null; return false; }
  food = free[Math.floor(Math.random() * free.length)];
  return true;
}

// 6. Drawing.
function draw() {
  // Checkerboard background.
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#fffaf7" : "#fbefea";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  // Food.
  if (food) {
    ctx.fillStyle = "#f28bab";
    ctx.beginPath();
    ctx.arc((food.x + 0.5) * CELL, (food.y + 0.5) * CELL, CELL * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }
  // Snake: the head (first item) is a darker green.
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? "#5f7d45" : "#8aa56a";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 6);
    else ctx.rect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    ctx.fill();
  });
}

// 7. The game.
function resetBoard() {
  snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
  dir = { x: 1, y: 0 };      // the direction the snake last moved
  nextDir = { x: 1, y: 0 };  // the direction it will move next
  score = 0;
  speed = 140;               // milliseconds per step: smaller = faster
  scoreEl.textContent = "0";
  placeFood();
  draw();
}

function startGame() {
  clearTimeout(timerId);
  resetBoard();
  running = true;
  over = false;
  setStatus("Go!");
  startBtn.textContent = "Restart";
  timerId = setTimeout(loop, speed);
}

function loop() {
  tick();
  if (running) timerId = setTimeout(loop, speed);
}

function tick() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const eating = food && head.x === food.x && head.y === food.y;

  // The tail moves away this step, unless we are growing.
  const body = eating ? snake : snake.slice(0, -1);
  const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
  const hitSelf = body.some((s) => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) { endGame(false); return; }

  snake.unshift(head);
  if (eating) {
    score++;
    scoreEl.textContent = score;
    sounds.eat();
    speed = Math.max(70, speed - 3); // speed up a little
    if (!placeFood()) { draw(); endGame(true); return; }
  } else {
    snake.pop();
  }
  draw();
}

function endGame(won) {
  running = false;
  over = true;
  clearTimeout(timerId);
  let msg = "Score: " + score + ".";
  if (score > getBest()) {
    saveBest(score);
    msg += " New best!";
  }
  bestEl.textContent = getBest();
  const prefix = won ? "You filled the whole board! " : "";
  setStatus((won ? prefix : "Game over. ") + msg);
  showResult(won ? "You won!" : "Game over", prefix + msg, () => over);
  startBtn.textContent = "Play again";
  if (won) sounds.win(); else sounds.die();
}

// Change direction. You can't turn straight back into yourself.
function setDir(dx, dy) {
  if (dx === -dir.x && dy === -dir.y) return;
  nextDir = { x: dx, y: dy };
}

// Called by keys, swipes and the on-screen arrows.
function steer(dx, dy) {
  if (over) return;                // after game over, use the Play again button
  if (!running) startGame();       // the first arrow press starts the game
  setDir(dx, dy);
}

// 8. Controls.
const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
};
document.addEventListener("keydown", (e) => {
  const move = KEYS[e.key] || KEYS[e.key.toLowerCase()];
  if (!move) return;
  e.preventDefault(); // stops the page from scrolling
  steer(move[0], move[1]);
});

// Swipe on the board (phones and tablets).
let touchX = 0, touchY = 0;
canvas.addEventListener("touchstart", (e) => {
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
}, { passive: true });
canvas.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // too small to count
  if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1, 0);
  else steer(0, dy > 0 ? 1 : -1);
}, { passive: true });

// On-screen arrow buttons.
document.querySelectorAll(".dir").forEach((btn) => {
  btn.addEventListener("click", () => steer(Number(btn.dataset.dx), Number(btn.dataset.dy)));
});

startBtn.addEventListener("click", () => { startGame(); startBtn.blur(); });

function showSound() {
  muteBtn.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
  muteBtn.setAttribute("aria-pressed", String(!soundOn));
}
muteBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  try { localStorage.setItem("snake-sound", soundOn ? "on" : "off"); } catch (e) {}
  showSound();
  if (soundOn) tone(520, 0, 0.1, "triangle", 0.2);
  muteBtn.blur();
});

showSound();
bestEl.textContent = getBest();
resetBoard();