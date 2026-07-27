(() => {
  'use strict';

  const STORAGE_KEY = 'orbital-lab.presentation.v1';
  const get = (id) => document.getElementById(id);
  const q = (selector) => document.querySelector(selector);

  let dock = null;
  let focusButton = null;
  let copyButton = null;
  let summaryEl = null;
  let previousFocus = null;
  let renderTimer = 0;

  function loadFocusMode() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'false') === true;
    } catch {
      return false;
    }
  }

  function saveFocusMode(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Boolean(enabled)));
    } catch {
      // Ignore storage failures.
    }
  }

  function createButton(id, label, className = '') {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.textContent = label;
    if (className) button.className = className;
    return button;
  }

  function ensureActionButton(id, label, anchorId) {
    const existing = get(id);
    if (existing) return existing;

    const actions = q('.actions');
    if (!actions) return null;

    const button = createButton(id, label);
    const anchor = anchorId ? get(anchorId) : null;
    if (anchor?.parentElement === actions) actions.insertBefore(button, anchor.nextSibling);
    else actions.appendChild(button);
    return button;
  }

  function buildSummaryText(snapshot) {
    const controls = snapshot?.controls || {};
    const hud = snapshot?.hud || {};
    const diagnostics = snapshot?.diagnostics || {};
    const benchmark = String(snapshot?.benchmarkReport || '').trim();
    const bestLine = benchmark.split('\n').find((line) => /Best overall conservation in this run:/i.test(line)) || '';
    const status = hud.statusDetail ? String(hud.statusDetail) : `${controls.integrator || 'symplectic'} · ${controls.preset || 'default'}`;

    return [
      'Orbital Lab run brief',
      `Preset: ${controls.preset || 'default'}`,
      `Integrator: ${controls.integrator || 'symplectic'}`,
      `Collision mode: ${controls.collision || 'none'}`,
      `Timestep: ${controls.dt || '0.02'}`,
      `Gravity constant: ${controls.g || '1'}`,
      `Softening: ${controls.softening || '25'}`,
      `Adaptive stepping: ${controls.adaptive ? 'on' : 'off'}`,
      `Time: ${hud.time || '0.00'}`,
      `Stability score: ${diagnostics.score ?? '—'}/100 ${diagnostics.label ? `(${diagnostics.label})` : ''}`.trim(),
      `Energy drift: ${diagnostics.energyDrift != null ? `${Number(diagnostics.energyDrift).toFixed(4)}%` : '—'}`,
      `Best integrator: ${diagnostics.bestIntegrator || '—'}`,
      bestLine ? `Benchmark note: ${bestLine}` : null,
      `Run state: ${status}`
    ].filter(Boolean).join('\n');
  }

  function ensureDock() {
    if (dock) return dock;

    const canvasWrap = q('.canvas-wrap');
    if (!canvasWrap) return null;

    dock = document.createElement('section');
    dock.className = 'presentation-dock';
    dock.setAttribute('aria-live', 'polite');
    dock.innerHTML = `
      <header class="presentation-dock-header">
        <div>
          <p class="presentation-eyebrow">Admissions demo</p>
          <h2>Presentation mode</h2>
          <p>Hide the sidebar, keep the simulation full-size, and surface a concise run brief.</p>
        </div>
        <div class="presentation-dock-actions">
          <button id="exitFocusMode" type="button">Exit focus mode</button>
          <button id="copyRunBrief" class="primary" type="button">Copy run brief</button>
        </div>
      </header>
      <pre id="runBrief" class="presentation-brief">Loading run brief…</pre>
      <div class="presentation-meta">
        <span>Keyboard</span>
        <strong>F</strong> toggles focus mode · <strong>C</strong> copies the brief
      </div>
    `;

    canvasWrap.appendChild(dock);
    summaryEl = dock.querySelector('#runBrief');
    copyButton = dock.querySelector('#copyRunBrief');
    const exitButton = dock.querySelector('#exitFocusMode');

    copyButton?.addEventListener('click', copyRunBrief);
    exitButton?.addEventListener('click', () => setFocusMode(false));
    dock.addEventListener('click', (event) => {
      if (event.target === dock) setFocusMode(false);
    });
    return dock;
  }

  function setToggleState(enabled) {
    if (!focusButton) return;
    focusButton.textContent = enabled ? 'Exit focus mode' : 'Focus mode';
    focusButton.setAttribute('aria-pressed', String(Boolean(enabled)));
  }

  function setFocusMode(enabled) {
    const next = Boolean(enabled);
    document.body.classList.toggle('presentation-mode', next);
    saveFocusMode(next);
    setToggleState(next);
    ensureDock();
    renderBrief();
    if (next) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.requestAnimationFrame(() => dock?.querySelector('#exitFocusMode')?.focus());
    } else if (previousFocus && document.contains(previousFocus)) {
      window.requestAnimationFrame(() => previousFocus?.focus());
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).catch(() => false);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Ignore clipboard failures.
    }
    textarea.remove();
    return Promise.resolve(true);
  }

  function renderBrief() {
    const snapshot = typeof window.__orbitalLab?.getSnapshot === 'function' ? window.__orbitalLab.getSnapshot() : null;
    const text = buildSummaryText(snapshot);
    if (summaryEl) summaryEl.textContent = text;
    return text;
  }

  function copyRunBrief() {
    const text = renderBrief();
    void copyToClipboard(text);
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderBrief, 120);
  }

  function attach() {
    focusButton = ensureActionButton('focusModeToggle', 'Focus mode', 'helpToggle');
    if (focusButton) {
      focusButton.addEventListener('click', () => setFocusMode(!document.body.classList.contains('presentation-mode')));
    }

    ensureDock();
    setToggleState(document.body.classList.contains('presentation-mode'));
    renderBrief();

    document.addEventListener('input', scheduleRender, true);
    document.addEventListener('change', scheduleRender, true);
    window.addEventListener('resize', scheduleRender);
    window.addEventListener('keydown', (event) => {
      if (event.defaultPrevented) return;
      if (event.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
      const key = event.key.toLowerCase();
      if (key === 'f') {
        event.preventDefault();
        setFocusMode(!document.body.classList.contains('presentation-mode'));
      } else if (key === 'c') {
        event.preventDefault();
        copyRunBrief();
      }
    });

    const shouldStartFocused = loadFocusMode();
    if (shouldStartFocused) setFocusMode(true);
    else setToggleState(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }

  setInterval(renderBrief, 1000);
})();
