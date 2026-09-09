// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1a-onboarding-funnel-design.md §4 chunks C3/C4/C5
//             (D1/D1.1/D5/D6/D7/D8/D9/D10/D10.1/D10.2)
//             docs/superpowers/specs/2026-08-12-w6.1-combat-production-design.md §4 chunk C1 (D2)
//             -- W1.1-a C3 -- 2026-08-09 -- W1.1-a C4/C5 -- 2026-08-09 -- W6.1 C1 -- 2026-08-13 --
//
// `OnboardingGrantService` — the reliquat 75% of the welcome grant (W1.0 delivered the monetary 25%
// only — TD-347, `auth.service.ts`'s own `WELCOME_GRANT_CASH_CENTS`/`WELCOME_GRANT_MARKS`): 4
// already-OPERATIONAL buildings (lab/stash/front_shop/cash_safehouse) on ONE fixed Verge district
// (D7, C3) + a 2-lieutenant roster (1 primary + 1 understudy, both COOK, both assigned to the grant's
// `lab` — D8, C4) + 1 pre-seeded Exception card on the primary (D4/D5/D9, C5 — the card that unblocks
// the funnel's first real decision, design §0.7/§0.8) + 4 `rival_state` rows + 4 `rival_pair_pressure`
// rows (W6.1 C1, D2 — the ONLY production writer of either table; §0.2 of that design counted ZERO
// before this chunk, 46 spec-only creators via the `_test` seam).
//
// ★ W6.1 C1 DI NOTE (deviation from the design's literal text, consigned
// `2026-08-13-w6.1-C1-implementation-notes.md` §Deviations): the design says "OnboardingModule importe
// RivalAiModule" — no `OnboardingModule` exists. `OnboardingGrantService` is re-provisioned DIRECTLY,
// unexported, in BOTH `AuthModule` and `SessionModule` (the STRUCTURAL GUARD below). `RivalSeedService`
// follows the EXACT SAME shape — `@Inject(DB)`-only (`rival-seed.service.ts:157`), so it is
// re-provisioned DIRECTLY alongside `OnboardingGrantService` in both modules, NOT imported via
// `RivalAiModule` (which does not export it anyway — `rival-ai.module.ts:98-108`). Zero import, zero
// cycle, zero `forwardRef` — the SAME precedent this file already applies to
// `LieutenantRepository`/`ExceptionsRepository` (`auth.module.ts`'s own header).
//
// POST-COMMIT, under a guarded at-most-once claim (D1 — RÉÉCRITE B1: a repository CANNOT join
// `signup`'s own transaction — `db/index.ts:30` is pool-backed, a repository opening `db.
// transaction(…)` takes a DIFFERENT connection, §0.11). This service opens its OWN transaction whose
// FIRST statement is the guarded claim (D1.1 pt 1); a partial failure anywhere after rolls back the
// claim too, so the account is never left "half-granted" — it is either fully granted or, on any
// failure, exactly as unclaimed as before the call (retentable, D1.1 pt 2).
//
// ★★ STRUCTURAL GUARD (D10.2, BL-2) — this class + `OnboardingGrantRepository` are declared in
// `providers:` and ABSENT from `exports:` in BOTH modules that need them: `AuthModule` (this chunk)
// and `SessionModule` (C6 — the repair seam of D1.1 pt 3 re-provisions the SAME pair; ALREADY LIVE,
// r4/m4/r5 below). A provider that is not exported is un-injectable outside the module that declares
// it: any THIRD module attempting `@Inject(OnboardingGrantService)` — even while importing
// `AuthModule` for `JwtAuthGuard` — fails to RESOLVE at Nest's dependency-injection boot pass. That
// failure is a BOOT-TIME error, not something a code reviewer has to catch by reading — the DI
// container itself refuses to start (design's own "the pendant DI du résolveur exhaustif sans
// `default`", règle 7). This is deliberate, not an oversight: `RealEstateRepository` was explicitly
// REJECTED as this capacity's home (BL-2 — 3 of its 4 proposed "guards" turned out to be prose, not
// enforcement) precisely so that no OTHER module in the shared operational domain could ever reach
// this write path by accident. An EXPLICIT, deliberate re-provision into a shared module was always
// possible — SessionModule's own re-provision (C6, already live — see `session.module.ts`'s own C6
// fold note) is exactly that, a considered decision naming this exact class, not a workaround. What
// this guard blocks is an ACCIDENTAL reach, never a considered one.
//
// Never called from any HTTP route — the lot creates none (design §5, "aucune route ne l'expose").
// ★ r4/m4 (stale dated statement — this exact file is edited by lot/planque): this class already
// had TWO live callers, not one — this chunk (C3) wired the FIRST, `AuthService.signup`; C6
// (already live: `session.module.ts` re-provisions this same pair for `SessionOpenSequenceService`'s
// repair seam) added the second.
// ★★ r5/M2 (r4/m4's own sweep was wrong on BOTH numbers it collected, recounted independently):
// denominator was 20, `git diff --name-only fd333617..HEAD -- services/game-back/src` counts 21 (27
// with `tests/e2e/` included) — counted via `$( )`/an oracle, never a raw `>` redirect (it truncates
// the very count it should prove, confirmed on this exact command). Its closing claim that nothing
// else needed fixing was also false: re-scanning the PROPERTY (C6 framed as not-yet-active), not
// just the exact wording r4/m4 grepped for, found 2 more live occurrences on this same 21-file scope
// — one nine lines above in THIS file
// (fixed this pass), one in `session.module.ts`'s own header, which echoed this file's pre-r4/m4
// wording closely enough to carry the same stale framing (paraphrased there instead, this pass). 0
// elsewhere, re-verified on the 21-file scope after both fixes.
//
// ★ Retry-budget note (§7, review consigne 5): D1.1 pt 3 names a non-convergence — a
// DETERMINISTICALLY broken grant (e.g. a malformed block query) is retried at EVERY `session/open`
// and fails every time, because the claim lives INSIDE this same transaction and is rolled back with
// everything else on failure (nothing here remembers "stop trying"). That is the accepted, BOUNDED
// cost of keeping the grant retentable (one aborted transaction + one log line per open — D1.1 pt 3).
// If a future budget-of-attempts column is ever added to cap that retry cost, it is STRUCTURAL that
// it preserve a repair path (e.g. "N attempts, then a manual/BO re-grant lever") — a budget with no
// repair path recreates exactly the "account permanently ungranted" hole this whole design closed.
// Not needed today (§7: only if `WELCOME_GRANT_REPAIR_FAILED` is ever observed in gate/staging).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerProgressionState } from '../db/schema/player_progression_state';
import { blocks } from '../db/schema/world_geography';
import { citySimClock } from '../db/schema/city_sim_clock';
// W1.1-a C8 (blast-radius scoping, `2026-08-09-w1.1a-C6-C7-implementation-notes.md`'s own §★★★) — the
// repair-seam eligibility guard: `player`/`authSession` REUSE (R9.3 — ch09/ch17 own these tables,
// nothing new declared here).
import { player } from '../db/schema/player';
import { authSession } from '../db/schema/account';
import { citySimTunables } from '../citysim/citysim-tunables';
import { conversionTunables, type M1OperationalType } from '../operational/real_estate/conversion-tunables';
import { OnboardingGrantRepository } from './onboarding-grant.repository';
// W1.1-a C4 (design D8) — the roster half: LieutenantRepository.recruit, threaded onto THIS transaction
// (executor?: LieutenantTx, design §0.11) so the roster commits/rolls back WITH the buildings above.
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { roleIdForArchetype } from '../operational/lieutenant/lieutenant-archetype';
// W1.1-a C5 (design D4/D5/D9) — the pre-seed half: ExceptionsRepository.insert, likewise threaded onto
// THIS transaction so the queue-cap read (D5) sees the grant's OWN in-flight writes.
import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import type { CandidateActionView } from '../exceptions/exceptions.projection.service';
import { METHOD_BY_ACTION_ID } from '../exceptions/method-by-action-id';
import type { I18nRef } from '../common/i18n-ref'; // TD-452 — the pre-seed card's own {label,event_descriptor}_i18n siblings.
import { onboardingTunables } from './onboarding-tunables';
// W6.1 C1 (design 2026-08-12-w6.1-combat-production-design.md §4 D2) — the rival-seed half:
// RivalSeedService.ensurePlayerRivals, threaded onto THIS SAME transaction (D2's own critère: 0
// `.transaction()` internal to the seeder, so threading is purely additive — no nested-tx risk).
import { RivalSeedService } from '../operational/conflict/rival/rival-seed.service';
// LOT PLANQUE C2 (a) — l'écrivain du maillon `safehouses`, threadé sur CETTE transaction.
import { LaunderingPersistenceService } from '../operational/laundering_persistence/laundering-persistence.service';
import { laundringPersistenceTunables } from '../operational/laundering_persistence/laundering-persistence-tunables';
// TD-550 — l'amorce du nœud de chaîne d'approvisionnement (`supply_node_pressure`), threadée sur
// CETTE MÊME transaction, EXACTEMENT comme la planque ci-dessus (même risque pool-backed, même forme
// `tx` obligatoire en premier paramètre).
import { SupplyNodePressureRepository } from '../core_loops/supply_chain/supply-node-pressure.repository';

/**
 * The in-game DAY a `gameMinute` value falls on (integer division) — verbatim mirror of the SAME
 * small pure function this dépôt already keeps LOCAL per substrate rather than cross-importing
 * (`ambient-clock.ts`'s own header: "REUSE would create a cross-module import for a two-line pure
 * function — kept local per that file's own precedent"; `news-beat-clock.ts`/`random-world-clock.ts`
 * duplicate it the same way). Used ONCE below: a fresh account's `game_minute` is always 0 today
 * (design §0.6, measured — no account has a `city_sim_clock` row before ANY tick ever runs), so this
 * always resolves to 0; kept as a real division rather than hardcoding 0 so the C6 repair seam (a
 * LATER call, on a possibly-older account) still resolves correctly if that ever changes.
 */
function deriveGameDay(gameMinute: number, inGameDayLengthMinutes: number): number {
  return Math.floor(gameMinute / inGameDayLengthMinutes);
}

// Welcome grant, assets half — REUSE, source cited (SAME citation `auth.service.ts` already uses for
// the monetary half, TD-347): gdd/10_economy_and_monetization.md §Onboarding economy L178-181:
// "4 buildings owned (1 lab, 1 stash, 1 front, 1 safehouse)" + "1 district active (a Verge district)".
//
// D7 — Verge-A (districts.id=16, `0016_world_geography_seed.sql:30-32`: `(16,'verge-a',…)`, the
// SMALLEST id among the 3 seeded `verge`-profile districts) is FIXED, not randomized — deterministic
// E2E stability, same posture the design names explicitly.
const VERGE_A_DISTRICT_ID = 16;

// The 4 grant buildings: type + its index in the 12-member `building_operational_type` pgEnum
// (`operational_chain.ts:27-31` — `['front_shop', 'cash_safehouse', 'stash', 'lab', …]`, so
// front_shop=0, cash_safehouse=1, stash=2, lab=3). CASH_SAFEHOUSE_FORBIDDEN_DISTRICT='glass'
// (`real-estate.service.ts:184`) never applies here — Verge ≠ Glass, by construction of D7 (the
// design leaves this re-asserted in the E2E falsifiable, not enforced in code, since the chosen
// district makes it structurally unreachable).
const GRANT_BUILDINGS: ReadonlyArray<{ operationalType: M1OperationalType; buildingTypeIndex: number }> = [
  { operationalType: 'lab', buildingTypeIndex: 3 },
  { operationalType: 'stash', buildingTypeIndex: 2 },
  { operationalType: 'front_shop', buildingTypeIndex: 0 },
  { operationalType: 'cash_safehouse', buildingTypeIndex: 1 },
];

// ===== W1.1-a C4 — the roster half (design D8) =====
//
// Both recruits are COOK (`roleIdForArchetype('COOK')`, the SAME write-side mapping
// `LieutenantService.recruit` uses — `lieutenant-archetype.ts:213-241`), both assigned to the grant's
// OWN `lab` building (design C4 "Contenu": "tous deux assignés au lab du grant"), both
// granted_role='executor'/mode='delegated' (LieutenantService.recruit's own defaults, `lieutenant.
// service.ts:237-238` — kept for parity, they cost nothing and prepare the funnel's step 5). `name`
// stays the SAME literal placeholder the classic recruit path uses (`'Lieutenant'`,
// `lieutenant.service.ts:235`, TD-046 — the locale name-pool is deferred repo-wide, not invented here).
const COOK_GRANT_ROLE_ID = roleIdForArchetype('COOK');

// ===== W1.1-a C5 — the pre-seed half (design D4/D5/D9) =====
//
// `event_descriptor` is an i18n KEY (design C5 "Contenu": "clé i18n dans event_descriptor"), the SAME
// "back stores/forwards a dotted key, client resolves it" convention `random-world-exception-producer.
// service.ts`/`ambient-drift-exception-producer.service.ts` already established (TD-216) — the prose
// the key resolves to is a client-side i18n concern (W3.U9, out of this lot's rayon, design §2).
//
// ★ Design §6 Q2 is an OPEN product/editorial arbitrage (verbatim canon copy — "Lt. Hara: Buyer A
// unavailable for Route 3" — vs. a re-authored COOK/lab-consistent card, with a canon amendment either
// way): NOT resolved by this chunk. The canon quote names a specific route/buyer scenario that does not
// fit the COOK archetype D8 retained, and `projects/mafia_city_game/gdd/11_onboarding.md` reuses "Lt.
// Hara" as a RECURRING named character on Day 3/6 of the SAME funnel — rewriting it here would touch
// narrative canon well outside this chunk's rayon. The candidate actions below therefore use the SAME
// neutral, generic "Acknowledge / Escalate for review" pair `AmbientDriftExceptionProducerService`/
// `HeatPressureExceptionProducerService` already ship for an as-yet-unauthored card (see
// implementation-notes.md — this is a deliberate non-answer to Q2, not a silent pick of option (a) or
// (b); no canon file is touched by this chunk).
export const ONBOARDING_PRESEED_CARD_I18N_KEY = 'onboarding.preseed_exception.card';

/** The jsonb `source` tag D4 requires on `candidate_actions[0]` — the DB-enforced unique-index
 *  discriminant (`onboarding_preseed_unique_idx`, migration 0143, C1) AND the dedup key `session/open`
 *  strips before the client sees it (`stripInternalSourceTag`, design D12). Mirrors the established
 *  producer-internal-tag idiom verbatim (`HEAT_PRESSURE_SOURCE`, `heat-pressure-exception-producer.
 *  service.ts:27`). */
export const ONBOARDING_PRESEED_SOURCE = 'onboarding_preseed';

/** A pre-seed card's own candidate action — `CandidateActionView` narrowed to ALWAYS carry the D4 tag
 *  (mirrors `HeatPressureCandidateActionView`'s exact shape). */
interface OnboardingPreseedCandidateActionView extends CandidateActionView {
  readonly source: typeof ONBOARDING_PRESEED_SOURCE;
}

/** D9 — the ORDERED, AUTHORED list of pre-seed cards (`k` = this array's length; today `k = 1`,
 *  matching the canon "one, so as not to swamp the first contact", `day_1_funnel.md §2 step 3`). The
 *  injector below writes `min(T.onboard.preseed_exception_count, k)` of these, in order, and LOGS the
 *  clamp when the tunable exceeds `k` (D9) — it never fabricates a card beyond this authored list (⊥
 *  règle 4, no invented entity). `add_rule_dsl: null` on both actions (ONE_TIME/ESCALATE-capable, not
 *  ADD_RULE — nothing in the design requires teachability for the pre-seed card). */
const PRESEED_CARDS: ReadonlyArray<{
  eventDescriptor: string;
  // TD-452 — event_descriptor's i18n-safe sibling. `event_descriptor` above IS ALREADY the i18n key
  // (design C5 "clé i18n dans event_descriptor") — reused verbatim as `key`, not a NEW string (no EN
  // prose exists to copy for this one, out of TD-452's rayon; see implementation-notes.md).
  eventDescriptorI18n: I18nRef;
  actions: readonly [OnboardingPreseedCandidateActionView, OnboardingPreseedCandidateActionView];
}> = [
  {
    eventDescriptor: ONBOARDING_PRESEED_CARD_I18N_KEY,
    eventDescriptorI18n: { key: ONBOARDING_PRESEED_CARD_I18N_KEY, params: {} },
    actions: [
      {
        id: 'acknowledge',
        label: 'Acknowledge the lab status',
        // TD-452 — `en` in string_table.ts is a BYTE-IDENTICAL copy of the `label` literal above.
        label_i18n: { key: 'exception.onboarding_preseed.acknowledge.label', params: {} },
        projected_consequence: 'You note it; no automatic action is taken.',
        projected_consequence_i18n: { key: 'exception.onboarding_preseed.acknowledge.consequence', params: {} },
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.acknowledge, // Lot 0 §1 D4 (C2).
        source: ONBOARDING_PRESEED_SOURCE,
      },
      {
        id: 'escalate',
        label: 'Escalate for review',
        label_i18n: { key: 'exception.onboarding_preseed.escalate.label', params: {} }, // TD-452.
        projected_consequence: 'The card is archived for later review.',
        projected_consequence_i18n: { key: 'exception.onboarding_preseed.escalate.consequence', params: {} },
        add_rule_dsl: null,
        method: METHOD_BY_ACTION_ID.escalate, // Lot 0 §1 D4 (C2).
        source: ONBOARDING_PRESEED_SOURCE,
      },
    ],
  },
];

@Injectable()
export class OnboardingGrantService {
  private readonly logger = new Logger(OnboardingGrantService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly grantRepo: OnboardingGrantRepository,
    // W1.1-a C4 — the roster half.
    private readonly lieutenantRepo: LieutenantRepository,
    // W1.1-a C5 — the pre-seed half.
    private readonly exceptionsRepo: ExceptionsRepository,
    // W6.1 C1 — the rival-seed half.
    private readonly rivalSeedService: RivalSeedService,
    // LOT PLANQUE C2 (a) — provisionné DIRECTEMENT dans AuthModule et SessionModule, comme les
    // repositories voisins : la garde structurelle de ce fichier veut qu'aucun TIERS module ne
    // puisse atteindre ce chemin d'écriture par accident.
    private readonly launderingPersistence: LaunderingPersistenceService,
    // TD-550 — même provision DIRECTE, même garde structurelle : `SupplyNodePressureRepository` est
    // `@Inject(DB)`-only (trivialement cycle-safe, comme tous ses voisins ci-dessus).
    private readonly supplyNodePressure: SupplyNodePressureRepository,
  ) {}

  /**
   * Grant the assets half of the welcome grant (4 operational buildings) to a player. At-most-once
   * per player (D1.1 pt 1): the FIRST statement of this method's OWN transaction is a guarded UPDATE
   * on `welcome_grant_claimed_at` — 0 rows claimed means another call already holds (or finished)
   * the grant, and this call returns WITHOUT writing anything else. That is a documented no-op, never
   * an error, and it is the mechanism the D10.2 anti-exploit falsifiable relies on (two calls for the
   * same player ⇒ still exactly 4 buildings, never 8).
   *
   * ★★ W1.1-a C8 (blast-radius scoping) — the SAME guarded claim ALSO requires the account to have
   * gone through the REAL auth machinery at least once (an `auth_session` row exists for this
   * player's `account_id`). Measured (`2026-08-09-w1.1a-C6-C7-implementation-notes.md`'s own §★★★):
   * this seam runs on EVERY `session/open`, including the ~31 E2E files that seed a player DIRECTLY
   * in SQL and mint their own JWT (`playerTokenFor`-style helpers) to call it — bypassing
   * `AuthService.signup`/`signin` entirely, so `welcome_grant_claimed_at IS NULL` is indistinguishable
   * from "a crashed signup" by that column alone (C1's own hypothesis — a dedicated funnel-state
   * signal on `player_progression_state` — does NOT hold: `AuthService.signup`'s own
   * `.insert(playerProgressionState).values({ player_id: playerId })` and
   * `ProgressionRepository.ensureRow`'s LAZY create at `SessionService.open()` — the path a raw-SQL-
   * seeded player's FIRST `session/open` call always takes — write the BYTE-IDENTICAL row, defaults
   * included; nothing on that table tells the two apart).
   * `auth_session` DOES: `AuthService.establishSession` (called by BOTH `signup` and `signin`, NEVER
   * by a test's self-minted token) is the ONLY writer of that table (`auth.service.ts:658-664`), and
   * its row is never deleted (only `state`-transitioned on eviction/revocation) — so its EXISTENCE is
   * a permanent, write-once-at-real-auth-time fact. Verified empirically, not assumed: 0 of the 31
   * measured E2E files ever insert into `auth_session` for a PLAYER account (the 3 that DO insert
   * `account_credential` — `core_loops_bo`/`budgets_horizon_admin_bo`/`vertical_horizon_admin_bo` —
   * wire it to a SEPARATE `STAFF` account for BO login, never to the player calling `session/open`).
   * `EXISTS` costs one indexed correlated subquery, inside the SAME guarded UPDATE (I6 intact — no
   * read precedes this write; the guard is STILL its own proof, just a bigger one) — a raw-SQL-seeded
   * fixture now 0-row-matches FOREVER (same no-op posture as "already claimed"), while a genuine
   * signup/signin account keeps matching until the grant actually lands, preserving the repair path.
   *
   * Does NOT catch its own errors — a genuine failure (a broken query, a lost connection, the
   * defensive block-count check below, …) PROPAGATES to the caller. Containment (D1.1 pt 3) is the
   * CALLER's job, at the call site, mirroring `session.service.ts`'s own `hlCards.computeAndPersist`
   * try/catch precedent (`:140-150`) — NOT duplicated inside this service. `AuthService.signup`
   * (this chunk) is the first such caller.
   */
  async grantWelcomeAssets(playerId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // D1.1 pt 1 — the guarded claim, the FIRST statement of this transaction (I6 — no read before
      // this write; the guard IS the mutex). 0 rows ⇒ already claimed, a concurrent call is in-flight
      // (§0.7 couplage de latence — acceptable, happens at most once per account), OR (W1.1-a C8) this
      // account never went through real auth at all (no `auth_session` row — see this method's own
      // header) ⇒ stop, in every case WITHOUT writing anything else.
      const claimed = await tx
        .update(playerProgressionState)
        .set({ welcome_grant_claimed_at: sql`now()` })
        .where(
          and(
            eq(playerProgressionState.player_id, playerId),
            isNull(playerProgressionState.welcome_grant_claimed_at),
            sql`EXISTS (
              SELECT 1 FROM ${player}
              INNER JOIN ${authSession} ON ${authSession.account_id} = ${player.account_id}
              WHERE ${player.player_id} = ${playerId}::uuid
            )`,
          ),
        )
        .returning({ player_id: playerProgressionState.player_id });
      if (claimed.length === 0) return;

      // ===== W6.1 C1 — the rival-seed half (design D2) =====
      //
      // The ONLY production writer of `rival_state`/`rival_pair_pressure` this design adds (§0.2: 0
      // before this chunk — every prior writer was `_test`-only). Threaded on THIS SAME `tx`, exactly
      // like the roster/pre-seed halves below: a fault in the seed (an enum/FK drift) rolls back the
      // WHOLE grant, same as a fault anywhere else in this method (DF-9, design §1 D2 — the accepted,
      // named trade: exactly-once + full-grant atomicity over a partial-grant fallback). Placed BEFORE
      // the block query — the seed needs only `playerId`, no ordering dependency on the buildings below.
      await this.rivalSeedService.ensurePlayerRivals(playerId, tx);

      // D7 — the 4 SMALLEST block ids of Verge-A, DERIVED by query (never hardcoded).
      const blockRows = await tx
        .select({ id: blocks.id })
        .from(blocks)
        .where(eq(blocks.district_id, VERGE_A_DISTRICT_ID))
        .orderBy(asc(blocks.id))
        .limit(GRANT_BUILDINGS.length);
      if (blockRows.length < GRANT_BUILDINGS.length) {
        // Defensive only — the static seed (migration 0016) always has far more than 4 Verge-A
        // blocks (block_count is 30..80, §5 D2). A genuine miss here means the seed itself is
        // broken; that is a real failure the caller's containment must see, never a silent
        // fewer-than-4-buildings grant.
        throw new Error(
          `OnboardingGrantService: Verge-A (district ${VERGE_A_DISTRICT_ID}) has only ${blockRows.length} block(s), need ${GRANT_BUILDINGS.length}`,
        );
      }

      // acquired_at_tick / last_maintained_at_game_day — mirrors real-estate.repository.ts:216
      // (acquired_at_tick's own COALESCE) + applySetupBatch:512 (last_maintained_at_game_day's own
      // gameDay bind param). A fresh account has NO city_sim_clock row (design §0.6 — measured, not
      // deduced) ⇒ gameMinute 0 ⇒ gameDay 0. Read ONCE on this SAME tx and shared across all 4
      // buildings below — mirrors applySetupBatch sharing ONE gameDay bind param across its whole
      // batch, not a per-row re-read.
      const clockRows = await tx
        .select({ game_minute: citySimClock.game_minute })
        .from(citySimClock)
        .where(eq(citySimClock.player_id, playerId))
        .limit(1);
      const gameMinute = clockRows[0]?.game_minute ?? 0;
      const gameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);

      // I7 — conversionTunables.initialMaintenanceIntervalDays, resolved HERE (service layer, R2.3 —
      // the repository takes plain numbers only, `conversion-tunables.ts`'s own header convention).
      const maintenanceDueInDays = conversionTunables.initialMaintenanceIntervalDays;

      // D6 — free: no `economy_states` reference anywhere in this method or in the repository it
      // calls. A per-building loop (NOT the scheduler's batched-write discipline — that discipline is
      // for a recurring TICK across many players/rows; this is a one-time 4-row grant for ONE new
      // player, the same "single-row-per-action" shape `debitAndInsertPlayerBuilding`/
      // `debitAndCreateOperationalState` already use).
      //
      // W1.1-a C4 — captures the LAB's building_id as it is minted (GRANT_BUILDINGS[0] is 'lab' by
      // construction, above): the roster recruit below assigns both lieutenants to it.
      let labBuildingId: string | undefined;
      for (let i = 0; i < GRANT_BUILDINGS.length; i++) {
        const spec = GRANT_BUILDINGS[i];
        const { buildingId } = await this.grantRepo.insertOperationalBuilding(
          {
            playerId,
            blockId: blockRows[i].id,
            buildingTypeIndex: spec.buildingTypeIndex,
            operationalType: spec.operationalType,
            gameMinute,
            gameDay,
            maintenanceDueInDays,
          },
          tx,
        );
        if (spec.operationalType === 'lab') labBuildingId = buildingId;

        // ===== LOT PLANQUE C2, site (a) — LE MAILLON MANQUANT, POSÉ ICI =====
        //
        // Avant ce lot, `safehouses` avait **zéro écrivain de production** (3 modificateurs, 0 créateur —
        // mesuré, contrôle positif à 80 sur le motif frère) : le grant donnait le BÂTIMENT
        // `cash_safehouse` et personne ne créait jamais la LIGNE qui l'indexe. La chaîne du blanchiment
        // et celle de la vente butaient toutes deux sur cette absence — un seul maillon, deux écrans.
        //
        // ⛔ DANS **CETTE** TRANSACTION, et c'est pourquoi `tx` est le premier paramètre et qu'il est
        // OBLIGATOIRE : `db` est pool-backed. Un écrivain appelé sans le `tx` de ce grant prendrait une
        // AUTRE connexion, son insertion serait invisible à la revendication à-au-plus-une-fois ci-dessus,
        // et un échec ultérieur du grant laisserait une planque ORPHELINE — écrite alors que le compte
        // n'est « ni granté ni pas granté ». Threadé sur `tx`, la planque commit ou roule en arrière AVEC
        // les 4 bâtiments, le roster et la carte pré-semée.
        //
        // ⚠️ AMORCE (Q1-bis, ratifiée) : un slot plein. La planque de départ contient de quoi blanchir,
        // ce qui rend le parcours ㊵ INDÉPENDANT DU TICK — un compte frais peut injecter sans qu'aucune
        // horloge n'avance. Une planque vide offrirait au joueur un écran qui ne peut rien faire.
        // La forme suit le `slot_count` RÉSOLU, jamais un littéral à 4 éléments : la clé de registre a
        // une plage 1..12, et un littéral figé rendrait la bande fausse dès qu'elle bouge.
        if (spec.operationalType === 'cash_safehouse') {
          const slots = laundringPersistenceTunables.slotCount;
          const amorce = Array.from({ length: slots }, (_, k) => (k === 0 ? 100 : 0));
          await this.launderingPersistence.createSafehouse(tx, playerId, buildingId, amorce);
        }

        // ===== TD-550, site — amorce le nœud de chaîne d'approvisionnement pour CE bâtiment =====
        //
        // Avant ce lot, `GET /v1/supply-chain/graph` rendait `nodes: []` pour TOUT joueur : le SEUL
        // écrivain de production de `supply_node_pressure` est le tick `BACKPRESSURE_UPDATE`
        // (`backpressure-update.service.ts:89`), et ce tick ne tourne JAMAIS sur cette pile — l'horloge
        // du monde y est épinglée, `CITYSIM_CONTINUOUS_LOOPS` n'est posé que sur `docker-compose.
        // staging.yml`. La section "LA CHAÎNE, EN REMONTANT" de l'écran ㉚ n'avait donc AUCUNE source
        // pour un joueur neuf, et les 3 routes qui prennent un `building_id` de nœud étaient
        // inatteignables faute d'id à passer.
        //
        // Design §4.1 (2026-07-12-p3-C-supply-chain-design.md) : « Un node = un building du joueur
        // porteur d'un `building_operational_state` — les 12 `building_operational_type` », SANS
        // restriction de type. Les 4 bâtiments du grant sont donc amorcés UNIFORMÉMENT, dans LA MÊME
        // boucle qui les crée — pas de cas particulier par `operationalType` (contrairement au
        // safehouse ci-dessus, qui est spécifique à `cash_safehouse`).
        //
        // État CALME (`silent`, non bloqué) — la seule valeur qu'un bâtiment neuf, jamais soumis à un
        // tick réel, peut honnêtement porter (voir le commentaire de `seedCalmNode`).
        await this.supplyNodePressure.seedCalmNode(tx, playerId, buildingId);
      }
      if (!labBuildingId) {
        // Defensive only — GRANT_BUILDINGS names exactly one 'lab' entry above; this can never fire
        // for real, same posture as the block-count check above (a real failure must PROPAGATE, never
        // silently skip the roster/pre-seed that depend on this building).
        throw new Error('OnboardingGrantService: GRANT_BUILDINGS produced no lab building — cannot assign the roster.');
      }

      // ===== W1.1-a C4 — the roster half (design D8) =====
      //
      // Repository path (design §0.5, C3's own choice) — NOT LieutenantService.recruit: the grant is
      // not a purchase, and the service's validateAssignment gate (which the repository path never
      // plays) is exactly the READ the design's own §0.5 v3 note names as the thing this path skips
      // deliberately. Both recruits share `tx` (D1.1 pt 2 — one unit with the buildings above).
      const nameLocale = await this.lieutenantRepo.getPlayerLocale(playerId);
      const primary = await this.lieutenantRepo.recruit(
        {
          playerId,
          roleId: COOK_GRANT_ROLE_ID,
          source: 'civilian',
          name: 'Lieutenant', // placeholder — TD-046, byte-identical to the classic recruit path.
          nameLocale,
          grantedRole: 'executor',
          mode: 'delegated',
          assignedBuildingId: labBuildingId,
          targetBuildingId: null,
          primaryOrUnderstudy: 'primary',
        },
        tx,
      );
      await this.lieutenantRepo.recruit(
        {
          playerId,
          roleId: COOK_GRANT_ROLE_ID,
          source: 'civilian',
          name: 'Lieutenant',
          nameLocale,
          grantedRole: 'executor',
          mode: 'delegated',
          assignedBuildingId: labBuildingId,
          targetBuildingId: null,
          primaryOrUnderstudy: 'understudy',
          primaryForRoleId: COOK_GRANT_ROLE_ID,
        },
        tx,
      );

      // ===== W1.1-a C5 — the pre-seed half (design D4/D5/D9) =====
      //
      // D5 — lieutenant-scoped on the PRIMARY (`hasPendingPlayerLevelCard` is the wrong dedup surface
      // here — it guards player-LEVEL cards; this card is lieutenant-scoped by construction, matching
      // the canon "Lt. X: …" framing and the anti-flood effect design D5 names as intended).
      // D9 — clamp `T.onboard.preseed_exception_count` to the authored list length, LOGGING the clamp
      // (never fabricating a card beyond PRESEED_CARDS). `insert` threads `tx` on EVERY statement it can
      // reach (the cap-guard read D5 + the write itself + the W1.1-d C5 refusal trace on the refuse
      // branch — exceptions.repository.ts's own C5 header, merged at the cumulative-branch merge) so the
      // cap sees this transaction's OWN in-flight writes, not a blind connection.
      const requestedPreseedCount = onboardingTunables.preseedExceptionCount;
      const injectCount = Math.min(requestedPreseedCount, PRESEED_CARDS.length);
      if (requestedPreseedCount > PRESEED_CARDS.length) {
        this.logger.warn(
          `pre-seed CLAMPED (D9): T.onboard.preseed_exception_count=${requestedPreseedCount} > ` +
            `${PRESEED_CARDS.length} authored card(s) — injecting ${injectCount}, never a fabricated card.`,
        );
      }
      for (let i = 0; i < injectCount; i++) {
        const card = PRESEED_CARDS[i];
        await this.exceptionsRepo.insert(
          {
            player_id: playerId,
            lieutenant_id: primary.lieutenant_id,
            event_descriptor: card.eventDescriptor,
            event_descriptor_i18n: card.eventDescriptorI18n, // TD-452.
            candidate_actions: card.actions,
            suggested_action: card.actions[0],
            confidence: 0.8,
            severity: 20,
            priority: 20,
            resolution_status: 'pending',
          },
          tx,
        );
      }
    });
  }
}
