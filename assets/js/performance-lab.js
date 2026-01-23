/* Performance Lab page script:
   Generate measurable work: large DOM, compute, reflow, long tasks, timers, soft navigation.
*/

(function () {
  'use strict';

  const els = {};
  const metrics = {
    lastAction: '—',
    lastDuration: 0,
    nodesCreated: 0,
    intervalsRunning: 0,
    lastActionTime: '—',
  };

  let computeCancel = false;
  let intervalIds = [];
  let stormTimeoutIds = [];

  function formatDuration(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n)) return '—';
    if (n < 1) return `${n.toFixed(2)}ms`;
    if (n < 100) return `${n.toFixed(1)}ms`;
    return `${Math.round(n)}ms`;
  }

  function setMetric(action, durationMs) {
    metrics.lastAction = action;
    metrics.lastDuration = Number(durationMs) || 0;
    metrics.lastActionTime = new Date().toLocaleTimeString();
    renderMetrics();
  }

  function renderMetrics() {
    els.mAction.textContent = metrics.lastAction;
    els.mDuration.textContent = formatDuration(metrics.lastDuration);
    els.mNodes.textContent = metrics.nodesCreated.toLocaleString();
    els.mIntervals.textContent = String(metrics.intervalsRunning);
    els.mTime.textContent = metrics.lastActionTime;

    // Keep Debug HUD in sync
    window.CPRUM?.updateLabPanels?.();
  }

  // ---------------------------
  // Large DOM generation
  // ---------------------------
  function generateDom() {
    const count = Math.max(500, Math.min(20000, Number(els.domCount.value) || 5000));
    const container = els.domSandbox;

    const start = performance.now();

    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      d.className = 'chip';
      d.textContent = `Node ${i + 1}`;
      d.style.display = 'inline-flex';
      d.style.margin = '6px';
      frag.appendChild(d);
    }
    container.appendChild(frag);

    const dur = performance.now() - start;
    metrics.nodesCreated += count;
    setMetric(`Generated ${count.toLocaleString()} DOM nodes`, dur);
    cpRumTag('tracepoint', 'perf:dom', `create:${count}:${Math.round(dur)}ms`);
  }

  function clearDom() {
    const start = performance.now();
    els.domSandbox.innerHTML = '';
    const dur = performance.now() - start;
    setMetric('Cleared DOM sandbox', dur);
    cpRumTag('tracepoint', 'perf:dom', `clear:${Math.round(dur)}ms`);
  }

  // ---------------------------
  // Heavy computation (chunked, cancellable)
  // ---------------------------
  function startCompute() {
    const limit = Math.max(5000, Math.min(250000, Number(els.computeLimit.value) || 60000));
    computeCancel = false;

    els.computeStatus.textContent = `Running… up to ${limit.toLocaleString()}`;
    const start = performance.now();
    const primes = [];

    let n = 2;

    function isPrime(x) {
      const r = Math.floor(Math.sqrt(x));
      for (let i = 2; i <= r; i++) {
        if (x % i === 0) return false;
      }
      return true;
    }

    function chunk() {
      const chunkSize = 700; // tune for visible work
      const end = Math.min(limit, n + chunkSize);

      for (; n <= end; n++) {
        if (computeCancel) {
          const dur = performance.now() - start;
          els.computeStatus.textContent = `Cancelled at n=${n.toLocaleString()} (found ${primes.length} primes).`;
          setMetric('Computation cancelled', dur);
          cpRumTag('tracepoint', 'perf:compute', `cancel:${n}:${Math.round(dur)}ms`);
          return;
        }
        if (isPrime(n)) primes.push(n);
      }

      if (n < limit) {
        setTimeout(chunk, 0);
      } else {
        const dur = performance.now() - start;
        els.computeStatus.textContent = `Done. Found ${primes.length} primes up to ${limit.toLocaleString()}.`;
        setMetric('Heavy computation finished', dur);
        cpRumTag('tracepoint', 'perf:compute', `done:${limit}:${Math.round(dur)}ms`);
      }
    }

    chunk();
  }

  function stopCompute() {
    computeCancel = true;
  }

  // ---------------------------
  // Forced layout / reflow demo
  // ---------------------------
  function runReflow() {
    const container = els.reflowBox;
    container.innerHTML = '';

    // Create boxes first (DOM work)
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 220; i++) {
      const b = document.createElement('div');
      b.className = 'chip';
      b.textContent = `Box ${i + 1}`;
      b.style.display = 'inline-flex';
      b.style.margin = '6px';
      b.style.padding = '10px 12px';
      frag.appendChild(b);
    }
    container.appendChild(frag);

    // Now intentionally force layout in a loop
    const start = performance.now();
    let total = 0;

    for (let i = 0; i < 140; i++) {
      const el = container.children[i % container.children.length];
      // Reading offsetHeight forces layout
      total += el.offsetHeight;
      // Writing style invalidates layout
      el.style.transform = `translateY(${(i % 8) - 4}px)`;
    }

    const dur = performance.now() - start;
    setMetric(`Forced layout loop (sum=${total})`, dur);
    cpRumTag('tracepoint', 'perf:reflow', `loop:${Math.round(dur)}ms`);
  }

  // ---------------------------
  // Long task (busy loop) — intentionally blocks the main thread
  // ---------------------------
  function busyLoop() {
    const ms = Math.max(50, Math.min(1200, Number(els.busyMs.value) || 300));
    const start = performance.now();
    let x = 0;

    // Busy loop: creates a measurable "long task"
    while (performance.now() - start < ms) {
      x += Math.sqrt(Math.random() * 1_000_000);
    }

    const dur = performance.now() - start;
    setMetric(`Busy loop ~${Math.round(ms)}ms (x=${Math.round(x)})`, dur);
    cpRumTag('tracepoint', 'perf:longtask', `${Math.round(ms)}:${Math.round(dur)}ms`);
  }

  // ---------------------------
  // Timers / interval storms (start/stop)
  // ---------------------------
  function startStorm() {
    const count = Math.max(5, Math.min(300, Number(els.stormCount.value) || 80));
    if (intervalIds.length) stopStorm();

    const start = performance.now();
    intervalIds = [];
    stormTimeoutIds = [];

    for (let i = 0; i < count; i++) {
      const id = setInterval(() => {
        // lightweight work to keep timers active
        if (i % 10 === 0) window.CPRUM?.log?.('storm:tick', i);
      }, 50 + (i % 7) * 10);
      intervalIds.push(id);
    }

    // Add some timeouts too
    for (let i = 0; i < Math.min(120, count); i++) {
      const tid = setTimeout(() => {}, 500 + i * 10);
      stormTimeoutIds.push(tid);
    }

    metrics.intervalsRunning = intervalIds.length;
    const dur = performance.now() - start;
    setMetric(`Started ${count} intervals`, dur);
    cpRumTag('tracepoint', 'perf:timers', `start:${count}:${Math.round(dur)}ms`);
  }

  function stopStorm() {
    const start = performance.now();

    intervalIds.forEach((id) => clearInterval(id));
    stormTimeoutIds.forEach((id) => clearTimeout(id));
    intervalIds = [];
    stormTimeoutIds = [];

    metrics.intervalsRunning = 0;
    const dur = performance.now() - start;
    setMetric('Stopped timer storm', dur);
    cpRumTag('tracepoint', 'perf:timers', `stop:${Math.round(dur)}ms`);
  }

  // ---------------------------
  // Image-heavy section (lazy)
  // ---------------------------
  function toggleImages() {
    const open = els.mediaWrap.getAttribute('data-open') !== 'true';
    els.mediaWrap.setAttribute('data-open', open ? 'true' : 'false');

    if (!open) {
      els.mediaGrid.innerHTML = '';
      setMetric('Cleared media grid', 0);
      return;
    }

    const start = performance.now();
    const imgs = [];
    for (let i = 1; i <= 48; i++) {
      const idx = String(((i - 1) % 12) + 1).padStart(2, '0');
      imgs.push({
        src: `./assets/img/gallery/gal-${idx}.svg`,
        alt: `Gallery SVG ${idx}`,
        delay: 60 + Math.round(Math.random() * 1000),
      });
    }

    els.mediaGrid.innerHTML = imgs
      .map(
        (it) => `
        <div class="gallery-item">
          <div class="skeleton skeleton-img"></div>
          <img
            src="data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="
            data-src="${it.src}"
            data-delay="${it.delay}"
            width="640"
            height="420"
            alt="${it.alt}"
            loading="lazy"
          />
          <div class="gallery-caption">
            <div class="small muted">Lazy media</div>
            <div class="nowrap"><strong>${it.alt}</strong></div>
          </div>
        </div>
      `
      )
      .join('');

    window.CPRUM?.initLazyImages();

    const dur = performance.now() - start;
    setMetric('Rendered image-heavy section', dur);
    cpRumTag('tracepoint', 'perf:media', `render:${imgs.length}:${Math.round(dur)}ms`);
  }

  // ---------------------------
  // Soft navigation simulation (hash router)
  // ---------------------------
  const ROUTES = {
    '#overview': {
      title: 'Overview',
      body: `
        <p class="muted">This is a tiny hash-based router. Clicking a route updates content without a full page reload.</p>
        <div class="alert"><strong>Profiler tip:</strong> Watch for route changes, interaction timing, and custom tracepoints.</div>
      `,
    },
    '#dom': {
      title: 'DOM route',
      body: `<p class="muted">This route is intentionally DOM-heavy: it adds 60 chips on every visit.</p>`,
      onEnter() {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < 60; i++) {
          const d = document.createElement('span');
          d.className = 'chip';
          d.textContent = `Route chip ${i + 1}`;
          d.style.margin = '6px';
          frag.appendChild(d);
        }
        els.softView.appendChild(frag);
      },
    },
    '#compute': {
      title: 'Compute route',
      body: `<p class="muted">This route performs a small synchronous loop to create a quick performance blip.</p>`,
      onEnter() {
        const start = performance.now();
        let s = 0;
        for (let i = 0; i < 120000; i++) s += i % 7;
        const dur = performance.now() - start;
        setMetric('Soft nav compute blip', dur);
      },
    },
    '#layout': {
      title: 'Layout route',
      body: `<p class="muted">This route forces a layout read (offsetWidth) and writes style.</p>`,
      onEnter() {
        const start = performance.now();
        const w = els.softView.offsetWidth;
        els.softView.style.outline = `2px dashed rgba(245,196,0,0.55)`;
        const dur = performance.now() - start;
        setMetric(`Soft nav layout read (w=${w})`, dur);
      },
    },
  };

  function renderRoute(hash) {
    const route = ROUTES[hash] || ROUTES['#overview'];
    const start = performance.now();

    els.softView.innerHTML = `
      <h3 style="margin-top:0;">${route.title}</h3>
      ${route.body}
    `;

    route.onEnter?.();

    const dur = performance.now() - start;
    cpRumTag('tracepoint', 'softnav', hash);
    setMetric(`Soft navigation → ${hash}`, dur);
  }

  function initRouter() {
    const links = els.softNav.querySelectorAll('a[href^="#"]');
    links.forEach((a) => {
      a.addEventListener('click', () => {
        window.CPRUM?.log?.('softnav:click', a.getAttribute('href'));
      });
    });

    window.addEventListener('hashchange', () => renderRoute(location.hash || '#overview'));

    // initial
    renderRoute(location.hash || '#overview');
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    cpRumTag('pageGroup', 'Performance Lab');

    // metrics
    els.mAction = document.getElementById('m-action');
    els.mDuration = document.getElementById('m-duration');
    els.mNodes = document.getElementById('m-nodes');
    els.mIntervals = document.getElementById('m-intervals');
    els.mTime = document.getElementById('m-time');

    document.getElementById('metrics-clear')?.addEventListener('click', () => {
      metrics.lastAction = '—';
      metrics.lastDuration = 0;
      metrics.nodesCreated = 0;
      metrics.intervalsRunning = 0;
      metrics.lastActionTime = '—';
      renderMetrics();
      window.CPRUM?.toast('Metrics cleared', 'info', { ttl: 1600 });
    });

    // DOM
    els.domSandbox = document.getElementById('dom-sandbox');
    els.domCount = document.getElementById('dom-count');
    document.getElementById('btn-dom-generate')?.addEventListener('click', generateDom);
    document.getElementById('btn-dom-clear')?.addEventListener('click', clearDom);

    // compute
    els.computeLimit = document.getElementById('compute-limit');
    els.computeStatus = document.getElementById('compute-status');
    document.getElementById('btn-compute-start')?.addEventListener('click', startCompute);
    document.getElementById('btn-compute-stop')?.addEventListener('click', stopCompute);

    // reflow
    els.reflowBox = document.getElementById('reflow-box');
    document.getElementById('btn-reflow')?.addEventListener('click', runReflow);

    // busy loop
    els.busyMs = document.getElementById('busy-ms');
    document.getElementById('btn-busy')?.addEventListener('click', busyLoop);

    // timers
    els.stormCount = document.getElementById('storm-count');
    document.getElementById('btn-storm-start')?.addEventListener('click', startStorm);
    document.getElementById('btn-storm-stop')?.addEventListener('click', stopStorm);

    // media
    els.mediaWrap = document.getElementById('media-wrap');
    els.mediaGrid = document.getElementById('media-grid');
    document.getElementById('btn-media-toggle')?.addEventListener('click', toggleImages);

    // soft nav
    els.softNav = document.getElementById('softnav');
    els.softView = document.getElementById('softnav-view');
    initRouter();

    renderMetrics();

    // Clean up storms on pagehide
    window.addEventListener('pagehide', stopStorm);
  }

  document.addEventListener('cprum:ready', boot);
})();
