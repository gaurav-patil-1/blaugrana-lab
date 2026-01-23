/* Blaugrana Lab — audio.js
   "Now Playing" widget with Web Audio API (no external audio assets).
*/

(function () {
  'use strict';

  function initAudioWidget() {
    const root = document.querySelector('[data-audio-widget]');
    if (!root) return;

    const btnPlay = root.querySelector('[data-audio-play]');
    const btnStop = root.querySelector('[data-audio-stop]');
    const vol = root.querySelector('[data-audio-volume]');

    let ctx = null;
    let intervalId = null;
    let step = 0;
    let gain = null;

    const tempo = 120; // BPM-ish (used for interval)
    const intervalMs = Math.round((60_000 / tempo) / 2); // eighth-notes

    // A small "training" motif (in Hz). Not an actual song.
    const scale = [261.63, 293.66, 311.13, 349.23, 392.0, 466.16]; // C D Eb F G Bb
    const motif = [0, 2, 4, 5, 4, 2, 0, 2, 4, 2, 0, 1, 2, 4, 5, 4];

    function ensureContext() {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain();
      gain.gain.value = Number(vol?.value || 0.25);
      gain.connect(ctx.destination);
    }

    function ping(freq, when = 0) {
      if (!ctx || !gain) return;

      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      // Soft envelope to avoid clicks
      g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + 0.18);

      osc.frequency.value = freq;
      osc.type = 'triangle';

      osc.connect(g);
      g.connect(gain);

      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + 0.2);
    }

    function play() {
      ensureContext();
      if (!ctx) return;

      // Resume on user gesture
      ctx.resume?.();

      if (intervalId) return;

      const track = root.querySelector('.audio-track');
      if (track) track.textContent = 'Training Tones';
      step = 0;

      intervalId = setInterval(() => {
        const idx = motif[step % motif.length];
        const freq = scale[idx % scale.length];
        // Add tiny variation for realism.
        const wobble = 1 + (Math.sin(step / 3) * 0.002);
        ping(freq * wobble);
        step++;
      }, intervalMs);

      if (window.CPRUM?.log) window.CPRUM.log('audio:play', { intervalMs });
    }

    function stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (window.CPRUM?.log) window.CPRUM.log('audio:stop');
    }

    btnPlay?.addEventListener('click', play);
    btnStop?.addEventListener('click', stop);

    vol?.addEventListener('input', () => {
      const v = Number(vol.value || 0.25);
      if (gain) gain.gain.value = v;
    });

    // Stop if user navigates away (page unload)
    window.addEventListener('pagehide', stop);
  }

  // Wait until partials are injected
  document.addEventListener('cprum:ready', initAudioWidget);
})();
