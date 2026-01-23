/* Legends page script: timeline + modal details */

(function () {
  'use strict';

  const els = {
    timeline: null,
    skeleton: null,
    search: null,
    filter: null,
    count: null,
  };

  let allItems = [];
  let filtered = [];

  function renderSkeleton(on = true) {
    if (!els.skeleton) return;
    els.skeleton.style.display = on ? 'block' : 'none';
  }

  function timelineItemHTML(item) {
    const chips = (item.stats || [])
      .slice(0, 4)
      .map((s) => `<span class="chip">${escapeHtml(s)}</span>`)
      .join('');

    return `
      <article class="card soft" data-id="${escapeAttr(item.id)}">
        <div class="card-header">
          <div>
            <div class="muted small">${escapeHtml(item.range)} • ${escapeHtml(item.stage)}</div>
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
          </div>
          <div class="card-actions">
            <button class="btn btn-small" type="button" data-open>Details</button>
          </div>
        </div>
        <p class="muted">${escapeHtml(item.summary)}</p>
        <div class="btn-row" style="margin-top:10px;">${chips}</div>
      </article>
    `;
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replaceAll('"', '&quot;');
  }

  function applyFilters() {
    const q = (els.search?.value || '').trim().toLowerCase();
    const stage = (els.filter?.value || 'all').toLowerCase();

    filtered = allItems.filter((it) => {
      const matchesQ =
        !q ||
        it.title.toLowerCase().includes(q) ||
        it.summary.toLowerCase().includes(q) ||
        (it.stats || []).some((s) => String(s).toLowerCase().includes(q));

      const matchesStage = stage === 'all' || it.stage.toLowerCase() === stage;

      return matchesQ && matchesStage;
    });

    renderTimeline();
  }

  function renderTimeline() {
    if (!els.timeline) return;
    els.timeline.innerHTML = filtered.map(timelineItemHTML).join('');

    els.count.textContent = String(filtered.length);

    // Bind detail buttons
    els.timeline.querySelectorAll('[data-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-id]');
        const id = card?.getAttribute('data-id');
        const item = allItems.find((x) => x.id === id);
        if (item) openDetails(item);
      });
    });
  }

  function openDetails(item) {
    const statList = (item.stats || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('');

    const body = `
      <div class="grid grid-2">
        <div>
          <div class="kicker" style="color: var(--text); background: color-mix(in oklab, var(--accent) 14%, var(--surface)); border-color: var(--border);">
            ${escapeHtml(item.range)} • ${escapeHtml(item.stage)}
          </div>
          <p>${escapeHtml(item.detail)}</p>
          <div class="alert">
            <strong>Profiler tip:</strong>
            This modal is focus-trapped and ESC-closable. Great for testing interaction timing and accessibility hooks.
          </div>
        </div>
        <div>
          <h3 style="margin-top:0;">Stat chips</h3>
          <ul>${statList || '<li class="muted">No stats.</li>'}</ul>
          <hr />
          <button class="btn btn-secondary" type="button" id="tp-milestone">Send tracepoint</button>
          <p class="small muted" style="margin-top:10px;">Sends <code>cpRumTag('tracepoint','milestone',id)</code></p>
        </div>
      </div>
    `;

    window.CPRUM?.openModal({
      title: item.title,
      body,
      footer: `<div class="btn-row">
        <button class="btn btn-ghost" type="button" data-close>Close</button>
        <a class="btn btn-primary" href="./performance-lab.html">Try Performance Lab</a>
      </div>`,
    });

    // Wire modal buttons after open
    setTimeout(() => {
      const closeBtn = document.querySelector('.modal [data-close]');
      closeBtn?.addEventListener('click', () => window.CPRUM?.closeModal());

      const tp = document.getElementById('tp-milestone');
      tp?.addEventListener('click', () => {
        cpRumTag('tracepoint', 'milestone', item.id);
        window.CPRUM?.toast(`Tracepoint sent: milestone=${item.id}`, 'ok', { ttl: 2200 });
      });
    }, 0);
  }

  async function loadData() {
    renderSkeleton(true);
    try {
      const res = await fetch('./data/legends.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allItems = await res.json();
      filtered = allItems.slice();
      renderTimeline();
    } catch (e) {
      window.CPRUM?.toast('Failed to load legends.json (see console).', 'danger');
      console.error(e);
    } finally {
      renderSkeleton(false);
    }
  }

  function boot() {
    cpRumTag('pageGroup', 'Legends');

    els.timeline = document.getElementById('timeline');
    els.skeleton = document.getElementById('timeline-skeleton');
    els.search = document.getElementById('legend-search');
    els.filter = document.getElementById('legend-stage');
    els.count = document.getElementById('legend-count');

    els.search?.addEventListener('input', applyFilters);
    els.filter?.addEventListener('change', applyFilters);

    loadData();
  }

  document.addEventListener('cprum:ready', boot);
})();
