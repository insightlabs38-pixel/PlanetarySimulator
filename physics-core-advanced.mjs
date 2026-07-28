export class Body {
  constructor(x, y, vx, vy, mass, radius, color, fixed = false, label = '', type = 'body') {
    Object.assign(this, { x, y, vx, vy, mass, radius, color, fixed, label, type, trail: [] });
  }
}

const COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#b8f2e6', '#c77dff'];
const YOSHIDA_W1 = 1 / (2 - 2 ** (1 / 3));
const YOSHIDA_W0 = -(2 ** (1 / 3)) / (2 - 2 ** (1 / 3));
const YOSHIDA_C = [YOSHIDA_W1 / 2, (YOSHIDA_W0 + YOSHIDA_W1) / 2, (YOSHIDA_W0 + YOSHIDA_W1) / 2, YOSHIDA_W1 / 2];
const YOSHIDA_D = [YOSHIDA_W1, YOSHIDA_W0, YOSHIDA_W1];

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed = 'orbital-lab') {
  return mulberry32(xmur3(String(seed))());
}

export function cloneBodies(bodies) {
  return bodies.map((body) => new Body(body.x, body.y, body.vx, body.vy, body.mass, body.radius, body.color, !!body.fixed, body.label || '', body.type || 'body'));
}

function makeOrbitingBody({ r, angle, mass, radius, color, centralMass, G, tangential = 1, label = 'Body', type = 'planet' }) {
  const x = Math.cos(angle) * r;
  const y = Math.sin(angle) * r;
  const v = Math.sqrt((G * centralMass) / Math.max(r, 1));
  return new Body(x, y, -Math.sin(angle) * v * tangential, Math.cos(angle) * v * tangential, mass, radius, color, false, label, type);
}

function defaultPreset(centralMass) {
  return [
    new Body(0, 0, 0, 0, centralMass, 18, '#f5c542', true, 'Star', 'star'),
    new Body(170, 0, 0, 0, 18, 7, '#6fb8ff', false, 'Planet A', 'planet'),
    new Body(-255, 0, 0, 0, 9, 5, '#ec7da5', false, 'Planet B', 'planet'),
    new Body(0, 310, 6.4, 0, 1.2, 3, '#b8f2e6', false, 'Probe', 'probe')
  ];
}

function binaryPreset() {
  return [
    new Body(-90, 0, 0, 5.8, 7000, 16, '#ffd166', true, 'Primary', 'star'),
    new Body(90, 0, 0, -5.8, 7000, 16, '#6fb8ff', true, 'Secondary', 'star'),
    new Body(0, 210, -6.8, 0, 18, 5, '#b8f2e6', false, 'Planet', 'planet'),
    new Body(0, -280, 5.2, 0, 1, 3, '#f72585', false, 'Comet', 'comet')
  ];
}

function solarPreset(centralMass) {
  return [
    new Body(0, 0, 0, 0, centralMass, 18, '#f5c542', true, 'Sun', 'star'),
    new Body(110, 0, 0, 10.447, 18, 5, '#6fb8ff', false, 'Mercury', 'planet'),
    new Body(-170, 0, 0, -8.55, 22, 6, '#ffd166', false, 'Venus', 'planet'),
    new Body(255, 0, 0, 6.45, 12, 5.5, '#4cc9f0', false, 'Earth', 'planet'),
    new Body(275, 18, 1, 8.2, 2.5, 2.1, '#dfe8ff', false, 'Moon', 'moon'),
    new Body(-360, 0, 0, -5.4, 7, 4, '#ec7da5', false, 'Mars', 'planet'),
    new Body(480, 0, 0, 4.65, 38, 10, '#c77dff', false, 'Jupiter', 'planet')
  ];
}

function earthMoonPreset() {
  return [
    new Body(0, 0, 0, 0, 14000, 18, '#f5c542', true, 'Earth', 'star'),
    new Body(140, 0, 0, 8.6, 30, 8, '#6fb8ff', false, 'Moon', 'moon'),
    new Body(0, 310, 7.3, 0, 0.3, 2.5, '#ffd166', false, 'Satellite', 'probe'),
    new Body(-320, -130, 1.6, -2.6, 2, 3.5, '#f72585', false, 'Asteroid', 'asteroid')
  ];
}

function jovianPreset() {
  return [
    new Body(0, 0, 0, 0, 16000, 18, '#f5c542', true, 'Jupiter', 'star'),
    new Body(115, 0, 0, 10.6, 24, 8.2, '#ffd166', false, 'Io', 'moon'),
    new Body(165, 0, 0, 8.5, 18, 7.2, '#6fb8ff', false, 'Europa', 'moon'),
    new Body(220, 0, 0, 6.9, 20, 7.8, '#b8f2e6', false, 'Ganymede', 'moon'),
    new Body(280, 0, 0, 5.6, 22, 8, '#c77dff', false, 'Callisto', 'moon'),
    new Body(-410, 120, 1.2, -4.8, 1.2, 3, '#f72585', false, 'Comet', 'comet')
  ];
}

function resonantPreset(centralMass) {
  const innerRadius = 155;
  const outerRadius = Math.round(innerRadius * Math.pow(2, 2 / 3));
  const innerSpeed = Math.sqrt(centralMass / innerRadius);
  const outerSpeed = Math.sqrt(centralMass / outerRadius);
  return [
    new Body(0, 0, 0, 0, centralMass, 18, '#f5c542', true, 'Resonant Star', 'star'),
    new Body(innerRadius, 0, 0, innerSpeed * 0.985, 17, 6.5, '#6fb8ff', false, 'Inner Resonant', 'planet'),
    new Body(outerRadius, 0, 0, outerSpeed * 0.995, 11, 5.5, '#b8f2e6', false, 'Outer Resonant', 'planet'),
    new Body(0, 246, 6.15, 0, 1.8, 2.8, '#c77dff', false, 'Companion', 'moon')
  ];
}

function figure8Preset() {
  return [
    new Body(-100, 0, 0.35, 0.53, 3000, 12, '#ff6b6b', false, 'Body 1', 'planet'),
    new Body(100, 0, 0.35, 0.53, 3000, 12, '#6fb8ff', false, 'Body 2', 'planet'),
    new Body(0, 0, -0.7, -1.06, 3000, 12, '#ffd166', false, 'Body 3', 'planet')
  ];
}

function chaosPreset({ G = 1, centralMass = 10000, seed = 'orbital-lab' } = {}) {
  const rng = createSeededRng(seed);
  const system = [new Body(0, 0, 0, 0, centralMass, 18, '#f5c542', true, 'Seed Star', 'star')];
  const labels = ['Planet', 'Moon', 'Comet', 'Asteroid', 'Probe', 'Dwarf', 'Body'];
  for (let i = 0; i < 8; i++) {
    const r = 95 + rng() * 430;
    const angle = rng() * Math.PI * 2;
    const mass = 1.5 + rng() * 28;
    const label = `${labels[i % labels.length]} ${i + 1}`;
    system.push(makeOrbitingBody({
      r,
      angle,
      mass,
      radius: 3.5 + rng() * 4.5,
      color: COLORS[i % COLORS.length],
      centralMass,
      G,
      tangential: rng() > 0.5 ? 1 : -1,
      label,
      type: i % 3 === 0 ? 'comet' : i % 2 === 0 ? 'asteroid' : 'planet'
    }));
  }
  return system;
}

export function buildPreset(name, options = {}) {
  const { G = 1, centralMass = 9000, seed = 'orbital-lab' } = options;
  const factory = {
    default: () => defaultPreset(centralMass),
    binary: binaryPreset,
    solar: () => solarPreset(centralMass),
    earthMoon: earthMoonPreset,
    jovian: jovianPreset,
    resonant: () => resonantPreset(centralMass),
    figure8: figure8Preset,
    chaos: () => chaosPreset({ G, centralMass, seed })
  }[name] || (() => defaultPreset(centralMass));
  return factory().map((b) => new Body(b.x, b.y, b.vx, b.vy, b.mass, b.radius, b.color, b.fixed, b.label, b.type));
}

function primaryBody(bodies) {
  return bodies.find((b) => b.fixed) || [...bodies].sort((a, b) => b.mass - a.mass)[0] || null;
}

function dist2(dx, dy) {
  return dx * dx + dy * dy;
}

function pairwiseAccelerations(bodies, { G = 1 } = {}) {
  const acc = bodies.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const r2 = Math.max(dist2(dx, dy), 1e-24);
      const invR = 1 / Math.sqrt(r2);
      const scale = G * invR / r2;
      if (!a.fixed) { acc[i].x += scale * b.mass * dx; acc[i].y += scale * b.mass * dy; }
      if (!b.fixed) { acc[j].x -= scale * a.mass * dx; acc[j].y -= scale * a.mass * dy; }
    }
  }
  return acc;
}

function buildBarnesHutTree(bodies) {
  if (!bodies.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of bodies) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x); maxY = Math.max(maxY, b.y); }
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const half = span / 2 + 1e-6;
  const root = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, half, mass: 0, comX: 0, comY: 0, body: null, children: null };
  const quadIndex = (node, b) => (b.y >= node.y ? 2 : 0) + (b.x >= node.x ? 1 : 0);
  const makeChild = (node, q) => ({ x: node.x + (q % 2 ? 0.5 : -0.5) * node.half, y: node.y + (q < 2 ? -0.5 : 0.5) * node.half, half: node.half / 2, mass: 0, comX: 0, comY: 0, body: null, children: null });
  const insert = (node, idx) => {
    const b = bodies[idx];
    if (node.body == null && !node.children) { node.body = idx; node.mass = b.mass; node.comX = b.x; node.comY = b.y; return; }
    if (!node.children) { node.children = Array.from({ length: 4 }, (_, q) => makeChild(node, q)); const old = node.body; node.body = null; if (old != null) insert(node, old); }
    const q = quadIndex(node, b);
    insert(node.children[q], idx);
    const total = node.mass + b.mass;
    node.comX = (node.comX * node.mass + b.mass * b.x) / total;
    node.comY = (node.comY * node.mass + b.mass * b.y) / total;
    node.mass = total;
  };
  for (let i = 0; i < bodies.length; i++) insert(root, i);
  return root;
}

function accelFromNode(body, node, options, theta, skipIndex) {
  if (!node || node.mass === 0) return { x: 0, y: 0 };
  if (!node.children && node.body === skipIndex) return { x: 0, y: 0 };
  const dx = node.comX - body.x;
  const dy = node.comY - body.y;
  const r2 = Math.max(dist2(dx, dy), 1e-24);
  const r = Math.sqrt(r2);
  if (!node.children || (node.half * 2) / Math.max(r, 1e-12) < theta) {
    if (!node.children && node.body === skipIndex) return { x: 0, y: 0 };
    const scale = options.G * node.mass / (r2 * r);
    return body.fixed ? { x: 0, y: 0 } : { x: scale * dx, y: scale * dy };
  }
  let ax = 0, ay = 0;
  for (const child of node.children) {
    const a = accelFromNode(body, child, options, theta, skipIndex);
    ax += a.x; ay += a.y;
  }
  return { x: ax, y: ay };
}

function barnesHutAccelerations(bodies, options = {}) {
  const tree = buildBarnesHutTree(bodies);
  const theta = options.theta ?? 0.65;
  return bodies.map((body, i) => accelFromNode(body, tree, options, theta, i));
}

function centralPerturbations(body, primary, options) {
  const cfg = options.forceModel || {};
  const acc = { x: 0, y: 0 };
  if (!primary) return acc;
  const dx = body.x - primary.x;
  const dy = body.y - primary.y;
  const r2 = Math.max(dx * dx + dy * dy, 1e-24);
  const r = Math.sqrt(r2);
  const mu = options.G * (primary.mass || 1);

  if (cfg.j2Enabled && cfg.j2Strength) {
    const R = cfg.j2Radius || (primary.radius || 18);
    const radial = -mu / (r2 * r) * (1 - 1.5 * cfg.j2Strength * (R * R / r2));
    const base = radial / Math.max(r, 1e-12);
    acc.x += base * dx;
    acc.y += base * dy;
  }
  if (cfg.radiationEnabled && cfg.radiationStrength) {
    const outward = cfg.radiationStrength * mu / (r2 * r);
    acc.x += outward * dx;
    acc.y += outward * dy;
  }
  if (cfg.dragEnabled && cfg.dragStrength) {
    const density0 = cfg.dragDensity0 ?? 0.0005;
    const scaleHeight = cfg.dragScaleHeight ?? 140;
    const rho = density0 * Math.exp(-Math.max(0, r - (cfg.dragReferenceRadius || primary.radius || 18)) / Math.max(scaleHeight, 1));
    const relVx = body.vx - (primary.vx || 0);
    const relVy = body.vy - (primary.vy || 0);
    const speed = Math.hypot(relVx, relVy) || 1e-12;
    const drag = -cfg.dragStrength * rho * speed;
    acc.x += drag * relVx;
    acc.y += drag * relVy;
  }
  if (cfg.postNewtonianEnabled && cfg.postNewtonianStrength) {
    const c2 = (cfg.postNewtonianC ?? 1e6) ** 2;
    const relVx = body.vx - (primary.vx || 0);
    const relVy = body.vy - (primary.vy || 0);
    const v2 = relVx * relVx + relVy * relVy;
    const rv = dx * relVx + dy * relVy;
    const factor = mu / (r2 * r) * cfg.postNewtonianStrength * (4 * mu / (c2 * r) - v2 / c2 + 4 * (rv * rv) / (c2 * r2));
    acc.x -= factor * dx;
    acc.y -= factor * dy;
  }
  return acc;
}

function applyExtraForces(bodies, acc, options) {
  const primary = primaryBody(bodies);
  if (!primary) return;
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].fixed) continue;
    const extra = centralPerturbations(bodies[i], primary, options);
    acc[i].x += extra.x;
    acc[i].y += extra.y;
  }
}

export function computeAccelerations(bodies, options = {}) {
  const method = options.accelerationMethod || (options.integrator === 'barnes-hut' ? 'barnes-hut' : 'pairwise');
  const acc = method === 'barnes-hut' && bodies.length > 12 ? barnesHutAccelerations(bodies, options) : pairwiseAccelerations(bodies, options);
  applyExtraForces(bodies, acc, options);
  return acc;
}

export function computeTotalEnergy(bodies, { G = 1 } = {}) {
  let total = 0;
  for (const b of bodies) total += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      const d = Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1e-12);
      total -= (G * a.mass * b.mass) / d;
    }
  }
  return total;
}

export function computeMomentum(bodies) {
  let px = 0, py = 0;
  for (const b of bodies) { px += b.mass * b.vx; py += b.mass * b.vy; }
  return Math.hypot(px, py);
}

export function computeAngularMomentum(bodies) {
  return bodies.reduce((total, b) => total + b.mass * (b.x * b.vy - b.y * b.vx), 0);
}

export function computeCenterOfMass(bodies) {
  const totalMass = bodies.reduce((sum, body) => sum + body.mass, 0) || 1;
  return { x: bodies.reduce((sum, body) => sum + body.mass * body.x, 0) / totalMass, y: bodies.reduce((sum, body) => sum + body.mass * body.y, 0) / totalMass, totalMass };
}

export function computeClosestApproach(bodies) {
  let min = Infinity;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) min = Math.min(min, Math.hypot(bodies[j].x - bodies[i].x, bodies[j].y - bodies[i].y));
  }
  return Number.isFinite(min) ? min : 0;
}

export function computeMaxSpeed(bodies) {
  return bodies.reduce((max, b) => Math.max(max, Math.hypot(b.vx, b.vy)), 0);
}

export function orbitalElements(body, primary, { G = 1 } = {}) {
  const dx = body.x - primary.x, dy = body.y - primary.y;
  const dvx = body.vx - primary.vx, dvy = body.vy - primary.vy;
  const r = Math.hypot(dx, dy);
  const v2 = dvx * dvx + dvy * dvy;
  const mu = G * (body.mass + primary.mass);
  const h = dx * dvy - dy * dvx;
  const specificEnergy = 0.5 * v2 - mu / Math.max(r, 1e-12);
  const ex = (dvy * h) / mu - dx / Math.max(r, 1e-12);
  const ey = (-dvx * h) / mu - dy / Math.max(r, 1e-12);
  const eccentricity = Math.hypot(ex, ey);
  const semiMajorAxis = specificEnergy < 0 ? -mu / (2 * specificEnergy) : Infinity;
  const orbitalPeriod = specificEnergy < 0 ? 2 * Math.PI * Math.sqrt((semiMajorAxis ** 3) / mu) : Infinity;
  const periapsis = Number.isFinite(semiMajorAxis) ? semiMajorAxis * (1 - eccentricity) : Infinity;
  const apoapsis = Number.isFinite(semiMajorAxis) ? semiMajorAxis * (1 + eccentricity) : Infinity;
  const escapeSpeed = Math.sqrt((2 * mu) / Math.max(r, 1e-12));
  const periapsisAngle = Math.atan2(ey, ex);
  return { r, v: Math.sqrt(v2), specificEnergy, eccentricity, semiMajorAxis, orbitalPeriod, periapsis, apoapsis, escapeSpeed, periapsisAngle, meanMotion: Number.isFinite(orbitalPeriod) && orbitalPeriod > 0 ? (2 * Math.PI) / orbitalPeriod : 0 };
}

function rationalApprox(value, maxDen = 8) {
  if (!Number.isFinite(value) || value <= 0) return null;
  let best = { num: 1, den: 1, error: Math.abs(value - 1) };
  for (let den = 1; den <= maxDen; den++) {
    const num = Math.max(1, Math.round(value * den));
    const error = Math.abs(value - num / den);
    if (error < best.error) best = { num, den, error };
  }
  return best;
}

export function computeSystemOrbitalAnalytics(bodies, { G = 1, referenceMode = 'primary', referenceIndex = 0 } = {}) {
  const primary = primaryBody(bodies);
  const barycenter = computeCenterOfMass(bodies);
  const reference = referenceMode === 'barycenter'
    ? { x: barycenter.x, y: barycenter.y, vx: 0, vy: 0, mass: barycenter.totalMass, radius: 0, fixed: true, label: 'Barycenter' }
    : referenceMode === 'manual'
      ? bodies[referenceIndex] || primary
      : primary;
  if (!reference) return [];
  const referencePeriod = primary && reference !== primary ? orbitalElements(primary, reference, { G }).orbitalPeriod : Infinity;
  return bodies.map((body, index) => {
    if (body === reference) return { index, body, reference, skipped: true };
    const orbit = orbitalElements(body, reference, { G });
    const ratio = Number.isFinite(orbit.orbitalPeriod) && Number.isFinite(referencePeriod) && referencePeriod > 0 ? orbit.orbitalPeriod / referencePeriod : Infinity;
    const resonance = rationalApprox(ratio, 8);
    return { index, body, reference, ...orbit, referencePeriod, resonanceRatio: resonance ? `${resonance.num}:${resonance.den}` : '—', resonanceError: resonance ? resonance.error : Infinity };
  });
}

function snapshotBodies(bodies) {
  return bodies.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, mass: b.mass, fixed: !!b.fixed }));
}

function commitSnapshot(bodies, snapshot) {
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].fixed) continue;
    bodies[i].x = snapshot[i].x;
    bodies[i].y = snapshot[i].y;
    bodies[i].vx = snapshot[i].vx;
    bodies[i].vy = snapshot[i].vy;
  }
}

function derivatives(snapshot, options) {
  const acc = computeAccelerations(snapshot, options);
  return snapshot.map((body, i) => body.fixed ? { x: 0, y: 0, vx: 0, vy: 0 } : { x: body.vx, y: body.vy, vx: acc[i].x, vy: acc[i].y });
}

function shifted(snapshot, delta, scale) {
  return snapshot.map((body, i) => body.fixed ? { ...body } : ({ ...body, x: body.x + delta[i].x * scale, y: body.y + delta[i].y * scale, vx: body.vx + delta[i].vx * scale, vy: body.vy + delta[i].vy * scale }));
}

function eulerStep(bodies, dt, options) {
  const acc = computeAccelerations(bodies, options);
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].fixed) continue;
    bodies[i].x += bodies[i].vx * dt;
    bodies[i].y += bodies[i].vy * dt;
    bodies[i].vx += acc[i].x * dt;
    bodies[i].vy += acc[i].y * dt;
  }
}

function symplecticStep(bodies, dt, options) {
  const acc = computeAccelerations(bodies, options);
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].fixed) continue;
    bodies[i].vx += acc[i].x * dt;
    bodies[i].vy += acc[i].y * dt;
    bodies[i].x += bodies[i].vx * dt;
    bodies[i].y += bodies[i].vy * dt;
  }
}

function verletStep(bodies, dt, options) {
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
    if (bodies[i].fixed) continue;
    bodies[i].x += bodies[i].vx * dt + 0.5 * acc0[i].x * dt * dt;
    bodies[i].y += bodies[i].vy * dt + 0.5 * acc0[i].y * dt * dt;
    bodies[i].vx += 0.5 * (acc0[i].x + acc1[i].x) * dt;
    bodies[i].vy += 0.5 * (acc0[i].y + acc1[i].y) * dt;
  }
}

function yoshida4Step(bodies, dt, options) {
  for (let i = 0; i < 4; i++) {
    const kick = YOSHIDA_C[i];
    if (kick) {
      const acc = computeAccelerations(bodies, options);
      for (let b = 0; b < bodies.length; b++) {
        if (bodies[b].fixed) continue;
        bodies[b].vx += acc[b].x * (kick * dt);
        bodies[b].vy += acc[b].y * (kick * dt);
      }
    }
    if (i < 3) {
      const drift = YOSHIDA_D[i];
      for (const body of bodies) {
        if (body.fixed) continue;
        body.x += body.vx * (drift * dt);
        body.y += body.vy * (drift * dt);
      }
    }
  }
}

function rk4StepSnapshot(snapshot, dt, options) {
  const k1 = derivatives(snapshot, options);
  const k2 = derivatives(shifted(snapshot, k1, dt / 2), options);
  const k3 = derivatives(shifted(snapshot, k2, dt / 2), options);
  const k4 = derivatives(shifted(snapshot, k3, dt), options);
  return snapshot.map((body, i) => body.fixed ? { ...body } : ({ ...body, x: body.x + ((k1[i].x + 2 * k2[i].x + 2 * k3[i].x + k4[i].x) * dt) / 6, y: body.y + ((k1[i].y + 2 * k2[i].y + 2 * k3[i].y + k4[i].y) * dt) / 6, vx: body.vx + ((k1[i].vx + 2 * k2[i].vx + 2 * k3[i].vx + k4[i].vx) * dt) / 6, vy: body.vy + ((k1[i].vy + 2 * k2[i].vy + 2 * k3[i].vy + k4[i].vy) * dt) / 6 }));
}

function errorEstimate(a, b) {
  let worst = 0;
  for (let i = 0; i < a.length; i++) {
    const scale = Math.max(1, Math.abs(b[i].x), Math.abs(b[i].y), Math.abs(b[i].vx), Math.abs(b[i].vy));
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    const dvx = a[i].vx - b[i].vx;
    const dvy = a[i].vy - b[i].vy;
    worst = Math.max(worst, Math.hypot(dx, dy, dvx, dvy) / scale);
  }
  return worst;
}

function adaptiveRk4Step(bodies, dt, options, stats) {
  const tol = options.adaptiveTolerance ?? 1e-5;
  const minStep = options.minAdaptiveDt ?? dt / 1024;
  let remaining = dt;
  let step = dt;
  let accepted = 0;
  let rejected = 0;
  const history = [];
  const state = snapshotBodies(bodies);
  while (remaining > 1e-12 && accepted + rejected < 4096) {
    step = Math.min(step, remaining);
    const full = rk4StepSnapshot(state, step, options);
    const half = rk4StepSnapshot(state, step / 2, options);
    const half2 = rk4StepSnapshot(half, step / 2, options);
    const err = errorEstimate(full, half2);
    if (err > tol && step > minStep) { step *= 0.5; rejected++; continue; }
    state.splice(0, state.length, ...half2);
    remaining -= step;
    accepted++;
    history.push({ dt: step, error: err });
    if (err < tol * 0.125) step *= 1.6;
    else if (err > tol * 0.6) step *= 0.85;
  }
  commitSnapshot(bodies, state);
  stats.acceptedSteps = accepted;
  stats.rejectedSteps = rejected;
  stats.substeps = accepted + rejected;
  stats.maxError = history.reduce((m, e) => Math.max(m, e.error), 0);
  stats.meanSubstep = history.length ? history.reduce((s, e) => s + e.dt, 0) / history.length : dt;
  stats.stepHistory = history;
}

function modifiedMidpoint(snapshot, n, h, options) {
  let y0 = snapshot.map((b) => ({ ...b }));
  let y1 = derivatives(y0, options);
  for (let i = 0; i < y0.length; i++) {
    if (y0[i].fixed) continue;
    y0[i].x += h * y1[i].x;
    y0[i].y += h * y1[i].y;
    y0[i].vx += h * y1[i].vx;
    y0[i].vy += h * y1[i].vy;
  }
  if (n === 1) return y0;
  let y2 = derivatives(y0, options);
  for (let step = 1; step < n; step++) {
    const next = y0.map((b, i) => b.fixed ? { ...b } : ({ ...b, x: b.x + 2 * h * y2[i].x, y: b.y + 2 * h * y2[i].y, vx: b.vx + 2 * h * y2[i].vx, vy: b.vy + 2 * h * y2[i].vy }));
    y1 = y2;
    y0 = next;
    y2 = derivatives(y0, options);
  }
  return y0.map((b, i) => b.fixed ? { ...b } : ({ ...b, x: 0.5 * (b.x + snapshot[i].x + h * y2[i].x), y: 0.5 * (b.y + snapshot[i].y + h * y2[i].y), vx: 0.5 * (b.vx + snapshot[i].vx + h * y2[i].vx), vy: 0.5 * (b.vy + snapshot[i].vy + h * y2[i].vy) }));
}

function bulirschStoerStep(bodies, dt, options, stats) {
  const state = snapshotBodies(bodies);
  const sequence = [2, 4, 6, 8, 10, 12];
  const table = [];
  let best = null;
  let bestErr = Infinity;
  const tol = options.adaptiveTolerance ?? 1e-6;
  const maxIter = options.maxExtrapolationOrder ?? sequence.length;
  for (let k = 0; k < Math.min(sequence.length, maxIter); k++) {
    const n = sequence[k];
    const h = dt / n;
    const mid = modifiedMidpoint(state, n, h, options);
    table[k] = [mid];
    for (let j = 1; j <= k; j++) {
      const ratio = (sequence[k] / sequence[k - j]) ** 2;
      const prev = table[k][j - 1];
      const left = table[k - 1][j - 1];
      table[k][j] = prev.map((b, i) => b.fixed ? { ...b } : ({ ...b, x: prev[i].x + (prev[i].x - left[i].x) / (ratio - 1), y: prev[i].y + (prev[i].y - left[i].y) / (ratio - 1), vx: prev[i].vx + (prev[i].vx - left[i].vx) / (ratio - 1), vy: prev[i].vy + (prev[i].vy - left[i].vy) / (ratio - 1) }));
    }
    const candidate = table[k][k];
    if (best) {
      const err = errorEstimate(candidate, best);
      if (err < bestErr) bestErr = err;
      if (err <= tol) {
        commitSnapshot(bodies, candidate);
        stats.acceptedSteps = 1;
        stats.rejectedSteps = 0;
        stats.substeps = n;
        stats.maxError = err;
        stats.meanSubstep = dt / n;
        stats.stepHistory = [{ dt, error: err, order: 2 * (k + 1) }];
        return;
      }
    }
    best = candidate;
  }
  commitSnapshot(bodies, best);
  stats.acceptedSteps = 1;
  stats.rejectedSteps = 0;
  stats.substeps = sequence[Math.min(sequence.length - 1, maxIter - 1)];
  stats.maxError = bestErr === Infinity ? 0 : bestErr;
  stats.meanSubstep = dt / stats.substeps;
  stats.stepHistory = [{ dt, error: stats.maxError, order: 2 * maxIter }];
}

function closePairIndex(bodies) {
  let min = Infinity;
  let pair = null;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const d = Math.hypot(bodies[j].x - bodies[i].x, bodies[j].y - bodies[i].y);
      if (d < min) { min = d; pair = [i, j]; }
    }
  }
  return { min, pair };
}

function solveKeplerUniversal(r0, v0, dt, mu, maxIter = 24) {
  const r0mag = Math.hypot(r0.x, r0.y);
  const v0mag = Math.hypot(v0.x, v0.y);
  const r0v0 = r0.x * v0.x + r0.y * v0.y;
  const alpha = 2 / Math.max(r0mag, 1e-12) - (v0mag * v0mag) / mu;
  let chi = Math.sqrt(mu) * Math.abs(alpha) * dt || Math.sqrt(mu) * dt / Math.max(r0mag, 1);
  const stumpff = (z) => {
    if (z > 1e-8) { const sz = Math.sqrt(z); return { C: (1 - Math.cos(sz)) / z, S: (sz - Math.sin(sz)) / (sz * z) }; }
    if (z < -1e-8) { const sz = Math.sqrt(-z); return { C: (1 - Math.cosh(sz)) / z, S: (Math.sinh(sz) - sz) / (sz * (-z)) }; }
    return { C: 1 / 2, S: 1 / 6 };
  };
  for (let iter = 0; iter < maxIter; iter++) {
    const z = alpha * chi * chi;
    const { C, S } = stumpff(z);
    const F = (r0v0 / Math.sqrt(mu)) * chi * chi * C + (1 - alpha * r0mag) * chi ** 3 * S + r0mag * chi - Math.sqrt(mu) * dt;
    const dF = (r0v0 / Math.sqrt(mu)) * chi * (1 - z * S) + (1 - alpha * r0mag) * chi * chi * C + r0mag;
    const delta = F / Math.max(dF, 1e-12);
    chi -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  const z = alpha * chi * chi;
  const { C, S } = stumpff(z);
  const f = 1 - (chi * chi / r0mag) * C;
  const g = dt - (chi ** 3 / Math.sqrt(mu)) * S;
  const r = { x: f * r0.x + g * v0.x, y: f * r0.y + g * v0.y };
  const rmag = Math.hypot(r.x, r.y);
  const fdot = (Math.sqrt(mu) / (r0mag * rmag)) * (alpha * chi ** 3 * S - chi);
  const gdot = 1 - (chi * chi / rmag) * C;
  const v = { x: fdot * r0.x + gdot * v0.x, y: fdot * r0.y + gdot * v0.y };
  return { r, v };
}

function regularizedPairStep(bodies, pair, dt, options) {
  const [i, j] = pair;
  const a = bodies[i];
  const b = bodies[j];
  const totalMass = a.mass + b.mass;
  if (totalMass <= 0) return false;
  const bary = { x: (a.mass * a.x + b.mass * b.x) / totalMass, y: (a.mass * a.y + b.mass * b.y) / totalMass, vx: (a.mass * a.vx + b.mass * b.vx) / totalMass, vy: (a.mass * a.vy + b.mass * b.vy) / totalMass };
  const r0 = { x: b.x - a.x, y: b.y - a.y };
  const v0 = { x: b.vx - a.vx, y: b.vy - a.vy };
  const mu = options.G * totalMass;
  const propagated = solveKeplerUniversal(r0, v0, dt, mu);
  const ra = { x: -propagated.r.x * (b.mass / totalMass), y: -propagated.r.y * (b.mass / totalMass) };
  const rb = { x: propagated.r.x * (a.mass / totalMass), y: propagated.r.y * (a.mass / totalMass) };
  const va = { x: -propagated.v.x * (b.mass / totalMass), y: -propagated.v.y * (b.mass / totalMass) };
  const vb = { x: propagated.v.x * (a.mass / totalMass), y: propagated.v.y * (a.mass / totalMass) };
  if (!a.fixed) { a.x = bary.x + ra.x; a.y = bary.y + ra.y; a.vx = bary.vx + va.x; a.vy = bary.vy + va.y; }
  if (!b.fixed) { b.x = bary.x + rb.x; b.y = bary.y + rb.y; b.vx = bary.vx + vb.x; b.vy = bary.vy + vb.y; }
  return true;
}

function maybeRegularizeCloseEncounter(bodies, dt, options) {
  if (options.regularization === false) return false;
  const { min, pair } = closePairIndex(bodies);
  const radius = Number.isFinite(options.regularizationRadius) ? options.regularizationRadius : 8;
  if (!pair || !Number.isFinite(min) || min > radius) return false;
  return regularizedPairStep(bodies, pair, dt, options);
}

function rk45Step(bodies, dt, options, stats) {
  adaptiveRk4Step(bodies, dt, options, stats);
}

function ias15Step(bodies, dt, options, stats) {
  bulirschStoerStep(bodies, dt, options, stats);
}

function resolveCollisions(bodies, mode) {
  if (mode === 'none') return { collisions: 0 };
  let collisions = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = a.radius + b.radius;
      if (distance >= minDistance) continue;
      collisions++;
      if (mode === 'merge') {
        const survivor = a.mass >= b.mass ? a : b;
        const absorbed = survivor === a ? b : a;
        const totalMass = survivor.mass + absorbed.mass;
        survivor.vx = (survivor.mass * survivor.vx + absorbed.mass * absorbed.vx) / totalMass;
        survivor.vy = (survivor.mass * survivor.vy + absorbed.mass * absorbed.vy) / totalMass;
        survivor.mass = totalMass;
        survivor.radius = Math.max(2, Math.sqrt(survivor.radius ** 2 + absorbed.radius ** 2) * 1.05);
        bodies.splice(bodies.indexOf(absorbed), 1);
        i = -1;
        break;
      }
      if (mode === 'bounce') {
        const d = Math.max(distance, 1e-6);
        const nx = dx / d, ny = dy / d;
        const rvx = a.vx - b.vx, rvy = a.vy - b.vy;
        const approach = rvx * nx + rvy * ny;
        if (approach < 0) {
          const impulse = (2 * approach) / (a.mass + b.mass);
          if (!a.fixed) { a.vx -= impulse * b.mass * nx; a.vy -= impulse * b.mass * ny; }
          if (!b.fixed) { b.vx += impulse * a.mass * nx; b.vy += impulse * a.mass * ny; }
        }
        const overlap = minDistance - d;
        const totalMass = a.mass + b.mass;
        if (overlap > 0 && totalMass > 0) {
          if (!a.fixed) { a.x -= nx * overlap * (b.mass / totalMass); a.y -= ny * overlap * (b.mass / totalMass); }
          if (!b.fixed) { b.x += nx * overlap * (a.mass / totalMass); b.y += ny * overlap * (a.mass / totalMass); }
        }
      }
    }
  }
  return { collisions };
}

export function stepSystem(bodies, { integrator = 'symplectic', dt = 0.02, G = 1, collision = 'none', accelerationMethod = null, forceModel = null, adaptiveTolerance = 1e-5, minAdaptiveDt = dt / 1024, stats = null, regularization = true, regularizationRadius = 8 } = {}) {
  const localStats = { acceptedSteps: 1, rejectedSteps: 0, substeps: 1, maxError: 0, meanSubstep: dt, stepHistory: [], collisions: 0 };
  const options = { G, forceModel, adaptiveTolerance, minAdaptiveDt, regularization, regularizationRadius, accelerationMethod: accelerationMethod || (integrator === 'barnes-hut' ? 'barnes-hut' : 'pairwise') };
  if (regularization && maybeRegularizeCloseEncounter(bodies, dt, options)) {
    localStats.stepHistory = [{ dt, error: 0, regularized: true }];
  } else if (integrator === 'rk45') {
    rk45Step(bodies, dt, options, localStats);
  } else if (integrator === 'ias15') {
    ias15Step(bodies, dt, options, localStats);
  } else if (integrator === 'euler') {
    eulerStep(bodies, dt, options);
  } else if (integrator === 'verlet') {
    verletStep(bodies, dt, options);
  } else if (integrator === 'yoshida4') {
    yoshida4Step(bodies, dt, options);
  } else if (integrator === 'rk4') {
    commitSnapshot(bodies, rk4StepSnapshot(snapshotBodies(bodies), dt, options));
  } else {
    symplecticStep(bodies, dt, options);
  }
  const collisionStats = resolveCollisions(bodies, collision);
  localStats.collisions = collisionStats.collisions;
  if (stats && typeof stats === 'object') Object.assign(stats, localStats);
  return bodies;
}

export function recommendedSubsteps(bodies, { dt = 0.02, regularizationRadius = 8, maxSubsteps = 48, aggressiveness = 1.2 } = {}) {
  const closest = Math.max(computeClosestApproach(bodies), regularizationRadius * 0.4, 1e-9);
  return Math.min(maxSubsteps, Math.max(1, Math.ceil((aggressiveness * dt * 65) / closest)));
}

export function benchmarkIntegrators(initialBodies, { steps = 1200, dt = 0.02, G = 1, forceModel = null } = {}) {
  const methods = ['euler', 'symplectic', 'verlet', 'yoshida4', 'rk4', 'rk45', 'ias15', 'barnes-hut'];
  const reference = cloneBodies(initialBodies);
  for (let i = 0; i < steps; i++) stepSystem(reference, { integrator: 'ias15', dt, G, collision: 'none', forceModel, regularization: true });
  const refPositions = reference.map((b) => ({ x: b.x, y: b.y }));
  const results = [];
  for (const integrator of methods) {
    const bodies = cloneBodies(initialBodies);
    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const stats = {};
    for (let i = 0; i < steps; i++) stepSystem(bodies, { integrator, dt, G, collision: 'none', forceModel, stats, regularization: true });
    const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const energy0 = computeTotalEnergy(initialBodies, { G });
    const energy1 = computeTotalEnergy(bodies, { G });
    const momentum0 = computeMomentum(initialBodies);
    const momentum1 = computeMomentum(bodies);
    const trajectoryError = Math.sqrt(bodies.reduce((sum, body, i) => sum + (body.x - refPositions[i].x) ** 2 + (body.y - refPositions[i].y) ** 2, 0) / Math.max(bodies.length, 1));
    results.push({ integrator, runtimeMs: ended - started, energyDriftPercent: energy0 ? Math.abs((energy1 - energy0) / energy0) * 100 : 0, momentumDrift: Math.abs(momentum1 - momentum0), trajectoryError, acceptedSteps: stats.acceptedSteps || 0, rejectedSteps: stats.rejectedSteps || 0, maxError: stats.maxError || 0 });
  }
  return results;
}

export function summarizeBenchmark(results) {
  const ranked = [...results].sort((a, b) => a.energyDriftPercent - b.energyDriftPercent);
  const winner = ranked[0];
  return ['Integrator benchmark summary', `Best energy conservation: ${winner.integrator}`, ...results.map((r) => `${r.integrator.padEnd(10)} | drift ${r.energyDriftPercent.toFixed(4)}% | momentum ${r.momentumDrift.toExponential(2)} | traj ${r.trajectoryError.toFixed(3)} | ${r.runtimeMs.toFixed(1)} ms${r.rejectedSteps ? ` | rej ${r.rejectedSteps}` : ''}`)].join('\n');
}
