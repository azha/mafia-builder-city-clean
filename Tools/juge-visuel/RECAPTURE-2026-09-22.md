# RECAPTURE 2026-09-22 — le créneau qui tranche les 55 constats suspendus du 07/09

> Préparé par l'atelier (DA). **Aucune capture n'a été lancée par l'atelier** — c'est le créneau du client ou du juge, avec la
> paire du compte de capture, qui est chez l'user (§2.4). Les références sont toutes rendues (témoin #109 compris, §4).

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
| ㊱ L'horizon | `screen_c6` r1 | B3 m6 / — | `screen_c6_horizon_etat-vide_sous_chrome_1080x2400.png` · `screen_c6_horizon_etat-vide_1080x2400.png` | `CaptureSousChrome` · `CaptureHorizon` | depuis `55e674db`, les deux signent avec la paire du RUN. ⚠️ Les deux assertent « 0 carte » (état vide) : c'est une propriété du compte du run — décision et repli au §2.5. `screen_c6_1080x{1920,2400}` (ScreenC6C1) : planche SANS donnée (écran monté sans jeton ni chargement), inutile pour B3/m6 — hors créneau (§5a) |
| ① L'intérieur du district | `ecran-principal` r9 | M7 M8 M14 m4 m5 m11 / — | `screen_1_district_sous_chrome_1080x2400.png` · `screen_2a_fiche_sous_chrome_1080x{2400,1920}.png` | `CaptureDistrict` · `CaptureSousChrome` | le district signe par le résolveur du client, qui lit `MAFIA_DEMO_*` (§2.4) : le 07/09, lancé avec `MAFIA_CAPTURE_*` seule, il a photographié `operational_demo` (`journal-recapture-district-2026-09-07.md`) |

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
- `CaptureHorizon` reste dans la valeur : depuis `55e674db` elle signe avec la paire du run comme les neuf autres (« un run = une paire ») ; sa comparaison et sa garde sont re-basées sur ce compte (§2.5). Le témoin d'identité `CaptureFiliere` (§2.4) n'est PAS dans la valeur : c'est une option.
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
4. **L'identité — mis à jour après `55e674db` (client, 2026-09-22) : une règle, une garde sur l'effet.**
   - Le résolveur du client prend désormais la paire de CAPTURE (`MAFIA_CAPTURE_*`) si elle est complète, avant `MAFIA_DEMO_*`
     (`DemoIdentityResolver.cs:33-42` à `55e674db`) ; les trois sites qui signaient en dur passent par la même règle. **Un run = une
     paire** : toute catégorie de capture photographie le compte que le run exporte.
   - La garde sur l'EFFET, `CaptureSousShell.IdentiteConnecteeOuEchoue`, lit `GET /v1/me` avec le jeton réellement utilisé et compare
     son email/handle à l'identité annoncée ; elle imprime `[IDENTITE-CONNECTEE] … CONFORME` et refuse d'écrire la planche sinon. Sites
     mesurés à `55e674db` : l'aide de planche `CapturerLocataire` (donc `PhotoPlanche` et `PhotoChantierC`), `CaptureHorizon`
     (`HorizonScreenPlayModeTests.cs:146`), et deux captures hors créneau (`CaptureFiche`, `CaptureExceptions`).
   - **Preuve d'identité par catégorie** : `[IDENTITE-CONNECTEE] … CONFORME` pour `PhotoPlanche`, `PhotoChantierC`, `CaptureHorizon` ;
     pour les sept autres (`PhotoScreenC3SousChrome`, `PhotoScreenC1`, `CaptureJournal`, `CaptureSousChrome`, `CaptureDistrict`,
     `PhotoVente`, `PhotoVitrine`), qui n'appellent pas cette garde, la ligne `[DemoIdentityResolver] régime=… identité=…` du journal
     joint. `[IDENTITE-CAPTURE] … signera avec « X »` n'est une preuve nulle part : elle dit ce que contient l'environnement.
   - **La paire n'existe QUE sous `MAFIA_CAPTURE_*`** (décision du 2026-09-22, mesurée par le client) : `~/.config/mafia/capture.env`
     porte deux exports, `MAFIA_CAPTURE_IDENTIFIER` et `MAFIA_CAPTURE_PASSWORD`. ⛔ **`MAFIA_DEMO_*` posé = faute** : exportée sur le compte
     de capture, une suite fonctionnelle lancée dans le même shell (les suites de lieutenants effacent et recrutent sur le compte
     connecté) ferait muter le compte gelé. Contrôle de présence : les deux `MAFIA_CAPTURE_*` posées ET les deux `MAFIA_DEMO_*` absentes
     (MANDAT §2, commande sans valeur affichée).
   - Le capteur de corps réels suit : `capturer-corps-reels.py` résout le mot de passe du `--compte` par PAIRE — `MAFIA_CAPTURE_PASSWORD`
     d'abord, `MAFIA_DEMO_PASSWORD` en repli, chacune seulement si l'identifiant de sa paire est absent ou égal au compte — et imprime le
     NOM de la variable retenue, jamais la valeur (`resoudre_mot_de_passe`, 7 cas testés au 22/09, dont deux refus). `passe-synchrone.py`
     annonce cette variable avant la passe, et **refuse de lancer si une `MAFIA_DEMO_*` est posée** (sortie 2, rien mesuré).
   - `MAFIA_CAPTURE_EXPECT_PLAYER` n'arme toujours qu'une capture (`CaptureFiliere`, comparaison du `player_id` servi) : option de
     témoin, hors de la valeur de §1.
5. **Dans chaque dossier r2** : les planches en COPIE (jamais en lien — `verifier-captures-dossier.py` rougit sur un lien), leur
   `sha256`, le dernier commit du PNG, l'arbre de rendu (SHA imprimé au run, sinon « non imprimé »), et la ligne d'identité du
   journal, dans `captures-provenance.md` ; le journal du run joint (`journal-declare.txt` cesse de dire « non fourni »).
6. **L'arbre client** : `main` du jour (ou la branche nommée), SHA écrit — une planche prise sur un arbre en retard accuse le
   travail qu'il ne contient pas (㉟ le 07/09).

### 2.5 Un run = une paire — à quel compte chaque comparaison se fait (tranché le 2026-09-22, après `55e674db`)

**Le critère** : un juge compare une VALEUR de planche aux corps réels du dossier ; les deux doivent décrire le même compte, au même
moment. **Mesuré** : les 229 corps réels de l'arbre ont été pris le 22/09 sur **`operational_demo`** (pile `03cf564c`) ; depuis
`55e674db`, les planches des dix catégories sont prises sur **le compte du run**.

| catégorie | dossiers (corps réels comparés) | corps réels aujourd'hui | planche après `55e674db` | garde qui dépend du compte |
|---|---|---|---|---|
| `PhotoPlanche` | `police` (⑮ ⑰), `vente`, `compte` (㉓), `ecran_delegation`, `ecran_demolition`, `compression` | `operational_demo`, 22/09 | compte du run | ⑰ : le compte riche sature les précincts (6/6 HUNTING) — lecture, pas garde |
| `PhotoChantierC` | `ecran_appro`, `ecran_distribution`, `ecran_loi`, `ecran_conflit` | `operational_demo`, 22/09 | compte du run | — |
| `PhotoScreenC3SousChrome` | `carnet` | `operational_demo`, 22/09 | compte du run | — |
| `PhotoScreenC1`, `CaptureJournal` | `screen_c1` | `operational_demo`, 22/09 | compte du run | — |
| `CaptureSousChrome`, `CaptureHorizon` | `screen_c6` | `operational_demo`, 22/09 — **0 carte** servie (`screen_c6/corps-reels/GET_meta_horizon-feed.json`) | compte du run | **« 0 carte »** (les deux captures ㊱) : rouge si le compte du run sert une carte |
| `CaptureDistrict`, `CaptureSousChrome` (fiche) | `ecran-principal` | `operational_demo`, 22/09 | compte du run | — |
| `PhotoVente` | `vente` | `operational_demo`, 22/09 | compte du run | — |
| `PhotoVitrine` | `compte` (㉓) | `operational_demo`, 22/09 | compte du run | — |

**Décision : `CaptureHorizon` reste dans le run unique ; sa comparaison et sa garde sont re-basées sur le compte du run — comme les neuf
autres.** Les corps réels des quatorze dossiers sont **repris dans la même fenêtre, sur le compte du run**, par
`python3 Tools/juge-visuel/passe-synchrone.py --compte <email du run> --player-id <player_id>` (empreinte → corps → empreinte ; le mot de
passe vient de `MAFIA_CAPTURE_PASSWORD`, jamais de la ligne de commande — `--motdepasse` resterait visible dans la liste des processus). Le `player_id` se lit sans ouvrir de session :
`docker compose -p mafia-clean-city exec -T pg psql -U mafia -d mafia_clean_city -tAc "SELECT player_id FROM player WHERE email='<email du run>';"`
(requête validée le 22/09 sur `operational_demo` → `01a01f34…`).

**Pourquoi pas un second run `operational_demo` pour ㊱ seul** : il ne dispenserait pas de la passe de corps. Les corps du 22/09 ne
sont pas synchrones d'une planche prise un autre jour (l'horloge du compte avance, le seeder le regarnit) — `passe-synchrone.py`
existe pour ça. Le second run ajouterait une porte Unity (~13 min d'éditeur partagé, mesure citée dans
`PlancheEcransCapturePlayModeTests.cs:44-46`), une seconde paire exportée, une seconde empreinte, sans rien gagner en comparabilité.

**Le repli, écrit d'avance** : si le compte du run sert au moins une carte d'horizon, les deux captures ㊱ rougissent PAR CONSTRUCTION
(la garde « 0 carte » refuse d'appeler « état vide » un écran qui en montre) et ㊱ n'est pas recapturable sur ce compte. Alors, et
seulement alors : un second run `MAFIA_CI_CATEGORIES=CaptureSousChrome,CaptureHorizon` avec la paire `operational_demo` (0 carte le
22/09, à re-mesurer), une empreinte et une passe de corps `screen_c6` sur ce compte. Coût : une porte (~13 min) et un journal de plus.
Le rouge n'est pas un échec du créneau : c'est la garde qui dit que l'état demandé n'existe pas sur ce compte.

## 3. Les dossiers r2 à instruire

Préparés par `Tools/juge-visuel/preparer-r2-2026-09-22.py` sur le gabarit du skill (`dossier-gabarit.md`), captures « NON FOURNI » :
chacun porte la table de SES constats suspendus (lue dans le document de suspension), ses références (nominal + nommées, en liens vers
les PNG commités), la commande et le nom de fichier attendus, l'échelle, les polices `fc-match` du jour, le format imposé, et le renvoi
vers `constats-a-rejuger*.md` quand il existe.

| dossier | tour | référence(s) | suspendus | renvoi |
|---|---|---|---|---|
| `police/r2-⑮-2026-09-22` | écrit à la main (forme de référence) | #32 + états 31/33/34/35 | 4 | `constats-a-rejuger-⑮.md` (11/18 à reprendre) |
| `police/r2-⑰-2026-09-22` | généré | #31 | 3 | `constats-a-rejuger-⑰.md` (7/16 à reprendre) |
| `vente/r2-2026-09-22` | généré | #107 + témoin #109 (rendu après le gate, §4) | 6 | `constats-a-rejuger.md` (0 à rejuger) |
| `compte/r2-㉓-2026-09-22` · `ecran_delegation/r2` · `ecran_demolition/r2` · `compression/r2` · `ecran_appro/r2` · `ecran_distribution/r2` · `ecran_loi/r2` · `ecran_conflit/r2` · `carnet/r2` · `screen_c1/r2` · `screen_c6/r2` · `ecran-principal/r10` | générés | nominal + nommées | 1 à 6 | — |

**Deux écrans DÉJÀ jugés sont à rejuger après la recapture, et ils n'ont pas de dossier** — compté par l'atelier sur le `front.md` de
l'arbre back (39 sections d'écran, motif `[x] **jugé…**`, 2 trouvés ; le client en comptait 2 aussi, `443489ec`) :
- **⑥ La Famille** — APPROUVÉ au r3 (06/09), réécrit depuis par `f1bcd5d3` (dialogue de réaffectation) et `a3404347` (cadenas des
  primitives). Sa référence NE change pas (organigramme de `ecrans-brennar.html` + `famille/ecran-canon.png`) : le tour vérifie le
  TEXTE sur une capture fraîche, il ne re-mesure pas la maquette.
- **㊲ Le miroir** — APPROUVÉ **SOUS RÉSERVE** au r8 (la nuance compte), et sa référence #120 a été RE-RENDUE le 22/09 (texte changé).
⇒ Un verdict rendu avant une réécriture ne couvre pas le texte réécrit. MANDAT §5-bis porte les deux lignes pour le juge.

Au top du client : poser les captures, remplir la table des écarts ASSUMÉS depuis le `juge-donnees` mode maquette de l'écran, puis
lancer le juge sur le répertoire (§3 du skill).

## 4. Le témoin #109 de ㉟ — rendu après le gate

Le juge r1 de ㉟ l'avait demandé (« Ramasser — nulle part où la porter », le cadre d'état homologue de sa capture, non rendu ce
tour-là). **Rendu le 2026-09-22 à 16:22**, gate fini (0 conteneur `mcc-e2e`), porte Unity libre, aucun run batchmode :
`python3 Tools/juge-visuel/rendre-references-2026-09-22.py --seul 109` — étiquette appariée à l'index (« Ramasser — nulle part où la
porter » ✅), fenêtre plus grande que le contenu et assertion anti-crop (« non rogné » contre 300×585 CSS à ×3,6), sortie relue à
**1080×2102**, 40 % de pixels non noirs, atelier `20d006d`. Fichier : `vente/reference-ramasser-1080x2102.png`, dans les `extras` de la
TABLE, donc dans l'INDEX et lié dans `vente/r2-2026-09-22/`.
⚠️ Son texte dit « Il n'existe aujourd'hui aucun moyen d'en obtenir une » (une planque) : c'est PÉRIMÉ — la planque est donnée à
l'arrivée depuis le 31/08 (㊵·142). La description de la référence le dit au juge : maquette en retard, jamais le texte attendu à l'écran.

## 5. Dettes mesurées pendant la préparation — sans id (numérotées par l'orchestrateur au merge)

**(a) `screen_c6` — ce que j'avais écrit était faux, et la dette réelle est ailleurs.** La version précédente de ce document disait
« `ScreenC6C1` ne porte que la catégorie `Capture` nue ⇒ non capturable ». Mesuré le 2026-09-22 : la classe
`HorizonScreenPlayModeTests` porte `[Category("ScreenC6")]` (`Assets/Tests/PlayMode/HorizonScreenPlayModeTests.cs:23`), que NUnit
applique à ses six tests — `ScreenC6C1` est donc atteignable par `ScreenC6` (dans le filtre par défaut de `MafiaCI`, n'emporte aucune
autre catégorie, aucun appel de mutation dans la fixture). L'erreur venait de mon relevé, qui ne lisait que les attributs de MÉTHODE.
Ce qui reste, et qui est la dette :
1. `ScreenC6C1_CapturerPourLeJugeVisuel_DeuxResolutions` (`:107-114`) monte l'écran **sans jeton et sans `Charger()`** : ses planches
   `screen_c6_1080x{1920,2400}.png` montrent un écran SANS donnée servie. Elles ne peuvent trancher aucun constat qui dépend des
   données (㊱ B3, m6) — et rien dans leur nom ne le dit. Le juge r1 les a reçues comme « écran seul » à côté de l'état vide réel.
2. ~~`ScreenC6C2` signe en dur sur le compte de démo~~ — **FERMÉ par `55e674db`** : la capture passe par la règle du résolveur et
   par la garde d'effet (`HorizonScreenPlayModeTests.cs:146`) ; de même `CaptureFiche` (`VuePrincipaleCapturePlayModeTests.cs:879`) et
   `CaptureExceptions` (`:1012`).
3. `ScreenC6C1` n'a **aucune catégorie propre** (seulement `Capture`, interdite, et la catégorie de classe) : on ne peut pas la lancer
   seule. Même forme : `ScreenB7C1` (`ForensicScreenPlayModeTests.cs:107`) et `B3C1` (`ReputationScreenPlayModeTests.cs:889`).
⇒ Pour le créneau : ㊱ se recapture par `CaptureSousChrome` et `CaptureHorizon`, sur le compte du run (§2.5) ; `ScreenC6` n'est PAS dans la valeur.

**(b) ~~L'aide de planche jette l'identité qu'elle vérifie~~ — FERMÉ par `55e674db`.** `CapturerLocataire` garde maintenant l'identité
annoncée et la confronte au compte connecté (`IdentiteConnecteeOuEchoue`, `GET /v1/me`). Reste ouvert, et c'est écrit au §2.4 : sept
catégories du créneau n'appellent pas cette garde ; leur preuve est `[DemoIdentityResolver]`.

**(c) La valeur `MAFIA_CAPTURE_EXPECT_PLAYER` ne garde qu'une capture sur quinze** (`CaptureSousShell.cs:42`, déjà écrit par son auteur) —
aucune des 55 n'est couverte par une garde de VALEUR. Rappel, pas une dette neuve.

