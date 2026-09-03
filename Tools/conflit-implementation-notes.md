# ecran_conflit « Le conflit » (㉙) — « la table du fond », v2 lisible — notes d'implémentation, 2026-09-03

Régime de la semaine : PAS de suite complète, PAS de revue ⊥, PAS de gate. Preuve exigée :
compilation 0 erreur avec contrôles positifs (`Tools/verifier-compilation-sans-unity.sh` +
`Tools/verifier-references-asmdef.py`, chacun avec `--controle-positif`). **L'éditeur Unity n'a
PAS été lancé** (consigne du brief) : rien de ce qui suit n'a été vérifié visuellement en Play
Mode ni jugé par `juge-visuel`/`juge-données`. Aucun des 12 tests écrits n'a couru.

## Fichiers touchés

- `Assets/Scripts/Operational/Conflit/ConflitScreenController.cs` (neuf, 723 lignes) — métier
  complet : §1/§2 la table des 4 familles + vendetta groupée côté client, §3 le pied (lieutenant
  MUSCLE ou impossibilité déclarée), `ConflitResolvers` (bas de fichier).
- `Assets/Scripts/Operational/Conflit/ConflitClient.cs` (neuf, 104 lignes) — 3 routes : `GET
  /v1/me/engagements`, `GET /v1/lieutenants` (ajoutée, absente du brief — seule route qui porte
  `archetype`), `POST /v1/me/engagements`.
- `Assets/Scripts/Operational/Conflit/ConflitDtos.cs` (neuf, 75 lignes) — `GetEngagementsResponseDto`/
  `EngagementDto`/`PostEngagementsBody`/`PostEngagementsResponseDto`. **NE DÉCLARE PAS** de DTO
  `GET /v1/lieutenants` — voir § Deviations, point 1.
- `Assets/Tests/PlayMode/ConflitScreenPlayModeTests.cs` (neuf, 339 lignes) — plancher structurel,
  capture RETIRÉE (voir § 2 du fichier), UN test de PARCOURS réel (signup frais → `Charger()` →
  assertion sur les deux routes réelles), 3 tests d'ÉTAT (`RendrePourTest`), 4 tests de résolveur
  (2 positifs, 2 négatifs).
- `Assets/Scripts/Shell/AppShell.cs` — UNE ligne ajoutée dans `DestinationsPlus()` (+4/-0) :
  `("LE CONFLIT", () => MountTenant<ConflitScreenController>()), // ㉙`. Le bloc `case Tab.More:`
  imprimé par le générateur n'a PAS été collé (consigne explicite du brief — périmé depuis le
  chantier joignabilité du 2026-09-02, `Tab.More` ouvre un menu, pas un écran direct).
- `Assets/Editor/MafiaCI.cs` — `EcranConflit` ajoutée à `Categories` (une seule entrée — PAS de
  `PhotoEcranConflit`, le test de capture ayant été supprimé avant d'exister dans ce lot, patron
  `EcranAppro`/`EcranDistribution`/`EcranLoi` la veille, TD-490).
- `Tools/juge-visuel/ecran_conflit/dossier.md` — généré par `nouvel-ecran.py`, NON rempli (aucune
  capture prise cette passe, éditeur non lancé).
- Ce fichier (`Tools/conflit-implementation-notes.md`).

## m-63 à m-66 — ce qu'ils montrent, et lesquels sont ㉙

Les QUATRE sont dans `Tools/juge-visuel/v6/`, ouverts un par un (image réelle, pas de lecture de
nom de fichier) :

| cadre | ce qu'il montre | ㉙ ? |
|---|---|---|
| m-63 | « Ce qui est rentré » — historique : Bruno Calvetti chez Tarcum, badge « Disputé », PUIS une liste « depuis le début, chez Tarcum » : Coup n°4/5/6/7 avec des badges Percée/Terrain gagné/Disputé. Bouton « Y RETOURNER ». | **OUI** — même narration Bruno/Tarcum que m-65, même HUD (« tiède », JOUR 12 Matin, $24 850, identique aux 4 images). |
| m-64 | « Ce qu'on ne peut pas faire » — panneau d'aveu EXPLICITE : trois capacités prévues par le jeu mais non branchées (« Savoir qui elles sont », « Leur parler », « Les faire suivre »), chacune avec un compte de routes (« aucune route joueur · N pour l'administration · N pour les tests ») et un paragraphe de conclusion (« le conflit se joue à l'aveugle et à sens unique »). | **OUI** — même HUD identique, même sujet (le conflit). |
| m-65 | Le brief le décrit déjà en détail — la table + note + 4 familles + pied « L'ENVOYER CE SOIR ». | OUI (déjà confirmé par le brief). |
| m-66 | « Il est rentré » — même table (chalk circles, moins l'annotation LA COIL/etc.), Bruno dit « Il est rentré. Regardez l'allumette… », 3 lignes de résultat (« l'allumette ça s'est disputé », « ça nous a coûté un peu », « la ville a chauffé pas mal »), bouton « EN RENVOYER UN — même famille, autre bâtiment ». | **OUI** — même HUD, même table, suite immédiate de m-65 après un envoi. |

⇒ **Les QUATRE cadres appartiennent au même écran ㉙**, comme quatre ÉTATS narratifs successifs
d'une seule vendetta (avant l'envoi m-65 → après un envoi m-66 → historique cumulé m-63 → aveu de
ce qui manque m-64), et **PAS** aux écrans voisins ㉚/㉘ comme le chantier le supposait pour
53-58/48-53 — vérifié séparément par la mesure du brief lui-même, confirmée ici.

⚠️ **CE LOT NE CONSTRUIT QUE LA STRUCTURE DÉCRITE PAR « CE QUE JE TE DEMANDE »**, qui recouvre
essentiellement m-65 (table + vendetta + pied) et PAS m-63 (l'historique numéroté « Coup n°N ») ni
m-64 (le panneau d'aveu explicite, pourtant très proche en esprit de ce que ce lot fait déjà côté
prose honnête, mais avec un COMPTE DE ROUTES par capacité que je n'ai pas mesuré). **À faire
remonter** : m-63/m-64 sont deux états supplémentaires du même écran, non construits, avec du
contenu substantiel (l'historique par coup, le panneau d'aveu structuré) — un futur lot pourrait
les ajouter comme sections supplémentaires de `ConflitScreenController` plutôt que comme un écran
séparé.

## Prémisses du brief RÉFUTÉES OU PRÉCISÉES PAR LA MESURE (`rtk proxy curl`, 2026-09-03)

1. **`GET /v1/me/engagements` confirmé VIDE** — `{engagements: []}`, sur le compte de démo ET sur
   un signup frais. Le brief ne mesurait que le compte de démo ; j'ai ajouté la mesure sur un
   compte frais pour P1 (voir plus bas).
2. **`GET /v1/lieutenants` : 0 MUSCLE confirmé sur DEUX comptes**, pas seulement celui du brief —
   compte de démo (3 COOK, 1 LAUNDERING, 1 LOGISTICS) ET un signup frais (2 COOK). Ça renforce
   l'affirmation du brief : ce n'est pas un artefact du compte de démo, c'est l'état d'un joueur
   qui débute.
3. **Le domaine `target_rival_key` annoncé clos par le brief (coil|tarcum|iron_throat|saltline)
   N'A PAS PU ÊTRE RE-CONFIRMÉ EN DIRECT** — mesuré : le contrôle `MUSCLE` répond AVANT toute
   validation de `target_rival_key`/`target_holding_id` (testé avec une valeur bidon
   `"bogus_5e_valeur"` et un `target_holding_id` manquant — les DEUX rendent le MÊME 404 MUSCLE,
   pas un 422 de validation). Le message d'erreur qui fermerait ce domaine n'a donc jamais pu être
   obtenu sur les deux comptes sondés. `ConflitResolvers.NomFamille`/`SousTitreFamille` gardent
   quand même un `default: throw`, PAS parce que le domaine est confirmé fermé côté back, mais
   parce que ces deux résolveurs ne sont JAMAIS appelés sur une valeur SERVIE — seulement sur les
   4 clés que l'écran énumère lui-même (voir le commentaire de `ConflitResolvers`).
4. **⛔⛔ COLLISION DE COMPILATION TROUVÉE PAR LA MESURE, PAS PAR LA LECTURE** — `DelegationDtos.cs`
   (㉜, mergé avant ce lot) porte DÉJÀ `GetLieutenantsResponseDto`/`GetLieutenantsPayload`/
   `GetLieutenantsEnvelope`/`LieutenantRowDto` pour la MÊME route `GET /v1/lieutenants`, avec
   EXACTEMENT les 6 clés que j'ai mesurées moi-même. Ma première version dupliquait ce DTO sous le
   nom `LieutenantDto` : `Tools/verifier-compilation-sans-unity.sh --tests --controle-positif` a
   rendu `CS0101` (3×) + `CS0579` (3×) au premier run. Corrigé en RÉUTILISANT `LieutenantRowDto`
   de `DelegationDtos.cs` — DRY, aucune seconde table de correspondance. **Ceci est exactement la
   classe d'erreur que le socle du dépôt (CLAUDE.md) demande de chercher avant d'écrire « ça
   n'existe nulle part » — sauf qu'ici, c'est le COMPILATEUR qui l'a trouvée, pas une relecture.**
5. **`FamilleLabels` (organigramme ⑯) porte déjà des résolveurs PARTAGÉS pour `archetype` et
   `tenure_bucket`** (`FamilleLabels.Archetype`/`FamilleLabels.Anciennete`) — réutilisés au lieu
   d'écrire une seconde table MUSCLE→texte/FRESH→texte dans `ConflitResolvers`. `MUSCLE` →
   « Gros bras » (déjà enregistré, pas de mon invention).

## Ce que j'affiche, ce que je n'affiche pas

| clé / donnée | affichée ? | où / pourquoi |
|---|---|---|
| `engagements[].target_rival_key` (groupé) | oui, en compte par famille | vendetta ; forme JAMAIS OBSERVÉE (voir `ConflitDtos.cs`), présomption consignée |
| `target_rival_key` (POST, 4 valeurs) | oui, comme NOMS de famille (table) | `ConflitResolvers.NomFamille`, domaine annoncé clos, jamais servi |
| les possessions/rivaux (`target_holding_id`) | NON — aucune route ne les liste | note honnête « pâle », § Deviations |
| `lieutenants[].archetype`/`tenure_bucket` (MUSCLE trouvé) | oui | `FamilleLabels.Archetype`/`.Anciennete`, résolveurs PARTAGÉS |
| `lieutenants[].op_state_band`/`rule_count_band` | non | hors scope du brief, aucune maquette ne les montre pour cet écran |
| m-65 « QUI PART/CHEZ QUI/SUR QUOI/CE QU'ON PREND » (valeurs d'exemple Bruno/Tarcum/Stack-2) | NON, pas recopiées telles quelles | ce sont des valeurs d'EXEMPLE de la maquette, pas des données d'un compte réel — les recopier aurait fabriqué de la donnée (voir le commentaire de classe, point 3) |
| la réplique « Dites-moi qui j'envoie… » | oui, verbatim m-65 | générique, ne cite aucune donnée non sourcée |
| m-63 (historique par coup) / m-64 (panneau d'aveu) | NON | hors périmètre déclaré de ce lot — voir § m-63 à m-66 |

## Deviations

1. **`GET /v1/lieutenants` DTO : réutilisé (`LieutenantRowDto` de `DelegationDtos.cs`), pas
   déclaré dans `ConflitDtos.cs`** — imprévu non bloquant, trouvé par le contrôle positif de
   compilation (CS0101). Option conservatrice : réutiliser l'existant plutôt que renommer/déplacer
   quoi que ce soit dans `DelegationDtos.cs` (aurait touché un fichier d'un autre écran).
2. **Le collapse du 404 POST sur « On ne les connaît pas encore. » (`EnvoyerCeSoirEtRecharger`)
   est plus large que ce que j'ai pu mesurer** — les deux comptes sondés ne produisent QUE le 404
   MUSCLE, jamais le 404 « cible inconnue » que cette phrase décrit dans le brief (il faudrait un
   lieutenant MUSCLE pour dépasser le premier contrôle et atteindre l'autre). J'ai choisi de
   mapper TOUT code 404 sur cette phrase plutôt que d'essayer de distinguer les deux à la lecture
   du message (fragile, dépendrait d'un `string.Contains` sur une prose back qui peut changer).
   Cette méthode n'est appelée par AUCUN bouton cette passe (`RendrePied` ne construit jamais de
   bouton cliquable), donc le collapse ne peut induire personne en erreur en jeu aujourd'hui.
3. **Aucun bouton d'envoi cliquable construit, même quand un lieutenant MUSCLE est trouvé**
   (état exercé par `RendrePourTest`/E2 seulement, jamais observé sur un compte réel) —
   `target_holding_id` reste structurellement indécouvrable (aucune route ne liste les
   possessions rivales) : construire un bouton qui échouerait TOUJOURS aurait été pris pour un
   bug par le joueur. `EnvoyerCeSoirEtRecharger` reste exposée, non câblée, pour le jour où une
   route de cible existera (patron `PasserCommandeEtRecharger`/`AcheterVehicule` de ㉚/㉘).
4. **m-63 (historique par coup) et m-64 (panneau d'aveu structuré) ne sont pas construits** —
   hors de la liste « CE QUE JE TE DEMANDE » du brief, malgré leur appartenance au même écran
   (voir § m-63 à m-66). À faire remonter à l'orchestrateur.
5. **Maquette source de mise à l'échelle NON confirmée** — `EchelleMaquette.LargeurEcransBrennar`
   (300) conservé par convention (même trou que ㉛/㉘/㉚, répertoire `v6/` commun), aucun fichier
   HTML source trouvé dans le worktree pour vérifier `.tel{width:...}`.
6. **`RendreTable` affiche « compte indisponible » par famille si `GET /v1/me/engagements`
   échoue** (au lieu de « on n'y est jamais allés », qui serait trompeur — zéro par ABSENCE de
   mesure, pas zéro par MESURE) — non testé en E, seulement en logique de code (pas de fixture
   d'échec réseau simulée dans `RendrePourTest`, qui ne modélise que le succès).

## Evidence — les cinq commandes, sortie collée

### 1. `Tools/verifier-compilation-sans-unity.sh --tests --controle-positif`
```
sources : 228  ·  références : 269
EXIT=1 · erreurs=3
/tmp/tmp.1XtS6nIPj1/ControlePositif.cs(7,23): error CS0029: Cannot implicitly convert type 'bool' to 'int'
/tmp/tmp.1XtS6nIPj1/ControlePositif.cs(8,24): error CS0029: Cannot implicitly convert type 'int' to 'string'
/tmp/tmp.1XtS6nIPj1/ControlePositif.cs(9,11): error CS1061: 'UniformTellsDto' does not contain a definition for 'MethodeQuiNExistePas' and no accessible extension method 'MethodeQuiNExistePas' accepting a first argument of type 'UniformTellsDto' could be found (are you missing a using directive or an assembly reference?)
✓ CONTRÔLE POSITIF : 3 erreur(s) sur la sonde — la compilation VOIT la cible de CE périmètre (--tests).
```
(EXIT=0 pour le script — le "EXIT=1" affiché est celui de la PASSE SONDE interne, attendue en
échec ; le script lui-même sort 0 quand le contrôle positif réussit. Vérifié : `echo "EXIT=$?"`
juste après l'appel a rendu `EXIT=0`.)

### 2. `Tools/verifier-compilation-sans-unity.sh --tests`
```
sources : 228  ·  références : 269
EXIT=0 · erreurs=0
✓ compile (relancer avec --controle-positif pour que ce vert ait une valeur)
```
Script EXIT=0.

### 3. `Tools/verifier-compilation-sans-unity.sh --editeur`
```
sources : 134  ·  références : 355
EXIT=0 · erreurs=0
✓ compile (relancer avec --controle-positif pour que ce vert ait une valeur)
```
Script EXIT=0.

### 4. `Tools/verifier-references-asmdef.py`
```
  13 asmdef · 233 fichiers .cs · 26 namespaces fournis
  ⇒ ✅ tout `using MafiaCleanCity.*` est couvert par l'asmdef de son fichier.
```
Script EXIT=0.

### 5. `Tools/verifier-references-asmdef.py --controle-positif`
```
✓ CONTRÔLE POSITIF : la référence retirée rougit (1 using non couvert) — le balayage VOIT cette classe de défaut.
    Assets/Scripts/Shell/AppShell.cs · using MafiaCleanCity.Onboarding · assembly Shell ne référence aucun de ['Onboarding']
```
Script EXIT=0.

**Toutes les 5 commandes : EXIT=0, avec contrôle positif qui rougit comme attendu quand la sonde
est armée.** Aucun test PlayMode n'a été exécuté (éditeur non lancé, consigne du brief) : la
preuve est UNIQUEMENT la compilation.
