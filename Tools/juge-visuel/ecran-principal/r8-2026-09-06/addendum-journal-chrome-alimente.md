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
