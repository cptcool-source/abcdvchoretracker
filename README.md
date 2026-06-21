# Family Hub

A small multi-page family site: a splash page and a "Chore Squad" chore tracker, built to make it easy to bolt on more family pages later.

## Structure

```
index.html           Splash/landing page with the "Start having fun!" button
chores.html           Chore Squad — the chore tracker app
css/styles.css        Shared stylesheet: tokens, nav, footer, buttons, splash page
css/chores.css         Chore tracker-specific styles (cards, progress rings, forms)
js/script.js           Shared site script (auto-highlights the active nav link)
js/chores.js            Chore tracker app logic (state, rendering, localStorage)
```

No build step — plain HTML/CSS/JS. Open `index.html` directly in a browser to preview locally, or double-click it.

## Adding another family page

This is the part built to grow. To add a new page (say, a meal planner):

1. Copy `chores.html` as a starting template, or write a new `*.html` file with the same `<head>` (font links + `css/styles.css`) and the same `<header class="site-nav">` / `<footer class="site-footer">` blocks.
2. Add a link to it inside `.nav-links` in **every** HTML file's nav (so it shows up site-wide) — `js/script.js` will automatically highlight it as "active" when someone's on that page, no extra JS needed.
3. On `index.html`, turn its "Coming soon" card in `.activity-grid` into a real link (change the `<div class="activity-card coming-soon">` to `<a href="yourpage.html" class="activity-card">`), or add a new card.
4. If the new page needs its own styles/behavior beyond what's in `css/styles.css`, give it its own `css/yourpage.css` and `js/yourpage.js`, same pattern as the chore tracker.

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

- **Chore data is saved per browser, per device**, using `localStorage` — there's no shared backend. That means if two family members open the site on their own phones, they'll each see their own separate chore list, not a synced one. For everyone to share the same live list, this would need a small backend/database (e.g. Firebase or Supabase) behind the chore tracker — happy to help wire that up if you want true cross-device sync down the road.
- "Family Hub" in the nav logo and hero title, plus "Made with 💖 for our family" in the footer, are placeholder text — find-and-replace them in `index.html` and `chores.html` with whatever you'd like the site called.
- The "Family Calendar" and "Meal Planner" cards on the splash page are non-functional placeholders meant to show how the grid grows — remove them or wire them up to real pages whenever you're ready.
