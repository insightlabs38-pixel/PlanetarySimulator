class Body {
  constructor(x, y, vx, vy, mass, radius, color, fixed = false, label = '', type = 'body') {
    Object.assign(this, { x, y, vx, vy, mass, radius, color, fixed, label, type, trail: [] });
  }
}

// Expose Body as a global binding so the module runtime can spawn bodies.
globalThis.Body = Body;
