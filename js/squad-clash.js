// Squad Clash — game engine
import {
  CHARACTERS, ENEMIES, UNLOCK_COSTS, DEFAULT_UNLOCKED, drawCharacter
} from './characters.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const LS_AP       = 'sc_ap';
const LS_UNLOCKED = 'sc_unlocked';
const SQUAD_SIZE  = 3;
const AP_WIN      = 50;
const AP_LOSE     = 10;
const AP_KILL     = 5;
const TURN_DELAY  = 680;     // ms between turns
const HIT_FLASH   = 220;     // ms flash lasts
const COUNTER_MULT = 1.3;    // 30% bonus vs countered type

// ── State ─────────────────────────────────────────────────────────────────────
const gs = {
  screen: 'start',
  ap: 0,
  unlocked: [],

  // round
  revealedEnemies: [],  // 3 enemy data objects (from ENEMIES pool)
  draftSlots: [],       // up to 3 character ids
  previewId: null,      // tapped-once card id

  // battle
  fighters: [],         // BattleFighter[]
  battleRunning: false,
  abilityQueued: null,  // character id with queued ability
  killCount: 0,

  // canvas flash state: Map<id, 'hit'|'crit'|'heal'>
  flashMap: new Map(),
};

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
    apVal:        document.getElementById('sc-ap-val'),
    rosterBtn:    document.getElementById('sc-roster-open'),

    screenStart:  document.getElementById('sc-start'),
    screenReveal: document.getElementById('sc-reveal'),
    screenDraft:  document.getElementById('sc-draft'),
    screenBattle: document.getElementById('sc-battle'),
    screenResult: document.getElementById('sc-result'),

    playBtn:      document.getElementById('sc-play-btn'),

    revealRow:    document.getElementById('sc-reveal-row'),
    draftBtn:     document.getElementById('sc-draft-btn'),

    slotRow:      document.getElementById('sc-slot-row'),
    rosterScroll: document.getElementById('sc-roster-grid'),
    confirmBtn:   document.getElementById('sc-confirm-btn'),
    clearBtn:     document.getElementById('sc-clear-btn'),

    enemyHpRow:   document.getElementById('sc-enemy-hp-row'),
    playerHpRow:  document.getElementById('sc-player-hp-row'),
    arena:        document.getElementById('sc-arena'),
    abilityBtn:   document.getElementById('sc-ability-btn'),
    log:          document.getElementById('sc-battle-log'),

    resultIcon:   document.getElementById('sc-result-icon'),
    resultTitle:  document.getElementById('sc-result-title'),
    resultAp:     document.getElementById('sc-result-ap'),
    resultSub:    document.getElementById('sc-result-sub'),
    retryBtn:     document.getElementById('sc-retry-btn'),
    rosterLinkBtn:document.getElementById('sc-roster-link-btn'),

    rosterOverlay:document.getElementById('sc-roster-overlay'),
    rosterBody:   document.getElementById('sc-roster-body'),
    rosterClose:  document.getElementById('sc-roster-close'),
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

// ── AP display ────────────────────────────────────────────────────────────────
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
  gs.revealedEnemies.forEach(enemy => {
    dom.revealRow.appendChild(buildEnemyCard(enemy));
  });
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
  // Group by role for better visual flow
  const roles = ['Tank', 'Brawler', 'Caster', 'Archer'];
  const revealedTypes = gs.revealedEnemies.map(e => e.enemyType);

  roles.forEach(role => {
    CHARACTERS.filter(c => c.role === role)
      .sort((a, b) => a.tier - b.tier)
      .forEach(ch => {
        const card = buildPlayerCard(ch, revealedTypes);
        dom.rosterScroll.appendChild(card);
      });
  });
}

function buildPlayerCard(ch, revealedTypes) {
  const locked   = !gs.unlocked.includes(ch.id);
  const inSlot   = gs.draftSlots.includes(ch.id);
  const counters = revealedTypes
    ? ch.counters.filter(t => revealedTypes.includes(t))
    : [];

  const card = document.createElement('div');
  card.className = 'sc-card';
  card.dataset.id  = ch.id;
  card.dataset.tier = ch.tier;
  if (locked)  card.classList.add('locked');
  if (inSlot)  card.classList.add('in-squad');

  const shapeEl = makeShapeEl(ch.visual);

  card.innerHTML = `
    ${counters.length ? `<span class="sc-counter-match">COUNTERS</span>` : ''}
    ${locked ? `<span class="sc-card-lock">🔒</span>` : ''}
    <div class="sc-card-shape">${shapeEl}</div>
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

  const shapeEl = makeShapeEl(enemy.visual);

  card.innerHTML = `
    <div class="sc-card-shape">${shapeEl}</div>
    <div class="sc-card-name">${enemy.name}</div>
    <div class="sc-card-role">${enemy.enemyType}</div>
    <div class="sc-enemy-tags">${enemy.tags.map(t => `<span class="sc-enemy-tag">${t}</span>`).join('')}</div>
  `;
  return card;
}

function makeShapeEl(visual) {
  const shape = visual.shape;
  const cls   = { hexagon: 'sc-shape-hex', diamond: 'sc-shape-diamond',
                  circle: 'sc-shape-circle', triangle: 'sc-shape-triangle' }[shape] || 'sc-shape-circle';
  return `<div class="${cls}" style="background:${visual.accent};color:${visual.accent}"></div>`;
}

function handleDraftTap(id) {
  if (gs.draftSlots.includes(id)) {
    // Remove from squad
    gs.draftSlots = gs.draftSlots.filter(x => x !== id);
    gs.previewId  = null;
    refreshDraft();
    return;
  }
  if (gs.previewId === id) {
    // Second tap — confirm add
    if (gs.draftSlots.length < SQUAD_SIZE) {
      gs.draftSlots.push(id);
      gs.previewId = null;
      refreshDraft();
    }
    return;
  }
  // First tap — preview
  gs.previewId = id;
  refreshDraft();
}

function refreshDraft() {
  // Update card states without full re-render
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
  // Build fighter objects
  gs.fighters = [
    ...gs.draftSlots.map(id => makeFighter(CHARACTERS.find(c => c.id === id), true)),
    ...gs.revealedEnemies.map(e => makeFighter(e, false)),
  ];
  gs.battleRunning = true;
  gs.abilityQueued = null;
  gs.killCount = 0;

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
    hitCounter:    0,   // for HEAVY_SLAM
    absorbReady:   false,
    scaledAtk:     data.stats.atk,
    scaledDef:     data.stats.def,
  };
}

function buildBattleHud() {
  buildHpRow(dom.enemyHpRow,  gs.fighters.filter(f => !f.isPlayer), 'enemy');
  buildHpRow(dom.playerHpRow, gs.fighters.filter(f => f.isPlayer),  'player');
  updateAbilityBtn();
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

function updateHpBars() {
  gs.fighters.forEach(f => {
    const bar = document.getElementById(`hpf-${f.id}`);
    if (!bar) return;
    const pct = Math.max(0, (f.currentHp / f.stats.hp) * 100);
    bar.style.width = pct + '%';
  });
}

function updateAbilityBtn() {
  if (!dom.abilityBtn) return;
  const caster = getReadyCaster();
  if (!caster) {
    dom.abilityBtn.textContent = 'ABILITY';
    dom.abilityBtn.classList.add('on-cooldown');
    return;
  }
  const queued = gs.abilityQueued === caster.id;
  dom.abilityBtn.textContent = queued ? `✓ ${caster.ability.name}` : caster.ability.name;
  dom.abilityBtn.classList.toggle('on-cooldown', false);
  dom.abilityBtn.style.borderColor = queued ? 'var(--neon-teal)' : '';
  dom.abilityBtn.style.color       = queued ? 'var(--neon-teal)' : '';
}

function getReadyCaster() {
  return gs.fighters.find(f => f.isPlayer && f.alive && f.ability.cooldownLeft === 0);
}

async function runBattle() {
  while (gs.battleRunning && !isBattleOver()) {
    const order = getLivingOrder();
    for (const fighter of order) {
      if (!gs.battleRunning || !fighter.alive) continue;

      // Tick start-of-turn effects (burns, stuns)
      const stunned = tickStartOfTurn(fighter);
      updateHpBars();
      renderArena();
      if (stunned) {
        addLog(`${fighter.name} is stunned — skips turn.`, '');
        await sleep(TURN_DELAY * 0.7);
        continue;
      }

      if (fighter.isPlayer) {
        await playerTurn(fighter);
      } else {
        await enemyTurn(fighter);
      }

      if (isBattleOver()) break;
    }
  }
  if (gs.battleRunning) {
    gs.battleRunning = false;
    setTimeout(endBattle, 400);
  }
}

async function playerTurn(f) {
  const target = pickEnemyTarget();
  if (!target) return;

  // Absorb buff grants bonus ATK on this hit
  const absorbBonus = f.absorbReady ? Math.floor(f.scaledAtk * 0.5) : 0;
  f.absorbReady = false;

  // Check ability queue
  if (gs.abilityQueued === f.id && f.ability.cooldownLeft === 0) {
    gs.abilityQueued = null;
    await resolvePlayerAbility(f, target);
    f.ability.cooldownLeft = f.ability.cooldown;
  } else {
    const counterBonus = f.counters.includes(target.enemyType) ? COUNTER_MULT : 1;
    let dmg = calcDmg(f.scaledAtk + absorbBonus, target.scaledDef) * counterBonus;
    dmg = Math.round(dmg);
    const crit = f.counters.includes(target.enemyType);
    dealDamage(f, target, dmg, crit ? 'COUNTER HIT' : null);
    addLog(`${f.name} attacks ${target.name} for ${dmg} dmg${crit ? ' ⚡' : ''}.`, 'hit');
  }

  if (f.ability.cooldownLeft > 0) f.ability.cooldownLeft--;
  updateAbilityBtn();
  updateHpBars();
  renderArena();
  await sleep(TURN_DELAY);
}

async function enemyTurn(f) {
  const target = pickPlayerTarget(f);
  if (!target) return;

  f.hitCounter = (f.hitCounter || 0) + 1;

  let dmg = calcDmg(f.scaledAtk, target.scaledDef);

  // Behavior: HEAVY_SLAM every 3rd hit
  const heavySlam = f.ability.effectKey === 'heavy_slam' && f.hitCounter % 3 === 0;
  if (heavySlam) dmg = dmg * 3;

  // Behavior: LIFESTEAL
  const heals = f.ability.effectKey === 'lifesteal';

  dmg = Math.max(1, Math.round(dmg));
  dealDamage(f, target, dmg, heavySlam ? 'SLAM' : null);
  if (heals) {
    f.currentHp = Math.min(f.stats.hp, f.currentHp + Math.floor(dmg * 0.5));
    addLog(`${f.name} leeches ${Math.floor(dmg * 0.5)} HP.`, '');
  }
  addLog(`${f.name} hits ${target.name} for ${dmg}${heavySlam ? ' 💥' : ''}.`, 'hit');

  updateHpBars();
  renderArena();
  await sleep(TURN_DELAY);
}

async function resolvePlayerAbility(f, target) {
  const key = f.ability.effectKey;
  addLog(`${f.name} uses ${f.ability.name}!`, 'ability');

  switch (key) {
    case 'reduce_atk': {
      target.scaledAtk = Math.max(1, target.scaledAtk - 4);
      addEffect(target, { key: 'restore_atk', value: 4, turnsLeft: 2 });
      addLog(`${target.name} ATK reduced by 4 for 2 turns.`, 'ability');
      break;
    }
    case 'absorb_next': {
      f.absorbReady = true;
      addLog(`${f.name} ready to absorb — bonus ATK next hit.`, 'ability');
      break;
    }
    case 'void_anchor': {
      // Placeholder: deal 1× normal damage
      const dmg = calcDmg(f.scaledAtk, target.scaledDef);
      dealDamage(f, target, dmg, 'ANCHOR');
      break;
    }
    case 'stun_strike': {
      const dmg = calcDmg(f.scaledAtk * 2, target.scaledDef);
      dealDamage(f, target, dmg, 'STUN');
      addEffect(target, { key: 'stunned', value: 1, turnsLeft: 1 });
      addLog(`${target.name} stunned! (${dmg} dmg)`, 'ability');
      break;
    }
    case 'pierce_def': {
      const dmg = Math.max(1, f.scaledAtk);
      dealDamage(f, target, dmg, 'PIERCE');
      addLog(`${f.name} pierces armor! (${dmg} dmg)`, 'ability');
      break;
    }
    case 'shred_def': {
      target.scaledDef = Math.max(0, target.scaledDef - 8);
      const dmg = calcDmg(f.scaledAtk, target.scaledDef);
      dealDamage(f, target, dmg, 'SHRED');
      addLog(`${target.name} DEF shredded by 8! (${dmg} dmg)`, 'ability');
      break;
    }
    case 'type_burst': {
      const mult = target.enemyType === 'MECH' ? 2 : 1;
      const dmg  = calcDmg(f.scaledAtk * mult, target.scaledDef);
      dealDamage(f, target, dmg, mult === 2 ? 'SHIMMER' : null);
      // Mer sparkle: flash herself gold on ability use
      if (f.id === 'mer') flash(f.id, 'heal');
      addLog(`✦ SHIMMER — ${dmg} dmg vs ${target.enemyType}!`, 'ability');
      break;
    }
    case 'skip_turn': {
      addEffect(target, { key: 'stunned', value: 1, turnsLeft: 1 });
      addLog(`${target.name} is bound — loses next turn!`, 'ability');
      flash(target.id, 'crit');
      break;
    }
    case 'drain_all': {
      const enemies = gs.fighters.filter(fi => !fi.isPlayer && fi.alive);
      enemies.forEach(e => {
        const dmg = 15;
        dealDamage(f, e, dmg, 'DRAIN');
      });
      const players = gs.fighters.filter(fi => fi.isPlayer && fi.alive);
      const heal = Math.floor(15 * enemies.length / 2);
      players.forEach(p => { p.currentHp = Math.min(p.stats.hp, p.currentHp + heal); });
      addLog(`WITHER drains 15 from all enemies. Team heals ${heal} HP.`, 'ability');
      break;
    }
    case 'no_miss': {
      const dmg = calcDmg(f.scaledAtk, 0); // ignores DEF for miss scenario
      dealDamage(f, target, dmg, 'PHASE');
      addLog(`Phase shot! ${dmg} dmg — cannot miss.`, 'ability');
      break;
    }
    case 'burn_dot': {
      const dmg = calcDmg(f.scaledAtk, target.scaledDef);
      dealDamage(f, target, dmg, 'SCORCH');
      addEffect(target, { key: 'burn', value: 6, turnsLeft: 3 });
      addLog(`${target.name} scorched! ${dmg} dmg + 6 burn/turn × 3.`, 'ability');
      break;
    }
    case 'predict_strike': {
      const dmg = Math.round(calcDmg(f.scaledAtk, target.scaledDef) * 1.5);
      dealDamage(f, target, dmg, 'PREDICT');
      addEffect(target, { key: 'ability_lock', value: 1, turnsLeft: 2 });
      addLog(`PREDICT! ${dmg} dmg. ${target.name} ability disabled 2 turns.`, 'ability');
      break;
    }
    default: {
      const dmg = calcDmg(f.scaledAtk, target.scaledDef);
      dealDamage(f, target, dmg, null);
    }
  }
}

function calcDmg(atk, def) {
  return Math.max(1, atk - Math.floor(def * 0.5));
}

function dealDamage(attacker, target, dmg, label) {
  target.currentHp -= dmg;
  flash(target.id, 'hit');
  if (target.currentHp <= 0) {
    target.currentHp = 0;
    target.alive = false;
    gs.killCount++;
    addLog(`${target.name} defeated!`, 'kill');
    if (!target.isPlayer) {
      // Handle death explosion
      if (target.ability.effectKey === 'death_explode') {
        const players = gs.fighters.filter(f => f.isPlayer && f.alive);
        players.forEach(p => {
          p.currentHp = Math.max(0, p.currentHp - 30);
          if (p.currentHp <= 0) { p.currentHp = 0; p.alive = false; }
          flash(p.id, 'hit');
        });
        addLog(`${target.name} DETONATES! 30 dmg to all squad members!`, 'kill');
      }
    }
    // Scale on hit passive triggers on death too
    checkScalePassive(target);
  } else {
    checkScalePassive(target);
  }
}

function checkScalePassive(target) {
  if (target.ability.effectKey === 'scale_on_hit' && target.alive) {
    target.scaledAtk += 3;
    target.scaledDef += 2;
  }
}

function addEffect(target, effect) {
  // Replace existing same-key effect
  target.activeEffects = target.activeEffects.filter(e => e.key !== effect.key);
  target.activeEffects.push({ ...effect });
}

function tickStartOfTurn(fighter) {
  let stunned = false;
  const remaining = [];
  for (const eff of fighter.activeEffects) {
    if (eff.key === 'stunned') {
      stunned = true;
    }
    if (eff.key === 'burn') {
      fighter.currentHp = Math.max(0, fighter.currentHp - eff.value);
      if (fighter.currentHp <= 0) { fighter.alive = false; fighter.currentHp = 0; gs.killCount++; }
      addLog(`${fighter.name} burns for ${eff.value} HP.`, '');
    }
    eff.turnsLeft--;
    if (eff.turnsLeft > 0) remaining.push(eff);
    else if (eff.key === 'restore_atk') fighter.scaledAtk += eff.value;
  }
  fighter.activeEffects = remaining;
  return stunned;
}

function pickEnemyTarget() {
  const enemies = gs.fighters.filter(f => !f.isPlayer && f.alive);
  return enemies[0] || null;
}

function pickPlayerTarget(enemy) {
  const players = gs.fighters.filter(f => f.isPlayer && f.alive);
  if (!players.length) return null;

  if (enemy.ability.effectKey === 'hunt_weak') {
    return players.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
  }
  // Default: random player
  return players[Math.floor(Math.random() * players.length)];
}

function getLivingOrder() {
  return [...gs.fighters]
    .filter(f => f.alive)
    .sort((a, b) => b.stats.spd - a.stats.spd);
}

function isBattleOver() {
  const playersAlive = gs.fighters.some(f => f.isPlayer  && f.alive);
  const enemiesAlive = gs.fighters.some(f => !f.isPlayer && f.alive);
  return !playersAlive || !enemiesAlive;
}

function endBattle() {
  const playersAlive = gs.fighters.some(f => f.isPlayer && f.alive);
  const win = playersAlive;
  const earnedAp = (win ? AP_WIN : AP_LOSE) + gs.killCount * AP_KILL;
  addAp(earnedAp);

  dom.resultIcon.textContent  = win ? '⚡' : '💀';
  dom.resultTitle.textContent = win ? 'VICTORY' : 'DEFEATED';
  dom.resultTitle.className   = `sc-result-title ${win ? 'win' : 'lose'}`;
  dom.resultAp.textContent    = `+${earnedAp} AP earned`;
  dom.resultSub.textContent   = win
    ? `${gs.killCount} enemies destroyed. Squad held the line.`
    : `${gs.killCount} enemy kills before the squad fell.`;

  showScreen('result');
}

// ── Canvas ────────────────────────────────────────────────────────────────────
let flashTimers = {};

function flash(id, type) {
  gs.flashMap.set(id, type);
  clearTimeout(flashTimers[id]);
  flashTimers[id] = setTimeout(() => { gs.flashMap.delete(id); renderArena(); }, HIT_FLASH);
}

function resizeArena() {
  const canvas = dom.arena;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

function renderArena() {
  const canvas = dom.arena;
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const W    = canvas.width  / dpr;
  const H    = canvas.height / dpr;
  const ctx  = canvas.getContext('2d');
  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);

  // Background scanlines (subtle)
  ctx.fillStyle = '#07071A';
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, y, W, 1);
  }

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.5);
  ctx.stroke();

  const enemies = gs.fighters.filter(f => !f.isPlayer);
  const players = gs.fighters.filter(f => f.isPlayer);

  const positions = buildPositions(enemies, W, H * 0.28);
  const pPositions = buildPositions(players, W, H * 0.72);

  enemies.forEach((f, i) => renderFighter(ctx, f, positions[i], H));
  players.forEach((f, i) => renderFighter(ctx, f, pPositions[i], H));
}

function buildPositions(fighters, W, cy) {
  const count   = fighters.length;
  const spacing = W / (count + 1);
  return fighters.map((_, i) => ({ x: spacing * (i + 1), y: cy }));
}

function renderFighter(ctx, f, pos, H) {
  const size = Math.min(H * 0.11, 32);
  ctx.save();

  if (!f.alive) {
    ctx.globalAlpha = 0.2;
    drawCharacter(ctx, f.visual, pos.x, pos.y, size * 0.8);
    ctx.restore();
    return;
  }

  const flashType = gs.flashMap.get(f.id);
  if (flashType === 'hit') {
    ctx.shadowColor = '#FF2D78';
    ctx.shadowBlur  = 20;
  } else if (flashType === 'crit') {
    ctx.shadowColor = '#00C2CC';
    ctx.shadowBlur  = 24;
  } else if (flashType === 'heal') {
    ctx.shadowColor = '#FFB800';
    ctx.shadowBlur  = 16;
  }

  drawCharacter(ctx, f.visual, pos.x, pos.y, size);

  // Name
  ctx.shadowBlur = 0;
  ctx.fillStyle  = flashType === 'hit' ? '#FF2D78' : 'rgba(238,238,248,0.7)';
  ctx.font       = `500 ${Math.max(8, H * 0.028)}px 'Satoshi', sans-serif`;
  ctx.textAlign  = 'center';
  ctx.fillText(f.name, pos.x, pos.y + size + 14);

  // HP bar
  const barW = size * 2.2;
  const barH = 3;
  const barX = pos.x - barW / 2;
  const barY = pos.y + size + 20;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(barX, barY, barW, barH);
  const pct  = Math.max(0, f.currentHp / f.stats.hp);
  const color = pct > 0.5 ? '#00C2CC' : pct > 0.25 ? '#FFB800' : '#FF2D78';
  ctx.fillStyle = color;
  ctx.fillRect(barX, barY, barW * pct, barH);

  ctx.restore();
}

// ── Battle log ────────────────────────────────────────────────────────────────
function addLog(text, type) {
  if (!dom.log) return;
  const line = document.createElement('div');
  line.className = `sc-log-line ${type}`;
  line.textContent = text;
  dom.log.appendChild(line);
  dom.log.scrollTop = dom.log.scrollHeight;
}

// ── Roster overlay ────────────────────────────────────────────────────────────
function openRoster() {
  buildFullRoster();
  dom.rosterOverlay.classList.add('open');
}
function closeRoster() {
  dom.rosterOverlay.classList.remove('open');
}

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

    CHARACTERS.filter(c => c.role === role).sort((a,b) => a.tier - b.tier).forEach(ch => {
      const locked = !gs.unlocked.includes(ch.id);
      const canAfford = gs.ap >= (UNLOCK_COSTS[ch.tier] || 0);
      const needsT2   = ch.tier === 3 && !gs.unlocked.find(id => {
        const c2 = CHARACTERS.find(c => c.id === id);
        return c2 && c2.role === ch.role && c2.tier === 2;
      });

      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '4px';

      const card = buildPlayerCard(ch, null);
      if (locked) card.classList.add('locked');
      wrap.appendChild(card);

      if (locked && UNLOCK_COSTS[ch.tier]) {
        const btn = document.createElement('button');
        btn.className = 'sc-unlock-btn';
        btn.textContent = needsT2 ? `Need T2 first` : `Unlock · ${UNLOCK_COSTS[ch.tier]} AP`;
        btn.disabled = !canAfford || needsT2;
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

  if (!dom.screenStart) return; // Squad Clash not in DOM

  refreshAp();

  // Start button
  dom.playBtn?.addEventListener('pointerup', startRound);

  // Reveal → Draft
  dom.draftBtn?.addEventListener('pointerup', startDraft);

  // Draft controls
  dom.confirmBtn?.addEventListener('pointerup', () => {
    if (gs.draftSlots.length === SQUAD_SIZE) startBattle();
  });
  dom.clearBtn?.addEventListener('pointerup', () => {
    gs.draftSlots = []; gs.previewId = null; refreshDraft();
  });

  // Ability button
  dom.abilityBtn?.addEventListener('pointerup', () => {
    const caster = getReadyCaster();
    if (!caster) return;
    if (gs.abilityQueued === caster.id) {
      gs.abilityQueued = null;
    } else {
      gs.abilityQueued = caster.id;
    }
    updateAbilityBtn();
  });

  // Result buttons
  dom.retryBtn?.addEventListener('pointerup', () => { gs.battleRunning = false; startRound(); });
  dom.rosterLinkBtn?.addEventListener('pointerup', () => { gs.battleRunning = false; openRoster(); });

  // Roster overlay
  dom.rosterBtn?.addEventListener('pointerup', openRoster);
  dom.rosterClose?.addEventListener('pointerup', closeRoster);

  // Close preview on outside tap (draft screen)
  document.addEventListener('pointerup', e => {
    if (gs.screen !== 'draft') return;
    if (!e.target.closest('.sc-card') && gs.previewId) {
      gs.previewId = null;
      refreshDraft();
    }
  });

  // Canvas resize
  window.addEventListener('resize', () => { resizeArena(); renderArena(); });
}

document.addEventListener('DOMContentLoaded', init);
