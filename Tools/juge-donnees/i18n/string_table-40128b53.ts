// IMPLEMENTS: docs/tech/19_i18n_strategy/string_extraction.md §Convention de clés + §Invariants canoniques F1
//             + docs/tech/19_i18n_strategy/pluralization_and_gender.md §Syntax ICU canonique (plural/select)
//             + docs/tech/18_api_protocol/error_handling.md §Mapping (R-EH-2: back emits keys, never translates)
//             -- session:2026-06-02 (Phase 0 Task 9) --
//
// `string_table` — the canonical key→ICU-template registry of player-facing strings.
//
// F1 / R-EH-2 DISCIPLINE: the back EMITS i18n KEYS, never hardcodes player-facing literals. This
// registry is the source of valid keys + their ICU templates; the CLIENT renders the ICU template
// against runtime `vars` (count/gender/...). The back never runs an ICU formatter (string_extraction.md
// §Périmètre — "Le back game ne traduit jamais (F1)").
//
// SCOPE (skeleton — cross-cutting amorcé): a MINIMAL EN/FR registry with at least one plural and one
// gender example (pluralization_and_gender.md §Exemples canoniques), plus the ch18 error keys so the
// `user_facing_i18n_key`s the protocol layer emits are demonstrably registered (light F1 consistency).
//
// DEFER (string_extraction.md §Liens sortants / §Dynamic content): the CDN bundle build, the full
// locale set, the translation workflow (Crowdin), the complete key catalogue, typed-binding codegen,
// the pre-commit/CI lint jobs, dynamic content interpolation.

import { ERROR_CODES } from '../protocol/error-codes';

/**
 * `LocaleCode` — the GA locales actées (pluralization_and_gender.md §Locales GA actées: en-US + fr-FR).
 * The bundle endpoint accepts the short forms `en`/`fr` (player.locale is varchar(8)). Its
 * application default is FRENCH since 2026-09-04 (TD-539, ruling user 2026-09-02 « fr = langue
 * réelle ») — cette ligne annonçait l'inverse jusqu'à cette date, et l'énoncé n'a été relu que
 * le jour où le registre s'est rempli assez pour que la langue servie devienne visible.
 */
export type LocaleCode = 'en' | 'fr';

/** The canonical (fallback) locale — EN is the source of truth (string_extraction.md §Invariant 2). */
export const CANONICAL_LOCALE: LocaleCode = 'en';

/** Every locale this skeleton bundles. EN is canonical; FR is a translation OF en (Invariant 2). */
export const SUPPORTED_LOCALES: readonly LocaleCode[] = ['en', 'fr'] as const;

/**
 * The canonical EN message registry: `key → ICU-MessageFormat template`. Keys follow the pointed
 * convention `<layer>.<namespace>.<scope>.<identifier>` (string_extraction.md §Convention de clés).
 * Values are ICU templates (NOT rendered here — the client renders, F1).
 *
 * The plural + gender entries are copied VERBATIM from pluralization_and_gender.md §Exemples
 * canoniques / §Imbrication plural × select (the EN-shaped equivalents). EN defines the message
 * STRUCTURE; FR may add branches but never remove them (Invariant 3).
 */
// ⛔ EXPORTÉ POUR ÊTRE VÉRIFIÉ PAR LOCALE, ET C'EST LA RAISON D'ÊTRE DE L'EXPORT.
// `resolveBundle` fait retomber FR sur EN : une garde qui interroge le bundle RÉSOLU trouve
// donc toujours la clé, même quand seule la version anglaise existe — et rend de l'anglais à
// un joueur français en se déclarant verte. Le seul moyen de voir ce trou est d'interroger les
// registres à la SOURCE, chacun séparément. L'export existe pour
// `tests/unit/i18n/bundle_sert_les_cles_du_client_unit.spec.ts` et pour rien d'autre.
export const EN_MESSAGES: Readonly<Record<string, string>> = {
  // --- plural example (pluralization_and_gender.md §Exemples canoniques) ---
  'game.lieutenant.assignment.summary':
    '{count, plural, =0 {No lieutenants assigned} one {{count} lieutenant assigned} other {{count} lieutenants assigned}}',
  // --- gender × plural example (pluralization_and_gender.md §Imbrication plural × select) ---
  'game.lieutenant.recap.actions_taken':
    '{gender, select, ' +
    'feminine {{count, plural, one {She took 1 action this cycle.} other {She took # actions this cycle.}}} ' +
    'masculine {{count, plural, one {He took 1 action this cycle.} other {He took # actions this cycle.}}} ' +
    'other {{count, plural, one {This lieutenant took 1 action this cycle.} other {This lieutenant took # actions this cycle.}}}}',
  // --- a couple of plain structural strings (string_extraction.md §Exemples) ---
  'game.ui_common.confirm_button': 'Confirm',
  'game.ui_common.cancel_button': 'Cancel',
  // --- TD-452 — exception-queue cards, HeatPressureExceptionProducerService (heat-pressure-exception-
  //     producer.service.ts). Each site producer estampille sa propre clé (le même `id` — acknowledge/
  //     escalate — porte des libellés DIFFÉRENTS sur d'autres sites, une clé par id serait fausse). EN
  //     copié BYTE-IDENTIQUE du littéral de production existant, aucune reformulation. ---
  'exception.heat_pressure.card.descriptor': 'The heat is high — your operations are under pressure.',
  'exception.heat_pressure.acknowledge.label': 'Acknowledge the pressure',
  'exception.heat_pressure.acknowledge.consequence': 'You note the heat; no automatic action is taken.',
  'exception.heat_pressure.escalate.label': 'Escalate for review',
  'exception.heat_pressure.escalate.consequence': 'The card is archived for later review.',
  'exception.heat_pressure.lay_low.label': 'Lay low across all operations',
  'exception.heat_pressure.lay_low.consequence': 'You reduce exposure across the board; a one-shot mitigation, no standing rule.',
  // --- TD-452 — exception-queue cards, OnboardingGrantService's pre-seed card (onboarding-grant.
  //     service.ts, PRESEED_CARDS). The card's OWN event_descriptor is ALREADY the i18n key
  //     `onboarding.preseed_exception.card` (design C5 "clé i18n dans event_descriptor") — no EN copy
  //     exists to register for IT (out of TD-452's rayon, see implementation-notes.md); only its two
  //     candidate actions carried raw prose. ---
  'exception.onboarding_preseed.acknowledge.label': 'Acknowledge the lab status',
  'exception.onboarding_preseed.acknowledge.consequence': 'You note it; no automatic action is taken.',
  'exception.onboarding_preseed.escalate.label': 'Escalate for review',
  'exception.onboarding_preseed.escalate.consequence': 'The card is archived for later review.',
  // --- TD-453 (TD-452's own remaining class) — exception-queue cards, CueCascadeExceptionProducer
  //     (core_loops/cue_stack/cue-cascade-exception-producer.service.ts). EN copié BYTE-IDENTIQUE du
  //     littéral de production existant, aucune reformulation. ---
  'exception.cue_cascade.card.descriptor': 'A cue-stack slot could not fire as planned — recommit a matching slot to recover it.',
  'exception.cue_cascade.acknowledge_recover.label': 'Acknowledge the setback',
  'exception.cue_cascade.acknowledge_recover.consequence':
    'You note the slot could not fire as planned. Committing a matching slot again will recover it, at a time penalty.',
  'exception.cue_cascade.escalate.label': 'Escalate for review',
  'exception.cue_cascade.escalate.consequence': 'The card is archived for later review.',
  // --- TD-453 — exception-queue cards, BackpressureExceptionProducer (core_loops/supply_chain/
  //     backpressure-exception-producer.service.ts). EN copié BYTE-IDENTIQUE du littéral de
  //     production existant, aucune reformulation. ---
  'exception.backpressure_critical.card.descriptor': 'One of your supply-chain nodes has hit critical backpressure and needs attention.',
  'exception.backpressure_critical.acknowledge_and_trace.label': 'Acknowledge and trace the blockage',
  'exception.backpressure_critical.acknowledge_and_trace.consequence':
    'You note the critical backpressure; use the trace tool to walk it back to its source.',
  'exception.backpressure_critical.escalate.label': 'Escalate for review',
  'exception.backpressure_critical.escalate.consequence': 'The card is archived for later review.',

  // ═══ item 0.6 — les 188 clés d'écran RÉCLAMÉES PAR LE CLIENT (listes générées depuis le code
  //     par la session client, `Tools/i18n/cles-*-2026-09-02.md`). EN = le littéral EXACT du client,
  //     BYTE-IDENTIQUE, aucune reformulation. Ajout strictement ADDITIF : tant qu'une clé manquait,
  //     l'écran affichait son littéral — ces entrées ne changent donc AUCUN pixel, elles rendent
  //     seulement la traduction POSSIBLE.
  //     ⛔ TROIS FAMILLES SONT VOLONTAIREMENT ABSENTES, et il ne faut pas « compléter » la liste :
  //       · `capability_key` (㊱) s'affiche NUE exprès — c'est le propos de l'écran, pas un manque ;
  //       · la bande INCONNUE (42) reste le mot brut du serveur — une clé la remplacerait par une
  //         paraphrase rassurante et masquerait qu'une valeur a été inventée ;
  //       · `ADD_RULE` / `ONE_TIME` (⑩) ne s'affichent PAS : elles VOYAGENT dans le corps de
  //         `POST /v1/exceptions/:id/resolve`. Les keyer casserait la résolution le jour où le
  //         dictionnaire les porterait — et TD-451 a mesuré que le serveur répondrait 200 en
  //         consommant la carte SANS rien dire. Contrôle exécuté avant insertion : 0 entrée dont la
  //         valeur soit `ADD_RULE`/`ONE_TIME`, 0 clé `capability_key` (motif prouvé capable de les
  //         voir sur un faux témoin).

  // --- `accueil.*` (8 clés) ---
  'accueil.etat.broke': 'Broke',
  'accueil.etat.flush': 'Flush',
  'accueil.etat.high': 'High',
  'accueil.etat.in_progress': 'In progress',
  'accueil.etat.locked': 'Locked',
  'accueil.etat.low': 'Low',
  'accueil.etat.moderate': 'Moderate',
  'accueil.etat.unlocked': 'Unlocked',

  // --- `autonomie.*` (1 clé) --- les 4 jumelles à slug anglais et à glyphe retirées le 2026-09-23 (zéro demandeur)
  'autonomie.etat.consequence_minime': 'minor consequence',

  // --- `blanchiment.*` (3 clés) ---
  'blanchiment.purete.clean': 'Clean',
  'blanchiment.purete.dirty': 'Dirty',
  'blanchiment.purete.mostly_clean': 'Mostly clean',

  // --- `building.*` (49 clés) ---
  'building.cover.none': 'None',
  'building.cover.standard': 'Standard',
  'building.cover.strong': 'Strong',
  'building.cover.weak': 'Weak',
  'building.raid_risk.elevated': 'Elevated',
  'building.raid_risk.high': 'High',
  'building.raid_risk.imminent': 'Imminent',
  'building.raid_risk.low': 'Low',
  'building.row.alerte': 'Alert',
  'building.row.rendez_vous': 'Appointment',
  'building.row.capacite': 'Capacity',
  'building.row.chaine_du_froid': 'Cold chain',
  'building.row.couverture': 'Cover',
  'building.row.culture': 'Crop',
  'building.row.entretien': 'Upkeep',
  'building.row.saisie': 'Seizure',
  'building.row.pousse': 'Growth',
  'building.row.en_depot': 'On deposit',
  'building.row.taille_de_la_banque': 'Vault size',
  'building.row.taille_du_relais': 'Hub size',
  'building.row.soin': 'Care',
  'building.row.taille_du_labo': 'Lab size',
  'building.row.en_service': 'In service',
  'building.row.gain': 'Payout',
  'building.row.purete': 'Purity',
  'building.row.risque_de_descente': 'Raid risk',
  'building.row.equipe': 'Crew',
  'building.row.mise_en_place': 'Setup',
  'building.row.structure': 'Structure',
  'building.row.substance': 'Substance',
  'building.row.temperature': 'Temperature',
  'building.row.vehicules': 'Vehicles',
  'building.row.rendement': 'Yield',
  'building.setup.in_setup': 'In setup',
  'building.setup.not_converted': 'Not converted',
  'building.setup.operational': 'Operational',
  'building.structural.damaged': 'Damaged',
  'building.structural.intact': 'Intact',
  'building.structural.repairing': 'Repairing',
  'building.substance.': '—',
  'building.substance.ash': 'Ash',
  'building.substance.brindle': 'Brindle',
  'building.substance.crick': 'Crick',
  'building.substance.hush': 'Hush',
  'building.temperature.hot': 'Hot',
  'building.temperature.optimal_cold': 'Optimal (cold)',
  'building.temperature.warming': 'Warming',
  'building.yield.earning': 'earning',
  'building.yield.idle': 'nothing coming in',

  // --- `exception_detail.*` (7 clés) ---
  'exception_detail.bloc.back': 'Back',
  'exception_detail.bloc.escalate': 'Escalate',
  'exception_detail.bloc.issue': 'Issue :',
  'exception_detail.bloc.lui_apprendre': 'Teach them',
  'exception_detail.bloc.resolu': 'Resolved ✓',
  'exception_detail.bloc.risque': 'Risky',
  'exception_detail.bloc.suggere': 'Suggested',
  // --- ⑨/⑩ — libellé du résultat, 10 issues, 10 bandes (21 clés, 2026-09-23) --- atelier `11-…` §3.7 et §3.2
  //     (`9a248ea5`). Issues : le domaine est les 10 littéraux que rendent les 10 handlers d'`exceptions/effects/`.
  //     Bandes : clés dérivées de la VALEUR servie (`Libelle.ParValeur`), domaines = `SeverityEnum`, `PriorityBucket`,
  //     `ConfidenceBucket` (`exceptions.projection.service.ts:73-79`).
  'exception_detail.bloc.resultat': 'Outcome:',
  'exception_detail.outcome.resolved': 'HANDLED',
  'exception_detail.outcome.escalated': 'ARCHIVED',
  'exception_detail.outcome.repairing': 'UNDER REPAIR',
  'exception_detail.outcome.repairing_slow': 'SLOW REPAIR',
  'exception_detail.outcome.bribe_succeeded': 'SQUARED AWAY',
  'exception_detail.outcome.bribe_failed': 'IT BACKFIRED',
  'exception_detail.outcome.laid_low': 'LYING LOW',
  'exception_detail.outcome.taught': 'RULE LEARNED',
  'exception_detail.outcome.deferred': 'PUT OFF',
  'exception_detail.outcome.demolished': 'RAZED',
  'exceptions.gravite.severe': 'severe',
  'exceptions.gravite.moderate': 'moderate',
  'exceptions.priorite.critical': 'critical',
  'exceptions.priorite.urgent': 'urgent',
  'exception_detail.confiance.confident': 'they’re sure',
  // non ratifiée — les 5 bandes ci-dessous : mots de l'atelier (§3.2), jamais dessinés ni ratifiés ; veto user ouvert.
  'exceptions.gravite.mild': 'mild',
  'exceptions.priorite.watching': 'to watch',
  'exceptions.priorite.silent': 'no rush',
  'exception_detail.confiance.likely': 'they think so',
  'exception_detail.confiance.tentative': 'they’re unsure',

  // --- `exceptions.*` (19 clés) ---
  'exceptions.bloc.a_relire_a_tete_reposee': 'to go over with a clear head',
  'exceptions.bloc.escalades_archivees': 'Archived escalations',
  'exceptions.bloc.file_indisponible_verifier_la_pile': 'Queue unavailable — check the stack',
  'exceptions.bloc.il_attend_une_consigne': 'waiting for your orders',
  'exceptions.bloc.ouvrir': 'Open',
  'exceptions.bloc.patron': 'Boss',
  'exceptions.bloc.toute_la_ville': 'citywide',
  'exceptions.bloc.au_batiment_touche': 'at the building that was hit',
  'exceptions.categorie.conflit': 'CONFLICT',
  'exceptions.categorie.diplomatie': 'DIPLOMACY',
  'exceptions.categorie.renseignement': 'INTELLIGENCE',
  'exceptions.categorie.reputation': 'REPUTATION',
  'exceptions.locuteur.la_ville': 'The city',
  'exceptions.nombre.cinq': 'Five',
  'exceptions.nombre.deux': 'Two',
  'exceptions.nombre.plusieurs': 'Several',
  'exceptions.nombre.quatre': 'Four',
  'exceptions.nombre.six': 'Six',
  'exceptions.nombre.trois': 'Three',

  // --- `famille.*` (1 clé) --- les 44 jumelles à slug anglais retirées le 2026-09-23 (zéro demandeur, TD-690)
  'famille.archetype.distribution': 'Distribution',

  // --- `forensic.*` (16 clés) ---
  'forensic.bloc.ce_qu_on_sait_vraiment': 'WHAT WE ACTUALLY KNOW',
  'forensic.bloc.ce_qui_se_voit': 'What shows',
  'forensic.bloc.pas_de_reponse': 'No answer',
  'forensic.bloc.risque_d_audit': 'AUDIT RISK',
  'forensic.bloc.train_de_vie': 'LIFESTYLE',
  'forensic.bloc.trois_signaux_trois_bandes': 'THREE SIGNALS, THREE BANDS',
  'forensic.bloc.une_piste_posee_par_habitude_ressemble_a_une_piste_relevee':
    'A trail laid down out of habit looks just like a trail that was tracked',
  'forensic.bloc.visibilite_des_rejets': 'WASTE VISIBILITY',
  'forensic.cran.un_dossier_est_ouvert': 'A file is open',
  'forensic.evenement.ca_saute_aux_yeux': 'It jumps out at you',
  'forensic.evenement.convocation_recue': 'Summons received',
  'forensic.evenement.ils_sont_venus': 'They came',
  'forensic.gravite.ca_se_voit_de_loin': 'It shows from a distance',
  'forensic.gravite.on_vous_regarde': 'You’re being watched',
  'forensic.gravite.rien_ne_depasse': 'Nothing sticks out',
  'forensic.bloc.ce_que_la_ville_ne_dit_pas': 'WHAT THE CITY DOESN’T SAY',

  // --- `horizon.*` (14 clés) ---
  'horizon.bloc.a_portee': 'WITHIN REACH',
  'horizon.bloc.aucune_de_ces_cartes_n_a_encore_de_nom': 'None of these cards has a name yet',
  'horizon.bloc.c_etait_a_portee_ca_s_est_eloigne': 'It was within reach. It’s drifted away.',
  'horizon.bloc.ce_qu_on_sait_vraiment': 'WHAT WE ACTUALLY KNOW',
  'horizon.bloc.deja_prises': 'ALREADY TAKEN',
  'horizon.bloc.l_horizon': 'The horizon',
  'horizon.bloc.ont_recule': 'SLIPPED BACK',
  'horizon.bloc.rien_a_l_horizon': 'Nothing on the horizon',
  'horizon.bloc.ce_qui_manque_encore': 'what’s still missing',
  'horizon.bloc.pourquoi_c_est_vide': 'why it’s empty',
  'horizon.bloc.les_cartes_viennent_du_monde_pas_du_menu': 'Cards come from the world, not from a menu',
  'horizon.bloc.rien_ne_s_ouvre_pour_l_instant': 'Nothing is opening up for now.',
  'horizon.bloc.l_horizon_se_remplit_en_jouant': 'The horizon fills up as you play.',
  'horizon.bloc.indisponible': 'unavailable',

  // --- `reputation.*` (21 clés) ---
  'reputation.bloc.ce_qu_il_a_absorbe_de_vos_regles': 'what they’ve taken in of your rules',
  'reputation.bloc.donner_une_regle': 'GIVE A RULE',
  'reputation.bloc.le_miroir': 'The mirror',
  'reputation.bloc.les_regles_que_vous_avez_donnees': 'THE RULES YOU’VE GIVEN',
  'reputation.bloc.vous_n_avez_encore_donne_aucune_regle_rien_ne_peut_donc_etre_enfreint':
    'you haven’t given any rules yet — so nothing can be broken',
  'reputation.etat.coherence_inconnue': 'Consistency unknown',
  'reputation.etat.il_se_ferme': 'They’re closing off',
  'reputation.etat.il_se_tient_a_carreau': 'They’re keeping their head down',
  'reputation.etat.il_vous_ecoute': 'They’re listening to you',
  'reputation.etat.il_vous_en_veut': 'They hold it against you',
  'reputation.etat.la_comptabilite_tenue': 'books kept straight',
  'reputation.etat.la_discretion_devant_les_civils': 'discretion around civilians',
  'reputation.etat.la_justice_envers_les_siens': 'fairness to their own',
  'reputation.etat.la_ponctualite': 'punctuality',
  'reputation.etat.offre_inconnue': 'Offer unknown',
  'reputation.etat.on_demande_des_gages': 'They ask for pledges',
  'reputation.etat.on_vient_sans_garantie': 'They come with no guarantees',
  'reputation.etat.pas_encore_jugeable': 'Too early to judge',
  'reputation.etat.posture_inconnue': 'Posture unknown',
  'reputation.etat.vous_vous_en_ecartez': 'You’re straying from it',
  'reputation.etat.vous_vous_y_tenez': 'You’re sticking to it',

  // ★ La SEULE clé écrite à la main : la ligne d'ambiance de ⑨ s'assemble depuis un COMPTE.
  //   Keyer ses fragments donnerait des phrases intraduisibles (l'ordre des mots change de
  //   langue à langue) ; keyer la phrase entière est impossible puisqu'elle varie. La forme
  //   juste est un pluriel ICU — le même motif que `game.lieutenant.assignment.summary`.
  'exceptions.file.ambiance': '{count, plural, =0 {Nobody’s waiting — the routine holds} one {One person is waiting for your orders — the queue is calm} other {# are waiting for your orders — the queue is calm}}',

  // ═══ TD-455 — la CLASSE restante de TD-452/453 : 80 clés / 16 fichiers producteurs, `label` et
  //     `projected_consequence` des cartes d'exception. EN = le littéral de production BYTE-IDENTIQUE,
  //     aucune reformulation ; ajout strictement ADDITIF (la prose reste en place, le client la voit
  //     tant qu'il ne résout pas la clé).
  //     ⚠️ UNE CLÉ PAR SITE PRODUCTEUR, jamais par `id` d'action — obstacle (a) de TD-453, mesuré et
  //     non re-dérivé : 4 ids (`acknowledge`, `escalate`, `lay_low`, `wait`) portent des libellés
  //     DIFFÉRENTS selon le producteur ; une clé par id changerait le texte lu par le joueur.
  //     ★ 86 champs stampés pour 80 clés : 3 actions apparaissent DEUX fois dans leur fichier
  //     (`candidate_actions[]` puis `suggested_action`) — vérifié byte-identique aux 6 endroits, donc
  //     partager la clé est correct et non une fusion de textes distincts.

  // --- `exception.ambient_drift.*` (4 clés) ---
  'exception.ambient_drift.acknowledge.label': 'Acknowledge the pattern',
  'exception.ambient_drift.acknowledge.projected_consequence':
    'You note the off-hours pattern; no automatic action is taken.',
  'exception.ambient_drift.escalate.label': 'Escalate for review',
  'exception.ambient_drift.escalate.projected_consequence': 'The card is archived for later review.',

  // --- `exception.compression_residue.*` (4 clés) ---
  'exception.compression_residue.acknowledge.label': 'Acknowledge the unresolved compression residue',
  'exception.compression_residue.acknowledge.projected_consequence':
    'A triage problem persisted through a full Compression Week unresolved — it will keep re-presenting at future boards until you actually address it.',
  'exception.compression_residue.escalate.label': 'Escalate for review',
  'exception.compression_residue.escalate.projected_consequence': 'The card is archived for later review.',

  // --- `exception.degraded_category_pressure.*` (3 clés) ---
  'exception.degraded_category_pressure.acknowledge.label': 'Acknowledge the degraded coverage',
  'exception.degraded_category_pressure.escalate.label': 'Escalate for review',
  'exception.degraded_category_pressure.escalate.projected_consequence': 'The card is archived for later review.',

  // --- `exception.equipment_failure.*` (8 clés) ---
  'exception.equipment_failure.defer.label': 'Defer repair',
  'exception.equipment_failure.defer.projected_consequence':
    'Leave the building offline for now — it will keep demanding attention until you act.',
  'exception.equipment_failure.demolish_replace.label': 'Demolish and replace',
  'exception.equipment_failure.demolish_replace.projected_consequence':
    'Tear the building down; the block becomes available to rebuild from scratch.',
  'exception.equipment_failure.repair_immediate.label': 'Repair immediately',
  'exception.equipment_failure.repair_immediate.projected_consequence':
    'Pay the full cost to restore the building to operational as fast as possible.',
  'exception.equipment_failure.repair_slow.label': 'Repair slowly (cheaper)',
  'exception.equipment_failure.repair_slow.projected_consequence':
    'Pay a reduced cost; the building takes longer to come back online.',

  // --- `exception.execution_plan_deviation.*` (3 clés) ---
  'exception.execution_plan_deviation.acknowledge.label': 'Acknowledge the deviated execution plan',
  'exception.execution_plan_deviation.escalate.label': 'Escalate for review',
  'exception.execution_plan_deviation.escalate.projected_consequence': 'The card is archived for later review.',

  // --- `exception.flag_exhaustion.*` (4 clés) ---
  'exception.flag_exhaustion.acknowledge.label': 'Acknowledge the exhaustion',
  'exception.flag_exhaustion.acknowledge.projected_consequence':
    'You note the lieutenant is out of tokens for this concern; no automatic action is taken.',
  'exception.flag_exhaustion.escalate.label': 'Escalate for review',
  'exception.flag_exhaustion.escalate.projected_consequence': 'The card is archived for later review.',

  // --- `exception.friction_threshold.*` (4 clés) ---
  'exception.friction_threshold.acknowledge.label': 'Acknowledge the friction load',
  'exception.friction_threshold.acknowledge.projected_consequence':
    'You note the organization is carrying more friction than it can absorb; outputs are running at reduced efficiency until you decommission a node or the load eases.',
  'exception.friction_threshold.escalate.label': 'Escalate for review',
  'exception.friction_threshold.escalate.projected_consequence': 'The card is archived for later review.',

  // --- `exception.lieutenant_cook.*` (6 clés) ---
  'exception.lieutenant_cook.keep.label': 'Keep cooking',
  'exception.lieutenant_cook.keep.projected_consequence': 'The lieutenant ignores the heat and keeps operating.',
  'exception.lieutenant_cook.pause.label': 'Pause operations when heat is high',
  'exception.lieutenant_cook.pause.projected_consequence': 'The lieutenant stops cooking while heat stays high.',
  'exception.lieutenant_cook.pause_hard.label': 'Pause only on extreme heat',
  'exception.lieutenant_cook.pause_hard.projected_consequence':
    'The lieutenant keeps cooking through moderate heat, pausing only when heat is extreme.',

  // --- `exception.lieutenant_distribution.*` (6 clés) ---
  'exception.lieutenant_distribution.acknowledge.label': 'Leave it for now',
  'exception.lieutenant_distribution.acknowledge.projected_consequence': 'No rule is added; the float keeps growing.',
  'exception.lieutenant_distribution.collect.label': 'Collect the float automatically',
  'exception.lieutenant_distribution.collect.projected_consequence':
    'The lieutenant sweeps the dealer float onward once it is high.',
  'exception.lieutenant_distribution.collect_high.label': 'Collect only above a high threshold',
  'exception.lieutenant_distribution.collect_high.projected_consequence':
    'The lieutenant lets the float grow and only collects when it is high.',

  // --- `exception.lieutenant_intelligence.*` (4 clés) ---
  'exception.lieutenant_intelligence.observe_anyway.label': 'Gather intel even when rival is silent',
  'exception.lieutenant_intelligence.observe_anyway.projected_consequence':
    'The lieutenant runs surveillance even in silent regime, building belief state.',
  'exception.lieutenant_intelligence.wait.label': 'Wait for rival to become active',
  'exception.lieutenant_intelligence.wait.projected_consequence':
    'The lieutenant idles until the rival enters mounting or crushing regime.',

  // --- `exception.lieutenant_logistics.*` (6 clés) ---
  'exception.lieutenant_logistics.acknowledge.label': 'Leave it for now',
  'exception.lieutenant_logistics.acknowledge.projected_consequence':
    'No rule is added; the product keeps piling up.',
  'exception.lieutenant_logistics.dispatch.label': 'Dispatch product automatically',
  'exception.lieutenant_logistics.dispatch.projected_consequence':
    'The lieutenant routes product onward whenever the source holds stock.',
  'exception.lieutenant_logistics.dispatch_high.label': 'Dispatch only when the stock is high',
  'exception.lieutenant_logistics.dispatch_high.projected_consequence':
    'The lieutenant lets product accumulate and only dispatches when the stock is high.',

  // --- `exception.lieutenant_muscle.*` (4 clés) ---
  'exception.lieutenant_muscle.block_when_silent.label': 'Pause operations while rival is silent',
  'exception.lieutenant_muscle.block_when_silent.projected_consequence':
    'The lieutenant explicitly pauses when the rival is dormant.',
  'exception.lieutenant_muscle.wait.label': 'Wait for pressure to mount',
  'exception.lieutenant_muscle.wait.projected_consequence':
    'The lieutenant idles until the rival enters mounting or crushing regime.',

  // --- `exception.mycelial_stress.*` (4 clés) ---
  'exception.mycelial_stress.acknowledge.label': 'Acknowledge the stress',
  'exception.mycelial_stress.acknowledge.projected_consequence':
    'You note the leg is under persistent strain; no automatic action is taken.',
  'exception.mycelial_stress.escalate.label': 'Escalate for review',
  'exception.mycelial_stress.escalate.projected_consequence': 'The card is archived for later review.',

  // --- `exception.raid.*` (13 clés) ---
  'exception.raid.acknowledge.label': 'Acknowledge',
  'exception.raid.acknowledge.projected_consequence': 'Dismiss this card; take no action.',
  'exception.raid.add_rule.label': 'Handle a raid on their own',
  'exception.raid.add_rule.projected_consequence': 'from now on they handle it — a rule',
  'exception.raid.bribe.label': 'Bribe an official',
  'exception.raid.bribe.projected_consequence':
    'the raid goes away… or the heat rises',
  'exception.raid.card.descriptor': 'They turned the building over last night. I’ve got no orders for this.',
  'exception.raid.escalate.label': 'Escalate',
  'exception.raid.escalate.projected_consequence': 'Archive this card for later review.',
  'exception.raid.lay_low.label': 'Lay low (risky)',
  'exception.raid.lay_low.projected_consequence':
    'Go quiet to shed heat — how much is uncertain; the building stays damaged.',
  'exception.raid.repair.label': 'Repair the building',
  'exception.raid.repair.projected_consequence': 'pay to get it running again, in time',

  // --- `exception.random_world.*` (4 clés) ---
  'exception.random_world.acknowledge.label': 'Acknowledge the coupling',
  'exception.random_world.acknowledge.projected_consequence':
    'You note the causal link; no automatic action is taken.',
  'exception.random_world.escalate.label': 'Escalate for review',
  'exception.random_world.escalate.projected_consequence': 'The card is archived for later review.',

  // --- `exception.route_collapse.*` (4 clés) ---
  'exception.route_collapse.acknowledge.label': 'Acknowledge the collapse',
  'exception.route_collapse.acknowledge.projected_consequence':
    'Route X collapsed. Downstream offline. No automatic action is taken.',
  'exception.route_collapse.escalate.label': 'Escalate for review',
  'exception.route_collapse.escalate.projected_consequence': 'The card is archived for later review.',

  // ═══ P4 item 3 — le nom de fiction d'un bâtiment. Ratifié par l'user le 2026-09-02 (choix 3A).
  //     Forme : `{enseigne} — {district}, îlot {block}`. Les 3 placeholders sont EXACTEMENT les params
  //     que `buildingNameRef` émet (l'instrument de TD-457 asserte cette égalité).
  //     ⚠️ `enseigne` et `district` sont des NOMS PROPRES de fiction : ils voyagent en params et ne se
  //     traduisent pas. Seul « îlot » est du texte, et c'est pourquoi ce gabarit est une clé.
  //     EN ≠ FR depuis le 2026-09-23 (`759af925`) : « îlot » est traduit (« block ») ; enseigne et district restent en params.
  'game.fiction.building.name': '{enseigne} — {district}, block {block}',
  // Le frère DÉSAMBIGUÏSÉ (approuvé le 2026-09-02) — servi UNIQUEMENT quand deux bâtiments du même
  // type, dans le même îlot, tirent la même enseigne. Une clé distincte plutôt qu'un param optionnel :
  // l'instrument de TD-457 asserte que les params émis == les placeholders du gabarit, donc un `rang`
  // émis « au cas où » ferait rougir la garde — et « n° 1 » collé à tous les noms du jeu serait pire.
  'game.fiction.building.name.rang': '{enseigne} — {district}, block {block}, no. {rang}',

  // ═══ P4 item 4 — la copy des 11 TUTORIELS. Ratifiée par l'user le 2026-09-02 (« on prend toutes tes
  //     reco »), choix 6A. **Ferme D10-h** : le canon ch11 écrivait « Lt. Hara: Buyer A unavailable for
  //     Route 3 » — faux dès la première phrase du jeu (l'archétype livré est COOK, et « Route 3 »
  //     n'existe pas). La première carte est réécrite pour ce qui est RÉELLEMENT livré.
  //     ⚠️ LA CLÉ EST L'ID DU TUTORIEL, pas `<id>.body` : le catalogue ne sert que des ids, et le client
  //     n'avait donc rien à afficher (défaut mesuré dans la note ㉕). En faisant de l'id une clé, la
  //     bulle se remplit sans changer une ligne de projection.
  //     ✅ Égalité d'ENSEMBLES vérifiée contre `tutorial-id-catalogue.ts` : 11 ids, 11 textes, aucun
  //     orphelin d'un côté ni de l'autre — un texte sans id ne s'afficherait jamais, un id sans texte
  //     laisserait une bulle vide.
  //     Traduits le 2026-09-23 (TD-690, atelier `17-…`) ; le FR vouvoie le joueur (canon, `pluralization_and_gender.md:209`).

  'tutorial.exception_card.onboarding_preseed':
    'Lt. Hara — tonight’s cook is stuck: out of solvent. Order now (cost) or wait for tomorrow (yield).',
  'tutorial.city_map_heat_intro': 'The map shows the heat block by block. The hotter it is, the closer the police look.',
  'tutorial.daily_review_intro': 'Every morning, the Review lists what strayed from the routine. Decide, or let it be.',
  'tutorial.cue_stack_intro': 'The day’s stack puts your orders in sequence. The first slot goes first.',
  'tutorial.possibility_horizon_intro': 'The horizon shows what your lieutenants can learn next.',
  'tutorial.compression_week': 'Compression week: the organization is under strain. Cut back, or take the hit.',
  'tutorial.graduation': 'A lieutenant has finished their apprenticeship. They decide alone, within the limits you set.',
  'tutorial.graduation_eligibility_intro': 'A lieutenant is ready to move up. Their promotion is prepared here.',
  'tutorial.queue_runs_dry': 'The queue is empty. Nothing is waiting on your decision: the city runs without you.',
  'tutorial.vacancy': 'A post is vacant. With no one in it, the routine stops there.',
  'tutorial.audit_pin_intro': 'An audit is pinned on this building. Its books will be gone over.',

  // ═══ P3 (parcours ⑨) — LA CLÉ QUE 9 535 CARTES ÉMETTENT ET QUE PERSONNE NE SERVAIT.
  //     Trouvée en jouant le parcours d'un compte NEUF : la toute première carte d'exception du jeu
  //     porte `event_descriptor = 'onboarding.preseed_exception.card'` et le même `..._i18n.key`, et
  //     cette clé était **ABSENTE du bundle** — le descripteur s'affichait donc en CLÉ BRUTE, alors
  //     que ses deux actions étaient correctement traduites.
  //     ⛔ POURQUOI AUCUN BALAYAGE NE L'A VUE : TD-452/453/455 cherchaient des LITTÉRAUX de prose à
  //     stamper. Celle-ci était **déjà une clé** — donc « faite » pour un balayage de littéraux, qui
  //     ne demande jamais si la clé est SERVIE. *Une clé qui est déjà une clé a l'air terminée.*
  //     Texte : la copy ratifiée de la première carte (2026-09-02, choix 6A) — c'est le même événement
  //     que `tutorial.exception_card.onboarding_preseed` décrit, vu depuis la carte.
  'onboarding.preseed_exception.card':
    'Lt. Hara — tonight’s cook is stuck: out of solvent. Order now (cost) or wait for tomorrow (yield).',

  // ═══ P4 item 7 (§8, tranché par délégation le 2026-09-02, RÉVISABLE) — les noms de DEALERS et de
  //     ROUTES. Ferme TD-485 : `dealerNameRef`/`routeNameRef` existaient avec ZÉRO consommateur, et
  //     ㉟ n'avait qu'un uuid à afficher.
  //     ⚠️ Un dealer porte un PRÉNOM SEUL, jamais « Lt. » : la FORME du nom le distingue d'un
  //     lieutenant sans qu'aucun libellé ne l'explique. Les deux pools sont disjoints (garde dédiée).
  //     ⚠️ DEUX gabarits pour les routes, pas un param optionnel : l'instrument de TD-457 exige que
  //     les params émis soient exactement les placeholders du gabarit EMPLOYÉ — une route sans
  //     extrémités change donc de clé plutôt que de porter des params vides.
  'game.fiction.dealer.name': '{prenom}',
  'game.fiction.route.named': '{depart} → {arrivee}',
  'game.fiction.route.indexed': 'No. {index}',

  // ═══ TD-553 (maillon 3, chantier "les maillons back des écrans neufs", 2026-09-03) — le nom de
  //     fiction d'un RIVAL. Avant ce maillon, le back ne servait que la clé d'enum brute (`coil`/
  //     `tarcum`/`iron_throat`/`saltline`) : ㉙ recopiait les 4 noms de la maquette en dur côté client.
  //     ⚠️ Contrairement aux bâtiments/dealers/routes ci-dessus, RIEN n'est DÉRIVÉ ici (pas de hash,
  //     pas de donnée par instance) : les 4 rivaux sont un domaine FERMÉ et déjà NOMMÉ par le canon
  //     (`fiction-names.ts`'s own `RIVAL_DISPLAY_NAME` — les 4 noms FR et leurs 2 sources, la maquette
  //     ratifiée et le glossaire GDD). Le gabarit est donc un simple passe-plat comme celui du dealer
  //     (`{prenom}`) — le nom ENTIER est le param, il n'y a pas de branche à choisir.
  //     EN = FR byte-identique : le jeu est en français, l'anglais n'est pas traduit (règle P4).
  'game.fiction.rival.name': '{nom}',

  // ═══ Le trou des NOMS D'AVOCATS (2026-09-06) — le nom de fiction d'une PERSONNE, pas d'un rang.
  //     Mesuré avant d'écrire : `lawyers.name` portait un LIBELLÉ DE RANG anglais, écrit par 3 sites
  //     de production et lu par 1 seul consommateur — un avocat n'avait pas de nom, il portait son
  //     rôle, et `hire` n'ayant aucun plafond par joueur, trois avocats boutique étaient
  //     indiscernables. ⚠️ NE REMPLACE PAS TD-556 ci-dessous, qui nomme le TIER : le nom (une
  //     personne) et le tier (un rôle) sont deux faits distincts et voyagent en deux clés distinctes.
  //     Le nom est PERSISTÉ (patron TD-046 des lieutenants, pas dérivé à la projection comme le
  //     dealer) — le gabarit est donc le même passe-plat que le rival juste au-dessus.
  //     EN = FR byte-identique : un nom propre ne se traduit pas (même famille que
  //     `game.fiction.route.named`, l'établi de ce dépôt pour un libellé-identifiant).
  'game.fiction.lawyer.name': '{nom}',

  // ═══ TD-556 (maillon 2, chantier "les maillons back des écrans neufs", 2026-09-03) — le LIBELLÉ
  //     d'un TIER d'avocat (`lawyerLabelI18n`, `legal-projection.service.ts`'s own `LAWYER_TIER_NAME_
  //     REF`). Avant ce maillon, `POST /v1/me/legal/lawyers` servait `lawyerLabel` comme de la PROSE
  //     anglaise en dur ("Boutique Counsel") — une violation F1/R-EH-2 directe, même famille que
  //     TD-452. Trois clés FIXES (une par membre du pgEnum `lawyer_tier` — closed, params: {}), jamais
  //     un passe-plat : contrairement au rival (un nom PROPRE, choisi hors du code), ces 3 libellés
  //     SONT le texte lui-même, il n'y a rien à interpoler.
  //     2026-09-23 (TD-690) — l'EN reste le texte DÉJÀ servi en production (`lawyer.service.ts:140`,
  //     `legal-case.service.ts:213`) ; le FR n'en est plus la copie : il sert les mots que le client
  //     affiche déjà sur ㉛ (`LoiScreenController`, atelier `17-…`), marqués « non ratifiée » dans la
  //     moitié FR (front.md ㉛ : ratification user ✗). Le choix précédent, la copie anglaise tant
  //     qu'aucune source française n'existait, tenait sur la mesure d'alors : zéro rendu français nulle
  //     part, donc le back aurait inventé de la prose joueur. Le client a écrit ses mots depuis ; le back
  //     sert ce que le joueur lit déjà, il n'invente rien. Épinglé par
  //     `legal_lawyer_label_i18n_td556.parcours.spec.ts` §7 : les deux valeurs, et FR ≠ EN.
  //     Le raisonnement complet est dans l'en-tête de `LAWYER_TIER_NAME_REF`
  //     (`operational/legal/legal-projection.service.ts`).
  'game.legal.lawyer_tier.public_defender': 'Public Defender',
  'game.legal.lawyer_tier.boutique': 'Boutique Counsel',
  'game.legal.lawyer_tier.corruption_pipeline': 'Corruption Pipeline',


  // ═══ P6 item 1 (TD-484) — les mêmes 12 clés côté EN. Le jeu est en français (choix 5A) : la copy
  //     EN est byte-identique à la FR tant que la traduction anglaise n'est pas faite, comme les
  //     onze tutoriels et la carte d'onboarding livrés en P4. Les placeholders sont les mêmes.
  'core_loops.flag_discipline.reason.courier_scheduling':
    'Round to reschedule on route {route_id}.',
  'core_loops.flag_discipline.reason.deviation_detected':
    'Deviation flagged by {generator}.',
  'core_loops.flag_discipline.reason.front_shop_reconciliation':
    'Till to reconcile at {building_id}.',
  'core_loops.flag_discipline.reason.lek_rotation':
    'Rotation to decide for {dealer_id}.',
  'core_loops.flag_discipline.reason.precursor_order':
    '{precursor_type} order to place for {building_id}.',
  'core_loops.flag_discipline.reason.stash_reorder':
    '{substance_type} stock to lighten at {building_id}.',
  'core_loops.flag_discipline.routine.courier_scheduling.descriptor':
    'Rounds — route {route_id}',
  'core_loops.flag_discipline.routine.front_shop_reconciliation.descriptor':
    'Till — {building_id}',
  'core_loops.flag_discipline.routine.lek_rotation.descriptor':
    'Rotation — {dealer_id}',
  'core_loops.flag_discipline.routine.precursor_order.descriptor':
    'Precursors — {precursor_type}, {building_id}',
  'core_loops.flag_discipline.routine.stash_reorder.descriptor':
    'Stock to lighten — {substance_type}, {building_id}',
  'game.progression.tier_label':
    'Tier {tier}',


  // ═══ §F-3 (2026-09-03) — les clés que le CLIENT DEMANDE et que ce registre ne servait pas.
  // ⛔ ADDITIF, jamais un renommage : 179 clés mesurées par `Tools/cles-i18n-du-client.py`, qui
  // les DÉRIVE comme `Libelle.De` les dérive (`domaine.role.Slug(litteral)`) au lieu de les
  // lister à la main. Avant ce bloc : le client en demandait 298, ce registre en servait 119 —
  // 60 %% tombaient sur le repli, et RIEN ne rougissait nulle part, parce que le contrat de
  // `Libelle` est justement de retomber sur le littéral.
  // ⚠️ ELLES SONT DANS LES DEUX REGISTRES, ET C'EST OBLIGATOIRE. `resolveBundle` pose EN comme
  // canonique et fait retomber FR sur EN : une clé ajoutée à EN seulement rendrait de l'ANGLAIS
  // à un joueur en français — le même piège que le repli de `Libelle`, un étage plus haut.
  // Le FR est le littéral du client à l'octet ; l'EN est une traduction écrite pour ce lot.
  'appro.bloc.bon_de_commande': 'PURCHASE ORDER',
  'appro.bloc.il_y_a_une_penurie_en_ville': 'There\'s a shortage in town',
  'appro.bloc.la_chaine_en_remontant': 'THE CHAIN, UPSTREAM',
  'appro.bloc.la_commande_est_payee_et_partie': 'The order is paid and on its way.',
  'appro.bloc.livraison_receptionnee': 'Delivery received.',
  'appro.bloc.rien_a_faire_de_plus_on_ne_l_accelere_pas_elle_arrivera_quand_le_fournisseur_l_aura_decide': 'Nothing more to do. You can\'t speed it up — it arrives when the supplier decides.',
  'appro.bloc.tout_le_monde_en_cherche_en_meme_temps_ca_se_paiera_plus_cher_et_plus_tard': 'Everyone is after it at once. It\'ll cost more, and come later.',
  'appro.bouton.en_commander': 'ORDER SOME',
  'appro.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'appro.titre.la_chaine_d_appro_est_indisponible': 'The supply chain is unavailable',
  'boutique.bloc.jetons': '— tokens',
  'carte.bloc.a_vous': 'Yours',
  'carte.bloc.carte_de_la_ville_districts': 'CITY MAP — Districts',
  'carte.bloc.chaleur_affichee': 'Heat: shown',
  'carte.bloc.chaleur_masquee': 'Heat: hidden',
  'carte.bloc.dispute': 'Contested',
  'carte.bloc.entrer': 'Enter',
  'carte.bloc.libre': 'Free',
  'carte.bloc.rival': 'Rival',
  'carte.bloc.rive_nord': 'North bank',
  'carte.bloc.rive_sud': 'South bank',
  'delegation.bloc.rien_derriere': 'nothing behind it',
  'delegation.bloc.si_vous_reprenez_maintenant': 'If you take it back now',
  'demolition.ecran.ce_qu_on_peut_y_mettre': 'WHAT CAN GO HERE',
  'demolition.ecran.fiche_du_site': 'SITE RECORD',
  'demolition.ecran.il_vous_coute_plus_qu_il_ne_vous_rapporte': 'It costs you more than it brings in.',
  'demolition.ecran.le_garder_c_est_payer_pour_gener_les_autres': 'Keeping it means paying to crowd the others.',
  'distribution.bloc.a_pied_ca_vide_le_stock_du_labo': 'on foot · it drains the lab\'s stock',
  'distribution.bloc.aucun_courrier_pour_l_instant': 'No courier yet.',
  'distribution.bloc.aucune_destination_connue_pour_l_envoi_de_ce_soir': 'No known destination for tonight\'s run.',
  'distribution.bloc.aucune_route_tendue_pour_l_instant': 'No route strung yet.',
  'distribution.bloc.destination_a_determiner': 'destination to be decided',
  'distribution.bloc.il_est_en_chemin_on_ne_le_rappelle_pas_on_saura_a_l_arrivee': 'He\'s on his way. You don\'t call him back — you\'ll know on arrival.',
  'distribution.bloc.la_regulation': 'THE FLOW',
  'distribution.bloc.vos_courriers': 'YOUR COURIERS',
  'distribution.bouton.acheter_un_velo': 'BUY A BICYCLE',
  'distribution.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'distribution.titre.la_distribution_est_indisponible': 'Distribution is unavailable',
  // TD-643 (2026-09-06) — les TROIS archétypes que `FamilleLabels.Archetype` gardait en littéral
  // français en dur, faute de clé servie (« les faire passer par le catalogue ajouterait trois
  // REPLIS », son propre commentaire). Servies ici, le client peut les passer en `Lib()`.
  // ⚠️ SEULE la forme FRANÇAISE est ajoutée, et c'est mesuré : le client dérive `famille.archetype.
  // <slug du LITTÉRAL>` (`Lib("Gros bras")` -> `…gros_bras`), et depuis la suppression de
  // `ArchetypeLabel` (arbre correcteur, ce matin) PLUS AUCUN site ne passe la valeur brute. Ajouter
  // `…muscle`/`…intelligence`/`…facility_manager` servirait des clés que personne ne demande —
  // exactement ce que les 7 slugs anglais ci-dessus sont devenus.
  'famille.archetype.gros_bras': 'Muscle',
  'famille.archetype.renseignement': 'Intelligence',
  'famille.archetype.intendant': 'Facility manager',
  'famille.archetype.blanchiment': 'Laundering',
  'famille.archetype.comptable': 'Bookkeeper',
  'famille.archetype.cuisinier': 'Cook',
  'famille.archetype.inconnu': 'Unknown',
  'famille.archetype.logistique': 'Logistics',
  'famille.archetype.securite': 'Security',
  'famille.band.bas': '[##..] Low',
  'famille.band.epuise': '[....] Depleted',
  'famille.band.inconnu': '[?] Unknown',
  'famille.band.normal': '[###.] Nominal',
  'famille.band.plein': '[####] Full',
  'famille.category.audit_comptable': 'Bookkeeping audit',
  'famille.category.categorie_inconnue': 'Unknown category',
  'famille.category.envoi_de_distribution': 'Distribution dispatch',
  'famille.category.flux_de_blanchiment': 'Laundering flow',
  'famille.category.incident_transversal': 'Cross-category incident',
  'famille.category.operations_de_production': 'Production ops',
  'famille.category.reponse_securite': 'Security response',
  'famille.category.routage_logistique': 'Logistics routing',
  'famille.disruption.s_installe_lentement': 'Long settling',
  'famille.disruption.s_installe_normalement': 'Medium settling',
  'famille.disruption.s_installe_tres_lentement': 'Very long settling',
  'famille.disruption.s_installe_vite': 'Short settling',
  'famille.ecran.actions': 'Actions',
  'famille.ecran.ajouter_une_regle': '+ Add rule',
  'famille.ecran.anciennete': 'Tenure',
  'famille.ecran.archetype': 'Archetype',
  'famille.ecran.attacher': 'Attach',
  'famille.ecran.combinateur': 'Combinator',
  'famille.ecran.confirmer_la_reaffectation': 'Confirm reassignment',
  'famille.ecran.cout_de_reecriture': 'Re-script cost',
  'famille.ecran.declencheurs': 'Triggers',
  'famille.ecran.diagnostics': 'Diagnostics',
  'famille.ecran.etat': 'State',
  'famille.ecran.forcer_une_fois': 'Override one-shot',
  'famille.ecran.gain_de_rendement': 'Yield bonus',
  'famille.ecran.garder_l_anciennete_annuler': 'Keep tenure (cancel)',
  'famille.ecran.mode': 'Mode',
  'famille.ecran.ouvrir': 'Open',
  'famille.ecran.palier_de_vocabulaire_1_conditions_verrouillees_resolvez_des_exceptions_et_enseignez_des_regles_pour_debloquer': 'Vocabulary Tier 1 — conditions locked 🔒 (resolve exceptions + teach rules to unlock)',
  'famille.ecran.rafraichir': 'Refresh',
  'famille.ecran.reaffecter': 'Reassign…',
  'famille.ecran.regles': 'Rules',
  'famille.ecran.relever_le_plafond': 'Raise ceiling',
  'famille.ecran.remettre_le_budget_a_zero': 'Reset budget',
  'famille.ecran.role': 'Role',
  'famille.ecran.stabilisation_apres_transfert': 'Move settling',
  'famille.ecran.valider': 'Validate',
  'famille.efficiencybonus.aucun_gain_de_rendement': 'No yield bonus',
  'famille.efficiencybonus.bon_gain_de_rendement': 'Solid yield bonus',
  'famille.efficiencybonus.gain_de_rendement_maximal': 'Peak yield bonus',
  'famille.efficiencybonus.petit_gain_de_rendement': 'Small yield bonus',
  'famille.grantedrole.chef_de_groupe': 'Cohort overseer',
  'famille.grantedrole.conseil': 'Advisory',
  'famille.grantedrole.executant': 'Executor',
  'famille.grantedrole.responsable_delegue': 'Delegated owner',
  'famille.mode.delegue': 'Delegated',
  'famille.mode.missionne': 'Tasked',
  'famille.opstate.actif': 'Active',
  'famille.opstate.au_repos': 'Idle',
  'famille.opstate.en_pause': 'Paused',
  'famille.opstate.prend_ses_marques': 'Settling in',
  'famille.revisioncost.reecrire_coute_cher': 'Costly to re-script',
  'famille.revisioncost.reecrire_coute_enormement': 'Very costly to re-script',
  'famille.revisioncost.reecrire_coute_peu': 'Cheap to re-script',
  'famille.revisioncost.reecrire_coute_tres_cher': 'Pricey to re-script',
  'famille.rulecount.aucune_regle': 'No rules',
  'famille.rulecount.beaucoup_de_regles': 'Many rules',
  'famille.rulecount.quelques_regles': 'A few rules',
  'filiere.bloc.aucun_nœud_pour_vous': 'NO NODES FOR YOU',
  'filiere.bloc.ce_n_est_ni_elle_est_vide_ni_elle_ne_repond_pas_c_est_pas_encore': 'it\'s neither \\u201cit\'s empty\\u201d nor \\u201cit isn\'t answering\\u201d — it\'s \\u201cnot yet\\u201d.',
  'filiere.bloc.ce_qu_on_sait_pour_l_instant': 'WHAT WE KNOW SO FAR',
  'filiere.bloc.ce_que_la_filiere_ne_dit_pas': 'WHAT THE PIPELINE DOESN\'T SAY',
  'filiere.bloc.ce_qu_on_sait_vraiment': 'WHAT WE ACTUALLY KNOW',
  'filiere.bloc.dire_combien_il_y_a_dans_la_filiere': 'Say how much is in the pipeline',
  'filiere.bloc.ecarts': 'DEVIATIONS',
  'filiere.bloc.en_attente': 'WAITING',
  'filiere.bloc.etapes': 'STAGES',
  'filiere.bloc.la_filiere': 'The pipeline',
  'filiere.bloc.la_filiere_n_a_pas_encore_ete_interrogee': 'The pipeline hasn\'t been queried yet',
  'filiere.bloc.la_filiere_ne_repond_pas': 'THE PIPELINE ISN\'T ANSWERING',
  'filiere.bloc.on_ne_vous_dira_que_si_c_est_propre_ni_combien_ni_depuis_quand_ni_a_quel_prix_c_est_voulu': 'you\'ll only be told whether it\'s clean: not how much, not since when, not at what price. That\'s deliberate.',
  'filiere.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_filiere_est_vide_c_est_on_ne_sait_pas_ou_elle_en_est': 'no answer came back. That\'s not “the pipeline is empty” — it\'s “we don\'t know where it stands”.',
  'filiere.bloc.ce_n_est_pas_une_panne_c_est_un_etat_il_n_y_a_rien_a_montrer_tant_qu_il_n_y_a_rien_de_monte_il_faut_une_planque_pour_que_la_filiere_commence_quelque_part': 'this isn\'t a failure, it\'s a state: there\'s nothing to show while nothing is set up. You need a safehouse for the pipeline to start somewhere.',
  'filiere.bloc.le_premier_maillon_sans_elle_rien_n_entre_dans_la_filiere_et_rien_ne_se_ramasse_chez_les_dealers_non_plus': 'the first link: without it, nothing enters the pipeline — and nothing gets collected from the dealers either.',
  'filiere.bloc.maillon_manquant': 'MISSING LINK',
  'filiere.bloc.obtenir_une_planque': 'Get a safehouse',
  'filiere.bloc.pas_de_reponse': 'No answer',
  'filiere.bloc.propre_au_bout': 'CLEAN AT THE END',
  'filiere.bloc.vous_n_avez_encore_aucun_nœud': 'You don\'t have any node yet',
  'horizon.bloc.ce_palier_est_acquis': 'this tier is earned',
  'horizon.bloc.etat_inconnu': 'unknown state',
  'horizon.bloc.l_echelle_des_paliers': 'THE TIER LADDER',
  'horizon.bloc.on_ne_sait_pas_encore_ce_qui_manque_pour_y_arriver': 'we don\'t know yet what\'s missing to get there',
  'horizon.bloc.palier': 'Tier',
  'horizon.bloc.vous_avez_commence': 'you\'ve started',
  'horizon.bloc.vous_n_avez_encore_rien_engage': 'you haven\'t committed to anything yet',
  'journal.bloc.a_la_une': 'FRONT PAGE',
  'journal.bloc.aucune_de_ces_breves_n_a_de_texte': 'None of these briefs has any text',
  'journal.bloc.ca_commence': 'IT\'S STARTING',
  'journal.bloc.ca_ne_partira_pas': 'IT WON\'T GO AWAY',
  'journal.bloc.ca_retombe': 'IT\'S DYING DOWN',
  'journal.bloc.ca_se_deploie': 'IT\'S SPREADING',
  'journal.bloc.ca_traine': 'IT\'S DRAGGING ON',
  'journal.bloc.ce_qu_on_sait_pour_l_instant': 'WHAT WE KNOW SO FAR',
  'journal.bloc.ce_qu_on_sait_vraiment': 'WHAT WE ACTUALLY KNOW',
  'journal.bloc.ce_qui_se_dit_ce_matin': 'WHAT\'S BEING SAID THIS MORNING',
  'journal.bloc.ces_trois_listes_se_remplissent_avec_ce_que_la_ville_fait_aucune_ne_depend_de_vos_gestes': 'these three lists fill up with what the city does. None of them depends on your moves.',
  'journal.bloc.dans_la_rue': 'ON THE STREET',
  'journal.bloc.en_attente_du_matin': 'WAITING FOR MORNING',
  'journal.bloc.en_cours': 'UNDER WAY',
  'journal.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_ville_est_calme_c_est_on_ne_sait_pas_ce_qu_elle_a_fait_cette_nuit': 'no answer came back. That\'s not “the city is quiet” — it\'s “we don\'t know what it did last night”.',
  'journal.bloc.le_journal': 'The paper',
  'journal.bloc.le_journal_n_a_pas_encore_ete_ouvert': 'The paper hasn\'t been opened yet',
  'journal.bloc.le_journal_n_est_pas_arrive': 'THE PAPER HASN\'T ARRIVED',
  'journal.bloc.le_journal_suit_le_monde_pas_vous': 'The paper follows the world, not you',
  'journal.bloc.les_breves_sont_arrivees_sans_leur_texte_le_journal_de_ce_matin_n_a_que_des_titres_a_trous_voila_ce_qu_on_peut_vous_montrer_aujourd_hui': 'the briefs came in without their text: this morning\'s paper only has headlines with blanks. Here\'s what we can show you today.',
  'journal.bloc.les_trois_listes_n_ont_pas_ete_demandees_ce_n_est_ni_rien_ne_bouge_ni_pas_de_reponse_c_est_pas_encore': 'the three lists were not requested — it\'s neither “nothing is moving” nor “no answer”, it\'s “not yet”.',
  'journal.bloc.pas_de_reponse': 'No answer',
  'journal.bloc.phase_inconnue': 'UNKNOWN PHASE',
  'journal.bloc.pourquoi_c_est_vide': 'WHY IT\'S EMPTY',
  'journal.bloc.rien_ne_bouge': 'NOTHING IS MOVING',
  'loi.bloc.affaires_en_cours': 'OPEN CASES',
  'loi.bloc.aucune_affaire_en_cours': 'No open case.',
  'loi.bloc.la_filiere_fait_classer_une_affaire_sans_proces_mais_elle_se_sert_de_gens_qui_un_jour_peuvent_parler_a_leur_tour': 'The pipeline gets a case dropped without trial — but it uses people who, one day, may talk in their turn.',
  'loi.bloc.qui_peut_vous_defendre': 'WHO CAN DEFEND YOU',
  'loi.bloc.une_affaire_nait_d_une_descente_rien_ici_n_en_cree': 'A case is born of a raid — nothing here creates one.',
  'loi.bloc.vos_avocats': 'YOUR LAWYERS',
  'loi.bloc.vous_n_avez_encore_engage_personne': 'You haven\'t retained anyone yet.',
  'loi.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'loi.sous_titre.vos_avocats_et_ce_qu_ils_peuvent_faire_pour_vous': 'Your lawyers, and what they can do for you.',
  'loi.titre.le_parloir': 'The visiting room',
  'loi.titre.le_parloir_est_indisponible': 'The visiting room is unavailable',
  'pipeline.etat.clean': 'Clean',
  'pipeline.etat.dirty': 'Dirty',
  'pipeline.etat.mostly_clean': 'Mostly clean',
  'profil.bloc.aucun_profil': 'No profile.',
  'profil.bloc.le_profil_n_a_pas_repondu': 'The profile didn\'t answer.',
  'reglages.bloc.aucun_reglage': 'No settings.',
  'reglages.bloc.les_reglages_n_ont_pas_repondu': 'Settings didn\'t answer.',
  'semaine.bloc.un_autre_probleme_vient_d_apparaitre': 'another problem has just appeared',

  // ═══ §F-3 (5), 2026-09-04 — les phrases d'écran de ⑧ passées par une clé à leur tour.
  'famille.ecran.attache': 'Attached ✓',
  'famille.ecran.aucun_budget_d_autonomie_pour_l_instant': 'No autonomy budget yet',
  'famille.ecran.aucun_lieutenant_recrute': 'No lieutenant recruited',
  'famille.ecran.aucun_script_pour_l_instant': '(no script yet)',
  'famille.ecran.aucune_equipe_rattachee': 'No team attached',
  'famille.ecran.aucune_regle_touchez_ajouter_une_regle': '(no rule — tap “+ Add rule”)',
  'famille.ecran.batiment_affecte': 'Assigned building',
  'famille.ecran.batiment_cible_destination_planque': 'Target building (destination / safehouse)',
  'famille.ecran.choisissez_un_batiment_de_destination': 'Choose a destination building.',
  'famille.ecran.connectez_vous_d_abord': 'Sign in first.',
  'famille.ecran.decision_appliquee': 'Decision applied ✓',
  'famille.ecran.echec_de_l_etat': 'Status failed —',
  'famille.ecran.echec_de_la_decision': 'Decision failed.',
  'famille.ecran.echec_de_la_reaffectation': 'Reassignment failed.',
  'famille.ecran.echec_du_chargement_de_la_famille': 'Failed to load the family —',
  'famille.ecran.echec_du_recrutement': 'Recruitment failed.',
  'famille.ecran.editeur_de_regles_ecrire_un_script_de_conduite': 'RULE EDITOR — write a behaviour script',
  'famille.ecran.etat_lieutenant_delegue': 'STATUS — delegated lieutenant',
  'famille.ecran.la_famille': 'THE FAMILY',
  'famille.ecran.le_don': 'THE DON',
  'famille.ecran.nouveau_batiment': 'New building',
  'famille.ecran.nouveau_batiment_cible_destination_planque': 'New target building (destination / safehouse)',
  'famille.ecran.reaffecte_anciennete_remise_a_zero_periode_de_stabilisation': 'Reassigned — tenure reset to zero, settling period.',
  'famille.ecran.reaffecter_deplacer_ce_lieutenant_remet_l_anciennete_a_zero': 'REASSIGN — move this lieutenant (resets tenure to zero)',
  'famille.ecran.recruter_choisir_un_role_et_affecter': 'RECRUIT — pick a role and assign',
  'famille.ecran.recruter_un_nouveau_lieutenant': 'Recruit a new lieutenant',
  'famille.ecran.recrutez_d_abord_un_lieutenant': 'Recruit a lieutenant first.',
  'famille.ecran.recrutez_ou_ouvrez_d_abord_un_lieutenant': 'Recruit or open a lieutenant first.',
  'famille.ecran.script_de_conduite': 'Behaviour script',
  'famille.ecran.script_valide': 'Script valid ✓',
  'famille.ecran.verrouille_se_debloque_avec_la_progression': '🔒 Locked — unlocks with progression',
  // ⑥ — les 3 gestes d'autonomie aux mots de ㉔ (atelier `13-…` §5, 2026-09-23 ; client `bfe15061`). Les 3 anciens restent servis : `ecrans/2026-09-23` et `main` du client les demandent encore.
  'famille.ecran.lui_rendre_sa_marge': 'Give them their margin back',
  'famille.ecran.lui_elargir_sa_marge': 'Widen their margin',
  'famille.ecran.laisser_passer_celle_ci': 'Let this one through',

  // ═══ 2026-09-04 — les 73 clés produites par les conversions des sessions B et C (82 depuis ⑯, 2026-09-23 ;
  //     les 21 phrases et chips de ⑯ suivent sous leur propre sous-en-tête).
  // ⛔ Elles ne viennent pas d'un lot back : elles viennent d'écrans convertis ailleurs.
  // *Le lot back n'est pas « une fois pour toutes » — chaque écran converti en fabrique*, et
  // tant qu'elles manquent, ces écrans affichent le français de leur REPLI : ils ont l'air
  // traduits et ne rougissent nulle part.
  'accueil.carte.aucune_decision_en_attente': 'No pending decision',
  'accueil.carte.limite_de_structure_atteinte': 'Structural cap reached',
  'accueil.carte.pret': 'Ready',
  'accueil.carte.rien_a_signaler': 'Nothing to report',
  'accueil.chrome.la_revue_du_jour': 'Today\'s review',
  'accueil.chrome.les_exceptions': 'Exceptions',
  'accueil.etat.a_flot': 'Afloat',
  'accueil.etat.confortable': 'Comfortable',
  'accueil.etat.correct': 'Fair',
  'accueil.etat.en_cours': 'Under way',
  'accueil.etat.fauche': 'Broke',
  'accueil.etat.inconnu': 'Unknown',
  'accueil.etat.juste': 'Tight',
  'accueil.etat.ouvert': 'Open',
  'accueil.etat.verrouille': 'Locked',
  'accueil.file.aucune_exception_en_attente': 'No pending exception',
  'accueil.vitals.cohesion_indisponible_pour_l_ensemble_de_la_ville': 'Cohesion: unavailable for the city as a whole',
  'autonomie.etat.un_compromis': 'a trade-off',
  'autonomie.etat.on_laisse_passer_quelque_chose': 'we let something slip by',
  'autonomie.etat.on_s_expose': 'we\'re exposed',
  'autonomie.etat.inconnu': '[?] Unknown',
  'blanchiment.purete.a_demi_propre': 'Half clean',
  'blanchiment.purete.presque_propre': 'Mostly clean',
  'blanchiment.purete.propre': 'Clean',
  'blanchiment.purete.proprete_inconnue': 'Cleanliness unknown',
  'blanchiment.purete.sale': 'Dirty',
  'carnet.bloc.aucun_ordre_pose_entre_quatre_et_huit_dans_l_ordre_ou_ils_partiront': 'no order placed — between four and eight, in the order they\'ll go out',
  'carnet.bloc.carnet_du_soir': 'Evening book',
  'carnet.bloc.ce_n_est_ni_aucun_ordre_ni_pas_de_reponse_c_est_pas_encore': 'it\'s neither “no orders” nor “no answer” — it\'s “not yet”.',
  'carnet.bloc.ce_que_cet_ecran_ne_peut_pas_vous_dire': 'WHAT THIS SCREEN CANNOT TELL YOU',
  'carnet.bloc.ce_qu_on_sait_pour_l_instant': 'WHAT WE KNOW SO FAR',
  'carnet.bloc.ce_que_la_ville_prepare': 'What the city is preparing',
  'carnet.bloc.ce_qu_on_sait_vraiment': 'WHAT WE ACTUALLY KNOW',
  'carnet.bloc.ce_qui_s_ouvrira_plus_tard': 'WHAT WILL OPEN LATER',
  'carnet.bloc.entre_quatre_et_huit_gestes_dans_l_ordre_ou_ils_partiront': 'between four and eight moves, in the order they\'ll go out',
  'carnet.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_soiree_est_vide_c_est_on_ne_sait_pas_ce_qui_est_prevu': 'no answer came back. That\'s not “the evening is empty” — it\'s “we don\'t know what\'s planned”.',
  'carnet.bloc.ce_que_la_ville_prepare_personne_ne_vous_le_rapporte_encore_ce_sera_ici_le_jour_ou_quelqu_un_le_fera': 'what the city is preparing, no one reports to you yet. It will show up here the day someone does.',
  'carnet.bloc.le_carnet_n_a_pas_encore_ete_ouvert': 'the book hasn\'t been opened yet',
  'carnet.bloc.le_carnet_ne_repond_pas': 'the book isn\'t answering',
  'carnet.bloc.les_ordres_de_ce_soir': 'Tonight\'s orders',
  'carnet.bloc.ordres_sur_8': ' ORDERS OUT OF 8',
  'carnet.bloc.pas_de_reponse': 'No answer',
  'carnet.bloc.rejouer_une_soiree_verrouille': 'Replay an evening — locked',
  'carnet.bloc.rien': '— nothing —',
  'carnet.bloc.rien_n_a_encore_ete_demande': 'Nothing has been requested yet',
  'carnet.bloc.une_suite_d_ordres_qu_on_met_de_cote_et_qu_on_relance_d_un_geste_cette_facon_de_faire_s_ouvre_plus_tard_il_faut_d_abord_monter_d_un_palier': 'a sequence of orders you set aside and replay in one move. This way of doing things opens up later — you have to move up a tier first.',
  'conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras': 'None of your lieutenants is the Muscle type.',
  'conflit.bloc.c_est_lui_qui_part_la_nuit_il_vous_en_manque_un_ce_n_est_pas_casse_vous_n_en_avez_tout_simplement_pas_encore': 'He\'s the one who goes out at night. You\'re missing one — nothing is broken, you simply don\'t have one yet.',
  'conflit.bloc.dessinees_pas_renseignees_personne_ne_vous_dit_ce_qu_elles_preparent_ni_ce_qu_elles_possedent_on_frappe_a_l_aveugle': 'Drawn, not informed: no one tells you what they\'re preparing or what they own — we strike blind.',
  'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain': 'Tell me who I send and against what. I leave tonight; we\'ll know tomorrow.',
  'conflit.bloc.le_compte_des_envois_precedents_est_indisponible_pour_l_instant': 'The count of previous sorties is unavailable for now.',
  'conflit.bloc.les_quatre_familles': 'THE FOUR FAMILIES',
  'conflit.bloc.qui_part_ce_soir': 'WHO GOES OUT TONIGHT',
  'conflit.bloc.vous_avez_l_homme_personne_pour_lui_dire_ou_frapper_on_ne_sait_pas_encore_ou_ils_sont': 'You have the man. No one to tell him where to strike — we don\'t know where they are yet.',
  'conflit.sous_titre.ce_que_vos_hommes_rapportent_des_familles_rivales_et_qui_vous_reste_pour_y_retourner': 'What your men report of the rival families, and who is left to go back.',
  'conflit.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'conflit.titre.le_conflit': 'The conflict',
  'conflit.titre.le_conflit_est_indisponible': 'Conflict is unavailable',
  'district.type_batiment.atelier_de_presse': 'Press house',
  'district.type_batiment.bureau': 'Office',
  'district.type_batiment.cache': 'Stash',
  'district.type_batiment.banque': 'Vault',
  'district.type_batiment.commerce_ecran': 'Front shop',
  'district.type_batiment.laboratoire': 'Lab',
  'district.type_batiment.laboratoire_specialise': 'Specialised lab',
  'district.type_batiment.planque': 'Safehouse',
  'district.type_batiment.point_de_vente': 'Dealer spot',
  'district.type_batiment.raffinerie': 'Refinery',
  'district.type_batiment.relais': 'Hub',
  'district.type_batiment.serre': 'Grow house',
  'district.type_batiment.terrain_vague': 'Empty lot',
  'revue.bloc.confirmer_la_routine': 'CONFIRM THE ROUTINE ·',
  'revue.bloc.appui_long_rien_d_autre_ne_vous_attend': 'long press — nothing else is waiting for you',
  'revue.bloc.ce_matin_au_verge_d_or': 'This morning, at the Verge d’Or',
  'revue.bloc.d_un_seul_appui_le_registre_est_clos_pour_aujourd_hui': 'one press — the register is closed for today',
  'revue.bloc.routines_signees': ' ROUTINES SIGNED',
  'revue.bloc.vos_lieutenants_ont_tenu_la_ligne_rien_ne_reclame_votre_parole': 'Your lieutenants held the line — nothing needs your word',
  'revue.verdict.il_garde_sa_confiance': 'their trust stays intact',
  'revue.verdict.jusqu_a_la_remise_hebdomadaire': 'until the weekly reset',
  'revue.verdict.perdu': 'LOST',
  'revue.verdict.remise_demain': 'reset tomorrow',
  'revue.verdict.rendu': 'RETURNED',
  // --- ⑯ `revue.phrase.*` et `revue.chip.*` (21 clés, 2026-09-23) — fr = le littéral du client à l'octet
  //     (CLIENT-2 `16d65096`, `Tools/juge-donnees/revue-du-jour/i18n-2026-09-23.md`) ; en = l'atelier :
  //     `08-…` §1 et annexe (`b95dd8c7`), `10-…` §3 (`8a1ea438`), `10-…` §7 (`4620fa78`), vérifiés à l'octet.
  //     `{sujet}` est un placeholder que la valeur garde : le client y insère le nom résolu de `subject_name_i18n`.
  'revue.chip.signale_rarement': 'rarely flags',
  'revue.chip.signale_souvent': 'flags often',
  'revue.phrase.j_ai_fait_tourner_le_coin_de_vente': 'I rotated the sales corner',
  'revue.phrase.j_ai_rapproche_les_comptes_de_la_facade': 'I reconciled the front’s books',
  'revue.phrase.j_ai_replanifie_la_tournee_des_coursiers': 'I rescheduled the couriers’ round',
  'revue.phrase.l_horaire_habituel_n_a_pas_ete_tenu': '— the usual timetable wasn’t kept.',
  'revue.phrase.la_caisse_declaree_s_ecarte_de_l_habitude': '— the declared takings stray from the usual.',
  'revue.phrase.le_lek_tournait_hors_du_rythme_convenu': '— the Lek was running off the agreed rhythm.',
  'revue.phrase.il_passe_plus_d_argent_par_la_caisse_que_la_facade_ne_peut_en_justifier': '— more money is going through the till than the front can explain.',
  'revue.phrase.j_ai_rapproche_les_comptes_de_sujet': 'I reconciled the books at {sujet}',
  'revue.phrase.j_ai_reachemine_la_tournee_sujet': 'I rerouted the {sujet} run',
  'revue.phrase.j_ai_replanifie_la_tournee_sujet': 'I rescheduled the {sujet} run',
  'revue.phrase.l_ancien_trajet_ne_passait_plus_sature_ou_coupe': '— the old route wasn’t getting through: jammed, or cut.',
  'revue.phrase.la_facade_est_epinglee_pour_un_controle': '— the front is pinned for an audit.',
  'revue.phrase.le_trajet_fait_plus_de_detours_que_d_habitude': '— the route takes more detours than usual.',
  // non ratifiée — les 6 phrases ci-dessous (precursor_order, stash_reorder, repli) sont des propositions de
  //     l'atelier (`08-…` §1, `b95dd8c7`) : la ratification du 25/08 ne portait que sur les trois phrases dessinées.
  'revue.phrase.il_etait_plus_charge_ou_plus_regarde_que_d_habitude': '— it was fuller, or more watched, than usual.',
  'revue.phrase.j_ai_allege_le_stock': 'I lightened the stock',
  'revue.phrase.j_ai_passe_la_commande_de_precurseurs': 'I placed the precursor order',
  'revue.phrase.j_ai_suivi_la_routine': 'I kept to the routine',
  'revue.phrase.le_marche_est_plus_tendu_que_d_habitude': '— the market is tighter than usual.',
  'revue.phrase.quelque_chose_s_ecartait_de_l_habitude': '— something strayed from the usual.',

  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 156 clés (press 9 · ambient 1 · news_beat 146) ═══
  // TD-633 (2026-09-06). Ces textes existaient, RATIFIÉS et symétriques EN/FR, depuis le 2026-09-02 —
  // et AUCUN n'était servi : le pont entre le dossier de traduction et cette table n'avait jamais été
  // construit. Le défaut n'était pas « des clés oubliées une par une », c'était un pont absent.
  // ⛔ Ils ne sont PAS recopiés à la main : `i18n_staging_pont.spec.ts` asserte que TOUTE clé ratifiée
  //    du dossier est servie dans les DEUX locales — la garde rougit le jour où quelqu'un ratifie une
  //    clé sans la câbler, c'est-à-dire exactement la situation d'aujourd'hui. Sans elle, ce bloc
  //    referme l'instant et rouvre au prochain ajout.
  // ⚠️ `PROPOSITIONS-non-ratifiees.*.json` (20) est EXCLU — « écrites de ma main, aucune source »
  //    (README du dossier). L'exclusion est dérivée du NOM DE FICHIER, jamais d'une liste recopiée.
  // ⚠️ `error.*` (63) est EXCLU aussi, et ce n'est pas un oubli : ces clés sont GÉNÉRÉES par
  //    `errorKeyTemplates()` depuis `ERROR_CODES` — une forme auto-invalidante qu'une liste statique
  //    remplacerait par du texte qui vieillit. Ce que le générateur produit comme TEXTE est une
  //    question ouverte, mesurée à part.
  'ambient.off_hours_drift.card':
    'Your operations during off-hours show elevated heat in recent weeks',
  'news_beat.cooper_affair.accident.body':
    '{outlet} treats {subject} in {district} as an unfortunate, unintended failure.',
  'news_beat.cooper_affair.accident.brennar_daily_star.body':
    'The incident in {district} would appear to have resulted from a sequence of circumstances currently under study. No intent has been established, nor, it is suggested, should any be inferred. It would seem appropriate for a review to be undertaken in due course; no timetable has been communicated.',
  'news_beat.cooper_affair.accident.brennar_daily_star.headline':
    'A sequence of circumstances in {district}, currently under study',
  'news_beat.cooper_affair.accident.free_weekly.body':
    'Nobody\'s fault, nothing to see, moving on — that\'s the official version, anyway. The block keeps its own count, and the count says: another one, same place as ever. You don\'t say.',
  'news_beat.cooper_affair.accident.free_weekly.headline':
    'An accident. In {district}. Another one',
  'news_beat.cooper_affair.accident.headline':
    'What went wrong: {subject} in {district}',
  'news_beat.cooper_affair.accident.tilbey_weekly.body':
    'People in {district} are still sweeping up and still asking how. At the bakery and at the bus stop the word is the same: bad luck, the kind that always lands on the same doorsteps. "You patch up and you wait for the next one," one shopkeeper says.',
  'news_beat.cooper_affair.accident.tilbey_weekly.headline':
    'Bad luck in {district} — the kind that picks its address',
  'news_beat.cooper_affair.corruption.body':
    '{outlet} frames {subject} in {district} as a matter of who benefited, and how.',
  'news_beat.cooper_affair.corruption.brennar_daily_star.body':
    'Questions relating to the matter in {district} are said to warrant review; it remains to be established to whom the situation may have proven advantageous. A monitoring framework would be under consideration. The relevant offices, when approached, did not respond.',
  'news_beat.cooper_affair.corruption.brennar_daily_star.headline':
    'Questions relating to {district} said to warrant review',
  'news_beat.cooper_affair.corruption.free_weekly.body':
    'Money moved, favors moved with it, and the block gets the bill. Case opened, case closed: nothing found. They looked, they say. Sure they did.',
  'news_beat.cooper_affair.corruption.free_weekly.headline':
    'Clean hands in {district}? Sure',
  'news_beat.cooper_affair.corruption.headline':
    'Questions of influence follow {subject} in {district}',
  'news_beat.cooper_affair.corruption.tilbey_weekly.body':
    'Ask around {district} and it is the same from the baker to the bus stop: money moved, and someone did well by it. "We weren\'t born yesterday," one resident says. People wrote letters asking about it; the letters, so far, have not been answered.',
  'news_beat.cooper_affair.corruption.tilbey_weekly.headline':
    'From the baker to the bus stop, {district} has the same question',
  'news_beat.cooper_affair.neighborhood_failure.body':
    '{outlet} places {subject} inside a longer pattern of neglect in {district}.',
  'news_beat.cooper_affair.neighborhood_failure.brennar_daily_star.body':
    'The incident in {district} would appear attributable to difficulties said to predate it by some years. The maintenance of services in the area has been the subject of previous reviews, the conclusions of which were not made public. A further review would be under consideration.',
  'news_beat.cooper_affair.neighborhood_failure.brennar_daily_star.headline':
    'Conditions in {district} said to predate the incident by some years',
  'news_beat.cooper_affair.neighborhood_failure.free_weekly.body':
    'Same block, same neglect, new headline. They\'ll come take pictures, then it\'s back to normal — and normal around here means nothing works. Same page again next time.',
  'news_beat.cooper_affair.neighborhood_failure.free_weekly.headline':
    '{district}, left to itself. As usual',
  'news_beat.cooper_affair.neighborhood_failure.headline':
    '{district} left to its own devices, again',
  'news_beat.cooper_affair.neighborhood_failure.tilbey_weekly.body':
    'The story in {district} is older than the incident: bus lines cut, letters unanswered, promises that moved on. People here asked, twice, in writing, and kept the copies. This week the bill came due, and it came here.',
  'news_beat.cooper_affair.neighborhood_failure.tilbey_weekly.headline':
    '{district} saw it coming — and said so, in writing',
  'news_beat.cooper_affair.organized_crime.body':
    '{outlet} reads {subject} in {district} as the mark of an organized operation.',
  'news_beat.cooper_affair.organized_crime.brennar_daily_star.body':
    'Certain aspects of the incident in {district} are said to suggest a degree of coordination; any such assessment would remain preliminary. This paper has not independently confirmed the accounts on which it rests, and the relevant offices declined to elaborate.',
  'news_beat.cooper_affair.organized_crime.brennar_daily_star.headline':
    'Indications of coordination in {district} said to be under assessment',
  'news_beat.cooper_affair.organized_crime.free_weekly.body':
    'Somebody set this up and the whole block knows it. The only ones still calling it a mystery are paid to call it a mystery. There\'s an inquiry, they say. Ongoing, they say. Sure.',
  'news_beat.cooper_affair.organized_crime.free_weekly.headline':
    'Planned? In {district}? You don\'t say',
  'news_beat.cooper_affair.organized_crime.headline':
    'A familiar hand behind {subject} in {district}',
  'news_beat.cooper_affair.organized_crime.tilbey_weekly.body':
    'More than one neighbor in {district} says the same thing on the doorstep: too tidy and too quick to be chance. "Work like that gets planned," one shopkeeper says, and lowers his voice to say it. Others keep the door shut — which says its own thing.',
  'news_beat.cooper_affair.organized_crime.tilbey_weekly.headline':
    'Too tidy, too quick: {district} draws its own conclusions',
  'news_beat.digest.ambient_micro.body':
    '{outlet} catches a street-level note: {subject}, {district}.',
  'news_beat.digest.ambient_micro.brennar_daily_star.body':
    'A number of minor occurrences in {district} have been recorded this week. None would appear, at this stage, to warrant further examination. The record is retained.',
  'news_beat.digest.ambient_micro.brennar_daily_star.headline':
    'Minor occurrences in {district} recorded',
  'news_beat.digest.ambient_micro.free_weekly.body':
    'Little things. Corner things. The stuff nobody official counts and everybody local notices. Noted here, then, since somebody has to.',
  'news_beat.digest.ambient_micro.free_weekly.headline':
    'Meanwhile, in {district}',
  'news_beat.digest.ambient_micro.headline':
    'Small stories from {district}',
  'news_beat.digest.ambient_micro.tilbey_weekly.body':
    'The small stuff from {district} this week — the kind of thing that never makes a front page and is all anyone actually talks about over the counter.',
  'news_beat.digest.ambient_micro.tilbey_weekly.headline':
    'Small news from {district}, which is still news',
  'news_beat.digest.live_ops.body':
    '{outlet} reports a citywide development: {subject}.',
  'news_beat.digest.live_ops.brennar_daily_star.body':
    'A notice of general application is in circulation citywide. Its practical effects, insofar as they can be assessed at this stage, would appear to vary; residents are advised to consult the notice itself.',
  'news_beat.digest.live_ops.brennar_daily_star.headline':
    'A notice of general application circulates',
  'news_beat.digest.live_ops.free_weekly.body':
    'Another notice for all of Brennar. Everyone is covered; nobody was asked. It\'s on every wall by now.',
  'news_beat.digest.live_ops.free_weekly.headline':
    'New notice. Whole city. Noted',
  'news_beat.digest.live_ops.headline':
    'A citywide notice circulates',
  'news_beat.digest.live_ops.tilbey_weekly.body':
    'There is a new notice going around town. What it means depends, as ever, on which street you live on. People here are already comparing notes over the counter.',
  'news_beat.digest.live_ops.tilbey_weekly.headline':
    'A citywide notice, and what it means on our streets',
  'news_beat.digest.political.body':
    '{outlet} covers a political development: {subject}.',
  'news_beat.digest.political.brennar_daily_star.body':
    'Proceedings at City Hall are understood to be continuing; a communiqué would be expected in due course. The offices concerned declined to anticipate its contents.',
  'news_beat.digest.political.brennar_daily_star.headline':
    'Deliberations understood to continue at City Hall',
  'news_beat.digest.political.free_weekly.body':
    'Meetings, statements, the usual weather out of City Hall. What it means for the block: wait and see. What the block expects: not much.',
  'news_beat.digest.political.free_weekly.headline':
    'City Hall did a thing',
  'news_beat.digest.political.headline':
    'City Hall\'s business, briefly',
  'news_beat.digest.political.tilbey_weekly.body':
    'Something is moving at City Hall, and people here have learned to read that the way sailors read weather. Whatever lands, it lands on streets like these first.',
  'news_beat.digest.political.tilbey_weekly.headline':
    'City Hall stirs; the neighborhoods take note',
  'news_beat.digest.random_world.body':
    '{outlet} notes an unresolved disturbance tied to {subject} in {district}.',
  'news_beat.digest.random_world.brennar_daily_star.body':
    'A disturbance in {district} remains, it would appear, unresolved. The circumstances are said to be under review by the appropriate services; no timetable has been communicated.',
  'news_beat.digest.random_world.brennar_daily_star.headline':
    'Disturbance in {district} noted',
  'news_beat.digest.random_world.free_weekly.body':
    'The thing in {district}? Still happening. Nobody upstairs has said a word. The block was not expecting one.',
  'news_beat.digest.random_world.free_weekly.headline':
    'Still going, in {district}',
  'news_beat.digest.random_world.headline':
    'Unrest reported in {district}',
  'news_beat.digest.random_world.tilbey_weekly.body':
    'Word over the counter in {district} is that the trouble has not settled. People are keeping an eye out for one another and waiting, again, for someone to say something official.',
  'news_beat.digest.random_world.tilbey_weekly.headline':
    'The trouble in {district} has not settled, neighbors say',
  'news_beat.folded_page.body':
    'Two other outlets reported on {subject} in {district}; {outlet} did not run the story.',
  'news_beat.folded_page.brennar_daily_star.body':
    'Two papers carried the story out of {district} this week. The city\'s broadsheet was not one of them. No explanation was offered — and none, presumably, is on file.',
  'news_beat.folded_page.brennar_daily_star.headline':
    'The folded page: {district} goes unmentioned in the broadsheet',
  'news_beat.folded_page.free_weekly.body':
    'Two outlets ran the story out of {district}. The free paper — the one that prints nearly everything — did not. When that page goes quiet, the quiet is the story.',
  'news_beat.folded_page.free_weekly.headline':
    'The folded page: even the free paper skips {district}',
  'news_beat.folded_page.headline':
    'What {outlet} left uncovered in {district}',
  'news_beat.folded_page.tilbey_weekly.body':
    'The story out of {district} ran in two papers this week — just not in the one closest to home. The neighborhood weekly kept its pages for other things. Doorsteps notice that kind of quiet.',
  'news_beat.folded_page.tilbey_weekly.headline':
    'The folded page: {district}\'s own weekly looks away',
  'news_beat.hindsight.follow_up.body':
    '{outlet} continues its retrospective series on {subject}.',
  'news_beat.hindsight.follow_up.brennar_daily_star.body':
    'Continuing its review, this paper records further particulars of the period preceding the event. As before, their significance would appear clearer in retrospect than it can have been at the time. The examination continues.',
  'news_beat.hindsight.follow_up.brennar_daily_star.headline':
    'Further notes on a matter previously examined',
  'news_beat.hindsight.follow_up.free_weekly.body':
    'The look-back continues. More signs, same shape: seen on the street, missed upstairs. You could set your watch by it — if anything around here ran on time.',
  'news_beat.hindsight.follow_up.free_weekly.headline':
    'More warnings. Still no takers',
  'news_beat.hindsight.follow_up.headline':
    'More on {subject}: the retrospective continues',
  'news_beat.hindsight.follow_up.tilbey_weekly.body':
    'The series continues, and so do the doorstep conversations: another neighbor, another small thing noticed at the time and set aside. Piece by piece it adds up to a picture. We keep collecting.',
  'news_beat.hindsight.follow_up.tilbey_weekly.headline':
    'More of what the neighborhood remembers',
  'news_beat.hindsight.op_ed.body':
    '{outlet} opens a retrospective on {subject}, tracing prior indicators the paper says were there all along.',
  'news_beat.hindsight.op_ed.brennar_daily_star.body':
    'With the matter now concluded, a review of the preceding months suggests a number of indications which, it would appear, were available at the time. Whether they could reasonably have been acted upon is a question this paper does not presume to settle. A fuller accounting would be desirable; whether one will be undertaken remains to be established.',
  'news_beat.hindsight.op_ed.brennar_daily_star.headline':
    'In retrospect: indications said to have preceded the matter',
  'news_beat.hindsight.op_ed.free_weekly.body':
    'Now that it is over, suddenly everyone can read the signs. Funny how that works. The signs were on the corner the whole time — ask anyone who stands there. Nobody upstairs asked then. They will now: in reports, in the past tense, with no names in them.',
  'news_beat.hindsight.op_ed.free_weekly.headline':
    'The warnings were there. So was everybody ignoring them',
  'news_beat.hindsight.op_ed.headline':
    'Looking back: the warning signs before {subject}',
  'news_beat.hindsight.op_ed.tilbey_weekly.body':
    'Looking back, the signs were sitting in plain sight: the small troubles, the odd quiet, the complaints over the counter that never went anywhere. Everyone here remembers noticing something. Nobody remembers being asked. This series is the neighborhood adding it up — late, but on the record.',
  'news_beat.hindsight.op_ed.tilbey_weekly.headline':
    'Everyone noticed something. Nobody was asked',
  'news_beat.slow_page.continuing.body':
    '{outlet} continues its running series on {district}.',
  'news_beat.slow_page.continuing.brennar_daily_star.body':
    'This paper\'s standing examination of conditions in {district} continues. The pattern previously noted would appear to persist; the offices to which it has been referred have yet to respond. The file, in the meantime, grows.',
  'news_beat.slow_page.continuing.brennar_daily_star.headline':
    'Conditions in {district}: the examination continues',
  'news_beat.slow_page.continuing.free_weekly.body':
    'The running page runs on. {district} keeps producing; we keep printing. Somebody official reads this, presumably. See you next week.',
  'news_beat.slow_page.continuing.free_weekly.headline':
    '{district}, still at it',
  'news_beat.slow_page.continuing.headline':
    'The slow page continues: {district}',
  'news_beat.slow_page.continuing.tilbey_weekly.body':
    'Another week in {district}, another entry on the running page: same corners, same complaints, a few new names on the same old list. People stop us in the street now to add to it. We write it all down.',
  'news_beat.slow_page.continuing.tilbey_weekly.headline':
    '{district}, another week on the same page',
  'news_beat.slow_page.opening.body':
    '{outlet} opens a running series on conditions in {district}, with further installments to follow in the weeks ahead.',
  'news_beat.slow_page.opening.brennar_daily_star.body':
    'This paper commences today a standing examination of conditions in {district}, which would appear, on the available indications, to merit sustained attention. Installments will follow at weekly intervals, as the material warrants.',
  'news_beat.slow_page.opening.brennar_daily_star.headline':
    'A standing examination of conditions in {district} commences',
  'news_beat.slow_page.opening.free_weekly.body':
    'New running page on {district}. Why: because it keeps earning one. We will keep it going as long as {district} keeps supplying material, and {district} shows no sign of stopping.',
  'news_beat.slow_page.opening.free_weekly.headline':
    '{district} gets a running page. It earned one',
  'news_beat.slow_page.opening.headline':
    'The slow page: a running story takes shape in {district}',
  'news_beat.slow_page.opening.tilbey_weekly.body':
    'Starting this week, {district} gets a running page of its own: the shops, the doorsteps, the things that keep not getting fixed. Not because one big thing happened — because a lot of small things keep happening to the same people. Same page, every week.',
  'news_beat.slow_page.opening.tilbey_weekly.headline':
    '{district}, week one: we are going to keep looking',
  'news_beat.sourceless_beat.body':
    '{outlet} describes a pattern taking shape in {district} — no single incident is cited.',
  'news_beat.sourceless_beat.brennar_daily_star.body':
    'Taken together, recent impressions from {district} would appear to describe a pattern, though no single occurrence need be cited to establish it. Observers of the area are said to share this assessment. Further examination would seem warranted.',
  'news_beat.sourceless_beat.brennar_daily_star.headline':
    'A pattern would appear to be emerging in {district}',
  'news_beat.sourceless_beat.free_weekly.body':
    'No incident to point at, no name, no address. Just a mood on the block — and the block is never wrong. Or so we\'re told. Take it for what it\'s worth; that\'s what we did.',
  'news_beat.sourceless_beat.free_weekly.headline':
    'Something\'s up in {district}. Ask anyone',
  'news_beat.sourceless_beat.headline':
    'A pattern, {outlet} says, in {district}',
  'news_beat.sourceless_beat.tilbey_weekly.body':
    'Nobody can point to one thing, but ask around {district} — over the counter, at the bus stop — and the feeling is the same: something has shifted. Nothing you could report, exactly. Everything you can sense.',
  'news_beat.sourceless_beat.tilbey_weekly.headline':
    'Something is off in {district}, and people feel it',
  'news_beat.three_outlet_storm.episodic.body':
    '{outlet} centers its coverage of {subject} on the people directly affected in {district}.',
  'news_beat.three_outlet_storm.episodic.brennar_daily_star.body':
    'A reconstruction of the incident in {district}, insofar as the available accounts permit one, would describe a discrete occurrence; any wider significance would be premature to assess. The relevant offices have been approached for comment.',
  'news_beat.three_outlet_storm.episodic.brennar_daily_star.headline':
    'An account of the incident in {district}',
  'news_beat.three_outlet_storm.episodic.free_weekly.body':
    'One family, one mess, one incident — that\'s the whole story, they say. No pattern, no context, no questions upstairs. The block will file it with all the other one-offs.',
  'news_beat.three_outlet_storm.episodic.free_weekly.headline':
    'One more for {district}',
  'news_beat.three_outlet_storm.episodic.headline':
    'One family, one story: {subject} in {district}',
  'news_beat.three_outlet_storm.episodic.tilbey_weekly.body':
    'Behind one door in {district}, a family is putting a week back together. The neighbors brought bread and took the children for an afternoon. "You manage," the mother says — the way people say it when they have had to before.',
  'news_beat.three_outlet_storm.episodic.tilbey_weekly.headline':
    'One door in {district}: what the incident left behind',
  'news_beat.three_outlet_storm.human_interest.body':
    '{outlet} follows the people closest to {subject} in {district}.',
  'news_beat.three_outlet_storm.human_interest.brennar_daily_star.body':
    'For residents of {district}, the aftermath has entailed a series of practical adjustments, described to this paper as considerable. Support measures are understood to be under consideration by the appropriate services.',
  'news_beat.three_outlet_storm.human_interest.brennar_daily_star.headline':
    'Residents of {district} adjust to altered circumstances',
  'news_beat.three_outlet_storm.human_interest.free_weekly.body':
    'No committee, no plan, no statement. Just neighbors doing what neighbors do while everyone official stays busy being unavailable. Somebody ought to write that down. Nobody official will.',
  'news_beat.three_outlet_storm.human_interest.free_weekly.headline':
    'People in {district} manage. They always do',
  'news_beat.three_outlet_storm.human_interest.headline':
    'A neighborhood story: {subject}',
  'news_beat.three_outlet_storm.human_interest.tilbey_weekly.body':
    'In {district} this week, doors stayed open a little longer than usual. The baker set aside the unsold loaves, a retired neighbor walks the children to school, and nobody calls any of it help. "You just do it," she says. That is the whole quote, and it is enough.',
  'news_beat.three_outlet_storm.human_interest.tilbey_weekly.headline':
    'The kettle stays on in {district}',
  'news_beat.three_outlet_storm.scandal.body':
    '{outlet} frames {subject} as a question of who is responsible.',
  'news_beat.three_outlet_storm.scandal.brennar_daily_star.body':
    'The incident in {district} has given rise to questions of accountability which, it would appear, remain open. Which office bears responsibility could not be established by the time of going to press. Requests for clarification are said to be receiving attention.',
  'news_beat.three_outlet_storm.scandal.brennar_daily_star.headline':
    'Questions of accountability said to remain open in {district}',
  'news_beat.three_outlet_storm.scandal.free_weekly.body':
    'Somebody is responsible. Somebody always is, and it is never anybody. Ask upstairs and it\'s the process; ask about the process and it\'s upstairs. Round and round. The block is left holding the bag either way.',
  'news_beat.three_outlet_storm.scandal.free_weekly.headline':
    'Who signed? {district} asked. Nobody, apparently',
  'news_beat.three_outlet_storm.scandal.headline':
    'Who is accountable: {subject}',
  'news_beat.three_outlet_storm.scandal.tilbey_weekly.body':
    'Somebody approved it, somebody signed it, and nobody in {district} can get either name. The shopkeepers have started keeping a list of everyone they have asked. The list is getting long, and it is all questions.',
  'news_beat.three_outlet_storm.scandal.tilbey_weekly.headline':
    'Somebody signed off on this — {district} would like a word',
  'news_beat.three_outlet_storm.thematic.body':
    '{outlet} places {subject} in a broader citywide context, not an isolated incident.',
  'news_beat.three_outlet_storm.thematic.brennar_daily_star.body':
    'Placed against comparable occurrences elsewhere in Brennar, the incident in {district} would appear consistent with a broader pattern, the parameters of which remain to be defined. A citywide assessment would seem warranted; none has been announced.',
  'news_beat.three_outlet_storm.thematic.brennar_daily_star.headline':
    'Incident in {district} said to be consistent with wider trends',
  'news_beat.three_outlet_storm.thematic.free_weekly.body':
    'Same story all over town, different address each week. Call it a pattern and someone official will call you dramatic. Fine. The block calls it Tuesday.',
  'news_beat.three_outlet_storm.thematic.free_weekly.headline':
    '{district} today. Somewhere else tomorrow',
  'news_beat.three_outlet_storm.thematic.headline':
    'A citywide pattern behind {subject}',
  'news_beat.three_outlet_storm.thematic.tilbey_weekly.body':
    'What happened in {district} has happened, in its own way, a few bus stops down the line. Same complaints over the counter, same letters, same waiting. People compare notes at the market now, and the notes agree.',
  'news_beat.three_outlet_storm.thematic.tilbey_weekly.headline':
    '{district} is not the only one — ask one neighborhood over',
  'news_beat.wire_day.body':
    'The same wire report reaches {outlet} this morning, unchanged from the other outlets: {subject}.',
  'news_beat.wire_day.headline':
    '{outlet} runs the wire report: {subject}',
  'press.journalist.dunmore.name':
    'Hettie Dunmore',
  'press.journalist.marens.name':
    'Juna Marens',
  'press.journalist.okonkwo.name':
    'Ifeoma Okonkwo',
  'press.journalist.praile.name':
    'Denis Praile',
  'press.journalist.tellan.name':
    'Emeric Tellan',
  'press.journalist.vasse.name':
    'Solene Vasse',
  'press.outlet.brennar_daily_star.name':
    'Brennar Daily Star',
  'press.outlet.free_weekly.name':
    'The Free Weekly',
  'press.outlet.tilbey_weekly.name':
    'The Tilbey Weekly',

  // ═══ AXE 4 — 52 clés CONSTRUITES à l'exécution (TD-633, 2026-09-06) ═══
  // Elles n'ont AUCUN littéral dans `src` : le back les fabrique par gabarit depuis une valeur de
  // colonne. Aucun balayage de littéraux ne peut donc les voir — c'est la même cécité que celle qui
  // faisait rendre « 0 non servie » à l'instrument.
  // ⛔ VÉRIFIÉ AVANT DE SERVIR, famille par famille, contre le DOMAINE réel du back — parce que
  //    servir une clé jamais construite est la faute symétrique, et elle ne se voit nulle part :
  //      ambient.micro_event.*    6/6   == pgEnum `ambient_micro_event_kind`
  //      random_world.template.*  14/14 == `RANDOM_WORLD_TEMPLATE_REGISTRY`
  //      political.event.*        12/12 == E-POL-01..12
  //      news_beat.frame_tag.*    8/8   == les 8 valeurs de `beat.frame` (docstring de la projection)
  //      random_world.coupling.*  2     forme `…coupling.pair.<pair_key>` — le segment `.pair.` EST
  //                                     dans la clé construite, une clé sans lui n'aurait rien servi
  //      live_ops.event.*         10/11 ⚠️ voir ci-dessous
  // ⚠️ `live_ops.event.E-LO-11` EXISTE côté back et n'a AUCUN TEXTE RATIFIÉ : le dossier de staging
  //    a été écrit le 2026-09-02 et l'événement lui est postérieur, ou il a été manqué. On ne
  //    l'invente pas ici — il part sur la liste de rédaction, et `i18n_staging_pont.spec.ts` épingle
  //    le trou à EXACTEMENT 1 pour qu'il rougisse le jour où quelqu'un l'écrit ou ajoute un E-LO-12.
  'ambient.micro_event.bar_rumor':
    'a rumor in a bar',
  'ambient.micro_event.building_inspection':
    'a building inspection',
  'ambient.micro_event.corner_fight':
    'a corner fight',
  'ambient.micro_event.delayed_shipment':
    'a delayed shipment',
  'ambient.micro_event.noisy_block':
    'a noisy block',
  'ambient.micro_event.stalled_tram':
    'a stalled tram',
  'live_ops.event.E-LO-01':
    'Citywide crackdown',
  'live_ops.event.E-LO-02':
    'Tidewater dock strike',
  'live_ops.event.E-LO-03':
    'Coil aggressive expansion campaign',
  'live_ops.event.E-LO-04':
    'Substance market anomaly',
  'live_ops.event.E-LO-05':
    'Glass district investor day',
  'live_ops.event.E-LO-06':
    'Rival counter-operation',
  'live_ops.event.E-LO-07':
    'Cohesion thaw alert',
  'live_ops.event.E-LO-08':
    'Saltline labor surplus',
  'live_ops.event.E-LO-09':
    'Compression Week prep',
  'live_ops.event.E-LO-10':
    'Annual structural audit window',
  'news_beat.frame_tag.accident':
    'Accident angle',
  'news_beat.frame_tag.corruption':
    'Corruption angle',
  'news_beat.frame_tag.episodic':
    'Episodic angle',
  'news_beat.frame_tag.human_interest':
    'Human-interest angle',
  'news_beat.frame_tag.neighborhood_failure':
    'Neighborhood-failure angle',
  'news_beat.frame_tag.organized_crime':
    'Organized-crime angle',
  'news_beat.frame_tag.scandal':
    'Scandal angle',
  'news_beat.frame_tag.thematic':
    'Thematic angle',
  'political.event.E-POL-01':
    'Electoral campaign season',
  'political.event.E-POL-02':
    'Budget cycle: enforcement increase',
  'political.event.E-POL-03':
    'Budget cycle: enforcement cut',
  'political.event.E-POL-04':
    'Substance scheduling change',
  'political.event.E-POL-05':
    'Lobbying campaign by rival',
  'political.event.E-POL-06':
    'Anti-corruption initiative',
  'political.event.E-POL-07':
    'Industrial zoning relaxation',
  'political.event.E-POL-08':
    'Riverfront crackdown',
  'political.event.E-POL-09':
    'City Hall scandal',
  'political.event.E-POL-10':
    'Mayor opposition victory',
  'political.event.E-POL-11':
    'Federal task force',
  'political.event.E-POL-12':
    'Sympathetic district representative',
  'random_world.coupling.pair.erlang_stash__deal_lek':
    'what your stash holds and what the street will contest',
  'random_world.coupling.pair.offhours_hum__bpd_attention':
    'working after hours and where the police look next',
  'random_world.template.absconding':
    'The Absconding',
  'random_world.template.apparent_recovery':
    'Apparent Recovery',
  'random_world.template.cry_wolf_fatigue':
    'Cry-Wolf Fatigue',
  'random_world.template.dialect_drift':
    'The Dialect Drift',
  'random_world.template.festival_misread':
    'The Festival Misread',
  'random_world.template.halgren_tannery_hailstorm':
    'The Halgren Tannery Hailstorm',
  'random_world.template.hollow_at_the_corner':
    'Hollow at the Corner',
  'random_world.template.permanent_residue':
    'The Permanent Residue',
  'random_world.template.quorum_on_stadler_row':
    'Quorum on Stadler Row',
  'random_world.template.risk_compensation':
    'Risk Compensation',
  'random_world.template.sideways_failure':
    'The Sideways Failure',
  'random_world.template.standing_ground':
    'The Standing Ground',
  'random_world.template.triage_night':
    'Triage Night',
  'random_world.template.trough_cycle':
    'The Trough',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 2ᵉ passe, 2026-09-22 : 40 clés (decision_type 24 · hl_option 16) ═══
  // TD-633, même mécanisme que le bloc du 2026-09-06. Ces 40 phrases ont été ÉCRITES et ratifiées le
  // 2026-09-07 (`README-decision-type-hl-option.md` : ère 1B, paires d'options symétriques, asymétrie
  // FR/EN 0) et `i18n_staging_pont.spec.ts` les comptait « ratifiées non servies » : 40, hors axe 4.
  // ⛔ Recopiées depuis `decision_type.*.json` et `hl_option.*.json` par script, jamais réécrites ici —
  //    le texte joueur se ratifie dans le dossier, il ne s'invente pas dans la table.
  // ⚠️ Le même README classe HORS de ce pont, et on ne les sert donc pas : `card.test.*` (2, clés de
  //    TEST) et `staff.player.*` (2, clés de PERMISSION du back-office, catalogue RBAC — pas de l'i18n).
  'decision.type.DAMAGED_BUILDING_REPAIR':
    'A building needs repair',
  'decision.type.SEVERED_ROUTE_REBUILD':
    'A route is cut',
  'decision.type.ESCALATION_BACKLOG_REVIEW':
    'Escalations are waiting',
  'decision.type.AUTONOMY_REPORTS_PENDING':
    'Reports are waiting to be read',
  'decision.type.LEGAL_CASE_DECISION':
    'A case before the judge',
  'decision.type.BACKPRESSURE_CRITICAL_TRACE':
    'A critical bottleneck',
  'decision.type.MYCELIAL_STRESSED_LEG':
    'A link under strain',
  'decision.type.CUE_CASCADE_FALLOUT':
    'A cascade of signals',
  'decision.type.BUILDING_ACQUISITION':
    'Acquiring a building',
  'decision.type.BUILDING_CONVERT':
    'Converting a building',
  'decision.type.LIEUTENANT_RECRUIT':
    'Recruiting a lieutenant',
  'decision.type.LIEUTENANT_ROLE_REASSIGN':
    'Reassigning a post',
  'decision.type.BEHAVIOR_SCRIPT_REPLACE':
    'New standing orders',
  'decision.type.AUTONOMY_TIER_CHANGE':
    'Raising the autonomy ceiling',
  'decision.type.TASK_RETIREMENT':
    'Handing over a task for good',
  'decision.type.TASK_RECALL':
    'Taking a task back',
  'decision.type.ORG_TOPOLOGY_CHANGE':
    'Reshaping the org chart',
  'decision.type.SINUOSITY_FULL_RESET':
    'Rebuilding a route from scratch',
  'decision.type.MYCELIAL_STRUCTURAL_REINFORCE':
    'Reinforcing the network',
  'decision.type.NODE_DECOMMISSION':
    'Decommissioning a node',
  'decision.type.SUBSTANCE_UNLOCK':
    'Opening a new line',
  'decision.type.RECRUITMENT_FINALIZE':
    'Confirming a hire',
  'decision.type.NAMED_SEQUENCE_SAVE':
    'Saving a named sequence',
  'decision.type.CAPABILITY_ADOPT':
    'Adopting a capability',
  'hl.option.autonomy_reports.review_now':
    'Read now',
  'hl.option.autonomy_reports.leave_pending':
    'Leave pending',
  'hl.option.backpressure_critical_trace.trace_now':
    'Trace it back',
  'hl.option.backpressure_critical_trace.leave_pending':
    'Leave pending',
  'hl.option.cue_cascade_fallout.review_now':
    'Review now',
  'hl.option.cue_cascade_fallout.leave_pending':
    'Leave pending',
  'hl.option.damaged_building.repair_via_queue':
    'Queue for repair',
  'hl.option.damaged_building.leave_damaged':
    'Leave as is',
  'hl.option.escalation_backlog.review_now':
    'Handle now',
  'hl.option.escalation_backlog.leave_pending':
    'Leave pending',
  'hl.option.legal_case.accept_plea_deal':
    'Take the deal',
  'hl.option.legal_case.let_ride':
    'Let it go to trial',
  'hl.option.mycelial_stressed_leg.maintain_now':
    'Service it now',
  'hl.option.mycelial_stressed_leg.leave_stressed':
    'Leave it strained',
  'hl.option.severed_route.reroute_now':
    'Reroute now',
  'hl.option.severed_route.leave_severed':
    'Leave the route cut',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 3ᵉ passe, 2026-09-22 : 1 clé (random_world 1) ═══
  // Texte ÉCRIT PAR L'ATELIER le 2026-09-22 (dépôt client, branche da/2026-09-22, commit ee3dd85b,
  // `Tools/atelier-2026-09-22/03-carte-couplage-fr-en.md`) : une note causale tournée vers l'arrière,
  // aucun chiffre ni nom de système ni de quartier (§3.6/§6.1, R2.2). Il REMPLACE le brouillon de
  // `PROPOSITIONS-non-ratifiees.*.json` (20 → 19), ratifié dans `random_world.{en,fr}.json`, et il
  // est recopié d'ici — jamais réécrit. Le producteur estampille désormais `event_descriptor_i18n`
  // (random-world-exception-producer.service.ts), sinon le client ne le résoudrait jamais (forme F).
  'random_world.coupling_discovery.card':
    'One district moved, and the district next door followed — those two hold together, and now you know it.',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 4ᵉ passe, 2026-09-22 : 18 clés (autonomy 18) ═══
  // Libellés des deux options d'un rapport d'autonomie (écran ㉔), ÉCRITS PAR L'ATELIER le 2026-09-22
  // (dépôt client, da/2026-09-22, commit 5be993e9, `Tools/atelier-2026-09-22/05-autonomie-18-cles.md`) :
  // A = agir maintenant, B = l'alternative prudente ; pas de mot de système ; FR/EN de même registre.
  // Ils REMPLACENT les brouillons de `PROPOSITIONS-non-ratifiees.*.json` (19 → 1 ; les écarts sont
  // justifiés un par un dans le document), ratifiés dans `autonomy.{en,fr}.json`, recopiés d'ici par
  // script. ⚠️ Casse et accents normaux : les capitales sans accent du cadre ㉔ sont le rendu du client.
  'autonomy.cook.now':
    'Cook now',
  'autonomy.cook.refine':
    'Refine it first',
  'autonomy.launder.baseline':
    'Inject as usual',
  'autonomy.launder.safe':
    'Inject carefully',
  'autonomy.book.max':
    'Deposit everything',
  'autonomy.book.reserve':
    'Keep a reserve',
  'autonomy.sec.repair':
    'Repair now',
  'autonomy.sec.defer':
    'Put it off',
  'autonomy.log.dispatch':
    'Send it now',
  'autonomy.log.hold':
    'Hold the load',
  'autonomy.dist.collect':
    'Collect now',
  'autonomy.dist.letride':
    'Let it ride',
  'autonomy.muscle.assault':
    'Move on them',
  'autonomy.muscle.wait':
    'Wait for the right moment',
  'autonomy.intel.observe':
    'Watch them up close',
  'autonomy.intel.wait':
    'Hold off for now',
  'autonomy.facility.schedule_now':
    'Do the upkeep now',
  'autonomy.facility.wait':
    'Leave it for now',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 5ᵉ passe, 2026-09-22 : 1 clé (news_beat 1) ═══
  // `{subject}` neutre des deux gabarits de wire-day déjà servis (EN wire-day.ts:100-102). Texte de
  // l'atelier, 2026-09-22 : un wire-DAY, et l'outlet porte déjà « la ville » — le brouillon se trompait
  // d'unité et doublonnait. Ratifié dans `news_beat.{en,fr}.json` (146 → 147) ; PROPOSITIONS 1 → 0.
  'news_beat.wire_day.subject_neutral':
    'an ordinary day in Brennar',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 6ᵉ passe, 2026-09-22 : 71 clés (building_bands 68 · chrome_bands 3) ═══
  // Les BANDES servies par le back que le client traduisait en dur (annexe (b) de l'atelier,
  // `Tools/atelier-2026-09-22/04-libelles-anglais.md`, cf25eb4b : 15 fonctions de la fiche ② + la pression du chrome).
  // Piège TD-643 à l'envers : LA CLÉ EXISTE AU BACK D'ABORD, le client câblera `Libelle.De` dessus. Chaque
  // clé est `<famille>.<membre servi en minuscules>` — dérivée du DOMAINE de la projection (SeizedAmountBand,
  // RepairCostBand, LabTierBand, AshPurityBand, AppointmentStatusBand, AppointmentPayoutBand, GrowStageBand,
  // HusbandryBand, precursor_type, HubTierBand, MoneyHoldingTierBand, RosterBand, CapacityBand,
  // available_vehicles, HeldBand, building_operational_type, QueuePressureBand), jamais du mot anglais du
  // client. EN = le mot que le client affichait ; FR = ratifié par l'atelier. Recopié depuis
  // `building_bands.{en,fr}.json` et `chrome_bands.{en,fr}.json` par script.
  // ⚠️ SANS clé, parce que SANS texte ratifié (dit, pas inventé) : `building.type.press_house` / `.office`,
  //    `building.vehicle.refrigerated_van`, les membres `NONE` de lab_tier/hub_tier/money_holding_tier/roster/
  //    capacity (le client n'affiche rien), et `TransferAmountLabel` — aucune bande servie ne le porte.
  'building.type.lab':
    'Lab',
  'building.type.stash':
    'Stash',
  'building.type.front_shop':
    'Front shop',
  'building.type.cash_safehouse':
    'Cash safehouse',
  'building.type.dealer_spot_front':
    'Dealer-spot front',
  'building.type.specialized_lab':
    'Specialized lab',
  'building.type.refinery':
    'Refinery',
  'building.type.grow_house':
    'Grow house',
  'building.type.distribution_hub':
    'Distribution hub',
  'building.type.money_holding':
    'Vault',
  'building.seized_amount.high':
    'a heavy haul',
  'building.seized_amount.moderate':
    'a moderate haul',
  'building.seized_amount.low':
    'a light haul',
  'building.seized_amount.none':
    'nothing',
  'building.repair_cost.major':
    'major cost',
  'building.repair_cost.moderate':
    'moderate cost',
  'building.repair_cost.minor':
    'minor cost',
  'building.repair_cost.none':
    'no cost',
  'building.lab_tier.basic':
    'Basic',
  'building.lab_tier.refined':
    'Refined',
  'building.lab_tier.master':
    'Master',
  'building.purity.cut':
    'Cut',
  'building.purity.standard':
    'Standard',
  'building.purity.pure':
    'Pure',
  'building.purity.crystalline':
    'Crystalline',
  'building.appointment.scheduled':
    'Scheduled',
  'building.appointment.honored':
    'Honored',
  'building.appointment.expired':
    'Expired',
  'building.payout.pending':
    'Pending',
  'building.payout.none':
    'Lost',
  'building.payout.modest':
    'Modest',
  'building.payout.fair':
    'Fair',
  'building.payout.strong':
    'Strong',
  'building.payout.premium':
    'Premium',
  'building.grow_stage.early':
    'Early',
  'building.grow_stage.mid':
    'Mid',
  'building.grow_stage.late':
    'Late',
  'building.grow_stage.done':
    'Ready to harvest',
  'building.husbandry.withered':
    'Withered',
  'building.husbandry.on_track':
    'On track',
  'building.husbandry.thriving':
    'Thriving',
  'building.precursor.verdant_root_extract':
    'Verdant root',
  'building.precursor.lull_resin':
    'Lull resin',
  'building.precursor.glass_lily':
    'Glass lily',
  'building.hub_tier.small':
    'Small',
  'building.hub_tier.medium':
    'Medium',
  'building.hub_tier.large':
    'Large',
  'building.hub_tier.major':
    'Major',
  'building.hub_tier.max':
    'Max',
  'building.money_holding_tier.small':
    'Small',
  'building.money_holding_tier.medium':
    'Medium',
  'building.money_holding_tier.large':
    'Large',
  'building.money_holding_tier.major':
    'Major',
  'building.money_holding_tier.max':
    'Max',
  'building.roster.open':
    'Open',
  'building.roster.busy':
    'Busy',
  'building.roster.full':
    'Full',
  'building.capacity.open':
    'Open',
  'building.capacity.busy':
    'Busy',
  'building.capacity.full':
    'Full',
  'building.vehicle.foot':
    'Foot',
  'building.vehicle.bike':
    'Bike',
  'building.vehicle.car':
    'Car',
  'building.held.none':
    'Empty',
  'building.held.low':
    'Low',
  'building.held.moderate':
    'Moderate',
  'building.held.high':
    'High',
  'building.held.massive':
    'Massive',
  'exceptions.queue_pressure.normal':
    'Normal',
  'exceptions.queue_pressure.warning':
    'Warning',
  'exceptions.queue_pressure.saturated':
    'Saturated',
};

/**
 * FR translations (string_extraction.md §Source of truth — fr-FR is a translation OF en). FR may add
 * plural branches (e.g. `many`) but never drop EN ones (Invariant 3). Keys absent here fall back to EN.
 */
// ⛔ EXPORTÉ POUR ÊTRE VÉRIFIÉ PAR LOCALE, ET C'EST LA RAISON D'ÊTRE DE L'EXPORT.
// `resolveBundle` fait retomber FR sur EN : une garde qui interroge le bundle RÉSOLU trouve
// donc toujours la clé, même quand seule la version anglaise existe — et rend de l'anglais à
// un joueur français en se déclarant verte. Le seul moyen de voir ce trou est d'interroger les
// registres à la SOURCE, chacun séparément. L'export existe pour
// `tests/unit/i18n/bundle_sert_les_cles_du_client_unit.spec.ts` et pour rien d'autre.
export const FR_MESSAGES: Readonly<Record<string, string>> = {
  'game.lieutenant.assignment.summary':
    '{count, plural, =0 {Aucun lieutenant assigné} one {{count} lieutenant assigné} other {{count} lieutenants assignés}}',
  'game.lieutenant.recap.actions_taken':
    '{gender, select, ' +
    'feminine {{count, plural, one {Elle a mené 1 action ce cycle.} other {Elle a mené # actions ce cycle.}}} ' +
    'masculine {{count, plural, one {Il a mené 1 action ce cycle.} other {Il a mené # actions ce cycle.}}} ' +
    'other {{count, plural, one {Ce lieutenant a mené 1 action ce cycle.} other {Ce lieutenant a mené # actions ce cycle.}}}}',
  'game.ui_common.confirm_button': 'Confirmer',
  'game.ui_common.cancel_button': 'Annuler',
  // --- TD-452 — clés nées d'abord en copie de l'anglais, TRADUITES depuis (mesuré 2026-09-23 : 0 des 102
  //     clés `exception.*` n'a encore son fr égal à l'en ; la garde `_en-egal-fr.py` le tient désormais). ---
  'exception.heat_pressure.card.descriptor': 'La chaleur est haute — vos opérations sont sous pression.',
  'exception.heat_pressure.acknowledge.label': 'Prendre acte de la pression',
  'exception.heat_pressure.acknowledge.consequence': 'Vous prenez note de la chaleur ; aucune action automatique n\'est prise.',
  'exception.heat_pressure.escalate.label': 'Escalader pour relecture',
  'exception.heat_pressure.escalate.consequence': 'La carte est archivée pour relecture ultérieure.',
  'exception.heat_pressure.lay_low.label': 'Se faire oublier sur toutes les opérations',
  'exception.heat_pressure.lay_low.consequence': 'Vous réduisez l\'exposition partout ; mesure ponctuelle, sans règle permanente.',
  'exception.onboarding_preseed.acknowledge.label': 'Prendre acte de l\'état du labo',
  'exception.onboarding_preseed.acknowledge.consequence': 'Vous en prenez note ; aucune action automatique n\'est prise.',
  'exception.onboarding_preseed.escalate.label': 'Escalader pour relecture',
  'exception.onboarding_preseed.escalate.consequence': 'La carte est archivée pour relecture ultérieure.',
  // --- TD-453 — même histoire que TD-452 : copie de l'anglais à la naissance, traduites depuis (0 / 102).
  'exception.cue_cascade.card.descriptor': 'Un créneau de la pile n\'a pas pu partir — réengagez un créneau équivalent pour le récupérer.',
  'exception.cue_cascade.acknowledge_recover.label': 'Prendre acte du revers',
  'exception.cue_cascade.acknowledge_recover.consequence':
    'Vous prenez note que le créneau n\'a pas pu partir. Réengager un créneau équivalent le récupérera, au prix d\'un délai.',
  'exception.cue_cascade.escalate.label': 'Escalader pour relecture',
  'exception.cue_cascade.escalate.consequence': 'La carte est archivée pour relecture ultérieure.',
  'exception.backpressure_critical.card.descriptor': 'Un de vos nœuds d\'approvisionnement est en refoulement critique et demande votre attention.',
  'exception.backpressure_critical.acknowledge_and_trace.label': 'Prendre acte et remonter le blocage',
  'exception.backpressure_critical.acknowledge_and_trace.consequence':
    'Vous prenez note du refoulement critique ; remontez-le jusqu\'à sa source avec l\'outil de traçage.',
  'exception.backpressure_critical.escalate.label': 'Escalader pour relecture',
  'exception.backpressure_critical.escalate.consequence': 'La carte est archivée pour relecture ultérieure.',

  // ═══ item 0.6 — les 188 clés d'écran RÉCLAMÉES PAR LE CLIENT (listes générées depuis le code
  //     par la session client, `Tools/i18n/cles-*-2026-09-02.md`). EN = le littéral EXACT du client,
  //     BYTE-IDENTIQUE, aucune reformulation. Ajout strictement ADDITIF : tant qu'une clé manquait,
  //     l'écran affichait son littéral — ces entrées ne changent donc AUCUN pixel, elles rendent
  //     seulement la traduction POSSIBLE.
  //     ⛔ TROIS FAMILLES SONT VOLONTAIREMENT ABSENTES, et il ne faut pas « compléter » la liste :
  //       · `capability_key` (㊱) s'affiche NUE exprès — c'est le propos de l'écran, pas un manque ;
  //       · la bande INCONNUE (42) reste le mot brut du serveur — une clé la remplacerait par une
  //         paraphrase rassurante et masquerait qu'une valeur a été inventée ;
  //       · `ADD_RULE` / `ONE_TIME` (⑩) ne s'affichent PAS : elles VOYAGENT dans le corps de
  //         `POST /v1/exceptions/:id/resolve`. Les keyer casserait la résolution le jour où le
  //         dictionnaire les porterait — et TD-451 a mesuré que le serveur répondrait 200 en
  //         consommant la carte SANS rien dire. Contrôle exécuté avant insertion : 0 entrée dont la
  //         valeur soit `ADD_RULE`/`ONE_TIME`, 0 clé `capability_key` (motif prouvé capable de les
  //         voir sur un faux témoin).

  // --- `accueil.*` (8 clés) ---
  'accueil.etat.broke': 'À sec',
  'accueil.etat.flush': 'Bien garni',
  'accueil.etat.high': 'Élevé',
  'accueil.etat.in_progress': 'En cours',
  'accueil.etat.locked': 'Verrouillé',
  'accueil.etat.low': 'Faible',
  'accueil.etat.moderate': 'Moyen',
  'accueil.etat.unlocked': 'Ouvert',

  // --- `autonomie.*` (1 clé) --- les 4 jumelles à slug anglais et à glyphe retirées le 2026-09-23 (zéro demandeur)
  'autonomie.etat.consequence_minime': 'conséquence minime',

  // --- `blanchiment.*` (3 clés) ---
  'blanchiment.purete.clean': 'Propre',
  'blanchiment.purete.dirty': 'Sale',
  'blanchiment.purete.mostly_clean': 'Presque propre',

  // --- `building.*` (49 clés) ---
  'building.cover.none': 'Aucune',
  'building.cover.standard': 'Standard',
  'building.cover.strong': 'Solide',
  'building.cover.weak': 'Fragile',
  'building.raid_risk.elevated': 'Accru',
  'building.raid_risk.high': 'Élevé',
  'building.raid_risk.imminent': 'Imminent',
  'building.raid_risk.low': 'Faible',
  'building.row.alerte': 'Alerte',
  'building.row.rendez_vous': 'Rendez-vous',
  'building.row.capacite': 'Capacité',
  'building.row.chaine_du_froid': 'Chaîne du froid',
  'building.row.couverture': 'Couverture',
  'building.row.culture': 'Culture',
  'building.row.entretien': 'Entretien',
  'building.row.saisie': 'Saisie',
  'building.row.pousse': 'Pousse',
  'building.row.en_depot': 'En dépôt',
  'building.row.taille_de_la_banque': 'Taille de la banque',
  'building.row.taille_du_relais': 'Taille du relais',
  'building.row.soin': 'Soin',
  'building.row.taille_du_labo': 'Taille du labo',
  'building.row.en_service': 'En service',
  'building.row.gain': 'Gain',
  'building.row.purete': 'Pureté',
  'building.row.risque_de_descente': 'Risque de descente',
  'building.row.equipe': 'Équipe',
  'building.row.mise_en_place': 'Mise en place',
  'building.row.structure': 'Structure',
  'building.row.substance': 'Substance',
  'building.row.temperature': 'Température',
  'building.row.vehicules': 'Véhicules',
  'building.row.rendement': 'Rendement',
  'building.setup.in_setup': 'En installation',
  'building.setup.not_converted': 'Pas encore converti',
  'building.setup.operational': 'Opérationnel',
  'building.structural.damaged': 'Endommagé',
  'building.structural.intact': 'Intact',
  'building.structural.repairing': 'En réparation',
  'building.substance.': '—',
  'building.substance.ash': 'Ash',
  'building.substance.brindle': 'Brindle',
  'building.substance.crick': 'Crick',
  'building.substance.hush': 'Hush',
  'building.temperature.hot': 'Trop chaude',
  'building.temperature.optimal_cold': 'Froide, idéale',
  'building.temperature.warming': 'Se réchauffe',
  'building.yield.earning': 'ça rapporte',
  'building.yield.idle': 'rien ne rentre',

  // --- `exception_detail.*` (7 clés) ---
  'exception_detail.bloc.back': 'Retour',
  'exception_detail.bloc.escalate': 'Escalader',
  'exception_detail.bloc.issue': 'Problème :',
  'exception_detail.bloc.lui_apprendre': 'Lui apprendre',
  'exception_detail.bloc.resolu': 'Résolu ✓',
  'exception_detail.bloc.risque': 'Risqué',
  'exception_detail.bloc.suggere': 'Suggéré',
  // --- ⑨/⑩ — libellé du résultat, 10 issues, 10 bandes (21 clés, 2026-09-23) --- atelier `11-…` §3.7 et §3.2
  //     (`9a248ea5`). Issues : le domaine est les 10 littéraux que rendent les 10 handlers d'`exceptions/effects/`.
  //     Bandes : clés dérivées de la VALEUR servie (`Libelle.ParValeur`), domaines = `SeverityEnum`, `PriorityBucket`,
  //     `ConfidenceBucket` (`exceptions.projection.service.ts:73-79`).
  'exception_detail.bloc.resultat': 'Résultat :',
  'exception_detail.outcome.resolved': 'RÉGLÉ',
  'exception_detail.outcome.escalated': 'ARCHIVÉ',
  'exception_detail.outcome.repairing': 'EN RÉPARATION',
  'exception_detail.outcome.repairing_slow': 'RÉPARATION LENTE',
  'exception_detail.outcome.bribe_succeeded': 'ARRANGÉ',
  'exception_detail.outcome.bribe_failed': 'ÇA S\'EST RETOURNÉ',
  'exception_detail.outcome.laid_low': 'PROFIL BAS',
  'exception_detail.outcome.taught': 'RÈGLE APPRISE',
  'exception_detail.outcome.deferred': 'REMIS À PLUS TARD',
  'exception_detail.outcome.demolished': 'RASÉ',
  'exceptions.gravite.severe': 'grave',
  'exceptions.gravite.moderate': 'modérée',
  'exceptions.priorite.critical': 'critique',
  'exceptions.priorite.urgent': 'urgente',
  'exception_detail.confiance.confident': 'il est sûr',
  // non ratifiée — les 5 bandes ci-dessous : mots de l'atelier (§3.2), jamais dessinés ni ratifiés ; veto user ouvert.
  'exceptions.gravite.mild': 'légère',
  'exceptions.priorite.watching': 'à surveiller',
  'exceptions.priorite.silent': 'sans urgence',
  'exception_detail.confiance.likely': 'il le croit',
  'exception_detail.confiance.tentative': 'il hésite',

  // --- `exceptions.*` (19 clés) ---
  'exceptions.bloc.a_relire_a_tete_reposee': 'à relire à tête reposée',
  'exceptions.bloc.escalades_archivees': 'Escalades archivées',
  'exceptions.bloc.file_indisponible_verifier_la_pile': 'File indisponible — vérifier la pile',
  'exceptions.bloc.il_attend_une_consigne': 'il attend une consigne',
  'exceptions.bloc.ouvrir': 'Ouvrir',
  'exceptions.bloc.patron': 'Patron',
  'exceptions.bloc.toute_la_ville': 'toute la ville',
  'exceptions.bloc.au_batiment_touche': 'au bâtiment touché',
  'exceptions.categorie.conflit': 'CONFLIT',
  'exceptions.categorie.diplomatie': 'DIPLOMATIE',
  'exceptions.categorie.renseignement': 'RENSEIGNEMENT',
  'exceptions.categorie.reputation': 'RÉPUTATION',
  'exceptions.locuteur.la_ville': 'La ville',
  'exceptions.nombre.cinq': 'Cinq',
  'exceptions.nombre.deux': 'Deux',
  'exceptions.nombre.plusieurs': 'Plusieurs',
  'exceptions.nombre.quatre': 'Quatre',
  'exceptions.nombre.six': 'Six',
  'exceptions.nombre.trois': 'Trois',

  // --- `famille.*` (1 clé) --- les 44 jumelles à slug anglais retirées le 2026-09-23 (zéro demandeur, TD-690)
  'famille.archetype.distribution': 'Distribution',

  // --- `forensic.*` (16 clés) ---
  'forensic.bloc.ce_qu_on_sait_vraiment': 'CE QU\'ON SAIT VRAIMENT',
  'forensic.bloc.ce_qui_se_voit': 'Ce qui se voit',
  'forensic.bloc.pas_de_reponse': 'Pas de réponse',
  'forensic.bloc.risque_d_audit': 'RISQUE D\'AUDIT',
  'forensic.bloc.train_de_vie': 'TRAIN DE VIE',
  'forensic.bloc.trois_signaux_trois_bandes': 'TROIS SIGNAUX, TROIS BANDES',
  'forensic.bloc.une_piste_posee_par_habitude_ressemble_a_une_piste_relevee':
    'Une piste posée par habitude ressemble à une piste relevée',
  'forensic.bloc.visibilite_des_rejets': 'VISIBILITÉ DES REJETS',
  'forensic.cran.un_dossier_est_ouvert': 'Un dossier est ouvert',
  'forensic.evenement.ca_saute_aux_yeux': 'Ça saute aux yeux',
  'forensic.evenement.convocation_recue': 'Convocation reçue',
  'forensic.evenement.ils_sont_venus': 'Ils sont venus',
  'forensic.gravite.ca_se_voit_de_loin': 'Ça se voit de loin',
  'forensic.gravite.on_vous_regarde': 'On vous regarde',
  'forensic.gravite.rien_ne_depasse': 'Rien ne dépasse',
  'forensic.bloc.ce_que_la_ville_ne_dit_pas': 'CE QUE LA VILLE NE DIT PAS',

  // --- `horizon.*` (14 clés) ---
  'horizon.bloc.a_portee': 'À PORTÉE',
  'horizon.bloc.aucune_de_ces_cartes_n_a_encore_de_nom': 'Aucune de ces cartes n\'a encore de nom',
  'horizon.bloc.c_etait_a_portee_ca_s_est_eloigne': 'C\'était à portée. Ça s\'est éloigné.',
  'horizon.bloc.ce_qu_on_sait_vraiment': 'CE QU\'ON SAIT VRAIMENT',
  'horizon.bloc.deja_prises': 'DÉJÀ PRISES',
  'horizon.bloc.l_horizon': 'L\'horizon',
  'horizon.bloc.ont_recule': 'ONT RECULÉ',
  'horizon.bloc.rien_a_l_horizon': 'Rien à l\'horizon',
  'horizon.bloc.ce_qui_manque_encore': 'ce qui manque encore',
  'horizon.bloc.pourquoi_c_est_vide': 'pourquoi c\'est vide',
  'horizon.bloc.les_cartes_viennent_du_monde_pas_du_menu': 'Les cartes viennent du monde, pas du menu',
  'horizon.bloc.rien_ne_s_ouvre_pour_l_instant': 'Rien ne s\'ouvre pour l\'instant.',
  'horizon.bloc.l_horizon_se_remplit_en_jouant': 'L\'horizon se remplit en jouant.',
  'horizon.bloc.indisponible': 'indisponible',

  // --- `reputation.*` (21 clés) ---
  'reputation.bloc.ce_qu_il_a_absorbe_de_vos_regles': 'ce qu’il a absorbé de vos règles',
  'reputation.bloc.donner_une_regle': 'DONNER UNE RÈGLE',
  'reputation.bloc.le_miroir': 'Le miroir',
  'reputation.bloc.les_regles_que_vous_avez_donnees': 'LES RÈGLES QUE VOUS AVEZ DONNÉES',
  'reputation.bloc.vous_n_avez_encore_donne_aucune_regle_rien_ne_peut_donc_etre_enfreint':
    'vous n’avez encore donné aucune règle — rien ne peut donc être enfreint',
  'reputation.etat.coherence_inconnue': 'Cohérence inconnue',
  'reputation.etat.il_se_ferme': 'Il se ferme',
  'reputation.etat.il_se_tient_a_carreau': 'Il se tient à carreau',
  'reputation.etat.il_vous_ecoute': 'Il vous écoute',
  'reputation.etat.il_vous_en_veut': 'Il vous en veut',
  'reputation.etat.la_comptabilite_tenue': 'la comptabilité tenue',
  'reputation.etat.la_discretion_devant_les_civils': 'la discrétion devant les civils',
  'reputation.etat.la_justice_envers_les_siens': 'la justice envers les siens',
  'reputation.etat.la_ponctualite': 'la ponctualité',
  'reputation.etat.offre_inconnue': 'Offre inconnue',
  'reputation.etat.on_demande_des_gages': 'On demande des gages',
  'reputation.etat.on_vient_sans_garantie': 'On vient sans garantie',
  'reputation.etat.pas_encore_jugeable': 'Pas encore jugeable',
  'reputation.etat.posture_inconnue': 'Posture inconnue',
  'reputation.etat.vous_vous_en_ecartez': 'Vous vous en écartez',
  'reputation.etat.vous_vous_y_tenez': 'Vous vous y tenez',

  // ★ La SEULE clé écrite à la main : la ligne d'ambiance de ⑨ s'assemble depuis un COMPTE.
  //   Keyer ses fragments donnerait des phrases intraduisibles (l'ordre des mots change de
  //   langue à langue) ; keyer la phrase entière est impossible puisqu'elle varie. La forme
  //   juste est un pluriel ICU — le même motif que `game.lieutenant.assignment.summary`.
  'exceptions.file.ambiance': '{count, plural, =0 {Personne ne fait la queue — la routine tient} one {Un seul attend vos ordres — la file est calme} other {# attendent vos ordres — la file est calme}}',

  // ═══ TD-455 — la CLASSE restante de TD-452/453 : 80 clés / 16 fichiers producteurs, `label` et
  //     `projected_consequence` des cartes d'exception. EN = le littéral de production BYTE-IDENTIQUE,
  //     aucune reformulation ; ajout strictement ADDITIF (la prose reste en place, le client la voit
  //     tant qu'il ne résout pas la clé).
  //     ⚠️ UNE CLÉ PAR SITE PRODUCTEUR, jamais par `id` d'action — obstacle (a) de TD-453, mesuré et
  //     non re-dérivé : 4 ids (`acknowledge`, `escalate`, `lay_low`, `wait`) portent des libellés
  //     DIFFÉRENTS selon le producteur ; une clé par id changerait le texte lu par le joueur.
  //     ★ 86 champs stampés pour 80 clés : 3 actions apparaissent DEUX fois dans leur fichier
  //     (`candidate_actions[]` puis `suggested_action`) — vérifié byte-identique aux 6 endroits, donc
  //     partager la clé est correct et non une fusion de textes distincts.

  // --- `exception.ambient_drift.*` (4 clés) ---
  'exception.ambient_drift.acknowledge.label': 'Prendre acte du schéma',
  'exception.ambient_drift.acknowledge.projected_consequence':
    'Vous prenez note du schéma hors des heures ; aucune action automatique n\'est prise.',
  'exception.ambient_drift.escalate.label': 'Escalader pour relecture',
  'exception.ambient_drift.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.compression_residue.*` (4 clés) ---
  'exception.compression_residue.acknowledge.label': 'Prendre acte du résidu de compression non traité',
  'exception.compression_residue.acknowledge.projected_consequence':
    'Un problème est resté non traité pendant toute une semaine de compression — il reviendra à chaque tableau tant que vous ne l\'aurez pas réglé.',
  'exception.compression_residue.escalate.label': 'Escalader pour relecture',
  'exception.compression_residue.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.degraded_category_pressure.*` (3 clés) ---
  'exception.degraded_category_pressure.acknowledge.label': 'Prendre acte de la couverture dégradée',
  'exception.degraded_category_pressure.escalate.label': 'Escalader pour relecture',
  'exception.degraded_category_pressure.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.equipment_failure.*` (8 clés) ---
  'exception.equipment_failure.defer.label': 'Reporter la réparation',
  'exception.equipment_failure.defer.projected_consequence':
    'Laisser le bâtiment à l\'arrêt — il redemandera votre attention tant que vous n\'agirez pas.',
  'exception.equipment_failure.demolish_replace.label': 'Démolir et reconstruire',
  'exception.equipment_failure.demolish_replace.projected_consequence':
    'Rase le bâtiment ; l\'îlot redevient constructible.',
  'exception.equipment_failure.repair_immediate.label': 'Réparer tout de suite',
  'exception.equipment_failure.repair_immediate.projected_consequence':
    'Payer le coût plein pour remettre le bâtiment en service au plus vite.',
  'exception.equipment_failure.repair_slow.label': 'Réparer lentement (moins cher)',
  'exception.equipment_failure.repair_slow.projected_consequence':
    'Coût réduit ; le bâtiment met plus longtemps à revenir en service.',

  // --- `exception.execution_plan_deviation.*` (3 clés) ---
  'exception.execution_plan_deviation.acknowledge.label': 'Prendre acte du plan d\'exécution dévié',
  'exception.execution_plan_deviation.escalate.label': 'Escalader pour relecture',
  'exception.execution_plan_deviation.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.flag_exhaustion.*` (4 clés) ---
  'exception.flag_exhaustion.acknowledge.label': 'Prendre acte de l\'épuisement',
  'exception.flag_exhaustion.acknowledge.projected_consequence':
    'Vous prenez note que le lieutenant n\'a plus de jetons pour ce sujet ; aucune action automatique n\'est prise.',
  'exception.flag_exhaustion.escalate.label': 'Escalader pour relecture',
  'exception.flag_exhaustion.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.friction_threshold.*` (4 clés) ---
  'exception.friction_threshold.acknowledge.label': 'Prendre acte de la charge de friction',
  'exception.friction_threshold.acknowledge.projected_consequence':
    'Vous prenez note que l\'organisation porte plus de friction qu\'elle n\'en absorbe ; le rendement reste réduit tant que vous ne démantelez pas un nœud ou que la charge ne baisse pas.',
  'exception.friction_threshold.escalate.label': 'Escalader pour relecture',
  'exception.friction_threshold.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.lieutenant_cook.*` (6 clés) ---
  'exception.lieutenant_cook.keep.label': 'Continuer la cuisson',
  'exception.lieutenant_cook.keep.projected_consequence': 'Le lieutenant ignore la chaleur et continue d\'opérer.',
  'exception.lieutenant_cook.pause.label': 'Suspendre les opérations quand la chaleur est élevée',
  'exception.lieutenant_cook.pause.projected_consequence': 'Le lieutenant arrête la cuisson tant que la chaleur reste élevée.',
  'exception.lieutenant_cook.pause_hard.label': 'Ne suspendre qu\'en chaleur extrême',
  'exception.lieutenant_cook.pause_hard.projected_consequence':
    'Le lieutenant continue de cuisiner en chaleur modérée et ne suspend qu\'en chaleur extrême.',

  // --- `exception.lieutenant_distribution.*` (6 clés) ---
  'exception.lieutenant_distribution.acknowledge.label': 'Laisser pour l\'instant',
  'exception.lieutenant_distribution.acknowledge.projected_consequence': 'Aucune règle n\'est ajoutée ; la caisse continue de gonfler.',
  'exception.lieutenant_distribution.collect.label': 'Collecter la caisse automatiquement',
  'exception.lieutenant_distribution.collect.projected_consequence':
    'Le lieutenant fait remonter la caisse du dealer dès qu\'elle est élevée.',
  'exception.lieutenant_distribution.collect_high.label': 'Ne collecter qu\'au-dessus d\'un seuil élevé',
  'exception.lieutenant_distribution.collect_high.projected_consequence':
    'Le lieutenant laisse la caisse gonfler et ne collecte que lorsqu\'elle est élevée.',

  // --- `exception.lieutenant_intelligence.*` (4 clés) ---
  'exception.lieutenant_intelligence.observe_anyway.label': 'Collecter du renseignement même quand le rival est silencieux',
  'exception.lieutenant_intelligence.observe_anyway.projected_consequence':
    'Le lieutenant maintient la surveillance même en régime silencieux et se fait une idée.',
  'exception.lieutenant_intelligence.wait.label': 'Attendre que le rival redevienne actif',
  'exception.lieutenant_intelligence.wait.projected_consequence':
    'Le lieutenant reste en attente jusqu\'à ce que le rival passe en régime montant ou écrasant.',

  // --- `exception.lieutenant_logistics.*` (6 clés) ---
  'exception.lieutenant_logistics.acknowledge.label': 'Laisser pour l\'instant',
  'exception.lieutenant_logistics.acknowledge.projected_consequence':
    'Aucune règle n\'est ajoutée ; la marchandise continue de s\'accumuler.',
  'exception.lieutenant_logistics.dispatch.label': 'Expédier la marchandise automatiquement',
  'exception.lieutenant_logistics.dispatch.projected_consequence':
    'Le lieutenant fait suivre la marchandise dès que la source a du stock.',
  'exception.lieutenant_logistics.dispatch_high.label': 'N\'expédier que lorsque le stock est élevé',
  'exception.lieutenant_logistics.dispatch_high.projected_consequence':
    'Le lieutenant laisse la marchandise s\'accumuler et n\'expédie que lorsque le stock est élevé.',

  // --- `exception.lieutenant_muscle.*` (4 clés) ---
  'exception.lieutenant_muscle.block_when_silent.label': 'Suspendre les opérations tant que le rival est silencieux',
  'exception.lieutenant_muscle.block_when_silent.projected_consequence':
    'Le lieutenant suspend explicitement quand le rival est en sommeil.',
  'exception.lieutenant_muscle.wait.label': 'Attendre que la pression monte',
  'exception.lieutenant_muscle.wait.projected_consequence':
    'Le lieutenant reste en attente jusqu\'à ce que le rival passe en régime montant ou écrasant.',

  // --- `exception.mycelial_stress.*` (4 clés) ---
  'exception.mycelial_stress.acknowledge.label': 'Prendre acte de la tension',
  'exception.mycelial_stress.acknowledge.projected_consequence':
    'Vous prenez note que ce tronçon est sous tension persistante ; aucune action automatique n\'est prise.',
  'exception.mycelial_stress.escalate.label': 'Escalader pour relecture',
  'exception.mycelial_stress.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.raid.*` (13 clés) ---
  'exception.raid.acknowledge.label': 'Prendre acte',
  'exception.raid.acknowledge.projected_consequence': 'Écarte cette carte ; aucune action n\'est prise.',
  // non ratifiée — « descente » plutôt que « raid » (atelier `11-…` §3.4), choix à l'user
  'exception.raid.add_rule.label': 'Gérer seul une descente',
  'exception.raid.add_rule.projected_consequence': 'désormais il s’en charge — une règle',
  'exception.raid.bribe.label': 'Soudoyer un fonctionnaire',
  // non ratifiée — « descente » plutôt que « raid » (atelier `11-…` §3.4), choix à l'user
  'exception.raid.bribe.projected_consequence':
    'la descente disparaît… ou la chaleur monte',
  'exception.raid.card.descriptor': 'Ils ont retourné le bâtiment cette nuit. J’ai pas de consigne pour ça.',
  'exception.raid.escalate.label': 'Escalader',
  'exception.raid.escalate.projected_consequence': 'Archive cette carte pour relecture ultérieure.',
  'exception.raid.lay_low.label': 'Se faire oublier (risqué)',
  'exception.raid.lay_low.projected_consequence':
    'Se faire oublier pour faire retomber la chaleur — l\'ampleur est incertaine, et le bâtiment reste endommagé.',
  'exception.raid.repair.label': 'Réparer le bâtiment',
  'exception.raid.repair.projected_consequence': 'payer pour le remettre en marche, avec le temps',

  // --- `exception.random_world.*` (4 clés) ---
  'exception.random_world.acknowledge.label': 'Prendre acte du couplage',
  'exception.random_world.acknowledge.projected_consequence':
    'Vous prenez note du lien de cause à effet ; aucune action automatique n\'est prise.',
  'exception.random_world.escalate.label': 'Escalader pour relecture',
  'exception.random_world.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.route_collapse.*` (4 clés) ---
  'exception.route_collapse.acknowledge.label': 'Prendre acte de la rupture',
  'exception.route_collapse.acknowledge.projected_consequence':
    'La route X s\'est effondrée. L\'aval est à l\'arrêt. Aucune action automatique n\'est prise.',
  'exception.route_collapse.escalate.label': 'Escalader pour relecture',
  'exception.route_collapse.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // ═══ P4 item 3 — le nom de fiction d'un bâtiment. Ratifié par l'user le 2026-09-02 (choix 3A).
  //     Forme : `{enseigne} — {district}, îlot {block}`. Les 3 placeholders sont EXACTEMENT les params
  //     que `buildingNameRef` émet (l'instrument de TD-457 asserte cette égalité).
  //     ⚠️ `enseigne` et `district` sont des NOMS PROPRES de fiction : ils voyagent en params et ne se
  //     traduisent pas. Seul « îlot » est du texte, et c'est pourquoi ce gabarit est une clé.
  //     EN ≠ FR depuis le 2026-09-23 (`759af925`) : « îlot » est traduit (« block ») ; enseigne et district restent en params.
  'game.fiction.building.name': '{enseigne} — {district}, îlot {block}',
  // Le frère DÉSAMBIGUÏSÉ (approuvé le 2026-09-02) — servi UNIQUEMENT quand deux bâtiments du même
  // type, dans le même îlot, tirent la même enseigne. Une clé distincte plutôt qu'un param optionnel :
  // l'instrument de TD-457 asserte que les params émis == les placeholders du gabarit, donc un `rang`
  // émis « au cas où » ferait rougir la garde — et « n° 1 » collé à tous les noms du jeu serait pire.
  'game.fiction.building.name.rang': '{enseigne} — {district}, îlot {block}, n° {rang}',

  // ═══ P4 item 4 — la copy des 11 TUTORIELS. Ratifiée par l'user le 2026-09-02 (« on prend toutes tes
  //     reco »), choix 6A. **Ferme D10-h** : le canon ch11 écrivait « Lt. Hara: Buyer A unavailable for
  //     Route 3 » — faux dès la première phrase du jeu (l'archétype livré est COOK, et « Route 3 »
  //     n'existe pas). La première carte est réécrite pour ce qui est RÉELLEMENT livré.
  //     ⚠️ LA CLÉ EST L'ID DU TUTORIEL, pas `<id>.body` : le catalogue ne sert que des ids, et le client
  //     n'avait donc rien à afficher (défaut mesuré dans la note ㉕). En faisant de l'id une clé, la
  //     bulle se remplit sans changer une ligne de projection.
  //     ✅ Égalité d'ENSEMBLES vérifiée contre `tutorial-id-catalogue.ts` : 11 ids, 11 textes, aucun
  //     orphelin d'un côté ni de l'autre — un texte sans id ne s'afficherait jamais, un id sans texte
  //     laisserait une bulle vide.
  //     Traduits le 2026-09-23 (TD-690, atelier `17-…`) ; le FR vouvoie le joueur (canon, `pluralization_and_gender.md:209`).

  'tutorial.exception_card.onboarding_preseed':
    'Lt. Hara — cuisson du soir bloquée : plus de solvant. Commander maintenant (coût) ou attendre demain (rendement).',
  'tutorial.city_map_heat_intro': 'La carte montre la chaleur par îlot. Plus c\'est chaud, plus la police regarde.',
  'tutorial.daily_review_intro': 'Chaque matin, la Revue liste ce qui a dévié de la routine. Tranchez, ou laissez.',
  'tutorial.cue_stack_intro': 'La pile du jour ordonne vos consignes. Le premier créneau part en premier.',
  'tutorial.possibility_horizon_intro': 'L\'horizon montre ce que vos lieutenants peuvent apprendre ensuite.',
  'tutorial.compression_week': 'Semaine de compression : l\'organisation est sous tension. Réduisez, ou encaissez.',
  'tutorial.graduation': 'Un lieutenant a fini son apprentissage. Il décide seul, dans le cadre que vous fixez.',
  'tutorial.graduation_eligibility_intro': 'Un lieutenant est prêt à passer. Sa promotion se prépare ici.',
  'tutorial.queue_runs_dry': 'La file est vide. Rien n\'attend votre décision : la ville tourne sans vous.',
  'tutorial.vacancy': 'Un poste est vacant. Sans titulaire, la routine s\'arrête là.',
  'tutorial.audit_pin_intro': 'Un audit est épinglé sur ce bâtiment. Ses comptes seront relus.',

  // ═══ P3 (parcours ⑨) — LA CLÉ QUE 9 535 CARTES ÉMETTENT ET QUE PERSONNE NE SERVAIT.
  //     Trouvée en jouant le parcours d'un compte NEUF : la toute première carte d'exception du jeu
  //     porte `event_descriptor = 'onboarding.preseed_exception.card'` et le même `..._i18n.key`, et
  //     cette clé était **ABSENTE du bundle** — le descripteur s'affichait donc en CLÉ BRUTE, alors
  //     que ses deux actions étaient correctement traduites.
  //     ⛔ POURQUOI AUCUN BALAYAGE NE L'A VUE : TD-452/453/455 cherchaient des LITTÉRAUX de prose à
  //     stamper. Celle-ci était **déjà une clé** — donc « faite » pour un balayage de littéraux, qui
  //     ne demande jamais si la clé est SERVIE. *Une clé qui est déjà une clé a l'air terminée.*
  //     Texte : la copy ratifiée de la première carte (2026-09-02, choix 6A) — c'est le même événement
  //     que `tutorial.exception_card.onboarding_preseed` décrit, vu depuis la carte.
  'onboarding.preseed_exception.card':
    'Lt. Hara — cuisson du soir bloquée : plus de solvant. Commander maintenant (coût) ou attendre demain (rendement).',

  // ═══ P4 item 7 (§8, tranché par délégation le 2026-09-02, RÉVISABLE) — les noms de DEALERS et de
  //     ROUTES. Ferme TD-485 : `dealerNameRef`/`routeNameRef` existaient avec ZÉRO consommateur, et
  //     ㉟ n'avait qu'un uuid à afficher.
  //     ⚠️ Un dealer porte un PRÉNOM SEUL, jamais « Lt. » : la FORME du nom le distingue d'un
  //     lieutenant sans qu'aucun libellé ne l'explique. Les deux pools sont disjoints (garde dédiée).
  //     ⚠️ DEUX gabarits pour les routes, pas un param optionnel : l'instrument de TD-457 exige que
  //     les params émis soient exactement les placeholders du gabarit EMPLOYÉ — une route sans
  //     extrémités change donc de clé plutôt que de porter des params vides.
  'game.fiction.dealer.name': '{prenom}',
  'game.fiction.route.named': '{depart} → {arrivee}',
  'game.fiction.route.indexed': 'n° {index}',

  // ═══ TD-553 (maillon 3, chantier "les maillons back des écrans neufs", 2026-09-03) — le nom de
  //     fiction d'un RIVAL, côté FR — même clé, même gabarit passe-plat qu'en EN ci-dessus (le nom
  //     ENTIER voyage en param, `fiction-names.ts`'s own `RIVAL_DISPLAY_NAME` pour les 4 valeurs et
  //     leurs 2 sources — la maquette ratifiée ㉙ + le glossaire GDD canon).
  'game.fiction.rival.name': '{nom}',

  // ═══ Le trou des NOMS D'AVOCATS (2026-09-06) — côté FR, byte-identique à l'EN ci-dessus : un nom
  //     propre ne se traduit pas, et le pool (« Maître Nom », `operational/legal/lawyer-name-pool.ts`)
  //     est DÉJÀ français — c'est la langue du jeu, l'EN est le passe-plat, pas l'inverse.
  'game.fiction.lawyer.name': '{nom}',

  // ═══ TD-556 (maillon 2, 2026-09-03), traduit le 2026-09-23 (TD-690) — le FR n'est plus la copie de l'EN :
  //     ce sont les mots que le client affiche déjà sur ㉛ (atelier `17-…`), non ratifiés (la ligne
  //     suivante le dit ; l'en-tête du même bloc côté EN dit pourquoi le back les sert quand même).
  // non ratifiée — les 3 noms d'avocat ci-dessous sont ceux du client (`LoiScreenController`) et de l'atelier `17-…` ; front.md ㉛ : ratification user ✗
  'game.legal.lawyer_tier.public_defender': 'Commis d\'office',
  'game.legal.lawyer_tier.boutique': 'Un cabinet',
  'game.legal.lawyer_tier.corruption_pipeline': 'La filière',


  // ═══ P6 item 1 (TD-484, la CLASSE) — 12 clés ÉMISES par des projections joueur et servies par AUCUN
  //     bundle. Trouvées par balayage de la classe, pas une par une : tout littéral de `src` qui suit la
  //     grammaire d'une clé i18n, confronté aux 374 clés réellement servies. 23 candidats non servis,
  //     CLASSÉS : 11 étaient des clés de TUNABLE portant un préfixe qui y ressemble (`operational.heat.*`,
  //     `operational.raid.*`, `core_loops.one_decision.*`) — écartées par leur fichier `*-tunables.ts`,
  //     avec le contrôle qui compte : AUCUNE clé réellement servie ne vit dans un tel fichier. Restent
  //     ces 12. ★ `game.progression.tier_label` est la plus parlante : elle a été MESURÉE en jeu la
  //     veille (S1-d, `GET /v1/progression` la renvoie) et personne n'avait demandé si elle était servie.
  //     *Une clé qui est déjà une clé a l'air terminée* — la même leçon que la carte de tutoriel.
  //     Les placeholders sont EXACTEMENT les params émis (garde de TD-457) : ni plus, ni moins.
  'core_loops.flag_discipline.reason.courier_scheduling':
    'Tournée à recaler sur la route {route_id}.',
  'core_loops.flag_discipline.reason.deviation_detected':
    'Écart relevé par {generator}.',
  'core_loops.flag_discipline.reason.front_shop_reconciliation':
    'Caisse à rapprocher sur {building_id}.',
  'core_loops.flag_discipline.reason.lek_rotation':
    'Rotation à décider pour {dealer_id}.',
  'core_loops.flag_discipline.reason.precursor_order':
    'Commande de {precursor_type} à passer pour {building_id}.',
  'core_loops.flag_discipline.reason.stash_reorder':
    'Stock de {substance_type} à alléger sur {building_id}.',
  'core_loops.flag_discipline.routine.courier_scheduling.descriptor':
    'Tournées — route {route_id}',
  'core_loops.flag_discipline.routine.front_shop_reconciliation.descriptor':
    'Caisse — {building_id}',
  'core_loops.flag_discipline.routine.lek_rotation.descriptor':
    'Rotation — {dealer_id}',
  'core_loops.flag_discipline.routine.precursor_order.descriptor':
    'Précurseurs — {precursor_type}, {building_id}',
  'core_loops.flag_discipline.routine.stash_reorder.descriptor':
    'Stock à alléger — {substance_type}, {building_id}',
  'game.progression.tier_label':
    'Palier {tier}',


  // ═══ §F-3 (2026-09-03) — les clés que le CLIENT DEMANDE et que ce registre ne servait pas.
  // ⛔ ADDITIF, jamais un renommage : 179 clés mesurées par `Tools/cles-i18n-du-client.py`, qui
  // les DÉRIVE comme `Libelle.De` les dérive (`domaine.role.Slug(litteral)`) au lieu de les
  // lister à la main. Avant ce bloc : le client en demandait 298, ce registre en servait 119 —
  // 60 %% tombaient sur le repli, et RIEN ne rougissait nulle part, parce que le contrat de
  // `Libelle` est justement de retomber sur le littéral.
  // ⚠️ ELLES SONT DANS LES DEUX REGISTRES, ET C'EST OBLIGATOIRE. `resolveBundle` pose EN comme
  // canonique et fait retomber FR sur EN : une clé ajoutée à EN seulement rendrait de l'ANGLAIS
  // à un joueur en français — le même piège que le repli de `Libelle`, un étage plus haut.
  // Le FR est le littéral du client à l'octet ; l'EN est une traduction écrite pour ce lot.
  'appro.bloc.bon_de_commande': 'BON DE COMMANDE',
  'appro.bloc.il_y_a_une_penurie_en_ville': 'Il y a une pénurie en ville',
  'appro.bloc.la_chaine_en_remontant': 'LA CHAÎNE, EN REMONTANT',
  'appro.bloc.la_commande_est_payee_et_partie': 'La commande est payée et partie.',
  'appro.bloc.livraison_receptionnee': 'Livraison réceptionnée.',
  'appro.bloc.rien_a_faire_de_plus_on_ne_l_accelere_pas_elle_arrivera_quand_le_fournisseur_l_aura_decide': 'Rien à faire de plus. On ne l\'accélère pas — elle arrivera quand le fournisseur l\'aura décidé.',
  'appro.bloc.tout_le_monde_en_cherche_en_meme_temps_ca_se_paiera_plus_cher_et_plus_tard': 'Tout le monde en cherche en même temps. Ça se paiera plus cher, et plus tard.',
  'appro.bouton.en_commander': 'EN COMMANDER',
  'appro.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'appro.titre.la_chaine_d_appro_est_indisponible': 'La chaîne d\'appro est indisponible',
  'boutique.bloc.jetons': '— jetons',
  'carte.bloc.a_vous': 'À vous',
  'carte.bloc.carte_de_la_ville_districts': 'CARTE DE LA VILLE — Districts',
  'carte.bloc.chaleur_affichee': 'Chaleur : affichée',
  'carte.bloc.chaleur_masquee': 'Chaleur : masquée',
  'carte.bloc.dispute': 'Disputé',
  'carte.bloc.entrer': 'Entrer',
  'carte.bloc.libre': 'Libre',
  'carte.bloc.rival': 'Rival',
  'carte.bloc.rive_nord': 'Rive nord',
  'carte.bloc.rive_sud': 'Rive sud',
  'delegation.bloc.rien_derriere': 'rien derrière',
  'delegation.bloc.si_vous_reprenez_maintenant': 'Si vous reprenez maintenant',
  'demolition.ecran.ce_qu_on_peut_y_mettre': 'CE QU\'ON PEUT Y METTRE',
  'demolition.ecran.fiche_du_site': 'FICHE DU SITE',
  'demolition.ecran.il_vous_coute_plus_qu_il_ne_vous_rapporte': 'Il vous coûte plus qu\'il ne vous rapporte.',
  'demolition.ecran.le_garder_c_est_payer_pour_gener_les_autres': 'Le garder, c\'est payer pour gêner les autres.',
  'distribution.bloc.a_pied_ca_vide_le_stock_du_labo': 'à pied · ça vide le stock du labo',
  'distribution.bloc.aucun_courrier_pour_l_instant': 'Aucun courrier pour l\'instant.',
  'distribution.bloc.aucune_destination_connue_pour_l_envoi_de_ce_soir': 'Aucune destination connue pour l\'envoi de ce soir.',
  'distribution.bloc.aucune_route_tendue_pour_l_instant': 'Aucune route tendue pour l\'instant.',
  'distribution.bloc.destination_a_determiner': 'destination à déterminer',
  'distribution.bloc.il_est_en_chemin_on_ne_le_rappelle_pas_on_saura_a_l_arrivee': 'Il est en chemin. On ne le rappelle pas — on saura à l\'arrivée.',
  'distribution.bloc.la_regulation': 'LA RÉGULATION',
  'distribution.bloc.vos_courriers': 'VOS COURRIERS',
  'distribution.bouton.acheter_un_velo': 'ACHETER UN VÉLO',
  'distribution.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'distribution.titre.la_distribution_est_indisponible': 'La distribution est indisponible',
  // TD-643 — voir le bloc EN. Les libellés sont ceux que le client affiche déjà (`FamilleLabels`),
  // donc ratifiés par les juges : on ne réinvente pas un mot français ici.
  'famille.archetype.gros_bras': 'Gros bras',
  'famille.archetype.renseignement': 'Renseignement',
  'famille.archetype.intendant': 'Intendant',
  'famille.archetype.blanchiment': 'Blanchiment',
  'famille.archetype.comptable': 'Comptable',
  'famille.archetype.cuisinier': 'Cuisinier',
  'famille.archetype.inconnu': 'Inconnu',
  'famille.archetype.logistique': 'Logistique',
  'famille.archetype.securite': 'Sécurité',
  'famille.band.bas': '[##..] Bas',
  'famille.band.epuise': '[....] Épuisé',
  'famille.band.inconnu': '[?] Inconnu',
  'famille.band.normal': '[###.] Normal',
  'famille.band.plein': '[####] Plein',
  'famille.category.audit_comptable': 'Audit comptable',
  'famille.category.categorie_inconnue': 'Catégorie inconnue',
  'famille.category.envoi_de_distribution': 'Envoi de distribution',
  'famille.category.flux_de_blanchiment': 'Flux de blanchiment',
  'famille.category.incident_transversal': 'Incident transversal',
  'famille.category.operations_de_production': 'Opérations de production',
  'famille.category.reponse_securite': 'Réponse sécurité',
  'famille.category.routage_logistique': 'Routage logistique',
  'famille.disruption.s_installe_lentement': 'S\'installe lentement',
  'famille.disruption.s_installe_normalement': 'S\'installe normalement',
  'famille.disruption.s_installe_tres_lentement': 'S\'installe très lentement',
  'famille.disruption.s_installe_vite': 'S\'installe vite',
  'famille.ecran.actions': 'Actions',
  'famille.ecran.ajouter_une_regle': '+ Ajouter une règle',
  'famille.ecran.anciennete': 'Ancienneté',
  'famille.ecran.archetype': 'Archétype',
  'famille.ecran.attacher': 'Attacher',
  'famille.ecran.combinateur': 'Combinateur',
  'famille.ecran.confirmer_la_reaffectation': 'Confirmer la réaffectation',
  'famille.ecran.cout_de_reecriture': 'Coût de réécriture',
  'famille.ecran.declencheurs': 'Déclencheurs',
  'famille.ecran.diagnostics': 'Diagnostics',
  'famille.ecran.etat': 'État',
  'famille.ecran.forcer_une_fois': 'Forcer une fois',
  'famille.ecran.gain_de_rendement': 'Gain de rendement',
  'famille.ecran.garder_l_anciennete_annuler': 'Garder l\'ancienneté (annuler)',
  'famille.ecran.mode': 'Mode',
  'famille.ecran.ouvrir': 'Ouvrir',
  'famille.ecran.palier_de_vocabulaire_1_conditions_verrouillees_resolvez_des_exceptions_et_enseignez_des_regles_pour_debloquer': 'Palier de vocabulaire 1 — conditions verrouillées 🔒 (résolvez des exceptions et enseignez des règles pour débloquer)',
  'famille.ecran.rafraichir': 'Rafraîchir',
  'famille.ecran.reaffecter': 'Réaffecter…',
  'famille.ecran.regles': 'Règles',
  'famille.ecran.relever_le_plafond': 'Relever le plafond',
  'famille.ecran.remettre_le_budget_a_zero': 'Remettre le budget à zéro',
  'famille.ecran.role': 'Rôle',
  'famille.ecran.stabilisation_apres_transfert': 'Stabilisation après transfert',
  'famille.ecran.valider': 'Valider',
  'famille.efficiencybonus.aucun_gain_de_rendement': 'Aucun gain de rendement',
  'famille.efficiencybonus.bon_gain_de_rendement': 'Bon gain de rendement',
  'famille.efficiencybonus.gain_de_rendement_maximal': 'Gain de rendement maximal',
  'famille.efficiencybonus.petit_gain_de_rendement': 'Petit gain de rendement',
  'famille.grantedrole.chef_de_groupe': 'Chef de groupe',
  'famille.grantedrole.conseil': 'Conseil',
  'famille.grantedrole.executant': 'Exécutant',
  'famille.grantedrole.responsable_delegue': 'Responsable délégué',
  'famille.mode.delegue': 'Délégué',
  'famille.mode.missionne': 'Missionné',
  'famille.opstate.actif': 'Actif',
  'famille.opstate.au_repos': 'Au repos',
  'famille.opstate.en_pause': 'En pause',
  'famille.opstate.prend_ses_marques': 'Prend ses marques',
  'famille.revisioncost.reecrire_coute_cher': 'Réécrire coûte cher',
  'famille.revisioncost.reecrire_coute_enormement': 'Réécrire coûte énormément',
  'famille.revisioncost.reecrire_coute_peu': 'Réécrire coûte peu',
  'famille.revisioncost.reecrire_coute_tres_cher': 'Réécrire coûte très cher',
  'famille.rulecount.aucune_regle': 'Aucune règle',
  'famille.rulecount.beaucoup_de_regles': 'Beaucoup de règles',
  'famille.rulecount.quelques_regles': 'Quelques règles',
  'filiere.bloc.aucun_nœud_pour_vous': 'AUCUN NŒUD POUR VOUS',
  'filiere.bloc.ce_n_est_ni_elle_est_vide_ni_elle_ne_repond_pas_c_est_pas_encore': 'ce n\'est ni « elle est vide » ni « elle ne répond pas », c\'est « pas encore ».',
  'filiere.bloc.ce_qu_on_sait_pour_l_instant': 'CE QU\'ON SAIT POUR L\'INSTANT',
  'filiere.bloc.ce_que_la_filiere_ne_dit_pas': 'CE QUE LA FILIÈRE NE DIT PAS',
  'filiere.bloc.ce_qu_on_sait_vraiment': 'CE QU\'ON SAIT VRAIMENT',
  'filiere.bloc.dire_combien_il_y_a_dans_la_filiere': 'Dire combien il y a dans la filière',
  'filiere.bloc.ecarts': 'ÉCARTS',
  'filiere.bloc.en_attente': 'EN ATTENTE',
  'filiere.bloc.etapes': 'ÉTAPES',
  'filiere.bloc.la_filiere': 'La filière',
  'filiere.bloc.la_filiere_n_a_pas_encore_ete_interrogee': 'La filière n\'a pas encore été interrogée',
  'filiere.bloc.la_filiere_ne_repond_pas': 'LA FILIÈRE NE RÉPOND PAS',
  'filiere.bloc.on_ne_vous_dira_que_si_c_est_propre_ni_combien_ni_depuis_quand_ni_a_quel_prix_c_est_voulu': 'on ne vous dira que si c\'est propre : ni combien, ni depuis quand, ni à quel prix. C\'est voulu.',
  'filiere.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_filiere_est_vide_c_est_on_ne_sait_pas_ou_elle_en_est': 'on n\'a pas eu de réponse. Ce n\'est pas « la filière est vide » : c\'est « on ne sait pas où elle en est ».',
  'filiere.bloc.ce_n_est_pas_une_panne_c_est_un_etat_il_n_y_a_rien_a_montrer_tant_qu_il_n_y_a_rien_de_monte_il_faut_une_planque_pour_que_la_filiere_commence_quelque_part': 'ce n\'est pas une panne, c\'est un état : il n\'y a rien à montrer tant qu\'il n\'y a rien de monté. Il faut une planque pour que la filière commence quelque part.',
  'filiere.bloc.le_premier_maillon_sans_elle_rien_n_entre_dans_la_filiere_et_rien_ne_se_ramasse_chez_les_dealers_non_plus': 'le premier maillon : sans elle, rien n\'entre dans la filière — et rien ne se ramasse chez les dealers non plus.',
  'filiere.bloc.maillon_manquant': 'MAILLON MANQUANT',
  'filiere.bloc.obtenir_une_planque': 'Obtenir une planque',
  'filiere.bloc.pas_de_reponse': 'Pas de réponse',
  'filiere.bloc.propre_au_bout': 'PROPRE AU BOUT',
  'filiere.bloc.vous_n_avez_encore_aucun_nœud': 'Vous n\'avez encore aucun nœud',
  'horizon.bloc.ce_palier_est_acquis': 'ce palier est acquis',
  'horizon.bloc.etat_inconnu': 'état inconnu',
  'horizon.bloc.l_echelle_des_paliers': 'L\'ÉCHELLE DES PALIERS',
  'horizon.bloc.on_ne_sait_pas_encore_ce_qui_manque_pour_y_arriver': 'on ne sait pas encore ce qui manque pour y arriver',
  'horizon.bloc.palier': 'Palier',
  'horizon.bloc.vous_avez_commence': 'vous avez commencé',
  'horizon.bloc.vous_n_avez_encore_rien_engage': 'vous n\'avez encore rien engagé',
  'journal.bloc.a_la_une': 'À LA UNE',
  'journal.bloc.aucune_de_ces_breves_n_a_de_texte': 'Aucune de ces brèves n\'a de texte',
  'journal.bloc.ca_commence': 'ÇA COMMENCE',
  'journal.bloc.ca_ne_partira_pas': 'ÇA NE PARTIRA PAS',
  'journal.bloc.ca_retombe': 'ÇA RETOMBE',
  'journal.bloc.ca_se_deploie': 'ÇA SE DÉPLOIE',
  'journal.bloc.ca_traine': 'ÇA TRAÎNE',
  'journal.bloc.ce_qu_on_sait_pour_l_instant': 'CE QU\'ON SAIT POUR L\'INSTANT',
  'journal.bloc.ce_qu_on_sait_vraiment': 'CE QU\'ON SAIT VRAIMENT',
  'journal.bloc.ce_qui_se_dit_ce_matin': 'CE QUI SE DIT CE MATIN',
  'journal.bloc.ces_trois_listes_se_remplissent_avec_ce_que_la_ville_fait_aucune_ne_depend_de_vos_gestes': 'ces trois listes se remplissent avec ce que la ville fait. Aucune ne dépend de vos gestes.',
  'journal.bloc.dans_la_rue': 'DANS LA RUE',
  'journal.bloc.en_attente_du_matin': 'EN ATTENTE DU MATIN',
  'journal.bloc.en_cours': 'EN COURS',
  'journal.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_ville_est_calme_c_est_on_ne_sait_pas_ce_qu_elle_a_fait_cette_nuit': 'on n\'a pas eu de réponse. Ce n\'est pas « la ville est calme » : c\'est « on ne sait pas ce qu\'elle a fait cette nuit ».',
  'journal.bloc.le_journal': 'Le journal',
  'journal.bloc.le_journal_n_a_pas_encore_ete_ouvert': 'Le journal n\'a pas encore été ouvert',
  'journal.bloc.le_journal_n_est_pas_arrive': 'LE JOURNAL N\'EST PAS ARRIVÉ',
  'journal.bloc.le_journal_suit_le_monde_pas_vous': 'Le journal suit le monde, pas vous',
  'journal.bloc.les_breves_sont_arrivees_sans_leur_texte_le_journal_de_ce_matin_n_a_que_des_titres_a_trous_voila_ce_qu_on_peut_vous_montrer_aujourd_hui': 'les brèves sont arrivées sans leur texte : le journal de ce matin n\'a que des titres à trous. Voilà ce qu\'on peut vous montrer aujourd\'hui.',
  'journal.bloc.les_trois_listes_n_ont_pas_ete_demandees_ce_n_est_ni_rien_ne_bouge_ni_pas_de_reponse_c_est_pas_encore': 'les trois listes n\'ont pas été demandées — ce n\'est ni « rien ne bouge » ni « pas de réponse », c\'est « pas encore ».',
  'journal.bloc.pas_de_reponse': 'Pas de réponse',
  'journal.bloc.phase_inconnue': 'PHASE INCONNUE',
  'journal.bloc.pourquoi_c_est_vide': 'POURQUOI C\'EST VIDE',
  'journal.bloc.rien_ne_bouge': 'RIEN NE BOUGE',
  'loi.bloc.affaires_en_cours': 'AFFAIRES EN COURS',
  'loi.bloc.aucune_affaire_en_cours': 'Aucune affaire en cours.',
  'loi.bloc.la_filiere_fait_classer_une_affaire_sans_proces_mais_elle_se_sert_de_gens_qui_un_jour_peuvent_parler_a_leur_tour': 'La filière fait classer une affaire sans procès — mais elle se sert de gens qui, un jour, peuvent parler à leur tour.',
  'loi.bloc.qui_peut_vous_defendre': 'QUI PEUT VOUS DÉFENDRE',
  'loi.bloc.une_affaire_nait_d_une_descente_rien_ici_n_en_cree': 'Une affaire naît d\'une descente — rien ici n\'en crée.',
  'loi.bloc.vos_avocats': 'VOS AVOCATS',
  'loi.bloc.vous_n_avez_encore_engage_personne': 'Vous n\'avez encore engagé personne.',
  'loi.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'loi.sous_titre.vos_avocats_et_ce_qu_ils_peuvent_faire_pour_vous': 'Vos avocats, et ce qu\'ils peuvent faire pour vous.',
  'loi.titre.le_parloir': 'Le parloir',
  'loi.titre.le_parloir_est_indisponible': 'Le parloir est indisponible',
  'pipeline.etat.clean': 'Propre',
  'pipeline.etat.dirty': 'Sale',
  'pipeline.etat.mostly_clean': 'Presque propre',
  'profil.bloc.aucun_profil': 'Aucun profil.',
  'profil.bloc.le_profil_n_a_pas_repondu': 'Le profil n\'a pas répondu.',
  'reglages.bloc.aucun_reglage': 'Aucun réglage.',
  'reglages.bloc.les_reglages_n_ont_pas_repondu': 'Les réglages n\'ont pas répondu.',
  'semaine.bloc.un_autre_probleme_vient_d_apparaitre': 'un autre problème vient d\'apparaître',

  // ═══ §F-3 (5), 2026-09-04 — les phrases d'écran de ⑧ passées par une clé à leur tour.
  'famille.ecran.attache': 'Attaché ✓',
  'famille.ecran.aucun_budget_d_autonomie_pour_l_instant': 'Aucun budget d\'autonomie pour l\'instant',
  'famille.ecran.aucun_lieutenant_recrute': 'Aucun lieutenant recruté',
  'famille.ecran.aucun_script_pour_l_instant': '(aucun script pour l\'instant)',
  'famille.ecran.aucune_equipe_rattachee': 'Aucune équipe rattachée',
  'famille.ecran.aucune_regle_touchez_ajouter_une_regle': '(aucune règle — touchez « + Ajouter une règle »)',
  'famille.ecran.batiment_affecte': 'Bâtiment affecté',
  'famille.ecran.batiment_cible_destination_planque': 'Bâtiment cible (destination / planque)',
  'famille.ecran.choisissez_un_batiment_de_destination': 'Choisissez un bâtiment de destination.',
  'famille.ecran.connectez_vous_d_abord': 'Connectez-vous d\'abord.',
  'famille.ecran.decision_appliquee': 'Décision appliquée ✓',
  'famille.ecran.echec_de_l_etat': 'Échec de l\'état —',
  'famille.ecran.echec_de_la_decision': 'Échec de la décision.',
  'famille.ecran.echec_de_la_reaffectation': 'Échec de la réaffectation.',
  'famille.ecran.echec_du_chargement_de_la_famille': 'Échec du chargement de la famille —',
  'famille.ecran.echec_du_recrutement': 'Échec du recrutement.',
  'famille.ecran.editeur_de_regles_ecrire_un_script_de_conduite': 'ÉDITEUR DE RÈGLES — écrire un script de conduite',
  'famille.ecran.etat_lieutenant_delegue': 'ÉTAT — lieutenant délégué',
  'famille.ecran.la_famille': 'LA FAMILLE',
  'famille.ecran.le_don': 'LE DON',
  'famille.ecran.nouveau_batiment': 'Nouveau bâtiment',
  'famille.ecran.nouveau_batiment_cible_destination_planque': 'Nouveau bâtiment cible (destination / planque)',
  'famille.ecran.reaffecte_anciennete_remise_a_zero_periode_de_stabilisation': 'Réaffecté — ancienneté remise à zéro, période de stabilisation.',
  'famille.ecran.reaffecter_deplacer_ce_lieutenant_remet_l_anciennete_a_zero': 'RÉAFFECTER — déplacer ce lieutenant (remet l\'ancienneté à zéro)',
  'famille.ecran.recruter_choisir_un_role_et_affecter': 'RECRUTER — choisir un rôle et affecter',
  'famille.ecran.recruter_un_nouveau_lieutenant': 'Recruter un nouveau lieutenant',
  'famille.ecran.recrutez_d_abord_un_lieutenant': 'Recrutez d\'abord un lieutenant.',
  'famille.ecran.recrutez_ou_ouvrez_d_abord_un_lieutenant': 'Recrutez ou ouvrez d\'abord un lieutenant.',
  'famille.ecran.script_de_conduite': 'Script de conduite',
  'famille.ecran.script_valide': 'Script valide ✓',
  'famille.ecran.verrouille_se_debloque_avec_la_progression': '🔒 Verrouillé — se débloque avec la progression',
  // ⑥ — les 3 gestes d'autonomie aux mots de ㉔ (atelier `13-…` §5, 2026-09-23 ; client `bfe15061`). Les 3 anciens restent servis : `ecrans/2026-09-23` et `main` du client les demandent encore.
  'famille.ecran.lui_rendre_sa_marge': 'Lui rendre sa marge',
  'famille.ecran.lui_elargir_sa_marge': 'Lui élargir sa marge',
  'famille.ecran.laisser_passer_celle_ci': 'Laisser passer celle-ci',

  // ═══ 2026-09-04 — les 73 clés produites par les conversions des sessions B et C (82 depuis ⑯, 2026-09-23 ;
  //     les 21 phrases et chips de ⑯ suivent sous leur propre sous-en-tête).
  // ⛔ Elles ne viennent pas d'un lot back : elles viennent d'écrans convertis ailleurs.
  // *Le lot back n'est pas « une fois pour toutes » — chaque écran converti en fabrique*, et
  // tant qu'elles manquent, ces écrans affichent le français de leur REPLI : ils ont l'air
  // traduits et ne rougissent nulle part.
  'accueil.carte.aucune_decision_en_attente': 'Aucune décision en attente',
  'accueil.carte.limite_de_structure_atteinte': 'Limite de structure atteinte',
  'accueil.carte.pret': 'Prêt',
  'accueil.carte.rien_a_signaler': 'Rien à signaler',
  'accueil.chrome.la_revue_du_jour': 'La revue du jour',
  'accueil.chrome.les_exceptions': 'Les exceptions',
  'accueil.etat.a_flot': 'À flot',
  'accueil.etat.confortable': 'Confortable',
  'accueil.etat.correct': 'Correct',
  'accueil.etat.en_cours': 'En cours',
  'accueil.etat.fauche': 'Fauché',
  'accueil.etat.inconnu': 'Inconnu',
  'accueil.etat.juste': 'Juste',
  'accueil.etat.ouvert': 'Ouvert',
  'accueil.etat.verrouille': 'Verrouillé',
  'accueil.file.aucune_exception_en_attente': 'Aucune exception en attente',
  'accueil.vitals.cohesion_indisponible_pour_l_ensemble_de_la_ville': 'Cohésion : indisponible pour l\'ensemble de la ville',
  'autonomie.etat.un_compromis': 'un compromis',
  'autonomie.etat.on_laisse_passer_quelque_chose': 'on laisse passer quelque chose',
  'autonomie.etat.on_s_expose': 'on s\'expose',
  'autonomie.etat.inconnu': '[?] Inconnu',
  'blanchiment.purete.a_demi_propre': 'À demi propre',
  'blanchiment.purete.presque_propre': 'Presque propre',
  'blanchiment.purete.propre': 'Propre',
  'blanchiment.purete.proprete_inconnue': 'Propreté inconnue',
  'blanchiment.purete.sale': 'Sale',
  'carnet.bloc.aucun_ordre_pose_entre_quatre_et_huit_dans_l_ordre_ou_ils_partiront': 'aucun ordre posé — entre quatre et huit, dans l\'ordre où ils partiront',
  'carnet.bloc.carnet_du_soir': 'Carnet du soir',
  'carnet.bloc.ce_n_est_ni_aucun_ordre_ni_pas_de_reponse_c_est_pas_encore': 'ce n\'est ni « aucun ordre » ni « pas de réponse », c\'est « pas encore ».',
  'carnet.bloc.ce_que_cet_ecran_ne_peut_pas_vous_dire': 'CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE',
  'carnet.bloc.ce_qu_on_sait_pour_l_instant': 'CE QU\'ON SAIT POUR L\'INSTANT',
  'carnet.bloc.ce_que_la_ville_prepare': 'Ce que la ville prépare',
  'carnet.bloc.ce_qu_on_sait_vraiment': 'CE QU\'ON SAIT VRAIMENT',
  'carnet.bloc.ce_qui_s_ouvrira_plus_tard': 'CE QUI S\'OUVRIRA PLUS TARD',
  'carnet.bloc.entre_quatre_et_huit_gestes_dans_l_ordre_ou_ils_partiront': 'entre quatre et huit gestes, dans l\'ordre où ils partiront',
  'carnet.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_soiree_est_vide_c_est_on_ne_sait_pas_ce_qui_est_prevu': 'on n\'a pas eu de réponse. Ce n\'est pas « la soirée est vide » : c\'est « on ne sait pas ce qui est prévu ».',
  'carnet.bloc.ce_que_la_ville_prepare_personne_ne_vous_le_rapporte_encore_ce_sera_ici_le_jour_ou_quelqu_un_le_fera': 'ce que la ville prépare, personne ne vous le rapporte encore. Ce sera ici le jour où quelqu\'un le fera.',
  'carnet.bloc.le_carnet_n_a_pas_encore_ete_ouvert': 'le carnet n\'a pas encore été ouvert',
  'carnet.bloc.le_carnet_ne_repond_pas': 'le carnet ne répond pas',
  'carnet.bloc.les_ordres_de_ce_soir': 'Les ordres de ce soir',
  'carnet.bloc.ordres_sur_8': ' ORDRES SUR 8',
  'carnet.bloc.pas_de_reponse': 'Pas de réponse',
  'carnet.bloc.rejouer_une_soiree_verrouille': 'Rejouer une soirée — verrouillé',
  'carnet.bloc.rien': '— rien —',
  'carnet.bloc.rien_n_a_encore_ete_demande': 'Rien n\'a encore été demandé',
  'carnet.bloc.une_suite_d_ordres_qu_on_met_de_cote_et_qu_on_relance_d_un_geste_cette_facon_de_faire_s_ouvre_plus_tard_il_faut_d_abord_monter_d_un_palier': 'une suite d\'ordres qu\'on met de côté et qu\'on relance d\'un geste. Cette façon de faire s\'ouvre plus tard — il faut d\'abord monter d\'un palier.',
  'conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras': 'Aucun de vos lieutenants n\'est du genre Gros bras.',
  'conflit.bloc.c_est_lui_qui_part_la_nuit_il_vous_en_manque_un_ce_n_est_pas_casse_vous_n_en_avez_tout_simplement_pas_encore': 'C\'est lui qui part la nuit. Il vous en manque un — ce n\'est pas cassé, vous n\'en avez tout simplement pas encore.',
  'conflit.bloc.dessinees_pas_renseignees_personne_ne_vous_dit_ce_qu_elles_preparent_ni_ce_qu_elles_possedent_on_frappe_a_l_aveugle': 'Dessinées, pas renseignées : personne ne vous dit ce qu\'elles préparent ni ce qu\'elles possèdent — on frappe à l\'aveugle.',
  'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain': 'Dites-moi qui j\'envoie et sur quoi. Je pars ce soir, on saura demain.',
  'conflit.bloc.le_compte_des_envois_precedents_est_indisponible_pour_l_instant': 'Le compte des envois précédents est indisponible pour l\'instant.',
  'conflit.bloc.les_quatre_familles': 'LES QUATRE FAMILLES',
  'conflit.bloc.qui_part_ce_soir': 'QUI PART CE SOIR',
  'conflit.bloc.vous_avez_l_homme_personne_pour_lui_dire_ou_frapper_on_ne_sait_pas_encore_ou_ils_sont': 'Vous avez l\'homme. Personne pour lui dire où frapper — on ne sait pas encore où ils sont.',
  'conflit.sous_titre.ce_que_vos_hommes_rapportent_des_familles_rivales_et_qui_vous_reste_pour_y_retourner': 'Ce que vos hommes rapportent des familles rivales, et qui vous reste pour y retourner.',
  'conflit.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'conflit.titre.le_conflit': 'Le conflit',
  'conflit.titre.le_conflit_est_indisponible': 'Le conflit est indisponible',
  'district.type_batiment.atelier_de_presse': 'Atelier de presse',
  'district.type_batiment.bureau': 'Bureau',
  'district.type_batiment.cache': 'Cache',
  'district.type_batiment.banque': 'Banque',
  'district.type_batiment.commerce_ecran': 'Commerce-écran',
  'district.type_batiment.laboratoire': 'Laboratoire',
  'district.type_batiment.laboratoire_specialise': 'Laboratoire spécialisé',
  'district.type_batiment.planque': 'Planque',
  'district.type_batiment.point_de_vente': 'Point de vente',
  'district.type_batiment.raffinerie': 'Raffinerie',
  'district.type_batiment.relais': 'Relais',
  'district.type_batiment.serre': 'Serre',
  'district.type_batiment.terrain_vague': 'Terrain vague',
  'revue.bloc.confirmer_la_routine': 'CONFIRMER LA ROUTINE ·',
  'revue.bloc.appui_long_rien_d_autre_ne_vous_attend': 'appui long — rien d’autre ne vous attend',
  'revue.bloc.ce_matin_au_verge_d_or': 'Ce matin, au Verge d’Or',
  'revue.bloc.d_un_seul_appui_le_registre_est_clos_pour_aujourd_hui': 'd’un seul appui — le registre est clos pour aujourd’hui',
  'revue.bloc.routines_signees': ' ROUTINES SIGNÉES',
  'revue.bloc.vos_lieutenants_ont_tenu_la_ligne_rien_ne_reclame_votre_parole': 'Vos lieutenants ont tenu la ligne — rien ne réclame votre parole',
  'revue.verdict.il_garde_sa_confiance': 'il garde sa confiance',
  'revue.verdict.jusqu_a_la_remise_hebdomadaire': 'jusqu’à la remise hebdomadaire',
  'revue.verdict.perdu': 'PERDU',
  'revue.verdict.remise_demain': 'remise demain',
  'revue.verdict.rendu': 'RENDU',
  // --- ⑯ `revue.phrase.*` et `revue.chip.*` (21 clés, 2026-09-23) — fr = le littéral du client à l'octet
  //     (CLIENT-2 `16d65096`, `Tools/juge-donnees/revue-du-jour/i18n-2026-09-23.md`) ; en = l'atelier :
  //     `08-…` §1 et annexe (`b95dd8c7`), `10-…` §3 (`8a1ea438`), `10-…` §7 (`4620fa78`), vérifiés à l'octet.
  //     `{sujet}` est un placeholder que la valeur garde : le client y insère le nom résolu de `subject_name_i18n`.
  'revue.chip.signale_rarement': 'signale rarement',
  'revue.chip.signale_souvent': 'signale souvent',
  'revue.phrase.j_ai_fait_tourner_le_coin_de_vente': 'J’ai fait tourner le coin de vente',
  'revue.phrase.j_ai_rapproche_les_comptes_de_la_facade': 'J’ai rapproché les comptes de la façade',
  'revue.phrase.j_ai_replanifie_la_tournee_des_coursiers': 'J’ai replanifié la tournée des coursiers',
  'revue.phrase.l_horaire_habituel_n_a_pas_ete_tenu': '— l’horaire habituel n’a pas été tenu.',
  'revue.phrase.la_caisse_declaree_s_ecarte_de_l_habitude': '— la caisse déclarée s’écarte de l’habitude.',
  'revue.phrase.le_lek_tournait_hors_du_rythme_convenu': '— le Lek tournait hors du rythme convenu.',
  'revue.phrase.il_passe_plus_d_argent_par_la_caisse_que_la_facade_ne_peut_en_justifier': '— il passe plus d’argent par la caisse que la façade ne peut en justifier.',
  'revue.phrase.j_ai_rapproche_les_comptes_de_sujet': 'J’ai rapproché les comptes de {sujet}',
  'revue.phrase.j_ai_reachemine_la_tournee_sujet': 'J’ai réacheminé la tournée {sujet}',
  'revue.phrase.j_ai_replanifie_la_tournee_sujet': 'J’ai replanifié la tournée {sujet}',
  'revue.phrase.l_ancien_trajet_ne_passait_plus_sature_ou_coupe': '— l’ancien trajet ne passait plus : saturé, ou coupé.',
  'revue.phrase.la_facade_est_epinglee_pour_un_controle': '— la façade est épinglée pour un contrôle.',
  'revue.phrase.le_trajet_fait_plus_de_detours_que_d_habitude': '— le trajet fait plus de détours que d’habitude.',
  // non ratifiée — les 6 phrases ci-dessous (precursor_order, stash_reorder, repli) sont des propositions de
  //     l'atelier (`08-…` §1, `b95dd8c7`) : la ratification du 25/08 ne portait que sur les trois phrases dessinées.
  'revue.phrase.il_etait_plus_charge_ou_plus_regarde_que_d_habitude': '— il était plus chargé, ou plus regardé, que d’habitude.',
  'revue.phrase.j_ai_allege_le_stock': 'J’ai allégé le stock',
  'revue.phrase.j_ai_passe_la_commande_de_precurseurs': 'J’ai passé la commande de précurseurs',
  'revue.phrase.j_ai_suivi_la_routine': 'J’ai suivi la routine',
  'revue.phrase.le_marche_est_plus_tendu_que_d_habitude': '— le marché est plus tendu que d’habitude.',
  'revue.phrase.quelque_chose_s_ecartait_de_l_habitude': '— quelque chose s’écartait de l’habitude.',

  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 156 clés (press 9 · ambient 1 · news_beat 146) ═══
  // TD-633 (2026-09-06). Ces textes existaient, RATIFIÉS et symétriques EN/FR, depuis le 2026-09-02 —
  // et AUCUN n'était servi : le pont entre le dossier de traduction et cette table n'avait jamais été
  // construit. Le défaut n'était pas « des clés oubliées une par une », c'était un pont absent.
  // ⛔ Ils ne sont PAS recopiés à la main : `i18n_staging_pont.spec.ts` asserte que TOUTE clé ratifiée
  //    du dossier est servie dans les DEUX locales — la garde rougit le jour où quelqu'un ratifie une
  //    clé sans la câbler, c'est-à-dire exactement la situation d'aujourd'hui. Sans elle, ce bloc
  //    referme l'instant et rouvre au prochain ajout.
  // ⚠️ `PROPOSITIONS-non-ratifiees.*.json` (20) est EXCLU — « écrites de ma main, aucune source »
  //    (README du dossier). L'exclusion est dérivée du NOM DE FICHIER, jamais d'une liste recopiée.
  // ⚠️ `error.*` (63) est EXCLU aussi, et ce n'est pas un oubli : ces clés sont GÉNÉRÉES par
  //    `errorKeyTemplates()` depuis `ERROR_CODES` — une forme auto-invalidante qu'une liste statique
  //    remplacerait par du texte qui vieillit. Ce que le générateur produit comme TEXTE est une
  //    question ouverte, mesurée à part.
  'ambient.off_hours_drift.card':
    'Vos opérations en dehors des heures ouvrées montrent une chaleur élevée ces dernières semaines',
  'news_beat.cooper_affair.accident.body':
    'Pour {outlet}, {subject} à {district} relève de la défaillance malheureuse, sans intention.',
  'news_beat.cooper_affair.accident.brennar_daily_star.body':
    'L\'incident de {district} résulterait d\'un enchaînement de circonstances actuellement à l\'étude. Aucune intention n\'a été établie et il ne conviendrait pas, suggère-t-on, d\'en inférer une. Un examen paraîtrait devoir être conduit en temps utile ; aucun calendrier n\'a été communiqué.',
  'news_beat.cooper_affair.accident.brennar_daily_star.headline':
    'Un enchaînement de circonstances à {district}, actuellement à l\'étude',
  'news_beat.cooper_affair.accident.free_weekly.body':
    'La faute à personne, circulez, on passe à autre chose — c\'est la version officielle, en tout cas. Le quartier tient ses propres comptes, et le compte dit : encore un, toujours au même endroit. Sans blague.',
  'news_beat.cooper_affair.accident.free_weekly.headline':
    'Un accident. À {district}. Encore un',
  'news_beat.cooper_affair.accident.headline':
    'Ce qui a mal tourné : {subject} à {district}',
  'news_beat.cooper_affair.accident.tilbey_weekly.body':
    'À {district}, on balaie encore et on se demande encore comment. À la boulangerie comme à l\'arrêt de bus, le mot est le même : la guigne, celle qui tombe toujours sur les mêmes paillassons. « On rafistole et on attend la suivante », dit une commerçante.',
  'news_beat.cooper_affair.accident.tilbey_weekly.headline':
    'La guigne à {district} — celle qui choisit son adresse',
  'news_beat.cooper_affair.corruption.body':
    'Pour {outlet}, {subject} à {district} est une affaire de qui en a profité, et comment.',
  'news_beat.cooper_affair.corruption.brennar_daily_star.body':
    'Les questions relatives au dossier de {district} mériteraient un examen ; il reste à établir à qui la situation aura pu profiter. Un dispositif de suivi serait à l\'étude. Les services concernés, sollicités, n\'ont pas répondu.',
  'news_beat.cooper_affair.corruption.brennar_daily_star.headline':
    'Des questions relatives à {district} mériteraient un examen',
  'news_beat.cooper_affair.corruption.free_weekly.body':
    'L\'argent a circulé, les services aussi, et c\'est le quartier qui paie l\'addition. Dossier ouvert, dossier clos : rien trouvé. Ils ont cherché, qu\'ils disent. Tu m\'étonnes.',
  'news_beat.cooper_affair.corruption.free_weekly.headline':
    'Les mains propres, à {district} ? Tiens donc',
  'news_beat.cooper_affair.corruption.headline':
    'Des questions d\'influence suivent {subject} à {district}',
  'news_beat.cooper_affair.corruption.tilbey_weekly.body':
    'Faites le tour de {district} : du boulanger à l\'arrêt de bus, c\'est la même chose — l\'argent a circulé, et quelqu\'un s\'en est bien sorti. « On n\'est pas nés de la dernière pluie », dit un riverain. Des habitants ont écrit pour demander des comptes ; les courriers, à ce jour, sont restés sans réponse.',
  'news_beat.cooper_affair.corruption.tilbey_weekly.headline':
    'Du boulanger à l\'arrêt de bus, {district} pose la même question',
  'news_beat.cooper_affair.neighborhood_failure.body':
    'Pour {outlet}, {subject} s\'inscrit dans un abandon plus ancien à {district}.',
  'news_beat.cooper_affair.neighborhood_failure.brennar_daily_star.body':
    'L\'incident de {district} serait imputable à des difficultés qui lui seraient antérieures de plusieurs années. L\'entretien des services du secteur a fait l\'objet d\'examens antérieurs, dont les conclusions n\'ont pas été rendues publiques. Un nouvel examen serait à l\'étude.',
  'news_beat.cooper_affair.neighborhood_failure.brennar_daily_star.headline':
    'Les conditions à {district} seraient antérieures de plusieurs années à l\'incident',
  'news_beat.cooper_affair.neighborhood_failure.free_weekly.body':
    'Même quartier, même abandon, nouveau titre. Ils viendront prendre des photos, puis retour à la normale — et la normale, par ici, c\'est que rien ne marche. Même page la prochaine fois.',
  'news_beat.cooper_affair.neighborhood_failure.free_weekly.headline':
    '{district}, livré à lui-même. Comme d\'hab',
  'news_beat.cooper_affair.neighborhood_failure.headline':
    '{district} livré à lui-même, encore une fois',
  'news_beat.cooper_affair.neighborhood_failure.tilbey_weekly.body':
    'L\'histoire de {district} est plus vieille que l\'incident : des lignes de bus supprimées, des courriers sans réponse, des promesses passées à autre chose. Ici, on a demandé, deux fois, par écrit, et on a gardé les copies. Cette semaine la facture est tombée, et elle est tombée ici.',
  'news_beat.cooper_affair.neighborhood_failure.tilbey_weekly.headline':
    '{district} l\'avait vu venir — et l\'avait écrit',
  'news_beat.cooper_affair.organized_crime.body':
    'Pour {outlet}, {subject} à {district} porte la marque d\'une opération organisée.',
  'news_beat.cooper_affair.organized_crime.brennar_daily_star.body':
    'Certains aspects de l\'incident de {district} suggéreraient un degré de coordination ; une telle appréciation resterait préliminaire. Notre rédaction n\'a pas confirmé de manière indépendante les témoignages sur lesquels elle repose, et les services concernés n\'ont pas souhaité en dire davantage.',
  'news_beat.cooper_affair.organized_crime.brennar_daily_star.headline':
    'Des indices de coordination à {district} seraient en cours d\'appréciation',
  'news_beat.cooper_affair.organized_crime.free_weekly.body':
    'Quelqu\'un a monté le coup et tout le quartier le sait. Les seuls à parler encore de mystère ont une fiche de paie qui en dépend. Il y a une enquête, qu\'ils disent. En cours, qu\'ils disent. Tiens donc.',
  'news_beat.cooper_affair.organized_crime.free_weekly.headline':
    'Organisé ? À {district} ? Sans blague',
  'news_beat.cooper_affair.organized_crime.headline':
    'Une main connue derrière {subject} à {district}',
  'news_beat.cooper_affair.organized_crime.tilbey_weekly.body':
    'Plus d\'un voisin de {district} dit la même chose sur le pas de la porte : trop propre et trop rapide pour être le hasard. « Un travail pareil, ça se prépare », dit un commerçant, et il baisse la voix pour le dire. D\'autres gardent la porte fermée — ce qui dit aussi quelque chose.',
  'news_beat.cooper_affair.organized_crime.tilbey_weekly.headline':
    'Trop propre, trop rapide : {district} tire ses conclusions',
  'news_beat.digest.ambient_micro.body':
    '{outlet} relève une scène de rue : {subject}, {district}.',
  'news_beat.digest.ambient_micro.brennar_daily_star.body':
    'Un certain nombre de faits mineurs ont été consignés à {district} cette semaine. Aucun ne paraîtrait, à ce stade, appeler un examen complémentaire. Le relevé est conservé.',
  'news_beat.digest.ambient_micro.brennar_daily_star.headline':
    'Faits mineurs consignés à {district}',
  'news_beat.digest.ambient_micro.free_weekly.body':
    'Des petites choses. Des choses de coin de rue. Ce qu\'aucun officiel ne compte et que tout le quartier remarque. Noté ici, donc, puisqu\'il faut bien que quelqu\'un le fasse.',
  'news_beat.digest.ambient_micro.free_weekly.headline':
    'Pendant ce temps, à {district}',
  'news_beat.digest.ambient_micro.headline':
    'Petites histoires de {district}',
  'news_beat.digest.ambient_micro.tilbey_weekly.body':
    'Les petites choses de {district} cette semaine — le genre qui ne fait jamais la une et dont on parle tout le temps au comptoir.',
  'news_beat.digest.ambient_micro.tilbey_weekly.headline':
    'Petites nouvelles de {district}, qui restent des nouvelles',
  'news_beat.digest.live_ops.body':
    '{outlet} rapporte une évolution à l\'échelle de la ville : {subject}.',
  'news_beat.digest.live_ops.brennar_daily_star.body':
    'Un avis de portée générale circule dans l\'ensemble de la ville. Ses effets pratiques, pour autant qu\'ils puissent être appréciés à ce stade, paraîtraient variables ; il est recommandé aux habitants de se reporter à l\'avis lui-même.',
  'news_beat.digest.live_ops.brennar_daily_star.headline':
    'Un avis de portée générale est en circulation',
  'news_beat.digest.live_ops.free_weekly.body':
    'Encore un avis pour tout Brennar. Tout le monde est concerné ; personne n\'a été consulté. À l\'heure qu\'il est, il est sur tous les murs.',
  'news_beat.digest.live_ops.free_weekly.headline':
    'Nouvel avis. Toute la ville. C\'est noté',
  'news_beat.digest.live_ops.headline':
    'Un avis circule dans toute la ville',
  'news_beat.digest.live_ops.tilbey_weekly.body':
    'Un nouvel avis circule en ville. Ce qu\'il veut dire dépend, comme toujours, de la rue où l\'on habite. Ici, on compare déjà au comptoir.',
  'news_beat.digest.live_ops.tilbey_weekly.headline':
    'Un avis pour toute la ville, et ce qu\'il veut dire dans nos rues',
  'news_beat.digest.political.body':
    '{outlet} couvre une évolution politique : {subject}.',
  'news_beat.digest.political.brennar_daily_star.body':
    'Les travaux se poursuivraient à l\'hôtel de ville ; un communiqué serait attendu en temps utile. Les services concernés n\'ont pas souhaité en préjuger le contenu.',
  'news_beat.digest.political.brennar_daily_star.headline':
    'Les délibérations se poursuivraient à l\'hôtel de ville',
  'news_beat.digest.political.free_weekly.body':
    'Des réunions, des déclarations, la météo habituelle de l\'hôtel de ville. Ce que ça veut dire pour le quartier : on verra bien. Ce que le quartier en attend : pas grand-chose.',
  'news_beat.digest.political.free_weekly.headline':
    'L\'hôtel de ville a fait un truc',
  'news_beat.digest.political.headline':
    'Les affaires de l\'hôtel de ville, en bref',
  'news_beat.digest.political.tilbey_weekly.body':
    'Quelque chose bouge à l\'hôtel de ville, et ici on a appris à lire ça comme les marins lisent le temps. Quoi qu\'il tombe, ça tombe d\'abord sur des rues comme les nôtres.',
  'news_beat.digest.political.tilbey_weekly.headline':
    'L\'hôtel de ville s\'agite ; les quartiers en prennent note',
  'news_beat.digest.random_world.body':
    '{outlet} relève un trouble non résolu, en lien avec {subject}, à {district}.',
  'news_beat.digest.random_world.brennar_daily_star.body':
    'Un trouble à {district} demeurerait, semble-t-il, non résolu. Les circonstances seraient à l\'examen des services compétents ; aucun calendrier n\'a été communiqué.',
  'news_beat.digest.random_world.brennar_daily_star.headline':
    'Trouble consigné à {district}',
  'news_beat.digest.random_world.free_weekly.body':
    'Le truc de {district} ? Toujours en cours. Personne, là-haut, n\'a dit un mot. Le quartier n\'en attendait pas.',
  'news_beat.digest.random_world.free_weekly.headline':
    'Toujours en cours, à {district}',
  'news_beat.digest.random_world.headline':
    'Des troubles signalés à {district}',
  'news_beat.digest.random_world.tilbey_weekly.body':
    'Au comptoir, à {district}, on dit que les ennuis ne sont pas retombés. On veille les uns sur les autres et on attend, encore, que quelqu\'un dise quelque chose d\'officiel.',
  'news_beat.digest.random_world.tilbey_weekly.headline':
    'Les ennuis de {district} ne sont pas retombés, disent les voisins',
  'news_beat.folded_page.body':
    'Deux autres titres ont rapporté {subject} à {district} ; {outlet} n\'a pas publié l\'article.',
  'news_beat.folded_page.brennar_daily_star.body':
    'Deux journaux ont repris l\'affaire de {district} cette semaine. Le quotidien de référence de la ville n\'en était pas. Aucune explication n\'a été donnée — et aucune, on le suppose, ne figure au dossier.',
  'news_beat.folded_page.brennar_daily_star.headline':
    'La page pliée : {district} non mentionné dans le quotidien de référence',
  'news_beat.folded_page.free_weekly.body':
    'Deux titres ont publié l\'affaire de {district}. Le gratuit — celui qui imprime à peu près tout — ne l\'a pas fait. Quand cette page-là se tait, c\'est le silence qui est l\'affaire.',
  'news_beat.folded_page.free_weekly.headline':
    'La page pliée : même le gratuit saute {district}',
  'news_beat.folded_page.headline':
    'Ce que {outlet} n\'a pas couvert à {district}',
  'news_beat.folded_page.tilbey_weekly.body':
    'L\'affaire de {district} a paru dans deux journaux cette semaine — sauf dans celui qui est le plus proche de chez soi. L\'hebdo du quartier a gardé ses pages pour autre chose. Sur les pas de porte, on remarque ce genre de silence.',
  'news_beat.folded_page.tilbey_weekly.headline':
    'La page pliée : l\'hebdo de {district} regarde ailleurs',
  'news_beat.hindsight.follow_up.body':
    '{outlet} poursuit sa série rétrospective sur {subject}.',
  'news_beat.hindsight.follow_up.brennar_daily_star.body':
    'Poursuivant son examen, notre rédaction consigne de nouveaux détails de la période qui a précédé l\'événement. Comme précédemment, leur portée paraîtrait plus nette rétrospectivement qu\'elle n\'a pu l\'être sur le moment. L\'examen se poursuit.',
  'news_beat.hindsight.follow_up.brennar_daily_star.headline':
    'Nouvelles observations sur un dossier déjà examiné',
  'news_beat.hindsight.follow_up.free_weekly.body':
    'La rétrospective continue. D\'autres signes, la même forme : vus dans la rue, ratés là-haut. On pourrait régler sa montre dessus — si quoi que ce soit était à l\'heure par ici.',
  'news_beat.hindsight.follow_up.free_weekly.headline':
    'Encore des avertissements. Toujours personne pour les prendre',
  'news_beat.hindsight.follow_up.headline':
    'Encore sur {subject} : la rétrospective continue',
  'news_beat.hindsight.follow_up.tilbey_weekly.body':
    'La série continue, et les conversations sur le pas de la porte aussi : un voisin de plus, une petite chose de plus remarquée sur le moment et mise de côté. Morceau par morceau, ça finit par faire un tableau. Nous continuons de recueillir.',
  'news_beat.hindsight.follow_up.tilbey_weekly.headline':
    'Encore de ce dont le quartier se souvient',
  'news_beat.hindsight.op_ed.body':
    '{outlet} ouvre une rétrospective sur {subject}, retraçant des indices antérieurs qui, selon le journal, étaient là depuis le début.',
  'news_beat.hindsight.op_ed.brennar_daily_star.body':
    'Le dossier étant désormais clos, l\'examen des mois qui l\'ont précédé fait apparaître un certain nombre d\'indices qui, semble-t-il, étaient alors disponibles. Qu\'il eût été raisonnable d\'y donner suite est une question que notre rédaction ne prétend pas trancher. Un bilan plus complet serait souhaitable ; qu\'il soit entrepris reste à établir.',
  'news_beat.hindsight.op_ed.brennar_daily_star.headline':
    'Rétrospectivement : des indices auraient précédé le dossier',
  'news_beat.hindsight.op_ed.free_weekly.body':
    'Maintenant que c\'est fini, tout le monde sait lire les signes. Curieux, comme ça marche. Les signes étaient au coin de la rue depuis le début — demandez à ceux qui s\'y tiennent. Personne, là-haut, n\'a demandé à l\'époque. Ils demanderont maintenant : dans des rapports, au passé, et sans aucun nom dedans.',
  'news_beat.hindsight.op_ed.free_weekly.headline':
    'Les avertissements étaient là. Et tout le monde qui les ignorait aussi',
  'news_beat.hindsight.op_ed.headline':
    'Rétrospective : les signes avant {subject}',
  'news_beat.hindsight.op_ed.tilbey_weekly.body':
    'Avec le recul, les signes étaient en pleine lumière : les petits ennuis, le silence bizarre, les plaintes au comptoir qui n\'allaient jamais nulle part. Ici, tout le monde se souvient d\'avoir remarqué quelque chose. Personne ne se souvient qu\'on le lui ait demandé. Cette série, c\'est le quartier qui fait l\'addition — tard, mais noir sur blanc.',
  'news_beat.hindsight.op_ed.tilbey_weekly.headline':
    'Tout le monde a remarqué quelque chose. Personne n\'a été interrogé',
  'news_beat.slow_page.continuing.body':
    '{outlet} poursuit sa série au long cours sur {district}.',
  'news_beat.slow_page.continuing.brennar_daily_star.body':
    'L\'examen permanent que notre rédaction consacre aux conditions à {district} se poursuit. Le schéma précédemment relevé paraîtrait persister ; les services qui en ont été saisis n\'ont pas encore répondu. Le dossier, entre-temps, s\'épaissit.',
  'news_beat.slow_page.continuing.brennar_daily_star.headline':
    'Conditions à {district} : l\'examen se poursuit',
  'news_beat.slow_page.continuing.free_weekly.body':
    'La page au long cours continue de courir. {district} continue de fournir ; on continue d\'imprimer. Un officiel lit ça, on suppose. À la semaine prochaine.',
  'news_beat.slow_page.continuing.free_weekly.headline':
    '{district}, toujours là-dedans',
  'news_beat.slow_page.continuing.headline':
    'La page lente continue : {district}',
  'news_beat.slow_page.continuing.tilbey_weekly.body':
    'Une semaine de plus à {district}, une entrée de plus sur la page au long cours : les mêmes coins de rue, les mêmes plaintes, quelques noms nouveaux sur la même vieille liste. Maintenant, on nous arrête dans la rue pour l\'allonger. Nous notons tout.',
  'news_beat.slow_page.continuing.tilbey_weekly.headline':
    '{district}, une semaine de plus sur la même page',
  'news_beat.slow_page.opening.body':
    '{outlet} ouvre une série au long cours sur les conditions à {district}, avec d\'autres volets à suivre dans les semaines à venir.',
  'news_beat.slow_page.opening.brennar_daily_star.body':
    'Notre rédaction ouvre aujourd\'hui un examen permanent des conditions à {district}, lesquelles paraîtraient, au vu des indices disponibles, mériter une attention soutenue. Les volets suivront à intervalle hebdomadaire, selon ce que la matière justifiera.',
  'news_beat.slow_page.opening.brennar_daily_star.headline':
    'Ouverture d\'un examen permanent des conditions à {district}',
  'news_beat.slow_page.opening.free_weekly.body':
    'Nouvelle page au long cours sur {district}. Pourquoi : parce qu\'il n\'arrête pas de la mériter. On la tiendra tant que {district} fournira la matière, et {district} ne montre aucun signe d\'arrêt.',
  'news_beat.slow_page.opening.free_weekly.headline':
    '{district} a droit à sa page. Il l\'a bien méritée',
  'news_beat.slow_page.opening.headline':
    'La page lente : un récit au long cours prend forme à {district}',
  'news_beat.slow_page.opening.tilbey_weekly.body':
    'À partir de cette semaine, {district} a sa propre page au long cours : les boutiques, les pas de porte, les choses qui n\'arrêtent pas d\'attendre leur réparation. Pas parce qu\'il s\'est passé une grosse chose — parce que beaucoup de petites choses n\'arrêtent pas d\'arriver aux mêmes gens. La même page, chaque semaine.',
  'news_beat.slow_page.opening.tilbey_weekly.headline':
    '{district}, semaine un : nous allons continuer de regarder',
  'news_beat.sourceless_beat.body':
    '{outlet} décrit un schéma qui prend forme à {district} — aucun incident précis n\'est cité.',
  'news_beat.sourceless_beat.brennar_daily_star.body':
    'Prises ensemble, les impressions récentes venues de {district} paraîtraient décrire un schéma, sans qu\'aucun fait précis ait à être cité pour l\'établir. Les observateurs du secteur partageraient cette appréciation. Un examen complémentaire paraîtrait justifié.',
  'news_beat.sourceless_beat.brennar_daily_star.headline':
    'Un schéma paraîtrait se dessiner à {district}',
  'news_beat.sourceless_beat.free_weekly.body':
    'Aucun incident à montrer du doigt, aucun nom, aucune adresse. Juste une humeur dans le quartier — et le quartier ne se trompe jamais. Enfin, c\'est ce qu\'on dit. Prenez-le pour ce que ça vaut ; c\'est ce qu\'on a fait.',
  'news_beat.sourceless_beat.free_weekly.headline':
    'Il se passe un truc à {district}. Demandez à n\'importe qui',
  'news_beat.sourceless_beat.headline':
    'Un schéma, dit {outlet}, à {district}',
  'news_beat.sourceless_beat.tilbey_weekly.body':
    'Personne ne peut désigner une chose précise, mais faites le tour de {district} — au comptoir, à l\'arrêt de bus — et le sentiment est le même : quelque chose a bougé. Rien qu\'on puisse vraiment rapporter. Tout ce qu\'on peut sentir.',
  'news_beat.sourceless_beat.tilbey_weekly.headline':
    'Quelque chose cloche à {district}, et les gens le sentent',
  'news_beat.three_outlet_storm.episodic.body':
    '{outlet} centre sa couverture sur les personnes directement touchées par {subject} à {district}.',
  'news_beat.three_outlet_storm.episodic.brennar_daily_star.body':
    'Une reconstitution de l\'incident de {district}, pour autant que les témoignages disponibles en permettent une, décrirait un fait isolé ; il serait prématuré d\'en apprécier une portée plus large. Les services concernés ont été sollicités.',
  'news_beat.three_outlet_storm.episodic.brennar_daily_star.headline':
    'Un état des faits sur l\'incident de {district}',
  'news_beat.three_outlet_storm.episodic.free_weekly.body':
    'Une famille, un gâchis, un incident — voilà toute l\'histoire, qu\'ils disent. Pas de schéma, pas de contexte, pas de questions là-haut. Le quartier le rangera avec tous les autres cas isolés.',
  'news_beat.three_outlet_storm.episodic.free_weekly.headline':
    'Un de plus pour {district}',
  'news_beat.three_outlet_storm.episodic.headline':
    'Une famille, une histoire : {subject} à {district}',
  'news_beat.three_outlet_storm.episodic.tilbey_weekly.body':
    'Derrière une porte, à {district}, une famille recolle une semaine. Les voisins ont apporté du pain et gardé les enfants une après-midi. « On se débrouille », dit la mère — comme on le dit quand on a déjà eu à le faire.',
  'news_beat.three_outlet_storm.episodic.tilbey_weekly.headline':
    'Une porte à {district} : ce que l\'incident a laissé',
  'news_beat.three_outlet_storm.human_interest.body':
    '{outlet} suit les personnes les plus touchées par {subject} à {district}.',
  'news_beat.three_outlet_storm.human_interest.brennar_daily_star.body':
    'Pour les habitants de {district}, les suites ont entraîné une série d\'ajustements pratiques, décrits à notre rédaction comme considérables. Des mesures d\'accompagnement seraient à l\'examen des services compétents.',
  'news_beat.three_outlet_storm.human_interest.brennar_daily_star.headline':
    'Les habitants de {district} s\'adaptent à des circonstances modifiées',
  'news_beat.three_outlet_storm.human_interest.free_weekly.body':
    'Pas de commission, pas de plan, pas de déclaration. Juste des voisins qui font ce que font les voisins pendant que tout ce qui est officiel reste très occupé à être injoignable. Quelqu\'un devrait le noter. Aucun officiel ne le fera.',
  'news_beat.three_outlet_storm.human_interest.free_weekly.headline':
    'À {district}, on se débrouille. Comme toujours',
  'news_beat.three_outlet_storm.human_interest.headline':
    'Une histoire de quartier : {subject}',
  'news_beat.three_outlet_storm.human_interest.tilbey_weekly.body':
    'À {district} cette semaine, les portes sont restées ouvertes un peu plus longtemps que d\'habitude. Le boulanger a mis de côté les invendus, une voisine à la retraite accompagne les enfants à l\'école, et personne n\'appelle ça de l\'aide. « On le fait, c\'est tout », dit-elle. C\'est toute la citation, et elle suffit.',
  'news_beat.three_outlet_storm.human_interest.tilbey_weekly.headline':
    'À {district}, la cafetière reste chaude',
  'news_beat.three_outlet_storm.scandal.body':
    '{outlet} pose {subject} comme une question de responsabilité.',
  'news_beat.three_outlet_storm.scandal.brennar_daily_star.body':
    'L\'incident de {district} a fait naître des questions de responsabilité qui, semble-t-il, demeurent ouvertes. Quel service en porte la charge n\'a pu être établi à l\'heure du bouclage. Les demandes d\'éclaircissement feraient l\'objet d\'un traitement.',
  'news_beat.three_outlet_storm.scandal.brennar_daily_star.headline':
    'Des questions de responsabilité resteraient ouvertes à {district}',
  'news_beat.three_outlet_storm.scandal.free_weekly.body':
    'Quelqu\'un est responsable. Il y a toujours quelqu\'un, et ce n\'est jamais personne. Demandez là-haut, c\'est la procédure ; demandez la procédure, c\'est là-haut. Et ça tourne. Dans les deux cas, c\'est le quartier qui reste avec l\'addition.',
  'news_beat.three_outlet_storm.scandal.free_weekly.headline':
    'Qui a signé ? {district} a demandé. Personne, apparemment',
  'news_beat.three_outlet_storm.scandal.headline':
    'À qui la responsabilité : {subject}',
  'news_beat.three_outlet_storm.scandal.tilbey_weekly.body':
    'Quelqu\'un a approuvé, quelqu\'un a signé, et personne à {district} n\'obtient l\'un ou l\'autre nom. Les commerçants ont commencé une liste de tous ceux à qui ils ont demandé. La liste s\'allonge, et elle n\'est faite que de questions.',
  'news_beat.three_outlet_storm.scandal.tilbey_weekly.headline':
    'Quelqu\'un a signé — {district} aimerait lui parler',
  'news_beat.three_outlet_storm.thematic.body':
    '{outlet} replace {subject} dans un contexte qui traverse la ville, et non dans un incident isolé.',
  'news_beat.three_outlet_storm.thematic.brennar_daily_star.body':
    'Rapporté à des faits comparables ailleurs dans Brennar, l\'incident de {district} paraîtrait s\'accorder à un schéma plus large, dont les contours restent à définir. Une appréciation à l\'échelle de la ville paraîtrait justifiée ; aucune n\'a été annoncée.',
  'news_beat.three_outlet_storm.thematic.brennar_daily_star.headline':
    'L\'incident de {district} s\'accorderait à des tendances plus larges',
  'news_beat.three_outlet_storm.thematic.free_weekly.body':
    'La même histoire dans toute la ville, une adresse différente chaque semaine. Dites que c\'est un schéma et un officiel vous dira que vous dramatisez. Très bien. Le quartier, lui, appelle ça l\'ordinaire.',
  'news_beat.three_outlet_storm.thematic.free_weekly.headline':
    '{district} aujourd\'hui. Ailleurs demain',
  'news_beat.three_outlet_storm.thematic.headline':
    'Un schéma qui traverse la ville derrière {subject}',
  'news_beat.three_outlet_storm.thematic.tilbey_weekly.body':
    'Ce qui s\'est passé à {district} s\'est passé, à sa manière, quelques arrêts de bus plus loin. Les mêmes plaintes au comptoir, les mêmes courriers, la même attente. Au marché, on compare maintenant, et les récits concordent.',
  'news_beat.three_outlet_storm.thematic.tilbey_weekly.headline':
    '{district} n\'est pas le seul — demandez au quartier d\'à côté',
  'news_beat.wire_day.body':
    'La même dépêche parvient ce matin à {outlet}, identique à celle des autres titres : {subject}.',
  'news_beat.wire_day.headline':
    '{outlet} publie la dépêche : {subject}',
  'press.journalist.dunmore.name':
    'Hettie Dunmore',
  'press.journalist.marens.name':
    'Juna Marens',
  'press.journalist.okonkwo.name':
    'Ifeoma Okonkwo',
  'press.journalist.praile.name':
    'Denis Praile',
  'press.journalist.tellan.name':
    'Emeric Tellan',
  'press.journalist.vasse.name':
    'Solene Vasse',
  'press.outlet.brennar_daily_star.name':
    'Brennar Daily Star',
  'press.outlet.free_weekly.name':
    'The Free Weekly',
  'press.outlet.tilbey_weekly.name':
    'The Tilbey Weekly',

  // ═══ AXE 4 — 52 clés CONSTRUITES à l'exécution (TD-633, 2026-09-06) ═══
  // Elles n'ont AUCUN littéral dans `src` : le back les fabrique par gabarit depuis une valeur de
  // colonne. Aucun balayage de littéraux ne peut donc les voir — c'est la même cécité que celle qui
  // faisait rendre « 0 non servie » à l'instrument.
  // ⛔ VÉRIFIÉ AVANT DE SERVIR, famille par famille, contre le DOMAINE réel du back — parce que
  //    servir une clé jamais construite est la faute symétrique, et elle ne se voit nulle part :
  //      ambient.micro_event.*    6/6   == pgEnum `ambient_micro_event_kind`
  //      random_world.template.*  14/14 == `RANDOM_WORLD_TEMPLATE_REGISTRY`
  //      political.event.*        12/12 == E-POL-01..12
  //      news_beat.frame_tag.*    8/8   == les 8 valeurs de `beat.frame` (docstring de la projection)
  //      random_world.coupling.*  2     forme `…coupling.pair.<pair_key>` — le segment `.pair.` EST
  //                                     dans la clé construite, une clé sans lui n'aurait rien servi
  //      live_ops.event.*         10/11 ⚠️ voir ci-dessous
  // ⚠️ `live_ops.event.E-LO-11` EXISTE côté back et n'a AUCUN TEXTE RATIFIÉ : le dossier de staging
  //    a été écrit le 2026-09-02 et l'événement lui est postérieur, ou il a été manqué. On ne
  //    l'invente pas ici — il part sur la liste de rédaction, et `i18n_staging_pont.spec.ts` épingle
  //    le trou à EXACTEMENT 1 pour qu'il rougisse le jour où quelqu'un l'écrit ou ajoute un E-LO-12.
  'ambient.micro_event.bar_rumor':
    'une rumeur de comptoir',
  'ambient.micro_event.building_inspection':
    'une inspection d\'immeuble',
  'ambient.micro_event.corner_fight':
    'une bagarre au coin de la rue',
  'ambient.micro_event.delayed_shipment':
    'une livraison en retard',
  'ambient.micro_event.noisy_block':
    'un pâté de maisons bruyant',
  'ambient.micro_event.stalled_tram':
    'un tramway en panne',
  'live_ops.event.E-LO-01':
    'le coup de filet dans toute la ville',
  'live_ops.event.E-LO-02':
    'la grève des docks de Tidewater',
  'live_ops.event.E-LO-03':
    'la poussée d\'expansion de Coil',
  'live_ops.event.E-LO-04':
    'une anomalie du marché des substances',
  'live_ops.event.E-LO-05':
    'la journée des investisseurs à Glass',
  'live_ops.event.E-LO-06':
    'la contre-opération d\'un rival',
  'live_ops.event.E-LO-07':
    'l\'alerte au dégel de la cohésion',
  'live_ops.event.E-LO-08':
    'le surplus de main-d\'œuvre à Saltline',
  'live_ops.event.E-LO-09':
    'les préparatifs de la Semaine de compression',
  'live_ops.event.E-LO-10':
    'la fenêtre d\'audit structurel annuel',
  'news_beat.frame_tag.accident':
    'angle accident',
  'news_beat.frame_tag.corruption':
    'angle corruption',
  'news_beat.frame_tag.episodic':
    'angle cas isolé',
  'news_beat.frame_tag.human_interest':
    'angle humain',
  'news_beat.frame_tag.neighborhood_failure':
    'angle abandon du quartier',
  'news_beat.frame_tag.organized_crime':
    'angle crime organisé',
  'news_beat.frame_tag.scandal':
    'angle scandale',
  'news_beat.frame_tag.thematic':
    'angle de fond',
  'political.event.E-POL-01':
    'la campagne électorale',
  'political.event.E-POL-02':
    'le budget de la police voté à la hausse',
  'political.event.E-POL-03':
    'le budget de la police revu à la baisse',
  'political.event.E-POL-04':
    'le reclassement des substances',
  'political.event.E-POL-05':
    'la campagne d\'influence d\'un rival',
  'political.event.E-POL-06':
    'l\'initiative anticorruption',
  'political.event.E-POL-07':
    'l\'assouplissement du zonage industriel',
  'political.event.E-POL-08':
    'le coup de filet sur les quais',
  'political.event.E-POL-09':
    'le scandale de l\'hôtel de ville',
  'political.event.E-POL-10':
    'la victoire de l\'opposition à la mairie',
  'political.event.E-POL-11':
    'l\'arrivée d\'une brigade fédérale',
  'political.event.E-POL-12':
    'l\'arrivée d\'un élu de quartier bienveillant',
  'random_world.coupling.pair.erlang_stash__deal_lek':
    'ce que tient votre planque et ce que la rue vient disputer',
  'random_world.coupling.pair.offhours_hum__bpd_attention':
    'travailler en dehors des heures et l\'endroit où la police regarde ensuite',
  'random_world.template.absconding':
    'la disparition',
  'random_world.template.apparent_recovery':
    'l\'embellie apparente',
  'random_world.template.cry_wolf_fatigue':
    'la lassitude des fausses alertes',
  'random_world.template.dialect_drift':
    'la dérive des usages',
  'random_world.template.festival_misread':
    'le malentendu de la fête',
  'random_world.template.halgren_tannery_hailstorm':
    'la grêle sur la tannerie Halgren',
  'random_world.template.hollow_at_the_corner':
    'le vide au coin de la rue',
  'random_world.template.permanent_residue':
    'le résidu qui ne part plus',
  'random_world.template.quorum_on_stadler_row':
    'le basculement de Stadler Row',
  'random_world.template.risk_compensation':
    'la prise de risque compensatoire',
  'random_world.template.sideways_failure':
    'la panne de biais',
  'random_world.template.standing_ground':
    'le quartier qui tient',
  'random_world.template.triage_night':
    'la nuit de triage',
  'random_world.template.trough_cycle':
    'le creux',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 2ᵉ passe, 2026-09-22 : 40 clés (decision_type 24 · hl_option 16) ═══
  // TD-633, même mécanisme que le bloc du 2026-09-06. Ces 40 phrases ont été ÉCRITES et ratifiées le
  // 2026-09-07 (`README-decision-type-hl-option.md` : ère 1B, paires d'options symétriques, asymétrie
  // FR/EN 0) et `i18n_staging_pont.spec.ts` les comptait « ratifiées non servies » : 40, hors axe 4.
  // ⛔ Recopiées depuis `decision_type.*.json` et `hl_option.*.json` par script, jamais réécrites ici —
  //    le texte joueur se ratifie dans le dossier, il ne s'invente pas dans la table.
  // ⚠️ Le même README classe HORS de ce pont, et on ne les sert donc pas : `card.test.*` (2, clés de
  //    TEST) et `staff.player.*` (2, clés de PERMISSION du back-office, catalogue RBAC — pas de l'i18n).
  'decision.type.DAMAGED_BUILDING_REPAIR':
    'Un local à remettre en état',
  'decision.type.SEVERED_ROUTE_REBUILD':
    'Une route coupée',
  'decision.type.ESCALATION_BACKLOG_REVIEW':
    'Des remontées en attente',
  'decision.type.AUTONOMY_REPORTS_PENDING':
    'Des rapports à lire',
  'decision.type.LEGAL_CASE_DECISION':
    'Une affaire chez le juge',
  'decision.type.BACKPRESSURE_CRITICAL_TRACE':
    'Un engorgement critique',
  'decision.type.MYCELIAL_STRESSED_LEG':
    'Un maillon sous tension',
  'decision.type.CUE_CASCADE_FALLOUT':
    'Une cascade de signaux',
  'decision.type.BUILDING_ACQUISITION':
    'Acquisition d\'un local',
  'decision.type.BUILDING_CONVERT':
    'Reconversion d\'un local',
  'decision.type.LIEUTENANT_RECRUIT':
    'Recrutement d\'un lieutenant',
  'decision.type.LIEUTENANT_ROLE_REASSIGN':
    'Changement de poste',
  'decision.type.BEHAVIOR_SCRIPT_REPLACE':
    'Nouvelles consignes permanentes',
  'decision.type.AUTONOMY_TIER_CHANGE':
    'Relèvement du plafond d\'autonomie',
  'decision.type.TASK_RETIREMENT':
    'Passation définitive d\'une tâche',
  'decision.type.TASK_RECALL':
    'Reprise en main d\'une tâche',
  'decision.type.ORG_TOPOLOGY_CHANGE':
    'Remaniement de l\'organigramme',
  'decision.type.SINUOSITY_FULL_RESET':
    'Refonte complète d\'un tracé',
  'decision.type.MYCELIAL_STRUCTURAL_REINFORCE':
    'Renforcement de fond du réseau',
  'decision.type.NODE_DECOMMISSION':
    'Mise hors service d\'un point',
  'decision.type.SUBSTANCE_UNLOCK':
    'Ouverture d\'une filière',
  'decision.type.RECRUITMENT_FINALIZE':
    'Embauche définitive',
  'decision.type.NAMED_SEQUENCE_SAVE':
    'Enregistrement d\'une séquence',
  'decision.type.CAPABILITY_ADOPT':
    'Adoption d\'un savoir-faire',
  'hl.option.autonomy_reports.review_now':
    'Lire maintenant',
  'hl.option.autonomy_reports.leave_pending':
    'Laisser en attente',
  'hl.option.backpressure_critical_trace.trace_now':
    'Remonter la piste',
  'hl.option.backpressure_critical_trace.leave_pending':
    'Laisser en attente',
  'hl.option.cue_cascade_fallout.review_now':
    'Examiner maintenant',
  'hl.option.cue_cascade_fallout.leave_pending':
    'Laisser en attente',
  'hl.option.damaged_building.repair_via_queue':
    'Mettre en réparation',
  'hl.option.damaged_building.leave_damaged':
    'Laisser en l\'état',
  'hl.option.escalation_backlog.review_now':
    'Traiter maintenant',
  'hl.option.escalation_backlog.leave_pending':
    'Laisser en attente',
  'hl.option.legal_case.accept_plea_deal':
    'Accepter l\'arrangement',
  'hl.option.legal_case.let_ride':
    'Laisser aller au procès',
  'hl.option.mycelial_stressed_leg.maintain_now':
    'Entretenir maintenant',
  'hl.option.mycelial_stressed_leg.leave_stressed':
    'Laisser sous tension',
  'hl.option.severed_route.reroute_now':
    'Détourner maintenant',
  'hl.option.severed_route.leave_severed':
    'Laisser la route coupée',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 3ᵉ passe, 2026-09-22 : 1 clé (random_world 1) ═══
  // Texte ÉCRIT PAR L'ATELIER le 2026-09-22 (dépôt client, branche da/2026-09-22, commit ee3dd85b,
  // `Tools/atelier-2026-09-22/03-carte-couplage-fr-en.md`) : une note causale tournée vers l'arrière,
  // aucun chiffre ni nom de système ni de quartier (§3.6/§6.1, R2.2). Il REMPLACE le brouillon de
  // `PROPOSITIONS-non-ratifiees.*.json` (20 → 19), ratifié dans `random_world.{en,fr}.json`, et il
  // est recopié d'ici — jamais réécrit. Le producteur estampille désormais `event_descriptor_i18n`
  // (random-world-exception-producer.service.ts), sinon le client ne le résoudrait jamais (forme F).
  'random_world.coupling_discovery.card':
    'Un quartier a bougé, et le quartier d\'à côté a suivi — ces deux-là tiennent ensemble, maintenant vous le savez.',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 4ᵉ passe, 2026-09-22 : 18 clés (autonomy 18) ═══
  // Libellés des deux options d'un rapport d'autonomie (écran ㉔), ÉCRITS PAR L'ATELIER le 2026-09-22
  // (dépôt client, da/2026-09-22, commit 5be993e9, `Tools/atelier-2026-09-22/05-autonomie-18-cles.md`) :
  // A = agir maintenant, B = l'alternative prudente ; pas de mot de système ; FR/EN de même registre.
  // Ils REMPLACENT les brouillons de `PROPOSITIONS-non-ratifiees.*.json` (19 → 1 ; les écarts sont
  // justifiés un par un dans le document), ratifiés dans `autonomy.{en,fr}.json`, recopiés d'ici par
  // script. ⚠️ Casse et accents normaux : les capitales sans accent du cadre ㉔ sont le rendu du client.
  'autonomy.cook.now':
    'Cuisiner maintenant',
  'autonomy.cook.refine':
    'Affiner d\'abord',
  'autonomy.launder.baseline':
    'Injecter comme d\'habitude',
  'autonomy.launder.safe':
    'Injecter prudemment',
  'autonomy.book.max':
    'Tout déposer',
  'autonomy.book.reserve':
    'Garder une réserve',
  'autonomy.sec.repair':
    'Réparer maintenant',
  'autonomy.sec.defer':
    'Remettre à plus tard',
  'autonomy.log.dispatch':
    'Expédier maintenant',
  'autonomy.log.hold':
    'Retenir le chargement',
  'autonomy.dist.collect':
    'Ramasser maintenant',
  'autonomy.dist.letride':
    'Laisser courir',
  'autonomy.muscle.assault':
    'Leur tomber dessus',
  'autonomy.muscle.wait':
    'Attendre le bon moment',
  'autonomy.intel.observe':
    'Les observer de près',
  'autonomy.intel.wait':
    'Ne rien faire pour l\'instant',
  'autonomy.facility.schedule_now':
    'Faire l\'entretien maintenant',
  'autonomy.facility.wait':
    'Laisser pour l\'instant',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 5ᵉ passe, 2026-09-22 : 1 clé (news_beat 1) ═══
  // `{subject}` neutre des deux gabarits de wire-day déjà servis (EN wire-day.ts:100-102). Texte de
  // l'atelier, 2026-09-22 : un wire-DAY, et l'outlet porte déjà « la ville » — le brouillon se trompait
  // d'unité et doublonnait. Ratifié dans `news_beat.{en,fr}.json` (146 → 147) ; PROPOSITIONS 1 → 0.
  'news_beat.wire_day.subject_neutral':
    'une journée ordinaire à Brennar',
  // ═══ PONT DEPUIS `docs/content/i18n-staging/` — 6ᵉ passe, 2026-09-22 : 71 clés (building_bands 68 · chrome_bands 3) ═══
  // Les BANDES servies par le back que le client traduisait en dur (annexe (b) de l'atelier,
  // `Tools/atelier-2026-09-22/04-libelles-anglais.md`, cf25eb4b : 15 fonctions de la fiche ② + la pression du chrome).
  // Piège TD-643 à l'envers : LA CLÉ EXISTE AU BACK D'ABORD, le client câblera `Libelle.De` dessus. Chaque
  // clé est `<famille>.<membre servi en minuscules>` — dérivée du DOMAINE de la projection (SeizedAmountBand,
  // RepairCostBand, LabTierBand, AshPurityBand, AppointmentStatusBand, AppointmentPayoutBand, GrowStageBand,
  // HusbandryBand, precursor_type, HubTierBand, MoneyHoldingTierBand, RosterBand, CapacityBand,
  // available_vehicles, HeldBand, building_operational_type, QueuePressureBand), jamais du mot anglais du
  // client. EN = le mot que le client affichait ; FR = ratifié par l'atelier. Recopié depuis
  // `building_bands.{en,fr}.json` et `chrome_bands.{en,fr}.json` par script.
  // ⚠️ SANS clé, parce que SANS texte ratifié (dit, pas inventé) : `building.type.press_house` / `.office`,
  //    `building.vehicle.refrigerated_van`, les membres `NONE` de lab_tier/hub_tier/money_holding_tier/roster/
  //    capacity (le client n'affiche rien), et `TransferAmountLabel` — aucune bande servie ne le porte.
  'building.type.lab':
    'Labo',
  'building.type.stash':
    'Réserve',
  'building.type.front_shop':
    'Commerce-écran',
  'building.type.cash_safehouse':
    'Planque',
  'building.type.dealer_spot_front':
    'Coin de vente',
  'building.type.specialized_lab':
    'Labo spécialisé',
  'building.type.refinery':
    'Raffinerie',
  'building.type.grow_house':
    'Serre',
  'building.type.distribution_hub':
    'Relais',
  'building.type.money_holding':
    'Banque',
  'building.seized_amount.high':
    'une grosse prise',
  'building.seized_amount.moderate':
    'une prise moyenne',
  'building.seized_amount.low':
    'une petite prise',
  'building.seized_amount.none':
    'rien',
  'building.repair_cost.major':
    'gros frais',
  'building.repair_cost.moderate':
    'frais moyens',
  'building.repair_cost.minor':
    'petits frais',
  'building.repair_cost.none':
    'sans frais',
  'building.lab_tier.basic':
    'Simple',
  'building.lab_tier.refined':
    'Affiné',
  'building.lab_tier.master':
    'Maître',
  'building.purity.cut':
    'Coupée',
  'building.purity.standard':
    'Courante',
  'building.purity.pure':
    'Pure',
  'building.purity.crystalline':
    'Cristalline',
  'building.appointment.scheduled':
    'Réservé',
  'building.appointment.honored':
    'Honoré',
  'building.appointment.expired':
    'Passé',
  'building.payout.pending':
    'En attente',
  'building.payout.none':
    'Perdu',
  'building.payout.modest':
    'Modeste',
  'building.payout.fair':
    'Correct',
  'building.payout.strong':
    'Fort',
  'building.payout.premium':
    'Exceptionnel',
  'building.grow_stage.early':
    'Début',
  'building.grow_stage.mid':
    'Milieu',
  'building.grow_stage.late':
    'Fin',
  'building.grow_stage.done':
    'À récolter',
  'building.husbandry.withered':
    'Flétrie',
  'building.husbandry.on_track':
    'En bonne voie',
  'building.husbandry.thriving':
    'Florissante',
  'building.precursor.verdant_root_extract':
    'Racine verdoyante',
  'building.precursor.lull_resin':
    'Résine de lull',
  'building.precursor.glass_lily':
    'Lys de verre',
  'building.hub_tier.small':
    'Petit',
  'building.hub_tier.medium':
    'Moyen',
  'building.hub_tier.large':
    'Grand',
  'building.hub_tier.major':
    'Majeur',
  'building.hub_tier.max':
    'Maximal',
  'building.money_holding_tier.small':
    'Petit',
  'building.money_holding_tier.medium':
    'Moyen',
  'building.money_holding_tier.large':
    'Grand',
  'building.money_holding_tier.major':
    'Majeur',
  'building.money_holding_tier.max':
    'Maximal',
  'building.roster.open':
    'Ouverte',
  'building.roster.busy':
    'Occupée',
  'building.roster.full':
    'Pleine',
  'building.capacity.open':
    'Ouverte',
  'building.capacity.busy':
    'Occupée',
  'building.capacity.full':
    'Pleine',
  'building.vehicle.foot':
    'À pied',
  'building.vehicle.bike':
    'Vélo',
  'building.vehicle.car':
    'Voiture',
  'building.held.none':
    'Vide',
  'building.held.low':
    'Peu',
  'building.held.moderate':
    'Moyen',
  'building.held.high':
    'Beaucoup',
  'building.held.massive':
    'Énorme',
  'exceptions.queue_pressure.normal':
    'normale',
  'exceptions.queue_pressure.warning':
    'tendue',
  'exceptions.queue_pressure.saturated':
    'saturée',
};

/**
 * The ch18 error-key entries. F1 / R-EH-2: every `user_facing_i18n_key` the protocol layer emits
 * (error-codes.ts) MUST be a registered key — the back emits the KEY, the client renders the message.
 * We derive the EN templates straight from the canonical ERROR_CODES registry so the two can never
 * drift (single source of truth). The default values are functional placeholders (real copy passes
 * the tone-bible checklist at translation time — DEFERRED).
 */

// ═══ TEXTE D'ERREUR RATIFIÉ — TD-635 (2026-09-06) ═══════════════════════════════════════════════
//
// ⛔ CE QUE CE BLOC CORRIGE. `errorKeyTemplates()` fabriquait le texte en humanisant le dernier
// segment de la clé — son propre commentaire disait « placeholder ». Résultat SERVI, et IDENTIQUE
// en `en` et en `fr` : « Json parse error. », « Request id missing. ». **Un joueur français lisait un
// identifiant machine anglais à chaque erreur**, dans un jeu dont tout le reste est en français.
//
// ⛔⛔ ET LE CORRECTIF N'EST PAS DE REMPLACER LE GÉNÉRATEUR PAR UNE LISTE. Le générateur dérive ses
// clés des `ERROR_CODES` : c'est une forme AUTO-INVALIDANTE — un code d'erreur neuf obtient sa clé
// sans que personne y pense. 63 clés statiques la remplaceraient par du texte qui vieillit.
// ⇒ On l'ALIMENTE : il consulte cette table, et RETOMBE sur l'humanisation pour un code qui n'a pas
//   encore de texte ratifié. La couverture automatique est conservée, le texte devient réel.
//
// Source : `docs/content/i18n-staging/error.{en,fr}.json`, ratifiés le 2026-09-02. Recopiés, jamais
// réécrits — mesuré à l'insertion : 64 codes, 63 textes ratifiés, 0 orphelin, et AUCUN `fr` égal à
// son `en`. Le seul code sans texte est épinglé par la falsifiable (voir `error_texte_ratifie.spec`).
const ERROR_TEXT_RATIFIED: Readonly<Record<LocaleCode, Readonly<Record<string, string>>>> = {
  en: {
    'error.api_version.sunset':
      'This version of the game is no longer supported. Install the current version to keep playing.',
    'error.auth.account_banned':
      'Your account has been closed.',
    'error.auth.account_not_found':
      'No account matches those details.',
    'error.auth.account_suspended':
      'Your account is suspended. Contact support to have it reviewed.',
    'error.auth.invalid_credentials':
      'Those credentials were not recognised. Check them and sign in again.',
    'error.auth.refresh_expired':
      'Your session has ended. Sign in again.',
    'error.auth.refresh_invalid':
      'Your session could not be renewed. Sign in again.',
    'error.auth.session_expired':
      'Your session has expired and is being renewed.',
    'error.auth.token_invalid_signature':
      'Your session could not be verified and is being renewed.',
    'error.auth.token_missing':
      'Your session needs to be renewed.',
    'error.authz.audience_mismatch':
      'This session does not have access to that.',
    'error.authz.permission_denied':
      'You do not have permission for that.',
    'error.client.build_too_old':
      'Your version of the game is out of date. Update it to continue.',
    'error.compression.budget_exhausted':
      'There is no room left for this today. Take it up again tomorrow.',
    'error.compression.deferral_exhausted':
      'You have put this off as many times as you can. Decide now.',
    'error.compression.forced_engagement':
      'This one will not wait any longer. Deal with it before anything else.',
    'error.core_loops.structural_cap_exhausted':
      'You have used your structural decision for today. Take it up again tomorrow.',
    'error.cue_stack.already_active':
      'That cue is already running. Wait for it to finish.',
    'error.cue_stack.dependency_cycle':
      'Those cues depend on each other in a circle. Break the loop and set the order again.',
    'error.cue_stack.settling_compound_required':
      'This needs a settling compound in place first. Set one and come back.',
    'error.cue_stack.slot_target_invalid':
      'That cue cannot point at that target. Pick another target.',
    'error.cue_stack.slot_type_reserved':
      'That slot is reserved for another kind of cue. Choose a different slot.',
    'error.demolition.confirm_required':
      'Razing a site cannot be undone. Confirm to go ahead.',
    'error.demolition.last_node':
      'That is the last one holding the chain together. Build a replacement before taking it down.',
    'error.demolition.lieutenant_assigned':
      'A lieutenant is still assigned there. Reassign them first.',
    'error.demolition.replacement_option_already_closed':
      'That replacement is no longer on the table. Choose from what is left.',
    'error.envelope.json_parse_error':
      'That request could not be read.',
    'error.envelope.payload_too_large':
      'That request was too large to accept.',
    'error.envelope.request_id_missing':
      'That request was incomplete and could not be processed.',
    'error.http.method_not_allowed':
      'That action is not available here.',
    'error.idempotency.key_conflict':
      'That action was already sent with different contents. Nothing was changed.',
    'error.idempotency.key_format_invalid':
      'That action was not sent correctly, so it was not carried out.',
    'error.idempotency.key_missing':
      'That action could not be sent safely, so it was not carried out.',
    'error.idempotency.replay_mismatch':
      'That action did not match the one already recorded. Nothing was changed.',
    'error.idempotency.request_in_flight':
      'That action is still being processed. It will finish in a moment.',
    'error.internal.unexpected':
      'Something went wrong on our side. It will be tried again in a moment.',
    'error.meta_progression.capability_not_dismissible':
      'This one stays. It cannot be dismissed.',
    'error.meta_progression.category_delegated':
      'You handed this category to a lieutenant. Take it back to decide yourself.',
    'error.meta_progression.deviation_mode_not_available':
      'That way of deviating is not open here. Choose another.',
    'error.meta_progression.execution_window_exceeds_tier':
      'That window reaches further ahead than you can plan for. Shorten it.',
    'error.meta_progression.horizon_tier_already_maximum':
      'You are already planning as far ahead as anyone can.',
    'error.meta_progression.metrics_simultaneous_reanchor_exceeded':
      'Too many measures are being re-anchored at once. Do fewer at a time.',
    'error.meta_progression.predicates_no_longer_met':
      'The conditions for this no longer hold. Review them and set it up again.',
    'error.meta_progression.reanchor_quota_exhausted':
      'You have re-anchored as often as allowed for now. Wait for the quota to come back.',
    'error.meta_progression.stability_counter_insufficient':
      'This has not held steady long enough yet. Let it run longer.',
    'error.meta_progression.standing_order_not_owned':
      'That standing order is not yours.',
    'error.named_sequence.cap_reached':
      'You hold as many named sequences as you can. Retire one to name another.',
    'error.named_sequence.name_taken':
      'That name is already in use. Choose another one.',
    'error.named_sequence.unlock_required':
      'Naming sequences is not open to you yet. Keep going and it will be.',
    'error.payment.required':
      'This requires a purchase that has not gone through. Complete it to continue.',
    'error.resource.not_found':
      'That is no longer there.',
    'error.resource.state_conflict':
      'Things changed since you last looked. Reload and decide again.',
    'error.service.maintenance':
      'The city is closed for maintenance. It will be back in a moment.',
    'error.signup.callsign_taken':
      'That name is already taken. Choose another one.',
    'error.sinuosity.rebuild_in_progress':
      'A rebuild is already under way. Wait for it to finish.',
    'error.sinuosity.rebuild_required':
      'This route has to be rebuilt before it can carry anything. Start the rebuild.',
    'error.sinuosity.route_rebuilding':
      'That route is being redrawn. It will settle in a moment.',
    'error.supply_chain.leg_resting':
      'That leg is resting. It will be available again in a moment.',
    'error.supply_chain.maintenance_in_progress':
      'Maintenance is under way there. It will finish on its own.',
    'error.supply_chain.trace_not_at_source':
      'The consignment has already left its source. Wait for it to arrive.',
    'error.telemetry.consent_required':
      'This needs your consent to diagnostics. Change it in settings.',
    'error.telemetry.event_invalid':
      'That diagnostic report was not accepted and was discarded.',
    'error.validation.failed':
      'Something in what you entered was not accepted. Correct it and send it again.',
  },
  fr: {
    'error.api_version.sunset':
      'Cette version du jeu n\'est plus prise en charge. Installez la version actuelle pour continuer à jouer.',
    'error.auth.account_banned':
      'Votre compte a été fermé.',
    'error.auth.account_not_found':
      'Aucun compte ne correspond à ces informations.',
    'error.auth.account_suspended':
      'Votre compte est suspendu. Contactez le support pour en demander le réexamen.',
    'error.auth.invalid_credentials':
      'Ces identifiants n\'ont pas été reconnus. Vérifiez-les et connectez-vous à nouveau.',
    'error.auth.refresh_expired':
      'Votre session est terminée. Reconnectez-vous.',
    'error.auth.refresh_invalid':
      'Votre session n\'a pas pu être renouvelée. Reconnectez-vous.',
    'error.auth.session_expired':
      'Votre session a expiré ; elle est en cours de renouvellement.',
    'error.auth.token_invalid_signature':
      'Votre session n\'a pas pu être vérifiée ; elle est en cours de renouvellement.',
    'error.auth.token_missing':
      'Votre session doit être renouvelée.',
    'error.authz.audience_mismatch':
      'Cette session n\'a pas accès à cela.',
    'error.authz.permission_denied':
      'Vous n\'avez pas l\'autorisation de faire cela.',
    'error.client.build_too_old':
      'Votre version du jeu n\'est plus à jour. Mettez-la à jour pour continuer.',
    'error.compression.budget_exhausted':
      'Il n\'y a plus de place pour ceci aujourd\'hui. Reprenez demain.',
    'error.compression.deferral_exhausted':
      'Vous avez repoussé ceci autant de fois que possible. Tranchez maintenant.',
    'error.compression.forced_engagement':
      'Celui-ci n\'attendra pas davantage. Traitez-le avant tout le reste.',
    'error.core_loops.structural_cap_exhausted':
      'Vous avez utilisé votre décision de structure du jour. Reprenez demain.',
    'error.cue_stack.already_active':
      'Ce repère est déjà en cours. Attendez qu\'il s\'achève.',
    'error.cue_stack.dependency_cycle':
      'Ces repères dépendent les uns des autres en boucle. Rompez la boucle et reprenez l\'ordre.',
    'error.cue_stack.settling_compound_required':
      'Ceci exige d\'abord un composé de stabilisation en place. Posez-en un et revenez.',
    'error.cue_stack.slot_target_invalid':
      'Ce repère ne peut pas viser cette cible. Choisissez une autre cible.',
    'error.cue_stack.slot_type_reserved':
      'Cet emplacement est réservé à un autre type de repère. Choisissez-en un autre.',
    'error.demolition.confirm_required':
      'Raser un site est irréversible. Confirmez pour continuer.',
    'error.demolition.last_node':
      'C\'est le dernier maillon qui tient la chaîne. Construisez un remplacement avant de le raser.',
    'error.demolition.lieutenant_assigned':
      'Un lieutenant y est encore affecté. Réaffectez-le d\'abord.',
    'error.demolition.replacement_option_already_closed':
      'Ce remplacement n\'est plus proposé. Choisissez parmi ce qui reste.',
    'error.envelope.json_parse_error':
      'Cette requête n\'a pas pu être lue.',
    'error.envelope.payload_too_large':
      'Cette requête était trop volumineuse pour être acceptée.',
    'error.envelope.request_id_missing':
      'Cette requête était incomplète et n\'a pas pu être traitée.',
    'error.http.method_not_allowed':
      'Cette action n\'est pas possible ici.',
    'error.idempotency.key_conflict':
      'Cette action a déjà été envoyée avec un contenu différent. Rien n\'a été modifié.',
    'error.idempotency.key_format_invalid':
      'Cette action n\'a pas été envoyée correctement ; elle n\'a donc pas été exécutée.',
    'error.idempotency.key_missing':
      'Cette action n\'a pas pu être envoyée en toute sûreté ; elle n\'a donc pas été exécutée.',
    'error.idempotency.replay_mismatch':
      'Cette action ne correspond pas à celle déjà enregistrée. Rien n\'a été modifié.',
    'error.idempotency.request_in_flight':
      'Cette action est encore en cours de traitement. Elle s\'achèvera dans un instant.',
    'error.internal.unexpected':
      'Quelque chose a échoué de notre côté. Une nouvelle tentative aura lieu dans un instant.',
    'error.meta_progression.capability_not_dismissible':
      'Celle-ci reste. Elle ne peut pas être écartée.',
    'error.meta_progression.category_delegated':
      'Vous avez confié cette catégorie à un lieutenant. Reprenez-la pour décider vous-même.',
    'error.meta_progression.deviation_mode_not_available':
      'Cette manière de dévier n\'est pas ouverte ici. Choisissez-en une autre.',
    'error.meta_progression.execution_window_exceeds_tier':
      'Cette fenêtre va plus loin que vous ne pouvez planifier. Raccourcissez-la.',
    'error.meta_progression.horizon_tier_already_maximum':
      'Vous planifiez déjà aussi loin qu\'il est possible.',
    'error.meta_progression.metrics_simultaneous_reanchor_exceeded':
      'Trop de mesures sont réancrées en même temps. Faites-en moins à la fois.',
    'error.meta_progression.predicates_no_longer_met':
      'Les conditions ne sont plus réunies. Revoyez-les et reconfigurez.',
    'error.meta_progression.reanchor_quota_exhausted':
      'Vous avez réancré aussi souvent que permis pour l\'instant. Attendez que le quota revienne.',
    'error.meta_progression.stability_counter_insufficient':
      'Ceci n\'a pas encore tenu assez longtemps. Laissez-le courir davantage.',
    'error.meta_progression.standing_order_not_owned':
      'Cette consigne permanente ne vous appartient pas.',
    'error.named_sequence.cap_reached':
      'Vous détenez autant de séquences nommées que possible. Retirez-en une pour en nommer une autre.',
    'error.named_sequence.name_taken':
      'Ce nom est déjà utilisé. Choisissez-en un autre.',
    'error.named_sequence.unlock_required':
      'Nommer des séquences ne vous est pas encore ouvert. Continuez et cela le sera.',
    'error.payment.required':
      'Ceci exige un achat qui n\'a pas abouti. Finalisez-le pour continuer.',
    'error.resource.not_found':
      'Ce n\'est plus là.',
    'error.resource.state_conflict':
      'La situation a changé depuis votre dernier coup d\'œil. Rechargez et décidez à nouveau.',
    'error.service.maintenance':
      'La ville est fermée pour maintenance. Elle rouvrira dans un instant.',
    'error.signup.callsign_taken':
      'Ce nom est déjà pris. Choisissez-en un autre.',
    'error.sinuosity.rebuild_in_progress':
      'Une reconstruction est déjà en cours. Attendez qu\'elle s\'achève.',
    'error.sinuosity.rebuild_required':
      'Cet itinéraire doit être reconstruit avant de pouvoir transporter quoi que ce soit. Lancez la reconstruction.',
    'error.sinuosity.route_rebuilding':
      'Cet itinéraire est en cours de redessin. Il se stabilisera dans un moment.',
    'error.supply_chain.leg_resting':
      'Ce tronçon est au repos. Il redeviendra disponible dans un moment.',
    'error.supply_chain.maintenance_in_progress':
      'Un entretien est en cours sur place. Il s\'achèvera de lui-même.',
    'error.supply_chain.trace_not_at_source':
      'Le chargement a déjà quitté sa source. Attendez son arrivée.',
    'error.telemetry.consent_required':
      'Ceci demande votre consentement aux diagnostics. Modifiez-le dans les réglages.',
    'error.telemetry.event_invalid':
      'Ce rapport de diagnostic n\'a pas été accepté et a été écarté.',
    'error.validation.failed':
      'Une partie de ce que vous avez saisi n\'a pas été acceptée. Corrigez-la et renvoyez.',
  },
};

function errorKeyTemplates(locale: LocaleCode): Record<string, string> {
  const out: Record<string, string> = {};
  const ratifies = ERROR_TEXT_RATIFIED[locale];
  for (const spec of Object.values(ERROR_CODES)) {
    const cle = spec.user_facing_i18n_key;
    // TD-635 — le texte RATIFIÉ d'abord ; l'humanisation reste le REPLI, jamais le défaut.
    const ratifie = ratifies[cle];
    if (ratifie !== undefined) { out[cle] = ratifie; continue; }
    // Repli : humanise le dernier segment. Un code neuf obtient donc TOUJOURS une entrée — c'est la
    // propriété auto-invalidante qu'on garde — mais en anglais machine, et la falsifiable le COMPTE
    // pour que ce repli reste une exception nommée et non un état permanent.
    const label = cle.split('.').slice(-1)[0] ?? 'error';
    out[cle] = label.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) + '.';
  }
  return out;
}

/** Les codes servis par le REPLI (aucun texte ratifié) — exposé pour que la falsifiable les COMPTE
 *  au lieu de les deviner. Un code neuf y entre tout seul : c'est le signal, pas un défaut. */
export function errorCodesSansTexteRatifie(locale: LocaleCode): string[] {
  const ratifies = ERROR_TEXT_RATIFIED[locale];
  return Object.values(ERROR_CODES)
    .map((s) => s.user_facing_i18n_key)
    .filter((k) => ratifies[k] === undefined)
    .sort();
}

/** L'ensemble EN des clés d'erreur — la table CANONIQUE au sens de `isRegisteredKey`. Son contenu
 *  vient désormais du texte ratifié (TD-635) ; l'ENSEMBLE DE CLÉS, lui, est inchangé : il reste
 *  dérivé des `ERROR_CODES`, donc un code neuf y entre toujours tout seul. */
const EN_ERROR_MESSAGES = errorKeyTemplates('en');

/**
 * `resolveBundle` — return the merged key→template map for a locale. The canonical EN registry is
 * the base; the requested locale's overrides are layered on top (missing keys fall back to EN —
 * supported_locales.md fallback chain). The ch18 error keys are always included so a client can
 * render any emitted `user_facing_i18n_key` (R-EH-2). Error-key copy is EN-only in the skeleton
 * (FR error copy is a translation-workflow concern — DEFERRED).
 */
export function resolveBundle(locale: LocaleCode): Record<string, string> {
  const localeOverrides = locale === 'fr' ? FR_MESSAGES : {};
  return {
    // TD-635 — les clés d'erreur sont désormais résolues DANS LA LOCALE demandée. Avant, ce spread
    // était `EN_ERROR_MESSAGES` quelle que soit la locale, et rien dans `FR_MESSAGES` ne les
    // écrasait : un bundle `fr` servait 64 messages d'erreur en anglais.
    ...errorKeyTemplates(locale),
    ...EN_MESSAGES,
    ...localeOverrides,
  };
}

/** Normalize an arbitrary `?locale=` query value to a supported LocaleCode (falls back to EN). */
export function normalizeLocale(raw: unknown): LocaleCode {
  if (typeof raw !== 'string') {
    return CANONICAL_LOCALE;
  }
  // Accept `fr`, `fr-FR`, `FR`, etc. — take the primary subtag, lowercase.
  const primary = raw.trim().toLowerCase().split('-')[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(primary)
    ? (primary as LocaleCode)
    : CANONICAL_LOCALE;
}

/** True iff `key` is a registered i18n key in the canonical (EN) table (used by light F1 checks). */
export function isRegisteredKey(key: string): boolean {
  return key in EN_MESSAGES || key in EN_ERROR_MESSAGES;
}
