export class Body {
  constructor(x, y, vx, vy, mass, radius, color, fixed = false, label = '', type = 'body') {
    Object.assign(this, { x, y, vx, vy, mass, radius, color, fixed, label, type, trail: [] });
  }
}

const COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#b8f2e6', '#c77dff'];

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function seed() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function rng() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed = 'orbital-lab') {
  const seedFn = xmur3(String(seed));
  return mulberry32(seedFn());
}

export function cloneBodies(bodies) {
  return bodies.map((body) => ({
    x: body.x,
    y: body.y,
    vx: body.vx,
    vy: body.vy,
    mass: body.mass,
    radius: body.radius,
    color: body.color,
    fixed: !!body.fixed,
    label: body.label || '',
    type: body.type || 'body',
    trail: []
  }));
}

function defaultPreset(centralMass) {
  return [
    [0, 0, 0, 0, centralMass, 18, '#f5c542', true, 'Star', 'star'],
    [170, 0, 0, 0, 18, 7, '#6fb8ff', false, 'Planet A', 'planet'],
    [-255, 0, 0, 0, 9, 5, '#ec7da5', false, 'Planet B', 'planet'],
    [0, 310, 6.4, 0, 1.2, 3, '#b8f2e6', false, 'Probe', 'probe']
  ];
}

function binaryPreset() {
  return [
    [-90, 0, 0, 5.8, 7000, 16, '#ffd166', true, 'Primary', 'star'],
    [90, 0, 0, -5.8, 7000, 16, '#6fb8ff', true, 'Secondary', 'star'],
    [0, 210, -6.8, 0, 18, 5, '#b8f2e6', false, 'Planet', 'planet'],
    [0, -280, 5.2, 0, 1, 3, '#f72585', false, 'Comet', 'comet']
  ];
}

function solarPreset(centralMass) {
  return [
    [0, 0, 0, 0, centralMass, 18, '#f5c542', true, 'Sun', 'star'],
    [110, 0, 0, 10.447, 18, 5, '#6fb8ff', false, 'Mercury', 'planet'],
    [-170, 0, 0, -8.55, 22, 6, '#ffd166', false, 'Venus', 'planet'],
    [255, 0, 0, 6.45, 12, 5.5, '#4cc9f0', false, 'Earth', 'planet'],
    [275, 18, 1, 8.2, 2.5, 2.1, '#dfe8ff', false, 'Moon', 'moon'],
    [-360, 0, 0, -5.4, 7, 4, '#ec7da5', false, 'Mars', 'planet'],
    [480, 0, 0, 4.65, 38, 10, '#c77dff', false, 'Jupiter', 'planet']
  ];
}

function earthMoonPreset() {
  return [
    [0, 0, 0, 0, 14000, 18, '#f5c542', true, 'Earth', 'star'],
    [140, 0, 0, 8.6, 30, 8, '#6fb8ff', false, 'Moon', 'moon'],
    [0, 310, 7.3, 0, 0.3, 2.5, '#ffd166', false, 'Satellite', 'probe'],
    [-320, -130, 1.6, -2.6, 2, 3.5, '#f72585', false, 'Asteroid', 'asteroid']
  ];
}

function jovianPreset() {
  return [
    [0, 0, 0, 0, 16000, 18, '#f5c542', true, 'Jupiter', 'star'],
    [115, 0, 0, 10.6, 24, 8.2, '#ffd166', false, 'Io', 'moon'],
    [165, 0, 0, 8.5, 18, 7.2, '#6fb8ff', false, 'Europa', 'moon'],
    [220, 0, 0, 6.9, 20, 7.8, '#b8f2e6', false, 'Ganymede', 'moon'],
    [280, 0, 0, 5.6, 22, 8, '#c77dff', false, 'Callisto', 'moon'],
    [-410, 120, 1.2, -4.8, 1.2, 3, '#f72585', false, 'Comet', 'comet']
  ];
}

function figure8Preset() {
  return [
    [-100, 0, 0.35, 0.53, 3000, 12, '#ff6b6b', false, 'Body 1', 'planet'],
    [100, 0, 0.35, 0.53, 3000, 12, '#6fb8ff', false, 'Body 2', 'planet'],
    [0, 0, -0.7, -1.06, 3000, 12, '#ffd166', false, 'Body 3', 'planet']
  ];
}

function chaosPreset({ G = 1, centralMass = 10000, seed = 'orbital-lab' } = {}) {
  const rng = createSeededRng(seed);
  const system = [[0, 0, 0, 0, centralMass, 18, '#f5c542', true, 'Seed Star', 'star']];
  const labels = ['Planet', 'Moon', 'Comet', 'Asteroid', 'Probe', 'Dwarf', 'Body'];

  for (let i = 0; i < 8; i++) {
    const radius = 95 + rng() * 430;
    const angle = rng() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const mass = 1.5 + rng() * 28;
    const orbitalSpeed = Math.sqrt((G * centralMass) / Math.max(radius, 1));
    const tangential = rng() > 0.5 ? 1 : -1;
    const type = i % 3 === 0 ? 'comet' : i % 2 === 0 ? 'asteroid' : 'planet';
    system.push([
      x,
      y,
      -Math.sin(angle) * orbitalSpeed * tangential,
      Math.cos(angle) * orbitalSpeed * tangential,
      mass,
      3.5 + rng() * 4.5,
      COLORS[i % COLORS.length],
      false,
      `${labels[i % labels.length]} ${i + 1}`,
      type
    ]);
  }

  return system;
}

export function buildPreset(name, options = {}) {
  const { G = 1, centralMass = 9000, seed = 'orbital-lab' } = options;
  const raw = ({
    default: () => defaultPreset(centralMass),
    binary: binaryPreset,
    solar: () => solarPreset(centralMass),
    earthMoon: earthMoonPreset,
    jovian: jovianPreset,
    figure8: figure8Preset,
    chaos: () => chaosPreset({ G, centralMass, seed })
  }[name] || (() => defaultPreset(centralMass)))();

  return raw.map((tuple) => {
    const [x, y, vx, vy, mass, radius, color, fixed, label, type] = tuple;
    return new Body(x, y, vx, vy, mass, radius, color, fixed, label, type);
  });
}

export function computeAccelerations(bodies, { G = 1, softening = 25 } = {}) {
  const acc = bodies.map(() => ({ x: 0, y: 0 }));
  const eps2 = softening * softening;

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy + eps2;
      const d = Math.sqrt(d2);
      const scale = G / (d2 * d);

      if (!a.fixed) {
        acc[i].x += scale * b.mass * dx;
        acc[i].y += scale * b.mass * dy;
      }
      if (!b.fixed) {
        acc[j].x -= scale * a.mass * dx;
        acc[j].y -= scale * a.mass * dy;
      }
    }
  }

  return acc;
}

export function computeTotalEnergy(bodies, { G = 1, softening = 25 } = {}) {
  let total = 0;
  const eps2 = softening * softening;

  for (const b of bodies) {
    total += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy + eps2);
      total -= (G * a.mass * b.mass) / d;
    }
  }

  return total;
}

export function computeMomentum(bodies) {
  let px = 0;
  let py = 0;
  for (const b of bodies) {
    px += b.mass * b.vx;
    py += b.mass * b.vy;
  }
  return Math.hypot(px, py);
}

export function computeAngularMomentum(bodies) {
  let total = 0;
  for (const b of bodies) total += b.mass * (b.x * b.vy - b.y * b.vx);
  return total;
}

export function computeCenterOfMass(bodies) {
  const totalMass = bodies.reduce((sum, body) => sum + body.mass, 0) || 1;
  return {
    x: bodies.reduce((sum, body) => sum + body.mass * body.x, 0) / totalMass,
    y: bodies.reduce((sum, body) => sum + body.mass * body.y, 0) / totalMass,
    totalMass
  };
}

export function computeClosestApproach(bodies) {
  let min = Infinity;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      min = Math.min(min, Math.hypot(bodies[j].x - bodies[i].x, bodies[j].y - bodies[i].y));
    }
  }
  return Number.isFinite(min) ? min : 0;
}

export function computeMaxSpeed(bodies) {
  let max = 0;
  for (const b of bodies) max = Math.max(max, Math.hypot(b.vx, b.vy));
  return max;
}

export function orbitalElements(body, primary, { G = 1 } = {}) {
  const dx = body.x - primary.x;
  const dy = body.y - primary.y;
  const dvx = body.vx - primary.vx;
  const dvy = body.vy - primary.vy;
  const r = Math.hypot(dx, dy);
  const v2 = dvx * dvx + dvy * dvy;
  const mu = G * (body.mass + primary.mass);
  const h = dx * dvy - dy * dvx;
  const specificEnergy = 0.5 * v2 - mu / Math.max(r, 1e-9);
  const ex = (dvy * h) / mu - dx / r;
  const ey = (-dvx * h) / mu - dy / r;
  const eccentricity = Math.hypot(ex, ey);
  const semiMajorAxis = specificEnergy < 0 ? -mu / (2 * specificEnergy) : Infinity;
  const orbitalPeriod = specificEnergy < 0 ? 2 * Math.PI * Math.sqrt((semiMajorAxis ** 3) / mu) : Infinity;
  const periapsis = Number.isFinite(semiMajorAxis) ? semiMajorAxis * (1 - eccentricity) : Infinity;
  const apoapsis = Number.isFinite(semiMajorAxis) ? semiMajorAxis * (1 + eccentricity) : Infinity;
  const escapeSpeed = Math.sqrt((2 * mu) / Math.max(r, 1e-9));

  return {
    r,
    v: Math.sqrt(v2),
    specificEnergy,
    eccentricity,
    semiMajorAxis,
    orbitalPeriod,
    periapsis,
    apoapsis,
    escapeSpeed
  };
}

export function recommendedSubsteps(bodies, { dt = 0.02, softening = 25, maxSubsteps = 24, aggressiveness = 1.2 } = {}) {
  const closest = Math.max(computeClosestApproach(bodies), softening * 0.6, 1e-6);
  const dynamicScale = Math.max(1, Math.ceil((aggressiveness * dt * 55) / closest));
  return Math.min(maxSubsteps, Math.max(1, dynamicScale));
}

function resolveCollisions(bodies, mode) {
  if (mode === 'none') return bodies;

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = a.radius + b.radius;
      if (distance >= minDistance) continue;

      if (mode === 'merge') {
        const survivor = a.mass >= b.mass ? a : b;
        const absorbed = survivor === a ? b : a;
        const totalMass = survivor.mass + absorbed.mass;
        survivor.vx = (survivor.mass * survivor.vx + absorbed.mass * absorbed.vx) / totalMass;
        survivor.vy = (survivor.mass * survivor.vy + absorbed.mass * absorbed.vy) / totalMass;
        survivor.mass = totalMass;
        survivor.radius = Math.max(2, Math.sqrt(survivor.radius * survivor.radius + absorbed.radius * absorbed.radius) * 1.05);
        bodies.splice(bodies.indexOf(absorbed), 1);
        i = -1;
        break;
      }

      if (mode === 'bounce') {
        const d = Math.max(distance, 1e-6);
        const nx = dx / d;
        const ny = dy / d;
        const rvx = a.vx - b.vx;
        const rvy = a.vy - b.vy;
        const approach = rvx * nx + rvy * ny;
        if (approach < 0) {
          const impulse = (2 * approach) / (a.mass + b.mass);
          if (!a.fixed) {
            a.vx -= impulse * b.mass * nx;
            a.vy -= impulse * b.mass * ny;
          }
          if (!b.fixed) {
            b.vx += impulse * a.mass * nx;
            b.vy += impulse * a.mass * ny;
          }
        }
        const overlap = minDistance - d;
        const totalMass = a.mass + b.mass;
        if (overlap > 0 && totalMass > 0) {
          if (!a.fixed) {
            a.x -= nx * overlap * (b.mass / totalMass);
            a.y -= ny * overlap * (b.mass / totalMass);
          }
          if (!b.fixed) {
            b.x += nx * overlap * (a.mass / totalMass);
            b.y += ny * overlap * (a.mass / totalMass);
          }
        }
      }
    }
  }

  return bodies;
}

function stepEuler(bodies, dt, options) {
  const acc = computeAccelerations(bodies, options);
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    if (body.fixed) continue;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.vx += acc[i].x * dt;
    body.vy += acc[i].y * dt;
  }
}

function stepSymplectic(bodies, dt, options) {
  const acc = computeAccelerations(bodies, options);
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    if (body.fixed) continue;
    body.vx += acc[i].x * dt;
    body.vy += acc[i].y * dt;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
  }
}

function stepVerlet(bodies, dt, options) {
  const acc0 = computeAccelerations(bodies, options);
  const predicted = bodies.map((body, i) => ({
    x: body.fixed ? body.x : body.x + body.vx * dt + 0.5 * acc0[i].x * dt * dt,
    y: body.fixed ? body.y : body.y + body.vy * dt + 0.5 * acc0[i].y * dt * dt,
    vx: body.fixed ? body.vx : body.vx + acc0[i].x * dt,
    vy: body.fixed ? body.vy : body.vy + acc0[i].y * dt,
    mass: body.mass,
    fixed: body.fixed
  }));
  const acc1 = computeAccelerations(predicted, options);
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    if (body.fixed) continue;
    body.x += body.vx * dt + 0.5 * acc0[i].x * dt * dt;
    body.y += body.vy * dt + 0.5 * acc0[i].y * dt * dt;
    body.vx += 0.5 * (acc0[i].x + acc1[i].x) * dt;
    body.vy += 0.5 * (acc0[i].y + acc1[i].y) * dt;
  }
}

function derivatives(snapshot, options) {
  const acc = computeAccelerations(snapshot, options);
  return snapshot.map((body, i) => (body.fixed ? { x: 0, y: 0, vx: 0, vy: 0 } : { x: body.vx, y: body.vy, vx: acc[i].x, vy: acc[i].y }));
}

function shifted(snapshot, delta, scale) {
  return snapshot.map((body, i) => (body.fixed
    ? { ...body }
    : {
        ...body,
        x: body.x + delta[i].x * scale,
        y: body.y + delta[i].y * scale,
        vx: body.vx + delta[i].vx * scale,
        vy: body.vy + delta[i].vy * scale
      }));
}

function stepRK4(bodies, dt, options) {
  const initial = bodies.map((body) => ({ x: body.x, y: body.y, vx: body.vx, vy: body.vy, mass: body.mass, fixed: body.fixed }));
  const k1 = derivatives(initial, options);
  const k2 = derivatives(shifted(initial, k1, dt / 2), options);
  const k3 = derivatives(shifted(initial, k2, dt / 2), options);
  const k4 = derivatives(shifted(initial, k3, dt), options);

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    if (body.fixed) continue;
    body.x += ((k1[i].x + 2 * k2[i].x + 2 * k3[i].x + k4[i].x) * dt) / 6;
    body.y += ((k1[i].y + 2 * k2[i].y + 2 * k3[i].y + k4[i].y) * dt) / 6;
    body.vx += ((k1[i].vx + 2 * k2[i].vx + 2 * k3[i].vx + k4[i].vx) * dt) / 6;
    body.vy += ((k1[i].vy + 2 * k2[i].vy + 2 * k3[i].vy + k4[i].vy) * dt) / 6;
  }
}

export function stepSystem(bodies, { integrator = 'symplectic', dt = 0.02, G = 1, softening = 25, collision = 'none' } = {}) {
  const options = { G, softening };
  if (integrator === 'euler') stepEuler(bodies, dt, options);
  else if (integrator === 'verlet') stepVerlet(bodies, dt, options);
  else if (integrator === 'rk4') stepRK4(bodies, dt, options);
  else stepSymplectic(bodies, dt, options);
  resolveCollisions(bodies, collision);
  return bodies;
}

export function benchmarkIntegrators(initialBodies, { steps = 1200, dt = 0.02, G = 1, softening = 25 } = {}) {
  const methods = ['euler', 'symplectic', 'verlet', 'rk4'];
  const reference = cloneBodies(initialBodies);
  for (let i = 0; i < steps; i++) stepSystem(reference, { integrator: 'rk4', dt, G, softening, collision: 'none' });

  const referencePositions = reference.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy }));
  const results = [];

  for (const integrator of methods) {
    const bodies = cloneBodies(initialBodies);
    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    for (let i = 0; i < steps; i++) stepSystem(bodies, { integrator, dt, G, softening, collision: 'none' });
    const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const energy0 = computeTotalEnergy(initialBodies, { G, softening });
    const energy1 = computeTotalEnergy(bodies, { G, softening });
    const momentum0 = computeMomentum(initialBodies);
    const momentum1 = computeMomentum(bodies);
    const trajectoryError = Math.sqrt(
      bodies.reduce((sum, body, i) => {
        const ref = referencePositions[i];
        return sum + (body.x - ref.x) ** 2 + (body.y - ref.y) ** 2;
      }, 0) / Math.max(bodies.length, 1)
    );

    results.push({
      integrator,
      runtimeMs: ended - started,
      energyDriftPercent: energy0 ? Math.abs((energy1 - energy0) / energy0) * 100 : 0,
      momentumDrift: Math.abs(momentum1 - momentum0),
      trajectoryError
    });
  }

  return results;
}

export function summarizeBenchmark(results) {
  const ranked = [...results].sort((a, b) => a.energyDriftPercent - b.energyDriftPercent);
  const winner = ranked[0];
  return [
    `Integrator benchmark summary`,
    `Best energy conservation: ${winner.integrator}`,
    ...results.map((r) => `${r.integrator.padEnd(10)} | drift ${r.energyDriftPercent.toFixed(4)}% | momentum ${r.momentumDrift.toExponential(2)} | traj ${r.trajectoryError.toFixed(3)} | ${r.runtimeMs.toFixed(1)} ms`)
  ].join('\n');
}
