# Écran ① — nom de fiction du district + du bâtiment, hygiène de montage — implementation notes

Lot pilote-C, 2026-09-02. Fichiers touchés : `Assets/Scripts/CityMap/CityProjectionDtos.cs`,
`Assets/Scripts/CityMap/DistrictInteriorScreenController.cs`. Preuve exigée cette semaine :
compilation seule (`Tools/verifier-compilation-sans-unity.sh --tests --controle-positif` +
`Tools/verifier-references-asmdef.py` ×2), pas de suite complète, pas de gate, pas d'éditeur
Unity lancé (un autre agent tient la porte).

## Ce qui a été fait

1. **Nom du district** : `DistrictInteriorDto.name` ajouté (mesuré en direct : "La Lisière" pour
   d16). Le titre de l'écran l'affiche en priorité ; `name_canonical` (mis en forme, tiret→espace)
   reste un repli EXPLICITE pour un environnement plus ancien qui ne servirait pas encore `name`.
   `Tools/district-pixelperfect-notes.md:55,69` mis à jour (paraphrasé, jamais cité verbatim —
   contrat anti-péremption du socle) pour ne plus déclarer ce MINOR ouvert.
2. **Nom du bâtiment (fiche)** : `DistrictInteriorBuildingDto.name_i18n` ajouté
   (`DistrictBuildingNameI18nDto`/`DistrictBuildingNameParamsDto`), résolu par
   `I18nCatalog.Traduire` dans `ResoudreNomBatiment`, affiché dans `ficheTitre` (slot déjà
   existant, canon `.fiche .titre .serif`) à la place de `LibellesBatiment.Type(operational_type)`
   — celui-ci devient le REPLI quand `name_i18n`/sa clé est absent. Params déclarés :
   `enseigne`/`district`/`block`/`rang` (les quatre réellement consommés par les deux motifs
   servis, `game.fiction.building.name` et `…name.rang` — mesuré par le contrôleur du lot,
   corrigé après un premier passage à seulement deux params).
3. **Amorce du catalogue i18n** : `SetSession` amorce `I18nCatalog` (même patron que
   `ExceptionQueueController.cs:98`, seul précédent du dépôt) avant le fetch de la scène. Non
   bloquant pour le reste — un bundle en panne laisse `Traduire` rendre la clé brute, ou
   `ResoudreNomBatiment` replier sur `LibellesBatiment.Type` si `name_i18n` lui-même est absent.
4. **Hygiène de montage** : ajout de `root.SetAsLastSibling()` à chaque `Render()` — voir
   § Deviations ci-dessous pour pourquoi le patron `ShopScreenController.cs:107-115` n'est PAS
   repris à l'identique.
5. **`lieutenants[]`** (district-level) ajouté au DTO (`DistrictLieutenantDto` : `lieutenant_id`,
   `name` — deux chaînes, mesuré) mais NON consommé à l'affichage — voir § Deviations.

## § Deviations

- **`lieutenants[]` : DTO présent, aucun affichage câblé.** Q5 du rapport juge-données
  (`Tools/juge-donnees/ecran-principal/maquette-2026-08-25/rapport.md`, "qui tient ce bâtiment")
  demanderait de joindre `buildings[].lieutenant_ids` à `lieutenants[].name`. Vérifié qu'aucun
  emplacement d'écran existant ne peut porter ce texte sans décision de mise en page : la fiche
  est déjà entièrement occupée à la mesure canon (3 cases + titre + type + actions, hauteur
  `FicheHauteurCss` mesurée sur la maquette) et `ficheSortie` porte déjà une sémantique distincte
  (retour transitoire de CTA) qu'on ne peut pas superposer sans perdre l'un des deux messages ;
  les marqueurs de lieutenant (`BuildLieutenantMarkers`) sont des médaillons SANS aucun composant
  de texte, et en ajouter un entrerait en collision avec l'écart déjà réduit à 0,70 diamètre entre
  deux marqueurs adjacents. Option conservatrice retenue : le DTO est disponible pour un futur lot
  qui prendra la décision de mise en page ; rien n'est deviné entre-temps.
- **`DistrictBuildingNameI18nDto`/`ParamsDto` DUPLIQUENT `BuildingCardDtos.BuildingNameI18nDto`/
  `ParamsDto` (`Assets/Scripts/Operational/BuildingCard/BuildingCardDtos.cs:29-42`) au lieu de les
  réutiliser.** Vérifié : `CityMap.asmdef` ne référence pas `Operational` ; l'ajouter était hors du
  périmètre explicitement fixé par le brief (« tu ne devrais avoir aucun .asmdef à modifier »).
  Entre dupliquer un petit DTO wire et toucher un asmdef partagé pendant qu'un autre agent travaille
  en parallèle sur ce même dépôt, la duplication est l'option qui change le moins de surface — et
  les deux DTOs ont des FORMES DE PARAMS DIFFÉRENTES de toute façon (measuré : `…/interior` sert
  `enseigne/district/block/rang`, `…/building/:id` sert `type/district/block/rank` — pas le même
  motif ICU), donc une réutilisation littérale aurait été fausse même sans la contrainte d'asmdef.
- **`root.SetAsLastSibling()` : patron adapté, pas repris à l'identique.**
  `ShopScreenController.cs:93-132` pose `SetAsLastSibling()` dans `SetMountParent` ET dans
  `OnTransformParentChanged`, parce que le tenant Y EST son propre RectTransform de contenu.
  Ici, le contenu visuel (`root`, "DistrictInteriorRoot") est un GameObject SÉPARÉ, créé
  paresseusement par `BuildRoot()` et parenté directement sous `ContentSlot` — le host du
  contrôleur (celui que `ConstruireLocataire<T>` reparente) ne porte aucun visuel, donc un
  `OnTransformParentChanged` dessus ne protégerait rien. `root` n'est jamais re-parenté après sa
  création (rien dans ce fichier ni dans `AppShell.cs` ne le touche), mais
  `MonterLocataireEnSurimpression<T>` (utilisé par les tests du lot, et par tout futur appelant
  "en surimpression") empile d'autres locataires comme simples frères sous `ContentSlot` SANS le
  vider — c'est le sens même de "en surimpression". Retenu : réaffirmer l'ordre à CHAQUE `Render()`
  plutôt qu'à un seul événement de cycle de vie — idempotent, sans coût mesurable, couvre la
  construction initiale et tout ré-rendu. Vérifié : aucun test `District*PlayModeTests` n'épingle
  la position de `root` parmi les AUTRES enfants de `ContentSlot` (seul l'ordre INTERNE des enfants
  de `root` — fiche, titre — est testé), donc ce changement ne peut pas faire rougir une garde
  existante.
- **`ShellChrome.BottomInsetPx` (fiche, ligne ~1521) : vérifié, PAS changé.** Envisagé de le
  remplacer par le champ d'instance `safeInsetBottom` (celui qui garantit "0 hors shell" par
  contrat, `SetSafeInsets`). Mesure faite avant de toucher quoi que ce soit : `ShellChrome.
  BottomInsetPx`/`TopInsetPx` est le patron ÉTABLI et consommé à l'identique par 15+ écrans de ce
  dépôt (Shop, BuildingCard, ExceptionDetail, ExceptionQueue, Horizon, Forensic, Lieutenant,
  Selling, Reputation, Profile, Tutorial, Inspection, Precinct, Compression, DecisionDetail,
  DailyReview — balayage exhaustif). Le remplacer aurait rendu CET écran incohérent avec tous les
  autres, pas plus correct. La staleness inter-tests de ce champ STATIQUE est un piège documenté
  ailleurs dans le dépôt (`RedimensionnementSondeSeamPlayModeTests.cs:56-90`) mais c'est un
  artefact de partage de domaine ENTRE TESTS, pas un défaut de production (le shell le republie
  avant chaque montage de locataire) — hors du périmètre de cette propriété-ci.
- **Q1 (`lapse_phase_bucket` affiché en clair) NON fermé.** Déjà partiellement porté (binding 5,
  scintillement `accentWarning`) mais aucune valeur textuelle nulle part — les 3 cases de la fiche
  sont pleines (canon), pas de 4ᵉ case sans décision de mise en page. Laissé en dette.
- **`world/districts.precinct_id` et les routes `precinct/:id/{belief,patrol}` (200 depuis ce
  matin, signalé par le contrôleur)** — NON exploité : exigerait un appel réseau supplémentaire
  (hors budget explicite de ce lot) et les valeurs sont dégénérées sur le compte de démo (6/6
  précincts identiques). Laissé en dette par le contrôleur.

## Ce qui a été vérifié et trouvé DÉJÀ CORRECT (aucun changement)

- `root` (RectTransform de l'écran) est déjà ÉTIRÉ dans son parent (`BuildRoot`, `Stretch(root,
  Vector2.zero, Vector2.zero)`).
- `ShellChrome.BottomInsetPx` déjà respecté par la fiche, et suffisant (voir ci-dessus).
- Aucune géométrie n'est lue dans `Awake()` — ce fichier n'a PAS de `Awake()`, seulement `Start()
  => EnsureInitialized()` (qui ne construit que le client HTTP), et toute lecture de géométrie vit
  dans `Render()`/`BuildRoot()`, appelées après `Start()` par l'appelant (shell ou test).
- `SetToken` est un no-op VOULU (le jeton arrive par le canal séparé `SetSession`) — confirmé par
  le commentaire déjà en place (`:196-206`), inchangé.
