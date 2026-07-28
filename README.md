# PlanetarySimulator — Orbital Lab

Orbital Lab is an interactive 2D N-body gravity simulator designed as a portfolio-grade computational physics project.

The project now centers on three ideas:

1. **Numerical methods are visible.** Different integrators produce different energy drift, local error, and trajectory behavior.
2. **Experiments are reproducible.** Random systems are seeded, telemetry can be exported, run bundles can be saved and re-imported, and the browser restores the last control state automatically.
3. **Physics is measurable.** The UI exposes orbital elements, conservation metrics, benchmark comparisons, and a live diagnostics score that flags unstable runs before they become misleading.

## Current features

- N-body Newtonian gravity with pairwise interactions
- Barnes–Hut tree approximation for larger systems
- Gravitational softening to avoid singular behavior during close encounters
- Integrators:
  - Euler
  - Symplectic Euler
  - Velocity Verlet
  - RK4
  - Adaptive RK4 / RK45-style step control
- Optional perturbation models:
  - J2 oblateness
  - Atmospheric drag
  - Radiation pressure
  - First post-Newtonian correction
- Presets for:
  - Default system
  - Binary star system
  - Solar-system-inspired core
  - Earth–Moon system
  - Jovian moons
  - Resonant orbits
  - Three-body figure-8
  - Seeded random systems
- Collision modes:
  - Ghost pass-through
  - Inelastic merge
  - Elastic bounce
- Adaptive timestep control based on close-encounter spacing, with explicit error reporting for the adaptive solver
- Live metrics:
  - Total energy and energy drift
  - Linear momentum magnitude
  - Angular momentum
  - Center of mass
  - Closest approach
  - Maximum speed
- Orbital analysis:
  - Semi-major axis
  - Eccentricity
  - Period
  - Periapsis
  - Apoapsis
  - Escape speed
  - Specific orbital energy
  - Resonance ratio estimates
  - Periapsis precession tracking
  - Finite-time Lyapunov estimate
  - Event log for periapsis, apoapsis, escape transitions, and collisions
- Energy-drift graph
- Phase-space graph
- Adaptive-error graph
- CSV export
- PNG snapshot export
- Reproducibility bundle export with UI state, diagnostics, and canvas capture
- Reproducibility bundle import for restoring shared runs
- Automatic local session persistence in the browser, with restore and clear shortcuts
- Benchmark mode comparing all integrators on the same initial conditions
- Seeded random generation for reproducible experiments
- Mouse drag-to-launch interaction
- Trails, velocity vectors, labels, and zoom controls
- Keyboard shortcuts for pause, reset, CSV export, PNG export, benchmark runs, bundle export, session restore, session clearing, and shortcut help
- Presentation mode for fullscreen demos with a shareable run brief
- Automatic pause behavior when the tab is hidden
- Live diagnostics panel with a stability score, a clear recommendation, and benchmark leader detection

## Project structure

```text
PlanetarySimulator/
├── index.html               # UI shell
├── styles-v2.css            # Visual system
├── physics-globals.js        # Global Body shim for the browser module runtime
├── sim.js                   # Legacy entrypoint that loads the module runtime
├── sim-advanced.mjs         # Advanced browser runtime and simulation controller
├── enhancements.mjs         # Reproducibility, session persistence, diagnostics, and shortcut overlay
├── presentation-boost.mjs   # Presentation mode and run briefs
├── physics-core-advanced.mjs # Advanced physics, integrators, force models, benchmark utilities
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
- **Adaptive RK4 / RK45-style control** adds explicit local-error monitoring.

## Running locally

No build step is required. Serve the folder with any static server and open `index.html`.

For example:

```bash
python3 -m http.server
```

## What to try

- Compare Euler vs Symplectic Euler on the same preset.
- Compare Verlet, RK4, and adaptive RK4 while watching energy drift and adaptive error.
- Turn adaptive stepping off and increase the timestep.
- Randomize the system using a seed and rerun it later.
- Run the benchmark and inspect the generated report.
- Export CSV telemetry and inspect the numbers outside the browser.
- Export a bundle and use it as a reproducibility artifact.
- Import a bundle and restore a shared experiment.
- Open the diagnostics panel and copy the summary into notes.
- Switch on presentation mode and copy the run brief for a demo slide or interview note.
- Close and reopen the page to confirm the browser restores the last control state.

## Testing and CI

A GitHub Actions workflow runs syntax checks and a small Node-based physics test suite on every push and pull request.

## Portfolio framing

The strongest story for admissions is not just that the simulation looks good. It is that the project makes numerical error, conservation behavior, and integrator tradeoffs visible in a controlled experiment environment. The diagnostics layer now turns that into an immediate decision aid, so the repository reads as a compact piece of scientific software engineering rather than a visual toy.
