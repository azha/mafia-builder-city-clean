# Dossier du juge visuel — ⑦ Fiche du lieutenant — la mécanique — r1-⑦ — 2026-09-23

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent** (elles se posent au créneau, dès que l'user pose `capture.env`).
> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` (atelier / DA) le 2026-09-23, après la nuit du 22 au 23/09 : la fiche autour des données servies, l'ordre permanent émis par l'éditeur de ⑧.
> Tout ce qui manque est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Fiche du lieutenant — la mécanique (⑦) — contrôleur `LieutenantScreenController` — dossier `famille`
- **Travaillé cette nuit** : la fiche autour des données servies, l'ordre permanent émis par l'éditeur de ⑧
- **Planche attendue** (table de `construire-dossiers.py`) : `famille_1080x2400.png`

## Référence (fait autorité : l'IMAGE) — taille et facteur MESURÉS sur le fichier

| fichier (dans ce dossier) | état montré | statut | taille px | facteur | largeur CSS ↔ px |
|---|---|---|---|---|---|
| `cadre-0-1080x2102.png` (lien vers `famille/maquette-7-2026-09-23/cadre-0-1080x2102.png`) | la fiche nominale : Au repos, à l'écoute, aucun ordre | **MAQUETTE À RATIFIER, jamais une référence** (Tools/atelier-2026-09-22/26 ; `7d00782d`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-1-1080x2102.png` (lien vers `famille/maquette-7-2026-09-23/cadre-1-1080x2102.png`) | le signal dérive : trois gestes, quatre repères | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-2-1080x2102.png` (lien vers `famille/maquette-7-2026-09-23/cadre-2-1080x2102.png`) | l'ordre expire bientôt : « En faire la règle ? » | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-3-1080x2102.png` (lien vers `famille/maquette-7-2026-09-23/cadre-3-1080x2102.png`) | « Donner un ordre » : l'éditeur de ⑧ en mode ordre permanent (`7d00782d`) | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |

- L'ancienne image `lieutenant/ecran-canon.png` (25/08) est PÉRIMÉE : chapeau et formulaire à 3 verbes ; front.md l.1402 la dit « à re-ratifier ». Les dossiers `famille/r1…r4` jugent ⑥ (l'organigramme), pas ⑦.
- ⛔ Une **maquette à ratifier** n'est PAS une référence ratifiée : un écart entre la capture et elle se classe **ARBITRAGE** (à ratifier),
  jamais BLOQUANT contre le client — sauf s'il contredit une donnée servie ou une décision du registre.
- Polices : références rendues en **DejaVu** depuis le 23/09 (point 18) ; le client embarque DejaVu : un écart de famille se compare.
  Un canon de série 2 (900×1752, ×3) date d'avant : Noto / Liberation, apostrophe droite — retards du canon.

## Écarts ASSUMÉS — déjà tranchés : à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

| ce qu'on voit | pourquoi (source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| PAS de formulaire à trois verbes (Collecte, Blanchir, Surveiller), pas de Cible | non servable : aucune action DSL, pas de déclencheur, pas de cible (`compiler.service.ts:66` du back ; `aa2cd03b` ; Tools/atelier-2026-09-22/41) | un bouton qui promet ces verbes |
| pas de glissière de durée : « pour une durée fixe » | `duration_class` ignoré en M2 (Tools/atelier-2026-09-22/41 ; Tools/atelier-2026-09-22/42 tsv) | une durée chiffrée |
| l'émission passe par l'éditeur de ⑧ (une règle `famille.regle.*`) et « Signer l'ordre » | Tools/atelier-2026-09-22/41 ; « Signer l'ordre » ratifié (série 1, Tools/atelier-2026-09-22/42 tsv) | — |
| « Et quand il expire » et ses 3 `lapse_action` (choix obligatoire) | sinon 422 (Tools/atelier-2026-09-22/41) | — |
| disparus : loyauté 82 %, 3/8, 8/12, probation, préfère / rejette, veto, « Sal », « Relever de ses fonctions » | aucune donnée ou aucune route (Tools/atelier-2026-09-22/26 ; Tools/atelier-2026-09-22/12) | — |
| non dessinés : `trust_budget_bucket`, `flag_frequency_band` (déjà sur ⑯), `cue_bands` | Tools/atelier-2026-09-22/26 | — |
| les bandes d'autonomie en MOTS seuls, sans jauge | R2.2 et D11 | `[####]` affiché |
| capuche, bordure laiton | décision du 02/09 (Tools/atelier-2026-09-22/12) | — |
| « Depuis peu » (FRESH), pas « nouveau venu » | D13 | — |
| dock du canon, ronds vides, Famille active ; la barre en « Plein jour » | point 15 ; D16 | — |

## Ce que tu ne dois PAS noter (tentant, mais ce n'est pas un défaut du client)

| tentation | pourquoi |
|---|---|
| la règle « dans mon bâtiment → suspendre les opérations » | exemple de règle servie (Tools/atelier-2026-09-22/41) |
| les trois catégories d'autonomie Épuisé / Normal / Plein | exemple : le corps réel n'a que `PRODUCTION_OPS: depleted` (point 19) |
| le chrome d'exemple, le « C » de CHALEUR rogné | point 19 ; hérité (`7d00782d`) |
| le « il » des questions (« Il écoute autre chose… ») | question posée à l'user (Tools/atelier-2026-09-22/26), pas un défaut ; « Et quand il expire » : « il » = l'ordre |
| « CUISINIER · EXÉCUTANT · DÉLÉGUÉ » sous le nom | mots genrés déjà sur la liste de l'user pour ⑦ (D14) |
| le point or sur Famille ; les soulignés en pointillé | sens ouvert (ARBITRAGE) ; mot proposé |

## OUVERT — non tranché : à classer ARBITRAGE, jamais défaut

| point | source |
|---|---|
| la forme, les mots proposés, le « il » | à ratifier (Tools/atelier-2026-09-22/26 ; Tools/atelier-2026-09-22/41) |
| le fond de ville pour toute la série 1, ou aucun | Tools/atelier-2026-09-22/12 |
| afficher `cue_bands` à côté des repères | recommandé (Tools/atelier-2026-09-22/41) |
| cadre 3 : un grand vide entre les choix et « Signer l'ordre » | rien ne le classe ; à comparer au constat M9 « vide terminal » de ㉙ |

## Connu, ni assumé ni ouvert

- ⑦ n'a PAS de ligne propre dans l'INDEX : c'est une section de ⑥ (même contrôleur) — sa maquette y est désormais citée
- aucune route `standing-order` ni `signal-drift` n'est appelée par le client (0 appel au cumul) : l'émission n'est pas encore câblée

## Données servies attendues

- **Routes** : `GET /v1/lieutenants/:id` (`drift_phase`, `standing_order`, bandes) ; à câbler : `POST …/standing-order`, `…/standing-order/decision`, `…/signal-drift/decision`
- **Corps réels** (`famille/corps-reels/`, provenance lue dans chaque fichier ; comptes masqués, aucune valeur d'identifiant ici) :

| fichier | date | back servi | nature | fraîcheur (`verifier-fraicheur-corps.py` contre `main` du back `30360c8d`) |
|---|---|---|---|---|
| `GET_autonomy-reports.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (operational/lieutenant/autonomy/autonomy-reports.projection.ts, operational/lieutenant/autonomy/autonomy-reports.service.ts) |
| `GET_city_district_id_interior.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_lieutenants.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `GET_lieutenants_id.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `GET_progression.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (progression/progression.projection.service.ts) |
| `POST_auth_signin.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `POST_auth_signup.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |
| `POST_autonomy-reports_reportId_issues_issueId_resolve.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/lieutenant/autonomy/autonomy-reports.projection.ts, operational/lieutenant/autonomy/autonomy-reports.service.ts) |
| `POST_lieutenants.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `POST_lieutenants_lieutenantId_autonomy_decision.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `POST_lieutenants_lieutenantId_behavior-script.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `POST_lieutenants_lieutenantId_behavior-script_validate.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `POST_lieutenants_lieutenantId_reassign.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |

- **Manquent** : aucun corps pour les routes `standing-order` et `signal-drift` (non appelées).
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
