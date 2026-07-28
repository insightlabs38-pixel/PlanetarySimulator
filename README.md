# PlanetarySimulator — Orbital Lab

![CI](https://github.com/insightlabs38-pixel/PlanetarySimulator/actions/workflows/ci.yml/badge.svg?branch=main)
![Top language](https://img.shields.io/github/languages/top/insightlabs38-pixel/PlanetarySimulator)
![Repo size](https://img.shields.io/github/repo-size/insightlabs38-pixel/PlanetarySimulator)
![License](https://img.shields.io/github/license/insightlabs38-pixel/PlanetarySimulator)
![Last commit](https://img.shields.io/github/last-commit/insightlabs38-pixel/PlanetarySimulator/main)
![GitHub stars](https://img.shields.io/github/stars/insightlabs38-pixel/PlanetarySimulator?style=social)

Orbital Lab is an interactive 2D N-body gravity simulator built as a computational-physics portfolio project.

The current codebase is organized around three goals:

1. **Numerical behavior is visible.** The simulator exposes multiple integrators, benchmark comparisons, and error-oriented telemetry.
2. **Experiments are reproducible.** Seeds, bundles, saved sessions, and preset replication configurations make runs repeatable.
3. **Fallbacks are explicit.** When higher-performance paths are unavailable, the app stays usable and the interface explains what is active.

## Current features

- Newtonian N-body gravity with pairwise interactions
- Barnes–Hut tree approximation for larger systems
- Regularized close-encounter handling for near-collision passes
- Integrators:
  - Euler
  - Symplectic Euler
  - Velocity Verlet
  - Yoshida 4th-order symplectic stepping
  - RK4
  - Adaptive RK4 / RK45-style control
  - IAS15-style high-accuracy baseline
  - Barnes–Hut acceleration mode
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
- Research overlay:
  - MEGNO-style diagnostic proxy
  - Mean-motion resonance display
  - Poincaré-style surface-of-section sampling
  - Historical replication presets
  - Live LaTeX reference panel
- Export and persistence:
  - CSV export
  - PNG snapshot export
  - Reproducibility bundle export
  - Reproducibility bundle import
  - Automatic local session persistence in the browser
- Presentation and workflow support:
  - Keyboard shortcuts for pause, reset, CSV export, PNG export, benchmark runs, bundle export/import, session restore, session clearing, and shortcut help
  - Presentation mode with a shareable run brief
  - Automatic pause behavior when the tab is hidden
  - Live diagnostics panel with a stability score, a recommendation, and benchmark leader detection
- Fallback-aware hardware posture:
  - WebGPU detection with CPU fallback
  - WASM detection with JavaScript fallback
  - Worker detection with main-thread fallback

## Quick verification run

Use **Verify Numerical Convergence** to run a short benchmark over the current initial conditions. The report compares Euler, Velocity Verlet, Yoshida 4, and IAS15 on the same 10-second window and prints the final global energy drift for each method.

## Project structure

```text
PlanetarySimulator/
├── index.html                # UI shell
├── styles-v2.css             # Visual system
├── physics-globals.js        # Global Body shim for the browser module runtime
├── sim.js                    # Legacy entrypoint that loads the module runtime
├── sim-advanced.mjs          # Advanced browser runtime and simulation controller
├── enhancements.mjs          # Reproducibility, session persistence, diagnostics, and shortcut overlay
├── presentation-boost.mjs    # Presentation mode and run briefs
├── physics-core-advanced.mjs # Advanced physics, integrators, force models, benchmark utilities
├── physics-core-precision.mjs # Compensated-summation wrapper and verification helpers
├── webgpu-backend.mjs        # Isolated WebGPU bootstrap and WGSL compute source
├── research-features.mjs     # Research overlay, replication presets, and fallback notices
├── ui-polish.mjs             # HUD label polish for advanced solver names
├── final-optimizations.mjs    # Worker-backed analysis, convergence verification, faculty guide
├── tests/
│   └── physics.test.mjs
└── .github/
    └── workflows/
        └── ci.yml
```

## Numerical model

The current core uses exact Newtonian pairwise forces in the normal path. Close encounters are handled by a regularized fallback instead of artificial global softening. This keeps the standard trajectory evolution clean while still giving the simulator a safe path through near-collision situations.

### Why the integrators matter

- **Euler** is intentionally unstable enough to serve as a baseline.
- **Symplectic Euler** gives a simple conservative stepping reference.
- **Velocity Verlet** remains a strong low-cost conservative method.
- **Yoshida 4** improves long-run Hamiltonian behavior through symplectic composition.
- **RK4** is a useful non-symplectic accuracy comparison.
- **Adaptive RK4 / RK45-style control** adds local-error monitoring.
- **IAS15-style baseline** serves as the high-accuracy comparison mode in benchmark runs.

## Running locally

No build step is required. Serve the folder with any static server and open `index.html`.

For example:

```bash
python3 -m http.server
```

## What to try

- Compare Euler, Verlet, Yoshida 4, and IAS15 on the same preset.
- Run the benchmark and inspect the generated report.
- Use the resonant preset and inspect the resonance display.
- Open the research overlay and compare the replication presets.
- Use **Verify Numerical Convergence** and compare the final energy drift across Euler, Verlet, Yoshida 4, and IAS15.
- Export CSV telemetry and inspect the numbers outside the browser.
- Export a bundle and import it again.
- Open the diagnostics panel and copy the summary into notes.
- Switch on presentation mode and copy the run brief for a demo slide or interview note.

## Testing and CI

A GitHub Actions workflow runs syntax checks and a Node-based physics test suite on every push and pull request. The tests cover deterministic seeded presets, orbital-element calculations, integrator paths, benchmark reporting, compensated-summation bookkeeping, and the backend fallback path.

## Information for Faculty Reviewers & Admissions Committees

The repository’s mathematical core is concentrated in `physics-core-advanced.mjs` and `physics-core-precision.mjs`.

- `physics-core-advanced.mjs`: pairwise Newtonian force model, Barnes–Hut fallback, perturbation models, and the main integrator dispatch.
- `physics-core-advanced.mjs` `YOSHIDA_*` constants and `yoshida4Step`: 4th-order symplectic composition coefficients.
- `physics-core-advanced.mjs` `modifiedMidpoint`, `bulirschStoerStep`, and `stepSystem` dispatch for `ias15`: high-accuracy baseline path.
- `physics-core-advanced.mjs` `maybeRegularizeCloseEncounter` and `solveKeplerUniversal`: near-encounter fallback regularization path.
- `physics-core-precision.mjs`: compensated-summation wrapper and low-order-bit bookkeeping for x/y updates.
- `webgpu-backend.mjs`: isolated WGSL compute source and guarded WebGPU bootstrap with secure-context fallback handling.
- `final-optimizations.mjs`: worker-backed MEGNO / Poincaré-style analysis, convergence verification, and the reviewer guide.

The design choice is to keep the numerical story legible: the code shows where conservation is exact, where it is approximate, and where the app intentionally falls back to a safer path.

## Validation notes

The browser runtime is JavaScript-first, with WebGPU, WASM, and worker acceleration treated as optional enhancements. The application continues to function when those capabilities are unavailable, and the UI surfaces the current backend state rather than silently failing.

## Portfolio framing

The strongest story for admissions is not just that the simulation looks good. It is that the project makes numerical error, conservation behavior, integrator tradeoffs, reproducible experiment design, and fallback engineering visible in a controlled scientific environment.
