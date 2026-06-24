// Squad Clash — character & enemy data
// sprite: null = use CSS shape fallback; swap in PNG path when art is ready

// ── Counter type system ──────────────────────────────────────────────────────
// Enemy types: BRUTE | MECH | SPECTER
// Each player character lists which enemy types they counter
// Pick the squad that covers all 3 revealed enemies

export const COUNTER_TYPES = ['BRUTE', 'MECH', 'SPECTER'];

// ── Player Characters ────────────────────────────────────────────────────────
// Roles: Tank (hexagon), Brawler (diamond), Caster (circle), Archer (triangle)
// Tiers 1-3; unlock gates enforced by squad-clash.js

export const CHARACTERS = [

  // ── TANKS ──────────────────────────────────────────────────────────────────

  {
    id: 'slab',
    name: 'SLAB',
    role: 'Tank',
    tier: 1,
    lore: 'A calcified war-hulk, slow as bedrock, twice as permanent.',
    counters: ['BRUTE'],
    stats: { hp: 180, atk: 14, def: 18, spd: 1 },
    ability: {
      name: 'PETRIFY',
      desc: 'Next hit reduces target ATK by 4 for 2 turns.',
      cooldown: 3,
      type: 'debuff',
      effectKey: 'reduce_atk',
    },
    visual: { shape: 'hexagon', accent: '#FF2D78', glowColor: '#FF2D7860', tier: 1, sprite: null },
    // future game hooks
    runner: null, tower: null, bullet: null,
  },

  {
    id: 'bulwark',
    name: 'BULWARK',
    role: 'Tank',
    tier: 2,
    lore: 'Decommissioned siege chassis. Still refuses to fall.',
    counters: ['MECH'],
    stats: { hp: 210, atk: 16, def: 22, spd: 1 },
    ability: {
      name: 'OVERCHARGE',
      desc: 'Absorbs next hit as bonus ATK on the following turn.',
      cooldown: 4,
      type: 'buff',
      effectKey: 'absorb_next',
    },
    visual: { shape: 'hexagon', accent: '#FF5599', glowColor: '#FF559960', tier: 2, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  {
    id: 'colossus',
    name: 'THE COLOSSUS',
    role: 'Tank',
    tier: 3,
    lore: 'A collapsed star wearing skin. It remembers nothing and fears less.',
    counters: ['SPECTER'],
    stats: { hp: 250, atk: 20, def: 28, spd: 1 },
    ability: {
      name: 'VOID ANCHOR',
      desc: 'Prevents all enemy evasion and buffs for 2 turns.',
      cooldown: 5,
      type: 'debuff',
      effectKey: 'void_anchor',
    },
    visual: { shape: 'hexagon', accent: '#FF88BB', glowColor: '#FF88BB60', tier: 3, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  // ── BRAWLERS ────────────────────────────────────────────────────────────────

  {
    id: 'vorn',
    name: 'VORN',
    role: 'Brawler',
    tier: 1,
    lore: 'Ex-pit fighter from the underbelly colonies. Hits first, thinks later.',
    counters: ['BRUTE'],
    stats: { hp: 130, atk: 22, def: 10, spd: 3 },
    ability: {
      name: 'SKULL CRACK',
      desc: 'Next attack deals double damage and stuns for 1 turn.',
      cooldown: 4,
      type: 'damage',
      effectKey: 'stun_strike',
    },
    visual: { shape: 'diamond', accent: '#A020F0', glowColor: '#A020F060', tier: 1, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  {
    id: 'grix',
    name: 'GRIX',
    role: 'Brawler',
    tier: 2,
    lore: 'Spectral-phase blades. Can\'t touch what isn\'t there — but Grix can.',
    counters: ['SPECTER'],
    stats: { hp: 150, atk: 26, def: 12, spd: 3 },
    ability: {
      name: 'PHASE REND',
      desc: 'Ignores target DEF entirely on next attack.',
      cooldown: 3,
      type: 'damage',
      effectKey: 'pierce_def',
    },
    visual: { shape: 'diamond', accent: '#B844FF', glowColor: '#B844FF60', tier: 2, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  {
    id: 'razorback',
    name: 'RAZORBACK',
    role: 'Brawler',
    tier: 3,
    lore: 'Half machine. Half predator. Entirely your problem.',
    counters: ['MECH'],
    stats: { hp: 170, atk: 32, def: 14, spd: 4 },
    ability: {
      name: 'SHRED',
      desc: 'Reduces target DEF by 8 permanently. Stacks.',
      cooldown: 3,
      type: 'debuff',
      effectKey: 'shred_def',
    },
    visual: { shape: 'diamond', accent: '#CC66FF', glowColor: '#CC66FF60', tier: 3, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  // ── CASTERS ─────────────────────────────────────────────────────────────────

  {
    id: 'tessera',
    name: 'TESSERA',
    role: 'Caster',
    tier: 1,
    lore: 'Shattered mirror entity. Each shard runs a different program.',
    counters: ['MECH'],
    stats: { hp: 90, atk: 26, def: 6, spd: 2 },
    ability: {
      name: 'OVERLOAD',
      desc: 'Deals 2× ATK to a MECH-type target. Normal damage otherwise.',
      cooldown: 3,
      type: 'damage',
      effectKey: 'type_burst',
    },
    visual: { shape: 'circle', accent: '#00C2CC', glowColor: '#00C2CC60', tier: 1, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  {
    id: 'mirith',
    name: 'MIRITH',
    role: 'Caster',
    tier: 2,
    lore: 'Weaver of binding spells. Once she speaks your name, you stop moving.',
    counters: ['SPECTER'],
    stats: { hp: 100, atk: 30, def: 7, spd: 2 },
    ability: {
      name: 'BIND',
      desc: 'Target loses their next turn. 1-use per target per battle.',
      cooldown: 5,
      type: 'debuff',
      effectKey: 'skip_turn',
    },
    visual: { shape: 'circle', accent: '#00DDEE', glowColor: '#00DDEE60', tier: 2, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  {
    id: 'hexis',
    name: 'HEXIS',
    role: 'Caster',
    tier: 3,
    lore: 'Ancient curse given form. Its presence alone reduces will to fight.',
    counters: ['BRUTE'],
    stats: { hp: 110, atk: 36, def: 8, spd: 3 },
    ability: {
      name: 'WITHER',
      desc: 'Drains 15 HP from all enemies and adds half to team.',
      cooldown: 4,
      type: 'heal',
      effectKey: 'drain_all',
    },
    visual: { shape: 'circle', accent: '#33EEFF', glowColor: '#33EEFF60', tier: 3, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  // ── ARCHERS ─────────────────────────────────────────────────────────────────

  {
    id: 'dusk',
    name: 'DUSK',
    role: 'Archer',
    tier: 1,
    lore: 'Fires bolts from between dimensions. Targets don\'t see them coming.',
    counters: ['SPECTER'],
    stats: { hp: 85, atk: 20, def: 5, spd: 5 },
    ability: {
      name: 'PHASE SHOT',
      desc: 'Cannot miss. Ignores SPECTER evasion passives.',
      cooldown: 3,
      type: 'damage',
      effectKey: 'no_miss',
    },
    visual: { shape: 'triangle', accent: '#FFB800', glowColor: '#FFB80060', tier: 1, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  {
    id: 'cinder',
    name: 'CINDER',
    role: 'Archer',
    tier: 2,
    lore: 'Ash-coated hunter. Leaves a burning trail everything else avoids.',
    counters: ['BRUTE'],
    stats: { hp: 95, atk: 24, def: 6, spd: 5 },
    ability: {
      name: 'SCORCH',
      desc: 'Applies burn: target takes 6 damage at start of their turn for 3 turns.',
      cooldown: 3,
      type: 'debuff',
      effectKey: 'burn_dot',
    },
    visual: { shape: 'triangle', accent: '#FFCC22', glowColor: '#FFCC2260', tier: 2, sprite: null },
    runner: null, tower: null, bullet: null,
  },

  {
    id: 'omen',
    name: 'THE OMEN',
    role: 'Archer',
    tier: 3,
    lore: 'Reads the next three moves before they happen. Shoots the weak point.',
    counters: ['MECH'],
    stats: { hp: 105, atk: 30, def: 7, spd: 5 },
    ability: {
      name: 'PREDICT',
      desc: 'Next attack deals +50% damage and disables target ability for 2 turns.',
      cooldown: 4,
      type: 'damage',
      effectKey: 'predict_strike',
    },
    visual: { shape: 'triangle', accent: '#FFDD55', glowColor: '#FFDD5560', tier: 3, sprite: null },
    runner: null, tower: null, bullet: null,
  },
];

// ── Enemies ──────────────────────────────────────────────────────────────────
// Pool of 6 — 3 are randomly drawn per round and revealed to the player
// enemyType: BRUTE | MECH | SPECTER  (matches character counters above)
// tags: behavior descriptors shown on the card

export const ENEMIES = [

  {
    id: 'krux',
    name: 'KRUX',
    enemyType: 'BRUTE',
    tags: ['⚔️ HEAVY'],
    lore: 'Armored siege beast. Slow but hits like a collapsing structure.',
    stats: { hp: 160, atk: 24, def: 16, spd: 1 },
    visual: { shape: 'hexagon', accent: '#FF4444', glowColor: '#FF444460', sprite: null },
    ability: {
      name: 'SLAM',
      desc: 'Every 3rd attack deals 3× base ATK.',
      cooldown: 3,
      effectKey: 'heavy_slam',
    },
  },

  {
    id: 'gorr',
    name: 'GORR',
    enemyType: 'BRUTE',
    tags: ['🩸 LIFESTEAL'],
    lore: 'Feral regenerator. The more it bleeds, the stronger it gets.',
    stats: { hp: 140, atk: 20, def: 10, spd: 2 },
    visual: { shape: 'diamond', accent: '#CC2200', glowColor: '#CC220060', sprite: null },
    ability: {
      name: 'DEVOUR',
      desc: 'Heals 50% of damage dealt each attack.',
      cooldown: 0,
      effectKey: 'lifesteal',
    },
  },

  {
    id: 'rift',
    name: 'RIFT',
    enemyType: 'MECH',
    tags: ['💥 VOLATILE'],
    lore: 'Unstable drone cluster. Deadly in packs. Explosive on death.',
    stats: { hp: 100, atk: 18, def: 6, spd: 4 },
    visual: { shape: 'triangle', accent: '#FF8800', glowColor: '#FF880060', sprite: null },
    ability: {
      name: 'DETONATE',
      desc: 'On death, deals 30 damage to all player characters.',
      cooldown: 0,
      effectKey: 'death_explode',
    },
  },

  {
    id: 'plax',
    name: 'PLAX',
    enemyType: 'MECH',
    tags: ['🛡️ ARMORED'],
    lore: 'Walking fortification unit. Built to outlast everything in the field.',
    stats: { hp: 200, atk: 14, def: 24, spd: 1 },
    visual: { shape: 'hexagon', accent: '#884400', glowColor: '#88440060', sprite: null },
    ability: {
      name: 'FORTRESS MODE',
      desc: 'Every 4 turns, DEF doubles for 1 turn.',
      cooldown: 4,
      effectKey: 'fortress_mode',
    },
  },

  {
    id: 'vexis',
    name: 'VEXIS',
    enemyType: 'SPECTER',
    tags: ['⚡ SWIFT', '🎯 HUNTS WEAK'],
    lore: 'Dimensional predator. Locks onto the lowest HP target automatically.',
    stats: { hp: 110, atk: 22, def: 8, spd: 5 },
    visual: { shape: 'circle', accent: '#8800FF', glowColor: '#8800FF60', sprite: null },
    ability: {
      name: 'MARK',
      desc: 'Always attacks the lowest HP character. +4 ATK against them.',
      cooldown: 0,
      effectKey: 'hunt_weak',
    },
  },

  {
    id: 'shade',
    name: 'SHADE',
    enemyType: 'SPECTER',
    tags: ['📈 SCALES'],
    lore: 'Shadow that grows with every hit taken. Kill it fast or face the consequence.',
    stats: { hp: 120, atk: 16, def: 10, spd: 2 },
    visual: { shape: 'circle', accent: '#440088', glowColor: '#44008860', sprite: null },
    ability: {
      name: 'GROW',
      desc: '+3 ATK and +2 DEF each time it takes damage.',
      cooldown: 0,
      effectKey: 'scale_on_hit',
    },
  },
];

// ── Unlock gates ─────────────────────────────────────────────────────────────
// Tier 1: free (one per role unlocked at start)
// Tier 2: costs AP, no prerequisite beyond AP balance
// Tier 3: costs AP, requires same-role T2 unlocked
export const UNLOCK_COSTS = { 1: 0, 2: 300, 3: 600 };

// Default unlocked IDs (one T1 per role)
export const DEFAULT_UNLOCKED = ['slab', 'vorn', 'tessera', 'dusk'];

// ── Draw utility (canvas) ────────────────────────────────────────────────────
// Called by squad-clash.js battle renderer when sprite === null
// ctx: CanvasRenderingContext2D, x/y: center, size: radius/half-width
export function drawCharacter(ctx, visual, x, y, size) {
  const { shape, accent, glowColor, tier } = visual;

  ctx.save();

  // Glow
  ctx.shadowColor = glowColor || accent + '80';
  ctx.shadowBlur  = 12 + tier * 4;

  ctx.fillStyle   = accent;
  ctx.strokeStyle = '#EEEEF8';
  ctx.lineWidth   = 1.5;

  ctx.beginPath();
  switch (shape) {
    case 'hexagon': _hexPath(ctx, x, y, size);   break;
    case 'diamond': _diamondPath(ctx, x, y, size); break;
    case 'circle':  ctx.arc(x, y, size, 0, Math.PI * 2); break;
    case 'triangle': _triPath(ctx, x, y, size);  break;
    default:        ctx.arc(x, y, size, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  // Caster ring
  if (shape === 'circle') {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accent;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, size + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Tier pip(s)
  _drawTierPips(ctx, x, y, size, tier, accent);

  ctx.restore();
}

function _hexPath(ctx, x, y, r) {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
            : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}

function _diamondPath(ctx, x, y, r) {
  ctx.moveTo(x,     y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x,     y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

function _triPath(ctx, x, y, r) {
  ctx.moveTo(x,         y - r);
  ctx.lineTo(x + r * 0.866, y + r * 0.5);
  ctx.lineTo(x - r * 0.866, y + r * 0.5);
  ctx.closePath();
}

function _drawTierPips(ctx, x, y, size, tier, accent) {
  if (tier < 2) return;
  const pipR  = 3;
  const count = tier - 1; // T2=1 pip, T3=2 pips
  const gap   = 8;
  const startX = x - ((count - 1) * gap) / 2;
  const pipY   = y + size + 8;
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = accent;
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(startX + i * gap, pipY, pipR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
