# Family Hub

A static, multi-page family website built for daily use: chore tracking, photo memories, and NCLEX-PN study prep — all behind a shared 4-digit family passcode. Deployed to GitHub Pages at a custom domain. No build step.

## Design philosophy

The visual language is Tron-esque cyberpunk — a dark indigo void with neon pink and violet signal lines. Every design decision was made with the same brief in mind: *delightful to a teen audience, readable enough to study from, and distinctive enough to feel like it belongs to this specific family rather than a template.*

**Palette.** The base is a near-black indigo (`#07071A`) rather than true black, giving depth without the harshness of `#000`. Three surface levels (`--bg-void`, `--bg-surface`, `--bg-elevated`) create a layered sense of depth. Neon pink (`#FF2D78`) and violet (`#A020F0`) appear as accents only — never as body text. Body text sits at `#EEEEF8` (18:1 contrast on the void background), passing WCAG AAA. Secondary text (`#9898C0`) passes WCAG AA at 7.5:1.

**Typography.** Three typefaces, each with a specific role:
- **Syne 900** — display headings only (hero title, card titles, gate headings). Condensed, architectural, very high contrast between thick and thin strokes.
- **Satoshi** — all body copy, navigation, buttons, and labels. Geometric but warm; excellent legibility at small sizes.
- **Geist Mono** — numbers and data: passcode digits, stats counters, quiz answers.

**Signature element: PCB circuit traces.** The hero background draws itself using SVG `stroke-dashoffset` animation — two channels (pink and violet) propagate at 500 px/s following real PCB routing rules: 90° corners only, square endcaps, via circles at every junction. Timing is derived from signal travel distance, so each junction via pops exactly when the trace "arrives." The result reads unmistakably as circuitry rather than generic animated lines. Hidden below 900px where the ambient radial gradient takes over.

**Icons.** Phosphor Duotone, loaded via CDN. Used sparingly — only where an icon adds meaning that text alone would need extra words to carry. The duotone weight gives each icon a quiet two-tone depth against the dark background without looking flat.

**Motion.** Page-load animations are short (≤2.6s total) and purposeful. Cards use `IntersectionObserver` scroll reveal with staggered delays. All motion respects `prefers-reduced-motion: reduce`.

## Structure

```
index.html              Landing page — hero, animated circuit traces, card grid
chores.html             Chore Squad — chore tracker with live cross-device sync
memories.html           Family Memories — photo timeline and file uploads
study.html              Mom's Study Zone — full NCLEX-PN study tool

css/styles.css          Global design system: tokens, nav, buttons, gates, footer, hero, cards
css/chores.css          Chore tracker page styles
css/memories.css        Memories page styles
css/study.css           Study Zone styles (optimized for sustained reading)

js/firebase-config.js   Firebase project config + Cloudinary preset (public values, not secrets)
js/script.js            Shared: active nav link highlight
js/chores.js            Chore tracker: gate, live Firestore sync, rendering
js/memories.js          Memories: gate, Cloudinary unsigned uploads, Firestore timeline
js/study.js             Study Zone: gate, quiz engine, stats, notes, YouTube video picker
```

No build step — plain HTML/CSS/JS plus Firebase Web SDK (ESM) from Google's CDN. Pages with Firestore (`chores.html`, `memories.html`, `study.html`) require `http://` or `https://` — ES module imports are blocked on bare `file://` paths. `index.html` opens fine directly.

## Study Zone

Mom's Study Zone is a full-featured NCLEX-PN prep environment, accessible only after entering the family passcode.

**Question bank.** 180 questions across three difficulty tiers (Easy / Medium / Hard) and real NCLEX-PN content categories: Safe and Effective Care, Health Promotion, Psychosocial Integrity, and Physiological Integrity. Each question has four answer options, a single correct answer, and a full clinical rationale.

**Quiz engine.** Each session draws 9 questions, balanced across difficulty tiers. Questions are randomized within tiers so the same question doesn't appear twice in a row across sessions. Answers are locked after selection; feedback (correct/incorrect + full rationale) appears only after "Check All Answers" is clicked — encouraging commitment before revealing.

**Daily goal tracker.** Tracks questions answered per calendar day with a progress bar. The goal is 9 questions (one full session). A celebration state fires on completion. Progress persists across devices via Firestore.

**Session stats.** A collapsible stats panel shows total questions answered, total correct, current streak, and accuracy percentage for the current session.

**Bonus question.** Below the main quiz, a rotating free-response question pulls from a separate bonus pool — no answer choices, just a prompt and a reveal toggle for the answer.

**YouTube video picker.** A curated playlist of NCLEX-PN prep videos cycles on each visit and on manual refresh. Videos are embedded inline with a clean dark iframe.

**Notepad.** A persistent notepad widget saves notes to Firestore, synced across all family devices. Notes are displayed in reverse-chronological order with delete capability.

**Lock / unlock.** "Lock this device" in the footer signs the browser out and returns to the passcode gate. The next visitor must re-enter the code. Within a single browser, the sign-in persists indefinitely without re-entry.

## One-time setup: connect Firebase

**1. Create a Firebase project**
Go to [console.firebase.google.com](https://console.firebase.google.com), sign in with any Google account, and create a new project (the free Spark plan is sufficient — no credit card required).

**2. Enable Firestore**
Build → Firestore Database → Create database. Choose a region close to you and start in **production mode** (you'll set proper rules in step 4).

**3. Turn on Email/Password sign-in and create the one family account**
Build → Authentication → Get started → Sign-in method → enable **Email/Password**.
Then go to Authentication → Users → Add user:
- Email: `family@chore-squad.local` (a made-up address — it's never actually emailed; it's just an account identifier)
- Password: `famhub-` followed by your chosen 4-digit code, e.g. `famhub-4729`

After adding the user, **copy the User UID** shown in the Users table — you'll need it in step 4.

**4. Lock Firestore to that one account**
Firestore → Rules tab, replace the contents with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == "PASTE_THE_USER_UID_HERE";
    }
  }
}
```
Paste in the UID from step 3 and click **Publish**. This is the step that actually secures the data — even if someone discovers the site's public Firebase config and creates their own account, the Firestore rules refuse them because their UID won't match.

**5. Register a web app and copy the config**
Project settings (gear icon, top left) → General → Your apps → Add app → the `</>` (Web) icon → Register. Copy the `firebaseConfig` object into `js/firebase-config.js`, replacing the placeholder values.

**6. Open any gated page and enter your 4-digit code.**
The browser stays signed in across visits until someone taps "Lock this device."

## Changing the passcode

Authentication → Users → click the family user → reset the password to `famhub-` plus the new 4-digit code. Nothing else needs updating.

## How the passcode gate works

Entering the 4 digits calls Firebase `signInWithEmailAndPassword` behind the scenes. Firebase validates the password server-side and rate-limits guessing, making this a real authentication check — not a UI overlay that source-inspection could bypass. The Firestore rules in step 4 are the actual data lock: only the specific family UID can read or write anything. Appropriate for keeping family data private from strangers; not intended for high-value sensitive data.

## Adding another page

1. Create a new `*.html` file with the same `<head>` (font links + `css/styles.css`) and the same `<header class="site-nav">` block.
2. Add a nav link in every HTML file's `.nav-links`.
3. Promote or add the corresponding card in `index.html`'s `.cards-grid`.
4. If it needs Firestore, reuse the same project — write to a different path (e.g. `"mealPlan"` instead of `"chores"`). The existing rules cover all paths automatically.

## Deploying to GitHub Pages

**1. Push these files to a GitHub repo** at the root.

**2. Enable GitHub Pages**
Repo → Settings → Pages → Source → your branch → `/root`. This gives a URL like `https://yourusername.github.io/your-repo`.

**3. Add a custom domain**
Settings → Pages → enter your domain in "Custom domain." This auto-creates a `CNAME` file in the repo.

**4. Point your registrar's DNS at GitHub Pages**
Add four `A` records for the apex domain (`@`) pointing to:
`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
Add a `CNAME` for `www` pointing to `yourusername.github.io`.

**5. Verify the domain at the GitHub account level**
GitHub account Settings → Pages → verify the domain via a TXT record. This prevents domain takeover via dangling DNS if the site is ever taken down.

## Notes

- `js/firebase-config.js` contains the project's public Firebase config values. These are intentionally public — every Firebase web app ships them in client code. They identify which project to connect to, not a credential. Security comes from the Firestore rules in step 4.
- `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` in `firebase-config.js` are used by the Memories page for unsigned file uploads. The upload preset is restricted in Cloudinary's dashboard — no secret keys are ever placed in client code.
- Pages can be hosted on Netlify or Vercel with no build command — connect the repo and use the DNS records the host provides.
