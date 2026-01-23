/* Gallery page script: grid + lazy load + skeleton + lightbox */

(function () {
  "use strict";

  const PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

  const IMAGES = [
    {
      id: "gal-01",
      src: "https://www.fcbarcelona.com/photo-resources/2023/09/23/0fc85cc3-eee4-414d-a2d0-ccde5c04d08b/mini_FCB_Celta-111.jpg?width=1200&height=750",
      caption: "Flying Volley",
      tag: "Skills",
    },
    {
      id: "gal-02",
      src: "https://pbs.twimg.com/media/FwzjwzUWYAIf_nq.jpg",
      caption: "Old Camp Nou",
      tag: "Stadium",
    },
    {
      id: "gal-03",
      src: "https://sport360.com/wp-content/uploads/2020/01/BeFunky-collage-2020-01-02T111651.769.jpg",
      caption: "MSN Trio",
      tag: "Best_Moments",
    },
    {
      id: "gal-04",
      src: "https://static01.nyt.com/athletic/uploads/wp/2024/04/11100049/Pedri-assist-for-Barcelona-against-PSG-scaled-e1712844103590.jpg",
      caption: "Magic Pass",
      tag: "Skills",
    },
    {
      id: "gal-05",
      src: "https://cdn-acn.watchity.net/acn/catn_oldmedia/images/2017/03/Messi.jpg",
      caption: "Best Comeback",
      tag: "Stadium",
    },
    {
      id: "gal-06",
      src: "https://laliganews.net/wp-content/uploads/2020/08/28165985-1024x683.jpg",
      caption: "Leo Messi Iconic Celebration",
      tag: "Best_Moments",
    },
    {
      id: "gal-07",
      src: "https://prod-media.beinsports.com/image/1769026559367_008d1053-fd96-4db6-880e-43998cc53e6a.3840.JPG?ver=03-06-2025",
      caption: "Skillful Dribble",
      tag: "Skills",
    },
    {
      id: "gal-08",
      src: "https://www.fcbarcelona.com/fcbarcelona/photo/2022/09/19/1e3d37b9-85ea-4c9d-93de-a6d1a662e36f/_GP19495.jpg",
      caption: "Camp Nou",
      tag: "Stadium",
    },
    {
      id: "gal-09",
      src: "https://assets.goal.com/images/v3/blt62e1749ea2bb1919/GOAL%20-%20Blank%20WEB%20-%20Facebook%20-%202026-01-11T210530.533.jpg?auto=webp&format=pjpg&width=3840&quality=60",
      caption: "El Clasico Clash",
      tag: "Best_Moments",
    },
    {
      id: "gal-10",
      src: "https://assets.goal.com/images/v3/bltc77f4c242eb16082/c307adbfbfba616f99f4cde127a0edde8c1b248e.jpg?auto=webp&format=pjpg&width=3840&quality=60",
      caption: "Electric Run",
      tag: "Skills",
    },
    {
      id: "gal-11",
      src: "https://ichef.bbci.co.uk/ace/standard/1024/cpsprodpb/9603/live/98888780-2e93-11f0-ae63-a53f4593c313.jpg",
      caption: "La Masia Talent",
      tag: "Best_Moments",
    },
    {
      id: "gal-12",
      src: "https://wooarchitects.com/wp-content/uploads/2025/05/WOO-architects-Camp-Nou-Stadium-Barcelona.png",
      caption: "Spotify Camp Nou",
      tag: "Stadium",
    },
  ];

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replaceAll('"', "&quot;");
  }

  function card(item) {
    const delay = 120 + Math.round(Math.random() * 640); // keep skeleton visible
    return `
      <div class="gallery-item" data-id="${escapeAttr(
        item.id
      )}" data-tag="${escapeAttr(item.tag)}">
        <button type="button" data-open aria-label="Open image: ${escapeAttr(
          item.caption
        )}">
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
            <div class="nowrap"><strong>${escapeHtml(
              item.caption
            )}</strong></div>
          </div>
          <span class="chip">SVG</span>
        </div>
      </div>
    `;
  }

  function render() {
    document.querySelectorAll("[data-gallery-grid]").forEach((grid) => {
      const tag = grid.getAttribute("data-tag") || "All";
      const items =
        tag === "All" ? IMAGES : IMAGES.filter((x) => x.tag === tag);
      grid.innerHTML = items.map(card).join("");

      grid.querySelectorAll("[data-open]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const wrap = btn.closest("[data-id]");
          const id = wrap?.getAttribute("data-id");
          openLightbox(id, tag);
        });
      });
    });

    // Let common lazy loader observe the new images
    window.Barca?.initLazyImages();
  }

  function openLightbox(id, tag) {
    const items = tag === "All" ? IMAGES : IMAGES.filter((x) => x.tag === tag);
    const idx = Math.max(
      0,
      items.findIndex((x) => x.id === id)
    );
    let index = idx;

    function bodyHTML() {
      const it = items[index];
      return `
        <div class="grid" style="gap:12px;">
          <img src="${escapeAttr(it.src)}" alt="${escapeAttr(
        it.caption
      )}" style="width:100%; border-radius:16px; border:1px solid var(--border);" />
          <div class="btn-row" style="justify-content: space-between;">
            <div class="small muted">${escapeHtml(it.tag)} • ${escapeHtml(
        it.id
      )}</div>
            <div class="btn-row">
              <button class="btn btn-small" type="button" data-prev aria-label="Previous image">‹</button>
              <button class="btn btn-small" type="button" data-next aria-label="Next image">›</button>
            </div>
          </div>
          <div class="alert">
            <strong>${escapeHtml(it.caption)}</strong><br/>
          </div>
        </div>
      `;
    }

    window.Barca?.openModal({
      title: `Gallery — ${tag}`,
      body: bodyHTML(),
      footer: `<div class="btn-row">
        <button class="btn btn-ghost" type="button" data-close>Close</button>
      </div>`,
    });

    function reRender() {
      const body = document.querySelector(".modal-body");
      if (!body) return;
      body.innerHTML = bodyHTML();
      wire();
    }

    function wire() {
      const close = document.querySelector(".modal [data-close]");
      close?.addEventListener("click", () => window.Barca?.closeModal());

      document
        .querySelector(".modal [data-prev]")
        ?.addEventListener("click", () => {
          index = (index - 1 + items.length) % items.length;
          reRender();
        });
      document
        .querySelector(".modal [data-next]")
        ?.addEventListener("click", () => {
          index = (index + 1) % items.length;
          reRender();
        });

      const modal = document.querySelector(".modal");
      modal?.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          index = (index - 1 + items.length) % items.length;
          reRender();
        }
        if (e.key === "ArrowRight") {
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
    render();
  }

  document.addEventListener("cprum:ready", boot);
})();
