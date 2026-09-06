// IMPLEMENTS: docs/superpowers/plans/2026-07-11-04f-B-recruitment-plan.md C8 (the F4 profiler — TD-191
//             delivery)
//             Design: docs/superpowers/specs/2026-07-11-04f-B-recruitment-design.md §13 (F4 budget + the
//             inherited TD-191 profiler)
//             Tech doc: docs/tech/04f_maintenance_decay_recruitment/memory_budget_maintenance.md
//             (§Per-component memory budget — 04f)
//             — 04f-B C8 — 2026-07-12
//
// The pure, DI-free byte-size constants + response-shape types for `MaintenanceRecruitmentLayer
// MemoryProfiler` (`memory-budget-profiler.service.ts`). Deliberately split into this OWN file with NO
// NestJS decorators anywhere (no `@Injectable()`, no `@Inject(...)` constructor parameters): the E2E
// floor (`recruitment_memory_budget.spec.ts`) direct-imports these SAME constants (the anti-fig-leaf
// precompute pattern — never a hand-typed magic number), and Playwright's esbuild-based TS transform
// cannot parse NestJS parameter decorators outside a `tsconfig` with `experimentalDecorators` — every
// OTHER production file this codebase's E2E specs already direct-import (`DefectorRecruitmentService`,
// `MaintenancePhaseService`, `maintenance-tunables.ts`) is similarly either constructor-free or
// decorator-free for exactly this reason; this file follows the SAME established discipline rather than
// forcing the test to re-derive/hand-duplicate the constants.

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Documented per-row byte estimates (the "DOCUMENTED_ROW_SIZE" side of the multiplication —
// never re-derived, never hand-duplicated elsewhere: `recruitment_memory_budget.spec.ts` imports
// these SAME constants so a drifted formula can never silently pass a stale hand-typed expectation).
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** memory_budget_maintenance.md §Per-component memory budget — 04f, row 1: "~16 B × ~30 buildings". */
export const BYTES_PER_BUILDING_MAINTENANCE_STATE = 16;
/** memory_budget_maintenance.md §Per-component memory budget — 04f, row 2: "~8 B × ~30 buildings". */
export const BYTES_PER_BUILDING_EQUIPMENT_FAILURE_STATE = 8;
/** memory_budget_maintenance.md §Per-component memory budget — 04f, row 3: "~256 B × ~2 active". */
export const BYTES_PER_ACTIVE_RECRUITMENT_QUEST = 256;
/** design §13 [PROV-Y26Q2] — the tech doc's row-3 total (~512 B) does not itemize candidates
 *  separately; this design honestly adds the itemization: "candidates ≈ 4-8 bounded rows × ~120 B". */
export const BYTES_PER_RECRUITMENT_CANDIDATE = 120;
/** design §13 [PROV-Y26Q2] — "the 2 lieutenant columns (`loyalty_seed_bucket` + `recruitment_quest_id`)
 *  ≈ 17 B × roster" (a nullable 4-member pgEnum + a nullable uuid, NULL-bitmap overhead included). */
export const BYTES_PER_LIEUTENANT_RECRUITMENT_COLUMNS = 17;

/** 1 KB = 1024 B (binary kilobyte — matches `perf_budget.04f_max_kb_per_player`'s own "KB" unit; the
 *  memory_budget_maintenance.md doc's "2 MB mobile RAM target" reads the same convention). */
export const BYTES_PER_KB = 1024;

/** The maintenance-side (04f-A) component of a player's 04f memory budget — REAL building count ×
 *  the 2 documented per-building row-size estimates. */
export interface MaintenanceMemoryComponent {
  building_count: number;
  maintenance_state_bytes: number;
  equipment_failure_state_bytes: number;
  total_bytes: number;
}

/** The recruitment-side (04f-B) component of a player's 04f memory budget — REAL active-quest /
 *  candidate / lieutenant-roster counts × the 3 documented per-row-type estimates. */
export interface RecruitmentMemoryComponent {
  active_quest_count: number;
  active_quest_bytes: number;
  candidate_count: number;
  candidate_bytes: number;
  lieutenant_roster_count: number;
  lieutenant_column_bytes: number;
  total_bytes: number;
}

/** The full per-player 04f memory-budget breakdown (`GET /v1/admin/04f/memory-budget/:id`). */
export interface PlayerMemoryBudgetBreakdown {
  player_id: string;
  maintenance: MaintenanceMemoryComponent;
  recruitment: RecruitmentMemoryComponent;
  total_bytes: number;
  total_kb: number;
  /** REUSE — `maintenanceTunables.perfBudget04fMaxKbPerPlayer` (04f-A-registered, NOT re-registered). */
  budget_kb: number;
  /** `total_kb > budget_kb` — value-sensitive: flipping the `perf_budget.04f_max_kb_per_player`
   *  override (via the EXISTING `PUT /v1/admin/tunables/maintenance` — REUSE, no new PUT route here)
   *  moves this boundary (C8 floor). */
  over_budget: boolean;
}
