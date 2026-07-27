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
    if (benchmarkGroup?.parentElement === scroll) {
      scroll.insertBefore(group, benchmarkGroup.nextSibling);
    } else {
      scroll.appendChild(group);
    }
    return group;
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
    score -= Math.min(energyDrift * 120, 60);
    score -= Math.min(Math.log10(momentum + 10) * 6, 18);
    score -= Number.isFinite(encounterRatio) ? Math.max(0, (1.8 - encounterRatio) * 15) : 0;
    score -= Math.max(0, maxSpeed * timestep - 4) * 4;
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

  function collectRuntimeSnapshot() {
    return {
      schemaVersion: 1,
      app: 'Orbital Lab',
      capturedAt: new Date().toISOString(),
      controls: readControlState(),
      hud: readHudState(),
      diagnostics: collectDiagnostics(),
      benchmarkReport: get('benchmarkOut')?.textContent || null
    };
  }

  window.__orbitalLab = {
    getSnapshot: collectRuntimeSnapshot
  };

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
      schemaVersion: 2,
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

      const dispatch = (id, type) => {
        const element = get(id);
        if (!element) return;
        element.dispatchEvent(new Event(type, { bubbles: true }));
      };

      [
        ['g', 'input'], ['dt', 'input'], ['mass', 'input'], ['trail', 'input'],
        ['softening', 'input'], ['zoom', 'input'], ['seed', 'input'], ['adaptiveStrength', 'input'],
        ['adaptive', 'change'], ['showTrails', 'change'], ['showVectors', 'change'], ['showLabels', 'change'],
        ['preset', 'change'], ['integrator', 'change'], ['collision', 'change']
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

  const bundleButton = ensureBundleButton();
  if (bundleButton) bundleButton.addEventListener('click', exportBundle);

  ensureDiagnosticsPanel();
  renderDiagnostics();

  loadSession();
  persistSession();

  let pausedForVisibility = false;
  let saveTimer = 0;
  const schedulePersist = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persistSession, 80);
  };

  const scheduleDiagnostics = () => {
    window.requestAnimationFrame(() => renderDiagnostics());
  };

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

  const copyButton = get('copyDiagnostics');
  if (copyButton) copyButton.addEventListener('click', copyDiagnostics);

  setInterval(renderDiagnostics, 1000);
})();