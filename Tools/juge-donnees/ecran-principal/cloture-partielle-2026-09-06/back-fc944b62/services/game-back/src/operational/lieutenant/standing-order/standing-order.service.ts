// IMPLEMENTS: docs/superpowers/specs/2026-06-11-phase-25-standing-order-expiry-design.md §3.1 (Émettre — compile
//             `rule_source` via le compiler DSL [UNE seule règle ; multi-règle/erreur → 422] ; écrit la ligne
//             standing_order [status='active', rule=IR, signature=hash, expires_at = now + durationStandardTicks,
//             lapse_action] ; un ordre déjà actif → 409) + §4 (getActive — l'ordre 'active' OU 'lapsed'+HOLD_LAST,
//             ré-stampé à STANDING_ORDER_PRIORITY pour l'injection au tick) + §5 Invariants (Single-active ; Déterminisme)
//             -- Phase-25 L3 (Standing Order Expiry) Task 2 (StandingOrderService — issue + getActiveRule) --
//
// `StandingOrderService` — the player-triggered EMIT + the tick-side getActiveRule of the Phase-25 L3 standing order. It
// REUSES the DSL parse+compile pipeline (the SAME DslParserService/DslCompilerService path LieutenantService.attachScript
// uses to validate a behavior-script — NO new compiler) to turn the player's `rule_source` into a single validated IR
// rule, then writes the standing_order row. The tick (getActiveRule) reads the active/injecting order RAW and re-stamps
// its rule to the reserved STANDING_ORDER_PRIORITY (orderRule) so the executor resolves it over the default script.
//
// REUSE (never reimplement): the DSL parser/compiler (validate one-rule), the pure orderRule/signatureFor helpers
// (standing-order-rule.ts), the standing_order repo (DB), the ApiError + error-code conventions. DETERMINISTIC: no
// Date.now / Math.random — `issue` uses only the passed `now` (the city_sim game-minute the endpoint reads via
// getCurrentGameMinute) for expires_at; signatureFor is a pure deterministic hash. NO over-build into T3 (no evaluate /
// lapse / pattern) or T4 (no decisions). R2.2: the response is { order_id } (an id — no raw scalars leaked).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../../protocol/api-error';
import { DslParserService } from '../../../dsl/parser.service';
import { DslCompilerService } from '../../../dsl/compiler.service';
import type { DslDiagnostic } from '../../../dsl/dsl-errors';
import type { CompiledScript, IrRule } from '../../../dsl/ir';
import { dslTunables } from '../../../dsl/dsl-tunables';
import { CityEventBus } from '../../../citysim/events/city-event-bus';
import { DSL_PEER_ROLES } from '../lieutenant-archetype';
import { lieutenantTunables } from '../lieutenant-tunables';
import type { LapseActionEnum } from '../../../db/schema/lieutenant';
import { StandingOrderRepository, type StandingOrderRowWithTick } from './standing-order.repository';
import { orderRule, signatureFor } from './standing-order-rule';

/** The 3 player StandingOrderDecision kinds applied by applyDecision (Phase-25 L3 T4 — the supported decision verbs):
 *  RENEW (re-arm the order's expiry — no lapse counted), REVOKE (cancel + reset the lapse pattern), PROMOTE_TO_DEFAULT
 *  (embed the order's rule into the default behavior_script — permanent, no expiry — ssi promotion_suggested). */
export type StandingOrderDecisionKind = 'RENEW' | 'REVOKE' | 'PROMOTE_TO_DEFAULT';

/** The R2.2 freshness BAND (Phase-25 L3 T5 — the closed qualitative domain the projection surfaces for a lieutenant's
 *  standing order; the raw expires_at_tick NEVER escapes). NONE (no active-or-injecting order), FRESH (well within the
 *  TTL), EXPIRES_SOON (within `expiresSoonWindowTicks` of expiry), EXPIRED (`now >= expires_at_tick` — a HOLD_LAST order
 *  still injecting past its TTL reads EXPIRED until RENEW/REVOKE; a REVERT_DEFAULT/ESCALATE lapsed order stops injecting →
 *  not active-or-injecting → NONE). A pure derived label — never a tick / a counter. */
export type StandingOrderFreshness = 'NONE' | 'FRESH' | 'EXPIRES_SOON' | 'EXPIRED';

/** The R2.2 standing-order BAND (Phase-25 L3 T5): the closed-domain freshness label + the promotion_suggested bool ONLY.
 *  This is the WHOLE projected surface — never the raw expires_at / consecutive_lapse_count / signature (the no-leak gate). */
export interface StandingOrderBand {
  freshness: StandingOrderFreshness;
  promotion_suggested: boolean;
}

/** A per-signature lapse-pattern ledger entry (standing_order_state.pattern[signature]). `consecutive_lapse_count` is the
 *  running count of consecutive lapses of THIS order rule (keyed by its stable signature); `promotion_suggested` flips true
 *  once that count reaches patternFlagThreshold (the "this keeps lapsing — promote it?" hint, surfaced T4/T5). */
interface LapsePatternEntry {
  consecutive_lapse_count: number;
  promotion_suggested: boolean;
}

/** True iff a thrown DB error is a Postgres unique_violation (SQLSTATE 23505) — used to map the Single-active partial-unique
 *  index (migration 0035) race-loss into a clean 409 (the read-then-check in `issue` covers the SEQUENTIAL case; this covers
 *  the CONCURRENT one where two issues both pass the read but only one insert wins). node-postgres (`pg`) surfaces the
 *  SQLSTATE on the DatabaseError's `.code`; the `.cause` fallback is defensive in case a wrapper nests it — check both. */
function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } } | null;
  return err?.code === '23505' || err?.cause?.code === '23505';
}

@Injectable()
export class StandingOrderService {
  private readonly logger = new Logger(StandingOrderService.name);

  constructor(
    private readonly repo: StandingOrderRepository,
    private readonly parser: DslParserService,
    private readonly compiler: DslCompilerService,
    // PHASE-25 L3 T3 — the shared CityEventBus (EXPORTED by SchedulerModule, ALREADY imported by LieutenantModule). evaluate
    // emits a StandingOrderLapsedEvent onto it ONLY for an ESCALATE_TO_PLAYER lapse (the decoupled escalation seam a BO/report
    // consumer plugs into later). ONE-WAY: this service imports the BUS (the shared seam), never a consumer module.
    private readonly bus: CityEventBus,
  ) {}

  /**
   * ISSUE a standing order to a lieutenant. Compiles `ruleSource` via the SAME DSL pipeline attachScript uses; if it does
   * NOT produce EXACTLY ONE valid rule (a parse/compile error OR a rule count ≠ 1) → 422 VALIDATION_FAILED (with the
   * compiler diagnostics in `details` when present, else a clear single-rule message). If the lieutenant ALREADY has an
   * active-or-injecting order (getActiveOrInjecting !== null) → 409 RESOURCE_STATE_CONFLICT (the Single-active invariant —
   * the player must RENEW, not re-issue). Else: `signature = signatureFor(theRule)`, `expiresAt = now +
   * durationStandardTicks`, insert the row (status='active'), and return { order_id }. Emitting does NOT increment the
   * lapse counter (spec §3.1). DETERMINISTIC — only `now` drives expires_at; signatureFor is a pure hash. The endpoint has
   * already resolved+owned the lieutenant (404) and validated `lapseAction` (422) BEFORE calling this.
   */
  async issue(
    lieutenantId: string,
    ruleSource: unknown,
    lapseAction: LapseActionEnum,
    now: number,
  ): Promise<{ order_id: string }> {
    // (1) COMPILE — REUSE the DSL pipeline; require EXACTLY one valid rule (the M2 single-rule order). A parse/compile
    //     failure OR a rule count ≠ 1 → 422 VALIDATION_FAILED (the compiler diagnostics surfaced when available).
    const theRule = this.compileSingleRule(ruleSource);

    // (2) SINGLE-ACTIVE — refuse if an active-or-injecting order already exists (the player must RENEW, not re-issue).
    const existing = await this.repo.getActiveOrInjecting(lieutenantId);
    if (existing !== null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `lieutenant ${lieutenantId} already has an active standing order — RENEW it instead of re-issuing.`,
      });
    }

    // (3) EMIT — signature (stable deterministic hash of the rule), expires_at = now + the standard TTL (tick-space). The
    //     insert is also guarded by a partial-unique index (one status='active' row per lieutenant — migration 0035): the
    //     read-then-check above is the clean common-path 409, and the index is the RACE backstop. Two concurrent issues can
    //     both pass the read (TOCTOU), but only one INSERT wins — the loser hits a unique violation, mapped to the SAME 409
    //     below, so the Single-active invariant (spec §5) holds under concurrency, not merely sequentially.
    const signature = signatureFor(theRule);
    const expiresAt = now + lieutenantTunables.standingOrderExpiry.durationStandardTicks;
    let row: { order_id: string };
    try {
      row = await this.repo.insertOrder(lieutenantId, theRule, signature, lapseAction, expiresAt, now);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `lieutenant ${lieutenantId} already has an active standing order — RENEW it instead of re-issuing.`,
        });
      }
      throw e;
    }

    this.logger.log(
      `issue standing-order: lieutenant=${lieutenantId} order=${row.order_id} signature=${signature} ` +
        `lapse_action=${lapseAction} expires_at_tick=${expiresAt} (now=${now})`,
    );
    return { order_id: row.order_id };
  }

  /**
   * The tick-side READ (RAW — NO lazy-seed): the lieutenant's currently-injecting order RULE, re-stamped to the reserved
   * STANDING_ORDER_PRIORITY (orderRule) so the executor resolves it OVER the default script when its trigger matches; or
   * null when there is no active-or-injecting order (the tick then resolves the default script byte-identically — the
   * no-regression path). PURE-READ: it reads getActiveOrInjecting (the RAW order, no seed) and applies the pure orderRule
   * re-stamp — it never writes. Used by the LIEUTENANT_TICK to build `effectiveScript = { rules: [orderRule, ...lt.rules] }`.
   */
  async getActiveRule(lieutenantId: string): Promise<IrRule | null> {
    const row: StandingOrderRowWithTick | null = await this.repo.getActiveOrInjecting(lieutenantId);
    if (row === null) return null;
    return orderRule(row.rule as unknown as IrRule);
  }

  /**
   * READ-ONLY R2.2 freshness-band projection (Phase-25 L3 T5): the lieutenant's standing-order `{ freshness,
   * promotion_suggested }` — the closed-domain freshness label DERIVED from the active-or-injecting order's
   * `expires_at_tick` vs `now`, plus the per-signature promotion hint. NEVER the raw `expires_at` tick, the
   * `consecutive_lapse_count`, or the `signature` (R2.2 — only the band + the bool escape). Used by the
   * LieutenantProjectionService for the `standing_order` field. Mirrors SignalDriftService.getCueBands EXACTLY:
   *
   *   - PURE READ, NO lazy-seed — it reads `repo.getActiveOrInjecting` (the RAW order, no seed) + `repo.getState` (the RAW
   *     state, no seed — NOT a getState-that-inserts), so a GET / projection on a no-order, never-stated lieutenant creates
   *     ZERO rows (Cautions §1).
   *   - freshness: null order (no active-or-injecting) → 'NONE'. Else `now >= expires_at_tick` → 'EXPIRED'; else `now >=
   *     expires_at_tick - expiresSoonWindowTicks` → 'EXPIRES_SOON'; else → 'FRESH'.
   *   - promotion_suggested: read the RAW standing_order_state (no seed) + the CURRENT decidable order (getCurrentOrder, no
   *     seed); true iff `pattern[currentOrder.signature].promotion_suggested`. Keyed on the SAME order+signature
   *     applyDecision(PROMOTE) checks, so the hint is true EXACTLY when a PROMOTE would be accepted (no projection/action
   *     mismatch). A null current order / a null state → false. (The SAME-rule re-issue still surfaces — re-issuing the same
   *     rule keeps the same signature, so its pattern entry stays flagged; a DIFFERENT prior rule's stale flag does NOT
   *     surface, which an OR-over-ALL-signatures would have wrongly reported as promotable while PROMOTE 409s.)
   *
   * DETERMINISTIC — `now` is the SAME current-tick reference the projection already reads (no Date.now / Math.random). R2.2
   * TOTAL: the returned object exposes ONLY the closed freshness domain + the bool — the order row / pattern are NEVER spread.
   */
  async getOrderBand(lieutenantId: string, now: number): Promise<StandingOrderBand> {
    // RAW read — NO lazy-seed (the projection must not create a standing_order row). null → no order → freshness NONE.
    const order = await this.repo.getActiveOrInjecting(lieutenantId);
    let freshness: StandingOrderFreshness;
    if (order === null) {
      freshness = 'NONE';
    } else if (now >= order.expires_at_tick) {
      freshness = 'EXPIRED';
    } else if (now >= order.expires_at_tick - lieutenantTunables.standingOrderExpiry.expiresSoonWindowTicks) {
      freshness = 'EXPIRES_SOON';
    } else {
      freshness = 'FRESH';
    }

    // RAW read — NO lazy-seed (the projection must not create a standing_order_state row). null state → no lapse → false.
    const state = await this.repo.getState(lieutenantId);
    const pattern = (state?.pattern as Record<string, { promotion_suggested?: boolean }> | undefined) ?? {};
    // promotion_suggested is keyed on the CURRENT DECIDABLE order's signature — the SAME order (getCurrentOrder: the
    // most-recent active-or-lapsed) and the SAME signature applyDecision(PROMOTE) checks — so the projected hint is true
    // EXACTLY when a PROMOTE would be accepted (Finder B mismatch fix). Keying on getCurrentOrder (NOT getActiveOrInjecting)
    // also covers the REVERT_DEFAULT-lapsed window: such an order no longer injects (freshness NONE) yet is still decidable
    // and promotable, so the hint must follow the decidable order, not the injecting one. An OR-over-ALL-signatures (the
    // prior form) over-reported: a stale flag from a DIFFERENT prior order rule would claim promotable while PROMOTE 409s on
    // the current order. The SAME-rule re-issue case still surfaces (same rule → same signature → its entry stays flagged).
    // A RAW read (no lazy-seed). R2.2: only the bool escapes — never the consecutive_lapse_count / the signature.
    const currentOrder = await this.repo.getCurrentOrder(lieutenantId);
    const promotion_suggested =
      currentOrder !== null && pattern[currentOrder.signature]?.promotion_suggested === true;

    return { freshness, promotion_suggested };
  }

  /**
   * Apply a player StandingOrderDecision (Phase-25 L3 T4) to a lieutenant's CURRENT order (getCurrentOrder — the most-recent
   * 'active'-or-'lapsed' order), with a per-(lieutenant, kind) cooldown (cooldown-in-jsonb on standing_order_state.
   * last_decision_ticks, key `${kind}` — mirrors SignalDriftService.applyDecision's per-key 409):
   *   - RENEW              — RE-ARM the order's clock: `setExpiry(order, now + durationStandardTicks, 'active')`. No pattern
   *                          change (the lapse counter is UNTOUCHED — a renew is NOT a lapse and NOT a reset). A lapsed
   *                          HOLD_LAST order RENEWed returns to 'active'. The set-and-forget escape hatch.
   *   - REVOKE             — CANCEL the order (`setStatus(order, 'revoked')` — it stops injecting → revert to default) AND
   *                          RESET the per-signature lapse pattern (consecutive_lapse_count=0, promotion_suggested=false) —
   *                          revoke ≠ lapse (canon §3.1): the flag retombe.
   *   - PROMOTE_TO_DEFAULT — EMBED the order's rule as a PERMANENT rule of the default behavior_script (ssi
   *                          promotion_suggested for the order's signature, else 409). Appends `order.rule` to
   *                          behavior_script.rules at its AUTHORED priority CLAMPED to [dsl.priority_min, dsl.priority_max]
   *                          (NOT the reserved injection priority — the stored row holds the authored priority; orderRule's
   *                          re-stamp is runtime-only) with a FRESH index (max existing + 1). Then `setStatus(order,
   *                          'promoted')` (the order is cleared) + clears the signature's pattern entry. The "embed as a
   *                          RULE" canon — the ONLY explicit behavior_script.rules mutation in this feature.
   * COOLDOWN: a same-kind decision is refused (409 RESOURCE_STATE_CONFLICT) while `now - last < decisionCooldownTicks`
   * (the per-kind stamp lives in last_decision_ticks). On success the stamp is updated + the whole pattern/decision-ticks
   * written. REQUIRES a current order (none → 409 RESOURCE_STATE_CONFLICT "no order" — the L2-consistent code). DETERMINISTIC
   * (the cooldown + the re-armed expiry are pure functions of the persisted state + `now`; no Date.now / Math.random). The
   * endpoint (lieutenant.controller.ts) validates the kind (422) + owns the lieutenant (404) BEFORE calling this.
   */
  async applyDecision(lieutenantId: string, kind: StandingOrderDecisionKind, now: number): Promise<void> {
    // The current decidable order (most-recent active-or-lapsed). No order → 409 (the player has nothing to decide on).
    const order = await this.repo.getCurrentOrder(lieutenantId);
    if (order === null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `lieutenant ${lieutenantId} has no standing order to ${kind}.`,
      });
    }

    // Lazy-seed the state (a decision may run before any lapse seeded it — mirror the evaluate lazy-seed) so the cooldown
    // stamp + the pattern ledger have a home.
    const state = (await this.repo.getState(lieutenantId)) ?? (await this.repo.insertState(lieutenantId, now));
    const pattern = (state.pattern as Record<string, LapsePatternEntry>) ?? {};
    const decisionTicks = (state.last_decision_ticks as Record<string, number> | null) ?? null;

    // COOLDOWN (per-kind): a same-kind decision within decisionCooldownTicks is refused (409) — mirror L2's per-key 409.
    const last = decisionTicks?.[kind];
    if (last !== undefined && now - last < lieutenantTunables.standingOrderExpiry.decisionCooldownTicks) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `standing-order decision '${kind}' is on cooldown for lieutenant ${lieutenantId}.`,
      });
    }

    if (kind === 'RENEW') {
      // RE-ARM the expiry (now + the standard TTL) + back to 'active'. NO pattern change (a renew is not a lapse/reset).
      const expiresAt = now + lieutenantTunables.standingOrderExpiry.durationStandardTicks;
      await this.repo.setExpiry(order.order_id, expiresAt, 'active');
    } else if (kind === 'REVOKE') {
      // CANCEL the order (stops injecting → revert to default) + RESET the per-signature lapse pattern (revoke ≠ lapse).
      await this.repo.setStatus(order.order_id, 'revoked');
      pattern[order.signature] = { consecutive_lapse_count: 0, promotion_suggested: false };
    } else {
      // PROMOTE_TO_DEFAULT — ssi promotion_suggested for THIS order's signature (else 409).
      const entry = pattern[order.signature];
      if (entry === undefined || entry.promotion_suggested !== true) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message: `standing order for lieutenant ${lieutenantId} is not flagged for promotion (promotion_suggested is not set).`,
        });
      }
      await this.promoteRuleIntoScript(lieutenantId, order.rule as unknown as IrRule);
      await this.repo.setStatus(order.order_id, 'promoted');
      // Clear the signature's pattern entry — the chronic-lapse pattern is resolved (the rule is now permanent).
      delete pattern[order.signature];
    }

    // Stamp the per-kind cooldown + persist the whole pattern + decision-ticks (mirror writeState's round-trip).
    const nextDecisionTicks = { ...(decisionTicks ?? {}), [kind]: now };
    await this.repo.writeState(lieutenantId, pattern as Record<string, unknown>, nextDecisionTicks);

    this.logger.log(
      `decision standing-order: lieutenant=${lieutenantId} order=${order.order_id} kind=${kind} ` +
        `signature=${order.signature} (now=${now})`,
    );
  }

  /**
   * The per-tick EXPIRY EVALUATION (spec §3.1/§4 — the active→lapsed lifecycle). Called by the LIEUTENANT_TICK on the
   * acting path AFTER observeOutcome (mirroring its placement). Reads the lieutenant's single `status='active'` order
   * (getActiveForExpiry — the CENTRALIZED `expires_at_tick` projection; null → no active order → return). When `now >=
   * expires_at_tick` the order has LAPSED:
   *   1. lazy-seed the standing_order_state (getState → insertState, pattern={}) — mirrors the signal-drift lazy-seed.
   *   2. compute (in memory) the per-signature consecutive_lapse_count increment + the recomputed promotion_suggested
   *      (>= patternFlagThreshold).
   *   3. flip the order status active→lapsed (setStatus) FIRST, THEN write the pattern jsonb back. The two writes are NOT
   *      transactional (per-tick single-row read-modify-write, like signal_drift / autonomy_ceiling), so the ORDER matters:
   *      flip-first makes a crash BETWEEN them benign — the order is already 'lapsed' (getActiveForExpiry returns null next
   *      tick → never re-processed) and the ledger merely under-counts ONE lapse (self-heals on the next distinct lapse).
   *      Count-first (the reverse) would, on the same crash, leave the order 'active'+expired so EVERY following tick
   *      re-counts the SAME expiry (an unbounded over-count) AND the order never reverts (it keeps injecting past its TTL).
   *      The row STAYS: a HOLD_LAST lapsed order keeps injecting (via getActiveOrInjecting); a REVERT_DEFAULT /
   *      ESCALATE_TO_PLAYER lapsed order STOPS injecting (that read excludes a non-HOLD_LAST lapsed row) → revert to default.
   *   4. for an ESCALATE_TO_PLAYER lapse ONLY → emit a StandingOrderLapsedEvent on the bus (the decoupled escalation seam).
   * When `now < expires_at_tick` the order is still active → NO state change (EXPIRES_SOON is a projection-read concern, T5).
   *
   * IDEMPOTENT — the active→lapsed transition is processed EXACTLY ONCE: getActiveForExpiry returns ONLY the 'active' row,
   * so once setStatus(…, 'lapsed') runs the next tick's getActiveForExpiry returns null and the lapse is never re-counted.
   * DETERMINISTIC — only `now` + the persisted state (no Date.now / Math.random / wall-clock). The `playerId` is carried
   * only for the escalation event identity (the lapse logic is player-agnostic — the tick already owns the lieutenant).
   */
  async evaluate(lieutenantId: string, playerId: string, now: number): Promise<void> {
    const order = await this.repo.getActiveForExpiry(lieutenantId);
    if (order === null) return; // no active order → nothing to evaluate.

    // Still within the TTL → no lapse, no write (EXPIRES_SOON is a read-only projection band surfaced in T5, not a write).
    if (now < order.expires_at_tick) return;

    // ── LAPSED (active → lapsed) ──
    // (1) lazy-seed the lapse-pattern ledger (mirror the signal-drift getState/insertState lazy-seed).
    const state = (await this.repo.getState(lieutenantId)) ?? (await this.repo.insertState(lieutenantId, now));
    const pattern = (state.pattern as Record<string, LapsePatternEntry>) ?? {};

    // (2) compute (in memory) the per-signature consecutive_lapse_count increment + the recomputed promotion_suggested.
    const entry: LapsePatternEntry = pattern[order.signature] ?? { consecutive_lapse_count: 0, promotion_suggested: false };
    entry.consecutive_lapse_count += 1;
    entry.promotion_suggested =
      entry.consecutive_lapse_count >= lieutenantTunables.standingOrderExpiry.patternFlagThreshold;
    pattern[order.signature] = entry;
    const decisionTicks = (state.last_decision_ticks as Record<string, number> | null) ?? null;

    // (3) flip active → lapsed FIRST, THEN persist the ledger. ORDER MATTERS — the two writes are not in one transaction
    //     (the codebase's per-tick single-row read-modify-writes are non-transactional, like signal_drift / autonomy_ceiling).
    //     setStatus-before-writeState makes the crash window BENIGN: if the process dies between them the order is already
    //     'lapsed' (getActiveForExpiry returns null next tick → NO re-processing) and the ledger merely misses ONE increment
    //     (a single under-count that self-heals on the next distinct lapse). The reverse order is the bug Finder B caught —
    //     count-then-flip, on a crash, leaves the order 'active'+expired so the NEXT tick re-counts the SAME expiry (an
    //     unbounded over-count) AND the order never reverts (it keeps injecting past its TTL). Under-count-once ≫
    //     over-count-forever. The row stays (HOLD_LAST keeps injecting; REVERT_DEFAULT/ESCALATE stop — getActiveOrInjecting
    //     excludes a non-HOLD_LAST lapsed row, so the lieutenant reverts to the default script).
    await this.repo.setStatus(order.order_id, 'lapsed');
    await this.repo.writeState(lieutenantId, pattern as Record<string, unknown>, decisionTicks);

    this.logger.log(
      `lapse standing-order: lieutenant=${lieutenantId} order=${order.order_id} signature=${order.signature} ` +
        `lapse_action=${order.lapse_action} consecutive_lapse_count=${entry.consecutive_lapse_count} ` +
        `promotion_suggested=${entry.promotion_suggested} (now=${now} >= expires_at_tick=${order.expires_at_tick})`,
    );

    // (4) ESCALATE_TO_PLAYER → emit the decoupled escalation event (no subscriber in L3 — the seam a BO consumer plugs into).
    if (order.lapse_action === 'ESCALATE_TO_PLAYER') {
      this.bus.emitStandingOrderLapsed({
        type: 'standing_order_lapsed',
        playerId,
        lieutenantId,
        signature: order.signature,
        lapseAction: order.lapse_action,
        gameMinute: now,
      });
    }
  }

  // ───────────────────────────── private helpers ─────────────────────────────

  /**
   * PROMOTE: append the order's `rule` (an IrRule — the stored row holds the AUTHORED priority, NOT the reserved injection
   * priority; orderRule's re-stamp is runtime-only) as a PERMANENT rule of the lieutenant's default behavior_script. The
   * read-modify-write on `behavior_script.rules` (the SAME table the attach path writes — getBehaviorScript /
   * appendBehaviorScriptRule):
   *   1. read the current `{ rules: IrRule[] }`;
   *   2. CLAMP the rule's authored priority to [dsl.priority_min, dsl.priority_max] (a defensive clamp — the authored value
   *      was already validated in-bounds at issue-time; an operator who later tightened the bounds would otherwise leave a
   *      now-out-of-bounds priority. Clamping keeps the embedded rule a legal authored-priority rule, NOT the reserved 1000);
   *   3. assign a FRESH `index` = (max existing index) + 1 (so it sits last in insertion order; the index is the executor's
   *      tie-break key — a fresh, unique, monotone index keeps the deterministic resolution well-defined);
   *   4. append + write back (last_modified_by='player' — the player's PROMOTE is the author).
   * The order's rule then resolves as a normal default-script rule whenever its trigger matches — permanently, no expiry,
   * no injection. DETERMINISTIC (pure index/clamp arithmetic; the only clock is the audit last_modified_at).
   */
  private async promoteRuleIntoScript(lieutenantId: string, rule: IrRule): Promise<void> {
    // ── DURABILITY GAP (T4 review I1 — DOCUMENTED, not built) ──────────────────────────────────────────────────────────
    // PROMOTE_TO_DEFAULT appends the order's rule to `behavior_script.rules` but NOT to `behavior_script.source` (the rule is
    // an embedded IR with no DSL source text — the intended source/rules divergence, spec §3.1). A SUBSEQUENT attachScript
    // (LieutenantService.attachScript → LieutenantRepository.updateBehaviorScript) RECOMPILES `rules` WHOLESALE from `source`
    // → a promoted rule is DROPPED (it was never in source, so the recompile does not regenerate it). This is a known
    // failure-mode tracked as v1.x debt (re-apply promoted rules on re-attach / a source-provenance flag / a re-attach
    // warning) — NOT a decompiler. M2 leaves the divergence intended and the re-attach drop as accepted v1.x debt.
    const script = await this.repo.getBehaviorScript(lieutenantId);
    if (script === null) {
      // Defensive: a recruited lieutenant always has a 1-1 behavior_script row (recruit seeds it). Absent → a hard conflict.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `lieutenant ${lieutenantId} has no behavior_script to promote into.`,
      });
    }
    const existing: IrRule[] = Array.isArray(script.rules?.rules) ? script.rules.rules : [];

    // IDEMPOTENT (retry-safe) — if a rule with THIS rule's signature is ALREADY embedded, skip the append (Finder B fix).
    // The applyDecision PROMOTE sequence (append → setStatus('promoted') → writeState) is not transactional: a crash AFTER
    // the append but BEFORE setStatus would, on a retry (the order still reads active/lapsed + still flagged → applyDecision
    // re-enters here), DOUBLE-EMBED the rule. The signature dedup makes that second pass a no-op. signatureFor excludes
    // index (it hashes trigger/action/priority/condition), so the already-embedded promoted rule (a fresh index;
    // authored == clamped priority in the common case — the authored value was validated in-bounds at issue-time) collides
    // with this rule's signature and is detected. (The only gap is an operator tightening priority bounds BETWEEN a crash
    // and its retry so the clamp diverges the priority — astronomically unlikely, and the fallback is the prior behavior.)
    const sig = signatureFor(rule);
    if (existing.some((r) => signatureFor(r) === sig)) return;

    // CLAMP the authored priority into [priority_min, priority_max] (defensive — keeps it a legal authored-priority rule,
    // never the reserved injection priority). FRESH index = max existing index + 1 (last in insertion order; -1 → start 0).
    const clampedPriority = Math.min(
      Math.max(rule.priority, dslTunables.priorityMin),
      dslTunables.priorityMax,
    );
    const maxIndex = existing.reduce((m, r) => Math.max(m, r.index), -1);
    const promotedRule: IrRule = { ...rule, priority: clampedPriority, index: maxIndex + 1 };

    const nextRules: CompiledScript = { rules: [...existing, promotedRule] };
    await this.repo.appendBehaviorScriptRule(script.scriptId, nextRules);
  }

  /**
   * Run the DSL pipeline (parse → compile) on `ruleSource` and return its ONE compiled IR rule. Throws 422
   * VALIDATION_FAILED on: a non-string source, a parse failure (diagnostics), a compile failure (diagnostics), or a
   * compiled rule count ≠ 1 (an order is a SINGLE rule in M2). Mirrors LieutenantService.parseAndCompile (the SAME parser/
   * compiler, the SAME tier=1 default + DSL_PEER_ROLES) but adds the single-rule cardinality check. NEVER stores.
   */
  private compileSingleRule(ruleSource: unknown): IrRule {
    if (typeof ruleSource !== 'string') {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'standing-order rule_source must be a string.',
        details: [{ line: 1, col: 1, message: 'rule_source must be a string', kind: 'SYNTAX_ERROR' } satisfies DslDiagnostic],
      });
    }

    const parsed = this.parser.parse(ruleSource);
    if ('diagnostics' in parsed) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'standing-order rule_source failed to parse.',
        details: parsed.diagnostics,
      });
    }

    // The order is authored at the player's BASE vocab tier (Tier-1 — the M2 order is a single Tier-1 STATE/EVENT rule;
    // the tier-aware path is deferred with the richer composites, spec §7). DSL_PEER_ROLES validates any peer-role refs.
    const compiled = this.compiler.compile(parsed.ast, 1, DSL_PEER_ROLES);
    if ('diagnostics' in compiled) {
      throw new ApiError('VALIDATION_FAILED', {
        message: 'standing-order rule_source failed to compile.',
        details: compiled.diagnostics,
      });
    }

    // SINGLE-RULE — an M2 standing order is EXACTLY one rule (multi-rule is deferred, spec §2/§7). A 0- or >1-rule source
    // compiles cleanly but is not a valid order → 422 (the cardinality is the order contract, not a DSL diagnostic).
    if (compiled.ir.rules.length !== 1) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `a standing order must be exactly ONE rule (got ${compiled.ir.rules.length}).`,
      });
    }

    return compiled.ir.rules[0];
  }
}
