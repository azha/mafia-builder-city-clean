// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C2
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §6 (Player surface —
//             P5 projection qualitative, R2.2)
//             P5 pattern seam S9: services/game-back/src/citysim/cohesion/cohesion.projection.service.ts /
//             exceptions/exceptions.projection.service.ts — the SAME "raw struct → qualitative bands"
//             template applied here to the ambient feed + attend outcome.
//             — 04g-A C2 — 2026-07-13
//
// `AmbientProjectionService` — the player-facing projection layer (design §6). Maps the RAW
// `ambient_micro_event` rows (+ the attend outcome's internal tier) → QUALITATIVE payloads: closed-domain
// bands/keys only, NEVER a raw scalar (R2.2 — no `expires_at`, no countdown, no cohesion delta float).
//
// FEED (`GET /v1/ambient/feed`): kind + channel (closed pgEnum labels — player-safe, like an exception
// card's `effect.type`) + a `descriptor_i18n_key` (a DOTTED KEY string the CLIENT resolves via its own
// translation catalog — the SAME "back pushes the key, never translates" convention `error-codes.ts`'s
// `user_facing_i18n_key` already established; NOT a literal English string) + `district` (an identity
// string, mirrors `CohesionPermafrostProjectionService`'s `district-${id}` echo) + a qualitative
// `recency_band` (`fresh`/`settling`/`fading`, derived server-side from the remaining game-minutes as a
// FRACTION of the decay window — the fraction itself, the raw remaining minutes, and `expires_at` NEVER
// leave this method; design §6 "JAMAIS le raw expires_at, jamais un countdown").
//
// ATTEND (`POST /v1/ambient/attend/:id`): the outcome is `attended` + a qualitative `residue_band`
// (`full`/`reduced`/`minimal`/`none`) derived from the diminishing-returns TIER — the raw delta magnitude
// (0.01 / 0.005 / 0.0025…) NEVER leaves this method (design §6 "jamais le delta numérique").

import { Injectable } from '@nestjs/common';

import { ambientTunables } from './ambient.tunables';
import type { AmbientMicroEventRow } from '../../db/schema/ambient_world';
import type { AttendOutcome } from './ambient-attend.service';
import { AmbientMicroEventRepository } from './ambient-micro-event.repository';

/** The 3-band qualitative "how long ago" signal (never the raw remaining minutes). */
export type AmbientRecencyBand = 'fresh' | 'settling' | 'fading';

/** ONE feed item — closed-domain labels + an i18n KEY only (R2.2 grep-zero: no numeric leaf anywhere). */
export interface AmbientFeedItemView {
  readonly event_id: string;
  readonly district: string;
  readonly kind: string;
  readonly channel: string;
  readonly descriptor_i18n_key: string;
  readonly recency_band: AmbientRecencyBand;
}

/** The 4-band qualitative attend outcome (never the raw residue delta). `none` iff no cohesion row existed
 *  yet for this district (the documented `AmbientAttendService` no-op edge — still a successful attend). */
export type AmbientResidueBand = 'full' | 'reduced' | 'minimal' | 'none';

/** The attend response — `status` is always `'attended'` on success (this method is only called after a
 *  successful claim; the controller throws before reaching it on a 404/409). */
export interface AmbientAttendView {
  readonly event_id: string;
  readonly district: string;
  readonly status: 'attended';
  readonly residue_band: AmbientResidueBand;
}

@Injectable()
export class AmbientProjectionService {
  constructor(private readonly repo: AmbientMicroEventRepository) {}

  /**
   * `GET /v1/ambient/feed` projection (design §6): the requesting player's `live` events in districts they
   * own ≥1 building in (the repository's building-gate), newest first, paginated. A player with zero owned
   * buildings gets an empty page (L1 natural — `listPlayerDistrictIds` returns `[]`).
   */
  async listFeed(playerId: string, limit: number, offset: number): Promise<{ events: AmbientFeedItemView[]; total: number }> {
    const districtIds = await this.repo.listPlayerDistrictIds(playerId);
    if (districtIds.length === 0) return { events: [], total: 0 };

    const nowGameMinute = await this.repo.getCurrentGameMinute(playerId);
    const decayWindowMinutes = ambientTunables.constantHumDecayWindowHours * 60;
    const { rows, total } = await this.repo.listLiveEventsForDistricts(districtIds, limit, offset);
    return { events: rows.map((r) => this.toFeedItem(r, nowGameMinute, decayWindowMinutes)), total };
  }

  /** Map ONE raw row → the qualitative feed item. The remaining-fraction float is a LOCAL, never-forwarded
   *  intermediate (R2.2) — only the resulting 3-value band crosses the method boundary. */
  private toFeedItem(row: AmbientMicroEventRow, nowGameMinute: number, decayWindowMinutes: number): AmbientFeedItemView {
    const remaining = Number(row.expires_at_game_minute) - nowGameMinute;
    const fraction = decayWindowMinutes > 0 ? remaining / decayWindowMinutes : 0;
    const recencyBand: AmbientRecencyBand = fraction > 2 / 3 ? 'fresh' : fraction > 1 / 3 ? 'settling' : 'fading';
    return {
      event_id: row.id,
      district: `district-${row.district_id}`,
      kind: row.kind,
      channel: row.channel,
      descriptor_i18n_key: `ambient.micro_event.${row.kind}`,
      recency_band: recencyBand,
    };
  }

  /** Map an `AmbientAttendService.attend` outcome → the qualitative attend response (design §6). */
  attendOutcomeView(outcome: AttendOutcome): AmbientAttendView {
    return {
      event_id: outcome.eventId,
      district: `district-${outcome.districtId}`,
      status: 'attended',
      residue_band: outcome.cohesionApplied ? this.residueBandForTier(outcome.attendTier) : 'none',
    };
  }

  /** Diminishing-returns TIER → a closed-domain band (1=full residue, 2=×factor, 3+=×factor²+ — never the
   *  raw multiplier or the raw tier number). */
  private residueBandForTier(tier: number): 'full' | 'reduced' | 'minimal' {
    if (tier <= 1) return 'full';
    if (tier === 2) return 'reduced';
    return 'minimal';
  }
}
