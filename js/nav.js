(function () {
  'use strict';

  var filename = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // Guest arcade sessions may only see the public home and Fun Zone.
  var guestAllowed = ['', 'index.html', 'fun.html'];
  if (sessionStorage.getItem('sc_guest_mode') === '1' && guestAllowed.indexOf(filename) === -1) {
    window.location.replace('index.html');
    return;
  }

  var family = [
    { id: 'addy', label: 'Addy', href: 'addy.html', icon: 'ph-duotone-star', accent: '#FF6FAE' },
    { id: 'bray', label: 'Bray K', href: 'bray.html', icon: 'ph-duotone-lightning', accent: '#FFCC00' },
    { id: 'charles', label: 'Charles', href: 'charles.html', icon: 'ph-duotone-code', accent: '#4DA6FF' },
    { id: 'donna', label: 'Donna', href: 'donna.html', icon: 'ph-duotone-heartbeat', accent: '#00C2CC' }
  ];

  var desktopLinks = [
    { id: 'home', label: 'Home', href: 'index.html' },
    { id: 'calendar', label: 'Calendar', href: 'calendar.html' },
    { id: 'memories', label: 'Memories', href: 'memories.html' },
    { id: 'maxi', label: 'Ask mAxI', href: 'maxi.html' },
    { id: 'fun', label: 'Fun Zone', href: 'fun.html' },
    { id: 'chores', label: 'Chores', href: 'chores.html' }
  ];

  var moreLinks = [
    { label: 'Ask mAxI', href: 'maxi.html', icon: 'ph-duotone-paw-print', accent: '#FFB800' },
    { label: "mAxI's Kitchen", href: 'dog-chef.html', icon: 'ph-duotone-cooking-pot', accent: '#FFB800' },
    { label: 'Fun Zone', href: 'fun.html', icon: 'ph-duotone-game-controller', accent: '#39FF14' },
    { label: 'Chores', href: 'chores.html', icon: 'ph-duotone-sparkle', accent: '#A020F0' },
    { label: 'Meal Planner', href: 'meals.html', icon: 'ph-duotone-fork-knife', accent: '#FF8C42' }
  ];

  var ownerByPage = {
    'addy.html': 'addy',
    'bray.html': 'bray',
    'soda-shack.html': 'bray',
    'charles.html': 'charles',
    'donna.html': 'donna',
    'study.html': 'donna'
  };

  var tabByPage = {
    '': 'home',
    'index.html': 'home',
    'calendar.html': 'calendar',
    'memories.html': 'memories',
    'maxi.html': 'more',
    'dog-chef.html': 'more',
    'fun.html': 'more',
    'chores.html': 'more',
    'meals.html': 'more'
  };

  var activeOwner = ownerByPage[filename] || '';
  var activeTab = activeOwner ? 'fam' : (tabByPage[filename] || 'home');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderDesktopNavigation();
  renderMobileNavigation();

  function renderDesktopNavigation() {
    var header = document.querySelector('.site-nav');
    if (!header) {
      header = document.createElement('header');
      header.className = 'site-nav';
      document.body.insertBefore(header, document.body.firstChild);
    }

    header.setAttribute('data-family-nav', '');
    header.innerHTML =
      '<div class="nav-inner">' +
        '<a href="index.html" class="nav-logo">' +
          '<i class="ph-duotone ph-duotone-circles-three-plus nav-logo-icon" aria-hidden="true"></i>' +
          '<span class="nav-logo-text">Family Hub</span>' +
        '</a>' +
        '<nav class="nav-links" aria-label="Main navigation">' +
          desktopLinks.map(desktopLinkMarkup).join('') +
          familyDisclosureMarkup() +
        '</nav>' +
      '</div>';

    bindDesktopFamilyDisclosure();
  }

  function desktopLinkMarkup(link) {
    var active = filename === link.href || (link.id === 'home' && filename === '');
    return '<a href="' + link.href + '" class="nav-link' + (active ? ' active' : '') + '"' +
      (active ? ' aria-current="page"' : '') + '>' + link.label + '</a>';
  }

  function familyDisclosureMarkup() {
    return '<div class="nav-family">' +
      '<button type="button" class="nav-link nav-family-button' + (activeOwner ? ' active' : '') + '"' +
        ' id="desktop-fam-button" aria-expanded="false" aria-controls="desktop-fam-panel">' +
        '<span>FAM</span><i class="ph-duotone ph-duotone-caret-down" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="nav-family-panel" id="desktop-fam-panel" hidden>' +
        family.map(function (person) { return familyLinkMarkup(person, 'nav-family-link'); }).join('') +
      '</div>' +
    '</div>';
  }

  function bindDesktopFamilyDisclosure() {
    var button = document.getElementById('desktop-fam-button');
    var panel = document.getElementById('desktop-fam-panel');
    if (!button || !panel) return;

    button.addEventListener('click', function () {
      if (panel.hidden) openDesktopFamily(); else closeDesktopFamily(true);
    });

    button.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        openDesktopFamily();
        var first = panel.querySelector('a');
        if (first) first.focus();
      }
    });

    panel.addEventListener('keydown', function (event) {
      var links = Array.from(panel.querySelectorAll('a'));
      var current = links.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' && current > -1) {
        event.preventDefault();
        links[(current + 1) % links.length].focus();
      } else if (event.key === 'ArrowUp' && current > -1) {
        event.preventDefault();
        links[(current - 1 + links.length) % links.length].focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        links[0].focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        links[links.length - 1].focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (!panel.hidden && !event.target.closest('.nav-family')) closeDesktopFamily(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) closeDesktopFamily(true);
    });

    function openDesktopFamily() {
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    }

    function closeDesktopFamily(returnFocus) {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (returnFocus) button.focus();
    }
  }

  function renderMobileNavigation() {
    var bar = document.createElement('nav');
    bar.className = 'mob-tab-bar';
    bar.setAttribute('aria-label', 'Mobile navigation');
    bar.innerHTML =
      mobileLinkTab('home', 'index.html', 'ph-duotone-house', 'Home', '#FF2D78') +
      mobileLinkTab('calendar', 'calendar.html', 'ph-duotone-calendar-dots', 'Calendar', '#4DA6FF') +
      mobileLinkTab('memories', 'memories.html', 'ph-duotone-film-strip', 'Memories', '#FF2D78') +
      mobileButtonTab('fam', 'ph-duotone-users-three', 'FAM', '#00C2CC') +
      mobileButtonTab('more', 'ph-duotone-dots-three-outline', 'More', '#A020F0');
    document.body.appendChild(bar);

    var famSheet = createMobileSheet('fam', 'Family spaces', family, true);
    var moreSheet = createMobileSheet('more', 'More', moreLinks, false);
    bindMobileSheet(document.getElementById('mob-fam-button'), famSheet);
    bindMobileSheet(document.getElementById('mob-more-button'), moreSheet);
  }

  function mobileLinkTab(id, href, icon, label, accent) {
    var active = activeTab === id;
    return '<a href="' + href + '" class="mob-tab' + (active ? ' mob-tab--active' : '') + '"' +
      ' style="--tab-accent:' + accent + '"' + (active ? ' aria-current="page"' : '') + '>' +
      '<i class="ph-duotone ' + icon + '" aria-hidden="true"></i><span>' + label + '</span></a>';
  }

  function mobileButtonTab(id, icon, label, accent) {
    var active = activeTab === id;
    return '<button type="button" id="mob-' + id + '-button" class="mob-tab' +
      (active ? ' mob-tab--active' : '') + '" style="--tab-accent:' + accent + '"' +
      ' aria-haspopup="dialog" aria-expanded="false" aria-controls="mob-' + id + '-sheet">' +
      '<i class="ph-duotone ' + icon + '" aria-hidden="true"></i><span>' + label + '</span></button>';
  }

  function createMobileSheet(id, title, links, isFamily) {
    var sheet = document.createElement('div');
    sheet.className = 'mob-more-overlay';
    sheet.id = 'mob-' + id + '-sheet';
    sheet.hidden = true;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'mob-' + id + '-title');
    sheet.innerHTML =
      '<div class="mob-more-card">' +
        '<div class="mob-more-handle" aria-hidden="true"></div>' +
        '<div class="mob-more-header">' +
          '<span class="mob-more-title" id="mob-' + id + '-title">' + title + '</span>' +
          '<button type="button" class="mob-more-close" aria-label="Close ' + title + '">' +
            '<i class="ph-duotone ph-duotone-x" aria-hidden="true"></i>' +
          '</button>' +
        '</div>' +
        '<div class="mob-more-links">' +
          links.map(function (link) {
            return isFamily ? familyLinkMarkup(link, 'mob-more-link') : moreLinkMarkup(link);
          }).join('') +
        '</div>' +
      '</div>';
    document.body.appendChild(sheet);
    return sheet;
  }

  function familyLinkMarkup(person, className) {
    var sectionActive = activeOwner === person.id;
    var exact = filename === person.href;
    return '<a href="' + person.href + '" class="' + className + (sectionActive ? ' ' + className + '--active' : '') + '"' +
      ' style="--link-accent:' + person.accent + '"' + (exact ? ' aria-current="page"' : '') + '>' +
      '<i class="ph-duotone ' + person.icon + '" aria-hidden="true"></i><span>' + person.label + '</span></a>';
  }

  function moreLinkMarkup(link) {
    var active = filename === link.href;
    return '<a href="' + link.href + '" class="mob-more-link' + (active ? ' mob-more-link--active' : '') + '"' +
      ' style="--link-accent:' + link.accent + '"' + (active ? ' aria-current="page"' : '') + '>' +
      '<i class="ph-duotone ' + link.icon + '" aria-hidden="true"></i><span>' + link.label + '</span></a>';
  }

  var openSheetState = null;

  function bindMobileSheet(trigger, sheet) {
    if (!trigger || !sheet) return;
    var card = sheet.querySelector('.mob-more-card');
    var closeButton = sheet.querySelector('.mob-more-close');

    trigger.addEventListener('click', function () { openMobileSheet(trigger, sheet, card, closeButton); });
    closeButton.addEventListener('click', closeMobileSheet);
    sheet.addEventListener('click', function (event) {
      if (event.target === sheet) closeMobileSheet();
    });
  }

  function openMobileSheet(trigger, sheet, card, closeButton) {
    if (openSheetState) closeMobileSheet(false, true);
    openSheetState = { trigger: trigger, sheet: sheet, card: card };
    trigger.setAttribute('aria-expanded', 'true');
    sheet.hidden = false;
    document.body.classList.add('mob-sheet-open');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { card.classList.add('mob-more-card--visible'); });
    });
    window.setTimeout(function () { closeButton.focus(); }, reducedMotion ? 0 : 60);
  }

  function closeMobileSheet(returnFocus, immediate) {
    if (!openSheetState) return;
    var state = openSheetState;
    openSheetState = null;
    state.trigger.setAttribute('aria-expanded', 'false');
    state.card.classList.remove('mob-more-card--visible');

    window.setTimeout(function () {
      state.sheet.hidden = true;
      if (!openSheetState) document.body.classList.remove('mob-sheet-open');
    }, immediate || reducedMotion ? 0 : 270);

    if (returnFocus !== false) state.trigger.focus();
  }

  document.addEventListener('keydown', function (event) {
    if (!openSheetState) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileSheet();
      return;
    }
    if (event.key !== 'Tab') return;

    var focusable = Array.from(openSheetState.sheet.querySelectorAll('a[href], button:not([disabled])'));
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 767 && openSheetState) closeMobileSheet(false, true);
  });
})();
