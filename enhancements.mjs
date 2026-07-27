export function normalizeBundlePayload(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const schemaVersion = Number(raw.schemaVersion);
  if (!Number.isFinite(schemaVersion) || schemaVersion < 1) return null;

  return {
    schemaVersion,
    app: typeof raw.app === 'string' ? raw.app : 'Orbital Lab',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
    userAgent: typeof raw.userAgent === 'string' ? raw.userAgent : null,
    controls: raw.controls && typeof raw.controls === 'object' ? raw.controls : {},
    hud: raw.hud && typeof raw.hud === 'object' ? raw.hud : {},
    canvasDataUrl: typeof raw.canvasDataUrl === 'string' ? raw.canvasDataUrl : null
  };
}

if (typeof document !== 'undefined') {
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

    function ensureImportButton() {
      const existing = get('importBundle');
      if (existing) return existing;

      const actions = document.querySelector('.actions');
      if (!actions) return null;

      const button = createButton('importBundle', 'Import Bundle');
      const benchmark = get('benchmark');
      if (benchmark?.parentElement === actions) {
        actions.insertBefore(button, benchmark);
      } else {
        actions.appendChild(button);
      }
      return button;
    }

    function ensureImportInput() {
      const existing = get('importBundleInput');
      if (existing) return existing;

      const input = document.createElement('input');
      input.id = 'importBundleInput';
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.hidden = true;
      input.tabIndex = -1;
      document.body.appendChild(input);
      return input;
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
        schemaVersion: 2,
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

    function setValueAndDispatch(id, value, eventName = 'input') {
      const element = get(id);
      if (!element || value === undefined || value === null) return;
      element.value = String(value);
      element.dispatchEvent(new Event(eventName, { bubbles: true }));
    }

    function setCheckedAndDispatch(id, checked) {
      const element = get(id);
      if (!element || checked === undefined || checked === null) return;
      element.checked = !!checked;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function applyBundle(bundle) {
      const controls = bundle.controls || {};
      const toggles = ['adaptive', 'showTrails', 'showVectors', 'showLabels'];
      const selectValues = ['integrator', 'collision'];
      const sliderValues = ['g', 'dt', 'mass', 'trail', 'softening', 'zoom', 'adaptiveStrength', 'seed'];

      for (const id of sliderValues) setValueAndDispatch(id, controls[id]);
      for (const id of toggles) setCheckedAndDispatch(id, controls[id]);
      for (const id of selectValues) setValueAndDispatch(id, controls[id], 'change');

      setValueAndDispatch('preset', controls.preset, 'change');

      const desiredRunning = String(bundle.hud?.status || '').trim().toLowerCase() === 'running';
      toggleSimulationIfNeeded(desiredRunning);

      window.dispatchEvent(new CustomEvent('orbital-lab:bundle-loaded', { detail: bundle }));
    }

    async function importBundleFromFile(file) {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const bundle = normalizeBundlePayload(parsed);
      if (!bundle) throw new Error('The selected file is not a valid Orbital Lab bundle.');
      applyBundle(bundle);
      return bundle;
    }

    const bundleButton = ensureBundleButton();
    if (bundleButton) bundleButton.addEventListener('click', exportBundle);

    const importButton = ensureImportButton();
    const importInput = ensureImportInput();
    if (importButton && importInput) {
      importButton.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', async () => {
        const file = importInput.files?.[0];
        if (!file) return;
        try {
          await importBundleFromFile(file);
        } catch (error) {
          window.dispatchEvent(new CustomEvent('orbital-lab:bundle-error', {
            detail: { message: error instanceof Error ? error.message : 'Bundle import failed.' }
          }));
        } finally {
          importInput.value = '';
        }
      });
    }

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
      } else if (event.key.toLowerCase() === 'i' && event.shiftKey) {
        event.preventDefault();
        importInput.click();
      }
    });
  })();
}
