// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C4a (event-reskin-composer.ts —
//             compose() routed through TemplateInstantiationValidator.enforce() + AntiFOMO composition,
//             persist committed/rejected ; mount() — the 6-category 422 stub) + C4b (mount() — the LIVE_OPS
//             branch replaced by the real `LiveOpsReskinMountAdapter`, the other 5 stay 422)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.6 (EventReskinComposer
//             + mount adapters — "aucun runtime propre nouveau") + §3.6-B (the C4b LIVE_OPS adapter)
//             Decisions: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-decisions.md D1 (RULED=Option B
//             — LIVE_OPS gets a REAL adapter in C4b ; C4a shipped 422 ×6, LIVE_OPS included, "l'adapter
//             n'existe pas encore à C4a")
//             — 04g-D C4a — 2026-07-17
//             — 04g-D C4b — 2026-07-17 (★ mount() dispatch: LIVE_OPS routes to `LiveOpsReskinMountAdapter`;
//             `MOUNT_UNAVAILABLE_SEAM_BY_CATEGORY` shrinks from 6 to 5 entries)
//
// `EventReskinComposer` — gdd/15:1824 REUSE verbatim. The FULL facade for `event_reskin`: `compose()`
// (routes EVERY `ReskinSpec` through `TemplateInstantiationValidator.enforce()` + `AntiFomoValidator`'s
// PURE `scanComposition()`, then persists `committed` or `rejected`, D10 — "rejets PERSISTÉS", the
// rejection feeds `GET anti-fomo/status` + the BO monitor), plus the read/mount surface the controller
// delegates to (`findById`/`listByStatus`/`mount`). `EventReskinRepository` is injected here AND (★ C4b) in
// `LiveOpsReskinMountAdapter` — the ONLY two classes with `event_reskin` write access (structural "block"
// guarantee, design §3.5.2/§3.6, amended note in `event-reskin.repository.ts`'s own header: the adapter's
// write is a STATUS TRANSITION on an already-composed row, never a fresh INSERT bypassing `enforce()`).
//
// ★ Mount-dispatch (D1=B RULED, design §3.6 table): `mount()` dispatches on `row.host_category` — LIVE_OPS
// (★ C4b) delegates to the REAL `LiveOpsReskinMountAdapter` (design §3.6-B: guards + duration/effect-lever
// validation + brand-gate + conditional UPDATE `mounted` + store `reloadNow()`); the other 5 categories
// STILL return 422 `mount_unavailable` (the anti-fig-leaf stub C4a shipped — a `committed` reskin that
// cannot yet be mounted stays `committed`, visible BO, exportable, never silently faked as `mounted`).
// Per `template-library-entry.ts`'s own convention ("never a fresh TD number fabricated ahead of the C7
// closeout allocation"), the per-category seam text below names the STRUCTURAL reason (design §3.6 table)
// rather than inventing a TD-NNN number — the 5 permanent mount-TDs are allocated for real at the C7
// closeout (plan §C7 task 1).

import { Inject, Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { TemplateCategory } from './template-category';
import {
  findLibraryEntry,
  type ReskinSpec,
  type EventReskinValidationFailureReason,
  type EventReskinValidationError,
} from './event-reskin-validator';
import { TemplateInstantiationValidator, type DanglingCrossRefWarning } from './template-instantiation-validator';
import { scanComposition } from './anti-fomo-validator';
import { EventReskinRepository } from './event-reskin.repository';
import { LiveOpsReskinMountAdapter, type LiveOpsMountResult } from './live-ops-reskin-mount.adapter';
import type { EventReskinRow } from '../../db/schema/template_library';

/** The 5th+ reason `compose()` can reject on beyond the 7 `EventReskinValidationFailureReason` values
 *  (mirrors the controller's own `validateReskin` "5th reason this endpoint adds", `anti_fomo_rejected` —
 *  never folded into that closed union). */
export type EventReskinComposeFailureReason = EventReskinValidationFailureReason | 'anti_fomo_rejected';

export type EventReskinComposeWarning = EventReskinValidationError | DanglingCrossRefWarning;

export type EventReskinComposeResult =
  | {
      readonly outcome: 'committed';
      readonly row: EventReskinRow;
      readonly warnings: readonly EventReskinComposeWarning[];
      readonly strictMode: boolean;
    }
  | {
      readonly outcome: 'rejected';
      readonly row: EventReskinRow;
      readonly reason: EventReskinComposeFailureReason;
      readonly message: string;
      readonly matchedToken?: string;
      readonly field?: 'name' | 'reskinDescription';
    };

/** Per-category mount-dispatch seam text (design §3.6 table, D1=B) — the 5 categories that stay 422
 *  `mount_unavailable` (★ C4b: LIVE_OPS is REMOVED from this map — it dispatches to the real
 *  `LiveOpsReskinMountAdapter` instead, see `mount()` below). Each entry names the structural reason the
 *  category has no staff-authorable dynamic mount point today. */
const MOUNT_UNAVAILABLE_SEAM_BY_CATEGORY: Readonly<Record<Exclude<TemplateCategory, TemplateCategory.LIVE_OPS>, string>> = {
  [TemplateCategory.POLITICAL]:
    'runtime 04e-A2 fires the 12 static catalogue events — no dynamic event-entry point exists (mount TD allocated at 04g-D C7 closeout).',
  [TemplateCategory.RANDOM_WORLD]:
    "`POST admin/random-world/force-template` is restricted to a 2-entry forceable-set with zero parameter override (mount TD allocated at 04g-D C7 closeout).",
  [TemplateCategory.NEWS_BEAT]:
    '`composeBeat` composes from the FODDER pool, never from a staff-authored spec (canon Example 1) (mount TD allocated at 04g-D C7 closeout).',
  [TemplateCategory.RECRUITMENT_QUEST]:
    'the 04f quest machine is seeded by the mapper, consumed by TD-217 — not a staff mount point (mount TD allocated at 04g-D C7 closeout).',
  [TemplateCategory.ACHIEVEMENT_STRUCTURE]:
    'no runtime exists (G25 folded to 08c) — the future 08c entry will consume this registry (mount TD allocated at 04g-D C7 closeout).',
};

@Injectable()
export class EventReskinComposer {
  constructor(
    private readonly templateInstantiationValidator: TemplateInstantiationValidator,
    private readonly repository: EventReskinRepository,
    private readonly liveOpsMountAdapter: LiveOpsReskinMountAdapter,
  ) {}

  /** `spec.templateId`'s OWN `homeCategory` when it resolves ; falls back to `spec.hostCategory` when it
   *  does NOT (e.g. `unknown_template` — there is no real home to denormalize, and `template_home_category`
   *  is a NOT NULL enum column with no 7th "unknown" member; `hostCategory` is always one of the 6 valid
   *  `TemplateCategory` values on a well-typed `ReskinSpec`, a documented best-effort fallback, never a
   *  silent invention of a new domain value). */
  private homeCategoryFor(spec: ReskinSpec): TemplateCategory {
    return findLibraryEntry(spec.templateId)?.homeCategory ?? spec.hostCategory;
  }

  /** `compose(spec, staffId)` — routes through `TemplateInstantiationValidator.enforce()` (mode-aware,
   *  the 1a/1b/2/3/4 rules) THEN `AntiFomoValidator`'s composition-time scan (ALWAYS active, any mode,
   *  §3.5.3) — persists `committed` on success, `rejected` (+ `rejection_reason`, D10) on EITHER failure.
   *  Never throws — the CALLER (the controller) maps `outcome: 'rejected'` to its own HTTP 422. */
  async compose(spec: ReskinSpec, staffId: string): Promise<EventReskinComposeResult> {
    const templateHomeCategory = this.homeCategoryFor(spec);

    const enforceResult = await this.templateInstantiationValidator.enforce(spec);
    if (!enforceResult.ok) {
      const row = await this.repository.insert({
        eventId: spec.eventId,
        templateId: spec.templateId,
        templateHomeCategory,
        hostCategory: spec.hostCategory,
        reskinSpec: spec,
        status: 'rejected',
        rejectionReason: enforceResult.reason,
        createdBy: staffId,
      });
      return { outcome: 'rejected', row, reason: enforceResult.reason, message: enforceResult.message };
    }

    // AntiFOMO composition-time REJECT — ALWAYS active, any mode (§3.5.3 "le composition-time REJECT
    // reste actif même en lax"). Runs AFTER enforce() succeeds (mirrors the C3 dry-run endpoint's own
    // pipeline order — `validateReskin`: enforce() THEN scanComposition()).
    const fomoHit = scanComposition(spec);
    if (fomoHit) {
      const rejectionReason = `anti_fomo_rejected:${fomoHit.token}`;
      const row = await this.repository.insert({
        eventId: spec.eventId,
        templateId: spec.templateId,
        templateHomeCategory,
        hostCategory: spec.hostCategory,
        reskinSpec: spec,
        status: 'rejected',
        rejectionReason,
        createdBy: staffId,
      });
      return {
        outcome: 'rejected',
        row,
        reason: 'anti_fomo_rejected',
        message: `ReskinSpec.${fomoHit.field} was refused by the AntiFOMO composition-time gate (matched forbidden pattern "${fomoHit.token}").`,
        matchedToken: fomoHit.token,
        field: fomoHit.field,
      };
    }

    const row = await this.repository.insert({
      eventId: spec.eventId,
      templateId: spec.templateId,
      templateHomeCategory,
      hostCategory: spec.hostCategory,
      reskinSpec: spec,
      status: 'committed',
      rejectionReason: null,
      createdBy: staffId,
    });
    return { outcome: 'committed', row, warnings: enforceResult.warnings, strictMode: enforceResult.strictMode };
  }

  async findById(id: string): Promise<EventReskinRow | undefined> {
    return this.repository.findById(id);
  }

  async listByStatus(status?: 'committed' | 'mounted' | 'rejected'): Promise<readonly EventReskinRow[]> {
    return this.repository.listByStatus(status);
  }

  /** Composition-derived rejects for `GET anti-fomo/status` (C4a) — the rows themselves, so a caller can
   *  scope an assertion to ONE specific `eventId` rather than a global total (plan §0.3). */
  async listAntiFomoRejections(): Promise<readonly EventReskinRow[]> {
    return this.repository.listAntiFomoRejections();
  }

  /** `mount(reskinId, staffId)` — dispatch to the `hostCategory` adapter (design §3.6). ★ C4b: LIVE_OPS
   *  delegates to the REAL `LiveOpsReskinMountAdapter` (design §3.6-B — may succeed, 200, or throw one of
   *  ITS OWN typed 422s); the other 5 categories still throw 422 `mount_unavailable`, naming the seam, and
   *  leave the reskin row UNTOUCHED (still `committed` after a failed mount attempt — the anti-fig-leaf
   *  proof, design §3.6 "un reskin committed non-mountable reste committed"). */
  async mount(reskinId: string, staffId: string): Promise<LiveOpsMountResult> {
    const row = await this.repository.findById(reskinId);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `event_reskin '${reskinId}' not found.` });
    }
    if (row.host_category === TemplateCategory.LIVE_OPS) {
      return this.liveOpsMountAdapter.mount(row, staffId);
    }
    const seam = MOUNT_UNAVAILABLE_SEAM_BY_CATEGORY[row.host_category as Exclude<TemplateCategory, TemplateCategory.LIVE_OPS>];
    throw new ApiError('VALIDATION_FAILED', {
      message: `Mount is not available for host category '${row.host_category}' — ${seam}`,
      details: {
        validation_failure_reason: 'mount_unavailable',
        hostCategory: row.host_category,
        seam,
      },
    });
  }
}
