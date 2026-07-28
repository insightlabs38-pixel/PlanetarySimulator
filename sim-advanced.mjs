import {
  Body,
  buildPreset,
  benchmarkIntegrators,
  cloneBodies,
  computeAngularMomentum,
  computeCenterOfMass,
  computeClosestApproach,
  computeMaxSpeed,
  computeMomentum,
  computeSystemOrbitalAnalytics,
  computeTotalEnergy,
  recommendedSubsteps,
  stepSystem,
  summarizeBenchmark
} from './physics-core-advanced.mjs';

(() => {
  'use strict';

  const canvas = document.getElementById('space');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);

  const els = {
    toggle: $('toggle'), reset: $('reset'), randomize: $('randomize'), exportCsv: $('exportCsv'), exportPng: $('exportPng'), benchmark: $('benchmark'), preset: $('preset'), integrator: $('integrator'), collision: $('collision'), g: $('g'), dt: $('dt'), mass: $('mass'), trail: $('trail'), softening: $('softening'), zoom: $('zoom'), seed: $('seed'), adaptive: $('adaptive'), adaptiveStrength: $('adaptiveStrength'), showTrails: $('showTrails'), showVectors: $('showVectors'), showLabels: $('showLabels'), gOut: $('gOut'), dtOut: $('dtOut'), massOut: $('massOut'), trailOut: $('trailOut'), softOut: $('softOut'), zoomOut: $('zoomOut'), adaptiveOut: $('adaptiveOut'), bodiesOut: $('bodiesOut'), timeOut: $('timeOut'), energyOut: $('energyOut'), momentumOut: $('momentumOut'), angularOut: $('angularOut'), comOut: $('comOut'), closestOut: $('closestOut'), speedOut: $('speedOut'), semimajorOut: $('semimajorOut'), eccentricityOut: $('eccentricityOut'), periodOut: $('periodOut'), periapsisOut: $('periapsisOut'), apoapsisOut: $('apoapsisOut'), escapeOut: $('escapeOut'), specificEnergyOut: $('specificEnergyOut'), status: $('status'), statusDetail: $('statusDetail'), hudTime: $('hudTime'), benchmarkOut: $('benchmarkOut')
  };

  const state = {
    running: true,
    preset: 'default',
    integrator: 'symplectic',
    collision: 'none',
    G: 1,
    dt: 0.02,
    centralMass: 9000,
    trailLength: 90,
    softening: 25,
    zoom: 1,
    seed: 't5-admissions',
    adaptive: true,
    adaptiveStrength: 1.2,
    adaptiveTolerance: 1e-4,
    showTrails: true,
    showVectors: false,
    showLabels: true,
    j2Enabled: false,
    j2Strength: 0.001,
    j2Radius: 18,
    dragEnabled: false,
    dragStrength: 0.00001,
    dragScaleHeight: 140,
    dragDensity0: 0.0005,
    radiationEnabled: false,
    radiationStrength: 0.0001,
    postNewtonianEnabled: false,
    postNewtonianStrength: 0.0001,
    referenceMode: 'primary',
    referenceIndex: 0,
    targetIndex: 1,
    time: 0,
    frame: 0,
    pristine: true,
    initialEnergy: 0,
    energyDrift: 0,
    closestApproach: 0,
    maxSpeed: 0,
    orbit: null,
    benchmarkText: 'Press “Run Benchmark” to compare all integrators on the current initial conditions.',
    lastStepStats: { acceptedSteps: 1, rejectedSteps: 0, substeps: 1, maxError: 0, meanSubstep: 0 },
    eventLog: [],
    periapsisHistory: [],
    shadowDrift: 0,
    lyapunov: 0
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let bodies = [];
  let shadowBodies = [];
  let energyHistory = [];
  let phaseSpaceHistory = [];
  let stepErrorHistory = [];
  let simulationLog = [];
  let targetInitialSeparation = 1e-6;
  let previousOrbit = null;
  let previousShadowSample = null;
  let advancedPanelReady = false;
  const dragState = { dragging: false, start: null, point: null };

  const colors = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#b8f2e6', '#c77dff'];
  const starField = Array.from({ length: 120 }, (_, i) => ({ x: ((i * 37) % 100) / 100, y: ((i * 73) % 100) / 100, r: 0.3 + (i % 5) * 0.22, a: 0.08 + (i % 7) * 0.03 }));

  function makeRandomSeed() {
    const bytes = new Uint32Array(2);
    crypto.getRandomValues(bytes);
    return `${bytes[0].toString(36)}-${bytes[1].toString(36)}`;
  }

  function forceModel() {
    return {
      j2Enabled: state.j2Enabled,
      j2Strength: state.j2Strength,
      j2Radius: state.j2Radius,
      dragEnabled: state.dragEnabled,
      dragStrength: state.dragStrength,
      dragScaleHeight: state.dragScaleHeight,
      dragDensity0: state.dragDensity0,
      radiationEnabled: state.radiationEnabled,
      radiationStrength: state.radiationStrength,
      postNewtonianEnabled: state.postNewtonianEnabled,
      postNewtonianStrength: state.postNewtonianStrength
    };
  }

  function ensureAdvancedUI() {
    if (advancedPanelReady) return;
    const scroll = document.querySelector('.panel-scroll');
    if (!scroll) return;

    if (!document.getElementById('advancedPhysicsGroup')) {
      const group = document.createElement('section');
      group.className = 'group';
      group.id = 'advancedPhysicsGroup';
      group.innerHTML = `
        <h2>Advanced physics</h2>
        <div class="stack">
          <label class="toggle"><input id="j2Enabled" type="checkbox"> J2 perturbation</label>
          <label><div class="inline"><span>J2 strength</span><span class="value" id="j2StrengthOut">0.0010</span></div><input id="j2Strength" type="range" min="0" max="0.01" step="0.0001" value="0.001"></label>
          <label><div class="inline"><span>J2 radius</span><span class="value" id="j2RadiusOut">18</span></div><input id="j2Radius" type="range" min="5" max="80" step="1" value="18"></label>
          <label class="toggle"><input id="dragEnabled" type="checkbox"> Atmospheric drag</label>
          <label><div class="inline"><span>Drag strength</span><span class="value" id="dragStrengthOut">0.00001</span></div><input id="dragStrength" type="range" min="0" max="0.0002" step="0.00001" value="0.00001"></label>
          <label><div class="inline"><span>Scale height</span><span class="value" id="dragScaleHeightOut">140</span></div><input id="dragScaleHeight" type="range" min="20" max="400" step="1" value="140"></label>
          <label class="toggle"><input id="radiationEnabled" type="checkbox"> Radiation pressure</label>
          <label><div class="inline"><span>Radiation strength</span><span class="value" id="radiationStrengthOut">0.0001</span></div><input id="radiationStrength" type="range" min="0" max="0.001" step="0.00005" value="0.0001"></label>
          <label class="toggle"><input id="postNewtonianEnabled" type="checkbox"> 1PN correction</label>
          <label><div class="inline"><span>1PN strength</span><span class="value" id="postNewtonianStrengthOut">0.0001</span></div><input id="postNewtonianStrength" type="range" min="0" max="0.001" step="0.00005" value="0.0001"></label>
          <label><div class="inline"><span>Error tolerance</span><span class="value" id="adaptiveToleranceOut">1e-4</span></div><input id="adaptiveTolerance" type="range" min="0.000001" max="0.01" step="0.000001" value="0.0001"></label>
        </div>`;
      scroll.insertBefore(group, document.getElementById('benchmarkOut')?.closest('.group') || null);
    }

    if (!document.getElementById('analysisGroup')) {
      const group = document.createElement('section');
      group.className = 'group';
      group.id = 'analysisGroup';
      group.innerHTML = `
        <h2>Orbit analysis</h2>
        <div class="stack">
          <label>
            <span>Reference mode</span>
            <select id="referenceMode">
              <option value="primary">Primary body</option>
              <option value="barycenter">Barycenter</option>
              <option value="manual">Manual body</option>
            </select>
          </label>
          <label>
            <span>Reference body</span>
            <select id="referenceIndex"></select>
          </label>
          <label>
            <span>Analyzed body</span>
            <select id="targetIndex"></select>
          </label>
        </div>
        <div class="stats orbital-stats">
          <div class="card"><span class="k">Resonance</span><span class="v" id="resonanceOut">—</span><small>Nearest simple period ratio</small></div>
          <div class="card"><span class="k">Precession</span><span class="v" id="precessionOut">—</span><small>Periapsis angle drift</small></div>
          <div class="card"><span class="k">Lyapunov</span><span class="v" id="lyapunovOut">—</span><small>Finite-time divergence estimate</small></div>
          <div class="card"><span class="k">Adaptive error</span><span class="v" id="adaptiveErrorOut">—</span><small>Max RK45 local error</small></div>
          <div class="card"><span class="k">Rejected steps</span><span class="v" id="rejectedOut">0</span><small>Adaptive re-trials</small></div>
          <div class="card"><span class="k">Avg substep</span><span class="v" id="avgStepOut">—</span><small>Effective adaptive dt</small></div>
        </div>
        <pre id="eventLog" class="report">No events yet.</pre>`;
      const insertAfter = document.getElementById('benchmarkOut')?.closest('.group') || scroll.lastElementChild;
      insertAfter?.after(group);
    }

    const integrator = els.integrator;
    if (integrator && !integrator.querySelector('option[value="rk45"]')) {
      integrator.insertAdjacentHTML('beforeend', '<option value="rk45">Adaptive RK4 (RK45)</option><option value="barnes-hut">Barnes-Hut</option>');
    }

    advancedPanelReady = true;
  }

  function syncBodySelects() {
    const ref = document.getElementById('referenceIndex');
    const tgt = document.getElementById('targetIndex');
    if (!ref || !tgt) return;
    const labels = bodies.map((b, i) => `<option value="${i}">${i}: ${b.label || b.type || 'body'}</option>`).join('');
    ref.innerHTML = labels;
    tgt.innerHTML = labels;
    if (!Number.isInteger(state.referenceIndex) || state.referenceIndex >= bodies.length) state.referenceIndex = 0;
    if (!Number.isInteger(state.targetIndex) || state.targetIndex >= bodies.length) state.targetIndex = Math.min(1, Math.max(0, bodies.length - 1));
    ref.value = String(state.referenceIndex);
    tgt.value = String(state.targetIndex);
  }

  function applyCentralMass() {
    if (bodies.length && bodies[0].fixed) bodies[0].mass = state.centralMass;
    if (state.preset === 'default' && bodies.length > 2) {
      const r1 = bodies[1].x || 170;
      const r2 = Math.abs(bodies[2].x || 255);
      const v1 = Math.sqrt(Math.max(state.G * state.centralMass / Math.max(Math.abs(r1), 1), 0));
      const v2 = Math.sqrt(Math.max(state.G * state.centralMass / Math.max(r2, 1), 0));
      bodies[1].vx = 0; bodies[1].vy = v1;
      bodies[2].vx = 0; bodies[2].vy = -v2;
    }
  }

  function resetHistories() {
    energyHistory = [];
    phaseSpaceHistory = [];
    stepErrorHistory = [];
    simulationLog = [];
    state.eventLog = [];
    state.periapsisHistory = [];
    state.shadowDrift = 0;
    state.lyapunov = 0;
    previousOrbit = null;
    previousShadowSample = null;
    targetInitialSeparation = 1e-6;
  }

  function initializeSystem(name = state.preset) {
    bodies = buildPreset(name, { G: state.G, centralMass: state.centralMass, seed: state.seed });
    shadowBodies = cloneBodies(bodies);
    if (shadowBodies[1]) {
      shadowBodies[1].x += 0.001;
      shadowBodies[1].vy += 0.0001;
      targetInitialSeparation = Math.hypot((shadowBodies[1].x - bodies[1].x), (shadowBodies[1].y - bodies[1].y), (shadowBodies[1].vx - bodies[1].vx), (shadowBodies[1].vy - bodies[1].vy));
    }
    applyCentralMass();
    syncBodySelects();
    state.pristine = true;
    state.time = 0;
    state.frame = 0;
    resetHistories();
    captureEnergyBaseline();
    updateAnalysis();
    sampleMetrics();
    updateUI();
  }

  function captureEnergyBaseline() {
    state.initialEnergy = computeTotalEnergy(bodies, { G: state.G, softening: state.softening });
    state.energyDrift = 0;
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
  }

  function setCanvasTransform() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function worldToScreen(p) {
    return { x: width / 2 + p.x * state.zoom, y: height / 2 + p.y * state.zoom };
  }

  function screenToWorld(p) {
    return { x: (p.x - width / 2) / state.zoom, y: (p.y - height / 2) / state.zoom };
  }

  function getPrimaryBody() {
    return bodies.find((b) => b.fixed) || bodies.slice().sort((a, b) => b.mass - a.mass)[0] || null;
  }

  function getReferenceBody() {
    if (state.referenceMode === 'barycenter') return null;
    if (state.referenceMode === 'manual') return bodies[state.referenceIndex] || getPrimaryBody();
    return getPrimaryBody();
  }

  function getAnalyzedBody() {
    return bodies[state.targetIndex] || bodies.find((b) => !b.fixed) || bodies[0] || null;
  }

  function getDiagnosticSnapshot() {
    return {
      energyDrift: state.energyDrift,
      momentum: computeMomentum(bodies),
      angularMomentum: computeAngularMomentum(bodies),
      closestApproach: state.closestApproach,
      maxSpeed: state.maxSpeed,
      timestep: state.dt,
      softening: state.softening,
      acceptedSteps: state.lastStepStats.acceptedSteps || 0,
      rejectedSteps: state.lastStepStats.rejectedSteps || 0,
      maxError: state.lastStepStats.maxError || 0,
      shadowDrift: state.shadowDrift,
      lyapunov: state.lyapunov,
      benchmarkText: state.benchmarkText
    };
  }

  function updateAnalysis() {
    const selected = computeSystemOrbitalAnalytics(bodies, { G: state.G, referenceMode: state.referenceMode, referenceIndex: state.referenceIndex })
      .find((row) => row.index === state.targetIndex && !row.skipped)
      || computeSystemOrbitalAnalytics(bodies, { G: state.G, referenceMode: state.referenceMode, referenceIndex: state.referenceIndex })
        .find((row) => !row.skipped);
    state.orbit = selected || null;
  }

  function approxPrecessionRate(orbit) {
    if (!orbit || !Number.isFinite(orbit.periapsisAngle)) return null;
    const lastSample = state.periapsisHistory[state.periapsisHistory.length - 1];
    if (!lastSample || lastSample.time !== state.time) {
      state.periapsisHistory.push({ time: state.time, angle: orbit.periapsisAngle });
      if (state.periapsisHistory.length > 12) state.periapsisHistory.shift();
    }
    if (state.periapsisHistory.length < 2) return null;
    const first = state.periapsisHistory[0];
    const last = state.periapsisHistory[state.periapsisHistory.length - 1];
    const angle = last.angle - first.angle;
    const dt = Math.max(last.time - first.time, 1e-9);
    return angle / dt;
  }

  function detectEvents(orbit, stepStats) {
    if (!orbit || !Number.isFinite(orbit.r)) return;
    const body = getAnalyzedBody();
    const ref = state.referenceMode === 'barycenter' ? computeCenterOfMass(bodies) : (getReferenceBody() || computeCenterOfMass(bodies));
    const vr = ((body.x - ref.x) * (body.vx - (ref.vx || 0)) + (body.y - ref.y) * (body.vy - (ref.vy || 0))) / Math.max(orbit.r, 1e-9);
    if (previousOrbit) {
      if (previousOrbit.vr < 0 && vr >= 0) state.eventLog.unshift(`t=${state.time.toFixed(2)} periapsis near ${orbit.r.toFixed(2)}`);
      if (previousOrbit.vr > 0 && vr <= 0) state.eventLog.unshift(`t=${state.time.toFixed(2)} apoapsis near ${orbit.r.toFixed(2)}`);
      if (previousOrbit.bound && !Number.isFinite(orbit.orbitalPeriod)) state.eventLog.unshift(`t=${state.time.toFixed(2)} escape transition`);
    }
    if (stepStats?.collisions) state.eventLog.unshift(`t=${state.time.toFixed(2)} collision x${stepStats.collisions}`);
    state.eventLog = state.eventLog.slice(0, 40);
    previousOrbit = { vr, bound: Number.isFinite(orbit.orbitalPeriod) };
  }

  function updateLyapunov() {
    const a = bodies[state.targetIndex];
    const b = shadowBodies[state.targetIndex];
    if (!a || !b) return;
    const separation = Math.hypot(a.x - b.x, a.y - b.y, a.vx - b.vx, a.vy - b.vy);
    if (!previousShadowSample) {
      previousShadowSample = separation || targetInitialSeparation;
      state.lyapunov = 0;
      state.shadowDrift = 0;
      return;
    }
    state.shadowDrift = separation;
    state.lyapunov = Math.log(Math.max(separation, 1e-12) / Math.max(targetInitialSeparation, 1e-12)) / Math.max(state.time, 1e-9);
    previousShadowSample = separation;
  }

  function sampleMetrics() {
    const currentEnergy = computeTotalEnergy(bodies, { G: state.G, softening: state.softening });
    state.energyDrift = state.initialEnergy ? Math.abs((currentEnergy - state.initialEnergy) / state.initialEnergy) * 100 : 0;
    state.closestApproach = computeClosestApproach(bodies);
    state.maxSpeed = computeMaxSpeed(bodies);

    energyHistory.push(state.energyDrift);
    if (energyHistory.length > 180) energyHistory.shift();

    const moving = getAnalyzedBody();
    if (moving) {
      phaseSpaceHistory.push({ x: moving.x, vx: moving.vx });
      if (phaseSpaceHistory.length > 120) phaseSpaceHistory.shift();
    }

    updateAnalysis();
    updateLyapunov();
    detectEvents(state.orbit, state.lastStepStats);
    stepErrorHistory.push(state.lastStepStats.maxError || 0);
    if (stepErrorHistory.length > 180) stepErrorHistory.shift();
  }

  function updateOrbitalOutputs() {
    const orbit = state.orbit;
    const formatFinite = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '—';
    els.semimajorOut.textContent = orbit ? formatFinite(orbit.semiMajorAxis, 1) : '—';
    els.eccentricityOut.textContent = orbit ? formatFinite(orbit.eccentricity, 4) : '—';
    els.periodOut.textContent = orbit ? formatFinite(orbit.orbitalPeriod, 1) : '—';
    els.periapsisOut.textContent = orbit ? formatFinite(orbit.periapsis, 1) : '—';
    els.apoapsisOut.textContent = orbit ? formatFinite(orbit.apoapsis, 1) : '—';
    els.escapeOut.textContent = orbit ? formatFinite(orbit.escapeSpeed, 2) : '—';
    els.specificEnergyOut.textContent = orbit ? formatFinite(orbit.specificEnergy, 4) : '—';
  }

  function updateUI() {
    const com = computeCenterOfMass(bodies);
    const momentum = computeMomentum(bodies);
    const angular = computeAngularMomentum(bodies);
    els.gOut.textContent = state.G.toFixed(2);
    els.dtOut.textContent = state.dt.toFixed(3);
    els.massOut.textContent = Math.round(state.centralMass);
    els.trailOut.textContent = String(state.trailLength);
    els.softOut.textContent = String(state.softening);
    els.zoomOut.textContent = `${state.zoom.toFixed(2)}×`;
    els.adaptiveOut.textContent = state.integrator === 'rk45' ? `rk45 · tol ${state.adaptiveTolerance.toExponential(1)}` : (state.adaptive ? `${state.adaptiveStrength.toFixed(1)}×` : 'off');
    els.bodiesOut.textContent = String(bodies.length);
    els.timeOut.textContent = state.time.toFixed(2);
    els.hudTime.textContent = state.time.toFixed(2);
    els.energyOut.textContent = `${state.energyDrift.toFixed(4)}%`;
    els.momentumOut.textContent = momentum.toFixed(2);
    els.angularOut.textContent = angular.toFixed(2);
    els.comOut.textContent = `${com.x.toFixed(1)}, ${com.y.toFixed(1)}`;
    els.closestOut.textContent = state.closestApproach.toFixed(2);
    els.speedOut.textContent = state.maxSpeed.toFixed(2);
    els.status.textContent = state.running ? 'Running' : 'Paused';
    els.statusDetail.textContent = `${({ euler: 'Euler', symplectic: 'Symplectic Euler', verlet: 'Velocity Verlet', rk4: 'RK4', rk45: 'Adaptive RK4', 'barnes-hut': 'Barnes-Hut' }[state.integrator] || state.integrator)} · ${state.preset === 'chaos' ? `Seeded random (${state.seed})` : state.preset}`;
    els.toggle.textContent = state.running ? 'Pause' : 'Play';
    updateOrbitalOutputs();
    els.benchmarkOut.textContent = state.benchmarkText;
    const eventLog = document.getElementById('eventLog');
    if (eventLog) eventLog.textContent = state.eventLog.length ? state.eventLog.join('\n') : 'No events yet.';
    if (document.getElementById('resonanceOut')) {
      const orbit = state.orbit;
      document.getElementById('resonanceOut').textContent = orbit?.resonanceRatio || '—';
      const rate = approxPrecessionRate(orbit);
      document.getElementById('precessionOut').textContent = rate == null ? '—' : `${rate.toExponential(2)} rad/u`;
      document.getElementById('lyapunovOut').textContent = Number.isFinite(state.lyapunov) ? `${state.lyapunov.toExponential(2)}` : '—';
      document.getElementById('adaptiveErrorOut').textContent = state.lastStepStats.maxError ? state.lastStepStats.maxError.toExponential(2) : '0';
      document.getElementById('rejectedOut').textContent = String(state.lastStepStats.rejectedSteps || 0);
      document.getElementById('avgStepOut').textContent = state.lastStepStats.meanSubstep ? state.lastStepStats.meanSubstep.toFixed(4) : '—';
    }
  }

  function getForceModel() {
    return forceModel();
  }

  function readControls() {
    return {
      running: state.running,
      preset: state.preset,
      integrator: state.integrator,
      collision: state.collision,
      g: state.G,
      dt: state.dt,
      mass: state.centralMass,
      trail: state.trailLength,
      softening: state.softening,
      zoom: state.zoom,
      seed: state.seed,
      adaptive: state.adaptive,
      adaptiveStrength: state.adaptiveStrength,
      adaptiveTolerance: state.adaptiveTolerance,
      showTrails: state.showTrails,
      showVectors: state.showVectors,
      showLabels: state.showLabels,
      j2Enabled: state.j2Enabled,
      j2Strength: state.j2Strength,
      j2Radius: state.j2Radius,
      dragEnabled: state.dragEnabled,
      dragStrength: state.dragStrength,
      dragScaleHeight: state.dragScaleHeight,
      dragDensity0: state.dragDensity0,
      radiationEnabled: state.radiationEnabled,
      radiationStrength: state.radiationStrength,
      postNewtonianEnabled: state.postNewtonianEnabled,
      postNewtonianStrength: state.postNewtonianStrength,
      referenceMode: state.referenceMode,
      referenceIndex: state.referenceIndex,
      targetIndex: state.targetIndex
    };
  }

  function setControls(snapshot = {}) {
    const pairs = [
      ['g', 'value'], ['dt', 'value'], ['mass', 'value'], ['trail', 'value'], ['softening', 'value'], ['zoom', 'value'], ['seed', 'value'], ['adaptiveStrength', 'value'], ['adaptiveTolerance', 'value'], ['j2Strength', 'value'], ['j2Radius', 'value'], ['dragStrength', 'value'], ['dragScaleHeight', 'value'], ['radiationStrength', 'value'], ['postNewtonianStrength', 'value'], ['adaptive', 'checked'], ['showTrails', 'checked'], ['showVectors', 'checked'], ['showLabels', 'checked'], ['j2Enabled', 'checked'], ['dragEnabled', 'checked'], ['radiationEnabled', 'checked'], ['postNewtonianEnabled', 'checked'], ['preset', 'value'], ['integrator', 'value'], ['collision', 'value'], ['referenceMode', 'value'], ['referenceIndex', 'value'], ['targetIndex', 'value']
    ];
    for (const [id, prop] of pairs) {
      const el = $(id);
      if (!el || snapshot[id] == null) continue;
      if (prop === 'checked') el.checked = Boolean(snapshot[id]);
      else el.value = String(snapshot[id]);
    }
    applyControls();
  }

  function getSnapshot() {
    return {
      schemaVersion: 4,
      app: 'Orbital Lab',
      capturedAt: new Date().toISOString(),
      controls: readControls(),
      bodies: cloneBodies(bodies),
      shadowBodies: cloneBodies(shadowBodies),
      simulation: {
        time: state.time,
        frame: state.frame,
        energyHistory,
        phaseSpaceHistory,
        stepErrorHistory,
        eventLog: state.eventLog,
        shadowDrift: state.shadowDrift,
        lyapunov: state.lyapunov,
        benchmarkReport: state.benchmarkText
      },
      diagnostics: getDiagnosticSnapshot(),
      benchmarkReport: state.benchmarkText
    };
  }

  function applySnapshot(payload = {}) {
    const controls = payload.controls || payload.simulationSnapshot?.controls || payload.snapshot?.controls || payload;
    if (controls) setControls(controls);
    if (payload.bodies && Array.isArray(payload.bodies)) {
      bodies = cloneBodies(payload.bodies);
      shadowBodies = cloneBodies(payload.shadowBodies || payload.bodies);
      syncBodySelects();
      captureEnergyBaseline();
    }
    const sim = payload.simulation || payload.simulationSnapshot?.simulation || payload.snapshot?.simulation;
    if (sim) {
      state.time = Number(sim.time ?? state.time);
      state.frame = Number(sim.frame ?? state.frame);
      energyHistory = Array.isArray(sim.energyHistory) ? [...sim.energyHistory] : energyHistory;
      phaseSpaceHistory = Array.isArray(sim.phaseSpaceHistory) ? [...sim.phaseSpaceHistory] : phaseSpaceHistory;
      stepErrorHistory = Array.isArray(sim.stepErrorHistory) ? [...sim.stepErrorHistory] : stepErrorHistory;
      state.eventLog = Array.isArray(sim.eventLog) ? [...sim.eventLog] : state.eventLog;
      state.shadowDrift = Number(sim.shadowDrift ?? state.shadowDrift);
      state.lyapunov = Number(sim.lyapunov ?? state.lyapunov);
      state.benchmarkText = String(sim.benchmarkReport ?? state.benchmarkText);
    }
    updateAnalysis();
    updateUI();
  }

  function collectDiagnostics() {
    const energyDrift = state.energyDrift;
    const momentum = computeMomentum(bodies);
    const closestApproach = state.closestApproach;
    const stepError = state.lastStepStats.maxError || 0;
    const score = Math.max(0, Math.min(100, Math.round(100 - Math.min(energyDrift * 140, 60) - Math.min(Math.log10(momentum + 10) * 5, 16) - Math.min(stepError * 120000, 18) - Math.min(Math.abs(state.shadowDrift) * 9000, 8) - (state.lastStepStats.rejectedSteps || 0) * 0.35)));
    const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Stable' : score >= 50 ? 'Watch' : 'Unstable';
    const bestIntegrator = String((state.benchmarkText.match(/Best energy conservation:\s*(\S+)/i) || [])[1] || '—');
    const orbit = state.orbit;
    return {
      score,
      label,
      bestIntegrator,
      energyDrift,
      momentum,
      closestApproach,
      adaptiveError: stepError,
      rejectedSteps: state.lastStepStats.rejectedSteps || 0,
      meanStep: state.lastStepStats.meanSubstep || state.dt,
      shadowDrift: state.shadowDrift,
      lyapunov: state.lyapunov,
      resonance: orbit?.resonanceRatio || '—',
      precessionRate: approxPrecessionRate(orbit),
      benchmarkText: state.benchmarkText
    };
  }

  function drawBackdrop() {
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    for (const star of starField) {
      ctx.globalAlpha = star.a;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTrails() {
    if (!state.showTrails) return;
    for (const body of bodies) {
      if (body.trail.length < 2) continue;
      ctx.strokeStyle = body.color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 1; i < body.trail.length; i++) {
        const p0 = worldToScreen({ x: body.trail[i - 1][0], y: body.trail[i - 1][1] });
        const p1 = worldToScreen({ x: body.trail[i][0], y: body.trail[i][1] });
        ctx.globalAlpha = Math.max(0.08, i / body.trail.length);
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawVectors(body, screen) {
    if (!state.showVectors || body.fixed) return;
    const speed = Math.hypot(body.vx, body.vy);
    const length = Math.min(40, speed * 1.7);
    const angle = Math.atan2(body.vy, body.vx);
    const tipX = screen.x + Math.cos(angle) * length;
    const tipY = screen.y + Math.sin(angle) * length;
    ctx.strokeStyle = 'rgba(124,199,255,.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(124,199,255,.9)';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - Math.cos(angle - 0.4) * 8, tipY - Math.sin(angle - 0.4) * 8);
    ctx.lineTo(tipX - Math.cos(angle + 0.4) * 8, tipY - Math.sin(angle + 0.4) * 8);
    ctx.closePath();
    ctx.fill();
  }

  function drawBodies() {
    for (const body of bodies) {
      const screen = worldToScreen(body);
      const radius = Math.max(2, body.radius * Math.max(0.8, state.zoom * 0.88));
      const gradient = ctx.createRadialGradient(screen.x - radius * 0.3, screen.y - radius * 0.3, 1, screen.x, screen.y, radius * 1.6);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.18, body.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.fill();
      drawVectors(body, screen);
      if (state.showLabels) {
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(231,239,255,.92)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(body.label || body.type, screen.x + radius + 4, screen.y - radius - 2);
      }
    }
  }

  function drawDragVector() {
    if (!dragState.dragging || !dragState.start || !dragState.point) return;
    const a = worldToScreen(dragState.start);
    const b = worldToScreen(dragState.point);
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,.94)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath();
    ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`launch speed ≈ ${(Math.hypot(dragState.point.x - dragState.start.x, dragState.point.y - dragState.start.y) / 20).toFixed(2)}`, b.x + 10, b.y - 10);
  }

  function drawGraph(x, y, w, h, title, values, color, formatter) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,12,24,.86)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(210,225,255,.45)';
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#dfe8ff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(title, x + 8, y + 14);
    ctx.strokeStyle = 'rgba(210,225,255,.22)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 22);
    ctx.lineTo(x + 8, y + h - 10);
    ctx.lineTo(x + w - 8, y + h - 10);
    ctx.stroke();
    if (values.length > 1) {
      const max = Math.max(...values, 0.0001);
      const min = Math.min(...values, 0);
      const span = Math.max(max - min, 1e-6);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      values.forEach((value, index) => {
        const px = x + 8 + (index / (values.length - 1)) * (w - 16);
        const py = y + h - 10 - ((value - min) / span) * (h - 34);
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    if (formatter) {
      ctx.fillStyle = '#dfe8ff';
      ctx.fillText(formatter(values.length ? values[values.length - 1] : 0), x + 8, y + h - 8);
    }
    ctx.restore();
  }

  function drawGraphs() {
    const graphWidth = 210;
    const graphHeight = 90;
    const margin = 12;
    drawGraph(width - graphWidth - margin, margin, graphWidth, graphHeight, 'Energy drift', energyHistory, '#ffd166', (v) => `drift ${v.toFixed(4)}%`);
    const x = width - graphWidth - margin;
    const y = margin + graphHeight + 10;
    drawGraph(x, y, graphWidth, graphHeight, 'Phase space: x vs vx', [], '#4cc9f0', () => `samples ${phaseSpaceHistory.length}`);
    if (phaseSpaceHistory.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, graphWidth, graphHeight);
      ctx.clip();
      const xs = phaseSpaceHistory.map((p) => p.x);
      const vs = phaseSpaceHistory.map((p) => p.vx);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minV = Math.min(...vs), maxV = Math.max(...vs);
      const spanX = Math.max(maxX - minX, 1e-6), spanV = Math.max(maxV - minV, 1e-6);
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      phaseSpaceHistory.forEach((p, i) => {
        const px = x + 8 + ((p.x - minX) / spanX) * (graphWidth - 16);
        const py = y + graphHeight - 10 - ((p.vx - minV) / spanV) * (graphHeight - 34);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }
    drawGraph(x, y + graphHeight + 10, graphWidth, graphHeight, 'RK45 error', stepErrorHistory, '#c77dff', (v) => `err ${v.toExponential(2)}`);
  }

  function render() {
    setCanvasTransform();
    drawBackdrop();
    drawTrails();
    drawBodies();
    drawDragVector();
    const com = computeCenterOfMass(bodies);
    const comScreen = worldToScreen(com);
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.beginPath();
    ctx.arc(comScreen.x, comScreen.y, 4, 0, Math.PI * 2);
    ctx.fill();
    drawGraphs();
  }

  function pushTrail(body) {
    body.trail.push([body.x, body.y]);
    if (body.trail.length > state.trailLength) body.trail.shift();
  }

  function syncShadow() {
    shadowBodies = cloneBodies(bodies);
    if (shadowBodies[state.targetIndex]) {
      shadowBodies[state.targetIndex].x += 0.001;
      shadowBodies[state.targetIndex].vy += 0.0001;
      targetInitialSeparation = Math.hypot(shadowBodies[state.targetIndex].x - bodies[state.targetIndex].x, shadowBodies[state.targetIndex].y - bodies[state.targetIndex].y, shadowBodies[state.targetIndex].vx - bodies[state.targetIndex].vx, shadowBodies[state.targetIndex].vy - bodies[state.targetIndex].vy);
    }
    previousShadowSample = null;
  }

  function stepFrame(dt) {
    const stats = {};
    stepSystem(bodies, {
      integrator: state.integrator,
      dt,
      G: state.G,
      softening: state.softening,
      collision: state.collision,
      forceModel: getForceModel(),
      accelerationMethod: state.integrator === 'barnes-hut' ? 'barnes-hut' : 'pairwise',
      adaptiveTolerance: state.adaptiveTolerance,
      stats
    });
    const shadowStats = {};
    stepSystem(shadowBodies, {
      integrator: state.integrator,
      dt,
      G: state.G,
      softening: state.softening,
      collision: state.collision,
      forceModel: getForceModel(),
      accelerationMethod: state.integrator === 'barnes-hut' ? 'barnes-hut' : 'pairwise',
      adaptiveTolerance: state.adaptiveTolerance,
      stats: shadowStats
    });
    state.lastStepStats = stats;
    for (const body of bodies) pushTrail(body);
  }

  function advanceSimulation() {
    const substeps = state.integrator === 'rk45' ? 1 : (state.adaptive ? recommendedSubsteps(bodies, { dt: state.dt, softening: state.softening, aggressiveness: state.adaptiveStrength }) : 1);
    const stepDt = state.dt / substeps;
    for (let i = 0; i < substeps; i++) {
      stepFrame(stepDt);
      state.time += stepDt;
      state.frame += 1;
      state.pristine = false;
      if (state.frame % 3 === 0) {
        updateAnalysis();
        sampleMetrics();
        updateUI();
        simulationLog.push({ frame: state.frame, time: state.time, integrator: state.integrator, bodyCount: bodies.length, drift: state.energyDrift, energy: computeTotalEnergy(bodies, { G: state.G, softening: state.softening }), momentum: computeMomentum(bodies), angularMomentum: computeAngularMomentum(bodies), closestApproach: state.closestApproach, maxSpeed: state.maxSpeed, stepError: state.lastStepStats.maxError || 0 });
        if (simulationLog.length > 2500) simulationLog.shift();
      }
    }
    if (state.frame % 3 !== 0) {
      updateAnalysis();
      sampleMetrics();
      updateUI();
    }
  }

  function exportCsv() {
    const headers = ['frame', 'time', 'integrator', 'bodyCount', 'energyDriftPercent', 'energy', 'momentum', 'angularMomentum', 'closestApproach', 'maxSpeed', 'stepError'];
    const rows = simulationLog.map((entry) => [entry.frame, entry.time.toFixed(6), entry.integrator, entry.bodyCount, entry.drift.toFixed(6), entry.energy.toFixed(6), entry.momentum.toFixed(6), entry.angularMomentum.toFixed(6), entry.closestApproach.toFixed(6), entry.maxSpeed.toFixed(6), (entry.stepError || 0).toExponential(6)].join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orbital_lab_data.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function savePng() {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'orbital_lab_snapshot.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function runBenchmark() {
    const results = benchmarkIntegrators(cloneBodies(bodies), { steps: 900, dt: state.dt, G: state.G, softening: state.softening, forceModel: getForceModel() });
    const best = [...results].sort((a, b) => a.energyDriftPercent - b.energyDriftPercent)[0];
    state.benchmarkText = [summarizeBenchmark(results), '', `Best overall conservation in this run: ${best.integrator}`].join('\n');
    updateUI();
  }

  function applyControls() {
    state.G = Number(els.g.value);
    state.dt = Number(els.dt.value);
    state.centralMass = Number(els.mass.value);
    state.trailLength = Number(els.trail.value);
    state.softening = Number(els.softening.value);
    state.zoom = Number(els.zoom.value);
    state.seed = els.seed.value.trim() || 't5-admissions';
    state.adaptive = els.adaptive.checked;
    state.adaptiveStrength = Number(els.adaptiveStrength.value);
    state.adaptiveTolerance = Number(document.getElementById('adaptiveTolerance')?.value || state.adaptiveTolerance);
    state.showTrails = els.showTrails.checked;
    state.showVectors = els.showVectors.checked;
    state.showLabels = els.showLabels.checked;
    state.j2Enabled = Boolean(document.getElementById('j2Enabled')?.checked);
    state.j2Strength = Number(document.getElementById('j2Strength')?.value || state.j2Strength);
    state.j2Radius = Number(document.getElementById('j2Radius')?.value || state.j2Radius);
    state.dragEnabled = Boolean(document.getElementById('dragEnabled')?.checked);
    state.dragStrength = Number(document.getElementById('dragStrength')?.value || state.dragStrength);
    state.dragScaleHeight = Number(document.getElementById('dragScaleHeight')?.value || state.dragScaleHeight);
    state.radiationEnabled = Boolean(document.getElementById('radiationEnabled')?.checked);
    state.radiationStrength = Number(document.getElementById('radiationStrength')?.value || state.radiationStrength);
    state.postNewtonianEnabled = Boolean(document.getElementById('postNewtonianEnabled')?.checked);
    state.postNewtonianStrength = Number(document.getElementById('postNewtonianStrength')?.value || state.postNewtonianStrength);
    state.referenceMode = document.getElementById('referenceMode')?.value || state.referenceMode;
    state.referenceIndex = Number(document.getElementById('referenceIndex')?.value || state.referenceIndex);
    state.targetIndex = Number(document.getElementById('targetIndex')?.value || state.targetIndex);
    if (bodies.length) applyCentralMass();
    updateAnalysis();
    updateUI();
  }

  function resetAll() {
    els.g.value = '1';
    els.dt.value = '0.02';
    els.mass.value = '9000';
    els.trail.value = '90';
    els.softening.value = '25';
    els.zoom.value = '1';
    els.seed.value = 't5-admissions';
    els.adaptive.checked = true;
    els.adaptiveStrength.value = '1.2';
    els.integrator.value = 'symplectic';
    els.collision.value = 'none';
    els.preset.value = 'default';
    els.showTrails.checked = true;
    els.showVectors.checked = false;
    els.showLabels.checked = true;
    for (const id of ['j2Enabled', 'dragEnabled', 'radiationEnabled', 'postNewtonianEnabled']) {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    }
    state.preset = 'default';
    state.integrator = 'symplectic';
    state.collision = 'none';
    state.running = true;
    state.benchmarkText = 'Press “Run Benchmark” to compare all integrators on the current initial conditions.';
    initializeSystem('default');
    applyControls();
  }

  function randomizeSystem() {
    els.preset.value = 'chaos';
    els.seed.value = makeRandomSeed();
    state.preset = 'chaos';
    initializeSystem('chaos');
    applyControls();
  }

  function setPreset(name) {
    state.preset = name;
    initializeSystem(name);
    applyControls();
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const point = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    dragState.dragging = true;
    dragState.start = point;
    dragState.point = point;
    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragState.dragging) return;
    const rect = canvas.getBoundingClientRect();
    dragState.point = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  function onPointerUp(event) {
    if (!dragState.dragging || !dragState.start || !dragState.point) return;
    const dx = dragState.point.x - dragState.start.x;
    const dy = dragState.point.y - dragState.start.y;
    const newBody = new Body(dragState.start.x, dragState.start.y, dx / 20, dy / 20, 10, 4, colors[bodies.length % colors.length], false, `Spawn ${bodies.length + 1}`, 'spawn');
    bodies.push(newBody);
    shadowBodies.push(new Body(newBody.x, newBody.y, newBody.vx, newBody.vy, newBody.mass, newBody.radius, newBody.color, false, newBody.label, newBody.type));
    pushTrail(newBody);
    dragState.dragging = false;
    dragState.start = null;
    dragState.point = null;
    state.pristine = false;
    captureEnergyBaseline();
    syncBodySelects();
    updateAnalysis();
    updateUI();
    canvas.releasePointerCapture?.(event.pointerId);
  }

  function onWheel(event) {
    event.preventDefault();
    const next = Math.min(2.5, Math.max(0.35, state.zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
    state.zoom = next;
    els.zoom.value = String(next);
    applyControls();
  }

  function loop() {
    if (state.running) advanceSimulation();
    render();
    requestAnimationFrame(loop);
  }

  ensureAdvancedUI();
  syncBodySelects();

  els.toggle.addEventListener('click', () => { state.running = !state.running; updateUI(); });
  els.reset.addEventListener('click', resetAll);
  els.randomize.addEventListener('click', randomizeSystem);
  els.exportCsv.addEventListener('click', exportCsv);
  els.exportPng.addEventListener('click', savePng);
  els.benchmark.addEventListener('click', runBenchmark);
  els.preset.addEventListener('change', (e) => setPreset(e.target.value));
  els.integrator.addEventListener('change', (e) => { state.integrator = e.target.value; updateUI(); });
  els.collision.addEventListener('change', (e) => { state.collision = e.target.value; updateUI(); });
  [els.g, els.dt, els.mass, els.trail, els.softening, els.zoom, els.seed, els.adaptiveStrength].forEach((input) => input.addEventListener('input', applyControls));
  [els.adaptive, els.showTrails, els.showVectors, els.showLabels].forEach((input) => input.addEventListener('change', applyControls));
  ['j2Enabled', 'dragEnabled', 'radiationEnabled', 'postNewtonianEnabled', 'referenceMode', 'referenceIndex', 'targetIndex', 'adaptiveTolerance', 'j2Strength', 'j2Radius', 'dragStrength', 'dragScaleHeight', 'radiationStrength', 'postNewtonianStrength'].forEach((id) => document.getElementById(id)?.addEventListener('input', applyControls));
  ['j2Enabled', 'dragEnabled', 'radiationEnabled', 'postNewtonianEnabled', 'referenceMode', 'referenceIndex', 'targetIndex'].forEach((id) => document.getElementById(id)?.addEventListener('change', applyControls));
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', () => { dragState.dragging = false; dragState.start = null; dragState.point = null; });
  canvas.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('keydown', (event) => {
    if (event.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
    if (event.code === 'Space') {
      event.preventDefault();
      state.running = !state.running;
      updateUI();
    } else if (event.key.toLowerCase() === 'r') {
      resetAll();
    } else if (event.key.toLowerCase() === 'e') {
      exportCsv();
    } else if (event.key.toLowerCase() === 'p') {
      savePng();
    } else if (event.key.toLowerCase() === 'b') {
      runBenchmark();
    }
  });

  window.__orbitalLab = {
    ...(window.__orbitalLab || {}),
    getSnapshot,
    getDiagnostics: collectDiagnostics,
    applySnapshot
  };

  initializeSystem('default');
  applyControls();
  resize();
  updateUI();
  window.addEventListener('resize', () => { resize(); updateUI(); });
  const resizeObserver = new ResizeObserver(() => { resize(); updateUI(); });
  resizeObserver.observe(canvas);
  loop();
})();
