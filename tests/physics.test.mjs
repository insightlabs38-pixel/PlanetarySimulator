import assert from 'node:assert/strict';
import {
  Body,
  benchmarkIntegrators,
  buildPreset,
  computeAngularMomentum,
  computeCenterOfMass,
  computeClosestApproach,
  computeMomentum,
  computeSystemOrbitalAnalytics,
  computeTotalEnergy,
  createSeededRng,
  getPrecisionSummary,
  orbitalElements,
  recommendedSubsteps,
  stepSystem,
  summarizeBenchmark
} from '../physics-core-precision.mjs';
import { bootstrapAccelerationBackend } from '../webgpu-backend.mjs';

const rngA = createSeededRng('repeatable');
const rngB = createSeededRng('repeatable');
assert.equal(rngA(), rngB());
assert.equal(rngA(), rngB());

const chaos1 = buildPreset('chaos', { seed: 'alpha', G: 1, centralMass: 9000 });
const chaos2 = buildPreset('chaos', { seed: 'alpha', G: 1, centralMass: 9000 });
assert.deepEqual(
  chaos1.map(({ x, y, vx, vy, mass }) => [x, y, vx, vy, mass]),
  chaos2.map(({ x, y, vx, vy, mass }) => [x, y, vx, vy, mass])
);

const resonant = buildPreset('resonant', { centralMass: 9000 });
assert.equal(resonant.length, 4);
assert.equal(resonant[0].fixed, true);
assert.match(resonant[1].label, /Resonant/i);
assert.match(resonant[2].label, /Resonant/i);

const star = new Body(0, 0, 0, 0, 10000, 18, '#fff', true, 'Star', 'star');
const planet = new Body(200, 0, 0, Math.sqrt(10010 / 200), 10, 5, '#6fb8ff', false, 'Planet', 'planet');
const elements = orbitalElements(planet, star, { G: 1 });
assert.ok(elements.eccentricity < 1e-9);
assert.ok(Math.abs(elements.semiMajorAxis - 200) < 1e-6);
assert.ok(Number.isFinite(elements.orbitalPeriod));

const system = [
  new Body(0, 0, 0, 0, 10000, 18, '#fff', true, 'Star', 'star'),
  new Body(200, 0, 0, Math.sqrt(10010 / 200), 10, 5, '#6fb8ff', false, 'Planet', 'planet')
];
const e0 = computeTotalEnergy(system, { G: 1 });
for (const integrator of ['euler', 'symplectic', 'verlet', 'yoshida4', 'rk4', 'rk45', 'ias15']) {
  const bodies = system.map((b) => new Body(b.x, b.y, b.vx, b.vy, b.mass, b.radius, b.color, b.fixed, b.label, b.type));
  const stats = {};
  for (let i = 0; i < 120; i++) {
    stepSystem(bodies, { integrator, dt: 0.02, G: 1, collision: 'none', stats, regularization: true });
  }
  const e1 = computeTotalEnergy(bodies, { G: 1 });
  assert.ok(Number.isFinite(e1));
  assert.ok(Number.isFinite(stats.maxError ?? 0));
  assert.ok((stats.acceptedSteps ?? 0) >= 1);
  assert.ok(Number.isFinite((e1 - e0) / e0));
}

const closeRegularized = [
  new Body(0, 0, 0, 0, 60, 4, '#fff', false, 'A', 'planet'),
  new Body(0.2, 0, 0, 0.1, 40, 4, '#6fb8ff', false, 'B', 'planet')
];
stepSystem(closeRegularized, { integrator: 'yoshida4', dt: 0.01, G: 1, collision: 'none', regularization: true });
assert.ok(closeRegularized.every((body) => Number.isFinite(body.x) && Number.isFinite(body.y) && Number.isFinite(body.vx) && Number.isFinite(body.vy)));
assert.ok(getPrecisionSummary(closeRegularized[0]));

const manyBodies = buildPreset('chaos', { seed: 'barnes-hut', G: 1, centralMass: 9000 });
for (let i = 0; i < 20; i++) {
  stepSystem(manyBodies, {
    integrator: 'barnes-hut',
    dt: 0.01,
    G: 1,
    collision: 'none',
    forceModel: { j2Enabled: false, dragEnabled: false, radiationEnabled: false, postNewtonianEnabled: false },
    regularization: true
  });
}
assert.ok(Number.isFinite(computeTotalEnergy(manyBodies, { G: 1 })));

const perturbed = buildPreset('default', { G: 1, centralMass: 9000 });
stepSystem(perturbed, {
  integrator: 'rk45',
  dt: 0.02,
  G: 1,
  collision: 'none',
  forceModel: {
    j2Enabled: true,
    j2Strength: 0.001,
    j2Radius: 18,
    dragEnabled: true,
    dragStrength: 0.00001,
    dragScaleHeight: 140,
    dragDensity0: 0.0005,
    radiationEnabled: true,
    radiationStrength: 0.0001,
    postNewtonianEnabled: true,
    postNewtonianStrength: 0.0001
  },
  regularization: true
});
assert.ok(perturbed.every((body) => Number.isFinite(body.x) && Number.isFinite(body.y) && Number.isFinite(body.vx) && Number.isFinite(body.vy)));

const balanced = [
  new Body(-10, 0, 0, 1, 5, 3, '#fff', false, 'A', 'planet'),
  new Body(10, 0, 0, -1, 5, 3, '#6fb8ff', false, 'B', 'planet')
];
assert.equal(computeMomentum(balanced), 0);
assert.equal(computeAngularMomentum(balanced), -100);
const com = computeCenterOfMass(balanced);
assert.equal(com.x, 0);
assert.equal(com.y, 0);
assert.equal(com.totalMass, 10);
assert.equal(computeClosestApproach(balanced), 20);

const closePair = [
  new Body(0, 0, 0, 0, 5, 3, '#fff', false, 'A', 'planet'),
  new Body(5, 0, 0, 0, 5, 3, '#6fb8ff', false, 'B', 'planet')
];
const widePair = [
  new Body(0, 0, 0, 0, 5, 3, '#fff', false, 'A', 'planet'),
  new Body(50, 0, 0, 0, 5, 3, '#6fb8ff', false, 'B', 'planet')
];
assert.ok(recommendedSubsteps(closePair, { dt: 0.08, regularizationRadius: 2 }) >= recommendedSubsteps(widePair, { dt: 0.08, regularizationRadius: 2 }));

const analytics = computeSystemOrbitalAnalytics(system, { G: 1, referenceMode: 'primary' });
assert.ok(Array.isArray(analytics));
assert.ok(analytics.some((row) => row && row.resonanceRatio));

const benchmark = benchmarkIntegrators(system, { steps: 20, dt: 0.02, G: 1 });
assert.ok(benchmark.length >= 7);
assert.ok(benchmark.some((row) => row.integrator === 'rk4'));
assert.ok(benchmark.some((row) => row.integrator === 'rk45'));
assert.ok(benchmark.some((row) => row.integrator === 'yoshida4'));
assert.ok(benchmark.some((row) => row.integrator === 'ias15'));
assert.ok(benchmark.some((row) => row.integrator === 'barnes-hut'));
assert.ok(benchmark.every((row) => typeof row.runtimeMs === 'number'));
assert.match(summarizeBenchmark(benchmark), /Integrator benchmark summary/);

const backend = await bootstrapAccelerationBackend();
assert.ok(backend);
assert.ok(['wasm', 'webgpu'].includes(backend.kind));

console.log('advanced physics tests passed');
