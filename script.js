'use strict';
// One animation loop advances both the timer and targets, so pause freezes both.
const $ = id => document.getElementById(id);
const field = $('field'), dropsLayer = $('drops'), overlay = $('overlay');
const ROUND_MS = 30000, SPAWN_MS = 700, FALL_MS = 4000;
let state = 'ready', score = 0, remaining = ROUND_MS;
let lastTime = 0, spawnElapsed = 0, milestone = false, warned = false;
let drops = [];
let celebrationTimeout;

function feedback(message) {
  $('feedback').textContent = message;
  $('feedback').classList.toggle('penalty', message.startsWith('Pollutant'));
  $('feedback').classList.toggle('success', message.startsWith('Nice') || message.startsWith('Goal'));
}
function renderStats() {
  $('score').textContent = score;
  $('timer').textContent = Math.ceil(remaining / 1000);
  $('progress').value = Math.min(score, 200);
  $('progress').textContent = `${score} / 200`;
  $('timer-box').classList.toggle('urgent', remaining > 0 && remaining <= 5000);
}
function panel(label, title, description, action) {
  $('panel-label').textContent = label;
  $('panel-title').textContent = title;
  $('panel-text').textContent = description;
  $('action').textContent = action;
  overlay.hidden = false;
  $('action').focus({preventScroll:true});
}
// Starting or resetting clears every piece of the previous round.
function start() {
  clearTimeout(celebrationTimeout); $('confetti').replaceChildren();
  dropsLayer.replaceChildren(); drops = [];
  score = 0; remaining = ROUND_MS; spawnElapsed = 0;
  milestone = false; warned = false; state = 'playing';
  overlay.hidden = true; $('pause').disabled = false;
  dropsLayer.inert = false;
  renderStats(); feedback('Collect + drops. Avoid × pollutants.');
  spawn(); lastTime = performance.now();
  $('pause').focus({preventScroll:true});
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused'; dropsLayer.inert = true; $('pause').disabled = true;
  panel('Take a breather', 'Game paused', 'Your score is saved. The timer and drops will continue when you resume.', 'Resume game');
  feedback('Paused. Timer and drops are stopped.');
}
function resume() {
  if (state !== 'paused') return;
  state = 'playing'; overlay.hidden = true; dropsLayer.inert = false;
  $('pause').disabled = false; lastTime = performance.now();
  feedback('Keep going! Collect + drops.'); $('pause').focus({preventScroll:true});
}
// A win uses the final score, not an earlier milestone.
function finish() {
  if (state !== 'playing') return;
  state = 'finished'; remaining = 0;
  dropsLayer.replaceChildren(); drops = []; $('pause').disabled = true;
  renderStats();
  panel('Round complete', 'Time’s up!', `You scored ${score} points. ${score >= 200 ? 'Goal met — great collecting!' : 'Try again to reach 200 points!'} Explore charity: water below to learn about clean-water access.`, 'Play again');
  if (score >= 200) celebrate();
  feedback(score >= 200 ? 'Goal met! Play again to beat your score.' : 'Every round is a fresh start. Try again!');
}
function remove(drop) { drop.el.remove(); drops = drops.filter(item => item !== drop); }
// Each target is removed before scoring, preventing repeat clicks.
function collect(drop) {
  if (state !== 'playing' || !drops.includes(drop)) return;
  remove(drop); score = Math.max(0, score + (drop.clean ? 10 : -10));
  if (!milestone && score >= 200) { milestone = true; feedback('Goal reached! Keep collecting until time runs out.'); }
  else feedback(drop.clean ? 'Nice catch! +10' : 'Pollutant! −10');
  renderStats();
}
function spawn() {
  const clean = Math.random() < .75;
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'drop';
  el.setAttribute('aria-label', clean ? 'Collect clean drop: plus 10 points' : 'Pollutant: minus 10 points');
  el.innerHTML = `<svg viewBox="0 0 48 60" aria-hidden="true"><path d="M24 3 C17 15 3 29 3 38 A21 19 0 0 0 45 38 C45 29 31 15 24 3Z" fill="${clean ? '#77A8BB' : '#CBCCD1'}" stroke="${clean ? '#003366' : '#1A1A1A'}" stroke-width="2.5"/><text x="24" y="44" text-anchor="middle" fill="${clean ? '#003366' : '#1A1A1A'}" font-family="Arial,sans-serif" font-size="25" font-weight="bold">${clean ? '+' : '×'}</text></svg>`;
  const drop = {el, clean, age:0, fraction:Math.random()};
  el.addEventListener('click', () => collect(drop));
  dropsLayer.append(el); drops.push(drop); position(drop);
}
function position(drop) {
  const x = drop.fraction * Math.max(0, field.clientWidth - 60) + 2;
  const y = -64 + (field.clientHeight + 64) * drop.age / FALL_MS;
  drop.el.style.transform = `translate(${x}px, ${y}px)`;
}
function tick(now) {
  if (state === 'playing') {
    const elapsed = Math.max(0, now - lastTime);
    remaining = Math.max(0, remaining - elapsed);
    if (remaining === 0) finish();
    else {
      for (const drop of [...drops]) { drop.age += elapsed; if (drop.age >= FALL_MS) remove(drop); else position(drop); }
      spawnElapsed += elapsed;
      if (spawnElapsed >= SPAWN_MS) { spawnElapsed %= SPAWN_MS; spawn(); }
      if (remaining <= 5000 && !warned) { warned = true; feedback('5 seconds left!'); }
      renderStats();
    }
  }
  lastTime = now; requestAnimationFrame(tick);
}
$('action').addEventListener('click', () => state === 'paused' ? resume() : start());
$('pause').addEventListener('click', pause);
$('reset').addEventListener('click', start);
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (state === 'playing') pause(); else if (state === 'paused') resume(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
requestAnimationFrame(tick);

// Confetti uses simple HTML elements, with a still celebration for reduced motion.
function celebrate() {
  const colors = ['#FFC907', '#003366', '#77A8BB'];
  for (let i = 0; i < 42; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.setProperty('--delay', `${Math.random() * .4}s`);
    piece.style.setProperty('--top', `${Math.random() * 100}%`);
    $('confetti').append(piece);
  }
  celebrationTimeout = setTimeout(() => $('confetti').replaceChildren(), 3000);
}
