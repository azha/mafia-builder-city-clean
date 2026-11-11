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
  'building.row.taille_du_labo': 'The workshop',
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

  // --- `exception_detail.*` (10 clés) ---
  'exception_detail.bloc.back': 'Back',
  'exception_detail.bloc.escalate': 'Escalate',
  'exception_detail.bloc.issue': 'Issue :',
  'exception_detail.bloc.lui_apprendre': 'Teach them',
  'exception_detail.bloc.resolu': 'Resolved ✓',
  'exception_detail.bloc.risque': 'Risky',
  'exception_detail.bloc.suggere': 'Suggested',
  'exception_detail.bloc.appui_long_la_carte_se_ferme': 'long press — the card closes',
  'exception_detail.bloc.appui_long_la_carte_se_ferme_le_batiment_lui_se_repare_avec_le_temps': 'long press — the card closes; the building mends in its own time',
  'exception_detail.bloc.je_fais_quoi': 'What do I do?',
  // --- ⑨/⑩ — libellé du résultat, 10 issues, 10 bandes (21 clés, 2026-09-23) --- atelier `11-…` §3.7 et §3.2
  //     (`9a248ea5`). Issues : le domaine est les 10 littéraux que rendent les 10 handlers d'`exceptions/effects/`.
  //     Bandes : clés dérivées de la VALEUR servie (`Libelle.ParValeur`), domaines = `SeverityEnum`, `PriorityBucket`,
  //     `ConfidenceBucket` (`exceptions.projection.service.ts:73-79`).
  'exception_detail.bloc.resultat': 'Outcome:',
  'exception_detail.outcome.resolved': 'NOTED',
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

  // --- `exceptions.*` (43 clés) ---
  'exceptions.bloc.a_relire_a_tete_reposee': 'to go over with a clear head',
  'exceptions.bloc.ce_soir_au_verge_d_or': 'Tonight, at the Verge d’Or',
  'exceptions.bloc.rien_a_relire': 'nothing to go over',
  'exceptions.bloc.nom_retourne_au_travail': '{nom} is going back to work',
  'exceptions.bloc.escalades_archivees': 'Archived escalations',
  'exceptions.bloc.file_indisponible_verifier_la_pile': 'Queue unavailable — check the stack',
  'exceptions.bloc.il_attend_une_consigne': 'waiting for your orders',
  'exceptions.bloc.ouvrir': 'Open',
  'exceptions.bloc.patron': 'Boss',
  'exceptions.bloc.toute_la_ville': 'citywide',
  'exceptions.bloc.au_batiment_touche': 'at the building that was hit',
  'exceptions.bloc.chez_enseigne': 'at {enseigne}',
  'exceptions.bloc.reparer_enseigne': 'Repair {enseigne}',
  'exceptions.bloc.autre_issue': 'other option',
  'exceptions.bloc.autres_issues': 'other options',
  'exceptions.bloc.le_comptoir_n_a_pas_repondu': 'The counter didn’t answer.',
  'exceptions.bloc.ouvrir_sa_main': 'OPEN THEIR HAND',
  'exceptions.bloc.suggere_appui_long_sa_main': 'suggested · long press — their hand',
  'exceptions.categorie.conflit': 'CONFLICT',
  'exceptions.categorie.diplomatie': 'DIPLOMACY',
  'exceptions.categorie.renseignement': 'INTELLIGENCE',
  'exceptions.categorie.reputation': 'REPUTATION',
  'exceptions.locuteur.la_ville': 'The city',
  'exceptions.locuteur.votre_lieutenant': 'Your lieutenant',
  'exceptions.nombre.cinq': 'Five',
  'exceptions.nombre.deux': 'Two',
  'exceptions.nombre.plusieurs': 'Several',
  'exceptions.nombre.quatre': 'Four',
  'exceptions.nombre.six': 'Six',
  'exceptions.nombre.trois': 'Three',
  'exceptions.apres.bribe_failed': 'The money’s gone and it backfired: the heat is rising',
  'exceptions.apres.bribe_succeeded': 'The raid never happened: the building is back up, the heat eases',
  'exceptions.apres.deferred': 'Repair put off: the building stays shut',
  'exceptions.apres.deferred.enseigne': 'Repair put off: {enseigne} stays shut',
  'exceptions.apres.demolished': 'The building is razed; the block is free',
  'exceptions.apres.escalated': 'Archived: to go over with a clear head',
  'exceptions.apres.laid_low': 'Lying low: the heat eases, the building stays damaged',
  'exceptions.apres.repairing': 'The building is coming back, in its own time',
  'exceptions.apres.repairing.enseigne': '{enseigne} is coming back, in its own time',
  'exceptions.apres.repairing_slow': 'The building is coming back slowly — it costs less',
  'exceptions.apres.repairing_slow.enseigne': '{enseigne} is coming back slowly — it costs less',
  'exceptions.apres.resolved': 'Noted: nothing has changed, though.',
  'exceptions.apres.taught': 'It’s a rule now: next time, it’s handled without you',

  // --- `famille.*` (1 clé) --- les 44 jumelles à slug anglais retirées le 2026-09-23 (zéro demandeur, TD-690)
  'famille.archetype.distribution': 'Distribution',

  // --- `forensic.*` (37 clés) ---
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
  'forensic.acteur.avocat': 'Lawyer',
  'forensic.acteur.greffier': 'Clerk',
  'forensic.acteur.il_a_peur': 'he\'s scared',
  'forensic.acteur.il_tient': 'he\'s holding',
  'forensic.acteur.injoignable': 'unreachable',
  'forensic.acteur.parti': 'gone',
  'forensic.bloc.acteurs_qui_tiennent': 'players who hold',
  'forensic.bloc.ceux_qui_ne_sont_pas_sur_la_liste': 'the ones not on the list',
  'forensic.bloc.d_autres_parlent_et_vous_ne_les_voyez_pas': 'Others are talking, and you can\'t see them',
  'forensic.bloc.la_comptabilite': 'the books',
  'forensic.bloc.la_comptabilite_les_rejets_et_le_train_de_vie_ne_se_melangent_pas_pour_voir_qui_parle_la_fenetre_des_acteurs_en_haut_a_droite': 'the books, the discharges and the lifestyle {don\'t mix}. To see {who\'s talking}, the players window, top right.',
  'forensic.bloc.le_dossier': 'The file',
  'forensic.bloc.le_renseignement_s_achete_acteur_par_acteur_eteint_tant_que_le_prix_n_est_pas_servi_on_n_achete_pas_sans_savoir_combien': 'intel is bought {one player at a time} — off until {the price is known}: you don\'t buy without knowing how much',
  'forensic.bloc.les_livres_et_le_train_de_vie_personne_ne_regarde_par_la_pour_l_instant': 'The books and the lifestyle: nobody\'s looking that way. For now.',
  'forensic.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_tout_va_bien_c_est_on_ne_sait_pas': 'we got no answer. That\'s not "all good": it\'s "we don\'t know".',
  'forensic.bloc.on_peut_etre_propre_sur_deux_et_pris_sur_la_troisieme': 'You can be clean on two and caught on the third',
  'forensic.bloc.pas_encore_sur_la_table': 'not on the table yet',
  'forensic.bloc.pourquoi_trois_colonnes': 'why three columns',
  'forensic.bloc.renseignement': 'Intel',
  'forensic.bloc.sur_un_acteur_pas_sur_une_piste_eteint_le_prix_n_est_pas_servi': 'on a player, not on a trail — off: {the price isn\'t known}',
  'forensic.bloc.un_inspecteur_du_port_un_courtier_le_greffier_d_un_juge_ils_se_paient_comme_les_autres_mais_personne_ne_vous_a_encore_donne_leur_nom': 'a harbour inspector, a broker, a judge\'s clerk: {they can be bought} like anyone else, but {nobody has given you their names yet}.',

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

  // --- `marche.*` (31 clés) --- ㉑ Le marché ; mots RATIFIÉS (scratchpad/MOTS-MARCHE-21.md, recopiés à l’octet) ; FR = littéral client, EN généré. Aucun site back n’émet ces clés : le client les lit seules (servie ≠ émise, `_i18n-emises-vs-servies.py` ne l’exige pas). Les 4 noms de substance sont `en == fr` (NOM_PROPRE, `_en-egal-fr-classement.txt`).
  'marche.colonne.quartier': 'district',
  'marche.compteur.lignes_connues': 'known lines',
  'marche.compteur.quartiers_noirs': 'dark districts',
  'marche.compteur.sures': 'solid',
  'marche.confiance.oui_dire': 'hearsay',
  'marche.confiance.recoupe': 'cross-checked',
  'marche.confiance.sur': 'solid',
  'marche.etat.chargement': 'Checking the board…',
  'marche.etat.echec': 'The board isn’t answering.',
  'marche.forme.briques': 'bricks',
  'marche.forme.cristaux': 'crystals',
  'marche.forme.plaque': 'slab',
  'marche.forme.prismes': 'prisms',
  'marche.origine.extrait_de_racine': 'root extract',
  'marche.origine.herbe_des_friches': 'wasteland weed',
  'marche.origine.lys_de_verre': 'glass lily',
  'marche.origine.resine_de_lull': 'lull resin',
  'marche.phrase.bande_high': 'several of ours have dealt there and the sources hold. Still no price: only that the line holds.',
  'marche.phrase.bande_low': 'a single source, never cross-checked — bar talk. Nobody will tell you the price: only that people talk about it.',
  'marche.phrase.bande_moderate': 'two sources agree — not a rumour, not a certainty. Nobody will tell you the price, or what moves: only how far you can trust it.',
  'marche.phrase.bilan_lignes': '{n, plural, =0 {No lines out of {total}: none of ours has dealt anywhere yet.} one {One line out of {total}. The rest, none of ours has ever dealt there.} other {# lines out of {total}. The rest, none of ours has ever dealt there.}}',
  'marche.phrase.case_ash': 'the grey powder isn’t sold through a dealer: it’s placed, at the meeting, with the Glass people.',
  'marche.phrase.case_sans_ligne': 'none of ours has ever moved anything there. It isn’t a line at zero: it’s a line never opened. It will light up the day one of your dealers works there.',
  'marche.sous_titre.tableau_du_verge_d_or': 'the Verge d’Or board',
  'marche.substance.ash': 'ash',
  'marche.substance.brindle': 'brindle',
  'marche.substance.crick': 'crick',
  'marche.substance.hush': 'hush',
  'marche.titre.hors_du_tableau': 'OFF THE BOARD',
  'marche.titre.le_marche': 'THE MARKET',
  'marche.titre.voyant_eteint': 'light off',

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
  'reputation.etat.on_demande_des_gages': 'We’ll come, but with guarantees',
  'reputation.etat.on_vient_sans_garantie': 'They come with no guarantees',
  'reputation.etat.pas_encore_jugeable': 'Too early to judge',
  'reputation.etat.posture_inconnue': 'Posture unknown',
  'reputation.etat.vous_vous_en_ecartez': 'You’re straying from it',
  'reputation.etat.vous_vous_y_tenez': 'You’re sticking to it',

  // ★ La SEULE clé écrite à la main : la ligne d'ambiance de ⑨ s'assemble depuis un COMPTE.
  //   Keyer ses fragments donnerait des phrases intraduisibles (l'ordre des mots change de
  //   langue à langue) ; keyer la phrase entière est impossible puisqu'elle varie. La forme
  //   juste est un pluriel ICU — le même motif que `game.lieutenant.assignment.summary`.
  'exceptions.file.ambiance': '{count, plural, =0 {Nobody’s waiting} =1 {Only one is waiting for your orders — the queue is calm} =2 {Two are waiting for your orders — the queue is calm} =3 {Three are waiting for your orders — the queue is calm} =4 {Four are waiting for your orders — the queue is calm} =5 {Five are waiting for your orders — the queue is calm} =6 {Six are waiting for your orders — the queue is calm} other {Several are waiting for your orders — the queue is calm}}',
  'exceptions.file.attendent_encore': '{count, plural, =1 {Only one still waiting} =2 {Two still waiting} =3 {Three still waiting} =4 {Four still waiting} =5 {Five still waiting} =6 {Six still waiting} other {Several still waiting}}',

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

  // --- `exception.lieutenant_cook.*` (7 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_cook.card.descriptor': 'The heat’s climbing around the lab. I’ve got no orders for this.',
  'exception.lieutenant_cook.keep.label': 'Keep cooking',
  'exception.lieutenant_cook.keep.projected_consequence': 'The lieutenant ignores the heat and keeps operating.',
  'exception.lieutenant_cook.pause.label': 'Pause operations when heat is high',
  'exception.lieutenant_cook.pause.projected_consequence': 'The lieutenant stops cooking while heat stays high.',
  'exception.lieutenant_cook.pause_hard.label': 'Pause only on extreme heat',
  'exception.lieutenant_cook.pause_hard.projected_consequence':
    'The lieutenant keeps cooking through moderate heat, pausing only when heat is extreme.',

  // --- `exception.lieutenant_distribution.*` (7 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_distribution.card.descriptor': 'The dealer’s float keeps climbing and nobody’s collecting it. Do I leave it?',
  'exception.lieutenant_distribution.acknowledge.label': 'Leave it for now',
  'exception.lieutenant_distribution.acknowledge.projected_consequence': 'No rule is added; the float keeps growing.',
  'exception.lieutenant_distribution.collect.label': 'Collect the float automatically',
  'exception.lieutenant_distribution.collect.projected_consequence':
    'The lieutenant sweeps the dealer float onward once it is high.',
  'exception.lieutenant_distribution.collect_high.label': 'Collect only above a high threshold',
  'exception.lieutenant_distribution.collect_high.projected_consequence':
    'The lieutenant lets the float grow and only collects when it is high.',

  // --- `exception.lieutenant_intelligence.*` (5 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_intelligence.card.descriptor': 'The rival’s gone quiet. Do I keep watching anyway, or wait till they move?',
  'exception.lieutenant_intelligence.observe_anyway.label': 'Gather intel even when rival is silent',
  'exception.lieutenant_intelligence.observe_anyway.projected_consequence':
    'The lieutenant runs surveillance even in silent regime, building belief state.',
  'exception.lieutenant_intelligence.wait.label': 'Wait for rival to become active',
  'exception.lieutenant_intelligence.wait.projected_consequence':
    'The lieutenant idles until the rival enters mounting or crushing regime.',

  // --- `exception.lieutenant_logistics.*` (7 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_logistics.card.descriptor': 'The product’s piling up and nothing’s going out. I’ve got no orders to dispatch it.',
  'exception.lieutenant_logistics.acknowledge.label': 'Leave it for now',
  'exception.lieutenant_logistics.acknowledge.projected_consequence':
    'No rule is added; the product keeps piling up.',
  'exception.lieutenant_logistics.dispatch.label': 'Dispatch product automatically',
  'exception.lieutenant_logistics.dispatch.projected_consequence':
    'The lieutenant routes product onward whenever the source holds stock.',
  'exception.lieutenant_logistics.dispatch_high.label': 'Dispatch only when the stock is high',
  'exception.lieutenant_logistics.dispatch_high.projected_consequence':
    'The lieutenant lets product accumulate and only dispatches when the stock is high.',

  // --- `exception.lieutenant_muscle.*` (5 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_muscle.card.descriptor': 'The rival’s playing dead. Until they move, I’ve got nobody to go see.',
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

  // --- `exception.operator_input.*` (1 clé) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.operator_input.card.descriptor': 'I need your call on this one. I don’t see a good way to play it.',

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
  //     reco »), choix 6A. **Ferme D10-h** : le canon ch11 nommait un lieutenant et une route qui ne
  //     correspondent pas à ce qui est RÉELLEMENT livré (l'archétype livré est COOK, et la route citée
  //     n'existe pas). La première carte est réécrite pour ce qui est RÉELLEMENT livré.
  //     ⚠️ LA CLÉ EST L'ID DU TUTORIEL, pas `<id>.body` : le catalogue ne sert que des ids, et le client
  //     n'avait donc rien à afficher (défaut mesuré dans la note ㉕). En faisant de l'id une clé, la
  //     bulle se remplit sans changer une ligne de projection.
  //     ✅ Égalité d'ENSEMBLES vérifiée contre `tutorial-id-catalogue.ts` : 11 ids, 11 textes, aucun
  //     orphelin d'un côté ni de l'autre — un texte sans id ne s'afficherait jamais, un id sans texte
  //     laisserait une bulle vide.
  //     Traduits le 2026-09-23 (TD-690, atelier `17-…`) ; le FR vouvoie le joueur (canon, `pluralization_and_gender.md:209`).

  // ★ D37 (atelier 8d9b9e3a, 2026-09-26) — VALEUR CORRIGÉE, {nom} RETIRÉ : l'en-tête de la carte
  //   nomme déjà le lieutenant (le client encadre « Patron — … », ExceptionQueueController.cs:779),
  //   donc un second nom dans le corps du texte était redondant. Deux fautes de fond corrigées au
  //   passage : le précurseur en cause est le Pyralin, pas un « solvant » générique ; et la carte
  //   n'offre que Prendre acte / Escalader — jamais de choix « commander maintenant / attendre
  //   demain ». Le paramètre `nom` RESTE émis dans `onboarding_preseed_params` (additif : un pont
  //   client TD-763 en dépend) même si ce gabarit ne le consomme plus.
  'tutorial.exception_card.onboarding_preseed':
    'Tonight’s cook is stuck: no Pyralin at the lab. We need some before firing back up.',
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
  // ★ D37 (atelier 8d9b9e3a, 2026-09-26) — même correctif que `tutorial.exception_card
  //   .onboarding_preseed` juste au-dessus (même événement, vu depuis la carte) : {nom} retiré
  //   (redondant avec l'en-tête client), Pyralin nommé, actions alignées sur Prendre acte / Escalader.
  'onboarding.preseed_exception.card':
    'Tonight’s cook is stuck: no Pyralin at the lab. We need some before firing back up.',

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
  'appro.bouton.ca_part_du_compte_tout_de_suite': 'it comes out of the account right away',
  'appro.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'appro.titre.la_chaine_d_appro_est_indisponible': 'The supply chain is unavailable',
  'appro.titre.la_chaine_d_appro_n_a_pas_repondu': 'The supply chain didn’t answer',
  'appro.etat.rien_a_commander_vous_ne_tenez_pas_encore_de_labo': 'Nothing to order — you don’t have a lab yet.',
  'appro.etat.vous_ne_tenez_encore_aucun_site': 'You don’t hold any site yet.',
  'appro.titre.la_commande_est_arrivee': 'The order has arrived',
  'appro.sous_titre.le_stock_est_reconstitue_vous_pouvez_commander_a_nouveau': 'Stock is back up. You can order again.',
  'appro.bloc.a_quoi_ca_sert': 'WHAT IT’S FOR',
  'appro.bloc.ce_qu_il_en_reste': 'WHAT’S LEFT',
  'appro.bloc.le_prix': 'THE PRICE',
  'appro.bloc.le_fournisseur': 'THE SUPPLIER',
  'appro.bloc.des_maillons_existent_mais_cet_ecran_ne_sait_pas_encore_les_afficher': 'There are links, but this screen can’t show them yet.',
  'appro.bloc.la_commande': 'THE ORDER',
  'appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas': '{nom}: “The shelf is empty. Without Pyralin, I’m not firing back up.”',
  'appro.bloc.rien_a_remonter_pour_l_instant_la_chaine_ne_connait_aucun_maillon_sur_ce_compte': 'Nothing to trace upstream yet — the chain doesn’t know a single link on this account.',
  'appro.bloc.votre_lieutenant_on_en_a_besoin_et_il_n_y_en_a_plus': 'Your lieutenant: “We need it, and there’s none left.”',
  'appro.sous_titre.elle_est_payee_et_partie_il_n_y_a_plus_qu_a_attendre': 'It’s paid and on its way. All that’s left is to wait.',
  'appro.sous_titre.sans_elle_aucun_labo_ne_rallume_le_fournisseur_lui_a_ses_humeurs': 'Without it, no lab fires back up. The supplier, meanwhile, has its moods.',
  'appro.titre.commander_de_la_matiere_premiere': 'Order raw materials',
  'appro.titre.la_commande_est_en_route': 'The order is on its way',
  'boutique.bloc.jetons': '— Marks',
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
  'distribution.bloc.aucune_destination_connue_pour_l_envoi_de_ce_soir': 'No known destination for the next run.',
  'distribution.bloc.aucune_route_tendue_pour_l_instant': 'No route strung yet.',
  'distribution.bloc.destination_a_determiner': 'destination to be decided',
  'distribution.bloc.il_est_en_chemin_on_ne_le_rappelle_pas_on_saura_a_l_arrivee': 'On the way. You don’t call them back — you’ll know on arrival.',
  'distribution.bloc.la_regulation': 'THE FLOW',
  'distribution.bloc.vos_courriers': 'YOUR COURIERS',
  'distribution.bouton.acheter_un_velo': 'BUY A BICYCLE',
  'distribution.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'distribution.titre.la_distribution_est_indisponible': 'Distribution is unavailable',
  'distribution.titre.la_distribution_n_a_pas_repondu': 'Distribution didn’t answer',
  'distribution.titre.ce_qui_est_sur_la_route': 'What’s on the road',
  'distribution.sous_titre.un_coursier_est_parti_voila_le_chemin_qu_il_prend': 'A courier has set off. Here’s the way they’re taking.',
  'distribution.bloc.d_ou_ca_part': 'WHERE IT LEAVES FROM',
  'distribution.bloc.ou_ca_va': 'WHERE IT’S GOING',
  'distribution.bloc.le_chemin': 'THE WAY',
  'distribution.bloc.a_traverser': 'TO CROSS',
  'distribution.bloc.cette_route': 'THIS ROUTE',
  'distribution.bloc.il_est_parti_a_la_nuit_ca_serpente_mais_c_est_la_seule_qui_evite_le_pont_du_threnny': 'On the way. It winds, but it’s the only one that avoids the Threnny bridge.',
  'distribution.bloc.la_marchandise_est_prete_au_labo_dites_moi_qui_part_et_par_ou_et_je_l_enverrai_ce_soir': 'The product is ready at the lab. Tell me who goes and which way, and I’ll send it right away.',
  'distribution.bloc.livre_le_carton_est_au_comptoir_personne_n_a_rien_vu': 'Delivered. The box is at the counter, and nobody saw a thing.',
  'distribution.bouton.envoyer_ce_soir': 'SEND NOW',
  'distribution.bouton.tendre_une_autre_ficelle': 'STRING ANOTHER LINE',
  'distribution.sous_titre.la_marchandise_est_arrivee_voila_ce_que_le_trajet_a_coute_a_la_route': 'The product has arrived. Here’s what the trip cost the route.',
  'distribution.sous_titre.on_choisit_d_ou_ca_part_ou_ca_va_et_par_quel_chemin': 'You choose where it leaves from, where it’s going, and which way.',
  'distribution.titre.c_est_livre': 'It’s delivered',
  'distribution.titre.l_envoi_de_ce_soir': 'The next run',
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
  'famille.band.bas': 'Low',
  'famille.band.epuise': 'Depleted',
  'famille.band.inconnu': 'Unknown',
  'famille.band.normal': 'Nominal',
  'famille.band.plein': 'Full',
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
  'filiere.bloc.ce_que_la_chaine_fait_de_votre_argent': 'WHAT THE CHAIN DOES WITH YOUR MONEY',
  'filiere.bloc.de_l_argent_attend_a_cette_etape': 'money is waiting at this stage',
  'filiere.bloc.elle_le_lave_par_paliers_pas_d_un_coup': 'It cleans it in stages, not all at once',
  'filiere.bloc.etape': 'STAGE',
  'filiere.bloc.la_chaine_de_la_tete_a_la_sortie': 'THE CHAIN, FROM HEAD TO EXIT',
  'filiere.bloc.la_filiere_n_a_pas_repondu': 'THE PIPELINE DIDN’T ANSWER',
  'filiere.bloc.la_sortie': 'THE EXIT',
  'filiere.bloc.rien_n_attend_a_cette_etape': 'nothing is waiting at this stage',
  'filiere.bloc.chaque_etape_rend_l_argent_un_peu_plus_propre_que_la_precedente_seule_la_derniere_credite_le_portefeuille_tant_qu_il_n_y_a_pas_de_sortie_il_n_y_a_pas_d_argent_seulement_une_file_d_attente': 'each stage leaves the money a little cleaner than the one before. Only the LAST one credits the wallet — as long as there’s no exit, there’s no money, only a queue.',
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
  'journal.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_ville_est_calme_c_est_on_ne_sait_pas_ce_qu_elle_a_fait_cette_nuit': 'no answer came back. That\'s not “the city is quiet” — it\'s “we don\'t know what it did”.',
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
  'journal.bloc.rien_ce_matin_la_ville_a_passe_une_nuit_tranquille': 'Nothing this morning.\nThe city had a quiet night.',
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
  'loi.titre.le_parloir_n_a_pas_repondu': 'The visiting room didn’t answer',
  'loi.bouton.mettre_sous_retention': 'PUT ON RETAINER',
  'loi.bouton.lui_trouver_un_avocat': 'GET HIM A LAWYER',
  'loi.bloc.le_commis_d_office_fait_ce_qu_il_peut': 'the public defender does what he can',
  'loi.bloc.commis_d_office': 'Public Defender',
  'loi.badge.en_place': 'IN PLACE',
  'loi.bloc.gratuit_il_fait_ce_qu_il_peut': 'free — does what they can',
  'loi.bloc.un_cabinet': 'Boutique Counsel',
  'loi.badge.disponible': 'AVAILABLE',
  'loi.bloc.ca_coute_il_connait_les_juges': 'it costs — knows the judges',
  'loi.bloc.la_filiere': 'Corruption Pipeline',
  'loi.badge.a_vos_risques': 'AT YOUR OWN RISK',
  'loi.bloc.ca_coute_cher_et_ca_peut_se_retourner': 'it costs a lot — and it can turn on you',
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
  // famille — 2 clés que le client demande et qu'aucun back n'avait servies (mesure orchestrateur, liste client `c06b0600`).
  //     Recopiées de l'atelier `27-deux-cles-famille.md` (da `8c7a75a4`, l.9-10) — PROPOSÉ, NON RATIFIÉ.
  'famille.ecran.nom': 'Name',
  'famille.mode.mode_inconnu': 'Unknown mode',

  // ═══ 2026-09-04 — les 73 clés produites par les conversions des sessions B et C (87 depuis ⑯ et le paquet `19-…`, 2026-09-23 ;
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
  'autonomie.etat.inconnu': 'Unknown',
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
  'carnet.bloc.les_ordres_de_ce_soir': 'Orders to launch',
  'carnet.bloc.ordres_sur_8': ' ORDERS OUT OF 8',
  'carnet.bloc.pas_de_reponse': 'No answer',
  'carnet.bloc.rejouer_une_soiree_verrouille': 'Replay an evening — locked',
  'carnet.bloc.rien': '— nothing —',
  'carnet.bloc.rien_n_a_encore_ete_demande': 'Nothing has been requested yet',
  'carnet.bloc.une_suite_d_ordres_qu_on_met_de_cote_et_qu_on_relance_d_un_geste_cette_facon_de_faire_s_ouvre_plus_tard_il_faut_d_abord_monter_d_un_palier': 'a sequence of orders you set aside and replay in one move. This way of doing things opens up later — you have to move up a tier first.',
  'carnet.bloc.ce_que_la_ville_ne_dit_pas': 'WHAT THE CITY DOESN’T SAY',
  'carnet.bloc.le_carnet_n_a_pas_repondu': 'the order book didn’t answer',
  'conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras': 'None of your lieutenants is the Muscle type.',
  'conflit.bloc.c_est_lui_qui_part_la_nuit_il_vous_en_manque_un_ce_n_est_pas_casse_vous_n_en_avez_tout_simplement_pas_encore': 'That’s the muscle who goes out at night. You’re missing one — nothing is broken, you simply don’t have one yet.',
  'conflit.bloc.dessinees_pas_renseignees_personne_ne_vous_dit_ce_qu_elles_preparent_ni_ce_qu_elles_possedent_on_frappe_a_l_aveugle': 'Drawn, not informed: no one tells you what they\'re preparing or what they own — we strike blind.',
  'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain': '“Just tell me where. I’m going, we’ll know tomorrow.”',
  'conflit.bloc.le_compte_des_envois_precedents_est_indisponible_pour_l_instant': 'The count of previous sorties is unavailable for now.',
  'conflit.bloc.les_quatre_familles': 'The four families of Brennar',
  'conflit.bloc.qui_part_ce_soir': 'WHO GOES',
  'conflit.bloc.vous_avez_l_homme_personne_pour_lui_dire_ou_frapper_on_ne_sait_pas_encore_ou_ils_sont': 'Your muscle is here. No one to tell them where to strike — we don’t know where to find them yet.',
  'conflit.bloc.le_compte_des_envois_precedents_n_a_pas_repondu': 'The tally of earlier sends didn’t answer.',
  'conflit.sous_titre.ce_que_vos_hommes_rapportent_des_familles_rivales_et_qui_vous_reste_pour_y_retourner': 'What your runs bring back from the rival families, and who you have left to go back.',
  'conflit.sous_titre.reessayez_dans_un_instant': 'Try again in a moment.',
  'conflit.titre.le_conflit': 'The conflict',
  'conflit.titre.le_conflit_est_indisponible': 'Conflict is unavailable',
  'conflit.titre.le_conflit_n_a_pas_repondu': 'The conflict didn’t answer',
  'district.type_batiment.atelier_de_presse': 'Print shop',
  'district.type_batiment.bureau': 'Agency',
  'district.type_batiment.cache': 'Stash',
  'district.type_batiment.banque': 'Vault',
  'district.type_batiment.commerce_ecran': 'Front',
  'district.type_batiment.laboratoire': 'Lab',
  'district.type_batiment.laboratoire_specialise': 'Specialist lab',
  'district.type_batiment.planque': 'Safehouse',
  'district.type_batiment.point_de_vente': 'Corner',
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
  'revue.bloc.personne_au_comptoir_ce_matin': 'No one at the counter this morning.',
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

  // ═══ ① intérieur de district · fiche · bandeau · médaillon — 22 clés (2026-09-23) ═══
  //     Lues par ① et le chrome (mesure CLIENT-2 contre la tête back 62dcbb35) et non servies : la garde « zéro repli »
  //     rougissait à la capture suivante. Valeurs RECOPIÉES du fichier de l'atelier, jamais réécrites :
  //     `Tools/atelier-2026-09-22/22-interieur-district-fiche-inventaire.md` (da `0f45d7a4`) §7.1 A (l.227-239), B (l.252-253),
  //     C (l.287-293). `heat.bucket.*` est lu aussi par le MÉDAILLON, sur tous les écrans.
  //     PROPOSÉ, NON RATIFIÉ : les mots de l'atelier hors canon (bandes de récolte, de revenu, de chaleur ; le bandeau
  //     — sauf les états C et D, mot pour mot du canon, district rendu générique) ; l'en de `chrome.medaillon.descente`
  //     (« Raid », le mot déjà servi par `building.row.risque_de_descente`). Canon : les 3 titres de case, « Descente ».
  //     Paramètres : `{type}` = la valeur servie de `building.type.*` ; `{district}` `{block}` `{rang}` = ceux de
  //     `name_i18n` ; `{nom}` = le nom servi du lieutenant (sans genre : « attend », « a » ne s'accordent pas).
  'district.fiche.a_collecter': 'TO COLLECT',
  'district.fiche.revenus': 'INCOME',
  'district.fiche.chaleur_locale': 'LOCAL HEAT',
  'district.harvest.nothing': 'Nothing',
  'district.harvest.available': 'Ready',
  'district.harvest.full': 'Full',
  'district.revenue.idle': 'Idle',
  'district.revenue.earning': 'Earning',
  'heat.bucket.cold': 'Cold',
  'heat.bucket.warm': 'Warm',
  'heat.bucket.hot': 'Hot',
  'heat.bucket.burning': 'Burning',
  'district.fiche.type_lieu': '{type} · {district}, block {block}',
  'district.fiche.type_lieu.rang': '{type} · {district}, block {block}, no. {rang}',
  'district.fiche.blanchiment_indisponible_raison': 'Laundering refused. {raison}',
  'district.fiche.blanchiment_indisponible_session_absente': 'Can’t launder: the connection to the game is lost.',
  'district.fiche.blanchiment_indisponible_aucune_planque': 'Can’t launder: you have no safehouse.',
  'district.fiche.petit_lot_confie_a_la_filiere': 'A small batch goes into the pipeline.',
  'district.fiche.recherche_de_la_planque': 'Looking for the safehouse…',
  'district.fiche.reponse_absente': 'No answer came back.',
  'blanchiment.raison.reponse_vide': 'The answer came back empty.',
  'blanchiment.raison.reponse_illisible': 'The answer couldn’t be read.',
  'blanchiment.raison.connexion_expiree': 'The connection has expired.',
  'blanchiment.raison.fonds_ou_place': 'Not enough money or room.',
  'blanchiment.raison.lot_refuse': 'This batch isn’t accepted.',
  'blanchiment.raison.indisponible': 'The pipeline isn’t answering right now.',
  'district.fiche.blanchiment_choisissez_un_commerce_de_facade': 'To launder, first pick a front business.',
  'chrome.bandeau.brigade_quadrille': 'The squad is combing the district — hide the cash',
  'chrome.bandeau.les_indics_parlent': 'The informants are talking: the squad is stirring',
  'chrome.bandeau.attend_vos_ordres': '{nom} is waiting for your orders',
  'chrome.bandeau.la_ville_attend_vos_ordres': 'The city is waiting for your orders',
  'chrome.bandeau.rapport': '{nom} has a report for you',
  'chrome.bandeau.trancher': 'decide',
  'chrome.bandeau.lire': 'read',
  'chrome.medaillon.descente': 'Raid',
  // commun — 4 mots de REPLI partagés par les écrans (bande ou sorte hors domaine, bâtiment sans nom), 2026-09-23.
  //     Recopiés de l'atelier `28-mots-inconnus.md` (da `26c8e265`, l.26-29) — PROPOSÉ, NON RATIFIÉ.
  'commun.repli.etat_inconnu': 'unknown state',
  'commun.repli.type_inconnu': 'unknown type',
  'commun.repli.le_batiment': 'the building',
  'commun.repli.un_batiment': 'A building',
  // valeurs SERVIES sans mot — 17 clés (2026-09-23) : 7 `building.*` que `Bande(famille, valeur)` du client dérive tout de
  //     suite, 6 `distribution.bloc.*` et 4 `appro.bloc.*` pour quand leurs littéraux passeront par `Libelle`. Recopiées de
  //     l'atelier `29-valeurs-servies-sans-mot.md` (da `7746e0bb`, l.20-26, 34-39, 47-50) — PROPOSÉ, NON RATIFIÉ.
  'building.structural.failed': 'Out of service',
  'building.lab_tier.none': 'No lab',
  'building.hub_tier.none': 'No hub',
  'building.roster.none': 'No crew',
  'building.money_holding_tier.none': 'No vault',
  'building.capacity.none': 'No vault',
  'building.yield.none': 'No vault',
  'distribution.bloc.pas_encore_tendue': 'not strung yet',
  'distribution.bloc.saturee': 'jammed',
  'distribution.bloc.coupee': 'cut',
  'distribution.bloc.tient': 'holding',
  'distribution.bloc.l_imprimerie': 'the print shop',
  'distribution.bloc.l_agence': 'the agency',
  'appro.bloc.il_en_reste_peu': 'running low',
  'appro.bloc.il_en_reste': 'some left',
  'appro.bloc.il_y_en_a_assez': 'plenty left',
  'appro.bloc.il_n_y_a_plus_rien': 'nothing left',
  // atelier 30 v2 — 106 littéraux nommés (2026-09-23), sites du client (`30-litteraux-nommes-v2-2026-09-23.tsv`, da `c39b4136`,
  //     110 sites, `verifier-30.py` à 0 ; 4 clés déjà servies à l'identique, non répétées). Décisions f2 D12-D16 au registre des
  //     arbitrages : un mot par type, formes épicènes, la maquette ratifiée l'emporte, « plusieurs ponts », « Plein jour » ;
  //     domaine `police.bloc` (et non plus `commissariat.bloc`). Mots hors maquette ratifiée : PROPOSÉ, NON RATIFIÉ.
  'appro.bloc.le_prix_monte': 'the price is rising',
  'appro.bloc.le_prix_ne_bouge_pas': 'the price is holding',
  'appro.bloc.le_prix_baisse': 'the price is dropping',
  'conflit.bloc.la_coil': 'The Coil',
  'conflit.bloc.tarcum': 'Tarcum',
  'conflit.bloc.gorge_de_fer': 'Iron Throat',
  'conflit.bloc.saltline': 'Saltline',
  // ㉙ item k, addendum écussons v2 (atelier `d83582fd`, 2026-09-24) : initiale du MOT FORT de
  // chaque famille (article retiré) — PAS un `charAt(0)` du nom servi ('La Coil'.charAt(0) === 'L',
  // pas 'C'). ParValeur sur le `rival_key` (db/schema/conflict_rival.ts:66, migration 0081:57) —
  // les 4 suffixes sont exactement les membres de l'enum, lus dans la source.
  'conflit.initiale.coil': 'C',
  'conflit.initiale.tarcum': 'T',
  'conflit.initiale.iron_throat': 'I',
  'conflit.initiale.saltline': 'S',
  'conflit.bloc.les_ferrailleurs_de_spine': 'scrap, in Spine',
  'conflit.bloc.le_port_et_ce_qui_y_entre': 'the port, and what comes in',
  'conflit.bloc.les_docks_du_nord': 'the north docks',
  'conflit.bloc.la_ligne_de_sel_a_l_est': 'the salt line, to the east',
  'demolition.ecran.un_commerce_ecran': 'A front',
  'demolition.ecran.une_planque': 'A safehouse',
  'demolition.ecran.une_reserve': 'A stash',
  'demolition.ecran.un_labo': 'A lab',
  'demolition.ecran.une_serre': 'A grow house',
  'demolition.ecran.une_raffinerie': 'A refinery',
  'demolition.ecran.une_imprimerie': 'A print shop',
  'demolition.ecran.un_relais': 'A hub',
  'demolition.ecran.une_agence': 'An agency',
  'demolition.ecran.un_coin_de_vente': 'A corner',
  'demolition.ecran.une_banque': 'A vault',
  'demolition.ecran.un_labo_specialise': 'A specialist lab',
  'distribution.bloc.le_relais': 'the hub',
  'distribution.bloc.le_labo': 'the lab',
  'distribution.bloc.le_labo_specialise': 'the specialist lab',
  'distribution.bloc.la_raffinerie': 'the refinery',
  'distribution.bloc.la_banque': 'the vault',
  'distribution.bloc.la_reserve': 'the stash',
  'distribution.bloc.le_commerce_ecran': 'the front',
  'distribution.bloc.le_coin_de_vente': 'the corner',
  'distribution.bloc.la_planque': 'the safehouse',
  'distribution.bloc.la_serre': 'the grow house',
  'distribution.bloc.droit_le_plus_court': 'straight — the shortest',
  'distribution.bloc.ca_serpente_plus_long_plus_discret': 'it winds — longer, quieter',
  'distribution.bloc.tordu_beaucoup_de_detours': 'twisted — lots of detours',
  'distribution.bloc.aucune_riviere': 'no river',
  'distribution.bloc.un_pont': 'one bridge',
  'distribution.bloc.plusieurs_ponts': 'several bridges',
  'distribution.bloc.a_destination': 'arrived',
  'distribution.bloc.disponible': 'ready',
  'distribution.bloc.en_chemin': 'on the way',
  'distribution.bloc.a_pied': 'on foot',
  'distribution.bloc.a_velo': 'by bike',
  'distribution.bloc.en_voiture': 'by car',
  'distribution.bloc.en_camion_refrigere': 'by refrigerated van',
  'famille.anciennete.depuis_peu': 'New',
  'famille.anciennete.depuis_un_moment': 'Settled in',
  'famille.anciennete.du_metier': 'Seasoned',
  'famille.anciennete.de_la_vieille_garde': 'Veteran',
  'famille.anciennete.fait_partie_des_murs': 'Entrenched',
  'famille.regle.comme_d_habitude': 'Run default',
  'famille.regle.suspendre': 'Pause ops',
  'famille.regle.dans_mon_batiment': 'in my building',
  'famille.regle.faire_comme_d_habitude': 'run the default behavior',
  'famille.regle.suspendre_les_operations': 'pause operations',
  'loi.bloc.cabinet': 'boutique counsel',
  'loi.bloc.filiere': 'corruption pipeline',
  'vente.bloc.vide': 'EMPTY',
  'vente.bloc.peu': 'LOW',
  'vente.bloc.moyenne': 'PARTLY FULL',
  'vente.bloc.pleine': 'FULL',
  'vente.bloc.deborde': 'OVERFLOWING',
  'vente.bloc.au_tarif': 'AT THE RATE',
  'vente.bloc.au_dessus': 'ABOVE',
  'vente.bloc.cher': 'PRICEY',
  'vente.bloc.tres_cher': 'VERY PRICEY',
  'vente.bloc.au_travail': 'on shift',
  'vente.bloc.au_repos': 'idle',
  'vente.bloc.pas_la': 'away',
  'vente.bloc.grille': 'burned',
  'police.bloc.en_chasse': 'HUNTING',
  'police.bloc.soupcon': 'SUSPICIOUS',
  'police.bloc.en_veille': 'WATCHFUL',
  'police.bloc.en_sommeil': 'DORMANT',
  'police.bloc.partout': 'Everywhere',
  'police.bloc.presente': 'Present',
  'police.bloc.clairsemee': 'Sparse',
  'police.bloc.rien_dans_les_rues': 'Nothing on the streets',
  'carte.bloc.nord': 'north',
  'carte.bloc.sud': 'south',
  'carte.tissu.le_port': 'the port',
  'carte.tissu.l_avenue': 'the avenue',
  'carte.tissu.le_damier': 'the grid',
  'carte.tissu.les_cheminees': 'the chimneys',
  'carte.tissu.les_tours': 'the towers',
  'carte.tissu.les_faubourgs': 'the outskirts',
  'carte.tissu.port': 'Port',
  'carte.tissu.avenue': 'Avenue',
  'carte.tissu.damier': 'Grid',
  'carte.tissu.cheminees': 'Chimneys',
  'carte.tissu.tours': 'Towers',
  'carte.tissu.faubourgs': 'Outskirts',
  'revue.reserve.elevee': 'HIGH',
  'revue.reserve.normale': 'NORMAL',
  'revue.reserve.faible': 'LOW',
  'decision.portee.mineure': 'minor',
  'decision.portee.moderee': 'moderate',
  'decision.portee.majeure': 'major',
  'decision.urgence.faible': 'low',
  'decision.urgence.elevee': 'high',
  // Q4 (item j, coordinateur 24/09) : alias ParValeur sur la valeur SERVIE `urgency_bucket =
  // 'elevated'` (hl-card-projection.ts:46) — aucune clé du registre ne portait cette valeur EN
  // (0 hit sur les 1638 valeurs, contrôle positif `Confirm` -> 1). Additif : `decision.urgence.elevee`
  // ne change pas ; MÊMES valeurs dans les deux registres (épinglé).
  'decision.urgence.elevated': 'high',
  'decision.urgence.pressante': 'pressing',
  'chrome.phase.aube': 'Dawn',
  'chrome.phase.plein_jour': 'Day',
  'chrome.phase.soiree': 'Evening',
  'chrome.phase.nuit': 'Night',
  // tutoriel ㉕ — 7 clés `tutoriel.ecran.*` (2026-09-23), recopiées de l'atelier `36-tutoriel-ecran-2026-09-23.tsv` (da `0bf2126d`) :
  //     3 RATIFIÉES (compris · on_vous_explique_encore · decochez_le_jour…), 3 littéraux du client PROPOSÉS, 1 PROPOSÉE
  //     (rien_de_nouveau_pour_aujourd_hui : `next_tutorial_id` null n'est pas « tout vu »). D17 vérifié par l'atelier.
  'tutoriel.ecran.vous_avez_tout_vu': 'You’ve seen it all.',
  'tutoriel.ecran.rien_de_nouveau_pour_aujourd_hui': 'Nothing new for today.',
  'tutoriel.ecran.vous_avez_demande_qu_on_vous_laisse_tranquille': 'You asked to be left alone.',
  'tutoriel.ecran.a_decouvrir': 'Next up',
  'tutoriel.ecran.compris': 'Got it',
  'tutoriel.ecran.on_vous_explique_encore': 'Keep explaining',
  'tutoriel.ecran.decochez_le_jour_ou_vous_n_avez_plus_besoin_qu_on_vous_tienne_la_main': 'untick it the day you no longer need your hand held',
  // ㉕ table 36 (item j, atelier `fd032b60`, 2026-09-24, confirmé f2) : mots de la maquette
  // qu'aucune table ne portait. `.vues` : ICU plural, argument NOMMÉ `n` (jamais `#`) — les deux
  // branches EN portent le même mot, le plural y est donc sans effet côté EN, effet réel côté FR.
  // ⛔ `tutoriel.ecran.ne_plus_rien_me_montrer` NON SERVIE : ratification ㉕ ouverte (Q6, le client a
  // une bascule à la place) — voir la garde d'absence dans table36_tutoriel_ecran_unit.spec.ts.
  'tutoriel.ecran.la_premiere_fois': 'First time',
  'tutoriel.ecran.vues': '{n, plural, one {seen} other {seen}}',
  'tutoriel.ecran.a_venir': 'to come',
  // réglages ⑲ — 15 clés `reglages.bloc.*` (2026-09-23), recopiées À L'OCTET de l'atelier `38-reglages-bloc-2026-09-23.tsv` (da `d75bb64e`) :
  //     10 RATIFIÉES, 2 PROPOSÉES (le_coffre_est_ferme, rouvrir_le_coffre), 3 littéraux du client. Le fr porte déjà D17 (U+00A0 avant « : »,
  //     et U+00A0 à l'intérieur des guillemets tels que l'atelier les a écrits).
  'reglages.bloc.la_langue_de_la_maison': 'The house language',
  'reglages.bloc.le_jeu': 'The game',
  'reglages.bloc.on_vous_explique_encore': 'Keep explaining',
  'reglages.bloc.decochez_le_jour_ou_vous_n_avez_plus_besoin_qu_on_vous_tienne_la_main': 'untick it the day you no longer need your hand held',
  'reglages.bloc.dire_mes_prix_au_marche': 'Share my prices with the market',
  'reglages.bloc.sans_ca_le_marche_de_region_ne_vous_dit_rien_non_plus': 'without it, the regional market tells you nothing either',
  'reglages.bloc.le_coffre_est_ferme': 'The vault is closed.',
  'reglages.bloc.rouvrir_le_coffre': 'Reopen the vault',
  'reglages.bloc.fermer_le_coffre': 'Close the vault',
  'reglages.bloc.cette_session_seulement': 'this session only',
  'reglages.bloc.ce_qui_ne_s_ouvre_pas_encore': 'What doesn’t open yet',
  'reglages.bloc.fermer_partout': 'Close everywhere',
  'reglages.bloc.pas_encore_toutes_les_sessions_ouvertes_n_ont_pas_encore_de_guichet': 'not yet: there’s no counter yet for every open session',
  'reglages.bloc.tout_effacer': 'Wipe everything',
  'reglages.bloc.pas_encore_et_ne_plus_jamais_revenir_n_a_pas_encore_de_guichet': 'not yet: “and never come back” has no counter yet',
  // fiche bâtiment ② — 43 clés PROPOSÉES (2026-09-23), recopiées de l'atelier `37-fiche-batiment-mots-2026-09-23.tsv` (da `6c5de8d5`,
  //     83 mots classés, 0 défaut) : familles neuves `building.cook_stage.*` et `building.stock.*`, une clé ICU
  //     (`building.bloc.passes_compte`). PROPOSÉ, NON RATIFIÉ. D17 déjà appliqué dans le fr par l'atelier.
  'building.row.le_feu': 'the fire',
  'building.row.l_etagere': 'the shelf',
  'building.row.les_caisses': 'the crates',
  'building.action.commander_du_pyralin': 'Order Pyralin',
  'building.bloc.il_en_faut_avant_de_rallumer': 'you need some before relighting',
  'building.replique.l_etagere_est_refaite_dites_moi_combien_de_passes_et_j_allume': '“The shelf is restocked. Tell me how many passes, and I’ll light it.”',
  'building.row.passes': 'Passes',
  'building.action.allumer_le_feu': 'Light the fire',
  'building.bloc.ca_consomme_un_lot_de_lys_de_verre': 'it uses one batch of glass lily',
  'building.replique.ca_monte_comme_il_faut_si_j_ouvre_maintenant_je_perds_tout': '“It’s rising right. If I open it now, I lose everything.”',
  'building.bloc.rien_a_faire_ici': 'Nothing to do here.',
  'building.bloc.repassez_quand_ce_sera_tire': 'Come back when it’s done',
  'building.replique.et_ne_me_lancez_pas_une_deuxieme_cuve_tant_que_celle_la_tourne': '— and don’t start a second batch while this one’s running.',
  'building.replique.passes_passes_comme_demande_c_est_plus_long_mais_ca_sort_propre': '“{passes} passes, as asked. It takes longer, but it comes out clean.”',
  'building.bloc.chaque_passe_rallonge_la_nuit': 'Each pass makes the night longer.',
  'building.bloc.c_est_vous_qui_avez_choisi': 'You chose this',
  'building.replique.je_tiens_la_cuve_jusqu_au_bout': '— I’ll see the batch through.',
  'building.replique.c_est_tire_ca_ne_peut_pas_dormir_ici_chaque_nuit_que_ca_reste_c_est_une_nuit_de_trop': '“It’s done. It can’t sleep here — every night it stays is one night too many.”',
  'building.action.faire_sortir_la_marchandise': 'Move the goods out',
  'building.bloc.vers_les_coursiers': 'to the couriers',
  'famille.category.approvisionnement': 'Supply',
  'building.replique.l_approvisionnement_c_est_moi_maintenant_vous_me_l_avez_confie_je_commande_quand_il_faut': '“Supply is my job now — you handed it to me. I order when it’s needed.”',
  'building.bloc.vous_ne_passez_plus_les_commandes_vous_meme': 'You no longer place orders yourself.',
  'building.bloc.reprendre_la_main_se_fait_depuis_la_famille_pas_depuis_le_labo': 'Taking back control happens from the Family, not from the lab.',
  'building.stock.low': 'Low',
  'building.cook_stage.mid': 'Rising',
  'building.cook_stage.late': 'Refining',
  'building.stock.high': 'High',
  'building.bloc.passes_passes_tenues': '{passes} passes held',
  'building.bloc.un_rendez_vous_est_pris': 'An appointment is set',
  'building.bloc.un_client_du_district_du_verre_vous_attend': 'A client from the Glass district is waiting for you.',
  'building.row.affinee': 'Refined',
  'building.bloc.passes_compte': '{passes, plural, =0 {not at all} one {# pass} other {# passes}}',
  'building.bloc.le_rendez_vous_est_honore': 'The appointment was kept',
  'building.bloc.la_marchandise_est_partie_le_client_a_paye': 'The goods are gone, the client has paid.',
  'building.bloc.le_rendez_vous_est_passe': 'The appointment has passed',
  'building.bloc.personne_n_y_est_alle_il_faudra_en_reprendre_un': 'Nobody went. You’ll need to set another.',
  'building.cook_stage.idle': 'Out',
  'building.cook_stage.early': 'Start',
  'building.cook_stage.done': 'Ready',
  'building.stock.none': 'Empty',
  'building.stock.medium': 'Medium',
  'building.row.stock': 'Stock',
  // conflit ㉙ — 50 clés PROPOSÉES (2026-09-23), recopiées de l'atelier `40-conflit-mots-2026-09-23.tsv` (da `997d6ab4`, 0 défaut) :
  //     familles `conflit.issue.*`, `conflit.cout.*`, `conflit.chaleur.*` ; 2 pluriels ICU (fois_chez_eux, hommes_dehors) ; paramètres
  //     `{famille}`, `{nom}`, `{n}`, `{axe}` (v 997d6ab4 : la cible est un axe d'érosion). PROPOSÉ, NON RATIFIÉ. Les mots GENRÉS ratifiés du fichier restent tels quels (en attente de l'user).
  'conflit.bloc.on_envoie_nom_chez_famille_sur_axe': 'We send {nom} to {famille}, at {axe}.',
  'conflit.bloc.autre_famille_autre_cible': 'another family, another target',
  'conflit.bloc.meme_famille_autre_cible': 'same family, another target',
  'conflit.axe.muscle': 'their muscle',
  'conflit.axe.finance': 'their money',
  'conflit.axe.intel': 'their informants',
  'conflit.axe.infrastructure': 'their premises',
  'conflit.axe.leadership': 'their leadership',
  'conflit.bloc.le_coup_de_ce_soir': 'The next strike',
  'conflit.bloc.on_choisit_une_famille_on_choisit_un_homme_et_on_l_envoie_on_saura_demain': 'Pick a family, pick who to send. We’ll know tomorrow.',
  'conflit.bloc.fois_chez_eux': '{n, plural, =0 {never} one {once} other {# times}}',
  'conflit.bloc.on_ne_les_a_pas_croises': 'we’ve never crossed paths',
  'conflit.bloc.ce_soir': 'Under way',
  'conflit.bloc.l_envoyer_ce_soir': 'Send them',
  'conflit.bloc.on_ne_pourra_plus_le_rappeler': 'no calling back',
  'conflit.bloc.la_derniere_fois_chez_eux': 'Last time at theirs:',
  'conflit.issue.breakthrough': 'Breakthrough',
  'conflit.bloc.et_la_ville_a_chauffe': ', and the city heated up',
  'conflit.bloc.on_est_alles_chez_eux': 'we’ve paid them a visit',
  'conflit.bloc.nom_tient_les_comptes_il_ne_cogne_pas_et_famille_on_ne_l_a_jamais_croisee_je_ne_saurais_pas_ou_frapper': '“{nom} is about the books, not the punches. And {famille}, we’ve never crossed them — I wouldn’t know where to hit.”',
  'conflit.bloc.deux_choses_ne_collent_pas': 'two things don’t add up',
  'conflit.bloc.ce_qui_est_en_cours': 'What’s under way',
  'conflit.bloc.les_hommes_qu_on_a_envoyes_et_qui_ne_sont_pas_encore_rentres': 'What we sent that isn’t back yet.',
  'conflit.bloc.partis_pas_encore_rentres': 'Out, not back yet',
  'conflit.bloc.parti_chez_famille': 'on the way to {famille}',
  'conflit.bloc.on_ne_peut_plus_le_rappeler': 'no calling back now',
  'conflit.bloc.deja_rentres': 'Already back',
  'conflit.bloc.etait_chez_famille': 'was at {famille}',
  'conflit.issue.hold': 'Nothing gained',
  'conflit.bloc.hommes_dehors': '{n, plural, one {One out.} other {# out.}}',
  'conflit.bloc.on_ne_les_rappelle_pas_on_saura_demain_matin': 'No calling them back — we’ll know tomorrow morning.',
  'conflit.bloc.en_envoyer_un_autre': 'Send someone else',
  'conflit.bloc.ce_qui_est_rentre': 'What came back',
  'conflit.bloc.ce_que_chaque_homme_a_rapporte_et_ce_que_ca_nous_a_coute': 'What each run brought back, and what it cost us.',
  'conflit.bloc.il_est_rentre': 'Back',
  'conflit.bloc.ca_nous_a_coute': 'it cost us',
  'conflit.cout.low': 'a little',
  'conflit.bloc.la_ville_a_chauffe': 'the city heated up',
  'conflit.cout.medium': 'quite a bit',
  'conflit.bloc.depuis_le_debut_chez_famille': 'From the start, at {famille}',
  'conflit.bloc.coup_n_n': 'Strike #{n}',
  'conflit.bloc.un_homme_envoye': 'one sent',
  'conflit.issue.advance': 'Ground gained',
  'conflit.bloc.voila_ce_que_ca_a_donne_a_vous_de_dire_si_on_y_retourne': '“That’s how it went. Your call whether we go back.”',
  'conflit.issue.contested': 'Contested',
  'conflit.issue.retreat': 'We fell back',
  'conflit.cout.high': 'a lot',
  'conflit.chaleur.low': 'a little',
  'conflit.chaleur.medium': 'quite a bit',
  'conflit.chaleur.high': 'a lot',
  // ordre permanent ⑦ — 18 clés (2026-09-23), recopiées de l'atelier `42-ordre-permanent-cles-2026-09-23.tsv` (da `aa2cd03b`, 0 défaut) :
  //     1 RATIFIÉE(S), 1 mot de f2 déjà au client, le reste PROPOSÉ (dont 3 épicènes, D13).
  'famille.ecran.donner_un_ordre': 'Give an order',
  'famille.ecran.et_quand_il_expire': 'And when it expires',
  'famille.lapse.retour_a_la_routine': 'back to routine',
  'famille.lapse.l_ordre_continue': 'the order keeps running',
  'famille.lapse.on_vous_demande': 'you get asked',
  'famille.ecran.pour_une_duree_fixe': 'for a fixed term',
  'famille.ecran.signer_l_ordre': 'Sign the order',
  'famille.ordre.en_cours': 'in force',
  'famille.ordre.echu': 'lapsed',
  'famille.refus.trop_tot_pour_refaire_ce_geste': 'too soon to do that again',
  'famille.refus.aucun_ordre_en_cours': 'no order in force',
  'famille.refus.cet_ordre_n_a_pas_encore_fait_ses_preuves': 'this order hasn’t proven itself yet',
  'famille.refus.un_ordre_est_deja_en_cours_renouvelez_le': 'an order is already in force: renew it',
  'famille.refus.ce_geste_n_est_pas_reconnu': 'that move isn’t recognised',
  // Lot « ouvrables » (L15) — les 5 motifs d'hôte (`HostBlockedReason`), PROPOSÉS : `blocked_reason_i18n` de
  // `GET /v1/lieutenants/host-eligibility`. La clé EST la phrase.
  'famille.refus.ce_batiment_n_est_pas_pret_a_accueillir_quelqu_un': 'this building isn’t ready to take anyone',
  'famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role': 'this kind of building doesn’t suit this role',
  'famille.refus.ce_commerce_n_a_pas_encore_de_premiere_etape_de_blanchiment': 'this front has no first laundering step yet',
  'famille.refus.ce_relais_a_deja_son_coordinateur': 'this hub already has its coordinator',
  'famille.refus.aucun_dealer_ne_tient_ce_point_de_vente': 'no dealer works this spot',
  'famille.fiabilite.en_sommeil': 'dormant',
  'famille.fiabilite.a_moitie_fiable': 'partly reliable',
  'famille.fiabilite.fiable': 'reliable',
  'famille.fiabilite.decisif': 'decisive',
  // réputation ㊲ — 23 clés PROPOSÉES (2026-09-23), recopiées de l'atelier `43-reputation-mots-2026-09-23.tsv` (da `69a311a9`, 0 défaut) :
  //     familles neuves `reputation.col.*`, `.manches.*`, `.montre.*`, `.gants.*` (uniform_tells) ; 1 pluriel ICU ; `{nom}`. PROPOSÉ, NON
  //     RATIFIÉ. Les 4 postures genrées déjà servies (« Il … ») restent telles quelles, en attente de l'user.
  'reputation.bloc.ce_qu_il_a_pris_de_vous_se_voit_sur_lui': 'what they’ve taken from you shows on them',
  'reputation.bloc.regles_donnees': 'rules given',
  'reputation.bloc.absorbees': 'absorbed',
  'reputation.bloc.nom_votre_lieutenant': '{nom}, your lieutenant',
  'reputation.col.buttoned': 'collar buttoned',
  'reputation.manches.down': 'sleeves down',
  'reputation.montre.visible': 'watch showing',
  'reputation.gants.dirty': 'gloves dirty',
  'reputation.bloc.la_regle_du_jeu': 'how it works',
  'reputation.bloc.vous_vous_lisez_sur_lui': 'You can read yourself on them',
  'reputation.bloc.chaque_vertu_qu_il_vous_voit_tenir_finit_sur_sa_tenue_col_manches_montre_gants': 'every virtue they see you keep ends up on their outfit — collar, sleeves, watch, gloves.',
  'reputation.bloc.un_lieutenant_neuf_n_a_encore_rien_absorbe': 'a new lieutenant hasn’t absorbed anything yet',
  'reputation.col.open': 'collar open',
  'reputation.montre.hidden': 'watch hidden',
  'reputation.bloc.rien_n_a_encore_deteint': 'Nothing has rubbed off yet',
  'reputation.bloc.donner_une_premiere_regle': 'Give a first rule',
  'reputation.bloc.vous_vous_ecartez_de_vos_propres_regles': 'you’re straying from your own rules',
  'reputation.manches.rolled': 'sleeves rolled',
  'reputation.gants.clean': 'gloves clean',
  'reputation.bloc.ce_qui_a_change': 'what changed',
  'reputation.bloc.il_a_deja_pris_de_vous_pas_encore_de_quoi_le_lire': 'they’ve already taken from you, not enough to read yet',
  'reputation.bloc.ni_l_un_ni_l_autre': 'neither one nor the other',
  'reputation.bloc.n_vertus_sur_lui_pas_encore_un_verdict': '{n, plural, one {One virtue on them} other {# virtues on them}}, no verdict yet',
  // délégation ㉜ — 59 clés PROPOSÉES (2026-09-23), recopiées de l'atelier `44-delegation-mots-2026-09-23.tsv` (da `5d4ee17b`, 0 défaut) :
  //     `delegation.charge.*`, familles chute / regain / indemnite / fenetre, les refus (plafond structurel, verrou de promotion),
  //     1 pluriel ICU nommé. D18 : la session est la journée du joueur. PROPOSÉ, NON RATIFIÉ.
  'delegation.bloc.ce_que_vous_tenez_encore_vous_meme': 'What you still handle yourself',
  'delegation.bloc.quatre_choses_chacune_peut_etre_confiee_et_reprise_a_un_prix': 'Four things. Each can be handed over — and taken back, at a price.',
  'delegation.bloc.une_decision_de_structure_aujourd_hui': 'One structural decision today',
  'delegation.bloc.confier_ou_reprendre_pas_les_deux': 'hand over or take back — not both',
  'delegation.charge.route_assignment': 'Deliveries',
  'delegation.bloc.qui_livre_quoi_et_par_ou': 'who delivers what, and which way',
  'delegation.bloc.vous': 'you',
  'delegation.bloc.vous_la_faites': 'you do it',
  'delegation.charge.lieutenant_hiring': 'Hiring',
  'delegation.bloc.qui_entre_dans_la_maison': 'who joins the house',
  'delegation.charge.supply_sourcing': 'Supply',
  'delegation.bloc.ce_qu_on_commande_et_a_qui': 'what we order, and from whom',
  'delegation.bloc.ce_qu_on_fait_quand_la_ville_s_echauffe': 'what we do when the city heats up',
  'delegation.bloc.tant_que_vous_tenez_tout_rien_ne_se_fait_sans_vous_et_rien_ne_se_fait_pendant_que_vous_dormez': 'As long as you hold everything, nothing happens without you — and nothing happens while you sleep.',
  'delegation.bloc.en_confier_une': 'Hand one over',
  'delegation.bloc.vous_ne_la_ferez_plus_vous_meme': 'you won’t do it yourself any more',
  'delegation.bloc.confier_une_de_vos_charges': 'Hand over one of your jobs',
  'delegation.bloc.vous_ne_la_ferez_plus_quelqu_un_d_autre_la_fera_a_sa_facon': 'You won’t do it any more. Someone else will, their way.',
  'delegation.bloc.donnez_moi_charge_je_m_en_occupe_et_vous_ne_verrez_plus_passer_les_commandes': '“Give me {charge}. I’ll handle it, and you won’t see the orders go by any more.”',
  'delegation.bloc.la_lui_confier': 'Hand it to them',
  'delegation.bloc.c_est_votre_decision_du_jour': 'it’s your decision for the day',
  'delegation.bloc.ce_que_vous_avez_confie': 'What you’ve handed over',
  'delegation.bloc.n_charges_tenues_par_quelqu_un_d_autre': '{n, plural, one {# job held} other {# jobs held}} by someone else. You can take them back, at a price.',
  'delegation.bloc.reprendre_charge': 'Take back {charge}',
  'delegation.bloc.voila_ce_que_ca_couterait_on_vous_le_dit_avant_pas_apres': 'Here’s what it would cost. We tell you before, not after.',
  'delegation.bloc.ce_qu_il_a_appris': 'What was learned',
  'delegation.chute.eleve': 'drops sharply',
  'delegation.bloc.pour_tout_regagner': 'To win it all back',
  'delegation.regain.long': 'a very long time',
  'delegation.bloc.ce_qu_on_lui_doit': 'Severance', // D13 (item i, atelier `1d8541bf`, 2026-09-24) — clé SERVIE gardée, valeur changée (« What we owe them » sort)
  'delegation.indemnite.ruinous': 'ruinous',
  'delegation.fenetre.extended': 'for a long while',
  'delegation.bloc.celui_qu_il_formait': 'Their successor',
  // table 56 v1.1 (item a, atelier `b20b1bdb`, 2026-09-24) : clé NEUVE pour ㉜ seul — partagée avec
  // ㊲ RATIFIÉE `reputation.etat.il_vous_en_veut` (inchangée, f2).
  'delegation.bloc.rancune': 'Grudge',
  // table 56 v1.2 (item i, atelier `1d8541bf`, 2026-09-24) : les sites ∅ de la table lot 2 de
  // CLIENT-2 — 8 clés NEUVES, toutes `delegation.bloc.*`.
  'delegation.bloc.quelqu_un': 'Someone',
  'delegation.bloc.aucune_n_est_encore_prete': 'none is ready yet',
  'delegation.bloc.personne_a_qui_la_confier_la_maison_n_a_aucun_lieutenant': 'No one to hand it to — the house has no lieutenant.',
  'delegation.bloc.aucun_lieutenant_disponible': 'no lieutenant available',
  'delegation.bloc.on_demande_ce_que_ca_couterait': 'Asking what it would cost…',
  'delegation.bloc.le_tableau_de_service_n_a_pas_repondu': 'The duty roster didn’t answer',
  'delegation.bloc.on_n_a_pas_pu_lire_ce_que_vous_tenez_rien_n_a_ete_change': 'We couldn’t read what you hold. Nothing was changed.',
  'delegation.bloc.rien_n_a_ete_change': 'Nothing was changed.',
  'delegation.bloc.s_arrete_aussi': 'stops too',
  'delegation.bloc.si_vous_reconfiez_plus_tard': 'If you hand it over again later',
  'delegation.bloc.ca_coutera_plus': 'it will cost more',
  'delegation.bloc.ceci_est_un_avertissement_pas_un_mur_le_jeu_vous_laissera_le_faire': 'This is a warning, not a wall: the game will let you do it.',
  'delegation.bloc.vous_pouvez_la_reprendre_il_ne_le_prendra_pas_bien_et_ce_qu_il_savait_faire_vous_devrez_le_reapprendre': 'You can take it back. It will be taken badly, and everything learned there will have to be learned again.',
  'delegation.bloc.la_reprendre_quand_meme': 'Take it back anyway',
  'delegation.bloc.vous_avez_deja_tranche_aujourd_hui': 'You’ve already decided today',
  'delegation.bloc.on_ne_redessine_pas_la_maison_deux_fois_dans_la_meme_journee': 'You don’t redraw the house twice in one day.',
  'delegation.bloc.decision_deja_prise_aujourd_hui': 'Decision already made today',
  'delegation.bloc.la_prochaine_sera_pour_demain': 'the next one will be tomorrow',
  'delegation.bloc.vous_avez_deja_confie_charge_aujourd_hui': 'You already handed over {charge} today.',
  'delegation.bloc.plus_de_decision_aujourd_hui': 'no more decisions today',
  'delegation.bloc.une_seule_decision_de_structure_par_journee_confier_et_reprendre_comprises_ce_n_est_pas_une_limite_d_energie_c_est_pour_qu_une_maison_ne_se_redessine_pas_entierement_en_un_apres_midi': 'One structural decision per day, handing over and taking back included. It isn’t an energy limit: it’s so a house isn’t redrawn in a single afternoon.',
  'delegation.charge.heat_management': 'Heat',
  'delegation.chute.faible': 'dips a little',
  'delegation.chute.moyen': 'drops clearly',
  'delegation.regain.court': 'a short while',
  'delegation.regain.moyen': 'a good while',
  'delegation.indemnite.low': 'little',
  'delegation.indemnite.medium': 'a sum',
  'delegation.indemnite.high': 'a lot',
  'delegation.fenetre.short': 'for a short while',
  'delegation.fenetre.standard': 'for a while',
  'delegation.refus.la_charge_n_est_plus_a_vous': 'this job is no longer yours',
  'delegation.refus.la_charge_n_est_plus_confiee': 'this job is no longer handed over',
  'delegation.refus.un_changement_est_deja_en_cours_sur_cette_charge': 'a change is already under way on this job',
  // carte de tête ④ — 4 clés `accueil.carte.*` (2026-09-23), atelier `45-carte-de-tete-2026-09-23.tsv` (da `a0ff6cba`) : la forme (b)
  //     de la HL card — les options sont du TEXTE, commit = « Prendre acte » (n'agit pas sur le monde), skip = « Pas maintenant ».
  //     ⚠️ `prendre_acte_n_agit_pas_a_votre_place` reste vraie tant que le bouton « Prendre acte » poste le défaut de `commit` (prendre acte) ;
  //     elle devient FAUSSE avec le lot client des gestes — nommée dans le mode d'emploi de péremption de `tests/unit/progression/hl_card_contrat_reel_unit.spec.ts`. PROPOSÉ, NON RATIFIÉ.
  'accueil.carte.ce_qu_on_peut_faire': 'What can be done',
  'accueil.carte.prendre_acte': 'Noted',
  'accueil.carte.pas_maintenant': 'Not now',
  'accueil.carte.prendre_acte_n_agit_pas_a_votre_place': 'noting it doesn’t act for you',
  // table 45 (item j, atelier `82539a59`, 2026-09-24) : libellés d'en-tête de bande, valeur par la
  // famille servie decision.portee.* / decision.urgence.*.
  'accueil.carte.portee': 'Scope',
  'accueil.carte.urgence': 'Urgency',
  // ordres du soir ㉞ — 36 clés PROPOSÉES (2026-09-23), atelier `46-carnet-mots-2026-09-23.tsv` (da `1c32d021`, somme de l'atelier :
  //     78 lignes = 73 mots + 5 compléments, 40 clés distinctes à valeur = ces proposées + 3 servies D14 + 3 servies) : `carnet.ordre.*`,
  //     les gestes à route. PROPOSÉ, NON RATIFIÉ.
  'carnet.bloc.a_batiment_quartier': 'at {batiment} ({quartier})',
  'carnet.ordre.distribution_run': 'Send a courier',
  'carnet.bloc.vers_batiment_quartier': 'to {batiment} ({quartier})',
  'carnet.ordre.exception_batch_resolution': 'Settle the slate',
  'carnet.bloc.n_ordres_on_peut_en_mettre_reste_de_plus_ou_partir_comme_ca': '“{n, plural, one {One order} other {# orders}}. We can add {reste} more, or go as is.”',
  'carnet.bloc.lancer_la_soiree': 'Start the evening',
  'carnet.bloc.une_fois_partie_on_ne_la_reprend_pas': 'once it’s gone, there’s no taking it back',
  'carnet.bloc.deux_ordres_s_attendent_l_un_l_autre': 'Two orders are waiting on each other',
  'carnet.bloc.aucun_des_deux_ne_peut_partir_en_premier': 'Neither can go first.',
  'carnet.bloc.l_ordre_a_attend_le_b_et_le_b_attend_le_a': '{a} waits for {b}, and {b} waits for {a}.',
  'carnet.bloc.il_faut_en_detacher_un_des_deux_sinon_la_soiree_ne_demarre_pas': 'You have to unhook one of them, or the evening won’t start.',
  'carnet.bloc.ca_ne_peut_pas_marcher_chacun_attend_l_autre': '“It can’t work. Each one’s waiting on the other.”',
  'carnet.bloc.deux_ordres_se_bloquent': 'two orders block each other',
  'carnet.bloc.un_endroit_n_a_pas_fini_de_se_poser': 'A place hasn’t settled yet',
  'carnet.bloc.ce_qu_on_y_a_change_n_a_pas_encore_pris': 'What we changed there hasn’t taken yet.',
  'carnet.bloc.on_y_a_change_quelque_chose_et_ca_n_a_pas_encore_pris_soit_on_attend_soit_on_le_dit_explicitement_et_on_assume': 'We changed something there and it hasn’t taken yet. Either we wait, or we say so plainly and own it.',
  'carnet.bloc.on_peut_y_aller_quand_meme_mais_dites_le_moi_clairement': '“We can go anyway, but tell me plainly.”',
  'carnet.bloc.y_aller_quand_meme': 'Go anyway',
  'carnet.bloc.j_assume_le_site_qui_bouge_encore': 'I take on the site that’s still moving',
  'carnet.bloc.vos_soirees_mises_de_cote': 'Your saved evenings',
  'carnet.bloc.rejouer': 'Replay',
  'carnet.bloc.vous_ne_pouvez_pas_encore_mettre_une_soiree_de_cote': 'You can’t save an evening yet.',
  'carnet.bloc.pour_l_instant_chaque_soiree_se_compose_a_la_main': 'For now, every evening is put together by hand.',
  'carnet.bloc.pas_encore_possible': 'not possible yet',
  'carnet.bloc.rejouer_nom': 'Replay “{nom}”',
  'carnet.bloc.n_ordres_d_un_coup': '{n, plural, one {one order} other {# orders}} at once',
  'carnet.bloc.ce_qui_s_est_passe_en_ville': 'What happened in town',
  'carnet.bloc.ce_qui_bouge_dans_les_quartiers_ou_vous_avez_quelque_chose': 'What’s moving in the districts where you have something.',
  'carnet.bloc.dans_vos_quartiers': 'In your districts',
  'carnet.bloc.vous_y_etiez': 'You were there',
  'carnet.bloc.ce_qui_se_passe_la_ou_vous_avez_quelque_chose': 'What’s going on where you have something.',
  'carnet.bloc.y_etre_vu_compte_dans_un_sens_comme_dans_l_autre': 'Being seen there counts, one way or the other.',
  'carnet.bloc.aller_a_l_enterrement': 'Go to the funeral',
  'carnet.bloc.on_vous_y_verra': 'you’ll be seen there',
  'carnet.ordre.maintenance_batch': 'Do the upkeep',
  'carnet.ordre.recruitment_step': 'Recruit',
  // file de ④ sans compte — addendum 45 (da `9513b05b`) : `queue_pressure_band` saturé et `backlog_badge`, sans nombre. PROPOSÉ.
  'accueil.file.plusieurs_attendent_encore': 'Several are still waiting',
  'accueil.file.d_autres_attendent_au_dela_de_ce_que_la_file_montre': 'others are waiting beyond what the queue shows',
  // dossier ㊴ — 34 clés PROPOSÉES (2026-09-23), atelier `47-dossier-mots-2026-09-23.tsv` (da `ed4613fd` ; somme de l'atelier : 91 lignes =
  //     89 mots + 2 compléments, 34 clés distinctes à valeur) : `forensic.cran.*`, `forensic.acteur.*`, `forensic.statut.*`. Les mots genrés
  //     ratifiés restent tels quels (en attente de l'user). PROPOSÉ, NON RATIFIÉ.
  'forensic.bloc.trois_pistes_et_elles_ne_se_melangent_pas': 'three tracks, and they don’t mix',
  'forensic.bloc.pistes_chaudes': 'hot tracks',
  'forensic.bloc.franchies': 'crossed',
  'forensic.bloc.qui_tiennent': 'holding',
  'forensic.cran.on_regarde': 'they’re watching',
  'forensic.bloc.ce_qui_sort_des_cuves': 'what comes out of the vats',
  'forensic.bloc.le_train_de_vie_d_un_lieutenant': 'a lieutenant’s lifestyle',
  // ㊴ Q5 (2026-10-09) — phrase ENTIÈRE à trou : le nom du lieutenant passe devant (`’s`), jamais de concaténation. Servie avec `lifestyle_lieutenant_name`.
  'forensic.bloc.le_train_de_vie_de_nom': '{nom}’s lifestyle',
  'forensic.cran.discret': 'low-key',
  'forensic.bloc.acheter_du_renseignement': 'Buy intelligence',
  'forensic.bloc.sur_un_acteur_pas_sur_une_piste_on_n_achete_pas_un_dossier': 'on an actor, not a track — you don’t buy a file',
  'forensic.bloc.qui_parle_et_qui_a_peur': 'who talks, and who’s scared',
  'forensic.bloc.acteurs_connus': 'known actors',
  'forensic.bloc.qui_ont_peur': 'scared',
  'forensic.bloc.partis': 'gone',
  'forensic.acteur.lawyer': 'Lawyer',
  'forensic.statut.steady': 'holding',
  'forensic.acteur.clerk': 'Clerk',
  'forensic.statut.nervous': 'scared',
  'forensic.statut.unavailable': 'unreachable',
  'forensic.statut.gone': 'gone',
  'forensic.bloc.il_ne_reviendra_pas': 'they won’t be back',
  'forensic.bloc.celui_la_ne_reviendra_pas': 'That one won’t be back',
  'forensic.bloc.rien_a_votre_nom': 'Nothing in your name.',
  'forensic.bloc.personne_n_a_encore_eu_de_raison_de_vous_ouvrir_un_dossier': 'Nobody has had a reason to open a file on you yet.',
  'forensic.bloc.ce_n_est_pas_une_bonne_nouvelle': 'it isn’t good news',
  'forensic.bloc.c_est_juste_une_nouvelle': 'It’s just news',
  'forensic.bloc.les_trois_pistes_montent_avec_ce_que_vous_faites_a_zero_elles_ne_disent_pas_que_vous_etes_prudent_elles_disent_que_vous_n_avez_pas_encore_commence': 'the three tracks rise with what you do. At zero, they don’t say you’re careful: they say you haven’t started yet.',
  'forensic.bloc.pistes': 'tracks',
  'forensic.cran.invisible': 'unseen',
  'forensic.cran.des_traces': 'traces',
  'forensic.cran.remarque': 'noticed',
  'forensic.cran.suivi': 'followed',
  'forensic.cran.rien_a_signaler': 'nothing to report',
  'forensic.cran.ca_se_voit': 'it shows',
  // filière ㊵ — 20 clés PROPOSÉES (2026-09-23), atelier `48-filiere-mots-2026-09-23.tsv` (da `edf98ebf` ; somme de l'atelier : 71 lignes =
  //     68 mots + 3 compléments, 20 clés distinctes à valeur) : dont `filiere.proprete.*` pour `cleanliness_band`. PROPOSÉ, NON RATIFIÉ.
  'filiere.sous_titre.ou_en_est_chaque_etape': 'where each stage stands',
  'filiere.bloc.propres': 'clean',
  'filiere.proprete.partial': 'half',
  'filiere.bloc.injecter': 'Inject',
  'filiere.bloc.depuis_votre_comptoir_vers_une_planque_a_vous': 'from your counter, to a safehouse of yours',
  'filiere.sous_titre.vous_n_en_avez_pas_encore': 'you don’t have one yet',
  'filiere.bloc.votre_planque_est_prete': 'Your safehouse is ready.',
  'filiere.bloc.la_filiere_elle_reste_a_monter': 'The pipeline still has to be built.',
  'filiere.bloc.par_ou_ca_commence': 'where it starts',
  'filiere.bloc.injecter_puis_accrocher_une_etape': 'Inject, then hook on a stage',
  'filiere.bloc.la_planque_vous_est_donnee_le_reste_se_construit_une_premiere_injection_ouvre_la_filiere_chaque_etape_suivante_s_accroche_a_la_precedente': 'the safehouse is given to you; the rest gets built. A first injection opens the pipeline, each next stage hooks onto the one before.',
  'filiere.sous_titre.aucune_filiere': 'no pipeline',
  'filiere.bloc.aucune_filiere_montee': 'No pipeline built.',
  'filiere.bloc.une_filiere_se_construit_etape_par_etape': 'A pipeline is built stage by stage.',
  'filiere.bloc.comment_ca_se_monte': 'how it’s built',
  'filiere.bloc.une_etape_s_accroche_a_la_precedente': 'A stage hooks onto the one before',
  'filiere.bloc.chaque_etape_se_pose_a_partir_d_un_nœud_existant_et_d_un_batiment_a_vous_la_premiere_a_besoin_d_une_injection_donc_d_une_planque': 'each stage is set from an existing node and a building of yours. The first one needs an injection — so a safehouse.',
  'filiere.proprete.dirty': 'dirty',
  'filiere.proprete.mostly_clean': 'nearly clean',
  'filiere.proprete.clean': 'clean',

  // Lot « ouvrables » (L21) — les 4 motifs de refus de `POST /v1/operational/laundering/stage` (`StageBlockedReason`), PROPOSÉS, 4 clés
  // `filiere.refus.*` : une par membre (les 4 voyagent en `details.blocked_reason`), dont 2 seulement servis aussi en `blocked_reason_i18n`
  // par `/pipeline`. La clé EST la phrase.
  'filiere.refus.ce_batiment_ne_peut_pas_accueillir_d_etape_pour_l_instant': 'this building can’t take a stage right now',
  'filiere.refus.ce_batiment_porte_deja_une_etape': 'this building already carries a stage',
  'filiere.refus.cette_etape_a_deja_une_suite': 'this stage already has a next one',
  'filiere.refus.la_filiere_a_avance_entre_temps_recommencez': 'the pipeline moved on in the meantime: try again',
  // journal & rue ㊳ — 20 clés PROPOSÉES (2026-09-23), atelier `49-journal-mots-2026-09-23.tsv` (da `faaa0786` ; somme : 89 lignes = 89 mots
  //     + 0 complément, 20 clés distinctes à valeur) : `journal.fraicheur.*` (recency_band), `journal.gravite.*` (severity_band), le geste à
  //     route « Y prêter attention ». Les 5 phases déjà servies ne sont pas touchées. PROPOSÉ, NON RATIFIÉ.
  'journal.fraicheur.fresh': 'this morning',
  'journal.fraicheur.settling': 'yesterday',
  'journal.bloc.y_preter_attention': 'Pay attention to it',
  'journal.bloc.on_peut_assister_a_ce_qui_se_passe_c_est_le_seul_geste_que_la_rue_accepte': 'you can witness what’s happening — it’s the only move the street accepts',
  'journal.bloc.ce_qui_arrive_a_la_ville': 'what’s happening to the city',
  'journal.bloc.compris': 'understood',
  'journal.gravite.heavy': 'it weighs',
  'journal.gravite.noticeable': 'people talk',
  'journal.gravite.faint': 'barely',
  'journal.bloc.ce_qui_ne_partira_pas': 'what won’t go away',
  'journal.bloc.le_quartier_a_change_et_il_faudra_faire_avec_ce_n_est_plus_une_nouvelle_c_est_une_donnee': 'The district has changed, and you’ll have to live with it — it isn’t news any more, it’s a given.',
  'journal.bloc.rien_a_faire_c_est_acquis': 'Nothing to do — it’s settled',
  'journal.bloc.ce_que_vous_avez_compris': 'what you’ve understood',
  'journal.bloc.couplages_compris': 'links understood',
  'journal.bloc.et_tout_ce_que_vous_n_avez_pas_encore_compris_la_maison_ne_dit_pas_combien_il_en_reste': 'and everything you haven’t understood yet — the house doesn’t say how much is left',
  'journal.bloc.la_ville_a_des_causes_et_vous_les_apprenez': 'The city has causes, and you learn them',
  'journal.bloc.la_fraicheur': 'freshness',
  'journal.fraicheur.fading': 'last week',
  'journal.bloc.la_gravite': 'weight',
  'journal.bloc.la_phase': 'phase',
  // inspections ⑮ — 37 clés PROPOSÉES (2026-09-23), atelier `50-inspections-mots-2026-09-23.tsv` (da `6d44e07d` ; somme : 53 lignes = 37 mots +
  //     16 compléments, 37 clés distinctes à valeur). Les lignes « a + b » du fichier sont des COMPOSITIONS de deux clés à l'affichage : seules
  //     leurs parties sont servies (la garde de forme refuse toute clé à « + »). PROPOSÉ, NON RATIFIÉ.
  'inspection.bloc.registre_de_dispatch': 'Dispatch log',
  'inspection.bloc.district': 'district',
  'inspection.bloc.charge': 'load',
  'inspection.bloc.regime': 'regime',
  'inspection.bloc.origines': 'sources',
  'inspection.charge.light': 'light',
  'inspection.regime.nominal': 'nominal',
  'inspection.regime.backlogged': 'backlogged',
  'inspection.bloc.le_coup_fourre': 'The dirty trick',
  'inspection.bloc.on_leur_donne_un_os_a_ronger': 'we throw them a bone',
  'inspection.bloc.deposer_un_signalement': 'File a report',
  'inspection.bloc.sur_un_batiment_de_quartier': 'on a building in {quartier}',
  'inspection.bloc.prix': 'cost',
  'inspection.bloc.effet': 'effect',
  'inspection.bloc.une_entree_de_plus_dans_leur_file': 'one more entry in their queue',
  'inspection.bloc.deposer': 'File',
  'inspection.bloc.au_bout_de_plusieurs_la_police_se_retourne': 'after several, the police turn around',
  'inspection.bloc.le_retour_de_baton': 'The backlash',
  'inspection.bloc.ils_ont_compris_que_les_signalements_venaient_de_vous': 'they worked out the reports came from you',
  'inspection.bloc.retournee': 'turned',
  'inspection.bloc.elle_vous_rend_la_monnaie': 'They pay you back',
  'inspection.charge.empty': 'empty',
  'inspection.charge.moderate': 'moderate',
  'inspection.charge.heavy': 'heavy',
  'inspection.charge.saturated': 'saturated',
  'inspection.regime.budget_cut': 'budget cut',
  'inspection.regime.surge': 'surging',
  'inspection.origine.scheduled': 'scheduled',
  'inspection.origine.informant': 'informant',
  'inspection.origine.cascade': 'cascade',
  'inspection.origine.forensic': 'forensic',
  'inspection.origine.false_report': 'false report',
  'inspection.origine.genuine_report': 'report',
  'inspection.presence.none': 'none',
  'inspection.presence.some': 'a little',
  'inspection.presence.many': 'a lot',
  'inspection.presence.predominant': 'mostly',
  // commissariat ⑰ — 8 clés `police.bloc.*` PROPOSÉES, atelier `51-commissariat-mots-2026-09-23.tsv` (même commit ; somme : 27 lignes, 8 clés à
  //     valeur) : 2 pluriels ICU nommés. PROPOSÉ, NON RATIFIÉ.
  'police.bloc.ce_qu_ils_savent': 'What they know',
  'police.bloc.six_commissariats_releve_de_nos_guetteurs': 'six precincts · from our lookouts',
  'police.bloc.precinct_n': 'Precinct {n}',
  'police.bloc.patrouilles': 'patrols',
  'police.bloc.vos_n_batiments_sont_ici': '{n, plural, one {your building is here} other {your # buildings are here}}',
  'police.bloc.n_d_entre_eux_vous_chassent': '{n, plural, one {One of them is hunting you} other {# of them are hunting you}} —',
  'police.bloc.aucun_ne_dort': 'none is asleep',
  'police.bloc.leurs_descentes': 'Their raids',
  // engagements ㉙ L4 — addendum atelier `40-addendum-engagements-2026-09-23.tsv` (da `24897b48`) : 9 clés PROPOSÉES, NON RATIFIÉES
  //     (somme : 11 lignes, 10 clés à valeur ; la 10ᵉ, `error.engagements.muscle_lieutenant_required`, est RATIFIÉE et reste inchangée — D14).
  'conflit.refus.ce_coup_ne_tient_plus_reprenez_depuis_la_liste': 'This job no longer holds. Start again from the list.',
  'conflit.refus.l_ordre_n_est_pas_parti_il_etait_mal_forme_reessayez': 'The order didn’t go out: it was malformed. Try again.',
  'conflit.refus.la_ligne_a_coupe_on_ne_sait_pas_si_l_ordre_est_parti_reessayez_il_ne_partira_pas_deux_fois': 'The line went dead: we don’t know if the order went out. Try again — it won’t go out twice.',
  'conflit.bloc.derniere_fois_chez_eux': 'Last time at their place: {issue}, and the city heated up {chaleur}.',
  'conflit.issue_phrase.breakthrough': 'a breakthrough',
  'conflit.issue_phrase.advance': 'ground gained',
  'conflit.issue_phrase.hold': 'nothing gained',
  'conflit.issue_phrase.contested': 'it was contested',
  'conflit.issue_phrase.retreat': 'we fell back',
  // ② geste « Commander » — table 54 de l'atelier (`54-commande-precurseurs-2026-09-23.tsv`, da `dfbdb7a6`) : 6 clés PROPOSÉES,
  //     NON RATIFIÉES, une par valeur du pgEnum `precursor_type` (somme : 6 lignes à valeur ; garde de couverture sur l'enum).
  'building.commande.pyralin': 'Order Pyralin',
  'building.commande.thalmite': 'Order Thalmite',
  'building.commande.garnet_salt': 'Order garnet salt',
  'building.commande.verdant_root_extract': 'Order verdant root',
  'building.commande.lull_resin': 'Order lull resin',
  'building.commande.glass_lily': 'Order glass lily',
  // famille ⑦ — table 55 de l'atelier (`55-lieutenant-cles-2026-09-23.tsv`, da `a6159d89`) : 22 clés PROPOSÉES, NON RATIFIÉES, que le
  //     client demande (somme : 22 lignes = 22 mots, 0 composition) ; D17 : U+00A0 avant « : », U+202F avant « ? ».
  'famille.ecran.signal': 'Signal',
  'famille.ecran.ordre_permanent': 'Standing order',
  'famille.signal.a_l_ecoute': 'listening',
  'famille.signal.derive': 'drifting',
  'famille.signal.n_ecoute_que_le_terrain': 'hears only the ground',
  'famille.signal.se_recale': 'resetting',
  'famille.ordre.aucun_ordre': 'no order',
  'famille.ordre.expire_bientot': 'expires soon',
  'famille.repere.l_etat_du_terrain': 'the state of the ground',
  'famille.repere.ce_qu_il_reste': 'what is left',
  'famille.repere.l_heure': 'the hour',
  'famille.repere.ce_que_font_les_autres': 'what the others do',
  // table 55 complément (item i, atelier `1d8541bf`, 2026-09-24) : `cue` = DIRECT_ORDER, même mot que
  // le geste servi `famille.ecran.rappeler_l_ordre_direct`.
  'famille.repere.l_ordre_direct': 'the direct order',
  'famille.ecran.nom_ecoute_autre_chose_que_vos_ordres': '{nom} is listening to something other than your orders',
  'famille.ecran.rappeler_l_ordre_direct': 'Restore the direct order',
  'famille.ecran.remettre_l_ecoute_a_zero': 'Reset the listening',
  'famille.ecran.brouiller_un_repere': 'Blur a cue',
  'famille.ecran.ce_qui_est_ecoute_a_la_place': 'what is heard instead:',
  'famille.question.en_faire_la_regle': 'Make it the rule?',
  'famille.ecran.son_ordre_du_moment_a_tenu_vous_pouvez_le_renouveler_le_retirer_ou_en_faire_sa_regle_par_defaut': 'The current order held. You can renew it, withdraw it, or make it the default rule.',
  'famille.ecran.en_faire_la_regle': 'Make it the rule',
  'famille.ecran.renouveler': 'Renew',
  'famille.ecran.retirer': 'Withdraw',
  // délégation ㉜ — table 56 de l'atelier (`56-delegation-maitrise-2026-09-23.tsv`, da `160556c9`) : 15 clés PROPOSÉES, NON RATIFIÉES
  //     (somme : 18 lignes = 14 mots + 4 compléments ; 16 clés à valeur dont 1 déjà servie, réécrite en place — D13, ㉜ non ratifiée).
  'delegation.maitrise.nascent': 'you’re still learning',
  'delegation.maitrise.learning': 'not ready yet',
  'delegation.maitrise.practiced': 'almost ready',
  'delegation.maitrise.eligible': 'ready to hand over',
  'delegation.maitrise.recovery': 'still recovering',
  'delegation.maitrise.recall_scar': 'taken back once already',
  'delegation.maitrise.tenue': 'held for you',
  'delegation.charge_phrase.route_assignment': 'deliveries',
  'delegation.charge_phrase.lieutenant_hiring': 'hiring',
  'delegation.charge_phrase.supply_sourcing': 'supply',
  'delegation.charge_phrase.heat_management': 'the heat',
  'delegation.replique.route_assignment': '“Give me the deliveries. I’ll handle it, and you won’t choose who delivers what any more.”',
  'delegation.replique.lieutenant_hiring': '“Give me hiring. I’ll handle it, and you won’t choose who joins the house any more.”',
  'delegation.replique.supply_sourcing': '“Give me supply. I’ll handle it, and you won’t see the orders go by any more.”',
  'delegation.replique.heat_management': '“Give me the heat. I’ll handle it, and you won’t decide what we do when the city heats up any more.”',
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
    '{outlet} treats the matter in {district} as an unfortunate, unintended failure.',
  'news_beat.cooper_affair.accident.brennar_daily_star.body':
    'The incident in {district} would appear to have resulted from a sequence of circumstances currently under study. No intent has been established, nor, it is suggested, should any be inferred. It would seem appropriate for a review to be undertaken in due course; no timetable has been communicated.',
  'news_beat.cooper_affair.accident.brennar_daily_star.headline':
    'A sequence of circumstances in {district}, currently under study',
  'news_beat.cooper_affair.accident.free_weekly.body':
    'Nobody\'s fault, nothing to see, moving on — that\'s the official version, anyway. The block keeps its own count, and the count says: another one, same place as ever. You don\'t say.',
  'news_beat.cooper_affair.accident.free_weekly.headline':
    'An accident. In {district}. Another one',
  'news_beat.cooper_affair.accident.headline':
    'What went wrong in {district}',
  'news_beat.cooper_affair.accident.tilbey_weekly.body':
    'People in {district} are still sweeping up and still asking how. At the bakery and at the bus stop the word is the same: bad luck, the kind that always lands on the same doorsteps. "You patch up and you wait for the next one," one shopkeeper says.',
  'news_beat.cooper_affair.accident.tilbey_weekly.headline':
    'Bad luck in {district} — the kind that picks its address',
  'news_beat.cooper_affair.corruption.body':
    '{outlet} frames the matter in {district} as a question of who benefited, and how.',
  'news_beat.cooper_affair.corruption.brennar_daily_star.body':
    'Questions relating to the matter in {district} are said to warrant review; it remains to be established to whom the situation may have proven advantageous. A monitoring framework would be under consideration. The relevant offices, when approached, did not respond.',
  'news_beat.cooper_affair.corruption.brennar_daily_star.headline':
    'Questions relating to {district} said to warrant review',
  'news_beat.cooper_affair.corruption.free_weekly.body':
    'Money moved, favors moved with it, and the block gets the bill. Case opened, case closed: nothing found. They looked, they say. Sure they did.',
  'news_beat.cooper_affair.corruption.free_weekly.headline':
    'Clean hands in {district}? Sure',
  'news_beat.cooper_affair.corruption.headline':
    'Questions of influence follow the matter in {district}',
  'news_beat.cooper_affair.corruption.tilbey_weekly.body':
    'Ask around {district} and it is the same from the baker to the bus stop: money moved, and someone did well by it. "We weren\'t born yesterday," one resident says. People wrote letters asking about it; the letters, so far, have not been answered.',
  'news_beat.cooper_affair.corruption.tilbey_weekly.headline':
    'From the baker to the bus stop, {district} has the same question',
  'news_beat.cooper_affair.neighborhood_failure.body':
    '{outlet} places the matter inside a longer pattern of neglect in {district}.',
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
    '{outlet} reads the matter in {district} as the mark of an organized operation.',
  'news_beat.cooper_affair.organized_crime.brennar_daily_star.body':
    'Certain aspects of the incident in {district} are said to suggest a degree of coordination; any such assessment would remain preliminary. This paper has not independently confirmed the accounts on which it rests, and the relevant offices declined to elaborate.',
  'news_beat.cooper_affair.organized_crime.brennar_daily_star.headline':
    'Indications of coordination in {district} said to be under assessment',
  'news_beat.cooper_affair.organized_crime.free_weekly.body':
    'Somebody set this up and the whole block knows it. The only ones still calling it a mystery are paid to call it a mystery. There\'s an inquiry, they say. Ongoing, they say. Sure.',
  'news_beat.cooper_affair.organized_crime.free_weekly.headline':
    'Planned? In {district}? You don\'t say',
  'news_beat.cooper_affair.organized_crime.headline':
    'A familiar hand behind the matter in {district}',
  'news_beat.cooper_affair.organized_crime.tilbey_weekly.body':
    'More than one neighbor in {district} says the same thing on the doorstep: too tidy and too quick to be chance. "Work like that gets planned," one shopkeeper says, and lowers his voice to say it. Others keep the door shut — which says its own thing.',
  'news_beat.cooper_affair.organized_crime.tilbey_weekly.headline':
    'Too tidy, too quick: {district} draws its own conclusions',
  'news_beat.digest.ambient_micro.body':
    '{outlet} catches a street-level note: {subject}, {district}.',
  'news_beat.digest.ambient_micro.brennar_daily_star.body':
    'A number of minor occurrences in {district} have been recorded this week. None would appear, at this stage, to warrant further examination. The record is retained.',
  'news_beat.digest.ambient_micro.brennar_daily_star.headline':
    'Minor occurrence recorded in {district}: {subject}',
  'news_beat.digest.ambient_micro.free_weekly.body':
    'Little things. Corner things. The stuff nobody official counts and everybody local notices. Noted here, then, since somebody has to.',
  'news_beat.digest.ambient_micro.free_weekly.headline':
    'Meanwhile, in {district}: {subject}',
  'news_beat.digest.ambient_micro.headline':
    'Small stories from {district}: {subject}',
  'news_beat.digest.ambient_micro.tilbey_weekly.body':
    'The small stuff from {district} this week — the kind of thing that never makes a front page and is all anyone actually talks about over the counter.',
  'news_beat.digest.ambient_micro.tilbey_weekly.headline':
    'Small news from {district}, still news: {subject}',
  'news_beat.digest.live_ops.body':
    '{outlet} reports a citywide development: {subject}.',
  'news_beat.digest.live_ops.brennar_daily_star.body':
    'A notice of general application is in circulation citywide. Its practical effects, insofar as they can be assessed at this stage, would appear to vary; residents are advised to consult the notice itself.',
  'news_beat.digest.live_ops.brennar_daily_star.headline':
    'Notice of general application: {subject}',
  'news_beat.digest.live_ops.free_weekly.body':
    'Another notice for all of Brennar. Everyone is covered; nobody was asked. It\'s on every wall by now.',
  'news_beat.digest.live_ops.free_weekly.headline':
    'New notice: {subject}. Noted',
  'news_beat.digest.live_ops.headline':
    'A notice circulates: {subject}',
  'news_beat.digest.live_ops.tilbey_weekly.body':
    'There is a new notice going around town. What it means depends, as ever, on which street you live on. People here are already comparing notes over the counter.',
  'news_beat.digest.live_ops.tilbey_weekly.headline':
    'A notice: {subject}, and what it means on our streets',
  'news_beat.digest.political.body':
    '{outlet} covers a political development: {subject}.',
  'news_beat.digest.political.brennar_daily_star.body':
    'Proceedings at City Hall are understood to be continuing; a communiqué would be expected in due course. The offices concerned declined to anticipate its contents.',
  'news_beat.digest.political.brennar_daily_star.headline':
    'Deliberations understood to continue at City Hall — {subject}',
  'news_beat.digest.political.free_weekly.body':
    'Meetings, statements, the usual weather out of City Hall. What it means for the block: wait and see. What the block expects: not much.',
  'news_beat.digest.political.free_weekly.headline':
    'City Hall did a thing — {subject}',
  'news_beat.digest.political.headline':
    'City Hall’s business — {subject}',
  'news_beat.digest.political.tilbey_weekly.body':
    'Something is moving at City Hall, and people here have learned to read that the way sailors read weather. Whatever lands, it lands on streets like these first.',
  'news_beat.digest.political.tilbey_weekly.headline':
    'City Hall stirs, the neighborhoods take note — {subject}',
  'news_beat.digest.random_world.body':
    '{outlet} notes an unresolved disturbance tied to {subject} in {district}.',
  'news_beat.digest.random_world.brennar_daily_star.body':
    'A disturbance in {district} remains, it would appear, unresolved. The circumstances are said to be under review by the appropriate services; no timetable has been communicated.',
  'news_beat.digest.random_world.brennar_daily_star.headline':
    'Disturbance noted in {district}: {subject}',
  'news_beat.digest.random_world.free_weekly.body':
    'The thing in {district}? Still happening. Nobody upstairs has said a word. The block was not expecting one.',
  'news_beat.digest.random_world.free_weekly.headline':
    'Still going, in {district}: {subject}',
  'news_beat.digest.random_world.headline':
    'Unrest reported in {district}: {subject}',
  'news_beat.digest.random_world.tilbey_weekly.body':
    'Word over the counter in {district} is that the trouble has not settled. People are keeping an eye out for one another and waiting, again, for someone to say something official.',
  'news_beat.digest.random_world.tilbey_weekly.headline':
    'In {district}, it hasn’t settled, neighbors say: {subject}',
  'news_beat.folded_page.body':
    'Two other outlets reported on {subject} in {district}; {outlet} did not run the story.',
  'news_beat.folded_page.brennar_daily_star.body':
    'Two papers carried the story out of {district} this week. The city\'s broadsheet was not one of them. No explanation was offered — and none, presumably, is on file.',
  'news_beat.folded_page.brennar_daily_star.headline':
    'The folded page: {subject} in {district} — nothing in the broadsheet',
  'news_beat.folded_page.free_weekly.body':
    'Two outlets ran the story out of {district}. The free paper — the one that prints nearly everything — did not. When that page goes quiet, the quiet is the story.',
  'news_beat.folded_page.free_weekly.headline':
    'The folded page: even the free paper skips {subject} in {district}',
  'news_beat.folded_page.headline':
    'What {outlet} left uncovered in {district}: {subject}',
  'news_beat.folded_page.tilbey_weekly.body':
    'The story out of {district} ran in two papers this week — just not in the one closest to home. The neighborhood weekly kept its pages for other things. Doorsteps notice that kind of quiet.',
  'news_beat.folded_page.tilbey_weekly.headline':
    'The folded page: {district}’s own weekly stays silent on {subject}',
  'news_beat.hindsight.follow_up.body':
    '{outlet} continues its retrospective series on {subject}.',
  'news_beat.hindsight.follow_up.brennar_daily_star.body':
    'Continuing its review, this paper records further particulars of the period preceding the event. As before, their significance would appear clearer in retrospect than it can have been at the time. The examination continues.',
  'news_beat.hindsight.follow_up.brennar_daily_star.headline':
    'Further notes on a matter previously examined: {subject}',
  'news_beat.hindsight.follow_up.free_weekly.body':
    'The look-back continues. More signs, same shape: seen on the street, missed upstairs. You could set your watch by it — if anything around here ran on time.',
  'news_beat.hindsight.follow_up.free_weekly.headline':
    'More warnings about {subject}. Still no takers',
  'news_beat.hindsight.follow_up.headline':
    'More on {subject}: the retrospective continues',
  'news_beat.hindsight.follow_up.tilbey_weekly.body':
    'The series continues, and so do the doorstep conversations: another neighbor, another small thing noticed at the time and set aside. Piece by piece it adds up to a picture. We keep collecting.',
  'news_beat.hindsight.follow_up.tilbey_weekly.headline':
    'What the neighborhood still remembers: {subject}',
  'news_beat.hindsight.op_ed.body':
    '{outlet} opens a retrospective on {subject}, tracing prior indicators the paper says were there all along.',
  'news_beat.hindsight.op_ed.brennar_daily_star.body':
    'With the matter now concluded, a review of the preceding months suggests a number of indications which, it would appear, were available at the time. Whether they could reasonably have been acted upon is a question this paper does not presume to settle. A fuller accounting would be desirable; whether one will be undertaken remains to be established.',
  'news_beat.hindsight.op_ed.brennar_daily_star.headline':
    'In retrospect: indications said to have preceded {subject}',
  'news_beat.hindsight.op_ed.free_weekly.body':
    'Now that it is over, suddenly everyone can read the signs. Funny how that works. The signs were on the corner the whole time — ask anyone who stands there. Nobody upstairs asked then. They will now: in reports, in the past tense, with no names in them.',
  'news_beat.hindsight.op_ed.free_weekly.headline':
    'The warnings were there before {subject}. And everybody ignored them',
  'news_beat.hindsight.op_ed.headline':
    'Looking back: the warning signs before {subject}',
  'news_beat.hindsight.op_ed.tilbey_weekly.body':
    'Looking back, the signs were sitting in plain sight: the small troubles, the odd quiet, the complaints over the counter that never went anywhere. Everyone here remembers noticing something. Nobody remembers being asked. This series is the neighborhood adding it up — late, but on the record.',
  'news_beat.hindsight.op_ed.tilbey_weekly.headline':
    'Before {subject}, everyone noticed something. Nobody was asked',
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
    'An account of the facts in {district}: {subject}',
  'news_beat.three_outlet_storm.episodic.free_weekly.body':
    'One family, one mess, one incident — that\'s the whole story, they say. No pattern, no context, no questions upstairs. The block will file it with all the other one-offs.',
  'news_beat.three_outlet_storm.episodic.free_weekly.headline':
    'One more for {district}: {subject}',
  'news_beat.three_outlet_storm.episodic.headline':
    'One family, one story: {subject} in {district}',
  'news_beat.three_outlet_storm.episodic.tilbey_weekly.body':
    'Behind one door in {district}, a family is putting a week back together. The neighbors brought bread and took the children for an afternoon. "You manage," the mother says — the way people say it when they have had to before.',
  'news_beat.three_outlet_storm.episodic.tilbey_weekly.headline':
    'One door in {district}: what {subject} left behind',
  'news_beat.three_outlet_storm.human_interest.body':
    '{outlet} follows the people closest to {subject} in {district}.',
  'news_beat.three_outlet_storm.human_interest.brennar_daily_star.body':
    'For residents of {district}, the aftermath has entailed a series of practical adjustments, described to this paper as considerable. Support measures are understood to be under consideration by the appropriate services.',
  'news_beat.three_outlet_storm.human_interest.brennar_daily_star.headline':
    'Residents of {district} adjust after {subject}',
  'news_beat.three_outlet_storm.human_interest.free_weekly.body':
    'No committee, no plan, no statement. Just neighbors doing what neighbors do while everyone official stays busy being unavailable. Somebody ought to write that down. Nobody official will.',
  'news_beat.three_outlet_storm.human_interest.free_weekly.headline':
    'People in {district} manage, even after {subject}',
  'news_beat.three_outlet_storm.human_interest.headline':
    'A neighborhood story: {subject}',
  'news_beat.three_outlet_storm.human_interest.tilbey_weekly.body':
    'In {district} this week, doors stayed open a little longer than usual. The baker set aside the unsold loaves, a retired neighbor walks the children to school, and nobody calls any of it help. "You just do it," she says. That is the whole quote, and it is enough.',
  'news_beat.three_outlet_storm.human_interest.tilbey_weekly.headline':
    'In {district}, after {subject}, the kettle stays on',
  'news_beat.three_outlet_storm.scandal.body':
    '{outlet} frames {subject} as a question of who is responsible.',
  'news_beat.three_outlet_storm.scandal.brennar_daily_star.body':
    'The incident in {district} has given rise to questions of accountability which, it would appear, remain open. Which office bears responsibility could not be established by the time of going to press. Requests for clarification are said to be receiving attention.',
  'news_beat.three_outlet_storm.scandal.brennar_daily_star.headline':
    'Questions of accountability said to remain open: {subject} in {district}',
  'news_beat.three_outlet_storm.scandal.free_weekly.body':
    'Somebody is responsible. Somebody always is, and it is never anybody. Ask upstairs and it\'s the process; ask about the process and it\'s upstairs. Round and round. The block is left holding the bag either way.',
  'news_beat.three_outlet_storm.scandal.free_weekly.headline':
    'Who signed off on {subject}? {district} asked. Nobody, apparently',
  'news_beat.three_outlet_storm.scandal.headline':
    'Who is accountable: {subject}',
  'news_beat.three_outlet_storm.scandal.tilbey_weekly.body':
    'Somebody approved it, somebody signed it, and nobody in {district} can get either name. The shopkeepers have started keeping a list of everyone they have asked. The list is getting long, and it is all questions.',
  'news_beat.three_outlet_storm.scandal.tilbey_weekly.headline':
    'Somebody signed off on {subject} — {district} would like a word',
  'news_beat.three_outlet_storm.thematic.body':
    '{outlet} places {subject} in a broader citywide context, not an isolated incident.',
  'news_beat.three_outlet_storm.thematic.brennar_daily_star.body':
    'Placed against comparable occurrences elsewhere in Brennar, the incident in {district} would appear consistent with a broader pattern, the parameters of which remain to be defined. A citywide assessment would seem warranted; none has been announced.',
  'news_beat.three_outlet_storm.thematic.brennar_daily_star.headline':
    'Wider trends said to lie behind {subject} in {district}',
  'news_beat.three_outlet_storm.thematic.free_weekly.body':
    'Same story all over town, different address each week. Call it a pattern and someone official will call you dramatic. Fine. The block calls it Tuesday.',
  'news_beat.three_outlet_storm.thematic.free_weekly.headline':
    '{district} today, somewhere else tomorrow: {subject}',
  'news_beat.three_outlet_storm.thematic.headline':
    'A citywide pattern behind {subject}',
  'news_beat.three_outlet_storm.thematic.tilbey_weekly.body':
    'What happened in {district} has happened, in its own way, a few bus stops down the line. Same complaints over the counter, same letters, same waiting. People compare notes at the market now, and the notes agree.',
  'news_beat.three_outlet_storm.thematic.tilbey_weekly.headline':
    'After {subject}, {district} is not the only one — ask one neighborhood over',
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
    '{n, plural, one {A building needs repair} other {Buildings need repair}}',
  'decision.type.SEVERED_ROUTE_REBUILD':
    '{n, plural, one {A route is cut} other {Routes are cut}}',
  'decision.type.ESCALATION_BACKLOG_REVIEW':
    'Escalations are waiting',
  'decision.type.AUTONOMY_REPORTS_PENDING':
    'Reports are waiting to be read',
  'decision.type.LEGAL_CASE_DECISION':
    'A case before the judge',
  'decision.type.BACKPRESSURE_CRITICAL_TRACE':
    'A critical bottleneck',
  'decision.type.MYCELIAL_STRESSED_LEG':
    '{n, plural, one {A link under strain} other {Links under strain}}',
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
    'Go and read them',
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
  // ⚠️ SANS clé, parce que SANS texte ratifié (dit, pas inventé) : `building.vehicle.refrigerated_van`,
  //    les membres `NONE` de lab_tier/hub_tier/money_holding_tier/roster/
  //    capacity (le client n'affiche rien), et `TransferAmountLabel` — aucune bande servie ne le porte.
  'building.type.lab':
    'Lab',
  'building.type.stash':
    'Stash',
  'building.type.front_shop':
    'Front',
  'building.type.cash_safehouse':
    'Safehouse',
  'building.type.dealer_spot_front':
    'Corner',
  'building.type.specialized_lab':
    'Specialist lab',
  'building.type.refinery':
    'Refinery',
  'building.type.grow_house':
    'Grow house',
  'building.type.distribution_hub':
    'Hub',
  'building.type.money_holding':
    'Vault',
  // 2026-09-23 — `press_house` et `office` reçoivent leurs mots de l'atelier (`22-interieur-district-fiche-inventaire.md` §7.1, DA `c59ed038`).
  'building.type.press_house':
    'Print shop',
  'building.type.office':
    'Agency',
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
    'basic',
  'building.lab_tier.refined':
    'upgraded',
  'building.lab_tier.master':
    'top level',
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
    'Cutting',
  'building.grow_stage.mid':
    'Growth',
  'building.grow_stage.late':
    'Flowering',
  'building.grow_stage.done':
    'Harvest',
  'building.husbandry.withered':
    'Needs care',
  'building.husbandry.on_track':
    'Fair',
  'building.husbandry.thriving':
    'Vigorous',
  'building.precursor.verdant_root_extract':
    'Verdant root',
  'building.precursor.lull_resin':
    'Lull resin',
  'building.precursor.glass_lily':
    'Glass lily',
  // Brindle — les 3 précurseurs canoniques (atelier 39, da `893ede79`) : pyralin et thalmite noms propres (fr == en) ; garnet_salt fr PROPOSÉ.
  'building.precursor.pyralin': 'Pyralin',
  'building.precursor.thalmite': 'Thalmite',
  'building.precursor.garnet_salt': 'Garnet salt',
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
  // ═══ TABLE 57 (atelier 0ddb3933, commande f2 24/09, HL v7.6 §14) — 16 clés de conséquence
  //     projetée des cartes de tête ④ (`hl.option.<f>.<o>.projected_consequence`), PROPOSÉES. ═══
  'hl.option.damaged_building.repair_via_queue.projected_consequence': 'Each repair is paid for on the spot, as long as the money holds out; once the work is done, business picks up again.',
  'hl.option.damaged_building.leave_damaged.projected_consequence': 'Nothing is paid, but what’s damaged stays shut down, and the lost earnings keep adding up.',
  'hl.option.severed_route.reroute_now.projected_consequence': 'A detour is laid out for each route and paid for on the spot, as long as the money holds out; the way reopens once the work is done.',
  'hl.option.severed_route.leave_severed.projected_consequence': 'Nothing is paid, but what’s cut stays cut: nothing gets through.',
  'hl.option.legal_case.accept_plea_deal.projected_consequence': 'The case closes right away, on negotiated terms: no verdict to wait for, or to dread.',
  'hl.option.legal_case.let_ride.projected_consequence': 'The case runs its course to a verdict: it may go your way, or it may go badly.',
  'hl.option.mycelial_stressed_leg.maintain_now.projected_consequence': 'A quick, inexpensive service, paid for on the spot for each link, as long as the money holds out: the strain eases without halting deliveries.',
  'hl.option.mycelial_stressed_leg.leave_stressed.projected_consequence': 'Nothing is paid, but every run adds to the wear: the break draws closer.',
  'hl.option.backpressure_critical_trace.trace_now.projected_consequence': 'You go and see where the bottleneck starts: nothing is touched, nothing is paid.',
  'hl.option.backpressure_critical_trace.leave_pending.projected_consequence': 'The bottleneck stays where it is, and slows everything that passes through.',
  'hl.option.autonomy_reports.review_now.projected_consequence': 'You open the reports: each point waits for your call, and nothing is decided for you.',
  'hl.option.autonomy_reports.leave_pending.projected_consequence': 'The reports stay unread; they’ll still be waiting tomorrow.',
  'hl.option.cue_cascade_fallout.review_now.projected_consequence': 'You open the queue: what the cascade left behind is waiting for you, and nothing is settled on your behalf.',
  'hl.option.cue_cascade_fallout.leave_pending.projected_consequence': 'What the cascade left behind stays in the queue, and adds to your load.',
  'hl.option.escalation_backlog.review_now.projected_consequence': 'You go and read the escalations. What’s been escalated stays escalated: nothing in them will change.',
  'hl.option.escalation_backlog.leave_pending.projected_consequence': 'The escalations stay as they are; as long as they keep piling up, the card will keep coming back.',

  // ═══ TABLE 58 (atelier 9d94e2cf) — présence des bâtiments sur la carte ③ (D21), pluriel ICU. ═══
  'carte.presence.batiments': '{n, plural, one {# building} other {# buildings}}',

  // ═══ TABLE 60 (atelier 9a17e7bf, f2 26/09) — menu Plus : 5 titres de groupe PROPOSÉS + les 20
  //     entrées littérales du client (AppShell.cs DestinationsPlus, e575a536), mots inchangés. ═══
  'plus.groupe.vos_journees': 'Your days',
  'plus.groupe.vos_affaires': 'Your business',
  'plus.groupe.ce_qui_se_dit': 'What people say',
  'plus.groupe.ce_qui_vous_guette': 'What’s watching you',
  'plus.groupe.vous': 'You',
  'plus.entree.la_revue_du_jour': 'Today’s review',
  'plus.entree.les_ordres_du_soir': 'Evening orders',
  'plus.entree.ce_que_vous_avez_confie': 'What you’ve handed over',
  'plus.entree.la_semaine': 'The week',
  'plus.entree.la_chaine_d_appro': 'The supply chain',
  'plus.entree.la_distribution': 'Distribution',
  'plus.entree.la_vente': 'Selling',
  'plus.entree.raser_un_site': 'Raze a site',
  'plus.entree.le_journal_la_rue': 'The paper & the street',
  'plus.entree.la_reputation': 'Reputation',
  'plus.entree.le_conflit': 'The conflict',
  'plus.entree.la_loi': 'The law',
  'plus.entree.les_inspections': 'Inspections',
  'plus.entree.le_commissariat': 'The precinct',
  'plus.entree.le_dossier': 'The file',
  'plus.entree.l_horizon_des_possibles': 'The horizon',
  'plus.entree.votre_profil': 'Your profile',
  'plus.entree.la_vitrine': 'The shop window',
  'plus.entree.la_premiere_fois': 'The first time',
  'plus.entree.les_reglages': 'Settings',

  // ═══ TABLE 61 (atelier 84f22ade) — ㊲ règles de maison, 6 noms PROPOSÉS pour les rule_id sans
  //     clé servie (canon 3.1/3.2/3.4). ═══
  'reputation.etat.le_silence_aux_remises': 'silence at handoffs',
  'reputation.etat.les_dettes_honorees': 'debts made good',
  'reputation.etat.le_reflexe_de_faire_remonter': 'passing problems up',
  'reputation.etat.la_force_mesuree': 'force kept in check',
  'reputation.etat.le_reglement_a_la_loyale': 'settling fair',
  'reputation.etat.la_juste_indemnite_de_depart': 'fair severance',

  // ═══ TABLE 62 (atelier 2648d19d, B3, commande f2 26/09) — ㉟ gestes de vente, 11 clés PROPOSÉES
  //     (`vente.geste.*` / `vente.vide.*`). ═══
  'vente.geste.un_dealer_tient_ce_point_de_vente': 'A dealer is working this corner now.',
  'vente.geste.le_dealer_n_a_pas_ete_poste': 'The post couldn’t be filled',
  'vente.geste.aucun_bloc_libre_dans_votre_quartier': 'No free block in your district.',
  'vente.geste.point_de_vente_achete_ouvrez_le_depuis_sa_fiche': 'Corner bought. It still has to be opened, from its card.',
  'vente.geste.l_achat_n_a_pas_abouti': 'The purchase fell through',
  // ★ addendum 62 (atelier 26f9de15, 2026-09-26) — littéral de SellingScreenController.cs:343-346,
  //   état vide (D12 « coin de vente », D10) : 2 clés PROPOSÉES.
  'vente.vide.les_coins_de_vente_n_ont_pas_repondu': 'The corners didn’t answer.',
  'vente.vide.aucun_coin_de_vente': 'No corner.',
  'vente.vide.aucun_dealer_au_travail': 'No dealer at work.',
  'vente.geste.point_de_vente_sans_dealer': 'Corner with no dealer',
  'vente.geste.poster_un_dealer': 'Post a dealer',
  'vente.geste.vous_n_avez_aucun_point_de_vente': 'You have no corner',
  'vente.geste.acheter_un_point_de_vente': 'Buy a corner',
  'vente.geste.coute_de_l_argent_et_la_decision_de_structure_de_cette_session_il_faudra_ensuite_l_ouvrir_depuis_sa_fiche': 'Costs money and today’s structural decision; opening it afterwards, from its card, takes another one, tomorrow.',

  // ═══ TABLE 63 v2 (atelier 34beb6e7) — états vides muets/faux/bruts, 24 clés PROPOSÉES (2 servies
  //     déjà présentes : `horizon.bloc.*` ; 1 valeur changée traitée à part : `exceptions.file.ambiance` ;
  //     2 lignes REMPLACÉES par l'addendum 33b422c5, non servies : `inspection.vide.rien_a_faire_ici_…`,
  //     `distribution.vide.un_relais_s_obtient_…`). ═══
  'police.vide.le_commissariat_n_a_encore_rien_sur_vous': 'The precinct has nothing on you yet.',
  'police.vide.tant_que_vous_ne_faites_pas_de_bruit_ca_peut_durer': 'Keep it quiet, and it can stay that way.',
  'filiere.vide.votre_planque_enseigne_est_vide': 'Your safehouse, {enseigne}, is empty.',
  'filiere.vide.l_argent_y_entre_quand_vous_ramassez_la_caisse_d_un_dealer': 'Money comes in when you collect a dealer’s cash.',
  'demolition.vide.rien_ne_se_gene_vos_sites_tournent_sans_se_marcher_dessus': 'Nothing’s in the way: your sites run without stepping on each other.',
  'demolition.vide.rien_a_raser_pour_l_instant': 'Nothing to raze for now.',
  'demolition.ecran.n_endroits_se_genent': '{n, plural, =0 {Nothing is in the way.} one {One site is in another’s way.} other {# sites are in each other’s way.}}',
  'appro.vide.rien_ne_circule_encore_vos_maillons_attendent_une_premiere_commande': 'Nothing’s moving yet: your links are waiting for a first order.',
  'distribution.vide.pas_encore_de_relais': 'No hub yet.',
  'distribution.vide.sans_relais_rien_ne_part_c_est_de_la_que_vos_coursiers_livrent': 'Without a hub, nothing goes out: that’s where your couriers deliver from.',
  'revue.vide.vos_lieutenants_n_ont_encore_rien_a_tenir_donnez_leur_une_premiere_regle': 'Your lieutenants have nothing to hold to yet: give them a first rule.',
  'autonomie.vide.aucun_rapport_pour_l_instant_il_en_viendra_quand_vous_aurez_confie_une_tache_a_un_lieutenant': 'No reports yet: they’ll come once you’ve handed a task to a lieutenant.',
  'building.vide.a_l_arret_pas_de_precursor_type_en_stock': 'Stopped: no {precursor_type} in stock.',
  'building.vide.rien_a_blanchir_la_planque_est_vide': 'Nothing to launder: the safehouse is empty.',
  'famille.vide.au_repos_rien_a_cuire_pour_l_instant': 'Resting: nothing to cook for now.',
  'famille.vide.commandez_de_la_matiere_depuis_la_chaine_d_appro': 'Order supplies from the supply chain.',
  'tutoriel.vide.une_premiere_lecon_vous_attend': 'A first lesson is waiting for you.',
  'accueil.vitals.cohesion_pas_encore_mesuree': 'Cohesion: not measured yet',
  'famille.ecran.recruter_archetype': 'Recruit — {archetype}',
  'famille.ecran.nouvelle_recrue_archetype': 'New recruit: {archetype}.',
  'profil.etat.active': 'in good standing',
  'profil.langue.fr': 'French',
  'profil.langue.en': 'English',
  'boutique.bloc.bientot': 'Coming soon',

  // ═══ TABLE 63 addendum (atelier 33b422c5, suivi ⊥ UX §I) — 2 clés qui REMPLACENT les 2 lignes
  //     v2 exclues ci-dessus (phrases fausses : ⑮ aucun geste dispo pourtant actif ; ㉘ chemin
  //     d'achat réel du relais). ═══
  'inspection.vide.aucune_inspection_en_cours': 'No inspection under way.',
  // ★ addendum ㉘ (atelier 08b9ef26, 2026-09-26) — la phrase dit enfin la condition qui la rend
  //   vraie (tidewater/stack seulement, 5 quartiers sur 18) ; clé gardée, valeur précisée.
  'distribution.vide.un_relais_s_achete_sur_un_bloc_libre_puis_s_ouvre_depuis_sa_fiche': 'A hub is bought on a free block, then opened from its card, on the docks or in the smokestacks only — money and two structural decisions, over two days.',

  // ═══ TABLE 64 (atelier 80e2e926) — 4 répliques de Dima extraites en clés (littéral client,
  //     DemolitionScreenController.cs), PROPOSÉES. {nom}=Dima composé CÔTÉ CLIENT (pas de site back :
  //     voir implementation-notes.md § Deviations). ═══
  'demolition.dit.on_a_trop_de_choses_au_meme_endroit_il_va_falloir_en_enlever_une': '{nom}: “We’ve got too much in one place. One of them has to go.”',
  'demolition.dit.celui_la_on_le_garde_par_habitude_il_gene_les_voisins_et_il_ne_rend_presque_rien': '{nom}: “That one we keep out of habit. It gets in the neighbours’ way and brings in next to nothing.”',
  'demolition.dit.trop_tard_pour_celle_la': '{nom}: “Too late for that one.”',
  'demolition.dit.deux_propositions_la_premiere_est_mieux_placee_elles_ne_resteront_pas_sur_la_table': '{nom}: “Two offers. The first is better placed. They won’t stay on the table.”',

  // ═══ TABLE 65 (atelier 20d9be5f) — ㉞ « Ce qui arrive », 5 clés `carnet.bloc.*` PROPOSÉES.
  //     Les 12 political.event.E-POL-* sont RÉUTILISÉES telles quelles (déjà servies), 0 clé neuve. ═══
  'carnet.bloc.ce_qui_arrive': 'What’s coming',
  'carnet.bloc.en_cours': 'under way',
  'carnet.bloc.annonce': 'coming up',
  'carnet.bloc.rien_n_est_annonce': 'Nothing’s been announced.',
  'carnet.bloc.le_calendrier_n_a_pas_repondu': 'The calendar didn’t answer.',

  // ═══ TABLE 66 (atelier ceb0b3fe) — ⑧ bandeau chaufferie / week_state / diagnostics, 12 clés
  //     PROPOSÉES. ═══
  'compression.week_state.warning': 'pressure’s building',
  'compression.week_state.active': 'compression week',
  'compression.tension.calm': 'calm',
  'compression.semaine.none': 'no week',
  'accueil.bandeau.la_chaufferie_etat': 'The boiler room — {etat}',
  'lieutenant.editeur.ces_regles_ne_passent_pas': 'These rules don’t go through.',
  'lieutenant.editeur.ligne_colonne_message': 'Line {ligne}, column {colonne} — {message}',
  'lieutenant.diagnostic.syntax_error': 'This line doesn’t read: a word is missing, or out of place.',
  'lieutenant.diagnostic.tier_not_unlocked': 'Not within your reach yet.',
  'lieutenant.diagnostic.not_supported_yet': 'This order exists, but nobody carries it out yet.',
  'lieutenant.diagnostic.rule_count_exceeded': 'Too many rules for one lieutenant: take one out.',
  'lieutenant.diagnostic.priority_out_of_bounds': 'This priority is off the scale.',
  'lieutenant.diagnostic.condition_depth_exceeded': 'Too many conditions nested inside each other: simplify.',
  'lieutenant.diagnostic.tenure_peer_scope_violation': 'One lieutenant can’t read another’s seniority.',

  // ═══ TABLE 67 addendum (atelier 29f876ae) — bandeau chaufferie sans mot d'état, 1 clé PROPOSÉE.
  //     (Les 17 codes ERROR_CODES neufs de la table 67 elle-même sont HORS de ce lot — lot « refus ».) ═══
  'accueil.bandeau.la_chaufferie': 'The boiler room',

  // ═══ TABLE 68 (atelier a21f3c62) — ③ panneau de district, 41 clés ParValeur PROPOSÉES
  //     (4 familles déjà servies réutilisées : `heat.bucket.*`, `filiere.proprete.*`,
  //     `inspection.charge.*`, `inspection.regime.*`). `carte.refoulement.{congested,saturated}`
  //     ré-accordés au féminin par l'addendum 68 (« Circulation »). ═══
  'carte.controle.uncontested': 'Free',
  'carte.controle.contested': 'Contested',
  'carte.controle.player_held': 'Yours',
  'carte.controle.rival_held': 'Rival',
  'carte.refoulement.normal': 'flowing',
  'carte.refoulement.congested': 'congested',
  'carte.refoulement.saturated': 'saturated',
  'carte.exposition.minimal': 'minimal',
  'carte.exposition.low': 'low',
  'carte.exposition.elevated': 'high',
  'carte.exposition.critical': 'critical',
  'carte.reserve.low': 'barely',
  'carte.reserve.moderate': 'partly',
  'carte.reserve.high': 'a lot',
  'carte.reserve.saturated': 'completely',
  'carte.tampon_charge.empty': 'empty',
  'carte.tampon_charge.low': 'light',
  'carte.tampon_charge.nominal': 'normal',
  'carte.tampon_charge.high': 'heavy',
  'carte.tampon_charge.critical': 'critical',
  'carte.tampon_traine.low': 'short',
  'carte.tampon_traine.moderate': 'medium',
  'carte.tampon_traine.high': 'long',
  'carte.tampon_traine.critical': 'critical',
  'carte.epingles.none': 'none',
  'carte.epingles.some': 'a few',
  'carte.epingles.widespread': 'everywhere',
  'carte.cohesion.stable': 'solid',
  'carte.cohesion.fragile': 'fragile',
  'carte.cohesion.thawed': 'broken',
  'police.croyance.dormant': 'dormant',
  'police.croyance.watchful': 'watchful',
  'police.croyance.suspicious': 'suspicious',
  'police.croyance.hunting': 'hunting',
  'police.patrouille.quiet': 'nothing on the streets',
  'police.patrouille.low': 'sparse',
  'police.patrouille.medium': 'present',
  'police.patrouille.high': 'everywhere',
  'carte.rumeur.calm': 'nothing much',
  'carte.rumeur.stirring': 'murmurs',
  'carte.rumeur.alert': 'buzzing',

  // ═══ TABLE 68 addendum (atelier 9ebfcb4d) — 25 étiquettes `carte.panneau.*` PROPOSÉES (jargon
  //     remplacé : dispatch, tampon, traîne, épingles d'audit, refoulement). ═══
  'carte.panneau.blocs': 'Blocks',
  'carte.panneau.rive': 'Bank',
  'carte.panneau.controle': 'Control',
  'carte.panneau.releves': 'Readings',
  'carte.panneau.releves_ouvrez_une_session': 'come back once your day has opened',
  'carte.panneau.pas_encore_releve': 'not read yet',
  'carte.panneau.chaleur_quartier': 'Heat — the district',
  'carte.panneau.chaleur_ville': 'Heat — the city',
  'carte.panneau.descente': 'Raid',
  'carte.panneau.oui': 'yes',
  'carte.panneau.non': 'no',
  'carte.panneau.refoulement': 'Traffic',
  'carte.panneau.exposition': 'Exposure',
  'carte.panneau.proprete_du_reseau': 'How clean the money is',
  'carte.panneau.reserve_qui_bloque': 'Safehouses clogged',
  'carte.panneau.tampon_charge': 'Goods waiting',
  'carte.panneau.tampon_traine': 'The wait',
  'carte.panneau.file_d_inspection': 'Inspection queue',
  'carte.panneau.regime_du_dispatch': 'Inspectors’ pace',
  'carte.panneau.epingles_d_audit': 'Marks on your files',
  'carte.panneau.coins_de_vente': 'Corners',
  'carte.panneau.cohesion': 'Cohesion',
  'carte.panneau.ce_qu_ils_croient': 'What they believe — precinct {precinct}',
  'carte.panneau.la_patrouille': 'The patrol — precinct {precinct}',
  'carte.panneau.ce_qui_se_dit': 'What the city is saying',

  // ═══ TABLE 69 (atelier 06a500d4) — la monnaie Marks : 5 clés `boutique.bloc.*` + 9
  //     `boutique.sku.*` PROPOSÉES (3 valeurs changées traitées à part : `exceptions.apres.resolved`,
  //     `exception_detail.outcome.resolved`, `boutique.bloc.jetons`). ═══
  'boutique.bloc.n_marks': '{n, plural, one {# Mark} other {# Marks}}',
  'boutique.bloc.donne_n_marks': 'gives {n, plural, one {# Mark} other {# Marks}}',
  'boutique.bloc.bonus_de_marks_par_euro': '+{bonus}% more Marks per euro',
  'boutique.bloc.plus_aucun_mark_et_rien_n_en_redonne': 'no Marks left, and nothing gives any back',
  'boutique.bloc.pas_assez_de_marks': 'not enough Marks',
  // ═══ TABLE 69 suite (atelier 7159e54, 08/10) — vitrine de ㉓ re-rendue en Marks : 2 titres de bloc, demandés par CLIENT-1. ═══
  'boutique.bloc.les_extras_payes_en_marks': 'The extras — paid in Marks',
  'boutique.bloc.les_marks_payes_au_magasin': 'The Marks — paid at the store',
  'boutique.sku.marks_pack_small': 'A wad of 100 Marks',
  'boutique.sku.marks_pack_med': 'A wad of 600 Marks',
  'boutique.sku.marks_pack_large': 'A wad of 1,400 Marks',
  'boutique.sku.marks_pack_xl': 'A wad of 3,500 Marks',
  'boutique.sku.cosm_callsign_color': 'Callsign colours',
  'boutique.sku.cosm_dashboard_theme_1': 'Theme: sodium night',
  'boutique.sku.save_slot_2': 'A second save',
  'boutique.sku.save_slot_3': 'A third save',
  'boutique.sku.support_pack': 'Studio support',

  // ═══ TABLE 70 (atelier b6bda780) — 4 replis de refus (réseau/corps vide), PROPOSÉS. ═══
  'autonomie.refus.votre_choix_n_a_pas_ete_enregistre_reessayez': 'Your choice wasn’t recorded. Try again.',
  'exception_detail.refus.votre_decision_n_a_pas_ete_enregistree_reessayez': 'Your decision wasn’t recorded. Try again.',
  'loi.refus.l_embauche_n_a_pas_abouti_reessayez_plus_tard': 'The hiring fell through. Try again later.',
  'loi.refus.la_retention_n_a_pas_change_reessayez_plus_tard': 'The retainer hasn’t changed. Try again later.',

  // ═══ TABLE 71 (atelier 5354fa88) — geste « acheter un relais » (㉘), 4 clés PROPOSÉES
  //     `distribution.geste.*`. ═══
  'distribution.geste.acheter_un_relais': 'Buy a hub',
  'distribution.geste.coute_de_l_argent_et_votre_decision_de_structure_du_jour_il_s_ouvre_ensuite_depuis_sa_fiche_sur_le_port_ou_dans_les_cheminees_seulement_et_en_demandera_une_autre_demain': 'Costs money and today’s structural decision; it then opens from its card — on the docks or in the smokestacks only — and takes another one, tomorrow.',
  'distribution.geste.relais_achete_reste_a_l_ouvrir_depuis_sa_fiche': 'Hub bought. It still has to be opened, from its card.',
  'distribution.geste.l_achat_n_a_pas_abouti': 'The purchase fell through',

  // Lot « ouvrables » (L10) — le motif de refus de `convert` hors district (`details.reason_i18n`), 1 clé
  // `distribution.refus.*` PROPOSÉE (écran ㉘). La clé EST la phrase.
  'distribution.refus.ce_type_de_batiment_ne_peut_pas_s_ouvrir_dans_ce_quartier': 'This type of building can’t be opened in this district.',

  // ═══ TABLE 72 (atelier 51aa0c5c) — bloc « La suite » de l'Accueil pour un joueur neuf,
  //     18 clés `accueil.suite.*` PROPOSÉES (A1/A2/A3 labo, B/C vente, D règles). Aucune donnée
  //     neuve : toutes les conditions sont déjà servies (corps ux_vide_2609). ═══
  'accueil.suite.la_suite': 'What’s next',
  'accueil.suite.le_labo_attend_du_precurseur': 'The lab is waiting for {precurseur}',
  'accueil.suite.sans_lui_rien_ne_cuit': 'Without it, nothing cooks.',
  'accueil.suite.commander': 'Order',
  'accueil.suite.le_precurseur_est_en_route': 'The {precurseur} is on its way',
  'accueil.suite.a_son_arrivee_lancez_la_cuisson': 'When it arrives, start the cook.',
  'accueil.suite.le_precurseur_est_la': 'The {precurseur} is here',
  'accueil.suite.lancez_la_cuisson': 'Start the cook.',
  'accueil.suite.cuire': 'Cook',
  'accueil.suite.personne_ne_vend_encore': 'Nobody is selling yet',
  'accueil.suite.un_dealer_sur_un_coin_de_vente_et_la_marchandise_part': 'A dealer on a corner, and the goods start moving.',
  'accueil.suite.voir_la_vente': 'Go to sales',
  'accueil.suite.la_caisse_de_prenom_se_remplit': '{prenom}’s cash is filling up',
  'accueil.suite.ramassez_la_elle_rejoint_la_planque': 'Collect it: it goes to the safehouse.',
  'accueil.suite.ramasser': 'Collect',
  'accueil.suite.vos_lieutenants_attendent_une_consigne': 'Your lieutenants are waiting for instructions',
  'accueil.suite.une_premiere_regle_et_ils_tiennent_sans_vous': 'One first rule, and they hold the line without you.',
  'accueil.suite.ecrire_une_regle': 'Write a rule',

  // ═══ TABLE 73 (atelier a2c0b2e4) — le carnet du soir, état vide + composeur, 16 clés
  //     PROPOSÉES. Les 3 groupes réutilisés (carnet.bloc.a_batiment_quartier,
  //     carnet.bloc.deux_ordres_s_attendent_l_un_l_autre, carnet.bloc.un_endroit_n_a_pas_fini_de_se_poser)
  //     sont DÉJÀ servis plus haut (table précédente) — non redupliqués ici. ═══
  'carnet.vide.il_faut_au_moins_quatre_ordres_pour_une_soiree': 'An evening needs at least four orders.',
  'carnet.vide.vous_pouvez_deja_poser': 'You can already set',
  'carnet.vide.n_cibles': '{n, plural, one {# target} other {# targets}}',
  'carnet.vide.pas_encore_de_quoi_remplir_une_soiree': 'Not enough yet to fill an evening: you’ll need more premises, routes or candidates.',
  'carnet.composeur.poser_un_ordre': 'Set an order',
  'carnet.composeur.quel_ordre': 'Which order?',
  'carnet.composeur.rien_a_viser_pour_l_instant': 'nothing to aim at for now',
  'carnet.composeur.sur_quoi': 'On what?',
  'carnet.composeur.appui_long_pour_deplacer': 'long press to move',
  'carnet.composeur.retirer': 'Remove',
  'carnet.composeur.encore_n_ordres_a_poser': '{n, plural, one {One more order to set} other {# more orders to set}}',
  'carnet.refus.cet_ordre_n_existe_pas_encore': 'This order doesn’t exist yet.',
  'carnet.refus.cette_cible_ne_tient_plus_choisissez_en_une_autre': 'This target no longer holds: pick another.',
  'carnet.refus.une_soiree_est_deja_en_route': 'An evening is already under way: it finishes before another is set.',
  'carnet.composeur.choisir': 'Choose',
  'carnet.composeur.deja_dans_le_carnet': 'already in the notebook',

  // ═══ TABLE 76 (atelier fa4dba93) — la planque et la suite (reco f1, décidée 26/09), 18 clés
  //     PROPOSÉES : LA SUITE ④ (72) lignes E/F/G, ①/㉟ planque pleine, ㊵, et les 5 mots de
  //     remplissage par valeur (StashLoadBucket). ═══
  'accueil.suite.de_l_argent_attend_dans_la_planque': 'Cash is waiting in the safehouse',
  'accueil.suite.blanchissez_le_il_ne_rapporte_rien_tant_qu_il_dort': 'Launder it: it earns nothing while it sits.',
  'accueil.suite.la_planque_est_pleine': 'The safehouse is full',
  'accueil.suite.blanchissez_sinon_la_caisse_des_dealers_ne_peut_plus_s_y_vider': 'Launder: otherwise the dealers’ cash has nowhere to go.',
  'accueil.suite.blanchir': 'Launder',
  'accueil.suite.un_lieutenant_du_blanchiment': 'A laundering lieutenant',
  'accueil.suite.il_fait_passer_l_argent_par_la_filiere_a_votre_place_une_decision_de_structure': 'They move the cash through the chain for you — one structural decision.',
  'accueil.suite.recruter': 'Recruit',
  'accueil.suite.un_lieutenant_de_la_distribution': 'A distribution lieutenant',
  'accueil.suite.il_ramasse_la_caisse_a_votre_place_une_decision_de_structure': 'They collect the cash for you — one structural decision.',
  'vente.geste.planque_pleine_le_reste_attend_dans_la_caisse': 'Safehouse full: the rest waits in the cash box.',

  // ═══ lot COLLECTE (2026-09-26) — tables 75 (collecte partielle, atelier @71747158) et 85 (collecte indisponible, @91d40c01) : 24 clés, recopiées du TSV au caractère près ═══
  'vente.geste.ramasse_collecte_encore_chez_prenom_reste': 'Collected: {collecte}. Still with {prenom}: {reste}.',
  'vente.geste.ramasse_collecte_encore_chez_le_dealer_reste': 'Collected: {collecte}. Still with the dealer: {reste}.',
  'vente.geste.tout_est_ramasse_collecte': 'All collected: {collecte}.',
  'vente.refus.la_planque_est_pleine_blanchissez_d_abord_pour_faire_de_la_place': 'The safehouse is full: launder first, to make room.',
  'vente.refus.la_caisse_de_prenom_est_vide': '{prenom}’s cash is empty.',
  'vente.refus.la_caisse_du_dealer_est_vide': 'The dealer’s cash is empty.',
  'vente.caisse.bande.none': 'nothing left',
  'vente.caisse.bande.low': 'a small sum',
  'vente.caisse.bande.moderate': 'a fair sum',
  'vente.caisse.bande.high': 'a large sum',
  'vente.caisse.bande.full': 'all it can hold',
  'vente.caisse.bande.full_il_ne_vend_plus_tant_qu_on_ne_ramasse_pas': 'no more sales until it’s collected',
  'district.fiche.collecte_indisponible_raison': 'Collection refused. {raison}',
  'vente.raison.connexion_expiree': 'The connection has expired.',
  'vente.raison.collecte_non_acceptee': 'This collection isn’t accepted.',
  'vente.raison.indisponible': 'The corner isn’t answering right now.',
  'vente.raison.reponse_vide': 'The answer came back empty.',
  'vente.raison.reponse_illisible': 'The answer couldn’t be read.',
  'vente.refus.la_collecte_n_a_pas_abouti': 'The collection didn’t go through.',
  'vente.refus.collecte_impossible_aucune_planque': 'Can’t collect: you have no safehouse.',
  'district.fiche.collecte_indisponible_session_absente': 'Can’t collect: the connection to the game is lost.',
  'district.fiche.collecte_choisissez_un_point_de_vente': 'To collect, first pick a corner.',
  'district.fiche.rien_a_ramasser_personne_ne_tient_ce_point_de_vente': 'Nothing to collect: nobody’s working this corner.',
  'district.fiche.recherche_du_dealer_et_de_la_planque': 'Looking for the dealer and the safehouse…',
  'building.geste.blanchir_d_abord': 'Launder first',
  'filiere.etat.a_blanchir_la_planque_est_pleine': 'To launder: the safehouse is full.',
  'planque.remplissage.empty': 'empty',
  'planque.remplissage.low': 'nearly empty',
  'planque.remplissage.nominal': 'half full',
  'planque.remplissage.high': 'well filled',
  'planque.remplissage.full': 'full',

  // ═══ TABLE 77 (atelier 6ed61816) — ⑩ marqueur d'issue par EFFET (pas par place), ㊵ tête
  //     quand la planque n'est pas vide, ⑨ le moment par DayPhase, ㉕ le compte en ICU (2 arguments,
  //     mêmes branches fr/en). 10 clés PROPOSÉES. ═══
  'exception_detail.bloc.sans_suite': 'No follow-up',
  'filiere.etat.votre_planque_enseigne_tient_de_quoi_blanchir': 'Your safehouse, {enseigne}, holds enough to launder.',
  'filiere.etat.votre_planque_tient_de_quoi_blanchir': 'Your safehouse holds enough to launder.',
  'filiere.etat.l_argent_passe_de_la_planque_a_la_filiere': 'the cash moves from the safehouse into the chain',
  'exceptions.moment.dawn': 'This morning, at the Verge d’Or',
  'exceptions.moment.day': 'Today, at the Verge d’Or',
  'exceptions.moment.dusk': 'Tonight, at the Verge d’Or',
  'exceptions.moment.night': 'Late tonight, at the Verge d’Or',
  'exceptions.moment.inconnu': 'At the Verge d’Or',
  'tutoriel.ecran.n_vues_n_disponibles': '{vus, plural, one {# seen} other {# seen}} · {disponibles, plural, one {# available} other {# available}}',

  // ═══ TABLE 78 (atelier 3be2e866) — « moment en dur » (A) : ㊳ surtitre + état vide du journal,
  //     ⑤ état vide de la décision — un mot par day_phase (DAWN/DAY/DUSK/NIGHT, null ⇒ inconnu),
  //     15 clés PROPOSÉES. ⑩ réutilise exceptions.moment.* (77), aucune clé neuve pour cet écran.
  //     `\n` = saut de ligne réel (deux lignes, comme l'état "aujourd'hui" existant). ═══
  'journal.moment.titre.dawn': 'What’s being said this morning',
  'journal.moment.titre.day': 'What’s being said today',
  'journal.moment.titre.dusk': 'What’s being said tonight',
  'journal.moment.titre.night': 'What’s being said late tonight',
  'journal.moment.titre.inconnu': 'What’s being said',
  'journal.moment.vide.dawn': 'Nothing this morning.\nThe city had a quiet night.',
  'journal.moment.vide.day': 'Nothing today.\nThe city is calm.',
  'journal.moment.vide.dusk': 'Nothing tonight.\nIt was a quiet day.',
  'journal.moment.vide.night': 'Nothing tonight.\nThe city is keeping quiet.',
  'journal.moment.vide.inconnu': 'Nothing for now.\nThe city is calm.',
  'decision.moment.vide.dawn': 'Nothing stands out from the shoe this morning.',
  'decision.moment.vide.day': 'Nothing stands out from the shoe today.',
  'decision.moment.vide.dusk': 'Nothing stands out from the shoe tonight.',
  'decision.moment.vide.night': 'Nothing stands out from the shoe late tonight.',
  'decision.moment.vide.inconnu': 'Nothing stands out from the shoe for now.',

  // ═══ TABLE f2 (08/10, suite) — 26 clés servies (compression ×17, famille.vide ×3, vente ×1, horizon ×1, boutique ×2, accueil ×2),
  //     PROPOSÉES. Source : scratchpad/MOTS-GENERES-2026-10-08-suite.md. ═══
  'compression.tension.compression_active': 'under compression',
  'compression.semaine.active': 'the week is open',
  'compression.genre.severed_route': 'A route no longer holds the load',
  'compression.genre.cue_cascade_card': 'A missed slot dragged others down',
  'compression.genre.settling_overload': 'One more change during the settling',
  'compression.genre.friction_penalty': 'The organization is carrying too much friction',
  'compression.palier.minor': 'minor',
  'compression.palier.moderate': 'moderate',
  'compression.palier.critical': 'critical',
  'compression.tension.mounting': 'Rising',
  'compression.tension.crushing': 'Crushing',
  'compression.semaine.warning': 'the week is coming',
  'compression.genre.exception_card': 'An exception has been waiting too long',
  'compression.genre.flag': 'A flag was never settled',
  'compression.genre.backpressure_node': 'A node in the chain is saturating',
  'compression.genre.stressed_leg': 'A link is wearing out for want of service',
  'compression.genre.cue_stack_failed_slot': 'A slot in the stack misfired',
  'famille.vide.au_repos_stock.low': 'Resting: barely anything left to cook. Order supplies from the supply chain.',
  'famille.vide.au_repos_stock.medium': 'Resting, with supplies sitting in the lab. The supply chain shows what’s coming.',
  'famille.vide.au_repos_stock.high': 'Resting, and the supplies are piling up in the lab. The supply chain shows what’s coming.',
  'vente.geste.la_caisse_a_rejoint_votre_planque': 'The cash is in your safehouse.',
  'horizon.bloc.les_epaules': 'Your shoulders',
  'boutique.bloc.acheter': 'BUY',
  'boutique.bloc.tapez_mot': 'type {mot}',
  'accueil.carte.la_decision_n_a_pas_ete_prise': 'The decision wasn’t taken.',
  'accueil.carte.tapez_mot': 'type {mot}',

  // ═══ TABLE Lot 3 (08/10, après gate) — 2 clés servies (semaine.bloc ×2, jauge de TENSION ⑭), PROPOSÉES.
  //     Source : scratchpad/MOTS-GENERES-2026-10-08.md § Lot 3. ═══
  'semaine.bloc.tension': 'Tension',
  'semaine.bloc.vos_affaires_respirent': 'your business can breathe',
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
  'exception.heat_pressure.acknowledge.consequence': 'Vous prenez note de la chaleur ; aucune action automatique n’est prise.',
  'exception.heat_pressure.escalate.label': 'Escalader pour relecture',
  'exception.heat_pressure.escalate.consequence': 'La carte est archivée pour relecture ultérieure.',
  'exception.heat_pressure.lay_low.label': 'Se faire oublier sur toutes les opérations',
  'exception.heat_pressure.lay_low.consequence': 'Vous réduisez l’exposition partout ; mesure ponctuelle, sans règle permanente.',
  'exception.onboarding_preseed.acknowledge.label': 'Prendre acte de l’état du labo',
  'exception.onboarding_preseed.acknowledge.consequence': 'Vous en prenez note ; aucune action automatique n’est prise.',
  'exception.onboarding_preseed.escalate.label': 'Escalader pour relecture',
  'exception.onboarding_preseed.escalate.consequence': 'La carte est archivée pour relecture ultérieure.',
  // --- TD-453 — même histoire que TD-452 : copie de l'anglais à la naissance, traduites depuis (0 / 102).
  'exception.cue_cascade.card.descriptor': 'Un créneau de la pile n’a pas pu partir — réengagez un créneau équivalent pour le récupérer.',
  'exception.cue_cascade.acknowledge_recover.label': 'Prendre acte du revers',
  'exception.cue_cascade.acknowledge_recover.consequence':
    'Vous prenez note que le créneau n’a pas pu partir. Réengager un créneau équivalent le récupérera, au prix d’un délai.',
  'exception.cue_cascade.escalate.label': 'Escalader pour relecture',
  'exception.cue_cascade.escalate.consequence': 'La carte est archivée pour relecture ultérieure.',
  'exception.backpressure_critical.card.descriptor': 'Un de vos nœuds d’approvisionnement est en refoulement critique et demande votre attention.',
  'exception.backpressure_critical.acknowledge_and_trace.label': 'Prendre acte et remonter le blocage',
  'exception.backpressure_critical.acknowledge_and_trace.consequence':
    'Vous prenez note du refoulement critique ; remontez-le jusqu’à sa source avec l’outil de traçage.',
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
  'building.row.taille_du_labo': 'L’atelier',
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

  // --- `exception_detail.*` (10 clés) ---
  'exception_detail.bloc.back': 'Retour',
  'exception_detail.bloc.escalate': 'Escalader',
  'exception_detail.bloc.issue': 'Problème :',
  'exception_detail.bloc.lui_apprendre': 'Lui apprendre',
  'exception_detail.bloc.resolu': 'Résolu ✓',
  'exception_detail.bloc.risque': 'Risqué',
  'exception_detail.bloc.suggere': 'Suggéré',
  'exception_detail.bloc.appui_long_la_carte_se_ferme': 'appui long — la carte se ferme',
  'exception_detail.bloc.appui_long_la_carte_se_ferme_le_batiment_lui_se_repare_avec_le_temps': 'appui long — la carte se ferme ; le bâtiment, lui, se répare avec le temps',
  'exception_detail.bloc.je_fais_quoi': 'Je fais quoi ?',
  // --- ⑨/⑩ — libellé du résultat, 10 issues, 10 bandes (21 clés, 2026-09-23) --- atelier `11-…` §3.7 et §3.2
  //     (`9a248ea5`). Issues : le domaine est les 10 littéraux que rendent les 10 handlers d'`exceptions/effects/`.
  //     Bandes : clés dérivées de la VALEUR servie (`Libelle.ParValeur`), domaines = `SeverityEnum`, `PriorityBucket`,
  //     `ConfidenceBucket` (`exceptions.projection.service.ts:73-79`).
  'exception_detail.bloc.resultat': 'Résultat :',
  'exception_detail.outcome.resolved': 'NOTÉ',
  'exception_detail.outcome.escalated': 'ARCHIVÉ',
  'exception_detail.outcome.repairing': 'EN RÉPARATION',
  'exception_detail.outcome.repairing_slow': 'RÉPARATION LENTE',
  'exception_detail.outcome.bribe_succeeded': 'ARRANGÉ',
  'exception_detail.outcome.bribe_failed': 'ÇA S’EST RETOURNÉ',
  'exception_detail.outcome.laid_low': 'PROFIL BAS',
  'exception_detail.outcome.taught': 'RÈGLE APPRISE',
  'exception_detail.outcome.deferred': 'REMIS À PLUS TARD',
  'exception_detail.outcome.demolished': 'RASÉ',
  // 2026-09-23 — les libellés de ⑨ sont ceux de la maquette RATIFIÉE par l'user (`ecrans-brennar-4.html`, mesurée par l'atelier :
  // « modérée · urgente » aux lignes 818, 860 et 873 — cadres 14, 17, 18 — et la puce de priorité « urgente » à la ligne 862), au
  // féminin, comme le repli du client (`ExceptionBandes.cs`). Un bref passage à une autre forme, sur la foi d'un arbitrage dont la
  // prémisse (« libellés non ratifiés ») était fausse pour ces deux mots, est revenu ici le même jour (arbitrage de l'orchestrateur).
  'exceptions.gravite.severe': 'grave',
  'exceptions.gravite.moderate': 'modérée',
  'exceptions.priorite.critical': 'critique',
  'exceptions.priorite.urgent': 'urgente',
  'exception_detail.confiance.confident': 'il est sûr',
  // non ratifiée — les 5 bandes ci-dessous : mots de l'atelier (§3.2), jamais dessinés ni ratifiés ; veto user ouvert.
  // `mild` : « légère » — PROPOSÉ, NON RATIFIÉ (un accord au féminin de la famille ratifiée ; la maquette ne la montre pas).
  'exceptions.gravite.mild': 'légère',
  'exceptions.priorite.watching': 'à surveiller',
  'exceptions.priorite.silent': 'sans urgence',
  'exception_detail.confiance.likely': 'il le croit',
  'exception_detail.confiance.tentative': 'il hésite',

  // --- `exceptions.*` (43 clés) ---
  'exceptions.bloc.a_relire_a_tete_reposee': 'à relire à tête reposée',
  'exceptions.bloc.ce_soir_au_verge_d_or': 'Ce soir, au Verge d’Or',
  'exceptions.bloc.rien_a_relire': 'rien à relire',
  'exceptions.bloc.nom_retourne_au_travail': '{nom} retourne au travail',
  'exceptions.bloc.escalades_archivees': 'Escalades archivées',
  'exceptions.bloc.file_indisponible_verifier_la_pile': 'File indisponible — vérifier la pile',
  'exceptions.bloc.il_attend_une_consigne': 'il attend une consigne',
  'exceptions.bloc.ouvrir': 'Ouvrir',
  'exceptions.bloc.patron': 'Patron',
  'exceptions.bloc.toute_la_ville': 'toute la ville',
  'exceptions.bloc.au_batiment_touche': 'au bâtiment touché',
  'exceptions.bloc.chez_enseigne': 'chez {enseigne}',
  'exceptions.bloc.reparer_enseigne': 'Réparer {enseigne}',
  'exceptions.bloc.autre_issue': 'autre issue',
  'exceptions.bloc.autres_issues': 'autres issues',
  'exceptions.bloc.le_comptoir_n_a_pas_repondu': 'Le comptoir n’a pas répondu.',
  'exceptions.bloc.ouvrir_sa_main': 'OUVRIR SA MAIN',
  'exceptions.bloc.suggere_appui_long_sa_main': 'suggéré · appui long — sa main',
  'exceptions.categorie.conflit': 'CONFLIT',
  'exceptions.categorie.diplomatie': 'DIPLOMATIE',
  'exceptions.categorie.renseignement': 'RENSEIGNEMENT',
  'exceptions.categorie.reputation': 'RÉPUTATION',
  'exceptions.locuteur.la_ville': 'La ville',
  'exceptions.locuteur.votre_lieutenant': 'Votre lieutenant',
  'exceptions.nombre.cinq': 'Cinq',
  'exceptions.nombre.deux': 'Deux',
  'exceptions.nombre.plusieurs': 'Plusieurs',
  'exceptions.nombre.quatre': 'Quatre',
  'exceptions.nombre.six': 'Six',
  'exceptions.nombre.trois': 'Trois',
  'exceptions.apres.bribe_failed': 'L’argent est parti, et ça s’est retourné : la chaleur monte',
  'exceptions.apres.bribe_succeeded': 'La descente n’a pas eu lieu : le bâtiment repart, la chaleur baisse',
  'exceptions.apres.deferred': 'Réparation remise : le bâtiment reste à l’arrêt',
  'exceptions.apres.deferred.enseigne': 'Réparation remise : {enseigne} reste à l’arrêt',
  'exceptions.apres.demolished': 'Le bâtiment est rasé ; l’îlot est libre',
  'exceptions.apres.escalated': 'Archivé : à relire à tête reposée',
  'exceptions.apres.laid_low': 'On se fait oublier : la chaleur retombe, le bâtiment reste touché',
  'exceptions.apres.repairing': 'Le bâtiment se remet en marche, avec le temps',
  'exceptions.apres.repairing.enseigne': '{enseigne} se remet en marche, avec le temps',
  'exceptions.apres.repairing_slow': 'Le bâtiment se remet en marche, lentement — c’est moins cher',
  'exceptions.apres.repairing_slow.enseigne': '{enseigne} se remet en marche, lentement — c’est moins cher',
  'exceptions.apres.resolved': 'Noté : rien n’a bougé pour autant.',
  'exceptions.apres.taught': 'C’est une règle, désormais : la prochaine fois, ça se règle sans vous',

  // --- `famille.*` (1 clé) --- les 44 jumelles à slug anglais retirées le 2026-09-23 (zéro demandeur, TD-690)
  'famille.archetype.distribution': 'Distribution',

  // --- `forensic.*` (37 clés) ---
  'forensic.bloc.ce_qu_on_sait_vraiment': 'CE QU’ON SAIT VRAIMENT',
  'forensic.bloc.ce_qui_se_voit': 'Ce qui se voit',
  'forensic.bloc.pas_de_reponse': 'Pas de réponse',
  'forensic.bloc.risque_d_audit': 'RISQUE D’AUDIT',
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
  'forensic.acteur.avocat': 'Avocat',
  'forensic.acteur.greffier': 'Greffier',
  'forensic.acteur.il_a_peur': 'il a peur',
  'forensic.acteur.il_tient': 'il tient',
  'forensic.acteur.injoignable': 'injoignable',
  'forensic.acteur.parti': 'parti',
  'forensic.bloc.acteurs_qui_tiennent': 'acteurs qui tiennent',
  'forensic.bloc.ceux_qui_ne_sont_pas_sur_la_liste': 'ceux qui ne sont pas sur la liste',
  'forensic.bloc.d_autres_parlent_et_vous_ne_les_voyez_pas': 'D’autres parlent, et vous ne les voyez pas',
  'forensic.bloc.la_comptabilite': 'la comptabilité',
  'forensic.bloc.la_comptabilite_les_rejets_et_le_train_de_vie_ne_se_melangent_pas_pour_voir_qui_parle_la_fenetre_des_acteurs_en_haut_a_droite': 'la comptabilité, les rejets et le train de vie {ne se mélangent pas}. Pour voir {qui parle}, la fenêtre des acteurs, en haut à droite.',
  'forensic.bloc.le_dossier': 'Le dossier',
  'forensic.bloc.le_renseignement_s_achete_acteur_par_acteur_eteint_tant_que_le_prix_n_est_pas_servi_on_n_achete_pas_sans_savoir_combien': 'le renseignement s’achète {acteur par acteur} — éteint tant que {le prix n’est pas servi} : on n’achète pas sans savoir combien',
  'forensic.bloc.les_livres_et_le_train_de_vie_personne_ne_regarde_par_la_pour_l_instant': 'Les livres et le train de vie : personne ne regarde par là. Pour l’instant.',
  'forensic.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_tout_va_bien_c_est_on_ne_sait_pas': 'on n’a pas eu de réponse. Ce n’est pas « tout va bien » : c’est « on ne sait pas ».',
  'forensic.bloc.on_peut_etre_propre_sur_deux_et_pris_sur_la_troisieme': 'On peut être propre sur deux et pris sur la troisième',
  'forensic.bloc.pas_encore_sur_la_table': 'pas encore sur la table',
  'forensic.bloc.pourquoi_trois_colonnes': 'pourquoi trois colonnes',
  'forensic.bloc.renseignement': 'Renseignement',
  'forensic.bloc.sur_un_acteur_pas_sur_une_piste_eteint_le_prix_n_est_pas_servi': 'sur un acteur, pas sur une piste — éteint : {le prix n’est pas servi}',
  'forensic.bloc.un_inspecteur_du_port_un_courtier_le_greffier_d_un_juge_ils_se_paient_comme_les_autres_mais_personne_ne_vous_a_encore_donne_leur_nom': 'un inspecteur du port, un courtier, le greffier d’un juge : {ils se paient} comme les autres, mais {personne ne vous a encore donné leur nom}.',

  // --- `horizon.*` (14 clés) ---
  'horizon.bloc.a_portee': 'À PORTÉE',
  'horizon.bloc.aucune_de_ces_cartes_n_a_encore_de_nom': 'Aucune de ces cartes n’a encore de nom',
  'horizon.bloc.c_etait_a_portee_ca_s_est_eloigne': 'C’était à portée. Ça s’est éloigné.',
  'horizon.bloc.ce_qu_on_sait_vraiment': 'CE QU’ON SAIT VRAIMENT',
  'horizon.bloc.deja_prises': 'DÉJÀ PRISES',
  'horizon.bloc.l_horizon': 'L’horizon',
  'horizon.bloc.ont_recule': 'ONT RECULÉ',
  'horizon.bloc.rien_a_l_horizon': 'Rien à l’horizon',
  'horizon.bloc.ce_qui_manque_encore': 'ce qui manque encore',
  'horizon.bloc.pourquoi_c_est_vide': 'pourquoi c’est vide',
  'horizon.bloc.les_cartes_viennent_du_monde_pas_du_menu': 'Les cartes viennent du monde, pas du menu',
  'horizon.bloc.rien_ne_s_ouvre_pour_l_instant': 'Rien ne s’ouvre pour l’instant.',
  'horizon.bloc.l_horizon_se_remplit_en_jouant': 'L’horizon se remplit en jouant.',
  'horizon.bloc.indisponible': 'indisponible',

  // --- `marche.*` (31 clés) --- ㉑ Le marché ; mots RATIFIÉS (scratchpad/MOTS-MARCHE-21.md, recopiés à l’octet) ; FR = littéral client, EN généré. Aucun site back n’émet ces clés : le client les lit seules (servie ≠ émise, `_i18n-emises-vs-servies.py` ne l’exige pas). Les 4 noms de substance sont `en == fr` (NOM_PROPRE, `_en-egal-fr-classement.txt`).
  'marche.colonne.quartier': 'quartier',
  'marche.compteur.lignes_connues': 'lignes connues',
  'marche.compteur.quartiers_noirs': 'quartiers noirs',
  'marche.compteur.sures': 'sûres',
  'marche.confiance.oui_dire': 'ouï-dire',
  'marche.confiance.recoupe': 'recoupé',
  'marche.confiance.sur': 'sûr',
  'marche.etat.chargement': 'On interroge le tableau…',
  'marche.etat.echec': 'Le tableau ne répond pas.',
  'marche.forme.briques': 'briques',
  'marche.forme.cristaux': 'cristaux',
  'marche.forme.plaque': 'plaque',
  'marche.forme.prismes': 'prismes',
  'marche.origine.extrait_de_racine': 'extrait de racine',
  'marche.origine.herbe_des_friches': 'herbe des friches',
  'marche.origine.lys_de_verre': 'lys de verre',
  'marche.origine.resine_de_lull': 'résine de lull',
  'marche.phrase.bande_high': 'plusieurs des nôtres y ont traité, les sources se tiennent. On ne vous dira toujours pas le prix : seulement que la ligne tient.',
  'marche.phrase.bande_low': 'une seule source, jamais recoupée — un bruit de comptoir. On ne vous dira pas le prix : seulement qu’on en parle.',
  'marche.phrase.bande_moderate': 'deux sources concordantes — ni une rumeur, ni une certitude. On ne vous dira pas le prix, ni ce qui s’écoule : seulement à quel point on peut s’y fier.',
  'marche.phrase.bilan_lignes': '{n, plural, =0 {Aucune ligne sur {total} : personne des nôtres n’a encore traité nulle part.} one {Une ligne sur {total}. Le reste, personne des nôtres n’y a jamais traité.} other {# lignes sur {total}. Le reste, personne des nôtres n’y a jamais traité.}}',
  'marche.phrase.case_ash': 'la poudre grise ne se vend pas à un dealer : elle se place, au rendez-vous, chez ceux du Verre.',
  'marche.phrase.case_sans_ligne': 'aucun des nôtres n’a jamais rien écoulé là-bas. Ce n’est pas une ligne à zéro : c’est une ligne jamais ouverte. Elle s’allumera le jour où un de vos dealers y traitera.',
  'marche.sous_titre.tableau_du_verge_d_or': 'tableau du Verge d’Or',
  'marche.substance.ash': 'ash',
  'marche.substance.brindle': 'brindle',
  'marche.substance.crick': 'crick',
  'marche.substance.hush': 'hush',
  'marche.titre.hors_du_tableau': 'HORS DU TABLEAU',
  'marche.titre.le_marche': 'LE MARCHÉ',
  'marche.titre.voyant_eteint': 'voyant éteint',

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
  'reputation.etat.on_demande_des_gages': 'On vient, mais avec des garanties',
  'reputation.etat.on_vient_sans_garantie': 'On vient sans garantie',
  'reputation.etat.pas_encore_jugeable': 'Pas encore jugeable',
  'reputation.etat.posture_inconnue': 'Posture inconnue',
  'reputation.etat.vous_vous_en_ecartez': 'Vous vous en écartez',
  'reputation.etat.vous_vous_y_tenez': 'Vous vous y tenez',

  // ★ La SEULE clé écrite à la main : la ligne d'ambiance de ⑨ s'assemble depuis un COMPTE.
  //   Keyer ses fragments donnerait des phrases intraduisibles (l'ordre des mots change de
  //   langue à langue) ; keyer la phrase entière est impossible puisqu'elle varie. La forme
  //   juste est un pluriel ICU — le même motif que `game.lieutenant.assignment.summary`.
  'exceptions.file.ambiance': '{count, plural, =0 {Personne ne fait la queue} =1 {Un seul attend vos ordres — la file est calme} =2 {Deux attendent vos ordres — la file est calme} =3 {Trois attendent vos ordres — la file est calme} =4 {Quatre attendent vos ordres — la file est calme} =5 {Cinq attendent vos ordres — la file est calme} =6 {Six attendent vos ordres — la file est calme} other {Plusieurs attendent vos ordres — la file est calme}}',
  'exceptions.file.attendent_encore': '{count, plural, =1 {Un seul attend encore} =2 {Deux attendent encore} =3 {Trois attendent encore} =4 {Quatre attendent encore} =5 {Cinq attendent encore} =6 {Six attendent encore} other {Plusieurs attendent encore}}',

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
    'Vous prenez note du schéma hors des heures ; aucune action automatique n’est prise.',
  'exception.ambient_drift.escalate.label': 'Escalader pour relecture',
  'exception.ambient_drift.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.compression_residue.*` (4 clés) ---
  'exception.compression_residue.acknowledge.label': 'Prendre acte du résidu de compression non traité',
  'exception.compression_residue.acknowledge.projected_consequence':
    'Un problème est resté non traité pendant toute une semaine de compression — il reviendra à chaque tableau tant que vous ne l’aurez pas réglé.',
  'exception.compression_residue.escalate.label': 'Escalader pour relecture',
  'exception.compression_residue.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.degraded_category_pressure.*` (3 clés) ---
  'exception.degraded_category_pressure.acknowledge.label': 'Prendre acte de la couverture dégradée',
  'exception.degraded_category_pressure.escalate.label': 'Escalader pour relecture',
  'exception.degraded_category_pressure.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.equipment_failure.*` (8 clés) ---
  'exception.equipment_failure.defer.label': 'Reporter la réparation',
  'exception.equipment_failure.defer.projected_consequence':
    'Laisser le bâtiment à l’arrêt — il redemandera votre attention tant que vous n’agirez pas.',
  'exception.equipment_failure.demolish_replace.label': 'Démolir et reconstruire',
  'exception.equipment_failure.demolish_replace.projected_consequence':
    'Rase le bâtiment ; l’îlot redevient constructible.',
  'exception.equipment_failure.repair_immediate.label': 'Réparer tout de suite',
  'exception.equipment_failure.repair_immediate.projected_consequence':
    'Payer le coût plein pour remettre le bâtiment en service au plus vite.',
  'exception.equipment_failure.repair_slow.label': 'Réparer lentement (moins cher)',
  'exception.equipment_failure.repair_slow.projected_consequence':
    'Coût réduit ; le bâtiment met plus longtemps à revenir en service.',

  // --- `exception.execution_plan_deviation.*` (3 clés) ---
  'exception.execution_plan_deviation.acknowledge.label': 'Prendre acte du plan d’exécution dévié',
  'exception.execution_plan_deviation.escalate.label': 'Escalader pour relecture',
  'exception.execution_plan_deviation.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.flag_exhaustion.*` (4 clés) ---
  'exception.flag_exhaustion.acknowledge.label': 'Prendre acte de l’épuisement',
  'exception.flag_exhaustion.acknowledge.projected_consequence':
    'Vous prenez note que le lieutenant n’a plus de jetons pour ce sujet ; aucune action automatique n’est prise.',
  'exception.flag_exhaustion.escalate.label': 'Escalader pour relecture',
  'exception.flag_exhaustion.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.friction_threshold.*` (4 clés) ---
  'exception.friction_threshold.acknowledge.label': 'Prendre acte de la charge de friction',
  'exception.friction_threshold.acknowledge.projected_consequence':
    'Vous prenez note que l’organisation porte plus de friction qu’elle n’en absorbe ; le rendement reste réduit tant que vous ne démantelez pas un nœud ou que la charge ne baisse pas.',
  'exception.friction_threshold.escalate.label': 'Escalader pour relecture',
  'exception.friction_threshold.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.lieutenant_cook.*` (7 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_cook.card.descriptor': 'La chaleur monte autour du labo. J’ai pas de consigne pour ça.',
  'exception.lieutenant_cook.keep.label': 'Continuer la cuisson',
  'exception.lieutenant_cook.keep.projected_consequence': 'Le lieutenant ignore la chaleur et continue d’opérer.',
  'exception.lieutenant_cook.pause.label': 'Suspendre les opérations quand la chaleur est élevée',
  'exception.lieutenant_cook.pause.projected_consequence': 'Le lieutenant arrête la cuisson tant que la chaleur reste élevée.',
  'exception.lieutenant_cook.pause_hard.label': 'Ne suspendre qu’en chaleur extrême',
  'exception.lieutenant_cook.pause_hard.projected_consequence':
    'Le lieutenant continue de cuisiner en chaleur modérée et ne suspend qu’en chaleur extrême.',

  // --- `exception.lieutenant_distribution.*` (7 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_distribution.card.descriptor': 'La caisse du dealer monte et personne ne la ramasse. Je la laisse comme ça ?',
  'exception.lieutenant_distribution.acknowledge.label': 'Laisser pour l’instant',
  'exception.lieutenant_distribution.acknowledge.projected_consequence': 'Aucune règle n’est ajoutée ; la caisse continue de gonfler.',
  'exception.lieutenant_distribution.collect.label': 'Collecter la caisse automatiquement',
  'exception.lieutenant_distribution.collect.projected_consequence':
    'Le lieutenant fait remonter la caisse du dealer dès qu’elle est élevée.',
  'exception.lieutenant_distribution.collect_high.label': 'Ne collecter qu’au-dessus d’un seuil élevé',
  'exception.lieutenant_distribution.collect_high.projected_consequence':
    'Le lieutenant laisse la caisse gonfler et ne collecte que lorsqu’elle est élevée.',

  // --- `exception.lieutenant_intelligence.*` (5 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_intelligence.card.descriptor': 'Le rival ne fait plus de bruit. Je le surveille quand même, ou j’attends qu’il bouge ?',
  'exception.lieutenant_intelligence.observe_anyway.label': 'Collecter du renseignement même quand le rival est silencieux',
  'exception.lieutenant_intelligence.observe_anyway.projected_consequence':
    'Le lieutenant maintient la surveillance même en régime silencieux et se fait une idée.',
  'exception.lieutenant_intelligence.wait.label': 'Attendre que le rival redevienne actif',
  'exception.lieutenant_intelligence.wait.projected_consequence':
    'Le lieutenant reste en attente jusqu’à ce que le rival passe en régime montant ou écrasant.',

  // --- `exception.lieutenant_logistics.*` (7 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_logistics.card.descriptor': 'La marchandise s’entasse et rien ne part. J’ai pas de consigne pour l’expédier.',
  'exception.lieutenant_logistics.acknowledge.label': 'Laisser pour l’instant',
  'exception.lieutenant_logistics.acknowledge.projected_consequence':
    'Aucune règle n’est ajoutée ; la marchandise continue de s’accumuler.',
  'exception.lieutenant_logistics.dispatch.label': 'Expédier la marchandise automatiquement',
  'exception.lieutenant_logistics.dispatch.projected_consequence':
    'Le lieutenant fait suivre la marchandise dès que la source a du stock.',
  'exception.lieutenant_logistics.dispatch_high.label': 'N’expédier que lorsque le stock est élevé',
  'exception.lieutenant_logistics.dispatch_high.projected_consequence':
    'Le lieutenant laisse la marchandise s’accumuler et n’expédie que lorsque le stock est élevé.',

  // --- `exception.lieutenant_muscle.*` (5 clés) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.lieutenant_muscle.card.descriptor': 'Le rival fait le mort. Tant qu’il bouge pas, j’ai personne à aller voir.',
  'exception.lieutenant_muscle.block_when_silent.label': 'Suspendre les opérations tant que le rival est silencieux',
  'exception.lieutenant_muscle.block_when_silent.projected_consequence':
    'Le lieutenant suspend explicitement quand le rival est en sommeil.',
  'exception.lieutenant_muscle.wait.label': 'Attendre que la pression monte',
  'exception.lieutenant_muscle.wait.projected_consequence':
    'Le lieutenant reste en attente jusqu’à ce que le rival passe en régime montant ou écrasant.',

  // --- `exception.mycelial_stress.*` (4 clés) ---
  'exception.mycelial_stress.acknowledge.label': 'Prendre acte de la tension',
  'exception.mycelial_stress.acknowledge.projected_consequence':
    'Vous prenez note que ce tronçon est sous tension persistante ; aucune action automatique n’est prise.',
  'exception.mycelial_stress.escalate.label': 'Escalader pour relecture',
  'exception.mycelial_stress.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.operator_input.*` (1 clé) ---
  // 2026-09-23 — la réplique de la carte (atelier `24-descripteurs-exceptions.md`, DA 0ce600fc) : PROPOSÉ, NON RATIFIÉ.
  'exception.operator_input.card.descriptor': 'Il me faut votre avis là-dessus. Je vois pas de bonne façon de s’y prendre.',

  // --- `exception.raid.*` (13 clés) ---
  'exception.raid.acknowledge.label': 'Prendre acte',
  'exception.raid.acknowledge.projected_consequence': 'Écarte cette carte ; aucune action n’est prise.',
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
    'Se faire oublier pour faire retomber la chaleur — l’ampleur est incertaine, et le bâtiment reste endommagé.',
  'exception.raid.repair.label': 'Réparer le bâtiment',
  'exception.raid.repair.projected_consequence': 'payer pour le remettre en marche, avec le temps',

  // --- `exception.random_world.*` (4 clés) ---
  'exception.random_world.acknowledge.label': 'Prendre acte du couplage',
  'exception.random_world.acknowledge.projected_consequence':
    'Vous prenez note du lien de cause à effet ; aucune action automatique n’est prise.',
  'exception.random_world.escalate.label': 'Escalader pour relecture',
  'exception.random_world.escalate.projected_consequence': 'La carte est archivée pour relecture ultérieure.',

  // --- `exception.route_collapse.*` (4 clés) ---
  'exception.route_collapse.acknowledge.label': 'Prendre acte de la rupture',
  'exception.route_collapse.acknowledge.projected_consequence':
    'La route X s’est effondrée. L’aval est à l’arrêt. Aucune action automatique n’est prise.',
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
  //     reco »), choix 6A. **Ferme D10-h** : le canon ch11 nommait un lieutenant et une route qui ne
  //     correspondent pas à ce qui est RÉELLEMENT livré (l'archétype livré est COOK, et la route citée
  //     n'existe pas). La première carte est réécrite pour ce qui est RÉELLEMENT livré.
  //     ⚠️ LA CLÉ EST L'ID DU TUTORIEL, pas `<id>.body` : le catalogue ne sert que des ids, et le client
  //     n'avait donc rien à afficher (défaut mesuré dans la note ㉕). En faisant de l'id une clé, la
  //     bulle se remplit sans changer une ligne de projection.
  //     ✅ Égalité d'ENSEMBLES vérifiée contre `tutorial-id-catalogue.ts` : 11 ids, 11 textes, aucun
  //     orphelin d'un côté ni de l'autre — un texte sans id ne s'afficherait jamais, un id sans texte
  //     laisserait une bulle vide.
  //     Traduits le 2026-09-23 (TD-690, atelier `17-…`) ; le FR vouvoie le joueur (canon, `pluralization_and_gender.md:209`).

  // D17 (item j, 2026-09-24) — U+00A0 avant « : ».
  // ★ D37 (atelier 8d9b9e3a, 2026-09-26) — VALEUR CORRIGÉE, {nom} RETIRÉ : l'en-tête de la carte
  //   nomme déjà le lieutenant (le client encadre « Patron — … », ExceptionQueueController.cs:779).
  //   Le précurseur en cause est le Pyralin (pas un « solvant » générique) et la carte n'offre que
  //   Prendre acte / Escalader (jamais de choix commander/attendre). `nom` reste émis dans
  //   `onboarding_preseed_params` (additif, pont client TD-763).
  'tutorial.exception_card.onboarding_preseed':
    'Cuisson du soir bloquée : plus de Pyralin au labo. Il en faut avant de rallumer.',
  'tutorial.city_map_heat_intro': 'La carte montre la chaleur par îlot. Plus c’est chaud, plus la police regarde.',
  'tutorial.daily_review_intro': 'Chaque matin, la Revue liste ce qui a dévié de la routine. Tranchez, ou laissez.',
  'tutorial.cue_stack_intro': 'La pile du jour ordonne vos consignes. Le premier créneau part en premier.',
  'tutorial.possibility_horizon_intro': 'L’horizon montre ce que vos lieutenants peuvent apprendre ensuite.',
  'tutorial.compression_week': 'Semaine de compression : l’organisation est sous tension. Réduisez, ou encaissez.',
  'tutorial.graduation': 'Un lieutenant a fini son apprentissage. Il décide seul, dans le cadre que vous fixez.',
  'tutorial.graduation_eligibility_intro': 'Un lieutenant est prêt à passer. Sa promotion se prépare ici.',
  'tutorial.queue_runs_dry': 'La file est vide. Rien n’attend votre décision : la ville tourne sans vous.', // D10+D17 (item j, 2026-09-24)
  'tutorial.vacancy': 'Un poste est vacant. Sans titulaire, la routine s’arrête là.',
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
  // ★ D37 (atelier 8d9b9e3a, 2026-09-26) — même correctif que `tutorial.exception_card
  //   .onboarding_preseed` juste au-dessus (même événement, vu depuis la carte) : {nom} retiré
  //   (redondant avec l'en-tête client), Pyralin nommé, actions alignées sur Prendre acte / Escalader.
  'onboarding.preseed_exception.card':
    'Cuisson du soir bloquée : plus de Pyralin au labo. Il en faut avant de rallumer.',

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
  'game.legal.lawyer_tier.public_defender': 'Commis d’office',
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
  'appro.bloc.rien_a_faire_de_plus_on_ne_l_accelere_pas_elle_arrivera_quand_le_fournisseur_l_aura_decide': 'Rien à faire de plus. On ne l’accélère pas — elle arrivera quand le fournisseur l’aura décidé.',
  'appro.bloc.tout_le_monde_en_cherche_en_meme_temps_ca_se_paiera_plus_cher_et_plus_tard': 'Tout le monde en cherche en même temps. Ça se paiera plus cher, et plus tard.',
  'appro.bouton.en_commander': 'EN COMMANDER',
  'appro.bouton.ca_part_du_compte_tout_de_suite': 'ça part du compte tout de suite',
  'appro.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'appro.titre.la_chaine_d_appro_est_indisponible': 'La chaîne d’appro est indisponible',
  'appro.titre.la_chaine_d_appro_n_a_pas_repondu': 'La chaîne d’appro n’a pas répondu',
  'appro.etat.rien_a_commander_vous_ne_tenez_pas_encore_de_labo': 'Rien à commander — vous ne tenez pas encore de labo.',
  'appro.etat.vous_ne_tenez_encore_aucun_site': 'Vous ne tenez encore aucun site.',
  'appro.titre.la_commande_est_arrivee': 'La commande est arrivée',
  'appro.sous_titre.le_stock_est_reconstitue_vous_pouvez_commander_a_nouveau': 'Le stock est reconstitué. Vous pouvez commander à nouveau.',
  'appro.bloc.a_quoi_ca_sert': 'À QUOI ÇA SERT',
  'appro.bloc.ce_qu_il_en_reste': 'CE QU’IL EN RESTE',
  'appro.bloc.le_prix': 'LE PRIX',
  'appro.bloc.le_fournisseur': 'LE FOURNISSEUR',
  'appro.bloc.des_maillons_existent_mais_cet_ecran_ne_sait_pas_encore_les_afficher': 'Des maillons existent, mais cet écran ne sait pas encore les afficher.',
  'appro.bloc.la_commande': 'LA COMMANDE',
  'appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas': '{nom} : « L’étagère est vide. Sans Pyralin, je ne rallume pas. »',
  'appro.bloc.rien_a_remonter_pour_l_instant_la_chaine_ne_connait_aucun_maillon_sur_ce_compte': 'Rien à remonter pour l’instant — la chaîne ne connaît aucun maillon sur ce compte.',
  'appro.bloc.votre_lieutenant_on_en_a_besoin_et_il_n_y_en_a_plus': 'Votre lieutenant : « On en a besoin, et il n’y en a plus. »',
  'appro.sous_titre.elle_est_payee_et_partie_il_n_y_a_plus_qu_a_attendre': 'Elle est payée et partie. Il n’y a plus qu’à attendre.',
  'appro.sous_titre.sans_elle_aucun_labo_ne_rallume_le_fournisseur_lui_a_ses_humeurs': 'Sans elle, aucun labo ne rallume. Le fournisseur, lui, a ses humeurs.',
  'appro.titre.commander_de_la_matiere_premiere': 'Commander de la matière première',
  'appro.titre.la_commande_est_en_route': 'La commande est en route',
  'boutique.bloc.jetons': '— Marks',
  'carte.bloc.a_vous': 'À vous',
  'carte.bloc.carte_de_la_ville_districts': 'CARTE DE LA VILLE — Districts',
  'carte.bloc.chaleur_affichee': 'Chaleur : affichée',
  'carte.bloc.chaleur_masquee': 'Chaleur : masquée',
  'carte.bloc.dispute': 'Disputé',
  'carte.bloc.entrer': 'Entrer',
  'carte.bloc.libre': 'Libre',
  'carte.bloc.rival': 'Rival',
  'carte.bloc.rive_nord': 'Rive nord',
  'carte.bloc.rive_sud': 'Rive sud',
  'delegation.bloc.rien_derriere': 'rien derrière',
  'delegation.bloc.si_vous_reprenez_maintenant': 'Si vous reprenez maintenant',
  'demolition.ecran.ce_qu_on_peut_y_mettre': 'CE QU’ON PEUT Y METTRE',
  'demolition.ecran.fiche_du_site': 'FICHE DU SITE',
  'demolition.ecran.il_vous_coute_plus_qu_il_ne_vous_rapporte': 'Il vous coûte plus qu’il ne vous rapporte.',
  'demolition.ecran.le_garder_c_est_payer_pour_gener_les_autres': 'Le garder, c’est payer pour gêner les autres.',
  'distribution.bloc.a_pied_ca_vide_le_stock_du_labo': 'à pied · ça vide le stock du labo',
  'distribution.bloc.aucun_courrier_pour_l_instant': 'Aucun courrier pour l’instant.',
  'distribution.bloc.aucune_destination_connue_pour_l_envoi_de_ce_soir': 'Aucune destination connue pour le prochain envoi.',
  'distribution.bloc.aucune_route_tendue_pour_l_instant': 'Aucune route tendue pour l’instant.',
  'distribution.bloc.destination_a_determiner': 'destination à déterminer',
  'distribution.bloc.il_est_en_chemin_on_ne_le_rappelle_pas_on_saura_a_l_arrivee': 'Il est en chemin. On ne le rappelle pas — on saura à l’arrivée.',
  'distribution.bloc.la_regulation': 'LA RÉGULATION',
  'distribution.bloc.vos_courriers': 'VOS COURRIERS',
  'distribution.bouton.acheter_un_velo': 'ACHETER UN VÉLO',
  'distribution.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'distribution.titre.la_distribution_est_indisponible': 'La distribution est indisponible',
  'distribution.titre.la_distribution_n_a_pas_repondu': 'La distribution n’a pas répondu',
  'distribution.titre.ce_qui_est_sur_la_route': 'Ce qui est sur la route',
  'distribution.sous_titre.un_coursier_est_parti_voila_le_chemin_qu_il_prend': 'Un coursier est parti. Voilà le chemin qu’il prend.',
  'distribution.bloc.d_ou_ca_part': 'D’OÙ ÇA PART',
  'distribution.bloc.ou_ca_va': 'OÙ ÇA VA',
  'distribution.bloc.le_chemin': 'LE CHEMIN',
  'distribution.bloc.a_traverser': 'À TRAVERSER',
  'distribution.bloc.cette_route': 'CETTE ROUTE',
  'distribution.bloc.il_est_parti_a_la_nuit_ca_serpente_mais_c_est_la_seule_qui_evite_le_pont_du_threnny': 'Il est en route. Ça serpente, mais c’est la seule qui évite le pont du Threnny.',
  'distribution.bloc.la_marchandise_est_prete_au_labo_dites_moi_qui_part_et_par_ou_et_je_l_enverrai_ce_soir': 'La marchandise est prête au labo. Dites-moi qui part et par où, et je l’envoie tout de suite.',
  'distribution.bloc.livre_le_carton_est_au_comptoir_personne_n_a_rien_vu': 'Livré. Le carton est au comptoir, personne n’a rien vu.',
  'distribution.bouton.envoyer_ce_soir': 'ENVOYER MAINTENANT',
  'distribution.bouton.tendre_une_autre_ficelle': 'TENDRE UNE AUTRE FICELLE',
  'distribution.sous_titre.la_marchandise_est_arrivee_voila_ce_que_le_trajet_a_coute_a_la_route': 'La marchandise est arrivée. Voilà ce que le trajet a coûté à la route.',
  'distribution.sous_titre.on_choisit_d_ou_ca_part_ou_ca_va_et_par_quel_chemin': 'On choisit d’où ça part, où ça va, et par quel chemin.',
  'distribution.titre.c_est_livre': 'C’est livré',
  'distribution.titre.l_envoi_de_ce_soir': 'Le prochain envoi',
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
  'famille.band.bas': 'Bas',
  'famille.band.epuise': 'Épuisé',
  'famille.band.inconnu': 'Inconnu',
  'famille.band.normal': 'Normal',
  'famille.band.plein': 'Plein',
  'famille.category.audit_comptable': 'Audit comptable',
  'famille.category.categorie_inconnue': 'Catégorie inconnue',
  'famille.category.envoi_de_distribution': 'Envoi de distribution',
  'famille.category.flux_de_blanchiment': 'Flux de blanchiment',
  'famille.category.incident_transversal': 'Incident transversal',
  'famille.category.operations_de_production': 'Opérations de production',
  'famille.category.reponse_securite': 'Réponse sécurité',
  'famille.category.routage_logistique': 'Routage logistique',
  'famille.disruption.s_installe_lentement': 'S’installe lentement',
  'famille.disruption.s_installe_normalement': 'S’installe normalement',
  'famille.disruption.s_installe_tres_lentement': 'S’installe très lentement',
  'famille.disruption.s_installe_vite': 'S’installe vite',
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
  'famille.ecran.garder_l_anciennete_annuler': 'Garder l’ancienneté (annuler)',
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
  'filiere.bloc.ce_n_est_ni_elle_est_vide_ni_elle_ne_repond_pas_c_est_pas_encore': 'ce n’est ni « elle est vide » ni « elle ne répond pas », c’est « pas encore ».',
  'filiere.bloc.ce_qu_on_sait_pour_l_instant': 'CE QU’ON SAIT POUR L’INSTANT',
  'filiere.bloc.ce_que_la_filiere_ne_dit_pas': 'CE QUE LA FILIÈRE NE DIT PAS',
  'filiere.bloc.ce_qu_on_sait_vraiment': 'CE QU’ON SAIT VRAIMENT',
  'filiere.bloc.dire_combien_il_y_a_dans_la_filiere': 'Dire combien il y a dans la filière',
  'filiere.bloc.ecarts': 'ÉCARTS',
  'filiere.bloc.en_attente': 'EN ATTENTE',
  'filiere.bloc.etapes': 'ÉTAPES',
  'filiere.bloc.la_filiere': 'La filière',
  'filiere.bloc.la_filiere_n_a_pas_encore_ete_interrogee': 'La filière n’a pas encore été interrogée',
  'filiere.bloc.la_filiere_ne_repond_pas': 'LA FILIÈRE NE RÉPOND PAS',
  'filiere.bloc.on_ne_vous_dira_que_si_c_est_propre_ni_combien_ni_depuis_quand_ni_a_quel_prix_c_est_voulu': 'on ne vous dira que si c’est propre : ni combien, ni depuis quand, ni à quel prix. C’est voulu.',
  'filiere.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_filiere_est_vide_c_est_on_ne_sait_pas_ou_elle_en_est': 'on n’a pas eu de réponse. Ce n’est pas « la filière est vide » : c’est « on ne sait pas où elle en est ».',
  'filiere.bloc.ce_n_est_pas_une_panne_c_est_un_etat_il_n_y_a_rien_a_montrer_tant_qu_il_n_y_a_rien_de_monte_il_faut_une_planque_pour_que_la_filiere_commence_quelque_part': 'ce n’est pas une panne, c’est un état : il n’y a rien à montrer tant qu’il n’y a rien de monté. Il faut une planque pour que la filière commence quelque part.',
  'filiere.bloc.le_premier_maillon_sans_elle_rien_n_entre_dans_la_filiere_et_rien_ne_se_ramasse_chez_les_dealers_non_plus': 'le premier maillon : sans elle, rien n’entre dans la filière — et rien ne se ramasse chez les dealers non plus.',
  'filiere.bloc.maillon_manquant': 'MAILLON MANQUANT',
  'filiere.bloc.obtenir_une_planque': 'Obtenir une planque',
  'filiere.bloc.pas_de_reponse': 'Pas de réponse',
  'filiere.bloc.propre_au_bout': 'PROPRE AU BOUT',
  'filiere.bloc.vous_n_avez_encore_aucun_nœud': 'Vous n’avez encore aucun nœud',
  'filiere.bloc.ce_que_la_chaine_fait_de_votre_argent': 'CE QUE LA CHAÎNE FAIT DE VOTRE ARGENT',
  'filiere.bloc.de_l_argent_attend_a_cette_etape': 'de l’argent attend à cette étape',
  'filiere.bloc.elle_le_lave_par_paliers_pas_d_un_coup': 'Elle le lave par paliers, pas d’un coup',
  'filiere.bloc.etape': 'ÉTAPE',
  'filiere.bloc.la_chaine_de_la_tete_a_la_sortie': 'LA CHAÎNE, DE LA TÊTE À LA SORTIE',
  'filiere.bloc.la_filiere_n_a_pas_repondu': 'LA FILIÈRE N’A PAS RÉPONDU',
  'filiere.bloc.la_sortie': 'LA SORTIE',
  'filiere.bloc.rien_n_attend_a_cette_etape': 'rien n’attend à cette étape',
  'filiere.bloc.chaque_etape_rend_l_argent_un_peu_plus_propre_que_la_precedente_seule_la_derniere_credite_le_portefeuille_tant_qu_il_n_y_a_pas_de_sortie_il_n_y_a_pas_d_argent_seulement_une_file_d_attente': 'chaque étape rend l’argent un peu plus propre que la précédente. Seule la DERNIÈRE crédite le portefeuille — tant qu’il n’y a pas de sortie, il n’y a pas d’argent, seulement une file d’attente.',
  'horizon.bloc.ce_palier_est_acquis': 'ce palier est acquis',
  'horizon.bloc.etat_inconnu': 'état inconnu',
  'horizon.bloc.l_echelle_des_paliers': 'L’ÉCHELLE DES PALIERS',
  'horizon.bloc.on_ne_sait_pas_encore_ce_qui_manque_pour_y_arriver': 'on ne sait pas encore ce qui manque pour y arriver',
  'horizon.bloc.palier': 'Palier',
  'horizon.bloc.vous_avez_commence': 'vous avez commencé',
  'horizon.bloc.vous_n_avez_encore_rien_engage': 'vous n’avez encore rien engagé',
  'journal.bloc.a_la_une': 'À LA UNE',
  'journal.bloc.aucune_de_ces_breves_n_a_de_texte': 'Aucune de ces brèves n’a de texte',
  'journal.bloc.ca_commence': 'ÇA COMMENCE',
  'journal.bloc.ca_ne_partira_pas': 'ÇA NE PARTIRA PAS',
  'journal.bloc.ca_retombe': 'ÇA RETOMBE',
  'journal.bloc.ca_se_deploie': 'ÇA SE DÉPLOIE',
  'journal.bloc.ca_traine': 'ÇA TRAÎNE',
  'journal.bloc.ce_qu_on_sait_pour_l_instant': 'CE QU’ON SAIT POUR L’INSTANT',
  'journal.bloc.ce_qu_on_sait_vraiment': 'CE QU’ON SAIT VRAIMENT',
  'journal.bloc.ce_qui_se_dit_ce_matin': 'CE QUI SE DIT CE MATIN',
  'journal.bloc.ces_trois_listes_se_remplissent_avec_ce_que_la_ville_fait_aucune_ne_depend_de_vos_gestes': 'ces trois listes se remplissent avec ce que la ville fait. Aucune ne dépend de vos gestes.',
  'journal.bloc.dans_la_rue': 'DANS LA RUE',
  'journal.bloc.en_attente_du_matin': 'EN ATTENTE DU MATIN',
  'journal.bloc.en_cours': 'EN COURS',
  'journal.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_ville_est_calme_c_est_on_ne_sait_pas_ce_qu_elle_a_fait_cette_nuit': 'on n’a pas eu de réponse. Ce n’est pas « la ville est calme » : c’est « on ne sait pas ce qu’elle a fait ».',
  'journal.bloc.le_journal': 'Le journal',
  'journal.bloc.le_journal_n_a_pas_encore_ete_ouvert': 'Le journal n’a pas encore été ouvert',
  'journal.bloc.le_journal_n_est_pas_arrive': 'LE JOURNAL N’EST PAS ARRIVÉ',
  'journal.bloc.le_journal_suit_le_monde_pas_vous': 'Le journal suit le monde, pas vous',
  'journal.bloc.les_breves_sont_arrivees_sans_leur_texte_le_journal_de_ce_matin_n_a_que_des_titres_a_trous_voila_ce_qu_on_peut_vous_montrer_aujourd_hui': 'les brèves sont arrivées sans leur texte : le journal de ce matin n’a que des titres à trous. Voilà ce qu’on peut vous montrer aujourd’hui.',
  'journal.bloc.les_trois_listes_n_ont_pas_ete_demandees_ce_n_est_ni_rien_ne_bouge_ni_pas_de_reponse_c_est_pas_encore': 'les trois listes n’ont pas été demandées — ce n’est ni « rien ne bouge » ni « pas de réponse », c’est « pas encore ».',
  'journal.bloc.pas_de_reponse': 'Pas de réponse',
  'journal.bloc.phase_inconnue': 'PHASE INCONNUE',
  'journal.bloc.pourquoi_c_est_vide': 'POURQUOI C’EST VIDE',
  'journal.bloc.rien_ne_bouge': 'RIEN NE BOUGE',
  'journal.bloc.rien_ce_matin_la_ville_a_passe_une_nuit_tranquille': 'Rien ce matin.\nLa ville a passé une nuit tranquille.',
  'loi.bloc.affaires_en_cours': 'AFFAIRES EN COURS',
  'loi.bloc.aucune_affaire_en_cours': 'Aucune affaire en cours.',
  'loi.bloc.la_filiere_fait_classer_une_affaire_sans_proces_mais_elle_se_sert_de_gens_qui_un_jour_peuvent_parler_a_leur_tour': 'La filière fait classer une affaire sans procès — mais elle se sert de gens qui, un jour, peuvent parler à leur tour.',
  'loi.bloc.qui_peut_vous_defendre': 'QUI PEUT VOUS DÉFENDRE',
  'loi.bloc.une_affaire_nait_d_une_descente_rien_ici_n_en_cree': 'Une affaire naît d’une descente — rien ici n’en crée.',
  'loi.bloc.vos_avocats': 'VOS AVOCATS',
  'loi.bloc.vous_n_avez_encore_engage_personne': 'Vous n’avez encore engagé personne.',
  'loi.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'loi.sous_titre.vos_avocats_et_ce_qu_ils_peuvent_faire_pour_vous': 'Vos avocats, et ce qu’ils peuvent faire pour vous.',
  'loi.titre.le_parloir': 'Le parloir',
  'loi.titre.le_parloir_est_indisponible': 'Le parloir est indisponible',
  'loi.titre.le_parloir_n_a_pas_repondu': 'Le parloir n’a pas répondu',
  'loi.bouton.mettre_sous_retention': 'METTRE SOUS RÉTENTION',
  'loi.bouton.lui_trouver_un_avocat': 'LUI TROUVER UN AVOCAT',
  'loi.bloc.le_commis_d_office_fait_ce_qu_il_peut': 'le commis d’office fait ce qu’il peut',
  'loi.bloc.commis_d_office': 'Commis d’office',
  'loi.badge.en_place': 'EN PLACE',
  'loi.bloc.gratuit_il_fait_ce_qu_il_peut': 'gratuit — il fait ce qu’il peut',
  'loi.bloc.un_cabinet': 'Un cabinet',
  'loi.badge.disponible': 'DISPONIBLE',
  'loi.bloc.ca_coute_il_connait_les_juges': 'ça coûte — il connaît les juges',
  'loi.bloc.la_filiere': 'La filière',
  'loi.badge.a_vos_risques': 'À VOS RISQUES',
  'loi.bloc.ca_coute_cher_et_ca_peut_se_retourner': 'ça coûte cher — et ça peut se retourner',
  'pipeline.etat.clean': 'Propre',
  'pipeline.etat.dirty': 'Sale',
  'pipeline.etat.mostly_clean': 'Presque propre',
  'profil.bloc.aucun_profil': 'Aucun profil.',
  'profil.bloc.le_profil_n_a_pas_repondu': 'Le profil n’a pas répondu.',
  'reglages.bloc.aucun_reglage': 'Aucun réglage.',
  'reglages.bloc.les_reglages_n_ont_pas_repondu': 'Les réglages n’ont pas répondu.',
  'semaine.bloc.un_autre_probleme_vient_d_apparaitre': 'un autre problème vient d’apparaître',

  // ═══ §F-3 (5), 2026-09-04 — les phrases d'écran de ⑧ passées par une clé à leur tour.
  'famille.ecran.attache': 'Attaché ✓',
  'famille.ecran.aucun_budget_d_autonomie_pour_l_instant': 'Aucun budget d’autonomie pour l’instant',
  'famille.ecran.aucun_lieutenant_recrute': 'Aucun lieutenant recruté',
  'famille.ecran.aucun_script_pour_l_instant': '(aucun script pour l’instant)',
  'famille.ecran.aucune_equipe_rattachee': 'Aucune équipe rattachée',
  'famille.ecran.aucune_regle_touchez_ajouter_une_regle': '(aucune règle — touchez « + Ajouter une règle »)',
  'famille.ecran.batiment_affecte': 'Bâtiment affecté',
  'famille.ecran.batiment_cible_destination_planque': 'Bâtiment cible (destination / planque)',
  'famille.ecran.choisissez_un_batiment_de_destination': 'Choisissez un bâtiment de destination.',
  'famille.ecran.connectez_vous_d_abord': 'Connectez-vous d’abord.',
  'famille.ecran.decision_appliquee': 'Décision appliquée ✓',
  'famille.ecran.echec_de_l_etat': 'Échec de l’état —',
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
  'famille.ecran.reaffecter_deplacer_ce_lieutenant_remet_l_anciennete_a_zero': 'RÉAFFECTER — déplacer ce lieutenant (remet l’ancienneté à zéro)',
  'famille.ecran.recruter_choisir_un_role_et_affecter': 'RECRUTER — choisir un rôle et affecter',
  'famille.ecran.recruter_un_nouveau_lieutenant': 'Recruter un nouveau lieutenant',
  'famille.ecran.recrutez_d_abord_un_lieutenant': 'Recrutez d’abord un lieutenant.',
  'famille.ecran.recrutez_ou_ouvrez_d_abord_un_lieutenant': 'Recrutez ou ouvrez d’abord un lieutenant.',
  'famille.ecran.script_de_conduite': 'Script de conduite',
  'famille.ecran.script_valide': 'Script valide ✓',
  'famille.ecran.verrouille_se_debloque_avec_la_progression': '🔒 Verrouillé — se débloque avec la progression',
  // ⑥ — les 3 gestes d'autonomie aux mots de ㉔ (atelier `13-…` §5, 2026-09-23 ; client `bfe15061`). Les 3 anciens restent servis : `ecrans/2026-09-23` et `main` du client les demandent encore.
  'famille.ecran.lui_rendre_sa_marge': 'Lui rendre sa marge',
  'famille.ecran.lui_elargir_sa_marge': 'Lui élargir sa marge',
  'famille.ecran.laisser_passer_celle_ci': 'Laisser passer celle-ci',
  // famille — 2 clés que le client demande et qu'aucun back n'avait servies (mesure orchestrateur, liste client `c06b0600`).
  //     Recopiées de l'atelier `27-deux-cles-famille.md` (da `8c7a75a4`, l.9-10) — PROPOSÉ, NON RATIFIÉ.
  'famille.ecran.nom': 'Nom',
  'famille.mode.mode_inconnu': 'Mode inconnu',

  // ═══ 2026-09-04 — les 73 clés produites par les conversions des sessions B et C (87 depuis ⑯ et le paquet `19-…`, 2026-09-23 ;
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
  'accueil.vitals.cohesion_indisponible_pour_l_ensemble_de_la_ville': 'Cohésion : indisponible pour l’ensemble de la ville',
  'autonomie.etat.un_compromis': 'un compromis',
  'autonomie.etat.on_laisse_passer_quelque_chose': 'on laisse passer quelque chose',
  'autonomie.etat.on_s_expose': 'on s’expose',
  'autonomie.etat.inconnu': 'Inconnu',
  'blanchiment.purete.a_demi_propre': 'À demi propre',
  'blanchiment.purete.presque_propre': 'Presque propre',
  'blanchiment.purete.propre': 'Propre',
  'blanchiment.purete.proprete_inconnue': 'Propreté inconnue',
  'blanchiment.purete.sale': 'Sale',
  'carnet.bloc.aucun_ordre_pose_entre_quatre_et_huit_dans_l_ordre_ou_ils_partiront': 'aucun ordre posé — entre quatre et huit, dans l’ordre où ils partiront',
  'carnet.bloc.carnet_du_soir': 'Carnet du soir',
  'carnet.bloc.ce_n_est_ni_aucun_ordre_ni_pas_de_reponse_c_est_pas_encore': 'ce n’est ni « aucun ordre » ni « pas de réponse », c’est « pas encore ».',
  'carnet.bloc.ce_que_cet_ecran_ne_peut_pas_vous_dire': 'CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE',
  'carnet.bloc.ce_qu_on_sait_pour_l_instant': 'CE QU’ON SAIT POUR L’INSTANT',
  'carnet.bloc.ce_que_la_ville_prepare': 'Ce que la ville prépare',
  'carnet.bloc.ce_qu_on_sait_vraiment': 'CE QU’ON SAIT VRAIMENT',
  'carnet.bloc.ce_qui_s_ouvrira_plus_tard': 'CE QUI S’OUVRIRA PLUS TARD',
  'carnet.bloc.entre_quatre_et_huit_gestes_dans_l_ordre_ou_ils_partiront': 'entre quatre et huit gestes, dans l’ordre où ils partiront',
  'carnet.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_soiree_est_vide_c_est_on_ne_sait_pas_ce_qui_est_prevu': 'on n’a pas eu de réponse. Ce n’est pas « la soirée est vide » : c’est « on ne sait pas ce qui est prévu ».',
  'carnet.bloc.ce_que_la_ville_prepare_personne_ne_vous_le_rapporte_encore_ce_sera_ici_le_jour_ou_quelqu_un_le_fera': 'ce que la ville prépare, personne ne vous le rapporte encore. Ce sera ici le jour où quelqu’un le fera.',
  'carnet.bloc.le_carnet_n_a_pas_encore_ete_ouvert': 'le carnet n’a pas encore été ouvert',
  'carnet.bloc.le_carnet_ne_repond_pas': 'le carnet ne répond pas',
  'carnet.bloc.les_ordres_de_ce_soir': 'Les ordres à lancer',
  'carnet.bloc.ordres_sur_8': ' ORDRES SUR 8',
  'carnet.bloc.pas_de_reponse': 'Pas de réponse',
  'carnet.bloc.rejouer_une_soiree_verrouille': 'Rejouer une soirée — verrouillé',
  'carnet.bloc.rien': '— rien —',
  'carnet.bloc.rien_n_a_encore_ete_demande': 'Rien n’a encore été demandé',
  'carnet.bloc.une_suite_d_ordres_qu_on_met_de_cote_et_qu_on_relance_d_un_geste_cette_facon_de_faire_s_ouvre_plus_tard_il_faut_d_abord_monter_d_un_palier': 'une suite d’ordres qu’on met de côté et qu’on relance d’un geste. Cette façon de faire s’ouvre plus tard — il faut d’abord monter d’un palier.',
  'carnet.bloc.ce_que_la_ville_ne_dit_pas': 'CE QUE LA VILLE NE DIT PAS',
  'carnet.bloc.le_carnet_n_a_pas_repondu': 'le carnet n’a pas répondu',
  'conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras': 'Aucun de vos lieutenants n’est du genre Gros bras.',
  'conflit.bloc.c_est_lui_qui_part_la_nuit_il_vous_en_manque_un_ce_n_est_pas_casse_vous_n_en_avez_tout_simplement_pas_encore': 'C’est le gros bras qui part la nuit. Il vous en manque un — ce n’est pas cassé, vous n’en avez tout simplement pas encore.',
  'conflit.bloc.dessinees_pas_renseignees_personne_ne_vous_dit_ce_qu_elles_preparent_ni_ce_qu_elles_possedent_on_frappe_a_l_aveugle': 'Dessinées, pas renseignées : personne ne vous dit ce qu’elles préparent ni ce qu’elles possèdent — on frappe à l’aveugle.',
  'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain': '« Dites-moi seulement chez qui. J’y vais, on saura demain. »',
  'conflit.bloc.le_compte_des_envois_precedents_est_indisponible_pour_l_instant': 'Le compte des envois précédents est indisponible pour l’instant.',
  'conflit.bloc.les_quatre_familles': 'Les quatre familles de Brennar',
  'conflit.bloc.qui_part_ce_soir': 'QUI Y VA',
  'conflit.bloc.vous_avez_l_homme_personne_pour_lui_dire_ou_frapper_on_ne_sait_pas_encore_ou_ils_sont': 'Le gros bras est là. Personne pour lui dire où frapper — on ne sait pas encore où les trouver.',
  'conflit.bloc.le_compte_des_envois_precedents_n_a_pas_repondu': 'Le compte des envois précédents n’a pas répondu.',
  'conflit.sous_titre.ce_que_vos_hommes_rapportent_des_familles_rivales_et_qui_vous_reste_pour_y_retourner': 'Ce que vos envois rapportent des familles rivales, et qui vous reste pour y retourner.',
  'conflit.sous_titre.reessayez_dans_un_instant': 'Réessayez dans un instant.',
  'conflit.titre.le_conflit': 'Le conflit',
  'conflit.titre.le_conflit_est_indisponible': 'Le conflit est indisponible',
  'conflit.titre.le_conflit_n_a_pas_repondu': 'Le conflit n’a pas répondu',
  'district.type_batiment.atelier_de_presse': 'Imprimerie',
  'district.type_batiment.bureau': 'Agence',
  'district.type_batiment.cache': 'Réserve',
  'district.type_batiment.banque': 'Banque',
  'district.type_batiment.commerce_ecran': 'Commerce-écran',
  'district.type_batiment.laboratoire': 'Labo',
  'district.type_batiment.laboratoire_specialise': 'Labo spécialisé',
  'district.type_batiment.planque': 'Planque',
  'district.type_batiment.point_de_vente': 'Coin de vente',
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
  'revue.bloc.personne_au_comptoir_ce_matin': 'Personne au comptoir ce matin.',
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
  'revue.phrase.j_ai_rapproche_les_comptes_de_la_facade': 'J’ai rapproché les comptes du commerce-écran',
  'revue.phrase.j_ai_replanifie_la_tournee_des_coursiers': 'J’ai replanifié la tournée des coursiers',
  'revue.phrase.l_horaire_habituel_n_a_pas_ete_tenu': '— l’horaire habituel n’a pas été tenu.',
  'revue.phrase.la_caisse_declaree_s_ecarte_de_l_habitude': '— la caisse déclarée s’écarte de l’habitude.',
  'revue.phrase.le_lek_tournait_hors_du_rythme_convenu': '— le Lek tournait hors du rythme convenu.',
  'revue.phrase.il_passe_plus_d_argent_par_la_caisse_que_la_facade_ne_peut_en_justifier': '— il passe plus d’argent par la caisse que le commerce-écran ne peut en justifier.',
  'revue.phrase.j_ai_rapproche_les_comptes_de_sujet': 'J’ai rapproché les comptes de {sujet}',
  'revue.phrase.j_ai_reachemine_la_tournee_sujet': 'J’ai réacheminé la tournée {sujet}',
  'revue.phrase.j_ai_replanifie_la_tournee_sujet': 'J’ai replanifié la tournée {sujet}',
  'revue.phrase.l_ancien_trajet_ne_passait_plus_sature_ou_coupe': '— l’ancien trajet ne passait plus : saturé, ou coupé.',
  'revue.phrase.la_facade_est_epinglee_pour_un_controle': '— le commerce-écran est épinglé pour un contrôle.',
  'revue.phrase.le_trajet_fait_plus_de_detours_que_d_habitude': '— le trajet fait plus de détours que d’habitude.',
  // non ratifiée — les 6 phrases ci-dessous (precursor_order, stash_reorder, repli) sont des propositions de
  //     l'atelier (`08-…` §1, `b95dd8c7`) : la ratification du 25/08 ne portait que sur les trois phrases dessinées.
  'revue.phrase.il_etait_plus_charge_ou_plus_regarde_que_d_habitude': '— il était plus chargé, ou plus regardé, que d’habitude.',
  'revue.phrase.j_ai_allege_le_stock': 'J’ai allégé le stock',
  'revue.phrase.j_ai_passe_la_commande_de_precurseurs': 'J’ai passé la commande de précurseurs',
  'revue.phrase.j_ai_suivi_la_routine': 'J’ai suivi la routine',
  'revue.phrase.le_marche_est_plus_tendu_que_d_habitude': '— le marché est plus tendu que d’habitude.',
  'revue.phrase.quelque_chose_s_ecartait_de_l_habitude': '— quelque chose s’écartait de l’habitude.',

  // ═══ ① intérieur de district · fiche · bandeau · médaillon — 22 clés (2026-09-23) ═══
  //     Lues par ① et le chrome (mesure CLIENT-2 contre la tête back 62dcbb35) et non servies : la garde « zéro repli »
  //     rougissait à la capture suivante. Valeurs RECOPIÉES du fichier de l'atelier, jamais réécrites :
  //     `Tools/atelier-2026-09-22/22-interieur-district-fiche-inventaire.md` (da `0f45d7a4`) §7.1 A (l.227-239), B (l.252-253),
  //     C (l.287-293). `heat.bucket.*` est lu aussi par le MÉDAILLON, sur tous les écrans.
  //     PROPOSÉ, NON RATIFIÉ : les mots de l'atelier hors canon (bandes de récolte, de revenu, de chaleur ; le bandeau
  //     — sauf les états C et D, mot pour mot du canon, district rendu générique) ; l'en de `chrome.medaillon.descente`
  //     (« Raid », le mot déjà servi par `building.row.risque_de_descente`). Canon : les 3 titres de case, « Descente ».
  //     Paramètres : `{type}` = la valeur servie de `building.type.*` ; `{district}` `{block}` `{rang}` = ceux de
  //     `name_i18n` ; `{nom}` = le nom servi du lieutenant (sans genre : « attend », « a » ne s'accordent pas).
  'district.fiche.a_collecter': 'À COLLECTER',
  'district.fiche.revenus': 'REVENUS',
  'district.fiche.chaleur_locale': 'CHALEUR LOCALE',
  'district.harvest.nothing': 'Rien',
  'district.harvest.available': 'Prêt',
  'district.harvest.full': 'Plein',
  'district.revenue.idle': 'Au repos',
  'district.revenue.earning': 'Rapporte',
  'heat.bucket.cold': 'Froid',
  'heat.bucket.warm': 'Tiède',
  'heat.bucket.hot': 'Chaud',
  'heat.bucket.burning': 'Brûlant',
  'district.fiche.type_lieu': '{type} · {district}, îlot {block}',
  'district.fiche.type_lieu.rang': '{type} · {district}, îlot {block}, n° {rang}',
  'district.fiche.blanchiment_indisponible_raison': 'Blanchiment refusé. {raison}',
  'district.fiche.blanchiment_indisponible_session_absente': 'Blanchiment impossible : la connexion au jeu est perdue.',
  'district.fiche.blanchiment_indisponible_aucune_planque': 'Blanchiment impossible : vous n’avez aucune planque.',
  'district.fiche.petit_lot_confie_a_la_filiere': 'Un petit lot est confié à la filière.',
  'district.fiche.recherche_de_la_planque': 'On cherche la planque…',
  'district.fiche.reponse_absente': 'Aucune réponse n’est arrivée.',
  'blanchiment.raison.reponse_vide': 'La réponse est arrivée vide.',
  'blanchiment.raison.reponse_illisible': 'La réponse est illisible.',
  'blanchiment.raison.connexion_expiree': 'La connexion a expiré.',
  'blanchiment.raison.fonds_ou_place': 'Il manque de l’argent ou de la place.',
  'blanchiment.raison.lot_refuse': 'Ce lot n’est pas accepté.',
  'blanchiment.raison.indisponible': 'La filière ne répond pas pour l’instant.',
  'district.fiche.blanchiment_choisissez_un_commerce_de_facade': 'Pour blanchir, choisissez d’abord un commerce de façade.',
  'chrome.bandeau.brigade_quadrille': 'La brigade quadrille le quartier — planquez la caisse',
  'chrome.bandeau.les_indics_parlent': 'Les indics parlent : la brigade s’agite',
  'chrome.bandeau.attend_vos_ordres': '{nom} attend vos ordres',
  'chrome.bandeau.la_ville_attend_vos_ordres': 'La ville attend vos ordres',
  'chrome.bandeau.rapport': '{nom} a un rapport pour vous',
  'chrome.bandeau.trancher': 'trancher',
  'chrome.bandeau.lire': 'lire',
  'chrome.medaillon.descente': 'Descente',
  // commun — 4 mots de REPLI partagés par les écrans (bande ou sorte hors domaine, bâtiment sans nom), 2026-09-23.
  //     Recopiés de l'atelier `28-mots-inconnus.md` (da `26c8e265`, l.26-29) — PROPOSÉ, NON RATIFIÉ.
  'commun.repli.etat_inconnu': 'état inconnu',
  'commun.repli.type_inconnu': 'type inconnu',
  'commun.repli.le_batiment': 'le bâtiment',
  'commun.repli.un_batiment': 'Un bâtiment',
  // valeurs SERVIES sans mot — 17 clés (2026-09-23) : 7 `building.*` que `Bande(famille, valeur)` du client dérive tout de
  //     suite, 6 `distribution.bloc.*` et 4 `appro.bloc.*` pour quand leurs littéraux passeront par `Libelle`. Recopiées de
  //     l'atelier `29-valeurs-servies-sans-mot.md` (da `7746e0bb`, l.20-26, 34-39, 47-50) — PROPOSÉ, NON RATIFIÉ.
  'building.structural.failed': 'Hors service',
  'building.lab_tier.none': 'Pas de labo',
  'building.hub_tier.none': 'Pas de relais',
  'building.roster.none': 'Pas d’équipe',
  'building.money_holding_tier.none': 'Pas de banque',
  'building.capacity.none': 'Pas de banque',
  'building.yield.none': 'Pas de banque',
  'distribution.bloc.pas_encore_tendue': 'pas encore tendue',
  'distribution.bloc.saturee': 'saturée',
  'distribution.bloc.coupee': 'coupée',
  'distribution.bloc.tient': 'tient',
  'distribution.bloc.l_imprimerie': 'l’imprimerie',
  'distribution.bloc.l_agence': 'l’agence',
  'appro.bloc.il_en_reste_peu': 'il en reste peu',
  'appro.bloc.il_en_reste': 'il en reste',
  'appro.bloc.il_y_en_a_assez': 'il y en a assez',
  'appro.bloc.il_n_y_a_plus_rien': 'il n’y a plus rien',
  // atelier 30 v2 — 106 littéraux nommés (2026-09-23), sites du client (`30-litteraux-nommes-v2-2026-09-23.tsv`, da `c39b4136`,
  //     110 sites, `verifier-30.py` à 0 ; 4 clés déjà servies à l'identique, non répétées). Décisions f2 D12-D16 au registre des
  //     arbitrages : un mot par type, formes épicènes, la maquette ratifiée l'emporte, « plusieurs ponts », « Plein jour » ;
  //     domaine `police.bloc` (et non plus `commissariat.bloc`). Mots hors maquette ratifiée : PROPOSÉ, NON RATIFIÉ.
  'appro.bloc.le_prix_monte': 'le prix monte',
  'appro.bloc.le_prix_ne_bouge_pas': 'le prix ne bouge pas',
  'appro.bloc.le_prix_baisse': 'le prix baisse',
  'conflit.bloc.la_coil': 'La Coil',
  'conflit.bloc.tarcum': 'Tarcum',
  'conflit.bloc.gorge_de_fer': 'Gorge-de-Fer',
  'conflit.bloc.saltline': 'Saltline',
  // ㉙ item k, addendum écussons v2 (atelier `d83582fd`, 2026-09-24) : initiale du MOT FORT de
  // chaque famille (article retiré) — PAS un `charAt(0)` du nom servi ('La Coil'.charAt(0) === 'L',
  // pas 'C'). ParValeur sur le `rival_key` (db/schema/conflict_rival.ts:66, migration 0081:57) —
  // les 4 suffixes sont exactement les membres de l'enum, lus dans la source.
  'conflit.initiale.coil': 'C',
  'conflit.initiale.tarcum': 'T',
  'conflit.initiale.iron_throat': 'G',
  'conflit.initiale.saltline': 'S',
  'conflit.bloc.les_ferrailleurs_de_spine': 'la ferraille, à Spine',
  'conflit.bloc.le_port_et_ce_qui_y_entre': 'le port, et ce qui y entre',
  'conflit.bloc.les_docks_du_nord': 'les docks du nord',
  'conflit.bloc.la_ligne_de_sel_a_l_est': 'la ligne de sel, à l’est',
  'demolition.ecran.un_commerce_ecran': 'Un commerce-écran',
  'demolition.ecran.une_planque': 'Une planque',
  'demolition.ecran.une_reserve': 'Une réserve',
  'demolition.ecran.un_labo': 'Un labo',
  'demolition.ecran.une_serre': 'Une serre',
  'demolition.ecran.une_raffinerie': 'Une raffinerie',
  'demolition.ecran.une_imprimerie': 'Une imprimerie',
  'demolition.ecran.un_relais': 'Un relais',
  'demolition.ecran.une_agence': 'Une agence',
  'demolition.ecran.un_coin_de_vente': 'Un coin de vente',
  'demolition.ecran.une_banque': 'Une banque',
  'demolition.ecran.un_labo_specialise': 'Un labo spécialisé',
  'distribution.bloc.le_relais': 'le relais',
  'distribution.bloc.le_labo': 'le labo',
  'distribution.bloc.le_labo_specialise': 'le labo spécialisé',
  'distribution.bloc.la_raffinerie': 'la raffinerie',
  'distribution.bloc.la_banque': 'la banque',
  'distribution.bloc.la_reserve': 'la réserve',
  'distribution.bloc.le_commerce_ecran': 'le commerce-écran',
  'distribution.bloc.le_coin_de_vente': 'le coin de vente',
  'distribution.bloc.la_planque': 'la planque',
  'distribution.bloc.la_serre': 'la serre',
  'distribution.bloc.droit_le_plus_court': 'droit — le plus court',
  'distribution.bloc.ca_serpente_plus_long_plus_discret': 'ça serpente — plus long, plus discret',
  'distribution.bloc.tordu_beaucoup_de_detours': 'tordu — beaucoup de détours',
  'distribution.bloc.aucune_riviere': 'aucune rivière',
  'distribution.bloc.un_pont': 'un pont',
  'distribution.bloc.plusieurs_ponts': 'plusieurs ponts',
  'distribution.bloc.a_destination': 'à destination',
  'distribution.bloc.disponible': 'disponible',
  'distribution.bloc.en_chemin': 'en chemin',
  'distribution.bloc.a_pied': 'à pied',
  'distribution.bloc.a_velo': 'à vélo',
  'distribution.bloc.en_voiture': 'en voiture',
  'distribution.bloc.en_camion_refrigere': 'en camion réfrigéré',
  'famille.anciennete.depuis_peu': 'Depuis peu',
  'famille.anciennete.depuis_un_moment': 'Depuis un moment',
  'famille.anciennete.du_metier': 'Du métier',
  'famille.anciennete.de_la_vieille_garde': 'De la vieille garde',
  'famille.anciennete.fait_partie_des_murs': 'Fait partie des murs',
  'famille.regle.comme_d_habitude': 'Comme d’habitude',
  'famille.regle.suspendre': 'Suspendre',
  'famille.regle.dans_mon_batiment': 'dans mon bâtiment',
  'famille.regle.faire_comme_d_habitude': 'faire comme d’habitude',
  'famille.regle.suspendre_les_operations': 'suspendre les opérations',
  'loi.bloc.cabinet': 'cabinet',
  'loi.bloc.filiere': 'filière',
  'vente.bloc.vide': 'VIDE',
  'vente.bloc.peu': 'PEU',
  'vente.bloc.moyenne': 'MOYENNE',
  'vente.bloc.pleine': 'PLEINE',
  'vente.bloc.deborde': 'DÉBORDE',
  'vente.bloc.au_tarif': 'AU TARIF',
  'vente.bloc.au_dessus': 'AU-DESSUS',
  'vente.bloc.cher': 'CHER',
  'vente.bloc.tres_cher': 'TRÈS CHER',
  'vente.bloc.au_travail': 'au travail',
  'vente.bloc.au_repos': 'au repos',
  'vente.bloc.pas_la': 'pas là',
  'vente.bloc.grille': 'grillé',
  'police.bloc.en_chasse': 'EN CHASSE',
  'police.bloc.soupcon': 'SOUPÇON',
  'police.bloc.en_veille': 'EN VEILLE',
  'police.bloc.en_sommeil': 'EN SOMMEIL',
  'police.bloc.partout': 'Partout',
  'police.bloc.presente': 'Présente',
  'police.bloc.clairsemee': 'Clairsemée',
  'police.bloc.rien_dans_les_rues': 'Rien dans les rues',
  'carte.bloc.nord': 'nord',
  'carte.bloc.sud': 'sud',
  'carte.tissu.le_port': 'le port',
  'carte.tissu.l_avenue': 'l’avenue',
  'carte.tissu.le_damier': 'le damier',
  'carte.tissu.les_cheminees': 'les cheminées',
  'carte.tissu.les_tours': 'les tours',
  'carte.tissu.les_faubourgs': 'les faubourgs',
  'carte.tissu.port': 'Port',
  'carte.tissu.avenue': 'Avenue',
  'carte.tissu.damier': 'Damier',
  'carte.tissu.cheminees': 'Cheminées',
  'carte.tissu.tours': 'Tours',
  'carte.tissu.faubourgs': 'Faubourgs',
  'revue.reserve.elevee': 'ÉLEVÉE',
  'revue.reserve.normale': 'NORMALE',
  'revue.reserve.faible': 'FAIBLE',
  'decision.portee.mineure': 'mineure',
  'decision.portee.moderee': 'modérée',
  'decision.portee.majeure': 'majeure',
  'decision.urgence.faible': 'faible',
  'decision.urgence.elevee': 'élevée',
  // Q4 (item j, coordinateur 24/09) : alias ParValeur sur la valeur SERVIE `urgency_bucket =
  // 'elevated'` — voir le bloc EN pour la mesure complète. MÊME valeur que `elevee`.
  'decision.urgence.elevated': 'élevée',
  'decision.urgence.pressante': 'pressante',
  'chrome.phase.aube': 'Aube',
  'chrome.phase.plein_jour': 'Plein jour',
  'chrome.phase.soiree': 'Soirée',
  'chrome.phase.nuit': 'Nuit',
  // tutoriel ㉕ — 7 clés `tutoriel.ecran.*` (2026-09-23), recopiées de l'atelier `36-tutoriel-ecran-2026-09-23.tsv` (da `0bf2126d`) :
  //     3 RATIFIÉES (compris · on_vous_explique_encore · decochez_le_jour…), 3 littéraux du client PROPOSÉS, 1 PROPOSÉE
  //     (rien_de_nouveau_pour_aujourd_hui : `next_tutorial_id` null n'est pas « tout vu »). D17 vérifié par l'atelier.
  'tutoriel.ecran.vous_avez_tout_vu': 'Vous avez tout vu.',
  'tutoriel.ecran.rien_de_nouveau_pour_aujourd_hui': 'Rien de nouveau pour aujourd’hui.',
  'tutoriel.ecran.vous_avez_demande_qu_on_vous_laisse_tranquille': 'Vous avez demandé qu’on vous laisse tranquille.',
  'tutoriel.ecran.a_decouvrir': 'À découvrir',
  'tutoriel.ecran.compris': 'Compris',
  'tutoriel.ecran.on_vous_explique_encore': 'On vous explique encore',
  'tutoriel.ecran.decochez_le_jour_ou_vous_n_avez_plus_besoin_qu_on_vous_tienne_la_main': 'décochez le jour où vous n’avez plus besoin qu’on vous tienne la main',
  // ㉕ table 36 (item j, atelier `fd032b60`, 2026-09-24, confirmé f2) : mots de la maquette
  // qu'aucune table ne portait. `.vues` : ICU plural, argument NOMMÉ `n` (jamais `#`).
  // ⛔ `tutoriel.ecran.ne_plus_rien_me_montrer` NON SERVIE : ratification ㉕ ouverte (Q6, le client a
  // une bascule à la place) — voir la garde d'absence dans table36_tutoriel_ecran_unit.spec.ts.
  'tutoriel.ecran.la_premiere_fois': 'La première fois',
  'tutoriel.ecran.vues': '{n, plural, one {vue} other {vues}}',
  'tutoriel.ecran.a_venir': 'à venir',
  // réglages ⑲ — 15 clés `reglages.bloc.*` (2026-09-23), recopiées À L'OCTET de l'atelier `38-reglages-bloc-2026-09-23.tsv` (da `d75bb64e`) :
  //     10 RATIFIÉES, 2 PROPOSÉES (le_coffre_est_ferme, rouvrir_le_coffre), 3 littéraux du client. Le fr porte déjà D17 (U+00A0 avant « : »,
  //     et U+00A0 à l'intérieur des guillemets tels que l'atelier les a écrits).
  'reglages.bloc.la_langue_de_la_maison': 'La langue de la maison',
  'reglages.bloc.le_jeu': 'Le jeu',
  'reglages.bloc.on_vous_explique_encore': 'On vous explique encore',
  'reglages.bloc.decochez_le_jour_ou_vous_n_avez_plus_besoin_qu_on_vous_tienne_la_main': 'décochez le jour où vous n’avez plus besoin qu’on vous tienne la main',
  'reglages.bloc.dire_mes_prix_au_marche': 'Dire mes prix au marché',
  'reglages.bloc.sans_ca_le_marche_de_region_ne_vous_dit_rien_non_plus': 'sans ça, le marché de région ne vous dit rien non plus',
  'reglages.bloc.le_coffre_est_ferme': 'Le coffre est fermé.',
  'reglages.bloc.rouvrir_le_coffre': 'Rouvrir le coffre',
  'reglages.bloc.fermer_le_coffre': 'Fermer le coffre',
  'reglages.bloc.cette_session_seulement': 'cette session seulement',
  'reglages.bloc.ce_qui_ne_s_ouvre_pas_encore': 'Ce qui ne s’ouvre pas encore',
  'reglages.bloc.fermer_partout': 'Fermer partout',
  'reglages.bloc.pas_encore_toutes_les_sessions_ouvertes_n_ont_pas_encore_de_guichet': 'pas encore : toutes les sessions ouvertes n’ont pas encore de guichet',
  'reglages.bloc.tout_effacer': 'Tout effacer',
  'reglages.bloc.pas_encore_et_ne_plus_jamais_revenir_n_a_pas_encore_de_guichet': 'pas encore : « et ne plus jamais revenir » n’a pas encore de guichet',
  // fiche bâtiment ② — 43 clés PROPOSÉES (2026-09-23), recopiées de l'atelier `37-fiche-batiment-mots-2026-09-23.tsv` (da `6c5de8d5`,
  //     83 mots classés, 0 défaut) : familles neuves `building.cook_stage.*` et `building.stock.*`, une clé ICU
  //     (`building.bloc.passes_compte`). PROPOSÉ, NON RATIFIÉ. D17 déjà appliqué dans le fr par l'atelier.
  'building.row.le_feu': 'le feu',
  'building.row.l_etagere': 'l’étagère',
  'building.row.les_caisses': 'les caisses',
  'building.action.commander_du_pyralin': 'Commander du Pyralin',
  'building.bloc.il_en_faut_avant_de_rallumer': 'il en faut avant de rallumer',
  'building.replique.l_etagere_est_refaite_dites_moi_combien_de_passes_et_j_allume': '« L’étagère est refaite. Dites-moi combien de passes, et j’allume. »',
  'building.row.passes': 'Passes',
  'building.action.allumer_le_feu': 'Allumer le feu',
  'building.bloc.ca_consomme_un_lot_de_lys_de_verre': 'ça consomme un lot de lys de verre',
  'building.replique.ca_monte_comme_il_faut_si_j_ouvre_maintenant_je_perds_tout': '« Ça monte comme il faut. Si j’ouvre maintenant, je perds tout. »',
  'building.bloc.rien_a_faire_ici': 'Rien à faire ici.',
  'building.bloc.repassez_quand_ce_sera_tire': 'Repassez quand ce sera tiré',
  'building.replique.et_ne_me_lancez_pas_une_deuxieme_cuve_tant_que_celle_la_tourne': '— et ne me lancez pas une deuxième cuve tant que celle-là tourne.',
  'building.replique.passes_passes_comme_demande_c_est_plus_long_mais_ca_sort_propre': '« {passes} passes, comme demandé. C’est plus long, mais ça sort propre. »',
  'building.bloc.chaque_passe_rallonge_la_nuit': 'Chaque passe rallonge la nuit.',
  'building.bloc.c_est_vous_qui_avez_choisi': 'C’est vous qui avez choisi',
  'building.replique.je_tiens_la_cuve_jusqu_au_bout': '— je tiens la cuve jusqu’au bout.',
  'building.replique.c_est_tire_ca_ne_peut_pas_dormir_ici_chaque_nuit_que_ca_reste_c_est_une_nuit_de_trop': '« C’est tiré. Ça ne peut pas dormir ici — chaque nuit que ça reste, c’est une nuit de trop. »',
  'building.action.faire_sortir_la_marchandise': 'Faire sortir la marchandise',
  'building.bloc.vers_les_coursiers': 'vers les coursiers',
  'famille.category.approvisionnement': 'Approvisionnement',
  'building.replique.l_approvisionnement_c_est_moi_maintenant_vous_me_l_avez_confie_je_commande_quand_il_faut': '« L’approvisionnement, c’est moi maintenant — vous me l’avez confié. Je commande quand il faut. »',
  'building.bloc.vous_ne_passez_plus_les_commandes_vous_meme': 'Vous ne passez plus les commandes vous-même.',
  'building.bloc.reprendre_la_main_se_fait_depuis_la_famille_pas_depuis_le_labo': 'Reprendre la main se fait depuis la Famille, pas depuis le labo.',
  'building.stock.low': 'Faible',
  'building.cook_stage.mid': 'Montée',
  'building.cook_stage.late': 'Affinage',
  'building.stock.high': 'Haut',
  'building.bloc.passes_passes_tenues': '{passes} passes tenues',
  'building.bloc.un_rendez_vous_est_pris': 'Un rendez-vous est pris',
  'building.bloc.un_client_du_district_du_verre_vous_attend': 'Un client du district du Verre vous attend.',
  'building.row.affinee': 'Affinée',
  'building.bloc.passes_compte': '{passes, plural, =0 {pas du tout} one {# passe} other {# passes}}',
  'building.bloc.le_rendez_vous_est_honore': 'Le rendez-vous est honoré',
  'building.bloc.la_marchandise_est_partie_le_client_a_paye': 'La marchandise est partie, le client a payé.',
  'building.bloc.le_rendez_vous_est_passe': 'Le rendez-vous est passé',
  'building.bloc.personne_n_y_est_alle_il_faudra_en_reprendre_un': 'Personne n’y est allé. Il faudra en reprendre un.',
  'building.cook_stage.idle': 'Éteint',
  'building.cook_stage.early': 'Début',
  'building.cook_stage.done': 'Prêt',
  'building.stock.none': 'Vide',
  'building.stock.medium': 'Moyen',
  'building.row.stock': 'Stock',
  // conflit ㉙ — 50 clés PROPOSÉES (2026-09-23), recopiées de l'atelier `40-conflit-mots-2026-09-23.tsv` (da `997d6ab4`, 0 défaut) :
  //     familles `conflit.issue.*`, `conflit.cout.*`, `conflit.chaleur.*` ; 2 pluriels ICU (fois_chez_eux, hommes_dehors) ; paramètres
  //     `{famille}`, `{nom}`, `{n}`, `{axe}` (v 997d6ab4 : la cible est un axe d'érosion). PROPOSÉ, NON RATIFIÉ. Les mots GENRÉS ratifiés du fichier restent tels quels (en attente de l'user).
  'conflit.bloc.on_envoie_nom_chez_famille_sur_axe': 'On envoie {nom} chez {famille}, sur {axe}.',
  'conflit.bloc.autre_famille_autre_cible': 'autre famille, autre cible',
  'conflit.bloc.meme_famille_autre_cible': 'même famille, autre cible',
  'conflit.axe.muscle': 'leurs gros bras',
  'conflit.axe.finance': 'leur argent',
  'conflit.axe.intel': 'leurs informateurs',
  'conflit.axe.infrastructure': 'leurs installations',
  'conflit.axe.leadership': 'leur tête',
  'conflit.bloc.le_coup_de_ce_soir': 'Le prochain coup',
  'conflit.bloc.on_choisit_une_famille_on_choisit_un_homme_et_on_l_envoie_on_saura_demain': 'On choisit une famille, on choisit qui y envoyer. On saura demain.',
  'conflit.bloc.fois_chez_eux': '{n, plural, =0 {jamais} one {# fois} other {# fois}}',
  'conflit.bloc.on_ne_les_a_pas_croises': 'on n’a jamais croisé leur route',
  'conflit.bloc.ce_soir': 'En cours',
  'conflit.bloc.l_envoyer_ce_soir': 'L’envoyer',
  'conflit.bloc.on_ne_pourra_plus_le_rappeler': 'pas de rappel possible',
  'conflit.bloc.la_derniere_fois_chez_eux': 'La dernière fois là-bas\u00a0:',
  'conflit.issue.breakthrough': 'Percée',
  'conflit.bloc.et_la_ville_a_chauffe': ', et la ville a chauffé',
  'conflit.bloc.on_est_alles_chez_eux': 'on leur a rendu visite',
  'conflit.bloc.nom_tient_les_comptes_il_ne_cogne_pas_et_famille_on_ne_l_a_jamais_croisee_je_ne_saurais_pas_ou_frapper': '«\u00a0{nom}, c’est les comptes, pas les coups. Et {famille}, on ne l’a jamais croisée — je ne saurais pas où frapper.\u00a0»',
  'conflit.bloc.deux_choses_ne_collent_pas': 'deux choses ne collent pas',
  'conflit.bloc.ce_qui_est_en_cours': 'Ce qui est en cours',
  'conflit.bloc.les_hommes_qu_on_a_envoyes_et_qui_ne_sont_pas_encore_rentres': 'Ce qu’on a envoyé et qui n’est pas encore rentré.',
  'conflit.bloc.partis_pas_encore_rentres': 'En route, pas encore de retour',
  'conflit.bloc.parti_chez_famille': 'en route vers {famille}',
  'conflit.bloc.on_ne_peut_plus_le_rappeler': 'plus de rappel possible',
  'conflit.bloc.deja_rentres': 'Déjà de retour',
  'conflit.bloc.etait_chez_famille': 'était chez {famille}',
  'conflit.issue.hold': 'Rien obtenu',
  'conflit.bloc.hommes_dehors': '{n, plural, one {Une personne dehors.} other {# personnes dehors.}}',
  'conflit.bloc.on_ne_les_rappelle_pas_on_saura_demain_matin': 'On ne les rappelle pas — on saura demain matin.',
  'conflit.bloc.en_envoyer_un_autre': 'Envoyer quelqu’un d’autre',
  'conflit.bloc.ce_qui_est_rentre': 'Ce qui est rentré',
  'conflit.bloc.ce_que_chaque_homme_a_rapporte_et_ce_que_ca_nous_a_coute': 'Ce que chaque envoi a rapporté, et ce que ça nous a coûté.',
  'conflit.bloc.il_est_rentre': 'De retour',
  'conflit.bloc.ca_nous_a_coute': 'ça nous a coûté',
  'conflit.cout.low': 'un peu',
  'conflit.bloc.la_ville_a_chauffe': 'la ville a chauffé',
  'conflit.cout.medium': 'pas mal',
  'conflit.bloc.depuis_le_debut_chez_famille': 'Depuis le début, chez {famille}',
  'conflit.bloc.coup_n_n': 'Coup n°{n}',
  'conflit.bloc.un_homme_envoye': 'un envoi',
  'conflit.issue.advance': 'Terrain gagné',
  'conflit.bloc.voila_ce_que_ca_a_donne_a_vous_de_dire_si_on_y_retourne': '« Voilà ce que ça a donné. À vous de dire si on y retourne. »',
  'conflit.issue.contested': 'Disputé',
  'conflit.issue.retreat': 'On a reculé',
  'conflit.cout.high': 'beaucoup',
  'conflit.chaleur.low': 'un peu',
  'conflit.chaleur.medium': 'pas mal',
  'conflit.chaleur.high': 'beaucoup',
  // ordre permanent ⑦ — 18 clés (2026-09-23), recopiées de l'atelier `42-ordre-permanent-cles-2026-09-23.tsv` (da `aa2cd03b`, 0 défaut) :
  //     1 RATIFIÉE(S), 1 mot de f2 déjà au client, le reste PROPOSÉ (dont 3 épicènes, D13).
  'famille.ecran.donner_un_ordre': 'Donner un ordre',
  'famille.ecran.et_quand_il_expire': 'Et quand il expire',
  'famille.lapse.retour_a_la_routine': 'retour à la routine',
  'famille.lapse.l_ordre_continue': 'l’ordre continue',
  'famille.lapse.on_vous_demande': 'on vous demande',
  'famille.ecran.pour_une_duree_fixe': 'pour une durée fixe',
  'famille.ecran.signer_l_ordre': 'Signer l’ordre',
  'famille.ordre.en_cours': 'en cours',
  'famille.ordre.echu': 'échu',
  'famille.refus.trop_tot_pour_refaire_ce_geste': 'trop tôt pour refaire ce geste',
  'famille.refus.aucun_ordre_en_cours': 'aucun ordre en cours',
  'famille.refus.cet_ordre_n_a_pas_encore_fait_ses_preuves': 'cet ordre n’a pas encore fait ses preuves',
  'famille.refus.un_ordre_est_deja_en_cours_renouvelez_le': 'un ordre est déjà en cours : renouvelez-le',
  'famille.refus.ce_geste_n_est_pas_reconnu': 'ce geste n’est pas reconnu',
  // Lot « ouvrables » (L15) — les 5 motifs d'hôte (`HostBlockedReason`), PROPOSÉS : `blocked_reason_i18n` de
  // `GET /v1/lieutenants/host-eligibility`. La clé EST la phrase.
  'famille.refus.ce_batiment_n_est_pas_pret_a_accueillir_quelqu_un': 'ce bâtiment n’est pas prêt à accueillir quelqu’un',
  'famille.refus.ce_type_de_batiment_ne_convient_pas_a_ce_role': 'ce type de bâtiment ne convient pas à ce rôle',
  'famille.refus.ce_commerce_n_a_pas_encore_de_premiere_etape_de_blanchiment': 'ce commerce n’a pas encore de première étape de blanchiment',
  'famille.refus.ce_relais_a_deja_son_coordinateur': 'ce relais a déjà son coordinateur',
  'famille.refus.aucun_dealer_ne_tient_ce_point_de_vente': 'aucun dealer ne tient ce point de vente',
  'famille.fiabilite.en_sommeil': 'en sommeil',
  'famille.fiabilite.a_moitie_fiable': 'à moitié fiable',
  'famille.fiabilite.fiable': 'fiable',
  'famille.fiabilite.decisif': 'décisif',
  // réputation ㊲ — 23 clés PROPOSÉES (2026-09-23), recopiées de l'atelier `43-reputation-mots-2026-09-23.tsv` (da `69a311a9`, 0 défaut) :
  //     familles neuves `reputation.col.*`, `.manches.*`, `.montre.*`, `.gants.*` (uniform_tells) ; 1 pluriel ICU ; `{nom}`. PROPOSÉ, NON
  //     RATIFIÉ. Les 4 postures genrées déjà servies (« Il … ») restent telles quelles, en attente de l'user.
  'reputation.bloc.ce_qu_il_a_pris_de_vous_se_voit_sur_lui': 'ce qu’il a pris de vous se voit sur lui',
  'reputation.bloc.regles_donnees': 'règles données',
  'reputation.bloc.absorbees': 'absorbées',
  'reputation.bloc.nom_votre_lieutenant': '{nom}, votre lieutenant',
  'reputation.col.buttoned': 'col boutonné',
  'reputation.manches.down': 'manches basses',
  'reputation.montre.visible': 'montre visible',
  'reputation.gants.dirty': 'gants sales',
  'reputation.bloc.la_regle_du_jeu': 'la règle du jeu',
  'reputation.bloc.vous_vous_lisez_sur_lui': 'Vous vous lisez sur lui',
  'reputation.bloc.chaque_vertu_qu_il_vous_voit_tenir_finit_sur_sa_tenue_col_manches_montre_gants': 'chaque vertu qu’il vous voit tenir finit sur sa tenue — col, manches, montre, gants.',
  'reputation.bloc.un_lieutenant_neuf_n_a_encore_rien_absorbe': 'un lieutenant neuf n’a encore rien absorbé',
  'reputation.col.open': 'col ouvert',
  'reputation.montre.hidden': 'montre cachée',
  'reputation.bloc.rien_n_a_encore_deteint': 'Rien n’a encore déteint',
  'reputation.bloc.donner_une_premiere_regle': 'Donner une première règle',
  'reputation.bloc.vous_vous_ecartez_de_vos_propres_regles': 'vous vous écartez de vos propres règles',
  'reputation.manches.rolled': 'manches roulées',
  'reputation.gants.clean': 'gants propres',
  'reputation.bloc.ce_qui_a_change': 'ce qui a changé',
  'reputation.bloc.il_a_deja_pris_de_vous_pas_encore_de_quoi_le_lire': 'il a déjà pris de vous, pas encore de quoi le lire',
  'reputation.bloc.ni_l_un_ni_l_autre': 'ni l’un ni l’autre',
  'reputation.bloc.n_vertus_sur_lui_pas_encore_un_verdict': '{n, plural, one {Une vertu sur lui} other {# vertus sur lui}}, pas encore un verdict',
  // délégation ㉜ — 59 clés PROPOSÉES (2026-09-23), recopiées de l'atelier `44-delegation-mots-2026-09-23.tsv` (da `5d4ee17b`, 0 défaut) :
  //     `delegation.charge.*`, familles chute / regain / indemnite / fenetre, les refus (plafond structurel, verrou de promotion),
  //     1 pluriel ICU nommé. D18 : la session est la journée du joueur. PROPOSÉ, NON RATIFIÉ.
  'delegation.bloc.ce_que_vous_tenez_encore_vous_meme': 'Ce que vous tenez encore vous-même',
  'delegation.bloc.quatre_choses_chacune_peut_etre_confiee_et_reprise_a_un_prix': 'Quatre choses. Chacune peut être confiée — et reprise, à un prix.',
  'delegation.bloc.une_decision_de_structure_aujourd_hui': 'Une décision de structure aujourd’hui',
  'delegation.bloc.confier_ou_reprendre_pas_les_deux': 'confier ou reprendre — pas les deux',
  'delegation.charge.route_assignment': 'Les tournées',
  'delegation.bloc.qui_livre_quoi_et_par_ou': 'qui livre quoi, et par où',
  'delegation.bloc.vous': 'vous',
  'delegation.bloc.vous_la_faites': 'vous la faites',
  'delegation.charge.lieutenant_hiring': 'L’embauche',
  'delegation.bloc.qui_entre_dans_la_maison': 'qui entre dans la maison',
  'delegation.charge.supply_sourcing': 'L’approvisionnement',
  'delegation.bloc.ce_qu_on_commande_et_a_qui': 'ce qu’on commande, et à qui',
  'delegation.bloc.ce_qu_on_fait_quand_la_ville_s_echauffe': 'ce qu’on fait quand la ville s’échauffe',
  'delegation.bloc.tant_que_vous_tenez_tout_rien_ne_se_fait_sans_vous_et_rien_ne_se_fait_pendant_que_vous_dormez': 'Tant que vous tenez tout, rien ne se fait sans vous — et rien ne se fait pendant que vous dormez.',
  'delegation.bloc.en_confier_une': 'En confier une',
  'delegation.bloc.vous_ne_la_ferez_plus_vous_meme': 'vous ne la ferez plus vous-même',
  'delegation.bloc.confier_une_de_vos_charges': 'Confier une de vos charges',
  'delegation.bloc.vous_ne_la_ferez_plus_quelqu_un_d_autre_la_fera_a_sa_facon': 'Vous ne la ferez plus. Quelqu’un d’autre la fera, à sa façon.',
  'delegation.bloc.donnez_moi_charge_je_m_en_occupe_et_vous_ne_verrez_plus_passer_les_commandes': '« Donnez-moi {charge}. Je m’en occupe, et vous ne verrez plus passer les commandes. »',
  'delegation.bloc.la_lui_confier': 'La lui confier',
  'delegation.bloc.c_est_votre_decision_du_jour': 'c’est votre décision du jour',
  'delegation.bloc.ce_que_vous_avez_confie': 'Ce que vous avez confié',
  'delegation.bloc.n_charges_tenues_par_quelqu_un_d_autre': '{n, plural, one {# charge tenue} other {# charges tenues}} par quelqu’un d’autre. Vous pouvez les reprendre, à un prix.',
  'delegation.bloc.reprendre_charge': 'Reprendre {charge}',
  'delegation.bloc.voila_ce_que_ca_couterait_on_vous_le_dit_avant_pas_apres': 'Voilà ce que ça coûterait. On vous le dit avant, pas après.',
  'delegation.bloc.ce_qu_il_a_appris': 'Ce qui a été appris',
  'delegation.chute.eleve': 'retombe brutalement',
  'delegation.bloc.pour_tout_regagner': 'Pour tout regagner',
  'delegation.regain.long': 'très longtemps',
  'delegation.bloc.ce_qu_on_lui_doit': 'L’indemnité', // D13 (item i, atelier `1d8541bf`, 2026-09-24) — clé SERVIE gardée, valeur changée (« Ce qu’on lui doit » sort)
  'delegation.indemnite.ruinous': 'ruineux',
  'delegation.fenetre.extended': 'pendant long',
  'delegation.bloc.celui_qu_il_formait': 'Sa relève',
  // table 56 v1.1 (item a, atelier `b20b1bdb`, 2026-09-24) : clé NEUVE pour ㉜ seul — partagée avec
  // ㊲ RATIFIÉE `reputation.etat.il_vous_en_veut` (inchangée, f2).
  'delegation.bloc.rancune': 'Rancune',
  // table 56 v1.2 (item i, atelier `1d8541bf`, 2026-09-24) : les sites ∅ de la table lot 2 de
  // CLIENT-2 — 8 clés NEUVES, toutes `delegation.bloc.*`.
  'delegation.bloc.quelqu_un': 'Quelqu’un',
  'delegation.bloc.aucune_n_est_encore_prete': 'aucune n’est encore prête',
  'delegation.bloc.personne_a_qui_la_confier_la_maison_n_a_aucun_lieutenant': 'Personne à qui la confier — la maison n’a aucun lieutenant.',
  'delegation.bloc.aucun_lieutenant_disponible': 'aucun lieutenant disponible',
  'delegation.bloc.on_demande_ce_que_ca_couterait': 'On demande ce que ça coûterait…',
  'delegation.bloc.le_tableau_de_service_n_a_pas_repondu': 'Le tableau de service n’a pas répondu',
  'delegation.bloc.on_n_a_pas_pu_lire_ce_que_vous_tenez_rien_n_a_ete_change': 'On n’a pas pu lire ce que vous tenez. Rien n’a été changé.',
  'delegation.bloc.rien_n_a_ete_change': 'Rien n’a été changé.',
  'delegation.bloc.s_arrete_aussi': 's’arrête aussi',
  'delegation.bloc.si_vous_reconfiez_plus_tard': 'Si vous reconfiez plus tard',
  'delegation.bloc.ca_coutera_plus': 'ça coûtera plus',
  'delegation.bloc.ceci_est_un_avertissement_pas_un_mur_le_jeu_vous_laissera_le_faire': 'Ceci est un avertissement, pas un mur : le jeu vous laissera le faire.',
  'delegation.bloc.vous_pouvez_la_reprendre_il_ne_le_prendra_pas_bien_et_ce_qu_il_savait_faire_vous_devrez_le_reapprendre': 'Vous pouvez la reprendre. Ce sera mal pris, et tout ce qui s’y était appris, il faudra le réapprendre.',
  'delegation.bloc.la_reprendre_quand_meme': 'La reprendre quand même',
  'delegation.bloc.vous_avez_deja_tranche_aujourd_hui': 'Vous avez déjà tranché aujourd’hui',
  'delegation.bloc.on_ne_redessine_pas_la_maison_deux_fois_dans_la_meme_journee': 'On ne redessine pas la maison deux fois dans la même journée.',
  'delegation.bloc.decision_deja_prise_aujourd_hui': 'Décision déjà prise aujourd’hui',
  'delegation.bloc.la_prochaine_sera_pour_demain': 'la prochaine sera pour demain',
  'delegation.bloc.vous_avez_deja_confie_charge_aujourd_hui': 'Vous avez déjà confié {charge} aujourd’hui.',
  'delegation.bloc.plus_de_decision_aujourd_hui': 'plus de décision aujourd’hui',
  'delegation.bloc.une_seule_decision_de_structure_par_journee_confier_et_reprendre_comprises_ce_n_est_pas_une_limite_d_energie_c_est_pour_qu_une_maison_ne_se_redessine_pas_entierement_en_un_apres_midi': 'Une seule décision de structure par journée, confier et reprendre comprises. Ce n’est pas une limite d’énergie : c’est pour qu’une maison ne se redessine pas entièrement en un après-midi.',
  'delegation.charge.heat_management': 'La chaleur',
  'delegation.chute.faible': 'baisse un peu',
  'delegation.chute.moyen': 'baisse nettement',
  'delegation.regain.court': 'peu de temps',
  'delegation.regain.moyen': 'un bon moment',
  'delegation.indemnite.low': 'peu',
  'delegation.indemnite.medium': 'une somme',
  'delegation.indemnite.high': 'cher',
  'delegation.fenetre.short': 'pendant peu',
  'delegation.fenetre.standard': 'pendant un temps',
  'delegation.refus.la_charge_n_est_plus_a_vous': 'la charge n’est plus à vous',
  'delegation.refus.la_charge_n_est_plus_confiee': 'la charge n’est plus confiée',
  'delegation.refus.un_changement_est_deja_en_cours_sur_cette_charge': 'un changement est déjà en cours sur cette charge',
  // carte de tête ④ — 4 clés `accueil.carte.*` (2026-09-23), atelier `45-carte-de-tete-2026-09-23.tsv` (da `a0ff6cba`) : la forme (b)
  //     de la HL card — les options sont du TEXTE, commit = « Prendre acte » (n'agit pas sur le monde), skip = « Pas maintenant ».
  //     ⚠️ `prendre_acte_n_agit_pas_a_votre_place` reste vraie tant que le bouton « Prendre acte » poste le défaut de `commit` (prendre acte) ;
  //     elle devient FAUSSE avec le lot client des gestes — nommée dans le mode d'emploi de péremption de `tests/unit/progression/hl_card_contrat_reel_unit.spec.ts`. PROPOSÉ, NON RATIFIÉ.
  'accueil.carte.ce_qu_on_peut_faire': 'Ce qu’on peut faire',
  'accueil.carte.prendre_acte': 'Prendre acte',
  'accueil.carte.pas_maintenant': 'Pas maintenant',
  'accueil.carte.prendre_acte_n_agit_pas_a_votre_place': 'prendre acte n’agit pas à votre place',
  // table 45 (item j, atelier `82539a59`, 2026-09-24) : libellés d'en-tête de bande, valeur par la
  // famille servie decision.portee.* / decision.urgence.*.
  'accueil.carte.portee': 'Portée',
  'accueil.carte.urgence': 'Urgence',
  // ordres du soir ㉞ — 36 clés PROPOSÉES (2026-09-23), atelier `46-carnet-mots-2026-09-23.tsv` (da `1c32d021`, somme de l'atelier :
  //     78 lignes = 73 mots + 5 compléments, 40 clés distinctes à valeur = ces proposées + 3 servies D14 + 3 servies) : `carnet.ordre.*`,
  //     les gestes à route. PROPOSÉ, NON RATIFIÉ.
  'carnet.bloc.a_batiment_quartier': 'à {batiment} ({quartier})',
  'carnet.ordre.distribution_run': 'Envoyer un coursier',
  'carnet.bloc.vers_batiment_quartier': 'vers {batiment} ({quartier})',
  'carnet.ordre.exception_batch_resolution': 'Régler l’ardoise',
  'carnet.bloc.n_ordres_on_peut_en_mettre_reste_de_plus_ou_partir_comme_ca': '« {n, plural, one {Un ordre} other {# ordres}}. On peut en mettre {reste} de plus, ou partir comme ça. »',
  'carnet.bloc.lancer_la_soiree': 'Lancer la soirée',
  'carnet.bloc.une_fois_partie_on_ne_la_reprend_pas': 'une fois partie, on ne la reprend pas',
  'carnet.bloc.deux_ordres_s_attendent_l_un_l_autre': 'Deux ordres s’attendent l’un l’autre',
  'carnet.bloc.aucun_des_deux_ne_peut_partir_en_premier': 'Aucun des deux ne peut partir en premier.',
  'carnet.bloc.l_ordre_a_attend_le_b_et_le_b_attend_le_a': 'Le {a} attend le {b}, et le {b} attend le {a}.',
  'carnet.bloc.il_faut_en_detacher_un_des_deux_sinon_la_soiree_ne_demarre_pas': 'Il faut en détacher un des deux, sinon la soirée ne démarre pas.',
  'carnet.bloc.ca_ne_peut_pas_marcher_chacun_attend_l_autre': '« Ça ne peut pas marcher. Chacun attend l’autre. »',
  'carnet.bloc.deux_ordres_se_bloquent': 'deux ordres se bloquent',
  'carnet.bloc.un_endroit_n_a_pas_fini_de_se_poser': 'Un endroit n’a pas fini de se poser',
  'carnet.bloc.ce_qu_on_y_a_change_n_a_pas_encore_pris': 'Ce qu’on y a changé n’a pas encore pris.',
  'carnet.bloc.on_y_a_change_quelque_chose_et_ca_n_a_pas_encore_pris_soit_on_attend_soit_on_le_dit_explicitement_et_on_assume': 'On y a changé quelque chose et ça n’a pas encore pris. Soit on attend, soit on le dit explicitement et on assume.',
  'carnet.bloc.on_peut_y_aller_quand_meme_mais_dites_le_moi_clairement': '« On peut y aller quand même, mais dites-le-moi clairement. »',
  'carnet.bloc.y_aller_quand_meme': 'Y aller quand même',
  'carnet.bloc.j_assume_le_site_qui_bouge_encore': 'j’assume le site qui bouge encore',
  'carnet.bloc.vos_soirees_mises_de_cote': 'Vos soirées mises de côté',
  'carnet.bloc.rejouer': 'Rejouer',
  'carnet.bloc.vous_ne_pouvez_pas_encore_mettre_une_soiree_de_cote': 'Vous ne pouvez pas encore mettre une soirée de côté.',
  'carnet.bloc.pour_l_instant_chaque_soiree_se_compose_a_la_main': 'Pour l’instant, chaque soirée se compose à la main.',
  'carnet.bloc.pas_encore_possible': 'pas encore possible',
  'carnet.bloc.rejouer_nom': 'Rejouer « {nom} »',
  'carnet.bloc.n_ordres_d_un_coup': '{n, plural, one {un ordre} other {# ordres}} d’un coup',
  'carnet.bloc.ce_qui_s_est_passe_en_ville': 'Ce qui s’est passé en ville',
  'carnet.bloc.ce_qui_bouge_dans_les_quartiers_ou_vous_avez_quelque_chose': 'Ce qui bouge dans les quartiers où vous avez quelque chose.',
  'carnet.bloc.dans_vos_quartiers': 'Dans vos quartiers',
  'carnet.bloc.vous_y_etiez': 'Vous y étiez',
  'carnet.bloc.ce_qui_se_passe_la_ou_vous_avez_quelque_chose': 'Ce qui se passe là où vous avez quelque chose.',
  'carnet.bloc.y_etre_vu_compte_dans_un_sens_comme_dans_l_autre': 'Y être vu compte, dans un sens comme dans l’autre.',
  'carnet.bloc.aller_a_l_enterrement': 'Aller à l’enterrement',
  'carnet.bloc.on_vous_y_verra': 'on vous y verra',
  'carnet.ordre.maintenance_batch': 'Faire l’entretien',
  'carnet.ordre.recruitment_step': 'Recruter',
  // file de ④ sans compte — addendum 45 (da `9513b05b`) : `queue_pressure_band` saturé et `backlog_badge`, sans nombre. PROPOSÉ.
  'accueil.file.plusieurs_attendent_encore': 'Plusieurs attendent encore',
  'accueil.file.d_autres_attendent_au_dela_de_ce_que_la_file_montre': 'd’autres attendent au-delà de ce que la file montre',
  // dossier ㊴ — 34 clés PROPOSÉES (2026-09-23), atelier `47-dossier-mots-2026-09-23.tsv` (da `ed4613fd` ; somme de l'atelier : 91 lignes =
  //     89 mots + 2 compléments, 34 clés distinctes à valeur) : `forensic.cran.*`, `forensic.acteur.*`, `forensic.statut.*`. Les mots genrés
  //     ratifiés restent tels quels (en attente de l'user). PROPOSÉ, NON RATIFIÉ.
  'forensic.bloc.trois_pistes_et_elles_ne_se_melangent_pas': 'trois pistes, et elles ne se mélangent pas',
  'forensic.bloc.pistes_chaudes': 'pistes chaudes',
  'forensic.bloc.franchies': 'franchies',
  'forensic.bloc.qui_tiennent': 'qui tiennent',
  'forensic.cran.on_regarde': 'on regarde',
  'forensic.bloc.ce_qui_sort_des_cuves': 'ce qui sort des cuves',
  'forensic.bloc.le_train_de_vie_d_un_lieutenant': 'le train de vie d’un lieutenant',
  'forensic.bloc.le_train_de_vie_de_nom': 'le train de vie de {nom}',
  'forensic.cran.discret': 'discret',
  'forensic.bloc.acheter_du_renseignement': 'Acheter du renseignement',
  'forensic.bloc.sur_un_acteur_pas_sur_une_piste_on_n_achete_pas_un_dossier': 'sur un acteur, pas sur une piste — on n’achète pas un dossier',
  'forensic.bloc.qui_parle_et_qui_a_peur': 'qui parle, et qui a peur',
  'forensic.bloc.acteurs_connus': 'acteurs connus',
  'forensic.bloc.qui_ont_peur': 'qui ont peur',
  'forensic.bloc.partis': 'partis',
  'forensic.acteur.lawyer': 'Avocat',
  'forensic.statut.steady': 'il tient',
  'forensic.acteur.clerk': 'Greffier',
  'forensic.statut.nervous': 'il a peur',
  'forensic.statut.unavailable': 'injoignable',
  'forensic.statut.gone': 'parti',
  'forensic.bloc.il_ne_reviendra_pas': 'il ne reviendra pas',
  'forensic.bloc.celui_la_ne_reviendra_pas': 'Celui-là ne reviendra pas',
  'forensic.bloc.rien_a_votre_nom': 'Rien à votre nom.',
  'forensic.bloc.personne_n_a_encore_eu_de_raison_de_vous_ouvrir_un_dossier': 'Personne n’a encore eu de raison de vous ouvrir un dossier.',
  'forensic.bloc.ce_n_est_pas_une_bonne_nouvelle': 'ce n’est pas une bonne nouvelle',
  'forensic.bloc.c_est_juste_une_nouvelle': 'C’est juste une nouvelle',
  'forensic.bloc.les_trois_pistes_montent_avec_ce_que_vous_faites_a_zero_elles_ne_disent_pas_que_vous_etes_prudent_elles_disent_que_vous_n_avez_pas_encore_commence': 'les trois pistes montent avec ce que vous faites. À zéro, elles ne disent pas que vous êtes prudent : elles disent que vous n’avez pas encore commencé.',
  'forensic.bloc.pistes': 'pistes',
  'forensic.cran.invisible': 'invisible',
  'forensic.cran.des_traces': 'des traces',
  'forensic.cran.remarque': 'remarqué',
  'forensic.cran.suivi': 'suivi',
  'forensic.cran.rien_a_signaler': 'rien à signaler',
  'forensic.cran.ca_se_voit': 'ça se voit',
  // filière ㊵ — 20 clés PROPOSÉES (2026-09-23), atelier `48-filiere-mots-2026-09-23.tsv` (da `edf98ebf` ; somme de l'atelier : 71 lignes =
  //     68 mots + 3 compléments, 20 clés distinctes à valeur) : dont `filiere.proprete.*` pour `cleanliness_band`. PROPOSÉ, NON RATIFIÉ.
  'filiere.sous_titre.ou_en_est_chaque_etape': 'où en est chaque étape',
  'filiere.bloc.propres': 'propres',
  'filiere.proprete.partial': 'à moitié',
  'filiere.bloc.injecter': 'Injecter',
  'filiere.bloc.depuis_votre_comptoir_vers_une_planque_a_vous': 'depuis votre comptoir, vers une planque à vous',
  'filiere.sous_titre.vous_n_en_avez_pas_encore': 'vous n’en avez pas encore',
  'filiere.bloc.votre_planque_est_prete': 'Votre planque est prête.',
  'filiere.bloc.la_filiere_elle_reste_a_monter': 'La filière, elle, reste à monter.',
  'filiere.bloc.par_ou_ca_commence': 'par où ça commence',
  'filiere.bloc.injecter_puis_accrocher_une_etape': 'Injecter, puis accrocher une étape',
  'filiere.bloc.la_planque_vous_est_donnee_le_reste_se_construit_une_premiere_injection_ouvre_la_filiere_chaque_etape_suivante_s_accroche_a_la_precedente': 'la planque vous est donnée ; le reste se construit. Une première injection ouvre la filière, chaque étape suivante s’accroche à la précédente.',
  'filiere.sous_titre.aucune_filiere': 'aucune filière',
  'filiere.bloc.aucune_filiere_montee': 'Aucune filière montée.',
  'filiere.bloc.une_filiere_se_construit_etape_par_etape': 'Une filière se construit étape par étape.',
  'filiere.bloc.comment_ca_se_monte': 'comment ça se monte',
  'filiere.bloc.une_etape_s_accroche_a_la_precedente': 'Une étape s’accroche à la précédente',
  'filiere.bloc.chaque_etape_se_pose_a_partir_d_un_nœud_existant_et_d_un_batiment_a_vous_la_premiere_a_besoin_d_une_injection_donc_d_une_planque': 'chaque étape se pose à partir d’un nœud existant et d’un bâtiment à vous. La première a besoin d’une injection — donc d’une planque.',
  'filiere.proprete.dirty': 'sale',
  'filiere.proprete.mostly_clean': 'presque propre',
  'filiere.proprete.clean': 'propre',

  // Lot « ouvrables » (L21) — les 4 motifs de refus de `POST /v1/operational/laundering/stage` (`StageBlockedReason`), PROPOSÉS : voir l'EN.
  'filiere.refus.ce_batiment_ne_peut_pas_accueillir_d_etape_pour_l_instant': 'ce bâtiment ne peut pas accueillir d’étape pour l’instant',
  'filiere.refus.ce_batiment_porte_deja_une_etape': 'ce bâtiment porte déjà une étape',
  'filiere.refus.cette_etape_a_deja_une_suite': 'cette étape a déjà une suite',
  'filiere.refus.la_filiere_a_avance_entre_temps_recommencez': 'la filière a avancé entre-temps : recommencez',
  // journal & rue ㊳ — 20 clés PROPOSÉES (2026-09-23), atelier `49-journal-mots-2026-09-23.tsv` (da `faaa0786` ; somme : 89 lignes = 89 mots
  //     + 0 complément, 20 clés distinctes à valeur) : `journal.fraicheur.*` (recency_band), `journal.gravite.*` (severity_band), le geste à
  //     route « Y prêter attention ». Les 5 phases déjà servies ne sont pas touchées. PROPOSÉ, NON RATIFIÉ.
  'journal.fraicheur.fresh': 'ce matin',
  'journal.fraicheur.settling': 'hier',
  'journal.bloc.y_preter_attention': 'Y prêter attention',
  'journal.bloc.on_peut_assister_a_ce_qui_se_passe_c_est_le_seul_geste_que_la_rue_accepte': 'on peut assister à ce qui se passe — c’est le seul geste que la rue accepte',
  'journal.bloc.ce_qui_arrive_a_la_ville': 'ce qui arrive à la ville',
  'journal.bloc.compris': 'compris',
  'journal.gravite.heavy': 'ça pèse',
  'journal.gravite.noticeable': 'on en parle',
  'journal.gravite.faint': 'à peine',
  'journal.bloc.ce_qui_ne_partira_pas': 'ce qui ne partira pas',
  'journal.bloc.le_quartier_a_change_et_il_faudra_faire_avec_ce_n_est_plus_une_nouvelle_c_est_une_donnee': 'Le quartier a changé, et il faudra faire avec — ce n’est plus une nouvelle, c’est une donnée.',
  'journal.bloc.rien_a_faire_c_est_acquis': 'Rien à faire — c’est acquis',
  'journal.bloc.ce_que_vous_avez_compris': 'ce que vous avez compris',
  'journal.bloc.couplages_compris': 'couplages compris',
  'journal.bloc.et_tout_ce_que_vous_n_avez_pas_encore_compris_la_maison_ne_dit_pas_combien_il_en_reste': 'et tout ce que vous n’avez pas encore compris — la maison ne dit pas combien il en reste',
  'journal.bloc.la_ville_a_des_causes_et_vous_les_apprenez': 'La ville a des causes, et vous les apprenez',
  'journal.bloc.la_fraicheur': 'la fraîcheur',
  'journal.fraicheur.fading': 'la semaine passée',
  'journal.bloc.la_gravite': 'la gravité',
  'journal.bloc.la_phase': 'la phase',
  // inspections ⑮ — 37 clés PROPOSÉES (2026-09-23), atelier `50-inspections-mots-2026-09-23.tsv` (da `6d44e07d` ; somme : 53 lignes = 37 mots +
  //     16 compléments, 37 clés distinctes à valeur). Les lignes « a + b » du fichier sont des COMPOSITIONS de deux clés à l'affichage : seules
  //     leurs parties sont servies (la garde de forme refuse toute clé à « + »). PROPOSÉ, NON RATIFIÉ.
  'inspection.bloc.registre_de_dispatch': 'Registre de dispatch',
  'inspection.bloc.district': 'district',
  'inspection.bloc.charge': 'charge',
  'inspection.bloc.regime': 'régime',
  'inspection.bloc.origines': 'origines',
  'inspection.charge.light': 'légère',
  'inspection.regime.nominal': 'nominal',
  'inspection.regime.backlogged': 'arriéré',
  'inspection.bloc.le_coup_fourre': 'Le coup fourré',
  'inspection.bloc.on_leur_donne_un_os_a_ronger': 'on leur donne un os à ronger',
  'inspection.bloc.deposer_un_signalement': 'Déposer un signalement',
  'inspection.bloc.sur_un_batiment_de_quartier': 'sur un bâtiment de {quartier}',
  'inspection.bloc.prix': 'prix',
  'inspection.bloc.effet': 'effet',
  'inspection.bloc.une_entree_de_plus_dans_leur_file': 'une entrée de plus dans leur file',
  'inspection.bloc.deposer': 'Déposer',
  'inspection.bloc.au_bout_de_plusieurs_la_police_se_retourne': 'au bout de plusieurs, la police se retourne',
  'inspection.bloc.le_retour_de_baton': 'Le retour de bâton',
  'inspection.bloc.ils_ont_compris_que_les_signalements_venaient_de_vous': 'ils ont compris que les signalements venaient de vous',
  'inspection.bloc.retournee': 'retournée',
  'inspection.bloc.elle_vous_rend_la_monnaie': 'Elle vous rend la monnaie',
  'inspection.charge.empty': 'vide',
  'inspection.charge.moderate': 'moyenne',
  'inspection.charge.heavy': 'lourde',
  'inspection.charge.saturated': 'saturée',
  'inspection.regime.budget_cut': 'budget coupé',
  'inspection.regime.surge': 'en renfort',
  'inspection.origine.scheduled': 'programmée',
  'inspection.origine.informant': 'indic',
  'inspection.origine.cascade': 'cascade',
  'inspection.origine.forensic': 'forensique',
  'inspection.origine.false_report': 'faux signalement',
  'inspection.origine.genuine_report': 'signalement',
  'inspection.presence.none': 'aucune',
  'inspection.presence.some': 'un peu',
  'inspection.presence.many': 'beaucoup',
  'inspection.presence.predominant': 'surtout',
  // commissariat ⑰ — 8 clés `police.bloc.*` PROPOSÉES, atelier `51-commissariat-mots-2026-09-23.tsv` (même commit ; somme : 27 lignes, 8 clés à
  //     valeur) : 2 pluriels ICU nommés. PROPOSÉ, NON RATIFIÉ.
  'police.bloc.ce_qu_ils_savent': 'Ce qu’ils savent',
  'police.bloc.six_commissariats_releve_de_nos_guetteurs': 'six commissariats · relevé de nos guetteurs',
  'police.bloc.precinct_n': 'Précinct {n}',
  'police.bloc.patrouilles': 'patrouilles',
  'police.bloc.vos_n_batiments_sont_ici': '{n, plural, one {votre bâtiment est ici} other {vos # bâtiments sont ici}}',
  'police.bloc.n_d_entre_eux_vous_chassent': '{n, plural, one {Un d’entre eux vous chasse} other {# d’entre eux vous chassent}} —',
  'police.bloc.aucun_ne_dort': 'aucun ne dort',
  'police.bloc.leurs_descentes': 'Leurs descentes',
  // engagements ㉙ L4 — addendum atelier `40-addendum-engagements-2026-09-23.tsv` (da `24897b48`) : 9 clés PROPOSÉES, NON RATIFIÉES
  //     (somme : 11 lignes, 10 clés à valeur ; la 10ᵉ, `error.engagements.muscle_lieutenant_required`, est RATIFIÉE et reste inchangée — D14).
  'conflit.refus.ce_coup_ne_tient_plus_reprenez_depuis_la_liste': 'Ce coup ne tient plus. Reprenez depuis la liste.',
  'conflit.refus.l_ordre_n_est_pas_parti_il_etait_mal_forme_reessayez': 'L’ordre n’est pas parti : il était mal formé. Réessayez.',
  'conflit.refus.la_ligne_a_coupe_on_ne_sait_pas_si_l_ordre_est_parti_reessayez_il_ne_partira_pas_deux_fois': 'La ligne a coupé : on ne sait pas si l’ordre est parti. Réessayez, il ne partira pas deux fois.',
  'conflit.bloc.derniere_fois_chez_eux': 'La dernière fois là-bas\u00a0: {issue}, et la ville a chauffé {chaleur}.',
  'conflit.issue_phrase.breakthrough': 'une percée',
  'conflit.issue_phrase.advance': 'du terrain gagné',
  'conflit.issue_phrase.hold': 'rien obtenu',
  'conflit.issue_phrase.contested': 'ça s’est disputé',
  'conflit.issue_phrase.retreat': 'on a reculé',
  // ② geste « Commander » — table 54 de l'atelier (`54-commande-precurseurs-2026-09-23.tsv`, da `dfbdb7a6`) : 6 clés PROPOSÉES,
  //     NON RATIFIÉES, une par valeur du pgEnum `precursor_type` (somme : 6 lignes à valeur ; garde de couverture sur l'enum).
  'building.commande.pyralin': 'Commander du Pyralin',
  'building.commande.thalmite': 'Commander de la Thalmite',
  'building.commande.garnet_salt': 'Commander du sel de grenat',
  'building.commande.verdant_root_extract': 'Commander de la racine verdoyante',
  'building.commande.lull_resin': 'Commander de la résine de lull',
  'building.commande.glass_lily': 'Commander du lys de verre',
  // famille ⑦ — table 55 de l'atelier (`55-lieutenant-cles-2026-09-23.tsv`, da `a6159d89`) : 22 clés PROPOSÉES, NON RATIFIÉES, que le
  //     client demande (somme : 22 lignes = 22 mots, 0 composition) ; D17 : U+00A0 avant « : », U+202F avant « ? ».
  'famille.ecran.signal': 'Signal',
  'famille.ecran.ordre_permanent': 'Ordre permanent',
  'famille.signal.a_l_ecoute': 'à l’écoute',
  'famille.signal.derive': 'dérive',
  'famille.signal.n_ecoute_que_le_terrain': 'n’écoute que le terrain',
  'famille.signal.se_recale': 'se recale',
  'famille.ordre.aucun_ordre': 'aucun ordre',
  'famille.ordre.expire_bientot': 'expire bientôt',
  'famille.repere.l_etat_du_terrain': 'l’état du terrain',
  'famille.repere.ce_qu_il_reste': 'ce qu’il reste',
  'famille.repere.l_heure': 'l’heure',
  'famille.repere.ce_que_font_les_autres': 'ce que font les autres',
  // table 55 complément (item i, atelier `1d8541bf`, 2026-09-24) : `cue` = DIRECT_ORDER, même mot que
  // le geste servi `famille.ecran.rappeler_l_ordre_direct`.
  'famille.repere.l_ordre_direct': 'l’ordre direct',
  'famille.ecran.nom_ecoute_autre_chose_que_vos_ordres': '{nom} écoute autre chose que vos ordres',
  'famille.ecran.rappeler_l_ordre_direct': 'Rappeler l’ordre direct',
  'famille.ecran.remettre_l_ecoute_a_zero': 'Remettre l’écoute à zéro',
  'famille.ecran.brouiller_un_repere': 'Brouiller un repère',
  'famille.ecran.ce_qui_est_ecoute_a_la_place': 'ce qui est écouté à la place\u00a0:',
  'famille.question.en_faire_la_regle': 'En faire la règle\u202f?',
  'famille.ecran.son_ordre_du_moment_a_tenu_vous_pouvez_le_renouveler_le_retirer_ou_en_faire_sa_regle_par_defaut': 'Son ordre du moment a tenu. Vous pouvez le renouveler, le retirer, ou en faire sa règle par défaut.',
  'famille.ecran.en_faire_la_regle': 'En faire la règle',
  'famille.ecran.renouveler': 'Renouveler',
  'famille.ecran.retirer': 'Retirer',
  // délégation ㉜ — table 56 de l'atelier (`56-delegation-maitrise-2026-09-23.tsv`, da `160556c9`) : 15 clés PROPOSÉES, NON RATIFIÉES
  //     (somme : 18 lignes = 14 mots + 4 compléments ; 16 clés à valeur dont 1 déjà servie, réécrite en place — D13, ㉜ non ratifiée).
  'delegation.maitrise.nascent': 'vous apprenez encore',
  'delegation.maitrise.learning': 'pas encore prête',
  'delegation.maitrise.practiced': 'presque prête',
  'delegation.maitrise.eligible': 'prête à confier',
  'delegation.maitrise.recovery': 'se remet encore',
  'delegation.maitrise.recall_scar': 'reprise une fois déjà',
  'delegation.maitrise.tenue': 'tenue pour vous',
  'delegation.charge_phrase.route_assignment': 'les tournées',
  'delegation.charge_phrase.lieutenant_hiring': 'l’embauche',
  'delegation.charge_phrase.supply_sourcing': 'l’approvisionnement',
  'delegation.charge_phrase.heat_management': 'la chaleur',
  'delegation.replique.route_assignment': '«\u00a0Donnez-moi les tournées. Je m’en occupe, et vous ne choisirez plus qui livre quoi.\u00a0»',
  'delegation.replique.lieutenant_hiring': '«\u00a0Donnez-moi l’embauche. Je m’en occupe, et vous ne choisirez plus qui entre dans la maison.\u00a0»',
  'delegation.replique.supply_sourcing': '«\u00a0Donnez-moi l’approvisionnement. Je m’en occupe, et vous ne verrez plus passer les commandes.\u00a0»',
  'delegation.replique.heat_management': '«\u00a0Donnez-moi la chaleur. Je m’en occupe, et vous ne déciderez plus quoi faire quand la ville s’échauffe.\u00a0»',
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
    'Pour {outlet}, l’affaire de {district} relève de la défaillance malheureuse, sans intention.',
  'news_beat.cooper_affair.accident.brennar_daily_star.body':
    'L’incident de {district} résulterait d’un enchaînement de circonstances actuellement à l’étude. Aucune intention n’a été établie et il ne conviendrait pas, suggère-t-on, d’en inférer une. Un examen paraîtrait devoir être conduit en temps utile ; aucun calendrier n’a été communiqué.',
  'news_beat.cooper_affair.accident.brennar_daily_star.headline':
    'Un enchaînement de circonstances à {district}, actuellement à l’étude',
  'news_beat.cooper_affair.accident.free_weekly.body':
    'La faute à personne, circulez, on passe à autre chose — c’est la version officielle, en tout cas. Le quartier tient ses propres comptes, et le compte dit : encore un, toujours au même endroit. Sans blague.',
  'news_beat.cooper_affair.accident.free_weekly.headline':
    'Un accident. À {district}. Encore un',
  'news_beat.cooper_affair.accident.headline':
    'Ce qui a mal tourné à {district}',
  'news_beat.cooper_affair.accident.tilbey_weekly.body':
    'À {district}, on balaie encore et on se demande encore comment. À la boulangerie comme à l’arrêt de bus, le mot est le même : la guigne, celle qui tombe toujours sur les mêmes paillassons. « On rafistole et on attend la suivante », dit une commerçante.',
  'news_beat.cooper_affair.accident.tilbey_weekly.headline':
    'La guigne à {district} — celle qui choisit son adresse',
  'news_beat.cooper_affair.corruption.body':
    'Pour {outlet}, l’affaire de {district} est une question de qui en a profité, et comment.',
  'news_beat.cooper_affair.corruption.brennar_daily_star.body':
    'Les questions relatives au dossier de {district} mériteraient un examen ; il reste à établir à qui la situation aura pu profiter. Un dispositif de suivi serait à l’étude. Les services concernés, sollicités, n’ont pas répondu.',
  'news_beat.cooper_affair.corruption.brennar_daily_star.headline':
    'Des questions relatives à {district} mériteraient un examen',
  'news_beat.cooper_affair.corruption.free_weekly.body':
    'L’argent a circulé, les services aussi, et c’est le quartier qui paie l’addition. Dossier ouvert, dossier clos : rien trouvé. Ils ont cherché, qu’ils disent. Tu m’étonnes.',
  'news_beat.cooper_affair.corruption.free_weekly.headline':
    'Les mains propres, à {district} ? Tiens donc',
  'news_beat.cooper_affair.corruption.headline':
    'Des questions d’influence suivent l’affaire de {district}',
  'news_beat.cooper_affair.corruption.tilbey_weekly.body':
    'Faites le tour de {district} : du boulanger à l’arrêt de bus, c’est la même chose — l’argent a circulé, et quelqu’un s’en est bien sorti. « On n’est pas nés de la dernière pluie », dit un riverain. Des habitants ont écrit pour demander des comptes ; les courriers, à ce jour, sont restés sans réponse.',
  'news_beat.cooper_affair.corruption.tilbey_weekly.headline':
    'Du boulanger à l’arrêt de bus, {district} pose la même question',
  'news_beat.cooper_affair.neighborhood_failure.body':
    'Pour {outlet}, l’affaire s’inscrit dans un abandon plus ancien à {district}.',
  'news_beat.cooper_affair.neighborhood_failure.brennar_daily_star.body':
    'L’incident de {district} serait imputable à des difficultés qui lui seraient antérieures de plusieurs années. L’entretien des services du secteur a fait l’objet d’examens antérieurs, dont les conclusions n’ont pas été rendues publiques. Un nouvel examen serait à l’étude.',
  'news_beat.cooper_affair.neighborhood_failure.brennar_daily_star.headline':
    'Les conditions à {district} seraient antérieures de plusieurs années à l’incident',
  'news_beat.cooper_affair.neighborhood_failure.free_weekly.body':
    'Même quartier, même abandon, nouveau titre. Ils viendront prendre des photos, puis retour à la normale — et la normale, par ici, c’est que rien ne marche. Même page la prochaine fois.',
  'news_beat.cooper_affair.neighborhood_failure.free_weekly.headline':
    '{district}, livré à lui-même. Comme d’hab',
  'news_beat.cooper_affair.neighborhood_failure.headline':
    '{district} livré à lui-même, encore une fois',
  'news_beat.cooper_affair.neighborhood_failure.tilbey_weekly.body':
    'L’histoire de {district} est plus vieille que l’incident : des lignes de bus supprimées, des courriers sans réponse, des promesses passées à autre chose. Ici, on a demandé, deux fois, par écrit, et on a gardé les copies. Cette semaine la facture est tombée, et elle est tombée ici.',
  'news_beat.cooper_affair.neighborhood_failure.tilbey_weekly.headline':
    '{district} l’avait vu venir — et l’avait écrit',
  'news_beat.cooper_affair.organized_crime.body':
    'Pour {outlet}, l’affaire de {district} porte la marque d’une opération organisée.',
  'news_beat.cooper_affair.organized_crime.brennar_daily_star.body':
    'Certains aspects de l’incident de {district} suggéreraient un degré de coordination ; une telle appréciation resterait préliminaire. Notre rédaction n’a pas confirmé de manière indépendante les témoignages sur lesquels elle repose, et les services concernés n’ont pas souhaité en dire davantage.',
  'news_beat.cooper_affair.organized_crime.brennar_daily_star.headline':
    'Des indices de coordination à {district} seraient en cours d’appréciation',
  'news_beat.cooper_affair.organized_crime.free_weekly.body':
    'Quelqu’un a monté le coup et tout le quartier le sait. Les seuls à parler encore de mystère ont une fiche de paie qui en dépend. Il y a une enquête, qu’ils disent. En cours, qu’ils disent. Tiens donc.',
  'news_beat.cooper_affair.organized_crime.free_weekly.headline':
    'Organisé ? À {district} ? Sans blague',
  'news_beat.cooper_affair.organized_crime.headline':
    'Une main connue derrière l’affaire de {district}',
  'news_beat.cooper_affair.organized_crime.tilbey_weekly.body':
    'Plus d’un voisin de {district} dit la même chose sur le pas de la porte : trop propre et trop rapide pour être le hasard. « Un travail pareil, ça se prépare », dit un commerçant, et il baisse la voix pour le dire. D’autres gardent la porte fermée — ce qui dit aussi quelque chose.',
  'news_beat.cooper_affair.organized_crime.tilbey_weekly.headline':
    'Trop propre, trop rapide : {district} tire ses conclusions',
  'news_beat.digest.ambient_micro.body':
    '{outlet} relève une scène de rue : {subject}, {district}.',
  'news_beat.digest.ambient_micro.brennar_daily_star.body':
    'Un certain nombre de faits mineurs ont été consignés à {district} cette semaine. Aucun ne paraîtrait, à ce stade, appeler un examen complémentaire. Le relevé est conservé.',
  'news_beat.digest.ambient_micro.brennar_daily_star.headline':
    'Fait mineur consigné à {district} : {subject}',
  'news_beat.digest.ambient_micro.free_weekly.body':
    'Des petites choses. Des choses de coin de rue. Ce qu’aucun officiel ne compte et que tout le quartier remarque. Noté ici, donc, puisqu’il faut bien que quelqu’un le fasse.',
  'news_beat.digest.ambient_micro.free_weekly.headline':
    'Pendant ce temps, à {district} : {subject}',
  'news_beat.digest.ambient_micro.headline':
    'Petites histoires de {district} : {subject}',
  'news_beat.digest.ambient_micro.tilbey_weekly.body':
    'Les petites choses de {district} cette semaine — le genre qui ne fait jamais la une et dont on parle tout le temps au comptoir.',
  'news_beat.digest.ambient_micro.tilbey_weekly.headline':
    'Petite nouvelle de {district}, qui reste une nouvelle : {subject}',
  'news_beat.digest.live_ops.body':
    '{outlet} rapporte une évolution à l’échelle de la ville : {subject}.',
  'news_beat.digest.live_ops.brennar_daily_star.body':
    'Un avis de portée générale circule dans l’ensemble de la ville. Ses effets pratiques, pour autant qu’ils puissent être appréciés à ce stade, paraîtraient variables ; il est recommandé aux habitants de se reporter à l’avis lui-même.',
  'news_beat.digest.live_ops.brennar_daily_star.headline':
    'Avis de portée générale : {subject}',
  'news_beat.digest.live_ops.free_weekly.body':
    'Encore un avis pour tout Brennar. Tout le monde est concerné ; personne n’a été consulté. À l’heure qu’il est, il est sur tous les murs.',
  'news_beat.digest.live_ops.free_weekly.headline':
    'Nouvel avis : {subject}. C’est noté',
  'news_beat.digest.live_ops.headline':
    'Un avis circule : {subject}',
  'news_beat.digest.live_ops.tilbey_weekly.body':
    'Un nouvel avis circule en ville. Ce qu’il veut dire dépend, comme toujours, de la rue où l’on habite. Ici, on compare déjà au comptoir.',
  'news_beat.digest.live_ops.tilbey_weekly.headline':
    'Un avis : {subject}, et ce que ça veut dire dans nos rues',
  'news_beat.digest.political.body':
    '{outlet} couvre une évolution politique : {subject}.',
  'news_beat.digest.political.brennar_daily_star.body':
    'Les travaux se poursuivraient à l’hôtel de ville ; un communiqué serait attendu en temps utile. Les services concernés n’ont pas souhaité en préjuger le contenu.',
  'news_beat.digest.political.brennar_daily_star.headline':
    'À l’hôtel de ville, les délibérations se poursuivraient : {subject}',
  'news_beat.digest.political.free_weekly.body':
    'Des réunions, des déclarations, la météo habituelle de l’hôtel de ville. Ce que ça veut dire pour le quartier : on verra bien. Ce que le quartier en attend : pas grand-chose.',
  'news_beat.digest.political.free_weekly.headline':
    'L’hôtel de ville a fait un truc : {subject}',
  'news_beat.digest.political.headline':
    'Les affaires de l’hôtel de ville : {subject}',
  'news_beat.digest.political.tilbey_weekly.body':
    'Quelque chose bouge à l’hôtel de ville, et ici on a appris à lire ça comme les marins lisent le temps. Quoi qu’il tombe, ça tombe d’abord sur des rues comme les nôtres.',
  'news_beat.digest.political.tilbey_weekly.headline':
    'L’hôtel de ville s’agite, les quartiers en prennent note : {subject}',
  'news_beat.digest.random_world.body':
    '{outlet} relève un trouble non résolu, en lien avec {subject}, à {district}.',
  'news_beat.digest.random_world.brennar_daily_star.body':
    'Un trouble à {district} demeurerait, semble-t-il, non résolu. Les circonstances seraient à l’examen des services compétents ; aucun calendrier n’a été communiqué.',
  'news_beat.digest.random_world.brennar_daily_star.headline':
    'Trouble consigné à {district} : {subject}',
  'news_beat.digest.random_world.free_weekly.body':
    'Le truc de {district} ? Toujours en cours. Personne, là-haut, n’a dit un mot. Le quartier n’en attendait pas.',
  'news_beat.digest.random_world.free_weekly.headline':
    'Toujours en cours, à {district} : {subject}',
  'news_beat.digest.random_world.headline':
    'Troubles signalés à {district} : {subject}',
  'news_beat.digest.random_world.tilbey_weekly.body':
    'Au comptoir, à {district}, on dit que les ennuis ne sont pas retombés. On veille les uns sur les autres et on attend, encore, que quelqu’un dise quelque chose d’officiel.',
  'news_beat.digest.random_world.tilbey_weekly.headline':
    'À {district}, ça n’est pas retombé, disent les voisins : {subject}',
  'news_beat.folded_page.body':
    'Deux autres titres ont rapporté {subject} à {district} ; {outlet} n’a pas publié l’article.',
  'news_beat.folded_page.brennar_daily_star.body':
    'Deux journaux ont repris l’affaire de {district} cette semaine. Le quotidien de référence de la ville n’en était pas. Aucune explication n’a été donnée — et aucune, on le suppose, ne figure au dossier.',
  'news_beat.folded_page.brennar_daily_star.headline':
    'La page pliée : {subject}, à {district} — rien dans le quotidien de référence',
  'news_beat.folded_page.free_weekly.body':
    'Deux titres ont publié l’affaire de {district}. Le gratuit — celui qui imprime à peu près tout — ne l’a pas fait. Quand cette page-là se tait, c’est le silence qui est l’affaire.',
  'news_beat.folded_page.free_weekly.headline':
    'La page pliée : même le gratuit saute {subject}, à {district}',
  'news_beat.folded_page.headline':
    'Ce que {outlet} n’a pas couvert à {district} : {subject}',
  'news_beat.folded_page.tilbey_weekly.body':
    'L’affaire de {district} a paru dans deux journaux cette semaine — sauf dans celui qui est le plus proche de chez soi. L’hebdo du quartier a gardé ses pages pour autre chose. Sur les pas de porte, on remarque ce genre de silence.',
  'news_beat.folded_page.tilbey_weekly.headline':
    'La page pliée : l’hebdo de {district} passe sous silence {subject}',
  'news_beat.hindsight.follow_up.body':
    '{outlet} poursuit sa série rétrospective sur {subject}.',
  'news_beat.hindsight.follow_up.brennar_daily_star.body':
    'Poursuivant son examen, notre rédaction consigne de nouveaux détails de la période qui a précédé l’événement. Comme précédemment, leur portée paraîtrait plus nette rétrospectivement qu’elle n’a pu l’être sur le moment. L’examen se poursuit.',
  'news_beat.hindsight.follow_up.brennar_daily_star.headline':
    'Nouvelles observations sur un dossier déjà examiné : {subject}',
  'news_beat.hindsight.follow_up.free_weekly.body':
    'La rétrospective continue. D’autres signes, la même forme : vus dans la rue, ratés là-haut. On pourrait régler sa montre dessus — si quoi que ce soit était à l’heure par ici.',
  'news_beat.hindsight.follow_up.free_weekly.headline':
    'Encore des avertissements pour {subject}. Toujours personne pour les prendre',
  'news_beat.hindsight.follow_up.headline':
    'Encore sur {subject} : la rétrospective continue',
  'news_beat.hindsight.follow_up.tilbey_weekly.body':
    'La série continue, et les conversations sur le pas de la porte aussi : un voisin de plus, une petite chose de plus remarquée sur le moment et mise de côté. Morceau par morceau, ça finit par faire un tableau. Nous continuons de recueillir.',
  'news_beat.hindsight.follow_up.tilbey_weekly.headline':
    'Ce dont le quartier se souvient encore : {subject}',
  'news_beat.hindsight.op_ed.body':
    '{outlet} ouvre une rétrospective sur {subject}, retraçant des indices antérieurs qui, selon le journal, étaient là depuis le début.',
  'news_beat.hindsight.op_ed.brennar_daily_star.body':
    'Le dossier étant désormais clos, l’examen des mois qui l’ont précédé fait apparaître un certain nombre d’indices qui, semble-t-il, étaient alors disponibles. Qu’il eût été raisonnable d’y donner suite est une question que notre rédaction ne prétend pas trancher. Un bilan plus complet serait souhaitable ; qu’il soit entrepris reste à établir.',
  'news_beat.hindsight.op_ed.brennar_daily_star.headline':
    'Rétrospectivement : des indices auraient précédé {subject}',
  'news_beat.hindsight.op_ed.free_weekly.body':
    'Maintenant que c’est fini, tout le monde sait lire les signes. Curieux, comme ça marche. Les signes étaient au coin de la rue depuis le début — demandez à ceux qui s’y tiennent. Personne, là-haut, n’a demandé à l’époque. Ils demanderont maintenant : dans des rapports, au passé, et sans aucun nom dedans.',
  'news_beat.hindsight.op_ed.free_weekly.headline':
    'Les avertissements étaient là, avant {subject}. Et tout le monde les ignorait',
  'news_beat.hindsight.op_ed.headline':
    'Rétrospective : les signes avant {subject}',
  'news_beat.hindsight.op_ed.tilbey_weekly.body':
    'Avec le recul, les signes étaient en pleine lumière : les petits ennuis, le silence bizarre, les plaintes au comptoir qui n’allaient jamais nulle part. Ici, tout le monde se souvient d’avoir remarqué quelque chose. Personne ne se souvient qu’on le lui ait demandé. Cette série, c’est le quartier qui fait l’addition — tard, mais noir sur blanc.',
  'news_beat.hindsight.op_ed.tilbey_weekly.headline':
    'Avant {subject}, tout le monde avait remarqué quelque chose. Personne n’a été interrogé',
  'news_beat.slow_page.continuing.body':
    '{outlet} poursuit sa série au long cours sur {district}.',
  'news_beat.slow_page.continuing.brennar_daily_star.body':
    'L’examen permanent que notre rédaction consacre aux conditions à {district} se poursuit. Le schéma précédemment relevé paraîtrait persister ; les services qui en ont été saisis n’ont pas encore répondu. Le dossier, entre-temps, s’épaissit.',
  'news_beat.slow_page.continuing.brennar_daily_star.headline':
    'Conditions à {district} : l’examen se poursuit',
  'news_beat.slow_page.continuing.free_weekly.body':
    'La page au long cours continue de courir. {district} continue de fournir ; on continue d’imprimer. Un officiel lit ça, on suppose. À la semaine prochaine.',
  'news_beat.slow_page.continuing.free_weekly.headline':
    '{district}, toujours là-dedans',
  'news_beat.slow_page.continuing.headline':
    'La page lente continue : {district}',
  'news_beat.slow_page.continuing.tilbey_weekly.body':
    'Une semaine de plus à {district}, une entrée de plus sur la page au long cours : les mêmes coins de rue, les mêmes plaintes, quelques noms nouveaux sur la même vieille liste. Maintenant, on nous arrête dans la rue pour l’allonger. Nous notons tout.',
  'news_beat.slow_page.continuing.tilbey_weekly.headline':
    '{district}, une semaine de plus sur la même page',
  'news_beat.slow_page.opening.body':
    '{outlet} ouvre une série au long cours sur les conditions à {district}, avec d’autres volets à suivre dans les semaines à venir.',
  'news_beat.slow_page.opening.brennar_daily_star.body':
    'Notre rédaction ouvre aujourd’hui un examen permanent des conditions à {district}, lesquelles paraîtraient, au vu des indices disponibles, mériter une attention soutenue. Les volets suivront à intervalle hebdomadaire, selon ce que la matière justifiera.',
  'news_beat.slow_page.opening.brennar_daily_star.headline':
    'Ouverture d’un examen permanent des conditions à {district}',
  'news_beat.slow_page.opening.free_weekly.body':
    'Nouvelle page au long cours sur {district}. Pourquoi : parce qu’il n’arrête pas de la mériter. On la tiendra tant que {district} fournira la matière, et {district} ne montre aucun signe d’arrêt.',
  'news_beat.slow_page.opening.free_weekly.headline':
    '{district} a droit à sa page. Il l’a bien méritée',
  'news_beat.slow_page.opening.headline':
    'La page lente : un récit au long cours prend forme à {district}',
  'news_beat.slow_page.opening.tilbey_weekly.body':
    'À partir de cette semaine, {district} a sa propre page au long cours : les boutiques, les pas de porte, les choses qui n’arrêtent pas d’attendre leur réparation. Pas parce qu’il s’est passé une grosse chose — parce que beaucoup de petites choses n’arrêtent pas d’arriver aux mêmes gens. La même page, chaque semaine.',
  'news_beat.slow_page.opening.tilbey_weekly.headline':
    '{district}, semaine un : nous allons continuer de regarder',
  'news_beat.sourceless_beat.body':
    '{outlet} décrit un schéma qui prend forme à {district} — aucun incident précis n’est cité.',
  'news_beat.sourceless_beat.brennar_daily_star.body':
    'Prises ensemble, les impressions récentes venues de {district} paraîtraient décrire un schéma, sans qu’aucun fait précis ait à être cité pour l’établir. Les observateurs du secteur partageraient cette appréciation. Un examen complémentaire paraîtrait justifié.',
  'news_beat.sourceless_beat.brennar_daily_star.headline':
    'Un schéma paraîtrait se dessiner à {district}',
  'news_beat.sourceless_beat.free_weekly.body':
    'Aucun incident à montrer du doigt, aucun nom, aucune adresse. Juste une humeur dans le quartier — et le quartier ne se trompe jamais. Enfin, c’est ce qu’on dit. Prenez-le pour ce que ça vaut ; c’est ce qu’on a fait.',
  'news_beat.sourceless_beat.free_weekly.headline':
    'Il se passe un truc à {district}. Demandez à n’importe qui',
  'news_beat.sourceless_beat.headline':
    'Un schéma, dit {outlet}, à {district}',
  'news_beat.sourceless_beat.tilbey_weekly.body':
    'Personne ne peut désigner une chose précise, mais faites le tour de {district} — au comptoir, à l’arrêt de bus — et le sentiment est le même : quelque chose a bougé. Rien qu’on puisse vraiment rapporter. Tout ce qu’on peut sentir.',
  'news_beat.sourceless_beat.tilbey_weekly.headline':
    'Quelque chose cloche à {district}, et les gens le sentent',
  'news_beat.three_outlet_storm.episodic.body':
    '{outlet} centre sa couverture sur les personnes directement touchées par {subject} à {district}.',
  'news_beat.three_outlet_storm.episodic.brennar_daily_star.body':
    'Une reconstitution de l’incident de {district}, pour autant que les témoignages disponibles en permettent une, décrirait un fait isolé ; il serait prématuré d’en apprécier une portée plus large. Les services concernés ont été sollicités.',
  'news_beat.three_outlet_storm.episodic.brennar_daily_star.headline':
    'Un état des faits à {district} : {subject}',
  'news_beat.three_outlet_storm.episodic.free_weekly.body':
    'Une famille, un gâchis, un incident — voilà toute l’histoire, qu’ils disent. Pas de schéma, pas de contexte, pas de questions là-haut. Le quartier le rangera avec tous les autres cas isolés.',
  'news_beat.three_outlet_storm.episodic.free_weekly.headline':
    'Un de plus pour {district} : {subject}',
  'news_beat.three_outlet_storm.episodic.headline':
    'Une famille, une histoire : {subject} à {district}',
  'news_beat.three_outlet_storm.episodic.tilbey_weekly.body':
    'Derrière une porte, à {district}, une famille recolle une semaine. Les voisins ont apporté du pain et gardé les enfants une après-midi. « On se débrouille », dit la mère — comme on le dit quand on a déjà eu à le faire.',
  'news_beat.three_outlet_storm.episodic.tilbey_weekly.headline':
    'Une porte à {district} : ce que {subject} a laissé',
  'news_beat.three_outlet_storm.human_interest.body':
    '{outlet} suit les personnes les plus touchées par {subject} à {district}.',
  'news_beat.three_outlet_storm.human_interest.brennar_daily_star.body':
    'Pour les habitants de {district}, les suites ont entraîné une série d’ajustements pratiques, décrits à notre rédaction comme considérables. Des mesures d’accompagnement seraient à l’examen des services compétents.',
  'news_beat.three_outlet_storm.human_interest.brennar_daily_star.headline':
    'Les habitants de {district} s’adaptent après {subject}',
  'news_beat.three_outlet_storm.human_interest.free_weekly.body':
    'Pas de commission, pas de plan, pas de déclaration. Juste des voisins qui font ce que font les voisins pendant que tout ce qui est officiel reste très occupé à être injoignable. Quelqu’un devrait le noter. Aucun officiel ne le fera.',
  'news_beat.three_outlet_storm.human_interest.free_weekly.headline':
    'À {district}, on se débrouille, même après {subject}',
  'news_beat.three_outlet_storm.human_interest.headline':
    'Une histoire de quartier : {subject}',
  'news_beat.three_outlet_storm.human_interest.tilbey_weekly.body':
    'À {district} cette semaine, les portes sont restées ouvertes un peu plus longtemps que d’habitude. Le boulanger a mis de côté les invendus, une voisine à la retraite accompagne les enfants à l’école, et personne n’appelle ça de l’aide. « On le fait, c’est tout », dit-elle. C’est toute la citation, et elle suffit.',
  'news_beat.three_outlet_storm.human_interest.tilbey_weekly.headline':
    'À {district}, après {subject}, la cafetière reste chaude',
  'news_beat.three_outlet_storm.scandal.body':
    '{outlet} pose {subject} comme une question de responsabilité.',
  'news_beat.three_outlet_storm.scandal.brennar_daily_star.body':
    'L’incident de {district} a fait naître des questions de responsabilité qui, semble-t-il, demeurent ouvertes. Quel service en porte la charge n’a pu être établi à l’heure du bouclage. Les demandes d’éclaircissement feraient l’objet d’un traitement.',
  'news_beat.three_outlet_storm.scandal.brennar_daily_star.headline':
    'Des questions de responsabilité resteraient ouvertes : {subject}, à {district}',
  'news_beat.three_outlet_storm.scandal.free_weekly.body':
    'Quelqu’un est responsable. Il y a toujours quelqu’un, et ce n’est jamais personne. Demandez là-haut, c’est la procédure ; demandez la procédure, c’est là-haut. Et ça tourne. Dans les deux cas, c’est le quartier qui reste avec l’addition.',
  'news_beat.three_outlet_storm.scandal.free_weekly.headline':
    'Qui a signé pour {subject} ? {district} a demandé. Personne, apparemment',
  'news_beat.three_outlet_storm.scandal.headline':
    'À qui la responsabilité : {subject}',
  'news_beat.three_outlet_storm.scandal.tilbey_weekly.body':
    'Quelqu’un a approuvé, quelqu’un a signé, et personne à {district} n’obtient l’un ou l’autre nom. Les commerçants ont commencé une liste de tous ceux à qui ils ont demandé. La liste s’allonge, et elle n’est faite que de questions.',
  'news_beat.three_outlet_storm.scandal.tilbey_weekly.headline':
    'Quelqu’un a signé pour {subject} — {district} aimerait lui parler',
  'news_beat.three_outlet_storm.thematic.body':
    '{outlet} replace {subject} dans un contexte qui traverse la ville, et non dans un incident isolé.',
  'news_beat.three_outlet_storm.thematic.brennar_daily_star.body':
    'Rapporté à des faits comparables ailleurs dans Brennar, l’incident de {district} paraîtrait s’accorder à un schéma plus large, dont les contours restent à définir. Une appréciation à l’échelle de la ville paraîtrait justifiée ; aucune n’a été annoncée.',
  'news_beat.three_outlet_storm.thematic.brennar_daily_star.headline':
    'Des tendances plus larges derrière {subject}, à {district}',
  'news_beat.three_outlet_storm.thematic.free_weekly.body':
    'La même histoire dans toute la ville, une adresse différente chaque semaine. Dites que c’est un schéma et un officiel vous dira que vous dramatisez. Très bien. Le quartier, lui, appelle ça l’ordinaire.',
  'news_beat.three_outlet_storm.thematic.free_weekly.headline':
    '{district} aujourd’hui, ailleurs demain : {subject}',
  'news_beat.three_outlet_storm.thematic.headline':
    'Un schéma qui traverse la ville derrière {subject}',
  'news_beat.three_outlet_storm.thematic.tilbey_weekly.body':
    'Ce qui s’est passé à {district} s’est passé, à sa manière, quelques arrêts de bus plus loin. Les mêmes plaintes au comptoir, les mêmes courriers, la même attente. Au marché, on compare maintenant, et les récits concordent.',
  'news_beat.three_outlet_storm.thematic.tilbey_weekly.headline':
    'Après {subject}, {district} n’est pas un cas isolé — demandez au quartier d’à côté',
  'news_beat.wire_day.body':
    'La même dépêche parvient ce matin à {outlet}, identique à celle des autres titres : {subject}.',
  'news_beat.wire_day.headline':
    '{outlet} publie la dépêche : {subject}',
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
    'Le Clairon de Brennar',
  'press.outlet.free_weekly.name':
    'La Feuille libre',
  'press.outlet.tilbey_weekly.name':
    'La Semaine de Tilbey',

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
    'une inspection d’immeuble',
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
    'la poussée d’expansion de Coil',
  'live_ops.event.E-LO-04':
    'une anomalie du marché des substances',
  'live_ops.event.E-LO-05':
    'la journée des investisseurs à Glass',
  'live_ops.event.E-LO-06':
    'la contre-opération d’un rival',
  'live_ops.event.E-LO-07':
    'l’alerte au dégel de la cohésion',
  'live_ops.event.E-LO-08':
    'le surplus de main-d’œuvre à Saltline',
  'live_ops.event.E-LO-09':
    'les préparatifs de la Semaine de compression',
  'live_ops.event.E-LO-10':
    'la fenêtre d’audit structurel annuel',
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
    'la campagne d’influence d’un rival',
  'political.event.E-POL-06':
    'l’initiative anticorruption',
  'political.event.E-POL-07':
    'l’assouplissement du zonage industriel',
  'political.event.E-POL-08':
    'le coup de filet sur les quais',
  'political.event.E-POL-09':
    'le scandale de l’hôtel de ville',
  'political.event.E-POL-10':
    'la victoire de l’opposition à la mairie',
  'political.event.E-POL-11':
    'l’arrivée d’une brigade fédérale',
  'political.event.E-POL-12':
    'l’arrivée d’un élu de quartier bienveillant',
  'random_world.coupling.pair.erlang_stash__deal_lek':
    'ce que tient votre réserve et ce que la rue vient disputer',
  'random_world.coupling.pair.offhours_hum__bpd_attention':
    'travailler en dehors des heures et l’endroit où la police regarde ensuite',
  'random_world.template.absconding':
    'la disparition',
  'random_world.template.apparent_recovery':
    'l’embellie apparente',
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
    '{n, plural, one {Un local à remettre en état} other {Des locaux à remettre en état}}',
  'decision.type.SEVERED_ROUTE_REBUILD':
    '{n, plural, one {Une route coupée} other {Des routes coupées}}',
  'decision.type.ESCALATION_BACKLOG_REVIEW':
    'Des remontées en attente',
  'decision.type.AUTONOMY_REPORTS_PENDING':
    'Des rapports à lire',
  'decision.type.LEGAL_CASE_DECISION':
    'Une affaire chez le juge',
  'decision.type.BACKPRESSURE_CRITICAL_TRACE':
    'Un engorgement critique',
  'decision.type.MYCELIAL_STRESSED_LEG':
    '{n, plural, one {Un maillon sous tension} other {Des maillons sous tension}}',
  'decision.type.CUE_CASCADE_FALLOUT':
    'Une cascade de signaux',
  'decision.type.BUILDING_ACQUISITION':
    'Acquisition d’un local',
  'decision.type.BUILDING_CONVERT':
    'Reconversion d’un local',
  'decision.type.LIEUTENANT_RECRUIT':
    'Recrutement d’un lieutenant',
  'decision.type.LIEUTENANT_ROLE_REASSIGN':
    'Changement de poste',
  'decision.type.BEHAVIOR_SCRIPT_REPLACE':
    'Nouvelles consignes permanentes',
  'decision.type.AUTONOMY_TIER_CHANGE':
    'Relèvement du plafond d’autonomie',
  'decision.type.TASK_RETIREMENT':
    'Passation définitive d’une tâche',
  'decision.type.TASK_RECALL':
    'Reprise en main d’une tâche',
  'decision.type.ORG_TOPOLOGY_CHANGE':
    'Remaniement de l’organigramme',
  'decision.type.SINUOSITY_FULL_RESET':
    'Refonte complète d’un tracé',
  'decision.type.MYCELIAL_STRUCTURAL_REINFORCE':
    'Renforcement de fond du réseau',
  'decision.type.NODE_DECOMMISSION':
    'Mise hors service d’un point',
  'decision.type.SUBSTANCE_UNLOCK':
    'Ouverture d’une filière',
  'decision.type.RECRUITMENT_FINALIZE':
    'Embauche définitive',
  'decision.type.NAMED_SEQUENCE_SAVE':
    'Enregistrement d’une séquence',
  'decision.type.CAPABILITY_ADOPT':
    'Adoption d’un savoir-faire',
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
  // D10 (item j, 2026-09-24) — U+0027 -> U+2019.
  'hl.option.damaged_building.leave_damaged':
    'Laisser en l’état',
  'hl.option.escalation_backlog.review_now':
    'Aller les lire',
  'hl.option.escalation_backlog.leave_pending':
    'Laisser en attente',
  'hl.option.legal_case.accept_plea_deal':
    'Accepter l’arrangement',
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
    'Un quartier a bougé, et le quartier d’à côté a suivi — ces deux-là tiennent ensemble, maintenant vous le savez.',
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
    'Affiner d’abord',
  'autonomy.launder.baseline':
    'Injecter comme d’habitude',
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
    'Ne rien faire pour l’instant',
  'autonomy.facility.schedule_now':
    'Faire l’entretien maintenant',
  'autonomy.facility.wait':
    'Laisser pour l’instant',
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
  // ⚠️ SANS clé, parce que SANS texte ratifié (dit, pas inventé) : `building.vehicle.refrigerated_van`,
  //    les membres `NONE` de lab_tier/hub_tier/money_holding_tier/roster/
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
  // 2026-09-23 — `press_house` et `office` reçoivent leurs mots de l'atelier (`22-interieur-district-fiche-inventaire.md` §7.1, DA `c59ed038`).
  'building.type.press_house':
    'Imprimerie',
  'building.type.office':
    'Agence',
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
    'de base',
  'building.lab_tier.refined':
    'amélioré',
  'building.lab_tier.master':
    'au meilleur niveau',
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
    'Bouture',
  'building.grow_stage.mid':
    'Croissance',
  'building.grow_stage.late':
    'Floraison',
  'building.grow_stage.done':
    'Récolte',
  'building.husbandry.withered':
    'À soigner',
  'building.husbandry.on_track':
    'Correcte',
  'building.husbandry.thriving':
    'Vigoureuse',
  'building.precursor.verdant_root_extract':
    'Racine verdoyante',
  'building.precursor.lull_resin':
    'Résine de lull',
  'building.precursor.glass_lily':
    'Lys de verre',
  // Brindle — les 3 précurseurs canoniques (atelier 39, da `893ede79`) : pyralin et thalmite noms propres (fr == en) ; garnet_salt fr PROPOSÉ.
  'building.precursor.pyralin': 'Pyralin',
  'building.precursor.thalmite': 'Thalmite',
  'building.precursor.garnet_salt': 'Sel de grenat',
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
  // ═══ TABLE 57 (atelier 0ddb3933, commande f2 24/09, HL v7.6 §14) — 16 clés de conséquence
  //     projetée des cartes de tête ④ (`hl.option.<f>.<o>.projected_consequence`), PROPOSÉES. ═══
  'hl.option.damaged_building.repair_via_queue.projected_consequence': 'Chaque réparation se paie tout de suite, tant que l’argent suit ; les travaux finis, l’activité reprend.',
  'hl.option.damaged_building.leave_damaged.projected_consequence': 'Rien n’est payé, mais ce qui est endommagé reste à l’arrêt, et le manque à gagner court.',
  'hl.option.severed_route.reroute_now.projected_consequence': 'Un détour est tracé pour chaque route et payé tout de suite, tant que l’argent suit ; le passage rouvre une fois les travaux finis.',
  'hl.option.severed_route.leave_severed.projected_consequence': 'Rien n’est payé, mais ce qui est coupé le reste : plus rien n’y passe.',
  'hl.option.legal_case.accept_plea_deal.projected_consequence': 'L’affaire se referme tout de suite, à des conditions négociées : plus de verdict à attendre, ni à redouter.',
  'hl.option.legal_case.let_ride.projected_consequence': 'L’affaire suit son cours jusqu’au verdict : il peut vous être favorable, ou tourner mal.',
  'hl.option.mycelial_stressed_leg.maintain_now.projected_consequence': 'Un entretien rapide et peu coûteux, payé tout de suite pour chaque maillon, tant que l’argent suit : la tension retombe sans arrêter les livraisons.',
  'hl.option.mycelial_stressed_leg.leave_stressed.projected_consequence': 'Rien n’est payé, mais chaque passage ajoute à l’usure : la rupture se rapproche.',
  'hl.option.backpressure_critical_trace.trace_now.projected_consequence': 'Vous allez voir d’où vient l’engorgement : rien n’y est touché, rien n’est payé.',
  'hl.option.backpressure_critical_trace.leave_pending.projected_consequence': 'L’engorgement reste où il est, et freine tout ce qui passe par là.',
  'hl.option.autonomy_reports.review_now.projected_consequence': 'Vous ouvrez les rapports : chaque point attend votre choix, rien n’est tranché à votre place.',
  'hl.option.autonomy_reports.leave_pending.projected_consequence': 'Les rapports restent à lire ; ils vous attendront demain.',
  'hl.option.cue_cascade_fallout.review_now.projected_consequence': 'Vous ouvrez la file : ce que la cascade a laissé vous attend, rien n’est réglé à votre place.',
  'hl.option.cue_cascade_fallout.leave_pending.projected_consequence': 'Ce que la cascade a laissé reste dans la file, et alourdit votre charge.',
  'hl.option.escalation_backlog.review_now.projected_consequence': 'Vous allez lire les remontées. Ce qui est remonté ne redescend pas : rien n’y sera changé.',
  'hl.option.escalation_backlog.leave_pending.projected_consequence': 'Les remontées restent telles quelles ; tant qu’elles s’accumulent, la carte reviendra.',

  // ═══ TABLE 58 (atelier 9d94e2cf) — présence des bâtiments sur la carte ③ (D21), pluriel ICU. ═══
  'carte.presence.batiments': '{n, plural, one {# bâtiment} other {# bâtiments}}',

  // ═══ TABLE 60 (atelier 9a17e7bf, f2 26/09) — menu Plus : 5 titres de groupe PROPOSÉS + les 20
  //     entrées littérales du client (AppShell.cs DestinationsPlus, e575a536), mots inchangés. ═══
  'plus.groupe.vos_journees': 'Vos journées',
  'plus.groupe.vos_affaires': 'Vos affaires',
  'plus.groupe.ce_qui_se_dit': 'Ce qui se dit',
  'plus.groupe.ce_qui_vous_guette': 'Ce qui vous guette',
  'plus.groupe.vous': 'Vous',
  'plus.entree.la_revue_du_jour': 'La revue du jour',
  'plus.entree.les_ordres_du_soir': 'Les ordres du soir',
  'plus.entree.ce_que_vous_avez_confie': 'Ce que vous avez confié',
  'plus.entree.la_semaine': 'La semaine',
  'plus.entree.la_chaine_d_appro': 'La chaîne d’appro',
  'plus.entree.la_distribution': 'La distribution',
  'plus.entree.la_vente': 'La vente',
  'plus.entree.raser_un_site': 'Raser un site',
  'plus.entree.le_journal_la_rue': 'Le journal & la rue',
  'plus.entree.la_reputation': 'La réputation',
  'plus.entree.le_conflit': 'Le conflit',
  'plus.entree.la_loi': 'La loi',
  'plus.entree.les_inspections': 'Les inspections',
  'plus.entree.le_commissariat': 'Le commissariat',
  'plus.entree.le_dossier': 'Le dossier',
  'plus.entree.l_horizon_des_possibles': 'L’horizon des possibles',
  'plus.entree.votre_profil': 'Votre profil',
  'plus.entree.la_vitrine': 'La vitrine',
  'plus.entree.la_premiere_fois': 'La première fois',
  'plus.entree.les_reglages': 'Les réglages',

  // ═══ TABLE 61 (atelier 84f22ade) — ㊲ règles de maison, 6 noms PROPOSÉS pour les rule_id sans
  //     clé servie (canon 3.1/3.2/3.4). ═══
  'reputation.etat.le_silence_aux_remises': 'le silence aux remises',
  'reputation.etat.les_dettes_honorees': 'les dettes honorées',
  'reputation.etat.le_reflexe_de_faire_remonter': 'le réflexe de faire remonter',
  'reputation.etat.la_force_mesuree': 'la force mesurée',
  'reputation.etat.le_reglement_a_la_loyale': 'le règlement à la loyale',
  'reputation.etat.la_juste_indemnite_de_depart': 'la juste indemnité de départ',

  // ═══ TABLE 62 (atelier 2648d19d, B3, commande f2 26/09) — ㉟ gestes de vente, 11 clés PROPOSÉES
  //     (`vente.geste.*` / `vente.vide.*`). ═══
  'vente.geste.un_dealer_tient_ce_point_de_vente': 'Un dealer tient ce coin de vente.',
  'vente.geste.le_dealer_n_a_pas_ete_poste': 'Le poste n’a pas pu être pourvu',
  'vente.geste.aucun_bloc_libre_dans_votre_quartier': 'Aucun bloc libre dans votre quartier.',
  'vente.geste.point_de_vente_achete_ouvrez_le_depuis_sa_fiche': 'Coin de vente acheté. Reste à l’ouvrir, depuis sa fiche.',
  'vente.geste.l_achat_n_a_pas_abouti': 'L’achat n’a pas abouti',
  // ★ addendum 62 (atelier 26f9de15, 2026-09-26) — littéral de SellingScreenController.cs:343-346,
  //   état vide (D12 « coin de vente », D10) : 2 clés PROPOSÉES.
  'vente.vide.les_coins_de_vente_n_ont_pas_repondu': 'Les coins de vente n’ont pas répondu.',
  'vente.vide.aucun_coin_de_vente': 'Aucun coin de vente.',
  'vente.vide.aucun_dealer_au_travail': 'Aucun dealer au travail.',
  'vente.geste.point_de_vente_sans_dealer': 'Coin de vente sans dealer',
  'vente.geste.poster_un_dealer': 'Poster un dealer',
  'vente.geste.vous_n_avez_aucun_point_de_vente': 'Vous n’avez aucun coin de vente',
  'vente.geste.acheter_un_point_de_vente': 'Acheter un coin de vente',
  'vente.geste.coute_de_l_argent_et_la_decision_de_structure_de_cette_session_il_faudra_ensuite_l_ouvrir_depuis_sa_fiche': 'Coûte de l’argent et votre décision de structure du jour ; l’ouvrir ensuite, depuis sa fiche, en demandera une autre, demain.',

  // ═══ TABLE 63 v2 (atelier 34beb6e7) — états vides muets/faux/bruts, 24 clés PROPOSÉES (2 servies
  //     déjà présentes : `horizon.bloc.*` ; 1 valeur changée traitée à part : `exceptions.file.ambiance` ;
  //     2 lignes REMPLACÉES par l'addendum 33b422c5, non servies : `inspection.vide.rien_a_faire_ici_…`,
  //     `distribution.vide.un_relais_s_obtient_…`). ═══
  'police.vide.le_commissariat_n_a_encore_rien_sur_vous': 'Le commissariat n’a encore rien sur vous.',
  'police.vide.tant_que_vous_ne_faites_pas_de_bruit_ca_peut_durer': 'Tant que vous ne faites pas de bruit, ça peut durer.',
  'filiere.vide.votre_planque_enseigne_est_vide': 'Votre planque, {enseigne}, est vide.',
  'filiere.vide.l_argent_y_entre_quand_vous_ramassez_la_caisse_d_un_dealer': 'L’argent y entre quand vous ramassez la caisse d’un dealer.',
  'demolition.vide.rien_ne_se_gene_vos_sites_tournent_sans_se_marcher_dessus': 'Rien ne se gêne : vos sites tournent sans se marcher dessus.',
  'demolition.vide.rien_a_raser_pour_l_instant': 'Rien à raser pour l’instant.',
  'demolition.ecran.n_endroits_se_genent': '{n, plural, =0 {Aucun endroit ne se gêne.} one {Un endroit en gêne un autre.} other {# endroits se gênent entre eux.}}',
  'appro.vide.rien_ne_circule_encore_vos_maillons_attendent_une_premiere_commande': 'Rien ne circule encore : vos maillons attendent une première commande.',
  'distribution.vide.pas_encore_de_relais': 'Pas encore de relais.',
  'distribution.vide.sans_relais_rien_ne_part_c_est_de_la_que_vos_coursiers_livrent': 'Sans relais, rien ne part : c’est de là que vos coursiers livrent.',
  'revue.vide.vos_lieutenants_n_ont_encore_rien_a_tenir_donnez_leur_une_premiere_regle': 'Vos lieutenants n’ont encore rien à tenir : donnez-leur une première règle.',
  'autonomie.vide.aucun_rapport_pour_l_instant_il_en_viendra_quand_vous_aurez_confie_une_tache_a_un_lieutenant': 'Aucun rapport pour l’instant : il en viendra quand vous aurez confié une tâche à un lieutenant.',
  'building.vide.a_l_arret_pas_de_precursor_type_en_stock': 'À l’arrêt : pas de {precursor_type} en stock.',
  'building.vide.rien_a_blanchir_la_planque_est_vide': 'Rien à blanchir : la planque est vide.',
  'famille.vide.au_repos_rien_a_cuire_pour_l_instant': 'Au repos : rien à cuire pour l’instant.',
  'famille.vide.commandez_de_la_matiere_depuis_la_chaine_d_appro': 'Commandez de la matière depuis la chaîne d’appro.',
  'tutoriel.vide.une_premiere_lecon_vous_attend': 'Une première leçon vous attend.',
  'accueil.vitals.cohesion_pas_encore_mesuree': 'Cohésion : pas encore mesurée',
  'famille.ecran.recruter_archetype': 'Recruter — {archetype}',
  'famille.ecran.nouvelle_recrue_archetype': 'Nouvelle recrue : {archetype}.',
  'profil.etat.active': 'en règle',
  'profil.langue.fr': 'Français',
  'profil.langue.en': 'Anglais',
  'boutique.bloc.bientot': 'Bientôt',

  // ═══ TABLE 63 addendum (atelier 33b422c5, suivi ⊥ UX §I) — 2 clés qui REMPLACENT les 2 lignes
  //     v2 exclues ci-dessus (phrases fausses : ⑮ aucun geste dispo pourtant actif ; ㉘ chemin
  //     d'achat réel du relais). ═══
  'inspection.vide.aucune_inspection_en_cours': 'Aucune inspection en cours.',
  // ★ addendum ㉘ (atelier 08b9ef26, 2026-09-26) — la phrase dit enfin la condition qui la rend
  //   vraie (tidewater/stack seulement, 5 quartiers sur 18) ; clé gardée, valeur précisée.
  'distribution.vide.un_relais_s_achete_sur_un_bloc_libre_puis_s_ouvre_depuis_sa_fiche': 'Un relais s’achète sur un bloc libre, puis s’ouvre depuis sa fiche, sur le port ou dans les cheminées seulement — de l’argent et deux décisions de structure, sur deux jours.',

  // ═══ TABLE 64 (atelier 80e2e926) — 4 répliques de Dima extraites en clés (littéral client,
  //     DemolitionScreenController.cs), PROPOSÉES. {nom}=Dima composé CÔTÉ CLIENT (pas de site back :
  //     voir implementation-notes.md § Deviations). ═══
  'demolition.dit.on_a_trop_de_choses_au_meme_endroit_il_va_falloir_en_enlever_une': '{nom} : « On a trop de choses au même endroit. Il va falloir en enlever une. »',
  'demolition.dit.celui_la_on_le_garde_par_habitude_il_gene_les_voisins_et_il_ne_rend_presque_rien': '{nom} : « Celui-là, on le garde par habitude. Il gêne les voisins et il ne rend presque rien. »',
  'demolition.dit.trop_tard_pour_celle_la': '{nom} : « Trop tard pour celle-là. »',
  'demolition.dit.deux_propositions_la_premiere_est_mieux_placee_elles_ne_resteront_pas_sur_la_table': '{nom} : « Deux propositions. La première est mieux placée. Elles ne resteront pas sur la table. »',

  // ═══ TABLE 65 (atelier 20d9be5f) — ㉞ « Ce qui arrive », 5 clés `carnet.bloc.*` PROPOSÉES.
  //     Les 12 political.event.E-POL-* sont RÉUTILISÉES telles quelles (déjà servies), 0 clé neuve. ═══
  'carnet.bloc.ce_qui_arrive': 'Ce qui arrive',
  'carnet.bloc.en_cours': 'en cours',
  'carnet.bloc.annonce': 'à venir',
  'carnet.bloc.rien_n_est_annonce': 'Rien n’est annoncé.',
  'carnet.bloc.le_calendrier_n_a_pas_repondu': 'Le calendrier n’a pas répondu.',

  // ═══ TABLE 66 (atelier ceb0b3fe) — ⑧ bandeau chaufferie / week_state / diagnostics, 12 clés
  //     PROPOSÉES. ═══
  'compression.week_state.warning': 'la pression monte',
  'compression.week_state.active': 'semaine de compression',
  'compression.tension.calm': 'calme',
  'compression.semaine.none': 'aucune semaine',
  'accueil.bandeau.la_chaufferie_etat': 'La chaufferie — {etat}',
  'lieutenant.editeur.ces_regles_ne_passent_pas': 'Ces règles ne passent pas.',
  'lieutenant.editeur.ligne_colonne_message': 'Ligne {ligne}, colonne {colonne} — {message}',
  'lieutenant.diagnostic.syntax_error': 'Cette ligne ne se lit pas : un mot manque, ou n’est pas à sa place.',
  'lieutenant.diagnostic.tier_not_unlocked': 'Pas encore à votre portée.',
  'lieutenant.diagnostic.not_supported_yet': 'Cet ordre existe, mais personne ne l’exécute encore.',
  'lieutenant.diagnostic.rule_count_exceeded': 'Trop de règles pour un seul lieutenant : retirez-en une.',
  'lieutenant.diagnostic.priority_out_of_bounds': 'Cette priorité sort de l’échelle.',
  'lieutenant.diagnostic.condition_depth_exceeded': 'Trop de conditions les unes dans les autres : simplifiez.',
  'lieutenant.diagnostic.tenure_peer_scope_violation': 'Un lieutenant ne lit pas l’ancienneté d’un autre.',

  // ═══ TABLE 67 addendum (atelier 29f876ae) — bandeau chaufferie sans mot d'état, 1 clé PROPOSÉE.
  //     (Les 17 codes ERROR_CODES neufs de la table 67 elle-même sont HORS de ce lot — lot « refus ».) ═══
  'accueil.bandeau.la_chaufferie': 'La chaufferie',

  // ═══ TABLE 68 (atelier a21f3c62) — ③ panneau de district, 41 clés ParValeur PROPOSÉES
  //     (4 familles déjà servies réutilisées : `heat.bucket.*`, `filiere.proprete.*`,
  //     `inspection.charge.*`, `inspection.regime.*`). `carte.refoulement.{congested,saturated}`
  //     ré-accordés au féminin par l'addendum 68 (« Circulation »). ═══
  'carte.controle.uncontested': 'Libre',
  'carte.controle.contested': 'Disputé',
  'carte.controle.player_held': 'À vous',
  'carte.controle.rival_held': 'Rival',
  'carte.refoulement.normal': 'fluide',
  'carte.refoulement.congested': 'engorgée',
  'carte.refoulement.saturated': 'saturée',
  'carte.exposition.minimal': 'minime',
  'carte.exposition.low': 'faible',
  'carte.exposition.elevated': 'élevée',
  'carte.exposition.critical': 'critique',
  'carte.reserve.low': 'à peine',
  'carte.reserve.moderate': 'en partie',
  'carte.reserve.high': 'beaucoup',
  'carte.reserve.saturated': 'à saturation',
  'carte.tampon_charge.empty': 'vide',
  'carte.tampon_charge.low': 'faible',
  'carte.tampon_charge.nominal': 'normale',
  'carte.tampon_charge.high': 'forte',
  'carte.tampon_charge.critical': 'critique',
  'carte.tampon_traine.low': 'courte',
  'carte.tampon_traine.moderate': 'moyenne',
  'carte.tampon_traine.high': 'longue',
  'carte.tampon_traine.critical': 'critique',
  'carte.epingles.none': 'aucune',
  'carte.epingles.some': 'quelques-unes',
  'carte.epingles.widespread': 'partout',
  'carte.cohesion.stable': 'solide',
  'carte.cohesion.fragile': 'fragile',
  'carte.cohesion.thawed': 'rompue',
  'police.croyance.dormant': 'en sommeil',
  'police.croyance.watchful': 'en veille',
  'police.croyance.suspicious': 'soupçon',
  'police.croyance.hunting': 'en chasse',
  'police.patrouille.quiet': 'rien dans les rues',
  'police.patrouille.low': 'clairsemée',
  'police.patrouille.medium': 'présente',
  'police.patrouille.high': 'partout',
  'carte.rumeur.calm': 'rien de spécial',
  'carte.rumeur.stirring': 'ça murmure',
  'carte.rumeur.alert': 'ça s’agite',

  // ═══ TABLE 68 addendum (atelier 9ebfcb4d) — 25 étiquettes `carte.panneau.*` PROPOSÉES (jargon
  //     remplacé : dispatch, tampon, traîne, épingles d'audit, refoulement). ═══
  'carte.panneau.blocs': 'Blocs',
  'carte.panneau.rive': 'Rive',
  'carte.panneau.controle': 'Contrôle',
  'carte.panneau.releves': 'Relevés',
  'carte.panneau.releves_ouvrez_une_session': 'revenez après l’ouverture de votre journée',
  'carte.panneau.pas_encore_releve': 'pas encore relevé',
  'carte.panneau.chaleur_quartier': 'Chaleur — le quartier',
  'carte.panneau.chaleur_ville': 'Chaleur — la ville',
  'carte.panneau.descente': 'Descente',
  'carte.panneau.oui': 'oui',
  'carte.panneau.non': 'non',
  'carte.panneau.refoulement': 'Circulation',
  'carte.panneau.exposition': 'Exposition',
  'carte.panneau.proprete_du_reseau': 'Propreté de l’argent',
  'carte.panneau.reserve_qui_bloque': 'Planques encombrées',
  'carte.panneau.tampon_charge': 'Marchandise en attente',
  'carte.panneau.tampon_traine': 'L’attente',
  'carte.panneau.file_d_inspection': 'File d’inspection',
  'carte.panneau.regime_du_dispatch': 'Rythme des inspecteurs',
  'carte.panneau.epingles_d_audit': 'Marques sur vos dossiers',
  'carte.panneau.coins_de_vente': 'Coins de vente',
  'carte.panneau.cohesion': 'Cohésion',
  'carte.panneau.ce_qu_ils_croient': 'Ce qu’ils croient — précinct {precinct}',
  'carte.panneau.la_patrouille': 'La patrouille — précinct {precinct}',
  'carte.panneau.ce_qui_se_dit': 'Ce qui se dit en ville',

  // ═══ TABLE 69 (atelier 06a500d4) — la monnaie Marks : 5 clés `boutique.bloc.*` + 9
  //     `boutique.sku.*` PROPOSÉES (3 valeurs changées traitées à part : `exceptions.apres.resolved`,
  //     `exception_detail.outcome.resolved`, `boutique.bloc.jetons`). ═══
  'boutique.bloc.n_marks': '{n, plural, one {# Mark} other {# Marks}}',
  'boutique.bloc.donne_n_marks': 'donne {n, plural, one {# Mark} other {# Marks}}',
  'boutique.bloc.bonus_de_marks_par_euro': '+{bonus} % de Marks par euro',
  'boutique.bloc.plus_aucun_mark_et_rien_n_en_redonne': 'plus aucun Mark, et rien n’en redonne',
  'boutique.bloc.pas_assez_de_marks': 'pas assez de Marks',
  // ═══ TABLE 69 suite (atelier 7159e54, 08/10) — vitrine de ㉓ re-rendue en Marks : 2 titres de bloc, demandés par CLIENT-1. ═══
  'boutique.bloc.les_extras_payes_en_marks': 'Les extras — payés en Marks',
  'boutique.bloc.les_marks_payes_au_magasin': 'Les Marks — payés au magasin',
  'boutique.sku.marks_pack_small': 'Liasse de 100 Marks',
  'boutique.sku.marks_pack_med': 'Liasse de 600 Marks',
  'boutique.sku.marks_pack_large': 'Liasse de 1 400 Marks',
  'boutique.sku.marks_pack_xl': 'Liasse de 3 500 Marks',
  'boutique.sku.cosm_callsign_color': 'Couleurs d’indicatif',
  'boutique.sku.cosm_dashboard_theme_1': 'Thème : nuit au sodium',
  'boutique.sku.save_slot_2': 'Une deuxième partie',
  'boutique.sku.save_slot_3': 'Une troisième partie',
  'boutique.sku.support_pack': 'Soutien au studio',

  // ═══ TABLE 70 (atelier b6bda780) — 4 replis de refus (réseau/corps vide), PROPOSÉS. ═══
  'autonomie.refus.votre_choix_n_a_pas_ete_enregistre_reessayez': 'Votre choix n’a pas été enregistré. Réessayez.',
  'exception_detail.refus.votre_decision_n_a_pas_ete_enregistree_reessayez': 'Votre décision n’a pas été enregistrée. Réessayez.',
  'loi.refus.l_embauche_n_a_pas_abouti_reessayez_plus_tard': 'L’embauche n’a pas abouti. Réessayez plus tard.',
  'loi.refus.la_retention_n_a_pas_change_reessayez_plus_tard': 'La rétention n’a pas changé. Réessayez plus tard.',

  // ═══ TABLE 71 (atelier 5354fa88) — geste « acheter un relais » (㉘), 4 clés PROPOSÉES
  //     `distribution.geste.*`. ═══
  'distribution.geste.acheter_un_relais': 'Acheter un relais',
  'distribution.geste.coute_de_l_argent_et_votre_decision_de_structure_du_jour_il_s_ouvre_ensuite_depuis_sa_fiche_sur_le_port_ou_dans_les_cheminees_seulement_et_en_demandera_une_autre_demain': 'Coûte de l’argent et votre décision de structure du jour ; il s’ouvre ensuite depuis sa fiche — sur le port ou dans les cheminées seulement — et en demandera une autre, demain.',
  'distribution.geste.relais_achete_reste_a_l_ouvrir_depuis_sa_fiche': 'Relais acheté. Reste à l’ouvrir, depuis sa fiche.',
  'distribution.geste.l_achat_n_a_pas_abouti': 'L’achat n’a pas abouti',

  // Lot « ouvrables » (L10) — le motif de refus de `convert` hors district (`details.reason_i18n`), 1 clé
  // `distribution.refus.*` PROPOSÉE (écran ㉘). La clé EST la phrase.
  'distribution.refus.ce_type_de_batiment_ne_peut_pas_s_ouvrir_dans_ce_quartier': 'Ce type de bâtiment ne peut pas s’ouvrir dans ce quartier.',

  // ═══ TABLE 72 (atelier 51aa0c5c) — bloc « La suite » de l'Accueil pour un joueur neuf,
  //     18 clés `accueil.suite.*` PROPOSÉES (A1/A2/A3 labo, B/C vente, D règles). Aucune donnée
  //     neuve : toutes les conditions sont déjà servies (corps ux_vide_2609). ═══
  'accueil.suite.la_suite': 'La suite',
  'accueil.suite.le_labo_attend_du_precurseur': 'Le labo attend du {precurseur}',
  'accueil.suite.sans_lui_rien_ne_cuit': 'Sans lui, rien ne cuit.',
  'accueil.suite.commander': 'Commander',
  'accueil.suite.le_precurseur_est_en_route': 'Le {precurseur} est en route',
  'accueil.suite.a_son_arrivee_lancez_la_cuisson': 'À son arrivée, lancez la cuisson.',
  'accueil.suite.le_precurseur_est_la': 'Le {precurseur} est là',
  'accueil.suite.lancez_la_cuisson': 'Lancez la cuisson.',
  'accueil.suite.cuire': 'Cuire',
  'accueil.suite.personne_ne_vend_encore': 'Personne ne vend encore',
  'accueil.suite.un_dealer_sur_un_coin_de_vente_et_la_marchandise_part': 'Un dealer sur un coin de vente, et la marchandise part.',
  'accueil.suite.voir_la_vente': 'Voir la vente',
  'accueil.suite.la_caisse_de_prenom_se_remplit': 'La caisse de {prenom} se remplit',
  'accueil.suite.ramassez_la_elle_rejoint_la_planque': 'Ramassez-la : elle rejoint la planque.',
  'accueil.suite.ramasser': 'Ramasser',
  'accueil.suite.vos_lieutenants_attendent_une_consigne': 'Vos lieutenants attendent une consigne',
  'accueil.suite.une_premiere_regle_et_ils_tiennent_sans_vous': 'Une première règle, et ils tiennent sans vous.',
  'accueil.suite.ecrire_une_regle': 'Écrire une règle',

  // ═══ TABLE 73 (atelier a2c0b2e4) — le carnet du soir, état vide + composeur, 16 clés
  //     PROPOSÉES. Les 3 groupes réutilisés (carnet.bloc.a_batiment_quartier,
  //     carnet.bloc.deux_ordres_s_attendent_l_un_l_autre, carnet.bloc.un_endroit_n_a_pas_fini_de_se_poser)
  //     sont DÉJÀ servis plus haut (table précédente) — non redupliqués ici. ═══
  'carnet.vide.il_faut_au_moins_quatre_ordres_pour_une_soiree': 'Il faut au moins quatre ordres pour une soirée.',
  'carnet.vide.vous_pouvez_deja_poser': 'Vous pouvez déjà poser',
  'carnet.vide.n_cibles': '{n, plural, one {# cible} other {# cibles}}',
  'carnet.vide.pas_encore_de_quoi_remplir_une_soiree': 'Pas encore de quoi remplir une soirée : il faudra d’autres locaux, des itinéraires ou des candidats.',
  'carnet.composeur.poser_un_ordre': 'Poser un ordre',
  'carnet.composeur.quel_ordre': 'Quel ordre ?',
  'carnet.composeur.rien_a_viser_pour_l_instant': 'rien à viser pour l’instant',
  'carnet.composeur.sur_quoi': 'Sur quoi ?',
  'carnet.composeur.appui_long_pour_deplacer': 'appui long pour déplacer',
  'carnet.composeur.retirer': 'Retirer',
  'carnet.composeur.encore_n_ordres_a_poser': '{n, plural, one {Encore un ordre à poser} other {Encore # ordres à poser}}',
  'carnet.refus.cet_ordre_n_existe_pas_encore': 'Cet ordre n’existe pas encore.',
  'carnet.refus.cette_cible_ne_tient_plus_choisissez_en_une_autre': 'Cette cible ne tient plus : choisissez-en une autre.',
  'carnet.refus.une_soiree_est_deja_en_route': 'Une soirée est déjà en route : elle finit avant qu’on en compose une autre.',
  'carnet.composeur.choisir': 'Choisir',
  'carnet.composeur.deja_dans_le_carnet': 'déjà dans le carnet',

  // ═══ TABLE 76 (atelier fa4dba93) — la planque et la suite (reco f1, décidée 26/09), 18 clés
  //     PROPOSÉES : LA SUITE ④ (72) lignes E/F/G, ①/㉟ planque pleine, ㊵, et les 5 mots de
  //     remplissage par valeur (StashLoadBucket). ═══
  'accueil.suite.de_l_argent_attend_dans_la_planque': 'De l’argent attend dans la planque',
  'accueil.suite.blanchissez_le_il_ne_rapporte_rien_tant_qu_il_dort': 'Blanchissez-le : il ne rapporte rien tant qu’il dort.',
  'accueil.suite.la_planque_est_pleine': 'La planque est pleine',
  'accueil.suite.blanchissez_sinon_la_caisse_des_dealers_ne_peut_plus_s_y_vider': 'Blanchissez : sinon, la caisse des dealers ne peut plus s’y vider.',
  'accueil.suite.blanchir': 'Blanchir',
  'accueil.suite.un_lieutenant_du_blanchiment': 'Un lieutenant du blanchiment',
  'accueil.suite.il_fait_passer_l_argent_par_la_filiere_a_votre_place_une_decision_de_structure': 'Il fait passer l’argent par la filière à votre place — une décision de structure.',
  'accueil.suite.recruter': 'Recruter',
  'accueil.suite.un_lieutenant_de_la_distribution': 'Un lieutenant de la distribution',
  'accueil.suite.il_ramasse_la_caisse_a_votre_place_une_decision_de_structure': 'Il ramasse la caisse à votre place — une décision de structure.',
  'vente.geste.planque_pleine_le_reste_attend_dans_la_caisse': 'Planque pleine : le reste attend dans la caisse.',

  // ═══ lot COLLECTE (2026-09-26) — tables 75 (collecte partielle, atelier @71747158) et 85 (collecte indisponible, @91d40c01) : 24 clés, recopiées du TSV au caractère près ═══
  'vente.geste.ramasse_collecte_encore_chez_prenom_reste': 'Ramassé : {collecte}. Encore chez {prenom} : {reste}.',
  'vente.geste.ramasse_collecte_encore_chez_le_dealer_reste': 'Ramassé : {collecte}. Encore chez le dealer : {reste}.',
  'vente.geste.tout_est_ramasse_collecte': 'Tout est ramassé : {collecte}.',
  'vente.refus.la_planque_est_pleine_blanchissez_d_abord_pour_faire_de_la_place': 'La planque est pleine : blanchissez d’abord, pour faire de la place.',
  'vente.refus.la_caisse_de_prenom_est_vide': 'La caisse de {prenom} est vide.',
  'vente.refus.la_caisse_du_dealer_est_vide': 'La caisse du dealer est vide.',
  'vente.caisse.bande.none': 'plus rien',
  'vente.caisse.bande.low': 'une petite somme',
  'vente.caisse.bande.moderate': 'une somme correcte',
  'vente.caisse.bande.high': 'une grosse somme',
  'vente.caisse.bande.full': 'tout ce qu’elle peut tenir',
  'vente.caisse.bande.full_il_ne_vend_plus_tant_qu_on_ne_ramasse_pas': 'il ne vend plus tant qu’on ne ramasse pas',
  'district.fiche.collecte_indisponible_raison': 'Collecte refusée. {raison}',
  'vente.raison.connexion_expiree': 'La connexion a expiré.',
  'vente.raison.collecte_non_acceptee': 'Cette collecte n’est pas acceptée.',
  'vente.raison.indisponible': 'Le point de vente ne répond pas pour l’instant.',
  'vente.raison.reponse_vide': 'La réponse est arrivée vide.',
  'vente.raison.reponse_illisible': 'La réponse est illisible.',
  'vente.refus.la_collecte_n_a_pas_abouti': 'La collecte n’a pas abouti.',
  'vente.refus.collecte_impossible_aucune_planque': 'Collecte impossible : vous n’avez aucune planque.',
  'district.fiche.collecte_indisponible_session_absente': 'Collecte impossible : la connexion au jeu est perdue.',
  'district.fiche.collecte_choisissez_un_point_de_vente': 'Pour ramasser, choisissez d’abord un point de vente.',
  'district.fiche.rien_a_ramasser_personne_ne_tient_ce_point_de_vente': 'Rien à ramasser : personne ne tient ce point de vente.',
  'district.fiche.recherche_du_dealer_et_de_la_planque': 'On cherche le dealer et la planque…',
  'building.geste.blanchir_d_abord': 'Blanchir d’abord',
  'filiere.etat.a_blanchir_la_planque_est_pleine': 'À blanchir : la planque est pleine.',
  'planque.remplissage.empty': 'vide',
  'planque.remplissage.low': 'presque vide',
  'planque.remplissage.nominal': 'à moitié pleine',
  'planque.remplissage.high': 'bien remplie',
  'planque.remplissage.full': 'pleine',

  // ═══ TABLE 77 (atelier 6ed61816) — ⑩ marqueur d'issue par EFFET (pas par place), ㊵ tête
  //     quand la planque n'est pas vide, ⑨ le moment par DayPhase, ㉕ le compte en ICU (2 arguments,
  //     mêmes branches fr/en, « one » couvre 0 en fr). 10 clés PROPOSÉES. ═══
  'exception_detail.bloc.sans_suite': 'Sans suite',
  'filiere.etat.votre_planque_enseigne_tient_de_quoi_blanchir': 'Votre planque, {enseigne}, tient de quoi blanchir.',
  'filiere.etat.votre_planque_tient_de_quoi_blanchir': 'Votre planque tient de quoi blanchir.',
  'filiere.etat.l_argent_passe_de_la_planque_a_la_filiere': 'l’argent passe de la planque à la filière',
  'exceptions.moment.dawn': 'Ce matin, au Verge d’Or',
  'exceptions.moment.day': 'Aujourd’hui, au Verge d’Or',
  'exceptions.moment.dusk': 'Ce soir, au Verge d’Or',
  'exceptions.moment.night': 'Cette nuit, au Verge d’Or',
  'exceptions.moment.inconnu': 'Au Verge d’Or',
  'tutoriel.ecran.n_vues_n_disponibles': '{vus, plural, one {# vue} other {# vues}} · {disponibles, plural, one {# disponible} other {# disponibles}}',

  // ═══ TABLE 78 (atelier 3be2e866) — « moment en dur » (A) : ㊳ surtitre + état vide du journal,
  //     ⑤ état vide de la décision — un mot par day_phase (DAWN/DAY/DUSK/NIGHT, null ⇒ inconnu),
  //     15 clés PROPOSÉES. ⑩ réutilise exceptions.moment.* (77), aucune clé neuve pour cet écran.
  //     `\n` = saut de ligne réel (deux lignes, comme l'état "aujourd'hui" existant). ═══
  'journal.moment.titre.dawn': 'Ce qui se dit ce matin',
  'journal.moment.titre.day': 'Ce qui se dit aujourd’hui',
  'journal.moment.titre.dusk': 'Ce qui se dit ce soir',
  'journal.moment.titre.night': 'Ce qui se dit cette nuit',
  'journal.moment.titre.inconnu': 'Ce qui se dit',
  'journal.moment.vide.dawn': 'Rien ce matin.\nLa ville a passé une nuit tranquille.',
  'journal.moment.vide.day': 'Rien aujourd’hui.\nLa ville est calme.',
  'journal.moment.vide.dusk': 'Rien ce soir.\nLa journée a été tranquille.',
  'journal.moment.vide.night': 'Rien cette nuit.\nLa ville se tient tranquille.',
  'journal.moment.vide.inconnu': 'Rien pour l’instant.\nLa ville est calme.',
  'decision.moment.vide.dawn': 'Rien ne se détache du sabot ce matin.',
  'decision.moment.vide.day': 'Rien ne se détache du sabot aujourd’hui.',
  'decision.moment.vide.dusk': 'Rien ne se détache du sabot ce soir.',
  'decision.moment.vide.night': 'Rien ne se détache du sabot cette nuit.',
  'decision.moment.vide.inconnu': 'Rien ne se détache du sabot pour l’instant.',

  // ═══ TABLE f2 (08/10, suite) — 26 clés servies (compression ×17, famille.vide ×3, vente ×1, horizon ×1, boutique ×2, accueil ×2),
  //     PROPOSÉES ; + 3 valeurs FR remplacées plus haut (press.outlet.*.name, TD-824, clé inchangée). Source : scratchpad/MOTS-GENERES-2026-10-08-suite.md. ═══
  'compression.tension.compression_active': 'sous compression',
  'compression.semaine.active': 'la semaine est ouverte',
  'compression.genre.severed_route': 'Une route ne tient plus la charge',
  'compression.genre.cue_cascade_card': 'Un créneau raté en a entraîné d’autres',
  'compression.genre.settling_overload': 'Un changement de plus pendant la stabilisation',
  'compression.genre.friction_penalty': 'L’organisation porte trop de friction',
  'compression.palier.minor': 'mineur',
  'compression.palier.moderate': 'modéré',
  'compression.palier.critical': 'critique',
  'compression.tension.mounting': 'Montante',
  'compression.tension.crushing': 'Écrasante',
  'compression.semaine.warning': 'la semaine s’annonce',
  'compression.genre.exception_card': 'Une exception attend depuis trop longtemps',
  'compression.genre.flag': 'Un signalement n’a pas été tranché',
  'compression.genre.backpressure_node': 'Un nœud de la chaîne sature',
  'compression.genre.stressed_leg': 'Un tronçon fatigue faute d’entretien',
  'compression.genre.cue_stack_failed_slot': 'Un créneau de la pile a raté',
  'famille.vide.au_repos_stock.low': 'Au repos : il ne reste presque rien à cuire. Commandez de la matière depuis la chaîne d’appro.',
  'famille.vide.au_repos_stock.medium': 'Au repos, alors qu’il y a de la matière au labo. La chaîne d’appro dit ce qui arrive.',
  'famille.vide.au_repos_stock.high': 'Au repos, et la matière s’entasse au labo. La chaîne d’appro dit ce qui arrive.',
  'vente.geste.la_caisse_a_rejoint_votre_planque': 'La caisse a rejoint votre planque.',
  'horizon.bloc.les_epaules': 'Les épaules',
  'boutique.bloc.acheter': 'ACHETER',
  'boutique.bloc.tapez_mot': 'tapez {mot}',
  'accueil.carte.la_decision_n_a_pas_ete_prise': 'La décision n’a pas été prise.',
  'accueil.carte.tapez_mot': 'tapez {mot}',

  // ═══ TABLE Lot 3 (08/10, après gate) — 2 clés servies (semaine.bloc ×2, jauge de TENSION ⑭), PROPOSÉES.
  //     Source : scratchpad/MOTS-GENERES-2026-10-08.md § Lot 3. ═══
  'semaine.bloc.tension': 'Tension',
  'semaine.bloc.vos_affaires_respirent': 'vos affaires respirent',
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
// son `en`. Le 64ᵉ texte est venu le 2026-09-23 (atelier `19-…`) : 0 code au repli, la falsifiable l'épingle.
//
// ⛔ EXPORTÉ (2026-09-24, lot i18n) POUR LA MÊME RAISON QUE `FR_MESSAGES` CI-DESSUS. C'est une
// SECONDE population française servie au joueur (`resolveBundle` la fusionne via l'appel à
// `errorKeyTemplates(locale)` dans son propre corps) — une garde de typographie posée sur
// `FR_MESSAGES` seul serait aveugle à ce bloc. L'export existe pour que les gardes de classe i18n
// (`tests/unit/i18n/*`) puissent lire les DEUX registres fr à la source, et pour rien d'autre.
export const ERROR_TEXT_RATIFIED: Readonly<Record<LocaleCode, Readonly<Record<string, string>>>> = {
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
    // ★ D48 (atelier dd97fca6, 2026-09-26) — VALEUR RÉÉCRITE, NEUTRE, clé gardée : l'ancienne
    //   valeur nommait un cycle calendaire que le back ne sert pas encore (avant L1), et le joueur la
    //   lisait à côté du seul numéro de jour affiché. Vraie avant ET après L1 — quand L1 sert ce
    //   cycle, cette valeur PEUT être reprécisée (clé gardée, valeur changeable).
    'error.core_loops.structural_cap_exhausted':
      'Today’s structural decision is already made. Take it up again tomorrow.',
    'error.cue_stack.already_active':
      'That cue is already running. Wait for it to finish.',
    'error.cue_stack.dependency_cycle':
      'These orders wait on each other: unhook one of them.',
    'error.cue_stack.settling_compound_required':
      'A place hasn’t settled yet: say so plainly to go anyway.',
    'error.cue_stack.slot_target_invalid':
      'That cue cannot point at that target. Pick another target.',
    'error.cue_stack.slot_type_reserved':
      'This order isn’t possible yet.',
    'error.demolition.confirm_required':
      'Razing a site cannot be undone. Confirm to go ahead.',
    'error.demolition.last_node':
      'That is the last one holding the chain together. Build a replacement before taking it down.',
    'error.demolition.lieutenant_assigned':
      'A lieutenant is still assigned there. Reassign them first.',
    'error.demolition.replacement_option_already_closed':
      'That replacement is no longer on the table. Choose from what is left.',
    'error.engagements.muscle_lieutenant_required':
      'Only a Muscle-type lieutenant can go out on this one. Send one, or recruit one.',
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
    'error.laundering.node_full':
      'This front is already laundering all it can. Wait for it to clear, or go through another.',
    'error.laundering.safehouse_short':
      'The safehouse doesn’t hold enough cash for that. Collect a dealer’s cash first.',
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
    'error.selling.cash_empty':
      'The dealer’s cash is empty.',
    'error.selling.safehouse_full':
      'The safehouse is full: launder first, to make room.',
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
      'Cette version du jeu n’est plus prise en charge. Installez la version actuelle pour continuer à jouer.',
    'error.auth.account_banned':
      'Votre compte a été fermé.',
    'error.auth.account_not_found':
      'Aucun compte ne correspond à ces informations.',
    'error.auth.account_suspended':
      'Votre compte est suspendu. Contactez le support pour en demander le réexamen.',
    'error.auth.invalid_credentials':
      'Ces identifiants n’ont pas été reconnus. Vérifiez-les et connectez-vous à nouveau.',
    'error.auth.refresh_expired':
      'Votre session est terminée. Reconnectez-vous.',
    'error.auth.refresh_invalid':
      'Votre session n’a pas pu être renouvelée. Reconnectez-vous.',
    'error.auth.session_expired':
      'Votre session a expiré ; elle est en cours de renouvellement.',
    'error.auth.token_invalid_signature':
      'Votre session n’a pas pu être vérifiée ; elle est en cours de renouvellement.',
    'error.auth.token_missing':
      'Votre session doit être renouvelée.',
    'error.authz.audience_mismatch':
      'Cette session n’a pas accès à cela.',
    'error.authz.permission_denied':
      'Vous n’avez pas l’autorisation de faire cela.',
    'error.client.build_too_old':
      'Votre version du jeu n’est plus à jour. Mettez-la à jour pour continuer.',
    'error.compression.budget_exhausted':
      'Il n’y a plus de place pour ceci aujourd’hui. Reprenez demain.',
    'error.compression.deferral_exhausted':
      'Vous avez repoussé ceci autant de fois que possible. Tranchez maintenant.',
    'error.compression.forced_engagement':
      'Celui-ci n’attendra pas davantage. Traitez-le avant tout le reste.',
    // ★ D48 (atelier dd97fca6, 2026-09-26) — VALEUR RÉÉCRITE, NEUTRE, clé gardée : l'ancienne
    //   valeur nommait un cycle calendaire que le back ne sert pas encore (avant L1), et le joueur la
    //   lisait à côté du seul numéro de jour affiché. Vraie avant ET après L1 — quand L1 sert ce
    //   cycle, cette valeur PEUT être reprecisée (clé gardée, valeur changeable).
    'error.core_loops.structural_cap_exhausted':
      'Votre décision de structure d’aujourd’hui est prise. Reprenez demain.',
    'error.cue_stack.already_active':
      'Ce repère est déjà en cours. Attendez qu’il s’achève.',
    'error.cue_stack.dependency_cycle':
      'Ces ordres s’attendent les uns les autres : il faut en détacher un.',
    'error.cue_stack.settling_compound_required':
      'Un endroit n’a pas fini de se poser : dites-le clairement pour y aller quand même.',
    'error.cue_stack.slot_target_invalid':
      'Ce repère ne peut pas viser cette cible. Choisissez une autre cible.',
    'error.cue_stack.slot_type_reserved':
      'Cet ordre n’est pas encore possible.',
    'error.demolition.confirm_required':
      'Raser un site est irréversible. Confirmez pour continuer.',
    'error.demolition.last_node':
      'C’est le dernier maillon qui tient la chaîne. Construisez un remplacement avant de le raser.',
    'error.demolition.lieutenant_assigned':
      'Un lieutenant y est encore affecté. Réaffectez-le d’abord.',
    'error.demolition.replacement_option_already_closed':
      'Ce remplacement n’est plus proposé. Choisissez parmi ce qui reste.',
    'error.engagements.muscle_lieutenant_required':
      'Seul un lieutenant du genre Gros bras peut partir sur ce coup. Envoyez-en un, ou recrutez-en un.',
    'error.envelope.json_parse_error':
      'Cette requête n’a pas pu être lue.',
    'error.envelope.payload_too_large':
      'Cette requête était trop volumineuse pour être acceptée.',
    'error.envelope.request_id_missing':
      'Cette requête était incomplète et n’a pas pu être traitée.',
    'error.http.method_not_allowed':
      'Cette action n’est pas possible ici.',
    'error.idempotency.key_conflict':
      'Cette action a déjà été envoyée avec un contenu différent. Rien n’a été modifié.',
    'error.idempotency.key_format_invalid':
      'Cette action n’a pas été envoyée correctement ; elle n’a donc pas été exécutée.',
    'error.idempotency.key_missing':
      'Cette action n’a pas pu être envoyée en toute sûreté ; elle n’a donc pas été exécutée.',
    'error.idempotency.replay_mismatch':
      'Cette action ne correspond pas à celle déjà enregistrée. Rien n’a été modifié.',
    'error.idempotency.request_in_flight':
      'Cette action est encore en cours de traitement. Elle s’achèvera dans un instant.',
    'error.internal.unexpected':
      'Quelque chose a échoué de notre côté. Une nouvelle tentative aura lieu dans un instant.',
    'error.laundering.node_full':
      'Cette façade blanchit déjà tout ce qu’elle peut. Attendez qu’elle écoule, ou passez par une autre.',
    'error.laundering.safehouse_short':
      'La planque ne tient pas assez d’argent pour ça. Ramassez d’abord la caisse d’un dealer.',
    'error.meta_progression.capability_not_dismissible':
      'Celle-ci reste. Elle ne peut pas être écartée.',
    'error.meta_progression.category_delegated':
      'Vous avez confié cette catégorie à un lieutenant. Reprenez-la pour décider vous-même.',
    'error.meta_progression.deviation_mode_not_available':
      'Cette manière de dévier n’est pas ouverte ici. Choisissez-en une autre.',
    'error.meta_progression.execution_window_exceeds_tier':
      'Cette fenêtre va plus loin que vous ne pouvez planifier. Raccourcissez-la.',
    'error.meta_progression.horizon_tier_already_maximum':
      'Vous planifiez déjà aussi loin qu’il est possible.',
    'error.meta_progression.metrics_simultaneous_reanchor_exceeded':
      'Trop de mesures sont réancrées en même temps. Faites-en moins à la fois.',
    'error.meta_progression.predicates_no_longer_met':
      'Les conditions ne sont plus réunies. Revoyez-les et reconfigurez.',
    'error.meta_progression.reanchor_quota_exhausted':
      'Vous avez réancré aussi souvent que permis pour l’instant. Attendez que le quota revienne.',
    'error.meta_progression.stability_counter_insufficient':
      'Ceci n’a pas encore tenu assez longtemps. Laissez-le courir davantage.',
    'error.meta_progression.standing_order_not_owned':
      'Cette consigne permanente ne vous appartient pas.',
    'error.named_sequence.cap_reached':
      'Vous détenez autant de séquences nommées que possible. Retirez-en une pour en nommer une autre.',
    'error.named_sequence.name_taken':
      'Ce nom est déjà utilisé. Choisissez-en un autre.',
    'error.named_sequence.unlock_required':
      'Nommer des séquences ne vous est pas encore ouvert. Continuez et cela le sera.',
    'error.payment.required':
      'Ceci exige un achat qui n’a pas abouti. Finalisez-le pour continuer.',
    'error.resource.not_found':
      'Ce n’est plus là.',
    'error.resource.state_conflict':
      'La situation a changé depuis votre dernier coup d’œil. Rechargez et décidez à nouveau.',
    'error.selling.cash_empty':
      'La caisse du dealer est vide.',
    'error.selling.safehouse_full':
      'La planque est pleine : blanchissez d’abord, pour faire de la place.',
    'error.service.maintenance':
      'La ville est fermée pour maintenance. Elle rouvrira dans un instant.',
    'error.signup.callsign_taken':
      'Ce nom est déjà pris. Choisissez-en un autre.',
    'error.sinuosity.rebuild_in_progress':
      'Une reconstruction est déjà en cours. Attendez qu’elle s’achève.',
    'error.sinuosity.rebuild_required':
      'Cet itinéraire doit être reconstruit avant de pouvoir transporter quoi que ce soit. Lancez la reconstruction.',
    'error.sinuosity.route_rebuilding':
      'Cet itinéraire est en cours de redessin. Il se stabilisera dans un moment.',
    'error.supply_chain.leg_resting':
      'Ce tronçon est au repos. Il redeviendra disponible dans un moment.',
    'error.supply_chain.maintenance_in_progress':
      'Un entretien est en cours sur place. Il s’achèvera de lui-même.',
    'error.supply_chain.trace_not_at_source':
      'Le chargement a déjà quitté sa source. Attendez son arrivée.',
    'error.telemetry.consent_required':
      'Ceci demande votre consentement aux diagnostics. Modifiez-le dans les réglages.',
    'error.telemetry.event_invalid':
      'Ce rapport de diagnostic n’a pas été accepté et a été écarté.',
    'error.validation.failed':
      'Une partie de ce que vous avez saisi n’a pas été acceptée. Corrigez-la et renvoyez.',
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
