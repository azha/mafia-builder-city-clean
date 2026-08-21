# Écran "La Famille — l'organigramme" — mesures Phase 1 + état d'avancement (2026-08-21)

⏸️ **PAUSE demandée par l'user en cours de lot.** Ce fichier fige l'état au moment de la pause :
ce qui est MESURÉ (Phase 1, complet), ce qui est COMMITÉ (testé), et ce qui est EN COURS NON
LIVRÉ (pas vérifié à la compilation — ne pas faire confiance à ce fichier tel quel).

Contexte : construire l'écran "LA FAMILLE — l'organigramme", premier panneau de la maquette
ratifiée user `atelier3d-mafia/ecrans-brennar.html` (rendu `scratchpad/maquette_ecrans.png` du
dépôt `mafia-clean-city`). Réponse à « dans la famille il y a une hiérarchie … comment la
représente-t-on ? » + « j'aime pas les icônes ».

## PHASE 1 — ce que le back expose vs ce que la maquette demande (MESURÉ, complet)

Dépôt back mesuré : `/home/erutheone/project/mafia-clean-city` (services/game-back).

### (a) Ce qui EXISTE et est projeté au joueur (R2.2-clean, réutilisable tel quel)

- `GET /v1/lieutenants` (roster) → `RosterRow[]` = `{ lieutenant_id, archetype, op_state_band,
  rule_count_band, tenure_bucket }`.
  Ancres : `services/game-back/src/operational/lieutenant/lieutenant.controller.ts:317-322`
  (handler `list`) ; `lieutenant.projection.service.ts:196-212` (interface `RosterRow`).
- `GET /v1/lieutenants/:id` (détail) → `LieutenantBands` = archetype, granted_role
  (advisory|executor|delegated_owner|cohort_overseer), mode (tasked|delegated), op_state_band
  (SETTLING|PAUSED|ACTIVE|IDLE), rule_count_band, tenure_bucket, + bandes Phase-11/19/22/25.
  Ancre : `lieutenant.projection.service.ts:131-186`.
- `archetype` a 9 valeurs canoniques (pas 6) : COOK, LOGISTICS, DISTRIBUTION, LAUNDERING,
  SECURITY, BOOKKEEPER, MUSCLE, INTELLIGENCE, FACILITY_MANAGER (+ UNKNOWN).
  Ancre : `lieutenant-archetype.ts:30-45`. Seules BOOKKEEPER/SECURITY/LAUNDERING/LOGISTICS sont
  écrites noir sur blanc dans la maquette (Sal=Comptable, Vito=Sécurité, Rosa=Blanchiment,
  Enzo=Logistique) — les 5 autres n'ont AUCUNE traduction FR ratifiée par la maquette.
- Client Unity : `LieutenantClient.ListLieutenants` (roster) et `.GetBands` (détail) sont DÉJÀ
  câblés, réels, sans mock. Ancres : `Assets/Scripts/Operational/Lieutenant/LieutenantClient.cs:
  159-206`.

### (b) Ce que la maquette demande et qui N'EXISTE PAS côté back (mesuré, 0 hit)

1. **Nom personnel du lieutenant** (« Salvatore « Sal » », « Vito Marchetti », « Rosa Bellini »).
   `lieutenant.name` / `lieutenant.name_locale` EXISTENT en DB
   (`services/game-back/src/db/schema/lieutenant.ts:99-104`) mais ne sont JAMAIS projetés :
   0 hit `name` dans `lieutenant.projection.service.ts` (ni `RosterRow` ni `LieutenantBands`).
   → dette back candidate : exposer `name` (pur flavor text, PAS un scalaire de jugement — R2.2
   ne s'y applique pas).
2. **Loyauté en %** (« 82% Loyauté »). AUCUNE donnée de loyauté pour un lieutenant :
   - `loyalty_seed_bucket` (enum seeded|tested|tempered|fractured) existe
     (`lieutenant.ts:127-131`) mais n'est écrit QU'à l'embauche par quête de recrutement
     (04f-B) et n'est projeté NULLE PART (0 hit dans `lieutenant.projection.service.ts`).
   - `trust_budget_bucket` (low|standard|high) EXISTE et EST projeté dans `LieutenantBands`,
     mais porte un système DIFFÉRENT (crédibilité de flag disciplinaire — ch05 Loop 2), pas la
     loyauté — le réutiliser mentirait sur ce qu'il mesure.
   - Il n'y a donc, de toute façon, RIEN qui ressemble à un pourcentage exposable côté joueur
     (cohérent avec R2.2 : la maquette elle-même viole R2.2 en affichant un scalaire brut — la
     tâche le signalait par avance).
3. **Équipe nommée** (« Nino — Vendeur — Coin de la 3ᵉ », etc.) et **chips d'effectifs**
   (« 4 gros bras · 1 chauffeur »). AUCUN modèle de données de subordination lieutenant→hommes :
   - `dealer` (`services/game-back/src/db/schema/operational_chain.ts:222-245`) : PAS de colonne
     `name`, PAS de FK `lieutenant_id` (clé = player_id + home_building_id).
   - `courier` (`operational_chain.ts:249-271`) : même constat — PAS de `name`, PAS de FK
     `lieutenant_id`.
   - Aucune autre table à granularité "individu" n'existe dans `operational_chain.ts`. 0 table
     "roster de subordonnés nommés" nulle part dans le schéma.
4. **Lieutenant "Retiré"** (Enzo Greco, ligne grisée). `LieutenantService.retire()` est
   RÉFÉRENCÉ en commentaire (`schema_lieutenant.ts:202`, `controller.ts:167` mentionne un
   « retirement guard ») mais n'EXISTE PAS dans `lieutenant.service.ts` (0 match `retire`). Aucun
   flux de retrait, donc aucune donnée "retiré" ne peut jamais apparaître dans le roster.
5. **Identité/district du joueur** (« Don V. — Vous · Le Verge »). Pas de nom de joueur
   affichable (auth par compte/JWT, pas de pseudo) ; pas de "district du joueur" — `RosterRow`/
   `LieutenantBands` n'exposent JAMAIS `assigned_building_id` (R2.2), donc même le district d'UN
   lieutenant particulier n'est pas dérivable côté client, a fortiori "le" district du joueur.

### Décision appliquée (conforme au brief de la tâche — jamais de donnée fabriquée)

- Le "nom" affiché en position primaire = **le libellé FR de l'archétype** (réel, R2.2-clean),
  PAS un nom inventé.
- Le badge "Loyauté" est **remplacé** par le badge **"État"** = `op_state_band` traduit FR
  (Actif/Repos/En pause/Stabilisation) — réel, déjà projeté, occupe la même position visuelle.
- Le slot "équipe" de CHAQUE lieutenant (actif compris) affiche un **état nommé honnête** :
  replié = chip tappable "Voir l'équipe" ; déplié = "Aucune équipe rattachée". Jamais de nom/
  poste/lieu/effectif inventé. Structurellement PRÊT (rail, indentation, tap-to-expand) pour le
  jour où un modèle d'équipe existera côté back — seul le contenu du slot changera alors.
- Pas de ligne "Retiré" (aucune donnée).
- Le Don : "Vous" (toujours vrai) SANS nom de district ("Le Verge" retiré — aucune base pour
  l'affirmer vrai pour tous les joueurs).
- Sous-titre d'en-tête : **compte RÉEL de lieutenants uniquement** ("N lieutenant(s)"), jamais de
  compte "hommes" fabriqué.
- Bandeau bas : CTA générique "Recruter un nouveau lieutenant" (jamais "1 siège libre" — aucun
  champ de cap n'est projeté par la roster, affirmer un nombre serait fabriqué).

## Palette (canon-first, propagé et COMMITÉ)

2 tokens ajoutés (62 → 64), REUSE verbatim du dégradé `--tx-panneau` final
(`atelier3d-mafia/ecrans-brennar.html:163`, bloc "DOCTRINE FINALE : VERRE GRAVÉ + TAMPON") :
`lieutenantGlassTop` `{r:0.086,g:0.129,b:0.208,a:0.58}` → `#162135`, `lieutenantGlassBottom`
`{r:0.035,g:0.055,b:0.094,a:0.74}` → `#090e18`.

Chaîne de propagation, TOUTE faite et TESTÉE :
1. `mafia-clean-city:projects/mafia_city_game/gdd/14_tunable_constants.md` §Asset pipeline —
   commit **`5fc5b70b`** (repo `mafia-clean-city`, déjà poussé sur `main` local).
2. `DesignTokens.cs` (+2 champs, commentés, R2.3 — pas de valeur dans le `.cs`).
3. `Assets/Resources/DesignTokens.asset` (+2 valeurs YAML réelles).
4. `Assets/Editor/CanonPaletteExtract/canon_palette_extract.json` (+2 entrées, `backCommitSha`
   mis à jour → `5fc5b70b`, 64 tokens au total).
5. `Assets/Tests/PlayMode/CanonPaletteBridgePlayModeTests.cs` : `ExpectedTokenCount` 62 → 64,
   amendé nommément avec sa raison (même convention que les tours HUD v3.1 précédents).

**Vérifié** : `refresh_unity(force, compile)` après (2)+(3) → `read_console` : zéro erreur,
uniquement les warnings CS0618 pré-existants (FindFirstObjectByType obsolete, sans rapport).
Compilation propre CONFIRMÉE pour cette partie.

## Référence pixel (Phase 3, méthode HUD v3.1 reproduite)

- `Tools/family-organigramme-reference-source.html` : extrait ISOLÉ + À L'ÉCHELLE du panneau
  Famille (markup+CSS verbatim de `ecrans-brennar.html` lignes 3-11/24-42/50-84/157-172/183-196/
  208-248 — voir les commentaires du fichier pour la provenance ligne par ligne exacte).
  **Contenu texte adapté aux données honnêtes** décidées ci-dessus (PAS un copier-coller de la
  maquette : archétype en position nom, "État" au lieu de "Loyauté", "Aucune équipe rattachée",
  "Voir l'équipe", CTA générique, sous-titre sans "hommes") — le système VISUEL (CSS/SVG) reste
  verbatim, le CONTENU ne l'est pas, par construction (Phase 1).
- **Décision d'échelle documentée** : la maquette est autorée pour `.tel` (300px CSS, cadre
  preview desktop) ; la card Unity de cet écran est ÉTABLIE à 560px (précédent Dashboard/
  LieutenantScreenController, INCHANGEABLE ici car partagée avec les sections Status/Reassign/
  Builder/Recruit non touchées par ce lot). Facteur d'échelle UNIQUE et UNIFORME appliqué à
  TOUTES les dimensions px : **560/300 = 1,86667**. Mêmes nombres des DEUX côtés (référence ET
  implémentation C#, via une fonction `FX()` partagée dans le principe — voir le fichier
  d'implémentation pour la formule identique).
- `Tools/family-organigramme-reference-render.sh` : rend via headless Chrome (patron
  `Tools/hud-topbar-reference-render.sh`), 560 CSS px de large, `--force-device-scale-factor=2`.
  **Piège mesuré et documenté dans le script** : une fenêtre juste à la taille du contenu produit
  un CROP silencieux (Chrome capture le viewport, pas la page) — y compris un cas flaky à 930 CSS
  px pour un contenu mesuré à 924,5 CSS px (marge 5,5px). Protocole retenu : fenêtre TOUJOURS
  généreuse (1300 CSS px) puis CROP du PNG à la bounding box réelle (balayage pixel contre
  `--encre` #0b1016, PAS le fond de `.sheet` #16191b — piège de mesure #1 : comparer contre le
  mauvais fond fait croire que tout est "contenu").
- **`Tools/family-organigramme-reference-1120.png` — RENDU ET VÉRIFIÉ VISUELLEMENT** (1120×1850,
  2x de 560×925 CSS). Inspection visuelle confirmée : panneaux verre gravé, fil laiton continu +
  ticks, bustes silhouettes (homburg Don / fedora lieutenants), chips Délégué/Direct, badges
  État, slots équipe (déplié/replié), CTA bas — tout lisible et fidèle à la doctrine DA.
- `Tools/family-bustes-source.html` + `Tools/family-bustes-render.sh` : rasterise les 3 bustes
  SVG verbatim de la maquette (`ecrans-brennar.html:184-195`) en PNG transparents 256×256.
  **Rendu et vérifié** : `alpha_min==0` (fond transparent réel) et `alpha_max>0` (silhouette
  présente) contrôlés programmatiquement pour les 3, ET inspection visuelle du fedora (silhouette
  nette, transparence correcte).
- Assets importés **et vérifiés dans Unity** : `Assets/Resources/Lieutenant/
  ui_element_buste_{homburg,fedora,casquette}.png`, `textureType=Sprite` posé par code
  (`W4P4aArtImportPostprocessor` ne couvre PAS `Assets/Resources/` — seulement `Assets/Art/` ;
  ces 9 écrans opérationnels sont construits 100% à l'exécution sans prefab/scène, donc
  `Resources.Load<Sprite>` est le SEUL seam de livraison possible, même contrainte que
  `DesignTokens.asset`). `Resources.Load<Sprite>("Lieutenant/ui_element_buste_fedora")` **testé
  et confirmé non-null** via `execute_code`. `casquette` n'a AUJOURD'HUI aucun consommateur
  (aucune donnée d'équipe nommée n'existe côté back — voir (b)3 ci-dessus) ; importé quand même
  pour la complétude du jeu de 3 bustes (REUSE verbatim de la maquette).
- **Décision de fond non implémentée** : "chaque écran plein garde la ville floutée dessous"
  (RÈGLE maquette) — mesuré qu'AUCUN écran opérationnel existant (Dashboard, LieutenantScreen,
  etc.) n'implémente cette image de fond floutée ; tous utilisent un flat `Image(SurfaceBg)`.
  Ce lot NE L'IMPLÉMENTE PAS non plus (cohérence avec les écrans déjà shippés — l'introduire
  seulement ici créerait une incohérence visuelle entre écrans, hors périmètre de résoudre pour
  TOUS les écrans dans ce lot). Consigné, pas oublié.

## Code C# — ⚠️ EN COURS, NON LIVRÉ, NON VÉRIFIÉ À LA COMPILATION ⚠️

`Assets/Scripts/Operational/Lieutenant/LieutenantScreenController.cs` porte un diff NON COMMITÉ
(modifié, dans l'arbre de travail) qui restyle le header + la section Roster (B2) existante en
organigramme "La Famille" :

- Nouveaux champs : `familySubtitleText`, `expandedTeams`/`seenLieutenantIds` (tap-to-expand +
  auto-dépli de l'actif à la première vue), test hooks `IsTeamExpanded`/`ToggleTeamExpanded`/
  `FamilySubtitle`.
- `BuildLayout()` : remplace le `Title` plein par `BuildFamilyHeader()` (retour rond chrome, titre
  serif "LA FAMILLE", sous-titre, filet laiton).
- `BuildRosterSection()`/`RenderRoster()` : reconstruits pour bâtir le Don (`BuildDonRow`), l'arbre
  des lieutenants (fil laiton étiré par ancrage — PAS de coroutine de resize, le VerticalLayoutGroup
  ambiant recalcule tout seul), un `BuildFamilyLieutenantRow` par ligne (médaillon fedora +
  archétype-comme-nom + chip mode + badge état + panneau verre gravé + tap→OpenLieutenant
  INCHANGÉ) suivi de `BuildEquipeSlot` (replié/déplié), puis `BuildRecruitCta`.
- `ClearRosterRows()` restauré (avait été accidentellement supprimé pendant une passe d'édition,
  RE-AJOUTÉ avant la pause — à VÉRIFIER que rien d'autre n'a été perdu de la même façon).
- Nouveaux helpers statiques : `FX()` (échelle 560/300), `WithAlpha()` (copie locale du patron
  `TopBarController.WithAlpha` — Shell/ non touché, hors périmètre), `BuildGlassPanel` (verre
  gravé : masque arrondi + bordure par soustraction + dégradé + biseau haut/bas, REUSE lecture
  seule de `ProceduralUI`/`VerticalGradientImage`), `BuildMedallion` (disque + anneau
  `ProceduralUI.Ring` + buste), `BuildRailTick`, `BusteSprite` (+ cache), labels FR exhaustifs
  (`FamilyArchetypeLabelFr`/`FamilyModeLabelFr`/`FamilyModeChipColor`/`FamilyOpStateLabelFr`).

**CE QUI N'A PAS ÉTÉ FAIT AVANT LA PAUSE** (dans l'ordre où ça devait suivre) :
1. `refresh_unity(force, compile)` — **PAS ENCORE LANCÉ** sur ce diff. Le fichier peut très bien
   ne PAS compiler (risque connu : au moins une passe d'édition a laissé des lignes orphelines
   que j'ai dû nettoyer à la main — un autre oubli du même genre est plausible, non exclu).
2. `read_console` — pas vérifié.
3. Capture Play Mode réelle + comparaison pixel contre `family-organigramme-reference-1120.png`
   — pas commencée.
4. Oracle (continuité du rail, indentation, tabulaire, or-seulement-sur-argent — cette dernière
   règle ne s'applique probablement PAS à cet écran, aucun montant $ n'y est affiché, à confirmer)
   + contrôles positifs — pas commencé.
5. Tests PlayMode dédiés (`Assets/Tests/PlayMode/`) — pas commencés. Les tests EXISTANTS
   (`LieutenantUiExtensionPlayModeTests.cs` etc.) ont été LUS et le diff a été conçu pour ne PAS
   les casser (RosterRow/RefreshRoster/OpenLieutenant/CurrentRoster inchangés dans leur contrat ;
   `familySubtitleText` délibérément gardé HORS du corpus `RenderedTexts` scanné pour R2.2 — même
   exemption que `script_source`, car c'est un COMPTE d'items déjà individuellement affichés, pas
   un scalaire de jugement backend — voir commentaire dans le code) — mais ÇA N'A PAS ÉTÉ
   VÉRIFIÉ PAR UN RUN RÉEL. Ne pas faire confiance à cette analyse tant qu'elle n'a pas tourné.
6. Suite complète 250/250 — PAS relancée (et ne devait de toute façon l'être qu'après tout ce qui
   précède).

**Ne pas partir du principe que ce fichier compile.** La première action à la reprise doit être
`refresh_unity(mode:force, compile:request)` puis `read_console(types:[error,warning])`.

## Prochaines étapes (à la reprise, dans l'ordre)

1. Vérifier la compilation du diff C# (`refresh_unity` + `read_console`).
2. Corriger les erreurs de compilation s'il y en a.
3. Capture Play Mode réelle (rect imprimé — jamais `ScreenCapture` via `run_tests` sans focus,
   piège connu de ce dépôt) et comparaison pixel tour par tour contre la référence commitée.
4. Écrire l'oracle avec contrôles positifs (injecter chaque défaut, prouver qu'il l'attrape).
5. Tests PlayMode (mondes dégénérés : roster vide, 1 lieutenant, plusieurs archétypes non-
   ratifiés par la maquette, toggle expand/collapse, no-raw-scalar scan incluant le nouveau
   header).
6. Lancer la suite scopée (fichiers du chunk + voisins directs — jamais la suite complète, qui
   appartient au merge-gate du contrôleur).
7. Compléter `implementation-notes.md` avec la liste finale des Deviations (dont : 5 traductions
   FR d'archétype non ratifiées, retour rond non câblé à une navigation shell, CTA recrutement non
   câblé à un scroll-to, disque de médaillon en aplat au lieu du radial-gradient exact de la
   maquette — token réutilisé plutôt que 2 nouveaux, ville floutée non implémentée comme pour tous
   les écrans sœurs, `casquette` sans consommateur actuel).
