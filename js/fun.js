// ==========================================================================
// fun.js — Fun Zone Arcade
// Firebase auth gate + Firestore group score + Times Table game + Just Work
// ==========================================================================

import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX }
  from './firebase-config.js';
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIZE_GOAL  = 1000;
const GUEST_CODE  = '1234'; // arcade-only access — bypasses Firebase

// ── Firebase ──────────────────────────────────────────────────────────────────
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);

// ── DOM refs (gate) ───────────────────────────────────────────────────────────
const authLoading = document.getElementById('auth-loading');
const gate        = document.getElementById('passcode-gate');
const funRoot     = document.getElementById('fun-root');
const siteFooter  = document.getElementById('site-footer');
const gateError   = document.getElementById('gate-error');
const gateInputs  = document.getElementById('gate-inputs');
const digits      = Array.from(document.querySelectorAll('.gate-digit'));

digits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/\D/g, '').slice(-1);
    if (d.value && i < 3) digits[i + 1].focus();
    if (digits.every(d => d.value)) tryUnlock();
  });
  d.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !d.value && i > 0) digits[i - 1].focus();
  });
});
document.getElementById('gate-submit').addEventListener('click', tryUnlock);

// Prevents initApp() from running twice when guest mode and Firebase both fire
let _appInited = false;
function showFunContent() {
  if (_appInited) return;
  _appInited = true;
  gate.hidden       = true;
  funRoot.hidden    = false;
  siteFooter.hidden = false;
  initApp();
}

async function tryUnlock() {
  const code = digits.map(d => d.value).join('');
  if (code.length !== 4) return;

  // Guest code — arcade only, no Firebase needed
  if (code === GUEST_CODE) {
    sessionStorage.setItem('sc_guest_mode', '1');
    showFunContent();
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, FAMILY_EMAIL, PASSWORD_PREFIX + code);
    // onAuthStateChanged handles the rest
  } catch {
    gateError.hidden = false;
    gateInputs.classList.add('shake');
    digits.forEach(d => { d.value = ''; });
    setTimeout(() => gateInputs.classList.remove('shake'), 500);
    digits[0].focus();
  }
}

onAuthStateChanged(auth, user => {
  authLoading.hidden = true;
  // Guest session active — skip Firebase check
  if (sessionStorage.getItem('sc_guest_mode') === '1') {
    showFunContent();
    return;
  }
  if (user) {
    showFunContent();
  } else {
    gate.hidden = false;
  }
});

document.getElementById('lock-btn').addEventListener('click', async () => {
  sessionStorage.removeItem('sc_guest_mode');
  if (auth.currentUser) await signOut(auth);
  location.reload();
});

// ── Stars animation ───────────────────────────────────────────────────────────
const canvas = document.getElementById('stars-canvas');
const ctx    = canvas.getContext('2d');
let stars    = [];
let shooting = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function makeStar() {
  const roll  = Math.random();
  const color = roll < 0.70 ? '#ffffff'
              : roll < 0.82 ? '#39FF14'
              : roll < 0.91 ? '#A020F0'
              : '#00C2CC';
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.4,
    alpha: Math.random(),
    delta: (Math.random() * 0.015 + 0.004) * (Math.random() < 0.5 ? 1 : -1),
    color,
  };
}

function makeShooter() {
  return {
    x: Math.random() * canvas.width * 0.6,
    y: Math.random() * canvas.height * 0.4,
    vx: 10 + Math.random() * 5,
    vy:  4 + Math.random() * 3,
    len: 70 + Math.random() * 60,
    alpha: 1,
  };
}

function drawStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const s of stars) {
    s.alpha += s.delta;
    if (s.alpha <= 0 || s.alpha >= 1) s.delta *= -1;
    s.alpha = Math.max(0, Math.min(1, s.alpha));
    ctx.save();
    ctx.globalAlpha = s.alpha;
    if (s.r > 1.2) { ctx.shadowBlur = 6; ctx.shadowColor = s.color; }
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = shooting.length - 1; i >= 0; i--) {
    const ss = shooting[i];
    ss.x += ss.vx; ss.y += ss.vy; ss.alpha -= 0.022;
    if (ss.alpha <= 0 || ss.x > canvas.width + 100) { shooting.splice(i, 1); continue; }
    const grad = ctx.createLinearGradient(ss.x - ss.len, ss.y - ss.len * 0.4, ss.x, ss.y);
    grad.addColorStop(0, 'rgba(57,255,20,0)');
    grad.addColorStop(1, `rgba(57,255,20,${ss.alpha})`);
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(ss.x - ss.len, ss.y - ss.len * 0.4);
    ctx.lineTo(ss.x, ss.y);
    ctx.stroke();
    ctx.restore();
  }

  requestAnimationFrame(drawStars);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
for (let i = 0; i < 160; i++) stars.push(makeStar());
requestAnimationFrame(drawStars);
setInterval(() => { if (Math.random() < 0.45) shooting.push(makeShooter()); }, 3500);

// ── Firestore / prize score ───────────────────────────────────────────────────
let groupPoints = 0;
let bestTimes   = [];

async function loadScore() {
  try {
    const snap = await getDoc(doc(db, 'scores', 'group'));
    if (snap.exists()) {
      groupPoints = snap.data().totalPoints || 0;
      bestTimes   = snap.data().bestTimes   || [];
    }
  } catch(err) {
    console.error('Firestore loadScore error:', err);
  }
  try {
    renderMeter(groupPoints, false);
  } catch(err) {
    console.error('renderMeter error:', err);
  }
}

function renderMeter(pts, animate = true) {
  const pct  = Math.min(100, (pts / PRIZE_GOAL) * 100);
  const fill = document.getElementById('prize-fill');
  fill.style.transition = animate ? 'width 0.8s ease' : 'none';
  fill.style.width      = pct + '%';
  document.getElementById('prize-pts').textContent = pts;
  document.getElementById('prize-pct').textContent = Math.floor(pct) + '%';
}

function spawnPrizeParticles(pts) {
  const container = document.getElementById('prize-particles');
  const count = Math.min(8, 3 + Math.floor(pts / 5));
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className   = 'prize-particle';
    p.textContent = i % 2 === 0 ? `+${pts}` : '★';
    p.style.left  = (10 + Math.random() * 80) + '%';
    p.style.top   = '0';
    p.style.animationDelay = (i * 80) + 'ms';
    container.appendChild(p);
    setTimeout(() => p.remove(), 1300 + i * 80);
  }
}

async function awardPoints(pts) {
  groupPoints += pts;
  renderMeter(groupPoints, true);
  spawnPrizeParticles(pts);
  try {
    await updateDoc(doc(db, 'scores', 'group'), { totalPoints: groupPoints });
  } catch {
    await setDoc(doc(db, 'scores', 'group'),
      { totalPoints: groupPoints, bestTimes }, { merge: true });
  }
}

async function saveBestTimes() {
  try {
    await updateDoc(doc(db, 'scores', 'group'), { bestTimes });
  } catch {
    await setDoc(doc(db, 'scores', 'group'),
      { totalPoints: groupPoints, bestTimes }, { merge: true });
  }
}

// ── Device name ───────────────────────────────────────────────────────────────
function getDevice() { return localStorage.getItem('funzone_device') || 'Unknown'; }

const deviceModal     = document.getElementById('device-modal');
const deviceNameInput = document.getElementById('device-name-input');

function saveDeviceName() {
  const name = deviceNameInput.value.trim();
  if (!name) { deviceNameInput.focus(); return; }
  localStorage.setItem('funzone_device', name);
  deviceModal.hidden = true;
  continueInit();
}

document.getElementById('device-name-save').addEventListener('click', saveDeviceName);
deviceNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveDeviceName(); });

// ── Two-phase init ────────────────────────────────────────────────────────────
function initApp() {
  if (!localStorage.getItem('funzone_device')) {
    deviceModal.hidden = false;
    deviceNameInput.focus();
    // continueInit() will be called by saveDeviceName() after the user types a name
    return;
  }
  continueInit();
}

async function continueInit() {
  // Initialize UI immediately — never block on Firestore
  const seed = makeQuestion();
  currentOnFireAnswer = seed.answer;
  onFireQuestion      = seed;
  renderIdle();
  workQueue = shuffle(WORK_QUESTIONS);
  workIdx   = 0;
  loadNextWorkQuestion();

  // Load score + leaderboard after network responds
  await loadScore();
  renderLeaderboard();
}

// ── Game DOM refs ─────────────────────────────────────────────────────────────
const gameCard     = document.getElementById('game-card');
const stateIdle    = document.getElementById('state-idle');
const statePlaying = document.getElementById('state-playing');
const stateFailed  = document.getElementById('state-failed');
const stateSuccess = document.getElementById('state-success');
const timerWrap    = document.getElementById('timer-wrap');
const timerBar     = document.getElementById('timer-bar');
const timerText    = document.getElementById('timer-text');
const streakWrap   = document.getElementById('streak-wrap');
const streakCount  = document.getElementById('streak-count');
const qProgress    = document.getElementById('q-progress');
const qCurrent     = document.getElementById('q-current');
const qA           = document.getElementById('q-a');
const qB           = document.getElementById('q-b');
const qAnswerBox   = document.getElementById('q-answer-box');
const hiddenInput  = document.getElementById('game-hidden-input');
const failSub      = document.getElementById('fail-sub');
const failCountdown = document.getElementById('fail-countdown');
const successTimeEl = document.getElementById('success-time');
const successRecord = document.getElementById('success-record');
const leaderboard  = document.getElementById('leaderboard');
const idleInfo     = document.getElementById('idle-info');

// ── Game state ────────────────────────────────────────────────────────────────
let gameMode      = 'time-trial';
let gameState     = 'idle';
let numInput      = '';
let questions     = [];
let qIndex        = 0;
let streak        = 0;
let bestStreak    = 0;
let startTime     = 0;
let timerInterval = null;
let failInterval  = null;
let currentOnFireAnswer = 0;
let onFireQuestion      = null;

function setState(s) {
  gameState = s;
  stateIdle.hidden    = s !== 'idle';
  statePlaying.hidden = s !== 'playing';
  stateFailed.hidden  = s !== 'failed';
  stateSuccess.hidden = s !== 'success';
  gameCard.classList.toggle('game-card--failed', s === 'failed');
}

function makeQuestion() {
  const a = Math.floor(Math.random() * 13);
  const b = Math.floor(Math.random() * 13);
  return { a, b, answer: a * b };
}

function showQuestion(q) {
  qA.textContent         = q.a;
  qB.textContent         = q.b;
  numInput               = '';
  qAnswerBox.textContent = '_';
}

function updateNumDisplay() {
  qAnswerBox.textContent = numInput || '_';
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
document.getElementById('btn-time-trial').addEventListener('click', () => setMode('time-trial'));
document.getElementById('btn-on-fire').addEventListener('click',    () => setMode('on-fire'));

function setMode(mode) {
  if (gameMode === mode) return;
  clearInterval(timerInterval);
  clearInterval(failInterval);
  gameMode = mode;
  document.getElementById('btn-time-trial').classList.toggle('active', mode === 'time-trial');
  document.getElementById('btn-on-fire').classList.toggle('active',    mode === 'on-fire');
  setState('idle');
  renderIdle();
  renderLeaderboard();
}

function renderIdle() {
  if (gameMode === 'time-trial') {
    idleInfo.innerHTML = `
      <div class="idle-mode-title">⏱ Time Trial</div>
      <div class="idle-mode-desc">10 questions · 30 seconds · all must be correct\n+15 points on completion</div>`;
  } else {
    idleInfo.innerHTML = `
      <div class="idle-mode-title">🔥 On Fire</div>
      <div class="idle-mode-desc">Answer as many as you can in a row\nOne wrong answer ends your run · +1 pt per correct</div>`;
  }
}

function renderLeaderboard() {
  if (gameMode !== 'time-trial') { leaderboard.hidden = true; return; }
  leaderboard.hidden = false;
  const sorted = [...bestTimes].filter(r => r && typeof r.time === 'number').sort((a, b) => a.time - b.time).slice(0, 3);
  leaderboard.innerHTML =
    `<div class="leaderboard-title">🏆 Top Times</div>` +
    (sorted.length === 0
      ? '<p class="lb-empty">No records yet — be first!</p>'
      : sorted.map((r, i) => `
          <div class="leaderboard-row">
            <span class="lb-rank">#${i + 1}</span>
            <span class="lb-device">${r.device}</span>
            <span class="lb-time">${r.time.toFixed(2)}s</span>
            <span class="lb-date">${r.date}</span>
          </div>`).join(''));
}

// Start / Play again
document.getElementById('start-btn').addEventListener('click', () => {
  if (gameMode === 'time-trial') startTimeTrial();
  else startOnFire();
});
document.getElementById('play-again-btn').addEventListener('click', () => {
  setState('idle');
  renderIdle();
  renderLeaderboard();
});

// ── Time Trial ────────────────────────────────────────────────────────────────
function startTimeTrial() {
  clearInterval(timerInterval);
  questions = Array.from({ length: 10 }, makeQuestion);
  qIndex    = 0;

  timerWrap.hidden  = false;
  streakWrap.hidden = true;
  qProgress.hidden  = false;
  qCurrent.textContent = '1';
  timerBar.classList.remove('danger');
  timerBar.style.width = '100%';

  setState('playing');
  showQuestion(questions[0]);
  hiddenInput.focus();

  startTime = performance.now();
  timerInterval = setInterval(() => {
    const elapsed   = performance.now() - startTime;
    const remaining = Math.max(0, 30000 - elapsed);
    timerBar.style.width    = (remaining / 30000 * 100) + '%';
    timerText.textContent   = (remaining / 1000).toFixed(1);
    if (remaining <= 6000) timerBar.classList.add('danger');
    if (remaining <= 0)    timeTrialFail("Time's up!");
  }, 100);
}

function submitTimeTrial() {
  const answer = parseInt(numInput, 10);
  if (isNaN(answer) || numInput === '') return;
  const q = questions[qIndex];
  if (answer === q.answer) {
    if (qIndex < 9) {
      qIndex++;
      qCurrent.textContent = qIndex + 1;
      showQuestion(questions[qIndex]);
    } else {
      timeTrialComplete();
    }
  } else {
    timeTrialFail('Wrong answer!');
  }
}

function timeTrialFail(reason) {
  clearInterval(timerInterval);
  failSub.textContent = reason;
  startFailCountdown();
}

async function timeTrialComplete() {
  clearInterval(timerInterval);
  const elapsed = (performance.now() - startTime) / 1000;

  setState('success');
  successTimeEl.textContent = elapsed.toFixed(2) + 's';
  successRecord.hidden      = true;

  const sorted    = [...bestTimes].sort((a, b) => a.time - b.time);
  const isTopThree = sorted.length < 3 || elapsed < sorted[sorted.length - 1].time;
  const isNewBest  = sorted.length === 0 || elapsed < sorted[0].time;

  if (isTopThree) {
    bestTimes.push({ time: elapsed, device: getDevice(), date: new Date().toLocaleDateString() });
    bestTimes.sort((a, b) => a.time - b.time);
    if (bestTimes.length > 3) bestTimes = bestTimes.slice(0, 3);
    saveBestTimes();
  }

  if (isNewBest) {
    successRecord.hidden = false;
    document.body.classList.add('record-flash');
    setTimeout(() => document.body.classList.remove('record-flash'), 1000);
  }

  await awardPoints(15);
  renderLeaderboard();
}

// ── On Fire ───────────────────────────────────────────────────────────────────
function startOnFire() {
  streak = 0;
  streakCount.textContent = '0';
  timerWrap.hidden  = true;
  streakWrap.hidden = false;
  qProgress.hidden  = true;

  const q = makeQuestion();
  currentOnFireAnswer = q.answer;
  onFireQuestion      = q;
  setState('playing');
  showQuestion(q);
  hiddenInput.focus();
}

async function submitOnFire() {
  const answer = parseInt(numInput, 10);
  if (isNaN(answer) || numInput === '') return;

  if (answer === currentOnFireAnswer) {
    streak++;
    streakCount.textContent = streak;
    streakCount.classList.remove('streak-bump');
    void streakCount.offsetWidth;
    streakCount.classList.add('streak-bump');
    setTimeout(() => streakCount.classList.remove('streak-bump'), 300);
    await awardPoints(1);
    const next = makeQuestion();
    currentOnFireAnswer = next.answer;
    onFireQuestion      = next;
    showQuestion(next);
  } else {
    onFireFail();
  }
}

function onFireFail() {
  const newBest = streak > bestStreak;
  if (newBest) bestStreak = streak;
  failSub.textContent = newBest
    ? `Your streak was ${streak} 🔥 New best!`
    : `Your streak was ${streak}`;
  startFailCountdown();
}

// ── Shared fail countdown ─────────────────────────────────────────────────────
function startFailCountdown() {
  clearInterval(failInterval);
  setState('failed');
  let count = 5;
  failCountdown.textContent = `Resetting in ${count}…`;
  failInterval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(failInterval);
      setState('idle');
      renderIdle();
      if (gameMode === 'time-trial') renderLeaderboard();
    } else {
      failCountdown.textContent = `Resetting in ${count}…`;
    }
  }, 1000);
}

// ── Numpad ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    const key = btn.dataset.key;
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 120);

    if (key === 'back') {
      numInput = numInput.slice(0, -1);
      updateNumDisplay();
    } else if (key === 'submit') {
      if (gameMode === 'time-trial') submitTimeTrial();
      else submitOnFire();
    } else {
      if (numInput.length >= 3) return;
      numInput += key;
      updateNumDisplay();
    }
  });
});

document.addEventListener('keydown', e => {
  if (gameState !== 'playing') return;
  if (e.key >= '0' && e.key <= '9') {
    if (numInput.length < 3) { numInput += e.key; updateNumDisplay(); }
  } else if (e.key === 'Backspace') {
    numInput = numInput.slice(0, -1); updateNumDisplay();
  } else if (e.key === 'Enter') {
    if (gameMode === 'time-trial') submitTimeTrial();
    else submitOnFire();
  }
});

// ── Just Work questions ───────────────────────────────────────────────────────
const WORK_QUESTIONS = [
  // Ratios & Rates
  { topic:'Ratios & Rates',        q:'A car travels 240 miles in 4 hours. What is its speed in miles per hour?',                                a:['60','60 mph'],               exp:'Speed = Distance ÷ Time = 240 ÷ 4 = 60 mph' },
  { topic:'Ratios & Rates',        q:'If 5 notebooks cost $15.00, how much does 1 notebook cost?',                                               a:['3','$3','3.00','$3.00'],     exp:'$15 ÷ 5 = $3 per notebook' },
  { topic:'Ratios & Rates',        q:'A recipe uses 3 cups of flour for every 2 cups of sugar. If you use 6 cups of sugar, how many cups of flour do you need?', a:['9','9 cups'], exp:'flour/sugar = 3/2. Multiply both by 3: flour = 9 cups.' },
  { topic:'Ratios & Rates',        q:'A cyclist travels 90 miles in 3 hours. What is the unit rate in miles per hour?',                          a:['30','30 mph'],               exp:'90 ÷ 3 = 30 miles per hour' },
  // Percentages
  { topic:'Percentages',           q:'What is 25% of 200?',                                                                                     a:['50'],                        exp:'25% = 0.25. 0.25 × 200 = 50' },
  { topic:'Percentages',           q:'What is 10% of 450?',                                                                                     a:['45'],                        exp:'10% = 0.10. 0.10 × 450 = 45' },
  { topic:'Percentages',           q:'A $60 jacket is 20% off. What is the sale price?',                                                         a:['48','$48'],                  exp:'20% of $60 = $12 off. $60 − $12 = $48' },
  { topic:'Percentages',           q:'What percent of 50 is 15?',                                                                               a:['30','30%'],                  exp:'15 ÷ 50 = 0.30 = 30%' },
  { topic:'Percentages',           q:'A score of 18 out of 24 is what percent? (round to nearest whole number)',                                  a:['75','75%'],                  exp:'18 ÷ 24 = 0.75 = 75%' },
  // Fractions
  { topic:'Fractions',             q:'Add: 1/2 + 1/3 (enter as a fraction, e.g. 5/6)',                                                          a:['5/6'],                       exp:'Common denominator is 6: 3/6 + 2/6 = 5/6' },
  { topic:'Fractions',             q:'Subtract: 3/4 − 1/4',                                                                                     a:['1/2','2/4','0.5'],           exp:'3/4 − 1/4 = 2/4 = 1/2' },
  { topic:'Fractions',             q:'Multiply: 2/3 × 3/4',                                                                                     a:['1/2','6/12','0.5'],          exp:'(2×3)/(3×4) = 6/12 = 1/2' },
  { topic:'Fractions',             q:'Divide: 3/4 ÷ 1/2 (enter as a fraction or decimal)',                                                       a:['3/2','1.5','1 1/2'],         exp:'Flip and multiply: 3/4 × 2/1 = 6/4 = 3/2 = 1.5' },
  { topic:'Fractions',             q:'Convert 3/4 to a decimal.',                                                                               a:['0.75','.75'],                exp:'3 ÷ 4 = 0.75' },
  { topic:'Fractions',             q:'Convert 2/5 to a decimal.',                                                                               a:['0.4','.4','0.40'],           exp:'2 ÷ 5 = 0.4' },
  // Decimals
  { topic:'Decimals',              q:'Add: 3.45 + 2.8',                                                                                         a:['6.25'],                      exp:'Line up decimals: 3.45 + 2.80 = 6.25' },
  { topic:'Decimals',              q:'Multiply: 2.5 × 4',                                                                                       a:['10','10.0'],                 exp:'2.5 × 4 = 10' },
  { topic:'Decimals',              q:'Divide: 7.2 ÷ 3',                                                                                         a:['2.4'],                       exp:'7.2 ÷ 3 = 2.4' },
  { topic:'Decimals',              q:'Subtract: 10.5 − 4.75',                                                                                   a:['5.75'],                      exp:'10.50 − 4.75 = 5.75' },
  // Integers
  { topic:'Integers',              q:'What is −5 + 8?',                                                                                         a:['3'],                         exp:'Start at −5, move 8 right on the number line: −5 + 8 = 3' },
  { topic:'Integers',              q:'What is −3 × −4?',                                                                                        a:['12'],                        exp:'Negative × Negative = Positive: 3 × 4 = 12' },
  { topic:'Integers',              q:'What is 7 − (−3)?',                                                                                       a:['10'],                        exp:'Subtracting a negative is the same as adding: 7 + 3 = 10' },
  { topic:'Integers',              q:'What is |−15|?',                                                                                          a:['15'],                        exp:'Absolute value = distance from 0. |−15| = 15' },
  { topic:'Integers',              q:'What is −8 ÷ 2?',                                                                                         a:['-4','−4'],                   exp:'Negative ÷ Positive = Negative. 8 ÷ 2 = 4, so −8 ÷ 2 = −4' },
  // Exponents
  { topic:'Exponents',             q:'What is 3³ (3 to the third power)?',                                                                      a:['27'],                        exp:'3³ = 3 × 3 × 3 = 9 × 3 = 27' },
  { topic:'Exponents',             q:'What is 2⁵ (2 to the fifth power)?',                                                                      a:['32'],                        exp:'2⁵ = 2×2×2×2×2 = 32' },
  { topic:'Exponents',             q:'What is 5²?',                                                                                             a:['25'],                        exp:'5² = 5 × 5 = 25' },
  { topic:'Exponents',             q:'What is 10³?',                                                                                            a:['1000'],                      exp:'10³ = 10 × 10 × 10 = 1000' },
  // Order of Operations
  { topic:'Order of Operations',   q:'Evaluate: 3 + 4 × 2',                                                                                    a:['11'],                        exp:'Multiply first (PEMDAS): 4 × 2 = 8. Then add: 3 + 8 = 11' },
  { topic:'Order of Operations',   q:'Evaluate: (5 + 3) × 2 − 4',                                                                              a:['12'],                        exp:'Parentheses: 5+3=8. Multiply: 8×2=16. Subtract: 16−4=12' },
  { topic:'Order of Operations',   q:'Evaluate: 4 × (3 + 2) − 6',                                                                              a:['14'],                        exp:'Parentheses: 3+2=5. Multiply: 4×5=20. Subtract: 20−6=14' },
  { topic:'Order of Operations',   q:'Evaluate: 2³ + 6 ÷ 2',                                                                                   a:['11'],                        exp:'Exponent first: 2³=8. Division: 6÷2=3. Add: 8+3=11' },
  // Algebra
  { topic:'Algebra',               q:'Solve for x: x + 7 = 15',                                                                                a:['8','x=8','x = 8'],          exp:'Subtract 7 from both sides: x = 15 − 7 = 8' },
  { topic:'Algebra',               q:'Solve for x: 3x = 24',                                                                                   a:['8','x=8','x = 8'],          exp:'Divide both sides by 3: x = 24 ÷ 3 = 8' },
  { topic:'Algebra',               q:'Solve for x: x − 5 = 12',                                                                                a:['17','x=17','x = 17'],       exp:'Add 5 to both sides: x = 12 + 5 = 17' },
  { topic:'Algebra',               q:'Evaluate 2n + 3 when n = 5',                                                                             a:['13'],                        exp:'2(5) + 3 = 10 + 3 = 13' },
  { topic:'Algebra',               q:'Solve: 2x + 3 = 11',                                                                                     a:['4','x=4','x = 4'],          exp:'Subtract 3: 2x = 8. Divide by 2: x = 4' },
  // Geometry
  { topic:'Geometry',              q:'Find the area of a rectangle with length 9 and width 5.',                                                  a:['45'],                        exp:'Area = length × width = 9 × 5 = 45 square units' },
  { topic:'Geometry',              q:'Find the perimeter of a square with side length 7.',                                                       a:['28'],                        exp:'Perimeter = 4 × side = 4 × 7 = 28 units' },
  { topic:'Geometry',              q:'A triangle has base 8 and height 6. What is its area?',                                                    a:['24'],                        exp:'Area = ½ × base × height = 0.5 × 8 × 6 = 24 square units' },
  { topic:'Geometry',              q:'Find the volume of a rectangular prism: length 4, width 3, height 5.',                                     a:['60'],                        exp:'Volume = l × w × h = 4 × 3 × 5 = 60 cubic units' },
  { topic:'Geometry',              q:'A triangle has base 10 and height 4. What is its area?',                                                   a:['20'],                        exp:'Area = ½ × 10 × 4 = 20 square units' },
  // Statistics
  { topic:'Statistics',            q:'Find the mean of: 4, 7, 9, 12, 8',                                                                       a:['8'],                         exp:'Sum = 40. Count = 5. Mean = 40 ÷ 5 = 8' },
  { topic:'Statistics',            q:'Find the median of: 3, 7, 9, 15, 21',                                                                     a:['9'],                         exp:'Already in order. Middle value (3rd of 5) = 9' },
  { topic:'Statistics',            q:'Find the mode of: 2, 3, 3, 5, 7, 3, 8',                                                                  a:['3'],                         exp:'3 appears 3 times — more than any other number' },
  { topic:'Statistics',            q:'Find the range of: 15, 3, 9, 21, 6',                                                                      a:['18'],                        exp:'Range = Max − Min = 21 − 3 = 18' },
  { topic:'Statistics',            q:'Find the mean of: 10, 20, 30, 40',                                                                        a:['25'],                        exp:'Sum = 100. Count = 4. Mean = 100 ÷ 4 = 25' },
  // Number Theory
  { topic:'Number Theory',         q:'What is the Greatest Common Factor (GCF) of 12 and 18?',                                                   a:['6'],                         exp:'Factors of 12: 1,2,3,4,6,12. Factors of 18: 1,2,3,6,9,18. GCF = 6' },
  { topic:'Number Theory',         q:'What is the Least Common Multiple (LCM) of 4 and 6?',                                                      a:['12'],                        exp:'Multiples of 4: 4,8,12… Multiples of 6: 6,12… LCM = 12' },
  { topic:'Number Theory',         q:'What is the GCF of 24 and 36?',                                                                           a:['12'],                        exp:'Common factors include 1,2,3,4,6,12. GCF = 12' },
  { topic:'Number Theory',         q:'What is the LCM of 3 and 5?',                                                                             a:['15'],                        exp:'Multiples of 3: 3,6,9,12,15… Multiples of 5: 5,10,15… LCM = 15' },
  { topic:'Number Theory',         q:'What is the GCF of 8 and 20?',                                                                            a:['4'],                         exp:'Factors of 8: 1,2,4,8. Factors of 20: 1,2,4,5,10,20. GCF = 4' },
];

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let workQueue      = [];
let workIdx        = 0;
let sessionCorrect = 0;
let currentWorkQ   = null;

function loadNextWorkQuestion() {
  if (workIdx >= workQueue.length) {
    workQueue = shuffle(WORK_QUESTIONS);
    workIdx   = 0;
  }
  currentWorkQ = workQueue[workIdx++];
  renderWorkQuestion(currentWorkQ);
}

function renderWorkQuestion(q) {
  document.getElementById('work-topic-badge').textContent = q.topic;
  document.getElementById('work-question').textContent    = q.q;
  document.getElementById('work-hint').textContent        = '';
  const input = document.getElementById('work-input');
  input.value    = '';
  input.disabled = false;
  document.getElementById('work-answering').hidden = false;
  document.getElementById('work-result').hidden    = true;
}

function checkAnswer(userRaw, validAnswers) {
  const user = userRaw.trim().toLowerCase().replace(/\s+/g, ' ');
  return validAnswers.some(valid => {
    const v = valid.trim().toLowerCase();
    if (user === v) return true;
    const uNum = parseFloat(user.replace(/[^\d.\-]/g, ''));
    const vNum = parseFloat(v.replace(/[^\d.\-]/g, ''));
    if (!isNaN(uNum) && !isNaN(vNum) && Math.abs(uNum - vNum) < 0.001) return true;
    return false;
  });
}

async function handleWorkSubmit() {
  const input = document.getElementById('work-input');
  const raw   = input.value;
  if (!raw.trim()) { input.focus(); return; }

  const correct = checkAnswer(raw, currentWorkQ.a);

  const resultDiv   = document.getElementById('work-result');
  const banner      = document.getElementById('work-result-banner');
  const resultIcon  = document.getElementById('work-result-icon');
  const resultMsg   = document.getElementById('work-result-msg');
  const explanation = document.getElementById('work-explanation');
  const actionsDiv  = document.getElementById('work-result-actions');

  document.getElementById('work-answering').hidden = true;
  resultDiv.hidden    = false;
  explanation.hidden  = true;
  actionsDiv.innerHTML = '';

  if (correct) {
    sessionCorrect++;
    document.getElementById('work-session-correct').textContent = sessionCorrect;
    banner.className      = 'work-result-banner correct';
    resultIcon.textContent = '⭐';
    resultMsg.textContent  = 'Correct! +5 pts';
    await awardPoints(5);
    setTimeout(loadNextWorkQuestion, 1600);
  } else {
    banner.className      = 'work-result-banner wrong';
    resultIcon.textContent = '🤔';
    resultMsg.textContent  = 'Not quite! Try again or move on.';
    explanation.textContent = currentWorkQ.exp;

    const tryBtn = document.createElement('button');
    tryBtn.className   = 'btn-work-action';
    tryBtn.textContent = 'Try Again';
    tryBtn.addEventListener('click', () => {
      renderWorkQuestion(currentWorkQ);
      document.getElementById('work-input').focus();
    });

    const expBtn = document.createElement('button');
    expBtn.className   = 'btn-work-action';
    expBtn.textContent = 'See Explanation';
    expBtn.addEventListener('click', () => {
      explanation.hidden = !explanation.hidden;
      expBtn.textContent = explanation.hidden ? 'See Explanation' : 'Hide Explanation';
    });

    const nextBtn = document.createElement('button');
    nextBtn.className   = 'btn-work-action primary';
    nextBtn.textContent = 'Move On →';
    nextBtn.addEventListener('click', loadNextWorkQuestion);

    actionsDiv.appendChild(tryBtn);
    actionsDiv.appendChild(expBtn);
    actionsDiv.appendChild(nextBtn);
  }
}

document.getElementById('work-submit-btn').addEventListener('click', handleWorkSubmit);
document.getElementById('work-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleWorkSubmit();
});
