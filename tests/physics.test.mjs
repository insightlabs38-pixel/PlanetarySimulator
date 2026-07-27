import assert from 'node:assert/strict';
import {
  Body,
  benchmarkIntegrators,
  buildPreset,
  createSeededRng,
  computeTotalEnergy,
  orbitalElements,
  stepSystem
} from '../physics-core.mjs';

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
const e0 = computeTotalEnergy(system, { G: 1, softening: 0.1 });
let eulerDrift = null;
for (const integrator of ['euler', 'symplectic', 'verlet', 'rk4']) {
  const bodies = system.map((b) => new Body(b.x, b.y, b.vx, b.vy, b.mass, b.radius, b.color, b.fixed, b.label, b.type));
  for (let i = 0; i < 400; i++) {
    stepSystem(bodies, { integrator, dt: 0.02, G: 1, softening: 0.1, collision: 'none' });
  }
  const e1 = computeTotalEnergy(bodies, { G: 1, softening: 0.1 });
  const drift = Math.abs((e1 - e0) / e0) * 100;
  if (integrator === 'euler') eulerDrift = drift;
  else assert.ok(drift <= eulerDrift + 0.05, `${integrator} drift ${drift} should not exceed Euler ${eulerDrift}`);
}

const benchmark = benchmarkIntegrators(system, { steps: 40, dt: 0.02, G: 1, softening: 0.1 });
assert.equal(benchmark.length, 4);
assert.ok(benchmark.every((row) => typeof row.runtimeMs === 'number'));

console.log('physics tests passed');
