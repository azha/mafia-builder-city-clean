// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 1 (C1)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §9
//             Pattern: conflict/rival/rival-state.repository.ts (A's repository — mirror)
//             — Diplomacy & Information Warfare C C1 — 2026-06-26 —
//
// `DiplomacyRepository` — the persistence layer for the 7 diplomacy tables.
//
// C1 Methods (minimal CRUD + lazy bootstrap):
//   upsertPairState(playerId, rivalKey)        — INSERT OR UPDATE diplomacy_pair_state to baseline.
//   readPairState(playerId, rivalKey)          — SELECT single diplomacy_pair_state row.
//   upsertCredibility(playerId, rivalKey)      — INSERT OR UPDATE credibility_state to 0 (reset).
//   readCredibility(playerId, rivalKey)        — SELECT single credibility_state row.
//   insertLedgerEntry(playerId, entryType, targetRivalKey, gameMinute) — INSERT public_ledger_entry.
//   readLedgerEntry(entryId)                   — SELECT single public_ledger_entry by PK.
//
// R2.2 / P6: all raw scalar columns are server-only. This repository is consumed by server-side
//   mechanics services only — never by a player-facing projection route directly.
// Anti-fabrication: no Math.random(). No Date.now(). Purely deterministic CRUD.
// DD-CREDIBILITY: credibility lives in credibility_state ONLY (this repo never writes it to
//   any other table). The CredibilityAccumulatorService (C5) owns the increment/decrement.
// Zero-regression: ADDITIVE only — no existing tables touched.

import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import {
  diplomacyPairState,
  credibilityState,
  publicLedgerEntry,
} from '../../../db/schema/conflict_diplomacy';
import type { RivalKey } from '../rival/rival-ai.types';
import type { PublicLedgerEntryType } from './diplomacy.types';

// ─── Row types (the shape returned by reads) ─────────────────────────────────────────────────

export interface DiplomacyPairStateRow {
  player_id: string;
  rival_key: string;
  commitment_ledger: unknown;
  trust_decay: number;
  display_vulnerabilities: unknown;
  leverage_tokens: unknown;
  skepticism_thresholds: unknown;
}

export interface CredibilityStateRow {
  player_id: string;
  rival_key: string;
  credibility: number;
}

export interface PublicLedgerEntryRow {
  entry_id: string;
  player_id: string;
  entry_type: string;
  target_rival_key: string;
  gameMinute: bigint;
}

// ─── Repository ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DiplomacyRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ─── diplomacy_pair_state ───────────────────────────────────────────────────────────────────

  /**
   * UPSERT diplomacy_pair_state to the baseline values (onConflictDoUpdate — RESETS the row).
   * Used by the _test reset route (the sticky-accumulator isolation lesson — must RESET, NOT no-op).
   */
  async upsertPairState(playerId: string, rivalKey: RivalKey): Promise<DiplomacyPairStateRow> {
    const baseline = {
      player_id: playerId,
      rival_key: rivalKey,
      commitment_ledger: [],
      trust_decay: 0,
      display_vulnerabilities: [],
      leverage_tokens: [],
      skepticism_thresholds: {},
    };
    const [row] = await this.db
      .insert(diplomacyPairState)
      .values(baseline)
      .onConflictDoUpdate({
        target: [diplomacyPairState.player_id, diplomacyPairState.rival_key],
        set: {
          commitment_ledger: baseline.commitment_ledger,
          trust_decay: baseline.trust_decay,
          display_vulnerabilities: baseline.display_vulnerabilities,
          leverage_tokens: baseline.leverage_tokens,
          skepticism_thresholds: baseline.skepticism_thresholds,
        },
      })
      .returning();
    return row as DiplomacyPairStateRow;
  }

  /**
   * SELECT a single diplomacy_pair_state row. Returns null if the player has no row for this rival.
   */
  async readPairState(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<DiplomacyPairStateRow | null> {
    const rows = await this.db
      .select()
      .from(diplomacyPairState)
      .where(
        and(
          eq(diplomacyPairState.player_id, playerId),
          eq(diplomacyPairState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      player_id:             r.player_id,
      rival_key:             r.rival_key as string,
      commitment_ledger:     r.commitment_ledger,
      trust_decay:           r.trust_decay,
      display_vulnerabilities: r.display_vulnerabilities,
      leverage_tokens:       r.leverage_tokens,
      skepticism_thresholds: r.skepticism_thresholds,
    };
  }

  // ─── credibility_state ──────────────────────────────────────────────────────────────────────

  /**
   * UPSERT credibility_state to baseline (credibility=0) — the reset primitive.
   * The CredibilityAccumulatorService (C5) uses increment/decrement; this method is
   * the reset-to-baseline (called by the _test reset route — onConflictDoUpdate).
   */
  async upsertCredibility(playerId: string, rivalKey: RivalKey): Promise<CredibilityStateRow> {
    const [row] = await this.db
      .insert(credibilityState)
      .values({ player_id: playerId, rival_key: rivalKey, credibility: 0 })
      .onConflictDoUpdate({
        target: [credibilityState.player_id, credibilityState.rival_key],
        set: { credibility: 0 },
      })
      .returning();
    return row as CredibilityStateRow;
  }

  /**
   * SELECT a single credibility_state row. Returns null if no row exists.
   */
  async readCredibility(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<CredibilityStateRow | null> {
    const rows = await this.db
      .select()
      .from(credibilityState)
      .where(
        and(
          eq(credibilityState.player_id, playerId),
          eq(credibilityState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      player_id:   r.player_id,
      rival_key:   r.rival_key as string,
      credibility: r.credibility,
    };
  }

  // ─── public_ledger_entry ────────────────────────────────────────────────────────────────────

  /**
   * INSERT a public ledger entry (the ONE P5 exception — explicitly visible to rivals).
   * Returns the entry_id of the new row.
   */
  async insertLedgerEntry(
    playerId: string,
    entryType: PublicLedgerEntryType,
    targetRivalKey: RivalKey,
    gameMinute: bigint,
  ): Promise<string> {
    const [row] = await this.db
      .insert(publicLedgerEntry)
      .values({
        player_id:        playerId,
        entry_type:       entryType,
        target_rival_key: targetRivalKey,
        gameMinute,
      })
      .returning({ entry_id: publicLedgerEntry.entry_id });
    return row!.entry_id;
  }

  /**
   * SELECT all public_ledger_entry rows for (player_id, target_rival_key).
   * Used by DiplomacyProjectionService (C10) to build the ONE P5 exception surface
   * (the player's own public ledger entries visible to rivals — diplomacy_mechanics.md:281).
   * Returns an empty array if no entries exist.
   */
  async listLedgerEntries(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<PublicLedgerEntryRow[]> {
    const rows = await this.db
      .select()
      .from(publicLedgerEntry)
      .where(
        and(
          eq(publicLedgerEntry.player_id, playerId),
          eq(publicLedgerEntry.target_rival_key, rivalKey),
        ),
      );
    return rows.map((r) => ({
      entry_id:         r.entry_id,
      player_id:        r.player_id,
      entry_type:       r.entry_type as string,
      target_rival_key: r.target_rival_key as string,
      gameMinute:       r.gameMinute as bigint,
    }));
  }

  /**
   * SELECT a single public_ledger_entry by PK (entry_id). Returns null if not found.
   */
  async readLedgerEntry(entryId: string): Promise<PublicLedgerEntryRow | null> {
    const rows = await this.db
      .select()
      .from(publicLedgerEntry)
      .where(eq(publicLedgerEntry.entry_id, entryId))
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      entry_id:         r.entry_id,
      player_id:        r.player_id,
      entry_type:       r.entry_type as string,
      target_rival_key: r.target_rival_key as string,
      gameMinute:       r.gameMinute as bigint,
    };
  }
}
