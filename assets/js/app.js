(function () {
  "use strict";

  const Barca = (window.Barca = window.Barca || {});
  const state = (Barca.state = Barca.state || {
    logging: false,
    tracepoints: {},
    pageGroup: "",
    lastError: null,
    lastNetwork: null,
    themeMode: "system", // 'light' | 'dark' | 'system'
    ready: false,
  });

  // ------------------------------------------------------------
  // Storage helpers
  // ------------------------------------------------------------
  const store = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    },
    getJSON(key, fallback = {}) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    setJSON(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    },
  };

  // ------------------------------------------------------------
  // Logging (controlled by cpRumTag('logging', true|false))
  // ------------------------------------------------------------
  function log(...args) {
    if (!state.logging) return;
    // Intentionally verbose so profilers can hook into console.
    console.log("[Barca]", ...args);
  }
  Barca.log = log;

  // ------------------------------------------------------------
  // DataLayer + command processing
  // ------------------------------------------------------------
  window.BarcaDataLayer = window.BarcaDataLayer || [];
  let dlIndex = 0;

  function handleTag(args) {
    const [cmd, ...rest] = Array.from(args || []);
    if (!cmd) return;

    if (cmd === "logging") {
      state.logging = Boolean(rest[0]);
      store.set("cprum-logging", state.logging ? "1" : "0");
      log("logging:", state.logging);
      Barca.updateHud();
      return;
    }

    if (cmd === "tracepoint") {
      const key = String(rest[0] ?? "").trim();
      const value = rest[1];
      if (!key) return;
      state.tracepoints[key] = value;
      store.setJSON("cprum-tracepoints", state.tracepoints);
      log("tracepoint:", key, value);
      Barca.updateHud();
      return;
    }

    if (cmd === "pageGroup") {
      state.pageGroup = String(rest[0] ?? "");
      store.set("cprum-pageGroup", state.pageGroup);
      log("pageGroup:", state.pageGroup);
      Barca.updateHud();
      return;
    }

    // Unknown commands are ignored by design.
    log("unknown tag:", args);
  }

  function processDataLayer() {
    while (dlIndex < window.BarcaDataLayer.length) {
      const args = window.BarcaDataLayer[dlIndex++];
      try {
        handleTag(args);
      } catch (e) {
        console.warn("[Barca] tag error", e);
      }
    }
  }
  Barca.processDataLayer = processDataLayer;

  // Replace (or define) cpRumTag to push + process
  window.cpRumTag = function () {
    window.BarcaDataLayer.push(arguments);
    processDataLayer();
  };

  // Load persisted settings
  state.logging = store.get("cprum-logging", "0") === "1";
  state.tracepoints = store.getJSON("cprum-tracepoints", {});
  state.pageGroup = store.get("cprum-pageGroup", "") || "";

  // ------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function safeText(s) {
    return String(s ?? "").replace(/[\u0000-\u001f]/g, "");
  }

  function formatDuration(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n)) return "—";
    if (n < 1) return `${n.toFixed(2)}ms`;
    if (n < 100) return `${n.toFixed(1)}ms`;
    return `${Math.round(n)}ms`;
  }

  // ------------------------------------------------------------
  // Global error capture
  // ------------------------------------------------------------
  function setLastError(info) {
    state.lastError = info;
    Barca.updateHud();
    Barca.updateLabPanels();
  }

  window.addEventListener(
    "error",
    (event) => {
      const err = event.error;
      const target = event.target;

      // Resource load errors (img/script/link) often have no stack/message.
      let message = err?.message || event.message || "";
      let filename = event.filename || "";

      if (!message && target && target.tagName) {
        const tag = String(target.tagName).toLowerCase();
        const url = target.src || target.href || "";
        if (tag === "img" || tag === "script" || tag === "link") {
          message = `Resource error: <${tag}> failed to load`;
          filename = url;
        }
      }

      const info = {
        type: "error",
        message: safeText(message || "Unknown error"),
        filename: safeText(filename || ""),
        lineno: event.lineno || 0,
        colno: event.colno || 0,
        stack: safeText(err?.stack || ""),
        time: new Date().toISOString(),
      };
      log("window.onerror", info);
      setLastError(info);
    },
    true
  );

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const info = {
      type: "unhandledrejection",
      message: safeText(reason?.message || reason || "Unhandled rejection"),
      stack: safeText(reason?.stack || ""),
      time: new Date().toISOString(),
    };
    log("unhandledrejection", info);
    setLastError(info);
  });

  // ------------------------------------------------------------
  // Network request instrumentation (fetch + XHR)
  // ------------------------------------------------------------
  function setLastNetwork(info) {
    state.lastNetwork = info;
    Barca.updateHud();
    Barca.updateLabPanels();
  }
  Barca.setLastNetwork = setLastNetwork;

  // Wrap fetch
  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (nativeFetch) {
    window.fetch = async function (resource, init) {
      const start = performance.now();
      const method = (init?.method || "GET").toUpperCase();
      const url =
        typeof resource === "string" ? resource : resource?.url || "(unknown)";
      log("fetch:start", method, url);

      try {
        const res = await nativeFetch(resource, init);
        const duration = performance.now() - start;
        const info = {
          kind: "fetch",
          method,
          url,
          status: res.status,
          ok: res.ok,
          duration,
          time: new Date().toISOString(),
        };
        log("fetch:end", info);
        setLastNetwork(info);
        return res;
      } catch (e) {
        const duration = performance.now() - start;
        const info = {
          kind: "fetch",
          method,
          url,
          status: 0,
          ok: false,
          duration,
          error: safeText(e?.message || e),
          time: new Date().toISOString(),
        };
        log("fetch:error", info);
        setLastNetwork(info);
        throw e;
      }
    };
  }

  // Wrap XHR
  const XHR = window.XMLHttpRequest;
  if (XHR && XHR.prototype) {
    const origOpen = XHR.prototype.open;
    const origSend = XHR.prototype.send;

    XHR.prototype.open = function (method, url) {
      this.__cprum = {
        method: String(method || "GET").toUpperCase(),
        url: String(url || "(unknown)"),
      };
      return origOpen.apply(this, arguments);
    };

    XHR.prototype.send = function () {
      const start = performance.now();
      const meta = this.__cprum || { method: "GET", url: "(unknown)" };

      const finalize = (status, ok, error) => {
        const duration = performance.now() - start;
        const info = {
          kind: "xhr",
          method: meta.method,
          url: meta.url,
          status: status || 0,
          ok: Boolean(ok),
          duration,
          error: error ? safeText(error) : undefined,
          time: new Date().toISOString(),
        };
        log("xhr:end", info);
        setLastNetwork(info);
      };

      this.addEventListener("load", () =>
        finalize(this.status, this.status >= 200 && this.status < 400)
      );
      this.addEventListener("error", () =>
        finalize(this.status || 0, false, "XHR error")
      );
      this.addEventListener("timeout", () =>
        finalize(this.status || 0, false, "XHR timeout")
      );

      return origSend.apply(this, arguments);
    };
  }

  // A helper used by Error Lab: delay before executing a normal fetch.
  Barca.slowFetch = function slowFetch(url, delayMs = 1200, init) {
    const ms = clamp(Number(delayMs) || 0, 0, 10000);
    log("slowFetch", { url, delayMs: ms });
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        fetch(url, init).then(resolve).catch(reject);
      }, ms);
    });
  };

  // ------------------------------------------------------------
  // Theme toggle
  // ------------------------------------------------------------
  function applyTheme(mode) {
    state.themeMode = mode;
    store.set("theme", mode);

    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = mode === "dark" || (mode === "system" && prefersDark);

    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    // Let profilers detect theme toggles
    log("theme", { mode, resolved: isDark ? "dark" : "light" });
  }

  Barca.applyTheme = applyTheme;

  // ------------------------------------------------------------
  // Toasts
  // ------------------------------------------------------------
  function ensureToastContainer() {
    let c = $(".toast-container");
    if (!c) {
      c = document.createElement("div");
      c.className = "toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  Barca.toast = function toast(message, type = "info", options = {}) {
    const container = ensureToastContainer();
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    const title =
      options.title ||
      (type === "danger" ? "Heads up" : type === "ok" ? "Nice" : "Note");
    t.innerHTML = `
      <div class="title">${safeText(title)}</div>
      <div class="msg">${safeText(message)}</div>
    `;
    container.appendChild(t);

    const ttl = clamp(Number(options.ttl ?? 3200), 800, 15000);
    setTimeout(() => t.remove(), ttl);

    log("toast", { type, message });
    return t;
  };

  // ------------------------------------------------------------
  // Modal (focus-trapped)
  // ------------------------------------------------------------
  let lastFocusedEl = null;

  function ensureModalRoot() {
    // No persistent root needed; created per open.
  }

  function trapFocus(modalEl) {
    const focusables = $$(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      modalEl
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        Barca.closeModal();
      }
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    modalEl.__trapHandler = onKey;
    modalEl.addEventListener("keydown", onKey);
    setTimeout(() => first.focus(), 0);
  }

  Barca.openModal = function openModal(options = {}) {
    ensureModalRoot();

    const title = options.title || "Dialog";
    const body = options.body || "";
    const footer = options.footer || "";

    lastFocusedEl = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("role", "presentation");

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", title);

    modal.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${safeText(title)}</h3>
        <button class="modal-close" type="button" aria-label="Close dialog">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close() {
      Barca.closeModal();
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    $(".modal-close", modal).addEventListener("click", close);

    Barca._activeModal = overlay;
    trapFocus(modal);

    log("modal:open", { title });
  };

  Barca.closeModal = function closeModal() {
    const overlay = Barca._activeModal;
    if (!overlay) return;

    const modal = $(".modal", overlay);
    if (modal && modal.__trapHandler) {
      modal.removeEventListener("keydown", modal.__trapHandler);
    }

    overlay.remove();
    Barca._activeModal = null;

    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus();
    }
    log("modal:close");
  };

  // ------------------------------------------------------------
  // Tooltips (single floating tooltip)
  // ------------------------------------------------------------
  function initTooltips() {
    let tip = $("#cprum-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "cprum-tooltip";
      tip.className = "tooltip";
      tip.setAttribute("role", "tooltip");
      document.body.appendChild(tip);
    }

    let activeTarget = null;
    let hideTimer = null;

    function show(target) {
      const text = target.getAttribute("data-tooltip");
      if (!text) return;

      clearTimeout(hideTimer);
      activeTarget = target;
      tip.textContent = text;

      const r = target.getBoundingClientRect();
      const x = clamp(r.left + r.width / 2, 12, window.innerWidth - 12);
      const y = Math.max(12, r.top - 10);

      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
      tip.style.transform = "translate(-50%, -100%)";
      tip.classList.add("show");
    }

    function hide() {
      hideTimer = setTimeout(() => {
        tip.classList.remove("show");
        activeTarget = null;
      }, 60);
    }

    function onMove(e) {
      if (!activeTarget) return;
      // Keep tooltip near pointer for "storms" use cases
      tip.style.left = `${clamp(e.clientX, 12, window.innerWidth - 12)}px`;
      tip.style.top = `${clamp(e.clientY - 14, 12, window.innerHeight - 12)}px`;
      tip.style.transform = "translate(-50%, -100%)";
    }

    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-tooltip]");
      if (t) show(t);
    });

    document.addEventListener("focusin", (e) => {
      const t = e.target.closest("[data-tooltip]");
      if (t) show(t);
    });

    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("[data-tooltip]")) hide();
    });

    document.addEventListener("focusout", (e) => {
      if (e.target.closest("[data-tooltip]")) hide();
    });

    document.addEventListener("mousemove", onMove, { passive: true });
  }
  Barca.initTooltips = initTooltips;

  // ------------------------------------------------------------
  // Accordions
  // ------------------------------------------------------------
  function initAccordions() {
    $$(".accordion").forEach((acc) => {
      $$(".accordion-button", acc).forEach((btn, idx) => {
        btn.setAttribute("type", "button");

        // Ensure a stable relationship between button and panel
        const panelId = btn.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;
        if (!panel) return;

        if (!btn.id) btn.id = `acc-${panelId}-btn-${idx}`;
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-labelledby", btn.id);

        btn.addEventListener("click", () => {
          const expanded = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", String(!expanded));
          panel.hidden = expanded;

          log("accordion:toggle", { id: panelId, expanded: !expanded });
        });
      });
    });
  }
  Barca.initAccordions = initAccordions;

  // ------------------------------------------------------------
  // Tabs (keyboard accessible)
  // ------------------------------------------------------------
  function initTabs() {
    $$(".tabs").forEach((tabsEl) => {
      const tabButtons = $$(".tab", tabsEl);
      const panels = $$(".tab-panel", tabsEl);

      // Wire ARIA relationships
      const uid =
        tabsEl.getAttribute("data-tabs-uid") ||
        `tabs-${Math.random().toString(16).slice(2, 8)}`;
      tabsEl.setAttribute("data-tabs-uid", uid);

      tabButtons.forEach((b, i) => {
        b.setAttribute("type", "button");
        b.setAttribute("role", "tab");

        const panel = panels[i];
        if (!panel) return;

        panel.setAttribute("role", "tabpanel");

        if (!b.id) b.id = `${uid}-tab-${i}`;
        if (!panel.id) panel.id = `${uid}-panel-${i}`;

        b.setAttribute("aria-controls", panel.id);
        panel.setAttribute("aria-labelledby", b.id);
      });

      function activate(idx, setFocus = true) {
        tabButtons.forEach((b, i) => {
          const selected = i === idx;
          b.setAttribute("aria-selected", String(selected));
          b.tabIndex = selected ? 0 : -1;
        });
        panels.forEach((p, i) => {
          p.hidden = i !== idx;
        });
        if (setFocus) tabButtons[idx]?.focus();

        log("tabs:activate", { idx });
      }

      tabButtons.forEach((b, i) => {
        b.addEventListener("click", () => activate(i, false));
        b.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            activate((i + 1) % tabButtons.length);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            activate((i - 1 + tabButtons.length) % tabButtons.length);
          }
          if (e.key === "Home") {
            e.preventDefault();
            activate(0);
          }
          if (e.key === "End") {
            e.preventDefault();
            activate(tabButtons.length - 1);
          }
        });
      });

      // Ensure one active tab
      const firstSelected = tabButtons.findIndex(
        (b) => b.getAttribute("aria-selected") === "true"
      );
      activate(firstSelected >= 0 ? firstSelected : 0, false);
    });
  }
  Barca.initTabs = initTabs;

  // ------------------------------------------------------------
  // Animated counters
  // ------------------------------------------------------------
  function initCounters() {
    const els = $$("[data-counter][data-target]");
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          obs.unobserve(el);

          const target = Number(el.getAttribute("data-target") || "0");
          const start = performance.now();
          const duration = clamp(
            Number(el.getAttribute("data-duration") || 900),
            300,
            4000
          );

          function tick(now) {
            const t = clamp((now - start) / duration, 0, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(eased * target).toLocaleString();
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);

          log("counter:start", { target });
        });
      },
      { threshold: 0.35 }
    );

    els.forEach((el) => obs.observe(el));
  }
  Barca.initCounters = initCounters;

  // ------------------------------------------------------------
  // Lazy images + skeleton loading
  // ------------------------------------------------------------
  function initLazyImages() {
    const lazy = $$("img[data-src]");
    if (!lazy.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          obs.unobserve(img);

          // Optional delay to make skeleton loaders visible
          const delay = clamp(
            Number(img.getAttribute("data-delay") || 0),
            0,
            2500
          );
          const src = img.getAttribute("data-src");

          setTimeout(() => {
            if (!src) return;
            img.src = src;
          }, delay);
        });
      },
      { rootMargin: "160px" }
    );

    lazy.forEach((img) => {
      img.addEventListener("load", () => {
        img.classList.add("loaded");
        const wrap = img.closest(".gallery-item") || img.parentElement;
        const sk = wrap ? wrap.querySelector(".skeleton") : null;
        if (sk) sk.remove();
      });
      obs.observe(img);
    });
  }
  Barca.initLazyImages = initLazyImages;

  // ------------------------------------------------------------
  // Navbar: active highlighting, dropdowns, mobile menu
  // ------------------------------------------------------------
  function highlightActiveNav() {
    const page = (
      location.pathname.split("/").pop() || "index.html"
    ).toLowerCase();
    $$("[data-nav-link]").forEach((a) => {
      const href = (a.getAttribute("href") || "")
        .split("#")[0]
        .replace("./", "")
        .toLowerCase();
      a.classList.toggle("active", href === page);
    });
  }
  Barca.highlightActiveNav = highlightActiveNav;

  function initNav() {
    const navToggle = $("#nav-toggle");
    const nav = document.querySelector("nav.nav");
    const dropdownToggles = $$("[data-dropdown-toggle]");
    const themeToggle = $("#theme-toggle");
    const hudToggle = $("#hud-toggle");

    if (navToggle && nav) {
      navToggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(open));
        log("nav:toggle", { open });
      });

      document.addEventListener("click", (e) => {
        if (!nav.classList.contains("open")) return;
        if (e.target.closest("nav.nav") || e.target === navToggle) return;
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    }

    dropdownToggles.forEach((btn) => {
      const item = btn.closest(".dropdown");
      const menu = item?.querySelector("[data-dropdown-menu]");
      if (!item || !menu) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const open = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
        log("dropdown:toggle", { open });
      });
    });

    document.addEventListener("click", (e) => {
      $$(".dropdown.open").forEach((d) => {
        if (e.target.closest(".dropdown")) return;
        d.classList.remove("open");
        const t = d.querySelector("[data-dropdown-toggle]");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      // Close dropdowns
      $$(".dropdown.open").forEach((d) => {
        d.classList.remove("open");
        const t = d.querySelector("[data-dropdown-toggle]");
        if (t) t.setAttribute("aria-expanded", "false");
      });
      // Close mobile nav
      if (nav && nav.classList.contains("open")) {
        nav.classList.remove("open");
        navToggle?.setAttribute("aria-expanded", "false");
      }
    });

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const current = store.get("theme", "system");
        const next =
          current === "light"
            ? "dark"
            : current === "dark"
            ? "system"
            : "light";
        applyTheme(next);
        Barca.toast(`Theme: ${next}`, "info", { ttl: 1800 });
      });
    }

    if (hudToggle) {
      hudToggle.addEventListener("click", () => Barca.toggleHud(true));
    }

    highlightActiveNav();
    Barca.updatePlayersBadge();
  }
  Barca.initNav = initNav;

  // ------------------------------------------------------------
  // Cart badge (used by Shop page)
  // ------------------------------------------------------------
  Barca.getPlayers = function getPlayers() {
    const fav = localStorage.getItem("blaugrana-favorites");
    try {
      return fav ? JSON.parse(fav) : [];
    } catch {
      return [];
    }
  };

  Barca.setPlayers = function setPlayers(players) {
    localStorage.setItem("blaugrana-favorites", JSON.stringify(players));
    Barca.updatePlayersBadge();
  };

  Barca.updatePlayersBadge = function updatePlayersBadge() {
    const badge = $("#fav-count");
    if (!badge) return;
    const players = Barca.getPlayers();
    const count = (players || []).length;
    badge.textContent = String(count);
    badge.style.display = count > 0 ? "inline-flex" : "none";
  };

  // ------------------------------------------------------------
  // Debug HUD
  // ------------------------------------------------------------
  Barca.initHud = function initHud() {
    let hud = $("#cprum-hud");
    if (!hud) {
      hud = document.createElement("section");
      hud.id = "cprum-hud";
      hud.className = "hud";
      hud.setAttribute("aria-label", "Debug HUD");
      hud.innerHTML = `
        <header>
          <div class="title">Debug HUD</div>
          <div class="row">
            <button class="btn btn-small btn-ghost" type="button" data-hud-logging>Logging</button>
            <button class="btn btn-small btn-ghost" type="button" data-hud-clear>Clear</button>
            <button class="btn btn-small" type="button" data-hud-close>Close</button>
          </div>
        </header>
        <div class="small muted">Toggled via <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> or the bug icon.</div>
        <hr />
        <div class="small muted">State</div>
        <pre data-hud-state></pre>
        <div class="small muted" style="margin-top:10px;">Last error</div>
        <pre data-hud-error></pre>
        <div class="small muted" style="margin-top:10px;">Last network</div>
        <pre data-hud-network></pre>
      `;
      document.body.appendChild(hud);
    }

    const btnClose = $("[data-hud-close]", hud);
    const btnClear = $("[data-hud-clear]", hud);
    const btnLogging = $("[data-hud-logging]", hud);

    btnClose?.addEventListener("click", () => Barca.toggleHud(false));
    btnClear?.addEventListener("click", () => {
      state.tracepoints = {};
      store.setJSON("cprum-tracepoints", {});
      Barca.toast("Tracepoints cleared", "ok", { ttl: 1600 });
      Barca.updateHud();
    });
    btnLogging?.addEventListener("click", () => {
      cpRumTag("logging", !state.logging);
      Barca.toast(`Logging: ${!state.logging ? "off" : "on"}`, "info", {
        ttl: 1600,
      });
      Barca.updateHud();
    });

    document.addEventListener("keydown", (e) => {
      if (!(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d")) return;
      e.preventDefault();
      Barca.toggleHud();
    });
  };

  Barca.toggleHud = function toggleHud(force) {
    const hud = $("#cprum-hud");
    if (!hud) return;
    const open =
      typeof force === "boolean" ? force : !hud.classList.contains("open");
    hud.classList.toggle("open", open);
    log("hud:toggle", { open });
  };

  Barca.updateHud = function updateHud() {
    const hud = $("#cprum-hud");
    if (!hud) return;

    const s = $("[data-hud-state]", hud);
    const e = $("[data-hud-error]", hud);
    const n = $("[data-hud-network]", hud);

    if (s) {
      s.textContent = JSON.stringify(
        {
          logging: state.logging,
          pageGroup: state.pageGroup,
          tracepoints: state.tracepoints,
          theme: document.documentElement.dataset.theme || "light",
        },
        null,
        2
      );
    }

    if (e) {
      e.textContent = state.lastError
        ? JSON.stringify(state.lastError, null, 2)
        : "—";
    }

    if (n) {
      n.textContent = state.lastNetwork
        ? JSON.stringify(
            {
              ...state.lastNetwork,
              duration: formatDuration(state.lastNetwork.duration),
            },
            null,
            2
          )
        : "—";
    }
  };

  // ------------------------------------------------------------
  // Error/Network panels on Lab pages
  // ------------------------------------------------------------
  Barca.updateLabPanels = function updateLabPanels() {
    // Error Lab uses these data attributes; keep generic for reuse.
    $$("[data-last-error]").forEach((el) => {
      el.textContent = state.lastError
        ? JSON.stringify(state.lastError, null, 2)
        : "—";
    });

    $$("[data-last-network]").forEach((el) => {
      el.textContent = state.lastNetwork
        ? JSON.stringify(
            {
              ...state.lastNetwork,
              duration: formatDuration(state.lastNetwork.duration),
            },
            null,
            2
          )
        : "—";
    });

    $$("[data-debug-logging]").forEach(
      (el) => (el.textContent = state.logging ? "true" : "false")
    );
    $$("[data-debug-pagegroup]").forEach(
      (el) => (el.textContent = state.pageGroup || "—")
    );
    $$("[data-debug-tracepoints]").forEach((el) => {
      const tp = state.tracepoints || {};
      const lines = Object.keys(tp).length
        ? Object.entries(tp)
            .map(([k, v]) => `${k}: ${safeText(v)}`)
            .join("\n")
        : "—";
      el.textContent = lines;
    });
  };

  // ------------------------------------------------------------
  // Partials include (header/footer)
  // ------------------------------------------------------------
  async function loadInclude(el) {
    const path = el.getAttribute("data-include");
    if (!path) return;

    try {
      const res = await fetch(path, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      el.innerHTML = await res.text();
    } catch (e) {
      el.innerHTML = `
        <div class="container">
          <div class="alert">
            <strong>Include failed:</strong> ${safeText(path)}<br/>
            <span class="small muted">Tip: run a local server (see README) instead of opening files via file://.</span>
          </div>
        </div>
      `;
      log("include:error", e);
    }
  }

  Barca.loadPartials = async function loadPartials() {
    const includes = $$("[data-include]");
    await Promise.all(includes.map(loadInclude));
  };

  // ------------------------------------------------------------
  // Ready helper
  // ------------------------------------------------------------
  Barca.whenReady = function whenReady(fn) {
    if (state.ready) return fn();
    document.addEventListener("cprum:ready", fn, { once: true });
  };

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    // Apply persisted theme mode if present.
    const savedTheme = store.get("theme", "system");
    applyTheme(savedTheme);

    // Process any queued tags from inline bootstrap
    processDataLayer();

    await Barca.loadPartials();

    // Init common UI
    Barca.initNav();
    Barca.initTooltips();
    Barca.initAccordions();
    Barca.initTabs();
    Barca.initCounters();
    Barca.initLazyImages();
    Barca.initHud();

    // Footer utilities
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Final update
    Barca.updateHud();
    Barca.updateLabPanels();

    state.ready = true;
    document.dispatchEvent(new CustomEvent("cprum:ready"));

    log("boot:ready", { page: location.pathname });
  });
})();
