#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Classe la population de `chaines-joueur.py` — et la TIENT, par un cliquet.

⛔ LES VERDICTS SONT POSÉS PAR LECTURE, PAS PAR MOTIF. La question est une propriété de langue
(« quelqu'un qui ne sait pas comment le jeu est fabriqué comprendrait-il ? ») et une propriété ne
se met pas en regex. Le vocabulaire d'atelier n'a servi qu'au RAPPEL, puis chaque hit a été
OUVERT. Ce rappel a produit six fausses accusations (classe `N`) : le mot y a son sens ordinaire,
et `Commerce-écran` est la traduction maison de `FRONT_SHOP`, où « écran » veut dire paravent.
⇒ Elles restent ici : sans elles, rien ne prouverait que le critère est la propriété, pas le mot.

⛔⛔ CHAQUE MOTIF PORTE SA VALEUR ATTENDUE, ET LE CLIQUET ROUGIT DANS LES DEUX SENS.
Un motif à `0` n'est PAS « satisfait » par défaut : la première version de ce fichier passait au
rouge après les correctifs, en criant « fragment sans cible » sur les dix motifs que le lot venait
justement de fermer. C'est l'inversion classique — *un contrôle qui exige la présence de ce qu'on
supprime accuse le correctif*. La forme juste, celle que le socle prescrit : écrire l'attendu
AVANT et APRÈS, et faire rougir tout écart.
  · `n > attendu`  ⇒ la classe REVIENT (quelqu'un a réécrit la phrase fautive ailleurs)
  · `n < attendu`  ⇒ l'épingle est PÉRIMÉE (la chaîne a bougé) — à re-mesurer, pas à ignorer
⇒ Les motifs de B et N sont épinglés à leur valeur mesurée : ils ne sont pas corrigés, ils sont
  SURVEILLÉS. Un 54ᵉ « le serveur … » ferait rougir le cliquet le jour où il est écrit.

⚠️ CE QUE CE CLIQUET NE VOIT PAS, et il faut le dire : il surveille les FORMULATIONS connues.
Une phrase de la même classe écrite avec d'autres mots passe. Il ferme la récidive, pas la classe.
"""
import collections, re, subprocess, sys, pathlib

A = "A — INSTRUCTION DE DÉVELOPPEUR SERVIE AU JOUEUR"
B = "B — L'ARCHITECTURE COMME EXPLICATION (dire le trou est la doctrine ; le dire avec les mots de l'atelier ne l'est pas)"
C = "C — IDENTIFIANT INTERNE RENDU TEL QUEL"
D = "D — DIVULGATION"
E = "E — ÉNONCÉ DATÉ SERVI AU JOUEUR"
R = "R — REVENDIQUÉ PUIS RETIRÉ : mesuré DÉLIBÉRÉ en ouvrant la cible"
N = "N — HORS CLASSE : le mot d'atelier a ici son sens ORDINAIRE (contrôle négatif)"
L = "L — LIBELLÉ RESTÉ EN ANGLAIS (lot D, atelier ④ `04-libelles-anglais.md` : le client écrit ce mot, en français)"

# (classe, fragment, attendu, pourquoi)
VERDICTS = [
 (A, "vérifier la pile",                        0, "CLOS — disait au joueur d'inspecter la pile Docker"),
 (A, "Check the seeder + stack",                0, "CLOS — disait au joueur de lancer le seeder (4 sites)"),
 (A, "Quelqu'un doit écrire les textes",        0, "CLOS — s'adressait au studio, pas au joueur"),

 (E, "au 2 septembre 2026",                     0, "CLOS — date de mesure servie au joueur ; le fichier disait lui-même « à re-mesurer »"),
 (D, "le serveur la rend en clair",             0, "CLOS — mesuré côté back : /v1/me est scopé au compte du jeton, aucune route ne rend l'adresse d'un tiers. La phrase disait VRAI et présentait le droit d'accès comme une faiblesse. Le masquage reste."),

 (C, "pas d'agrégat pour la ville",             0, "CLOS — « agrégat ». ⚠️ « indisponible » conservé : CharpenteAccueilPanneaux l'asserte"),
 (C, "fetch failed",                            0, "CLOS — la raison nommait un verbe HTTP"),
 (C, "{dto.profile}",                           0, "CLOS — 1ab5cd91 (22/09) : `TissuDeDistrict.EnLigne/Valeur`, les six mots de fiction de l'atelier ; le code brut n'atteint plus le joueur (un profil inconnu se montre brut, déclaré)"),
 (C, "Heat: Unavailable",                       0, "⚠️ LOT ANGLAIS — le panneau entier est encore anglais (`RenderBar(heatText, \"Heat\", …)`, idem Friction/Stress) ; la conversion i18n du 2026-09-03 n'a converti que Cohésion. Je ne devance pas ce lot. · lot D1 22/09, chrome (1→0)"),

 (R, "AND_IF",                                  1, "RETIRÉ DE C — c'est le token de la GRAMMAIRE BACK que le joueur écrit dans ses règles. LieutenantUiExtensionPlayModeTests:607 asserte que ces tokens sont exposés « grounded VERBATIM in the backend grammar », et RuleEditorTier2:219 épingle la source sérialisée. L'afficher est délibéré."),
 (R, "(sans clé)",                              2, "RETIRÉ DE C — HorizonScreenController:180 porte, en code, « Le titre EST la clé : c'est ce que la maquette ratifiée montre »."),
 (R, "l'identifiant tient lieu de contenu",     1, "RETIRÉ DE C — même doctrine du trou honnête : l'écran DIT que l'identifiant remplace un texte non écrit. Aucun commentaire ne le ratifie explicitement ⇒ laissé en l'état plutôt que tranché sans maquette."),

 (B, "la route n'a rien rendu",                 0, "CLOS lot C 22/09 (㊳ le journal) — était : « route » = endpoint · lot C 22/09 : ㉞ les ordres du soir (4→3) · lot C 22/09 : ㊵ la filière (3→2) · lot C 22/09 : ㊴ le dossier (2→1)"),
 (B, "aucune route ne dit ce qu'elles",         0, "CLOS lot C 22/09 (㉙ le conflit) — était : « route » · lot C 22/09 : ㉙ le conflit (2→1)"),
 (B, "aucune route ne connaît",                 0, "CLOS lot C 22/09 (㉙ le conflit) — était : « route » · lot C 22/09 : ㉙ le conflit (2→1)"),
 (B, "Aucune route ne liste vos bâtiments",     0, "CLOS lot C 22/09 (㉝ raser un site) — était : « route »"),
 (L, "Upgrade lab tier", 0, "② bouton (:909)"),
 (L, "Upgrade hub tier", 0, "② bouton (:935)"),
 (L, "Upgrade holding tier", 0, "② bouton (:961)"),
 (L, "Order Pyralin", 0, "② bouton (:976)"),
 (L, "Start Cook", 0, "② bouton (:977)"),
 (L, "Start Ash Cook", 0, "② bouton (:984)"),
 (L, "Honor appointment", 0, "② bouton (:987)"),
 (L, "Tend crop", 0, "② bouton (:1009)"),
 (L, "Dispatch courier", 0, "② bouton (:1037)"),
 (L, "Deposit cash", 0, "② bouton (:1057)"),
 (L, "Withdraw cash", 0, "② bouton (:1058)"),
 (L, "Convert", 0, "② bouton (:1068) ; « Plant » (:1026) N'EST PAS épinglé : sous-chaîne de « Planter »"),
 (L, "Inject (launder)", 0, "② bouton (:991) ; il reste ⑪ LaunderingController:250, fermé par son commit · lot D1 22/09, ⑪ (1→0)"),
 (L, "EXCEPTION", 0, "⑨:509 en-tête de panne, ⑩:566/569/591 en-tête de la main"),
 (L, "See all exceptions", 0, "panneau du shell (:236)"),
 (L, "District {districtId}", 0, "③ titre de repli du panneau de détail (:1016)"),
 (L, "Citywide heat", 0, "④ ligne (:389, :398)"),
 (L, "Escalat", 0, "④ ligne « Escalation / Escalating » (:391)"),
 (L, "Steady", 0, "④ valeur (:391)"),
 (L, "Vocabulary", 1, "④ ligne (:405) fermée ; l'occurrence restante est le PARAMÈTRE `{VocabularyTier}` d'une phrase déjà française (⑥:3137 « Palier de vocabulaire {VocabularyTier} — … ») — un nom de variable, pas un libellé"),
 (L, "Tier {", 0, "④ valeur (:406) ; RuleModel.cs:210 « 🔒 Tier {n} » n'est pas dans la population (hors lot atelier, signalé)"),
 (L, "Wallet unavailable", 0, "④ repli du portefeuille (:423)"),
 (L, "Alerts", 0, "④ ligne (:456)"),
 (L, "City Map", 0, "④ navigation (:467)"),
 (L, "Building Card", 0, "④ navigation (:468)"),
 (L, "Exceptions", 0, "④ navigation (:470)"),
 (L, "Autonomy", 0, "④ navigation (:471)"),
 (L, "Unavailable", 0, "④ (:398) fermé ; il reste la chrome OrgVitals:192, fermée par son commit · lot D1 22/09, chrome (1→0)"),
 (L, "Loading lieutenant", 0, "⑥ (:2862)"),
 (L, "Confirm reassignment", 0, "⑥ (:2866)"),
 (L, "Projected settling", 0, "⑥ (:2868)"),
 (L, "Tenure forfeited", 0, "⑥ (:2870)"),
 (L, "Yield bonus lost", 0, "⑥ (:2871)"),
 (L, "NONE", 0, "⑥ libellé du cycleur AND_IF sans condition (:3405) — la valeur interne « NONE » reste (logique :3410/:3411/:3470/:3476)"),
 (L, "Commit (hold)", 0, "⑤ bouton (:237)"),
 (L, "Compression week", 0, "chrome (:132)"),
 (L, "No banner", 0, "chrome (:132) — état inactif sans texte"),
 (L, "Pressure: ", 0, "chrome (:138) — les bandes normal/warning/saturated restent (lot E, clés au back)"),
 (L, "not requested yet", 0, "OrgVitals (:70)"),
 (L, "no answer", 0, "OrgVitals (:104)"),
 (L, "Heat", 0, "OrgVitals (:154, :192)"),
 (L, "Stress", 0, "OrgVitals (:162) ; « Friction » reste (même mot)"),
 (L, "Cleanliness", 0, "⑪ ligne (:218)"),
 (L, "Deviation", 0, "⑪ ligne (:222)"),
 (L, "Audit pin active", 0, "⑪ valeur (:222)"),
 (L, "Conforming", 0, "⑪ valeur (:222)"),
 (L, "[~] Minimal", 0, "㉔ (:372)"),
 (L, "[<>] Arbitrage", 0, "㉔ (:373)"),
 (L, "Exposition accrue", 0, "㉔ (:374)"),
 (L, "Coût d'opportunité", 0, "㉔ (:375)"),
 (L, "Degrading", 0, "② valeur (:678)"),
 (L, "Stable", 0, "② valeur (:678)"),
 (N, "Aucune route connue pour l'instant",      0, "CLOS lot C 22/09 (㉘ la distribution) — était : « route » = endpoint, alors que l'écran voisin dit « CETTE ROUTE » pour un itinéraire"),
 (B, "aucune route n'existe encore",            0, "CLOS lot C 22/09 (⑰ le commissariat) — était : « route »"),
 (B, "la route voisine vise les affaires",      0, "CLOS lot C 22/09 (⑰ le commissariat) — était : « route voisine »"),
 (B, "aucune route de mutation de profil",      0, "CLOS lot C 22/09 (㉒ le compte) — était : « route de mutation »"),
 (B, "aucune route TOTP",                       0, "CLOS lot C 22/09 (㉒ le compte) — était : « route » + sigle de protocole"),
 (B, "aucune route ne l'écrit",                 0, "CLOS lot C 22/09 (㉒ le compte) — était : « route »"),
 (B, "aucune route de déconnexion joueur",      0, "CLOS lot C 22/09 (⑲ les réglages) — était : « route joueur »"),
 (B, "aucune route joueur",                     0, "CLOS lot C 22/09 (㉞ les ordres du soir) — était : « route joueur » + « maquette » + « serveur »"),
 (B, "la route répond, et elle répond",         0, "CLOS lot C 22/09 (㊵ la filière) — était : « route »"),
 (B, "n'ont aucune surface joueur",             0, "CLOS lot C 22/09 (㉜ ce que vous avez confié) — était : « surface joueur »"),
 (B, "le domaine RGPD n'a pas de surface",      0, "CLOS lot C 22/09 (⑲ les réglages) — était : « domaine » + « surface joueur »"),
 (B, "aucun domaine de sauvegarde",             0, "CLOS lot C 22/09 (㉒ le compte) — était : « domaine »"),
 (B, "chacune vit sur sa propre route",         0, "CLOS lot C 22/09 (⑲ les réglages) — était : « route » + « service »"),
 (B, "aucune n'est branchée",                   0, "CLOS lot C 22/09 (㉜ ce que vous avez confié) — était : « branché » = câblé"),
 (B, "Aucune n'est branchée",                   0, "CLOS lot C 22/09 (㉜ ce que vous avez confié) — était : « branché »"),
 (B, "CE QUE LE SERVEUR ENVOIE VRAIMENT",       0, "CLOS lot C 22/09 (㊳ le journal) — était : « serveur » · lot C 22/09 : ㉞ les ordres du soir (6→5) · lot C 22/09 : ㊵ la filière (5→4) · lot C 22/09 : ㊴ le dossier (4→3) · lot C 22/09 : ㊱ l'horizon (3→2)"),
 (B, "CE QUE LE SERVEUR NE DIT PAS",            0, "CLOS lot C 22/09 (㊴ le dossier) — était : « serveur » — RE-MESURÉ 22/09 : 3, Settings:136 a repris ce titre (l'ancien « … NE SERT PAS ENCORE » a disparu) ; atelier : → CE QUE LA VILLE NE DIT PAS (Carnet, Forensic) · CE QUI NE S'OUVRE PAS ENCORE (Settings) · lot C 22/09 : ⑲ les réglages (3→2) · lot C 22/09 : ㉞ les ordres du soir (2→1)"),
 (B, "CE QUE LE SERVEUR NE SERT PAS ENCORE",    0, "PÉRIMÉE, RE-MESURÉE 22/09 : disparue — Settings:136 dit désormais « CE QUE LE SERVEUR NE DIT PAS », compté sur ce motif-là"),
 (B, "serveur la refuse tant que",              0, "CLOS lot C 22/09 (㉞ les ordres du soir) — était : « serveur »"),
 (B, "Le serveur a refusé",                     0, "CLOS lot C 22/09 (㉝ raser un site) — était : « serveur » · lot C 22/09 : ㉜ ce que vous avez confié (5→3)"),
 (B, "Le serveur ne peut pas dire",             0, "CLOS lot C 22/09 (㉜ ce que vous avez confié) — était : « serveur »"),
 (B, "On demande au serveur",                   0, "CLOS lot C 22/09 (㉜ ce que vous avez confié) — était : « serveur »"),
 (B, "Le serveur refusera",                     0, "CLOS lot C 22/09 (㉝ raser un site) — était : « serveur »"),
 (B, "le serveur n'a rien rendu",               0, "CLOS lot C 22/09 (㉝ raser un site) — était : « serveur »"),
 (B, "Le serveur n'a pas répondu",              0, "CLOS — le SEPTIÈME de la formule maison, le seul qui nommait la machine. Six écrans disent « Le profil / la file / le commissariat / le tableau / la vitrine / l'état du tutoriel n'a pas répondu » ; ㉜ disait « le serveur ». Repris sur le patron de son jumeau structurel (Reputation:579-584 : titre « LE MIROIR EST INDISPONIBLE » + sous-titre « Le miroir ne répond pas »)."),
 (B, "le serveur ne propose aucune capacité",   0, "PÉRIMÉE, RE-MESURÉE 22/09 : disparue — Horizon:145 remplacé par le cadre 117 (« Les cartes viennent du monde, pas du menu »)"),
 (B, "le serveur ne rend que des clés",         0, "CLOS lot C 22/09 (㊱ l'horizon) — était : « clés de traduction » + « dictionnaire du jeu »"),
 (B, "le serveur ne dit pas ce qui manque",     0, "CLOS lot C 22/09 (㊱ l'horizon) — était : « serveur »"),
 (B, "le serveur rend des clés et un gabarit",  0, "CLOS lot C 22/09 (㊳ le journal) — était : « clés » + « gabarit à trous »"),
 (B, "le serveur refuse de juger",              0, "CLOS lot C 22/09 (㊲ le miroir) — était : « serveur »"),
 (B, "Le serveur dit",                          0, "CLOS lot C 22/09 (㊲ le miroir) — était : « serveur »"),
 (B, "c'est la valeur par défaut du serveur",   0, "CLOS INCIDEMMENT — « valeur par défaut » + « le corps » (= corps de réponse) vivaient dans la MÊME phrase que l'énoncé daté de E. Les retirer ensemble était le seul geste possible ; je le déclare plutôt que de le compter comme un gain de B."),
 (B, "écran ne peut donc pas",                  0, "CLOS lot C 22/09 (㊴ le dossier) — était : « cet écran » ⚠️ motif re-casé : ma réécriture a mis une majuscule à « Cet », et le fragment minuscule rendait 0 — un zéro de CASSE, pas de suppression"),
 (B, "CE QUE CET ÉCRAN SAIT",                   0, "CLOS lot C 22/09 (㊳ le journal) — était : « cet écran » · lot C 22/09 : ㉞ les ordres du soir (3→2) · lot C 22/09 : ㊵ la filière (2→1)"),
 (B, "CE QUE CET ÉCRAN NE PEUT PAS",            0, "PÉRIMÉE, RE-MESURÉE 22/09 : disparue — Carnet:296 dit désormais « CE QUE LE SERVEUR NE DIT PAS », compté sur ce motif-là"),
 (B, "rien sur cet écran n'en crée",            0, "CLOS lot C 22/09 (㉛ la loi) — était : « cet écran »"),
 (B, "pas un choix d’écran",                    0, "CLOS lot C 22/09 (㊲ le miroir) — était : « choix d'écran » (apostrophe typographique — le fragment ASCII rendait 0)"),
 (B, "l'écran ne montre rien plutôt que",       0, "CLOS lot C 22/09 (㊱ l'horizon) — était : « l'écran »"),
 (B, "Voilà l'écran tel qu'il s'afficherait",   0, "CLOS lot C 22/09 (㊱ l'horizon) — était : « l'écran tel qu'il s'afficherait » — CONSERVÉ : c'est le cadre ratifié de la maquette"),
 (B, "trou de",                                 0, "CLOS lot C 22/09 (㉝ raser un site) — était : « trou de surface »"),
 (B, "Le même lot",                             0, "CLOS lot C 22/09 (㊵ la filière) — était : « lot » = lot de livraison du programme"),
 (B, "la seule grandeur servie",                0, "CLOS lot C 22/09 (㊵ la filière) — était : « grandeur servie »"),
 (B, "n'expose pas encore son vendeur",         0, "PÉRIMÉE, RE-MESURÉE 22/09 : disparue — DistrictInterior:2235 dit désormais « Collecte indisponible : aucun vendeur affecté. » (:2396), hors classe"),
 (B, "vérifié serveur",                         0, "CLOS lot C 22/09 (② la fiche du bâtiment) — était : « vérifié serveur »"),
 (B, "Scène indisponible pour ce quart",        0, "CLOS lot C 22/09 (① l'intérieur du district) — était : « Scène » + « quart horaire »"),
 (B, "à ouvrir depuis la fiche opérationnelle", 0, "CLOS lot C 22/09 (① l'intérieur du district) — était : renvoie à un autre écran par son nom interne"),

 (N, "À QUOI ÇA SERT",                          1, "« servir » ordinaire"),
 (N, "est en route",                            1, "« en route » = en chemin"),
 (N, "CETTE ROUTE",                             1, "l'itinéraire du courrier, pas un endpoint"),
 (N, "se sert de gens",                         2, "« se servir de »"),
 (N, "Commerce-écran",                          3, "traduction maison de FRONT_SHOP : « écran » = paravent"),
]

ORDRE = [A, E, D, C, R, B, L, N]

# ⛔⛔ TÉMOINS DE SOURCE — pour les chaînes que `chaines-joueur.py` NE VOIT PAS.
# Un motif de VERDICTS se compte dans la POPULATION de l'extracteur. Une chaîne qui atteint le joueur
# par une variable (`DerniereErreur` en sous-titre), par une interpolation hors seam, ou par un seam que
# l'extracteur ne connaît pas (`DetailRow(...)`, les notes jointes de ④) n'y est pas — un motif posé
# sur elle mesure 0 À VIE, quoi qu'on écrive dans le code. Payé le 2026-09-22 : les deux épingles de
# ㉚ (:197, :228) étaient de ce type, posées à 0, et ne pouvaient donc jamais rougir. *Un témoin qui ne
# peut pas voir sa cible ne la garde pas : il certifie son absence.*
# ⇒ Ceux-ci se comptent dans le TEXTE des littéraux de `Assets/Scripts/**/*.cs` (lignes de
#   commentaire exclues). Même cliquet, même règle des deux sens. Le premier témoin est POSITIF : une
#   chaîne vivante, vue par ce compteur ET invisible à l'extracteur (les deux comptes mesurés) ; s'il
#   tombe à 0, le compteur est aveugle et tout le reste de la liste ne prouve plus rien.
#   ⚠️ Un témoin positif VU par l'extracteur ne prouve pas la différence entre les deux compteurs :
#   « Réessayez dans un instant. » (proposé d'abord) y est vu 8 fois — rejeté à la mesure.
# (classe, fragment, attendu, pourquoi)
SOURCE = [
 (N, "pas encore relevé", 1, "TÉMOIN POSITIF du compteur de source, français et ratifié (atelier ④, ③:1043) — mesuré 0 dans la population de l'extracteur (seam `DetailRow`), 1 ici"),
 (L, "Repair underway", 0, "② message d'action de `RunAction` (:384), anglais HORS lot atelier (aucune copie livrée) — signalé ; n'est plus le témoin positif (remplacé par « pas encore relevé », ③) · lot D t2 22/09, ② RunAction (1→0)"),
 (B, "GET /v1/world/districts indisponible",       0, "CLOS lot C 22/09 (㉚:197) — sous-titre de panne via `DerniereErreur` (:612) ; déplacé de VERDICTS où il mesurait 0 par construction"),
 (B, "aucun des 18 districts ne porte de bâtiment", 0, "CLOS lot C 22/09 (㉚:228) — même chemin ; remplacé par l'état réel lu dans me/buildings"),
 (L, "insufficient cash", 0, "② les quatre raisons « pas assez d'argent » (:889, :913, :939, :965) — invisibles à l'extracteur"),
 (L, "Repair (", 0, "② bouton Réparer (:883, interpolé) et sa raison (:889) — invisibles à l'extracteur"),
 (L, "Tend crop (already", 0, "② raison (:1014) — invisible à l'extracteur"),
 (L, "choose a source", 0, "② raison (:1041) — invisible à l'extracteur"),
 (L, "district {id}", 0, "⑮ repli du nom de quartier (:271, :272) — invisible à l'extracteur"),
 (L, "district {b.district_id}", 0, "⑮ repli du district de la cible (:278) — invisible à l'extracteur"),
 (L, "n/a (not ticked)", 0, "③ état d'une ligne non relevée (:1043, seam `DetailRow` invisible à l'extracteur)"),
 (L, "Heat escalating citywide", 0, "④ note d'alerte (:442) — les notes sont jointes, invisibles à l'extracteur"),
 (L, "Citywide heat BURNING", 0, "④ note (:444)"),
 (L, "Citywide heat HOT", 0, "④ note (:445)"),
 (L, "Exceptions waiting", 0, "④ note (:447)"),
 (L, "Autonomy reports waiting", 0, "④ note (:448)"),
 (L, "No active alerts", 0, "④ état vide des alertes (:450) → « Rien à signaler » (⑱·21)"),
 (L, "Ordered Pyralin", 0, "② RunAction (:355)"),
 (L, "Order failed", 0, "② RunAction (:355)"),
 (L, "Cook started", 0, "② RunAction (:362)"),
 (L, "Cook unavailable", 0, "② RunAction (:362, :415)"),
 (L, "Cash injected", 1, "② RunAction (:369) fermé ; reste ⑪ LaunderingController:174 (hors annexe c, signalé)"),
 (L, "Inject unavailable", 1, "② RunAction (:369) fermé ; reste ⑪ LaunderingController:174 (hors annexe c, signalé)"),
 (L, "Conversion requested", 0, "② RunAction (:376) → Ouverture demandée"),
 (L, "Convert unavailable", 0, "② RunAction (:376) → Impossible d'ouvrir"),
 (L, "Repair unavailable", 0, "② RunAction (:384)"),
 (L, "tier upgraded", 0, "② RunAction (:406, :526, :562)"),
 (L, "Upgrade unavailable", 0, "② RunAction (:406, :526, :562)"),
 (L, "Ash cook started", 0, "② RunAction (:415)"),
 (L, "Appointment booked", 0, "② RunAction (:423)"),
 (L, "Booking unavailable", 0, "② RunAction (:423)"),
 (L, "Appointment honored", 0, "② RunAction (:439)"),
 (L, "Honor unavailable", 0, "② RunAction (:439)"),
 (L, "Plant unavailable", 0, "② RunAction (:472) ; « Planted » non épinglé (couvert par sa paire)"),
 (L, "Tend unavailable", 0, "② RunAction (:488)"),
 (L, "Courier dispatched", 0, "② RunAction (:540)"),
 (L, "Dispatch unavailable", 0, "② RunAction (:540)"),
 (L, "Cash deposited", 0, "② RunAction (:574)"),
 (L, "Deposit unavailable", 0, "② RunAction (:574)"),
 (L, "Cash withdrawn", 0, "② RunAction (:586)"),
 (L, "Withdraw unavailable", 0, "② RunAction (:586)"),
 (L, "Raid risk", 0, "② ligne (:652)"),
 (L, "Raided — seized", 0, "② alerte (:659)"),
 (L, "Temperature", 0, "② ligne (:675)"),
 (L, "Cold chain", 0, "② ligne (:678)"),
 (L, "Lab tier", 0, "② ligne (:704)"),
 (L, "Purity", 0, "② ligne (:714)"),
 (L, "Appointment", 0, "② ligne (:724)"),
 (L, "Payout", 0, "② ligne (:726)"),
 (L, "Grow stage", 0, "② ligne (:746)"),
 (L, "Husbandry", 0, "② ligne (:750)"),
 (L, "Hub tier", 0, "② ligne (:770)"),
 (L, "Setup", 0, "② ligne (:629)"),
]


def litteraux_source(racine):
    """(fichier, ligne, texte) de chaque littéral "…" de Assets/Scripts, hors lignes de commentaire.
    ⚠️ Ne suit pas une chaîne coupée en deux littéraux ("…" + "…") : choisir un fragment d'UN littéral."""
    lit = re.compile(r'"(?:[^"\\\n]|\\.)*"')
    for p in sorted((racine / 'Assets' / 'Scripts').rglob('*.cs')):
        for n, l in enumerate(p.read_text(encoding='utf-8', errors='replace').splitlines(), 1):
            t = l.strip()
            if t.startswith('//') or t.startswith('*') or t.startswith('/*'):
                continue
            for m in lit.finditer(l):
                yield p, n, m.group(0)[1:-1]


def mesurer():
    racine = pathlib.Path(__file__).resolve().parent.parent
    s = subprocess.run([sys.executable, str(racine / 'Tools' / 'chaines-joueur.py'), '--controle'],
                       cwd=racine, capture_output=True, text=True)
    if s.returncode != 0:
        sys.stderr.write(s.stderr)
        sys.stderr.write("⛔ l'extracteur est ROUGE : on ne classe pas une population dont les "
                         "contrôles ne passent pas.\n")
        sys.exit(1)
    return [l.split('\t') for l in s.stdout.splitlines() if l.count('\t') == 2]


def main():
    verifier = '--verifier' in sys.argv
    rows = mesurer()
    textes = collections.OrderedDict()
    for f, via, t in rows:
        textes.setdefault(t, f.replace('Assets/Scripts/', ''))

    ecarts, classe = [], collections.defaultdict(list)
    racine = pathlib.Path(__file__).resolve().parent.parent
    sources = list(litteraux_source(racine))
    for cl, frag, attendu, pourquoi in SOURCE:
        n = sum(1 for p, ln, t in sources if frag in t)
        if n != attendu:
            ecarts.append((frag + " [source]", attendu, n))
        for p, ln, t in sources:
            if frag in t:
                classe[cl].append((f"{p.relative_to(racine / 'Assets' / 'Scripts')}:{ln}", t, pourquoi + " [témoin de source]"))
        if attendu == 0 and not any(frag in t for p, ln, t in sources):
            classe[cl].append(("—", "(plus aucune occurrence — témoin de source)", pourquoi))
    for cl, frag, attendu, pourquoi in VERDICTS:
        n = sum(1 for f, via, t in rows if frag in t)
        if n != attendu:
            ecarts.append((frag, attendu, n))
        vus = collections.OrderedDict((t, f) for t, f in textes.items() if frag in t)
        for t, f in vus.items():
            classe[cl].append((f, t, pourquoi))
        if not vus and attendu == 0:
            classe[cl].append(("—", "(plus aucune occurrence)", pourquoi))

    if verifier:
        for frag, attendu, n in ecarts:
            sens = "LA CLASSE REVIENT" if n > attendu else "ÉPINGLE PÉRIMÉE (la chaîne a bougé)"
            print(f"⛔ {sens} : attendu {attendu}, mesuré {n} — « {frag} »", file=sys.stderr)
        print(f"{len(VERDICTS)} motifs · {len(SOURCE)} témoins de source · {len(ecarts)} écart(s) · "
              f"population {len(rows)}", file=sys.stderr)
        return 1 if ecarts else 0

    out = ["# Chaînes joueur qui parlent du SYSTÈME au lieu de parler AU joueur", "",
           f"Population mesurée par `Tools/chaines-joueur.py` (contrôles verts) : "
           f"**{len(rows)} chaînes affichées, {len(textes)} textes distincts**.", "",
           "Chaque motif porte sa valeur **attendue** ; `--verifier` rougit dans les deux sens "
           "(la classe revient / l'épingle est périmée).", ""]
    if ecarts:
        out += ["## ⛔ ÉCARTS AU CLIQUET", ""] + \
               [f"- `{f}` — attendu {a}, mesuré {n}" for f, a, n in ecarts] + [""]
    for cl in ORDRE:
        if not classe[cl]: continue
        out += [f"## {cl} — {len(classe[cl])}", ""]
        for f, t, pourquoi in sorted(classe[cl]):
            out += [f"- `{f}`", f"  > {t}", f"  — {pourquoi}"]
        out += [""]
    print('\n'.join(out))
    return 0


if __name__ == '__main__':
    sys.exit(main())
