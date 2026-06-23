(function () {
  'use strict';

  // Page filename → active tab ID
  var PAGE_TAB = {
    '': 'home', 'index.html': 'home',
    'calendar.html': 'calendar',
    'memories.html': 'memories',
    'fun.html': 'fun',
    // Secondary pages live in the More sheet
    'maxi.html': 'more', 'study.html': 'more',
    'chores.html': 'more', 'meals.html': 'more',
  };

  // Per-tab accent colors matching the design system
  var TAB_ACCENT = {
    home: '#FF2D78',
    calendar: '#4DA6FF',
    memories: '#FF2D78',
    fun: '#39FF14',
    more: '#A020F0',
  };

  var filename = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var activeTab = PAGE_TAB[filename] !== undefined ? PAGE_TAB[filename] : 'home';
  var accent    = TAB_ACCENT[activeTab] || '#FF2D78';

  // ── Build bottom tab bar ─────────────────────────────────────────────────
  var bar = document.createElement('nav');
  bar.className = 'mob-tab-bar';
  bar.setAttribute('aria-label', 'Mobile navigation');
  bar.innerHTML =
    makeTab('home',     'index.html',    'ph-duotone-house',           'Home',     TAB_ACCENT.home)     +
    makeTab('calendar', 'calendar.html', 'ph-duotone-calendar-dots',   'Calendar', TAB_ACCENT.calendar) +
    makeTab('memories', 'memories.html', 'ph-duotone-film-strip',      'Memories', TAB_ACCENT.memories) +
    makeTab('fun',      'fun.html',      'ph-duotone-game-controller', 'Fun Zone', TAB_ACCENT.fun)      +
    makeMoreTab();
  document.body.appendChild(bar);

  // ── Build More sheet ─────────────────────────────────────────────────────
  var sheet = document.createElement('div');
  sheet.id = 'mob-more-sheet';
  sheet.className = 'mob-more-overlay';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'More pages');
  sheet.hidden = true;
  sheet.innerHTML =
    '<div class="mob-more-card">' +
      '<div class="mob-more-handle" aria-hidden="true"></div>' +
      '<div class="mob-more-header">' +
        '<span class="mob-more-title">More</span>' +
        '<button class="mob-more-close" id="mob-more-close" aria-label="Close menu">' +
          '<i class="ph-duotone ph-duotone-x" aria-hidden="true"></i>' +
        '</button>' +
      '</div>' +
      '<div class="mob-more-links">' +
        moreLink('maxi.html',   'ph-duotone-paw-print',   'Ask mAxI',    '#FFB800', filename === 'maxi.html')   +
        moreLink('study.html',  'ph-duotone-heartbeat',   'Study Zone',  '#00C2CC', filename === 'study.html')  +
        moreLink('chores.html', 'ph-duotone-sparkle',     'Chores',      '#A020F0', filename === 'chores.html') +
        moreLink('meals.html',  'ph-duotone-fork-knife',  'Meal Planner','#FF8C42', filename === 'meals.html')  +
      '</div>' +
    '</div>';
  document.body.appendChild(sheet);

  // ── Wire interactions ────────────────────────────────────────────────────
  var moreBtn  = document.getElementById('mob-more-btn');
  var closeBtn = document.getElementById('mob-more-close');

  if (moreBtn)  moreBtn.addEventListener('click', openMore);
  if (closeBtn) closeBtn.addEventListener('click', closeMore);

  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) closeMore();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !sheet.hidden) closeMore();
  });

  function openMore() {
    sheet.hidden = false;
    document.body.classList.add('mob-sheet-open');
    requestAnimationFrame(function () {
      sheet.querySelector('.mob-more-card').classList.add('mob-more-card--visible');
    });
    if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 50);
  }

  function closeMore() {
    sheet.querySelector('.mob-more-card').classList.remove('mob-more-card--visible');
    document.body.classList.remove('mob-sheet-open');
    setTimeout(function () { sheet.hidden = true; }, 240);
    if (moreBtn) moreBtn.focus();
  }

  // ── HTML helpers ─────────────────────────────────────────────────────────
  function makeTab(id, href, icon, label, color) {
    var isActive = activeTab === id;
    var glowColor = color.replace('#', '');
    return '<a href="' + href + '"' +
      ' class="mob-tab' + (isActive ? ' mob-tab--active' : '') + '"' +
      ' style="--tab-accent:' + color + '"' +
      (isActive ? ' aria-current="page"' : '') +
      '>' +
      '<i class="ph-duotone ' + icon + '" aria-hidden="true"></i>' +
      '<span>' + label + '</span>' +
    '</a>';
  }

  function makeMoreTab() {
    var isActive = activeTab === 'more';
    return '<button id="mob-more-btn"' +
      ' class="mob-tab' + (isActive ? ' mob-tab--active' : '') + '"' +
      ' style="--tab-accent:' + TAB_ACCENT.more + '"' +
      ' aria-haspopup="true"' +
      '>' +
      '<i class="ph-duotone ph-duotone-dots-three-outline" aria-hidden="true"></i>' +
      '<span>More</span>' +
    '</button>';
  }

  function moreLink(href, icon, label, color, isActive) {
    return '<a href="' + href + '"' +
      ' class="mob-more-link' + (isActive ? ' mob-more-link--active' : '') + '"' +
      ' style="--link-accent:' + color + '"' +
      (isActive ? ' aria-current="page"' : '') +
      '>' +
      '<i class="ph-duotone ' + icon + '" aria-hidden="true"></i>' +
      '<span>' + label + '</span>' +
    '</a>';
  }
})();
