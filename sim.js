Promise.resolve()
  .then(() => import('./sim.mjs'))
  .then(() => import('./enhancements.mjs'))
  .then(() => import('./presentation-boost.mjs'));
