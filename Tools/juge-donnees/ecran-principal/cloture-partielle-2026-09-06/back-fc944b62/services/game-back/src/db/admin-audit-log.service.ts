// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C8 (D5 — "Every mutation ->
//             AdminAuditLogService.emit (REUSE 09)")
//             Canon: docs/tech/09_data_model/schema_sessions_and_audit.md §2 (admin_audit_log, GDD L416-426)
//             Schema: db/schema/sessions_and_audit.ts (adminAuditLogRow + auditActionType — ch09, migration 0010)
//             — 04e-B C8 — 2026-07-06
//
// `AdminAuditLogService` — thin insert-only wrapper over the ch09 `admin_audit_log` table
// (`sessions_and_audit.ts`, migration 0010, UNCHANGED — no new table, no new column, no new migration
// here). REUSE, never a second audit mechanism (D5's own explicit instruction).
//
// ★ FIRST CONSUMER (honest — grepped 2026-07-06 across the whole repo before writing this file):
// `admin_audit_log` has existed since the very first ch09 schema commit (`05d3bdf6`) but had ZERO code
// consumers anywhere before this chunk — no `AdminAuditLogService` (or equivalent) existed under
// `services/game-back/src/` or `services/bo-back/src/`, and NONE of the prior 5-endpoint thin-BO
// controllers this chunk mirrors (`political-admin.controller.ts` C9, `meta-market-admin.controller.ts`
// C8, `ia-admin.controller.ts` C9, `legal-admin.controller.ts` C10, `combat-admin`/`rival-admin`/
// `distribution-admin`/`forensic-admin`/`insurance-admin`/`precursor-market-admin`/
// `reputation-admin.controller.ts`) writes to it despite each exposing mutation endpoints — TD-048
// (lieutenant settle-log: "audit log actuel = structured logger only ; persistance différée")
// independently documents the SAME "audit persistence deferred" posture elsewhere in this codebase.
// This chunk's plan (D5) explicitly requires every live-ops BO mutation to write a row here — this file
// is the FIRST real write-path for the table ch09 already fully specified. Scoped MINIMALLY to what C8
// needs (one `emit()` method, no read/query API, no batch form) — a LATER chunk MAY retrofit the sibling
// BO controllers above to call this SAME service (never invent a second one) rather than continuing to
// skip the table; that retrofit is explicitly OUT of C8's "thin ops-BO" scope (not attempted here).
//
// R9.3: NO schema/migration change in this file — `admin_audit_log` is byte-unchanged. Zero-regression:
// purely additive (one new provider file) — no existing table/service/route touched.

import { Inject, Injectable } from '@nestjs/common';

import type { DrizzleClient } from './index';
import { DB } from './db.module';
import { adminAuditLogRow, type AuditActionTypeEnumTs } from './schema/sessions_and_audit';

/** One `admin_audit_log` row to write — field names mirror `sessions_and_audit.ts`'s column doc
 *  comments verbatim (GDD L416-426). */
export interface AdminAuditLogEntry {
  /** Soft-ref to the acting `StaffAccount.account_id` (ch17, no FK day-1 — GDD L418). */
  readonly adminUserId: string;
  /** One of the 7 canonical `audit_action_type` enum members. */
  readonly actionType: AuditActionTypeEnumTs;
  /** Soft-ref to a targeted `Player.player_id`, nullable — a city-wide/non-player-targeted mutation
   *  (e.g. a live-ops event activation, a tunable edit) leaves this `null` (GDD L420 "uuid null"). */
  readonly targetPlayerId?: string | null;
  /** Open catalogue string, e.g. `'live_ops_event_active'` / `'liveops_tunable'` (GDD L421). */
  readonly targetEntityType: string;
  /** Soft-ref polymorphic target id, nullable (GDD L422 "uuid null" — e.g. not every mutated entity
   *  has a uuid identity, such as a dotted tunable key). */
  readonly targetEntityId?: string | null;
  /** State before the mutation (GDD L423, defaults `{}`). */
  readonly beforeState?: Record<string, unknown>;
  /** State after the mutation (GDD L424, defaults `{}`). */
  readonly afterState?: Record<string, unknown>;
  /** Optional external support ticket reference (GDD L425). */
  readonly ticketRef?: string | null;
}

@Injectable()
export class AdminAuditLogService {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** Insert ONE `admin_audit_log` row — one call per mutation (D5), never a batch. */
  async emit(entry: AdminAuditLogEntry): Promise<void> {
    await this.db.insert(adminAuditLogRow).values({
      admin_user_id: entry.adminUserId,
      action_type: entry.actionType,
      target_player_id: entry.targetPlayerId ?? null,
      target_entity_type: entry.targetEntityType,
      target_entity_id: entry.targetEntityId ?? null,
      before_state: entry.beforeState ?? {},
      after_state: entry.afterState ?? {},
      ticket_ref: entry.ticketRef ?? null,
    });
  }
}
