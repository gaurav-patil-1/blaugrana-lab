/* Error Lab page script: intentionally trigger errors + network scenarios */

(function () {
  "use strict";

  const els = {};

  function clearPanels() {
    if (window.Barca?.state) {
      window.Barca.state.lastError = null;
      window.Barca.state.lastNetwork = null;
      window.Barca.updateHud?.();
      window.Barca.updateLabPanels?.();
    }
    window.Barca?.toast("Cleared last error + network", "info", { ttl: 1600 });
  }

  // ---------------------------
  // Sync errors
  // ---------------------------
  function throwSyncError() {
    throw new Error("Error Lab: throw new Error (sync, uncaught)");
  }

  function referenceError() {
    // eslint-disable-next-line no-undef
    return totallyUndefinedVariable + 1;
  }

  function typeErrorNonFunction() {
    const x = 123;
    // @ts-ignore
    x();
  }

  function jsonParseInvalid() {
    JSON.parse("{ this is: not json }");
  }

  function stackOverflow(depth) {
    // Controlled recursion; should throw RangeError quickly on most engines.
    const d = Math.max(1000, Math.min(50000, Number(depth) || 20000));
    function recurse(i) {
      return i <= 0 ? 0 : 1 + recurse(i - 1);
    }
    recurse(d);
  }

  // ---------------------------
  // Promise / async errors
  // ---------------------------
  function unhandledRejection() {
    Promise.reject(new Error("Error Lab: unhandled promise rejection"));
  }

  async function asyncThrow() {
    await Promise.resolve();
    throw new Error("Error Lab: async function throw after await");
  }

  function fetchRejectHandled() {
    fetch("https://example.invalid/this-will-fail")
      .then(() => {})
      .catch((e) => {
        window.Barca?.toast(
          `Handled fetch rejection: ${e?.message || e}`,
          "info",
          { ttl: 2600 }
        );
      });
  }

  function fetchRejectUnhandled() {
    // Intentionally not caught => unhandledrejection in most browsers
    fetch("https://example.invalid/this-will-fail-unhandled");
  }

  // ---------------------------
  // Resource errors
  // ---------------------------
  function brokenImage() {
    const img = document.getElementById("broken-img");
    img.src = "./assets/img/does-not-exist-404.svg";
  }

  function scriptLoadError() {
    const s = document.createElement("script");
    s.src = "./assets/js/bad-url-does-not-exist.js";
    s.async = true;
    s.onerror = () => {
      window.Barca?.toast(
        "Script load error fired (check Network).",
        "danger",
        { ttl: 2600 }
      );
    };
    document.head.appendChild(s);
  }

  function cssLoadError() {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "./assets/css/this-file-does-not-exist.css";
    l.onerror = () => {
      window.Barca?.toast("CSS load error fired.", "danger", { ttl: 2600 });
    };
    document.head.appendChild(l);
  }

  // ---------------------------
  // Network scenarios (fetch + XHR)
  // ---------------------------
  async function fetchSuccess() {
    const res = await fetch("./data/sample.json", { cache: "no-cache" });
    const data = await res.json();
    window.Barca?.toast(`Fetch success: ${data.message}`, "ok", { ttl: 2200 });
  }

  async function fetch404() {
    const res = await fetch("./data/this-file-does-not-exist.json", {
      cache: "no-cache",
    });
    // Note: fetch resolves on HTTP errors; it does NOT reject.
    window.Barca?.toast(
      `Fetch completed (ok=${res.ok}) status=${res.status}`,
      res.ok ? "ok" : "danger",
      {
        ttl: 2600,
      }
    );
  }

  async function fetchSlow() {
    const res = await window.Barca.slowFetch("./data/sample.json", 1600, {
      cache: "no-cache",
    });
    const data = await res.json();
    window.Barca?.toast(`Slow fetch done: ${data.message}`, "ok", {
      ttl: 2200,
    });
  }

  function xhrSuccess() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "./data/sample.json?xhr=1");
    xhr.onload = () => {
      window.Barca?.toast(`XHR success: ${xhr.status}`, "ok", { ttl: 1800 });
    };
    xhr.send();
  }

  function xhrFail() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "./data/does-not-exist-xhr.json");
    xhr.onload = () => {
      window.Barca?.toast(
        `XHR completed: ${xhr.status}`,
        xhr.status >= 200 && xhr.status < 400 ? "ok" : "danger",
        {
          ttl: 2000,
        }
      );
    };
    xhr.onerror = () => {
      window.Barca?.toast("XHR network error", "danger", { ttl: 2000 });
    };
    xhr.send();
  }

  // ---------------------------
  // Interaction storms
  // ---------------------------
  function scrollDemo() {
    const target = document.getElementById("scroll-target");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    cpRumTag("tracepoint", "interaction", "scrollIntoView");
  }

  function focusBlurDemo() {
    els.focusInput?.focus();
    setTimeout(() => els.focusInput?.blur(), 350);
    cpRumTag("tracepoint", "interaction", "focus-blur");
  }

  function mousemoveStorm() {
    const start = performance.now();
    const n = 6000;
    for (let i = 0; i < n; i++) {
      document.dispatchEvent(
        new MouseEvent("mousemove", {
          clientX: (i % 500) + 50,
          clientY: (i % 300) + 30,
        })
      );
    }
    const dur = performance.now() - start;
    window.Barca?.toast(
      `Dispatched ${n} mousemove events in ${Math.round(dur)}ms`,
      "info",
      { ttl: 2800 }
    );
    cpRumTag(
      "tracepoint",
      "interaction",
      `mousemoveStorm:${Math.round(dur)}ms`
    );
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    cpRumTag("pageGroup", "Error Lab");

    els.stackDepth = document.getElementById("stack-depth");
    els.stackValue = document.getElementById("stack-depth-value");

    els.focusInput = document.getElementById("focus-input");

    document
      .getElementById("btn-throw")
      ?.addEventListener("click", () => throwSyncError());
    document
      .getElementById("btn-ref")
      ?.addEventListener("click", () => referenceError());
    document
      .getElementById("btn-type")
      ?.addEventListener("click", () => typeErrorNonFunction());
    document
      .getElementById("btn-json")
      ?.addEventListener("click", () => jsonParseInvalid());

    document
      .getElementById("btn-stack-uncaught")
      ?.addEventListener("click", () => {
        const depth = els.stackDepth?.value || 20000;
        stackOverflow(depth);
      });

    document
      .getElementById("btn-stack-caught")
      ?.addEventListener("click", () => {
        const depth = els.stackDepth?.value || 20000;
        try {
          stackOverflow(depth);
        } catch (e) {
          window.Barca?.toast(
            `Caught stack overflow: ${e?.message || e}`,
            "danger",
            { ttl: 2800 }
          );
        }
      });

    els.stackDepth?.addEventListener("input", () => {
      els.stackValue.textContent = String(els.stackDepth.value);
    });

    document
      .getElementById("btn-unhandled")
      ?.addEventListener("click", () => unhandledRejection());
    document
      .getElementById("btn-async-throw")
      ?.addEventListener("click", () => asyncThrow());

    document
      .getElementById("btn-fetch-reject-handled")
      ?.addEventListener("click", () => fetchRejectHandled());
    document
      .getElementById("btn-fetch-reject-unhandled")
      ?.addEventListener("click", () => fetchRejectUnhandled());

    document
      .getElementById("btn-img-404")
      ?.addEventListener("click", () => brokenImage());
    document
      .getElementById("btn-script-404")
      ?.addEventListener("click", () => scriptLoadError());
    document
      .getElementById("btn-css-404")
      ?.addEventListener("click", () => cssLoadError());

    document
      .getElementById("btn-fetch-ok")
      ?.addEventListener("click", () => fetchSuccess());
    document
      .getElementById("btn-fetch-404")
      ?.addEventListener("click", () => fetch404());
    document
      .getElementById("btn-fetch-slow")
      ?.addEventListener("click", () => fetchSlow());
    document
      .getElementById("btn-xhr-ok")
      ?.addEventListener("click", () => xhrSuccess());
    document
      .getElementById("btn-xhr-fail")
      ?.addEventListener("click", () => xhrFail());

    document
      .getElementById("btn-scroll")
      ?.addEventListener("click", () => scrollDemo());
    document
      .getElementById("btn-focus")
      ?.addEventListener("click", () => focusBlurDemo());
    document
      .getElementById("btn-mousemove")
      ?.addEventListener("click", () => mousemoveStorm());

    document
      .getElementById("btn-clear")
      ?.addEventListener("click", () => clearPanels());

    // Initialize stack depth label
    if (els.stackDepth && els.stackValue)
      els.stackValue.textContent = String(els.stackDepth.value);
  }

  document.addEventListener("cprum:ready", boot);
})();
