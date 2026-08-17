# W3.U2 / C9 — Les 5 bindings lumineux — notes d'implémentation

Design : `docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md` (repo `mafia-w3u2`), chunk C9
(§3, lignes 1504-1517), livrable **U-10**. Design APPROVED après 7 revues ⊥ — exécuté tel quel, aucune
décision de conception rouverte ici.

⛔⛔ **MODE LÉGER** (ruling contrôleur, reconduit sur ce chunk) : aucun run Unity (batchmode compris),
aucune stack Docker, aucun `Tools/run-unity-check.sh` n'a été exécuté pour ce chunk. Tout ce qui suit
est une mesure **statique** (lecture de fichiers, oracles Python indépendants reproduisant fidèlement
la logique C#) — jamais une exécution PlayMode.

## Identification des 5 bindings — mesurée, pas devinée

Le design nomme les 5 bindings deux fois : §1.5 (« Les 5 bindings lumineux : chaîne complète, écrivains
COMPTÉS ») et dans les commentaires du token `.cs` lui-même (`DesignTokens.cs:145-159`, "District
Night"). Les DEUX sources concordent, et c'est ce qui a permis de trancher un point ambigu : le champ
`shell_state` (STANDING|GONE) N'EST PAS un des 5 bindings — il est **invariant en production**
aujourd'hui (`district-interior.projection.service.ts:164-173` : `operational`/`damaged`/`seized`
retombent TOUS sur `STANDING`, seul `demolished` — déjà filtré par la route — donne `GONE`), et §1.5
ligne 2 dit explicitement que la colonne du raid/saisie est `building_operational_state.structural_state`
(`condition_band`), jamais `buildings.structural_state` (`shell_state`).

| # | §1.5 | champ DTO qui le pilote | token / mécanisme |
|---|---|---|---|
| 1 | fenêtres ambre = possédé | présence de l'entrée dans `buildings[]` | `nightWindowLit`, gardé aussi par le binding 2 |
| 2 | fenêtres éteintes = raid/saisie | `condition_band` (`SOUND` vs `DAMAGED\|REPAIRING\|FAILED`) | éteint `nightWindowLit` |
| 3 | néon = ça rapporte | `revenue_chain` (présence de l'enseigne) + `revenue_band` (allumée ou sombre) | `nightNeonGlow`, règle à 3 états de D3 |
| 4 | fumée = op active | `activity_band` (`ACTIVE`) | `nightSmoke` |
| 5 | enseigne qui grésille = maintenance en retard | `lapse_phase_bucket` (`!= WITHIN_WINDOW`) + `maintenance_in_progress` | `accentWarning` (REUSE, pas de token de nuit dédié) |

## Ce qui a été livré

- **U-10 — les 5 bindings lumineux** (`Assets/Scripts/CityMap/DistrictInteriorScreenController.cs`,
  étendu — C8 avait livré grille/socle/sprite/label/sol, aucune lumière). `BuildBuildingCell` appelle
  désormais 4 méthodes neuves, chacune gardée par SA (ou ses) bande(s), jamais un objet ajouté puis
  caché :
  - `BuildWindowLight` — bindings 1+2. Ajoute `WindowLight` (couleur `nightWindowLit`) **seulement si**
    `condition_band == "SOUND"`. Binding 1 (« possédé ») n'a pas de champ propre au sens d'une bande :
    c'est la PRÉSENCE de l'entrée dans `buildings[]` qui le porte (déjà garantie par l'appelant —
    `BuildBuildingCell` n'est jamais invoquée pour un bloc vide).
  - `BuildRevenueSign` — binding 3. Implémente la règle à 3 états EXACTE de D3 : pas d'enseigne du
    tout si `revenue_chain == "UNWIRED"` ; enseigne présente mais sombre (`Color.Lerp` entre
    `nightNeonGlow` et `nightBase`, REUSE du patron déjà établi par `FloorTint` en C8) si `WIRED` +
    `IDLE` ; néon allumé (`nightNeonGlow` pur) si `WIRED` + `EARNING`. Seul ce dernier état incrémente
    `RenderedNeonGlowCount` — une enseigne sombre n'émet aucune lumière.
  - `BuildActivitySmoke` — binding 4. Ajoute `ActivitySmoke` (`nightSmoke`, `raycastTarget=false`)
    seulement si `activity_band == "ACTIVE"`.
  - `BuildMaintenanceFlicker` — binding 5. Ajoute `MaintenanceFlicker` (`accentWarning`) seulement si
    `lapse_phase_bucket != "WITHIN_WINDOW"` **et** `!maintenance_in_progress` — voir § Deviations pour
    la justification du mécanisme (non prescrit par le design au-delà du nom des 2 champs).
  - 4 compteurs de test neufs : `RenderedWindowLightCount`, `RenderedNeonGlowCount`,
    `RenderedSmokeCount`, `RenderedMaintenanceFlickerCount` — réinitialisés à chaque `Render()`, comme
    `RenderedCellCount`/`RenderedBuildingCount` (C8).
- **Tests** (`Assets/Tests/PlayMode/DistrictInteriorLightingPlayModeTests.cs`, `[Category("W3U2")]`) :
  5 `[UnityTest]` couvrant C9-F1 (+ son complément sur `maintenance_in_progress`), C9-F2, C9-F3.
- **R2.3** : zéro nouveau champ `DesignTokens` — les 5 bindings consomment exclusivement des tokens
  déjà `.asset`-backed (4 tokens de nuit posés par C5 + `accentWarning`, un token de base pré-existant).
  Aucune parité neuve à vérifier pour `DesignTokensParityPlayModeTests.cs`.

## Falsifiables — statut

| # | quoi | statut |
|---|---|---|
| C9-F1 | chaque lumière suit sa donnée, dans les DEUX polarités, unité = le binding | ÉCRITE, différée (+ complément `maintenance_in_progress`) |
| C9-F2 | aucune lumière décorative — source rendue == fait reçu, appariés par `building_id` | ÉCRITE, différée |
| C9-F3 | le J0 n'allume rien de faux (néon/fumée à zéro) **avec** garde de capacité | ÉCRITE, différée |

## Evidence statique (obtenue SANS Unity — oracles indépendants)

pwd = `/home/erutheone/project/mafia-builder-city-clean`

### Balance syntaxique — scanner string/commentaire-aware (REUSE du scanner de C7/C8)

```
$ python3 -c "... scanner qui suit l'état chaîne/char/commentaire ..."
Assets/Scripts/CityMap/DistrictInteriorScreenController.cs        -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
Assets/Tests/PlayMode/DistrictInteriorLightingPlayModeTests.cs    -> parens 0/0 min 0 | braces 0/0 min 0 -> OK
```
**Aucun compilateur C# réel n'a tourné** — ce contrôle prouve l'absence d'un déséquilibre structurel
grossier, pas l'absence de toute faute de syntaxe fine ni de faute sémantique — voir § RUNS DIFFÉRÉS.

### C7-F3 non régressée — re-balayage `.SignIn(` après extension du fichier

```
$ python3 -c "... os.walk('Assets/Scripts'), count('.SignIn(') ..."
total .cs files under Assets/Scripts: 50
.SignIn( hits: 8   (INCHANGÉ — mêmes 8 fichiers que la mesure de C8)
diorama contains .SignIn(: False
```
L'extension du fichier pour C9 (4 méthodes de rendu, 4 compteurs) n'a introduit AUCUN appel signin —
C7-F3 reste vraie sur le fichier étendu.

### Unicité des symboles neufs

```
$ grep -rn "\bRenderedWindowLightCount\b|RenderedNeonGlowCount|RenderedSmokeCount|RenderedMaintenanceFlickerCount" Assets/Scripts Assets/Tests
```
Chacun des 4 compteurs : hits confinés à `DistrictInteriorScreenController.cs` (déclaration + reset +
usage interne) et `DistrictInteriorLightingPlayModeTests.cs` (lecture) — aucun homonyme ailleurs.
`BuildWindowLight`/`BuildRevenueSign`/`BuildActivitySmoke`/`BuildMaintenanceFlicker` : 2 hits chacun
(déclaration + site d'appel), tous les deux dans `DistrictInteriorScreenController.cs` — pas de
doublon.

### Tokens `DesignTokens` consommés — vérifiés existants verbatim, pas de faute de frappe

```
$ grep -c "public Color nightWindowLit;" DesignTokens.cs -> 1
$ grep -c "public Color nightNeonGlow;"  DesignTokens.cs -> 1
$ grep -c "public Color nightSmoke;"     DesignTokens.cs -> 1
$ grep -c "public Color nightBase;"      DesignTokens.cs -> 1
$ grep -c "public Color accentWarning;"  DesignTokens.cs -> 1
```
Les 5 tokens que C9 lit existent, avec exactement ces noms — aucun n'est neuf (0 champ `DesignTokens`
ajouté par ce chunk, R2.3 trivialement respecté).

### Domaines de chaînes des tests — cross-vérifiés contre le DTO réel (C7), pas recopiés de mémoire

```
$ grep -n "STANDING | GONE|SOUND | DAMAGED|IDLE | EARNING|WIRED | UNWIRED|IDLE | ACTIVE|WITHIN_WINDOW | SOFT" CityProjectionDtos.cs
95: shell_state    // STANDING | GONE
96: condition_band // SOUND | DAMAGED | REPAIRING | FAILED
97: revenue_band   // IDLE | EARNING
98: revenue_chain  // WIRED | UNWIRED
99: activity_band  // IDLE | ACTIVE
100: lapse_phase_bucket // WITHIN_WINDOW | SOFT | HARD | CRITICAL — binding 5
```
Les valeurs de chaîne utilisées par `MakeBuilding(...)` dans le test (`"SOUND"`, `"DAMAGED"`,
`"WIRED"`, `"EARNING"`, `"ACTIVE"`, `"WITHIN_WINDOW"`, `"SOFT"`, `"CRITICAL"`) sont toutes des membres
réels de ces 5 domaines.

### GUID du `.meta` neuf — vérifié sans collision

```
$ python3 -c "import uuid; print(uuid.uuid4().hex, len(uuid.uuid4().hex))"
f3541f41332e4aaebee25dbca503056d 32
$ git grep -l f3541f41332e4aaebee25dbca503056d ; echo "exit=$?"
exit=1   (aucun hit — pas de collision, mesuré AVANT création du .meta)
```

## RUNS DIFFÉRÉS (à la fenêtre de runs groupée du contrôleur)

1. **Compilation Unity réelle** — aucune erreur de compilation n'a pu être confirmée par le
   compilateur réel ; vérifiée seulement par relecture manuelle ligne à ligne + le scanner syntaxique
   ci-dessus. Risque résiduel identique à celui déjà consigné en C5-C8.
2. **Les 5 `[UnityTest]` de ce chunk, vus par un run réel** — aucun n'a été exécuté. C9-F1/C9-F1bis/
   C9-F2 sont **offline** (aucun appel HTTP — `Render()` prend un DTO fabriqué directement), donc leur
   dépendance stack est nulle. **C9-F3 seule** dépend d'un compte FRAIS (`AuthClient.SignUp` +
   `session/open`) contre `http://localhost` (Traefik @ le dépôt `mafia-w3u2`, branche `lot/w3.u2`) —
   jamais vérifié cette session, même risque que C8-F2/F4/F3/F5.
3. **Le juge lui-même** — `LOG_FILE=... ./Tools/run-unity-check.sh -executeMethod
   MafiaCI.RunPlayModeTests`. Attendu : `passed >= <baseline C8> + 5` — 5 `[UnityTest]` neufs
   (`C9F1_...`, `C9F1Bis_...`, `C9F2_...`, `C9F3_...`), `failed == 0`.
4. **Le rendu visuel** — ni la couleur exacte des lumières, ni leur position sur le sprite, ni leur
   lisibilité à l'échelle du placeholder n'ont pu être VUS (mode léger). Question d'É3 pour le rendu
   FINAL (§4-4 du design, même statut que C8) ; le mécanisme lui-même (quelle bande commande quelle
   lumière, et le compte) est ce que les 5 tests prouvent sans avoir besoin de voir un pixel.
5. **Le `.meta` neuf** — écrit à la main, forme minimale 2 lignes, suivant le format des `.meta`
   voisins de C5-C8 (vérifiés octet à octet dans ces chunks). GUID généré par `uuid.uuid4().hex`,
   vérifié sans collision (ci-dessus). Unity doit confirmer l'import à la fenêtre.
6. **C3-F5/C3-F7/C3-F8 (back)** — le design consigne déjà, non mesuré, le coût d'amener réellement un
   bâtiment à `EARNING`/`DAMAGED`/`ACTIVE` par le chemin de production (§4 points 2 et 6). C9-F1/F2 ne
   redémontrent PAS cette propriété — ils prouvent que l'ÉCRAN réagit à un champ, pas que le back sait
   produire les 2 polarités en production (le design le dit lui-même pour ce précédent exact, C8-F5).

## Deviations

### (a) Le mécanisme du binding 5 (`lapse_phase_bucket` + `maintenance_in_progress`) — non prescrit par le design

**Quoi** : §1.5 ligne 5 et le DTO (D2/C7) groupent `lapse_phase_bucket` ET `maintenance_in_progress`
sous « binding 5 », mais aucune décision D1-D9 ni aucune falsifiable C9-F* ne précise COMMENT les deux
champs se combinent pour piloter le grésillement (contrairement au binding 3, où D3 donne la règle à 3
états verbatim).

**Pourquoi c'est un imprévu non bloquant** : test du socle appliqué — aucune falsifiable de ce chunk ne
dépend d'un mécanisme précis au-delà de « `lapse_phase_bucket != WITHIN_WINDOW` commande une lumière
de retard ». Le champ `maintenance_in_progress` existe déjà sur le DTO depuis C7 (parsé, jamais
consommé) ; le laisser inerte aurait laissé un champ sans consommateur — la classe de défaut que le
socle documente comme se faisant retirer au premier nettoyage.

**Option retenue** : un état binaire (grésille / ne grésille pas), qui consomme les DEUX champs sans
inventer un 3ᵉ palier visuel (aucun token ne le porterait) : le grésillement s'allume quand la phase
est en retard ET qu'aucune réparation n'est en cours ; il s'éteint dès qu'une réparation démarre, même
si la phase n'a pas encore rattrapé son retard. C'est l'option qui change le moins de surface (un seul
`Image`, une seule condition composée) tout en donnant à `maintenance_in_progress` un effet RÉEL,
vérifié par `C9F1Bis_MaintenanceInProgress_SuppressesTheFlickerEvenWhenOverdue`.

**Alternative rejetée** : un 3ᵉ état visuel « en cours de réparation, sombre » symétrique à la règle du
binding 3 — rejetée parce qu'aucun token n'existe pour le porter (C5 n'a posé que 4 tokens de nuit,
aucun dédié au binding 5) et qu'aucune falsifiable ne le réclame ; l'inventer aurait élargi la surface
R2.3 sans bénéfice mesurable pour ce chunk, exactement le raisonnement que C8 § Deviations (b) avait
déjà tenu pour le sol.

### (b) Binding 1 sans champ de bande propre — la présence de l'entrée EST le fait

**Quoi** : contrairement aux bindings 2-5, le binding 1 (« possédé ») n'a pas de champ `xxx_band` qui
lui soit propre dans le DTO. §1.5 ligne 1 le confirme : la donnée qui le porte est « `buildings`
(ligne existante) », pas une bande dérivée.

**Pourquoi ce n'est pas un conflit** : la prémisse (§2) et §1.5 sont cohérentes sur ce point — le
joueur ne reçoit QUE ses propres bâtiments (`buildings[]` scopé par `player_id`, aucune ligne
`ownership != 'player'` n'existe en base aujourd'hui, D2). La présence d'une entrée est donc le fait
complet, sans ambiguïté sur son mécanisme — rien à trancher, contrairement à (a).

**Conséquence pour C9-F1** : le test de la polarité du binding 1 compare un payload PORTANT
l'entrée à un payload NE LA PORTANT PAS (deux `Render()` sur des DTOs différents), plutôt que de faire
varier un champ scalaire sur la MÊME entrée — c'est la forme correcte pour ce binding précis, écrite
comme telle dans le test.

### (c) `implementation-notes.md` — REUSE de la pratique déjà établie en C5-C8

Comme en C5-C8 : `implementation-notes.md` n'existe pas comme fichier suivi dans ce dépôt. Les
déviations sont consignées ici **et** dans le message de commit correspondant.

Aucun conflit avec le canon rencontré — les 2 points ci-dessus sont des choix d'implémentation
matériels (mécanisme non prescrit par le design), jamais des désaccords avec la spec.
