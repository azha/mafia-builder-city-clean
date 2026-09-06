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
  'exception.heat_pressure.card.descriptor': 'Citywide heat is high — your operations are under pressure.',
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

  // --- `autonomie.*` (5 clés) ---
  'autonomie.etat.elevated_exposure': '[!] Elevated exposure',
  'autonomie.etat.minimal': '[~] Minimal',
  'autonomie.etat.opportunity_cost': '[$] Opportunity cost',
  'autonomie.etat.tradeoff': '[<>] Tradeoff',
  'autonomie.etat.unknown': '[?] Unknown',

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
  'building.row.alert': 'Alert',
  'building.row.appointment': 'Appointment',
  'building.row.capacity': 'Capacity',
  'building.row.cold_chain': 'Cold chain',
  'building.row.cover': 'Cover',
  'building.row.crop': 'Crop',
  'building.row.entretien': 'Entretien',
  'building.row.forfeiture': 'Forfeiture',
  'building.row.grow_stage': 'Grow stage',
  'building.row.held': 'Held',
  'building.row.holding_tier': 'Holding tier',
  'building.row.hub_tier': 'Hub tier',
  'building.row.husbandry': 'Husbandry',
  'building.row.lab_tier': 'Lab tier',
  'building.row.operational': 'Operational',
  'building.row.payout': 'Payout',
  'building.row.purity': 'Purity',
  'building.row.raid_risk': 'Raid risk',
  'building.row.roster': 'Roster',
  'building.row.setup': 'Setup',
  'building.row.structure': 'Structure',
  'building.row.substance': 'Substance',
  'building.row.temperature': 'Temperature',
  'building.row.vehicles': 'Vehicles',
  'building.row.yield': 'Yield',
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
  'building.yield.earning': 'Earning',
  'building.yield.idle': 'Idle',

  // --- `district.*` (13 clés) ---
  'district.type_batiment.cash_safehouse': 'Cash safehouse',
  'district.type_batiment.dealer_spot_front': 'Dealer-spot front',
  'district.type_batiment.distribution_hub': 'Distribution hub',
  'district.type_batiment.front_shop': 'Front shop',
  'district.type_batiment.grow_house': 'Grow house',
  'district.type_batiment.lab': 'Lab',
  'district.type_batiment.money_holding': 'Money holding',
  'district.type_batiment.office': 'Office',
  'district.type_batiment.press_house': 'Press house',
  'district.type_batiment.refinery': 'Refinery',
  'district.type_batiment.specialized_lab': 'Specialized lab',
  'district.type_batiment.stash': 'Stash',
  'district.type_batiment.vacant_lot': 'Vacant lot',

  // --- `exception_detail.*` (7 clés) ---
  'exception_detail.bloc.back': 'Back',
  'exception_detail.bloc.escalate': 'Escalate',
  'exception_detail.bloc.issue': 'Issue :',
  'exception_detail.bloc.lui_apprendre': 'Lui apprendre',
  'exception_detail.bloc.resolu': 'Résolu ✓',
  'exception_detail.bloc.risque': 'Risqué',
  'exception_detail.bloc.suggere': 'Suggéré',

  // --- `exceptions.*` (16 clés) ---
  'exceptions.bloc.a_relire_a_tete_reposee': 'à relire à tête reposée',
  'exceptions.bloc.escalades_archivees': 'Escalades archivées',
  'exceptions.bloc.file_indisponible_verifier_la_pile': 'File indisponible — vérifier la pile',
  'exceptions.bloc.il_attend_une_consigne': 'il attend une consigne',
  'exceptions.bloc.ouvrir': 'Ouvrir',
  'exceptions.categorie.conflit': 'CONFLIT',
  'exceptions.categorie.diplomatie': 'DIPLOMATIE',
  'exceptions.categorie.renseignement': 'RENSEIGNEMENT',
  'exceptions.categorie.reputation': 'REPUTATION',
  'exceptions.locuteur.la_ville': 'La ville',
  'exceptions.nombre.cinq': 'Cinq',
  'exceptions.nombre.deux': 'Deux',
  'exceptions.nombre.plusieurs': 'Plusieurs',
  'exceptions.nombre.quatre': 'Quatre',
  'exceptions.nombre.six': 'Six',
  'exceptions.nombre.trois': 'Trois',

  // --- `famille.*` (45 clés) ---
  'famille.archetype.bookkeeper': 'Bookkeeper',
  'famille.archetype.cook': 'Cook',
  'famille.archetype.distribution': 'Distribution',
  'famille.archetype.laundering': 'Laundering',
  'famille.archetype.logistics': 'Logistics',
  'famille.archetype.security': 'Security',
  'famille.archetype.unknown': 'Unknown',
  'famille.band.depleted': '[....] Depleted',
  'famille.band.full': '[####] Full',
  'famille.band.low': '[##..] Low',
  'famille.band.nominal': '[###.] Nominal',
  'famille.band.unknown': '[?] Unknown',
  'famille.category.bookkeeping_audit': 'Bookkeeping audit',
  'famille.category.cross_category_incident': 'Cross-category incident',
  'famille.category.distribution_dispatch': 'Distribution dispatch',
  'famille.category.laundering_flow': 'Laundering flow',
  'famille.category.logistics_routing': 'Logistics routing',
  'famille.category.production_ops': 'Production ops',
  'famille.category.security_response': 'Security response',
  'famille.category.unknown_category': 'Unknown category',
  'famille.disruption.long_settling': 'Long settling',
  'famille.disruption.medium_settling': 'Medium settling',
  'famille.disruption.short_settling': 'Short settling',
  'famille.disruption.very_long_settling': 'Very long settling',
  'famille.efficiencybonus.no_yield_bonus': 'No yield bonus',
  'famille.efficiencybonus.peak_yield_bonus': 'Peak yield bonus',
  'famille.efficiencybonus.small_yield_bonus': 'Small yield bonus',
  'famille.efficiencybonus.solid_yield_bonus': 'Solid yield bonus',
  'famille.grantedrole.advisory': 'Advisory',
  'famille.grantedrole.cohort_overseer': 'Cohort overseer',
  'famille.grantedrole.delegated_owner': 'Delegated owner',
  'famille.grantedrole.executor': 'Executor',
  'famille.mode.delegated': 'Delegated',
  'famille.mode.tasked': 'Tasked',
  'famille.opstate.active': 'Active',
  'famille.opstate.idle': 'Idle',
  'famille.opstate.paused': 'Paused',
  'famille.opstate.settling_in': 'Settling in',
  'famille.revisioncost.cheap_to_re_script': 'Cheap to re-script',
  'famille.revisioncost.costly_to_re_script': 'Costly to re-script',
  'famille.revisioncost.pricey_to_re_script': 'Pricey to re-script',
  'famille.revisioncost.very_costly_to_re_script': 'Very costly to re-script',
  'famille.rulecount.a_few_rules': 'A few rules',
  'famille.rulecount.many_rules': 'Many rules',
  'famille.rulecount.no_rules': 'No rules',

  // --- `forensic.*` (12 clés) ---
  'forensic.bloc.ce_que_cet_ecran_ne_peut_pas_vous_dire': 'CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE',
  'forensic.bloc.ce_que_le_serveur_envoie_vraiment': 'CE QUE LE SERVEUR ENVOIE VRAIMENT',
  'forensic.bloc.ce_qui_se_voit': 'Ce qui se voit',
  'forensic.bloc.pas_de_reponse': 'Pas de réponse',
  'forensic.bloc.risque_d_audit': 'RISQUE D\'AUDIT',
  'forensic.bloc.train_de_vie': 'TRAIN DE VIE',
  'forensic.bloc.trois_signaux_trois_bandes': 'TROIS SIGNAUX, TROIS BANDES',
  'forensic.bloc.une_bande_sans_source_ressemble_a_une_bande_mesuree':
    'Une bande sans source ressemble à une bande mesurée',
  'forensic.bloc.visibilite_des_rejets': 'VISIBILITÉ DES REJETS',
  'forensic.gravite.ca_se_voit_de_loin': 'Ça se voit de loin',
  'forensic.gravite.on_vous_regarde': 'On vous regarde',
  'forensic.gravite.rien_ne_depasse': 'Rien ne dépasse',

  // --- `horizon.*` (9 clés) ---
  'horizon.bloc.a_portee': 'À PORTÉE',
  'horizon.bloc.aucune_de_ces_cartes_n_a_de_nom': 'Aucune de ces cartes n\'a de nom',
  'horizon.bloc.c_etait_a_portee_ca_s_est_eloigne': 'C\'était à portée. Ça s\'est éloigné.',
  'horizon.bloc.ce_que_le_serveur_envoie_vraiment': 'CE QUE LE SERVEUR ENVOIE VRAIMENT',
  'horizon.bloc.ce_que_le_serveur_ne_dit_pas': 'CE QUE LE SERVEUR NE DIT PAS',
  'horizon.bloc.deja_prises': 'DÉJÀ PRISES',
  'horizon.bloc.l_horizon': 'L\'horizon',
  'horizon.bloc.ont_recule': 'ONT RECULÉ',
  'horizon.bloc.rien_a_l_horizon': 'Rien à l\'horizon',

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
  'exceptions.file.ambiance': '{count, plural, =0 {Nobody is waiting — the counter is empty} one {One person is waiting for your orders — the queue is calm} other {# are waiting for your orders — the queue is calm}}',

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

  // --- `exception.raid.*` (12 clés) ---
  'exception.raid.acknowledge.label': 'Acknowledge',
  'exception.raid.acknowledge.projected_consequence': 'Dismiss this card; take no action.',
  'exception.raid.add_rule.label': 'Teach: auto-handle a raided building',
  'exception.raid.add_rule.projected_consequence': 'The lieutenant handles a raided building on its own from now on.',
  'exception.raid.bribe.label': 'Bribe an official (risky)',
  'exception.raid.bribe.projected_consequence':
    'Pay to make the raid disappear — it may work, or backfire and raise heat.',
  'exception.raid.escalate.label': 'Escalate',
  'exception.raid.escalate.projected_consequence': 'Archive this card for later review.',
  'exception.raid.lay_low.label': 'Lay low (risky)',
  'exception.raid.lay_low.projected_consequence':
    'Go quiet to shed heat — how much is uncertain; the building stays damaged.',
  'exception.raid.repair.label': 'Repair the building',
  'exception.raid.repair.projected_consequence': 'Pay to restore the building to operational over time.',

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
  //     EN = FR byte-identique : le jeu est en français, l'anglais n'est pas traduit (règle P4).
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
  //     EN = FR byte-identique : le jeu est en français (règle P4).

  'tutorial.exception_card.onboarding_preseed':
    'Lt. Hara — cuisson du soir bloquée : plus de solvant. Commander maintenant (coût) ou attendre demain (rendement).',
  'tutorial.city_map_heat_intro': 'La carte montre la chaleur par îlot. Plus c\'est chaud, plus la police regarde.',
  'tutorial.daily_review_intro': 'Chaque matin, la Revue liste ce qui a dévié de la routine. Tranche, ou laisse.',
  'tutorial.cue_stack_intro': 'La pile du jour ordonne tes consignes. Le premier créneau part en premier.',
  'tutorial.possibility_horizon_intro': 'L\'horizon montre ce que tes lieutenants peuvent apprendre ensuite.',
  'tutorial.compression_week': 'Semaine de compression : l\'organisation est sous tension. Réduis, ou encaisse.',
  'tutorial.graduation': 'Un lieutenant a fini son apprentissage. Il décide seul, dans le cadre que tu fixes.',
  'tutorial.graduation_eligibility_intro': 'Un lieutenant est prêt à passer. Sa promotion se prépare ici.',
  'tutorial.queue_runs_dry': 'La file est vide. Rien n\'attend ta décision : la ville tourne sans toi.',
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
  'game.fiction.route.indexed': 'Route {index}',

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

  // ═══ TD-556 (maillon 2, chantier "les maillons back des écrans neufs", 2026-09-03) — le LIBELLÉ
  //     d'un TIER d'avocat (`lawyerLabelI18n`, `legal-projection.service.ts`'s own `LAWYER_TIER_NAME_
  //     REF`). Avant ce maillon, `POST /v1/me/legal/lawyers` servait `lawyerLabel` comme de la PROSE
  //     anglaise en dur ("Boutique Counsel") — une violation F1/R-EH-2 directe, même famille que
  //     TD-452. Trois clés FIXES (une par membre du pgEnum `lawyer_tier` — closed, params: {}), jamais
  //     un passe-plat : contrairement au rival (un nom PROPRE, choisi hors du code), ces 3 libellés
  //     SONT le texte lui-même, il n'y a rien à interpoler.
  //     ⚠️ EN = FR byte-identique, ANGLAIS pour l'instant (PAS le sens habituel de cette convention,
  //     où EN=FR est du français non-encore-traduit) : c'est le texte DÉJÀ servi en production
  //     (`lawyer.service.ts:140`, `legal-case.service.ts:213`) et zéro source ratifiée n'existe pour
  //     une traduction FR (écran ㉛ est `[~]` maquetté, non ratifié, `front.md` — contrairement aux 4
  //     noms de rivaux de TD-553, sourcés par la maquette ratifiée ㉙ ET le glossaire canon). Inventer
  //     une traduction ici serait exactement le piège que le brief de ce maillon nomme pour le CLIENT
  //     ("traduire côté client inventerait une chaîne que personne n'a ratifiée") — un cran plus bas.
  //     Ferme la violation ARCHITECTURALE (prose brute → clé résolvable) sans inventer de prose
  //     joueur non ratifiée ; à re-viser dès que ㉛ est ratifié avec un vrai libellé FR (implementation-
  //     notes.md §Deviations).
  'game.legal.lawyer_tier.public_defender': 'Public Defender',
  'game.legal.lawyer_tier.boutique': 'Boutique Counsel',
  'game.legal.lawyer_tier.corruption_pipeline': 'Corruption Pipeline',


  // ═══ P6 item 1 (TD-484) — les mêmes 12 clés côté EN. Le jeu est en français (choix 5A) : la copy
  //     EN est byte-identique à la FR tant que la traduction anglaise n'est pas faite, comme les
  //     onze tutoriels et la carte d'onboarding livrés en P4. Les placeholders sont les mêmes.
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
    'Réassort de {substance_type} à prévoir sur {building_id}.',
  'core_loops.flag_discipline.routine.courier_scheduling.descriptor':
    'Tournées — route {route_id}',
  'core_loops.flag_discipline.routine.front_shop_reconciliation.descriptor':
    'Caisse — {building_id}',
  'core_loops.flag_discipline.routine.lek_rotation.descriptor':
    'Rotation — {dealer_id}',
  'core_loops.flag_discipline.routine.precursor_order.descriptor':
    'Précurseurs — {precursor_type}, {building_id}',
  'core_loops.flag_discipline.routine.stash_reorder.descriptor':
    'Réassort — {substance_type}, {building_id}',
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
  'distribution.bloc.aucune_route_connue_pour_l_instant': 'No known route yet.',
  'distribution.bloc.destination_a_determiner': 'destination to be decided',
  'distribution.bloc.il_est_en_chemin_on_ne_le_rappelle_pas_on_saura_a_l_arrivee': 'He\'s on his way. You don\'t call him back — you\'ll know on arrival.',
  'distribution.bloc.la_regulation': 'THE FLOW',
  'distribution.bloc.vos_courriers': 'YOUR COURIERS',
  'distribution.bouton.acheter_un_velo': 'BUY A BICYCLE',
  'distribution.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'distribution.titre.la_distribution_est_indisponible': 'Distribution is unavailable',
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
  'filiere.bloc.ce_que_cet_ecran_sait_pour_l_instant': 'WHAT THIS SCREEN KNOWS SO FAR',
  'filiere.bloc.ce_que_la_filiere_ne_dit_pas': 'WHAT THE PIPELINE DOESN\'T SAY',
  'filiere.bloc.ce_que_le_serveur_envoie_vraiment': 'WHAT THE SERVER ACTUALLY SENDS',
  'filiere.bloc.dire_combien_il_y_a_dans_la_filiere': 'Say how much is in the pipeline',
  'filiere.bloc.ecarts': 'DEVIATIONS',
  'filiere.bloc.en_attente': 'WAITING',
  'filiere.bloc.etapes': 'STAGES',
  'filiere.bloc.la_filiere': 'The pipeline',
  'filiere.bloc.la_filiere_n_a_pas_encore_ete_interrogee': 'The pipeline hasn\'t been queried yet',
  'filiere.bloc.la_filiere_ne_repond_pas': 'THE PIPELINE ISN\'T ANSWERING',
  'filiere.bloc.la_proprete_est_la_seule_grandeur_servie_ni_montant_ni_duree_ni_frais': 'cleanliness is the only figure served: no amount, no duration, no fee.',
  'filiere.bloc.la_route_n_a_rien_rendu_ce_n_est_pas_la_filiere_est_vide_c_est_on_ne_sait_pas_ou_elle_en_est': 'the route returned nothing. That\'s not \\u201cthe pipeline is empty\\u201d — it\'s \\u201cwe don\'t know where it stands\\u201d.',
  'filiere.bloc.la_route_repond_et_elle_repond_rien_ce_n_est_pas_une_panne_c_est_un_etat_il_faut_une_planque_pour_que_la_filiere_commence_quelque_part': 'the route answers, and it answers “nothing”: that\'s not a failure, it\'s a state. You need a safehouse for the pipeline to start somewhere.',
  'filiere.bloc.le_premier_maillon_sans_elle_rien_n_entre_dans_la_filiere_le_meme_lot_debloque_le_ramassage_des_caisses_de_dealers': 'the first link: without it, nothing enters the pipeline. The same batch unlocks collecting dealers\' cash boxes.',
  'filiere.bloc.maillon_manquant': 'MISSING LINK',
  'filiere.bloc.obtenir_une_planque': 'Get a safehouse',
  'filiere.bloc.pas_de_reponse': 'No answer',
  'filiere.bloc.propre_au_bout': 'CLEAN AT THE END',
  'filiere.bloc.vous_n_avez_encore_aucun_nœud': 'You don\'t have any node yet',
  'horizon.bloc.ce_palier_est_acquis': 'this tier is earned',
  'horizon.bloc.etat_inconnu': 'unknown state',
  'horizon.bloc.l_echelle_des_paliers': 'THE TIER LADDER',
  'horizon.bloc.le_serveur_ne_dit_pas_ce_qui_manque_pour_y_arriver': 'the server doesn\'t say what\'s missing to get there',
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
  'journal.bloc.ce_que_cet_ecran_sait_pour_l_instant': 'WHAT THIS SCREEN KNOWS SO FAR',
  'journal.bloc.ce_que_le_serveur_envoie_vraiment': 'WHAT THE SERVER ACTUALLY SENDS',
  'journal.bloc.ce_qui_se_dit_ce_matin': 'WHAT\'S BEING SAID THIS MORNING',
  'journal.bloc.ces_trois_listes_se_remplissent_avec_ce_que_la_ville_fait_aucune_ne_depend_de_vos_gestes': 'these three lists fill up with what the city does. None of them depends on your moves.',
  'journal.bloc.dans_la_rue': 'ON THE STREET',
  'journal.bloc.en_attente_du_matin': 'WAITING FOR MORNING',
  'journal.bloc.en_cours': 'UNDER WAY',
  'journal.bloc.la_route_n_a_rien_rendu_ce_n_est_pas_la_ville_est_calme_c_est_on_ne_sait_pas_ce_qu_elle_a_fait_cette_nuit': 'the route returned nothing. That\'s not “the city is quiet” — it\'s “we don\'t know what it did last night”.',
  'journal.bloc.le_journal': 'The paper',
  'journal.bloc.le_journal_n_a_pas_encore_ete_ouvert': 'The paper hasn\'t been opened yet',
  'journal.bloc.le_journal_n_est_pas_arrive': 'THE PAPER HASN\'T ARRIVED',
  'journal.bloc.le_journal_suit_le_monde_pas_vous': 'The paper follows the world, not you',
  'journal.bloc.le_serveur_rend_des_cles_et_un_gabarit_a_trous_les_titres_restent_a_ecrire_voila_le_journal_tel_qu_il_s_afficherait_aujourd_hui': 'the server returns keys and a template with slots; the headlines are still to be written. Here is the paper as it would read today.',
  'journal.bloc.les_trois_listes_n_ont_pas_ete_demandees_ce_n_est_ni_rien_ne_bouge_ni_pas_de_reponse_c_est_pas_encore': 'the three lists were not requested — it\'s neither “nothing is moving” nor “no answer”, it\'s “not yet”.',
  'journal.bloc.pas_de_reponse': 'No answer',
  'journal.bloc.phase_inconnue': 'UNKNOWN PHASE',
  'journal.bloc.pourquoi_c_est_vide': 'WHY IT\'S EMPTY',
  'journal.bloc.rien_ne_bouge': 'NOTHING IS MOVING',
  'loi.bloc.affaires_en_cours': 'OPEN CASES',
  'loi.bloc.aucune_affaire_en_cours': 'No open case.',
  'loi.bloc.la_filiere_fait_classer_une_affaire_sans_proces_mais_elle_se_sert_de_gens_qui_un_jour_peuvent_parler_a_leur_tour': 'The pipeline gets a case dropped without trial — but it uses people who, one day, may talk in their turn.',
  'loi.bloc.qui_peut_vous_defendre': 'WHO CAN DEFEND YOU',
  'loi.bloc.une_affaire_nait_d_une_descente_rien_sur_cet_ecran_n_en_cree': 'A case is born of a raid — nothing on this screen creates one.',
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

  // ═══ 2026-09-04 — les 73 clés produites par les conversions des sessions B et C.
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
  'accueil.vitals.cohesion_indisponible_pas_d_agregat_pour_la_ville': 'Cohesion: unavailable (no citywide aggregate)',
  'autonomie.etat.arbitrage': '[<>] Trade-off',
  'autonomie.etat.cout_d_opportunite': '[$] Opportunity cost',
  'autonomie.etat.exposition_accrue': '[!] Increased exposure',
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
  'carnet.bloc.ce_que_cet_ecran_sait_pour_l_instant': 'WHAT THIS SCREEN KNOWS SO FAR',
  'carnet.bloc.ce_que_la_ville_prepare': 'What the city is preparing',
  'carnet.bloc.ce_que_le_serveur_envoie_vraiment': 'WHAT THE SERVER ACTUALLY SENDS',
  'carnet.bloc.ce_qui_s_ouvrira_plus_tard': 'WHAT WILL OPEN LATER',
  'carnet.bloc.entre_quatre_et_huit_gestes_dans_l_ordre_ou_ils_partiront': 'between four and eight moves, in the order they\'ll go out',
  'carnet.bloc.la_route_n_a_rien_rendu_ce_n_est_pas_la_soiree_est_vide_c_est_on_ne_sait_pas_ce_qui_est_prevu': 'the route returned nothing. That\'s not “the evening is empty” — it\'s “we don\'t know what\'s planned”.',
  'carnet.bloc.le_calendrier_politique_n_a_aucune_route_joueur_seul_l_administrateur_y_accede_la_maquette_le_dessine_le_serveur_ne_le_sert_a_personne': 'the political calendar has no player route — only the administrator can reach it. The mockup draws it; the server serves it to no one.',
  'carnet.bloc.le_carnet_n_a_pas_encore_ete_ouvert': 'the book hasn\'t been opened yet',
  'carnet.bloc.le_carnet_ne_repond_pas': 'the book isn\'t answering',
  'carnet.bloc.les_ordres_de_ce_soir': 'Tonight\'s orders',
  'carnet.bloc.ordres_sur_8': ' ORDERS OUT OF 8',
  'carnet.bloc.pas_de_reponse': 'No answer',
  'carnet.bloc.rejouer_une_soiree_verrouille': 'Replay an evening — locked',
  'carnet.bloc.rien': '— nothing —',
  'carnet.bloc.rien_n_a_encore_ete_demande': 'Nothing has been requested yet',
  'carnet.bloc.une_suite_d_ordres_qu_on_met_de_cote_et_qu_on_relance_d_un_geste_le_serveur_la_refuse_tant_que_le_palier_2_n_est_pas_atteint': 'a sequence of orders you set aside and replay in one move. The server refuses it until tier 2 is reached.',
  'conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras': 'None of your lieutenants is the Muscle type.',
  'conflit.bloc.c_est_lui_qui_part_la_nuit_il_vous_en_manque_un_ce_n_est_pas_casse_vous_n_en_avez_tout_simplement_pas_encore': 'He\'s the one who goes out at night. You\'re missing one — nothing is broken, you simply don\'t have one yet.',
  'conflit.bloc.dessinees_pas_renseignees_aucune_route_ne_dit_ce_qu_elles_preparent_ni_ce_qu_elles_possedent': 'Drawn, not informed: no route says what they\'re preparing or what they own.',
  'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain': 'Tell me who I send and against what. I leave tonight; we\'ll know tomorrow.',
  'conflit.bloc.le_compte_des_envois_precedents_est_indisponible_pour_l_instant': 'The count of previous sorties is unavailable for now.',
  'conflit.bloc.les_quatre_familles': 'THE FOUR FAMILIES',
  'conflit.bloc.qui_part_ce_soir': 'WHO GOES OUT TONIGHT',
  'conflit.bloc.vous_avez_l_homme_personne_pour_lui_dire_ou_frapper_aucune_route_ne_connait_encore_vos_rivaux': 'You have the man. No one to tell him where to strike — no route knows your rivals yet.',
  'conflit.sous_titre.ce_que_vos_hommes_rapportent_des_familles_rivales_et_qui_vous_reste_pour_y_retourner': 'What your men report of the rival families, and who is left to go back.',
  'conflit.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'conflit.titre.le_conflit': 'The conflict',
  'conflit.titre.le_conflit_est_indisponible': 'Conflict is unavailable',
  'district.type_batiment.atelier_de_presse': 'Press house',
  'district.type_batiment.bureau': 'Office',
  'district.type_batiment.cache': 'Stash',
  'district.type_batiment.coffre': 'Vault',
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
  'revue.bloc.personne_au_comptoir_ce_matin': 'No one at the counter this morning.',
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
  // --- TD-452 — pas de traduction : FR = copie BYTE-IDENTIQUE de l'EN (94% du bundle est déjà
  //     anglais ; l'arbitrage éditorial n'appartient pas à ce lot, on ne décide pas à sa place). ---
  'exception.heat_pressure.card.descriptor': 'La chaleur est élevée dans toute la ville — vos opérations sont sous pression.',
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
  // --- TD-453 — pas de traduction : FR = copie BYTE-IDENTIQUE de l'EN (même raison que TD-452).
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

  // --- `autonomie.*` (5 clés) ---
  'autonomie.etat.elevated_exposure': '[!] Exposition élevée',
  'autonomie.etat.minimal': '[~] Minimal',
  'autonomie.etat.opportunity_cost': '[$] Coût d\'opportunité',
  'autonomie.etat.tradeoff': '[<>] Arbitrage',
  'autonomie.etat.unknown': '[?] Inconnu',

  // --- `blanchiment.*` (3 clés) ---
  'blanchiment.purete.clean': 'Propre',
  'blanchiment.purete.dirty': 'Sale',
  'blanchiment.purete.mostly_clean': 'Presque propre',

  // --- `building.*` (49 clés) ---
  'building.cover.none': 'None',
  'building.cover.standard': 'Standard',
  'building.cover.strong': 'Strong',
  'building.cover.weak': 'Weak',
  'building.raid_risk.elevated': 'Elevated',
  'building.raid_risk.high': 'High',
  'building.raid_risk.imminent': 'Imminent',
  'building.raid_risk.low': 'Low',
  'building.row.alert': 'Alert',
  'building.row.appointment': 'Appointment',
  'building.row.capacity': 'Capacity',
  'building.row.cold_chain': 'Cold chain',
  'building.row.cover': 'Cover',
  'building.row.crop': 'Crop',
  'building.row.entretien': 'Entretien',
  'building.row.forfeiture': 'Forfeiture',
  'building.row.grow_stage': 'Grow stage',
  'building.row.held': 'Held',
  'building.row.holding_tier': 'Holding tier',
  'building.row.hub_tier': 'Hub tier',
  'building.row.husbandry': 'Husbandry',
  'building.row.lab_tier': 'Lab tier',
  'building.row.operational': 'Operational',
  'building.row.payout': 'Payout',
  'building.row.purity': 'Purity',
  'building.row.raid_risk': 'Raid risk',
  'building.row.roster': 'Roster',
  'building.row.setup': 'Setup',
  'building.row.structure': 'Structure',
  'building.row.substance': 'Substance',
  'building.row.temperature': 'Temperature',
  'building.row.vehicles': 'Vehicles',
  'building.row.yield': 'Yield',
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
  'building.yield.earning': 'Earning',
  'building.yield.idle': 'Idle',

  // --- `district.*` (13 clés) ---
  'district.type_batiment.cash_safehouse': 'Planque à liquide',
  'district.type_batiment.dealer_spot_front': 'Façade de point de vente',
  'district.type_batiment.distribution_hub': 'Plateforme de distribution',
  'district.type_batiment.front_shop': 'Boutique-écran',
  'district.type_batiment.grow_house': 'Serre',
  'district.type_batiment.lab': 'Labo',
  'district.type_batiment.money_holding': 'Dépôt d\'argent',
  'district.type_batiment.office': 'Bureau',
  'district.type_batiment.press_house': 'Imprimerie',
  'district.type_batiment.refinery': 'Raffinerie',
  'district.type_batiment.specialized_lab': 'Labo spécialisé',
  'district.type_batiment.stash': 'Réserve',
  'district.type_batiment.vacant_lot': 'Terrain vague',

  // --- `exception_detail.*` (7 clés) ---
  'exception_detail.bloc.back': 'Retour',
  'exception_detail.bloc.escalate': 'Escalader',
  'exception_detail.bloc.issue': 'Problème :',
  'exception_detail.bloc.lui_apprendre': 'Lui apprendre',
  'exception_detail.bloc.resolu': 'Résolu ✓',
  'exception_detail.bloc.risque': 'Risqué',
  'exception_detail.bloc.suggere': 'Suggéré',

  // --- `exceptions.*` (16 clés) ---
  'exceptions.bloc.a_relire_a_tete_reposee': 'à relire à tête reposée',
  'exceptions.bloc.escalades_archivees': 'Escalades archivées',
  'exceptions.bloc.file_indisponible_verifier_la_pile': 'File indisponible — vérifier la pile',
  'exceptions.bloc.il_attend_une_consigne': 'il attend une consigne',
  'exceptions.bloc.ouvrir': 'Ouvrir',
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

  // --- `famille.*` (45 clés) ---
  'famille.archetype.bookkeeper': 'Bookkeeper',
  'famille.archetype.cook': 'Cook',
  'famille.archetype.distribution': 'Distribution',
  'famille.archetype.laundering': 'Laundering',
  'famille.archetype.logistics': 'Logistics',
  'famille.archetype.security': 'Security',
  'famille.archetype.unknown': 'Unknown',
  'famille.band.depleted': '[....] Depleted',
  'famille.band.full': '[####] Full',
  'famille.band.low': '[##..] Low',
  'famille.band.nominal': '[###.] Nominal',
  'famille.band.unknown': '[?] Unknown',
  'famille.category.bookkeeping_audit': 'Bookkeeping audit',
  'famille.category.cross_category_incident': 'Cross-category incident',
  'famille.category.distribution_dispatch': 'Distribution dispatch',
  'famille.category.laundering_flow': 'Laundering flow',
  'famille.category.logistics_routing': 'Logistics routing',
  'famille.category.production_ops': 'Production ops',
  'famille.category.security_response': 'Security response',
  'famille.category.unknown_category': 'Unknown category',
  'famille.disruption.long_settling': 'Long settling',
  'famille.disruption.medium_settling': 'Medium settling',
  'famille.disruption.short_settling': 'Short settling',
  'famille.disruption.very_long_settling': 'Very long settling',
  'famille.efficiencybonus.no_yield_bonus': 'No yield bonus',
  'famille.efficiencybonus.peak_yield_bonus': 'Peak yield bonus',
  'famille.efficiencybonus.small_yield_bonus': 'Small yield bonus',
  'famille.efficiencybonus.solid_yield_bonus': 'Solid yield bonus',
  'famille.grantedrole.advisory': 'Advisory',
  'famille.grantedrole.cohort_overseer': 'Cohort overseer',
  'famille.grantedrole.delegated_owner': 'Delegated owner',
  'famille.grantedrole.executor': 'Executor',
  'famille.mode.delegated': 'Delegated',
  'famille.mode.tasked': 'Tasked',
  'famille.opstate.active': 'Active',
  'famille.opstate.idle': 'Idle',
  'famille.opstate.paused': 'Paused',
  'famille.opstate.settling_in': 'Settling in',
  'famille.revisioncost.cheap_to_re_script': 'Cheap to re-script',
  'famille.revisioncost.costly_to_re_script': 'Costly to re-script',
  'famille.revisioncost.pricey_to_re_script': 'Pricey to re-script',
  'famille.revisioncost.very_costly_to_re_script': 'Very costly to re-script',
  'famille.rulecount.a_few_rules': 'A few rules',
  'famille.rulecount.many_rules': 'Many rules',
  'famille.rulecount.no_rules': 'No rules',

  // --- `forensic.*` (12 clés) ---
  'forensic.bloc.ce_que_cet_ecran_ne_peut_pas_vous_dire': 'CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE',
  'forensic.bloc.ce_que_le_serveur_envoie_vraiment': 'CE QUE LE SERVEUR ENVOIE VRAIMENT',
  'forensic.bloc.ce_qui_se_voit': 'Ce qui se voit',
  'forensic.bloc.pas_de_reponse': 'Pas de réponse',
  'forensic.bloc.risque_d_audit': 'RISQUE D\'AUDIT',
  'forensic.bloc.train_de_vie': 'TRAIN DE VIE',
  'forensic.bloc.trois_signaux_trois_bandes': 'TROIS SIGNAUX, TROIS BANDES',
  'forensic.bloc.une_bande_sans_source_ressemble_a_une_bande_mesuree':
    'Une bande sans source ressemble à une bande mesurée',
  'forensic.bloc.visibilite_des_rejets': 'VISIBILITÉ DES REJETS',
  'forensic.gravite.ca_se_voit_de_loin': 'Ça se voit de loin',
  'forensic.gravite.on_vous_regarde': 'On vous regarde',
  'forensic.gravite.rien_ne_depasse': 'Rien ne dépasse',

  // --- `horizon.*` (9 clés) ---
  'horizon.bloc.a_portee': 'À PORTÉE',
  'horizon.bloc.aucune_de_ces_cartes_n_a_de_nom': 'Aucune de ces cartes n\'a de nom',
  'horizon.bloc.c_etait_a_portee_ca_s_est_eloigne': 'C\'était à portée. Ça s\'est éloigné.',
  'horizon.bloc.ce_que_le_serveur_envoie_vraiment': 'CE QUE LE SERVEUR ENVOIE VRAIMENT',
  'horizon.bloc.ce_que_le_serveur_ne_dit_pas': 'CE QUE LE SERVEUR NE DIT PAS',
  'horizon.bloc.deja_prises': 'DÉJÀ PRISES',
  'horizon.bloc.l_horizon': 'L\'horizon',
  'horizon.bloc.ont_recule': 'ONT RECULÉ',
  'horizon.bloc.rien_a_l_horizon': 'Rien à l\'horizon',

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
  'exceptions.file.ambiance': '{count, plural, =0 {Personne ne fait la queue — le comptoir est vide} one {Un seul attend vos ordres — la file est calme} other {# attendent vos ordres — la file est calme}}',

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

  // --- `exception.raid.*` (12 clés) ---
  'exception.raid.acknowledge.label': 'Prendre acte',
  'exception.raid.acknowledge.projected_consequence': 'Écarte cette carte ; aucune action n\'est prise.',
  'exception.raid.add_rule.label': 'Lui apprendre : gérer seul un bâtiment perquisitionné',
  'exception.raid.add_rule.projected_consequence': 'Le lieutenant gère désormais seul un bâtiment perquisitionné.',
  'exception.raid.bribe.label': 'Soudoyer un fonctionnaire (risqué)',
  'exception.raid.bribe.projected_consequence':
    'Payer pour faire disparaître la descente — ça peut marcher, ou se retourner et faire monter la chaleur.',
  'exception.raid.escalate.label': 'Escalader',
  'exception.raid.escalate.projected_consequence': 'Archive cette carte pour relecture ultérieure.',
  'exception.raid.lay_low.label': 'Se faire oublier (risqué)',
  'exception.raid.lay_low.projected_consequence':
    'Se faire oublier pour faire retomber la chaleur — l\'ampleur est incertaine, et le bâtiment reste endommagé.',
  'exception.raid.repair.label': 'Réparer le bâtiment',
  'exception.raid.repair.projected_consequence': 'Payer pour remettre le bâtiment en service progressivement.',

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
  //     EN = FR byte-identique : le jeu est en français, l'anglais n'est pas traduit (règle P4).
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
  //     EN = FR byte-identique : le jeu est en français (règle P4).

  'tutorial.exception_card.onboarding_preseed':
    'Lt. Hara — cuisson du soir bloquée : plus de solvant. Commander maintenant (coût) ou attendre demain (rendement).',
  'tutorial.city_map_heat_intro': 'La carte montre la chaleur par îlot. Plus c\'est chaud, plus la police regarde.',
  'tutorial.daily_review_intro': 'Chaque matin, la Revue liste ce qui a dévié de la routine. Tranche, ou laisse.',
  'tutorial.cue_stack_intro': 'La pile du jour ordonne tes consignes. Le premier créneau part en premier.',
  'tutorial.possibility_horizon_intro': 'L\'horizon montre ce que tes lieutenants peuvent apprendre ensuite.',
  'tutorial.compression_week': 'Semaine de compression : l\'organisation est sous tension. Réduis, ou encaisse.',
  'tutorial.graduation': 'Un lieutenant a fini son apprentissage. Il décide seul, dans le cadre que tu fixes.',
  'tutorial.graduation_eligibility_intro': 'Un lieutenant est prêt à passer. Sa promotion se prépare ici.',
  'tutorial.queue_runs_dry': 'La file est vide. Rien n\'attend ta décision : la ville tourne sans toi.',
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
  'game.fiction.route.indexed': 'Route {index}',

  // ═══ TD-553 (maillon 3, chantier "les maillons back des écrans neufs", 2026-09-03) — le nom de
  //     fiction d'un RIVAL, côté FR — même clé, même gabarit passe-plat qu'en EN ci-dessus (le nom
  //     ENTIER voyage en param, `fiction-names.ts`'s own `RIVAL_DISPLAY_NAME` pour les 4 valeurs et
  //     leurs 2 sources — la maquette ratifiée ㉙ + le glossaire GDD canon).
  'game.fiction.rival.name': '{nom}',

  // ═══ TD-556 (maillon 2, 2026-09-03) — côté FR, byte-identique à l'EN ci-dessus (voir ce bloc pour
  //     la justification complète : zéro source ratifiée pour une traduction FR de ces 3 libellés,
  //     contrairement aux 4 noms de rivaux de TD-553).
  'game.legal.lawyer_tier.public_defender': 'Public Defender',
  'game.legal.lawyer_tier.boutique': 'Boutique Counsel',
  'game.legal.lawyer_tier.corruption_pipeline': 'Corruption Pipeline',


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
    'Réassort de {substance_type} à prévoir sur {building_id}.',
  'core_loops.flag_discipline.routine.courier_scheduling.descriptor':
    'Tournées — route {route_id}',
  'core_loops.flag_discipline.routine.front_shop_reconciliation.descriptor':
    'Caisse — {building_id}',
  'core_loops.flag_discipline.routine.lek_rotation.descriptor':
    'Rotation — {dealer_id}',
  'core_loops.flag_discipline.routine.precursor_order.descriptor':
    'Précurseurs — {precursor_type}, {building_id}',
  'core_loops.flag_discipline.routine.stash_reorder.descriptor':
    'Réassort — {substance_type}, {building_id}',
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
  'distribution.bloc.aucune_route_connue_pour_l_instant': 'Aucune route connue pour l\'instant.',
  'distribution.bloc.destination_a_determiner': 'destination à déterminer',
  'distribution.bloc.il_est_en_chemin_on_ne_le_rappelle_pas_on_saura_a_l_arrivee': 'Il est en chemin. On ne le rappelle pas — on saura à l\'arrivée.',
  'distribution.bloc.la_regulation': 'LA RÉGULATION',
  'distribution.bloc.vos_courriers': 'VOS COURRIERS',
  'distribution.bouton.acheter_un_velo': 'ACHETER UN VÉLO',
  'distribution.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'distribution.titre.la_distribution_est_indisponible': 'La distribution est indisponible',
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
  'filiere.bloc.ce_que_cet_ecran_sait_pour_l_instant': 'CE QUE CET ÉCRAN SAIT POUR L\'INSTANT',
  'filiere.bloc.ce_que_la_filiere_ne_dit_pas': 'CE QUE LA FILIÈRE NE DIT PAS',
  'filiere.bloc.ce_que_le_serveur_envoie_vraiment': 'CE QUE LE SERVEUR ENVOIE VRAIMENT',
  'filiere.bloc.dire_combien_il_y_a_dans_la_filiere': 'Dire combien il y a dans la filière',
  'filiere.bloc.ecarts': 'ÉCARTS',
  'filiere.bloc.en_attente': 'EN ATTENTE',
  'filiere.bloc.etapes': 'ÉTAPES',
  'filiere.bloc.la_filiere': 'La filière',
  'filiere.bloc.la_filiere_n_a_pas_encore_ete_interrogee': 'La filière n\'a pas encore été interrogée',
  'filiere.bloc.la_filiere_ne_repond_pas': 'LA FILIÈRE NE RÉPOND PAS',
  'filiere.bloc.la_proprete_est_la_seule_grandeur_servie_ni_montant_ni_duree_ni_frais': 'la propreté est la seule grandeur servie : ni montant, ni durée, ni frais.',
  'filiere.bloc.la_route_n_a_rien_rendu_ce_n_est_pas_la_filiere_est_vide_c_est_on_ne_sait_pas_ou_elle_en_est': 'la route n\'a rien rendu. Ce n\'est pas « la filière est vide » : c\'est « on ne sait pas où elle en est ».',
  'filiere.bloc.la_route_repond_et_elle_repond_rien_ce_n_est_pas_une_panne_c_est_un_etat_il_faut_une_planque_pour_que_la_filiere_commence_quelque_part': 'la route répond, et elle répond « rien » : ce n\'est pas une panne, c\'est un état. Il faut une planque pour que la filière commence quelque part.',
  'filiere.bloc.le_premier_maillon_sans_elle_rien_n_entre_dans_la_filiere_le_meme_lot_debloque_le_ramassage_des_caisses_de_dealers': 'le premier maillon : sans elle, rien n\'entre dans la filière. Le même lot débloque le ramassage des caisses de dealers.',
  'filiere.bloc.maillon_manquant': 'MAILLON MANQUANT',
  'filiere.bloc.obtenir_une_planque': 'Obtenir une planque',
  'filiere.bloc.pas_de_reponse': 'Pas de réponse',
  'filiere.bloc.propre_au_bout': 'PROPRE AU BOUT',
  'filiere.bloc.vous_n_avez_encore_aucun_nœud': 'Vous n\'avez encore aucun nœud',
  'horizon.bloc.ce_palier_est_acquis': 'ce palier est acquis',
  'horizon.bloc.etat_inconnu': 'état inconnu',
  'horizon.bloc.l_echelle_des_paliers': 'L\'ÉCHELLE DES PALIERS',
  'horizon.bloc.le_serveur_ne_dit_pas_ce_qui_manque_pour_y_arriver': 'le serveur ne dit pas ce qui manque pour y arriver',
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
  'journal.bloc.ce_que_cet_ecran_sait_pour_l_instant': 'CE QUE CET ÉCRAN SAIT POUR L\'INSTANT',
  'journal.bloc.ce_que_le_serveur_envoie_vraiment': 'CE QUE LE SERVEUR ENVOIE VRAIMENT',
  'journal.bloc.ce_qui_se_dit_ce_matin': 'CE QUI SE DIT CE MATIN',
  'journal.bloc.ces_trois_listes_se_remplissent_avec_ce_que_la_ville_fait_aucune_ne_depend_de_vos_gestes': 'ces trois listes se remplissent avec ce que la ville fait. Aucune ne dépend de vos gestes.',
  'journal.bloc.dans_la_rue': 'DANS LA RUE',
  'journal.bloc.en_attente_du_matin': 'EN ATTENTE DU MATIN',
  'journal.bloc.en_cours': 'EN COURS',
  'journal.bloc.la_route_n_a_rien_rendu_ce_n_est_pas_la_ville_est_calme_c_est_on_ne_sait_pas_ce_qu_elle_a_fait_cette_nuit': 'la route n\'a rien rendu. Ce n\'est pas « la ville est calme » : c\'est « on ne sait pas ce qu\'elle a fait cette nuit ».',
  'journal.bloc.le_journal': 'Le journal',
  'journal.bloc.le_journal_n_a_pas_encore_ete_ouvert': 'Le journal n\'a pas encore été ouvert',
  'journal.bloc.le_journal_n_est_pas_arrive': 'LE JOURNAL N\'EST PAS ARRIVÉ',
  'journal.bloc.le_journal_suit_le_monde_pas_vous': 'Le journal suit le monde, pas vous',
  'journal.bloc.le_serveur_rend_des_cles_et_un_gabarit_a_trous_les_titres_restent_a_ecrire_voila_le_journal_tel_qu_il_s_afficherait_aujourd_hui': 'le serveur rend des clés et un gabarit à trous ; les titres restent à écrire. Voilà le journal tel qu\'il s\'afficherait aujourd\'hui.',
  'journal.bloc.les_trois_listes_n_ont_pas_ete_demandees_ce_n_est_ni_rien_ne_bouge_ni_pas_de_reponse_c_est_pas_encore': 'les trois listes n\'ont pas été demandées — ce n\'est ni « rien ne bouge » ni « pas de réponse », c\'est « pas encore ».',
  'journal.bloc.pas_de_reponse': 'Pas de réponse',
  'journal.bloc.phase_inconnue': 'PHASE INCONNUE',
  'journal.bloc.pourquoi_c_est_vide': 'POURQUOI C\'EST VIDE',
  'journal.bloc.rien_ne_bouge': 'RIEN NE BOUGE',
  'loi.bloc.affaires_en_cours': 'AFFAIRES EN COURS',
  'loi.bloc.aucune_affaire_en_cours': 'Aucune affaire en cours.',
  'loi.bloc.la_filiere_fait_classer_une_affaire_sans_proces_mais_elle_se_sert_de_gens_qui_un_jour_peuvent_parler_a_leur_tour': 'La filière fait classer une affaire sans procès — mais elle se sert de gens qui, un jour, peuvent parler à leur tour.',
  'loi.bloc.qui_peut_vous_defendre': 'QUI PEUT VOUS DÉFENDRE',
  'loi.bloc.une_affaire_nait_d_une_descente_rien_sur_cet_ecran_n_en_cree': 'Une affaire naît d\'une descente — rien sur cet écran n\'en crée.',
  'loi.bloc.vos_avocats': 'VOS AVOCATS',
  'loi.bloc.vous_n_avez_encore_engage_personne': 'Vous n\'avez encore engagé personne.',
  'loi.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'loi.sous_titre.vos_avocats_et_ce_qu_ils_peuvent_faire_pour_vous': 'Vos avocats, et ce qu\'ils peuvent faire pour vous.',
  'loi.titre.le_parloir': 'Le parloir',
  'loi.titre.le_parloir_est_indisponible': 'Le parloir est indisponible',
  'pipeline.etat.clean': 'Clean',
  'pipeline.etat.dirty': 'Dirty',
  'pipeline.etat.mostly_clean': 'Mostly clean',
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

  // ═══ 2026-09-04 — les 73 clés produites par les conversions des sessions B et C.
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
  'accueil.vitals.cohesion_indisponible_pas_d_agregat_pour_la_ville': 'Cohésion : indisponible (pas d\'agrégat pour la ville)',
  'autonomie.etat.arbitrage': '[<>] Arbitrage',
  'autonomie.etat.cout_d_opportunite': '[$] Coût d\'opportunité',
  'autonomie.etat.exposition_accrue': '[!] Exposition accrue',
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
  'carnet.bloc.ce_que_cet_ecran_sait_pour_l_instant': 'CE QUE CET ÉCRAN SAIT POUR L\'INSTANT',
  'carnet.bloc.ce_que_la_ville_prepare': 'Ce que la ville prépare',
  'carnet.bloc.ce_que_le_serveur_envoie_vraiment': 'CE QUE LE SERVEUR ENVOIE VRAIMENT',
  'carnet.bloc.ce_qui_s_ouvrira_plus_tard': 'CE QUI S\'OUVRIRA PLUS TARD',
  'carnet.bloc.entre_quatre_et_huit_gestes_dans_l_ordre_ou_ils_partiront': 'entre quatre et huit gestes, dans l\'ordre où ils partiront',
  'carnet.bloc.la_route_n_a_rien_rendu_ce_n_est_pas_la_soiree_est_vide_c_est_on_ne_sait_pas_ce_qui_est_prevu': 'la route n\'a rien rendu. Ce n\'est pas « la soirée est vide » : c\'est « on ne sait pas ce qui est prévu ».',
  'carnet.bloc.le_calendrier_politique_n_a_aucune_route_joueur_seul_l_administrateur_y_accede_la_maquette_le_dessine_le_serveur_ne_le_sert_a_personne': 'le calendrier politique n\'a aucune route joueur — seul l\'administrateur y accède. La maquette le dessine ; le serveur ne le sert à personne.',
  'carnet.bloc.le_carnet_n_a_pas_encore_ete_ouvert': 'le carnet n\'a pas encore été ouvert',
  'carnet.bloc.le_carnet_ne_repond_pas': 'le carnet ne répond pas',
  'carnet.bloc.les_ordres_de_ce_soir': 'Les ordres de ce soir',
  'carnet.bloc.ordres_sur_8': ' ORDRES SUR 8',
  'carnet.bloc.pas_de_reponse': 'Pas de réponse',
  'carnet.bloc.rejouer_une_soiree_verrouille': 'Rejouer une soirée — verrouillé',
  'carnet.bloc.rien': '— rien —',
  'carnet.bloc.rien_n_a_encore_ete_demande': 'Rien n\'a encore été demandé',
  'carnet.bloc.une_suite_d_ordres_qu_on_met_de_cote_et_qu_on_relance_d_un_geste_le_serveur_la_refuse_tant_que_le_palier_2_n_est_pas_atteint': 'une suite d\'ordres qu\'on met de côté et qu\'on relance d\'un geste. Le serveur la refuse tant que le palier 2 n\'est pas atteint.',
  'conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras': 'Aucun de vos lieutenants n\'est du genre Gros bras.',
  'conflit.bloc.c_est_lui_qui_part_la_nuit_il_vous_en_manque_un_ce_n_est_pas_casse_vous_n_en_avez_tout_simplement_pas_encore': 'C\'est lui qui part la nuit. Il vous en manque un — ce n\'est pas cassé, vous n\'en avez tout simplement pas encore.',
  'conflit.bloc.dessinees_pas_renseignees_aucune_route_ne_dit_ce_qu_elles_preparent_ni_ce_qu_elles_possedent': 'Dessinées, pas renseignées : aucune route ne dit ce qu\'elles préparent ni ce qu\'elles possèdent.',
  'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain': 'Dites-moi qui j\'envoie et sur quoi. Je pars ce soir, on saura demain.',
  'conflit.bloc.le_compte_des_envois_precedents_est_indisponible_pour_l_instant': 'Le compte des envois précédents est indisponible pour l\'instant.',
  'conflit.bloc.les_quatre_familles': 'LES QUATRE FAMILLES',
  'conflit.bloc.qui_part_ce_soir': 'QUI PART CE SOIR',
  'conflit.bloc.vous_avez_l_homme_personne_pour_lui_dire_ou_frapper_aucune_route_ne_connait_encore_vos_rivaux': 'Vous avez l\'homme. Personne pour lui dire où frapper — aucune route ne connaît encore vos rivaux.',
  'conflit.sous_titre.ce_que_vos_hommes_rapportent_des_familles_rivales_et_qui_vous_reste_pour_y_retourner': 'Ce que vos hommes rapportent des familles rivales, et qui vous reste pour y retourner.',
  'conflit.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'conflit.titre.le_conflit': 'Le conflit',
  'conflit.titre.le_conflit_est_indisponible': 'Le conflit est indisponible',
  'district.type_batiment.atelier_de_presse': 'Atelier de presse',
  'district.type_batiment.bureau': 'Bureau',
  'district.type_batiment.cache': 'Cache',
  'district.type_batiment.coffre': 'Coffre',
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
  'revue.bloc.personne_au_comptoir_ce_matin': 'Personne au comptoir ce matin.',
};

/**
 * The ch18 error-key entries. F1 / R-EH-2: every `user_facing_i18n_key` the protocol layer emits
 * (error-codes.ts) MUST be a registered key — the back emits the KEY, the client renders the message.
 * We derive the EN templates straight from the canonical ERROR_CODES registry so the two can never
 * drift (single source of truth). The default values are functional placeholders (real copy passes
 * the tone-bible checklist at translation time — DEFERRED).
 */
function errorKeyTemplates(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const spec of Object.values(ERROR_CODES)) {
    // Humanize the short_label segment into a placeholder EN string (registered, render-by-client).
    const label = spec.user_facing_i18n_key.split('.').slice(-1)[0] ?? 'error';
    out[spec.user_facing_i18n_key] = label.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) + '.';
  }
  return out;
}

const EN_ERROR_MESSAGES = errorKeyTemplates();

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
    ...EN_ERROR_MESSAGES,
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
