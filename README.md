# Family Hub

A small multi-page family site: a splash page and a "Chore Squad" chore tracker that syncs live across every device, gated by a 4-digit family passcode.

## Structure

```
index.html              Splash/landing page with the "Start having fun!" button
chores.html               Chore Squad — the chore tracker app
css/styles.css             Shared stylesheet: tokens, nav, footer, buttons, splash page
css/chores.css              Chore tracker styles, including the passcode gate
js/script.js                 Shared site script (auto-highlights the active nav link)
js/chores.js                  Chore tracker logic: passcode gate, live sync, rendering
js/firebase-config.js          Your Firebase project's keys — you fill this in
```

No build step — plain HTML/CSS/JS plus the Firebase Web SDK loaded from Google's CDN. Note: `chores.html` needs to be loaded over `http://` or `https://` (via GitHub Pages, or a local dev server) rather than opened as a bare `file://` path, since browsers block ES module imports on `file://`. `index.html` still opens fine directly.

## One-time setup: connect Firebase (free)

This gives you the live, cross-device chore list, with the 4-digit code controlling who can get in.

**1. Create a Firebase project**
Go to [console.firebase.google.com](https://console.firebase.google.com), sign in with any Google account, and create a new project (the free "Spark" plan is all this needs — no credit card required).

**2. Turn on Realtime Database**
In the left sidebar: Build → Realtime Database → Create Database. Pick any region close to you, and start in **locked mode** (you'll set proper rules in step 4).

**3. Turn on Email/Password sign-in, then create the one family account**
Build → Authentication → Get started → Sign-in method → enable **Email/Password**.
Then go to the Authentication → **Users** tab → Add user:
- Email: `family@chore-squad.local` (this can be made up — it's never actually emailed; it's just an account identifier)
- Password: `famhub-` followed by whatever 4-digit code you want your family to type, e.g. `famhub-4729`

After adding the user, **copy the User UID** shown in the Users table — you'll need it in the next step.

**4. Lock the database down to that one account**
Realtime Database → **Rules** tab, and replace the contents with:
```json
{
  "rules": {
    ".read": "auth.uid === 'PASTE_THE_USER_UID_HERE'",
    ".write": "auth.uid === 'PASTE_THE_USER_UID_HERE'"
  }
}
```
Paste in the UID from step 3, then **Publish**. This is the step that actually matters for security — it means even if someone discovers your site's public Firebase keys and signs themselves up for a brand-new account, the database still refuses them, because their UID won't match.

**5. Register a web app and copy the config**
Project settings (gear icon, top left) → General tab → scroll to "Your apps" → Add app → the `</>` (Web) icon → give it any nickname → Register app. Firebase shows you a `firebaseConfig` object — copy the whole thing into `js/firebase-config.js`, replacing the placeholder values there.

**6. Open chores.html**
Type the 4-digit code you chose in step 3. Once unlocked, that browser stays signed in (no need to re-enter the code every visit) until someone taps "Lock this device" in the footer.

## Changing the passcode later

Authentication → Users → click the family user → reset its password to `famhub-` plus the new code. Nothing else needs to change.

## How the passcode gate actually works

Typing the 4 digits signs the browser into that one Firebase account behind the scenes — Firebase itself checks the password server-side and rate-limits guessing, so it's a real (if lightweight) lock, not just a UI overlay someone could skip by viewing the page source. The database rules in step 4 are what make it matter: only that specific account's UID is allowed to read or write the chore list, so a guessed or stolen password is the only way in. It's appropriately strong for keeping a family chore list private from strangers; it isn't bank-grade security, so don't store anything sensitive in it.

## Adding another family page

To add a new page (say, a meal planner):

1. Copy `chores.html` as a starting template, or write a new `*.html` file with the same `<head>` (font links + `css/styles.css`) and the same `<header class="site-nav">` / `<footer class="site-footer">` blocks.
2. Add a link to it inside `.nav-links` in **every** HTML file's nav — `js/script.js` auto-highlights whichever page is active, no extra JS needed.
3. On `index.html`, turn its "Coming soon" card in `.activity-grid` into a real link, or add a new card.
4. If it needs its own data store, you can reuse the same Firebase project — just write to a different path, e.g. `ref(db, "mealPlan")` instead of `ref(db, "chores")`, and add a matching rule in step 4 above.

## Deploying to GitHub Pages and pointing your domain

**1. Push these files to a GitHub repo**, at the root (or a `docs/` folder — just match the setting in step 2).

**2. Turn on GitHub Pages**
Repo → Settings → Pages → set "Source" to your branch (and `/root` or `/docs`, matching where the files live). This gives a URL like `https://yourusername.github.io/your-repo`.

**3. Add your custom domain**
Still in Settings → Pages, enter your domain (e.g. `example.com`) in the "Custom domain" field — this auto-creates a `CNAME` file in the repo. Without this step, your domain pointed at GitHub's IPs will resolve to a generic "no Pages site here" 404, since GitHub won't know which repo the domain belongs to.

**4. Point your registrar's DNS at GitHub Pages**
At your domain registrar, add:
- Four `A` records for the apex domain (`@`) pointing to: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- A `CNAME` record for `www` pointing to `yourusername.github.io`

DNS changes can take anywhere from a few minutes to a few hours to propagate. Your domain doesn't need to be transferred to a new registrar — it stays wherever it's registered; only where it *points* changes.

**5. Verify the domain at the GitHub account level (recommended)**
GitHub account Settings → Pages → add and verify the domain via a TXT record. This prevents anyone else from claiming the domain as their own GitHub Pages custom domain later if the DNS record is ever left pointing at GitHub after the site is taken down — a known issue called domain takeover via dangling DNS.

**Alternative hosts:** this same file structure deploys cleanly to Netlify or Vercel with no build command needed, if GitHub Pages isn't the preferred host — connect the repo and use the DNS records the host provides instead of GitHub's.

## Notes

- `js/firebase-config.js` contains your project's public Firebase keys. These are meant to be public (every Firebase web app ships them in its client code) — they identify *which* project to talk to, not a secret. The actual access control is the database rules in step 4.
- "Family Hub" in the nav logo and hero title, plus "Made with 💖 for our family" in the footer, are placeholder text — find-and-replace them in the HTML files with whatever you'd like the site called.
- The "Family Calendar" and "Meal Planner" cards on the splash page are non-functional placeholders meant to show how the grid grows — remove them or wire them up to real pages whenever you're ready.
- If you ever want to inspect or hand-edit the live chore data, Realtime Database → Data tab in the Firebase console shows it as a live JSON tree.
