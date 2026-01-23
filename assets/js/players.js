(function () {
  "use strict";

  const els = {};
  let players = [];
  let started = false;

  function getFavorites() {
    return window.Barca?.getPlayers() || { items: [] };
  }

  function saveFavorites(favs) {
    window.Barca?.setPlayers(favs);
  }

  function addToFavorites(id) {
    const favs = getFavorites();
    if (!favs.includes(id)) {
      favs.push(id);
      saveFavorites(favs);
      window.Barca?.toast("Added to favorites!", "ok", { ttl: 1800 });
      renderCart();
    }
  }

  function removeFromFavorites(id) {
    const favs = getFavorites().filter((x) => x !== id);
    saveFavorites(favs);
    window.Barca?.toast("Removed from favorites", "info", { ttl: 1200 });
    renderCart();
  }

  function openDrawer(open) {
    if (!els.drawer || !els.overlay) return;
    const method = open ? "add" : "remove";
    els.drawer.classList[method]("open");
    els.overlay.classList[method]("show");
    els.drawer.setAttribute("aria-hidden", open ? "false" : "true");
    els.overlay.style.display = open ? "block" : "none";
    document.body.classList[method]("no-scroll");
  }

  function renderPlayers() {
    els.grid.innerHTML = players
      .map((p) => {
        return `
          <article class="card product-card">
            <img src="${p.img}" width="640" height="420" alt="${p.name}" />
            <div class="card-header" style="margin-top:10px;">
              <h3 class="card-title">${p.name}</h3>
              <div class="muted small">${p.position}</div>
            </div>
            <div class="btn-row">
              <button class="btn btn-primary" type="button" data-add="${p.id}">
                Add to favorites
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    els.grid.querySelectorAll("[data-add]").forEach((b) => {
      b.addEventListener("click", () =>
        addToFavorites(b.getAttribute("data-add"))
      );
    });
  }

  function renderCart() {
    const favs = getFavorites();
    els.cartItems.innerHTML = "";

    if (!favs.length) {
      els.cartItems.innerHTML = `<p class="muted">No favorites yet. Add players above!</p>`;
    } else {
      favs.forEach((id) => {
        const p = players.find((x) => x.id === id);
        if (p) {
          els.cartItems.insertAdjacentHTML(
            "beforeend",
            `
            <div class="cart-item" data-id="${id}">
              <div class="meta">
                <div class="name">${p.name}</div>
                <div class="muted small">${p.position}</div>
              </div>
              <button class="btn btn-small btn-danger" type="button" data-remove="${id}">
                Remove
              </button>
            </div>
          `
          );
        }
      });

      els.cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", () =>
          removeFromFavorites(btn.getAttribute("data-remove"))
        );
      });
    }

    els.total.textContent = favs.length;
  }

  function boot() {
    els.grid = document.getElementById("product-grid");
    els.productsSkeleton = document.getElementById("products-skeleton");

    els.drawer = document.getElementById("cart-drawer");
    els.overlay = document.getElementById("cart-overlay");
    els.cartItems = document.getElementById("cart-items");
    els.total = document.getElementById("cart-total");

    els.openCart = document.getElementById("open-cart");
    els.closeCart = document.getElementById("close-cart");

    els.openCart?.addEventListener("click", () => openDrawer(true));
    els.closeCart?.addEventListener("click", () => openDrawer(false));
    els.overlay?.addEventListener("click", () => openDrawer(false));

    players = [
      {
        id: "joan-garcia",
        name: "Joan García",
        position: "Goalkeeper",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/81c7699c-1298-45d6-834e-df72d8c550c8/01-Joan_Garcia.png?width=670&height=790",
      },
      {
        id: "wojciech-szczesny",
        name: "Wojciech Szczęsny",
        position: "Goalkeeper",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/adf97c66-a953-4225-a772-eb6c0258ed2b/25-Szczesny.png?width=670&height=790",
      },
      {
        id: "joao-cancelo",
        name: "João Cancelo",
        position: "Defender",
        img: "https://www.fcbarcelona.com/photo-resources/2026/01/15/4c9c8ca8-7d08-4325-8566-3aa3fce05d14/00-Cancelo.png?width=670&height=790",
      },
      {
        id: "alejandro-balde",
        name: "Alejandro Balde",
        position: "Defender",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/0d332686-2eee-4297-a099-bab75c7c35bb/03-Balde.png?width=670&height=790",
      },
      {
        id: "ronald-araujo",
        name: "Ronald Araújo",
        position: "Defender",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/072afc10-1ec9-483e-a4a5-8775cb6cea23/04-Araujo.png?width=670&height=790",
      },
      {
        id: "pau-cubarsi",
        name: "Pau Cubarsí",
        position: "Defender",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/8c77ff44-6a20-4b1f-9991-bb3937af9ce4/02-Cubarsi.png?width=670&height=790",
      },
      {
        id: "andreas-christensen",
        name: "Andreas Christensen",
        position: "Defender",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/d2083355-8ef0-4398-94ae-7d84615de3c2/15-Christensen.png?width=670&height=790",
      },
      {
        id: "gerard-martin",
        name: "Gerard Martín",
        position: "Defender",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/a4ea019d-b5b3-4b6e-a970-79fe8afc8bfd/18-Martin.png?width=670&height=790",
      },
      {
        id: "jules-kounde",
        name: "Jules Koundé",
        position: "Defender",
        img: "https://img.uefa.com/imgml/TP/players/1/2026/cutoff/250096309.webp",
      },
      {
        id: "eric-garcia",
        name: "Eric García",
        position: "Defender",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/bbfb1ea9-ad02-466c-80ba-ab2da4c3ce25/24-Eric_Garcia.png?width=670&height=790",
      },
      {
        id: "gavi",
        name: "Gavi",
        position: "Midfielder",
        img: "https://assets.laliga.com/squad/2025/t178/p500046/2048x2048/p500046_t178_2025_0_003_000.png",
      },
      {
        id: "pedri",
        name: "Pedri",
        position: "Midfielder",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/3dd2346c-01bb-4ad9-9b62-ed5cbf8d8b06/08-Pedri.png?width=670&height=790",
      },
      {
        id: "fermin-lopez",
        name: "Fermín López",
        position: "Midfielder",
        img: "https://assets.laliga.com/squad/2025/t178/p551086/2048x2225/p551086_t178_2025_1_001_000.png",
      },
      {
        id: "marc-casado",
        name: "Marc Casadó",
        position: "Midfielder",
        img: "https://assets.laliga.com/squad/2025/t178/p494927/2048x2048/p494927_t178_2025_1_003_000.png",
      },
      {
        id: "dani-olmo",
        name: "Dani Olmo",
        position: "Midfielder",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/eec9fdad-d078-4780-b0c3-4d9fe2f3b328/20-Olmo.png?width=670&height=790",
      },
      {
        id: "frenkie-de-jong",
        name: "Frenkie de Jong",
        position: "Midfielder",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/b62d13a8-5712-4823-b627-18dcce921378/21-De_Jong.png?width=670&height=790",
      },
      {
        id: "ferran-torres",
        name: "Ferran Torres",
        position: "Forward",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/05ad9394-0706-4043-8315-1795193f17ad/07-Ferran_Torres.png?width=670&height=790",
      },
      {
        id: "robert-lewandowski",
        name: "Robert Lewandowski",
        position: "Forward",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/3f98839a-bac3-451e-9431-6d58b79588d5/09-Lewandowski.png?width=670&height=790",
      },
      {
        id: "lamine-yamal",
        name: "Lamine Yamal",
        position: "Forward",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/aae1899c-adb7-450a-b705-61cad72d2508/10-Lamine.png?width=670&height=790",
      },
      {
        id: "raphinha",
        name: "Raphinha",
        position: "Forward",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/369f0d8e-3301-4f3d-9507-246371f8e3d2/11-Raphinha.png?width=670&height=790",
      },
      {
        id: "marcus-rashford",
        name: "Marcus Rashford",
        position: "Forward",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/6e30bc77-d2b9-4c6f-9a93-6a55628c4d5b/14-Rashford.png?width=670&height=790",
      },
      {
        id: "roony-bardghji",
        name: "Roony Bardghji",
        position: "Forward",
        img: "https://www.fcbarcelona.com/photo-resources/2025/09/09/9b946f2d-3dc7-4c96-ab7c-4a0e36e679cf/28-Bardghji.png?width=670&height=790",
      },
    ];

    if (els.productsSkeleton) {
      els.productsSkeleton.remove();
    }

    if (els.grid) {
      renderPlayers();
    }
    renderCart();
  }

  function safeBoot() {
    if (started) return;
    started = true;
    boot();
  }

  document.addEventListener("cprum:ready", safeBoot);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeBoot);
  } else {
    safeBoot();
  }
})();
