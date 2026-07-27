(() => {
  'use strict';

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

    return { ...controls, ...toggles };
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

  let pausedForVisibility = false;
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
    }
  });
})();
