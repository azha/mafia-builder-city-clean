# ㉚ Les deux gestes — implementation-notes (CLIENT-1, 11/11, implémenteur)

Base `lot/client1-gestes-30-2026-11-11` @d886738a, non commité. Aucun Unity lancé, aucune porte prise : typecheck hors porte + tests PlayMode ÉCRITS, JOUÉS demain. Preuves : `preuves.txt`.

## Deviations (quoi / pourquoi / ce que la spec disait)

1. **Cible de clic des lignes.** Le DESIGN §4 dit « le fond `Image` est déjà le raycast target » : FAUX dans ce code (`AjouterFond` pose `raycastTarget = false`). `PoserLeGeste` le passe à `true` sur les seules lignes de liaison et de route ; `Button.transition = None` (sinon la `disabledColor` de `ColorTint` repeindrait la ligne de route en reconstruction).
2. **Section « Les routes » et chaîne vide.** La condition « rien à remonter » devient « 0 maillon ET 0 liaison ET 0 route » (une route servie seule est rendue). La spec : « 0 nœud ET 0 liaison, inchangé » (écrite avant que les routes soient lues).
3. **Réponse de `maintain` / `rebuild` : un 2xx est un succès, quel que soit son corps.** Le patron du fichier (`dto == null ⇒ onErr(0, "corps vide")`) aurait fait lire un succès comme un « échec réseau » si `data` manque (le corps de `maintain` n'a jamais été mesuré, TD-1049). `LireGraphe` attrape aussi l'exception de `JsonUtility` (corps illisible ⇒ null, comme « corps vide »).
4. **Jeton après un succès structurel** (révisé après la revue ⊥ M2) : PAS de `Publier(1, true)` (fabrique un cap que le back ne sert jamais) ; `JetonDeStructure.DepenseLocalement()` n'incrémente que `Utilises` (`Connu` / `PlafondAtteint` inchangés), la marque n'est dessinée que si `Utilises == 0`, le mode reste actionnable (le back arbitre). Dette TD-1050 (BACK-1 : servir le cap ou relire le budget). Décision de f2 à prendre si Démolition / Délégation doivent le voir aussi.
5. **Jeton pris, phrase du cap non servie.** Le sous-titre du mode structurel éteint retombe sur la description du mode (jamais une phrase de refus écrite par le client).
6. **« on ne sait pas encore combien »** (`appro.cout.on_ne_sait_pas_encore_combien`) : aucun cadre ne le dessine ; mot posé dans la case du coût, mode éteint (couleurs de `.eteint`). À faire ratifier par f2 (DESIGN §6).
7. **« en entretien » ET « contournée » servis ensemble** (corps hors définition sûre) : « contournée » (déjà servie) garde la place, « en entretien » est supprimé (E3).
8. **Ombre du panneau** (`box-shadow:0 -6px 18px #0009`) NON rendue : aucune recette d'ombre au catalogue, effet de nuance (classe C).
9. **Voile.** Teinte = le jeton `hudGaugeFaceOuter` (à 2/255 de `#0b1016`) ; alpha = `DashboardController.AlphaLineaireDuVoile(0xb3/255)` ≈ 0,93 (la conversion du voile de scène, noir quasi pur). Le voile BARRE le clic mais ne ferme pas la feuille (seul « Annuler » ferme). Les nombres de la garde G-S2 (encre `#efe6d4` ~71 sous le voile, ~126 si l'alpha CSS était recopié) sont CALCULÉS, pas mesurés : à relire au premier run.
10. **Visibilité.** Les huit couleurs du cadre 154 du contrôleur passent de `private` à `public static` (la feuille et les tests les lisent : aucun `InternalsVisibleTo`) ; `FiletLiaison` et `Hex` à `internal`.
11. **Routes `draft` jamais dessinées (E1) ; un état hors domaine EST dessiné** (mot générique `Repli.Etat`, en dernier), comme les bandes hors domaine des maillons.
12. **Corps de `maintain`** `{mode}` : lu dans la docstring du poseur (V15 @74c5a0b0), pas mesuré (TD-1049).
13. **`CoutureHorsTests` (aucun `*PourTest(` appelé depuis `Assets/Scripts`)** : la garde n'est PAS sur cette branche (commit 8294c54e, non ancêtre) ; vérifié à la main : 4 nouvelles occurrences `*PourTest(`, toutes des DÉCLARATIONS.
14. **`.meta`** des trois fichiers neufs écrits à la main (GUID aléatoires, format des voisins) ; Unity les complètera à l'import.
15. **Typecheck des tests** : `--frais Operational --frais CitySim --frais Shell` (les DLL de `Library/` sont périmées pour `Shell` et `CitySim` : sans cela, 69 faux rouges sur des symboles que je n'ai pas touchés).

## Corrections de la revue ⊥ (revue-1.md)
- **B1** : « Remaniement » / `MODERATE_RESTRUCTURE` RETIRÉ (ruling f2 : même recalcul que Petit détour) ; la feuille « Reconstruire » a DEUX modes ; 20 clés neuves ; une ligne de coût du back sans mode à la feuille est ignorée (test B1).
- **M1** : le panneau s'ancre à `ShellChrome.BottomInsetPx` (le voile reste plein écran) ; test M1 avec inset publié ≠ 0, remis à 0 au TearDown.
- **M2** : voir déviation 4. **m1** : le contrôle du mode éteint asserte `interactable == false` et l'absence de code/message d'erreur posé. **m4** : `maintaining` lu au PREMIER niveau de l'objet seulement (test D6b). **m5** : `gesteEnCours` retombe dans un `finally`.
- **m2** (seuils G-S2 calculés, jamais mesurés) : trou honnête LAISSÉ, seuils inchangés ; à ré-ancrer et à coller dans `preuves.txt` au premier run.
- **m3** (le contrôle S1 passe par le prédicat de la garde, pas par un `CanvasRenderer` réellement retiré : Unity refuse sous une `Image` vivante) : gardé tel quel, noté.
- **m6** (classe C, consigné, ni correctif ni tour de juge) : `.gr30-bandes` rendu par un seul texte riche au lieu de deux spans qui se replient ; panneau de feuille sans défilement en cas de débordement (à regarder en EN au premier run). Rattaché à TD-1043 dans `dettes-client1.md`.

## Ce qui n'est PAS fait / PAS prouvé
- Aucun test n'a TOURNÉ. Les gardes S2 (pixels) et E1/E2 (vrai back : signup + cible inexistante ⇒ 4xx) sont les plus exposées : à jouer en premier.
- Aucune capture, aucun juge visuel (porte interdite ce soir).
- Aucun coût servi ⇒ le chemin actif n'est prouvé QUE par injection (`CoutsDeTest`).
