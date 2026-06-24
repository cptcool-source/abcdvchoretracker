(function () {
  'use strict';

  /* ── Guest mode guard ───────────────────────────────────────────────────────
     If a guest session is active (set by fun.js when the guest code is used),
     only fun.html and index.html are allowed. All other pages redirect home.
  ─────────────────────────────────────────────────────────────────────────── */
  var GUEST_ALLOWED = ['', 'index.html', 'fun.html'];
  var _page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (sessionStorage.getItem('sc_guest_mode') === '1' && GUEST_ALLOWED.indexOf(_page) === -1) {
    window.location.replace('index.html');
  }

  /* ── Page → tab mapping ─────────────────────────────────────────────────── */
  var PAGE_TAB = {
    '': 'home', 'index.html': 'home',
    'calendar.html': 'calendar',
    'memories.html': 'memories',
    'fun.html': 'fun',
    'maxi.html': 'more', 'study.html': 'more',
    'chores.html': 'more', 'meals.html': 'more'
  };

  var ACCENT = {
    home:     '#FF2D78',
    calendar: '#4DA6FF',
    memories: '#FF2D78',
    fun:      '#39FF14',
    more:     '#A020F0'
  };

  var LINK_ACCENT = {
    'maxi.html':   '#FFB800',
    'study.html':  '#00C2CC',
    'chores.html': '#A020F0',
    'meals.html':  '#FF8C42'
  };

  var filename = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var activeTab = Object.prototype.hasOwnProperty.call(PAGE_TAB, filename)
    ? PAGE_TAB[filename] : 'home';

  /* ── Self-contained styles ──────────────────────────────────────────────────
     Injected directly so the nav always works regardless of stylesheet
     caching. Must come before elements are created.
  ─────────────────────────────────────────────────────────────────────────── */
  if (!document.getElementById('mob-nav-styles')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'mob-nav-styles';
    styleEl.textContent = [
      /* Default hidden on desktop */
      '.mob-tab-bar,.mob-more-overlay{display:none !important}',

      '@media screen and (max-width:767px){',

        /* Collapse desktop nav links */
        '.nav-links{display:none !important}',

        /* Reserve space below content for the bar */
        'body{padding-bottom:calc(58px + env(safe-area-inset-bottom,0px)) !important}',

        /* iOS scroll-lock when sheet is open */
        'body.mob-locked{position:fixed;width:100%;top:var(--mob-scroll-top,0)}',

        /* ── Tab bar ── */
        '.mob-tab-bar{',
          'display:-webkit-box !important;',
          'display:flex !important;',
          'position:fixed;bottom:0;left:0;right:0;',
          'height:calc(58px + env(safe-area-inset-bottom,0px));',
          'padding-bottom:env(safe-area-inset-bottom,0px);',
          'background:rgba(7,7,26,0.97);',
          '-webkit-backdrop-filter:blur(20px) saturate(160%);',
          'backdrop-filter:blur(20px) saturate(160%);',
          'border-top:1px solid rgba(255,255,255,0.09);',
          'z-index:150;',
          /* Force GPU compositing — critical for iOS fixed elements */
          '-webkit-transform:translate3d(0,0,0);',
          'transform:translate3d(0,0,0);',
          'will-change:transform;',
        '}',

        /* ── Single tab item ── */
        '.mob-tab{',
          'display:-webkit-box;',
          'display:flex;',
          '-webkit-box-flex:1;flex:1;',
          '-webkit-box-orient:vertical;-webkit-box-direction:normal;',
          'flex-direction:column;',
          '-webkit-box-align:center;align-items:center;',
          '-webkit-box-pack:center;justify-content:center;',
          'gap:3px;',
          /* Reset anchor / button defaults */
          'background:none;border:none;',
          'text-decoration:none;',
          'padding:0;',
          'min-height:58px;',           /* ≥ 44 pt Apple HIG tap target     */
          'min-width:0;',
          'color:#7070A8;',
          'font-family:"Satoshi",sans-serif;',
          'font-size:9.5px;font-weight:500;',
          'letter-spacing:0.01em;',
          'cursor:pointer;',
          '-webkit-tap-highlight-color:transparent;',
          'touch-action:manipulation;',
          '-webkit-user-select:none;user-select:none;',
          '-webkit-appearance:none;',   /* remove iOS button chrome        */
        '}',
        '.mob-tab:active{opacity:0.5}',
        '.mob-tab i{font-size:22px;line-height:1;display:block;color:inherit}',
        '.mob-tab span{font-size:9.5px;line-height:1;display:block;color:inherit}',

        /* Active: icon glows in its accent color */
        '.mob-tab--active{color:#EEEEF8}',
        '.mob-tab--active i{color:var(--tab-accent,#FF2D78)}',

        /* ── Overlay backdrop ── */
        '.mob-more-overlay{',
          'display:-webkit-box !important;display:flex !important;',
          'position:fixed;top:0;left:0;right:0;bottom:0;',
          'background:rgba(7,7,26,0.55);',
          '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);',
          '-webkit-box-align:end;align-items:flex-end;',
          'z-index:500;',
          '-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0);',
        '}',
        '.mob-more-overlay[hidden]{display:none !important}',

        /* ── Sheet card ── */
        '.mob-more-card{',
          'width:100%;',
          'background:#141340;',
          'border-top:1px solid rgba(255,255,255,0.1);',
          'border-radius:20px 20px 0 0;',
          'padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));',
          'display:-webkit-box;display:flex;',
          '-webkit-box-orient:vertical;-webkit-box-direction:normal;',
          'flex-direction:column;',
          'overflow:hidden;',
          /* Slide-up animation */
          '-webkit-transform:translateY(100%);transform:translateY(100%);',
          '-webkit-transition:-webkit-transform 0.3s cubic-bezier(0.22,1,0.36,1);',
          'transition:transform 0.3s cubic-bezier(0.22,1,0.36,1);',
          'will-change:transform;',
        '}',
        '.mob-more-card--visible{',
          '-webkit-transform:translateY(0) !important;',
          'transform:translateY(0) !important;',
        '}',

        /* Handle bar */
        '.mob-more-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2);margin:12px auto 0;flex-shrink:0}',

        /* Header */
        '.mob-more-header{',
          'display:-webkit-box;display:flex;',
          '-webkit-box-align:center;align-items:center;',
          '-webkit-box-pack:justify;justify-content:space-between;',
          'padding:12px 20px 4px;flex-shrink:0;',
        '}',
        '.mob-more-title{font-family:"Syne",sans-serif;font-size:11px;font-weight:900;color:#7070A8;letter-spacing:0.15em;text-transform:uppercase}',

        /* Close button */
        '.mob-more-close{',
          'display:-webkit-box;display:flex;',
          '-webkit-box-align:center;align-items:center;',
          '-webkit-box-pack:center;justify-content:center;',
          'width:30px;height:30px;',
          'background:rgba(255,255,255,0.07);',
          'border:none;border-radius:50%;',
          'color:#9898C0;',
          'cursor:pointer;',
          '-webkit-tap-highlight-color:transparent;',
          'touch-action:manipulation;',
          '-webkit-appearance:none;',
        '}',
        '.mob-more-close i{font-size:14px;line-height:1;color:inherit}',
        '.mob-more-close:active{background:rgba(255,255,255,0.18)}',

        /* Link list */
        '.mob-more-links{',
          'display:-webkit-box;display:flex;',
          '-webkit-box-orient:vertical;-webkit-box-direction:normal;',
          'flex-direction:column;',
          'gap:2px;padding:8px 12px 4px;',
        '}',

        /* Individual links */
        '.mob-more-link{',
          'display:-webkit-box;display:flex;',
          '-webkit-box-align:center;align-items:center;',
          'gap:14px;padding:16px;',
          'border-radius:14px;',
          'color:#9898C0;',
          'font-family:"Satoshi",sans-serif;',
          'font-size:17px;font-weight:600;', /* 17px matches iOS system size */
          'text-decoration:none;',
          '-webkit-tap-highlight-color:transparent;',
          'touch-action:manipulation;',
          '-webkit-user-select:none;user-select:none;',
        '}',
        '.mob-more-link i{font-size:24px;line-height:1;color:#7070A8;flex-shrink:0}',
        '.mob-more-link:active{background:rgba(255,255,255,0.07)}',
        '.mob-more-link--active{color:#EEEEF8}',
        '.mob-more-link--active i{color:var(--link-accent,#FF2D78)}',

      '}'
    ].join('');
    document.head.appendChild(styleEl);
  }

  /* ── Build tab bar ──────────────────────────────────────────────────────── */
  var bar = document.createElement('nav');
  bar.className = 'mob-tab-bar';
  bar.setAttribute('aria-label', 'Mobile navigation');
  bar.innerHTML =
    mkTab('home',     'index.html',    'ph-duotone-house',           'Home',     ACCENT.home)     +
    mkTab('calendar', 'calendar.html', 'ph-duotone-calendar-dots',   'Calendar', ACCENT.calendar) +
    mkTab('memories', 'memories.html', 'ph-duotone-film-strip',      'Memories', ACCENT.memories) +
    mkTab('fun',      'fun.html',      'ph-duotone-game-controller', 'Fun Zone', ACCENT.fun)      +
    mkMoreBtn();
  document.body.appendChild(bar);

  /* ── Build More sheet ───────────────────────────────────────────────────── */
  var sheet = document.createElement('div');
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
        mkLink('maxi.html',   'ph-duotone-paw-print',  'Ask mAxI')    +
        mkLink('study.html',  'ph-duotone-heartbeat',  'Study Zone')  +
        mkLink('chores.html', 'ph-duotone-sparkle',    'Chores')      +
        mkLink('meals.html',  'ph-duotone-fork-knife', 'Meal Planner')+
      '</div>' +
    '</div>';
  document.body.appendChild(sheet);

  /* ── Interactions ───────────────────────────────────────────────────────── */
  var moreBtn  = document.getElementById('mob-more-btn');
  var closeBtn = document.getElementById('mob-more-close');
  var savedScrollY = 0;

  if (moreBtn)  moreBtn.addEventListener('click', openSheet);
  if (closeBtn) closeBtn.addEventListener('click', closeSheet);

  /* Close on backdrop tap */
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) closeSheet();
  });

  /* Close on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  });

  function openSheet() {
    /* iOS scroll-lock: fix body so content doesn't scroll under the sheet */
    savedScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.documentElement.style.setProperty('--mob-scroll-top', '-' + savedScrollY + 'px');
    document.body.classList.add('mob-locked');

    sheet.hidden = false;
    /* Trigger animation on next frame so the CSS transition fires */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var card = sheet.querySelector('.mob-more-card');
        if (card) card.classList.add('mob-more-card--visible');
      });
    });
    if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
  }

  function closeSheet() {
    var card = sheet.querySelector('.mob-more-card');
    if (card) card.classList.remove('mob-more-card--visible');

    /* Wait for slide-down animation, then restore scroll */
    setTimeout(function () {
      sheet.hidden = true;
      document.body.classList.remove('mob-locked');
      document.documentElement.style.removeProperty('--mob-scroll-top');
      window.scrollTo(0, savedScrollY);
    }, 310);

    if (moreBtn) moreBtn.focus();
  }

  /* ── HTML helpers ───────────────────────────────────────────────────────── */
  function mkTab(id, href, icon, label, color) {
    var active = activeTab === id;
    return '<a href="' + href + '"' +
      ' class="mob-tab' + (active ? ' mob-tab--active' : '') + '"' +
      ' style="--tab-accent:' + color + '"' +
      (active ? ' aria-current="page"' : '') + '>' +
      '<i class="ph-duotone ' + icon + '" aria-hidden="true"></i>' +
      '<span>' + label + '</span>' +
    '</a>';
  }

  function mkMoreBtn() {
    var active = activeTab === 'more';
    return '<button id="mob-more-btn"' +
      ' class="mob-tab' + (active ? ' mob-tab--active' : '') + '"' +
      ' style="--tab-accent:' + ACCENT.more + '"' +
      ' aria-haspopup="dialog">' +
      '<i class="ph-duotone ph-duotone-dots-three-outline" aria-hidden="true"></i>' +
      '<span>More</span>' +
    '</button>';
  }

  function mkLink(href, icon, label) {
    var active = (filename === href);
    var color  = LINK_ACCENT[href] || '#FF2D78';
    return '<a href="' + href + '"' +
      ' class="mob-more-link' + (active ? ' mob-more-link--active' : '') + '"' +
      ' style="--link-accent:' + color + '"' +
      (active ? ' aria-current="page"' : '') + '>' +
      '<i class="ph-duotone ' + icon + '" aria-hidden="true"></i>' +
      '<span>' + label + '</span>' +
    '</a>';
  }
})();
