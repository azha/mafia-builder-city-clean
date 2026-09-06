// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C2 (news-fodder-reader.service.ts
//             — the 4 READ-only queries + severity/category mapping + scan cap) + C3 (resolution scan for
//             hindsight + the micro-event-kind indicator pool)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.3 (the contract) +
//             D14 (severity/category mapping table) + §3.5.3 (hindsight resolution scan + indicator pool)
//             Seams: S2 `db/schema/random_world.ts:72` (random_world_event_active) ; S3
//             `db/schema/ambient_world.ts:105` (ambient_micro_event) ; S4
//             `db/schema/effect_modifier.ts:198` (political_event_active) ; S5
//             `db/schema/live_ops_event_active.ts:131` (live_ops_event_active)
//             — 04g-C C2 — 2026-07-16
//             — 04g-C C3 — 2026-07-16 (resolution scan + indicator pool + ORDER BY fix)
//             — 04g-C C7 — 2026-07-16 (readOneBySourceKindAndRefId — the BO `POST force-generate`'s own
//               targeted single-row lookup, design §6.2)
//
// `NewsFodderReader` (glossary gdd/15 — "the contract d'agrégation READ-only") — normalizes the 4
// upstream fodder sources into `FodderItem` (design §3.3, shapes: `news-beat.types.ts`). ★ THE
// DEFINING PROPERTY (design §0): this reader NEVER writes to a fodder table — no UPDATE, no "narrated"
// flag anywhere upstream (the E2E floor's byte-identical fodder-snapshot proof is the falsifiable
// enforcement of this). Own queries against the upstream tables directly (zero-regression — no
// upstream repository/service is ever called, mirrors design §8's "no existing repo edited").
//
// ★ SCOPE (coder judgment call, documented rather than silently assumed): C2 only scanned the
// ACTIVATION-shaped fodder each source's own "recent" window exposes (design §3.2 phase 1: "activations
// récentes (S2/S4/S5), micro-events du jour (S3)"). THIS CHUNK (C3) adds the RESOLUTION-shaped scan that
// feeds Hindsight (design §3.5.3, "résolutions : status='resolved' + expiry dans fenêtre Hindsight") —
// `scanResolutionsForHindsight` below — so `FodderItem.transition` now also produces `'resolved'` (was
// reserved by C2's own doc comment for exactly this extension).
//
// Political fodder's OWN district (design §3.3 "district éventuel via les rows effect_modifier DISTRICT
// du parent, sinon national") is NOT resolved this chunk — every political `FodderItem` is
// `districtId: null` / `beat_category: 'national'`, the design's own explicitly-named fallback branch,
// never a missing feature silently assumed (a future chunk MAY add the effect_modifier DISTRICT join —
// TD candidate, not a fig-leaf: the design names this exact "sinon" branch as legal).
//
// ★ C3 fix (review MINOR-4, C2 gate): the 3 non-ambient scan queries below now carry an explicit
// `ORDER BY id` (mirrors `scanAmbientMicroEvents`'s own C2 `.orderBy(ambientMicroEvent.id)`) — design §8
// "stable input ordering" / "ordre de tirage FIXE documenté par service". Without it, the hindsight
// resolution scan (which shares this exact cross-source determinism requirement, design §8) would be
// vulnerable to a non-deterministic physical row order across re-runs on the SAME persisted data.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, lt, lte, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { randomWorldEventActive } from '../../db/schema/random_world';
import { politicalEventActive } from '../../db/schema/effect_modifier';
import { liveOpsEventActive } from '../../db/schema/live_ops_event_active';
import { ambientMicroEvent } from '../../db/schema/ambient_world';
import type { PoliticalEventCategoryVal } from '../political/political.types';
import type { AmbientMicroEventKindValue } from '../ambient/ambient-micro-event.repository';
import { newsBeatTunables } from './news-beat.tunables';
import type { FodderItem, FodderSeverityBand, FodderSourceKind, NewsBeatCategoryValue } from './news-beat.types';

// ────────────────────────────── D14 severity mapping ──────────────────────────────

/** `halgren_tannery_hailstorm`/`hollow_at_the_corner` = high (design §3.3 D14). */
const RANDOM_WORLD_HIGH_SEVERITY_TEMPLATES: ReadonlySet<string> = new Set([
  'halgren_tannery_hailstorm',
  'hollow_at_the_corner',
]);
/** `sideways_failure`/`quorum_on_stadler_row` = noticeable (design §3.3 D14). */
const RANDOM_WORLD_NOTICEABLE_SEVERITY_TEMPLATES: ReadonlySet<string> = new Set([
  'sideways_failure',
  'quorum_on_stadler_row',
]);
// `permanent_residue`/`apparent_recovery` = low (design §3.3 D14) — the fallback branch below covers
// them + any future/registry-only template defensively (never an unmapped throw for this source: a new
// random_world template landing before news_beat catches up should degrade to 'low', not crash the tick).
function severityForRandomWorldTemplate(templateId: string): FodderSeverityBand {
  if (RANDOM_WORLD_HIGH_SEVERITY_TEMPLATES.has(templateId)) return 'high';
  if (RANDOM_WORLD_NOTICEABLE_SEVERITY_TEMPLATES.has(templateId)) return 'noticeable';
  return 'low';
}

/** SCANDAL/CRACKDOWN=high, ELECTORAL/BUDGET=noticeable, ORDINANCE/REFORM=low (design §3.3 D14 verbatim). */
function severityForPoliticalCategory(category: PoliticalEventCategoryVal): FodderSeverityBand {
  if (category === 'SCANDAL' || category === 'CRACKDOWN') return 'high';
  if (category === 'ELECTORAL' || category === 'BUDGET') return 'noticeable';
  return 'low'; // ORDINANCE | REFORM
}

/** corner_fight/noisy_block/stalled_tram→brennar_local ; delayed_shipment/building_inspection→business ;
 *  bar_rumor→arts (design §3.3 D14 verbatim table — DISTINCT from `ambient-micro-event.service.ts`'s OWN
 *  `CHANNEL_BY_KIND` grouping, a different taxonomy for a different concern, design §7 "disjonction
 *  canon maintenue: AmbientChannel ≠ NewsBeatCategory"). */
function newsBeatCategoryForAmbientKind(kind: AmbientMicroEventKindValue): NewsBeatCategoryValue {
  if (kind === 'corner_fight' || kind === 'noisy_block' || kind === 'stalled_tram') return 'brennar_local';
  if (kind === 'delayed_shipment' || kind === 'building_inspection') return 'business';
  if (kind === 'bar_rumor') return 'arts';
  throw new Error(`Unknown ambient_micro_event kind '${kind}' — no news_beat_category mapping (design §3.3 D14).`);
}

/** The digest-fill category dispatch (design §3.3 D14 — random_world always `brennar_local`, political
 *  always `national`, live_ops always `business`, ambient_micro by `kind`). */
export function newsBeatCategoryForFodderItem(item: FodderItem): NewsBeatCategoryValue {
  switch (item.sourceKind) {
    case 'random_world':
      return 'brennar_local';
    case 'political':
      return 'national';
    case 'live_ops':
      return 'business';
    case 'ambient_micro':
      return newsBeatCategoryForAmbientKind(item.templateOrEventId as AmbientMicroEventKindValue);
  }
}

@Injectable()
export class NewsFodderReader {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Phase 1 (design §3.2/§3.3) — the combined, F4-bounded fodder scan for `gameDay`. FIXED source order
   * (random_world → political → live_ops → ambient_micro, design §8 "ordre de tirage FIXE documenté par
   * service") so the downstream seeded digest ranking (`news-beat-digest.ts`'s `rankFodderForDigest`) is
   * reproducible from the SAME input ordering every re-run against the SAME persisted fodder. READ-only
   * — see the E2E floor's byte-identical fodder-table snapshot proof (design §0/§8 zero-regression).
   */
  async scanFodder(gameDay: number): Promise<FodderItem[]> {
    const lookbackDays = newsBeatTunables.digestFodderLookbackDays;
    const cap = newsBeatTunables.digestFodderScanCap;
    const combined = [
      ...(await this.scanRandomWorldActivations(gameDay, lookbackDays, cap)),
      ...(await this.scanPoliticalActivations(gameDay, lookbackDays, cap)),
      ...(await this.scanLiveOpsActivations(gameDay, lookbackDays, cap)),
      ...(await this.scanAmbientMicroEvents(gameDay, cap)),
    ];
    // Belt-and-suspenders total cap (F4) — each per-source query already LIMITs to `cap`; this bounds
    // the COMBINED total the same way `random_world.daily_activation_evaluation_batch_size` bounds
    // phase-3's per-tick template loop (mirrors that discipline, applied to a scan instead of a loop).
    return combined.slice(0, cap);
  }

  /** S2 — activations: `started_at_game_day` within the lookback window (design §3.3 table row 1). */
  private async scanRandomWorldActivations(gameDay: number, lookbackDays: number, cap: number): Promise<FodderItem[]> {
    const sinceGameDay = gameDay - lookbackDays + 1;
    const rows = await this.db
      .select()
      .from(randomWorldEventActive)
      .where(
        and(
          gte(randomWorldEventActive.started_at_game_day, sinceGameDay),
          lte(randomWorldEventActive.started_at_game_day, gameDay),
        ),
      )
      .orderBy(randomWorldEventActive.id) // ★ C3 fix (review MINOR-4) — stable input ordering, design §8.
      .limit(cap);
    return rows.map((row) => ({
      sourceKind: 'random_world' as const,
      refId: row.id,
      templateOrEventId: row.template_id,
      districtId: row.district_id,
      severityBand: severityForRandomWorldTemplate(row.template_id),
      occurredAtGameDay: row.started_at_game_day,
      transition: 'activated' as const,
      // REUSE `random-world.projection.service.ts:122`'s own `template_i18n_key` shape verbatim.
      subjectI18nKey: `random_world.template.${row.template_id}`,
    }));
  }

  /** S4 — activations: `activated_at_game_day` within the lookback window (design §3.3 table row 2). */
  private async scanPoliticalActivations(gameDay: number, lookbackDays: number, cap: number): Promise<FodderItem[]> {
    const sinceGameDay = gameDay - lookbackDays + 1;
    const rows = await this.db
      .select()
      .from(politicalEventActive)
      .where(
        and(
          gte(politicalEventActive.activated_at_game_day, sinceGameDay),
          lte(politicalEventActive.activated_at_game_day, gameDay),
        ),
      )
      .orderBy(politicalEventActive.id) // ★ C3 fix (review MINOR-4) — stable input ordering, design §8.
      .limit(cap);
    return rows.map((row) => ({
      sourceKind: 'political' as const,
      refId: row.id,
      templateOrEventId: row.event_id,
      districtId: null, // ★ coder judgment call — see file header ("district éventuel … sinon national").
      severityBand: severityForPoliticalCategory(row.category),
      occurredAtGameDay: row.activated_at_game_day,
      transition: 'activated' as const,
      // NEW dotted-key convention (design §3.7) — extends random_world's/ambient's own shape; political
      // had none yet (its OWN `newsFeedCopy` field is literal EN text, a DIFFERENT convention, C0 §4).
      subjectI18nKey: `political.event.${row.event_id}`,
    }));
  }

  /** S5 — `status='ACTIVE'` within a real-clock freshness window (design §3.3 table row 3 — "axe
   *  real-clock ≠ game-day"). ★ coder judgment call: no dedicated `news_beats.*` tunable names a
   *  live-ops-specific freshness window, so `digest_fodder_lookback_days` (in days) is reused, converted
   *  to real hours — the SAME "the evening journal narrates the day" reasoning applied to the one
   *  real-clock source. Any currently-ACTIVE live-ops event is "current news" as of `gameDay` (there is
   *  no other game-day axis on this row). */
  private async scanLiveOpsActivations(gameDay: number, lookbackDays: number, cap: number): Promise<FodderItem[]> {
    const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const rows = await this.db
      .select()
      .from(liveOpsEventActive)
      .where(and(eq(liveOpsEventActive.status, 'ACTIVE'), gte(liveOpsEventActive.started_at, cutoff)))
      .orderBy(liveOpsEventActive.id) // ★ C3 fix (review MINOR-4) — stable input ordering, design §8.
      .limit(cap);
    return rows.map((row) => ({
      sourceKind: 'live_ops' as const,
      refId: row.id,
      templateOrEventId: row.event_id,
      districtId: null,
      severityBand: 'noticeable' as const, // uniform (design §3.3 table row 3).
      occurredAtGameDay: gameDay,
      transition: 'activated' as const,
      subjectI18nKey: `live_ops.event.${row.event_id}`,
    }));
  }

  /** S3 — rows of `gameDay` itself, ALL statuses (design §3.3 table row 4: "rows du game_day courant" —
   *  NOT a lookback window unlike the 3 sources above; the ambient substrate is generated fresh every
   *  game_day, NIGHTLY/27, S1, so today's rows are always what's worth narrating). */
  private async scanAmbientMicroEvents(gameDay: number, cap: number): Promise<FodderItem[]> {
    const rows = await this.db
      .select()
      .from(ambientMicroEvent)
      .where(eq(ambientMicroEvent.game_day, gameDay))
      .orderBy(ambientMicroEvent.id) // deterministic pre-shuffle order (phase 5's seeded tie-break reorders it).
      .limit(cap);
    return rows.map((row) => ({
      sourceKind: 'ambient_micro' as const,
      refId: row.id,
      templateOrEventId: row.kind,
      districtId: row.district_id,
      severityBand: 'low' as const,
      occurredAtGameDay: row.game_day,
      transition: 'ongoing' as const, // ★ coder judgment call — see FodderTransition's own doc comment.
      // REUSE `ambient.projection.service.ts:89`'s own `descriptor_i18n_key` shape verbatim.
      subjectI18nKey: `ambient.micro_event.${row.kind}`,
    }));
  }

  // ───────────────────────────── C3: hindsight resolution scan (phase 4d, design §3.5.3) ─────────────────

  /**
   * The hindsight TRIGGER's own eligibility scan (design §3.5.3): every `random_world_event_active`
   * `resolved` row (S2) whose `payload.resolvedAtGameDay` (stamped by `markResolved`, 04g-B) falls in the
   * INCLUSIVE `[gameDay - maxDays, gameDay - minDays]` window, PLUS every `political_event_active` row
   * (S4) whose `expires_at_game_day` (the row's OWN resolution/expiry day — no `resolvedAtGameDay` stamp
   * needed, unlike random_world) falls in the SAME window — mirrors
   * `RandomWorldEventRepository.findApparentRecoveryEligibleParents`'s own raw-SQL
   * `payload ? 'key' AND (payload->>'key')::int BETWEEN …` shape (04g-B C4 precedent). EACH side excludes
   * (`NOT EXISTS`) any resolution that already has a `hindsight` thread — the SAME UNIQUE-partial
   * `news_thread` index (migration 0130) enforces at the DB level, this is the pre-filter so the eligible
   * list the caller iterates never even offers an already-arced resolution (design "un 2e run ne crée pas
   * de 2e arc"). FIXED source order random_world → political (mirrors `scanFodder`'s own convention),
   * each side its OWN `ORDER BY id` (design §8 "ordre de tirage FIXE" — the caller draws one seeded roll
   * PER eligible item, in this exact order).
   */
  async scanResolutionsForHindsight(gameDay: number): Promise<FodderItem[]> {
    const minDays = newsBeatTunables.hindsightArcDelayWeeksMin * 7;
    const maxDays = newsBeatTunables.hindsightArcDelayWeeksMax * 7;

    const randomWorldResult = await this.db.execute(sql`
      SELECT p.id, p.template_id, p.district_id, (p.payload->>'resolvedAtGameDay')::int AS resolved_at_game_day
      FROM random_world_event_active p
      WHERE p.status = 'resolved'
        AND p.payload ? 'resolvedAtGameDay'
        AND (p.payload->>'resolvedAtGameDay')::int BETWEEN (${gameDay}::int - ${maxDays}::int) AND (${gameDay}::int - ${minDays}::int)
        AND NOT EXISTS (
          SELECT 1 FROM news_thread t
          WHERE t.template_id = 'hindsight' AND (t.source_fodder_ref ->> 'refId') = p.id::text
        )
      ORDER BY p.id
    `);
    const randomWorldRows = extractRows(randomWorldResult) as {
      id: string;
      template_id: string;
      district_id: number;
      resolved_at_game_day: number;
    }[];
    const randomWorldItems: FodderItem[] = randomWorldRows.map((row) => ({
      sourceKind: 'random_world' as const,
      refId: row.id,
      templateOrEventId: row.template_id,
      districtId: row.district_id,
      severityBand: severityForRandomWorldTemplate(row.template_id),
      occurredAtGameDay: row.resolved_at_game_day,
      transition: 'resolved' as const,
      subjectI18nKey: `random_world.template.${row.template_id}`,
    }));

    const politicalResult = await this.db.execute(sql`
      SELECT p.id, p.event_id, p.category, p.expires_at_game_day
      FROM political_event_active p
      WHERE p.expires_at_game_day IS NOT NULL
        AND p.expires_at_game_day BETWEEN (${gameDay}::int - ${maxDays}::int) AND (${gameDay}::int - ${minDays}::int)
        AND NOT EXISTS (
          SELECT 1 FROM news_thread t
          WHERE t.template_id = 'hindsight' AND (t.source_fodder_ref ->> 'refId') = p.id::text
        )
      ORDER BY p.id
    `);
    const politicalRows = extractRows(politicalResult) as {
      id: string;
      event_id: string;
      category: PoliticalEventCategoryVal;
      expires_at_game_day: number;
    }[];
    const politicalItems: FodderItem[] = politicalRows.map((row) => ({
      sourceKind: 'political' as const,
      refId: row.id,
      templateOrEventId: row.event_id,
      districtId: null, // political fodder's district is never resolved this lot (design §3.3 fallback).
      severityBand: severityForPoliticalCategory(row.category),
      occurredAtGameDay: row.expires_at_game_day,
      transition: 'resolved' as const,
      subjectI18nKey: `political.event.${row.event_id}`,
    }));

    return [...randomWorldItems, ...politicalItems];
  }

  // ───────────────────────────── C3: hindsight indicator pool (composeRetrospectiveArc, D8) ─────────────

  /**
   * The cherry-pick candidate pool (design §3.5.3/D8): every `ambient_micro_event.kind` occurring in
   * `districtId` strictly BEFORE `beforeGameDay` (the resolution day) — NOT deduped (repeats are
   * legitimate, `hindsight-arc.ts`'s own `drawCherryPickedIndicators` doc comment). Fallback (design
   * "event sans district / sans micro-events"): `districtId === null`, OR the district-scoped scan comes
   * back empty, widens to EVERY district's micro-events before `beforeGameDay` (citywide). `ORDER BY id`
   * — deterministic pre-draw ordering (design §8), the SAME discipline `scanAmbientMicroEvents` already
   * established.
   */
  async scanMicroEventKindsBeforeResolution(districtId: number | null, beforeGameDay: number): Promise<string[]> {
    if (districtId !== null) {
      const districtRows = await this.db
        .select({ kind: ambientMicroEvent.kind })
        .from(ambientMicroEvent)
        .where(and(eq(ambientMicroEvent.district_id, districtId), lt(ambientMicroEvent.game_day, beforeGameDay)))
        .orderBy(ambientMicroEvent.id);
      if (districtRows.length > 0) return districtRows.map((r) => r.kind);
    }
    const citywideRows = await this.db
      .select({ kind: ambientMicroEvent.kind })
      .from(ambientMicroEvent)
      .where(lt(ambientMicroEvent.game_day, beforeGameDay))
      .orderBy(ambientMicroEvent.id);
    return citywideRows.map((r) => r.kind);
  }

  // ───────────────────────────── C7: BO force-generate's own targeted lookup (design §6.2) ─────────────

  /**
   * ★ C7 — a targeted single-row lookup by `{sourceKind, refId}` (design §6.2 `POST force-generate`'s
   * anti-fig-leaf contract): resolves the REAL upstream row a BO request names, normalized to the EXACT
   * SAME `FodderItem` shape `scanFodder`'s own per-source mapping produces (severity/subject-key logic
   * reused verbatim, never a 2nd competing mapping) — never a fabricated item. `undefined` if the row
   * doesn't exist (an admin naming an unknown/deleted id — the controller maps this to 404, never a
   * silent substitution). Still READ-only (design §0 — the SAME falsifiable contract every other method
   * on this reader holds). `gameDay` is used ONLY for the `live_ops` branch's `occurredAtGameDay` (that
   * source has no `game_day` column of its own, `scanLiveOpsActivations`'s own reasoning) — the caller
   * passes the REAL current watermark, never a client-supplied day.
   */
  async readOneBySourceKindAndRefId(sourceKind: FodderSourceKind, refId: string, gameDay: number): Promise<FodderItem | undefined> {
    switch (sourceKind) {
      case 'random_world': {
        const rows = await this.db.select().from(randomWorldEventActive).where(eq(randomWorldEventActive.id, refId)).limit(1);
        const row = rows[0];
        if (!row) return undefined;
        return {
          sourceKind: 'random_world',
          refId: row.id,
          templateOrEventId: row.template_id,
          districtId: row.district_id,
          severityBand: severityForRandomWorldTemplate(row.template_id),
          occurredAtGameDay: row.started_at_game_day,
          transition: 'activated',
          subjectI18nKey: `random_world.template.${row.template_id}`,
        };
      }
      case 'political': {
        const rows = await this.db.select().from(politicalEventActive).where(eq(politicalEventActive.id, refId)).limit(1);
        const row = rows[0];
        if (!row) return undefined;
        return {
          sourceKind: 'political',
          refId: row.id,
          templateOrEventId: row.event_id,
          districtId: null, // ★ coder judgment call — see file header ("district éventuel … sinon national").
          severityBand: severityForPoliticalCategory(row.category),
          occurredAtGameDay: row.activated_at_game_day,
          transition: 'activated',
          subjectI18nKey: `political.event.${row.event_id}`,
        };
      }
      case 'live_ops': {
        const rows = await this.db.select().from(liveOpsEventActive).where(eq(liveOpsEventActive.id, refId)).limit(1);
        const row = rows[0];
        if (!row) return undefined;
        return {
          sourceKind: 'live_ops',
          refId: row.id,
          templateOrEventId: row.event_id,
          districtId: null,
          severityBand: 'noticeable', // uniform (design §3.3 table row 3).
          occurredAtGameDay: gameDay,
          transition: 'activated',
          subjectI18nKey: `live_ops.event.${row.event_id}`,
        };
      }
      case 'ambient_micro': {
        const rows = await this.db.select().from(ambientMicroEvent).where(eq(ambientMicroEvent.id, refId)).limit(1);
        const row = rows[0];
        if (!row) return undefined;
        return {
          sourceKind: 'ambient_micro',
          refId: row.id,
          templateOrEventId: row.kind,
          districtId: row.district_id,
          severityBand: 'low',
          occurredAtGameDay: row.game_day,
          transition: 'ongoing',
          subjectI18nKey: `ambient.micro_event.${row.kind}`,
        };
      }
    }
  }
}

/** Defensive raw-row extractor for the raw-SQL reads above (Drizzle's typed `select()` builder can't
 *  express the `payload->>'x' BETWEEN`/`NOT EXISTS` shape cleanly — same raw-execute posture
 *  `RandomWorldEventRepository.findApparentRecoveryEligibleParents`, 04g-B C4, already established). */
function extractRows(result: unknown): Record<string, unknown>[] {
  return (result as { rows?: Record<string, unknown>[] }).rows ?? (result as Record<string, unknown>[]);
}
