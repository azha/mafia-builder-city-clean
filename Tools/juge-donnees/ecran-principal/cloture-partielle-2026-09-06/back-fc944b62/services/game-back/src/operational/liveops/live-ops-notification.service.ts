// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C7 (★ sendNotifications + cap/
//             cooldown + per-event consent gate, D4 — REPLACES the C4 `sendNotificationsStub` call site)
//             Decisions: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §2.4 (DD-B5 — the
//             fail-closed marketing-consent SEAM realization) + §3 (per-event push-consent
//             classification, RULED verbatim — encoded on the catalogue at C1, consumed here unchanged).
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.7 (live_ops_notification
//             shape).
//             Call site: live-ops-event.service.ts's activateLiveOpsEvent REPLACES sendNotificationsStub
//             with this service's sendNotifications — the ONLY call-site change C7 makes there.
//             Pattern (per-player gate, reject-before-write): live-ops-cadence-controller.ts's
//             enforceCadenceLimits (pure reads, throw/return BEFORE any write) + aggression-score-
//             bucket.service.ts's countViolentOpsInWindow (windowed count query shape).
//             — 04e-B C7 — 2026-07-06
//
// `LiveOpsNotificationService.sendNotifications` — per targeted recipient, writes ONE `live_ops_notification`
// intent row IFF ALL of:
//   (a) CONSENT (D4/DD-B5) — SERVICE always sendable; MARKETING iff the injected `MarketingConsentPort`
//       resolves opted-in for that player. Fail-CLOSED: a rejected/thrown read collapses to `false`,
//       NEVER to `true` (DD-B5's anti-fig-leaf boundary — the seam's production impl is
//       `FailClosedMarketingConsent`, always `false`; TD-087 defers the real store).
//   (b) DAILY CAP — `T.bo.push.daily_cap_per_player` (BO-owned REUSE — `live-ops.tunables.ts`'s
//       `liveOpsBoPushTunables`, C7 is the first code reader) not yet reached by this player's rolling-
//       24h send count — REGARDLESS of consent class (the cap is per-player, not per-class; canon "cap
//       journalier per-player").
//   (c) COOLDOWN — `liveops.notification_cooldown_hours` (REUSE, registered C1) elapsed since this
//       player's LAST row for the SAME `cooldown_key`.
//
// A SUPPRESSED candidate (any gate rejects it) writes NOTHING — the ledger is append-only and
// row-presence IS "this was actually sent" (mirrors `effect_modifier`'s own "the row IS the effect").
//
// E-LO-09 (`event.noticeCopy === null`, decisions §3): `sendNotifications` returns immediately, ZERO
// rows — no consent/cap/cooldown check is even attempted (there is no notice to gate; canon "None — no
// push notification").
//
// `cooldown_key` REALIZATION (the coder's HOW — decisions §2.4 specifies the cap/cooldown/consent
// MECHANICS, not this column's concrete value; no other candidate producer exists anywhere in
// plan/design/decisions): `cooldown_key = event.eventId` — the per-(player, event) cooldown scope. This
// is the minimal, honest realization: no broader grouping (e.g. a push "channel"/template family) is
// specified anywhere, and `eventId` is already the natural, always-present per-notice-family key.
//
// DAILY CAP WINDOW — realized as a ROLLING 24h window ending at `clock.now()` (NOT a calendar-day/
// timezone-boundary count) — mirrors `LiveOpsCadenceController`'s OWN established convention for its
// "real week" rule (b): a rolling window from the injected clock, never a calendar boundary. Avoids the
// timezone/midnight-edge ambiguity a calendar-day count would introduce, and keeps this gate consistent
// with the rest of the chapter's real-clock discipline (DD-B3/DD-B5).
//
// Device push TRANSPORT is TD (TD-177, docs_int/tech_debt_inventory.md — no FCM/APNs day-1, `liveops_events_and_push.md §2.3`) — this ledger + the
// 3-gate logic ARE the proven deliverable; the wire itself is honest-scaffolding, never a fabricated send.
//
// Determinism: NO `Math.random()`, NO inline `Date.now()`/`new Date()` — the ONLY real-time read is
// `this.clock.now()` (`LIVE_OPS_CLOCK`, DD-B3), the SAME port every other live-ops real-time mechanic uses.
//
// R2.3 (tunables registry-FIRST, REUSE — never re-register): `liveOpsTunables.notificationCooldownHours`
// (REUSE, C1) + `liveOpsBoPushTunables.pushDailyCapPerPlayer` (REUSE — pre-existing gdd/14 row, ch12
// 2026-05-29; THIS chunk is its first code reader) — both read fresh on every call (never cached), so a
// DB-override flip is observed immediately (falsifiable, `liveops_notifications.spec.ts`).

import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { liveOpsNotification } from '../../db/schema/live_ops_notification';
import { LIVE_OPS_CLOCK, type LiveOpsClockPort } from './live-ops-clock.port';
import { MARKETING_CONSENT, type MarketingConsentPort } from './marketing-consent.port';
import { liveOpsTunables, liveOpsBoPushTunables } from './live-ops.tunables';
import type { NotifiableEvent } from './live-ops.types';

/** Real-time-hour/day -> millisecond conversion — mirrors `live-ops-event.service.ts`'s own local
 *  `MS_PER_REAL_DAY` constant (this codebase's established file-local-constant convention, no shared
 *  time-utils module exists). */
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_REAL_DAY = 24 * MS_PER_HOUR;

/** The result of one `sendNotifications` call — per-activation aggregate. Not surfaced to any player/BO
 *  response today (no consumer exists yet, C8/C9) — useful for test/ops observability only. */
export interface SendNotificationsResult {
  readonly sentCount: number;
  readonly suppressedCount: number;
}

@Injectable()
export class LiveOpsNotificationService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    // DD-B3: the injectable real-time seam — created_at + both windows are derived from this, NEVER
    // Date.now().
    @Inject(LIVE_OPS_CLOCK) private readonly clock: LiveOpsClockPort,
    // DD-B5: the fail-closed marketing-consent seam — consulted ONLY for MARKETING-class events.
    @Inject(MARKETING_CONSENT) private readonly marketingConsent: MarketingConsentPort,
  ) {}

  /**
   * `sendNotifications` — the C7 real gate (REPLACES `LiveOpsEventService`'s `sendNotificationsStub`
   * call site). See file header for the (a)/(b)/(c) gate order + the E-LO-09 skip.
   *
   * `event` is typed `NotifiableEvent` (04e-C C5, DD-C5) — the minimal shape this method actually
   * reads, not the full `LiveOpsEvent` catalogue-entry interface (every real catalogue entry already
   * structurally satisfies it, so the 2 existing `live-ops-event.service.ts` call sites are unchanged).
   * This lets the composer's own non-catalogue `push/send` notice pass a real, honestly-typed object
   * instead of a fabricated `LiveOpsEvent` with an unsafe type-escape cast (`live-ops-admin.controller.ts`).
   */
  async sendNotifications(event: NotifiableEvent, playerIds: readonly string[], forceOverride?: boolean): Promise<SendNotificationsResult> {
    if (event.noticeCopy === null) {
      return { sentCount: 0, suppressedCount: 0 }; // E-LO-09 — no notice (decisions §3), zero rows.
    }

    const now = this.clock.now(); // DD-B3/DD-B5 — the ONLY real-time read in this method.
    const dailyCap = liveOpsBoPushTunables.pushDailyCapPerPlayer; // fresh read every call (R2.3).
    const cooldownHours = liveOpsTunables.notificationCooldownHours; // fresh read every call (R2.3).
    const cooldownKey = event.eventId; // see file header "cooldown_key REALIZATION".

    let sentCount = 0;
    let suppressedCount = 0;

    for (const playerId of playerIds) {
      const allowed = await this.isAllowed(event, playerId, cooldownKey, now, dailyCap, cooldownHours, forceOverride);
      if (!allowed) { suppressedCount += 1; continue; }

      await this.db.insert(liveOpsNotification).values({
        player_id: playerId,
        event_id: event.eventId,
        consent_class: event.pushConsentClass,
        cooldown_key: cooldownKey,
        created_at: now,
      });
      sentCount += 1;
    }

    return { sentCount, suppressedCount };
  }

  /**
   * (a) consent -> (b) daily cap -> (c) cooldown, in that order (plan §C7). Each check is a pure read —
   * a rejection at any step writes NOTHING (mirrors `LiveOpsCadenceController`'s own "reject before any
   * write" discipline).
   */
  private async isAllowed(
    event: NotifiableEvent,
    playerId: string,
    cooldownKey: string,
    now: Date,
    dailyCap: number,
    cooldownHours: number,
    forceOverride?: boolean,
  ): Promise<boolean> {
    // (a) CONSENT — SERVICE always allowed; MARKETING iff the seam resolves opted-in. Fail-CLOSED: a
    // thrown/rejected read collapses to false, NEVER to true (DD-B5 anti-fig-leaf boundary).
    if (event.pushConsentClass === 'MARKETING') {
      let optedIn: boolean;
      try {
        optedIn = await this.marketingConsent.isMarketingOptedIn(playerId);
      } catch {
        optedIn = false; // fail-closed on read failure — DD-B5 §2.4.
      }
      if (!optedIn) return false;
    }

    // (b) DAILY CAP — T.bo.push.daily_cap_per_player, rolling 24h window, REGARDLESS of consent class.
    if (!forceOverride) {
      const dayWindowStart = new Date(now.getTime() - MS_PER_REAL_DAY);
      const [dailyRow] = await this.db
        .select({ sentToday: count() })
        .from(liveOpsNotification)
        .where(and(
          eq(liveOpsNotification.player_id, playerId),
          gte(liveOpsNotification.created_at, dayWindowStart),
        ));
      const sentToday = Number(dailyRow?.sentToday ?? 0);
      if (sentToday >= dailyCap) return false;
    }

    // (c) COOLDOWN — liveops.notification_cooldown_hours elapsed since the LAST row for this
    // (player, cooldown_key) pair.
    const [lastRow] = await this.db
      .select({ created_at: liveOpsNotification.created_at })
      .from(liveOpsNotification)
      .where(and(
        eq(liveOpsNotification.player_id, playerId),
        eq(liveOpsNotification.cooldown_key, cooldownKey),
      ))
      .orderBy(desc(liveOpsNotification.created_at))
      .limit(1);
    if (lastRow) {
      const elapsedMs = now.getTime() - lastRow.created_at.getTime();
      if (elapsedMs < cooldownHours * MS_PER_HOUR) return false;
    }

    return true;
  }
}
