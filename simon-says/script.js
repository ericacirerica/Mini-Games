// 1. Settings: one sound pitch (Hz) per pad.
const FREQS = [262, 330, 392, 523];

// 2. State.
let sequence = [];     // the pattern so far, e.g. [2, 0, 3]
let step = 0;          // how far into the pattern the player is
let score = 0;         // rounds completed
let accepting = false; // true only when it is the player's turn
let runId = 0;         // changes on every new game, so old timers stop themselves
let soundOn = true;
try { soundOn = localStorage.getItem("simon-sound") !== "off"; } catch (e) {}

// 3. Page elements.
const pads = Array.from(document.querySelectorAll(".pad"));
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
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function setStatus(text) { statusEl.textContent = text; }

function getBest() {
  try { return Number(localStorage.getItem("simon-best")) || 0; } catch (e) { return 0; }
}
function saveBest(n) {
  try { localStorage.setItem("simon-best", String(n)); } catch (e) {}
}

// Light up a pad and play its note.
function flash(i, ms) {
  pads[i].classList.add("lit");
  tone(FREQS[i], 0, (ms / 1000) * 0.9, "sine", 0.25);
  setTimeout(() => pads[i].classList.remove("lit"), ms);
}

// 6. The game.
function startGame() {
  runId++;
  sequence = [];
  score = 0;
  scoreEl.textContent = "0";
  startBtn.textContent = "Restart";
  nextRound();
}

function nextRound() {
  sequence.push(Math.floor(Math.random() * 4));
  playSequence(runId);
}

// Show the pattern. It speeds up a little as it gets longer.
async function playSequence(id) {
  accepting = false;
  setStatus("Watch...");
  await sleep(700);
  const gap = Math.max(300, 650 - sequence.length * 25);
  for (const i of sequence) {
    if (id !== runId) return; // a new game started, so stop
    flash(i, gap - 150);
    await sleep(gap);
  }
  step = 0;
  accepting = true;
  setStatus("Your turn!");
}

function handlePad(i) {
  if (!accepting) return;
  flash(i, 250);

  if (i !== sequence[step]) {
    gameOver();
    return;
  }
  step++;
  if (step === sequence.length) {
    // Finished the whole pattern: round complete.
    accepting = false;
    score = sequence.length;
    scoreEl.textContent = score;
    setStatus("Nice!");
    const id = runId;
    sleep(900).then(() => { if (id === runId) nextRound(); });
  }
}

function gameOver() {
  accepting = false;
  runId++; // cancels any timers still waiting
  tone(240, 0.1, 0.4, "sawtooth", 0.12, 110);
  let msg = "You finished " + score + " round" + (score === 1 ? "" : "s") + ".";
  if (score > getBest()) {
    saveBest(score);
    msg += " New best!";
  }
  bestEl.textContent = getBest();
  setStatus("Game over. " + msg);
  const id = runId;
  showResult("Game over", msg, () => id === runId);
  startBtn.textContent = "Play again";
}

// 7. Buttons.
pads.forEach((pad) => {
  pad.addEventListener("click", () => handlePad(Number(pad.dataset.i)));
});
startBtn.addEventListener("click", startGame);

function showSound() {
  muteBtn.textContent = soundOn ? "🔊 Sound on" : "🔇 Sound off";
  muteBtn.setAttribute("aria-pressed", String(!soundOn));
}
muteBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  try { localStorage.setItem("simon-sound", soundOn ? "on" : "off"); } catch (e) {}
  showSound();
  if (soundOn) tone(520, 0, 0.1, "triangle", 0.2);
});

showSound();
bestEl.textContent = getBest();