Promise.resolve()
  .then(() => import('./sim.mjs'))
  .then(() => import('./enhancements.mjs'));
