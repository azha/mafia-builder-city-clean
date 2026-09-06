// IMPLEMENTS: docs/tech/09_data_model/schema_telemetry_event.md §11 (repository/ingestion pattern)
//             + §3 (APPEND-ONLY — INSERT only; UPDATE/DELETE REVOKEd, app_rw has SELECT/INSERT)
//             -- session:2026-06-02 (Phase 0 Task 9) --
//
// `TelemetryEventRepository` — the append-only access layer over the EXISTING `telemetry_event`
// table (migration 0012, schema_telemetry_event.md §3/§7 — A2, already migrated). R9.3: this READS
// the schema + INSERTs; it NEVER redefines the table, and it NEVER issues UPDATE/DELETE (the table
// is append-only — migration 0010-0013 REVOKE them and the runtime role app_rw has only
// SELECT/INSERT). occurred_at is server-rehorodated (server now(), REUSE ch13 — never client time).

import { Inject, Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import {
  telemetryEventRow,
  type EventDomainEnumTs,
  type EventPrivacyClassEnumTs,
} from '../db/schema/telemetry_event';

/** A validated, PII-masked event ready to INSERT (occurred_at is set server-side by the repository). */
export interface TelemetryEventInsert {
  name: string;
  domain: EventDomainEnumTs;
  schema_version: number;
  /** Present iff privacy_class = PII (FK player.player_id, SET NULL on anonymize). */
  player_id: string | null;
  /** PII-free, bounded payload (maskPii already applied + size-checked upstream). */
  payload: Record<string, unknown>;
  privacy_class: EventPrivacyClassEnumTs;
  /** Projection of the consent scope at ingestion; null = legitimate-interest event outside the gate. */
  consent_scope: Record<string, unknown> | null;
}

/** R2.2-inverted projection of a recent event for the staff read surface — NEVER the raw payload. */
export interface TelemetryEventProjection {
  event_id: string;
  name: string;
  domain: EventDomainEnumTs;
  privacy_class: EventPrivacyClassEnumTs;
  occurred_at: string;
}

@Injectable()
export class TelemetryEventRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Append-only INSERT (the ONLY mutation this repository performs). `occurred_at` is set to the
   * SERVER clock here (re-horodatage serveur, REUSE ch13 — the client-supplied time is ignored).
   * The current-month partition (telemetry_event_y2026m06) covers server now(); a DEFAULT partition
   * (telemetry_event_default, migration 0012 §7.3) catches anything outside the explicit months, so
   * an INSERT at now() never hits "no partition of relation found". Returns the generated event_id.
   */
  async insert(evt: TelemetryEventInsert): Promise<string> {
    const inserted = await this.db
      .insert(telemetryEventRow)
      .values({
        name: evt.name,
        domain: evt.domain,
        schema_version: evt.schema_version,
        player_id: evt.player_id,
        occurred_at: new Date(), // server-rehorodated — never client time (ch13)
        payload: evt.payload,
        privacy_class: evt.privacy_class,
        consent_scope: evt.consent_scope,
      })
      .returning({ event_id: telemetryEventRow.event_id });
    return inserted[0].event_id;
  }

  /**
   * Recent-events PROJECTION for the staff read surface (R2.2 inverted — name/domain/class/time,
   * NEVER the raw payload, NEVER a per-player PII dump). SELECT only (read-only on app_rw).
   */
  async recent(limit: number): Promise<TelemetryEventProjection[]> {
    const rows = await this.db
      .select({
        event_id: telemetryEventRow.event_id,
        name: telemetryEventRow.name,
        domain: telemetryEventRow.domain,
        privacy_class: telemetryEventRow.privacy_class,
        occurred_at: telemetryEventRow.occurred_at,
      })
      .from(telemetryEventRow)
      .orderBy(desc(telemetryEventRow.occurred_at))
      .limit(limit);
    return rows.map((r) => ({
      event_id: r.event_id,
      name: r.name,
      domain: r.domain,
      privacy_class: r.privacy_class,
      occurred_at: r.occurred_at.toISOString(),
    }));
  }
}
