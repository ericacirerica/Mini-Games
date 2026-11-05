// 1. Settings.
const DURATION = 45;      // seconds per round
const MAX_AT_ONCE = 2;    // how many moles can be up at the same time

// 2. State.
let score = 0;
let timeLeft = DURATION;
let running = false;
let runId = 0;        // changes every game, so old timers stop themselves
let lastHole = -1;    // so the mole doesn't pop up in the same hole twice in a row
let spawnTimer = null; // decides when the next mole pops up
const hideTimers = []; // one hide-timer for each hole
let tickTimer = null; // the one-second countdown
let soundOn = true;
try { soundOn = localStorage.getItem("whack-sound") !== "off"; } catch (e) {}

// 3. Page elements.
const holes = Array.from(document.querySelectorAll(".hole"));
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
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
  pop()   { tone(420, 0, 0.06, "sine", 0.08, 640); },
  whack() { tone(200, 0, 0.12, "square", 0.16, 90); tone(700, 0, 0.05, "triangle", 0.14); },
  miss()  { tone(150, 0, 0.07, "sine", 0.08); },
  end()   { [523, 659, 784].forEach((f, i) => tone(f, i * 0.13, 0.25, "triangle", 0.22)); },
  best()  { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.55 + i * 0.1, 0.2, "sine", 0.16)); }
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
  try { return Number(localStorage.getItem("whack-best")) || 0; } catch (e) { return 0; }
}
function saveBest(n) {
  try { localStorage.setItem("whack-best", String(n)); } catch (e) {}
}
function setStatus(text) { statusEl.textContent = text; }
function hide(i) {
  clearTimeout(hideTimers[i]);
  holes[i].classList.remove("up", "hit");
}
function hideAll() { holes.forEach((_, i) => hide(i)); }

// 6. The game.
function startGame() {
  runId++;
  clearTimeout(spawnTimer);
  clearInterval(tickTimer);
  hideAll();
  score = 0;
  timeLeft = DURATION;
  lastHole = -1;
  scoreEl.textContent = "0";
  timeEl.textContent = String(DURATION);
  running = true;
  setStatus("Go go go!");
  startBtn.textContent = "Restart";
  tickTimer = setInterval(tick, 1000);
  const id = runId;
  spawnTimer = setTimeout(() => spawnLoop(id), 600);
}

function tick() {
  timeLeft--;
  timeEl.textContent = String(timeLeft);
  if (timeLeft <= 0) endGame();
}

// Every so often, pop up a new mole if fewer than MAX_AT_ONCE are showing.
// The longer you play, the faster they come and the less time they stay.
function spawnLoop(id) {
  if (!running || id !== runId) return;
  const elapsed = DURATION - timeLeft;

  const showing = holes.filter((h) => h.classList.contains("up")).length;
  if (showing < MAX_AT_ONCE) {
    // Pick a random hole that is empty (and not the one used last).
    const free = holes
      .map((_, i) => i)
      .filter((i) => !holes[i].classList.contains("up") && i !== lastHole);
    if (free.length > 0) {
      showMole(free[Math.floor(Math.random() * free.length)], elapsed);
    }
  }

  const delay = Math.max(300, 750 - elapsed * 8) + Math.random() * 300;
  spawnTimer = setTimeout(() => spawnLoop(id), delay);
}

function showMole(i, elapsed) {
  lastHole = i;
  holes[i].classList.add("up");
  sounds.pop();
  const stay = Math.max(550, 1200 - elapsed * 14); // milliseconds the mole stays up
  hideTimers[i] = setTimeout(() => hide(i), stay);
}

function whack(i) {
  if (!running) return;
  const hole = holes[i];
  if (hole.classList.contains("up") && !hole.classList.contains("hit")) {
    hole.classList.add("hit");
    score++;
    scoreEl.textContent = String(score);
    sounds.whack();
    // Let the mole show it got hit, then hide it.
    clearTimeout(hideTimers[i]);
    hideTimers[i] = setTimeout(() => hide(i), 220);
  } else {
    sounds.miss();
  }
}

function endGame() {
  running = false;
  runId++; // cancels any timers that are still waiting
  clearTimeout(spawnTimer);
  clearInterval(tickTimer);
  hideAll();
  timeEl.textContent = "0";
  sounds.end();
  let msg = "You whacked " + score + " mole" + (score === 1 ? "" : "s") + ".";
  if (score > getBest()) {
    saveBest(score);
    msg += " New best!";
    sounds.best();
  }
  bestEl.textContent = String(getBest());
  setStatus("Time's up! " + msg);
  showResult("Time's up!", msg, () => !running);
  startBtn.textContent = "Play again";
}

// 7. Controls.
holes.forEach((hole, i) => hole.addEventListener("click", () => whack(i)));
startBtn.addEventListener("click", () => { startGame(); startBtn.blur(); });

// Keyboard: keys 1 to 9 whack the matching hole (1 is top-left, 9 is bottom-right).
document.addEventListener("keydown", (e) => {
  if (/^[1-9]$/.test(e.key)) whack(Number(e.key) - 1);
});

function showSound() {
  muteBtn.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
  muteBtn.setAttribute("aria-pressed", String(!soundOn));
}
muteBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  try { localStorage.setItem("whack-sound", soundOn ? "on" : "off"); } catch (e) {}
  showSound();
  if (soundOn) tone(520, 0, 0.1, "triangle", 0.2);
  muteBtn.blur();
});

showSound();
bestEl.textContent = String(getBest());