import {
  buildPreset,
  benchmarkIntegrators,
  cloneBodies,
  computeAngularMomentum,
  computeCenterOfMass,
  computeClosestApproach,
  computeMaxSpeed,
  computeMomentum,
  orbitalElements,
  recommendedSubsteps,
  stepSystem,
  summarizeBenchmark,
  computeTotalEnergy
} from './physics-core.mjs';

(() => {
  'use strict';

  const canvas = document.getElementById('space');
  const ctx = canvas.getContext('2d', { alpha: false });

  const el = {
    toggle: document.getElementById('toggle'),
    reset: document.getElementById('reset'),
    randomize: document.getElementById('randomize'),
    exportCsv: document.getElementById('exportCsv'),
    exportPng: document.getElementById('exportPng'),
    benchmark: document.getElementById('benchmark'),
    preset: document.getElementById('preset'),
    integrator: document.getElementById('integrator'),
    collision: document.getElementById('collision'),
    g: document.getElementById('g'),
    dt: document.getElementById('dt'),
    mass: document.getElementById('mass'),
    trail: document.getElementById('trail'),
    softening: document.getElementById('softening'),
    zoom: document.getElementById('zoom'),
    seed: document.getElementById('seed'),
    adaptive: document.getElementById('adaptive'),
    adaptiveStrength: document.getElementById('adaptiveStrength'),
    showTrails: document.getElementById('showTrails'),
    showVectors: document.getElementById('showVectors'),
    showLabels: document.getElementById('showLabels'),
    gOut: document.getElementById('gOut'),
    dtOut: document.getElementById('dtOut'),
    massOut: document.getElementById('massOut'),
    trailOut: document.getElementById('trailOut'),
    softOut: document.getElementById('softOut'),
    zoomOut: document.getElementById('zoomOut'),
    adaptiveOut: document.getElementById('adaptiveOut'),
    bodiesOut: document.getElementById('bodiesOut'),
    timeOut: document.getElementById('timeOut'),
    energyOut: document.getElementById('energyOut'),
    momentumOut: document.getElementById('momentumOut'),
    angularOut: document.getElementById('angularOut'),
    comOut: document.getElementById('comOut'),
    closestOut: document.getElementById('closestOut'),
    speedOut: document.getElementById('speedOut'),
    semimajorOut: document.getElementById('semimajorOut'),
    eccentricityOut: document.getElementById('eccentricityOut'),
    periodOut: document.getElementById('periodOut'),
    periapsisOut: document.getElementById('periapsisOut'),
    apoapsisOut: document.getElementById('apoapsisOut'),
    escapeOut: document.getElementById('escapeOut'),
    specificEnergyOut: document.getElementById('specificEnergyOut'),
    status: document.getElementById('status'),
    statusDetail: document.getElementById('statusDetail'),
    hudTime: document.getElementById('hudTime'),
    benchmarkOut: document.getElementById('benchmarkOut')
  };

  const colors = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#b8f2e6', '#c77dff'];
  const starField = Array.from({ length: 120 }, (_, i) => ({ x: ((i * 37) % 100) / 100, y: ((i * 73) % 100) / 100, r: 0.3 + (i % 5) * 0.22, a: 0.08 + (i % 7) * 0.03 }));

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
    showTrails: true,
    showVectors: false,
    showLabels: true,
    time: 0,
    frame: 0,
    pristine: true,
    dragging: false,
    dragStart: null,
    dragPoint: null,
    initialEnergy: 0,
    energyDrift: 0,
    closestApproach: 0,
    maxSpeed: 0,
    orbit: null,
    benchmarkText: 'Press “Run Benchmark” to compare all integrators on the current initial conditions.'
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let bodies = [];
  let energyHistory = [];
  let phaseSpaceHistory = [];
  let simulationLog = [];

  function makeRandomSeed() {
    const bytes = new Uint32Array(2);
    crypto.getRandomValues(bytes);
    return `${bytes[0].toString(36)}-${bytes[1].toString(36)}`;
  }

  function initializeSystem(name = state.preset) {
    bodies = buildPreset(name, { G: state.G, centralMass: state.centralMass, seed: state.seed });
    applyCentralMass();
    state.pristine = true;
    state.time = 0;
    state.frame = 0;
    energyHistory = [];
    phaseSpaceHistory = [];
    simulationLog = [];
    captureEnergyBaseline();
    updateOrbitalMetrics();
    sampleMetrics();
    updateUI();
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

  function captureEnergyBaseline() {
    state.initialEnergy = computeTotalEnergy(bodies, { G: state.G, softening: state.softening });
    state.energyDrift = 0;
  }

  function pickOrbitalPair() {
    const primary = bodies.find((b) => b.fixed) || bodies.slice().sort((a, b) => b.mass - a.mass)[0];
    const target = bodies.find((b) => b !== primary && !b.fixed) || bodies.find((b) => b !== primary);
    return primary && target ? { primary, target } : null;
  }

  function updateOrbitalMetrics() {
    const pair = pickOrbitalPair();
    state.orbit = pair ? orbitalElements(pair.target, pair.primary, { G: state.G }) : null;
  }

  function sampleMetrics() {
    const currentEnergy = computeTotalEnergy(bodies, { G: state.G, softening: state.softening });
    state.energyDrift = state.initialEnergy ? Math.abs((currentEnergy - state.initialEnergy) / state.initialEnergy) * 100 : 0;
    state.closestApproach = computeClosestApproach(bodies);
    state.maxSpeed = computeMaxSpeed(bodies);

    energyHistory.push(state.energyDrift);
    if (energyHistory.length > 180) energyHistory.shift();

    const moving = bodies.find((b) => !b.fixed);
    if (moving) {
      phaseSpaceHistory.push({ x: moving.x, vx: moving.vx });
      if (phaseSpaceHistory.length > 120) phaseSpaceHistory.shift();
    }

    updateOrbitalMetrics();
  }

  function recordLog() {
    simulationLog.push({
      frame: state.frame,
      time: state.time,
      integrator: state.integrator,
      drift: state.energyDrift,
      bodyCount: bodies.length,
      energy: computeTotalEnergy(bodies, { G: state.G, softening: state.softening }),
      momentum: computeMomentum(bodies),
      angularMomentum: computeAngularMomentum(bodies),
      closestApproach: state.closestApproach,
      maxSpeed: state.maxSpeed
    });
    if (simulationLog.length > 2500) simulationLog.shift();
  }

  function pushTrail(body) {
    body.trail.push([body.x, body.y]);
    if (body.trail.length > state.trailLength) body.trail.shift();
  }

  function stepFrame(dt) {
    stepSystem(bodies, {
      integrator: state.integrator,
      dt,
      G: state.G,
      softening: state.softening,
      collision: state.collision
    });
    for (const body of bodies) pushTrail(body);
  }

  function advanceSimulation() {
    const substeps = state.adaptive
      ? recommendedSubsteps(bodies, { dt: state.dt, softening: state.softening, aggressiveness: state.adaptiveStrength })
      : 1;

    const stepDt = state.dt / substeps;
    for (let i = 0; i < substeps; i++) {
      stepFrame(stepDt);
      state.time += stepDt;
      state.frame += 1;
      state.pristine = false;
      if (state.frame % 3 === 0) {
        sampleMetrics();
        recordLog();
      }
    }

    if (state.frame % 3 !== 0) {
      sampleMetrics();
      recordLog();
    }
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
    if (!state.dragging || !state.dragStart || !state.dragPoint) return;
    const a = worldToScreen(state.dragStart);
    const b = worldToScreen(state.dragPoint);
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
    ctx.fillText(`launch speed ≈ ${(Math.hypot(state.dragPoint.x - state.dragStart.x, state.dragPoint.y - state.dragStart.y) / 20).toFixed(2)}`, b.x + 10, b.y - 10);
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
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minV = Math.min(...vs);
      const maxV = Math.max(...vs);
      const spanX = Math.max(maxX - minX, 1e-6);
      const spanV = Math.max(maxV - minV, 1e-6);
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

  function formatFinite(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : '—';
  }

  function updateUI() {
    const com = computeCenterOfMass(bodies);
    const momentum = computeMomentum(bodies);
    const angular = computeAngularMomentum(bodies);
    el.gOut.textContent = state.G.toFixed(2);
    el.dtOut.textContent = state.dt.toFixed(3);
    el.massOut.textContent = Math.round(state.centralMass);
    el.trailOut.textContent = String(state.trailLength);
    el.softOut.textContent = String(state.softening);
    el.zoomOut.textContent = `${state.zoom.toFixed(2)}×`;
    el.adaptiveOut.textContent = state.adaptive ? `${state.adaptiveStrength.toFixed(1)}×` : 'off';
    el.bodiesOut.textContent = String(bodies.length);
    el.timeOut.textContent = state.time.toFixed(2);
    el.hudTime.textContent = state.time.toFixed(2);
    el.energyOut.textContent = `${state.energyDrift.toFixed(4)}%`;
    el.momentumOut.textContent = momentum.toFixed(2);
    el.angularOut.textContent = angular.toFixed(2);
    el.comOut.textContent = `${com.x.toFixed(1)}, ${com.y.toFixed(1)}`;
    el.closestOut.textContent = state.closestApproach.toFixed(2);
    el.speedOut.textContent = state.maxSpeed.toFixed(2);
    el.status.textContent = state.running ? 'Running' : 'Paused';
    el.statusDetail.textContent = `${({ euler: 'Euler', symplectic: 'Symplectic Euler', verlet: 'Velocity Verlet', rk4: 'RK4' }[state.integrator] || state.integrator)} · ${state.preset === 'chaos' ? `Seeded random (${state.seed})` : state.preset}`;
    el.toggle.textContent = state.running ? 'Pause' : 'Play';

    const orbit = state.orbit;
    el.semimajorOut.textContent = orbit ? formatFinite(orbit.semiMajorAxis, 1) : '—';
    el.eccentricityOut.textContent = orbit ? formatFinite(orbit.eccentricity, 4) : '—';
    el.periodOut.textContent = orbit ? formatFinite(orbit.orbitalPeriod, 1) : '—';
    el.periapsisOut.textContent = orbit ? formatFinite(orbit.periapsis, 1) : '—';
    el.apoapsisOut.textContent = orbit ? formatFinite(orbit.apoapsis, 1) : '—';
    el.escapeOut.textContent = orbit ? formatFinite(orbit.escapeSpeed, 2) : '—';
    el.specificEnergyOut.textContent = orbit ? formatFinite(orbit.specificEnergy, 4) : '—';
    el.benchmarkOut.textContent = state.benchmarkText;
  }

  function applyControls() {
    state.G = Number(el.g.value);
    state.dt = Number(el.dt.value);
    state.centralMass = Number(el.mass.value);
    state.trailLength = Number(el.trail.value);
    state.softening = Number(el.softening.value);
    state.zoom = Number(el.zoom.value);
    state.seed = el.seed.value.trim() || 't5-admissions';
    state.adaptive = el.adaptive.checked;
    state.adaptiveStrength = Number(el.adaptiveStrength.value);
    state.showTrails = el.showTrails.checked;
    state.showVectors = el.showVectors.checked;
    state.showLabels = el.showLabels.checked;
    if (bodies.length) applyCentralMass();
    updateUI();
  }

  function resetAll() {
    el.g.value = '1';
    el.dt.value = '0.02';
    el.mass.value = '9000';
    el.trail.value = '90';
    el.softening.value = '25';
    el.zoom.value = '1';
    el.seed.value = 't5-admissions';
    el.adaptive.checked = true;
    el.adaptiveStrength.value = '1.2';
    el.integrator.value = 'symplectic';
    el.collision.value = 'none';
    el.preset.value = 'default';
    el.showTrails.checked = true;
    el.showVectors.checked = false;
    el.showLabels.checked = true;
    state.preset = 'default';
    state.integrator = 'symplectic';
    state.collision = 'none';
    state.running = true;
    state.benchmarkText = 'Press “Run Benchmark” to compare all integrators on the current initial conditions.';
    initializeSystem('default');
    applyControls();
  }

  function randomizeSystem() {
    el.preset.value = 'chaos';
    el.seed.value = makeRandomSeed();
    state.preset = 'chaos';
    initializeSystem('chaos');
    applyControls();
  }

  function setPreset(name) {
    state.preset = name;
    initializeSystem(name);
    applyControls();
  }

  function exportCsv() {
    const headers = ['frame', 'time', 'integrator', 'bodyCount', 'energyDriftPercent', 'energy', 'momentum', 'angularMomentum', 'closestApproach', 'maxSpeed'];
    const rows = simulationLog.map((entry) => [entry.frame, entry.time.toFixed(6), entry.integrator, entry.bodyCount, entry.drift.toFixed(6), entry.energy.toFixed(6), entry.momentum.toFixed(6), entry.angularMomentum.toFixed(6), entry.closestApproach.toFixed(6), entry.maxSpeed.toFixed(6)].join(','));
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
    const results = benchmarkIntegrators(cloneBodies(bodies), {
      steps: 900,
      dt: state.dt,
      G: state.G,
      softening: state.softening
    });
    const best = [...results].sort((a, b) => a.energyDriftPercent - b.energyDriftPercent)[0];
    state.benchmarkText = [summarizeBenchmark(results), ``, `Best overall conservation in this run: ${best.integrator}`].join('\n');
    updateUI();
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const point = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    state.dragging = true;
    state.dragStart = point;
    state.dragPoint = point;
    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!state.dragging) return;
    const rect = canvas.getBoundingClientRect();
    state.dragPoint = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  function onPointerUp(event) {
    if (!state.dragging || !state.dragStart || !state.dragPoint) return;
    const dx = state.dragPoint.x - state.dragStart.x;
    const dy = state.dragPoint.y - state.dragStart.y;
    const newBody = new Body(state.dragStart.x, state.dragStart.y, dx / 20, dy / 20, 10, 4, colors[bodies.length % colors.length], false, `Spawn ${bodies.length + 1}`, 'spawn');
    bodies.push(newBody);
    pushTrail(newBody);
    state.dragging = false;
    state.dragStart = null;
    state.dragPoint = null;
    state.pristine = false;
    captureEnergyBaseline();
    updateOrbitalMetrics();
    updateUI();
    canvas.releasePointerCapture?.(event.pointerId);
  }

  function onWheel(event) {
    event.preventDefault();
    const next = Math.min(2.5, Math.max(0.35, state.zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
    state.zoom = next;
    el.zoom.value = String(next);
    applyControls();
  }

  function loop() {
    if (state.running) advanceSimulation();
    render();
    requestAnimationFrame(loop);
  }

  el.toggle.addEventListener('click', () => { state.running = !state.running; updateUI(); });
  el.reset.addEventListener('click', resetAll);
  el.randomize.addEventListener('click', randomizeSystem);
  el.exportCsv.addEventListener('click', exportCsv);
  el.exportPng.addEventListener('click', savePng);
  el.benchmark.addEventListener('click', runBenchmark);
  el.preset.addEventListener('change', (e) => setPreset(e.target.value));
  el.integrator.addEventListener('change', (e) => { state.integrator = e.target.value; updateUI(); });
  el.collision.addEventListener('change', (e) => { state.collision = e.target.value; updateUI(); });
  [el.g, el.dt, el.mass, el.trail, el.softening, el.zoom, el.seed, el.adaptiveStrength].forEach((input) => input.addEventListener('input', applyControls));
  [el.adaptive, el.showTrails, el.showVectors, el.showLabels].forEach((input) => input.addEventListener('change', applyControls));
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', () => { state.dragging = false; state.dragStart = null; state.dragPoint = null; });
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

  const resizeObserver = new ResizeObserver(() => { resize(); updateUI(); });
  resizeObserver.observe(canvas);
  window.addEventListener('resize', resize);

  initializeSystem('default');
  applyControls();
  resize();
  updateUI();
  loop();
})();
