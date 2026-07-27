import assert from 'node:assert/strict';
import { normalizeBundlePayload } from '../enhancements.mjs';

const valid = normalizeBundlePayload({
  schemaVersion: 2,
  app: 'Orbital Lab',
  createdAt: '2026-07-27T12:00:00.000Z',
  userAgent: 'test-suite',
  controls: {
    preset: 'chaos',
    integrator: 'verlet',
    g: '1.5'
  },
  hud: {
    status: 'Running',
    time: '12.34'
  },
  canvasDataUrl: 'data:image/png;base64,abc123'
});

assert.ok(valid);
assert.equal(valid.schemaVersion, 2);
assert.equal(valid.app, 'Orbital Lab');
assert.equal(valid.controls.preset, 'chaos');
assert.equal(valid.controls.integrator, 'verlet');
assert.equal(valid.hud.status, 'Running');
assert.equal(valid.canvasDataUrl, 'data:image/png;base64,abc123');

assert.equal(normalizeBundlePayload(null), null);
assert.equal(normalizeBundlePayload({}), null);
assert.equal(normalizeBundlePayload({ schemaVersion: 0 }), null);

console.log('bundle tests passed');
