// IMPLEMENTS: TD-517 — le décai de la fenêtre du ledger de faux rapports (NIGHTLY/34).
//             Canon: `docs/tech/02_fictional_world/law_mis.md §173` — « ratio false:genuine sur
//             30 jours ». R9.3 : lit et écrit UNIQUEMENT les tables de la migration 0036.
//             -- 2026-09-02, sur mesure de la session a2 (W1.2-a) --
//
// ⛔ LE DÉFAUT QU'IL FERME. `window_false_count` / `window_genuine_count` portent « window » dans
// leur nom, la migration et le canon annoncent 30 jours, et les deux seuls écrivains les
// INCRÉMENTENT (`+ 1`). L'unique `UPDATE` de la table ne les touche pas — sa docstring promettait un
// décai « future » qui n'est jamais venu. Elles étaient donc MONOTONES À VIE.
//
// Ce que ça produit, et c'est pour ça que ce n'est pas cosmétique : le prédicat de flood est
// `window_false_count / max(window_genuine_count, 1) >= flood_backlash_threshold`. Un joueur qui
// dépose honnêtement, rarement, et pendant longtemps voit son numérateur croître sans jamais
// redescendre — il finit par franchir le seuil **par ancienneté seule**, et la sanction est réelle
// (suppression de ses rapports suivants). *Un compteur qui s'appelle « fenêtre » et qui ne
// s'oublie jamais est une bombe à retardement dont le nom promet le contraire.*
//
// ★ POURQUOI UN RECALCUL ET NON UN DÉCRÉMENT. Un `- 1` suppose de savoir combien d'entrées viennent
// de sortir de la fenêtre : il faut alors un second état que personne ne tient, et deux exécutions
// la même nuit soustraient deux fois. Le recalcul LIT la réponse dans `false_report_ledger`, qui
// porte `submitted_at`, et il est IDEMPOTENT PAR CONSTRUCTION. C'est aussi ce qui interdit la remise
// à zéro brute : un compte actif garde ses comptes récents, parce qu'ils sont dans la fenêtre.
//
// ⚠️ CE QUE CE TICK NE FAIT PAS, et c'est délibéré : il ne lève PAS `backlash_penalty_active`. La
// sanction en cours se consomme par `backlash_remaining_count`, un mécanisme distinct ; lever la
// pénalité ici mêlerait deux décisions et ferait de ce correctif une amnistie non demandée. Le sort
// des sanctions déjà infligées est un arbitrage, pas un effet de bord.

import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import { inspectionTunables } from './inspection-tunables';
import { FalseReportLedgerRepository } from './false-report-ledger.repository';

@Injectable()
export class FalseReportWindowDecayService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FalseReportWindowDecayService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: FalseReportLedgerRepository,
  ) {}

  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.FALSE_REPORT_WINDOW_DECAY_TICK,
      cadence: Cadence.NIGHTLY,
      order: 34,
      run: (ctx) => this.runDecayTick(ctx),
    });
  }

  /**
   * Recalcule la fenêtre du joueur de ce tick. Public pour qu'une falsifiable puisse l'appeler sur un
   * `playerId` connu sans passer par l'ordonnanceur — même méthode, zéro divergence entre le chemin
   * de test et le chemin réel.
   */
  async runDecayTick(ctx: CitySimTickContext): Promise<void> {
    if (ctx.playerId === undefined) return;
    await this.decayForPlayer(ctx.playerId);
  }

  async decayForPlayer(playerId: string): Promise<{ change: boolean } > {
    const jours = inspectionTunables.floodBacklashWindowDays;
    const r = await this.repo.recomputeWindow(playerId, jours);
    if (r === null) return { change: false }; // jamais déposé : pas de ligne, rien à faire.
    const change = r.avant.faux !== r.apres.faux || r.avant.vrais !== r.apres.vrais;
    if (change) {
      this.logger.log(
        `FALSE_REPORT_WINDOW_DECAY: player=${playerId} fenêtre=${jours}j ` +
          `faux ${r.avant.faux}->${r.apres.faux} · vrais ${r.avant.vrais}->${r.apres.vrais}`,
      );
    }
    return { change };
  }
}
