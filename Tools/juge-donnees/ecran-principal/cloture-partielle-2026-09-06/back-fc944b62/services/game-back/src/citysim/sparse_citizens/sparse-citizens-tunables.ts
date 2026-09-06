// IMPLEMENTS: docs/tech/04_city_simulation/system_2_sparse_citizens.md §Tunables — REUSE exclusif
//             (5 keys from gdd/14 §City — Sparse Citizens; NO NEW tunables — the spec is REUSE-only)
//             -- session:2026-06-02 (Phase 1 Task 3) --
//
// System 2 (Sparse Citizens) tunables — the keys this system's OWN logic actually CONSUMES.
//
// R2.3 (NO inline numeric balance/config): the DEFAULT values below are the backported registry values
// from `projects/mafia_city_game/gdd/14_tunable_constants.md §City — Sparse Citizens` (lines 79–83 in the
// registry; namespaced `T.city.*` per gdd/14 §migration map lines 3595–3599). They are surfaced here as
// env-overridable fallbacks so this file stays a faithful MIRROR of the single source of truth (the
// registry). If the registry values change, update this map in the SAME commit (R9.3: gdd/14 ↔ code).
//
// HONEST TUNABLES (no resolved-but-unused config — the flow-cells-tunables.ts precedent): this mirror
// surfaces ONLY the keys System 2's own logic consumes day-1:
//   - `rich_npc_count` (L79) — how many RichNPCs to lazily seed + maintain (the persisted population cap).
//   - `flow_particle_count` (L80) — the conceptual sparse-token count (RAM-budget + non-persistence model;
//     surfaced because the system LOGS its F4 budget against it and the spec's invariant is "trade
//     population for narrative density" — it is read, not dead).
//   - `whisper_activation_threshold` (L83) — the int seuil whisper_pressure ≥ T → WhisperStateBucket.ACTIVE
//     (the load-bearing →ACTIVE boundary of the 3-member DORMANT/PRESSURE/ACTIVE projection domain —
//     system_2 §Composite whisper_state invariant 4).
//
// `journal_depth_days` (L82) is NOT mirrored here: the biography journal ring buffer is DEFERRED day-1 (no
// journal-append consumer — see the repository's LAZILY-LOADED biography note). Mirroring its depth bound now
// would be resolved-but-unused config; it is re-added WHEN the journal lands (resolved-when-consumed — the
// flow-cells `promotion_radius_blocks` precedent for deferred keys).
//
// `rich_npc_tick_minutes` (L81) is NOT mirrored here: the 5-in-game-minute cadence is owned by the SCHEDULER
// (citysim-tunables.ts `richNpcTickMinutes` → the FIVE_MIN cadence width). Mirroring it here would be a
// duplicate source-of-truth for the same key (the flow-cells precedent: cadence keys live with the
// scheduler). System 2's FIVE_MIN registration IS the consumption of that cadence.

import { TunablesStore } from '../../config/tunables-store';

/**
 * Resolved System 2 Sparse Citizens tunables. All 3 are REUSE from gdd/14 §City — Sparse Citizens AND
 * consumed by the service day-1 (no resolved-but-unused config). `journal_depth_days` is DEFERRED (the
 * journal ring buffer has no consumer day-1) and `rich_npc_tick_minutes` lives with the scheduler (the
 * FIVE_MIN cadence width) — see the file header.
 * Precedence: DB-override > env > default (Phase-23 TunablesStore).
 */
export const sparseCitizensTunables = {
  /** rich_npc_count — persisted RichNPC population to seed + maintain per player. (DB-override > env > default — Phase-23). */
  get richNpcCount(): number { return TunablesStore.resolveInt('T.city.rich_npc_count', 'RICH_NPC_COUNT', 400); },
  /** flow_particle_count — conceptual sparse-token count (RAM budget / non-persistence model). (DB-override > env > default — Phase-23). */
  get flowParticleCount(): number { return TunablesStore.resolveInt('T.city.flow_particle_count', 'FLOW_PARTICLE_COUNT', 8000); },
  /** whisper_activation_threshold — whisper_pressure ≥ T → WhisperStateBucket.ACTIVE. (DB-override > env > default — Phase-23). */
  get whisperActivationThreshold(): number { return TunablesStore.resolveInt('T.city.whisper_activation_threshold', 'WHISPER_ACTIVATION_THRESHOLD', 70); },
};
