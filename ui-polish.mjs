(() => {
  'use strict';

  const LABELS = new Map([
    ['yoshida4', 'Yoshida 4'],
    ['ias15', 'IAS15 Baseline'],
    ['rk45', 'Adaptive RK4'],
    ['barnes-hut', 'Barnes-Hut']
  ]);

  const polish = () => {
    const status = document.getElementById('statusDetail');
    if (!status) return;
    const text = status.textContent || '';
    const [solver, ...rest] = text.split('·').map((part) => part.trim());
    const rewritten = LABELS.get(solver.toLowerCase()) || solver;
    status.textContent = rest.length ? `${rewritten} · ${rest.join(' · ')}` : rewritten;
  };

  const ready = () => {
    polish();
    const target = document.getElementById('statusDetail');
    if (!target || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => polish());
    observer.observe(target, { childList: true, characterData: true, subtree: true });
    window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
