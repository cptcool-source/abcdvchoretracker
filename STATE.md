# Family Hub Restructure — Resume Contract

Last updated: 2026-08-12
Status: COMPLETE — GITHUB PAGES DEPLOYMENT APPROVED AND IN PROGRESS

This file is the authoritative session-resume document for the approved Family Hub restructure. Update it after every meaningful checkpoint. A new session should read this file and `README.md`, inspect `git status`, and continue from the first incomplete checkpoint. Do not rely on conversation history.

## Non-negotiable operating rules

- Do not deploy without Charles's explicit approval.
- Do not commit unless Charles explicitly asks for a commit.
- Family Hub stays on its established GitHub Pages deployment at `abcdviolet.com`. Do not migrate or duplicate it on Cloudflare without separate, explicit approval. This project-specific rule was confirmed by Charles on 2026-08-12.
- Preserve existing Firebase data paths, family-account behavior, feature behavior, and guest arcade access.
- All four new person spaces require the existing family passcode. A valid persistent Firebase family session must unlock them without another prompt.
- Arcade guest mode must not unlock any person space.
- Keep the project static: plain HTML, CSS, and JavaScript with no build system.
- Keep the implementation appropriate for a personal fun project; do not add a test framework or unnecessary infrastructure.

## Approved outcome

The homepage keeps its existing hero. Immediately below the hero, add four family-member cards in this order:

1. Addy
2. Bray K
3. Charles
4. Donna

Each card opens that person's protected landing page:

- `addy.html` — simple space ready for future features; no fake placeholder features.
- `bray.html` — Bray K's landing page with a link to BB's Soda Shack.
- `charles.html` — simple space ready for future features; no fake placeholder features.
- `donna.html` — Donna's landing page with a link to Study Zone.

Existing feature ownership is locked as follows:

- Donna owns Study Zone (`study.html`).
- Bray K owns BB's Soda Shack, which moves from `bray.html` to `soda-shack.html`.
- Addy and Charles do not have existing personal features.
- Calendar, Memories, Chores, Meal Planner, Ask mAxI, mAxI's Kitchen, and Fun Zone remain shared.

Remove Study Zone and Soda Shack from the homepage shared-feature grid. Keep all other shared cards.

## Approved navigation

Desktop navigation is generated from one shared route model rather than copied into every HTML file.

- Remove the direct Study Zone link.
- Add `FAM`, an accessible click-to-open disclosure containing Addy, Bray K, Charles, and Donna.
- Support keyboard focus, visible focus, Escape-to-close, outside-click closing, and correct `aria-expanded` state.
- Treat owned child features as part of their person's family context: `study.html` activates Donna/FAM and `soda-shack.html` activates Bray K/FAM.

The approved mobile bottom bar is:

`Home · Calendar · Memories · FAM · More`

- `FAM` opens a bottom sheet containing the four people.
- `More` contains Ask mAxI, mAxI's Kitchen, Fun Zone, Chores, and Meal Planner.
- Study Zone is reachable through Donna's Space, not shared navigation.
- Mobile sheets must restore focus, close with Escape or backdrop interaction, prevent background scrolling, and use accessible touch targets.

## Approved person-space foundation

- Use four separate flat HTML pages, not a query-parameter-driven single page and not nested directories.
- Use the current Family Hub visual system with individual accent colors; do not invent four separate visual identities.
- Share one lightweight person-space stylesheet and one reusable Firebase authentication controller.
- Each page contains the person's name, a short introduction, a feature area, an honest empty state where appropriate, and the existing Lock this device behavior.
- New person spaces reuse the existing Firebase family account, passcode prefix, and persistent session.
- Do not refactor authentication inside every existing feature in this pass; that would create unnecessary regression risk.

## Approved Soda Shack move

- Move the existing feature page to `soda-shack.html`.
- Rename its matching CSS and JavaScript to feature-specific names.
- Replace `bray.html` with Bray K's new person-space landing page.
- Update internal links.
- Do not add a compatibility redirect.

## Implementation checkpoints

1. **COMPLETE — Central navigation foundation**
   - Create a single shared route/ownership model.
   - Generate desktop navigation from it.
   - Generate the approved mobile tabs and FAM/More sheets from it.
   - Add disclosure/dialog accessibility behavior.
   - Replace copied desktop navigation markup with a common mount while retaining any page-specific header class.

2. **COMPLETE — Protected person-space foundation**
   - Add shared person-space styling.
   - Add reusable Firebase family-gate behavior for the new spaces.
   - Add `addy.html`, `bray.html`, `charles.html`, and `donna.html`.

3. **COMPLETE — Feature ownership connections**
   - Move and rename Soda Shack files.
   - Connect Bray K's Space to Soda Shack.
   - Connect Donna's Space to Study Zone.

4. **COMPLETE — Homepage information architecture**
   - Add the four family cards immediately below the hero.
   - Remove Study Zone and Soda Shack from the shared grid.
   - Reflow remaining shared cards without redesigning them.

5. **COMPLETE — Documentation and verification**
   - Update `README.md` structure and "Adding another page" guidance.
   - Run a lightweight internal-link and missing-asset scan.
   - Serve through local HTTP for Firebase/module compatibility.
   - Verify desktop and phone navigation, keyboard/focus behavior, Escape/backdrop closing, and active states.
   - Verify signed-out, incorrect-code, valid-code, persistent-session, Lock this device, and guest-blocking behavior as far as available credentials/session permit.
   - Regression-check every existing shared page.
   - Check reduced motion and narrow screens.
   - Perform a headed-browser interaction/feel pass.

## Testing decision

Do not add Playwright, Vitest, Jest, a package manifest, or another test framework. Use a local HTTP server, a lightweight source/link scan, browser console inspection, and manual headed-browser checks. This gives proportionate confidence without overengineering the project.

## Explicitly out of scope

- New personal features or invented placeholder features
- New Firebase accounts, rules, collections, or schema
- Redesigning existing features
- Moving the entire project into a new folder hierarchy
- Adding a build system or automated test framework
- Refactoring authentication across every existing feature
- A compatibility redirect from the old Bray feature URL
- Committing or deploying without separate instruction

## Current filesystem state

- The repository was clean when implementation began, aside from sandbox warnings reading the user's global Git ignore.
- Charles approved commit and deployment on 2026-08-12, and clarified that the existing GitHub Pages lane must remain in place. No Cloudflare project configuration was added.
- `js/nav.js` now owns the shared desktop and mobile navigation. All fourteen HTML pages use the shared navigation mount.
- `addy.html`, `bray.html`, `charles.html`, and `donna.html` use the shared `js/person-space.js` gate and `css/person-space.css` layout.
- Soda Shack now lives at `soda-shack.html` with matching feature-named CSS and JavaScript. The old generic Bray feature files no longer exist.
- The homepage now places the four family cards directly below the hero and contains only shared tools in the lower grid.
- `README.md` has been updated for the new structure and future personal-feature workflow.
- JavaScript syntax checks passed for the shared navigation, shared person-space authentication, and renamed Soda Shack behavior.
- A local href/src scan found no missing local targets, and no stale `bray.css` or `bray.js` references remain.
- All seventeen project JavaScript files pass `node --check`; `git diff --check` passes.
- All fourteen HTML pages load through local HTTP and initialize the centralized desktop/mobile navigation.
- At 1280px, the homepage family area is a four-column row with no horizontal overflow; at 390px it becomes a single column and the five mobile tabs retain roughly 75×57px touch targets.
- Desktop FAM opens on click, supports arrow-key traversal, closes with Escape/outside click, restores focus, and updates `aria-expanded`.
- Mobile FAM and More render the approved contents, trap focus, close with Escape/backdrop/close button, restore focus, and release the scroll lock.
- The existing valid persistent Firebase session opened Addy's new protected space without another prompt. Lock this device returned the page to the standard four-digit gate.
- A deliberately incorrect `0000` entry showed the expected error and cleared the digits. The real family passcode was not entered or recorded during testing.
- Fun Zone guest code access was exercised; attempting to open Donna's protected space redirected to `index.html`, confirming guest blocking.
- Study Zone activates Donna/FAM and is absent from shared desktop navigation and mobile More. Soda Shack activates Bray K/FAM and loads its renamed CSS/JavaScript.
- A cache-version query (`v=20260812-fam`) was added to the shared stylesheet and navigation script references after live testing exposed a stale global stylesheet; the refreshed browser then loaded the complete family-card styling.
- The approved structure was appended to the vault's `Decisions.md`, and the session was recorded in `05 Calendar/2026-08-12.md`.
- No commit or deployment has been made.

## Completion handoff

When all checkpoints pass, change Status to `COMPLETE — AWAITING DEPLOYMENT APPROVAL`, summarize changed files and verification evidence here, and report that state to Charles. Do not deploy automatically.
