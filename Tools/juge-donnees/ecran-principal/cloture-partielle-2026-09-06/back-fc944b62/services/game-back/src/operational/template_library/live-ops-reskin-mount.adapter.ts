// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C4b (live-ops-reskin-mount.
//             adapter.ts — LiveOpsReskinMountAdapter.mount())
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.6-B DD-RSK3
//             (duration cap) + DD-RSK4 (effects ⊂ WIRED leviers, dérivé de LIVE_OPS_LEVER_AUDIT, jamais
//             une 2e liste) + DD-RSK5 (postures conservatrices) + DD-RSK6 (adapter, idempotence,
//             crash-safety)
//             Decisions: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-decisions.md D1 (Option B)
//             — 04g-D C4b — 2026-07-17
//
// `LiveOpsReskinMountAdapter` — R6.1 justified local term (gdd/15 row same-commit): the ONE real mount
// adapter D1=B ships. `mount(row, staffId)` = guards (status) → validate the `reskin_spec.liveOps` block
// (DD-RSK3 duration cap, DD-RSK4 effect-lever gate) → brand-gate defense-in-depth (D6/D7) → conditional
// UPDATE `event_reskin SET status='mounted', mount_ref WHERE id=$1 AND status='committed'` (1 write,
// DD-RSK6) → `MountedLiveOpsEventStore.reloadNow()`. From this point on, the mounted reskin's `event_id`
// resolves through `resolveLiveOpsEventById` (`live-ops-mounted-event.store.ts`) exactly like a static
// catalogue id — schedulable via the EXISTING `POST admin/liveops/schedule` endpoint (now accepting it via
// the DD-RSK1 gate swap) and ACTIVATABLE by the EXISTING `LiveOpsSchedulerService` sweep — this file adds
// ZERO new runtime, it only produces the row the ALREADY-EXISTING 04e-B engine consumes (design §3.6-B's
// own framing: "aucun runtime propre nouveau").
//
// ★ Repository access (amends `EventReskinRepository`'s own header note, C4a): that file's header claims
// "injected ONLY in the composer" — C4b amends this to "injected in the composer AND this adapter, the
// ONLY two classes with `event_reskin` write access". This does NOT reopen the anti-bypass guarantee the
// C4a comment protects (design §3.5.2's "block": every `EventReskin` that EXISTS was routed through
// `TemplateInstantiationValidator.enforce()` at INSERT time) — `markMounted` is a pure STATUS TRANSITION
// on an ALREADY-composed row (`WHERE status='committed'`, itself only ever reachable via `compose()`),
// never a fresh INSERT that could bypass `enforce()`. See `event-reskin.repository.ts`'s own updated
// header for the mirrored note.
//
// Idempotence/crash-safety (DD-RSK6): `markMounted`'s conditional UPDATE affects 0 rows when the row is
// no longer `committed` — this adapter re-reads the CURRENT status the caller already fetched to decide
// the outcome: `mounted` (already, by an earlier call — possibly this SAME request retried) → 200
// idempotent, NO re-validation/re-write (the row's `reskin_spec` is immutable post-commit, so re-running
// the SAME validation would always reach the SAME verdict — precedent `markCourierCaught`); `rejected` →
// 422 `mount_invalid_status` (never mountable, by construction). A crash between the UPDATE and
// `reloadNow()` is reconciled by the next boot-warm (the DB row is the source of truth, the store a
// reconstructible cache — precedent `EffectOverlayStore`).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { TemplateCategory } from './template-category';
import type { ReskinSpec } from './event-reskin-validator';
import { EventReskinRepository } from './event-reskin.repository';
import { liveOpsMountPolicyTunables } from './template-library.tunables';
import type { EventReskinRow } from '../../db/schema/template_library';
import { liveOpsEventCategory } from '../../db/schema/live_ops_event_active';
import { assertLiveOpsBrandGateClean } from '../liveops/live-ops-brand-gate';
import { LIVE_OPS_LEVER_AUDIT } from '../liveops/live-ops-lever-audit';
import { LIVE_OPS_EVENT_CATALOGUE } from '../liveops/live-ops-event-catalogue';
import { MountedLiveOpsEventStore } from '../liveops/live-ops-mounted-event.store';
import type { LiveOpsEffectOp, LiveOpsEffectScope } from '../liveops/live-ops.types';

/** The 4 mount-validator-specific 422 reasons this adapter can throw, on top of the generic
 *  `RESOURCE_NOT_FOUND` (unknown reskin id — thrown by the composer's own dispatch BEFORE this adapter is
 *  ever reached). Never folded into `EventReskinValidationFailureReason`/`EventReskinComposeFailureReason`
 *  (those are the COMMIT-time reasons, design §3.5.1 — this is a SEPARATE gate, the MOUNT-time one,
 *  design §3.6-B — mirrors the `EventReskinValidator` vs `TemplateInstantiationValidator` "two distinct
 *  validators" split decisions D16 already established for compose). */
export type LiveOpsMountFailureReason =
  | 'mount_spec_incomplete'
  | 'mount_invalid_status'
  | 'mounted_duration_out_of_range'
  | 'effect_lever_not_wired'
  | 'mounted_effect_invalid';

export interface LiveOpsMountResult {
  readonly row: EventReskinRow;
  /** `true` iff the row was ALREADY `mounted` before this call (idempotent re-mount, DD-RSK6) — no
   *  re-validation/re-write happened this call. */
  readonly idempotent: boolean;
}

const VALID_LIVE_OPS_CATEGORIES: ReadonlySet<string> = new Set(liveOpsEventCategory.enumValues);

interface MountEffectCandidate {
  readonly tunableKey: string;
  readonly op: LiveOpsEffectOp;
  readonly scope: LiveOpsEffectScope;
  readonly magnitude: number | string;
}

/** DD-RSK4 rule 1 — DERIVED from `LIVE_OPS_LEVER_AUDIT`'s `verdict==='WIRED'` rows, NEVER a second
 *  hand-list (design: "si un lot futur wire un levier, l'allowance suit automatiquement"). Today: 3 events
 *  / 4 keys (`T.city.raid_target_temperature`, `T.city.inspection_queue_cap`,
 *  `laundering.front_shop_legit_baseline_cents`, `T.city.cohesion_recovery_rate_per_day`). */
function wiredTunableKeys(): ReadonlySet<string> {
  return new Set(
    LIVE_OPS_LEVER_AUDIT
      .filter((entry) => entry.verdict === 'WIRED' && entry.tunableKey !== null)
      .map((entry) => entry.tunableKey as string),
  );
}

/** DD-RSK4 rule 2 — the (tunableKey, op, scope) triple must equal one already PROVEN live by the
 *  catalogue's own `effects[]` (dérivé de `LIVE_OPS_EVENT_CATALOGUE`, never a second hand-list either). */
function findCatalogueTriple(tunableKey: string, op: string, scope: string) {
  for (const event of LIVE_OPS_EVENT_CATALOGUE) {
    for (const effect of event.effects) {
      if (effect.tunableKey === tunableKey && effect.op === op && effect.scope === scope) return effect;
    }
  }
  return undefined;
}

/** Best-effort enrichment ONLY (never gates on this) — a rejected key's audit row is looked up by
 *  searching `LIVE_OPS_LEVER_AUDIT`'s own `rationale` prose for the literal tunableKey substring (every TD
 *  row's rationale names its subject key verbatim, e.g. `audit_pin_half_life`'s rationale opens
 *  "forensic.audit_pin_half_life_days IS a real…") — a DERIVATION, never a manual key→tdMarker map. `null`
 *  fields when no row's rationale mentions the key (e.g. a wholly-unregistered key). */
function findAuditHintForKey(tunableKey: string): { verdict: string; tdMarker: string | null } | null {
  const hit = LIVE_OPS_LEVER_AUDIT.find((entry) => entry.rationale.includes(tunableKey));
  return hit ? { verdict: hit.verdict, tdMarker: hit.tdMarker } : null;
}

@Injectable()
export class LiveOpsReskinMountAdapter {
  constructor(private readonly repository: EventReskinRepository) {}

  /** `row` is ALREADY known `host_category === TemplateCategory.LIVE_OPS` (the composer's own dispatch
   *  guarantees this before ever calling here) — re-asserted defensively below (a bug, not a user-facing
   *  validation failure, if it ever fires). */
  async mount(row: EventReskinRow, staffId: string): Promise<LiveOpsMountResult> {
    if (row.host_category !== TemplateCategory.LIVE_OPS) {
      throw new Error(
        `LiveOpsReskinMountAdapter.mount called for a non-LIVE_OPS row (host_category='${row.host_category}') ` +
        '— composer dispatch bug, this adapter is only ever reached for LIVE_OPS.',
      );
    }

    // DD-RSK6 idempotence — decide the outcome from the CURRENT status BEFORE attempting any write.
    if (row.status === 'mounted') {
      return { row, idempotent: true }; // precedent markCourierCaught — no re-validation, no re-write.
    }
    if (row.status === 'rejected') {
      throw new ApiError('VALIDATION_FAILED', {
        message: `event_reskin '${row.id}' has status='rejected' — a rejected reskin can never be mounted.`,
        details: { validation_failure_reason: 'mount_invalid_status' satisfies LiveOpsMountFailureReason, status: row.status },
      });
    }
    // row.status === 'committed' — proceed with the mount validator.

    const spec = row.reskin_spec as ReskinSpec;
    const liveOps = spec.liveOps;
    if (!liveOps) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `event_reskin '${row.id}' has no reskin_spec.liveOps block — required to mount a LIVE_OPS reskin (design §4.1-B).`,
        details: { validation_failure_reason: 'mount_spec_incomplete' satisfies LiveOpsMountFailureReason },
      });
    }
    if (!VALID_LIVE_OPS_CATEGORIES.has(liveOps.category)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `event_reskin '${row.id}' liveOps.category '${liveOps.category}' is not one of the 7 LiveOpsEventCategory members.`,
        details: { validation_failure_reason: 'mount_spec_incomplete' satisfies LiveOpsMountFailureReason, category: liveOps.category },
      });
    }

    // DD-RSK3 — duration cap.
    const durationCap = liveOpsMountPolicyTunables.mountedReskinMaxDurationRealDays;
    if (!(liveOps.durationRealDays > 0 && liveOps.durationRealDays <= durationCap)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `event_reskin '${row.id}' liveOps.durationRealDays=${liveOps.durationRealDays} is outside (0, ${durationCap}] ` +
          `(liveops_templates.mounted_reskin_max_duration_real_days).`,
        details: {
          validation_failure_reason: 'mounted_duration_out_of_range' satisfies LiveOpsMountFailureReason,
          durationRealDays: liveOps.durationRealDays,
          cap: durationCap,
        },
      });
    }

    // DD-RSK4 — effects ⊂ WIRED levers, triples catalogue-proven, magnitude banded. `effects: []` legal
    // (rule 4 — an honest zero-lever mounted event, mirrors E-LO-09/every TD'd catalogue event's own
    // "SKIP the apply entirely" code path, `live-ops-event.service.ts`).
    this.validateEffects(row.id, liveOps.effects as readonly MountEffectCandidate[]);

    // Defense-in-depth brand gate (D6/D7) — redundant with the C3 `AntiFomoValidator.scanComposition()`
    // this spec's `name`/`reskinDescription` ALREADY passed at commit time (same token set, imported not
    // duplicated), never a second decision.
    assertLiveOpsBrandGateClean(spec.name, spec.reskinDescription);

    const mountRef = { host: 'LIVE_OPS', mountedAt: new Date().toISOString(), mountedBy: staffId };
    const updated = await this.repository.markMounted(row.id, mountRef);
    if (!updated) {
      // Race: the row transitioned away from 'committed' between our read and the conditional UPDATE.
      const refetched = await this.repository.findById(row.id);
      if (refetched?.status === 'mounted') return { row: refetched, idempotent: true };
      throw new Error(
        `LiveOpsReskinMountAdapter.mount: conditional UPDATE affected 0 rows for '${row.id}' and the row is ` +
        `not 'mounted' on re-read (status='${refetched?.status}') — unexpected concurrent transition.`,
      );
    }

    await MountedLiveOpsEventStore.reloadNow(); // DD-RSK6 — same-request visibility, precedent EffectOverlayStore.

    return { row: updated, idempotent: false };
  }

  private validateEffects(reskinId: string, effects: readonly MountEffectCandidate[]): void {
    const wiredKeys = wiredTunableKeys();
    const factor = liveOpsMountPolicyTunables.mountedEffectMaxMagnitudeFactor;

    for (const effect of effects) {
      if (!wiredKeys.has(effect.tunableKey)) {
        const hint = findAuditHintForKey(effect.tunableKey);
        throw new ApiError('VALIDATION_FAILED', {
          message: `event_reskin '${reskinId}' effect targets tunableKey '${effect.tunableKey}', which is ` +
            `NOT WIRED per LIVE_OPS_LEVER_AUDIT (derived, never a hand-list) — currently WIRED: ` +
            `${[...wiredKeys].join(', ')}.`,
          details: {
            validation_failure_reason: 'effect_lever_not_wired' satisfies LiveOpsMountFailureReason,
            tunableKey: effect.tunableKey,
            wiredTunableKeys: [...wiredKeys],
            auditVerdict: hint?.verdict ?? 'unregistered',
            tdMarker: hint?.tdMarker ?? null,
          },
        });
      }

      const catalogueTriple = findCatalogueTriple(effect.tunableKey, effect.op, effect.scope);
      if (!catalogueTriple) {
        throw new ApiError('VALIDATION_FAILED', {
          message: `event_reskin '${reskinId}' effect (${effect.tunableKey}, ${effect.op}, ${effect.scope}) ` +
            'does not match any catalogue-proven (tunableKey, op, scope) triple (DD-RSK4 rule 2).',
          details: {
            validation_failure_reason: 'mounted_effect_invalid' satisfies LiveOpsMountFailureReason,
            tunableKey: effect.tunableKey, op: effect.op, scope: effect.scope,
          },
        });
      }

      const catalogueMagnitude = catalogueTriple.magnitudeGetter();
      if (typeof effect.magnitude !== typeof catalogueMagnitude) {
        throw new ApiError('VALIDATION_FAILED', {
          message: `event_reskin '${reskinId}' effect magnitude type '${typeof effect.magnitude}' does not ` +
            `match the catalogue triple's own magnitude type '${typeof catalogueMagnitude}' (DD-RSK4 rule 3).`,
          details: {
            validation_failure_reason: 'mounted_effect_invalid' satisfies LiveOpsMountFailureReason,
            tunableKey: effect.tunableKey,
          },
        });
      }

      const staffAbs = Math.abs(Number(effect.magnitude));
      const catalogueAbs = Math.abs(Number(catalogueMagnitude));
      if (staffAbs > factor * catalogueAbs) {
        throw new ApiError('VALIDATION_FAILED', {
          message: `event_reskin '${reskinId}' effect |magnitude|=${staffAbs} exceeds the DD-RSK4 rule-3 band ` +
            `${factor} × |catalogue magnitude|=${catalogueAbs} for '${effect.tunableKey}' ` +
            '(liveops_templates.mounted_effect_max_magnitude_factor).',
          details: {
            validation_failure_reason: 'mounted_effect_invalid' satisfies LiveOpsMountFailureReason,
            tunableKey: effect.tunableKey,
            magnitude: effect.magnitude,
            catalogueMagnitude,
            factor,
          },
        });
      }
    }
  }
}
