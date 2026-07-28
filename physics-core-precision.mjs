import * as core from './physics-core-advanced.mjs';

const PRECISION_STATE = Symbol('orbitalLabPrecisionState');

function kahanAdd(sum, compensation, value) {
  const y = value - compensation;
  const t = sum + y;
  return { sum: t, compensation: (t - sum) - y };
}

function ensurePrecisionState(body) {
  if (!body[PRECISION_STATE]) {
    body[PRECISION_STATE] = {
      x: body.x,
      y: body.y,
      cx: 0,
      cy: 0,
      lastX: body.x,
      lastY: body.y,
      lowBitsX: 0,
      lowBitsY: 0
    };
  }
  return body[PRECISION_STATE];
}

function captureCoordinates(bodies) {
  const snapshot = new Map();
  for (const body of bodies) {
    snapshot.set(body, { x: body.x, y: body.y });
  }
  return snapshot;
}

function applyCompensation(bodies, previous) {
  for (const body of bodies) {
    if (body.fixed) continue;
    const state = ensurePrecisionState(body);
    const old = previous.get(body) || { x: state.lastX, y: state.lastY };
    const dx = body.x - old.x;
    const dy = body.y - old.y;
    const nextX = kahanAdd(state.x, state.cx, dx);
    const nextY = kahanAdd(state.y, state.cy, dy);
    state.x = nextX.sum;
    state.y = nextY.sum;
    state.cx = nextX.compensation;
    state.cy = nextY.compensation;
    state.lastX = body.x;
    state.lastY = body.y;
    state.lowBitsX = nextX.compensation;
    state.lowBitsY = nextY.compensation;
    body.x = state.x;
    body.y = state.y;
    body.__roundoff = { x: state.lowBitsX, y: state.lowBitsY };
  }
}

export const Body = core.Body;
export const createSeededRng = core.createSeededRng;
export const cloneBodies = core.cloneBodies;
export const buildPreset = core.buildPreset;
export const computeAccelerations = core.computeAccelerations;
export const computeTotalEnergy = core.computeTotalEnergy;
export const computeMomentum = core.computeMomentum;
export const computeAngularMomentum = core.computeAngularMomentum;
export const computeCenterOfMass = core.computeCenterOfMass;
export const computeClosestApproach = core.computeClosestApproach;
export const computeMaxSpeed = core.computeMaxSpeed;
export const orbitalElements = core.orbitalElements;
export const computeSystemOrbitalAnalytics = core.computeSystemOrbitalAnalytics;
export const summarizeBenchmark = core.summarizeBenchmark;
export const recommendedSubsteps = core.recommendedSubsteps;

export function stepSystem(bodies, options = {}) {
  const before = captureCoordinates(bodies);
  core.stepSystem(bodies, options);
  applyCompensation(bodies, before);
  return bodies;
}

export function benchmarkIntegrators(initialBodies, { steps = 1200, dt = 0.02, G = 1, forceModel = null, collision = 'none' } = {}) {
  const methods = ['euler', 'symplectic', 'verlet', 'yoshida4', 'rk4', 'rk45', 'ias15', 'barnes-hut'];
  const reference = cloneBodies(initialBodies);
  for (let i = 0; i < steps; i++) {
    stepSystem(reference, { integrator: 'ias15', dt, G, collision: 'none', forceModel, regularization: true });
  }
  const refPositions = reference.map((body) => ({ x: body.x, y: body.y }));
  const results = [];

  for (const integrator of methods) {
    const bodies = cloneBodies(initialBodies);
    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const stats = {};
    for (let i = 0; i < steps; i++) {
      stepSystem(bodies, { integrator, dt, G, collision, forceModel, stats, regularization: true });
    }
    const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const energy0 = computeTotalEnergy(initialBodies, { G });
    const energy1 = computeTotalEnergy(bodies, { G });
    const momentum0 = computeMomentum(initialBodies);
    const momentum1 = computeMomentum(bodies);
    const trajectoryError = Math.sqrt(bodies.reduce((sum, body, i) => sum + (body.x - refPositions[i].x) ** 2 + (body.y - refPositions[i].y) ** 2, 0) / Math.max(bodies.length, 1));
    results.push({
      integrator,
      runtimeMs: ended - started,
      energyDriftPercent: energy0 ? Math.abs((energy1 - energy0) / energy0) * 100 : 0,
      momentumDrift: Math.abs(momentum1 - momentum0),
      trajectoryError,
      acceptedSteps: stats.acceptedSteps || 0,
      rejectedSteps: stats.rejectedSteps || 0,
      maxError: stats.maxError || 0
    });
  }

  return results;
}

export function getPrecisionSummary(body) {
  const state = body?.[PRECISION_STATE];
  if (!state) return null;
  return { x: state.x, y: state.y, lowBitsX: state.lowBitsX, lowBitsY: state.lowBitsY };
}
