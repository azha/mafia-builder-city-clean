# Addendum ① r8 — la ligne `[CHROME-ALIMENTE]` citée au dossier n'existe pas dans le client (Unity, 2026-09-06 21:05)

- Le dossier r8 cite, « par planche », `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` ·
  `[CHROME-CAPITALE] 19 px bande 27..45` · `[CHROME-ALIMENTE] montant=«9 627 820,00 €» jour=50 chaleur=«BURNING» phase=«Aube» district=16`.
  Ces lignes viennent **de la ligne GO de f2**, pas d'un journal que j'aurais lu. Unity mesure ce soir que **`[CHROME-ALIMENTE]` n'existe
  nulle part** (garde proposée, jamais implémentée) et que **l'identité est imprimée UNE fois à la connexion — par SUITE, pas par planche**.
- Ce qui tient : les trois planches ① de `43ac9cb` sortent d'UN run de la même suite (`VuePrincipaleCapturePlayModeTests`), donc
  l'identité imprimée à la connexion de ce run les couvre toutes trois ensemble ; le témoin ⑥ vient d'une autre suite. Les valeurs du
  bandeau que le juge a lues (9 627 820,00 € · JOUR 50 · Brûlant · Aube) sont MESURÉES sur l'image, pas tirées de la ligne.
- Ce qui ne tient pas : la preuve « par planche » revendiquée. Régime : identité par RUN, établie sur parole de f2 (GO), non relue
  par moi dans un journal ⇒ les findings « dépend des données : oui » du r8 (M7 `.bandeau-alerte`, m13, m15 barre de ratio) sont
  DATÉS à ce run, comme ceux de ⑨. Même remarque pour le dossier de la JD ① partielle, qui recopiait la ligne.
- Règle pour tout dossier à venir : **citer une ligne de journal seulement si elle est jointe (fichier) ; sinon écrire « déclaré par la
  ligne GO, non relu »**. Le cahier des charges (d) « identité par planche » est du code à écrire dans les 16 suites (Unity), pas une
  option de run — les prochaines lignes GO viendront avec leur dénominateur de couverture.

## Rectification (21:20, f2 — mesuré dans `correcteur/ecrans`)

**La ligne était RÉELLE** : `Assets/Tests/PlayMode/CaptureSousShell.cs:877` — `Debug.Log($"[CHROME-ALIMENTE] {nom} montant=«{montant}» jour={jour} …")`,
imprimée par `ChromeAlimenteOuEchoue(shell, nom, echecs)` (`:852`), appelée par `VuePrincipaleCapturePlayModeTests.cs:491` (la suite des trois
planches ① de `43ac9cb`) et `CarnetScreenPlayModeTests.cs:297`. Le marqueur prend le NOM de la planche : il s'imprime **par capture**.
Unity ne l'a pas trouvé parce qu'il cherchait dans SON arbre (`pilote-F`) — le marqueur ne vit que sur `correcteur/ecrans`. Chacun a
mesuré juste dans un arbre différent : même racine que tout le reste de la soirée (le travail du correcteur n'a atteint aucun arbre partagé).
⇒ La citation du dossier r8 tient ; **la règle « une ligne de journal ne se cite que JOINTE » est gardée** — elle vaut indépendamment du
fait que celle-ci était vraie. ⚠️ Et une limite de `captures-provenance.md`, nommée par le correcteur : il enregistre **le commit du PNG**,
pas **le SHA de l'ARBRE qui l'a rendu** — un fichier commité à 13:35 peut avoir été rendu par un arbre de la veille. Remède chez le
producteur (la suite imprime `git rev-parse HEAD` au moment du run — lot Unity, avec le (d)) ; d'ici là, la colonne « arbre de rendu »
des dossiers vaut « non imprimé ».
