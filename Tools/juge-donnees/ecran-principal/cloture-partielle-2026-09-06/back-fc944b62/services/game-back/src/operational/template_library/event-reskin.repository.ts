// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C4a (event-reskin.repository.ts —
//             persistence event_reskin, design §4)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.6 (EventReskinComposer
//             + mount adapters) + §4.1 (`event_reskin` table)
//             — 04g-D C4a — 2026-07-17
//
// `EventReskinRepository` — the ONLY class in this module that touches the `event_reskin` table for
// WRITES (design §3.5.2 / §3.6: "le repository event_reskin n'est injecté QUE dans le composer" — a
// structural "block" guarantee that no code path can construct/persist an `EventReskin` without first
// going through `EventReskinComposer.compose()`, which routes every spec through `TemplateInstantiation-
// Validator.enforce()`). C3's validators (`EventReskinValidator.service.ts`, `AntiFomoValidator.service.ts`)
// only ever READ this table (rule 4's collision check / the persisted-reskins boot scan) — this file is
// the SOLE writer, imported by `event-reskin-composer.ts` AND (★ C4b) `live-ops-reskin-mount.adapter.ts`.
//
// ★ C4b amendment (D1=B RULED, design §3.6-B DD-RSK6): "injected QUE dans le composer" now reads
// "injected in the composer AND the C4b mount adapter — the ONLY TWO classes with write access". The
// anti-bypass guarantee above is UNCHANGED: `markMounted` (below) is a pure STATUS TRANSITION on an
// ALREADY-composed row (`WHERE status='committed'`), never a fresh INSERT — every `EventReskin` still
// necessarily passed through `enforce()` at its ORIGINAL `insert()` call; mounting cannot create one.
//
// `@Inject(DB)` on the constructor — same Playwright/esbuild parameter-decorator parse constraint
// documented in `event-reskin-validator.service.ts` / `anti-fomo-validator.service.ts` headers (this file
// is exercised ONLY via the real HTTP stack, never directly imported by a pure-module Playwright spec).

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { eventReskin, type EventReskinRow } from '../../db/schema/template_library';

/** Mirrors the `event_reskin_status` pgEnum's 3 members (migration 0131, `db/schema/template_library.ts`)
 *  — not re-exported from that file (it has no such named type today), inlined here since this is the
 *  ONLY file that needs the bare union for a query parameter. */
type EventReskinStatus = 'committed' | 'mounted' | 'rejected';
import { TemplateCategory } from './template-category';
import type { ReskinSpec } from './event-reskin-validator';

/** The fields `EventReskinComposer` provides at INSERT time (design §4.1 — `id`/`created_at`/`updated_at`
 *  are DB defaults, D10 — status is always `committed` or `rejected` at insert, never `mounted`). */
export interface EventReskinInsertInput {
  readonly eventId: string;
  readonly templateId: string;
  readonly templateHomeCategory: TemplateCategory;
  readonly hostCategory: TemplateCategory;
  readonly reskinSpec: ReskinSpec;
  readonly status: 'committed' | 'rejected';
  readonly rejectionReason: string | null;
  readonly createdBy: string;
}

@Injectable()
export class EventReskinRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async insert(input: EventReskinInsertInput): Promise<EventReskinRow> {
    const [row] = await this.db
      .insert(eventReskin)
      .values({
        event_id: input.eventId,
        template_id: input.templateId,
        template_home_category: input.templateHomeCategory,
        host_category: input.hostCategory,
        reskin_spec: input.reskinSpec,
        status: input.status,
        rejection_reason: input.rejectionReason,
        created_by: input.createdBy,
      })
      .returning();
    return row!;
  }

  async findById(id: string): Promise<EventReskinRow | undefined> {
    const rows = await this.db.select().from(eventReskin).where(eq(eventReskin.id, id)).limit(1);
    return rows[0];
  }

  /** `undefined` status = every row, newest first (BO listing, `GET reskins?status=`). */
  async listByStatus(status?: EventReskinStatus): Promise<readonly EventReskinRow[]> {
    if (status) {
      return this.db.select().from(eventReskin).where(eq(eventReskin.status, status)).orderBy(desc(eventReskin.created_at));
    }
    return this.db.select().from(eventReskin).orderBy(desc(eventReskin.created_at));
  }

  /** Count of `rejected` rows whose `rejection_reason` was set by the AntiFOMO composition-time gate
   *  (`anti_fomo_rejected:<token>`, `event-reskin-composer.ts`'s own persisted convention) — consumed by
   *  `GET template-library/anti-fomo/status` (C4a). Returns the matching rows themselves (never a bare
   *  count) so the endpoint/tests can scope an assertion to ONE specific reskin's `eventId` rather than a
   *  global total (plan §0.3 — never a GLOBAL-tick-style total across specs). */
  async listAntiFomoRejections(): Promise<readonly EventReskinRow[]> {
    const rows = await this.db.select().from(eventReskin).where(eq(eventReskin.status, 'rejected')).orderBy(desc(eventReskin.created_at));
    return rows.filter((r) => (r.rejection_reason ?? '').startsWith('anti_fomo_rejected:'));
  }

  /** ★ C4b (design §3.6-B DD-RSK6) — the ONE mount-time write: `UPDATE event_reskin SET status='mounted',
   *  mount_ref=$2 WHERE id=$1 AND status='committed'`, conditional so a concurrent/repeat call affecting
   *  0 rows is DISTINGUISHABLE (the caller, `LiveOpsReskinMountAdapter`, already knows the row's status
   *  from its own pre-read and handles the idempotent/`rejected` cases itself — this method is a THIN
   *  conditional UPDATE, never a second business-logic layer). Returns `undefined` on 0 rows affected
   *  (status was not `committed` at UPDATE time — a race, or an already-mounted/rejected row), the updated
   *  row otherwise. */
  async markMounted(id: string, mountRef: unknown): Promise<EventReskinRow | undefined> {
    const [row] = await this.db
      .update(eventReskin)
      .set({ status: 'mounted', mount_ref: mountRef, updated_at: sql`now()` })
      .where(and(eq(eventReskin.id, id), eq(eventReskin.status, 'committed')))
      .returning();
    return row;
  }
}
