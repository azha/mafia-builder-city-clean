⚠️ **PÉREMPTION PARTIELLE (2026-08-20, pivot fond pré-rendu, `Tools/pivot-fond-prerendu-design.md`
§P3, gate ⊥ APPROVED)** — ce fichier documente la GRILLE PROCÉDURALE (CellSize, GridFloors,
GridBorder, FloorTint, metresParBloc comme facteur d'échelle des sprites). Le pivot RETIRE cette
grille entière (« plus aucune grille procédurale ») au profit d'un fond pré-rendu + bâtiments
ancrés par JSON. **Ce qui reste VRAI** : la leçon d'instrument ligne 17-20 (juger aux sondes PIL,
jamais à l'aperçu — directement invoquée dans l'investigation de la sonde de ressemblance de P3,
voir `Tools/pivot-fond-prerendu-p3-implementation-notes.md`) et R2F2/les tokens de sol (toujours
déclarés dans DesignTokens, désormais sans consommateur — voir le nouveau fichier § Deviations).
**Ce qui ne s'applique plus** : tout le reste (CellSize, metresParBloc comme échelle-sprite,
GridFloors/GridBorder, FloorTint). Conservé pour l'historique, jamais à ré-exécuter tel quel.

---

# Boucle pixel-perfect du diorama district — déviations consignées (revues ⊥ r1-r2)

Règle 5 du socle : imprévu non bloquant → option conservatrice CONSIGNÉE. Les arbitrages pris seuls :

- **metresParBloc = 22** (était const C# 14, inventée) : porté dans BuildingSpriteSlots.asset (R2.3).
  Choisi ≥ 21,86 m (l'usine, plus large sprite livré) pour supprimer la classe « débordement coupé ».
  Compromis nommé : l'usine passe de ~158 à ~101 px, les cellules montrent plus de sol.
- **fen := actif pour lab/stash** (asset) : leurs fenêtres vivent dans le calque `actif` (l'atelier n'a
  pas rendu de `fen` séparé pour eux). DÉFAUT LATENT accepté et consigné (revue ⊥ r2 IMPORTANT 5) :
  bindings 1 et 4 rendent la même image, et double-add additif si les deux se déclenchent (invisible
  au J0, activity=IDLE). Vrai correctif en file : rendre `fen` dédiés dans l'atelier (sprites_batch
  REG : ajouter un état fen aux templates entrepot/usine) puis réassigner l'asset.
- **Marges du calcul CellSize : -100 (largeur) / -160 (hauteur)** : chrome titre + respiration,
  valeurs de mise en page (même statut que les tailles inline d'AppShell), pas des tunables.
- **Plancher CellSize = 48** : l'ancienne const devient le minimum — aucun écran ne descend sous le
  rendu historique.
- **Leçon d'instrument (2026-08-20)** : l'aperçu inline des screenshots (MCP et Read) ÉCLAIRCIT
  l'image (gamma) — un écran sombre y paraît laiteux. Le fichier fait foi : juger les rendus Unity
  aux sondes PIL, jamais à l'aperçu. (Le vérificateur ⊥ l'a prouvé : prédiction (47,52,59), PIL
  (48,53,60), aperçu « gris clair ».)

## Round 3 (revue ⊥) — arbitrages supplémentaires
- **metresParBloc 22 → 16** : à 22 les bâtiments perdaient 36 % et le tri deux-passes n'avait plus
  aucun consommateur (« un garde-fou hors du chemin sera retiré de bonne foi »). À 16, l'usine fait
  ~138 px et déborde de 1,37 bloc — absorbé par le tri. ⚠️ DÉCISION PRODUIT (densité vs lisibilité)
  remontée à l'user — réversible dans BuildingSpriteSlots.asset sans code.
- **Échelle de sols en 3 tokens étagés** (b0 froid sombre / b1 = nightFloorAlt froid clair / b2 chaud
  moyen), ratios calculés 1,33-1,90:1 (cible mesurée 1,6-2,1) ; socle = ombre de contact (sombre,
  largeur du bâtiment) — l'inverse du r2, la falsifiable R2F2 mesure une séparation, pas une
  direction, donc elle couvre les deux mondes.
- **Question de présentation remontée à l'user** (limite honnête du ⊥) : une grille 10×4 peut-elle
  jamais lire comme le diorama rapproché de l'art target ? Les correctifs pixel n'y répondent pas.

## Round 4 (revue ⊥) — arbitrages
- **GridFloors** : les sols sortent des cellules (la prescription r2 du ⊥ était incomplète — il
  l'assume : SetAsLastSibling déplaçait le sol AVEC la cellule). Garde structurelle R4F1 posée :
  la classe « occlusion par fratrie » est enfin testée SANS pixel.
- **GridBorder** : le carve-out fond↔b0 de R3F1 est adossé à un indice réel (liseré nightSocle,
  2 px), asserté par R4F2 — plus jamais un `continue` nu.
- **FloorTint** : hash position (73856093/19349663) — même monde ⇒ mêmes taches, zéro période lisible.
- **Libellés de type** : seulement en repli sans art (le sprite est l'identité). Titre inchangé
  (MINOR restant : name_canonical — attend un display_name côté back, pas d'invention C#).

## Round 5-6 — CONVERGENCE PRONONCÉE (⊥, sans réserve) — 2026-08-20
- Verdict ⊥ r5 : palette / contrastes / échelle / calques **CONVERGÉS**, « je ne les rouvrirai pas ».
  5 tours, 5 BLOCKING fondés, 0 réfuté — et le seul tour sans BLOCKING est le premier où le
  correctif est arrivé avec sa garde STRUCTURELLE (R4F1/R4F2) plutôt qu'une garde de valeur.
- (b) réfuté par la mesure du ⊥ : les rectangles beiges = les 2 marqueurs de lieutenant du lab
  (cas dégénéré J0, 2 COOK même bâtiment), PAS un repli token-rect — 0 px de repli dans l'écran.
- r5 livré : ombre 3 bandes translucide (r7→r8 : 292 px quasi noirs → 2) · TypeLabel sur repli
  (la branche null seule était MORTE — Resolve ne rend jamais null) · R4F1 ordre inter-cellules ·
  R2F2 composite.
- ⚠️ ARBITRAGE OUVERT (round 6) : cœur 0,45 et plancher 1,3 incompatibles sur b0 (plafond de la
  paire = 1,332 OPAQUE ; 0,45 → 1,164 ; 1,3 exigerait 0,88). Livré : 1,15 sur b0, 1,3 sur b1/b2.
  Recommandé (i) ratifier 1,15.
- Restent consignés sans urgence : liseré 4 px haut (offsetMax) · titre name_canonical (attend un
  display_name back) · pivot .meta bas-centre.
