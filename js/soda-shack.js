/* ==========================================================================
   BB's Dirty Soda Shack — Business Dashboard
   ========================================================================== */

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX }
  from './firebase-config.js';

const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);

// ── Shopping ingredients (the only 4 things she buys) ─────────────────────
// servingsPerUnit = drinks that 1 purchase unit yields
const INGREDIENTS = [
  { id: 'coke',   name: 'Coke',       detail: '12-pack · 12 cans',    costPerUnit: 9.00, servingsPerUnit: 12 },
  { id: 'sprite', name: 'Sprite',     detail: '12-pack · 12 cans',    costPerUnit: 9.00, servingsPerUnit: 12 },
  { id: 'dp',     name: 'Dr. Pepper', detail: '12-pack · 12 cans',    costPerUnit: 9.00, servingsPerUnit: 12 },
  { id: 'cream',  name: 'Creamer',    detail: '64oz bottle · 64 uses', costPerUnit: 6.00, servingsPerUnit: 64 },
];

// ── Menu (7 drinks, $5 each, 1 can + 1oz creamer per drink) ───────────────
const MENU_ITEMS = [
  { id: 'm1', name: 'The OG',              soda: 'dp',     accent: '#E0304A', sodaLabel: 'Dr. Pepper', flavors: 'Lime · Coconut · Creamer',               img: 'images/theOG.png' },
  { id: 'm2', name: 'Strawberry Kiss',     soda: 'dp',     accent: '#FF6B8A', sodaLabel: 'Dr. Pepper', flavors: 'Strawberry · Vanilla · Creamer',          img: 'images/strawberry-kiss.png' },
  { id: 'm3', name: 'Coconut Paradise',    soda: 'coke',   accent: '#00C2CC', sodaLabel: 'Coke',       flavors: 'Strawberry · Coconut · Creamer',          img: 'images/coconut-paradise.png' },
  { id: 'm4', name: 'Cola Dream',          soda: 'coke',   accent: '#4DA6FF', sodaLabel: 'Coke',       flavors: 'Vanilla · Coconut · Creamer',             img: 'images/cola-dream.png' },
  { id: 'm5', name: 'Shark Attack',        soda: 'sprite', accent: '#39FF14', sodaLabel: 'Sprite',     flavors: 'Blue Razz · Strawberry · Creamer · Gummies', img: 'images/shark-attack.png' },
  { id: 'm6', name: 'Strawberry Sunrise',  soda: 'sprite', accent: '#FF8C42', sodaLabel: 'Sprite',     flavors: 'Strawberry · Coconut · Creamer',          img: 'images/strawberry-sunrise.png' },
  { id: 'm7', name: 'Tropical Blast',      soda: 'sprite', accent: '#A020F0', sodaLabel: 'Sprite',     flavors: 'Blue Razz · Lime · Creamer',              img: 'images/tropical-blast.png' },
];

// ── Soda groups (for the breakdown display) ────────────────────────────────
const SODA_GROUPS = [
  { id: 'coke',   label: 'Coke',       accent: '#00C2CC',
    drinks: ['Coconut Paradise', 'Cola Dream'] },
  { id: 'sprite', label: 'Sprite',     accent: '#39FF14',
    drinks: ['Shark Attack', 'Strawberry Sunrise', 'Tropical Blast'] },
  { id: 'dp',     label: 'Dr. Pepper', accent: '#E0304A',
    drinks: ['The OG', 'Strawberry Kiss'] },
];

const SODA_PRICE = 5;

// ── Planner qty state (resets each page load — it's a shopping helper) ────
const qty = { coke: 0, sprite: 0, dp: 0, cream: 0 };

// ── DOM refs ───────────────────────────────────────────────────────────────
const authLoading   = document.getElementById('auth-loading');
const gate          = document.getElementById('passcode-gate');
const gateError     = document.getElementById('gate-error');
const gateSubmitBtn = document.getElementById('gate-submit');
const digits        = Array.from(document.querySelectorAll('.gate-digit'));
const brayRoot      = document.getElementById('bray-root');
const siteFooter    = document.getElementById('site-footer');

const ingredientList  = document.getElementById('ingredient-list');
const drinksBreakdown = document.getElementById('drinks-breakdown');
const statCost        = document.getElementById('stat-cost');
const statTotalDrinks = document.getElementById('stat-total-drinks');
const statProfit      = document.getElementById('stat-profit');

const openMenuBtn  = document.getElementById('open-menu-btn');
const menuOverlay  = document.getElementById('menu-overlay');
const closeMenuBtn = document.getElementById('close-menu-btn');
const printMenuBtn = document.getElementById('print-menu-btn');
const menuGrid     = document.getElementById('menu-grid');

const trackerEntries = document.getElementById('tracker-entries');
const trackerEmpty   = document.getElementById('tracker-empty');
const statGross      = document.getElementById('stat-gross');
const statExpenses   = document.getElementById('stat-expenses');
const statNet        = document.getElementById('stat-net');
const statSodas      = document.getElementById('stat-sodas');
const fabSale        = document.getElementById('fab-sale');
const fabExpense     = document.getElementById('fab-expense');

const saleModalBg  = document.getElementById('sale-modal-bg');
const saleDateEl   = document.getElementById('sale-date');
const saleAmountEl = document.getElementById('sale-amount');
const saleSodasEl  = document.getElementById('sale-sodas');
const saleNotesEl  = document.getElementById('sale-notes');
const saleCancel   = document.getElementById('sale-cancel');
const saleSave     = document.getElementById('sale-save');

const expModalBg  = document.getElementById('expense-modal-bg');
const expDateEl   = document.getElementById('exp-date');
const expAmountEl = document.getElementById('exp-amount');
const expCancel   = document.getElementById('exp-cancel');
const expSave     = document.getElementById('exp-save');

// ── Auth ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  authLoading.hidden = true;
  if (user) showApp();
  else { gate.hidden = false; digits[0].focus(); }
});

digits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/\D/g, '').slice(-1);
    if (d.value && i < digits.length - 1) digits[i + 1].focus();
    if (digits.every(x => x.value)) attemptLogin();
  });
  d.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !d.value && i > 0) digits[i - 1].focus();
  });
});

gateSubmitBtn.addEventListener('click', attemptLogin);

async function attemptLogin() {
  const code = digits.map(d => d.value).join('');
  if (code.length < 4) return;
  gateSubmitBtn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, FAMILY_EMAIL, PASSWORD_PREFIX + code);
  } catch {
    gateError.hidden = false;
    digits.forEach(d => { d.value = ''; });
    digits[0].focus();
    gateSubmitBtn.disabled = false;
  }
}

// ── Show app ───────────────────────────────────────────────────────────────
function showApp() {
  gate.hidden = true;
  brayRoot.hidden = false;
  siteFooter.hidden = false;
  renderIngredients();
  renderDrinksBreakdown();
  updateAllRows();
  updatePlannerSummary();
  renderMenuGrid();
  initTracker();
}

// ══════════════════════════════════════════════════════════════════════════
//  PLANNER
// ══════════════════════════════════════════════════════════════════════════

function renderIngredients() {
  ingredientList.innerHTML = INGREDIENTS.map(ing => `
    <div class="ingredient-row">
      <div class="ingredient-info">
        <div class="ingredient-name">${ing.name}</div>
        <div class="ingredient-detail">${ing.detail}</div>
      </div>
      <div class="ingredient-stepper">
        <button class="stepper-btn" data-action="dec" data-ing="${ing.id}"
          aria-label="Remove one ${ing.name}" disabled>−</button>
        <span class="stepper-qty" id="qty-${ing.id}">0</span>
        <button class="stepper-btn" data-action="inc" data-ing="${ing.id}"
          aria-label="Add one ${ing.name}">+</button>
      </div>
      <div class="ingredient-right">
        <span class="ingredient-yield zero" id="yield-${ing.id}">—</span>
        <span class="ingredient-cost" id="cost-${ing.id}">$0.00</span>
      </div>
    </div>`).join('');

  ingredientList.addEventListener('click', e => {
    const btn = e.target.closest('.stepper-btn');
    if (!btn) return;
    const id     = btn.dataset.ing;
    const action = btn.dataset.action;
    if (action === 'inc') qty[id]++;
    else if (action === 'dec' && qty[id] > 0) qty[id]--;
    updateAllRows();
    updatePlannerSummary();
    updateDrinkBars();
  });
}

// Updates every ingredient row — called on any qty change (only 4 rows, very fast)
function updateAllRows() {
  INGREDIENTS.forEach(ing => updatePlannerRow(ing.id));
}

function updatePlannerRow(id) {
  const ing    = INGREDIENTS.find(x => x.id === id);
  const qtyEl  = document.getElementById(`qty-${id}`);
  const yieldEl= document.getElementById(`yield-${id}`);
  const costEl = document.getElementById(`cost-${id}`);
  const decBtn = ingredientList.querySelector(`[data-action="dec"][data-ing="${id}"]`);

  if (qtyEl)  qtyEl.textContent = qty[id];
  if (decBtn) decBtn.disabled = qty[id] === 0;
  if (costEl) {
    const lineCost = qty[id] * ing.costPerUnit;
    costEl.textContent = lineCost > 0 ? `$${lineCost.toFixed(2)}` : '$0.00';
    costEl.classList.toggle('active', qty[id] > 0);
  }
  if (yieldEl) {
    if (id === 'cream') {
      // Creamer: show adequacy vs total cans
      const { totalCans, creamDrinks } = calcPlanner();
      if (qty.cream === 0) {
        yieldEl.textContent  = totalCans > 0 ? '⚠ add creamer' : '—';
        yieldEl.className    = totalCans > 0 ? 'ingredient-yield warn' : 'ingredient-yield zero';
      } else if (creamDrinks >= totalCans) {
        yieldEl.textContent  = '✓ enough';
        yieldEl.className    = 'ingredient-yield ok';
      } else {
        yieldEl.textContent  = `covers ${creamDrinks}`;
        yieldEl.className    = 'ingredient-yield warn';
      }
    } else {
      const total = qty[id] * ing.servingsPerUnit;
      yieldEl.textContent = total > 0 ? `${total} drinks` : '—';
      yieldEl.className   = `ingredient-yield${total === 0 ? ' zero' : ''}`;
    }
  }
}

// Core calc — every drink = 1 can + 1oz creamer, syrups are free
function calcPlanner() {
  const cokeCans   = qty.coke   * 12;
  const spriteCans = qty.sprite * 12;
  const dpCans     = qty.dp     * 12;
  const creamDrinks= qty.cream  * 64;  // 1oz per drink

  const totalCans  = cokeCans + spriteCans + dpCans;
  const maxDrinks  = Math.min(totalCans, creamDrinks);  // bottleneck

  const totalCost  = (qty.coke + qty.sprite + qty.dp) * 9 + qty.cream * 6;
  const revenue    = maxDrinks * SODA_PRICE;
  const profit     = revenue - totalCost;

  return { cokeCans, spriteCans, dpCans, creamDrinks, totalCans, maxDrinks, totalCost, revenue, profit };
}

function updatePlannerSummary() {
  const { maxDrinks, totalCost, profit } = calcPlanner();
  statCost.textContent        = `$${totalCost.toFixed(2)}`;
  statTotalDrinks.textContent = maxDrinks;
  statProfit.textContent      = `${profit < 0 ? '−' : ''}$${Math.abs(profit).toFixed(2)}`;
  statProfit.className        = `planner-stat-value ${profit > 0 ? 'gold' : profit < 0 ? 'pink' : ''}`;
}

function renderDrinksBreakdown() {
  const sodaRows = SODA_GROUPS.map(g => `
    <div class="soda-row" id="soda-row-${g.id}">
      <div class="soda-row-top">
        <span class="soda-dot" style="background:${g.accent};box-shadow:0 0 5px ${g.accent}88"></span>
        <span class="soda-label">${g.label}</span>
        <div class="soda-bar-track" aria-hidden="true">
          <div class="soda-bar-fill" id="bar-${g.id}" style="background:${g.accent};width:0%"></div>
        </div>
        <span class="soda-cans zero" id="dc-${g.id}">0 drinks</span>
      </div>
      <div class="soda-row-menu">${g.drinks.join(' · ')}</div>
    </div>`).join('');

  const creamRow = `
    <div class="cream-row empty" id="cream-row">
      <i class="ph-duotone ph-duotone-drop" aria-hidden="true"></i>
      <span id="cream-status-text">Add creamer to your cart</span>
    </div>`;

  drinksBreakdown.innerHTML = sodaRows + creamRow;
}

function updateDrinkBars() {
  const { cokeCans, spriteCans, dpCans, creamDrinks, totalCans } = calcPlanner();
  const counts = { coke: cokeCans, sprite: spriteCans, dp: dpCans };
  const maxCans = Math.max(cokeCans, spriteCans, dpCans, 1);

  SODA_GROUPS.forEach(g => {
    const n      = counts[g.id];
    const barEl  = document.getElementById(`bar-${g.id}`);
    const countEl= document.getElementById(`dc-${g.id}`);
    if (barEl)   barEl.style.width   = `${(n / maxCans) * 100}%`;
    if (countEl) {
      countEl.textContent = n > 0 ? `${n} drink${n !== 1 ? 's' : ''}` : '0 drinks';
      countEl.className   = `soda-cans${n === 0 ? ' zero' : ''}`;
    }
  });

  // Creamer status row
  const creamRow  = document.getElementById('cream-row');
  const creamText = document.getElementById('cream-status-text');
  if (!creamRow || !creamText) return;

  if (qty.cream === 0 && totalCans === 0) {
    creamRow.className = 'cream-row empty';
    creamText.textContent = 'Add creamer to your cart';
  } else if (qty.cream === 0) {
    creamRow.className = 'cream-row warn';
    creamText.textContent = `⚠ Need creamer for your ${totalCans} drinks`;
  } else if (creamDrinks >= totalCans) {
    const extra = creamDrinks - totalCans;
    creamRow.className = 'cream-row ok';
    creamText.textContent = `✓ ${qty.cream === 1 ? '1 bottle' : qty.cream + ' bottles'} covers all ${totalCans} drinks${extra > 0 ? ` (${extra} oz left over)` : ''}`;
  } else {
    creamRow.className = 'cream-row warn';
    creamText.textContent = `⚠ Only covers ${creamDrinks} of your ${totalCans} drinks — add ${Math.ceil((totalCans - creamDrinks) / 64)} more bottle`;
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  MENU OVERLAY
// ══════════════════════════════════════════════════════════════════════════

function renderMenuGrid() {
  menuGrid.innerHTML = MENU_ITEMS.map(item => `
    <div class="menu-card" style="--drink-accent:${item.accent}">
      <div class="menu-card-header">
        <img src="${item.img}" alt="${item.name}" class="menu-card-img-real" loading="lazy">
      </div>
      <div class="menu-card-body">
        <span class="menu-card-soda-badge">${item.sodaLabel}</span>
        <h3 class="menu-card-name">${item.name}</h3>
        <p class="menu-card-desc">${item.flavors}</p>
        <span class="menu-card-price">$5.00</span>
      </div>
    </div>`).join('');

  // Print page 2 — photo gallery (hidden on screen via CSS, shown on print)
  const photoPage = document.getElementById('print-photo-page');
  if (photoPage) {
    photoPage.innerHTML =
      `<p class="print-photo-heading">BB's Dirty Soda Shack</p>` +
      `<div class="print-photo-grid">` +
      MENU_ITEMS.map(item =>
        `<div class="print-photo-card">
          <img src="${item.img}" alt="${item.name}">
          <span class="print-photo-name">${item.name}</span>
        </div>`
      ).join('') +
      `</div>`;
  }
}

openMenuBtn.addEventListener('click', () => {
  menuOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  closeMenuBtn.focus();
});

closeMenuBtn.addEventListener('click', closeMenu);
printMenuBtn.addEventListener('click', () => window.print());

function closeMenu() {
  menuOverlay.hidden = true;
  document.body.style.overflow = '';
  openMenuBtn.focus();
}

// ══════════════════════════════════════════════════════════════════════════
//  SALES TRACKER (Firebase)
// ══════════════════════════════════════════════════════════════════════════

const salesCol = collection(db, 'bray_sales');

function initTracker() {
  const q = query(salesCol, orderBy('date', 'desc'));
  onSnapshot(q, snap => {
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTrackerStats(entries);
    renderTrackerLog(entries);
  }, err => console.error('[Bray] Tracker:', err));
}

function renderTrackerStats(entries) {
  let gross = 0, expenses = 0, sodas = 0;
  entries.forEach(e => {
    if (e.type === 'sale') { gross += e.amount || 0; sodas += e.sodasSold || 0; }
    else                   { expenses += e.amount || 0; }
  });
  const net = gross - expenses;
  statGross.textContent    = `$${gross.toFixed(2)}`;
  statExpenses.textContent = `$${expenses.toFixed(2)}`;
  statNet.textContent      = `${net < 0 ? '−' : ''}$${Math.abs(net).toFixed(2)}`;
  statNet.className        = `tracker-stat-value ${net >= 0 ? 'teal' : 'pink'}`;
  statSodas.textContent    = sodas;
}

function renderTrackerLog(entries) {
  trackerEntries.innerHTML = '';
  trackerEmpty.hidden = entries.length > 0;
  entries.forEach(entry => {
    const isSale = entry.type === 'sale';
    let detail = '';
    if (isSale && entry.sodasSold) detail += `${entry.sodasSold} soda${entry.sodasSold !== 1 ? 's' : ''}`;
    if (isSale && entry.notes)     detail += (detail ? ' · ' : '') + escHtml(entry.notes);

    const el = document.createElement('div');
    el.className = 'log-entry';
    el.innerHTML = `
      <div class="log-dot ${isSale ? 'sale' : 'expense'}"></div>
      <div class="log-body">
        <div class="log-top">
          <span class="log-date">${formatDate(entry.date)}</span>
          <span class="log-type">${isSale ? 'Sale' : 'Purchase'}</span>
          <span class="log-amount ${isSale ? 'sale' : 'expense'}">${isSale ? '+' : '−'}$${(entry.amount || 0).toFixed(2)}</span>
        </div>
        ${detail ? `<div class="log-detail">${detail}</div>` : ''}
      </div>
      <button class="log-delete" aria-label="Delete entry">
        <i class="ph-duotone ph-duotone-trash" aria-hidden="true"></i>
      </button>`;
    el.querySelector('.log-delete').addEventListener('click', () => deleteEntry(entry.id));
    trackerEntries.appendChild(el);
  });
}

async function deleteEntry(id) {
  try { await deleteDoc(doc(db, 'bray_sales', id)); }
  catch (err) { console.error('[Bray] Delete failed:', err); }
}

// ── Sale modal ─────────────────────────────────────────────────────────────
fabSale.addEventListener('click', () => {
  saleDateEl.value = todayStr(); saleAmountEl.value = ''; saleSodasEl.value = ''; saleNotesEl.value = '';
  saleModalBg.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => saleAmountEl.focus(), 60);
});

saleCancel.addEventListener('click', () => { saleModalBg.hidden = true; restoreScroll(); });

saleSave.addEventListener('click', async () => {
  const date   = saleDateEl.value;
  const amount = parseFloat(saleAmountEl.value);
  if (!date || isNaN(amount) || amount < 0) return;
  saleSave.disabled = true;
  try {
    await addDoc(salesCol, {
      type: 'sale', date, amount,
      sodasSold: parseInt(saleSodasEl.value, 10) || 0,
      notes: saleNotesEl.value.trim(),
      createdAt: serverTimestamp()
    });
    saleModalBg.hidden = true; restoreScroll();
  } catch (err) { console.error('[Bray] Save sale:', err); }
  saleSave.disabled = false;
});

// ── Expense modal ──────────────────────────────────────────────────────────
fabExpense.addEventListener('click', () => {
  expDateEl.value = todayStr(); expAmountEl.value = '';
  expModalBg.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => expAmountEl.focus(), 60);
});

expCancel.addEventListener('click', () => { expModalBg.hidden = true; restoreScroll(); });

expSave.addEventListener('click', async () => {
  const date   = expDateEl.value;
  const amount = parseFloat(expAmountEl.value);
  if (!date || isNaN(amount) || amount < 0) return;
  expSave.disabled = true;
  try {
    await addDoc(salesCol, { type: 'expense', date, amount, createdAt: serverTimestamp() });
    expModalBg.hidden = true; restoreScroll();
  } catch (err) { console.error('[Bray] Save expense:', err); }
  expSave.disabled = false;
});

// Backdrop dismissal
[saleModalBg, expModalBg].forEach(bg => {
  bg.addEventListener('click', e => { if (e.target === bg) { bg.hidden = true; restoreScroll(); } });
});

// Esc key
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!menuOverlay.hidden)    closeMenu();
  if (!saleModalBg.hidden)  { saleModalBg.hidden  = true; restoreScroll(); }
  if (!expModalBg.hidden)   { expModalBg.hidden   = true; restoreScroll(); }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function todayStr()    { return new Date().toISOString().split('T')[0]; }
function restoreScroll(){ document.body.style.overflow = ''; }
function escHtml(s)    { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
