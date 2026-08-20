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
