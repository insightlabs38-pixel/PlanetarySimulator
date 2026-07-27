(() => {
  'use strict';

  const STORAGE_KEY = 'orbital-lab.session.v2';
  const get = (id) => document.getElementById(id);

  const CONTROL_IDS = [
    'g', 'dt', 'mass', 'trail', 'softening', 'zoom', 'seed', 'adaptiveStrength',
    'adaptive', 'showTrails', 'showVectors', 'showLabels', 'preset', 'integrator', 'collision'
  ];

  function createButton(id, label, className = '') {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = label;
    if (className) button.className = className;
    return button;
  }

  function ensureButton(id, label, anchorId) {
    const existing = get(id);
    if (existing) return existing;

    const actions = document.querySelector('.actions');
    if (!actions) return null;

    const button = createButton(id, label);
    const anchor = anchorId ? get(anchorId) : null;
    if (anchor?.parentElement === actions) {
      actions.insertBefore(button, anchor.nextSibling);
    } else {
      actions.appendChild(button);
    }
    return button;
  }

  function ensureFileInput() {
    let input = get('bundleFile');
    if (input) return input;

    input = document.createElement('input');
    input.id = 'bundleFile';
    input.type = 'file';
    input.accept = 'application/json';
    input.hidden = true;
    document.body.appendChild(input);
    return input;
  }

  function ensureDiagnosticsPanel() {
    const existing = get('diagnosticsGroup');
    if (existing) return existing;

    const scroll = document.querySelector('.panel-scroll');
    if (!scroll) return null;

    const group = document.createElement('section');
    group.className = 'group';
    group.id = 'diagnosticsGroup';
    group.innerHTML = `
      <h2>Diagnostics</h2>
      <div class="diagnostic-shell">
        <div class="diagnostic-badges">
          <div class="diagnostic-badge">Stability score <strong id="stabilityScore">—</strong></div>
          <div class="diagnostic-badge">Risk level <strong id="stabilityLabel">—</strong></div>
          <div class="diagnostic-badge">Benchmark leader <strong id="bestIntegrator">—</strong></div>
        </div>
        <div class="diagnostic-grid">
          <div class="card diagnostic-card">
            <span class="k">Verdict</span>
            <span class="v" id="diagnosticVerdict">—</span>
            <small id="diagnosticReason">—</small>
          </div>
          <div class="card diagnostic-card">
            <span class="k">Action</span>
            <span class="v" id="diagnosticAction">—</span>
            <small id="diagnosticHint">—</small>
          </div>
        </div>
        <button id="copyDiagnostics">Copy summary</button>
      </div>
    `;

    const benchmarkGroup = get('benchmark')?.closest('.group');
    if (benchmarkGroup?.parentElement === scroll) scroll.insertBefore(group, benchmarkGroup.nextSibling);
    else scroll.appendChild(group);
    return group;
  }

  function ensureShortcutOverlay() {
    const existing = get('shortcutOverlay');
    if (existing) return existing;

    const overlay = document.createElement('div');
    overlay.className = 'shortcut-overlay';
    overlay.id = 'shortcutOverlay';
    overlay.innerHTML = `
      <div class="shortcut-panel" role="dialog" aria-modal="true" aria-labelledby="shortcutTitle">
        <header>
          <div>
            <h3 id="shortcutTitle">Keyboard shortcuts and workflow</h3>
            <p>Designed for quick presentation runs and reproducible demonstrations.</p>
          </div>
          <button id="closeShortcuts" class="primary" type="button">Close</button>
        </header>
        <div class="shortcut-grid">
          <section class="shortcut-card">
            <h4>Navigation</h4>
            <ul>
              <li><code>Space</code> pause or resume the simulation</li>
              <li><code>R</code> reset to the default system</li>
              <li><code>E</code> export CSV telemetry</li>
              <li><code>P</code> save a PNG snapshot</li>
            </ul>
          </section>
          <section class="shortcut-card">
            <h4>Reproducibility</h4>
            <ul>
              <li><code>Shift+S</code> export a bundle</li>
              <li><code>Shift+L</code> reload the saved session</li>
              <li><code>Shift+X</code> clear the saved session</li>
              <li>Use <strong>Import Bundle</strong> to restore a shared bundle</li>
            </ul>
          </section>
          <section class="shortcut-card">
            <h4>Physics study</h4>
            <ul>
              <li><code>B</code> run the integrator benchmark</li>
              <li>Try the <strong>Resonant Orbits</strong> preset for commensurate periods</li>
              <li>Use adaptive stepping for close encounters</li>
              <li>Compare Verlet and RK4 against Euler</li>
            </ul>
          </section>
          <section class="shortcut-card">
            <h4>Interaction</h4>
            <ul>
              <li>Drag on the canvas to launch a body</li>
              <li>Mouse wheel changes the zoom</li>
              <li>Labels and velocity vectors can be toggled in the sidebar</li>
              <li>Press <code>?</code> again to close this panel</li>
            </ul>
          </section>
        </div>
        <div class="shortcut-actions">
          <button id="copyShortcuts" type="button">Copy summary</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function openShortcuts() {
    ensureShortcutOverlay().classList.add('open');
  }

  function closeShortcuts() {
    const overlay = get('shortcutOverlay');
    overlay?.classList.remove('open');
  }

  function parseNumeric(text) {
    if (!text) return NaN;
    const match = String(text).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
    return match ? Number(match[0]) : NaN;
  }

  function extractBestIntegrator(text) {
    if (!text) return '—';
    const patterns = [
      /Best overall conservation in this run:\s*([^\n]+)/i,
      /Best energy conservation:\s*([^\n]+)/i
    ];
    for (const pattern of patterns) {
      const match = String(text).match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return '—';
  }

  function readControlState() {
    return {
      g: get('g')?.value ?? '1',
      dt: get('dt')?.value ?? '0.02',
      mass: get('mass')?.value ?? '9000',
      trail: get('trail')?.value ?? '90',
      softening: get('softening')?.value ?? '25',
      zoom: get('zoom')?.value ?? '1',
      seed: get('seed')?.value ?? 't5-admissions',
      adaptiveStrength: get('adaptiveStrength')?.value ?? '1.2',
      adaptive: Boolean(get('adaptive')?.checked),
      showTrails: Boolean(get('showTrails')?.checked),
      showVectors: Boolean(get('showVectors')?.checked),
      showLabels: Boolean(get('showLabels')?.checked),
      preset: get('preset')?.value ?? 'default',
      integrator: get('integrator')?.value ?? 'symplectic',
      collision: get('collision')?.value ?? 'none',
      running: String(get('toggle')?.textContent || '').trim().toLowerCase() === 'pause'
    };
  }

  function readHudState() {
    return {
      status: get('status')?.textContent ?? '—',
      statusDetail: get('statusDetail')?.textContent ?? '—',
      time: get('hudTime')?.textContent ?? '0.00',
      benchmarkReport: get('benchmarkOut')?.textContent ?? ''
    };
  }

  function applyControlState(snapshot = {}) {
    const pairs = [
      ['g', 'value'], ['dt', 'value'], ['mass', 'value'], ['trail', 'value'],
      ['softening', 'value'], ['zoom', 'value'], ['seed', 'value'], ['adaptiveStrength', 'value'],
      ['adaptive', 'checked'], ['showTrails', 'checked'], ['showVectors', 'checked'], ['showLabels', 'checked'],
      ['preset', 'value'], ['integrator', 'value'], ['collision', 'value']
    ];

    for (const [id, prop] of pairs) {
      const element = get(id);
      if (!element || snapshot[id] == null) continue;
      if (prop === 'checked') element.checked = Boolean(snapshot[id]);
      else element.value = String(snapshot[id]);
    }

    const dispatchPairs = [
      ['g', 'input'], ['dt', 'input'], ['mass', 'input'], ['trail', 'input'],
      ['softening', 'input'], ['zoom', 'input'], ['seed', 'input'], ['adaptiveStrength', 'input'],
      ['adaptive', 'change'], ['showTrails', 'change'], ['showVectors', 'change'], ['showLabels', 'change'],
      ['preset', 'change'], ['integrator', 'change'], ['collision', 'change']
    ];

    for (const [id, type] of dispatchPairs) {
      const element = get(id);
      if (!element) continue;
      element.dispatchEvent(new Event(type, { bubbles: true }));
    }

    queueMicrotask(() => {
      const toggle = get('toggle');
      if (!toggle || snapshot.running == null) return;
      const shouldBeRunning = Boolean(snapshot.running);
      const isRunning = toggle.textContent.trim().toLowerCase() === 'pause';
      if (shouldBeRunning !== isRunning) toggle.click();
    });
  }

  function applyBundleSnapshot(payload) {
    const controls = payload?.controls ?? payload?.simulationSnapshot?.controls ?? payload?.snapshot?.controls;
    if (controls) applyControlState(controls);

    if (payload?.benchmarkReport && get('benchmarkOut')) {
      get('benchmarkOut').textContent = payload.benchmarkReport;
    }

    renderDiagnostics();
    persistSession();
  }

  function collectDiagnostics() {
    const energyDrift = parseNumeric(get('energyOut')?.textContent) || 0;
    const momentum = parseNumeric(get('momentumOut')?.textContent) || 0;
    const angularMomentum = parseNumeric(get('angularOut')?.textContent) || 0;
    const closestApproach = parseNumeric(get('closestOut')?.textContent) || 0;
    const maxSpeed = parseNumeric(get('speedOut')?.textContent) || 0;
    const timestep = parseNumeric(get('dtOut')?.textContent) || 0;
    const softening = parseNumeric(get('softOut')?.textContent) || 0;
    const benchmarkText = get('benchmarkOut')?.textContent || '';
    const statusDetail = get('statusDetail')?.textContent || '';
    const bestIntegrator = extractBestIntegrator(benchmarkText);

    const encounterRatio = softening > 0 ? closestApproach / softening : Infinity;
    let score = 100;
    score -= Math.min(energyDrift * 140, 60);
    score -= Math.min(Math.log10(momentum + 10) * 5, 16);
    score -= Number.isFinite(encounterRatio) ? Math.max(0, (1.9 - encounterRatio) * 14) : 0;
    score -= Math.max(0, maxSpeed * timestep - 4) * 4;
    if ((get('adaptive')?.checked ?? false) === false) score -= 4;
    if (bestIntegrator === 'euler') score -= 3;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Stable' : score >= 50 ? 'Watch' : 'Unstable';
    const verdict = energyDrift < 0.01
      ? 'Conservation is very tight.'
      : energyDrift < 0.1
        ? 'Conservation is acceptable.'
        : 'Conservation is drifting.';

    let action = 'No immediate adjustment needed.';
    let hint = 'The current setup is well within a presentation-safe range.';

    if (energyDrift > 0.1) {
      action = 'Lower the timestep or use Verlet/RK4.';
      hint = 'The current step size is the first parameter to tighten when drift rises.';
    } else if (Number.isFinite(encounterRatio) && encounterRatio < 1.5) {
      action = 'Increase softening or enable adaptive stepping.';
      hint = 'The system is entering a close-encounter regime where substeps matter more.';
    } else if (momentum > 1000) {
      action = 'Inspect the initial conditions or collision mode.';
      hint = 'Momentum is high enough that the run deserves a closer look before presenting.';
    }

    return {
      score,
      label,
      verdict,
      action,
      hint,
      bestIntegrator,
      energyDrift,
      momentum,
      angularMomentum,
      closestApproach,
      maxSpeed,
      timestep,
      softening,
      encounterRatio,
      statusDetail
    };
  }

  function renderDiagnostics() {
    const panel = ensureDiagnosticsPanel();
    if (!panel) return null;

    const diagnostics = collectDiagnostics();
    const scoreEl = get('stabilityScore');
    const labelEl = get('stabilityLabel');
    const bestEl = get('bestIntegrator');
    const verdictEl = get('diagnosticVerdict');
    const reasonEl = get('diagnosticReason');
    const actionEl = get('diagnosticAction');
    const hintEl = get('diagnosticHint');

    if (scoreEl) scoreEl.textContent = String(diagnostics.score);
    if (labelEl) labelEl.textContent = diagnostics.label;
    if (bestEl) bestEl.textContent = diagnostics.bestIntegrator;
    if (verdictEl) verdictEl.textContent = diagnostics.verdict;
    if (reasonEl) {
      reasonEl.textContent = [
        `Drift ${diagnostics.energyDrift.toFixed(4)}%`,
        `Momentum ${diagnostics.momentum.toFixed(2)}`,
        `Closest approach ${diagnostics.closestApproach.toFixed(2)}`
      ].join(' · ');
    }
    if (actionEl) actionEl.textContent = diagnostics.action;
    if (hintEl) {
      hintEl.textContent = `${diagnostics.hint}${diagnostics.statusDetail ? ` Current run: ${diagnostics.statusDetail}.` : ''}`;
    }

    return diagnostics;
  }

  function collectRuntimeSnapshot() {
    return {
      schemaVersion: 3,
      app: 'Orbital Lab',
      capturedAt: new Date().toISOString(),
      controls: readControlState(),
      hud: readHudState(),
      diagnostics: collectDiagnostics(),
      benchmarkReport: get('benchmarkOut')?.textContent || null
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

  function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).catch(() => false);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
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

  function captureBundle() {
    const canvas = get('space');
    const diagnostics = collectDiagnostics();
    return {
      schemaVersion: 3,
      app: 'Orbital Lab',
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      controls: readControlState(),
      hud: readHudState(),
      diagnostics,
      benchmarkReport: get('benchmarkOut')?.textContent || null,
      simulationSnapshot: typeof window.__orbitalLab?.getSnapshot === 'function' ? window.__orbitalLab.getSnapshot() : null,
      canvasDataUrl: canvas && typeof canvas.toDataURL === 'function' ? canvas.toDataURL('image/png') : null
    };
  }

  function exportBundle() {
    downloadJson('orbital_lab_bundle.json', captureBundle());
  }

  function importBundle() {
    ensureFileInput().click();
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
      applyControlState(snapshot);
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

  function copyDiagnostics() {
    const diagnostics = renderDiagnostics();
    if (!diagnostics) return;
    const summary = [
      `Orbital Lab diagnostics`,
      `Stability score: ${diagnostics.score}/100 (${diagnostics.label})`,
      `Verdict: ${diagnostics.verdict}`,
      `Action: ${diagnostics.action}`,
      `Hint: ${diagnostics.hint}`,
      `Best integrator: ${diagnostics.bestIntegrator}`,
      `Energy drift: ${diagnostics.energyDrift.toFixed(4)}%`,
      `Momentum: ${diagnostics.momentum.toFixed(2)}`,
      `Closest approach: ${diagnostics.closestApproach.toFixed(2)}`
    ].join('\n');
    void copyTextToClipboard(summary);
  }

  function copyShortcuts() {
    const summary = [
      'Orbital Lab shortcuts',
      'Space: pause or resume',
      'R: reset',
      'E: export CSV',
      'P: save PNG',
      'B: run benchmark',
      'Shift+S: export bundle',
      'Shift+L: reload saved session',
      'Shift+X: clear saved session',
      '? : open this guide'
    ].join('\n');
    void copyTextToClipboard(summary);
  }

  function attachEventHandlers() {
    const bundleButton = ensureButton('exportBundle', 'Export Bundle', 'exportPng');
    if (bundleButton) bundleButton.addEventListener('click', exportBundle);

    const importButton = ensureButton('importBundle', 'Import Bundle', 'exportBundle');
    if (importButton) importButton.addEventListener('click', importBundle);

    const helpButton = ensureButton('helpToggle', 'Shortcuts', 'importBundle');
    if (helpButton) helpButton.addEventListener('click', openShortcuts);

    const fileInput = ensureFileInput();
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(String(reader.result || 'null'));
          applyBundleSnapshot(payload);
        } catch {
          // Ignore malformed bundles.
        }
      };
      reader.readAsText(file);
    });

    const overlay = ensureShortcutOverlay();
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeShortcuts();
    });
    overlay.querySelector('#closeShortcuts')?.addEventListener('click', closeShortcuts);
    overlay.querySelector('#copyShortcuts')?.addEventListener('click', copyShortcuts);

    const copyButton = get('copyDiagnostics');
    if (copyButton) copyButton.addEventListener('click', copyDiagnostics);

    document.addEventListener('input', () => {
      schedulePersist();
      scheduleDiagnostics();
    }, true);
    document.addEventListener('change', () => {
      schedulePersist();
      scheduleDiagnostics();
    }, true);
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
      const key = event.key.toLowerCase();
      if (key === 's' && event.shiftKey) {
        event.preventDefault();
        exportBundle();
      } else if (key === 'l' && event.shiftKey) {
        event.preventDefault();
        loadSession();
      } else if (key === 'x' && event.shiftKey) {
        event.preventDefault();
        clearSavedSession();
      } else if (key === '?' || (key === '/' && event.shiftKey)) {
        event.preventDefault();
        const overlay = ensureShortcutOverlay();
        if (overlay.classList.contains('open')) closeShortcuts();
        else openShortcuts();
      } else if (key === 'escape') {
        closeShortcuts();
      }
    });
  }

  function schedulePersist() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persistSession, 80);
  }

  function scheduleDiagnostics() {
    window.requestAnimationFrame(() => renderDiagnostics());
  }

  ensureDiagnosticsPanel();
  ensureShortcutOverlay();
  renderDiagnostics();

  loadSession();
  persistSession();

  let pausedForVisibility = false;
  let saveTimer = 0;

  window.__orbitalLab = {
    ...(window.__orbitalLab || {}),
    getSnapshot: collectRuntimeSnapshot,
    getDiagnostics: collectDiagnostics,
    applySnapshot: applyBundleSnapshot
  };

  attachEventHandlers();

  setInterval(renderDiagnostics, 1000);
})();
