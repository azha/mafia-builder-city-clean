// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C7 (Session-open sequence +
//             P5 wall — the FULL open-payload aggregation, honestly closing the C2 `{ session_id }`
//             skeleton disclaimer, `session.controller.ts`'s own file-header note).
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §9 (session-open
//             sequence + projections) + §4 ("Response = the session-open sequence payload") + §8 (HL card
//             empty state — "the payload carries `hl_card: null` honestly").
//             Decisions: §1.12 D12 (anti-pattern wall — bands/booleans/counts only, no countdown) + R2.2
//             inversé (bands/ordinals only client-side; the payload tree IS the P5 wall this chunk
//             proves via the leak-scan, `session_lifecycle.spec.ts`).
//             — P3-A C7 — 2026-07-10
//
//             P3-B C6 (plan §C6, design D11/§1.11) GROWS the payload ADDITIVELY with `flag_review:
//             {pending_review_count, auto_open}` (module-cycle-safe: `FlagDisciplineRepository`
//             re-provided DIRECTLY, the SAME `ExceptionsRepository` precedent above — NEVER imports
//             `FlagDisciplineModule`/`LieutenantModule`) + relocates the D9 exhaustion-fallback's internal
//             `source` tag OUT of this queue view (⊥ C4 advisory, `stripInternalSourceTag`'s own header
//             carries the full reasoning + the honest boundary vs `GET /v1/exceptions/queue`).
//             — P3-B C6 — 2026-07-11
//
//             P3-D C7 (plan §C7, design §10.3/ruling #5) GROWS the payload ADDITIVELY AGAIN with
//             `settling_glance: {settling_count, all_clear}` — the EXACT `flag_review` pattern above,
//             re-realized for Loop 7: `AnnealingRepository` (trivially cycle-safe, `@Inject(DB)`-only) is
//             injected DIRECTLY (this time via a real `AnnealingModule` import in `session.module.ts` — see
//             that file's own header for why a direct import, not a re-provide, is safe here: unlike
//             `FlagDisciplineModule`, `AnnealingModule` has NO edge back into `SessionModule`).
//             — P3-D C7 — 2026-07-15
//
//             P3-E C8 (plan §C8, design §15) GROWS the payload ADDITIVELY TWICE MORE with `friction_glance:
//             {friction_bucket, penalty_active}` + `compression_glance: {stress_bucket, week_state,
//             forced}` — the EXACT `flag_review` re-provide pattern (NOT `settling_glance`'s direct-import
//             one): `DemolitionModule`/`CompressionModule` are BOTH reachable from `SessionModule` via
//             `Loop10Module`/`FlagDisciplineModule` (either one already imports THIS module, C6/C7's own
//             headers) — importing either module here would reopen the SAME cycle `ExceptionsModule`'s
//             own header already explains. `FrictionBudgetRepository` (demolition) and
//             `CompressionWeekRepository` (compression) are BOTH trivially cycle-safe by their OWN
//             dependency shape (`@Inject(DB)`[+`ProgressionRepository`, already resolvable here via the
//             existing `ProgressionModule` import] — no module-graph edge back to `SessionModule`) — so
//             BOTH are re-provided DIRECTLY in `session.module.ts`'s `providers:` array, the SAME
//             `FlagDisciplineRepository` precedent, NOT a 3rd/4th module import.
//             — P3-E C8 — 2026-07-18
//
//             W1.1-a C6 (design D1.1 pt 3/D10.2/D3/I5) GROWS the payload ADDITIVELY ONE MORE TIME with
//             `onboarding: {funnel_step, first_decision_recorded}` (design §3, R2.2 — an enum member +
//             a boolean, NEVER the raw `first_decision_at` timestamp). `build()` is ALSO where the
//             welcome-grant REPAIR SEAM lives (design I5, "tranché" — the tie-break between the
//             `SessionOpenedEvent` bus, which is async and MUTE on the idempotent-return path, and
//             `build()`, which is synchronous on BOTH paths, EVERY open): `OnboardingGrantService.
//             grantWelcomeAssets` is re-called here, on EVERY `session/open`, idempotent no-op once
//             claimed (D1.1 pt 1's own claim). BL-1 — `build()` is NOT contained by ITS OWN caller
//             (`session.service.ts:112`/`:152`, unlike the `hlCards` advisory block ten lines above
//             `:140-150`), so EVERYTHING this fold adds (the repair call AND the funnel-state writes) is
//             wrapped in its OWN try/catch, mirroring that EXACT precedent: a failure degrades to a
//             best-effort `onboarding` block (never a raw hardcoded default when a plain read can still
//             report the truth) and logs `error` with the stable marker `WELCOME_GRANT_REPAIR_FAILED` —
//             `session/open` ALWAYS still succeeds. See `buildOnboardingGlance` below for the full
//             account, including why the repair call runs BEFORE the queue/hl-card/budget composition
//             (a freshly-repaired pre-seed card should be visible in THIS SAME response, not the next
//             one) and why C3's OWN falsifiable — `count(buildings)=4` after a NOMINAL signup — is
//             deliberately NOT relaxed by this fold (§0.7/D1.1 pt 3: "la containment protège la
//             PRODUCTION, jamais le GATE").
//             — W1.1-a C6 — 2026-08-09
//
// `SessionOpenSequenceService` — composes the THREE already-landed projection surfaces (REUSE, never
// duplicated FORMULAS — see the module-cycle note below for the one piece of GLUE this file does
// re-implement, and why) into the ONE payload `POST /v1/session/open` returns (design §9):
//   - the exceptions queue (P3-A C3/C4): the SAME `ExceptionsRepository#listPending` rows +
//     `ExceptionsProjectionService#projectCard` + the exported PURE band functions `GET /v1/exceptions/
//     queue` uses (`ExceptionsService#listQueue`, byte-identical formulas) — sliced to the
//     `one_decision_queue_depth_visible` getter's top-N (R2.3 — canon "top-3", value-sensitive).
//   - `HlCardService#getCurrentCardProjection` (P3-A C7, added alongside this file) — the player's
//     currently carried HighestLeverageCard, bucket-projected, or `null` (design §8 empty state).
//   - `ProgressionRepository#getStructuralDecisionsThisSession` (P3-A C5/D10, REUSE unchanged) +
//     `coreLoopsTunables.structuralCapForPlayer` (P3-A C1/D8 seam, REUSE unchanged) — `structural_budget
//     = {used, cap_reached}` (R2.2: `used` is the player's OWN action count, not a hidden scalar;
//     `cap_reached` is a boolean — never the raw cap value here, mirrors the governor's OWN 409 wording
//     which never echoes the numeric cap either).
//
// ★ WHY `ExceptionsRepository`/`ExceptionsProjectionService` are RE-PROVIDED here (`session.module.ts`'s
// `providers:` array) rather than imported via `ExceptionsModule` (a HOW-level choice, mirrors
// `hl-card-types.ts`'s OWN "CODER-REALIZED DESIGN CHOICE" header convention): a first attempt injected
// `ExceptionsService` directly (needing `SessionModule` to `imports: [forwardRef(() => ExceptionsModule)]`
// — the "obviously correct" REUSE). That closed the DIRECT 2-way cycle correctly in isolation, but
// `ExceptionsModule` ALSO plainly imports `LieutenantModule`, which ALSO plainly imports `Loop10Module`
// — and `Loop10Module` ALREADY forwardRefs `SessionModule` (C6). The moment `SessionModule` gained ANY
// path back into `ExceptionsModule`'s neighborhood, NestJS's `DependenciesScanner` failed to boot with
// "The module at index [13] of the LieutenantModule imports array is undefined" (verified empirically —
// `docker compose build && up` on that exact change, TWICE, once reaching `ExceptionsModule` directly and
// once via an intermediate `CoreLoopsModule` — SAME failure both times, since `CoreLoopsModule` ALSO
// already plainly imports `ExceptionsModule`). `LieutenantModule`/`RealEstateModule`'s own plain
// `Loop10Module` imports would need their OWN forwardRef fix to fully close that WIDER graph — a much
// bigger, riskier blast radius across high-traffic files this chunk has no business touching.
//
// The FIX: `ExceptionsRepository` and `ExceptionsProjectionService` BOTH have a trivial, cycle-free
// dependency shape (`ExceptionsRepository` needs only `@Inject(DB)`, a `@Global()` token;
// `ExceptionsProjectionService` needs NOTHING at all). `session.module.ts` lists them as ADDITIONAL
// providers of ITS OWN (proper NestJS DI — NOT a manual `new`, still goes through the container) — this
// touches ONLY `SessionModule`'s `providers:` array (NestJS's circular-dependency scanner walks
// `imports:`, never `providers:`), so `SessionModule`'s `imports:` array is COMPLETELY UNCHANGED from its
// post-C6 shape. Two lightweight, stateless, DB-backed classes now have TWO DI-managed instances (one in
// `ExceptionsModule`'s scope, one in `SessionModule`'s) — harmless, since neither carries any in-memory
// state (all state lives in Postgres) and their query/projection LOGIC is reused VERBATIM either way,
// zero duplication of the actual R2.2 band formulas or the `listPending` query. Only the small
// `listQueue`-style ORCHESTRATION LOOP below (project each row, derive the queue-pressure/backlog bands)
// is a light re-implementation of `ExceptionsService#listQueue`'s OWN loop — `script_complexity_band`
// (which needs `LieutenantRepository`, and would reopen the EXACT SAME `LieutenantModule` fragility) is
// DELIBERATELY OMITTED from the session-open queue cards: a session-open "glance" need not carry the
// ADD_RULE-complexity warning band the FULL `GET /v1/exceptions/queue` view still does (byte-unchanged).

import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';

import { ApiError } from '../protocol/api-error'; // C3 (D7) — resolveLieutenantNames' foreign-id refusal.
import { coreLoopsTunables } from '../core_loops/core-loops-tunables';
import type { OnboardingFunnelStep } from '../db/schema/player_progression_state';
import { OnboardingGrantService } from '../onboarding/onboarding-grant.service';
import { OnboardingFunnelRepository, type OnboardingFunnelState } from '../onboarding/onboarding-funnel.repository';
import { ExceptionsRepository } from '../exceptions/exceptions.repository';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository'; // C3 (D7) — name resolution for buildQueueView's projectCard calls.
import {
  ExceptionsProjectionService,
  queuePressureBand,
  backlogBadge,
  suggestedDisposition,
  type ExceptionCardProjection,
  type CandidateActionView,
  type QueuePressureBand,
} from '../exceptions/exceptions.projection.service';
import { HlCardService } from '../progression/loop10/hl-card.service';
import type { HighestLeverageCardProjection } from '../progression/loop10/hl-card-projection';
import { ProgressionRepository } from '../progression/progression.repository';
import { FlagDisciplineRepository } from '../core_loops/flag_discipline/flag-discipline.repository';
import { AnnealingRepository } from '../core_loops/annealing/annealing.repository';
import { FrictionBudgetRepository } from '../core_loops/demolition/friction-budget.repository';
import { frictionBudgetBucket, type FrictionBudgetBucket } from '../core_loops/demolition/friction-budget-bucket';
import { CompressionWeekRepository } from '../core_loops/compression/compression-week.repository';
import { stressBucket, type StressBucket } from '../core_loops/compression/stress-bucket';
import { SessionRepository } from './session.repository';

/** The session-open payload's `flag_review` glance block (design D11/§1.11, ch05 Loop 2): ADDITIVE,
 *  computed module-cycle-safe (see the class header below). `pending_review_count` is the player's OWN
 *  PENDING flag-card count (own-content list length — R2.2 allowed, `GET /v1/flag-review` would return
 *  exactly this many cards); `auto_open` = pending flags exist AND this is the FIRST session of the
 *  current game-day (`opened_game_day`-derived, D11). */
export interface FlagReviewGlance {
  pending_review_count: number;
  auto_open: boolean;
}

/** The session-open payload's `settling_glance` block (P3-D C7, design §10.3/ruling #5, ch05 Loop 7):
 *  ADDITIVE, the EXACT `FlagReviewGlance` shape/spirit re-realized — `settling_count` is the player's OWN
 *  count of buildings CURRENTLY actively settling (own-content count length — R2.2 allowed, `GET /v1/
 *  annealing/rolling-queue`'s own `settling` array would return exactly this many entries);
 *  `all_clear = settling_count === 0` (a derived boolean, mirrors `flag_review.auto_open`'s own
 *  closed-domain-flag precedent — never the raw `settling_ends_at`/remaining minutes, R2.2/P5). */
export interface SettlingGlance {
  settling_count: number;
  all_clear: boolean;
}

/** The session-open payload's `friction_glance` block (P3-E C8, design §15, ch05 Loop 8): ADDITIVE, the
 *  aggregate `friction_bucket` (`frictionBudgetBucket`, the SAME §4.3 formula `GET /v1/friction/state`
 *  uses — zero drift) + `penalty_active` (own boolean state) — R2.2, never the raw
 *  `friction_budget_total`/`friction_threshold`. */
export interface FrictionGlance {
  friction_bucket: FrictionBudgetBucket;
  penalty_active: boolean;
}

/** The session-open payload's `compression_glance` block (P3-E C8, design §15/§9.2b, ch05 Loop 9):
 *  ADDITIVE, `stress_bucket` (`stressBucket`, the SAME §15 formula `GET /v1/compression/state` uses) +
 *  `week_state` (the `compression_week_state` ENUM value itself, already qualitative) + `forced` (off the
 *  player's OWN non-terminal `compression_events` row — design §9.2(b): "la clé compression_glance
 *  signale forced: true" when the FORCED-engage session-open check just fired). R2.2, never the raw
 *  `org_stress`. */
export interface CompressionGlance {
  stress_bucket: StressBucket;
  week_state: string;
  forced: boolean;
}

/** The session-open payload's `onboarding` block (W1.1-a C6, design §3): ADDITIVE, the funnel-state
 *  glance — `funnel_step` (the `onboarding_funnel_step` ENUM value itself, already qualitative — mirrors
 *  `compression_glance.week_state`'s own "the enum value IS the projection" precedent) +
 *  `first_decision_recorded` (a derived boolean off `first_decision_at IS NOT NULL` — mirrors
 *  `flag_review.auto_open`'s own closed-domain-flag precedent). R2.2/P5: NEVER the raw
 *  `first_decision_at` timestamp, NEVER a countdown to the design's `T.onboard.first_decision_target_s`
 *  (that tunable has no server consumer at all in this lot, design §0.9/§3 point 4). */
export interface OnboardingGlance {
  funnel_step: OnboardingFunnelStep;
  first_decision_recorded: boolean;
}

/** D3 (⊥ règle 7 — no prose carve-out for a deferred value, ever): the `onboarding_funnel_step` pgEnum's
 *  8 members; EXACTLY 5 are server-observable in THIS lot (this file's own writers — HOME_FIRST/
 *  QUIET_STATE — plus `OnboardingFunnelRepository.recordDecision`'s FIRST_COMMIT/SECOND_DECISION, plus
 *  the LAUNCH column default — never produce the other 3). `satisfies Record<OnboardingFunnelStep,
 *  boolean>` is EXHAUSTIVE BY CONSTRUCTION: a 9th member added to the `onboarding_funnel_step` pgEnum
 *  without a corresponding entry here is a TypeScript COMPILE ERROR (a missing `Record` key), never a
 *  silently-stale "not yet" comment — the DI-boot-failure pendant D10.2 already established for the
 *  grant capacity, applied here to the enum domain instead. WELCOME/EXCEPTION_DETAIL/EXPLORE are
 *  client-only (design §2/§7, deferred to W1.1-b) — `false`, never written by any server code in this
 *  lot. Consumed by `buildOnboardingGlance` below as a genuine defensive check, not dead documentation. */
const SERVER_OBSERVABLE_FUNNEL_STEP = {
  LAUNCH: true,
  WELCOME: false,
  HOME_FIRST: true,
  EXCEPTION_DETAIL: false,
  FIRST_COMMIT: true,
  SECOND_DECISION: true,
  QUIET_STATE: true,
  EXPLORE: false,
} satisfies Record<OnboardingFunnelStep, boolean>;

/** The stable, greppable log marker (design D1.1 pt 3) — a broken welcome-grant repair (or a broken
 *  funnel-state write, both wrapped in the SAME try/catch below) degrades `session/open`'s `onboarding`
 *  block rather than 500ing the whole request. Exported so the falsifiable that asserts NON-appearance
 *  after a nominal signup (`onboarding_grant_assets.spec.ts`, C3) and any FUTURE spec asserting its
 *  appearance under an injected fault can both cite the SAME literal, never a re-typed copy. */
export const WELCOME_GRANT_REPAIR_FAILED_MARKER = 'WELCOME_GRANT_REPAIR_FAILED';

/** The FULL `POST /v1/session/open` response (design §9 — the exact shape, plan §C7; P3-B C6 GREW it
 *  additively with `flag_review`, design D11; P3-D C7 GREW it additively AGAIN with `settling_glance`,
 *  design §10.3/ruling #5; P3-E C8 GREW it additively TWICE MORE with `friction_glance`+
 *  `compression_glance`, design §15; W1.1-a C6 GREW it additively ONE MORE TIME with `onboarding`,
 *  design §3; W3.U1 C2 GREW it additively ONE MORE TIME with `opened_game_day`, design D3/§3-bis —
 *  forme F du socle, CLAUDE.md : la donnée était déjà en base, déjà relue, déjà passée en argument à
 *  `build()` ci-dessous [P3-B C6, D11] — seule la PROJECTION l'omettait. Ce chunk n'ajoute aucun
 *  écrivain, il émet la valeur que ce fichier tient déjà.): un ensemble fermé de **12** clés de premier
 *  niveau. `queue` est DÉJÀ plafonné au getter de profondeur (R2.3, value-sensitive — faire varier
 *  `core_loops.one_decision_queue_depth_visible` change combien de cartes ce tableau porte, prouvé en
 *  E2E). */
export interface SessionOpenSequencePayload {
  session_id: string;
  hl_card: HighestLeverageCardProjection | null;
  queue: ExceptionCardProjection[];
  backlog_badge: boolean;
  queue_pressure_band: QueuePressureBand;
  structural_budget: { used: number; cap_reached: boolean };
  flag_review: FlagReviewGlance;
  settling_glance: SettlingGlance;
  friction_glance: FrictionGlance;
  compression_glance: CompressionGlance;
  onboarding: OnboardingGlance;
  /** W3.U1 C2 (design D3/§3-bis) — le jour de jeu AUQUEL cette session a ouvert : la MÊME valeur que
   *  `openedGameDay` reçu en argument par `build()`, jamais recalculée ni re-lue (un seul read d'horloge,
   *  déjà fait par l'appelant — P3-B C6's "ONE clock read" discipline). Alimente le `TopBar` (temps
   *  in-game) et Daily Review ("Day N") côté client — le MÊME trou de surface (§1.3.d/§1.3.e #3, #23). */
  opened_game_day: number;
}

@Injectable()
export class SessionOpenSequenceService {
  constructor(
    private readonly exceptionsRepo: ExceptionsRepository,
    private readonly exceptionsProjection: ExceptionsProjectionService,
    // Module-cycle note (file header): SAME class HlCardService `session.service.ts` already forwardRefs
    // for `computeAndPersist` — mirrored here for consistency, though this specific edge (this file does
    // not import `session.service.ts` back) does not strictly require it.
    @Inject(forwardRef(() => HlCardService)) private readonly hlCards: HlCardService,
    private readonly progressionRepo: ProgressionRepository,
    // P3-B C6 (D11/§1.11) — re-provided DIRECTLY (mirrors `ExceptionsRepository`/`ExceptionsProjectionService`
    // above): `FlagDisciplineRepository`'s dependency shape is trivially cycle-safe (`@Inject(DB)` only) —
    // `FlagDisciplineModule` imports `SessionModule`, so importing `FlagDisciplineModule` HERE would be the
    // reverse edge of the SAME cycle this file's header already explains for `ExceptionsModule`.
    private readonly flagDisciplineRepo: FlagDisciplineRepository,
    // P3-D C7 (design §10.3/ruling #5) — `AnnealingRepository` (trivially cycle-safe, `@Inject(DB)`-only),
    // resolved via a REAL `AnnealingModule` import in `session.module.ts` (unlike `FlagDisciplineModule`,
    // `AnnealingModule` has no edge back into `SessionModule` — no re-provide needed, see that file's
    // header). Backs the `settling_glance` count read below.
    private readonly annealingRepo: AnnealingRepository,
    // P3-E C8 (design §15) — `FrictionBudgetRepository`/`CompressionWeekRepository`, BOTH re-provided
    // DIRECTLY (mirrors `FlagDisciplineRepository` above — see file header for why: `DemolitionModule`/
    // `CompressionModule` are BOTH reachable back to `SessionModule`, so a real module import would
    // reopen a cycle). Back the `friction_glance`/`compression_glance` glance reads below.
    private readonly frictionRepo: FrictionBudgetRepository,
    private readonly compressionRepo: CompressionWeekRepository,
    // The SAME-module `SessionRepository` (zero cycle risk — `@Inject(DB)`-rooted) — the `auto_open`
    // arbiter query (`hasOtherSessionOpenedOnGameDay`) lives there (it owns `gameplay_sessions`).
    private readonly sessionRepo: SessionRepository,
    // W1.1-a C6 (design D1.1 pt 3/D10.2) — the repair seam: re-provided DIRECTLY in `session.module.ts`
    // (see that file's header — `AuthModule.imports` stays EMPTY, this is a SEPARATE DI instance from
    // the one `AuthModule` provisions for `signup`'s own call, never a re-export).
    private readonly onboardingGrant: OnboardingGrantService,
    // W1.1-a C6 (design D3) — the funnel-state HOME_FIRST/QUIET_STATE writers + read-back.
    private readonly onboardingFunnelRepo: OnboardingFunnelRepository,
    // C3 (D7, L0.5) — `projectCard(row, names)`'s name-resolution source for `buildQueueView` below.
    // Module-cycle note (file header): trivially `@Inject(DB)`-only, ALREADY re-provided DIRECTLY in
    // `session.module.ts` (W1.1-a C6, for `OnboardingGrantService`'s OWN dependency graph) — this
    // injection reuses that SAME provider, zero new module wiring.
    private readonly lieutenantRepo: LieutenantRepository,
  ) {}

  private readonly logger = new Logger(SessionOpenSequenceService.name);

  /**
   * Build the full open-payload for `sessionId` (already open/idempotent-returned by the caller,
   * `SessionService#open` — this method is a PURE READ composition, no write of its own [EXCEPT the
   * W1.1-a C6 fold below, which is deliberately CONTAINED — see `buildOnboardingGlance`]). Runs on
   * EVERY `open()` call (fresh AND idempotent-return alike) — a re-opened idempotent session still
   * reflects the player's CURRENT queue/HL-card/budget state, not a stale snapshot from whenever the
   * session originally opened.
   *
   * P3-B C6 (D11) — `openedGameDay` is THIS session's OWN `opened_game_day` (the caller, `SessionService
   * #open`, already knows it — either freshly-stamped or read off the active row; NO 2nd clock read here).
   * Threaded into `buildFlagReviewGlance` for the `auto_open` derivation.
   */
  async build(playerId: string, sessionId: string, openedGameDay: number): Promise<SessionOpenSequencePayload> {
    const depth = coreLoopsTunables.oneDecisionQueueDepthVisible;
    const cap = coreLoopsTunables.structuralCapForPlayer(playerId);

    // W1.1-a C6 (design I5/D1.1 pt 3) — the repair seam + funnel-state writers run FIRST, sequentially,
    // BEFORE the queue/hl-card/budget composition below: if the grant was still missing (a crashed
    // signup) and this call REPAIRS it, the freshly-inserted pre-seed card should be visible in THIS
    // SAME response's `queue`, not only from the NEXT `session/open` onward. Fully CONTAINED (its own
    // header + `buildOnboardingGlance`'s own doc) — never throws, `session/open` always still succeeds.
    const onboarding = await this.buildOnboardingGlance(playerId);

    const [queueView, hlCard, used, flagReview, settlingGlance, frictionGlance, compressionGlance] = await Promise.all([
      this.buildQueueView(playerId, depth),
      this.hlCards.getCurrentCardProjection(playerId),
      this.progressionRepo.getStructuralDecisionsThisSession(playerId),
      this.buildFlagReviewGlance(playerId, sessionId, openedGameDay),
      this.buildSettlingGlance(playerId),
      this.buildFrictionGlance(playerId),
      this.buildCompressionGlance(playerId),
    ]);

    return {
      session_id: sessionId,
      hl_card: hlCard,
      queue: queueView.cards,
      backlog_badge: queueView.backlogBadge,
      queue_pressure_band: queueView.queuePressureBand,
      structural_budget: { used, cap_reached: used >= cap },
      flag_review: flagReview,
      settling_glance: settlingGlance,
      friction_glance: frictionGlance,
      compression_glance: compressionGlance,
      onboarding,
      opened_game_day: openedGameDay,
    };
  }

  /**
   * W1.1-a C6 (design D1.1 pt 3/D10.2/D3) — the ONLY non-pure-read step of `build()`: (a) re-call the
   * welcome-grant repair seam (`OnboardingGrantService.grantWelcomeAssets`, idempotent no-op once
   * claimed — D1.1 pt 1's own guarded claim, so this is a genuine 0-row-match in steady state, the SAME
   * cost profile as `PressureTierService.onSessionStart`), THEN (b) attempt the two funnel-step guarded
   * advances (HOME_FIRST from LAUNCH; QUIET_STATE from FIRST_COMMIT/SECOND_DECISION when the queue is
   * empty — BOTH self-contained guarded UPDATEs, `OnboardingFunnelRepository`'s own header, I6), THEN
   * (c) report the resulting state — using whichever guarded UPDATE's own `RETURNING` matched (no extra
   * read needed) or, if NEITHER matched (the common steady-state case once an account is past both
   * one-time transitions), ONE plain read-for-display (never followed by a write in this call — not the
   * read-then-write I6 forbids).
   *
   * ★★ BL-1 CONTAINMENT — the précédent EXACT this mirrors is `session.service.ts:140-150`'s
   * `hlCards.computeAndPersist` try/catch ("never let an advisory-compute failure surface as a 500 on
   * `open()` … degrades … with the session itself still opened successfully"): `build()` is the RETURN
   * of `open()` on BOTH paths (`session.service.ts:112`/`:152`) and is NOT contained by its caller —
   * without this try/catch, a broken grant repair here would MOVE the 500 from `signup` to
   * `session/open` instead of removing it (design v2's own BLOCKING mistake, BL-1). On failure: log
   * `error` with the stable marker `WELCOME_GRANT_REPAIR_FAILED_MARKER`, attempt ONE honest fallback
   * read (report the REAL current state rather than lie with a hardcoded default — the funnel-state
   * writes above are independent, unwrapped guarded UPDATEs; a throw from the grant repair does not
   * roll them back), and if even THAT read fails (the DB itself is unreachable — the whole request is
   * failing regardless), fall back to the honest "nothing observed" default. `session/open` NEVER 500s
   * for this reason, on either branch.
   *
   * ★ Non-assertion (règle de triage, not testable — no fault-injection exists in this repo to trigger
   * it): the EXPECTED red for a genuinely broken grant is C3's own falsifiable
   * (`onboarding_grant_assets.spec.ts` — `count(buildings)=4` etc. — deliberately NOT relaxed by this
   * containment, §0.7/D1.1 pt 3: "la containment protège la PRODUCTION, jamais le GATE"), NEVER a 500 on
   * `session/open`. If a future gate run shows the LATTER instead of the FORMER, the containment below
   * has itself regressed — read it as a bug report, not something to write a test for.
   */
  private async buildOnboardingGlance(playerId: string): Promise<OnboardingGlance> {
    try {
      await this.onboardingGrant.grantWelcomeAssets(playerId);

      const homeFirst = await this.onboardingFunnelRepo.advanceHomeFirst(playerId);
      const quiet = homeFirst ? null : await this.onboardingFunnelRepo.advanceQuietStateIfQueueEmpty(playerId);
      const state: OnboardingFunnelState = homeFirst ?? quiet ?? (await this.onboardingFunnelRepo.getCurrentState(playerId));

      if (!SERVER_OBSERVABLE_FUNNEL_STEP[state.funnelStep]) {
        // Defensive only (⊥ règle 7's own exhaustive table) — no server writer in this lot EVER sets a
        // client-only step; this can only fire if a FUTURE W1.1-b writer regresses that invariant.
        this.logger.error(
          `OnboardingGlance: unexpected client-only funnel step '${state.funnelStep}' read off ` +
            `player_progression_state for player ${playerId} — no server writer in this lot ever sets this.`,
        );
      }

      return { funnel_step: state.funnelStep, first_decision_recorded: state.firstDecisionAt !== null };
    } catch (err) {
      this.logger.error(
        `${WELCOME_GRANT_REPAIR_FAILED_MARKER} — grant repair/funnel-state write failed for player ` +
          `${playerId}, degrading (session/open still succeeds): ${err instanceof Error ? err.message : String(err)}`,
      );
      try {
        const state = await this.onboardingFunnelRepo.getCurrentState(playerId);
        return { funnel_step: state.funnelStep, first_decision_recorded: state.firstDecisionAt !== null };
      } catch {
        // The DB itself is unreachable — the whole request is failing regardless; report the honest
        // "nothing observed" default rather than throw a SECOND time out of this already-caught branch.
        return { funnel_step: 'LAUNCH', first_decision_recorded: false };
      }
    }
  }

  /**
   * P3-E C8 (design §15) — the `friction_glance`: the aggregate `friction_bucket` read off the CACHED
   * `friction_budget_state` row (`FrictionBudgetRepository.getRow`, the SAME cache `GET /v1/friction/
   * state` reads — zero drift, zero recompute here) + `penalty_active`. A player with no row yet (never
   * ticked) reads the honest empty-state default (`light`/`false` — mirrors `flag_review.auto_open`'s own
   * closed-domain-flag precedent for "no state yet").
   */
  private async buildFrictionGlance(playerId: string): Promise<FrictionGlance> {
    const row = await this.frictionRepo.getRow(playerId);
    if (!row) {
      return { friction_bucket: 'light', penalty_active: false };
    }
    const total = Number(row.friction_budget_total);
    const threshold = row.friction_org_size * coreLoopsTunables.demolitionFrictionBudgetThresholdMultiplierOfOrgSize;
    const bucket = threshold > 0
      ? frictionBudgetBucket(
          total / threshold,
          coreLoopsTunables.demolitionFrictionBucketLightUpperBound,
          coreLoopsTunables.demolitionFrictionBucketBalancedUpperBound,
          coreLoopsTunables.demolitionFrictionBucketStrainedUpperBound,
        )
      : 'light';
    return { friction_bucket: bucket, penalty_active: row.efficiency_penalty_active };
  }

  /**
   * P3-E C8 (design §15/§9.2b) — the `compression_glance`: `stress_bucket` (`stressBucket`, the SAME §15
   * formula `GET /v1/compression/state` uses) + `week_state` + `forced` (off the player's OWN
   * non-terminal `compression_events` row, `CompressionWeekRepository.getStateProjection` REUSE — the
   * SAME single read `GET /v1/compression/state` shares, zero 2nd query shape). ★ Eventual-consistency
   * note (honest, documented — NOT a bug): the C7 FORCED-engage session-open check
   * (`CompressionSessionOpenedSubscriber`) fires off the SAME `SessionOpenedEvent` this `build()` call is
   * itself composing a response for — that subscriber's OWN header already documents its DB write may
   * complete AFTER this response is built (bus dispatch is synchronous, the listener body is `async`).
   * `forced: true` therefore reflects reliably from the NEXT `open()` call onward, not necessarily THIS
   * one — the IDENTICAL eventual-consistency shape `CompressionStressSubscriber` already accepts.
   */
  private async buildCompressionGlance(playerId: string): Promise<CompressionGlance> {
    const { orgStress, weekState, forced } = await this.compressionRepo.getStateProjection(playerId, coreLoopsTunables.compressionForceEngagementThreshold);
    const bucket = stressBucket(orgStress, weekState, coreLoopsTunables.compressionStressBucketCalmUpperBound, coreLoopsTunables.compressionStressThresholdTrigger);
    return { stress_bucket: bucket, week_state: weekState, forced };
  }

  /**
   * P3-D C7 (design §10.3/ruling #5) — the `settling_glance`: `settling_count` (own-content list length,
   * R2.2 — `AnnealingRepository.listActiveSettlingForPlayer`, the SAME derived predicate the C7 rolling-
   * queue/dispatch-compose reads share) + `all_clear` (a derived boolean, mirrors `flag_review.auto_open`'s
   * own closed-domain-flag precedent).
   */
  private async buildSettlingGlance(playerId: string): Promise<SettlingGlance> {
    const settlingRows = await this.annealingRepo.listActiveSettlingForPlayer(playerId);
    return { settling_count: settlingRows.length, all_clear: settlingRows.length === 0 };
  }

  /**
   * P3-B C6 (design D11/§1.11) — the `flag_review` glance: `pending_review_count` (own-content list
   * length, R2.2) + `auto_open` (pending flags exist AND no OTHER session row already carries THIS
   * session's `opened_game_day` — `SessionRepository.hasOtherSessionOpenedOnGameDay`, excluding
   * `sessionId` itself). DB-only reads (`FlagDisciplineRepository`/`SessionRepository`, both re-provided
   * or SAME-module) — module-cycle-safe by construction (no `LieutenantModule`/`FlagDisciplineModule`
   * import anywhere in this file).
   */
  private async buildFlagReviewGlance(playerId: string, sessionId: string, openedGameDay: number): Promise<FlagReviewGlance> {
    const [pendingReviewCount, otherSessionSameDay] = await Promise.all([
      this.flagDisciplineRepo.countPendingFlagsForPlayer(playerId),
      this.sessionRepo.hasOtherSessionOpenedOnGameDay(playerId, openedGameDay, sessionId),
    ]);
    return {
      pending_review_count: pendingReviewCount,
      auto_open: pendingReviewCount > 0 && !otherSessionSameDay,
    };
  }

  /**
   * The queue slice of the payload — mirrors `ExceptionsService#listQueue`'s OWN orchestration (SAME
   * `listPending` rows, SAME `projectCard` + `suggestedDisposition`/`queuePressureBand`/`backlogBadge`
   * pure functions — zero reimplementation of any band FORMULA), capped to the top-N depth getter.
   * `script_complexity_band` is deliberately NOT computed here (file header — the `LieutenantModule`
   * module-cycle fragility this design avoids); `suggested_disposition` IS computed (pure, no extra
   * query) for full fidelity with the confidence-threshold "Escalate suggested" signal. C3 (D7) —
   * `projectCard`'s `names` argument DOES read `lieutenant` (via `LieutenantRepository`, re-provided
   * DIRECTLY in `session.module.ts`, trivially `@Inject(DB)`-only): this is NOT the avoided
   * `LieutenantModule` import (a real module edge into `LieutenantModule.imports`/providers graph) — the
   * SAME distinction `FlagDisciplineRepository`/`FrictionBudgetRepository` above already draw.
   */
  private async buildQueueView(
    playerId: string,
    depth: number,
  ): Promise<{ cards: ExceptionCardProjection[]; queuePressureBand: QueuePressureBand; backlogBadge: boolean }> {
    const rows = await this.exceptionsRepo.listPending(playerId);
    const confidenceThreshold = coreLoopsTunables.exceptionSuggestedActionConfidenceThreshold;
    const depthRows = rows.slice(0, depth);
    // C3 (D7) — resolve every referenced lieutenant's name ONCE, before projecting any card (only the
    // depth-capped slice is ever projected — no name resolved for a row the payload never returns).
    const names = await this.resolveLieutenantNames(playerId, depthRows);

    const cards: ExceptionCardProjection[] = depthRows.map((r) => {
      const card = this.exceptionsProjection.projectCard(r, names);
      card.suggested_disposition = suggestedDisposition(r.confidence, confidenceThreshold);
      // ⊥ C4 advisory (P3-B C6, controller opt-in) — strip the D9 exhaustion-fallback's internal
      // `source: 'FLAG_TOKEN_EXHAUSTION'` categorization tag from this view (see `stripInternalSourceTag`
      // below for the full reasoning: this is the ONE clean seam that removes it from a player payload
      // WITHOUT touching `src/exceptions/` or adding a migration).
      card.candidate_actions = card.candidate_actions.map((a) => this.stripInternalSourceTag(a));
      // `suggested_action` is `null` on a card with no real suggestion (D4, r1-C2/MAJOR-2) — nothing to strip.
      if (card.suggested_action) card.suggested_action = this.stripInternalSourceTag(card.suggested_action);
      return card;
    });

    const cap = coreLoopsTunables.exceptionQueueCapPerLieutenant;
    const warn = coreLoopsTunables.exceptionQueueWarnThresholdPerLieutenant;
    const byScope = new Map<string, number>();
    for (const r of rows) {
      const key = r.lieutenant_id ?? '__player_level__';
      byScope.set(key, (byScope.get(key) ?? 0) + 1);
    }
    let worst: QueuePressureBand = 'normal';
    for (const count of byScope.values()) {
      const band = queuePressureBand(count, cap, warn);
      if (band === 'saturated') {
        worst = 'saturated';
        break; // saturated is the worst possible band — no later scope can push it further.
      }
      if (band === 'warning') worst = 'warning';
    }

    const backlog = backlogBadge(rows.length, coreLoopsTunables.exceptionBacklogBadgeThreshold);

    return { cards, queuePressureBand: worst, backlogBadge: backlog };
  }

  /**
   * C3 (D7, L0.5) — the SAME name-resolution step `ExceptionsService#resolveLieutenantNames` performs
   * (a per-class local copy — this file's own header discipline: zero cross-file coupling for a small
   * helper, mirrors `ExceptionsService`/`session-open-sequence.service.ts` already keeping their OWN
   * copies of small conveniences rather than sharing one across files). The DISTINCT non-null
   * `lieutenant_id`s across `rows`, resolved via `LieutenantRepository.namesByIds` (player-scoped),
   * size-checked against the requested id set — a shortfall refuses the WHOLE session-open payload
   * (D7's own "un id étranger devient une absence détectable et refusée").
   */
  private async resolveLieutenantNames(
    playerId: string,
    rows: readonly { lieutenant_id: string | null }[],
  ): Promise<ReadonlyMap<string, string>> {
    const ids = [...new Set(rows.map((r) => r.lieutenant_id).filter((id): id is string => id !== null))];
    const names = await this.lieutenantRepo.namesByIds(playerId, ids);
    if (names.size !== ids.length) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: 'The session-open queue glance references a lieutenant that is not this player\'s.',
      });
    }
    return names;
  }

  /**
   * ⊥ C4 advisory relocation (P3-B C6, controller opt-in) — strip an internal `source` categorization
   * key from ONE candidate action if present, never mutating the input.
   *
   * BACKGROUND: `FlagExhaustionFallbackService` (P3-B C4, D9) tags each of its 2 candidate actions with
   * `source: 'FLAG_TOKEN_EXHAUSTION'` (that file's own header: "extra keys on a locally-typed object
   * round-trip transparently"). `ExceptionsProjectionService#projectCard` forwards `candidate_actions`/
   * `suggested_action` VERBATIM (its own header: "a transparent round-trip of the producer's
   * CandidateActionView objects") — so the tag rides all the way to whichever surface calls
   * `projectCard`. The C4 ⊥ reviewer accepted this as non-R2.2-violating (a categorization label, not a
   * raw internal scalar/score) but flagged it for relocation OUT of the player payload wherever a clean
   * seam exists WITHOUT touching `src/exceptions/` (that module's own D9 zero-semantic-edits wall) or
   * adding a migration.
   *
   * THE SEAM: `buildQueueView` above already RE-PROJECTS each row through `projectCard` OUTSIDE
   * `src/exceptions/` (this file lives in `src/session/`, the SAME "light re-implementation of the
   * orchestration loop, never the FORMULA" discipline this file's own header already establishes for the
   * exceptions queue view). Stripping the tag HERE removes it from the session-open glance's queue view
   * with ZERO `src/exceptions/` edits and ZERO migration.
   *
   * THE HONEST BOUNDARY: `GET /v1/exceptions/queue` (the direct endpoint — `ExceptionsService.listQueue`
   * / `exceptions.controller.ts`, entirely inside `src/exceptions/`) has NO such clean seam under the D9
   * wall — it KEEPS the tag, documented (not silently left inconsistent). `flag_review_surface.spec.ts`
   * asserts BOTH sides: the direct endpoint still carries `source`; the session-open queue view does not.
   *
   * A no-op for every OTHER exception card in the codebase (none of them carry a `source` key — the
   * destructure-and-rest simply shallow-copies the object unchanged), so this is zero-regression for
   * every existing session-open consumer.
   */
  private stripInternalSourceTag(action: CandidateActionView): CandidateActionView {
    const { source: _source, ...rest } = action as CandidateActionView & { source?: string };
    return rest as CandidateActionView;
  }
}
