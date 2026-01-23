/* Home page script */

(function () {
  'use strict';

  function drawPulseChart() {
    const canvas = document.getElementById('pulse-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const h = (canvas.height = canvas.clientHeight * devicePixelRatio);

    const pad = 20 * devicePixelRatio;
    const points = 36;

    // Create a deterministic-ish dataset per session (still random enough).
    const seed = Math.floor(Date.now() / 10_000);
    function rand(i) {
      const x = Math.sin(seed + i * 999) * 10000;
      return x - Math.floor(x);
    }

    const data = Array.from({ length: points }, (_, i) => {
      const base = 0.55 + 0.25 * Math.sin(i / 4);
      return clamp(base + (rand(i) - 0.5) * 0.25, 0.1, 0.95);
    });

    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    // Background
    ctx.clearRect(0, 0, w, h);

    // Axes
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border');
    ctx.stroke();

    // Line
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3 * devicePixelRatio;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (points - 1);
      const y = pad + (1 - v) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    ctx.stroke();

    // Dots
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    data.forEach((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (points - 1);
      const y = pad + (1 - v) * (h - pad * 2);
      ctx.beginPath();
      ctx.arc(x, y, 4 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function boot() {
    // Tag the page group for your RUM scripts
    cpRumTag('pageGroup', 'Home');

    // Example tracepoint
    const traceBtn = document.getElementById('cta-tracepoint');
    traceBtn?.addEventListener('click', () => {
      cpRumTag('tracepoint', 'cta', 'home-tracepoint-click');
      window.CPRUM?.toast('Tracepoint sent: cta=home-tracepoint-click', 'ok', { ttl: 2200 });
    });

    // Toast demo
    const toastBtn = document.getElementById('toast-demo');
    toastBtn?.addEventListener('click', () => window.CPRUM?.toast('A friendly toast for your profiler 🍞', 'info'));

    drawPulseChart();
    window.addEventListener('resize', () => drawPulseChart(), { passive: true });
  }

  document.addEventListener('cprum:ready', boot);
})();
