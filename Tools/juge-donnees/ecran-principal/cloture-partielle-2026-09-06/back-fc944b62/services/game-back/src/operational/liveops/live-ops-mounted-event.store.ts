// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C4b (live-ops-mounted-event.
//             store.ts — MountedLiveOpsEventStore + resolveLiveOpsEventById + isResolvableLiveOpsEventId)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.6-B DD-RSK1
//             (sync cache, precedent EffectOverlayStore) + DD-RSK2 (MountedLiveOpsEvent discriminated
//             type, LiveOpsTemplateId union NEVER edited) + DD-RSK3 (duration scalar wrapped at warm) +
//             DD-RSK5 (conservative day-1 postures: targeting {}, highImpact forced true, no-push D17).
//             Decisions: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-decisions.md D1 (Option B) +
//             D17 (no-push day-1) — 04g-D C4b — 2026-07-17
//
// ★ ONE of the 5 files the plan §0.9 / design §8 allowlist names for 04g-D's re-scoped additive-only
// invariant (D1=B RULED) — this is the ONE NEW file under `operational/liveops/`. Everything below is
// ADDITIVE: `getLiveOpsEventById`/`LIVE_OPS_EVENT_BY_ID`/`live-ops-event-catalogue.ts`/`live-ops.types.ts`
// are IMPORTED, never edited (D5 tient — `LiveOpsTemplateId`'s 9-member closed union stays untouched).
//
// `MountedLiveOpsEventStore` — module-level static store (précédent EXACT `EffectOverlayStore`/
// `TunablesStore`: a plain singleton, NOT a NestJS provider, so it carries zero `@Inject(...)`-decorated
// constructor parameters and is therefore importable from ANY file, including a future pure-module
// Playwright direct-import spec, without tripping the Playwright/esbuild "cannot parse ANY parameter
// decorator" constraint documented in `event-reskin-validator.service.ts`'s header). UNLIKE
// `EffectOverlayStore`/`TunablesStore`, this store has NO dedicated `pg.Client`/LISTEN subscription (day-1
// — a LISTEN/NOTIFY hook is a NAMED TD at the C7 closeout, per design §3.6-B DD-RSK1: "game-back = 1
// instance dockerisée … un hook LISTEN/NOTIFY façon Phase-23 est nommé au TD closeout, PAS construit
// day-1"): it reuses the app's already-open shared `db` singleton (`db/index.ts`'s plain export — the
// SAME object `DbModule`'s `{ provide: DB, useValue: db }` wraps for DI consumers) for its own occasional
// `reloadNow()` SELECT, rather than opening a second redundant connection for a feature that does not
// need a continuous subscription yet.
//
// Warm points (DD-RSK1): (1) at BOOT — `MountedLiveOpsEventBootWarmer`
// (`operational/template_library/mounted-live-ops-event-boot-warmer.service.ts`, a tiny
// `OnApplicationBootstrap` provider registered in `TemplateLibraryModule`, since template_library already
// depends on liveops types elsewhere — dependency direction template_library → liveops is preserved; this
// store itself imports ONLY `db/schema/template_library` (the `event_reskin` table) + this SAME file's own
// liveops types, never anything from `operational/template_library/`); (2) at MOUNT — the C4b adapter
// (`live-ops-reskin-mount.adapter.ts`) calls `reloadNow()` immediately AFTER its own conditional UPDATE
// commits. Crash-safety: a crash between that UPDATE and the `reloadNow()` call is reconciled by the next
// boot-warm (the `event_reskin` row with `status='mounted'` is the source of truth; this store is a
// reconstructible cache — precedent exact `EffectOverlayStore`).
//
// `resolveLiveOpsEventById` — CATALOGUE-FIRST, precedence static (DD-RSK1): for the 10 static catalogue
// ids, behavior is BYTE-IDENTICAL to calling `getLiveOpsEventById` directly (same Map consulted first,
// same throw on a genuinely unknown id) — proven by the EXISTING 04e-B/C liveops spec suites (which
// exercise all 5 swapped call-sites against the 10 static ids) staying GREEN, UNMODIFIED, on this lot's
// tip (plan §0.9's own floor definition of "byte-identical"); `liveops_mounted_activation.spec.ts`'s own
// Describe C additionally proves a MOUNTED id is accepted at the SAME gates. `isResolvableLiveOpsEventId`
// mirrors `LIVE_OPS_EVENT_BY_ID.has()`'s boolean-gate shape for the 3
// call-sites that only need a yes/no answer (`live-ops-admin.controller.ts` cohort-preview/schedule/
// force-activate gates).
//
// DD-RSK2 — id-namespace collision: `reloadNow()` THROWS at warm if a `mounted` reskin's `event_id`
// collides with a catalogue id. Structurally this should never happen through the front door (the C3
// `EventReskinValidator` rule 4 — `event_id_taken` — already rejects a commit whose `eventId` matches one
// of the 25 catalogue `instantiationId`s, which is a superset of the 10 live-ops ones, at COMPOSE time,
// long before mount) — this is defense-in-depth against a DB-level bypass, never a silent shadow (mirrors
// `TemplateLibraryService`'s own boot-assertion posture: never trust, always verify).

import { and, eq } from 'drizzle-orm';

import { db } from '../../db';
import { eventReskin } from '../../db/schema/template_library';
import { LIVE_OPS_EVENT_BY_ID, getLiveOpsEventById } from './live-ops-event-catalogue';
import type {
  LiveOpsEvent,
  LiveOpsEventCategory,
  LiveOpsEffectOp,
  LiveOpsEffectScope,
} from './live-ops.types';

/**
 * DD-RSK2 — the discriminated type a mounted `event_reskin` row resolves to. `Omit<LiveOpsEvent,
 * 'templateId'>` + a widened `templateId: string` (the 04g-D global `TemplateId` domain — degenerate
 * `string`, `operational/template_library/template-category.ts:37` — NOT imported here to keep this
 * file's OWN import surface scoped to `db/schema/event_reskin` + liveops types, per DD-RSK1's own
 * constraint; the type is structurally identical either way since `TemplateId = string`). The
 * `LiveOpsTemplateId` 9-member union (`live-ops.types.ts:175` via `LiveOpsEvent.templateId`) is NEVER
 * widened (D5 holds) — this is a PARALLEL type, not an edit to that union.
 */
export type MountedLiveOpsEvent = Omit<LiveOpsEvent, 'templateId'> & {
  /** The 04g-D global `TemplateId` (degenerate `string`) — e.g. `three_against_four`, which is NOT a
   *  member of the closed `LiveOpsTemplateId` union (the C4 acceptance example, design §3.6-B). */
  readonly templateId: string;
  /** Discriminant — distinguishes a mounted reskin from a static catalogue `LiveOpsEvent` at the type
   *  level for any future narrowing consumer (none needs it yet — every current call-site reads only
   *  structural runtime fields shared by both members of `ResolvedLiveOpsEvent`). */
  readonly mounted: true;
  /** `event_reskin.id` — audit/idempotence back-reference to the authored row. */
  readonly reskinId: string;
};

/** The union every swapped call-site now resolves to (DD-RSK1/DD-RSK2). */
export type ResolvedLiveOpsEvent = LiveOpsEvent | MountedLiveOpsEvent;

/** The shape this store reads out of `event_reskin.reskin_spec.liveOps` (DD-RSK3/DD-RSK4) — a LOCAL,
 *  narrow view (never imported from `operational/template_library/event-reskin-validator.ts`'s own
 *  `ReskinSpec`, keeping this file's import surface scoped to liveops types only, per DD-RSK1). The
 *  ACTUAL validation of this block's contents happens once, at mount time, in the C4b adapter
 *  (`live-ops-reskin-mount.adapter.ts`) — by the time a row reaches `status='mounted'`, this shape is
 *  already proven valid; this store trusts it (a malformed block cannot reach `mounted` through any
 *  front door, `markMounted`'s own conditional UPDATE is the ONLY writer of that status transition).
 */
interface StoredLiveOpsEffectSpec {
  readonly tunableKey: string;
  readonly op: LiveOpsEffectOp;
  readonly scope: LiveOpsEffectScope;
  readonly magnitude: number | string;
}
interface StoredLiveOpsBlock {
  readonly category: LiveOpsEventCategory;
  readonly durationRealDays: number;
  readonly effects: readonly StoredLiveOpsEffectSpec[];
}
interface StoredReskinSpecView {
  readonly name: string;
  readonly liveOps?: StoredLiveOpsBlock;
}

/** Builds the `MountedLiveOpsEvent` a mounted row resolves to (DD-RSK3 duration wrap, DD-RSK5
 *  conservative postures: `targeting: {}`, `highImpact: true` FORCED, `pushConsentClass: 'MARKETING'` +
 *  `noticeCopy: null` FORCED no-push, D17; `counterPlayHintKey` mirrors the TD-153 `reskin:<id>`
 *  convention the design names). Returns `null` (never throws) on a malformed `liveOps` block — the
 *  adapter is the ONLY writer of `status='mounted'` and always validates this block first, so this is
 *  unreachable in practice; `null` degrades the SAME way `reloadNow()`'s caller-visible contract degrades
 *  elsewhere in this codebase (skip + warn, never crash the whole reload for one bad row). */
function buildMountedLiveOpsEvent(row: {
  readonly id: string;
  readonly event_id: string;
  readonly template_id: string;
  readonly reskin_spec: unknown;
}): MountedLiveOpsEvent | null {
  const spec = row.reskin_spec as StoredReskinSpecView | null;
  const liveOps = spec?.liveOps;
  if (!spec || !liveOps) return null;

  return {
    eventId: row.event_id,
    name: spec.name,
    category: liveOps.category,
    templateId: row.template_id,
    targeting: {}, // DD-RSK5 — all-players day-1; real per-activation targeting stays the existing
                   // schedule endpoint's OPTIONAL `targeting_filter` column (zero new surface).
    durationRealDaysGetter: () => liveOps.durationRealDays, // DD-RSK3 — scalar stored, getter wrapped here.
    effects: liveOps.effects.map((effect) => ({
      tunableKey: effect.tunableKey,
      op: effect.op,
      magnitudeGetter: () => effect.magnitude, // DD-RSK4 rule 3 — wrapped at construction.
      scope: effect.scope,
    })),
    highImpact: true, // DD-RSK5 — FORCED, not staff-choosable (anti-aggression posture).
    pushConsentClass: 'MARKETING', // DD-RSK5/D17 — ceinture-bretelles (fail-closed seam DD-B5).
    noticeCopy: null, // DD-RSK5/D17 — FORCED no-push (short-circuits sendNotifications to zero rows).
    counterPlayHintKey: `reskin:${row.event_id}`, // DD-RSK5 — mirrors TD-153 "Content pending" precedent.
    mounted: true,
    reskinId: row.id,
  };
}

class MountedLiveOpsEventStoreImpl {
  private snapshot = new Map<string, MountedLiveOpsEvent>();

  /** Reads every `event_reskin WHERE status='mounted' AND host_category='LIVE_OPS'` row and rebuilds
   *  the in-memory `event_id → MountedLiveOpsEvent` Map (DD-RSK1). THROWS on a catalogue-id collision
   *  (DD-RSK2, defense-in-depth — see file header); logs + skips (never throws) a row whose `liveOps`
   *  block is malformed (see `buildMountedLiveOpsEvent` doc). Called at boot (`MountedLiveOpsEvent
   *  BootWarmer`) and, awaited, immediately after every successful mount (the C4b adapter). */
  async reloadNow(): Promise<void> {
    const rows = await db
      .select({
        id: eventReskin.id,
        event_id: eventReskin.event_id,
        template_id: eventReskin.template_id,
        reskin_spec: eventReskin.reskin_spec,
      })
      .from(eventReskin)
      .where(and(eq(eventReskin.status, 'mounted'), eq(eventReskin.host_category, 'LIVE_OPS')));

    const next = new Map<string, MountedLiveOpsEvent>();
    for (const row of rows) {
      if (LIVE_OPS_EVENT_BY_ID.has(row.event_id)) {
        throw new Error(
          `MountedLiveOpsEventStore.reloadNow: mounted event_reskin '${row.id}' (event_id='${row.event_id}') ` +
          'collides with a static LIVE_OPS_EVENT_CATALOGUE id — a future catalogue addition must NEVER ' +
          'silently shadow a mounted reskin (DD-RSK2, anti-fig-leaf boot assertion).',
        );
      }
      const built = buildMountedLiveOpsEvent(row);
      if (!built) {
        // eslint-disable-next-line no-console
        console.warn(
          `[live-ops-mounted-event.store] reloadNow: event_reskin '${row.id}' (event_id='${row.event_id}') ` +
          'is status=mounted but its reskin_spec.liveOps block is missing/malformed — skipped, never ' +
          'crashing the whole reload for one bad row (unreachable via the front door: the mount adapter ' +
          'always validates this block before transitioning to mounted).',
        );
        continue;
      }
      next.set(row.event_id, built);
    }
    this.snapshot = next;
  }

  get(eventId: string): MountedLiveOpsEvent | undefined {
    return this.snapshot.get(eventId);
  }

  has(eventId: string): boolean {
    return this.snapshot.has(eventId);
  }

  /** Count of currently-mounted LIVE_OPS reskins this process has warmed — a cheap boot-log/diagnostic
   *  read-back, never a gameplay-facing value. */
  size(): number {
    return this.snapshot.size;
  }
}

/** The process-wide singleton — plain module-level (mirrors `EffectOverlayStore`/`TunablesStore`'s own
 *  "not Nest-injectable" posture, DD-RSK1). */
export const MountedLiveOpsEventStore = new MountedLiveOpsEventStoreImpl();

/**
 * `resolveLiveOpsEventById` — catalogue-FIRST (DD-RSK1: "précédence statique"), then the mounted-reskin
 * store; throws the SAME shape `getLiveOpsEventById` throws (a plain `Error`, unchanged message
 * convention) when neither resolves — every existing call-site's error-handling contract (the scheduler
 * sweep's per-row try/catch/warn, `live-ops-scheduler.service.ts:162-167`, UNCHANGED/untouched by this
 * lot) keeps working byte-identically for a genuinely-unknown id (the C0 §4.2 eternal-`SCHEDULED` trap
 * stays exactly as inert for a bypass-inserted row as it always was — regression-tested,
 * `liveops_mounted_activation.spec.ts`).
 */
export function resolveLiveOpsEventById(eventId: string): ResolvedLiveOpsEvent {
  const catalogueEvent = LIVE_OPS_EVENT_BY_ID.get(eventId);
  if (catalogueEvent) return catalogueEvent; // catalogue-first, precedence static (DD-RSK1).
  const mountedEvent = MountedLiveOpsEventStore.get(eventId);
  if (mountedEvent) return mountedEvent;
  // Same throw call `getLiveOpsEventById` itself would make — re-using it (rather than duplicating its
  // message) keeps the two error strings mechanically in sync.
  return getLiveOpsEventById(eventId);
}

/** Boolean-gate mirror of `LIVE_OPS_EVENT_BY_ID.has()` — the 3 gate call-sites (`live-ops-admin.
 *  controller.ts` cohort-preview/schedule/force-activate) swap onto this so a mounted reskin's `event_id`
 *  is accepted at the SAME gates a catalogue id already is. */
export function isResolvableLiveOpsEventId(eventId: string): boolean {
  return LIVE_OPS_EVENT_BY_ID.has(eventId) || MountedLiveOpsEventStore.has(eventId);
}
