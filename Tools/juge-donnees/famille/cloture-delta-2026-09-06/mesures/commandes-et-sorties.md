# Mesures — juge données ⊥ ⑥ La Famille, clôture en DELTA (2026-09-06)

Aucune stack, aucun `curl`, aucun test. Tout ce qui suit est de la lecture de fichiers, de la
plomberie git et des oracles Python. ⚠️ Tout compte qui décide passe par `rtk proxy` ou par un
`$( )` / un oracle Python — jamais par une sortie lue au terminal (socle : la couche d'affichage
tronque et plafonne).

## M0 — Provenance du front gelé (contrôle d'identité AVANT toute mesure)

```
$ cd .../cloture-delta-2026-09-06/front-8e982ab/Assets/Scripts/Operational/Lieutenant/
$ for f in *.cs; do printf "%s %s\n" "$(git hash-object "$f")" "$f"; done
18fd483ab9043287a283201c7d8e59e321520005 FamilleLabels.cs
17e705506413c2554bc569ab908cd0e271402e7c LieutenantClient.cs
efeed89e3c77ca79cc7455c0d4a1fafc2df1cc90 LieutenantDtos.cs
9d8dbce17f805b30904497e085048dd308d33375 LieutenantScreenController.cs
2cf223266be742af3adc04f40eac11c74e3a97a3 RuleModel.cs

$ git ls-tree 8e982ab Assets/Scripts/Operational/Lieutenant/     # mêmes 5 blobs
$ git ls-tree 76ee3cc Assets/Scripts/Operational/Lieutenant/
100644 blob a9f19ee2… FamilleLabels.cs
100644 blob 17e70550… LieutenantClient.cs      (identique)
100644 blob 76659ebe… LieutenantDtos.cs
100644 blob e4a976e4… LieutenantScreenController.cs
100644 blob 2cf22326… RuleModel.cs             (identique)
```
⇒ Les trois blobs annoncés par `dossier.md` (`efeed89e…`, `9d8dbce1…`, `18fd483a…`) sont bien
ceux du répertoire gelé. `LieutenantClient.cs` et `RuleModel.cs` sont bit-identiques entre les
deux commits — l'annonce du dossier tient.

## M1 — Le « F avant » est disponible, et il est vérifiable

L'arbre de travail (`Assets/Scripts/...`) porte exactement les blobs de `76ee3cc`. Les anciens
blobs ont été extraits par plomberie et **re-hachés** pour prouver que la redirection n'a rien
tronqué (socle : un `>` nu passe par la couche d'affichage et élide) :

```
$ rtk proxy git cat-file -p e4a976e4… > OLD_LieutenantScreenController.cs   # + les 2 autres
$ for f in OLD_*.cs; do printf "%s %s %s\n" "$(git hash-object "$f")" "$(wc -l < "$f")" "$f"; done
a9f19ee21c819aa6f49dcb91d9228d2134e95cda  108 OLD_FamilleLabels.cs
76659ebe693d25476cb51a2594f6e5b56b11758b  169 OLD_LieutenantDtos.cs
e4a976e40435aacb049d36cae1c4f6e09df330d9 3572 OLD_LieutenantScreenController.cs
```
⇒ hachage identique au blob demandé sur les 3 : l'extraction est byte-exacte.

## M2 — Le delta, en net (`rtk proxy diff -u`, fichiers dans ce répertoire)

```
$ rtk proxy git diff --numstat 76ee3cc 8e982ab -- Assets/Scripts/Operational/Lieutenant/
43  17  FamilleLabels.cs
21   0  LieutenantDtos.cs
60  70  LieutenantScreenController.cs
```
Le contrôleur passe de 3572 à 3562 lignes (−10 net) en **11 hunks**. Tout ce qui n'est pas dans
un hunk est bit-identique — c'est ce qui autorise à dire d'une ligne de couverture qu'elle
« ne peut pas avoir bougé ».

Plages de hunks (coordonnées ANCIENNES) : 578 · 848-860 · 932-958 · 988-1007 · 1019-1051 ·
1383-1389 · 1429-1441 · 2349-2355 · 2357-2366 · 2571-2582 · 2587-2594.

⚠️ **Écart de provenance** : `dossier.md` annonce « `LieutenantScreenController.cs` (+130/−87) ».
Mesuré : **+60/−70** en net, ET **+60/−70** en somme des trois commits (19+26+15 = 60 ins ;
5+65+0 = 70 del) — donc aucune ligne touchée deux fois, et les deux méthodes de comptage
concordent. Le « +130/−87 » du dossier ne correspond à aucune des deux.

## M3 — Sujets des trois commits (plomberie ; `git log --oneline` proscrit par le socle)

```
$ rtk proxy git show --stat --format='%H %s' <sha> -- Assets/Scripts/Operational/Lieutenant/
33ffa6a…  ⑥ D-1 : le nom était SERVI et le client le jetait — trois « Cuisinier » à la place de trois noms
          LieutenantDtos.cs +11 · LieutenantScreenController.cs 24  → 30 ins / 5 del
3e57e98…  ⑥ D-2/D-3/D-3b + TD-611 : UN producteur par grandeur — 39 lignes retirées, 26 appels repointés
          FamilleLabels.cs 60 · LieutenantScreenController.cs 91   → 69 ins / 82 del
67b9493…  ⑥ D-6 : la disponibilité de réaffectation était servie et lue par personne — le 409 partait du client
          LieutenantDtos.cs +10 · LieutenantScreenController.cs +15 → 25 ins / 0 del
```
⇒ Ce sont les **sujets de commit** qui nomment D-1, D-2/D-3/D-3b et D-6 — le dossier ne les
décrivait pas et le rapport précédent est hors mandat. **D-1b n'est revendiqué par aucun commit.**

Contrôle du socle « un correctif qui ne SUPPRIME rien n'a rien corrigé », **borné à sa
population** (commits qui prétendent RECTIFIER un existant) :
- `3e57e98` (rectifie) : −82 → conforme, c'est une vraie consolidation ;
- `33ffa6a` (rectifie) : −5 pour +30 — les 25 lignes de plus sont des commentaires ; le geste
  réel tient en **1 champ de DTO + 3 lignes de logique** ;
- `67b9493` : −0, mais c'est une **garde NEUVE** — hors population du contrôle, aucun reproche.

Contrôle du compte revendiqué « 26 appels repointés » — recompté sur le diff :
`866, 870, 872` (3) + `950-957` (8) + `963-965` (3) + `966-970` (5) + `1362, 1408, 1414` (3) +
`2564, 2569, 2580, 2581` (4) = **26**. ✅ le compte du commit est exact.
⚠️ mais **4 des 26** (`2564, 2569, 2580, 2581`) sont dans `BuildRosterRow`, qui a **0 appelant**
(voir M4) : 22 repointages vivants, 4 morts.

## M4 — Sites d'appel (contrôle POSITIF systématique)

```
$ cd front-8e982ab/.../Lieutenant/
$ rtk proxy grep -n "BuildRosterRow" LieutenantScreenController.cs
2539:        private void BuildRosterRow(RosterRow row, int index)          ← DÉFINITION SEULE

$ rtk proxy grep -n "BuildFamilyLieutenantRow" LieutenantScreenController.cs
1881:                BuildFamilyLieutenantRow(CurrentRoster[i], i);          ← appel
2300:        private void BuildFamilyLieutenantRow(RosterRow row, int index) ← définition
```
⇒ **Contrôle positif** : le même motif trouve bien un appel quand il y en a un
(`BuildFamilyLieutenantRow` : 2 hits, dont 1 appel). Sur `BuildRosterRow` il n'y a **que** la
définition ⇒ ce constructeur de rangée est du **code mort**, dans les deux versions.

Résolveurs supprimés, recomptés :
```
$ for m in ArchetypeLabel ModeLabel OpStateLabel GrantedRoleLabel TenureBucketLabel; do
    rtk proxy grep -c "$m" LieutenantScreenController.cs FamilleLabels.cs ; done
ArchetypeLabel     ctrl=0  labels=0
ModeLabel          ctrl=0  labels=1   (une PROSE de docstring, pas un appel)
OpStateLabel       ctrl=0  labels=1   (idem)
GrantedRoleLabel   ctrl=7  labels=0   ← contrôle positif : le motif SAIT trouver
TenureBucketLabel  ctrl=6  labels=0   ← contrôle positif
```

Sites `FamilleLabels.*`, AVANT vs APRÈS :
```
$ rtk proxy grep -c 'FamilleLabels\.' OLD_LieutenantScreenController.cs   → 3
   1080  Anciennete · 2352  Archetype (slot .nom) · 2414  Etat (rangée)
$ rtk proxy grep -c 'FamilleLabels\.' LieutenantScreenController.cs       → 29
```
⇒ **`FamilleLabels.Mode` avait ZÉRO site d'appel avant.** (Voir le verdict D-3b.)

## M5 — Champs de DTO (oracle Python scopé au corps de la classe, pas au fichier)

```
$ python3 -c "…extrait le corps de chaque classe et compte 'public string name;'…"
name dans LieutenantBands (détail) : 0
name dans RosterRow      (roster)  : 1
```
⇒ `name` est déclaré sur le ROSTER et **toujours pas** sur le DÉTAIL.

Balayage de CLASSE — tous les DTO du dépôt qui désérialisent une ligne de lieutenant
(`op_state_band` comme sonde), sur l'arbre `76ee3cc` **dont il est prouvé qu'il est identique à
`8e982ab` pour ces fichiers** (`git diff --name-only 76ee3cc 8e982ab` ne liste ni `Delegation/`
ni `Conflit/`) :
```
Assets/Scripts/Operational/Delegation/DelegationDtos.cs:221  class LieutenantRowDto  name=OUI
Assets/Scripts/Operational/Lieutenant/LieutenantDtos.cs      RosterRow  name=OUI (neuf)
                                                             LieutenantBands  name=NON
Assets/Scripts/Operational/Conflit/ConflitDtos.cs:69-70  commentaire : « les 6 clés EXACTEMENT
   mesurées ici (lieutenant_id, name, archetype, op_state_band, rule_count_band, tenure_bucket) »
```
⇒ `DelegationDtos.LieutenantRowDto:224` déclarait **déjà** `name`, avec la docstring
« ⚠️ `name` est bien SERVI ici (« Lt. Vesk ») » (`DelegationDtos.cs:217-219`). Le DTO juste
existait dans le dépôt avant le correctif.

## M6 — `reassign_availability` : 0 site AVANT, sur tout l'arbre

```
$ rtk proxy grep -rn "reassign_availability" Assets/Scripts     (arbre 76ee3cc)
(aucune sortie)   → total = 0
$ rtk proxy grep -rn "tenure_bucket" Assets/Scripts             ← contrôle positif : 5+ hits
```
⇒ la docstring neuve (`LieutenantDtos.cs:92` « **0 site actif** dans tout `Assets/Scripts` »)
est **vérifiée**.

## M7 — i18n : la clé est DÉRIVÉE DU LITTÉRAL, donc changer le repli change la clé

`Assets/Scripts/I18n/Libelle.cs:51-72` — `cle = domaine + "." + role + "." + Slug(litteral)` ;
si `I18nCatalog.Connait(cle)` est faux, `NbReplis++` et **le littéral est rendu tel quel**.

Slugs recalculés par un oracle Python transposant `Libelle.Slug` (`:81-92`) :
```
Comptable→comptable · Sécurité→securite · Blanchiment→blanchiment · Logistique→logistique
Cuisinier→cuisinier · Distribution→distribution
Gros bras→gros_bras · Renseignement→renseignement · Intendant→intendant
Inconnu→inconnu · Au repos→au_repos · Repos→repos · Prend ses marques→prend_ses_marques
```
Clés RÉELLEMENT servies — oracle Python sur `services/game-back/src/i18n/string_table.ts`
(`EN_MESSAGES:53` et `FR_MESSAGES:923`, 25 clés `famille.*` distinctes, chacune dans les DEUX
bundles) :
```
famille.archetype.comptable / .securite / .blanchiment / .logistique / .cuisinier
                / .distribution / .inconnu          → PRÉSENTES
famille.archetype.gros_bras                          → ABSENTE
famille.archetype.renseignement                      → ABSENTE
famille.archetype.intendant                          → ABSENTE
famille.opstate.au_repos / .actif / .en_pause / .prend_ses_marques → PRÉSENTES
famille.opstate.repos / .stabilisation               → ABSENTES  (les anciens littéraux en dur —
                                                        ils n'ont jamais eu de clé, cohérent)
famille.mode.delegue / .missionne                    → PRÉSENTES
```
Contrôle positif de l'extracteur : `famille.archetype.cuisinier` PRÉSENT (je sais qu'il y est) ;
contrôle négatif : `famille.opstate.repos` ABSENT (je sais qu'il ne peut pas y être, le mot
n'était pas passé par `Libelle`).

`CasseDeTitre` (`FamilleLabels.cs:127-132`), transposé en Python :
```
"UNKNOWN"          → "Unknown"
"MUSCLE"           → "Muscle"
"FACILITY_MANAGER" → "Facility manager"
""                 → "—"
```

## M8 — Domaine servi, côté back (lecture seule)

```
services/game-back/src/operational/lieutenant/lieutenant.projection.service.ts
  :83   export type ArchetypeBand = LieutenantArchetype | 'UNKNOWN';
  :139  name: string;                       (détail — « a REAL varchar(64), round-tripped »)
  :136-137  falsifiable écrite par le back : « carte.lieutenant.name == lieutenants/:id .name »
  :212  name: string;                       (roster — « defect n°1 of back.md's L0.4 table »)
  :242  archetype: 'UNKNOWN'                (NEUTRAL_LIEUTENANT_BANDS — valeur atteignable)
  :492  return archetypeForRoleId(roleId) ?? 'UNKNOWN';
services/game-back/src/operational/lieutenant/lieutenant-archetype.ts:41-53
  LieutenantArchetype = COOK|LOGISTICS|DISTRIBUTION|LAUNDERING|SECURITY|BOOKKEEPER
                        |MUSCLE|INTELLIGENCE|FACILITY_MANAGER      (9 membres)
```
⇒ le domaine servi d'`archetype` compte **10** valeurs (9 + `UNKNOWN`).

## M9 — Confrontation à la planche (PIL, `capture-1080x2400.png`, minute 72 013)

Lu à l'œil sur les recadrages `0-1200` et `1200-2400` :
- rangées de lieutenants : **« Lt. Oster » / « Lt. Brasse » / « Lt. Sallo »** (slot `.nom`),
  puce **« RÉCENT »**, valeur d'état **« Au repos »**, libellé **« État »** ;
- **aucun mot d'archétype nulle part** sur l'organigramme (ni « Cuisinier », ni glyphe) ;
- rang du Don : « VOUS » / « LE DON » ; 3 encarts « Aucune équipe rattachée » ; CTA
  « Recruter un nouveau lieutenant » ; en-tête « LA FAMILLE » / « 3 LIEUTENANTS ».
- Les sections de DÉTAIL (Archétype / Rôle / Mode / Ancienneté / …) **ne sont pas à l'image** :
  `MajVisibiliteDetail` (`:1633-1645`) les masque tant qu'aucun lieutenant n'est ouvert.
