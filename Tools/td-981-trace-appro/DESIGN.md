# TD-981 — la carte 106 `supply_chain_trace` mène à ㉚ — design d'UNE page (11/11, CLIENT-1)

**Mandat** f2 11/11 (« 106 → ㉚ : OUI, maintenant que l'écran montre la chaîne servie »). Empilé sur `3b0d6a0f` (㉚ cadre 154).

## Problème
Un AGIR sur la carte 106 (BACKPRESSURE_CRITICAL_TRACE) répond `outcome: "navigate"`, `navigate_screen: "supply_chain_trace"`
(`hl-option-table.ts:101-102` @35bdd6cb). Le client la classait INCONNUE ASSUMÉE (TD-981) : aucun écran ne montrait les nœuds — l'Accueil
était relu, la valeur comptée (`AppShell.NavigationsInconnues`). Depuis `3b0d6a0f`, ㉚ MONTRE la chaîne servie (maillons, pression, liaisons).

## Changement
- `NavigationApresGeste` : `Cible.ChaineDAppro` ; `Pour("supply_chain_trace")` ⇒ `ChaineDAppro` ; la valeur passe des inconnues assumées
  (désormais VIDE) aux menées (4).
- `AppShell.SuivreLaNavigationCo` : `ChaineDAppro` ⇒ `MonterLocataireEnSurimpression<ChaineDApproScreenController>()` — la MÊME voie que ⑨ et c7
  (④/⑤ dépilés, l'Accueil non relu, aucun `session/open`).
- Inchangé : les `navigate_ids` restent ignorés (TD-982 ; pour ㉚, **TD-1015 reste OUVERTE** : il découvre son propre bâtiment). ㉚ n'est pas une
  trace pas à pas : c'est l'écran existant le plus proche qui montre l'objet (règle f2 du 11/11).

## Falsifiable (catégorie DecisionCarte — à JOUER au créneau)
- **G1** : 4 menées, 0 inconnue ; `Pour("supply_chain_trace") == ChaineDAppro`. Contrôles positifs : 106 retirée des menées ⇒ « non classée » VUE ;
  106 menée ET inconnue ⇒ VUE (l'ancien contrôle « inconnues vides » serait devenu inerte).
- **G2d** (EFFET, patron G2) : carte 106 + `navigate supply_chain_trace` ⇒ ㉚ monté (0 avant le geste), ④ refermé, Accueil non relu,
  0 inconnue, 0 `session/open`. Hors réseau, ㉚ tombe sur son état indisponible : on mesure son MONTAGE.
- **G3** : la liste des inconnues ne contient plus 106 ; ajout « aucune chaîne devinée » pour les vraies inconnues (contrôle de G2d).

## Statiques avant commit
`--tout` 17/17 ; `--controle` sur `NavigationApresGeste.cs` et sur le test ; témoin sans `--frais` rouge ; registre : TD-981 FERMÉE.
