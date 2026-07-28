Promise.resolve()
  .then(() => import('./sim-advanced.mjs'))
  .then(() => import('./enhancements.mjs'))
  .then(() => import('./presentation-boost.mjs'));
