// 1. Settings.
const DURATION = 30; // seconds per round

// 2. State.
let score = 0;
let timeLeft = DURATION;
let running = false;
let runId = 0;        // changes every game, so old timers stop themselves
let lastHole = -1;    // so the mole doesn't pop up in the same hole twice in a row
let moleTimer = null; // the timer that shows and hides moles
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

// 5. Helpers.
function getBest() {
  try { return Number(localStorage.getItem("whack-best")) || 0; } catch (e) { return 0; }
}
function saveBest(n) {
  try { localStorage.setItem("whack-best", String(n)); } catch (e) {}
}
function setStatus(text) { statusEl.textContent = text; }
function hide(i) { holes[i].classList.remove("up", "hit"); }
function hideAll() { holes.forEach((_, i) => hide(i)); }

// 6. The game.
function startGame() {
  runId++;
  clearTimeout(moleTimer);
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
  moleTimer = setTimeout(() => popMole(id), 600);
}

function tick() {
  timeLeft--;
  timeEl.textContent = String(timeLeft);
  if (timeLeft <= 0) endGame();
}

// Show a mole in a random hole. The longer you play, the faster they get.
function popMole(id) {
  if (!running || id !== runId) return;
  let i;
  do { i = Math.floor(Math.random() * holes.length); } while (i === lastHole);
  lastHole = i;
  holes[i].classList.add("up");
  sounds.pop();

  const elapsed = DURATION - timeLeft;
  const stay = Math.max(420, 950 - elapsed * 18); // milliseconds the mole stays up
  moleTimer = setTimeout(() => {
    hide(i);
    moleTimer = setTimeout(() => popMole(id), 250 + Math.random() * 300);
  }, stay);
}

function whack(i) {
  if (!running) return;
  const hole = holes[i];
  if (hole.classList.contains("up") && !hole.classList.contains("hit")) {
    hole.classList.add("hit");
    score++;
    scoreEl.textContent = String(score);
    sounds.whack();
    // Let the mole show it got hit, then bring the next one.
    clearTimeout(moleTimer);
    const id = runId;
    moleTimer = setTimeout(() => {
      hide(i);
      moleTimer = setTimeout(() => popMole(id), 250);
    }, 220);
  } else {
    sounds.miss();
  }
}

function endGame() {
  running = false;
  runId++; // cancels any timers that are still waiting
  clearTimeout(moleTimer);
  clearInterval(tickTimer);
  hideAll();
  timeEl.textContent = "0";
  sounds.end();
  let msg = "Time's up! You whacked " + score + " mole" + (score === 1 ? "" : "s") + ".";
  if (score > getBest()) {
    saveBest(score);
    msg += " New best!";
    sounds.best();
  }
  bestEl.textContent = String(getBest());
  setStatus(msg);
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