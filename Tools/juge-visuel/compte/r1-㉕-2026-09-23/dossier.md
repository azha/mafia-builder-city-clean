# Dossier du juge visuel — ㉕ La première fois — r1-㉕ — 2026-09-23

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent** (elles se posent au créneau, dès que l'user pose `capture.env`).
> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` (atelier / DA) le 2026-09-23, après la nuit du 22 au 23/09 : la maquette autour des données servies (ordre lu au back, 4 cadres).
> Tout ce qui manque est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La première fois (㉕) — contrôleur `TutorialScreenController` — dossier `compte`
- **Travaillé cette nuit** : la maquette autour des données servies (ordre lu au back, 4 cadres)
- **Planche attendue** (table de `construire-dossiers.py`) : `planche_la_premiere_fois_1080x2400.png`

## Référence (fait autorité : l'IMAGE) — taille et facteur MESURÉS sur le fichier

| fichier (dans ce dossier) | état montré | statut | taille px | facteur | largeur CSS ↔ px |
|---|---|---|---|---|---|
| `tutoriel-canon.png` (lien vers `compte/tutoriel-canon.png`) | série 2 cadre 31 « la première carte » : une bulle, un seul geste « COMPRIS » | RATIFIÉE par délégation le 02/09 (front.md l.22, l.1803) | 900×1752 | ×3,0 | 300 CSS = 900 px |
| `tutoriel-vide.png` (lien vers `compte/tutoriel-vide.png`) | série 2 cadre 32 « rien à montrer » | RATIFIÉE par délégation (idem) | 900×1752 | ×3,0 | 300 CSS = 900 px |
| `cadre-0-1080x2102.png` (lien vers `compte/maquette-25-2026-09-23/cadre-0-1080x2102.png`) | 1ʳᵉ session, bulle sur la carte pré-semée | **MAQUETTE À RATIFIER** (`ad616c56`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-1-1080x2102.png` (lien vers `compte/maquette-25-2026-09-23/cadre-1-1080x2102.png`) | 1ʳᵉ session, file vidée (`queue_runs_dry`) | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-2-1080x2102.png` (lien vers `compte/maquette-25-2026-09-23/cadre-2-1080x2102.png`) | 2ᵉ session, page « la première fois » sous Plus | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `cadre-3-1080x2102.png` (lien vers `compte/maquette-25-2026-09-23/cadre-3-1080x2102.png`) | le refus (bascule éteinte) | **MAQUETTE À RATIFIER** | 1080×2102 | ×3,6 | 300 CSS = 1080 px |

- Les canons de série 2 font 900×1752 à ×3 (polices Noto, apostrophe droite : retards du canon, point 18 et D10).
- ⛔ Une **maquette à ratifier** n'est PAS une référence ratifiée : un écart entre la capture et elle se classe **ARBITRAGE** (à ratifier),
  jamais BLOQUANT contre le client — sauf s'il contredit une donnée servie ou une décision du registre.
- Polices : références rendues en **DejaVu** depuis le 23/09 (point 18) ; le client embarque DejaVu : un écart de famille se compare.
  Un canon de série 2 (900×1752, ×3) date d'avant : Noto / Liberation, apostrophe droite — retards du canon.

## Écarts ASSUMÉS — déjà tranchés : à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

| ce qu'on voit | pourquoi (source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| « Compris » à la place de « J'AI COMPRIS » | D14 : série 2 cadre 31 (Tools/atelier-2026-09-22/33 ; Tools/atelier-2026-09-22/36 tsv) | un autre geste que « Compris » écrit `shown_tutorial_ids` |
| la bascule « On vous explique encore » à la place des boutons de refus | D14 : mots de la porte 95-96 (Tools/atelier-2026-09-22/33 ; Tools/atelier-2026-09-22/36 tsv) | la bascule suit la clé brute |
| le TEXTE servi du tutoriel, jamais son identifiant | Tools/atelier-2026-09-22/33 (11 textes servis) | un identifiant ou « pas encore écrit » à l'écran |
| « Rien de nouveau pour aujourd'hui. » quand `next_tutorial_id` est null et `eligible` non vide ; « Vous avez tout vu. » seulement si `eligible` est vide | Tools/atelier-2026-09-22/33 §4 ; Tools/atelier-2026-09-22/36 tsv (mot proposé) ; D18 | « tout vu » avec `eligible` non vide |
| l'ordre des tutoriels est celui que sert le back (au plus un par session de jeu) | Tools/atelier-2026-09-22/33 §1 (`disclosure-schedule.service.ts:72-85`) | un ordre calculé par le client |

## Ce que tu ne dois PAS noter (tentant, mais ce n'est pas un défaut du client)

| tentation | pourquoi |
|---|---|
| les soulignés en pointillé | annotation DA « proposé, non ratifié » (`generer-maquette-25-2026-09-23.py`) |
| le soulignement ondulé rouge sous « Lt. Hara » | annotation DA d'un heurt du servi (le nom en dur est remonté à l'user, Tools/atelier-2026-09-22/52 §1.2) |
| « : plus de solvant » en début de ligne, « décision : la ville » | D17 : défaut du SERVI, montré tel quel |
| des apostrophes droites dans des valeurs `tutorial.*` | D10 : écart du SERVI, pas du client |
| « 02 vues · 01 à venir » contre le compte réel | valeurs d'illustration (Tools/atelier-2026-09-22/33) |
| dock (ronds vides), « C » de CHALEUR rogné, « Plein jour », « Tiède » | point 15 ; `7d00782d` ; D16 ; point 11 |

## OUVERT — non tranché : à classer ARBITRAGE, jamais défaut

| point | source |
|---|---|
| la forme : bulle sur la ville (cadres 0-1) contre page sous Plus seulement (client) | Tools/atelier-2026-09-22/33 §7.1 |
| le second geste « Ne plus rien me montrer » (proposé ; la série 2 n'a qu'un geste) | Tools/atelier-2026-09-22/33 §7.2 |
| les mots proposés : « la première fois », « vues · à venir », « à découvrir », la phrase du refus | Tools/atelier-2026-09-22/33 §6 ; Tools/atelier-2026-09-22/36 tsv |
| « Lt. Hara » en dur dans le tutoriel de la 1ʳᵉ carte (paramètre `{lieutenant}` signalé) | Tools/atelier-2026-09-22/33 §5.1 ; Tools/atelier-2026-09-22/52 §1.2 |
| la bulle répète la carte : servir la phrase de la série 2 ? | Tools/atelier-2026-09-22/33 §7.3 |
| les 7 clés `tutoriel.ecran.*` pas encore servies | Tools/atelier-2026-09-22/36 tsv |

## Connu, ni assumé ni ouvert

- ⛔ le commit de CLIENT-2 qui refait ㉕ (`049a863e`) est sur `mafia-unity-F`, PAS dans le cumul (le cumul dit encore « J'AI COMPRIS ») : **une capture n'est jugeable qu'après sa fusion.**

## Données servies attendues

- **Routes** : `GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial` (seul écrivain de `shown_tutorial_ids`), `PATCH /v1/ui/tutorial-opt-out` ; `POST /v1/session/open` (bloc `onboarding`, non dessiné)
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

- **Manquent** : les PATCH sont des mutations sans corps.
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
