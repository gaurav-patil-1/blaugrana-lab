(function () {
  'use strict';

  function drawPulseChart() {
  const canvas = document.getElementById('pulse-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const h = (canvas.height = canvas.clientHeight * devicePixelRatio);

  const pad = 20 * devicePixelRatio;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function render(data) {
    const points = data.length;

    ctx.clearRect(0, 0, w, h);

    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(w - pad, h - pad);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border');
    ctx.stroke();

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

  function fallbackData(points) {
    const seed = Math.floor(Date.now() / 10_000);
    function rand(i) {
      const x = Math.sin(seed + i * 999) * 10000;
      return x - Math.floor(x);
    }
    return Array.from({ length: points }, (_, i) => {
      const base = 0.55 + 0.25 * Math.sin(i / 4);
      return clamp(base + (rand(i) - 0.5) * 0.25, 0.1, 0.95);
    });
  }

  function currentSeasonStartYear() {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  }

  async function fetchLast25LaLigaPositions() {
    const CACHE_KEY = 'cprum:barca:lalg:positions:v1';
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (
        cached &&
        Array.isArray(cached.data) &&
        cached.data.length === 25 &&
        Date.now() - cached.fetchedAt < MAX_AGE_MS
      ) {
        return cached.data;
      }
    } catch {
      // ignore cache issues
    }

    const url =
      'https://en.wikipedia.org/w/api.php' +
      '?action=parse' +
      '&page=List_of_FC_Barcelona_seasons' +
      '&prop=text' +
      '&format=json' +
      '&formatversion=2' +
      '&origin=*';

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Wiki fetch failed: ${res.status}`);

    const json = await res.json();
    const html = json?.parse?.text || json?.parse?.text?.['*'];
    if (!html) throw new Error('Wiki parse: missing HTML');

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const rows = Array.from(doc.querySelectorAll('table.wikitable tr'));
    const seasons = [];

    for (const tr of rows) {
      if (!tr.textContent.includes('La Liga')) continue;

      const seasonCell = tr.querySelector('th[scope="row"], th');
      const seasonText = seasonCell?.textContent?.trim() || '';
      const seasonMatch = seasonText.match(/(\d{4})\s*[–-]\s*(\d{2}|\d{4})/);
      if (!seasonMatch) continue;

      const startYear = Number(seasonMatch[1]);

      const cells = Array.from(tr.querySelectorAll('td, th')).map((c) => c.textContent.trim());
      const ordinal = cells.find((t) => /^\d+(st|nd|rd|th)$/.test(t));
      if (!ordinal) continue;

      const pos = parseInt(ordinal, 10);
      if (!Number.isFinite(pos)) continue;

      seasons.push({ startYear, pos });
    }

    const byYear = new Map();
    for (const s of seasons) if (!byYear.has(s.startYear)) byYear.set(s.startYear, s);

    let sorted = Array.from(byYear.values()).sort((a, b) => a.startYear - b.startYear);

    const curStart = currentSeasonStartYear();
    sorted = sorted.filter((s) => s.startYear !== curStart);

    const last25 = sorted.slice(-25);

    const MAX_RANK = 20;
    const data = last25.map((s) => clamp(0.95 - ((s.pos - 1) / (MAX_RANK - 1)) * 0.85, 0.1, 0.95));

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data }));
    } catch {
    }

    return data;
  }

  render(fallbackData(25));

  fetchLast25LaLigaPositions()
    .then((data) => {
      if (Array.isArray(data) && data.length) render(data);
    })
    .catch(() => {
    });
}
  document.addEventListener('DOMContentLoaded', () => {
    drawPulseChart();
  });
})();
