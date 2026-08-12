import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

const STORAGE_KEY = 'maxi_kitchen_v3';

const recipes = [
  {
    id: 'maxaroni', name: 'Turkey Maxaroni', badge: 'LOWEST COST', icon: 'ph-duotone-bowl-food', accent: '#a45f08', wash: '#fff0ca',
    checkout: 17.56, perDay: 2.97, days: 7, kcal: 650, formula: 'Balance It #13662749', formulaUrl: 'https://balance.it/recipe/13662749',
    pantry: { name: 'Canola oil', price: 4.44 },
    preview: ['3 lb 85/15 turkey', '16 oz spaghetti', '3 cans green beans', '1 lb carrots'],
    items: [
      item('turkey', 'Ground turkey', '1 × 3 lb roll', 12.54, 'Cook all · use about 3/4 · or 5⅝ cups', true, false, 'https://www.walmart.com/ip/25122940'),
      item('pasta', 'Enriched spaghetti', '1 × 16 oz box', 1.24, 'Use 7¼ packed cups · about 7/8 box', true, false, 'https://www.walmart.com/ip/10534115'),
      item('beans', 'Regular canned green beans', '3 × 14.5 oz cans', 2.46, 'Drain · measure 3½ cups', false, false, 'https://www.walmart.com/ip/18026357745'),
      item('carrots', 'Raw carrots', '1 × 1 lb bag', 1.32, 'Grate · measure 2 cups · about 1/2 bag', false, false, 'https://www.walmart.com/ip/10451315'),
      item('oil', 'Canola oil', '1 × 48 fl oz', 4.44, 'Use 6 tbsp + ¾ tsp · reusable', true, true, 'https://www.walmart.com/ip/10450988')
    ],
    replacements: [
      ['Turkey', 'Any brand 85/15 ground turkey. Buy 3 lb total.'],
      ['Spaghetti', 'Any enriched plain spaghetti. Otherwise choose Turkey Rice.'],
      ['Green beans', 'Regular cut or French-style canned. No seasoned beans.'],
      ['Canola oil', 'Do not swap the oil type. Choose Beef Rice if unavailable.']
    ],
    steps: [
      'Cook the whole spaghetti box in plain water. Use 7¼ packed cups, about 7/8 of the cooked box.',
      'Cook the 3 lb turkey roll to 165°F. Use about 3/4, or 5⅝ cups; freeze the rest plain.',
      'Drain 3½ cups beans. Grate 2 cups carrots.',
      'Cool. Mix food with 6 tbsp + ¾ tsp canola oil. Add one omega choice: squeeze in 2 whole Omega 2X capsules OR mix in 1½ tsp Omega-3 Pet liquid.',
      'Scoop about 2⅔ cups into each of 7 containers. Divide any leftover evenly. Refrigerate 3; freeze 4.',
      'After reheating and cooling, add 2⅔ level tsp Balance It to each bowl.'
    ]
  },
  {
    id: 'turkey', name: 'Turkey Instant Rice', badge: 'RICE OPTION', icon: 'ph-duotone-grains', accent: '#27684f', wash: '#dcefe5',
    checkout: 19.29, perDay: 3.00, days: 7, kcal: 650, formula: 'Baseline #13662736 · rice adapted', formulaUrl: 'https://balance.it/recipe/13662736',
    pantry: { name: 'Canola oil', price: 4.44 },
    preview: ['3 lb 85/15 turkey', '28 oz instant rice', '3 cans green beans', '1 lb carrots'],
    items: [
      item('turkey', 'Ground turkey', '1 × 3 lb roll', 12.54, 'Use about 9/10 · or 6½ cups cooked', true, false, 'https://www.walmart.com/ip/25122940'),
      item('rice', 'Enriched instant white rice', '1 × 28 oz box', 2.97, 'Use 3¾ cups dry · about 44% of box', true, false, 'https://www.walmart.com/ip/10804528'),
      item('beans', 'Regular canned green beans', '3 × 14.5 oz cans', 2.46, 'Drain · measure 3⅛ cups', false, false, 'https://www.walmart.com/ip/18026357745'),
      item('carrots', 'Raw carrots', '1 × 1 lb bag', 1.32, 'Grate · measure 2 cups · about 1/2 bag', false, false, 'https://www.walmart.com/ip/10451315'),
      item('oil', 'Canola oil', '1 × 48 fl oz', 4.44, 'Use 5 tbsp + 1 tsp · reusable', true, true, 'https://www.walmart.com/ip/10450988')
    ],
    replacements: [
      ['Turkey', 'Any brand 85/15 ground turkey. Buy 3 lb total.'],
      ['Rice', 'Use enriched instant white rice only. If only 14 oz boxes are available, buy 2. This is calorie-matched to the baseline, not a regenerated formula.'],
      ['Green beans', 'Regular cut or French-style canned. No seasoned beans.'],
      ['Canola oil', 'Do not swap the oil type. Choose Beef Rice if unavailable.']
    ],
    steps: [
      'Prepare 3¾ cups dry instant rice with 3¾ cups water. Use all 7½ cups cooked.',
      'Cook the 3 lb turkey roll to 165°F. Use about 9/10, or 6½ cups; freeze the small remainder.',
      'Drain 3⅛ cups beans. Grate 2 cups carrots.',
      'Cool. Mix food with 5 tbsp + 1 tsp canola oil. Add one omega choice: squeeze in 2 whole Omega 2X capsules OR mix in 1½ tsp Omega-3 Pet liquid.',
      'Scoop about 2¾ cups into each of 7 containers. Divide any leftover evenly. Refrigerate 3; freeze 4.',
      'After reheating and cooling, add 2⅔ level tsp Balance It to each bowl.'
    ]
  },
  {
    id: 'beef', name: 'Beef Instant Rice', badge: 'BEEF OPTION', icon: 'ph-duotone-hamburger', accent: '#95483b', wash: '#f4dfda',
    checkout: 28.82, perDay: 3.99, days: 7, kcal: 630, formula: 'Baseline #13662682 · rice adapted', formulaUrl: 'https://balance.it/recipe/13662682',
    pantry: { name: 'Corn oil', price: 4.98 },
    preview: ['4 lb 85/15 beef', '28 oz instant rice', '2 cans green beans', '1 lb carrots'],
    items: [
      item('beef', 'Ground beef', '1 × 3 lb + 1 × 1 lb', 22.89, 'Use 3 lb + 3/4 of the 1 lb pack', true, false, 'https://www.walmart.com/ip/10315961'),
      item('rice', 'Enriched instant white rice', '1 × 28 oz box', 2.97, 'Use 2 cups dry · about 1/4 box', true, false, 'https://www.walmart.com/ip/10804528'),
      item('beans', 'Regular canned green beans', '2 × 14.5 oz cans', 1.64, 'Drain · measure 1½ cups', false, false, 'https://www.walmart.com/ip/18026357745'),
      item('carrots', 'Raw carrots', '1 × 1 lb bag', 1.32, 'Grate · measure 1⅛ cups · about 1/4 bag', false, false, 'https://www.walmart.com/ip/10451315'),
      item('oil', 'Corn oil', '1 × 48 fl oz', 4.98, 'Use 5 tbsp · reusable', true, true, 'https://www.walmart.com/ip/10451543')
    ],
    replacements: [
      ['Beef', 'Buy 4 lb total and match 85/15. One 3 lb package is not enough.'],
      ['Rice', 'Use enriched instant white rice only. One 14 oz box covers this recipe. This is calorie-matched to the baseline, not a regenerated formula.'],
      ['Green beans', 'Regular cut or French-style canned. No seasoned beans.'],
      ['Corn oil', 'Do not swap the oil type. Choose a turkey recipe if unavailable.']
    ],
    steps: [
      'Cook the full 3 lb beef pack plus about 3/4 of the 1 lb pack to 160°F. Save the remaining 1/4 lb raw.',
      'Prepare 2 cups dry instant rice with 2 cups water. Use all 4 cups cooked.',
      'Drain 1½ cups beans. Grate 1⅛ cups carrots.',
      'Cool. Mix food with 5 tbsp corn oil. Add one omega choice: squeeze in 2 whole Omega 2X capsules OR mix in 1½ tsp Omega-3 Pet liquid.',
      'Scoop about 2¼ cups into each of 7 containers. Divide any leftover evenly. Refrigerate 3; freeze 4.',
      'After reheating and cooling, add 2½ level tsp Balance It to each bowl.'
    ]
  }
];

function item(id, name, pack, price, use, critical, pantry, url) {
  return { id, name, pack, price, use, critical, pantry, url };
}

const saved = loadSaved();
const state = {
  open: recipes.some(recipe => recipe.id === saved.open) ? saved.open : null,
  checks: saved.checks || {},
  sharedOpen: Boolean(saved.sharedOpen)
};

const authLoading = document.getElementById('auth-loading');
const gate = document.getElementById('passcode-gate');
const root = document.getElementById('dog-chef-root');
const footer = document.getElementById('site-footer');
const gateError = document.getElementById('gate-error');
const digits = [...document.querySelectorAll('.gate-digit')];
const auth = getAuth(initializeApp(firebaseConfig));
let controlsBound = false;

onAuthStateChanged(auth, user => {
  window.__maxiKitchenReady = true;
  authLoading.hidden = true;
  if (user) showKitchen(); else gate.hidden = false;
});

digits.forEach((digit, index) => {
  digit.addEventListener('input', () => {
    digit.value = digit.value.replace(/\D/g, '').slice(-1);
    if (digit.value && index < 3) digits[index + 1].focus();
    if (digits.every(input => input.value)) tryUnlock();
  });
  digit.addEventListener('keydown', event => {
    if (event.key === 'Backspace' && !digit.value && index) digits[index - 1].focus();
  });
});
document.getElementById('gate-submit').addEventListener('click', tryUnlock);

async function tryUnlock() {
  const code = digits.map(input => input.value).join('');
  if (code.length !== 4) return;
  try {
    await signInWithEmailAndPassword(auth, FAMILY_EMAIL, PASSWORD_PREFIX + code);
  } catch {
    gateError.hidden = false;
    digits.forEach(input => { input.value = ''; });
    digits[0].focus();
  }
}

function showKitchen() {
  gate.hidden = true;
  root.hidden = false;
  footer.hidden = false;
  if (!controlsBound) {
    document.getElementById('lock-btn').addEventListener('click', async () => { await signOut(auth); location.reload(); });
    document.getElementById('shared-toggle').addEventListener('click', toggleShared);
    controlsBound = true;
  }
  render();
}

function render() {
  const stack = document.getElementById('recipe-stack');
  stack.innerHTML = recipes.map(renderRecipe).join('');
  stack.querySelectorAll('[data-recipe-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.recipeToggle;
      state.open = state.open === id ? null : id;
      save();
      render();
      if (state.open) document.querySelector(`[data-recipe-toggle="${state.open}"]`)?.focus({ preventScroll: true });
    });
  });
  stack.querySelectorAll('[data-shop-check]').forEach(input => {
    input.addEventListener('change', () => {
      state.checks[input.dataset.shopCheck] = input.checked;
      save();
      input.closest('.check-row').classList.toggle('is-checked', input.checked);
      updateProgress(input.dataset.recipe);
    });
  });
  stack.querySelectorAll('[data-clear]').forEach(button => {
    button.addEventListener('click', () => {
      const recipe = recipes.find(entry => entry.id === button.dataset.clear);
      recipe.items.forEach(product => { delete state.checks[`${recipe.id}-${product.id}`]; });
      save();
      render();
    });
  });
  stack.querySelectorAll('[data-subtoggle]').forEach(button => {
    button.addEventListener('click', () => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      const opening = panel.hidden;
      panel.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
      button.querySelector('i').className = `ph-duotone ph-duotone-caret-${opening ? 'up' : 'down'}`;
    });
  });
  renderShared();
}

function renderRecipe(recipe) {
  const open = state.open === recipe.id;
  const grabbed = recipe.items.filter(product => state.checks[`${recipe.id}-${product.id}`]).length;
  return `<article class="recipe-card ${open ? 'is-open' : ''}" style="--accent:${recipe.accent};--wash:${recipe.wash}">
    <button type="button" class="recipe-summary" data-recipe-toggle="${recipe.id}" aria-expanded="${open}" aria-controls="details-${recipe.id}">
      <div class="recipe-banner"><div><small>${recipe.badge}</small><h2>${recipe.name}</h2></div><span class="recipe-symbol"><i class="ph-duotone ${recipe.icon}" aria-hidden="true"></i></span></div>
      <div class="recipe-metrics">
        <div class="recipe-metric"><span>Food checkout</span><strong>${money(recipe.checkout)}</strong></div>
        <div class="recipe-metric"><span>Each day</span><strong>${money(recipe.perDay)}</strong></div>
        <div class="recipe-metric"><span>Batch</span><strong>${recipe.days} days</strong></div>
      </div>
      <ul class="quick-list">${recipe.preview.map(product => `<li>${product}</li>`).join('')}</ul>
      <div class="pantry-strip"><span><i class="ph-duotone ph-duotone-package" aria-hidden="true"></i> Pantry if needed</span><strong>${recipe.pantry.name} +${money(recipe.pantry.price)}</strong><i class="ph-duotone ph-duotone-caret-down pantry-caret" aria-hidden="true"></i></div>
    </button>
    <div class="recipe-details" id="details-${recipe.id}" ${open ? '' : 'hidden'}>
      <div class="detail-intro"><div><strong>Shopping list</strong><span id="progress-${recipe.id}">${grabbed} / ${recipe.items.length} checked</span></div><button type="button" class="clear-checks" data-clear="${recipe.id}">Clear</button></div>
      <ul class="check-list">${recipe.items.map(product => renderCheckRow(recipe, product)).join('')}</ul>
      <p class="critical-key"><i class="ph-duotone ph-duotone-star" aria-hidden="true"></i><span>Starred items must match the listed type. If unavailable, use a replacement below or choose another recipe.</span></p>
      ${renderSubPanel(recipe, 'replacements', 'Replacement notes', `<ul class="replacement-list">${recipe.replacements.map(([name, note]) => `<li><strong>${name}</strong><span>${note}</span></li>`).join('')}</ul>`)}
      ${renderSubPanel(recipe, 'cook', 'Cook + portion', `<ol class="cook-list">${recipe.steps.map(step => `<li>${step}</li>`).join('')}</ol><a class="formula-link" href="${recipe.formulaUrl}" target="_blank" rel="noopener">${recipe.formula} · ${recipe.kcal} kcal/day</a>`)}
    </div>
  </article>`;
}

function renderCheckRow(recipe, product) {
  const key = `${recipe.id}-${product.id}`;
  const checked = Boolean(state.checks[key]);
  return `<li class="check-row ${checked ? 'is-checked' : ''} ${product.pantry ? 'is-pantry' : ''}">
    <label class="check-box"><input type="checkbox" data-shop-check="${key}" data-recipe="${recipe.id}" ${checked ? 'checked' : ''}><span class="check-mark"><i class="ph-duotone ph-duotone-check" aria-hidden="true"></i></span></label>
    <div class="check-copy"><strong>${product.name}${product.critical ? '<i class="ph-duotone ph-duotone-star critical-star" aria-label="Match exactly"></i>' : ''}</strong><small>${product.pack} · ${product.use}</small></div>
    <span class="check-price">${product.pantry ? '+' : ''}${money(product.price)}</span>
  </li>`;
}

function renderSubPanel(recipe, type, label, content) {
  const id = `${type}-${recipe.id}`;
  return `<button type="button" class="detail-toggle" data-subtoggle aria-expanded="false" aria-controls="${id}"><span>${label}</span><i class="ph-duotone ph-duotone-caret-down" aria-hidden="true"></i></button><div class="detail-panel" id="${id}" hidden>${content}</div>`;
}

function updateProgress(recipeId) {
  const recipe = recipes.find(entry => entry.id === recipeId);
  const grabbed = recipe.items.filter(product => state.checks[`${recipe.id}-${product.id}`]).length;
  document.getElementById(`progress-${recipeId}`).textContent = `${grabbed} / ${recipe.items.length} checked`;
}

function toggleShared() {
  state.sharedOpen = !state.sharedOpen;
  save();
  renderShared();
}

function renderShared() {
  const card = document.querySelector('.shared-card');
  const button = document.getElementById('shared-toggle');
  const details = document.getElementById('shared-details');
  card.classList.toggle('is-open', state.sharedOpen);
  button.setAttribute('aria-expanded', String(state.sharedOpen));
  details.hidden = !state.sharedOpen;
  details.innerHTML = `
    <div class="supp-row"><div><span class="supp-label is-required">DAILY</span><strong>Balance It Canine</strong><small>2½–2⅔ level tsp per bowl · add after heat</small></div><a href="https://shop.balance.it/products/balance-it-canine" target="_blank" rel="noopener">Buy</a></div>
    <p class="omega-heading">Choose 1 omega · not both</p>
    <div class="supp-row omega-row"><div><span class="supp-label">LOWEST LONG-TERM</span><strong>Ultimate Omega 2X capsules</strong><small>2 whole caps · squeeze both into cooled batch · $42.46 / 30 batches</small></div><a href="https://www.walmart.com/ip/292505693" target="_blank" rel="noopener">Buy</a></div>
    <div class="supp-row omega-row"><div><span class="supp-label is-easy">EASIEST</span><strong>Omega-3 Pet liquid · 2 oz</strong><small>Dropper included · 1½ tsp into cooled batch · refrigerate · Walmart online $14.84 / about 8 batches</small></div><a href="https://www.walmart.com/ip/39453042" target="_blank" rel="noopener">Buy</a></div>
    <div class="supp-costs"><div><span>Lowest first buy</span><strong>$41.48</strong><small>3 powder pouches + liquid</small></div><div><span>Lowest long-term</span><strong>$127.78</strong><small>600 g powder + capsules</small></div></div>`;
}

function money(value) { return `$${value.toFixed(2)}`; }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadSaved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
