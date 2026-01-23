/* Gallery page script: grid + lazy load + skeleton + lightbox */

(function () {
  'use strict';

  const PLACEHOLDER =
    'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

  const IMAGES = [
    { id: 'gal-01', src: './assets/img/gallery/gal-01.svg', caption: 'Neon Dribble', tag: 'Skills' },
    { id: 'gal-02', src: './assets/img/gallery/gal-02.svg', caption: 'Stadium Glow', tag: 'Stadium' },
    { id: 'gal-03', src: './assets/img/gallery/gal-03.svg', caption: 'Touchline Sprint', tag: 'Street' },
    { id: 'gal-04', src: './assets/img/gallery/gal-04.svg', caption: 'Golden Assist', tag: 'Skills' },
    { id: 'gal-05', src: './assets/img/gallery/gal-05.svg', caption: 'Night Fixture', tag: 'Stadium' },
    { id: 'gal-06', src: './assets/img/gallery/gal-06.svg', caption: 'First Step', tag: 'Street' },
    { id: 'gal-07', src: './assets/img/gallery/gal-07.svg', caption: 'Pocket Pass', tag: 'Skills' },
    { id: 'gal-08', src: './assets/img/gallery/gal-08.svg', caption: 'Crowd Waves', tag: 'Stadium' },
    { id: 'gal-09', src: './assets/img/gallery/gal-09.svg', caption: 'Solo Run', tag: 'Street' },
    { id: 'gal-10', src: './assets/img/gallery/gal-10.svg', caption: 'Half-space Magic', tag: 'Skills' },
    { id: 'gal-11', src: './assets/img/gallery/gal-11.svg', caption: 'Tunnel Vision', tag: 'Street' },
    { id: 'gal-12', src: './assets/img/gallery/gal-12.svg', caption: 'Final Whistle', tag: 'Stadium' },
  ];

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

  function card(item) {
    const delay = 120 + Math.round(Math.random() * 640); // keep skeleton visible
    return `
      <div class="gallery-item" data-id="${escapeAttr(item.id)}" data-tag="${escapeAttr(item.tag)}">
        <button type="button" data-open aria-label="Open image: ${escapeAttr(item.caption)}">
          <div class="skeleton skeleton-img"></div>
          <img
            class="lazy"
            loading="lazy"
            src="${PLACEHOLDER}"
            data-src="${escapeAttr(item.src)}"
            data-delay="${delay}"
            width="640"
            height="420"
            alt="${escapeAttr(item.caption)} (custom SVG)"
          />
        </button>
        <div class="gallery-caption">
          <div>
            <div class="small muted">${escapeHtml(item.tag)}</div>
            <div class="nowrap"><strong>${escapeHtml(item.caption)}</strong></div>
          </div>
          <span class="chip">SVG</span>
        </div>
      </div>
    `;
  }

  function render() {
    document.querySelectorAll('[data-gallery-grid]').forEach((grid) => {
      const tag = grid.getAttribute('data-tag') || 'All';
      const items = tag === 'All' ? IMAGES : IMAGES.filter((x) => x.tag === tag);
      grid.innerHTML = items.map(card).join('');

      grid.querySelectorAll('[data-open]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const wrap = btn.closest('[data-id]');
          const id = wrap?.getAttribute('data-id');
          openLightbox(id, tag);
        });
      });
    });

    // Let common lazy loader observe the new images
    window.CPRUM?.initLazyImages();
  }

  function openLightbox(id, tag) {
    const items = tag === 'All' ? IMAGES : IMAGES.filter((x) => x.tag === tag);
    const idx = Math.max(0, items.findIndex((x) => x.id === id));
    let index = idx;

    function bodyHTML() {
      const it = items[index];
      return `
        <div class="grid" style="gap:12px;">
          <img src="${escapeAttr(it.src)}" alt="${escapeAttr(it.caption)}" style="width:100%; border-radius:16px; border:1px solid var(--border);" />
          <div class="btn-row" style="justify-content: space-between;">
            <div class="small muted">${escapeHtml(it.tag)} • ${escapeHtml(it.id)}</div>
            <div class="btn-row">
              <button class="btn btn-small" type="button" data-prev aria-label="Previous image">‹</button>
              <button class="btn btn-small" type="button" data-next aria-label="Next image">›</button>
            </div>
          </div>
          <div class="alert">
            <strong>${escapeHtml(it.caption)}</strong><br/>
            <span class="small muted">Lightbox uses the shared modal component (ESC closes). Arrow keys also work.</span>
          </div>
        </div>
      `;
    }

    window.CPRUM?.openModal({
      title: `Gallery — ${tag}`,
      body: bodyHTML(),
      footer: `<div class="btn-row">
        <button class="btn btn-ghost" type="button" data-close>Close</button>
        <button class="btn btn-secondary" type="button" id="tp-gallery">Send tracepoint</button>
      </div>`,
    });

    function reRender() {
      const body = document.querySelector('.modal-body');
      if (!body) return;
      body.innerHTML = bodyHTML();
      wire();
    }

    function wire() {
      const close = document.querySelector('.modal [data-close]');
      close?.addEventListener('click', () => window.CPRUM?.closeModal());

      document.querySelector('.modal [data-prev]')?.addEventListener('click', () => {
        index = (index - 1 + items.length) % items.length;
        reRender();
      });
      document.querySelector('.modal [data-next]')?.addEventListener('click', () => {
        index = (index + 1) % items.length;
        reRender();
      });

      document.getElementById('tp-gallery')?.addEventListener('click', () => {
        cpRumTag('tracepoint', 'gallery', `${tag}:${items[index].id}`);
        window.CPRUM?.toast(`Tracepoint: gallery=${tag}:${items[index].id}`, 'ok', { ttl: 2000 });
      });

      const modal = document.querySelector('.modal');
      modal?.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          index = (index - 1 + items.length) % items.length;
          reRender();
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          index = (index + 1) % items.length;
          reRender();
        }
      });
    }

    // Wire initial
    setTimeout(wire, 0);
  }

  function boot() {
    cpRumTag('pageGroup', 'Gallery');
    render();
  }

  document.addEventListener('cprum:ready', boot);
})();
