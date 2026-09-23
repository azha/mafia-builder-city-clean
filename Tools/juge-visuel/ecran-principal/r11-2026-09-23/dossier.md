# Dossier du juge visuel — ① Intérieur de district — r11 — 2026-09-23

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent** (elles se posent au créneau, dès que l'user pose `capture.env`).
> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` (atelier / DA) le 2026-09-23, après la nuit du 22 au 23/09 : le bandeau éphémère, la descente, la couche du district (libellés par ancre + anneau de sélection), le titre du district.
> Tout ce qui manque est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Intérieur de district (①) — contrôleur `DistrictInteriorScreenController` — dossier `ecran-principal`
- **Travaillé cette nuit** : le bandeau éphémère, la descente, la couche du district (libellés par ancre + anneau de sélection), le titre du district
- **Planche attendue** (table de `construire-dossiers.py`) : `screen_1_district_sous_chrome_1080x2400.png`

## Référence (fait autorité : l'IMAGE) — taille et facteur MESURÉS sur le fichier

| fichier (dans ce dossier) | état montré | statut | taille px | facteur | largeur CSS ↔ px |
|---|---|---|---|---|---|
| `ecran-canon-propre.png` (lien vers `ecran-principal/ecran-canon-propre.png`) | état N (nuit), « JOUR 12 · Soirée », sans heure — pas de « Matin » à remplacer (D16) | RATIFIÉE (point 17, ratifié en bloc par f2 le 07/09, ARBITRAGES l.4 et l.35) — page `hud-brennar-canon.html`, re-rendue le 23/09 en DejaVu (`e20fe648`) puis chrome ratifié (`cb86e772` : « 24 850 € », « Tiède / CHALEUR », Filière, fiche en bandes). Le RENDU du 23/09 n'a pas été revu par l'user. | 1176×2091 | ×3,0 | 392 CSS = 1176 px |

- ⚠️ **Échelle corrigée** : ce fichier fait **1176×2091 à ×3,0** (le `.tel` du canon fait 392 CSS). Le dossier r10 annonçait 1080×2102 à ×3,6 : c'était faux. Les tailles de cette table sont MESURÉES sur le fichier au moment de la génération.
- `ecran-canon.png` (avec l'échafaudage d'atelier) et `maquette-hud-brennar.png` sont REMPLACÉS : ce ne sont plus des références.
- ⛔ Une **maquette à ratifier** n'est PAS une référence ratifiée : un écart entre la capture et elle se classe **ARBITRAGE** (à ratifier),
  jamais BLOQUANT contre le client — sauf s'il contredit une donnée servie ou une décision du registre.
- Polices : références rendues en **DejaVu** depuis le 23/09 (point 18) ; le client embarque DejaVu : un écart de famille se compare.
  Un canon de série 2 (900×1752, ×3) date d'avant : Noto / Liberation, apostrophe droite — retards du canon.

## Écarts ASSUMÉS — déjà tranchés : à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

| ce qu'on voit | pourquoi (source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| la bande du nom de district sous la barre, absente du canon ; elle cède la place au bandeau quand il parle | D3 ; front.md §4 L (25/08) ; `hud-brennar.html` l.82/176 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `0b49a634` (CanvasGroup) | la bande reste visible pendant que le bandeau parle, ou le nom n'est pas `interior.name` |
| l'anneau **crème** autour du badge du bâtiment dont la fiche est ouverte (la sélection) | D4 ; r9 M6 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `e9db74eb` | un anneau or, deux anneaux, ou un anneau sans fiche ouverte |
| le bandeau « {nom} a un rapport pour vous — lire » (le canon : « ✉ Sal a un rapport du soir — lire ») | D5 (un rapport OUVERT, une fois par session) ; Tools/atelier-2026-09-22/22 §7.1 C (« du soir » tombe) ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `c5ab2a6e` | le bandeau revient dans la même session, ou le nom affiché est un identifiant |
| les autres bandeaux : « La brigade quadrille le quartier — planquez la caisse », « Les indics parlent : la brigade s’agite », « {nom} attend vos ordres » / « La ville attend vos ordres », mot d'action or « trancher » / « lire » ; un seul à la fois (descente > ville > carte > rapport), 5 s puis fondu | Tools/atelier-2026-09-22/22 §7.1 C ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `0b49a634` | deux bandeaux ensemble, un chiffre, un glyphe, une annonce répétée |
| aucun glyphe dans le bandeau (✉ ⚠ 🚨 retirés) | D11 | un glyphe réapparaît |
| la descente : médaillon « DESCENTE » en braise, cerclage et filet qui battent, aiguille qui tremble | mot du canon `hud-brennar.html:255` (Tools/atelier-2026-09-22/23 §2, tranché) ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `881c17f6` | la descente s'affiche sans `heat.escalated` du district, ou la barre ne revient pas à l'état nommé |
| le gyrophare CACHÉ le jour ; la nuit, sa lueur est centrée sur la voiture de police du district D (pas à la place du canon) | D7 ; `hud-brennar.html:75` ; Tools/atelier-2026-09-22/22 §7.2 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `881c17f6` | une lueur de jour, une lueur sur un toit, ou sans `escalated` |
| « CHALEUR » (canon « Heat ») ; bandes Froid · Tiède · Chaud · Brûlant au lieu de « 37 % » | points 11 et 19 du 07/09 ; Tools/atelier-2026-09-22/22 §7.1 A | un pourcentage, ou « Heat » |
| le médaillon dit la VILLE, la case 3 le DISTRICT | points 7 et 8 du 07/09 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `9b6625ba` | la case 3 porte le bucket de la ville ou du bâtiment |
| les cases « À COLLECTER · REVENUS · CHALEUR LOCALE » en bandes (Rien / Prêt / Plein · Au repos / Rapporte · la chaleur) ; « — » quand la donnée manque | point 8 ; Tools/atelier-2026-09-22/22 §7.1 A ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `9b6625ba` | un chiffre (R2.2) |
| l'argent « 24 850 € », sans centimes, espace fine U+202F ; AUCUN fil de ratio sous l'argent | point 10 ; D2 (option b) | des centimes, un fil de ratio |
| la phase seule (« Soirée », « Plein jour »), sans heure | point 16 ; D16 | une heure, ou « Matin » |
| le dock Empire · Famille · Filière · Plus, ronds VIDES | D6 ; point 15 | une icône, ou « Marché » |
| le titre de fiche = l'enseigne seule, en capitales ; sous-titre « {type} · {district}, îlot {block}[, n° {rang}] » | point 12 ; Tools/atelier-2026-09-22/22 §7.1 B ; D12 | le nom composé, un titre rétréci, plus de 2 lignes |
| la couche du district : un libellé par ancre, 9 px CSS, sans chiffre, pas de glyphe sur une ancre qui porte plusieurs types | CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `e9db74eb` (r9 B1, B3) | des libellés superposés |
| « état inconnu » / « type inconnu » / « — » | D8 | une valeur brute |

## Ce que tu ne dois PAS noter (tentant, mais ce n'est pas un défaut du client)

| tentation | pourquoi |
|---|---|
| le fond est le district D, pas le ZO du canon | Tools/atelier-2026-09-22/23 ; Tools/atelier-2026-09-22/22 §2.1 |
| le canon dessine encore un fil de ratio (68 %), « rapport du soir » avec ✉, pas de pouls ni de gyrophare | le canon est EN RETARD sur D2, D5, D11 ; il est dans l'état N |
| pas de « + $320 » qui monte | point 17 (échafaudage retiré) |
| anglais ou `$` dans une référence | point 19 : maquette en retard |
| espace ordinaire avant « : ; ? » dans un texte servi | D17 : défaut du SERVI, lot du back — à classer écart du servi, pas du client |
| chrome non alimenté, ou phase « — » hors district | état VOULU (dossier r10) |
| le bouton « La fiche » de l'Accueil a disparu | Tools/atelier-2026-09-22/23 ; CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `ada52db4` |

## OUVERT — non tranché : à classer ARBITRAGE, jamais défaut

| point | source |
|---|---|
| le sens du point or de Famille | Tools/atelier-2026-09-22/22 §7.3 ; Tools/atelier-2026-09-22/23 |
| le flou de la plaque de fiche | Tools/atelier-2026-09-22/22 §7.4 |
| « Quartier général » : le servir ou non | Tools/atelier-2026-09-22/23 |
| l'en de `chrome.medaillon.descente` (« Raid », proposé) | Tools/atelier-2026-09-22/22 §7.1 A |
| l'animation de la descente face à la doctrine « aucune animation » | point 5 « sans tween » NON ratifié (ARBITRAGES l.4) |
| la place du titre du district quand le bandeau est absent | CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `0b49a634` |
| la teinte braise de la case 3 à « Tiède » dans le canon | aucun registre |
| la phrase de descente reste crème (sans or) | déclaration client (CLIENT-2 `mafia-unity-F` (branche `ecrans/2026-09-23`) `0b49a634`), pas une décision du registre |

## Connu, ni assumé ni ouvert

- r9 B2 (marqueurs sur sol nu) et M10 (hauteur de l'art 2400) : défauts CONNUS, restent à l'atelier (Tools/atelier-2026-09-22/22 §7.2) — pas des écarts assumés
- constats SUSPENDUS du 07/09 à trancher TENU / CLOS : M7, M8, M14, m4, m5, m11 (dossier r10)

## Données servies attendues

- **Routes** : `/v1/city/district/:id/interior`, `…/heat`, `…/stash`, `/v1/world/districts`, `/v1/operational/dealer/:id/collect`, `/v1/operational/laundering/inject` ; shell : `/v1/session/open` (queue, escalated, phase), `GET /v1/autonomy-reports`, `/v1/economy/wallet`, `/v1/i18n/bundle`
- **Corps réels** (`ecran-principal/corps-reels/`, provenance lue dans chaque fichier ; comptes masqués, aucune valeur d'identifiant ici) :

| fichier | date | back servi | nature | fraîcheur (`verifier-fraicheur-corps.py` contre `main` du back `30360c8d`) |
|---|---|---|---|---|
| `GET_city_district_id_heat.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_city_district_id_interior.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_city_district_id_stash.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_i18n_bundle_locale.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (common/i18n-ref.ts, i18n/string_table.ts) |
| `GET_world_districts.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `POST_auth_signin.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `POST_auth_signup.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `POST_operational_dealer_dealerId_collect.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `POST_operational_laundering_inject.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/laundering/laundering.repository.ts) |

- **Manquent** : `session/open` et `autonomy-reports` n'ont pas de corps dans ce dossier ; le bundle est antérieur aux clés `chrome.bandeau.*` et `district.fiche.*`.
- Un corps **PÉRIMÉ** se REPREND sur le compte du run, dans la fenêtre du créneau (`passe-synchrone.py`, RECAPTURE §2.5) ; tant qu'il ne l'est
  pas, les VALEURS qui en dépendent vont en « non vérifié » — la forme se juge.

## Captures en jeu — À POSER AU CRÉNEAU

- Protocole : `RECAPTURE-2026-09-22.md` §2 (conteneur recréé, horodatage de l'image lu pendant le run, un run = une paire, exportée sous
  `MAFIA_CAPTURE_*` SEULEMENT — `MAFIA_DEMO_*` posé = faute —, sha256 + preuve d'identité jointe). Captures prises sur le cumul
  (`mafia-builder-city-clean`, aujourd'hui `fc3033ec`) ; leur SHA s'écrit ici.
- Paire T / T+1 s si une animation est en cause (doctrine : aucune animation, sauf ce que ce dossier assume).

## Échelle et doctrine

- Référence ×3,0 (canon 392 CSS) ; capture 1080×2400 (contenu à 300 CSS, ×3,6). Aligner par PARTIES entre bandeau et dock ; les
  rapports internes sont invariants d'échelle. Le CHROME se juge contre le canon du HUD, le contenu contre la référence de l'écran.
- Langue affichée : français via résolveurs nommés (un enum brut, une clé ou un repli anglais à l'écran = écart de SENS) ; contraste
  ≥ 3:1 / 4,5:1 sur l'art réel ; R2.2 (aucun scalaire dans une phrase) ; D8 (jamais de valeur brute).

## Format du RAPPORT — imposé

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | oui/non | <l'écart> | <les nombres> | <ou vide> |

- ASSUMÉ et ARBITRAGE se comptent À PART ; gravité en liste fermée.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client et ses tests ; les notes d'implémentation ; les rapports des juges précédents ;
- pour l'instant : toute capture.

Préparé sur le client `052b13a6` (branche `da/2026-09-22`), cumul `fc3033ec`, back `30360c8d`, atelier `ffb6f67`.
