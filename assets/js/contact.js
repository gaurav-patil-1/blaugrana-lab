/* About/Contact page script: accessible validation + fake submission toast */

(function () {
  'use strict';

  const form = () => document.getElementById('contact-form');

  function setInvalid(el, invalid) {
    el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function validate() {
    const f = form();
    if (!f) return false;

    let ok = true;
    const required = f.querySelectorAll('[data-required]');

    required.forEach((el) => {
      const val = (el.value || '').trim();
      const bad = !val;
      setInvalid(el, bad);
      ok = ok && !bad;
    });

    const email = f.querySelector('[name="email"]');
    if (email) {
      const val = (email.value || '').trim();
      const bad = val && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
      setInvalid(email, bad);
      ok = ok && !bad;
    }

    return ok;
  }

  function boot() {
    cpRumTag('pageGroup', 'About/Contact');

    form()?.addEventListener('submit', (e) => {
      e.preventDefault();

      const ok = validate();
      if (!ok) {
        window.CPRUM?.toast('Please fix the highlighted fields.', 'danger');
        return;
      }

      const data = Object.fromEntries(new FormData(form()).entries());
      cpRumTag('tracepoint', 'contact', `submit:${data.reason || 'unknown'}`);
      window.CPRUM?.toast('Submitted! (Fake) — check console for payload.', 'ok', { ttl: 2800 });

      console.log('[Contact payload]', data);

      // Fake async delay
      setTimeout(() => {
        form().reset();
      }, 500);
    });

    // Live validation
    form()?.querySelectorAll('input, textarea, select').forEach((el) => {
      el.addEventListener('input', () => {
        if (el.hasAttribute('data-required')) setInvalid(el, !(el.value || '').trim());
      });
    });
  }

  document.addEventListener('cprum:ready', boot);
})();
