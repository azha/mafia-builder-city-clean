# Operational seeder — STRUCTURAL_CAP_EXHAUSTED fixture repair — implementation-notes.md

Fix on `mafia-builder-city-clean` (Unity client repo), branch `main`, after `b37d93e` (HUD v3.1
manomètre) / `a250a5e` (nav-district). Scope: `Tools/seed_operational_demo.mjs` only — no `Assets/`
edit, per mandate ("ton périmètre est `Tools/*.mjs`… ne touche ni à `Assets/Scripts/Shell/` ni à
`Assets/Scripts/CityMap/`"). Back-end (`mafia-clean-city`) is read-only for this lot — the cap is a
legitimate game rule (Loop 10 "one structural decision per session" antipattern wall), not a bug.

## Symptom (as given)

Full PlayMode run: every `MafiaCleanCity.Operational.Tests.*` class fails in `OneTimeSetUp`/`SetUp`
with `[op-seed] FAILED: convert lab failed: HTTP 409 — STRUCTURAL_CAP_EXHAUSTED`.

## Diagnosis (measured, not deduced)

1. **The cap is real and defaults to 1/session.** `services/game-back/src/core_loops/
   core-loops-tunables.ts:428-431` — `oneDecisionStructuralPerSessionCap` = `clampCoreLoopsTunableToRange(
   'core_loops.one_decision_structural_per_session_cap', …, default 1)`. `BUILDING_ACQUISITION` AND
   `BUILDING_CONVERT` are BOTH catalogued LIVE structural types (`structural-decision-catalogue.ts:64-69`,
   along with `LIEUTENANT_RECRUIT` — also hit by this seeder's Phase-9 vector).

2. **The cap is enforced ONLY while an active `gameplay_sessions` row exists — a session-less
   structural mutation is FREE by design (D9 "zero-regression").** `structural-decision-governor.
   service.ts:90` — `const enforcementGate = activeSession !== null || coreLoopsTunables.
   oneDecisionEnforceWithoutSession /* default false */;`. `real-estate.controller.ts:87-89`'s own
   comment names this explicitly: *"cap-bind ONLY while the player has an active session (D9); a
   sessionless purchase still succeeds AND is audited (session_ref: null)"*. This is the seeder's
   ORIGINAL, working mode — it has never called `/v1/session/open` (measured: `git log --all -p --
   Tools/seed_operational_demo.mjs | grep 'open-session-as'` → 0 hits across the file's entire
   history), so every structural decision it made was always session-less and uncapped.

3. **`getActiveSession`/`findActive` (`session.repository.ts:59-67`) does not check staleness** — a
   session opened hours ago still counts as "active" for the enforcement gate. Only
   `findFreshActive` (used by `SessionService.open`'s own idempotent-return check) is time-bounded.

4. **Why the seeder's existing `DELETE FROM player_progression_state WHERE player_id=…` (line ~274,
   pre-existing) does NOT prevent the 409**: that DELETE resets the COUNTER
   (`structural_decisions_this_session`, re-created at 0 by the governor's own `ensureRow` on first
   use) — a DIFFERENT table from `gameplay_sessions`. It never touches the session table, so a
   leftover ACTIVE session survives every reset.

5. **Root cause of the leftover active session: the HUD lot (`b37d93e`) wired `AppShell`'s DEFAULT
   identity to THIS SAME account** (`operational_demo@example.test` — `Assets/Tests/PlayMode/
   HudPlayModeTests.cs:410`, `"Identité PAR DÉFAUT d'AppShell = operational_demo"`) and calls the REAL
   `signin → POST /v1/session/open` on boot (`:157,:243,:463`). Since the whole PlayMode assembly runs
   serially in ONE Unity Editor process against the SAME dev DB, any `HudPlayModeTests` run BEFORE an
   Operational test class in the same session leaves the operational_demo player with an active
   `gameplay_sessions` row — flipping the enforcement gate ON for every operational seeder run for the
   rest of the process's life, until something closes it.

   **Measured on the live dev stack** (player `01a01f34-fd4e-7771-83b0-b75efa6e8023`), before the fix:
   3 `gameplay_sessions` rows, the newest (`576bec77-…`) opened `2026-08-21 08:44:09 UTC`, `ended_at`
   NULL, `structural_commits=23` accumulated across dozens of overnight seeder runs — each one getting
   exactly ONE structural call through (0 < cap=1) before every subsequent call in that run 409'd.
   `player_progression_state.structural_decisions_this_session=1`, `last_session_id` blank (confirms
   the counter row was freshly re-created by `ensureRow`, never by `openFresh` — the seeder itself
   never opened this session).

6. **Reproduced the exact failure directly against the API** (bypassing the seeder, to isolate the
   mechanism from any other variable): opened a session via `POST /v1/_test/core-loops/open-session-as`
   (mirrors what `AppShell`'s real `POST /v1/session/open` does), reset `player_progression_state`
   (mirrors the seeder's existing DELETE), then called `POST /v1/operational/building/purchase` twice.
   First call: `200 {"building_id":"5d6baf56-…"}`. Second call: `409
   {"code":"STRUCTURAL_CAP_EXHAUSTED","message":"Structural decisions exhausted for this session.
   Return in next session.","retryable_class":"AFTER_USER_ACTION","payload_vars":
   {"retry_scope":"next_session"}}` — byte-identical shape to the reported symptom.

## Fix

Added ONE step to `Tools/seed_operational_demo.mjs`, right after `signin()` and before any structural
call: call the REAL player-facing `POST /v1/session/close` (idempotent — `{closed:false}` if nothing
was active). This is the SAME endpoint `AppShell` itself would call to end a play session — not a
`_test`-only shortcut, not a raw-SQL `UPDATE gameplay_sessions SET ended_at=now()` that would bypass
`SessionClosedEvent`. It returns the player to the governor's own documented session-less mode (D9)
before any of the ~15-20 structural decisions this seeder makes.

**Options considered, and why this one:**
- *Open a genuinely fresh session before structural ops* — REJECTED: makes it WORSE. Opening a session
  makes `enforcementGate` true and re-introduces the 1/session cap; this seeder needs ~15-20 structural
  decisions in one run, not 1.
- *Let the session expire (staleness)* — REJECTED: `session.stale_timeout_real_minutes` is real
  wall-clock minutes; waiting it out is impractical for a fixture that must run in ~40s.
- *Spread the conversions across multiple sessions (open → 1 decision → close → open → …)* — REJECTED
  as unnecessary: this would need ~15-20 open/close round-trips to reach the exact same end state
  (uncapped, session-less) that simply staying closed reaches in ONE call. It is also no more
  "production-faithful" than the chosen fix — no real player would run 15-20 discrete real-world play
  sessions to build one demo city — while being strictly slower and more brittle (more HTTP round-trips
  that can fail).
- *Close the session once, up front, staying session-less throughout* — CHOSEN: uses a real,
  player-facing production endpoint the exact way a player's client uses it (ending a session), matches
  the governor's own explicitly-documented "zero-regression" session-less mode (not a workaround
  invented for this fixture), and is the seeder's ORIGINAL/native operating mode — this fix restores
  behavior the seeder always relied on, rather than adding a new one.

## Evidence — double execution (task requirement: prove idempotency by running twice)

```
$ node Tools/seed_operational_demo.mjs   # run 1
[op-seed] reusing operational demo account 01a01f34-fceb-79f3-9662-d0930f144fee (player 01a01f34-fd4e-7771-83b0-b75efa6e8023)
[op-seed] resetting prior operational state (idempotent)…
[op-seed] signed in (Bearer acquired)
[op-seed] session closed (closed=true) — structural mutations now run session-less (D9, uncapped)
[op-seed] 9 buildings purchased + converted (gutting; incl. Crick refinery 7b55b83a-8fb0-4c5d-b707-50741730e12c)
… (full run, all 20 fixture steps, 0 errors)
=== OPERATIONAL DEMO SEEDED ===
EXIT=0

$ node Tools/seed_operational_demo.mjs   # run 2, immediately after
[op-seed] reusing operational demo account 01a01f34-fceb-79f3-9662-d0930f144fee (player 01a01f34-fd4e-7771-83b0-b75efa6e8023)
[op-seed] resetting prior operational state (idempotent)…
[op-seed] signed in (Bearer acquired)
[op-seed] session closed (closed=false) — structural mutations now run session-less (D9, uncapped)
[op-seed] 9 buildings purchased + converted (gutting; incl. Crick refinery a15a2a0a-8e3a-4d7e-99c5-c88a7df0e3f5)
… (full run, all 20 fixture steps, 0 errors)
=== OPERATIONAL DEMO SEEDED ===
EXIT=0
```

`closed=true` on run 1 (a leftover session WAS active — the exact poisoned state this fix targets),
`closed=false` on run 2 (nothing left to close — confirms the fix doesn't itself leave a dangling
session for the next run). `grep -c 'STRUCTURAL_CAP\|409'` on both full logs: **0**.

**Third run against a DELIBERATELY re-poisoned state** (opened a session via `open-session-as` again,
between run 2 and run 3, to prove the fix self-heals from the exact original failure mode and not just
from an already-clean environment): `closed=true`, `[op-seed] 9 buildings purchased + converted …`,
`EXIT=0`, 0 occurrences of `409`/`STRUCTURAL_CAP` in the log.

## Evidence — test-level (task requirement: at least one full Operational class green)

Ran ALL 16 PlayMode classes that depend on this seeder (`grep -rl seed_operational_demo Assets/Tests`),
not just one — every class in namespace `MafiaCleanCity.Operational.Tests`:
`BuildingCardPlayModeTests`, `DistributionHubPlayModeTests`, `AshLuxuryPlayModeTests`,
`LieutenantUiExtensionPlayModeTests`, `LieutenantTenureInertiaPlayModeTests`,
`CrickColdChainPlayModeTests`, `LaunderingPlayModeTests`, `ExceptionQueuePlayModeTests`,
`DashboardPlayModeTests`, `AutonomyInboxPlayModeTests`, `BuildingCardRaidPlayModeTests`,
`MoneyHoldingPlayModeTests`, `OperationalLoopPlayModeTests`, `LieutenantRuleEditorPlayModeTests`,
`PipelineOverviewPlayModeTests`, `GrowHousePlayModeTests`, `RuleEditorTier2PlayModeTests`.

`mcp__UnityMCP__run_tests(mode=PlayMode, test_names=[…16 classes…])` →
**`{"total":59,"passed":59,"failed":0,"skipped":0,"resultState":"Passed"}`** (367.8 s). Before the fix,
per the symptom report, ALL of these failed in `OneTimeSetUp`/`SetUp` (0 covered). Before → after:
**0/59 → 59/59.**

## `Tools/seed_citymap_demo.mjs` — measured, NOT affected

Read the full file (128 lines). It never calls `/v1/auth/signin` and never calls any structural
endpoint (`building/purchase`, `building/:id/convert`, lieutenant recruit, …) — its buildings are
inserted directly via `INSERT INTO buildings (...)` SQL (heat-gradient seeding only), and its only HTTP
calls are to `/v1/_test/citysim/advance`. It never touches `StructuralDecisionGovernorService`, so it
cannot hit `STRUCTURAL_CAP_EXHAUSTED` regardless of session state. **No fix needed; no change made.**
(The FK fix already present at lines 88-90 — detaching `lieutenant.assigned_building_id` before the
building DELETE — was pre-existing and unrelated to this lot; re-verified present, untouched.)

## Deviations

None outside the option evaluated and chosen above — no imprévu non bloquant encountered. The one
open question (why did an active session exist at all) resolved to a MEASURED cause (§5) rather than a
guess, so nothing here needed a conservative fallback.

## SHA

Committed on `mafia-builder-city-clean` — see the commit that carries this file (`Tools/
seed_operational_demo.mjs` + this note only; screenshot/font-atlas files touched incidentally by
running the PlayMode verification above were left uncommitted — out of this lot's scope, see report).
