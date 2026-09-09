// IMPLEMENTS: TD-012 (lot-5 L5-T6l) — FalseReportLedger persisted access layer.
//             Canon: docs/tech/02_fictional_world/law_mis.md §Data model §Entité FalseReportLedger
//             + §NestJS — backend jeu (FalseReportLedger flood detection → backlash).
//             R9.3: reads/writes ONLY via the migrated false_report_ledger + false_report_ledger_summary
//             tables (migration 0036). Does NOT redefine the schema.
//             -- session:2026-06-14 (TD-012 lot-5 L5-T6l) --
//
// `FalseReportLedgerRepository` — thin Drizzle access layer over false_report_ledger +
// false_report_ledger_summary (one row per entry + one per-player summary row). Copies the
// InspectionQueueRepository persisted-system template: EXPLICIT column lists, no fat ORM selects.
//
// The FILE action writes two rows atomically:
//   1. INSERT INTO false_report_ledger (the per-entry row, report_id uuid auto-generated).
//   2. UPSERT false_report_ledger_summary (lazy-seed + increment window counters).
// The flood check reads the summary row (window_false_count / window_genuine_count) to evaluate the
// flood_backlash_threshold ratio — no COUNT(*) scan needed on the hot path (the summary is the cache).
// The 30-day window is approximated via the summary counters; a full recount from false_report_ledger
// can be run on a NIGHTLY cadence (future decay path — not day-1).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { building } from '../../db/schema/city_state'; // TD-481 — le contrôle d'appartenance
import {
  falseReportLedger,
  falseReportLedgerSummary,
  type FalseReportEntryType,
} from '../../db/schema/false_report_ledger';

/** A filed report entry returned to the caller (the report_id is the durable identity). */
export interface LedgerEntryResult {
  report_id: string;
  player_id: string;
  target_building_uuid: string | null;
  entry_type: FalseReportEntryType;
  submitted_at: Date;
}

/** Summary row returned for flood-check decisions. */
export interface LedgerSummary {
  player_id: string;
  backlash_penalty_active: boolean;
  backlash_remaining_count: number;
  window_false_count: number;
  window_genuine_count: number;
}

@Injectable()
export class FalseReportLedgerRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Insert a ledger entry (one row per FILE call) and UPSERT the per-player summary (lazy-seed on first
   * call; increment the appropriate window counter). Returns the new entry's report_id + the updated
   * summary (window counts after the insert, used by the service for the flood check).
   *
   * ATOMICITY: both writes run inside a single DB transaction so a crash between the two is impossible.
   * PARAMETERIZED: no string interpolation — Drizzle bind-param throughout.
   */
  async insertEntryAndGetSummary(
    playerId: string,
    target: { uuid: string } | { legacyProxyId: number },
    entryType: FalseReportEntryType,
  ): Promise<{ entry: LedgerEntryResult; summary: LedgerSummary }> {
    return this.db.transaction(async (tx) => {
      // 1. Insert the per-entry row.
      const [row] = await tx
        .insert(falseReportLedger)
        .values({
          player_id: playerId,
          // TD-481 (mig 0151) — UNE colonne ou l'AUTRE, jamais les deux : un rapport à référent réel
          // laisse l'entier proxy NULL (lui donner une valeur dérivée fabriquerait un identifiant de
          // plus), et un rapport legacy laisse l'uuid NULL (on ne lui invente pas de bâtiment).
          ...('uuid' in target
            ? { target_building_uuid: target.uuid }
            : { target_building_id: target.legacyProxyId }),
          entry_type: entryType,
        })
        .returning({
          report_id: falseReportLedger.report_id,
          player_id: falseReportLedger.player_id,
          target_building_uuid: falseReportLedger.target_building_uuid,
          entry_type: falseReportLedger.entry_type,
          submitted_at: falseReportLedger.submitted_at,
        });

      // 2. UPSERT summary: lazy-seed on first FILE; increment the right counter.
      const isFalse = entryType === 'FALSE_REPORT';
      const [summary] = await tx
        .insert(falseReportLedgerSummary)
        .values({
          player_id: playerId,
          window_false_count:   isFalse ? 1 : 0,
          window_genuine_count: isFalse ? 0 : 1,
        })
        .onConflictDoUpdate({
          target: falseReportLedgerSummary.player_id,
          set: {
            window_false_count:   isFalse
              ? sql`${falseReportLedgerSummary.window_false_count} + 1`
              : falseReportLedgerSummary.window_false_count,
            window_genuine_count: isFalse
              ? falseReportLedgerSummary.window_genuine_count
              : sql`${falseReportLedgerSummary.window_genuine_count} + 1`,
            updated_at: sql`now()`,
          },
        })
        .returning({
          player_id:               falseReportLedgerSummary.player_id,
          backlash_penalty_active: falseReportLedgerSummary.backlash_penalty_active,
          backlash_remaining_count: falseReportLedgerSummary.backlash_remaining_count,
          window_false_count:      falseReportLedgerSummary.window_false_count,
          window_genuine_count:    falseReportLedgerSummary.window_genuine_count,
        });

      return {
        entry: { ...row, entry_type: row.entry_type as FalseReportEntryType },
        summary,
      };
    });
  }

  /**
   * Persist the backlash activation: set backlash_penalty_active = true on the summary row. Called by
   * the service when the flood_backlash_threshold is exceeded. The backlash_remaining_count is
   * initialised to the flood threshold value (N reports suppressed = threshold; future decay clears it).
   */
  async activateBacklash(playerId: string, remainingCount: number): Promise<void> {
    await this.db
      .update(falseReportLedgerSummary)
      .set({
        backlash_penalty_active: true,
        backlash_remaining_count: remainingCount,
        updated_at: sql`now()`,
      })
      .where(eq(falseReportLedgerSummary.player_id, playerId));
  }

  /**
   * TD-517 — RECALCULE les deux compteurs de fenêtre d'UN joueur depuis `false_report_ledger`.
   *
   * ⛔ RECALCUL, PAS DÉCRÉMENT, et c'est la décision qui porte tout le correctif. Un `- 1` suppose
   * qu'on sait combien d'entrées viennent de sortir de la fenêtre ; il faut alors un second état
   * (quand chacune est sortie) que personne ne tient, et deux exécutions dans la même nuit
   * soustraient deux fois. Le recalcul LIT la réponse dans la table qui porte `submitted_at`, et il
   * est **idempotent par construction** : le rejouer rend le même nombre.
   *
   * Renvoie les compteurs APRÈS recalcul, plus ceux d'avant — l'appelant en a besoin pour savoir si
   * la nuit a réellement fait redescendre quelqu'un, et une garde qui ne peut pas voir le DELTA ne
   * peut pas distinguer « le décai marche » de « il n'y avait rien à décaisser ».
   */
  async recomputeWindow(playerId: string, windowDays: number): Promise<{
    avant: { faux: number; vrais: number };
    apres: { faux: number; vrais: number };
  } | null> {
    const [avant] = await this.db
      .select({
        faux:  falseReportLedgerSummary.window_false_count,
        vrais: falseReportLedgerSummary.window_genuine_count,
      })
      .from(falseReportLedgerSummary)
      .where(eq(falseReportLedgerSummary.player_id, playerId))
      .limit(1);
    if (!avant) return null; // le joueur n'a jamais déposé : rien à recalculer, et surtout rien à créer.

    // ⚠️ L'intervalle est interpolé comme un ENTIER de jours, jamais comme une chaîne libre : la
    // valeur vient d'un tunable entier (`resolveInt`), et `make_interval` évite toute concaténation
    // dans du SQL.
    const [apres] = await this.db
      .select({
        faux:  sql<number>`count(*) FILTER (WHERE ${falseReportLedger.entry_type} = 'FALSE_REPORT')::int`,
        vrais: sql<number>`count(*) FILTER (WHERE ${falseReportLedger.entry_type} = 'GENUINE_REPORT')::int`,
      })
      .from(falseReportLedger)
      .where(and(
        eq(falseReportLedger.player_id, playerId),
        sql`${falseReportLedger.submitted_at} > now() - make_interval(days => ${windowDays})`,
      ));
    const nf = apres?.faux ?? 0;
    const ng = apres?.vrais ?? 0;
    if (nf === avant.faux && ng === avant.vrais) {
      return { avant: { faux: avant.faux, vrais: avant.vrais }, apres: { faux: nf, vrais: ng } };
    }
    await this.db
      .update(falseReportLedgerSummary)
      .set({ window_false_count: nf, window_genuine_count: ng, updated_at: sql`now()` })
      .where(eq(falseReportLedgerSummary.player_id, playerId));
    return { avant: { faux: avant.faux, vrais: avant.vrais }, apres: { faux: nf, vrais: ng } };
  }

  /** Read the current summary for a player (null if the player has never filed a report). */
  async getSummary(playerId: string): Promise<LedgerSummary | null> {
    const rows = await this.db
      .select({
        player_id:               falseReportLedgerSummary.player_id,
        backlash_penalty_active: falseReportLedgerSummary.backlash_penalty_active,
        backlash_remaining_count: falseReportLedgerSummary.backlash_remaining_count,
        window_false_count:      falseReportLedgerSummary.window_false_count,
        window_genuine_count:    falseReportLedgerSummary.window_genuine_count,
      })
      .from(falseReportLedgerSummary)
      .where(eq(falseReportLedgerSummary.player_id, playerId))
      .limit(1);
    return rows[0] ?? null;
  }
  /** TD-481 — appartenance du bâtiment (scopée au joueur, jamais une lecture globale). */
  async buildingBelongsToPlayer(playerId: string, buildingUuid: string): Promise<boolean> {
    const rows = await this.db
      .select({ building_id: building.building_id })
      .from(building)
      .where(and(eq(building.building_id, buildingUuid), eq(building.player_id, playerId)))
      .limit(1);
    return rows.length > 0;
  }

}
