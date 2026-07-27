(() => {
  'use strict';

  const STORAGE_KEY = 'orbital-lab.session.v1';
  const get = (id) => document.getElementById(id);

  function createButton(id, label, className = '') {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = label;
    if (className) button.className = className;
    return button;
  }

  function ensureBundleButton() {
    const existing = get('exportBundle');
    if (existing) return existing;

    const actions = document.querySelector('.actions');
    if (!actions) return null;

    const button = createButton('exportBundle', 'Export Bundle');
    const exportPng = get('exportPng');
    if (exportPng?.parentElement === actions) {
      actions.insertBefore(button, exportPng.nextSibling);
    } else {
      actions.appendChild(button);
    }
    return button;
  }

  function readControlState() {
    const controlIds = [
      'preset', 'integrator', 'collision', 'seed', 'g', 'dt', 'mass',
      'trail', 'softening', 'zoom', 'adaptiveStrength'
    ];

    const controls = Object.fromEntries(controlIds.map((id) => {
      const element = get(id);
      return [id, element ? element.value : null];
    }));

    const toggles = Object.fromEntries(['adaptive', 'showTrails', 'showVectors', 'showLabels'].map((id) => {
      const element = get(id);
      return [id, element ? element.checked : null];
    }));

    const toggle = get('toggle');

    return {
      ...controls,
      ...toggles,
      running: toggle ? toggle.textContent.trim().toLowerCase() === 'pause' : null
    };
  }

  function readHudState() {
    const fields = ['status', 'statusDetail', 'hudTime', 'energyOut', 'momentumOut', 'angularOut', 'comOut', 'closestOut', 'speedOut'];
    return Object.fromEntries(fields.map((id) => {
      const element = get(id);
      return [id, element ? element.textContent : null];
    }));
  }

  function captureBundle() {
    const canvas = get('space');
    return {
      schemaVersion: 1,
      app: 'Orbital Lab',
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      controls: readControlState(),
      hud: readHudState(),
      canvasDataUrl: canvas && typeof canvas.toDataURL === 'function' ? canvas.toDataURL('image/png') : null
    };
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportBundle() {
    downloadJson('orbital_lab_bundle.json', captureBundle());
  }

  function persistSession() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readControlState()));
    } catch {
      // Ignore storage failures in restricted/private contexts.
    }
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);
      const pairs = [
        ['preset', 'value'], ['integrator', 'value'], ['collision', 'value'], ['seed', 'value'],
        ['g', 'value'], ['dt', 'value'], ['mass', 'value'], ['trail', 'value'],
        ['softening', 'value'], ['zoom', 'value'], ['adaptiveStrength', 'value'],
        ['adaptive', 'checked'], ['showTrails', 'checked'], ['showVectors', 'checked'], ['showLabels', 'checked']
      ];

      for (const [id, prop] of pairs) {
        const element = get(id);
        if (!element || snapshot[id] == null) continue;
        if (prop === 'checked') element.checked = Boolean(snapshot[id]);
        else element.value = String(snapshot[id]);
      }

      const dispatch = (id, type) => {
        const element = get(id);
        if (!element) return;
        element.dispatchEvent(new Event(type, { bubbles: true }));
      };

      [
        ['preset', 'change'], ['integrator', 'change'], ['collision', 'change'],
        ['seed', 'input'], ['g', 'input'], ['dt', 'input'], ['mass', 'input'],
        ['trail', 'input'], ['softening', 'input'], ['zoom', 'input'], ['adaptiveStrength', 'input'],
        ['adaptive', 'change'], ['showTrails', 'change'], ['showVectors', 'change'], ['showLabels', 'change']
      ].forEach(([id, type]) => dispatch(id, type));

      queueMicrotask(() => {
        const toggle = get('toggle');
        if (!toggle || snapshot.running == null) return;
        const shouldBeRunning = Boolean(snapshot.running);
        const isRunning = toggle.textContent.trim().toLowerCase() === 'pause';
        if (shouldBeRunning !== isRunning) toggle.click();
      });

      return true;
    } catch {
      return false;
    }
  }

  function clearSavedSession() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  function toggleSimulationIfNeeded(shouldRun) {
    const toggle = get('toggle');
    if (!toggle) return false;

    const currentlyRunning = toggle.textContent.trim().toLowerCase() === 'pause';
    if (shouldRun && !currentlyRunning) {
      toggle.click();
      return true;
    }
    if (!shouldRun && currentlyRunning) {
      toggle.click();
      return true;
    }
    return false;
  }

  const bundleButton = ensureBundleButton();
  if (bundleButton) bundleButton.addEventListener('click', exportBundle);

  loadSession();
  persistSession();

  let pausedForVisibility = false;
  let saveTimer = 0;
  const schedulePersist = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persistSession, 80);
  };

  document.addEventListener('input', schedulePersist, true);
  document.addEventListener('change', schedulePersist, true);
  window.addEventListener('beforeunload', persistSession);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pausedForVisibility = toggleSimulationIfNeeded(false);
      return;
    }
    if (pausedForVisibility) {
      toggleSimulationIfNeeded(true);
      pausedForVisibility = false;
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    if (event.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
    if (event.key.toLowerCase() === 's' && event.shiftKey) {
      event.preventDefault();
      exportBundle();
    } else if (event.key.toLowerCase() === 'l' && event.shiftKey) {
      event.preventDefault();
      loadSession();
    } else if (event.key.toLowerCase() === 'x' && event.shiftKey) {
      event.preventDefault();
      clearSavedSession();
    }
  });
})();