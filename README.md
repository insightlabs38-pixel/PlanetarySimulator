# PlanetarySimulator — Orbital Lab

An interactive 2D N-body gravity simulator built as a portfolio project exploring classical mechanics, numerical integration, conservation laws, and scientific visualization.

## Why this project exists

The goal is not only to draw orbiting planets. The simulator exposes the numerical methods behind the motion and lets users compare how different integrators behave under the same physical system.

That makes the project useful as a small computational-physics laboratory rather than only a visual demo.

## Features

- N-body Newtonian gravity with pairwise interactions
- Softened gravitational potential to reduce singular behavior during close approaches
- Four numerical integrators:
  - Forward Euler
  - Symplectic Euler
  - Velocity Verlet
  - Classical RK4
- Presets for:
  - Default multi-orbit system
  - Binary star system
  - Solar-system-inspired core
  - Earth–Moon system
  - Jovian moons
  - Three-body figure-8
  - Randomized systems
- Collision models:
  - Ghost pass-through
  - Inelastic mass merge
  - Elastic collision response
- Live scientific diagnostics:
  - Total energy and relative energy drift
  - Linear momentum magnitude
  - Angular momentum
  - Center of mass
  - Closest pair distance
  - Maximum body speed
- Energy-drift history graph
- Phase-space trajectory graph (x vs. vx)
- CSV export of simulation telemetry
- PNG snapshot export
- Mouse drag-to-launch interaction
- Zoom, trails, velocity vectors, and body labels
- Keyboard controls for pause, reset, CSV export, and image export
- Responsive UI and high-DPI canvas rendering

## Numerical model

For each pair of bodies, the simulator computes a softened Newtonian interaction:

`a_i = G * m_j * r_ij / (|r_ij|^2 + epsilon^2)^(3/2)`

where `epsilon` is the configurable softening parameter.

The total diagnostic energy is computed from kinetic energy plus the corresponding softened pair potential. This makes energy drift useful for comparing integrators, although the softened model is intentionally an approximation rather than an exact point-mass potential.

### Integrator comparison

- **Euler:** simple first-order method; useful as a deliberately less-stable baseline.
- **Symplectic Euler:** inexpensive and generally better suited to long-term Hamiltonian-style orbital integration.
- **Velocity Verlet:** second-order method with good long-term behavior for conservative systems.
- **RK4:** fourth-order local accuracy; useful as a high-accuracy reference for shorter simulations, although it is not symplectic.

A useful experiment is to run the same preset with different integrators and compare the energy-drift graph and exported telemetry.

## Project structure

```text
PlanetarySimulator/
├── index.html   # Application structure and controls
├── styles.css   # Responsive visual system
├── sim.js       # Physics engine, integrators, diagnostics, rendering, input
└── README.md    # Technical documentation
```

## Running locally

No build system or dependencies are required.

1. Clone the repository.
2. Open `index.html` in a modern browser.

For local development with a static server, any simple HTTP server will work. For example:

```bash
python3 -m http.server
```

Then open the local address shown by the server.

## Suggested experiments

1. Compare Euler and Symplectic Euler on the default system.
2. Compare Symplectic Euler, Velocity Verlet, and RK4 while watching energy drift.
3. Run the figure-8 preset and observe the phase-space trajectory.
4. Increase the timestep and examine numerical instability.
5. Switch collision modes and export telemetry.
6. Randomize the system and observe close approaches using the closest-approach metric.

## Future research directions

The current model is intentionally self-contained and browser-friendly. Natural extensions include:

- Adaptive timestep control based on local acceleration and close approaches
- Barnes–Hut approximation for larger N-body systems
- 3D visualization with WebGL
- Relativistic corrections for high-velocity or strong-field experiments
- Keplerian orbital-element extraction
- Automatic period estimation and eccentricity calculations
- Stability experiments and Lyapunov-style divergence measurements
- Reproducible seeded random systems
- Automated integrator benchmark reports
- Unit-aware physical presets using SI values

## Portfolio / admissions context

The strongest technical story for this project is the connection between physics and computation: the simulator makes numerical error visible instead of hiding it. The project can therefore be discussed through classical mechanics, algorithmic complexity, numerical stability, conservation laws, and scientific data visualization.
