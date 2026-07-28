(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ready = (fn) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());

  const HISTORY_PRESETS = [
    {
      name: 'TRAPPIST-1 stability',
      value: {
        preset: 'chaos',
        seed: 'trappist-1',
        integrator: 'yoshida4',
        dt: 0.005,
        g: 1,
        adaptive: true,
        adaptiveStrength: 1.4,
        collision: 'none'
      }
    },
    {
      name: 'Mercury precession',
      value: {
        preset: 'solar',
        seed: 'mercury-precession',
        integrator: 'ias15',
        dt: 0.002,
        g: 1,
        adaptive: true,
        adaptiveStrength: 1.1,
        collision: 'none'
      }
    },
    {
      name: 'L4 / L5 Trojan stability',
      value: {
        preset: 'resonant',
        seed: 'trojan-libration',
        integrator: 'yoshida4',
        dt: 0.01,
        g: 1,
        adaptive: true,
        adaptiveStrength: 1.2,
        collision: 'none'
      }
    }
  ];

  const LATEX_BLOCK = String.raw`\[
\dot{\mathbf r}_i = \mathbf v_i,\quad
\dot{\mathbf v}_i = \sum_{j\ne i} Gm_j\frac{\mathbf r_{ji}}{\lVert\mathbf r_{ji}\rVert^3}
\]

\[
Y(t)=\frac{2}{t}\int_0^t \frac{\|\delta(\tau)\|}{\|\delta(0)\|}\,d\tau
\]

\[
\phi = q\lambda_{out} - p\lambda_{in} - (q-p)\varpi_{in}
\]`;

  function detectHardware() {
    return {
      webgpu: typeof navigator !== 'undefined' && !!navigator.gpu,
      wasm: typeof WebAssembly !== 'undefined',
      workers: typeof Worker !== 'undefined'
    };
  }

  function createSection() {
    const scroll = document.querySelector('.panel-scroll');
    if (!scroll || $('#researchGroup')) return null;

    const section = document.createElement('section');
    section.className = 'group';
    section.id = 'researchGroup';
    section.innerHTML = `
      <h2>Research overlay</h2>
      <div class="stack">
        <label class="toggle"><input id="unitToggle" type="checkbox"> Display SI-style labels</label>
        <label class="toggle"><input id="analysisToggle" type="checkbox" checked> Live analytical notes</label>
      </div>
      <div class="stats orbital-stats" style="margin-top:10px">
        <div class="card"><span class="k">MEGNO</span><span class="v" id="megnoApproxOut">—</span><small>Proxy from current diagnostics</small></div>
        <div class="card"><span class="k">MMR</span><span class="v" id="mmrOut">—</span><small>Nearest commensurability</small></div>
        <div class="card"><span class="k">Poincaré</span><span class="v" id="poincareOut">—</span><small>Section sample count</small></div>
        <div class="card"><span class="k">Baseline</span><span class="v" id="baselineOut">—</span><small>Reference solver</small></div>
      </div>
      <div class="group" style="margin-top:12px">
        <h2>Hardware fallback</h2>
        <div class="legend" id="hardwareOut">Checking runtime support…</div>
      </div>
      <div class="group" style="margin-top:12px">
        <h2>Live LaTeX notes</h2>
        <pre class="report" style="max-height:240px">${LATEX_BLOCK}</pre>
      </div>
      <div class="group" style="margin-top:12px">
        <h2>Replication configs</h2>
        <pre class="report" id="replicationOut" style="max-height:220px"></pre>
      </div>
    `;

    scroll.appendChild(section);
    return section;
  }

  function updateHardware(out) {
    const hw = detectHardware();
    const bits = [];
    bits.push(hw.webgpu ? 'WebGPU available.' : 'WebGPU unavailable; CPU path remains active.');
    bits.push(hw.wasm ? 'WASM available.' : 'WASM unavailable; JavaScript kernels remain active.');
    bits.push(hw.workers ? 'Worker offload available.' : 'Workers unavailable; main-thread stepping remains active.');
    out.textContent = bits.join(' ');
  }

  function safeSnapshot() {
    try {
      return window.__orbitalLab?.getSnapshot?.() || null;
    } catch {
      return null;
    }
  }

  function updateOverlay() {
    const snapshot = safeSnapshot();
    const diag = window.__orbitalLab?.getDiagnostics?.() || null;
    const hwOut = $('#hardwareOut');
    if (hwOut) updateHardware(hwOut);

    const baseline = $('#baselineOut');
    if (baseline) baseline.textContent = diag?.bestIntegrator || 'rk4/ias15 fallback';

    const megno = $('#megnoApproxOut');
    if (megno) {
      const lyap = Number(diag?.lyapunov ?? 0);
      const proxy = Number.isFinite(lyap) ? (2 + Math.max(0, Math.min(2, lyap * 0.25))).toFixed(3) : '—';
      megno.textContent = proxy;
    }

    const mmr = $('#mmrOut');
    if (mmr) mmr.textContent = diag?.resonance || snapshot?.controls?.preset || '—';

    const poincare = $('#poincareOut');
    if (poincare) {
      const samples = Array.isArray(snapshot?.simulation?.phaseSpaceHistory) ? snapshot.simulation.phaseSpaceHistory.length : 0;
      poincare.textContent = String(samples);
    }

    const unitToggle = $('#unitToggle');
    const analysisToggle = $('#analysisToggle');
    const live = analysisToggle ? analysisToggle.checked : true;
    const legend = $('#researchGroup .legend');
    if (legend && snapshot && unitToggle?.checked) {
      legend.textContent = 'SI display mode is enabled. Coordinates and masses remain normalized internally in this browser build, while labels and reference notes are presented in SI-style terminology.';
    }
    if (legend && snapshot && !unitToggle?.checked) {
      legend.textContent = 'Internal coordinates are normalized in-browser for robustness; the overlay can present SI-style labeling without changing the integrator state.';
    }

    const rep = $('#replicationOut');
    if (rep) {
      rep.textContent = JSON.stringify(HISTORY_PRESETS.map((preset) => preset.value), null, 2);
    }

    if (!live) {
      if (megno) megno.textContent = 'paused';
      if (mmr) mmr.textContent = 'paused';
      if (poincare) poincare.textContent = 'paused';
    }
  }

  function applyPreset(index) {
    const preset = HISTORY_PRESETS[index];
    if (!preset) return;
    const snapshot = safeSnapshot();
    const current = snapshot?.controls || {};
    const merged = { ...current, ...preset.value };
    try {
      window.__orbitalLab?.applySnapshot?.({ controls: merged });
    } catch {
      // No-op fallback.
    }
  }

  function buildPresetButtons(section) {
    const host = section?.querySelector('#replicationOut')?.parentElement;
    if (!host) return;
    const bar = document.createElement('div');
    bar.className = 'actions';
    bar.style.marginTop = '10px';
    HISTORY_PRESETS.forEach((preset, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = preset.name;
      button.addEventListener('click', () => applyPreset(index));
      bar.appendChild(button);
    });
    host.appendChild(bar);
  }

  ready(() => {
    const section = createSection();
    if (!section) return;
    buildPresetButtons(section);
    updateOverlay();
    window.setInterval(updateOverlay, 1200);
  });
})();
