#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Met à jour les dossiers de juge (juge-visuel ET juge-données) des écrans travaillés la nuit du 22 au 23/09 — commande f2 du 23/09 :
① (bandeau, descente, couche), ② (pupitre, serre, saisie), ⑲ (porte mise à jour), ㉕, ㉙, ④ et ⑦ (mécanique). Pour que les juges
partent dès que l'user pose `capture.env`.

Pour chaque écran, un dossier DATÉ, sans capture (elles se posent au créneau) :
  - `Tools/juge-visuel/<dossier>/<tour>-2026-09-23/dossier.md` — la RÉFÉRENCE à jour (ratifiée, ou « maquette à ratifier » dite comme
    telle, taille et facteur MESURÉS sur le fichier), les écarts ASSUMÉS déjà tranchés (D1-D18, points du 07/09, la sélection, le titre
    de ①, les formes honnêtes), ce que le juge ne doit PAS noter, les points OUVERTS (→ ARBITRAGE), les données servies attendues ;
  - `Tools/juge-donnees/<dossier>/cloture-<…>2026-09-23/dossier.md` — le gabarit du juge-données (dépôt back,
    `.claude/skills/juge-donnees/dossier-gabarit.md`) rempli : écran, maquette, back, front, écarts assumés, ce qui n'est pas fourni.
Les CORPS RÉELS sont listés au moment de l'exécution (provenance lue dans chaque fichier), et leur FRAÎCHEUR est celle que dit
`verifier-fraicheur-corps.py` contre `main` du back — jamais une phrase datée écrite ici. Aucune valeur d'identifiant n'est écrite.
Les faits de la nuit viennent des notes de l'atelier (`Tools/atelier-2026-09-22/`), du registre `ARBITRAGES-user-2026-09-07.md` et des
commits ; chaque ligne porte sa source. ⛔ Aucun rendu, aucune capture, Unity non touché ; un dossier existant n'est pas écrasé.
Usage : python3 Tools/juge-visuel/preparer-dossiers-2026-09-23.py [--controle] [--refaire <sym>[,<sym>…]]"""
import importlib.util, json, os, re, subprocess, sys, glob

ICI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cd', os.path.join(ICI, 'construire-dossiers.py'))
cd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cd)
JV = ICI; JD = os.path.join(cd.CLIENT, 'Tools', 'juge-donnees')
DATE = '2026-09-23'
BACK = os.path.expanduser('~/project/mafia-back-suite')
CUMUL = os.path.expanduser('~/project/mafia-builder-city-clean')
sh = lambda *a, **k: subprocess.run(list(a), capture_output=True, text=True, **k).stdout.strip()
SHA_CLIENT = sh('git', 'rev-parse', '--short', 'HEAD', cwd=cd.CLIENT)
SHA_CUMUL = sh('git', '-C', CUMUL, 'rev-parse', '--short', 'HEAD')
SHA_BACK = sh('git', '-C', BACK, 'rev-parse', '--short', 'HEAD')
SHA_ATELIER = cd.sha_atelier()
A = 'Tools/atelier-2026-09-22/'
# `--refaire <sym>` : régénère le dossier de CE symbole (une décision est tombée après la préparation) — les autres ne sont jamais écrasés
REFAIRE = set(sys.argv[sys.argv.index('--refaire') + 1].split(',')) if '--refaire' in sys.argv else set()
F = 'CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`)'

# ------------------------------------------------------------------------------------------------------------------------------------
# LES ÉCRANS — refs : (fichier sous JV, largeur CSS, statut, état montré) ; assumes : (ce qu'on voit, pourquoi, ce qui le ferait sortir)
# ------------------------------------------------------------------------------------------------------------------------------------
E = [
 dict(sym='①', dossier='ecran-principal', tour='r11', jd='cloture', nom='Intérieur de district', ctl='DistrictInteriorScreenController',
      travail='le bandeau éphémère, la descente, la couche du district (libellés par ancre + anneau de sélection), le titre du district',
      refs=[('ecran-principal/ecran-canon-propre.png', 392, 'RATIFIÉE (point 17, ratifié en bloc par f2 le 07/09, ARBITRAGES l.4 et l.35) — page `hud-brennar-canon.html`, re-rendue le 23/09 en DejaVu (`e20fe648`) puis chrome ratifié (`cb86e772` : « 24 850 € », « Tiède / CHALEUR », Filière, fiche en bandes). Le RENDU du 23/09 n\'a pas été revu par l\'user.', 'état N (nuit), « JOUR 12 · Soirée », sans heure — pas de « Matin » à remplacer (D16)')],
      refs_notes=['⚠️ **Échelle corrigée** : ce fichier fait **1176×2091 à ×3,0** (le `.tel` du canon fait 392 CSS). Le dossier r10 annonçait '
                  '1080×2102 à ×3,6 : c\'était faux. Les tailles de cette table sont MESURÉES sur le fichier au moment de la génération.',
                  '`ecran-canon.png` (avec l\'échafaudage d\'atelier) et `maquette-hud-brennar.png` sont REMPLACÉS : ce ne sont plus des références.'],
      assumes=[
        ('la bande du nom de district sous la barre, absente du canon ; elle cède la place au bandeau quand il parle', 'D3 ; front.md §4 L (25/08) ; `hud-brennar.html` l.82/176 ; ' + F + ' `0b49a634` (CanvasGroup)', 'la bande reste visible pendant que le bandeau parle, ou le nom n\'est pas `interior.name`'),
        ('l\'anneau **crème** autour du badge du bâtiment dont la fiche est ouverte (la sélection)', 'D4 ; r9 M6 ; ' + F + ' `e9db74eb`', 'un anneau or, deux anneaux, ou un anneau sans fiche ouverte'),
        ('le bandeau « {nom} a un rapport pour vous — lire » (le canon : « ✉ Sal a un rapport du soir — lire »)', 'D5 (un rapport OUVERT, une fois par session) ; ' + A + '22 §7.1 C (« du soir » tombe) ; ' + F + ' `c5ab2a6e`', 'le bandeau revient dans la même session, ou le nom affiché est un identifiant'),
        ('les autres bandeaux : « La brigade quadrille le quartier — planquez la caisse », « Les indics parlent : la brigade s’agite », « {nom} attend vos ordres » / « La ville attend vos ordres », mot d\'action or « trancher » / « lire » ; un seul à la fois (descente > ville > carte > rapport), 5 s puis fondu', A + '22 §7.1 C ; ' + F + ' `0b49a634`', 'deux bandeaux ensemble, un chiffre, un glyphe, une annonce répétée'),
        ('aucun glyphe dans le bandeau (✉ ⚠ 🚨 retirés)', 'D11', 'un glyphe réapparaît'),
        ('la descente : médaillon « DESCENTE » en braise, cerclage et filet qui battent, aiguille qui tremble', 'mot du canon `hud-brennar.html:255` (' + A + '23 §2, tranché) ; ' + F + ' `881c17f6`', 'la descente s\'affiche sans `heat.escalated` du district, ou la barre ne revient pas à l\'état nommé'),
        ('le gyrophare CACHÉ le jour ; la nuit, sa lueur est centrée sur la voiture de police du district D (pas à la place du canon)', 'D7 ; `hud-brennar.html:75` ; ' + A + '22 §7.2 ; ' + F + ' `881c17f6`', 'une lueur de jour, une lueur sur un toit, ou sans `escalated`'),
        ('« CHALEUR » (canon « Heat ») ; bandes Froid · Tiède · Chaud · Brûlant au lieu de « 37 % »', 'points 11 et 19 du 07/09 ; ' + A + '22 §7.1 A', 'un pourcentage, ou « Heat »'),
        ('le médaillon dit la VILLE, la case 3 le DISTRICT', 'points 7 et 8 du 07/09 ; ' + F + ' `9b6625ba`', 'la case 3 porte le bucket de la ville ou du bâtiment'),
        ('les cases « À COLLECTER · REVENUS · CHALEUR LOCALE » en bandes (Rien / Prêt / Plein · Au repos / Rapporte · la chaleur) ; « — » quand la donnée manque', 'point 8 ; ' + A + '22 §7.1 A ; ' + F + ' `9b6625ba`', 'un chiffre (R2.2)'),
        ('l\'argent « 24 850 € », sans centimes, espace fine U+202F ; AUCUN fil de ratio sous l\'argent', 'point 10 ; D2 (option b)', 'des centimes, un fil de ratio'),
        ('la phase seule (« Soirée », « Plein jour »), sans heure', 'point 16 ; D16', 'une heure, ou « Matin »'),
        ('le dock Empire · Famille · Filière · Plus, ronds VIDES', 'D6 ; point 15', 'une icône, ou « Marché »'),
        ('le titre de fiche = l\'enseigne seule, en capitales ; sous-titre « {type} · {district}, îlot {block}[, n° {rang}] »', 'point 12 ; ' + A + '22 §7.1 B ; D12', 'le nom composé, un titre rétréci, plus de 2 lignes'),
        ('la couche du district : un libellé par ancre, 9 px CSS, sans chiffre, pas de glyphe sur une ancre qui porte plusieurs types', F + ' `e9db74eb` (r9 B1, B3)', 'des libellés superposés'),
        ('« état inconnu » / « type inconnu » / « — »', 'D8', 'une valeur brute'),
      ],
      pas_noter=[
        ('le fond est le district D, pas le ZO du canon', A + '23 ; ' + A + '22 §2.1'),
        ('le canon dessine encore un fil de ratio (68 %), « rapport du soir » avec ✉, pas de pouls ni de gyrophare', 'le canon est EN RETARD sur D2, D5, D11 ; il est dans l\'état N'),
        ('pas de « + $320 » qui monte', 'point 17 (échafaudage retiré)'),
        ('anglais ou `$` dans une référence', 'point 19 : maquette en retard'),
        ('espace ordinaire avant « : ; ? » dans un texte servi', 'D17 : défaut du SERVI, lot du back — à classer écart du servi, pas du client'),
        ('chrome non alimenté, ou phase « — » hors district', 'état VOULU (dossier r10)'),
        ('le bouton « La fiche » de l\'Accueil a disparu', A + '23 ; ' + F + ' `ada52db4`'),
      ],
      ouverts=[
        ('le sens du point or de Famille', A + '22 §7.3 ; ' + A + '23'), ('le flou de la plaque de fiche', A + '22 §7.4'),
        ('« Quartier général » : le servir ou non', A + '23'), ('l\'en de `chrome.medaillon.descente` (« Raid », proposé)', A + '22 §7.1 A'),
        ('l\'animation de la descente face à la doctrine « aucune animation »', 'point 5 « sans tween » NON ratifié (ARBITRAGES l.4)'),
        ('la place du titre du district quand le bandeau est absent', F + ' `0b49a634`'), ('la teinte braise de la case 3 à « Tiède » dans le canon', 'aucun registre'),
        ('la phrase de descente reste crème (sans or)', 'déclaration client (' + F + ' `0b49a634`), pas une décision du registre'),
      ],
      connus=['r9 B2 (marqueurs sur sol nu) et M10 (hauteur de l\'art 2400) : défauts CONNUS, restent à l\'atelier (' + A + '22 §7.2) — pas des écarts assumés',
              'constats SUSPENDUS du 07/09 à trancher TENU / CLOS : M7, M8, M14, m4, m5, m11 (dossier r10)'],
      routes='`/v1/city/district/:id/interior`, `…/heat`, `…/stash`, `/v1/world/districts`, `/v1/operational/dealer/:id/collect`, `/v1/operational/laundering/inject` ; shell : `/v1/session/open` (queue, escalated, phase), `GET /v1/autonomy-reports`, `/v1/economy/wallet`, `/v1/i18n/bundle`',
      manquent='`session/open` et `autonomy-reports` n\'ont pas de corps dans ce dossier ; le bundle est antérieur aux clés `chrome.bandeau.*` et `district.fiche.*`',
      front='les lots ①-0 à ①-5 et le format monétaire sont dans le cumul (vérifié par merge-base, relevé du 23/09)',
      front_fichiers=['Assets/Scripts/CityMap/DistrictInteriorScreenController.cs', 'Assets/Scripts/Shell/TopBarController.cs', 'Assets/Scripts/Shell/AppShell.cs']),
 dict(sym='②', dossier='fiche-batiment', tour='r1', jd='cloture', nom='Fiche bâtiment', ctl='BuildingCardController',
      travail='le pupitre (labo), la serre, la saisie',
      refs=[],
      refs_notes=['⛔ **AUCUNE référence à jour n\'est rendue pour ②.** Les seuls rendus des cadres rattachés (série 6, 36-47 et 92-94, `ec7ad853`) sont '
                  '`v6/m-36…m-47.png` et `v6/m-92…m-94.png` (900×1752, ×3, du 03/09) — ANTÉRIEURS à DejaVu, au chrome ratifié et à « Plein jour ». '
                  'La page `ecrans-brennar-6.html` les porte déjà à jour : **la référence est à rendre au prochain signal de rendu, avant de juger** '
                  '(`rendre-tel.py ecrans-brennar-6.html <n> … 3.6`). Aucun rendu n\'est fait par ce dossier.',
                  'Statut cadre par cadre : serre 36-38 RATIFIÉE user (27/08, front.md l.818-819, l.856) ; labo 39-44 ratifié PAR DÉLÉGATION (front.md l.22) ; '
                  'fourneau 45-47 « EN JUGEMENT » (front.md l.877) ; Ash 92-94 « en jugement » (front.md l.946) — la contradiction délégation / '
                  '« en jugement » est OUVERTE (→ ARBITRAGE).'],
      assumes=[
        ('le pupitre : trois échelles de crans (le feu 5, l\'étagère 4, les caisses 4), avec les mots servis, pour `lab` et `specialized_lab` seulement', 'ruling « trop générique, c\'est un jeu » (front.md l.896-916) ; ' + F + ' `bcdcb977` ; ' + A + '37 tsv', 'des jauges d\'instrument, un code 409 affiché, ou un pupitre sur une raffinerie'),
        ('les refus dits en phrases (« Rien à faire ici. Repassez quand ce sera tiré ») — aucun code d\'erreur à l\'écran', 'front.md l.886-888, 905-906', 'un bouton mort, ou un code'),
        ('la serre sans rangée « Culture » ; pousse Bouture · Croissance · Floraison · Récolte ; santé Vigoureuse · Correcte · À soigner ; un seul pot', 'D14 ; ' + A + '37 tsv ; ' + F + ' `acefc0f9`', '« Culture » affiché, ou les anciens mots'),
        ('la saisie : « Saisie · {bande servie} », « rien » en ambre si la descente n\'a rien pris', A + '37 tsv ; ' + F + ' `68f6a5b5`', 'une rangée « Alerte », ou un préfixe en dur'),
        ('« L’atelier » au lieu de « Taille du labo », partout ; palier « de base · amélioré · au meilleur niveau »', 'D14 ; ' + A + '37 (décisions f2, `4ee5b92c`)', '« Taille du labo »'),
        ('un mot par type (Labo, Réserve, Serre…), le même que sur ①', 'D12', 'un mot de type différent de ①'),
        ('archétype sans article, formes épicènes', 'D13', 'un genre présumé'),
        ('aucun glyphe (pas de « A » près de GAIN, pas de `[#]`)', 'D11', 'un glyphe'),
        ('« état inconnu » / « type inconnu » / « — »', 'D8', 'une bande brute'),
        ('écran statique, sans animation', 'ruling du 27/08 (front.md l.832-837, 852-856)', 'une animation'),
      ],
      pas_noter=[
        ('les noms de plants absents (KESTREL 4, MARSH BLUE…)', A + '37'), ('« Lt. Kane », « Lt. Hara », « J14 », « J11 » absents', 'exemples de maquette (point 19 ; ' + A + '37)'),
        ('« Nestor : » tel qu\'il est servi', 'décision f2 ; la réplique en dur est remontée à l\'user (' + A + '52 §1.2)'),
        ('les lieux d\'Ash (Verrerie Kestrel, Salon Aldrich, Le Cintre) remplacés par l\'enseigne servie', A + '37 tsv'),
        ('pas de « 4° », « 12° », « pure · bon prix »', 'R2.2'), ('pas de Touiller, Baisser le feu, Tirer le produit, Une passe de plus', 'gestes SANS route (' + A + '37)'),
        ('le chrome de la série 6 en `$` ou en anglais', 'point 19'), ('la ponctuation haute du servi', 'D17'),
      ],
      ouverts=[('le type visé par le « labo » 39-44 (Brindle / pyralin ou Ash)', F + ' `Tools/juge-donnees/fiche-batiment/ecart-2026-09-23.md`'),
               ('le type et le statut du fourneau 45-47', 'idem ; front.md l.877'), ('le sens des crans « Passes » et des 5 pastilles de gain face aux 6 valeurs de `payout_band`', 'idem'),
               ('trois pots contre une seule pousse par serre ; gestes de soin et de plantation', 'idem'), ('« Faire sortir » : destination et quantité', 'idem'),
               ('Ash : lieu, passes, tenue après rechargement', 'attend le back'), ('les veto « Ouvrir » et « la banque »', A + '23 §4')],
      connus=['les lots 1, 4 et 6 de CLIENT-2 (`bcdcb977`, `acefc0f9`, `68f6a5b5`) et les routes `GET /lab/:id`, `GET /precursors?building_id` sont sur `mafia-unity-F`, ABSENTS du cumul : une capture du cumul actuel ne les montre pas'],
      routes='`/v1/operational/building/:id` (+ convert, repair, deposit-cash, withdraw-cash, upgrade-*), `/storage/:id`, `/lab/:id/cook`, `/precursors/order`, `/grow-house/:id/plant`, `/grow-session/:id` et `/tend`, `/appointment`, `/appointment/:id` et `/honor`, `/distribution/dispatch`, `/laundering/inject`, `/v1/economy/wallet` ; en plus sur F : `GET /lab/:id`, `GET /precursors?building_id`',
      manquent='`GET lab/:id` et `GET precursors?building_id` n\'ont pas de corps ; les 15 POST sont des mutations non appelées',
      front='lots 1, 4, 6 NON fusionnés au cumul (voir « connus »)',
      front_fichiers=['Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs']),
 dict(sym='⑲', dossier='compte', tour='r1-⑲', jd='cloture-⑲', nom='Réglages — la porte « le coffre »', ctl='SettingsScreenController',
      travail='la porte mise à jour : ce que le back sert aujourd\'hui (une porte, deux entrées avec ㉒)',
      refs=[('compte/reference-㉒-1080x2102.png', 300, 'RATIFIÉE par délégation le 02/09 (front.md l.22 ; ⑲ rattaché par la fusion front.md l.1894, `4943b0c3`)', 'série 6 cadre 95 « Le compte — ce que le back sert »'),
            ('compte/porte-2026-09-23/cadre-0-1080x2102.png', 300, '**MAQUETTE À RATIFIER, jamais une référence** (`7d00782d`) — dérivée du cadre 97 ratifié par 7 remplacements vérifiés (' + A + 'generer-porte-19-2026-09-23.py)', 'la porte « ce que le back sert aujourd\'hui » : L1 et L8 fermés, bascule tutoriels et FERMER LE COFFRE repris du 95, L5 L10 L11 éteints')],
      refs_notes=['Cadres 96 et 97 : pas de rendu 1080×2102 ; anciens rendus `v6/m-45..47.png` (900×1752, ancienne numérotation). '
                  '`reglages-canon.png` / `reglages-avec-lots-back.png` (série 2, 02/09) : gardés, remplacés dans les faits par la porte v6.'],
      assumes=[
        ('« Depuis ce matin » (L5), « FERMER PARTOUT » (L11), « TOUT EFFACER » (L10) éteints, ou absents au client', 'dettes de maquette : dessinées, non servies (' + A + '35 §7 ; `42c62272`)', 'une route servie pour L5, L11 ou L10'),
        ('« Dire mes prix au marché » allumée, sans lot', 'L1 fermé : `GET /v1/me` + `PUT /v1/me/meta-market/visibility` (' + A + '35)', 'la bascule ne reflète pas `meta_market_visibility_enabled`'),
        ('« La langue de la maison · Français › », sans lot', 'L8 fermé (`PATCH /v1/me/settings`) ; le 97 fait foi contre le 95 (' + A + '35)', '« English » pour un compte `fr`'),
        ('la bascule « On vous explique encore » et « FERMER LE COFFRE · cette session seulement », vivants', 'repris du cadre 95 ratifié ; décision f2 (' + A + '35 §7)', 'le levier ne déclenche pas `POST /v1/auth/signout`'),
        ('la bascule ALLUMÉE quand `tutorials_opt_out` = faux', 'inversion opt-in / opt-out écrite sur la maquette (' + A + '35)', 'la bascule suit la clé brute'),
        ('une porte pour deux entrées Plus (㉒ « Le compte », ⑲ « Le jeu »)', 'décision f2 « on garde » (' + A + '35 §7)', '—'),
        ('les mots de la porte à la place des littéraux du client', 'D14 (' + A + '35 §5 ; ' + A + '38 tsv)', '—'),
        ('« Le coffre est fermé. » / « Rouvrir le coffre » après la sortie', 'mots PROPOSÉS par f2, sans maquette de l\'après (' + A + '38 tsv)', 'à juger comme PROPOSÉ, pas contre une maquette'),
      ],
      pas_noter=[
        ('les étiquettes bleues « L7 », « L5 », « · L11 », « · L10 »', 'annotations de DA (lots back), `generer-porte-19-2026-09-23.py` ; le client ne les affiche pas'),
        ('les rivets du bas qui touchent « TOUT EFFACER »', 'hérité du cadre 97 ratifié, identique au pixel (`7d00782d`)'),
        ('le « C » de CHALEUR rogné par la jauge', 'hérité du HUD (`7d00782d`)'), ('« Plein jour », « Tiède », ronds du dock vides', 'D16 ; point 11 ; point 15'),
        ('l\'adresse masquée « r•••@•••.fr »', 'choix de rendu de ㉒ (' + A + '35)'), ('« JOUR 26 », « 24 850 € », le nom, « 50 jetons »', 'placeholders (point 19)'),
        ('« cette session seulement »', 'c\'est la session d\'AUTHENTIFICATION que révoque `signout` (' + A + '35) — D18 porte sur la session de jeu'),
        ('les espaces insécables dans les textes proposés', 'D17'),
      ],
      ouverts=[('la structure du client (sections « Le jeu », « Ce qui ne s\'ouvre pas encore ») contre les tiroirs de la porte', A + '35 §5 ; ' + A + '38 tsv'),
               ('les mots des raisons éteintes (littéraux du client, non ratifiés)', A + '38 tsv'), ('« Depuis ce matin » : absent au client, éteint à la maquette', A + '35 §7'),
               ('titre « LES RÉGLAGES » contre le tiroir « Le jeu »', A + '35 §5'), ('la mise à jour de la porte elle-même', 'à ratifier (`7d00782d`)'),
               ('les 15 clés `reglages.bloc.*` pas encore servies (repli sur les littéraux)', A + '38 tsv')],
      connus=['⛔ les commits de CLIENT-2 qui branchent ⑲ (`19ddc253`, `9e298c64`) sont sur `mafia-unity-F`, PAS dans le cumul : sur le cumul, ⑲ dit encore « Se déconnecter — pas encore ». **Une capture n\'est jugeable qu\'après leur fusion.**'],
      routes='`GET /v1/me` (`locale`, `meta_market_visibility_enabled`), `PATCH /v1/me/settings`, `GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial-opt-out`, `PUT /v1/me/meta-market/visibility`, `POST /v1/auth/signout`',
      manquent='`PUT /v1/me/meta-market/visibility` et `POST /v1/auth/signout` n\'ont pas de corps ; `_index-⑲.json` est antérieur au branchement',
      front='branchement NON fusionné au cumul (voir « connus »)', front_fichiers=['Assets/Scripts/Account/Settings/SettingsScreenController.cs']),
 dict(sym='㉕', dossier='compte', tour='r1-㉕', jd='cloture-㉕', nom='La première fois', ctl='TutorialScreenController',
      travail='la maquette autour des données servies (ordre lu au back, 4 cadres)',
      refs=[('compte/tutoriel-canon.png', 300, 'RATIFIÉE par délégation le 02/09 (front.md l.22, l.1803)', 'série 2 cadre 31 « la première carte » : une bulle, un seul geste « COMPRIS »'),
            ('compte/tutoriel-vide.png', 300, 'RATIFIÉE par délégation (idem)', 'série 2 cadre 32 « rien à montrer »'),
            ('compte/maquette-25-2026-09-23/cadre-0-1080x2102.png', 300, '**MAQUETTE À RATIFIER** (`ad616c56`)', '1ʳᵉ session, bulle sur la carte pré-semée'),
            ('compte/maquette-25-2026-09-23/cadre-1-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', '1ʳᵉ session, file vidée (`queue_runs_dry`)'),
            ('compte/maquette-25-2026-09-23/cadre-2-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', '2ᵉ session, page « la première fois » sous Plus'),
            ('compte/maquette-25-2026-09-23/cadre-3-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', 'le refus (bascule éteinte)')],
      refs_notes=['Les canons de série 2 font 900×1752 à ×3 (polices Noto, apostrophe droite : retards du canon, point 18 et D10).'],
      assumes=[
        ('« Compris » à la place de « J\'AI COMPRIS »', 'D14 : série 2 cadre 31 (' + A + '33 ; ' + A + '36 tsv)', 'un autre geste que « Compris » écrit `shown_tutorial_ids`'),
        ('la bascule « On vous explique encore » à la place des boutons de refus', 'D14 : mots de la porte 95-96 (' + A + '33 ; ' + A + '36 tsv)', 'la bascule suit la clé brute'),
        ('le TEXTE servi du tutoriel, jamais son identifiant', A + '33 (11 textes servis)', 'un identifiant ou « pas encore écrit » à l\'écran'),
        ('« Rien de nouveau pour aujourd\'hui. » quand `next_tutorial_id` est null et `eligible` non vide ; « Vous avez tout vu. » seulement si `eligible` est vide', A + '33 §4 ; ' + A + '36 tsv (mot proposé) ; D18', '« tout vu » avec `eligible` non vide'),
        ('l\'ordre des tutoriels est celui que sert le back (au plus un par session de jeu)', A + '33 §1 (`disclosure-schedule.service.ts:72-85`)', 'un ordre calculé par le client'),
      ],
      pas_noter=[
        ('les soulignés en pointillé', 'annotation DA « proposé, non ratifié » (`generer-maquette-25-2026-09-23.py`)'),
        ('le soulignement ondulé rouge sous « Lt. Hara »', 'annotation DA d\'un heurt du servi (le nom en dur est remonté à l\'user, ' + A + '52 §1.2)'),
        ('« : plus de solvant » en début de ligne, « décision : la ville »', 'D17 : défaut du SERVI, montré tel quel'),
        ('des apostrophes droites dans des valeurs `tutorial.*`', 'D10 : écart du SERVI, pas du client'),
        ('« 02 vues · 01 à venir » contre le compte réel', 'valeurs d\'illustration (' + A + '33)'),
        ('dock (ronds vides), « C » de CHALEUR rogné, « Plein jour », « Tiède »', 'point 15 ; `7d00782d` ; D16 ; point 11'),
      ],
      ouverts=[('la forme : bulle sur la ville (cadres 0-1) contre page sous Plus seulement (client)', A + '33 §7.1'),
               ('le second geste « Ne plus rien me montrer » (proposé ; la série 2 n\'a qu\'un geste)', A + '33 §7.2'),
               ('les mots proposés : « la première fois », « vues · à venir », « à découvrir », la phrase du refus', A + '33 §6 ; ' + A + '36 tsv'),
               ('« Lt. Hara » en dur dans le tutoriel de la 1ʳᵉ carte (paramètre `{lieutenant}` signalé)', A + '33 §5.1 ; ' + A + '52 §1.2'),
               ('la bulle répète la carte : servir la phrase de la série 2 ?', A + '33 §7.3'),
               ('les 7 clés `tutoriel.ecran.*` pas encore servies', A + '36 tsv')],
      connus=['⛔ le commit de CLIENT-2 qui refait ㉕ (`049a863e`) est sur `mafia-unity-F`, PAS dans le cumul (le cumul dit encore « J\'AI COMPRIS ») : **une capture n\'est jugeable qu\'après sa fusion.**'],
      routes='`GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial` (seul écrivain de `shown_tutorial_ids`), `PATCH /v1/ui/tutorial-opt-out` ; `POST /v1/session/open` (bloc `onboarding`, non dessiné)',
      manquent='les PATCH sont des mutations sans corps',
      front='refonte NON fusionnée au cumul (voir « connus »)', front_fichiers=['Assets/Scripts/Onboarding/TutorialScreenController.cs']),
 dict(sym='㉙', dossier='ecran_conflit', tour='r3', jd='cloture', nom='Le conflit', ctl='ConflitScreenController',
      travail='les mots (table 40), le geste vers un AXE, les erreurs du POST (addendum 40)',
      refs=[('ecran_conflit/reference-1080x2102.png', 300, '**MAQUETTE À RATIFIER** — ㉙ n\'est PAS ratifiée (décision f2 du 23/09 : front.md l.22 ne la liste pas, l.1328 « ratification user ✗ »)', 'série 6 cadre 59, nominal : « Le premier coup — on n\'a jamais croisé personne »'),
            ('ecran_conflit/reference-manque-1080x2102.png', 300, '**MAQUETTE À RATIFIER** (idem)', 'série 6 cadre 64 : « Ce qu\'on ne peut pas faire »')],
      refs_notes=['Cadres 60-63 : source seule (le septième coup, deux choses ne collent pas, en cours, rentré) ; 65-66 = la v1, REMPLACÉE. '
                  'Les deux PNG sont re-rendus en DejaVu et « Plein jour » (`e20fe648`, `cb86e772`, `c833d204`). '
                  '`ecran_conflit/dossier.md` (à la racine) est un gabarit non rempli : ce dossier-ci et `r2-2026-09-22` font foi.'],
      assumes=[
        ('le geste vise un AXE, pas un bâtiment : « On envoie {nom} chez {famille}, sur {axe}. », 5 mots `conflit.axe.*`', '`target_holding_id` est un des 5 axes (`engagements.controller.ts:166-183` du back ; `997d6ab4`) ; la référence qui nomme un entrepôt est une dette de maquette (' + A + '40 tsv)', 'un bâtiment nommé comme cible'),
        ('« autre cible », pas « autre bâtiment »', A + '40 tsv', '—'), ('pas d\'aperçu du butin avant l\'envoi', 'aucune donnée ne le sert (' + A + '40 tsv)', '—'),
        ('pas de panneau des manques en texte servi (cadre 64)', A + '40 tsv (classé en note)', '—'),
        ('médaillons à initiale C / T / G / S avec le nom de la famille', 'D11 : le nom accompagne (' + A + '40 tsv)', 'une initiale seule'),
        ('« Les quatre familles de Brennar », « Dites-moi seulement chez qui… »', 'D14 (' + A + '40 tsv)', '—'),
        ('« L\'envoyer ce soir » actif seulement quand famille, homme et axe sont choisis ; aucune annulation', A + '40 tsv', '—'),
        ('le refus « deux choses ne collent pas » (aucun gros bras)', 'le compte de démo n\'a aucun MUSCLE (corps `GET_lieutenants.json`)', '—'),
        ('pas d\'heure de départ (« il est parti »)', '`created_at_minute` absent exprès (front.md ㉙)', '—'),
        ('les erreurs du POST dites en mots : 409 (clé servie `error.engagements.muscle_lieutenant_required`, RATIFIÉE et gardée par le back `f82a140b`), 404 et 422 en un mot chacun, l\'échec réseau', A + '40-addendum-engagements (`24897b48`)', 'un code affiché'),
      ],
      pas_noter=[
        ('la ponctuation haute du servi', 'D17'), ('« Lt. Kest », la famille visée, le chrome', 'exemples (point 19)'),
        ('le « C » de CHALEUR rogné', 'hérité (`7d00782d`)'), ('les cadres 65-66', 'la v1, remplacée'),
        ('« demain matin »', 'prose, pas une phase (D16 ne s\'applique pas)'),
        ('pas de dock sur la référence', 'la série 6 n\'en dessine pas ; le chrome se juge contre le canon du HUD (dossier r2)'),
      ],
      ouverts=[('la maquette ㉙ elle-même (cadres 59-66) : à ratifier ; ses mots genrés ont reçu des formes ÉPICÈNES (D13, table 40 v3 `df041316`) — un mot genré à l\'écran est un écart, pas un mot ratifié', 'décision f2 du 23/09'),
               ('la valeur du 409 : RATIFIÉE (`ERROR_TEXT_RATIFIED`), gardée telle quelle (f2 ; addendum v3 `df041316`) — à juger comme ratifiée', A + '40-addendum'),
               ('« Coup n°{n} » : dérivé de la liste (table 40) ou `strike_index` (client)', A + '40 tsv ; `ConflitDtos.cs`'),
               ('le mot « réseau » ne tient que si le client réémet la même `Idempotency-Key`', A + '40-addendum'),
               ('un glyphe coupé au bord haut-droit des deux références (x≈1065, y≈37 px)', 'observé à l\'image, sans source — à constater, pas à imputer au client')],
      connus=['constats SUSPENDUS du 07/09 à trancher sur une planche neuve : B1, B2, M9, m6, m7, m8 (dossier r2)'],
      routes='`/v1/lieutenants`, `GET` et `POST /v1/me/engagements`',
      manquent='`POST_me_engagements` : mutation non appelée ; pas encore servis au moment des corps : `target_axis_i18n`, `lieutenant`, `strike_index`',
      front='', front_fichiers=['Assets/Scripts/Operational/Conflit/ConflitScreenController.cs', 'Assets/Scripts/Operational/Conflit/ConflitDtos.cs']),
 dict(sym='④', dossier='accueil', tour='r1', jd='cloture', nom='Accueil', ctl='DashboardController',
      travail='la carte de tête en forme honnête, la file sous pression, l\'entrée du rapport',
      refs=[('accueil/maquette-2026-09-23/cadre-0-1080x2102.png', 300, '**MAQUETTE À RATIFIER, jamais une référence** (`7d00782d`)', 'rien à trancher'),
            ('accueil/maquette-2026-09-23/cadre-1-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', 'la carte de tête, forme honnête (re-rendue `7d00782d`)'),
            ('accueil/maquette-2026-09-23/cadre-2-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', 'des rapports à lire'),
            ('accueil/maquette-2026-09-23/cadre-3-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', 'la file sous pression (« saturée »)')],
      refs_notes=['Aucune référence RATIFIÉE : ④ n\'avait aucune maquette avant le 23/09 (front.md l.1609). Source : `ecrans-brennar-accueil.html`, 4 cadres.'],
      assumes=[
        ('les options servies (`hl.option.*`) écrites en TEXTE sous « Ce qu\'on peut faire » ; deux boutons « Prendre acte » (commit) et « Pas maintenant » (skip)', 'les options sont DESCRIPTIVES, commit / skip sont les seules actions (`hl-card-types.ts:99-104` du back ; `a0ff6cba` ; ' + A + '45 tsv)', 'une option sur un bouton, ou présentée comme recommandée'),
        ('pas de « Conseil : »', 'aucun champ servi ne marque une recommandation (' + A + 'generer-45-carte-de-tete.py)', 'idem'),
        ('« prendre acte n\'agit pas à votre place »', A + '45 tsv', '—'),
        ('la file : « Plusieurs attendent encore » SANS nombre ; « d\'autres attendent au-delà de ce que la file montre »', 'le back ne sert que des bandes (`queue_pressure_band`, `backlog_badge`) ; `9513b05b`', 'un nombre affiché'),
        ('3 états et l\'entrée du rapport, pas plus', 'périmètre validé par f2 (' + A + '25 §2.1)', '—'),
        ('formes honnêtes : `flag_review`, `settling_glance`, `friction_glance.penalty_active`, `onboarding`, `priority_band`, `confidence_band` servis mais NON dessinés', A + '25 (questions posées à l\'user)', '—'),
        ('aucun mot ni bouton de sortie (on sort en touchant la ville)', 'front.md §4 B ; ' + A + '25', '—'),
        ('la carte des rapports annonce un rapport OUVERT, une fois par session', 'D5', '—'),
        ('bandes en mots (« modérée », « faible », « grave »), la barre en « Plein jour », dock du canon', 'R2.2 ; D1 ; D16 ; point 15', 'un chiffre, « Matin », une icône'),
      ],
      pas_noter=[
        ('« 24 850 € », « Tiède / CHALEUR », « JOUR 12 »', 'chrome d\'exemple (point 19 ; `cb86e772`)'), ('le « C » de CHALEUR rogné', 'hérité (`7d00782d`)'),
        ('au cadre 1, la carte « Un local à remettre en état »', 'exemple (point 19) — la carte servie au compte de démo est `AUTONOMY_REPORTS_PENDING`, c\'est le cadre 2'),
        ('les soulignés en pointillé', 'mot proposé (convention de maquette)'), ('le point or sur Famille', 'sens ouvert (' + A + '22 §7.3) : ARBITRAGE'),
        ('une apostrophe droite dans « Laisser en l\'état »', 'D10 : écart du SERVI, pas du client'),
      ],
      ouverts=[('cadre 2 : « Lire maintenant » / « Laisser en attente » dessinés en BOUTONS (options `hl.option.autonomy_reports.*`)', 'la table 45 n\'a corrigé que le cadre 1'),
               ('l\'état « Limite de structure atteinte » (CapBlocked) non dessiné, en tension avec D18', '`HighestLeverageCardController.cs:227`'),
               ('le geste de commit (appui long, confirmation tapée) non dessiné', '`HighestLeverageCardController.cs:155-170`'),
               ('le commentaire client « RECOMMANDATION (options[0]) » contraire à la table 45', '`HighestLeverageCardController.cs:65-66`'),
               ('les 6 questions pour l\'user', A + '25 §2.1')],
      connus=['DÉFAUT CONNU (pas un écart assumé) : `event_descriptor` brut affiché (`ExceptionQueuePanelController.cs:161-163` ; `77b5c85e`), confié au client'],
      routes='`/v1/economy/wallet`, `/v1/me` ; la carte : `POST /v1/session/open` (`hl_card`), `POST /v1/session/hl-card/:id/commit` et `/skip`',
      manquent='commit / skip sans corps (mutations) ; au back d\'aujourd\'hui, `session/open` sert `opened_game_minute` et `day_phase`, absents du corps',
      front='', front_fichiers=['Assets/Scripts/Operational/Dashboard/DashboardController.cs', 'Assets/Scripts/Shell/HighestLeverageCardController.cs', 'Assets/Scripts/Shell/HlCardClient.cs']),
 dict(sym='⑦', dossier='famille', tour='r1-⑦', jd='cloture-⑦', nom='Fiche du lieutenant — la mécanique', ctl='LieutenantScreenController',
      travail='la fiche autour des données servies, l\'ordre permanent émis par l\'éditeur de ⑧',
      refs=[('famille/maquette-7-2026-09-23/cadre-0-1080x2102.png', 300, '**MAQUETTE À RATIFIER, jamais une référence** (' + A + '26 ; `7d00782d`)', 'la fiche nominale : Au repos, à l\'écoute, aucun ordre'),
            ('famille/maquette-7-2026-09-23/cadre-1-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', 'le signal dérive : trois gestes, quatre repères'),
            ('famille/maquette-7-2026-09-23/cadre-2-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', 'l\'ordre expire bientôt : « En faire la règle ? »'),
            ('famille/maquette-7-2026-09-23/cadre-3-1080x2102.png', 300, '**MAQUETTE À RATIFIER**', '« Donner un ordre » : l\'éditeur de ⑧ en mode ordre permanent (`7d00782d`)')],
      refs_notes=['L\'ancienne image `lieutenant/ecran-canon.png` (25/08) est PÉRIMÉE : chapeau et formulaire à 3 verbes ; front.md l.1402 la dit « à re-ratifier ». '
                  'Les dossiers `famille/r1…r4` jugent ⑥ (l\'organigramme), pas ⑦.'],
      assumes=[
        ('PAS de formulaire à trois verbes (Collecte, Blanchir, Surveiller), pas de Cible', 'non servable : aucune action DSL, pas de déclencheur, pas de cible (`compiler.service.ts:66` du back ; `aa2cd03b` ; ' + A + '41)', 'un bouton qui promet ces verbes'),
        ('pas de glissière de durée : « pour une durée fixe »', '`duration_class` ignoré en M2 (' + A + '41 ; ' + A + '42 tsv)', 'une durée chiffrée'),
        ('l\'émission passe par l\'éditeur de ⑧ (une règle `famille.regle.*`) et « Signer l\'ordre »', A + '41 ; « Signer l\'ordre » ratifié (série 1, ' + A + '42 tsv)', '—'),
        ('« Et quand il expire » et ses 3 `lapse_action` (choix obligatoire)', 'sinon 422 (' + A + '41)', '—'),
        ('disparus : loyauté 82 %, 3/8, 8/12, probation, préfère / rejette, veto, « Sal », « Relever de ses fonctions »', 'aucune donnée ou aucune route (' + A + '26 ; ' + A + '12)', '—'),
        ('non dessinés : `trust_budget_bucket`, `flag_frequency_band` (déjà sur ⑯), `cue_bands`', A + '26', '—'),
        ('les bandes d\'autonomie en MOTS seuls, sans jauge', 'R2.2 et D11', '`[####]` affiché'),
        ('capuche, bordure laiton', 'décision du 02/09 (' + A + '12)', '—'), ('« Depuis peu » (FRESH), pas « nouveau venu »', 'D13', '—'),
        ('dock du canon, ronds vides, Famille active ; la barre en « Plein jour »', 'point 15 ; D16', '—'),
      ],
      pas_noter=[
        ('la règle « dans mon bâtiment → suspendre les opérations »', 'exemple de règle servie (' + A + '41)'),
        ('les trois catégories d\'autonomie Épuisé / Normal / Plein', 'exemple : le corps réel n\'a que `PRODUCTION_OPS: depleted` (point 19)'),
        ('le chrome d\'exemple, le « C » de CHALEUR rogné', 'point 19 ; hérité (`7d00782d`)'),
        ('le « il » des questions (« Il écoute autre chose… »)', 'question posée à l\'user (' + A + '26), pas un défaut ; « Et quand il expire » : « il » = l\'ordre'),
        ('« CUISINIER · EXÉCUTANT · DÉLÉGUÉ » sous le nom', 'mots genrés déjà sur la liste de l\'user pour ⑦ (D14)'),
        ('le point or sur Famille ; les soulignés en pointillé', 'sens ouvert (ARBITRAGE) ; mot proposé'),
      ],
      ouverts=[('la forme, les mots proposés, le « il »', 'à ratifier (' + A + '26 ; ' + A + '41)'), ('le fond de ville pour toute la série 1, ou aucun', A + '12'),
               ('afficher `cue_bands` à côté des repères', 'recommandé (' + A + '41)'),
               ('cadre 3 : un grand vide entre les choix et « Signer l\'ordre »', 'rien ne le classe ; à comparer au constat M9 « vide terminal » de ㉙')],
      connus=['⑦ n\'a PAS de ligne propre dans l\'INDEX : c\'est une section de ⑥ (même contrôleur) — sa maquette y est désormais citée',
              'aucune route `standing-order` ni `signal-drift` n\'est appelée par le client (0 appel au cumul) : l\'émission n\'est pas encore câblée'],
      routes='`GET /v1/lieutenants/:id` (`drift_phase`, `standing_order`, bandes) ; à câbler : `POST …/standing-order`, `…/standing-order/decision`, `…/signal-drift/decision`',
      manquent='aucun corps pour les routes `standing-order` et `signal-drift` (non appelées)',
      front='émission non câblée (voir « connus »)', front_fichiers=['Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs']),
]

def taille(rel):
    p = os.path.join(JV, rel)
    if not os.path.exists(p): return None
    from PIL import Image
    return Image.open(p).size

def corps(dossier):
    """(fichier, date, back servi, compte masqué ?) — lus dans la provenance ; jamais une valeur d'identifiant."""
    out = []
    for f in sorted(glob.glob(os.path.join(JV, dossier, 'corps-reels', '*.json'))):
        n = os.path.basename(f)
        if n.startswith('_index'): continue
        try: p = json.load(open(f, encoding='utf-8')).get('provenance') or {}
        except Exception: p = {}
        mut = 'mutation' in json.dumps(json.load(open(f, encoding='utf-8')), ensure_ascii=False)[:600].lower() if os.path.getsize(f) < 4000 else False
        out.append((n, str(p.get('date', '?'))[:19], p.get('back_served', '?'), mut))
    return out

def fraicheur():
    r = subprocess.run([sys.executable, os.path.join(JV, 'verifier-fraicheur-corps.py'), BACK], cwd=JV, capture_output=True, text=True)
    perimes = {}
    for l in r.stdout.splitlines():
        m = re.match(r'\s+(\S+)/corps-reels/(\S+\.json)\s+←\s+(\S+)', l)
        if m: perimes.setdefault(m.group(1), {}).setdefault(m.group(2), set()).add(m.group(3).replace('services/game-back/src/', ''))
    return r.returncode, perimes

def lien(src, dst):
    if os.path.lexists(dst): return
    os.symlink(src, dst)

def table(lignes, tete):
    return '\n'.join(['| ' + ' | '.join(tete) + ' |', '|' + '---|' * len(tete)] + ['| ' + ' | '.join(x.replace('|', '\\|') for x in l) + ' |' for l in lignes])

def dossier_jv(e, rc_frais, perimes, controle):
    R = os.path.join(JV, e['dossier'], f"{e['tour']}-{DATE}")
    if os.path.exists(R) and not controle and e['sym'] not in REFAIRE: return f"{os.path.relpath(R, cd.CLIENT)} existe déjà — non touché"
    rows = []
    for rel, css, statut, etat in e['refs']:
        t = taille(rel)
        rows.append([f'`{os.path.basename(rel)}` (lien vers `{rel}`)', etat, statut, f'{t[0]}×{t[1]}' if t else '**ABSENT**', f'×{t[0] / css:.1f}'.replace('.', ',') if t else '—', f'{css} CSS = {t[0]} px' if t else '—'])
    trow = next((r for r in cd.TABLE + cd.HORS_APPSHELL if r['dossier'] == e['dossier'] and (r['sym'] == e['sym'] or (e['sym'] == '⑦' and r['sym'] == '⑥'))), None)
    planche = (trow or {}).get('planche') or ''
    cs = corps(e['dossier']); per = perimes.get(e['dossier'], {})
    crow = [[f'`{n}`', d, f'`{b}`', 'mutation, pas de corps' if m else 'réponse réelle', ('**PÉRIMÉ** (' + ', '.join(sorted(per[n]))[:160] + ')') if n in per else 'opposable'] for n, d, b, m in cs]
    txt = f"""# Dossier du juge visuel — {e['sym']} {e['nom']} — {e['tour']} — {DATE}

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent** (elles se posent au créneau, dès que l'user pose `capture.env`).
> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` (atelier / DA) le {DATE}, après la nuit du 22 au 23/09 : {e['travail']}.
> Tout ce qui manque est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : {e['nom']} ({e['sym']}) — contrôleur `{e['ctl']}` — dossier `{e['dossier']}`
- **Travaillé cette nuit** : {e['travail']}
- **Planche attendue** (table de `construire-dossiers.py`) : `{planche or 'non mesurée'}`

## Référence (fait autorité : l'IMAGE) — taille et facteur MESURÉS sur le fichier

{table(rows, ['fichier (dans ce dossier)', 'état montré', 'statut', 'taille px', 'facteur', 'largeur CSS ↔ px']) if rows else '**Aucune référence à jour.** Voir ci-dessous.'}

""" + '\n'.join(f'- {n}' for n in e['refs_notes']) + f"""
- ⛔ Une **maquette à ratifier** n'est PAS une référence ratifiée : un écart entre la capture et elle se classe **ARBITRAGE** (à ratifier),
  jamais BLOQUANT contre le client — sauf s'il contredit une donnée servie ou une décision du registre.
- Polices : références rendues en **DejaVu** depuis le 23/09 (point 18) ; le client embarque DejaVu : un écart de famille se compare.
  Un canon de série 2 (900×1752, ×3) date d'avant : Noto / Liberation, apostrophe droite — retards du canon.

## Écarts ASSUMÉS — déjà tranchés : à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

{table(e['assumes'], ['ce qu\'on voit', 'pourquoi (source)', 'ce qui le ferait SORTIR de l\'assumé'])}

## Ce que tu ne dois PAS noter (tentant, mais ce n'est pas un défaut du client)

{table(e['pas_noter'], ['tentation', 'pourquoi'])}

## OUVERT — non tranché : à classer ARBITRAGE, jamais défaut

{table(e['ouverts'], ['point', 'source'])}

## Connu, ni assumé ni ouvert

""" + '\n'.join(f'- {c}' for c in e['connus']) + f"""

## Données servies attendues

- **Routes** : {e['routes']}
- **Corps réels** (`{e['dossier']}/corps-reels/`, provenance lue dans chaque fichier ; comptes masqués, aucune valeur d'identifiant ici) :

{table(crow, ['fichier', 'date', 'back servi', 'nature', 'fraîcheur (`verifier-fraicheur-corps.py` contre `main` du back `' + SHA_BACK + '`)']) if crow else '  aucun corps dans ce dossier'}

- **Manquent** : {e['manquent']}.
- Un corps **PÉRIMÉ** se REPREND sur le compte du run, dans la fenêtre du créneau (`passe-synchrone.py`, RECAPTURE §2.5) ; tant qu'il ne l'est
  pas, les VALEURS qui en dépendent vont en « non vérifié » — la forme se juge.

## Captures en jeu — À POSER AU CRÉNEAU

- Protocole : `RECAPTURE-2026-09-22.md` §2 (conteneur recréé, horodatage de l'image lu pendant le run, un run = une paire, exportée sous
  `MAFIA_CAPTURE_*` SEULEMENT — `MAFIA_DEMO_*` posé = faute —, sha256 + preuve d'identité jointe). Captures prises sur le cumul
  (`mafia-builder-city-clean`, aujourd'hui `{SHA_CUMUL}`) ; leur SHA s'écrit ici.
- Paire T / T+1 s si une animation est en cause (doctrine : aucune animation, sauf ce que ce dossier assume).

## Échelle et doctrine

- Référence ×{'3,0 (canon 392 CSS)' if e['sym'] == '①' else '3,6 (300 CSS)'} ; capture 1080×2400 (contenu à 300 CSS, ×3,6). Aligner par PARTIES entre bandeau et dock ; les
  rapports internes sont invariants d'échelle. Le CHROME se juge contre le canon du HUD, le contenu contre la référence de l'écran.
- Langue affichée : français via résolveurs nommés (un enum brut, une clé ou un repli anglais à l'écran = écart de SENS) ; contraste
  ≥ 3:1 / 4,5:1 sur l'art réel ; R2.2 (aucun scalaire dans une phrase) ; D8 (jamais de valeur brute).

## Format du RAPPORT — imposé

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \\| `MAJEUR` \\| `MINEUR` | `DÉJÀ APPLIQUÉ` \\| **`NOUVEAU`** | oui/non | <l'écart> | <les nombres> | <ou vide> |

- ASSUMÉ et ARBITRAGE se comptent À PART ; gravité en liste fermée.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client et ses tests ; les notes d'implémentation ; les rapports des juges précédents ;
- pour l'instant : toute capture.

Préparé sur le client `{SHA_CLIENT}` (branche `da/2026-09-22`), cumul `{SHA_CUMUL}`, back `{SHA_BACK}`, atelier `{SHA_ATELIER}`.
"""
    if controle: return f"{e['sym']} : {len(txt)} car., {len(rows)} référence(s), {len(e['assumes'])} assumés, {len(crow)} corps ({sum(1 for c in crow if c[4] != 'opposable')} périmés)"
    os.makedirs(R, exist_ok=True)
    for rel, *_ in e['refs']:
        if os.path.exists(os.path.join(JV, rel)): lien(os.path.relpath(os.path.join(JV, rel), R), os.path.join(R, os.path.basename(rel)))
    open(os.path.join(R, 'dossier.md'), 'w', encoding='utf-8').write(txt)
    open(os.path.join(R, 'captures-provenance.md'), 'w', encoding='utf-8').write(f'# Captures — {e["sym"]} {e["tour"]}-{DATE}\n\nAUCUNE CAPTURE ENCORE — à poser au créneau (copie + sha256 + ligne d\'identité).\n')
    return os.path.relpath(R, cd.CLIENT)

def dossier_jd(e, controle):
    R = os.path.join(JD, e['dossier'], f"{e['jd']}-{DATE}")
    if os.path.exists(R) and not controle and e['sym'] not in REFAIRE: return f"{os.path.relpath(R, cd.CLIENT)} existe déjà — non touché"
    jv = f"Tools/juge-visuel/{e['dossier']}/{e['tour']}-{DATE}/dossier.md"
    ff = []
    for f in e['front_fichiers']:
        ff.append([f'`{f}`', 'présent au cumul' if os.path.exists(os.path.join(CUMUL, f)) else '**absent du cumul à ce chemin**'])
    txt = f"""# Dossier du juge données — {e['sym']} {e['nom']} — clôture (préparée) — {DATE}

> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` d'après `.claude/skills/juge-donnees/dossier-gabarit.md` (dépôt back).
> Ce qui ne peut pas être rempli se dit « non fourni » avec la raison. Le détail (références, assumés, ouverts, corps) est dans le
> dossier visuel jumeau : `{jv}` — **même source, jamais recopié à la main**.

## Mode : clôture (préparée — le rapport juge-visuel APPROUVÉ n'existe pas encore)

## L'écran

- **Nom** : {e['nom']} ({e['sym']}) — contrôleur `{e['ctl']}`
- **Ce qu'on vient y faire / travaillé cette nuit** : {e['travail']}
- **Routes** : {e['routes']}

## Maquette (M)

- Voir la table des références du dossier visuel jumeau (statut ratifié / « maquette à ratifier » écrit ligne par ligne).
- Mots : les tables de l'atelier (`Tools/atelier-2026-09-22/`) — une clé proposée n'est pas une clé ratifiée.

## Back (B)

- **Stack locale** : NON FOURNIE — `docker ps` se colle au créneau (la pile se monte après le gate ; jamais pendant un gate E2E).
- **Back de référence** : `main` du dépôt back `{SHA_BACK}` au moment de la préparation ; corps réels datés et leur fraîcheur : dossier jumeau.
- **Compte** : le compte de capture (paire sous `MAFIA_CAPTURE_*`), ou un compte frais par `POST /v1/auth/signup` + `POST /v1/session/open`.

## Front (F)

{table(ff, ['fichier', 'état'])}

- **Cumul** : `mafia-builder-city-clean` `{SHA_CUMUL}`. {e['front'] or 'rien de non fusionné relevé pour cet écran.'}
- **Rapport `juge-visuel` APPROUVÉ** : NON FOURNI (à venir : `{jv.replace('dossier.md', 'rapport.md')}`).
- **Suite PlayMode** : NON FOURNIE.

## Écarts ASSUMÉS déjà connus (le juge les re-vérifie, il ne les recopie pas)

{table([(a, b) for a, b, _ in e['assumes']], ['information', 'raison mesurée / source'])}

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- les notes d'implémentation du chantier ; les rapports de juges précédents (visuels ou données) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus ou dans le dossier jumeau, ils n'existent pas.
"""
    if controle: return f"{e['sym']} (données) : {len(txt)} car., {len(ff)} fichiers front"
    os.makedirs(R, exist_ok=True); open(os.path.join(R, 'dossier.md'), 'w', encoding='utf-8').write(txt)
    return os.path.relpath(R, cd.CLIENT)

def main():
    controle = '--controle' in sys.argv
    manquants = [f"{e['sym']} {rel}" for e in E for rel, *_ in e['refs'] if not os.path.exists(os.path.join(JV, rel))]
    if manquants: raise SystemExit(f'⛔ références déclarées absentes : {manquants}')
    for e in E:
        for c in ('assumes', 'pas_noter', 'ouverts'):
            for l in e[c]:
                if not l[-1 if c != 'assumes' else 1].strip(): raise SystemExit(f"⛔ {e['sym']} {c} : une ligne sans source")
    rc, perimes = fraicheur()
    print(f'fraîcheur des corps : code {rc} ({sum(len(v) for v in perimes.values())} corps périmés, tous dossiers) — back {SHA_BACK}')
    for e in E:
        print(' ', dossier_jv(e, rc, perimes, controle)); print(' ', dossier_jd(e, controle))
    return 0

if __name__ == '__main__':
    sys.exit(main())
