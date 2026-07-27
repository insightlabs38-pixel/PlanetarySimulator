# PlanetarySimulator — Orbital Lab

Orbital Lab is an interactive 2D N-body gravity simulator designed as a portfolio-grade computational physics project.

The project is now centered on three ideas:

1. **Numerical methods are visible.** Different integrators produce different energy drift and trajectory behavior.
2. **Experiments are reproducible.** Random systems are seeded, and telemetry can be exported.
3. **Physics is measurable.** The UI exposes orbital elements, conservation metrics, and benchmark comparisons.

## Current features

- N-body Newtonian gravity with pairwise interactions
- Gravitational softening to avoid singular behavior during close encounters
- Four integrators:
  - Euler
  - Symplectic Euler
  - Velocity Verlet
  - RK4
- Presets for:
  - Default system
  - Binary star system
  - Solar-system-inspired core
  - Earth–Moon system
  - Jovian moons
  - Three-body figure-8
  - Seeded random systems
- Collision modes:
  - Ghost pass-through
  - Inelastic merge
  - Elastic bounce
- Adaptive timestep control based on close-encounter spacing
- Live metrics:
  - Total energy and energy drift
  - Linear momentum magnitude
  - Angular momentum
  - Center of mass
  - Closest approach
  - Maximum speed
- Orbital-element estimates for one active body relative to the primary body:
  - semi-major axis
  - eccentricity
  - period
  - periapsis
  - apoapsis
  - escape speed
  - specific orbital energy
- Energy-drift graph
- Phase-space graph
- CSV export
- PNG snapshot export
- Benchmark mode comparing all integrators on the same initial conditions
- Seeded random generation for reproducible experiments
- Mouse drag-to-launch interaction
- Trails, velocity vectors, labels, and zoom controls
- Keyboard shortcuts for pause, reset, CSV export, PNG export, and benchmark runs

## Project structure

```text
PlanetarySimulator/
├── index.html          # UI shell
├── styles.css          # Visual system
├── sim.js              # Legacy entrypoint that loads the module runtime
├── sim.mjs             # Browser runtime and simulation controller
├── physics-core.mjs    # Physics, integrators, orbital elements, benchmark utilities
├── tests/
│   └── physics.test.mjs
└── .github/
    └── workflows/
        └── ci.yml
```

## Numerical model

For each pair of bodies, the simulator computes a softened Newtonian acceleration:

`a_i = G * m_j * r_ij / (|r_ij|^2 + epsilon^2)^(3/2)`

The energy metric uses kinetic energy plus softened pairwise potential energy, which makes energy drift useful for comparing integrators. The softening term is intentionally a numerical device, not a physical claim.

### Why the integrators matter

- **Euler** is intentionally unstable enough to serve as a baseline.
- **Symplectic Euler** generally behaves better for long-lived orbital systems.
- **Velocity Verlet** is a strong conservative-method compromise.
- **RK4** provides a high-accuracy reference for shorter runs, but it is not symplectic.

## Running locally

No build step is required. Serve the folder with any static server and open `index.html`.

For example:

```bash
python3 -m http.server
```

## What to try

- Compare Euler vs Symplectic Euler on the same preset.
- Compare Verlet and RK4 while watching energy drift.
- Turn adaptive stepping off and increase the timestep.
- Randomize the system using a seed and rerun it later.
- Run the benchmark and inspect the generated report.
- Export CSV telemetry and inspect the numbers outside the browser.

## Testing and CI

A GitHub Actions workflow runs syntax checks and a small Node-based physics test suite on every push and pull request.

## Portfolio framing

The strongest story for admissions is not just that the simulation looks good. It is that the project makes numerical error, conservation behavior, and integrator tradeoffs visible in a controlled experiment environment. That lets the repository read as a compact piece of scientific software engineering rather than a visual toy.
