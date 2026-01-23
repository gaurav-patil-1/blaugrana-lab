# Blaugrana Lab (Static RUM Playground)

A **multi-page static website** (vanilla HTML/CSS/JS) designed as a test playground for **JSP/RUM profiling scripts** (Lastmile + rProfiler).  
It’s football-themed with a **Barcelona-inspired blaugrana palette** + a “#10 era” vibe — **without** official crests/logos and **without** copyrighted photos.

## What’s inside

- **8 pages** (multi-page, GitHub Pages friendly)
- Shared **header + footer** via static partials (fetched at runtime)
- **Dark mode toggle** (persisted in `localStorage`)
- A global **DataLayer** queue (`cpRumTag(...)`) + **Debug HUD**
- Lots of UI components: navbar + dropdown, cards, accordions, tabs, modal, toast, tooltip, breadcrumbs, pagination, tables, form validation, skeleton loaders, canvas charts
- **Error Lab**: controlled ways to trigger errors
- **Performance Lab**: controlled ways to generate performance work (DOM, compute, reflow, long tasks, timers, soft navigation)

---

## Repo file tree

```
blaugrana-lab/
  index.html
  legends.html
  matchday.html
  gallery.html
  shop.html
  error-lab.html
  performance-lab.html
  about.html
  .nojekyll
  README.md
  CREDITS.md
  assets/
    css/
      styles.css
    js/
      app.js
      audio.js
      home.js
      legends.js
      matchday.js
      gallery.js
      shop.js
      error-lab.js
      performance-lab.js
      contact.js
    img/
      illustrations/
        favicon.svg
        crest-shield.svg
        hero-stadium.svg
        player-silhouette.svg
        ball.svg
      gallery/
        gal-01.svg
        ...
        gal-12.svg
      products/
        prod-01.svg
        ...
        prod-08.svg
  data/
    legends.json
    fixtures.json
    products.json
    sample.json
  partials/
    header.html
    footer.html
```

---

## Run locally (recommended)

Because the site loads `partials/header.html` and `partials/footer.html` using `fetch()`, you **should not** open files via `file://...`. Use a local static server.

### Option A: Python (built-in)

```bash
cd blaugrana-lab
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/index.html`

### Option B: Node (http-server)

```bash
npm i -g http-server
cd blaugrana-lab
http-server -p 8080
```

---

## Deploy to GitHub Pages

1. Create a GitHub repo and commit these files at the repo root.
2. Push to GitHub.
3. In GitHub:
   - **Settings → Pages**
   - **Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `main` (or `master`) and folder: `/ (root)`
4. Save.

GitHub Pages will publish the site. All links use **relative paths**, so it works on Pages.

Tip: `.nojekyll` is included so GitHub Pages won’t treat it as a Jekyll site.

---

## Where to change content

- **Legends timeline data**: `data/legends.json`
- **Matchday fixtures/results**: `data/fixtures.json`
- **Shop products**: `data/products.json`
- **Fetch success payload** (used by Error Lab): `data/sample.json`

Visuals are **custom SVG** in:

- `assets/img/illustrations/`
- `assets/img/gallery/`
- `assets/img/products/`

---

## DataLayer / Tag API (for your scripts)

A global queue is provided:

```js
window.CPRUMDataLayer = window.CPRUMDataLayer || [];
function cpRumTag() { CPRUMDataLayer.push(arguments); }
```

In practice, `assets/js/app.js` upgrades `cpRumTag()` to **push + process immediately**.

Supported commands:

- `cpRumTag('logging', true/false)`
  - Enables verbose `console.log()` noise across the site (default: `false`)
- `cpRumTag('tracepoint', key, value)`
  - Stores key/value and displays it in the Debug HUD
- `cpRumTag('pageGroup', value)`
  - Stores and displays the current group label (each page sets one)

Debug HUD:

- Toggle with the **bug icon** in the header, or press **Ctrl + Shift + D**
- Shows: logging flag, pageGroup, tracepoints, last error, last network

---

## Error Lab

Open `error-lab.html`.

### JavaScript errors (sync)
- **throw new Error** (uncaught)
- **ReferenceError** (undefined variable)
- **TypeError** (call non-function)
- **JSON.parse** invalid payload
- **Stack overflow** (controlled recursion)
  - Two variants: uncaught and caught (to compare capture behavior)

### Promise & async errors
- **Unhandled promise rejection**
- **Async throw after await**
- **Rejected fetch**: handled vs unhandled

### Resource errors
- Broken **image** load (404)
- **Script** load error (inject `<script src="...">`)
- **CSS** load error (inject `<link rel="stylesheet" href="...">`)

### Network scenarios (for fetch/XHR tracking)
- `fetch()` success → `./data/sample.json`
- `fetch()` 404 → still resolves with `ok=false`
- “Slow fetch” → delayed wrapper before calling fetch
- `XMLHttpRequest` success + failure

### Interaction storms
- Smooth scroll to a target
- Focus/blur demo
- Mousemove storm (dispatches 6000 events)

Status Panel:

- Shows last error (from `window.onerror` / `unhandledrejection`)
- Shows last network request (from wrapped `fetch`/`XHR`)
- Has a **Clear** button to reset the panel

#### “Script error” simulation note
Browsers often show the generic message **`Script error.`** when a **cross-origin** script throws **without CORS headers**.
Because this playground is static + same-origin by default (portable on GitHub Pages), it does not reliably reproduce that case without additional setup.

---

## Performance Lab

Open `performance-lab.html`.

Available controls:

- **Generate large DOM** (5k–20k nodes)
- **Heavy computation** (chunked and cancellable)
- **Forced reflow** demo (layout reads + style writes)
- **Busy loop** (produces a long task; intentionally blocks the thread)
- **Timer/interval storm** (start/stop)
- **Image-heavy section** (renders many lazy-loaded images)
- **Soft navigation** (hash router)
  - Click `#overview`, `#dom`, `#compute`, `#layout` to update content without a reload

Metrics panel:

- last action
- duration (`performance.now()` deltas)
- nodes created
- intervals running
- last action time

---

## Notes on storage keys

The site uses `localStorage` keys:

- `theme` → `light | dark | system`
- `blaugrana-cart` → shop cart data
- `cprum-logging` → `0/1`
- `cprum-tracepoints` → stored tracepoints
- `cprum-pageGroup` → last pageGroup label

---

## No frameworks, no build step

Everything is plain HTML/CSS/JS so you can commit files and deploy directly.

Enjoy instrumenting!
