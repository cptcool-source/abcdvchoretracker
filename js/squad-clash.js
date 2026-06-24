// Squad Clash — game engine
import {
  CHARACTERS, ENEMIES, UNLOCK_COSTS, DEFAULT_UNLOCKED, drawCharacter
} from './characters.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_AP        = 'sc_ap';
const LS_UNLOCKED  = 'sc_unlocked';
const SQUAD_SIZE   = 3;
const AP_WIN       = 50;
const AP_LOSE      = 10;
const AP_KILL      = 5;
const TURN_DELAY   = 700;
const HIT_FLASH    = 220;
const COUNTER_MULT = 1.3;
const CD_CIRC      = 144.51; // 2π × 23 (SVG ring circumference)

// ── State ─────────────────────────────────────────────────────────────────────
const gs = {
  screen: 'start',
  ap: 0,
  unlocked: [],

  revealedEnemies: [],
  draftSlots: [],
  previewId: null,

  fighters: [],
  battleRunning: false,
  abilityQueued: null,   // fighter id with queued ability
  selectedPortraitId: null,
  killCount: 0,

  flashMap: new Map(),
};

// Floaters live outside gs since they're render-only
let floaters       = [];
let rafFloaterId   = null;
let fighterPositions = {}; // {id: {x, y}} updated each render call

// ── Persistence ───────────────────────────────────────────────────────────────
function saveProgress() {
  localStorage.setItem(LS_AP, String(gs.ap));
  localStorage.setItem(LS_UNLOCKED, JSON.stringify(gs.unlocked));
}
function loadProgress() {
  gs.ap       = parseInt(localStorage.getItem(LS_AP) || '0', 10);
  gs.unlocked = JSON.parse(localStorage.getItem(LS_UNLOCKED) || 'null')
                 || [...DEFAULT_UNLOCKED];
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
let dom = {};
function queryDom() {
  dom = {
    apVal:          document.getElementById('sc-ap-val'),
    rosterBtn:      document.getElementById('sc-roster-open'),

    screenStart:    document.getElementById('sc-start'),
    screenReveal:   document.getElementById('sc-reveal'),
    screenDraft:    document.getElementById('sc-draft'),
    screenBattle:   document.getElementById('sc-battle'),
    screenResult:   document.getElementById('sc-result'),

    playBtn:        document.getElementById('sc-play-btn'),
    revealRow:      document.getElementById('sc-reveal-row'),
    draftBtn:       document.getElementById('sc-draft-btn'),

    slotRow:        document.getElementById('sc-slot-row'),
    rosterScroll:   document.getElementById('sc-roster-grid'),
    confirmBtn:     document.getElementById('sc-confirm-btn'),
    clearBtn:       document.getElementById('sc-clear-btn'),

    enemyHpRow:     document.getElementById('sc-enemy-hp-row'),
    portraitRow:    document.getElementById('sc-portrait-row'),
    arena:          document.getElementById('sc-arena'),
    log:            document.getElementById('sc-battle-log'),

    abilityCaster:  document.getElementById('sc-ability-caster'),
    abilityNameEl:  document.getElementById('sc-ability-name'),
    abilityHint:    document.getElementById('sc-ability-hint'),
    useAbilityBtn:  document.getElementById('sc-ability-btn'),

    resultIcon:     document.getElementById('sc-result-icon'),
    resultTitle:    document.getElementById('sc-result-title'),
    resultAp:       document.getElementById('sc-result-ap'),
    resultSub:      document.getElementById('sc-result-sub'),
    retryBtn:       document.getElementById('sc-retry-btn'),
    rosterLinkBtn:  document.getElementById('sc-roster-link-btn'),

    rosterOverlay:  document.getElementById('sc-roster-overlay'),
    rosterBody:     document.getElementById('sc-roster-body'),
    rosterClose:    document.getElementById('sc-roster-close'),
  };
}

// ── Screen nav ────────────────────────────────────────────────────────────────
function showScreen(name) {
  gs.screen = name;
  ['start','reveal','draft','battle','result'].forEach(s => {
    const el = dom[`screen${s.charAt(0).toUpperCase() + s.slice(1)}`];
    if (el) el.classList.toggle('active', s === name);
  });
}

// ── AP ────────────────────────────────────────────────────────────────────────
function refreshAp() {
  if (dom.apVal) dom.apVal.textContent = gs.ap.toLocaleString();
}
function addAp(amount) {
  gs.ap = Math.max(0, gs.ap + amount);
  saveProgress();
  refreshAp();
}

// ── Enemy reveal ──────────────────────────────────────────────────────────────
function startRound() {
  gs.revealedEnemies = drawEnemies();
  gs.draftSlots = [];
  gs.previewId  = null;
  gs.killCount  = 0;
  renderReveal();
  showScreen('reveal');
}

function drawEnemies() {
  const pool = [...ENEMIES];
  const picks = [];
  while (picks.length < 3 && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

function renderReveal() {
  if (!dom.revealRow) return;
  dom.revealRow.innerHTML = '';
  gs.revealedEnemies.forEach(enemy => dom.revealRow.appendChild(buildEnemyCard(enemy)));
}

// ── Draft ─────────────────────────────────────────────────────────────────────
function startDraft() {
  renderDraftSlots();
  renderRosterRow();
  updateConfirmBtn();
  showScreen('draft');
}

function renderDraftSlots() {
  if (!dom.slotRow) return;
  dom.slotRow.innerHTML = '';
  for (let i = 0; i < SQUAD_SIZE; i++) {
    const slot = document.createElement('div');
    slot.className = 'sc-slot';
    slot.dataset.idx = i;
    const charId = gs.draftSlots[i];
    if (charId) {
      const ch = CHARACTERS.find(c => c.id === charId);
      slot.classList.add('filled');
      slot.style.borderColor = ch.visual.accent;
      slot.textContent = ch.name;
      slot.style.color = ch.visual.accent;
      slot.style.fontSize = '0.55rem';
    } else {
      slot.textContent = `SLOT ${i + 1}`;
    }
    dom.slotRow.appendChild(slot);
  }
}

function renderRosterRow() {
  if (!dom.rosterScroll) return;
  dom.rosterScroll.innerHTML = '';
  const roles = ['Tank', 'Brawler', 'Caster', 'Archer'];
  const revealedTypes = gs.revealedEnemies.map(e => e.enemyType);
  roles.forEach(role =>
    CHARACTERS.filter(c => c.role === role)
      .sort((a, b) => a.tier - b.tier)
      .forEach(ch => dom.rosterScroll.appendChild(buildPlayerCard(ch, revealedTypes)))
  );
}

function buildPlayerCard(ch, revealedTypes) {
  const locked   = !gs.unlocked.includes(ch.id);
  const inSlot   = gs.draftSlots.includes(ch.id);
  const counters = revealedTypes
    ? ch.counters.filter(t => revealedTypes.includes(t))
    : [];

  const card = document.createElement('div');
  card.className = 'sc-card';
  card.dataset.id   = ch.id;
  card.dataset.tier = ch.tier;
  if (locked) card.classList.add('locked');
  if (inSlot)  card.classList.add('in-squad');

  card.innerHTML = `
    ${counters.length ? `<span class="sc-counter-match">COUNTERS</span>` : ''}
    ${locked ? `<span class="sc-card-lock">🔒</span>` : ''}
    <div class="sc-card-shape">${makeShapeEl(ch.visual)}</div>
    <div class="sc-card-name">${ch.name}</div>
    <div class="sc-card-role">${ch.role.toUpperCase()}</div>
    <div class="sc-card-counter">${ch.counters.join(' · ')}</div>
    <div class="sc-card-pips">${'<span class="sc-card-pip" style="background:'+ch.visual.accent+'"></span>'.repeat(ch.tier)}</div>
    <div class="sc-card-preview">
      <div class="sc-preview-name">${ch.name}</div>
      <div class="sc-preview-stats">
        <span>HP ${ch.stats.hp}</span><span>ATK ${ch.stats.atk}</span>
        <span>DEF ${ch.stats.def}</span><span>SPD ${ch.stats.spd}</span>
      </div>
      <div class="sc-preview-ability-name">${ch.ability.name}</div>
      <div class="sc-preview-ability-desc">${ch.ability.desc}</div>
      <div class="sc-preview-counter">Counters: ${ch.counters.join(', ')}</div>
      <div class="sc-preview-confirm-hint">Tap again to add →</div>
    </div>
  `;

  if (!locked) {
    card.addEventListener('pointerup', e => { e.stopPropagation(); handleDraftTap(ch.id); });
  }
  return card;
}

function buildEnemyCard(enemy) {
  const card = document.createElement('div');
  card.className = 'sc-card sc-enemy-card';
  card.dataset.tier = 1;
  card.innerHTML = `
    <div class="sc-card-shape">${makeShapeEl(enemy.visual)}</div>
    <div class="sc-card-name">${enemy.name}</div>
    <div class="sc-card-role">${enemy.enemyType}</div>
    <div class="sc-enemy-tags">${enemy.tags.map(t => `<span class="sc-enemy-tag">${t}</span>`).join('')}</div>
  `;
  return card;
}

function makeShapeEl(visual) {
  const cls = { hexagon: 'sc-shape-hex', diamond: 'sc-shape-diamond',
                circle: 'sc-shape-circle', triangle: 'sc-shape-triangle' }[visual.shape] || 'sc-shape-circle';
  return `<div class="${cls}" style="background:${visual.accent};color:${visual.accent}"></div>`;
}

function handleDraftTap(id) {
  if (gs.draftSlots.includes(id)) {
    gs.draftSlots = gs.draftSlots.filter(x => x !== id);
    gs.previewId  = null;
    refreshDraft();
    return;
  }
  if (gs.previewId === id) {
    if (gs.draftSlots.length < SQUAD_SIZE) {
      gs.draftSlots.push(id);
      gs.previewId = null;
      refreshDraft();
    }
    return;
  }
  gs.previewId = id;
  refreshDraft();
}

function refreshDraft() {
  document.querySelectorAll('#sc-roster-grid .sc-card').forEach(card => {
    const id = card.dataset.id;
    card.classList.toggle('tap-preview', id === gs.previewId);
    card.classList.toggle('in-squad', gs.draftSlots.includes(id));
  });
  renderDraftSlots();
  updateConfirmBtn();
}

function updateConfirmBtn() {
  if (!dom.confirmBtn) return;
  const ready = gs.draftSlots.length === SQUAD_SIZE;
  dom.confirmBtn.classList.toggle('ready', ready);
  dom.confirmBtn.disabled = !ready;
}

// ── Battle ────────────────────────────────────────────────────────────────────
function startBattle() {
  floaters = [];
  fighterPositions = {};
  gs.fighters = [
    ...gs.draftSlots.map(id => makeFighter(CHARACTERS.find(c => c.id === id), true)),
    ...gs.revealedEnemies.map(e => makeFighter(e, false)),
  ];
  gs.battleRunning   = true;
  gs.abilityQueued   = null;
  gs.killCount       = 0;

  buildBattleHud();
  showScreen('battle');
  resizeArena();
  renderArena();
  runBattle();
}

function makeFighter(data, isPlayer) {
  return {
    id:            data.id,
    name:          data.name,
    role:          data.role || null,
    isPlayer,
    enemyType:     data.enemyType || null,
    counters:      data.counters || [],
    stats:         { ...data.stats },
    ability:       { ...data.ability, cooldownLeft: 0 },
    visual:        data.visual,
    currentHp:     data.stats.hp,
    alive:         true,
    activeEffects: [],
    hitCounter:    0,
    absorbReady:   false,
    scaledAtk:     data.stats.atk,
    scaledDef:     data.stats.def,
  };
}

// ── Battle HUD: enemy HP + portrait row ──────────────────────────────────────
function buildBattleHud() {
  buildHpRow(dom.enemyHpRow, gs.fighters.filter(f => !f.isPlayer), 'enemy');
  buildPortraitRow();
  // Select first player by default
  const first = gs.fighters.find(f => f.isPlayer);
  gs.selectedPortraitId = first?.id || null;
  updateAbilityBar();
}

function buildHpRow(container, fighters, side) {
  if (!container) return;
  container.innerHTML = '';
  fighters.forEach(f => {
    const block = document.createElement('div');
    block.className = 'sc-hp-block';
    block.dataset.fid = f.id;
    block.innerHTML = `
      <div class="sc-hp-name">${f.name}</div>
      <div class="sc-hp-track"><div class="sc-hp-fill ${side}" id="hpf-${f.id}" style="width:100%"></div></div>
    `;
    container.appendChild(block);
  });
}

// ── Portrait row ──────────────────────────────────────────────────────────────
function buildPortraitRow() {
  const row = dom.portraitRow;
  if (!row) return;
  row.innerHTML = '';

  gs.fighters.filter(f => f.isPlayer).forEach(f => {
    const { accent, shape } = f.visual;
    const shapeCls = { hexagon: 'sc-shape-hex', diamond: 'sc-shape-diamond',
                       circle: 'sc-shape-circle', triangle: 'sc-shape-triangle' }[shape] || 'sc-shape-circle';

    const tile = document.createElement('div');
    tile.className = 'sc-portrait';
    tile.dataset.fid = f.id;
    tile.innerHTML = `
      <div class="sc-portrait-cd-wrap">
        <div class="sc-portrait-shape-bg">
          <div class="${shapeCls}" style="background:${accent};color:${accent}"></div>
        </div>
        <svg class="sc-cd-ring" viewBox="0 0 54 54">
          <circle class="sc-cd-track" cx="27" cy="27" r="23"/>
          <circle class="sc-cd-fill"  cx="27" cy="27" r="23"
            id="cdring-${f.id}"
            style="stroke:${accent}; stroke-dasharray:${CD_CIRC}; stroke-dashoffset:0;"/>
        </svg>
        <div class="sc-portrait-ready-badge visible" id="ready-${f.id}">RDY</div>
      </div>
      <div class="sc-portrait-name">${f.name}</div>
      <div class="sc-portrait-hp-track">
        <div class="sc-portrait-hp-fill" id="phf-${f.id}" style="width:100%; background:${accent}"></div>
      </div>
    `;

    tile.addEventListener('pointerup', e => {
      e.stopPropagation();
      if (!f.alive || !gs.battleRunning) return;
      gs.selectedPortraitId = f.id;
      updatePortraitSelection();
    });

    row.appendChild(tile);
  });
}

function updatePortraits() {
  let selectionMoved = false;

  gs.fighters.filter(f => f.isPlayer).forEach(f => {
    const portrait = document.querySelector(`.sc-portrait[data-fid="${f.id}"]`);
    if (!portrait) return;

    // HP bar
    const hpFill = document.getElementById(`phf-${f.id}`);
    if (hpFill) {
      const pct = Math.max(0, f.currentHp / f.stats.hp);
      hpFill.style.width   = (pct * 100) + '%';
      hpFill.style.background = pct > 0.5 ? f.visual.accent
                               : pct > 0.25 ? 'var(--neon-amber)'
                               : 'var(--neon-pink)';
    }

    // Cooldown ring: 0 offset = full = READY
    const cdFill = document.getElementById(`cdring-${f.id}`);
    if (cdFill) {
      const pct = f.ability.cooldown === 0 || f.ability.cooldownLeft === 0 ? 1
                : 1 - (f.ability.cooldownLeft / f.ability.cooldown);
      cdFill.style.strokeDashoffset = CD_CIRC * (1 - pct);
    }

    // RDY badge
    const badge = document.getElementById(`ready-${f.id}`);
    if (badge) badge.classList.toggle('visible', f.alive && f.ability.cooldownLeft === 0);

    // Dead state
    portrait.classList.toggle('dead', !f.alive);

    // Auto-migrate portrait selection when fighter dies
    if (!f.alive && gs.selectedPortraitId === f.id) {
      const next = gs.fighters.find(fi => fi.isPlayer && fi.alive && fi.id !== f.id);
      gs.selectedPortraitId = next?.id || null;
      selectionMoved = true;
    }
  });

  if (selectionMoved) updatePortraitSelection();
  updateAbilityBar();
}

function updatePortraitSelection() {
  document.querySelectorAll('.sc-portrait').forEach(p => {
    p.classList.toggle('selected', p.dataset.fid === gs.selectedPortraitId);
  });
  updateAbilityBar();
}

function setActingPortrait(id) {
  document.querySelectorAll('.sc-portrait').forEach(p => p.classList.remove('acting'));
  if (id) {
    const p = document.querySelector(`.sc-portrait[data-fid="${id}"]`);
    if (p) p.classList.add('acting');
  }
}

// ── Ability bar ───────────────────────────────────────────────────────────────
function updateAbilityBar() {
  const casterEl = dom.abilityCaster;
  const nameEl   = dom.abilityNameEl;
  const hintEl   = dom.abilityHint;
  const btn      = dom.useAbilityBtn;
  if (!casterEl || !btn) return;

  const fighter = gs.selectedPortraitId
    ? gs.fighters.find(f => f.id === gs.selectedPortraitId && f.isPlayer && f.alive)
    : null;

  if (!fighter) {
    casterEl.textContent  = '—';
    casterEl.style.color  = '';
    nameEl.textContent    = 'Select a hero below';
    hintEl.textContent    = 'Tap a portrait to focus';
    hintEl.className      = 'sc-ability-hint waiting';
    btn.textContent       = 'USE';
    btn.className         = 'btn-sc-use-ability on-cooldown';
    return;
  }

  const ready  = fighter.ability.cooldownLeft === 0;
  const queued = gs.abilityQueued === fighter.id;

  casterEl.textContent = fighter.name;
  casterEl.style.color = fighter.visual.accent;
  nameEl.textContent   = fighter.ability.name;

  if (queued) {
    hintEl.textContent = 'Queued for next attack turn ✓';
    hintEl.className   = 'sc-ability-hint ready';
    btn.textContent    = 'CANCEL';
    btn.className      = 'btn-sc-use-ability queued';
  } else if (ready) {
    const hint = buildContextHint(fighter);
    const isGood = /!|2×|stun|drain|burn|shred|lock|pierce/i.test(hint);
    hintEl.textContent = hint;
    hintEl.className   = `sc-ability-hint ${isGood ? 'good' : 'ready'}`;
    btn.textContent    = 'USE';
    btn.className      = 'btn-sc-use-ability';
  } else {
    const left = fighter.ability.cooldownLeft;
    hintEl.textContent = `Charges in ${left} more turn${left !== 1 ? 's' : ''}`;
    hintEl.className   = 'sc-ability-hint waiting';
    btn.textContent    = `○ ${left}`;
    btn.className      = 'btn-sc-use-ability on-cooldown';
  }
}

function buildContextHint(fighter) {
  const key     = fighter.ability.effectKey;
  const enemies = gs.fighters.filter(f => !f.isPlayer && f.alive);
  if (!enemies.length) return fighter.ability.desc;

  switch (key) {
    case 'type_burst': {
      const targets = enemies.filter(e => fighter.counters.includes(e.enemyType));
      return targets.length
        ? `${targets[0].name} is ${targets[0].enemyType} — 2× damage!`
        : 'No counter target alive — normal damage only';
    }
    case 'stun_strike':
      return `Stuns ${enemies[0].name} — blocks their next attack`;
    case 'pierce_def':
      return `Bypass ${enemies[0].name}'s DEF entirely (${enemies[0].scaledDef} pts ignored)`;
    case 'shred_def':
      return `Cuts ${enemies[0].name} DEF −8 permanently. Stacks!`;
    case 'reduce_atk':
      return `${enemies[0].name} ATK drops −4 for 2 full turns`;
    case 'absorb_next':
      return 'Converts the next hit you take into bonus ATK';
    case 'void_anchor':
      return 'Locks all enemy passives and evasion for 2 turns';
    case 'skip_turn':
      return `${enemies[0].name} loses their entire next turn`;
    case 'drain_all': {
      const total = 15 * enemies.length;
      return `Drain all ${enemies.length} enemies (${total} dmg) — team heals half`;
    }
    case 'burn_dot':
      return `${enemies[0].name} burns: −6 HP each turn × 3 turns`;
    case 'predict_strike':
      return `+50% damage + ${enemies[0].name} ability locked 2 turns`;
    case 'no_miss':
      return 'Guaranteed hit — ignores phase and evasion passives';
    default:
      return fighter.ability.desc;
  }
}

// ── Battle loop ───────────────────────────────────────────────────────────────
async function runBattle() {
  while (gs.battleRunning && !isBattleOver()) {
    const order = getLivingOrder();
    for (const fighter of order) {
      if (!gs.battleRunning || !fighter.alive) continue;

      setActingPortrait(fighter.isPlayer ? fighter.id : null);

      const stunned = tickStartOfTurn(fighter);
      updateHpBars();
      updatePortraits();
      renderArena();

      if (stunned) {
        addLog(`⚡ ${fighter.name} stunned — skips`, 'effect');
        await sleep(TURN_DELAY * 0.7);
        continue;
      }

      if (fighter.isPlayer) {
        await playerTurn(fighter);
      } else {
        await enemyTurn(fighter);
      }

      updatePortraits();
      if (isBattleOver()) break;
    }
  }

  setActingPortrait(null);
  if (gs.battleRunning) {
    gs.battleRunning = false;
    setTimeout(endBattle, 400);
  }
}

async function playerTurn(f) {
  const target = pickEnemyTarget();
  if (!target) return;

  const absorbBonus = f.absorbReady ? Math.floor(f.scaledAtk * 0.5) : 0;
  f.absorbReady = false;

  if (gs.abilityQueued === f.id && f.ability.cooldownLeft === 0) {
    gs.abilityQueued = null;
    await resolvePlayerAbility(f, target);
    f.ability.cooldownLeft = f.ability.cooldown;
  } else {
    const crit = f.counters.includes(target.enemyType);
    let dmg = Math.round(calcDmg(f.scaledAtk + absorbBonus, target.scaledDef) * (crit ? COUNTER_MULT : 1));
    dealDamage(f, target, dmg, crit ? 'counter' : 'damage');
    addLog(`⚔ ${f.name} → ${target.name}  −${dmg}${crit ? ' ⚡' : ''}`, 'hit');
  }

  if (f.ability.cooldownLeft > 0) f.ability.cooldownLeft--;
  updateHpBars();
  renderArena();
  await sleep(TURN_DELAY);
}

async function enemyTurn(f) {
  const target = pickPlayerTarget(f);
  if (!target) return;

  f.hitCounter = (f.hitCounter || 0) + 1;
  let dmg = calcDmg(f.scaledAtk, target.scaledDef);

  const heavySlam = f.ability.effectKey === 'heavy_slam' && f.hitCounter % 3 === 0;
  if (heavySlam) dmg = dmg * 3;

  const heals = f.ability.effectKey === 'lifesteal';

  dmg = Math.max(1, Math.round(dmg));
  dealDamage(f, target, dmg, heavySlam ? 'ability' : 'damage');

  if (heals) {
    const heal = Math.floor(dmg * 0.5);
    f.currentHp = Math.min(f.stats.hp, f.currentHp + heal);
    addLog(`❤ ${f.name} leeches +${heal}`, 'effect');
  }
  addLog(`⚔ ${f.name} → ${target.name}  −${dmg}${heavySlam ? ' 💥' : ''}`, 'hit');

  updateHpBars();
  renderArena();
  await sleep(TURN_DELAY);
}

async function resolvePlayerAbility(f, target) {
  const key = f.ability.effectKey;
  addLog(`✦ ${f.name} · ${f.ability.name}`, 'ability');

  switch (key) {
    case 'reduce_atk': {
      target.scaledAtk = Math.max(1, target.scaledAtk - 4);
      addEffect(target, { key: 'restore_atk', value: 4, turnsLeft: 2 });
      addLog(`🛡 ${target.name} ATK −4 for 2 turns`, 'ability');
      break;
    }
    case 'absorb_next': {
      f.absorbReady = true;
      addLog(`⬆ ${f.name} absorb active — bonus ATK next hit`, 'ability');
      break;
    }
    case 'void_anchor': {
      const dmg = calcDmg(f.scaledAtk, target.scaledDef);
      dealDamage(f, target, dmg, 'ability');
      addLog(`⚓ Anchored! ${target.name}  −${dmg}`, 'ability');
      break;
    }
    case 'stun_strike': {
      const dmg = Math.round(calcDmg(f.scaledAtk * 2, target.scaledDef));
      dealDamage(f, target, dmg, 'ability');
      addEffect(target, { key: 'stunned', value: 1, turnsLeft: 1 });
      addLog(`⚡ ${target.name} STUNNED!  −${dmg}`, 'ability');
      break;
    }
    case 'pierce_def': {
      const dmg = Math.max(1, f.scaledAtk);
      dealDamage(f, target, dmg, 'ability');
      addLog(`✦ Armor pierced!  −${dmg}`, 'ability');
      break;
    }
    case 'shred_def': {
      target.scaledDef = Math.max(0, target.scaledDef - 8);
      const dmg = Math.round(calcDmg(f.scaledAtk, target.scaledDef));
      dealDamage(f, target, dmg, 'ability');
      addLog(`🛡 ${target.name} DEF shredded −8  −${dmg}`, 'ability');
      break;
    }
    case 'type_burst': {
      const mult = target.enemyType === 'MECH' ? 2 : 1;
      const dmg  = Math.round(calcDmg(f.scaledAtk * mult, target.scaledDef));
      dealDamage(f, target, dmg, 'ability');
      if (f.id === 'mer') flash(f.id, 'heal'); // Mer sparkle
      addLog(`✦ SHIMMER  −${dmg}${mult === 2 ? ' 2×!' : ''}`, 'ability');
      break;
    }
    case 'skip_turn': {
      addEffect(target, { key: 'stunned', value: 1, turnsLeft: 1 });
      addLog(`⚡ ${target.name} BOUND — loses next turn`, 'ability');
      flash(target.id, 'crit');
      break;
    }
    case 'drain_all': {
      const enemies = gs.fighters.filter(fi => !fi.isPlayer && fi.alive);
      enemies.forEach(e => dealDamage(f, e, 15, 'ability'));
      const players = gs.fighters.filter(fi => fi.isPlayer && fi.alive);
      const heal = Math.floor(15 * enemies.length / 2);
      players.forEach(p => {
        p.currentHp = Math.min(p.stats.hp, p.currentHp + heal);
        spawnFloater(p.id, heal, 'heal');
      });
      addLog(`✦ WITHER  −15 each · squad +${heal}`, 'ability');
      break;
    }
    case 'no_miss': {
      const dmg = Math.max(1, f.scaledAtk);
      dealDamage(f, target, dmg, 'ability');
      addLog(`✦ Phase shot  −${dmg}`, 'ability');
      break;
    }
    case 'burn_dot': {
      const dmg = Math.round(calcDmg(f.scaledAtk, target.scaledDef));
      dealDamage(f, target, dmg, 'ability');
      addEffect(target, { key: 'burn', value: 6, turnsLeft: 3 });
      addLog(`🔥 ${target.name} burning!  −${dmg}`, 'ability');
      break;
    }
    case 'predict_strike': {
      const dmg = Math.round(calcDmg(f.scaledAtk, target.scaledDef) * 1.5);
      dealDamage(f, target, dmg, 'ability');
      addEffect(target, { key: 'ability_lock', value: 1, turnsLeft: 2 });
      addLog(`✦ PREDICT  −${dmg} · ${target.name} locked`, 'ability');
      break;
    }
    default: {
      const dmg = Math.round(calcDmg(f.scaledAtk, target.scaledDef));
      dealDamage(f, target, dmg, 'ability');
    }
  }
}

function calcDmg(atk, def) {
  return Math.max(1, atk - Math.floor(def * 0.5));
}

function dealDamage(attacker, target, dmg, type) {
  target.currentHp -= dmg;
  flash(target.id, 'hit');
  spawnFloater(target.id, dmg, type === 'ability' ? 'ability' : 'damage');

  if (target.currentHp <= 0) {
    target.currentHp = 0;
    target.alive = false;
    gs.killCount++;
    addLog(`💀 ${target.name} destroyed`, 'kill');

    if (!target.isPlayer && target.ability.effectKey === 'death_explode') {
      gs.fighters.filter(f => f.isPlayer && f.alive).forEach(p => {
        p.currentHp = Math.max(0, p.currentHp - 30);
        if (p.currentHp <= 0) { p.currentHp = 0; p.alive = false; gs.killCount++; }
        flash(p.id, 'hit');
        spawnFloater(p.id, 30, 'damage');
      });
      addLog(`💥 ${target.name} DETONATES! −30 all squad`, 'kill');
    }
  } else {
    // SCALE passive
    if (target.ability.effectKey === 'scale_on_hit') {
      target.scaledAtk += 3;
      target.scaledDef += 2;
    }
  }
}

function addEffect(target, effect) {
  target.activeEffects = target.activeEffects.filter(e => e.key !== effect.key);
  target.activeEffects.push({ ...effect });
}

function tickStartOfTurn(fighter) {
  let stunned = false;
  const remaining = [];
  for (const eff of fighter.activeEffects) {
    if (eff.key === 'stunned') stunned = true;
    if (eff.key === 'burn') {
      fighter.currentHp = Math.max(0, fighter.currentHp - eff.value);
      if (fighter.currentHp <= 0) { fighter.alive = false; fighter.currentHp = 0; gs.killCount++; }
      spawnFloater(fighter.id, eff.value, 'burn');
      addLog(`🔥 ${fighter.name}  −${eff.value}`, 'effect');
    }
    eff.turnsLeft--;
    if (eff.turnsLeft > 0) remaining.push(eff);
    else if (eff.key === 'restore_atk') fighter.scaledAtk += eff.value;
  }
  fighter.activeEffects = remaining;
  return stunned;
}

function pickEnemyTarget() {
  return gs.fighters.find(f => !f.isPlayer && f.alive) || null;
}

function pickPlayerTarget(enemy) {
  const players = gs.fighters.filter(f => f.isPlayer && f.alive);
  if (!players.length) return null;
  if (enemy.ability.effectKey === 'hunt_weak') {
    return players.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
  }
  return players[Math.floor(Math.random() * players.length)];
}

function getLivingOrder() {
  return [...gs.fighters].filter(f => f.alive).sort((a, b) => b.stats.spd - a.stats.spd);
}

function isBattleOver() {
  const playersAlive = gs.fighters.some(f => f.isPlayer  && f.alive);
  const enemiesAlive = gs.fighters.some(f => !f.isPlayer && f.alive);
  return !playersAlive || !enemiesAlive;
}

function endBattle() {
  const playersAlive = gs.fighters.some(f => f.isPlayer && f.alive);
  const win = playersAlive;
  const earned = (win ? AP_WIN : AP_LOSE) + gs.killCount * AP_KILL;
  addAp(earned);

  dom.resultIcon.textContent  = win ? '⚡' : '💀';
  dom.resultTitle.textContent = win ? 'VICTORY' : 'DEFEATED';
  dom.resultTitle.className   = `sc-result-title ${win ? 'win' : 'lose'}`;
  dom.resultAp.textContent    = `+${earned} AP earned`;
  dom.resultSub.textContent   = win
    ? `${gs.killCount} enemies destroyed. Squad held the line.`
    : `${gs.killCount} enemy kills before the squad fell.`;

  showScreen('result');
}

// ── HP bars (enemy only — player HP lives in portrait tiles) ──────────────────
function updateHpBars() {
  gs.fighters.filter(f => !f.isPlayer).forEach(f => {
    const bar = document.getElementById(`hpf-${f.id}`);
    if (!bar) return;
    bar.style.width = Math.max(0, (f.currentHp / f.stats.hp) * 100) + '%';
  });
}

// ── Battle log (icon-compressed) ──────────────────────────────────────────────
function addLog(text, type) {
  if (!dom.log) return;
  const line = document.createElement('div');
  line.className = `sc-log-line ${type}`;
  line.textContent = text;
  dom.log.appendChild(line);
  // Keep only the last 4 lines — older ones fall off top (flex column justify-end)
  while (dom.log.children.length > 4) dom.log.removeChild(dom.log.firstChild);
}

// ── Canvas flash ──────────────────────────────────────────────────────────────
let flashTimers = {};
function flash(id, type) {
  gs.flashMap.set(id, type);
  clearTimeout(flashTimers[id]);
  flashTimers[id] = setTimeout(() => { gs.flashMap.delete(id); renderArena(); }, HIT_FLASH);
}

// ── Floating damage numbers ───────────────────────────────────────────────────
function spawnFloater(fighterId, value, type) {
  const pos = fighterPositions[fighterId];
  if (!pos) return;
  floaters.push({
    x:        pos.x + (Math.random() - 0.5) * 18,
    y:        pos.y - 12,
    text:     type === 'heal' ? `+${value}` : `−${value}`,
    type,
    born:     performance.now(),
    duration: 920,
  });
  startFloaterLoop();
}

function startFloaterLoop() {
  if (rafFloaterId) return;
  function loop() {
    const now  = performance.now();
    const live = floaters.some(f => now - f.born < f.duration);
    if (live) {
      renderArena();
      rafFloaterId = requestAnimationFrame(loop);
    } else {
      floaters = [];
      renderArena();
      rafFloaterId = null;
    }
  }
  rafFloaterId = requestAnimationFrame(loop);
}

function drawFloaters(ctx) {
  const now = performance.now();
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    const age = now - f.born;
    if (age > f.duration) { floaters.splice(i, 1); continue; }
    const progress = age / f.duration;
    const alpha    = Math.max(0, 1 - progress * 1.4);
    const yOff     = -52 * progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    const isBig = f.type === 'ability' || f.type === 'burn';
    ctx.font = `bold ${isBig ? 15 : 12}px 'Geist Mono', monospace`;
    ctx.textAlign  = 'center';
    const col = f.type === 'heal'    ? '#00C2CC'
              : f.type === 'ability' ? '#FFB800'
              : f.type === 'burn'    ? '#FF8800'
              : 'rgba(238,238,248,0.9)';
    ctx.fillStyle  = col;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 7;
    ctx.fillText(f.text, f.x, f.y + yOff);
    ctx.restore();
  }
}

// ── Canvas renderer ───────────────────────────────────────────────────────────
function resizeArena() {
  const canvas = dom.arena;
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

function renderArena() {
  const canvas = dom.arena;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.width  / dpr;
  const H   = canvas.height / dpr;
  const ctx = canvas.getContext('2d');
  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#07071A';
  ctx.fillRect(0, 0, W, H);

  // Subtle scanlines
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y, W, 1);
  }

  // Divider line
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5);
  ctx.stroke();

  const enemies = gs.fighters.filter(f => !f.isPlayer);
  const players = gs.fighters.filter(f => f.isPlayer);

  const ePos = buildPositions(enemies, W, H * 0.27);
  const pPos = buildPositions(players, W, H * 0.73);

  enemies.forEach((f, i) => renderFighter(ctx, f, ePos[i], H));
  players.forEach((f, i) => renderFighter(ctx, f, pPos[i], H));

  drawFloaters(ctx);
}

function buildPositions(fighters, W, cy) {
  const count   = fighters.length;
  const spacing = W / (count + 1);
  return fighters.map((f, i) => {
    const pos = { x: spacing * (i + 1), y: cy };
    fighterPositions[f.id] = { x: pos.x, y: pos.y };
    return pos;
  });
}

function renderFighter(ctx, f, pos, H) {
  const size = Math.min(H * 0.11, 30);
  ctx.save();

  if (!f.alive) {
    ctx.globalAlpha = 0.18;
    drawCharacter(ctx, f.visual, pos.x, pos.y, size * 0.8);
    ctx.restore();
    return;
  }

  const flashType = gs.flashMap.get(f.id);
  ctx.shadowColor = flashType === 'hit'  ? '#FF2D78'
                  : flashType === 'crit' ? '#00C2CC'
                  : flashType === 'heal' ? '#FFB800'
                  : 'transparent';
  ctx.shadowBlur  = flashType ? 22 : 0;

  drawCharacter(ctx, f.visual, pos.x, pos.y, size);

  // Name label
  ctx.shadowBlur = 0;
  ctx.fillStyle  = flashType === 'hit' ? '#FF2D78' : 'rgba(238,238,248,0.65)';
  ctx.font       = `500 ${Math.max(8, H * 0.028)}px 'Satoshi', sans-serif`;
  ctx.textAlign  = 'center';
  ctx.fillText(f.name, pos.x, pos.y + size + 13);

  // HP bar
  const bW = size * 2.2;
  const bH = 3;
  const bX = pos.x - bW / 2;
  const bY = pos.y + size + 19;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(bX, bY, bW, bH);
  const pct  = Math.max(0, f.currentHp / f.stats.hp);
  ctx.fillStyle = pct > 0.5 ? '#00C2CC' : pct > 0.25 ? '#FFB800' : '#FF2D78';
  ctx.fillRect(bX, bY, bW * pct, bH);

  ctx.restore();
}

// ── Roster overlay ────────────────────────────────────────────────────────────
function openRoster() { buildFullRoster(); dom.rosterOverlay.classList.add('open'); }
function closeRoster() { dom.rosterOverlay.classList.remove('open'); }

function buildFullRoster() {
  if (!dom.rosterBody) return;
  dom.rosterBody.innerHTML = '';
  const roles = ['Tank', 'Brawler', 'Caster', 'Archer'];

  roles.forEach(role => {
    const group = document.createElement('div');
    group.className = 'sc-roster-role-group';
    group.innerHTML = `<div class="sc-roster-role-label">${role.toUpperCase()}S</div>`;
    const row = document.createElement('div');
    row.className = 'sc-roster-role-cards';

    CHARACTERS.filter(c => c.role === role).sort((a, b) => a.tier - b.tier).forEach(ch => {
      const locked    = !gs.unlocked.includes(ch.id);
      const canAfford = gs.ap >= (UNLOCK_COSTS[ch.tier] || 0);
      const needsT2   = ch.tier === 3 && !gs.unlocked.find(id => {
        const c2 = CHARACTERS.find(c => c.id === id);
        return c2 && c2.role === ch.role && c2.tier === 2;
      });

      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';

      const card = buildPlayerCard(ch, null);
      if (locked) card.classList.add('locked');
      wrap.appendChild(card);

      if (locked && UNLOCK_COSTS[ch.tier]) {
        const btn = document.createElement('button');
        btn.className   = 'sc-unlock-btn';
        btn.textContent = needsT2 ? 'Need T2 first' : `Unlock · ${UNLOCK_COSTS[ch.tier]} AP`;
        btn.disabled    = !canAfford || needsT2;
        btn.addEventListener('pointerup', () => unlockCharacter(ch.id, ch.tier));
        wrap.appendChild(btn);
      }

      row.appendChild(wrap);
    });

    group.appendChild(row);
    dom.rosterBody.appendChild(group);
  });
}

function unlockCharacter(id, tier) {
  const cost = UNLOCK_COSTS[tier] || 0;
  if (gs.ap < cost) return;
  gs.ap -= cost;
  gs.unlocked.push(id);
  saveProgress();
  refreshAp();
  buildFullRoster();
}

// ── Utility ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  loadProgress();
  queryDom();
  if (!dom.screenStart) return;

  refreshAp();

  dom.playBtn?.addEventListener('pointerup', startRound);
  dom.draftBtn?.addEventListener('pointerup', startDraft);

  dom.confirmBtn?.addEventListener('pointerup', () => {
    if (gs.draftSlots.length === SQUAD_SIZE) startBattle();
  });
  dom.clearBtn?.addEventListener('pointerup', () => {
    gs.draftSlots = []; gs.previewId = null; refreshDraft();
  });

  // Ability USE / CANCEL button
  dom.useAbilityBtn?.addEventListener('pointerup', () => {
    if (!gs.battleRunning) return;
    const fighter = gs.selectedPortraitId
      ? gs.fighters.find(f => f.id === gs.selectedPortraitId && f.isPlayer && f.alive)
      : null;
    if (!fighter) return;

    if (gs.abilityQueued === fighter.id) {
      gs.abilityQueued = null;
    } else if (fighter.ability.cooldownLeft === 0) {
      gs.abilityQueued = fighter.id;
    }
    updateAbilityBar();
  });

  dom.retryBtn?.addEventListener('pointerup', () => { gs.battleRunning = false; startRound(); });
  dom.rosterLinkBtn?.addEventListener('pointerup', () => { gs.battleRunning = false; openRoster(); });

  dom.rosterBtn?.addEventListener('pointerup', openRoster);
  dom.rosterClose?.addEventListener('pointerup', closeRoster);

  // Close card preview on outside tap
  document.addEventListener('pointerup', e => {
    if (gs.screen !== 'draft') return;
    if (!e.target.closest('.sc-card') && gs.previewId) {
      gs.previewId = null;
      refreshDraft();
    }
  });

  window.addEventListener('resize', () => {
    if (gs.screen === 'battle') { resizeArena(); renderArena(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
