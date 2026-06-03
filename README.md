# mafia-builder-city-clean — Unity client

Unity 6 (6000.4.6f1, URP) client for **Mafia Clean City**. This is the game client; the
backend (NestJS game-back + Postgres, dockerized) lives in the separate `mafia-clean-city`
repo and is the source of truth for all data.

## City Map screen (Phase 1 / T14)

`Assets/Scripts/CityMap/` — a data-driven City Map built programmatically (UGUI):

- **Districts** — `GET /v1/world/districts` (public), 18 districts grouped by bank, each
  cell coloured by `control_state` (+ legend).
- **Auth** — real sign-in (`POST /auth/v1/signin`) → Bearer token (`AuthClient`).
- **Heat overlay** — per-district `GET /v1/city/district/:id/heat` (JWT-gated), a togglable
  badge per cell coloured by `HeatBucket` (COLD/WARM/HOT/BURNING).
- **District detail panel** — click a district to aggregate 11 live system projections
  (heat, flow, throughput, stash, buffer, unconformity, leks, cohesion, police belief,
  citizen whisper). Cadence-gated projections show as *n/a* honestly.

The client talks to the live backend through Traefik at `http://localhost` (the editor runs
on the same host as the docker stack).

## Running

1. Bring up the backend stack (in the `mafia-clean-city` repo):
   `docker compose --project-name mafia-clean-city up -d --build --wait`
2. Seed the demo player + a heat gradient (idempotent):
   `node Tools/seed_citymap_demo.mjs`
3. Open the project in Unity and play `Assets/Scenes/CityMap.unity`.

## Tests

PlayMode E2E (charter: real backend, no mocks) under `Assets/Tests/PlayMode/`. Run via the
Unity Test Runner (PlayMode). Run the seeder first — the heat tests assert the seeded
gradient (district 3 BURNING, 7 HOT, 11 WARM, rest COLD).
