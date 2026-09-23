# Dossier du juge visuel — ④ Accueil — r1 — 2026-09-23

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent** (elles se posent au créneau, dès que l'user pose `capture.env`).
> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` (atelier / DA) le 2026-09-23, après la nuit du 22 au 23/09 : la carte de tête en forme honnête, la file sous pression, l'entrée du rapport.
> Tout ce qui manque est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Accueil (④) — contrôleur `DashboardController` — dossier `accueil`
- **Travaillé cette nuit** : la carte de tête en forme honnête, la file sous pression, l'entrée du rapport
- **Planche attendue** (table de `construire-dossiers.py`) : `planche_l_accueil_1080x2400.png`

## Référence (fait autorité : l'IMAGE) — taille et facteur MESURÉS sur le fichier

| fichier (dans ce dossier) | état montré | statut | taille px | facteur | largeur CSS ↔ px |
|---|---|---|---|---|---|
| `cadre-0-1080x2102.png` (lien vers `accueil/maquette-2026-09-23/cadre-0-1080x2102.png`) | rien à trancher | **MAQUETTE À RATIFIER, jamais une référence** (`7d00782d`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-1-1080x2102.png` (lien vers `accueil/maquette-2026-09-23/cadre-1-1080x2102.png`) | la carte de tête, forme honnête (re-rendue `7d00782d`) | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-2-1080x2102.png` (lien vers `accueil/maquette-2026-09-23/cadre-2-1080x2102.png`) | des rapports à lire | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-3-1080x2102.png` (lien vers `accueil/maquette-2026-09-23/cadre-3-1080x2102.png`) | la file sous pression (« saturée ») | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |

- Aucune référence RATIFIÉE : ④ n'avait aucune maquette avant le 23/09 (front.md l.1609). Source : `ecrans-brennar-accueil.html`, 4 cadres.
- ⛔ Une **maquette à ratifier** n'est PAS une référence ratifiée : un écart entre la capture et elle se classe **ARBITRAGE** (à ratifier),
  jamais BLOQUANT contre le client — sauf s'il contredit une donnée servie ou une décision du registre.
- Polices : références rendues en **DejaVu** depuis le 23/09 (point 18) ; le client embarque DejaVu : un écart de famille se compare.
  Un canon de série 2 (900×1752, ×3) date d'avant : Noto / Liberation, apostrophe droite — retards du canon.

## Écarts ASSUMÉS — déjà tranchés : à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

| ce qu'on voit | pourquoi (source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| les options servies (`hl.option.*`) écrites en TEXTE sous « Ce qu'on peut faire » ; deux boutons « Prendre acte » (commit) et « Pas maintenant » (skip) | les options sont DESCRIPTIVES, commit / skip sont les seules actions (`hl-card-types.ts:99-104` du back ; `a0ff6cba` ; Tools/atelier-2026-09-22/45 tsv) | une option sur un bouton, ou présentée comme recommandée |
| pas de « Conseil : » | aucun champ servi ne marque une recommandation (Tools/atelier-2026-09-22/generer-45-carte-de-tete.py) | idem |
| « prendre acte n'agit pas à votre place » | Tools/atelier-2026-09-22/45 tsv | — |
| la file : « Plusieurs attendent encore » SANS nombre ; « d'autres attendent au-delà de ce que la file montre » | le back ne sert que des bandes (`queue_pressure_band`, `backlog_badge`) ; `9513b05b` | un nombre affiché |
| 3 états et l'entrée du rapport, pas plus | périmètre validé par f2 (Tools/atelier-2026-09-22/25 §2.1) | — |
| formes honnêtes : `flag_review`, `settling_glance`, `friction_glance.penalty_active`, `onboarding`, `priority_band`, `confidence_band` servis mais NON dessinés | Tools/atelier-2026-09-22/25 (questions posées à l'user) | — |
| aucun mot ni bouton de sortie (on sort en touchant la ville) | front.md §4 B ; Tools/atelier-2026-09-22/25 | — |
| la carte des rapports annonce un rapport OUVERT, une fois par session | D5 | — |
| bandes en mots (« modérée », « faible », « grave »), la barre en « Plein jour », dock du canon | R2.2 ; D1 ; D16 ; point 15 | un chiffre, « Matin », une icône |

## Ce que tu ne dois PAS noter (tentant, mais ce n'est pas un défaut du client)

| tentation | pourquoi |
|---|---|
| « 24 850 € », « Tiède / CHALEUR », « JOUR 12 » | chrome d'exemple (point 19 ; `cb86e772`) |
| le « C » de CHALEUR rogné | hérité (`7d00782d`) |
| au cadre 1, la carte « Un local à remettre en état » | exemple (point 19) — la carte servie au compte de démo est `AUTONOMY_REPORTS_PENDING`, c'est le cadre 2 |
| les soulignés en pointillé | mot proposé (convention de maquette) |
| le point or sur Famille | sens ouvert (Tools/atelier-2026-09-22/22 §7.3) : ARBITRAGE |
| une apostrophe droite dans « Laisser en l'état » | D10 : écart du SERVI, pas du client |

## OUVERT — non tranché : à classer ARBITRAGE, jamais défaut

| point | source |
|---|---|
| cadre 2 : « Lire maintenant » / « Laisser en attente » dessinés en BOUTONS (options `hl.option.autonomy_reports.*`) | la table 45 n'a corrigé que le cadre 1 |
| l'état « Limite de structure atteinte » (CapBlocked) non dessiné, en tension avec D18 | `HighestLeverageCardController.cs:227` |
| le geste de commit (appui long, confirmation tapée) non dessiné | `HighestLeverageCardController.cs:155-170` |
| le commentaire client « RECOMMANDATION (options[0]) » contraire à la table 45 | `HighestLeverageCardController.cs:65-66` |
| les 6 questions pour l'user | Tools/atelier-2026-09-22/25 §2.1 |

## Connu, ni assumé ni ouvert

- DÉFAUT CONNU (pas un écart assumé) : `event_descriptor` brut affiché (`ExceptionQueuePanelController.cs:161-163` ; `77b5c85e`), confié au client

## Données servies attendues

- **Routes** : `/v1/economy/wallet`, `/v1/me` ; la carte : `POST /v1/session/open` (`hl_card`), `POST /v1/session/hl-card/:id/commit` et `/skip`
- **Corps réels** (`accueil/corps-reels/`, provenance lue dans chaque fichier ; comptes masqués, aucune valeur d'identifiant ici) :

| fichier | date | back servi | nature | fraîcheur (`verifier-fraicheur-corps.py` contre `main` du back `30360c8d`) |
|---|---|---|---|---|
| `GET_autonomy-reports.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (operational/lieutenant/autonomy/autonomy-reports.projection.ts, operational/lieutenant/autonomy/autonomy-reports.service.ts) |
| `GET_city_district_id_heat.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_city_district_id_interior.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_economy_wallet.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_exceptions_queue.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (exceptions/exceptions.module.ts, exceptions/exceptions.projection.service.ts, exceptions/exceptions.service.ts) |
| `GET_lieutenants_id.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `GET_me.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_progression.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (progression/progression.projection.service.ts) |
| `GET_world_districts.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `POST_auth_signin.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `POST_auth_signup.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `POST_autonomy-reports_reportId_issues_issueId_resolve.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/lieutenant/autonomy/autonomy-reports.projection.ts, operational/lieutenant/autonomy/autonomy-reports.service.ts) |
| `POST_exceptions_exceptionId_resolve.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (exceptions/exceptions.module.ts, exceptions/exceptions.projection.service.ts, exceptions/exceptions.service.ts) |
| `POST_lieutenants_lieutenantId_autonomy_decision.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `POST_session_open.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (session/session.module.ts, session/session.repository.ts, session/session.service.ts) |

- **Manquent** : commit / skip sans corps (mutations) ; au back d'aujourd'hui, `session/open` sert `opened_game_minute` et `day_phase`, absents du corps.
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
