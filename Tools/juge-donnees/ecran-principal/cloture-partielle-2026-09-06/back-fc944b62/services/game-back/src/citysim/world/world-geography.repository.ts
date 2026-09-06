// IMPLEMENTS: docs/tech/02_fictional_world/brennar_city.md §API /world/districts (the map contract)
//             + §Data model + schema_world_geography.md §2 (READ-only; geography is immutable seed data)
//             -- session:2026-06-02 (Phase 1 Task 1) --
//
// `WorldGeographyRepository` — the read layer over the GLOBAL static map (districts/blocks/threnny_edges,
// seeded once in migration 0016, NO player_id). R9.3: this READS the schema, never redefines it. It maps
// the DB columns renamed in T0 (index_label → wire `index`, edge_type → wire `type`) to the client contract.

import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import {
  districts,
  thrennyEdges,
  type DistrictProfileEnumTs,
  type BankSideEnumTs,
  type ThrennyEdgeTypeEnumTs,
} from '../../db/schema/world_geography';
import { districtToPrecinct } from '../district-precinct';
import { nomDeDistrict } from './district-names';
import { policeMemoryTunables } from '../police_memory/police-memory-tunables';

/**
 * The client-facing per-district map payload (brennar_city.md §API /world/districts):
 * `{id, profile, index, name_canonical, block_count, bank_side, control_state}`.
 *
 * P5 / R2.2 inverted: `control_state` is a QUALITATIVE bucket, never a raw scalar/count. Day-1 it is the
 * neutral default `UNCONTESTED` (territorial control lands in a later task) — but it is ALWAYS a string
 * drawn from a closed qualitative domain, never a number. The wire field `index` is mapped from the DB
 * column `index_label` (renamed in T0 to avoid a Drizzle reserved-word collision).
 */
export interface DistrictProjection {
  id: number;
  profile: DistrictProfileEnumTs;
  index: string;
  name_canonical: string;
  block_count: number;
  bank_side: BankSideEnumTs;
  control_state: ControlStateBucket;
  /** P4 item 2 — le nom de FICTION, celui que le joueur lit. ADDITIF : `name_canonical` reste
   *  l'identité de travail. Retombe sur `name_canonical` si un district n'est pas encore nommé. */
  name: string;
  /** S12-e — le precinct BPD qui possède ce district. Ajout ADDITIF : aucune clé existante ne bouge.
   *  Servi ici pour qu'aucun client n'ait à recalculer la règle (deux clients qui la recalculent
   *  divergent au premier changement de découpage). Producteur unique : `citysim/district-precinct.ts`. */
  precinct_id: number;
}

/** Closed qualitative domain for territorial control (P5 — never a raw scalar). */
export type ControlStateBucket = 'UNCONTESTED' | 'CONTESTED' | 'PLAYER_HELD' | 'RIVAL_HELD';

/** The client-facing Threnny crossing payload — `type` is mapped from the DB column `edge_type`. */
export interface ThrennyEdgeProjection {
  id: number;
  type: ThrennyEdgeTypeEnumTs;
  north_district_id: number;
  south_district_id: number;
}

@Injectable()
export class WorldGeographyRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * The 18 districts with their static metadata + the qualitative control bucket. SELECT-only (app_rw is
   * SELECT/INSERT on the immutable geography). Day-1 `control_state` is the neutral default; the per-player
   * observed-control projection (P5 `player_view_projection`) is wired when territorial control lands.
   */
  async listDistricts(): Promise<DistrictProjection[]> {
    const rows = await this.db
      .select({
        id: districts.id,
        profile: districts.profile,
        index_label: districts.index_label,
        name_canonical: districts.name_canonical,
        block_count: districts.block_count,
        bank_side: districts.bank_side,
      })
      .from(districts)
      .orderBy(asc(districts.id));
    return rows.map((r) => ({
      id: r.id,
      profile: r.profile,
      index: r.index_label, // wire field `index` ← DB column `index_label` (T0 rename)
      name_canonical: r.name_canonical,
      block_count: r.block_count,
      bank_side: r.bank_side,
      control_state: 'UNCONTESTED' as const, // P5 default qualitative bucket (never a raw scalar)
      // P4 item 2 — jamais de chaîne vide : un district non nommé garde son nom de travail, ce qui
      // s'affiche correctement, plutôt qu'un blanc que le client prendrait pour une donnée manquante.
      name: nomDeDistrict(r.id) ?? r.name_canonical,
      // S12-e — la MÊME règle que `PoliceMemoryService` applique (producteur unique), pas une copie.
      precinct_id: districtToPrecinct(r.id, policeMemoryTunables.precinctCount),
    }));
  }

  /** The Threnny crossings (bridges/ferries) — `type` mapped from the DB column `edge_type`. */
  async listThrennyEdges(): Promise<ThrennyEdgeProjection[]> {
    const rows = await this.db
      .select({
        id: thrennyEdges.id,
        edge_type: thrennyEdges.edge_type,
        north_district_id: thrennyEdges.north_district_id,
        south_district_id: thrennyEdges.south_district_id,
      })
      .from(thrennyEdges)
      .orderBy(asc(thrennyEdges.id));
    return rows.map((r) => ({
      id: r.id,
      type: r.edge_type, // wire field `type` ← DB column `edge_type` (T0 rename)
      north_district_id: r.north_district_id,
      south_district_id: r.south_district_id,
    }));
  }
}
