// IMPLEMENTS: docs/tech/09_data_model/schema_pipeline_and_laundering.md §NestJS (createSafehouse)
//             + docs/superpowers/specs/2026-08-31-lot-planque-design-v11.md §4/D1 (l'écrivain)
//             -- LOT PLANQUE C1 -- 2026-08-31 --
//
// `LaunderingPersistenceService` — LE MAILLON. Avant ce lot, la table `safehouses` ne portait AUCUN
// écrivain applicatif — ni un appel ORM dédié, ni une instruction SQL brute nommant la table,
// mesuré dans `services/` et `scripts/` — alors qu'elle porte TROIS modificateurs. Un audit qui
// demandait « cette table a-t-elle un écrivain ? » répondait OUI et la table restait vide pour
// toujours. ⇒ **Depuis ce lot, ce service EST l'écrivain de production de cette table, et il est le
// premier.** C'est pourquoi ce lot livre le MAILLON, pas « une route ». Voir le test de fermeture
// (`tests/e2e/onboarding/tutorial_disclosure_schedule_slots.spec.ts`) qui exige qu'il en reste
// l'UNIQUE site d'écriture.
//
// ⚠️ CE SERVICE N'IMPLÉMENTE QU'UNE MÉTHODE SUR DIX du service canonique (`initFor`, `createNode`,
// `createEdge`, `updateNodeMetrics`, `createSafehouse`, `updateSafehouseFill`, `updateRaidDrainPolicy`,
// `upsertTailRiskEstimate`, `recomputeAllTailRisk`, `validateGraph`). Livrer un maillon est la doctrine
// de ce dépôt — mais le DIRE est dû, sinon la coquille passe pour le service complet.
//
// ⛔⛔ SIGNATURE : le canon donne 5 paramètres et AUCUN handle de transaction. Ce lot en ajoute UN —
// `tx`, en PREMIER et OBLIGATOIRE — et le remplissage initial, qui diffère selon le site d'appel.
// Le canon est amendé en conséquence (arbitrage rendu, branche A).
//   ⇒ POURQUOI `tx` EST OBLIGATOIRE ET NON `tx?` : `db/index.ts` est POOL-BACKED. Un repository qui
//     n'a pas le `tx` de l'appelant prend une AUTRE connexion : appelé depuis la transaction du grant,
//     son écriture est invisible à celle-ci, l'UPDATE gardé matche 0 ligne, et RIEN NE LÈVE. Le code
//     « réussit » sans avoir écrit. Un marqueur d'optionalité est un endroit où le compilateur cesse
//     de vous aider — précédent mesuré au socle : un `lieutenantId?` dont l'appelant de production ne
//     passait que 4 arguments sur 5, pont structurellement mort, `tsc` vert.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { safehouse } from '../../db/schema/pipeline_and_laundering';
import { laundringPersistenceTunables, raidDrainPolicyMember } from './laundering-persistence-tunables';

/** Le handle de transaction — même dérivation que `FrictionTx`, le patron maison à `tx` OBLIGATOIRE. */
export type LaunderingPersistenceTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

@Injectable()
export class LaunderingPersistenceService {
  private readonly logger = new Logger(LaunderingPersistenceService.name);

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Crée LA ligne `safehouses` d'un bâtiment, dans la transaction de l'appelant.
   *
   * ⛔ TROIS DISPOSITIFS, ET AUCUN NE SUPPLÉE UN AUTRE :
   *   1. le VERROU sérialise (deux appels concurrents pour le même joueur) ;
   *   2. le `WHERE NOT EXISTS` rend l'opération IDEMPOTENTE (le même bâtiment n'en reçoit qu'une) ;
   *   3. le `count(*) < cap` BORNE (le cap est PAR JOUEUR, d'où la clé de verrou par joueur).
   *
   * ⛔⛔ LE VERROU EST UNE INSTRUCTION PLATE, JAMAIS UN `WITH lock AS (…)`. Mesuré dans ce dépôt :
   * un `pg_advisory_xact_lock` enfermé dans un CTE que rien ne référence est ÉLAGUÉ par Postgres —
   * il n'est JAMAIS pris (reproduit empiriquement : un `pg_sleep(3)` dans ce CTE rend instantanément,
   * et une sonde `pg_locks` concurrente ne voit aucun verrou). 8 sites du dépôt sur 11 portent la
   * forme morte ; elle y est inoffensive parce que chacun a EN PLUS un index UNIQUE en filet.
   * ⇒ **Ce lot n'a pas ce filet** (aucune contrainte unique — le domaine autorise N planques par
   * bâtiment, délibérément) et son cap est un COMPTE DE LIGNES, non exprimable en contrainte. Le
   * verrou est donc LOAD-BEARING ici, sur les deux comptes. Le seul précédent vivant est
   * `NamedSequenceRepository.saveAtomic`, et c'est sa forme qui est copiée.
   *
   * ⚠️ CARDINALITÉ 1 PAR APPEL, et c'est ce qui rend le cap sain : dans un `INSERT … SELECT`
   * MULTI-LIGNES, la sous-requête `count(*)` est NON CORRÉLÉE — évaluée UNE fois, sur le snapshot du
   * début de l'instruction, qui ne contient aucune des lignes que l'instruction insère. Les N lignes
   * passeraient toutes. Un appel par bâtiment ⇒ chaque `count(*)` voit les insertions précédentes.
   *
   * ⚠️ CAP SOFT (le mot du canon) : au plafond, on n'écrit rien et on NE JETTE PAS. ⚠️ Mesuré (revue
   * ⊥ r3/M1) : le SEUL appelant de production aujourd'hui est `OnboardingGrantService.
   * grantWelcomeAssets`, dans SA transaction d'écriture — un site (b′) sur un chemin de LECTURE
   * (`ErlangStashController.districtStash`) est PRÉVU par le design (D1) mais N'EXISTE PAS ENCORE
   * (TD-405). Le SOFT est posé par anticipation de ce site : le jour où il existera, lui faire rendre
   * un 409 au cap changerait le contrat d'une route joueur déjà livrée — ce ne serait pas additif.
   *
   * @param tx         OBLIGATOIRE — la transaction de l'appelant (voir l'en-tête : pool-backed).
   * @param currentFill le remplissage initial, en POURCENT par slot. Aujourd'hui l'UNIQUE appelant
   *                    (le grant) passe une dotation de départ ratifiée, jamais vide — aucun site de
   *                    création paresseuse n'existe encore (TD-405, voir la note ci-dessus).
   * @returns l'id de la ligne créée, ou `null` si rien n'a été écrit (déjà présente, ou cap atteint).
   */
  async createSafehouse(
    tx: LaunderingPersistenceTx,
    playerId: string,
    buildingId: string,
    currentFill: number[],
  ): Promise<string | null> {
    const slotCount = laundringPersistenceTunables.slotCount;
    const slotCapacityCents = laundringPersistenceTunables.slotCapacityCents;
    const drainPolicy = raidDrainPolicyMember(laundringPersistenceTunables.raidDrainOrderDefault);
    const cap = laundringPersistenceTunables.safehousesCapPerPlayer;

    // Instruction 1 — acquisition RÉELLE du verrou. Instruction PLATE de premier niveau (voir l'en-tête
    // de la méthode : la forme CTE est élaguée). Clé PAR JOUEUR, parce que le cap est par joueur :
    // verrouiller sur (joueur, bâtiment) laisserait deux bâtiments d'un même joueur franchir le cap
    // ensemble, chacun lisant `count = cap - 1`.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${playerId}))`);

    // Instruction 2 — le cap ET l'insert, dans leur PROPRE instruction : son snapshot READ COMMITTED
    // est pris APRÈS l'octroi du verrou, donc il voit les insertions committées d'un appelant qui
    // nous précédait, et les insertions précédentes de NOTRE propre transaction.
    const inserted = await tx
      .execute(sql`
        INSERT INTO ${safehouse} (player_id, building_id, slot_count, slot_capacity_cents, current_fill, arrival_rate, raid_drain_policy)
        SELECT ${playerId}::uuid, ${buildingId}::uuid, ${slotCount}, ${slotCapacityCents},
               ${JSON.stringify(currentFill)}::jsonb, 0, ${drainPolicy}::raid_drain_policy
        WHERE NOT EXISTS (
          SELECT 1 FROM ${safehouse}
          WHERE ${safehouse.player_id} = ${playerId}::uuid AND ${safehouse.building_id} = ${buildingId}::uuid
        )
          AND (SELECT count(*) FROM ${safehouse} WHERE ${safehouse.player_id} = ${playerId}::uuid) < ${cap}
        RETURNING safehouse_id
      `);

    const rows = (inserted as unknown as { rows?: { safehouse_id?: string }[] }).rows ?? [];
    const id = rows[0]?.safehouse_id ?? null;
    if (id === null) {
      // Ni une erreur ni un succès muet : un no-op DOCUMENTÉ. Les deux causes sont distinctes et
      // toutes deux légitimes — déjà créée (idempotence) ou cap atteint (soft).
      this.logger.log(
        `createSafehouse no-op: player=${playerId} building=${buildingId} ` +
          `(déjà présente, ou cap ${cap} atteint — cap SOFT, aucune exception)`,
      );
    }
    return id;
  }
}
