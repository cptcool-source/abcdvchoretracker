import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX }
  from './firebase-config.js';
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// ── Firebase init ─────────────────────────────────────────────────────────
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);

// ── DOM refs ──────────────────────────────────────────────────────────────
const authLoading   = document.getElementById('auth-loading');
const gate          = document.getElementById('passcode-gate');
const mealsRoot     = document.getElementById('meals-root');
const siteFooter    = document.getElementById('site-footer');
const gateError     = document.getElementById('gate-error');
const gateInputs    = document.getElementById('gate-inputs');
const digits        = Array.from(document.querySelectorAll('.gate-digit'));

const showAddItemBtn   = document.getElementById('show-add-item-btn');
const addItemForm      = document.getElementById('add-item-form');
const newItemInput     = document.getElementById('new-item-input');
const saveItemBtn      = document.getElementById('save-item-btn');
const cancelItemBtn    = document.getElementById('cancel-item-btn');
const itemsList        = document.getElementById('items-list');
const itemsEmpty       = document.getElementById('items-empty');

const showAddRecipeBtn  = document.getElementById('show-add-recipe-btn');
const addRecipeForm     = document.getElementById('add-recipe-form');
const recipeNameInput   = document.getElementById('recipe-name-input');
const recipeContentInput= document.getElementById('recipe-content-input');
const saveRecipeBtn     = document.getElementById('save-recipe-btn');
const cancelRecipeBtn   = document.getElementById('cancel-recipe-btn');
const recipesList       = document.getElementById('recipes-list');
const recipesEmpty      = document.getElementById('recipes-empty');

// ── Auth gate ─────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  authLoading.hidden = true;
  if (user) showApp();
  else      gate.hidden = false;
});

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

async function tryUnlock() {
  const code = digits.map(d => d.value).join('');
  if (code.length !== 4) return;
  try {
    await signInWithEmailAndPassword(auth, FAMILY_EMAIL, PASSWORD_PREFIX + code);
  } catch {
    gateError.hidden = false;
    gateInputs.classList.add('shake');
    digits.forEach(d => { d.value = ''; });
    setTimeout(() => gateInputs.classList.remove('shake'), 500);
    digits[0].focus();
  }
}

document.getElementById('lock-btn').addEventListener('click', async () => {
  await signOut(auth);
  location.reload();
});

// ── Show app ──────────────────────────────────────────────────────────────
function showApp() {
  gate.hidden        = true;
  mealsRoot.hidden   = false;
  siteFooter.hidden  = false;
  subscribeItems();
  subscribeRecipes();
}

// ── Shopping list ─────────────────────────────────────────────────────────
function subscribeItems() {
  const q = query(collection(db, 'meals_items'), orderBy('createdAt', 'asc'));
  onSnapshot(q, snap => renderItems(snap.docs));
}

function renderItems(docs) {
  itemsList.innerHTML = '';
  if (docs.length === 0) {
    itemsList.appendChild(itemsEmpty);
    itemsEmpty.hidden = false;
    return;
  }
  itemsEmpty.hidden = true;
  docs.forEach(d => {
    const li = document.createElement('li');
    li.className = 'item-row';
    li.innerHTML = `
      <span class="item-text">${escHtml(d.data().name)}</span>
      <button class="item-remove" data-id="${d.id}" aria-label="Remove item" touch-action="manipulation">✕</button>
    `;
    li.querySelector('.item-remove').addEventListener('click', () => removeItem(d.id));
    itemsList.appendChild(li);
  });
}

showAddItemBtn.addEventListener('click', () => {
  addItemForm.hidden = false;
  showAddItemBtn.hidden = true;
  newItemInput.focus();
});

cancelItemBtn.addEventListener('click', () => {
  addItemForm.hidden = true;
  showAddItemBtn.hidden = false;
  newItemInput.value = '';
});

newItemInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveItem();
});
saveItemBtn.addEventListener('click', saveItem);

async function saveItem() {
  const name = newItemInput.value.trim();
  if (!name) return;
  newItemInput.value = '';
  addItemForm.hidden = true;
  showAddItemBtn.hidden = false;
  try {
    await addDoc(collection(db, 'meals_items'), { name, createdAt: serverTimestamp() });
  } catch (err) {
    console.error('Save item error:', err);
  }
}

async function removeItem(id) {
  try {
    await deleteDoc(doc(db, 'meals_items', id));
  } catch (err) {
    console.error('Remove item error:', err);
  }
}

// ── Recipes ───────────────────────────────────────────────────────────────
function subscribeRecipes() {
  const q = query(collection(db, 'meals_recipes'), orderBy('createdAt', 'asc'));
  onSnapshot(q, snap => renderRecipes(snap.docs));
}

function renderRecipes(docs) {
  recipesList.innerHTML = '';
  if (docs.length === 0) {
    recipesList.appendChild(recipesEmpty);
    recipesEmpty.hidden = false;
    return;
  }
  recipesEmpty.hidden = true;
  docs.forEach(d => {
    const data = d.data();
    const item = document.createElement('div');
    item.className = 'recipe-item';
    item.dataset.id = d.id;
    item.innerHTML = `
      <div class="recipe-header">
        <i class="ph-duotone ph-duotone-caret-right recipe-toggle-icon" aria-hidden="true"></i>
        <span class="recipe-name">${escHtml(data.name)}</span>
        <button class="recipe-delete" data-id="${d.id}" aria-label="Delete recipe" touch-action="manipulation">✕</button>
      </div>
      <div class="recipe-body">
        <pre class="recipe-content">${escHtml(data.content || '')}</pre>
      </div>
    `;
    item.querySelector('.recipe-header').addEventListener('click', e => {
      if (e.target.classList.contains('recipe-delete')) return;
      item.classList.toggle('expanded');
    });
    item.querySelector('.recipe-delete').addEventListener('click', () => removeRecipe(d.id));
    recipesList.appendChild(item);
  });
}

showAddRecipeBtn.addEventListener('click', () => {
  addRecipeForm.hidden = false;
  showAddRecipeBtn.hidden = true;
  recipeNameInput.focus();
});

cancelRecipeBtn.addEventListener('click', () => {
  addRecipeForm.hidden = true;
  showAddRecipeBtn.hidden = false;
  recipeNameInput.value = '';
  recipeContentInput.value = '';
});

recipeNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); recipeContentInput.focus(); }
});
saveRecipeBtn.addEventListener('click', saveRecipe);

async function saveRecipe() {
  const name = recipeNameInput.value.trim();
  if (!name) { recipeNameInput.focus(); return; }
  const content = recipeContentInput.value;
  recipeNameInput.value = '';
  recipeContentInput.value = '';
  addRecipeForm.hidden = true;
  showAddRecipeBtn.hidden = false;
  try {
    await addDoc(collection(db, 'meals_recipes'), { name, content, createdAt: serverTimestamp() });
  } catch (err) {
    console.error('Save recipe error:', err);
  }
}

async function removeRecipe(id) {
  try {
    await deleteDoc(doc(db, 'meals_recipes', id));
  } catch (err) {
    console.error('Remove recipe error:', err);
  }
}

// ── Util ──────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
