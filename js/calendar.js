import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX }
  from './firebase-config.js';
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, where
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// ── Firebase init ─────────────────────────────────────────────────────────
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);

// ── Device identity (localStorage) ───────────────────────────────────────
// Keys: cal_device_name, cal_device_color
let deviceName  = localStorage.getItem('cal_device_name')  || '';
let deviceColor = localStorage.getItem('cal_device_color') || '';

// ── View state ────────────────────────────────────────────────────────────
const today = new Date();
let viewYear  = today.getFullYear();
let viewMonth = today.getMonth(); // 0-indexed
let currentEvents = []; // all events for the viewed month
let unsubEvents   = null;

// ── DOM refs ──────────────────────────────────────────────────────────────
const authLoading      = document.getElementById('auth-loading');
const gate             = document.getElementById('passcode-gate');
const calRoot          = document.getElementById('cal-root');
const siteFooter       = document.getElementById('site-footer');
const gateError        = document.getElementById('gate-error');
const gateInputs       = document.getElementById('gate-inputs');
const digits           = Array.from(document.querySelectorAll('.gate-digit'));

const deviceSetupModal = document.getElementById('device-setup-modal');
const setupNameInput   = document.getElementById('setup-name-input');
const setupPalette     = document.getElementById('setup-palette');
const setupColorLabel  = document.getElementById('setup-color-label');
const setupSaveBtn     = document.getElementById('setup-save-btn');

const calMonthLabel    = document.getElementById('cal-month-label');
const calGrid          = document.getElementById('cal-grid');
const calPrevBtn       = document.getElementById('cal-prev-btn');
const calNextBtn       = document.getElementById('cal-next-btn');
const calDeviceRow     = document.getElementById('cal-device-row');
const calDeviceDot     = document.getElementById('cal-device-dot');
const calDeviceNameEl  = document.getElementById('cal-device-name');
const calDeviceChangeBtn = document.getElementById('cal-device-change-btn');

const addEventModal    = document.getElementById('add-event-modal');
const addEventDateLabel= document.getElementById('add-event-date-label');
const addEventName     = document.getElementById('add-event-name');
const addEventTime     = document.getElementById('add-event-time');
const addEventDesc     = document.getElementById('add-event-desc');
const addEventSaveBtn  = document.getElementById('add-event-save-btn');
const addEventCancelBtn= document.getElementById('add-event-cancel-btn');

const viewEventModal   = document.getElementById('view-event-modal');
const viewEventColorBar= document.getElementById('view-event-color-bar');
const viewEventName    = document.getElementById('view-event-name');
const viewEventMeta    = document.getElementById('view-event-meta');
const viewEventDesc    = document.getElementById('view-event-desc');
const viewEventDeleteBtn= document.getElementById('view-event-delete-btn');
const viewEventCloseBtn = document.getElementById('view-event-close-btn');

const dayViewModal     = document.getElementById('day-view-modal');
const dayViewTitle     = document.getElementById('day-view-title');
const dayViewEvents    = document.getElementById('day-view-events');
const dayViewAddBtn    = document.getElementById('day-view-add-btn');
const dayViewCloseBtn  = document.getElementById('day-view-close-btn');

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
  gate.hidden       = true;
  calRoot.hidden    = false;
  siteFooter.hidden = false;

  if (!deviceName || !deviceColor) {
    openDeviceSetup();
  } else {
    startCalendar();
  }
}

// ── Device setup modal ────────────────────────────────────────────────────
let selectedColor = '';

function openDeviceSetup() {
  deviceSetupModal.hidden = false;
  setupNameInput.focus();
}

Array.from(setupPalette.querySelectorAll('.color-swatch')).forEach(btn => {
  btn.addEventListener('click', () => {
    setupPalette.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedColor = btn.dataset.color;
    setupColorLabel.textContent = btn.getAttribute('title');
    updateSetupSaveBtn();
  });
});

setupNameInput.addEventListener('input', updateSetupSaveBtn);

function updateSetupSaveBtn() {
  setupSaveBtn.disabled = !(setupNameInput.value.trim() && selectedColor);
}

setupSaveBtn.addEventListener('click', () => {
  const name = setupNameInput.value.trim();
  if (!name || !selectedColor) return;
  deviceName  = name;
  deviceColor = selectedColor;
  localStorage.setItem('cal_device_name',  deviceName);
  localStorage.setItem('cal_device_color', deviceColor);
  deviceSetupModal.hidden = true;
  startCalendar();
});

calDeviceChangeBtn.addEventListener('click', () => {
  selectedColor = deviceColor;
  setupNameInput.value = deviceName;
  setupColorLabel.textContent = 'Current color shown below — pick a new one or save as-is';
  const swatches = Array.from(setupPalette.querySelectorAll('.color-swatch'));
  swatches.forEach(b => {
    b.classList.toggle('selected', b.dataset.color === deviceColor);
  });
  updateSetupSaveBtn();
  deviceSetupModal.hidden = false;
});

// ── Calendar core ─────────────────────────────────────────────────────────
function startCalendar() {
  renderDeviceRow();
  renderMonthLabel();
  subscribeMonth();
  calPrevBtn.addEventListener('click', () => { navigateMonth(-1); });
  calNextBtn.addEventListener('click', () => { navigateMonth(1);  });
}

function navigateMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0;  viewYear++; }
  renderMonthLabel();
  subscribeMonth();
}

function renderMonthLabel() {
  const d = new Date(viewYear, viewMonth, 1);
  calMonthLabel.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function yearMonth() {
  return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
}

function subscribeMonth() {
  if (unsubEvents) unsubEvents();
  const ym = yearMonth();
  const q  = query(collection(db, 'cal_events'), where('yearMonth', '==', ym));
  unsubEvents = onSnapshot(q, snap => {
    currentEvents = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.day - b.day) || ((a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0)));
    renderGrid();
  }, err => {
    console.error('Calendar snapshot error:', err);
    currentEvents = [];
    renderGrid();
  });
}

function renderGrid() {
  calGrid.innerHTML = '';

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Total cells: pad to complete rows
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    let day, isCurrentMonth = true;

    if (i < firstDay) {
      day = daysInPrev - firstDay + 1 + i;
      isCurrentMonth = false;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      isCurrentMonth = false;
    } else {
      day = i - firstDay + 1;
    }

    const dateStr = isCurrentMonth
      ? `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      : null;

    const isToday = dateStr === todayStr;

    const cell = document.createElement('div');
    cell.className = 'cal-day' +
      (isCurrentMonth ? '' : ' cal-day--other-month') +
      (isToday ? ' cal-day--today' : '');
    cell.setAttribute('role', 'gridcell');

    // Day number
    const numEl = document.createElement('div');
    numEl.className = 'cal-day-num';
    numEl.textContent = day;
    cell.appendChild(numEl);

    if (isCurrentMonth) {
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', `Open ${dateStr}`);
      cell.addEventListener('click', () => openDayView(day, dateStr));

      // Colored dots — visual indicators only, tap cell to see event list
      const dayEvents = currentEvents.filter(ev => ev.day === day);
      if (dayEvents.length > 0) {
        const dotsEl = document.createElement('div');
        dotsEl.className = 'cal-day-dots';
        const maxDots = 5;
        dayEvents.slice(0, maxDots).forEach(ev => {
          const dot = document.createElement('span');
          dot.className = 'cal-dot';
          dot.style.background = ev.color || '#4DA6FF';
          dotsEl.appendChild(dot);
        });
        if (dayEvents.length > maxDots) {
          const more = document.createElement('span');
          more.className = 'cal-dot-more';
          more.textContent = `+${dayEvents.length - maxDots}`;
          dotsEl.appendChild(more);
        }
        cell.appendChild(dotsEl);
      }
    }

    calGrid.appendChild(cell);
  }
}

// ── Day view sheet (mobile-first: tap day → sheet → events + add) ─────────
let dayViewDay     = null;
let dayViewDateStr = null;

function openDayView(day, dateStr) {
  dayViewDay     = day;
  dayViewDateStr = dateStr;

  const d = new Date(viewYear, viewMonth, day);
  dayViewTitle.textContent = d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  const dayEvents = currentEvents.filter(ev => ev.day === day);
  dayViewEvents.innerHTML = '';

  if (dayEvents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'day-view-empty';
    empty.textContent = 'No events yet';
    dayViewEvents.appendChild(empty);
  } else {
    dayEvents.forEach(ev => {
      const item = document.createElement('button');
      item.className = 'day-view-event-item';
      item.innerHTML =
        `<span class="day-view-dot" style="background:${escHtml(ev.color || '#4DA6FF')}"></span>` +
        `<span class="day-view-event-info">` +
          `<span class="day-view-event-name">${escHtml(ev.name)}</span>` +
          (ev.time ? `<span class="day-view-event-time">${escHtml(ev.time)}</span>` : '') +
        `</span>` +
        `<i class="ph-duotone ph-duotone-caret-right day-view-arrow" aria-hidden="true"></i>`;
      item.addEventListener('click', () => {
        dayViewModal.hidden = true;
        openViewEvent(ev);
      });
      dayViewEvents.appendChild(item);
    });
  }

  dayViewModal.hidden = false;
}

dayViewCloseBtn.addEventListener('click', () => { dayViewModal.hidden = true; });
dayViewModal.addEventListener('click', e => { if (e.target === dayViewModal) dayViewModal.hidden = true; });
dayViewAddBtn.addEventListener('click', () => {
  dayViewModal.hidden = true;
  openAddEvent(dayViewDay, dayViewDateStr);
});

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Add event modal ───────────────────────────────────────────────────────
let addEventDay = null;
let addEventDateStr = null;

function openAddEvent(day, dateStr) {
  addEventDay = day;
  addEventDateStr = dateStr;
  const d = new Date(viewYear, viewMonth, day);
  addEventDateLabel.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  addEventName.value = '';
  addEventTime.value = '';
  addEventDesc.value = '';
  addEventModal.hidden = false;
  addEventName.focus();
}

addEventSaveBtn.addEventListener('click', saveEvent);
addEventCancelBtn.addEventListener('click', () => { addEventModal.hidden = true; });
addEventModal.addEventListener('click', e => { if (e.target === addEventModal) addEventModal.hidden = true; });

addEventName.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveEvent(); } });

async function saveEvent() {
  const name = addEventName.value.trim();
  if (!name) { addEventName.focus(); return; }
  addEventModal.hidden = true;
  try {
    await addDoc(collection(db, 'cal_events'), {
      name,
      time:      addEventTime.value.trim(),
      desc:      addEventDesc.value.trim(),
      day:       addEventDay,
      yearMonth: yearMonth(),
      device:    deviceName,
      color:     deviceColor,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Save event error:', err);
  }
}

// ── View event modal ──────────────────────────────────────────────────────
let viewingEvent = null;

function openViewEvent(ev) {
  viewingEvent = ev;
  viewEventColorBar.style.background = ev.color || '#4DA6FF';
  viewEventName.textContent = ev.name;

  const d = new Date(viewYear, viewMonth, ev.day);
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  viewEventMeta.textContent = ev.time ? `${dateLabel} · ${ev.time}` : dateLabel;
  viewEventDesc.textContent = ev.desc || '';
  viewEventDesc.style.display = ev.desc ? 'block' : 'none';

  const canDelete = ev.device === deviceName && ev.color === deviceColor;
  viewEventDeleteBtn.hidden = !canDelete;

  viewEventModal.hidden = false;
}

viewEventCloseBtn.addEventListener('click',  () => { viewEventModal.hidden = true; });
viewEventModal.addEventListener('click', e => { if (e.target === viewEventModal) viewEventModal.hidden = true; });

viewEventDeleteBtn.addEventListener('click', async () => {
  if (!viewingEvent) return;
  viewEventModal.hidden = true;
  try {
    await deleteDoc(doc(db, 'cal_events', viewingEvent.id));
  } catch (err) {
    console.error('Delete event error:', err);
  }
  viewingEvent = null;
});

// ── Device row ────────────────────────────────────────────────────────────
function renderDeviceRow() {
  calDeviceDot.style.background  = deviceColor;
  calDeviceNameEl.textContent    = deviceName;
}
