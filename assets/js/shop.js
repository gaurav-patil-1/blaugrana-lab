/* Shop page script: products + localStorage cart + drawer + checkout validation */

(function () {
  "use strict";

  const els = {};
  let products = [];

  function money(n) {
    return `$${Number(n || 0).toFixed(2)}`;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCart() {
    return window.Barca?.getCart() || { items: [] };
  }

  function saveCart(cart) {
    window.Barca?.setCart(cart);
  }

  function addToCart(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;

    const cart = getCart();
    const items = cart.items || [];
    const existing = items.find((x) => x.id === id);

    if (existing) existing.qty += 1;
    else items.push({ id, qty: 1, name: p.name, price: p.price, img: p.img });

    cart.items = items;
    saveCart(cart);

    window.Barca?.toast(`${p.name} added to cart`, "ok", { ttl: 1800 });
    cpRumTag("tracepoint", "cart:add", id);

    renderCart();
  }

  function removeFromCart(id) {
    const cart = getCart();
    cart.items = (cart.items || []).filter((x) => x.id !== id);
    saveCart(cart);
    cpRumTag("tracepoint", "cart:remove", id);
    renderCart();
  }

  function setQty(id, qty) {
    const cart = getCart();
    const it = (cart.items || []).find((x) => x.id === id);
    if (!it) return;
    it.qty = Math.max(1, Number(qty) || 1);
    saveCart(cart);
    renderCart();
  }

  function cartTotals(cart) {
    const subtotal = (cart.items || []).reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0),
      0
    );
    const shipping = subtotal > 0 ? 4.99 : 0;
    const tax = subtotal * 0.07;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
  }

  function renderProducts() {
    els.grid.innerHTML = products
      .map((p) => {
        return `
          <article class="card product-card">
            <img src="${escapeHtml(
              p.img
            )}" width="640" height="420" alt="${escapeHtml(
          p.name
        )} (custom SVG)" />
            <div class="card-header" style="margin-top:10px;">
              <div>
                <h3 class="card-title">${escapeHtml(p.name)}</h3>
                <div class="rating">${escapeHtml(p.tag)} • ${escapeHtml(
          p.rating
        )}★</div>
              </div>
              <div class="price">${money(p.price)}</div>
            </div>
            <p class="muted">${escapeHtml(p.desc)}</p>
            <div class="btn-row">
              <button class="btn btn-primary" type="button" data-add="${escapeHtml(
                p.id
              )}" data-tooltip="Stores cart in localStorage">
                Add to cart
              </button>
              <button class="btn btn-ghost" type="button" data-details="${escapeHtml(
                p.id
              )}">
                Details
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    els.grid.querySelectorAll("[data-add]").forEach((b) => {
      b.addEventListener("click", () => addToCart(b.getAttribute("data-add")));
    });

    els.grid.querySelectorAll("[data-details]").forEach((b) => {
      b.addEventListener("click", () =>
        showDetails(b.getAttribute("data-details"))
      );
    });

    window.Barca?.initTooltips();
  }

  function showDetails(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;

    const body = `
      <div class="grid grid-2">
        <div>
          <img src="${escapeHtml(p.img)}" alt="${escapeHtml(
      p.name
    )}" style="width:100%; border-radius:16px; border:1px solid var(--border);" />
        </div>
        <div>
          <div class="kicker" style="color: var(--text); background: color-mix(in oklab, var(--accent) 14%, var(--surface)); border-color: var(--border);">
            ${escapeHtml(p.tag)} • ${escapeHtml(p.rating)}★
          </div>
          <h3 style="margin-top:8px;">${escapeHtml(p.name)}</h3>
          <p class="muted">${escapeHtml(p.desc)}</p>
          <div class="alert">
            <strong>Profiler tip:</strong> Add/remove items quickly and watch localStorage + DOM updates.
          </div>
          <div class="btn-row" style="margin-top:12px;">
            <button class="btn btn-primary" type="button" id="modal-add">Add to cart</button>
            <button class="btn btn-ghost" type="button" data-close>Close</button>
          </div>
        </div>
      </div>
    `;

    window.Barca?.openModal({ title: "Product detail", body });
    setTimeout(() => {
      document
        .getElementById("modal-add")
        ?.addEventListener("click", () => addToCart(id));
      document
        .querySelector(".modal [data-close]")
        ?.addEventListener("click", () => window.Barca?.closeModal());
    }, 0);
  }

  function openDrawer(open) {
    els.drawer.classList.toggle("open", open);
    els.overlay.hidden = !open;
    els.drawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) cpRumTag("tracepoint", "cart:drawer", "open");
  }

  function renderCart() {
    const cart = getCart();
    const items = cart.items || [];

    if (!items.length) {
      els.cartItems.innerHTML = `<p class="muted">Your cart is empty. Add a few items to exercise storage + DOM updates.</p>`;
    } else {
      els.cartItems.innerHTML = items
        .map((it) => {
          return `
            <div class="cart-item" data-id="${escapeHtml(it.id)}">
              <img src="${escapeHtml(it.img)}" alt="" aria-hidden="true"/>
              <div class="meta">
                <div class="name">${escapeHtml(it.name)}</div>
                <div class="price">${money(
                  it.price
                )} • <span class="muted">Qty</span>
                  <input type="number" min="1" value="${escapeHtml(
                    it.qty
                  )}" data-qty style="width:78px; margin-left:6px;" />
                </div>
              </div>
              <button class="btn btn-small btn-danger" type="button" data-remove>Remove</button>
            </div>
          `;
        })
        .join("");
    }

    // totals
    const totals = cartTotals(cart);
    els.subtotal.textContent = money(totals.subtotal);
    els.shipping.textContent = money(totals.shipping);
    els.tax.textContent = money(totals.tax);
    els.total.textContent = money(totals.total);

    // wire interactions
    els.cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-id]")?.getAttribute("data-id");
        removeFromCart(id);
      });
    });

    els.cartItems.querySelectorAll("[data-qty]").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.closest("[data-id]")?.getAttribute("data-id");
        setQty(id, input.value);
      });
    });
  }

  function validate(form) {
    let ok = true;

    const required = form.querySelectorAll("[data-required]");
    required.forEach((el) => {
      const value = (el.value || "").trim();
      const invalid = !value;
      el.setAttribute("aria-invalid", invalid ? "true" : "false");
      ok = ok && !invalid;
    });

    const email = form.querySelector('[name="email"]');
    if (email) {
      const value = (email.value || "").trim();
      const invalid = value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
      email.setAttribute("aria-invalid", invalid ? "true" : "false");
      ok = ok && !invalid;
    }

    const card = form.querySelector('[name="card"]');
    if (card) {
      const digits = (card.value || "").replace(/\D/g, "");
      const invalid = digits.length < 12;
      card.setAttribute("aria-invalid", invalid ? "true" : "false");
      ok = ok && !invalid;
    }

    return ok;
  }

  function wireCheckout() {
    els.checkout?.addEventListener("submit", (e) => {
      e.preventDefault();
      const cart = getCart();
      const items = cart.items || [];
      if (!items.length) {
        window.Barca?.toast(
          "Cart is empty. Add items before checkout.",
          "danger"
        );
        return;
      }

      const ok = validate(els.checkout);
      if (!ok) {
        window.Barca?.toast("Please fix the highlighted fields.", "danger");
        return;
      }

      // Fake processing delay to create timing signals
      const start = performance.now();
      window.Barca?.toast("Processing… (fake)", "info", { ttl: 1200 });

      setTimeout(() => {
        const dur = performance.now() - start;
        cpRumTag("tracepoint", "checkout", `submitted:${Math.round(dur)}ms`);
        window.Barca?.toast("Order placed! (Not really — static site)", "ok", {
          ttl: 2600,
        });

        // Clear cart
        saveCart({ items: [] });
        renderCart();
        els.checkout.reset();
      }, 800 + Math.random() * 600);
    });
  }

  async function loadProducts() {
    els.productsSkeleton.style.display = "block";
    try {
      const res = await fetch("./data/products.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      products = await res.json();
      renderProducts();
      renderCart();
    } catch (e) {
      window.Barca?.toast(
        "Failed to load products.json (see console).",
        "danger"
      );
      console.error(e);
    } finally {
      els.productsSkeleton.style.display = "none";
    }
  }

  function boot() {
    cpRumTag("pageGroup", "Shop");

    els.grid = document.getElementById("product-grid");
    els.productsSkeleton = document.getElementById("products-skeleton");

    els.drawer = document.getElementById("cart-drawer");
    els.overlay = document.getElementById("cart-overlay");
    els.cartItems = document.getElementById("cart-items");
    els.subtotal = document.getElementById("cart-subtotal");
    els.shipping = document.getElementById("cart-shipping");
    els.tax = document.getElementById("cart-tax");
    els.total = document.getElementById("cart-total");

    els.openCart = document.getElementById("open-cart");
    els.closeCart = document.getElementById("close-cart");

    els.checkout = document.getElementById("checkout-form");

    els.openCart?.addEventListener("click", () => openDrawer(true));
    els.closeCart?.addEventListener("click", () => openDrawer(false));
    els.overlay?.addEventListener("click", () => openDrawer(false));

    wireCheckout();
    loadProducts();
  }

  document.addEventListener("cprum:ready", boot);
})();
