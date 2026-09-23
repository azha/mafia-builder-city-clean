# Dossier du juge visuel — ⑲ Réglages — la porte « le coffre » — r1-⑲ — 2026-09-23

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent** (elles se posent au créneau, dès que l'user pose `capture.env`).
> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` (atelier / DA) le 2026-09-23, après la nuit du 22 au 23/09 : la porte mise à jour : ce que le back sert aujourd'hui (une porte, deux entrées avec ㉒).
> Tout ce qui manque est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Réglages — la porte « le coffre » (⑲) — contrôleur `SettingsScreenController` — dossier `compte`
- **Travaillé cette nuit** : la porte mise à jour : ce que le back sert aujourd'hui (une porte, deux entrées avec ㉒)
- **Planche attendue** (table de `construire-dossiers.py`) : `planche_les_reglages_1080x2400.png`

## Référence (fait autorité : l'IMAGE) — taille et facteur MESURÉS sur le fichier

| fichier (dans ce dossier) | état montré | statut | taille px | facteur | largeur CSS ↔ px |
|---|---|---|---|---|---|
| `reference-㉒-1080x2102.png` (lien vers `compte/reference-㉒-1080x2102.png`) | série 6 cadre 95 « Le compte — ce que le back sert » | RATIFIÉE par délégation le 02/09 (front.md l.22 ; ⑲ rattaché par la fusion front.md l.1894, `4943b0c3`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-0-1080x2102.png` (lien vers `compte/porte-2026-09-23/cadre-0-1080x2102.png`) | la porte « ce que le back sert aujourd'hui » : L1 et L8 fermés, bascule tutoriels et FERMER LE COFFRE repris du 95, L5 L10 L11 éteints | **MAQUETTE À RATIFIER, jamais une référence** (`7d00782d`) — dérivée du cadre 97 ratifié par 7 remplacements vérifiés (Tools/atelier-2026-09-22/generer-porte-19-2026-09-23.py) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |

- Cadres 96 et 97 : pas de rendu 1080×2102 ; anciens rendus `v6/m-45..47.png` (900×1752, ancienne numérotation). `reglages-canon.png` / `reglages-avec-lots-back.png` (série 2, 02/09) : gardés, remplacés dans les faits par la porte v6.
- ⛔ Une **maquette à ratifier** n'est PAS une référence ratifiée : un écart entre la capture et elle se classe **ARBITRAGE** (à ratifier),
  jamais BLOQUANT contre le client — sauf s'il contredit une donnée servie ou une décision du registre.
- Polices : références rendues en **DejaVu** depuis le 23/09 (point 18) ; le client embarque DejaVu : un écart de famille se compare.
  Un canon de série 2 (900×1752, ×3) date d'avant : Noto / Liberation, apostrophe droite — retards du canon.

## Écarts ASSUMÉS — déjà tranchés : à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

| ce qu'on voit | pourquoi (source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| « Depuis ce matin » (L5), « FERMER PARTOUT » (L11), « TOUT EFFACER » (L10) éteints, ou absents au client | dettes de maquette : dessinées, non servies (Tools/atelier-2026-09-22/35 §7 ; `42c62272`) | une route servie pour L5, L11 ou L10 |
| « Dire mes prix au marché » allumée, sans lot | L1 fermé : `GET /v1/me` + `PUT /v1/me/meta-market/visibility` (Tools/atelier-2026-09-22/35) | la bascule ne reflète pas `meta_market_visibility_enabled` |
| « La langue de la maison · Français › », sans lot | L8 fermé (`PATCH /v1/me/settings`) ; le 97 fait foi contre le 95 (Tools/atelier-2026-09-22/35) | « English » pour un compte `fr` |
| la bascule « On vous explique encore » et « FERMER LE COFFRE · cette session seulement », vivants | repris du cadre 95 ratifié ; décision f2 (Tools/atelier-2026-09-22/35 §7) | le levier ne déclenche pas `POST /v1/auth/signout` |
| la bascule ALLUMÉE quand `tutorials_opt_out` = faux | inversion opt-in / opt-out écrite sur la maquette (Tools/atelier-2026-09-22/35) | la bascule suit la clé brute |
| une porte pour deux entrées Plus (㉒ « Le compte », ⑲ « Le jeu ») | décision f2 « on garde » (Tools/atelier-2026-09-22/35 §7) | — |
| les mots de la porte à la place des littéraux du client | D14 (Tools/atelier-2026-09-22/35 §5 ; Tools/atelier-2026-09-22/38 tsv) | — |
| « Le coffre est fermé. » / « Rouvrir le coffre » après la sortie | mots PROPOSÉS par f2, sans maquette de l'après (Tools/atelier-2026-09-22/38 tsv) | à juger comme PROPOSÉ, pas contre une maquette |

## Ce que tu ne dois PAS noter (tentant, mais ce n'est pas un défaut du client)

| tentation | pourquoi |
|---|---|
| les étiquettes bleues « L7 », « L5 », « · L11 », « · L10 » | annotations de DA (lots back), `generer-porte-19-2026-09-23.py` ; le client ne les affiche pas |
| les rivets du bas qui touchent « TOUT EFFACER » | hérité du cadre 97 ratifié, identique au pixel (`7d00782d`) |
| le « C » de CHALEUR rogné par la jauge | hérité du HUD (`7d00782d`) |
| « Plein jour », « Tiède », ronds du dock vides | D16 ; point 11 ; point 15 |
| l'adresse masquée « r•••@•••.fr » | choix de rendu de ㉒ (Tools/atelier-2026-09-22/35) |
| « JOUR 26 », « 24 850 € », le nom, « 50 jetons » | placeholders (point 19) |
| « cette session seulement » | c'est la session d'AUTHENTIFICATION que révoque `signout` (Tools/atelier-2026-09-22/35) — D18 porte sur la session de jeu |
| les espaces insécables dans les textes proposés | D17 |

## OUVERT — non tranché : à classer ARBITRAGE, jamais défaut

| point | source |
|---|---|
| la structure du client (sections « Le jeu », « Ce qui ne s'ouvre pas encore ») contre les tiroirs de la porte | Tools/atelier-2026-09-22/35 §5 ; Tools/atelier-2026-09-22/38 tsv |
| les mots des raisons éteintes (littéraux du client, non ratifiés) | Tools/atelier-2026-09-22/38 tsv |
| « Depuis ce matin » : absent au client, éteint à la maquette | Tools/atelier-2026-09-22/35 §7 |
| titre « LES RÉGLAGES » contre le tiroir « Le jeu » | Tools/atelier-2026-09-22/35 §5 |
| la mise à jour de la porte elle-même | à ratifier (`7d00782d`) |
| les 15 clés `reglages.bloc.*` pas encore servies (repli sur les littéraux) | Tools/atelier-2026-09-22/38 tsv |

## Connu, ni assumé ni ouvert

- ⛔ les commits de CLIENT-2 qui branchent ⑲ (`19ddc253`, `9e298c64`) sont sur `mafia-unity-F`, PAS dans le cumul : sur le cumul, ⑲ dit encore « Se déconnecter — pas encore ». **Une capture n'est jugeable qu'après leur fusion.**

## Données servies attendues

- **Routes** : `GET /v1/me` (`locale`, `meta_market_visibility_enabled`), `PATCH /v1/me/settings`, `GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial-opt-out`, `PUT /v1/me/meta-market/visibility`, `POST /v1/auth/signout`
- **Corps réels** (`compte/corps-reels/`, provenance lue dans chaque fichier ; comptes masqués, aucune valeur d'identifiant ici) :

| fichier | date | back servi | nature | fraîcheur (`verifier-fraicheur-corps.py` contre `main` du back `30360c8d`) |
|---|---|---|---|---|
| `GET_city_district_id_interior.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_iap_catalogue.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_me.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_me_iap_balance.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_me_iap_entitlements.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_ui_tutorial-state.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `PATCH_me_settings.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `PATCH_ui_tutorial-opt-out.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `PATCH_ui_tutorial.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `POST_me_iap_items_purchase.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |

- **Manquent** : `PUT /v1/me/meta-market/visibility` et `POST /v1/auth/signout` n'ont pas de corps ; `_index-⑲.json` est antérieur au branchement.
- Un corps **PÉRIMÉ** se REPREND sur le compte du run, dans la fenêtre du créneau (`passe-synchrone.py`, RECAPTURE §2.5) ; tant qu'il ne l'est
  pas, les VALEURS qui en dépendent vont en « non vérifié » — la forme se juge.

## Captures en jeu — À POSER AU CRÉNEAU

- Protocole : `RECAPTURE-2026-09-22.md` §2 (conteneur recréé, horodatage de l'image lu pendant le run, un run = une paire, exportée sous
  `MAFIA_CAPTURE_*` SEULEMENT — `MAFIA_DEMO_*` posé = faute —, sha256 + preuve d'identité jointe). Captures prises sur le cumul
  (`mafia-builder-city-clean`, aujourd'hui `fc3033ec`) ; leur SHA s'écrit ici.
- Paire T / T+1 s si une animation est en cause (doctrine : aucune animation, sauf ce que ce dossier assume).

## Échelle et doctrine

- Référence ×3,6 (300 CSS) ; capture 1080×2400 (contenu à 300 CSS, ×3,6). Aligner par PARTIES entre bandeau et dock ; les
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
