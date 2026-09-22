# RECAPTURE 2026-09-22 — le créneau qui tranche les 55 constats suspendus du 07/09

> INACHEVÉ : le témoin #109 de ㉟ (§4) n'est PAS rendu — fenêtre de gate back au moment de l'écriture (aucun rendu headless
> pendant un gate) ; il est inscrit dans `rendre-references-2026-09-22.py` et se rend en une commande après le gate. Tout le
> reste est écrit. Préparé par l'atelier (DA) ; **aucune capture n'a été lancée par l'atelier** — c'est le créneau du client ou
> du juge, avec la paire `MAFIA_CAPTURE_*` qui est chez l'user.

Source des 55 : `SUSPENSION-back-04-09-2026-09-07.md` — 45 constats marqués « dépend des données = oui » (section A) + 10 nommés
par f2 comme dépendant de l'image du 04-09 (section B ; 5 recoupent A). Ils sont SUSPENDUS, pas rétractés : ils attendent une
planche prise sur le conteneur recréé. Les verdicts (18 NON APPROUVÉ) tiennent ; la forme ne bouge pas.

## 1. Les 55, par écran — et la catégorie MafiaCI qui produit chaque planche

Mesuré dans `Assets/Tests` (attribut `[Category]` de la méthode qui écrit le fichier — pas la table par fichier de
`quelle-categorie-capture-quoi.py`, qui donne toutes les catégories d'un fichier à toutes ses méthodes) et dans les
`captures-provenance.md` des tours précédents (le fichier que chaque juge a réellement reçu).

| écran | dossier | constats suspendus (A / B) | planche(s) attendue(s) | catégorie | note |
|---|---|---|---|---|---|
| ⑮ Les inspections | `police` r1-⑮ | B2 M1 M4 / B1 | `planche_les_inspections_1080x2400.png` | `PhotoPlanche` | référence r1 = #31 (⑰) — corrigée ; `constats-a-rejuger-⑮.md` |
| ⑰ Le commissariat | `police` r1-⑰ | B3 m4 / B3 | `planche_le_commissariat_1080x2400.png` | `PhotoPlanche` | référence r1 = #32 (⑮) — corrigée ; `constats-a-rejuger-⑰.md` |
| ㉟ La vente | `vente` r1 | B2 M9 M11 m7 / B3 M11 | `planche_la_vente_1080x2400.png` · `la_vente_1080x2400.png` | `PhotoPlanche` · `PhotoVente` | ⚠️ la planche du r1 venait d'un ARBRE COMPOSITE (`journal-capture-composite-2026-09-07.md`) : reprendre sur `main` |
| ㉓ La vitrine | `compte` r1-㉓ | B3 / — | `planche_la_vitrine_1080x2400.png` · `la_vitrine_1080x2400.png` | `PhotoPlanche` · `PhotoVitrine` | |
| ㉜ Ce que vous avez confié | `ecran_delegation` r1 | M1 / — | `planche_ce_que_vous_avez_confie_1080x2400.png` | `PhotoPlanche` | |
| ㉝ Raser un site | `ecran_demolition` r1 | M2 M3 m2 m4 / M2 B1(compte) | `planche_raser_un_site_1080x2400.png` | `PhotoPlanche` | |
| ⑭ La semaine | `compression` r1 | B3 m4 / B3 | `planche_la_semaine_1080x2400.png` | `PhotoPlanche` | déjà reprise une fois le 07/09 (`journal-planche-la-semaine-2026-09-07.md`) — le modèle du protocole §2 |
| ㉚ La chaîne d'appro | `ecran_appro` r1 | M1 m10 m11 / — | `planche_la_chaine_d_appro_1080x2400.png` | `PhotoChantierC` | |
| ㉘ La distribution | `ecran_distribution` r1 | M5 m11 m12 / — | `planche_la_distribution_1080x2400.png` | `PhotoChantierC` | |
| ㉛ La loi | `ecran_loi` r1 | M3 M6 m4 m10 m11 / — | `planche_la_loi_1080x2400.png` | `PhotoChantierC` | |
| ㉙ Le conflit | `ecran_conflit` r1 | B1 B2 M9 m6 m7 m8 / — | `planche_le_conflit_1080x2400.png` | `PhotoChantierC` | |
| ㉞ Les ordres du soir | `carnet` r1 | m1 m2 / — | `screen_c3_sous_chrome_1080x2400.png` | `PhotoScreenC3SousChrome` | ⛔ le r1 a jugé `planche_signer_l_ordre_1080x2400.png`, qui est une fiche de LIEUTENANT (TABLE, 07/09) : la bonne planche est celle du chemin joueur Plus → LES ORDRES DU SOIR |
| ㊳ Le journal | `screen_c1` r1 | M12 / B1 M12 nv7 | `screen_c1_journal_sous_chrome_1080x2400.png` · `screen_c1_1080x{1920,2400}.png` | `CaptureJournal` · `PhotoScreenC1` | |
| ㊱ L'horizon | `screen_c6` r1 | B3 m6 / — | `screen_c6_horizon_etat-vide_sous_chrome_1080x2400.png` · `screen_c6_horizon_etat-vide_1080x2400.png` | `CaptureSousChrome` · `CaptureHorizon` | ⛔ `screen_c6_1080x{1920,2400}` (écran seul, ScreenC6C1) ne porte que la catégorie `Capture` nue — INTERDITE : NON FOURNI, dette à ouvrir (catégorie spécifique) |
| ① L'intérieur du district | `ecran-principal` r9 | M7 M8 M14 m4 m5 m11 / — | `screen_1_district_sous_chrome_1080x2400.png` · `screen_2a_fiche_sous_chrome_1080x{2400,1920}.png` | `CaptureDistrict` · `CaptureSousChrome` | la capture de district photographie `operational_demo` par le résolveur, pas le compte de capture (`journal-recapture-district-2026-09-07.md`) : à déclarer, pas à corriger ici |

Compte : 45 (A) + 10 (B) = 55 lignes, 50 constats distincts, 15 écrans, 14 dossiers.

### La valeur unique, vérifiée préfixe par préfixe

```
MAFIA_CI_CATEGORIES=PhotoPlanche,PhotoChantierC,PhotoScreenC3SousChrome,PhotoScreenC1,CaptureJournal,CaptureHorizon,CaptureSousChrome,CaptureDistrict,PhotoVente,PhotoVitrine
```

- `Filter.categoryNames` d'Unity matche par PRÉFIXE (`MafiaCI.cs:196-216`, liste séparée par des virgules). Chacune des dix a été passée
  à `Tools/lister-prefixes-de-categories.py` le 2026-09-22 : **aucune n'emporte une autre catégorie** (✓ ×10). Les pièges connus,
  évités : `Capture` nu (emporte 14 catégories, SIGSEGV Mesa), `PhotoScreenC3` (emporte `PhotoScreenC3SousChrome` — on demande la
  spécifique), `CaptureDetail` (a emporté un mutant une fois).
- ⛔ **jamais `Screenshot`** (TD-625 : ses 11 tests appellent `File.Delete` sur des planches commitées avant de capturer, et n'ont
  jamais tourné).
- Surplus déclaré : `CaptureSousChrome` produit aussi `screen_5_exceptions_*` (⑨) — non jugé ce tour ; `PhotoPlanche` produit les 8
  planches de sa suite (dont `planche_signer_l_ordre`, la fiche de lieutenant) — les planches d'écrans hors des 55 changent aussi et
  **ne se commitent pas** sans juge (règle du 07/09).
- Le run doit imprimer `catégories RÉELLEMENT exécutées = [...]` et `declares=N comptes=N` : un `declares=0` est un run VIDE
  (`mesurer-categorie.sh`), et un `passed=N` ne prouve pas qu'un fichier a bougé — **md5 de chaque planche AVANT et APRÈS**.
- Une commande par catégorie est plus sûre qu'une seule (le verdict est par catégorie) : `Tools/mesurer-categorie.sh <Cat>` pose
  `LOG_FILE` et `-executeMethod` en dur, et refuse le vide. En une commande : la valeur ci-dessus, `LOG_FILE` posé, et le log lu.

## 2. Le protocole de planche — tel que le juge l'exige (modèle : `journal-planche-la-semaine-2026-09-07.md`)

Chaque planche voyage avec l'état des DEUX côtés (conteneur back + arbre client) et l'identité photographiée. Dans l'ordre :

1. **Le conteneur est RECRÉÉ, pas rebâti.** Le 07/09, un rebuild ne suffisait pas : le conteneur tournait sur une image plus
   vieille que la dernière construite (« Up 2 days »). Preuve à écrire : `docker inspect -f '{{.Config.Image}} {{.Created}} {{.State.StartedAt}}' mafia-clean-city-game-back-1`
   AVANT et APRÈS la recréation ; et le contrôle positif sur le bundle servi (`GET /v1/i18n/bundle?locale=fr` : 674 → 886 messages le
   07/09). Aujourd'hui (22/09, avant tout geste) : image `mafia-clean-city-game-back` créée `2026-09-14T01:13:06Z`, démarrée
   `2026-09-17T07:39:45Z`, `server_build_ref` = `03cf564c` built `2026-09-14T01:12:31Z`. Si le cumul back est mergé avant le
   créneau, l'image doit être reconstruite ET le conteneur recréé (`docker compose … up -d --build --force-recreate game-back`,
   puis le même `docker inspect` : `Created` DOIT avoir changé).
2. **L'horodatage de l'image lu au journal PENDANT l'exécution.** Le client ne journalise pas `server_build_ref` ; c'est le shell
   du créneau qui le lit et l'écrit dans le journal de campagne, trois fois : avant le lancement, PENDANT que Unity tourne
   (`curl -s http://localhost/v1/world/districts | jq .response_meta.server_build_ref` + le `docker inspect` ci-dessus), et après.
   Les trois valeurs doivent être identiques : une recréation pendant le run rendrait des planches de deux mondes.
3. **L'empreinte à DEUX propriétés, AVANT et APRÈS** (le compte photographié, jamais un autre — le journal du run dit lequel) :
   - la STRUCTURE : `python3 Tools/juge-visuel/empreinte-compte.py <player_id>` (horloge `game_minute`, lieutenants nombre ET noms,
     bâtiments, planques, cartes) ;
   - le DERNIER TICK DÉRIVÉ : `friction_budget_state.last_evaluated_tick` du joueur (lecture SQL, ou `GET /v1/friction/state` qui le
     sert depuis `03cf564c` sous `last_evaluated_tick`). « Gelé » est une propriété du COUPLE (structure, dernier tick dérivé) :
     un compte dont 17 bâtiments sur 20 sont postérieurs à son dernier tick n'est pas gelé même si l'empreinte ne bouge pas.
   - Écart entre avant et après ⇒ la campagne a MUTÉ le monde ⇒ planches et corps ne décrivent plus le même compte : à dire, à
     refaire. `passe-synchrone.py` fait la même chose pour les corps ; ici c'est pour les planches.
4. **`MAFIA_CAPTURE_EXPECT_PLAYER=<player_id>` posée** avec la paire `MAFIA_CAPTURE_IDENTIFIER` / `MAFIA_CAPTURE_PASSWORD`
   (et `MAFIA_DEMO_*` retirées par `env -u`, sinon un repli silencieux photographie `operational_demo`). Sans la variable, la
   garde IMPRIME « NON ARMÉE » et la planche ne prétend rien sur son compte ; avec, elle ROUGIT si le portefeuille signé n'est
   pas celui attendu (`VuePrincipaleCapturePlayModeTests.cs:2165-2181`). La ligne `[DemoIdentityResolver] régime=… identité=…` du
   journal du run est la preuve d'identité — **une par suite**, jamais recopiée d'un message.
5. **Dans chaque dossier r2** : les planches en COPIE (jamais en lien — `verifier-captures-dossier.py` rougit sur un lien), leur
   `sha256`, le dernier commit du PNG, l'arbre de rendu (SHA imprimé au run, sinon « non imprimé »), et la ligne d'identité du
   journal, dans `captures-provenance.md` ; le journal du run joint (`journal-declare.txt` cesse de dire « non fourni »).
6. **L'arbre client** : `main` du jour (ou la branche nommée), SHA écrit — une planche prise sur un arbre en retard accuse le
   travail qu'il ne contient pas (㉟ le 07/09).

## 3. Les dossiers r2 à instruire

Préparés par `Tools/juge-visuel/preparer-r2-2026-09-22.py` sur le gabarit du skill (`dossier-gabarit.md`), captures « NON FOURNI » :
chacun porte la table de SES constats suspendus (lue dans le document de suspension), ses références (nominal + nommées, en liens vers
les PNG commités), la commande et le nom de fichier attendus, l'échelle, les polices `fc-match` du jour, le format imposé, et le renvoi
vers `constats-a-rejuger*.md` quand il existe.

| dossier | tour | référence(s) | suspendus | renvoi |
|---|---|---|---|---|
| `police/r2-⑮-2026-09-22` | écrit à la main (forme de référence) | #32 + états 31/33/34/35 | 4 | `constats-a-rejuger-⑮.md` (11/18 à reprendre) |
| `police/r2-⑰-2026-09-22` | généré | #31 | 3 | `constats-a-rejuger-⑰.md` (7/16 à reprendre) |
| `vente/r2-2026-09-22` | généré | #107 | 6 | `constats-a-rejuger.md` (0 — témoin #109 manquant, §4) |
| `compte/r2-㉓-2026-09-22` · `ecran_delegation/r2` · `ecran_demolition/r2` · `compression/r2` · `ecran_appro/r2` · `ecran_distribution/r2` · `ecran_loi/r2` · `ecran_conflit/r2` · `carnet/r2` · `screen_c1/r2` · `screen_c6/r2` · `ecran-principal/r10` | générés | nominal + nommées | 1 à 6 | — |

Au top du client : poser les captures, remplir la table des écarts ASSUMÉS depuis le `juge-donnees` mode maquette de l'écran, puis
lancer le juge sur le répertoire (§3 du skill). ㊲ n'est pas dans les 55 mais sa référence #120 a changé de TEXTE le 22/09 : à écrire
dans le mandat de son prochain tour.

## 4. Le témoin #109 de ㉟ — à rendre après le gate

Le juge r1 de ㉟ l'a demandé (« Ramasser — nulle part où la porter », le cadre d'état homologue de la capture, non rendu ce tour-là).
Inscrit dans `rendre-references-2026-09-22.py` (`vente/reference-ramasser-1080x2102.png`, index apparié à son étiquette) et dans les
`extras` de la TABLE. **Non rendu au moment d'écrire** (gate back en cours) : `python3 Tools/juge-visuel/rendre-references-2026-09-22.py`
dès que la machine est libre, puis `construire-dossiers.py --sans-rendu` et commit.
