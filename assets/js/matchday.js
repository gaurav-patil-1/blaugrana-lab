/* Matchday page script: fixtures table with filter/sort/pagination */

(function () {
  'use strict';

  const els = {};
  let all = [];
  let view = [];
  let sortKey = 'date';
  let sortDir = 'asc';
  let page = 1;
  let pageSize = 8;

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {
      return iso;
    }
  }

  function compare(a, b) {
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = a[sortKey];
    const bv = b[sortKey];

    if (sortKey === 'date') {
      return dir * (new Date(av).getTime() - new Date(bv).getTime());
    }

    return dir * String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
  }

  function apply() {
    const q = (els.search?.value || '').trim().toLowerCase();
    const comp = els.comp?.value || 'all';
    const status = els.status?.value || 'all';

    view = all.filter((f) => {
      const matchesQ =
        !q ||
        f.opponent.toLowerCase().includes(q) ||
        f.competition.toLowerCase().includes(q) ||
        f.venue.toLowerCase().includes(q);

      const matchesComp = comp === 'all' || f.competition === comp;
      const matchesStatus = status === 'all' || f.status === status;

      return matchesQ && matchesComp && matchesStatus;
    });

    view.sort(compare);
    page = 1;
    render();
  }

  function render() {
    const total = view.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(page, pages);

    const start = (page - 1) * pageSize;
    const rows = view.slice(start, start + pageSize);

    els.tbody.innerHTML = rows
      .map((f) => {
        const score = f.status === 'Finished' ? `<span class="score">${escapeHtml(f.score || '—')}</span>` : '—';
        const badge =
          f.status === 'Finished'
            ? `<span class="chip">FT</span>`
            : f.status === 'Scheduled'
              ? `<span class="chip">Next</span>`
              : `<span class="chip">${escapeHtml(f.status)}</span>`;

        return `
          <tr>
            <td class="nowrap">${escapeHtml(fmtDate(f.date))}</td>
            <td>${escapeHtml(f.opponent)}</td>
            <td class="nowrap">${escapeHtml(f.venue)}</td>
            <td>${escapeHtml(f.competition)}</td>
            <td>${score}</td>
            <td>${badge}</td>
          </tr>
        `;
      })
      .join('');

    els.pageInfo.textContent = `Page ${page} of ${pages} • ${total} matches`;
    renderPagination(pages);
    renderMiniChart();
  }

  function renderPagination(pages) {
    const wrap = els.pagination;
    wrap.innerHTML = '';

    const btn = (label, disabled, onClick, ariaLabel) => {
      const b = document.createElement('button');
      b.className = 'btn btn-small';
      b.type = 'button';
      b.textContent = label;
      if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
      b.disabled = disabled;
      b.addEventListener('click', onClick);
      wrap.appendChild(b);
    };

    btn('«', page === 1, () => {
      page = 1;
      render();
    }, 'First page');

    btn('‹', page === 1, () => {
      page--;
      render();
    }, 'Previous page');

    // windowed pages
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(pages, start + windowSize - 1);

    for (let p = start; p <= end; p++) {
      const b = document.createElement('button');
      b.className = 'btn btn-small' + (p === page ? ' btn-secondary' : '');
      b.type = 'button';
      b.textContent = String(p);
      b.addEventListener('click', () => {
        page = p;
        render();
      });
      wrap.appendChild(b);
    }

    btn('›', page === pages, () => {
      page++;
      render();
    }, 'Next page');

    btn('»', page === pages, () => {
      page = pages;
      render();
    }, 'Last page');
  }

  function renderMiniChart() {
    const canvas = document.getElementById('matchday-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const h = (canvas.height = canvas.clientHeight * devicePixelRatio);

    const finished = view.filter((x) => x.status === 'Finished');
    const sample = finished.slice(-10);

    // Points: "goals for" - simple parse from score like "2–1"
    const gf = sample.map((x) => {
      const m = String(x.score || '').match(/(\d+)\s*[–-]\s*(\d+)/);
      return m ? Number(m[1]) : 0;
    });

    ctx.clearRect(0, 0, w, h);

    // baseline
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border');
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(10 * devicePixelRatio, h - 14 * devicePixelRatio);
    ctx.lineTo(w - 10 * devicePixelRatio, h - 14 * devicePixelRatio);
    ctx.stroke();

    // bars
    const max = Math.max(1, ...gf);
    const barW = (w - 20 * devicePixelRatio) / Math.max(1, gf.length);
    ctx.globalAlpha = 1;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');

    gf.forEach((v, i) => {
      const bh = (v / max) * (h - 36 * devicePixelRatio);
      const x = 10 * devicePixelRatio + i * barW + 2 * devicePixelRatio;
      const y = h - 14 * devicePixelRatio - bh;
      ctx.fillRect(x, y, barW - 4 * devicePixelRatio, bh);
    });
  }

  function setSort(key) {
    if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    else {
      sortKey = key;
      sortDir = 'asc';
    }
    apply();
  }

  function wireSortButtons() {
    document.querySelectorAll('[data-sort]').forEach((btn) => {
      btn.addEventListener('click', () => setSort(btn.getAttribute('data-sort')));
    });
  }

  async function load() {
    els.skeleton.style.display = 'block';
    els.tableWrap.style.opacity = '0.35';

    try {
      const res = await fetch('./data/fixtures.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      all = await res.json();

      // Fill competition filter options
      const comps = Array.from(new Set(all.map((x) => x.competition))).sort();
      els.comp.innerHTML =
        '<option value="all">All competitions</option>' +
        comps.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

      apply();
    } catch (e) {
      window.CPRUM?.toast('Failed to load fixtures.json (see console).', 'danger');
      console.error(e);
    } finally {
      els.skeleton.style.display = 'none';
      els.tableWrap.style.opacity = '1';
    }
  }

  function boot() {
    cpRumTag('pageGroup', 'Matchday');

    els.tableWrap = document.getElementById('fixtures-wrap');
    els.tbody = document.getElementById('fixtures-body');
    els.skeleton = document.getElementById('fixtures-skeleton');
    els.search = document.getElementById('fixture-search');
    els.comp = document.getElementById('fixture-competition');
    els.status = document.getElementById('fixture-status');
    els.pageSize = document.getElementById('fixture-page-size');
    els.pagination = document.getElementById('pagination');
    els.pageInfo = document.getElementById('page-info');

    els.search?.addEventListener('input', apply);
    els.comp?.addEventListener('change', apply);
    els.status?.addEventListener('change', apply);
    els.pageSize?.addEventListener('change', () => {
      pageSize = Number(els.pageSize.value || 8);
      apply();
    });

    wireSortButtons();
    load();
  }

  document.addEventListener('cprum:ready', boot);
})();
