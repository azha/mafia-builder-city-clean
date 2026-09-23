# Dossier du juge visuel — ㉙ Le conflit — r3 — 2026-09-23

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent** (elles se posent au créneau, dès que l'user pose `capture.env`).
> Généré par `Tools/juge-visuel/preparer-dossiers-2026-09-23.py` (atelier / DA) le 2026-09-23, après la nuit du 22 au 23/09 : les mots (table 40), le geste vers un AXE, les erreurs du POST (addendum 40).
> Tout ce qui manque est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Le conflit (㉙) — contrôleur `ConflitScreenController` — dossier `ecran_conflit`
- **Travaillé cette nuit** : les mots (table 40), le geste vers un AXE, les erreurs du POST (addendum 40)
- **Planche attendue** (table de `construire-dossiers.py`) : `planche_le_conflit_1080x2400.png`

## Référence (fait autorité : l'IMAGE) — taille et facteur MESURÉS sur le fichier

| fichier (dans ce dossier) | état montré | statut | taille px | facteur | largeur CSS ↔ px |
|---|---|---|---|---|---|
| `reference-1080x2102.png` (lien vers `ecran_conflit/reference-1080x2102.png`) | série 6 cadre 59, nominal : « Le premier coup — on n'a jamais croisé personne » | **MAQUETTE À RATIFIER** — ㉙ n'est PAS ratifiée (décision f2 du 23/09 : front.md l.22 ne la liste pas, l.1328 « ratification user ✗ ») | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `reference-manque-1080x2102.png` (lien vers `ecran_conflit/reference-manque-1080x2102.png`) | série 6 cadre 64 : « Ce qu'on ne peut pas faire » | **MAQUETTE À RATIFIER** (idem) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |

- Cadres 60-63 : source seule (le septième coup, deux choses ne collent pas, en cours, rentré) ; 65-66 = la v1, REMPLACÉE. Les deux PNG sont re-rendus en DejaVu et « Plein jour » (`e20fe648`, `cb86e772`, `c833d204`). `ecran_conflit/dossier.md` (à la racine) est un gabarit non rempli : ce dossier-ci et `r2-2026-09-22` font foi.
- ⛔ Une **maquette à ratifier** n'est PAS une référence ratifiée : un écart entre la capture et elle se classe **ARBITRAGE** (à ratifier),
  jamais BLOQUANT contre le client — sauf s'il contredit une donnée servie ou une décision du registre.
- Polices : références rendues en **DejaVu** depuis le 23/09 (point 18) ; le client embarque DejaVu : un écart de famille se compare.
  Un canon de série 2 (900×1752, ×3) date d'avant : Noto / Liberation, apostrophe droite — retards du canon.

## Écarts ASSUMÉS — déjà tranchés : à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

| ce qu'on voit | pourquoi (source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| le geste vise un AXE, pas un bâtiment : « On envoie {nom} chez {famille}, sur {axe}. », 5 mots `conflit.axe.*` | `target_holding_id` est un des 5 axes (`engagements.controller.ts:166-183` du back ; `997d6ab4`) ; la référence qui nomme un entrepôt est une dette de maquette (Tools/atelier-2026-09-22/40 tsv) | un bâtiment nommé comme cible |
| « autre cible », pas « autre bâtiment » | Tools/atelier-2026-09-22/40 tsv | — |
| pas d'aperçu du butin avant l'envoi | aucune donnée ne le sert (Tools/atelier-2026-09-22/40 tsv) | — |
| pas de panneau des manques en texte servi (cadre 64) | Tools/atelier-2026-09-22/40 tsv (classé en note) | — |
| médaillons à initiale C / T / G / S avec le nom de la famille | D11 : le nom accompagne (Tools/atelier-2026-09-22/40 tsv) | une initiale seule |
| « Les quatre familles de Brennar », « Dites-moi seulement chez qui… » | D14 (Tools/atelier-2026-09-22/40 tsv) | — |
| « L'envoyer ce soir » actif seulement quand famille, homme et axe sont choisis ; aucune annulation | Tools/atelier-2026-09-22/40 tsv | — |
| le refus « deux choses ne collent pas » (aucun gros bras) | le compte de démo n'a aucun MUSCLE (corps `GET_lieutenants.json`) | — |
| pas d'heure de départ (« il est parti ») | `created_at_minute` absent exprès (front.md ㉙) | — |
| les erreurs du POST dites en mots : 409 (clé servie `error.engagements.muscle_lieutenant_required`, RATIFIÉE et gardée par le back `f82a140b`), 404 et 422 en un mot chacun, l'échec réseau | Tools/atelier-2026-09-22/40-addendum-engagements (`24897b48`) | un code affiché |

## Ce que tu ne dois PAS noter (tentant, mais ce n'est pas un défaut du client)

| tentation | pourquoi |
|---|---|
| la ponctuation haute du servi | D17 |
| « Lt. Kest », la famille visée, le chrome | exemples (point 19) |
| le « C » de CHALEUR rogné | hérité (`7d00782d`) |
| les cadres 65-66 | la v1, remplacée |
| « demain matin » | prose, pas une phase (D16 ne s'applique pas) |
| pas de dock sur la référence | la série 6 n'en dessine pas ; le chrome se juge contre le canon du HUD (dossier r2) |

## OUVERT — non tranché : à classer ARBITRAGE, jamais défaut

| point | source |
|---|---|
| la maquette ㉙ elle-même (cadres 59-66) : à ratifier ; ses mots genrés ont reçu des formes ÉPICÈNES (D13, table 40 v3 `df041316`) — un mot genré à l'écran est un écart, pas un mot ratifié | décision f2 du 23/09 |
| la valeur du 409 : RATIFIÉE (`ERROR_TEXT_RATIFIED`), gardée telle quelle (f2 ; addendum v3 `df041316`) — à juger comme ratifiée | Tools/atelier-2026-09-22/40-addendum |
| « Coup n°{n} » : dérivé de la liste (table 40) ou `strike_index` (client) | Tools/atelier-2026-09-22/40 tsv ; `ConflitDtos.cs` |
| le mot « réseau » ne tient que si le client réémet la même `Idempotency-Key` | Tools/atelier-2026-09-22/40-addendum |
| un glyphe coupé au bord haut-droit des deux références (x≈1065, y≈37 px) | observé à l'image, sans source — à constater, pas à imputer au client |

## Connu, ni assumé ni ouvert

- constats SUSPENDUS du 07/09 à trancher sur une planche neuve : B1, B2, M9, m6, m7, m8 (dossier r2)

## Données servies attendues

- **Routes** : `/v1/lieutenants`, `GET` et `POST /v1/me/engagements`
- **Corps réels** (`ecran_conflit/corps-reels/`, provenance lue dans chaque fichier ; comptes masqués, aucune valeur d'identifiant ici) :

| fichier | date | back servi | nature | fraîcheur (`verifier-fraicheur-corps.py` contre `main` du back `e76f6ffa`) |
|---|---|---|---|---|
| `GET_city_district_id_interior.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `GET_lieutenants.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | **PÉRIMÉ** (operational/lieutenant/lieutenant.repository.ts) |
| `GET_me_engagements.json` | 2026-09-22T13:23:16 | `03cf564c` | réponse réelle | opposable |
| `POST_me_engagements.json` | 2026-09-22T13:23:16 | `03cf564c` | mutation, pas de corps | opposable |

- **Manquent** : `POST_me_engagements` : mutation non appelée ; pas encore servis au moment des corps : `target_axis_i18n`, `lieutenant`, `strike_index`.
- Un corps **PÉRIMÉ** se REPREND sur le compte du run, dans la fenêtre du créneau (`passe-synchrone.py`, RECAPTURE §2.5) ; tant qu'il ne l'est
  pas, les VALEURS qui en dépendent vont en « non vérifié » — la forme se juge.

## Captures en jeu — À POSER AU CRÉNEAU

- Protocole : `RECAPTURE-2026-09-22.md` §2 (conteneur recréé, horodatage de l'image lu pendant le run, un run = une paire, exportée sous
  `MAFIA_CAPTURE_*` SEULEMENT — `MAFIA_DEMO_*` posé = faute —, sha256 + preuve d'identité jointe). Captures prises sur le cumul
  (`mafia-builder-city-clean`, aujourd'hui `c3d0df4b`) ; leur SHA s'écrit ici.
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

Préparé sur le client `df041316` (branche `da/2026-09-22`), cumul `c3d0df4b`, back `e76f6ffa`, atelier `ffb6f67`.
