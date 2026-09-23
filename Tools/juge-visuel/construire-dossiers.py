#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CHAQUE ÉCRAN MONTÉ A SON DOSSIER DE JUGE — index, référence à la résolution de travail, mandat (§DA-3).

Un juge à contexte vierge doit trouver EN UNE COMMANDE la référence de l'écran qu'il juge. Mesuré le
2026-09-03 : 30 dossiers aux noms hétérogènes, 143 PNG v6, aucun index écran → dossier → cadres.

Ce script produit, à partir de trois SOURCES mesurées et d'une TABLE d'attribution écrite ici :
  1. `Tools/juge-visuel/INDEX.md` — une ligne par locataire monté par `AppShell.cs` (les sites
     `MountTenant<…>` et `MonterLocataireEnSurimpression<…>`, lus dans le fichier) : symbole,
     contrôleur, dossier, cadres (page + numéros + SHA atelier), référence, planche en jeu attendue
     (existe / absente), état `front.md`, confiance de l'attribution (mesurée / déduite) ;
  2. `Tools/juge-visuel/<dossier>/reference-1080x2102.png` — le cadre NOMINAL rendu par
     `rendre-tel.py` à ×3,6 (300 px CSS → 1080 px), vérifié anti-crop par `rendre-maquette.py`.
     ⚠️ 1080×2102 et non 1080×2400 : le `.tel` de l'atelier est en 9:17,5 (583,33 px CSS) ; le
     téléphone cible est en 9:20. Étirer ou compléter à 2400 fabriquerait une image que personne n'a
     ratifiée — le juge aligne par PARTIES (mandat §1, en % de la largeur), jamais par le pixel absolu ;
  3. `Tools/juge-visuel/<dossier>/mandat.md` — pré-rempli (but, chemin joueur, routes lues dans le
     contrôleur, cadres, référence, planche, état) selon `.claude/skills/juge-visuel/` du back.

GARDES : tout contrôleur monté par AppShell sans ligne dans la table ⇒ exit 1 (l'index ne peut pas
être silencieusement incomplet) ; un cadre nominal hors de sa page ⇒ exit 1 ; une référence rendue
qui n'a pas la taille attendue ⇒ exit 1 (rendre-tel l'asserte). Une ligne « aucune maquette » est
une ligne, pas une absence.

Usage :  python3 Tools/juge-visuel/construire-dossiers.py [--controle] [--sans-rendu]
"""
import json, os, re, subprocess, sys

CLIENT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
# Le CODE (Assets : AppShell, contrôleurs, planches) peut être lu dans un AUTRE arbre que celui des outils : l'arbre DA part de main et
# prend du retard sur le client (payé le 2026-09-23 : ⑪ retiré au cumul 9be2fe9d, encore monté dans l'arbre DA). `--client <arbre>`.
ARBRE_CODE = os.path.abspath(os.path.expanduser(sys.argv[sys.argv.index("--client") + 1])) if "--client" in sys.argv else CLIENT
ATELIER = os.path.expanduser("~/project/atelier3d-mafia")
BACK = os.path.expanduser("~/project/mafia-clean-city")
JV = os.path.join(CLIENT, "Tools", "juge-visuel")
S4, S6, S1 = "ecrans-brennar-4.html", "ecrans-brennar-6.html", "ecrans-brennar.html"
ECHELLE = 3.6

# ---------------------------------------------------------------------------------------------
# TABLE D'ATTRIBUTION — écrite à la main depuis les preuves du 2026-09-03 (commentaires des
# contrôleurs, titres des cadres, dossiers existants, front.md). `confiance` dit comment chaque
# rattachement a été établi : "mesurée" = le contrôleur ou le dossier cite le cadre ; "déduite" = par
# le titre du cadre seulement ; "aucune" = pas de maquette connue.
# cadres : (page, [indices]) ; nominal : (page, index) ; planche : fichier attendu sous Assets/Screenshots.
# ---------------------------------------------------------------------------------------------
TABLE = [
 dict(sym="③", ctl="CityMapController", dossier="carte", chemin="onglet EMPIRE (défaut)",
      cadres=[(S6, list(range(22, 25)))], nominal=(S6, 22), planche="carte_ville_1080x2400.png",
      confiance="mesurée", note="ville peinte livrée le 03/09 (TD-494) ; cadres 22-24 avec les noms de fiction (TD-492)",
      nominal_note="cadre 22, Brennar la nuit",
      extras=[("carte/reference-chez-vous-1080x2102.png", "cadre 24 « approcher : chez vous », rendu le 2026-09-22 (atelier 868ab87) — la bande de La Lisière liste les quatre bâtiments du joueur : « le labo, la planque, la façade, la banque » (money_holding = « la banque », ④ d4)")]),
 dict(sym="④", ctl="DashboardController", dossier="accueil", chemin="surimpression à l'ouverture de session (acquisition), puis Accueil",
      cadres=[("ecrans-brennar-accueil.html", [0, 1, 2, 3])], nominal=None, planche="planche_l_accueil_1080x2400.png",
      confiance="mesurée", note="MAQUETTE À RATIFIER depuis le 23/09 (atelier 25 §2.2, table 45 : la carte de tête en forme honnête) — aucune référence RATIFIÉE (front.md:1609) ; "
      "les cadres 20-21 « Le Bureau du patron » sont ⑱ le menu Plus (front.md:1567). dossier du `accueil/r1-2026-09-23/` (preparer-dossiers-2026-09-23.py, commande f2 du 23/09) : référence et statut, écarts ASSUMÉS, à ne pas noter, ouverts, corps",
      extras=[(f"accueil/maquette-2026-09-23/cadre-{i}-1080x2102.png", f"MAQUETTE À RATIFIER, pas une référence — {e}") for i, e in
              enumerate(["rien à trancher", "la carte de tête, forme honnête", "des rapports à lire", "la file sous pression"])]),
 dict(sym="⑤", ctl="DecisionDetailScreenController", dossier="decision-du-jour", chemin="surimpression depuis la carte de tête (hl_card) de l'Accueil",
      cadres=[(S4, list(range(4, 9))), (S6, list(range(4, 9)))], nominal=(S4, 4), planche="decision_du_jour_1080x2400.png",
      confiance="mesurée", note="série 4 cadres 4-8 RATIFIÉS par l'user (« ok top on garde comme ça », 2026-08-26)"),
 dict(sym="⑥", ctl="LieutenantScreenController", dossier="famille", chemin="onglet FAMILLE",
      cadres=[(S1, ["organigramme (rangée « La Famille »)"])], nominal=None, planche="famille_1080x2400.png",
      confiance="mesurée", note="référence = Tools/family-organigramme-reference-1120.png (1120×1850) et famille/ecran-canon.png ; ⑦ ⑧ sont des sections du même contrôleur. "
      "⑦ (la fiche du lieutenant, la mécanique) : MAQUETTE À RATIFIER du 23/09 (`ecrans-brennar-7-lieutenant.html`, 4 cadres ; atelier 26, 41, 42) — dossier du `famille/r1-⑦-2026-09-23/` (preparer-dossiers-2026-09-23.py, commande f2 du 23/09) : référence et statut, écarts ASSUMÉS, à ne pas noter, ouverts, corps",
      extras=[(f"famille/maquette-7-2026-09-23/cadre-{i}-1080x2102.png", f"⑦ MAQUETTE À RATIFIER — {e}") for i, e in
              enumerate(["la fiche nominale", "le signal dérive", "l'ordre expire bientôt", "« Donner un ordre » : l'éditeur de ⑧ en ordre permanent"])]),
 dict(sym="⑯", ctl="DailyReviewScreenController", dossier="revue-du-jour", chemin="Plus → LA REVUE DU JOUR",
      cadres=[(S4, list(range(0, 4))), (S6, list(range(0, 4)))], nominal=(S4, 0), planche="revue_du_jour_seuil-force-0.1_1080x2400.png",
      confiance="mesurée", note="série 4 cadres 0-3 = le canon ratifié (revue-du-jour/v4-0..3.png)"),
 dict(sym="㊲", ctl="ReputationScreenController", dossier="reputation", chemin="Plus → LA RÉPUTATION",
      cadres=[(S6, list(range(119, 125)) + [144])], nominal=(S6, 120), planche="screen_b3_reputation_sous_chrome_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-120.png",
      # ⛔ Le nominal est le cadre 120 — MESURÉ le 2026-09-22 (PNG commité ↔ rendu de 120 : 2,4 % ; ↔ 119 : 24,6 %) ;
      #    l'INDEX écrit à la main disait « cadre 119 ». Re-rendu le 2026-09-22 (atelier 20d006d : « personne ne jugera »).
      extras=[("reputation/reference-derive-1080x2102.png", "cadre 121, rendu le 2026-09-22 — « on vous dit que vous dérivez… ce qui manque encore » (atelier 20d006d)"),
              ("reputation/reference-indetermine-1080x2102.png", "cadre 144, F12 — cohérence `indeterminate` AVEC de l'absorbé, l'état réel du compte que les six lignes ne couvraient pas")]),
 dict(sym="㉟", ctl="SellingScreenController", dossier="vente", chemin="Plus → LA VENTE",
      cadres=[(S6, list(range(107, 113)))], nominal=(S6, 107), planche="planche_la_vente_1080x2400.png",
      confiance="mesurée", note="⛔ RÉTABLI 107-112 / nominal 107 le 2026-09-22, MESURÉ sur le TEXTE AFFICHÉ (pas sur une classe CSS) : le cadre 107 porte l'étiquette « La vente — qui vend et ce qu'il y a dans la caisse » et dessine les six dealers + « AFFECTER UN DEALER » (c'est l'état nominal) ; 108 est « La caisse de Oskar » (un état) ; 113 est « L'horizon — ce qui s'ouvre et à quel prix » (㊱, déjà dans SA plage 113-118). Le PNG commité `vente/reference-1080x2102.png` EST le cadre 107 (7,1 % d'écart, dû au lot de vocabulaire de l'atelier ; 34,3 % contre 108) — le juge r1 a comparé au bon cadre. La « correction » du 2026-09-07 (107-112 -> 108-113, « #107 appartient à ㉗ : ses 47 occurrences de `vnt6` sont le bloc <style> ») déduisait l'appartenance d'un cadre de l'endroit où sa CSS est déclarée : le segment de 107 CONTIENT le <style> de la rangée ET son contenu — une déclaration dense n'exclut pas l'usage, elle le précède. ⇒ 5e mécanisme d'attribution fausse : corriger une table sur un compte de classe CSS sans relire le cadre. dealers en prénoms servis (§DA-2)",
      extras=[("vente/reference-ramasser-1080x2102.png", "cadre 109 « Ramasser — nulle part où la porter », le cadre d'état homologue de la capture r1 (demandé par le juge r1, point 3), rendu le 2026-09-22 après le gate (atelier 20d006d). ⚠️ Son texte « Il n'existe aujourd'hui aucun moyen d'en obtenir une » (une planque) est PÉRIMÉ : la planque est donnée à l'arrivée depuis le 31/08 (㊵·142) — à lire comme maquette en retard, jamais comme le texte attendu à l'écran")]),
 dict(sym="㉓", ctl="ShopScreenController", dossier="compte", chemin="Plus → LA VITRINE",
      cadres=[(S6, [98, 99, 100])], nominal=(S6, 98), planche="planche_la_vitrine_1080x2400.png",
      confiance="déduite", note="déduit par titre (98-100) — le contrôleur dit « cadres 48-50 », numérotation d'une autre série ; canon compte/boutique-canon.png"),
 dict(sym="⑮", ctl="InspectionScreenController", dossier="police", chemin="Plus → LES INSPECTIONS",
      cadres=[(S6, list(range(31, 36)))], nominal=(S6, 32), planche="planche_les_inspections_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite les cadres 31-35 ; canon police/inspections-canon.png. "
                               "⛔ NOMINAUX ÉCHANGÉS le 2026-09-07 : ⑮ portait 31 et ⑰ portait 32, c'était l'INVERSE. Établi à la source par le juge du r1 puis re-vérifié dans ecrans-brennar-6.html : le cadre 31 parle de « précinct » et porte belief + patrol_heat PAR PRÉCINCT (⑰), le cadre 32 de « dispatch / registre » (⑮) ; 34 et 35 « précinct » aussi. Confirmé par la luminance : contenu 15,5 capture / 22,7 canon série 2 / 141,2 cadre 31 — l'écart vers le canon est 17x plus petit. ⇒ Les DEUX dossiers faisaient rendre la référence de l'autre. ⇒ 3e attribution fausse de cette table (coffre, carnet, police) et TROIS MÉCANISMES DIFFÉRENTS : doublon, planche d'un autre écran, cadres croisés. Une table écrite à la main depuis des preuves n'a jamais été confrontée à sa source ligne par ligne. "),
 dict(sym="⑰", ctl="PrecinctScreenController", dossier="police", chemin="Plus → LE COMMISSARIAT",
      cadres=[(S6, list(range(31, 36)))], nominal=(S6, 31), planche="planche_le_commissariat_1080x2400.png",
      confiance="déduite", note="partage les cadres 31-35 avec ⑮ ; canon police/commissariat-canon.png. "
                               "⛔ NOMINAUX ÉCHANGÉS le 2026-09-07 : ⑮ portait 31 et ⑰ portait 32, c'était l'INVERSE. Établi à la source par le juge du r1 puis re-vérifié dans ecrans-brennar-6.html : le cadre 31 parle de « précinct » et porte belief + patrol_heat PAR PRÉCINCT (⑰), le cadre 32 de « dispatch / registre » (⑮) ; 34 et 35 « précinct » aussi. Confirmé par la luminance : contenu 15,5 capture / 22,7 canon série 2 / 141,2 cadre 31 — l'écart vers le canon est 17x plus petit. ⇒ Les DEUX dossiers faisaient rendre la référence de l'autre. ⇒ 3e attribution fausse de cette table (coffre, carnet, police) et TROIS MÉCANISMES DIFFÉRENTS : doublon, planche d'un autre écran, cadres croisés. Une table écrite à la main depuis des preuves n'a jamais été confrontée à sa source ligne par ligne. "),
 dict(sym="⑭", ctl="CompressionScreenController", dossier="compression", chemin="Plus → LA SEMAINE",
      cadres=[(S4, list(range(25, 31))), (S6, list(range(14, 20)))], nominal=(S4, 25), planche="planche_la_semaine_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite série 4 cadres 25-30 (non ratifiée au 02/09)"),
 dict(sym="㊴", ctl="ForensicScreenController", dossier="screen_b7", chemin="Plus → LE DOSSIER",
      cadres=[(S6, list(range(131, 137)) + [143])], nominal=(S6, 131), planche="screen_b7_dossier_sous_chrome_1080x2400.png",
      confiance="déduite", note="cadres 131-136 « Le dossier » par le titre",
      nominal_note="cadre 131, RE-RENDUE le 2026-09-06 : E1 — le palier de train de vie est celui d'UN LIEUTENANT, pas du joueur",
      extras=[("screen_b7/reference-vocabulaire-1080x2102.png", "cadre 143, LES 12 CRANS — les cadres d'état n'en montrent que 6 ; c'est le témoin que le juge réclamait en classant « l'échelle de chaque piste a disparu »")]),
 dict(sym="㊳", ctl="JournalScreenController", dossier="screen_c1", chemin="Plus → LE JOURNAL & LA RUE",
      cadres=[(S6, list(range(125, 131)) + [145])], nominal=(S6, 125), planche="screen_c1_journal_sous_chrome_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite les cadres 125 et 129",
      nominal_note="cadre 125",
      extras=[("screen_c1/reference-vocabulaire-1080x2102.png", "cadre 145, LES 11 CRANS — `fading` et `lingering` sont servis et n'avaient aucun dessin")]),
 dict(sym="㊵", ctl="FiliereScreenController", dossier="screen_c2", chemin="onglet FILIÈRE du dock (AppShell.cs:272) · la nav Filière de l'Accueil · Plus → LA FILIÈRE",
      cadres=[(S6, list(range(137, 143)))], nominal=(S6, 137), planche="screen_c2_filiere_sous_chrome_1080x2400.png",
      confiance="mesurée", note="★ PORTE LA FILIÈRE (2026-09-23, tranché) — ⑪ (LaunderingController) et ⑫ (PipelineOverviewController) sont RETIRÉS du client (cumul 9be2fe9d, code mort depuis D6 : 0 chemin joueur, 0 GUID en scène) ; leur entrée et le dossier « coffre » quittent cette table ; ㊵ lit deviation_active et l'ordre stage_index depuis a7b6b920 (les deux conditions ci-dessous sont TENUES). l'onglet Filière du dock monte ㊵ ; ⑪ (LaunderingController) et ⑫ (PipelineOverviewController) sortent du chemin joueur et ne sont PLUS À JUGER (atelier 25-… §1). Deux conditions à vérifier au jugement : ㊵ lit `deviation_active` (seul ⑪ le lisait), et l'ordre des étapes vient de `stage_index` (0 lecteur au 23/09 : l'ordre affiché était DÉDUIT). — le contrôleur cite le cadre 142 (« ce qui manque encore »)"),
 dict(sym="㉕", ctl="TutorialScreenController", dossier="compte", chemin="Plus → LA PREMIÈRE FOIS",
      cadres=[], nominal=None, planche="planche_la_premiere_fois_1080x2400.png",
      confiance="aucune", note="canon compte/tutoriel-canon.png ; aucun cadre de série 4/6 identifié"),
 dict(sym="㉒", ctl="ProfileScreenController", dossier="compte", chemin="Plus → VOTRE PROFIL",
      cadres=[(S6, [95, 96, 97])], nominal=(S6, 95), planche="planche_le_coffre_1080x2400.png",
      confiance="déduite", note="déduit par titre (95-97 « Le compte ») — le contrôleur dit « cadres 45-47 », autre numérotation ; canon compte/profil-canon.png ; ⚠️ sa planche s'appelle planche_le_coffre"),
 dict(sym="⑲", ctl="SettingsScreenController", dossier="compte", chemin="Plus → LES RÉGLAGES",
      cadres=[(S6, [95, 96, 97])], nominal=None, planche="planche_les_reglages_1080x2400.png",
      confiance="mesurée", note="front.md ⑲ (l.1847) : « fusionnée avec screen_c1 dans « LE PROFIL » … cadres 45-47 » (ancienne numérotation) "
      "= 95-97 « Le compte », tiroir « Le jeu » (la langue, « On vous explique encore ») ; ratifiée par délégation le 02/09 (front.md l.22). "
      "Référence : celle de ㉒ (même porte, cadre 95) — pas de rendu propre. Corrigé le 2026-09-23 (atelier, commande f2) : l'INDEX disait « aucune »"),
 dict(sym="㊱", ctl="HorizonScreenController", dossier="screen_c6", chemin="Plus → L'HORIZON DES POSSIBLES",
      cadres=[(S6, list(range(113, 119)))], nominal=(S6, 113), planche="screen_c6_horizon_etat-vide_sous_chrome_1080x2400.png",
      confiance="déduite", note="cadres 113-118 « L'horizon » par le titre ; liste vide par construction sur le compte de démo"),
 dict(sym="㉜", ctl="DelegationScreenController", dossier="ecran_delegation", chemin="Plus → CE QUE VOUS AVEZ CONFIÉ",
      cadres=[(S6, list(range(73, 79)))], nominal=(S6, 73), planche="planche_ce_que_vous_avez_confie_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-73..78",
      extras=[("ecran_delegation/reference-reserve-1080x2102.png", "cadre 78, rendu le 2026-09-22 — la réserve : « Personne ne les tient encore », « rien derrière » (atelier 20d006d)")]),
 dict(sym="㉚", ctl="ChaineDApproScreenController", dossier="ecran_appro", chemin="Plus → LA CHAÎNE D'APPRO",
      cadres=[(S6, list(range(48, 54)))], nominal=(S6, 48), planche="planche_la_chaine_d_appro_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-48 (repos) .. m-53 (délégué)"),
 dict(sym="㉘", ctl="DistributionScreenController", dossier="ecran_distribution", chemin="Plus → LA DISTRIBUTION",
      cadres=[(S6, list(range(54, 59)))], nominal=(S6, 54), planche="planche_la_distribution_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-54 (repos) .. m-58"),
 dict(sym="㉛", ctl="LoiScreenController", dossier="ecran_loi", chemin="Plus → LA LOI",
      cadres=[(S6, list(range(67, 73)))], nominal=(S6, 67), planche="planche_la_loi_1080x2400.png",
      confiance="déduite", note="cadres 67-72 (le parloir, l'avocat) par le titre",
      nominal_note="cadre 67, l'arrestation",
      extras=[("ecran_loi/reference-avocat-1080x2102.png", "cadre 68, LE CHOIX D'AVOCAT — rendue le 2026-09-06 : sans elle `Loi:339` était non vérifiable, ni écran faux ni maquette fausse, pas de référence")]),
 dict(sym="㉝", ctl="DemolitionScreenController", dossier="ecran_demolition", chemin="Plus → RASER UN SITE",
      cadres=[(S6, list(range(79, 85)))], nominal=(S6, 79), planche="planche_raser_un_site_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-79..84. ⛔ NOMINAL CORRIGÉ le 2026-09-07, 80 → 79 : "
                               "le juge du r1 a mesuré que la CAPTURE montre 79 (« L'organisation frotte ») et non 80 "
                               "(« Ce bâtiment vous coûte »), prouvé par 4 marqueurs de source dont VOIR CE QUI COÛTE "
                               "LE PLUS, 1 seule occurrence dans toute la page, en 79. Le dossier faisait donc rendre "
                               "la mauvaise référence, et la couche globale devenait incomparable (luminance ×8 : la "
                               "fiche crème de 80, 29,2 % de l'image, absente de 79 — cet écart n'accusait rien). "
                               "⇒ Un nominal est l'état que la CAPTURE montre, jamais l'état le plus représentatif du "
                               "groupe : il se mesure sur la planche, pas se choisit sur la maquette."),
 dict(sym="㉞", ctl="CarnetScreenController", dossier="carnet", chemin="Plus → LES ORDRES DU SOIR",
      cadres=[(S6, list(range(85, 92)))], nominal=(S6, 85), planche="",
      confiance="déduite", note="cadres 85-91 (ordres du soir, rejouer, ce qui arrive) par le titre. "
                               "⛔ PLANCHE RETIRÉE le 2026-09-07 : planche_signer_l_ordre_1080x2400.png NE PHOTOGRAPHIE "
                               "PAS cet écran. Elle montre une fiche de LIEUTENANT (Lt. Halde, Cuisinier, Au repos, "
                               "AUTONOMIE / RÉAFFECTER / ÉDITEUR DE RÈGLES, 23 lignes de Diagnostics). Mesuré par le juge "
                               "du r1, non uniforme donc discriminant : l'aplat crème #efe7d6, élément héros du carnet, "
                               "couvre 34,361 % de la référence, 0,144 % de la capture — et 0,436 % du canon HUD, un écran "
                               "SANS carnet, soit 3x plus que la capture. Luminance de contenu 143,0 -> 28,8. Ni doublon "
                               "d'assemblage (écart minimal 40,2 % avec les 22 autres planches) ni fichier corrompu "
                               "(sha256 identique au dépôt). "
                               "⚠️ ET CE CHAMP PORTAIT DÉJÀ SON PROPRE AVERTISSEMENT — « nom de planche à confirmer » — "
                               "et un juge a été routé dessus quand même : la mise en garde vivait dans une PROSE que le "
                               "générateur ne lit pas, et il a émis la planche comme les autres. "
                               "⇒ Un champ qui porte son doute dans un commentaire est consommé comme un fait. Le doute "
                               "doit vivre dans la DONNÉE (ici : chaîne vide), jamais dans la note. "
                               "⇒ Deuxième attribution fausse de cette table après planche_le_coffre — et la première "
                               "invisible à la garde des doublons, puisqu'elle ne concerne qu'UNE ligne : une planche "
                               "attribuée à un seul écran peut aussi être la mauvaise. À re-remplir par MESURE."),
 dict(sym="㉙", ctl="ConflitScreenController", dossier="ecran_conflit", chemin="Plus → LE CONFLIT",
      cadres=[(S6, list(range(59, 67)))], nominal=(S6, 59), planche="planche_le_conflit_1080x2400.png",
      confiance="déduite", note="cadres 59-66 (la table du fond) par le titre ; rivaux en noms de fiction NON servis (§C-2)",
      extras=[("ecran_conflit/reference-manque-1080x2102.png", "cadre 64, rendu le 2026-09-22 — « Ce qu'on ne peut pas faire » : « Personne n'y touche encore », « rien derrière » (atelier 20d006d)")]),
]
# Écrans que le shell ne monte PAS lui-même mais qui existent (montés par un autre locataire) —
# une ligne chacun, pour que le juge les trouve aussi.
HORS_APPSHELL = [
 dict(sym="①", ctl="DistrictInteriorScreenController", dossier="ecran-principal", chemin="depuis la carte : ENTRER dans le quartier",
      cadres=[("hud-brennar.html", ["le HUD de Brennar"])], nominal=None, planche="screen_1_district_sous_chrome_1080x2400.png",
      confiance="mesurée", note="ÉCART ASSUMÉ (2026-09-23, tranché par l'orchestrateur) : la bande du nom de district sous la barre est ABSENTE du canon (hud-brennar.html : aucun nom de district dans .tel ; la place l.82/l.176 est celle du bandeau éphémère QUAND IL PARLE) — elle reste, et CÈDE la place au bandeau ; sources : front.md §4 L (25/08, « le lieu en bandeau sous la barre ») et cette mesure. Ne pas la re-noter. — ÉCART ASSUMÉ (2026-09-23, décision f2) : l'anneau CRÈME autour du badge du bâtiment dont la fiche est ouverte (CLIENT-2 e9db74eb) — le canon n'a pas d'état de sélection, et le joueur doit voir quel bâtiment sa fiche décrit (r9 M6) ; crème, pas or, un seul à la fois. Ne pas le re-noter. — hors canon (front.md ①) ; canon ecran-principal/ecran-canon.png + mesure-canon.txt"),
 dict(sym="②", ctl="BuildingCardController", dossier="fiche-batiment", chemin="depuis l'intérieur de district : toucher un bâtiment",
      cadres=[(S6, list(range(36, 48)) + [92, 93, 94])], nominal=None, planche="screen_2a_fiche_sous_chrome_1080x2400.png",
      confiance="mesurée", note="dossier juge-donnees existant, aucun dossier juge-visuel. Cadres rattachés le 2026-09-23 (atelier, commande f2) : "
      "les matières de ② par type — la serre 36-38, le labo 39-44, le fourneau et l'affinage 45-46, la descente 47 (son panneau dit « ② Le fourneau »), "
      "Ash 92-94 (le rendez-vous : les routes /v1/operational/appointment sont dans BuildingCardController/Client) ; front.md ② (l.801-950 : serre, "
      "fourneau, « le labo devenu un écran », « Ash sort de la chimie », numérotation d'alors). Pas de nominal : la .fiche de ② est dessinée par ① (22 §5)"),
 dict(sym="⑨", ctl="ExceptionQueueController", dossier="exceptions", chemin="Accueil → la file d'exceptions",
      cadres=[(S4, [14, 16, 17, 18]), (S6, [9, 11, 12, 13])], nominal=(S4, 14), planche="screen_5_exceptions_sous_chrome_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite série 4 cadre 14, ratifié (« ok c'est bien », 2026-08-26)"),
 dict(sym="⑩", ctl="ExceptionDetailController", dossier="exceptions", chemin="depuis la file : une exception",
      cadres=[(S4, [15]), (S6, [10])], nominal=(S4, 15), planche="screen_5a_detail_main-de-cartes_sous_chrome_1080x2400.png",
      confiance="déduite", note="cadre 15 « Exception — sa main » par le titre"),
 dict(sym="㉔", ctl="AutonomyInboxController", dossier="autonomie", chemin="Accueil → rapports d'autonomie",
      cadres=[(S6, list(range(25, 31)))], nominal=(S6, 25), planche="planche_l_autonomie_1080x2400.png",
      confiance="déduite", note="cadres 25-30 « Autonomie » (le burner) par le titre",
      extras=[("autonomie/reference-message-1080x2102.png", "cadre 26, rendu le 2026-09-23 — le message ouvert, « CE CYCLE » sans heure (le rapport n'a pas d'horodatage ; atelier ec4c09a)"),
              ("autonomie/reference-reponse-1080x2102.png", "cadre 29, rendu le 2026-09-23 — la réponse 2 (HOLD) rend HELD, « LE CHARGEMENT ATTEND. » ; l'ancien NOOP était impossible (atelier ec4c09a)")]),
 dict(sym="⑬", ctl="CueStack (sections)", dossier="pile-du-jour", chemin="depuis une exception résolue",
      cadres=[(S4, list(range(19, 25)))], nominal=(S4, 19), planche="",
      confiance="déduite", note="série 4 cadres 19-24 « Pile du jour » ; canon pile-du-jour/v4-19..24.png"),
 dict(sym="⑳", ctl="Recruitment (sections)", dossier="recrutement", chemin="Famille → recruter",
      cadres=[(S4, list(range(9, 14)))], nominal=(S4, 9), planche="",
      confiance="déduite", note="série 4 cadres 9-13 « Recrutement » ; canon recrutement/v4-9..13.png"),
 dict(sym="㉑", ctl="Market (non monté)", dossier="marche", chemin="—",
      cadres=[(S6, list(range(101, 107)))], nominal=(S6, 101), planche="",
      confiance="déduite", note="cadres 101-106 (le tableau) ; écran bloqué (front.md) ; la colonne des quartiers tronque les noms longs (§DA-2)"),
 dict(sym="⑱", ctl="AppShell.MonterMenuPlus", dossier="plus", chemin="onglet PLUS",
      cadres=[(S6, [20, 21])], nominal=(S6, 20), planche="", confiance="mesurée",
      note="cadres 20-21 « Le Bureau du patron » = le menu Plus (front.md:1567, série 6 v3.3) ; canon plus/ecran-canon.png ; le menu, pas un locataire"),
]


# ---------------------------------------------------------------------------------------------
# MISE À JOUR du 2026-09-23 (commande f2 : dossiers de juge des écrans travaillés la nuit) — ajoutée ICI, par symbole, pour que la
# donnée vive dans le générateur (une régénération ne l'efface pas) sans réécrire des notes longues. Les dossiers datés sont produits
# par `preparer-dossiers-2026-09-23.py` ; les maquettes « à ratifier » sont des EXTRAS, jamais des nominaux (ce ne sont pas des références).
# ---------------------------------------------------------------------------------------------
def _maj_2026_09_23():
    par = {r["sym"]: r for r in TABLE + HORS_APPSHELL}
    D = "dossier daté du 23/09 : `{}` (référence et statut, écarts ASSUMÉS, à ne pas noter, ouverts, corps et leur fraîcheur)"
    par["㉕"].update(cadres=[("ecrans-brennar-25-tutoriel.html", [0, 1, 2, 3])], confiance="mesurée",
                     note="canon RATIFIÉ par délégation (02/09, front.md l.22, l.1803) : compte/tutoriel-canon.png et tutoriel-vide.png (série 2, cadres 31-32, 900×1752) ; "
                          "MAQUETTE À RATIFIER du 23/09 autour des données servies (atelier 33, `ad616c56`). " + D.format("compte/r1-㉕-2026-09-23/")
                          + " ⛔ la refonte du client (CLIENT-2 `049a863e`) n'est pas fusionnée au cumul : capture jugeable après fusion.")
    par["㉕"]["extras"] = [(f"compte/maquette-25-2026-09-23/cadre-{i}-1080x2102.png", f"MAQUETTE À RATIFIER — {e}") for i, e in
                          enumerate(["1ʳᵉ session, bulle sur la carte pré-semée", "1ʳᵉ session, file vidée", "2ᵉ session, page sous Plus", "le refus"])]
    par["⑲"]["note"] += (" — MISE À JOUR 23/09 : la porte « ce que le back sert aujourd'hui » (dérivée du 97 ratifié), MAQUETTE À RATIFIER. "
                         + D.format("compte/r1-⑲-2026-09-23/") + " ⛔ le branchement du client (CLIENT-2 `19ddc253`, `9e298c64`) n'est pas fusionné au cumul.")
    par["⑲"].setdefault("extras", []).append(("compte/porte-2026-09-23/cadre-0-1080x2102.png", "MAQUETTE À RATIFIER, pas une référence — la porte mise à jour (`7d00782d`)"))
    par["㉙"]["note"] += (" — 23/09 : le geste vise un AXE (atelier 40, `997d6ab4`) ; ㉙ n'est PAS ratifiée (décision f2 : front.md l.22, l.1328) — "
                         "ses références sont des MAQUETTES À RATIFIER ; mots genrés en formes épicènes (D13, table 40 v3). " + D.format("ecran_conflit/r3-2026-09-23/"))
    par["①"]["note"] += (" — 23/09 : la référence est `ecran-canon-propre.png`, **1176×2091 à ×3,0** (392 CSS) — le r10 annonçait ×3,6 à tort. "
                         + D.format("ecran-principal/r11-2026-09-23/"))
    par["②"]["note"] += (" — 23/09 : ⛔ AUCUNE référence à jour rendue (v6/m-36…94 = 900×1752 du 03/09, avant DejaVu et le chrome ratifié) : à rendre au "
                         "prochain signal avant de juger ; lots 1, 4, 6 de CLIENT-2 non fusionnés au cumul. " + D.format("fiche-batiment/r1-2026-09-23/"))
    par["④"]["note"] = par["④"]["note"].replace("`accueil/r1-2026-09-23/`", "`accueil/r1-2026-09-23/`")


_maj_2026_09_23()


def montages_appshell():
    src = open(os.path.join(ARBRE_CODE, "Assets/Scripts/Shell/AppShell.cs"), encoding="utf-8").read()
    return sorted(set(re.findall(r"(?:MountTenant|MonterLocataireEnSurimpression)<([A-Za-z]+Controller)>\(\)", src)))


def front_md():
    """symbole → (id canon, nom, état de l'en-tête, puce « Montre »)."""
    out = {}
    lignes = open(os.path.join(BACK, "front.md"), encoding="utf-8").read().split("\n")
    for i, l in enumerate(lignes):
        m = re.match(r"^### ([①-㊿])\s*(`[^`]+`)?\s*[—–-]?\s*\*\*(.+?)\*\*(.*)$", l)
        if not m:
            continue
        montre = ""
        for l2 in lignes[i + 1:i + 40]:
            if l2.startswith("- **Montre**"):
                montre = re.sub(r"\s+", " ", l2[len("- **Montre** :"):]).strip()[:220]
                break
            if l2.startswith("### "):
                break
        out[m.group(1)] = dict(id=(m.group(2) or "").strip("`"), nom=m.group(3).strip(), reste=m.group(4).strip()[:120], montre=montre)
    return out


def routes_du_controleur(ctl):
    chemin = subprocess.run(["grep", "-rl", f"class {ctl}\\b", os.path.join(ARBRE_CODE, "Assets/Scripts"), "--include=*.cs"],
                            capture_output=True, text=True).stdout.split()
    if not chemin:
        return [], ""
    # les routes vivent souvent dans le CLIENT voisin (`XClient.cs`) : on lit tout le dossier du contrôleur
    dossier = os.path.dirname(chemin[0])
    src = "".join(open(os.path.join(dossier, f), encoding="utf-8").read() for f in sorted(os.listdir(dossier)) if f.endswith(".cs"))
    routes = sorted(set(re.findall(r'"(/v1/[^"{]+)', src)) | set(re.findall(r'\$"(/v1/[^"]+)"', src)))
    return routes, os.path.relpath(dossier, CLIENT) + "/*.cs"


def sha_atelier():
    return subprocess.run(["git", "-C", ATELIER, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()


def rendre_reference(page, idx, sortie):
    r = subprocess.run([sys.executable, os.path.join(CLIENT, "Tools/rendre-tel.py"), os.path.join(ATELIER, page), str(idx), sortie, str(ECHELLE)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"rendu {page}#{idx} → {sortie} : {r.stdout[-300:]}{r.stderr[-300:]}")
    from PIL import Image
    w, h = Image.open(sortie).size
    if (w, h) != (1080, 2102):
        raise SystemExit(f"référence {sortie} : {w}×{h} ≠ 1080×2102")
    return w, h


MANDAT = """# Mandat pré-rempli — {sym} {nom} — dossier `{dossier}`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le {date} (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : {nom} ({sym}, canon `{id}`) — contrôleur `{ctl}`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : {montre}
- **Chemin joueur pour y arriver** : {chemin}
- **Routes lues dans le contrôleur** : {routes}
- **État `front.md`** (en-tête) : {etat}

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
{ref_table}
- **Cadres de la maquette** : {cadres} — atelier `{sha}`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : {confiance}. {note}
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/{planche}` — {planche_etat}. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
"""


def main(argv):
    controle = "--controle" in argv
    sans_rendu = "--sans-rendu" in argv
    import datetime
    date = datetime.date.today().isoformat()
    montes = montages_appshell()
    table = {r["ctl"]: r for r in TABLE}
    manquants = [c for c in montes if c not in table]
    if manquants:
        raise SystemExit(f"⛔ contrôleurs montés par AppShell sans ligne dans la table : {manquants}")
    fm = front_md()
    sha = sha_atelier()
    lignes = ["# INDEX — écran → dossier de juge → cadres (généré, `construire-dossiers.py`, %s)" % date, "",
              "Un juge à contexte vierge part d'ici. `dossier` est sous `Tools/juge-visuel/` ; `référence` = le cadre nominal rendu à "
              "×3,6 (1080×2102, anti-crop vérifié) ; `cadres` = page de l'atelier + numéros (index 0-based = numéro du cadre) au SHA atelier `%s`. "
              "`confiance` dit comment le rattachement cadre ↔ écran a été établi : **mesurée** (le contrôleur ou un dossier cite le cadre), "
              "**déduite** (par le titre du cadre), **aucune** (pas de maquette de série 4/6 — une ligne est une ligne, pas une absence)." % sha, "",
              "`corps` = `<dossier>/corps-reels/` (§DA-4, `capturer-corps-reels.py`) : réponses RÉELLES des routes du dossier de code du contrôleur sur la pile dev, "
              "compte de démo — « a/s/m/e » = appelées (2xx) / sans instance sur ce compte / mutations non appelées / erreurs HTTP réelles du back (404, 409, 403 : des faits, pas des trous).", "",
              # ⚠️ paragraphe écrit À LA MAIN dans l'INDEX le 2026-09-06 (b7e8ea18) et PERDU à chaque régénération tant qu'il ne vivait
              #    pas ici — porté dans le générateur le 2026-09-22 (même classe que les cellules `nominal_note` / `extras` de la TABLE).
              "⚠️ Ces corps ont été pris sur un back **daté** — la provenance voyage avec chaque fichier (`back_main`, image, date, compte). "
              "Ne pas se demander « sont-ils à jour ? » de mémoire : `python3 verifier-fraicheur-corps.py` compare le SHA que les corps déclarent "
              "à `main` du back aujourd'hui, et ne signale que les corps dont une source touchée peut changer la réponse. Il ne rejoue rien "
              "(la pile dev est requise pour ça, donc jamais pendant un gate).", "",
              "| sym | écran (front.md) | contrôleur | dossier | cadres | référence | planche en jeu | état front.md | confiance | corps |",
              "|---|---|---|---|---|---|---|---|---|---|"]
    for r in TABLE + HORS_APPSHELL:
        f = fm.get(r["sym"], {})
        cad = " · ".join(f"`{p}` {', '.join(map(str, ix))}" for p, ix in r["cadres"]) or "aucune maquette de série 4/6"
        nb = sum(1 for x in TABLE + HORS_APPSHELL if x["dossier"] == r["dossier"])
        ref = (f"`{r['dossier']}/reference-{r['sym'] + '-' if nb > 1 else ''}1080x2102.png`") if r["nominal"] else "—"
        # ⛔ Les références NOMMÉES vivent dans la TABLE, jamais écrites à la main dans l'INDEX : le 2026-09-22 une
        #    régénération a effacé quatre cellules écrites à la main (㊲ ㊴ ㊳ ㉛) — une donnée qui n'a qu'une copie, dans
        #    un fichier généré, disparaît à la première régénération.
        if r.get("nominal_note"):
            ref += f" ({r['nominal_note']})"
        for fichier, pourquoi in r.get("extras", []):
            ref += f" + `{fichier}` ({pourquoi})"
        planche = r["planche"]
        pe = ("existe" if planche and os.path.exists(os.path.join(ARBRE_CODE, "Assets/Screenshots", planche)) else ("ABSENTE" if planche else "—"))
        corps = "—"
        for nom_idx in (f"_index-{r['sym']}.json", "_index.json"):
            chemin_idx = os.path.join(JV, r["dossier"], "corps-reels", nom_idx)
            if os.path.exists(chemin_idx):
                try:
                    ci = json.load(open(chemin_idx, encoding="utf-8")).get("comptes", {})
                    corps = f"{ci.get('appelées', 0)}a/{ci.get('sans instance', 0)}s/{ci.get('mutations', 0)}m/{ci.get('erreurs', 0)}e"
                except Exception:
                    corps = "index illisible"
                break
        lignes.append(f"| {r['sym']} | {f.get('nom', '?')} `{f.get('id', '')}` | `{r['ctl']}` | `{r['dossier']}` | {cad} | {ref} | `{planche}` ({pe}) | {f.get('reste', '') or '—'} | {r['confiance']} | {corps} |")
    # les dossiers DATÉS les plus récents (lus sur le disque, jamais écrits à la main) — le juge part de l'INDEX et doit les trouver
    import glob as _g
    dates = sorted({m.group(1) for d in _g.glob(os.path.join(JV, "*", "r*-20*")) for m in [re.search(r"(20\d\d-\d\d-\d\d)$", d)] if m})
    if dates:
        der = dates[-1]
        lignes += ["", f"**Dossiers de juge datés du {der}** (préparés, captures à poser au créneau) — à lire AVANT le mandat de l'écran :", ""]
        for d in sorted(_g.glob(os.path.join(JV, "*", f"r*-{der}"))):
            jd = [x for x in _g.glob(os.path.join(CLIENT, "Tools", "juge-donnees", os.path.basename(os.path.dirname(d)), f"*{der}")) if os.path.isdir(x)]
            sym = re.search(r"-([①-㊿])-", os.path.basename(d))   # dossier partagé (compte : ⑲, ㉕) : le jumeau du MÊME symbole
            if sym: jd = [x for x in jd if sym.group(1) in os.path.basename(x)]
            lignes.append(f"- `{os.path.relpath(d, JV)}/dossier.md`" + (" · juge-données : " + ", ".join(f"`{os.path.relpath(x, CLIENT)}/`" for x in sorted(jd)) if jd else ""))
    lignes += ["", f"Montés par `AppShell.cs` : {len(montes)} contrôleurs distincts ({', '.join(montes)}) — tous indexés (garde du script). "
               f"Lignes hors AppShell : {len(HORS_APPSHELL)}."]
    index = "\n".join(lignes) + "\n"
    if controle:
        print(index)
        return 0
    open(os.path.join(JV, "INDEX.md"), "w", encoding="utf-8").write(index)
    partages = {}
    for r in TABLE + HORS_APPSHELL:
        partages[r["dossier"]] = partages.get(r["dossier"], 0) + 1
    n_ref = 0
    for r in TABLE + HORS_APPSHELL:
        d = os.path.join(JV, r["dossier"]); os.makedirs(d, exist_ok=True)
        f = fm.get(r["sym"], {})
        ref_rows = []
        if r["nominal"]:
            page, idx = r["nominal"]
            sortie = os.path.join(d, "reference-1080x2102.png")
            if partages[r["dossier"]] > 1:   # dossier partagé par plusieurs écrans : un fichier par symbole
                sortie = os.path.join(d, f"reference-{r['sym']}-1080x2102.png")
            if not sans_rendu:
                w, h = rendre_reference(page, idx, sortie); n_ref += 1
            elif os.path.exists(sortie):
                from PIL import Image
                w, h = Image.open(sortie).size
            else:
                raise SystemExit(f"--sans-rendu mais {sortie} n'existe pas")
            ref_rows.append(f"| `{os.path.relpath(sortie, JV)}` | cadre nominal `{page}` #{idx} rendu | {w}×{h} | ×{ECHELLE} | 300 CSS = 1080 px |")
        for canon in sorted(os.listdir(d)):
            if canon.endswith("-canon.png") or canon.startswith("ecran-canon"):
                ref_rows.append(f"| `{r['dossier']}/{canon}` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |")
        routes, fichier = routes_du_controleur(r["ctl"])
        planche_etat = "existe" if r["planche"] and os.path.exists(os.path.join(ARBRE_CODE, "Assets/Screenshots", r["planche"])) else "ABSENTE — à capturer"
        mandat = MANDAT.format(sym=r["sym"], nom=f.get("nom", "?"), dossier=r["dossier"], date=date, id=f.get("id") or "sans id canon (écran neuf)", ctl=r["ctl"],
                               montre=f.get("montre") or "non fourni (front.md ne porte pas de puce « Montre » pour cet écran)",
                               chemin=r["chemin"], routes=(", ".join(f"`{x}`" for x in routes) or "aucune chaîne `/v1/` dans le dossier du contrôleur (les routes vivent dans un client partagé ailleurs — voir juge-donnees)") + (f" (`{fichier}`)" if fichier else ""),
                               etat=f.get("reste") or "—", ref_table="\n".join(ref_rows) or "| — | aucune référence rendue (aucune maquette de série 4/6) | — | — | — |",
                               cadres=" · ".join(f"`{p}` {', '.join(map(str, ix))}" for p, ix in r["cadres"]) or "aucune", sha=sha,
                               confiance=r["confiance"], note=r["note"], planche=r["planche"] or "—", planche_etat=planche_etat)
        nom_mandat = "mandat.md" if partages[r["dossier"]] == 1 else f"mandat-{r['sym']}.md"
        open(os.path.join(d, nom_mandat), "w", encoding="utf-8").write(mandat)
    print(f"INDEX.md : {len(TABLE) + len(HORS_APPSHELL)} lignes · références rendues : {n_ref} · mandats : {len(TABLE) + len(HORS_APPSHELL)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
