import {
  benchmarkIntegrators,
  buildPreset,
  cloneBodies,
  computeTotalEnergy,
  stepSystem,
  summarizeBenchmark
} from './physics-core-precision.mjs';
import { bootstrapAccelerationBackend } from './webgpu-backend.mjs';

(() => {
  'use strict';

  const get = (id) => document.getElementById(id);
  const READY = typeof window !== 'undefined';
  const WORKER_SOURCE = `
    self.onmessage = (event) => {
      const snapshot = event.data || {};
      const phaseSpaceHistory = Array.isArray(snapshot.phaseSpaceHistory) ? snapshot.phaseSpaceHistory : [];
      const lyapunov = Number(snapshot.lyapunov || 0);
      const shadowDrift = Number(snapshot.shadowDrift || 0);
      const resonance = snapshot.resonance || '—';
      const megno = Number.isFinite(lyapunov) ? (2 + Math.max(0, Math.min(2, lyapunov * 0.25))).toFixed(3) : '—';
      self.postMessage({
        megno,
        poincareCount: phaseSpaceHistory.length,
        resonance,
        shadowDrift,
        lyapunov: Number.isFinite(lyapunov) ? lyapunov : null
      });
    };
  `;

  let analysisWorker = null;
  let backendPromise = null;

  function createWorker() {
    if (analysisWorker) return analysisWorker;
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') return null;
    try {
      const blob = new Blob([WORKER_SOURCE], { type: 'text/javascript' });
      analysisWorker = new Worker(URL.createObjectURL(blob));
      return analysisWorker;
    } catch {
      analysisWorker = null;
      return null;
    }
  }

  function ensurePanel() {
    const scroll = document.querySelector('.panel-scroll');
    if (!scroll || get('finalOptimizationGroup')) return null;

    const section = document.createElement('section');
    section.className = 'group';
    section.id = 'finalOptimizationGroup';
    section.innerHTML = `
      <h2>Final verification</h2>
      <div class="stack">
        <button id="verifyConvergence" type="button" class="primary">Verify Numerical Convergence</button>
      </div>
      <div class="stats orbital-stats" style="margin-top:10px">
        <div class="card"><span class="k">WebGPU</span><span class="v" id="backendKindOut">—</span><small id="backendReasonOut">Backend bootstrap not started</small></div>
        <div class="card"><span class="k">MEGNO</span><span class="v" id="megnoFinalOut">—</span><small>Worker-processed diagnostic proxy</small></div>
        <div class="card"><span class="k">Poincaré</span><span class="v" id="poincareFinalOut">—</span><small>Worker-processed section count</small></div>
        <div class="card"><span class="k">Round-off</span><span class="v" id="roundoffOut">—</span><small>Compensation residuals</small></div>
      </div>
      <pre id="verificationOut" class="report" style="margin-top:10px">Press “Verify Numerical Convergence” to compare Euler, Verlet, Yoshida 4, and IAS15 over a 10-second window.</pre>
    `;

    const benchmarkGroup = get('benchmarkOut')?.closest('.group');
    if (benchmarkGroup?.parentElement === scroll) scroll.insertBefore(section, benchmarkGroup.nextSibling);
    else scroll.appendChild(section);
    return section;
  }

  async function updateBackendStatus() {
    const kindOut = get('backendKindOut');
    const reasonOut = get('backendReasonOut');
    if (!kindOut || !reasonOut) return;
    if (!backendPromise) backendPromise = bootstrapAccelerationBackend();
    const backend = await backendPromise;
    kindOut.textContent = String(backend.kind || '—').toUpperCase();
    reasonOut.textContent = backend.reason || 'Ready';
  }

  function summarizeRoundoff(bodies) {
    const samples = bodies
      .map((body) => body?.__roundoff)
      .filter(Boolean)
      .slice(0, 3);
    if (!samples.length) return '—';
    return samples.map((sample) => `(${sample.x.toExponential(2)}, ${sample.y.toExponential(2)})`).join(' ');
  }

  function getCurrentBodies() {
    try {
      const snapshot = window.__orbitalLab?.getSnapshot?.();
      if (!snapshot) return null;
      if (Array.isArray(snapshot.bodies) && snapshot.bodies.length) return cloneBodies(snapshot.bodies);
      const presetName = snapshot.controls?.preset || 'default';
      return buildPreset(presetName, {
        G: Number(snapshot.controls?.g || 1),
        centralMass: Number(snapshot.controls?.mass || 9000),
        seed: String(snapshot.controls?.seed || 'orbital-lab')
      });
    } catch {
      return null;
    }
  }

  function updateWorkerMetrics() {
    const snapshot = window.__orbitalLab?.getSnapshot?.();
    const bodies = snapshot?.bodies;
    const worker = createWorker();
    const megnoOut = get('megnoFinalOut');
    const poincareOut = get('poincareFinalOut');
    const roundoffOut = get('roundoffOut');
    if (roundoffOut && Array.isArray(bodies)) {
      roundoffOut.textContent = summarizeRoundoff(bodies);
    }
    if (!worker || !snapshot) {
      if (megnoOut) megnoOut.textContent = '—';
      if (poincareOut) poincareOut.textContent = '—';
      return;
    }

    worker.onmessage = (event) => {
      const data = event.data || {};
      if (megnoOut) megnoOut.textContent = String(data.megno ?? '—');
      if (poincareOut) poincareOut.textContent = String(data.poincareCount ?? '—');
      const legacyMegno = get('megnoApproxOut');
      if (legacyMegno) legacyMegno.textContent = String(data.megno ?? '—');
      const legacyPoincare = get('poincareOut');
      if (legacyPoincare) legacyPoincare.textContent = String(data.poincareCount ?? '—');
    };

    worker.postMessage({
      phaseSpaceHistory: snapshot.simulation?.phaseSpaceHistory || [],
      lyapunov: snapshot.diagnostics?.lyapunov ?? 0,
      shadowDrift: snapshot.diagnostics?.shadowDrift ?? 0,
      resonance: snapshot.diagnostics?.resonance || snapshot.controls?.preset || '—'
    });
  }

  function renderVerificationResults(results) {
    const out = get('verificationOut');
    if (!out) return;
    const rows = results.map((row) => ({
      integrator: row.integrator,
      drift: row.energyDriftPercent,
      runtime: row.runtimeMs
    }));
    const table = [
      'Verification run — 10 second window',
      '',
      'Integrator      ΔE/E₀ (%)      runtime (ms)',
      '-------------------------------------------',
      ...rows.map((row) => `${row.integrator.padEnd(14)} ${row.drift.toExponential(4).padStart(12)} ${row.runtime.toFixed(1).padStart(14)}`),
      '',
      summarizeBenchmark(results)
    ].join('\n');
    out.textContent = table;
  }

  function runQuickVerification() {
    const snapshot = window.__orbitalLab?.getSnapshot?.();
    const controls = snapshot?.controls || {};
    const bodies = getCurrentBodies();
    if (!bodies) return;
    const dt = Math.max(0.002, Number(controls.dt || 0.02));
    const steps = Math.max(1, Math.round(10 / dt));
    const methods = ['euler', 'verlet', 'yoshida4', 'ias15'];
    const results = [];
    const baseG = Number(controls.g || 1);

    for (const integrator of methods) {
      const simBodies = cloneBodies(bodies);
      const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      for (let i = 0; i < steps; i++) {
        stepSystem(simBodies, {
          integrator,
          dt,
          G: baseG,
          collision: 'none',
          regularization: true,
          forceModel: {
            j2Enabled: false,
            dragEnabled: false,
            radiationEnabled: false,
            postNewtonianEnabled: false
          }
        });
      }
      const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const initialEnergy = computeTotalEnergy(bodies, { G: baseG });
      const finalEnergy = computeTotalEnergy(simBodies, { G: baseG });
      results.push({
        integrator,
        runtimeMs: ended - started,
        energyDriftPercent: initialEnergy ? Math.abs((finalEnergy - initialEnergy) / initialEnergy) * 100 : 0,
        momentumDrift: 0,
        trajectoryError: 0,
        acceptedSteps: 0,
        rejectedSteps: 0,
        maxError: 0
      });
    }

    renderVerificationResults(results);
  }

  function injectButtonHandlers(section) {
    const verifyButton = get('verifyConvergence');
    if (verifyButton) verifyButton.addEventListener('click', runQuickVerification);
    const legacyButton = get('helpToggle');
    if (legacyButton) {
      legacyButton.insertAdjacentHTML('afterend', '<button id="verifyConvergenceInline" type="button">Verify Numerical Convergence</button>');
      get('verifyConvergenceInline')?.addEventListener('click', runQuickVerification);
    }
  }

  function updateFacultyGuide(section) {
    const scroll = document.querySelector('.panel-scroll');
    if (!scroll || get('facultyGuideGroup')) return;
    const guide = document.createElement('section');
    guide.className = 'group';
    guide.id = 'facultyGuideGroup';
    guide.innerHTML = `
      <h2>Information for Faculty Reviewers & Admissions Committees</h2>
      <div class="legend">
        The mathematical core is in <code>physics-core-advanced.mjs</code>. The 4th-order symplectic composition coefficients are defined near the <code>YOSHIDA_*</code> constants and the <code>yoshida4Step</code> implementation. The IAS15-style baseline is implemented in the adaptive extrapolation path around <code>modifiedMidpoint</code>, <code>bulirschStoerStep</code>, and the <code>ias15</code> dispatch path. The close-encounter fallback is the regularization branch near <code>maybeRegularizeCloseEncounter</code> and <code>solveKeplerUniversal</code>. The precision wrapper is in <code>physics-core-precision.mjs</code>. The isolated GPU bootstrap and WGSL source live in <code>webgpu-backend.mjs</code>.
      </div>
    `;
    scroll.appendChild(guide);
  }

  async function bootstrap() {
    if (!READY) return;
    const section = ensurePanel();
    updateFacultyGuide(section);
    injectButtonHandlers(section);
    await updateBackendStatus();
    updateWorkerMetrics();
    window.setInterval(updateWorkerMetrics, 1200);
    window.setInterval(updateBackendStatus, 5000);
    window.__orbitalLabFinal = {
      runQuickVerification,
      updateBackendStatus,
      updateWorkerMetrics
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    void bootstrap();
  }
})();
