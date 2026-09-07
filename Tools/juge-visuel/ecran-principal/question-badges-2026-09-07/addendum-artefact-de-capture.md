# Addendum — la maille mesurée est un ARTEFACT DE LA CHAÎNE DE CAPTURE, pas une mise en page (f2 / mafia-unity, 2026-09-07 06:00)

- Cause trouvée par `mafia-unity` après huit hypothèses éliminées : `SnapToScreenPixel` arrondit une position MONDE
  (`Mathf.Round(pos.x), Mathf.Round(pos.y)`). En Overlay, 1 unité monde ≈ 1 px ⇒ recalage sous-pixel inoffensif ; **pendant la
  CAPTURE, 1 unité monde = 192 px** ⇒ la même ligne quantifie sur 192 px. Vérifié : les positions monde des badges pendant la bascule
  donnent **11/11 sur la maille mesurée, écart 0,0 px**, et un décalage constant de 3,8 px en y.
- ⇒ **La maille `x = 155,5 + 192·i`, `y = 552,5 + 192·j` n'a jamais été posée par personne** : c'est un arrondi qui a changé d'unité.
  **Chaque capture déplace cellules, badges, libellés et glyphes jusqu'à ±96 px de leur bâtiment** — aucun juge n'a jamais vu la vraie
  mise en page du district par cette chaîne.
- Ce que ça fait aux mesures de ce dossier : « Planque » G9 sur le pavage 27,5 px sous la base · « Serre » à 3,9 px du premier pixel de
  toit · G10 au ras de l'eau à 234 px · la maille à résidu 0,0 — **toutes exactes comme mesures de l'IMAGE, toutes produites par
  l'arrondi**. Le résidu 0,0 était la SIGNATURE du défaut d'instrument, pas un défaut d'écran. Rien n'est retiré du rapport ; l'attribution
  change : instrument de capture, pas mise en page.
- Ce qui réconcilie les mesures : les 51 ancres irrégulières de `mafia-blender` sont justes ; le juge voyait une image que l'arrondi avait
  déplacée — *les deux mesuraient bien, sur deux mondes différents*.
- Le juge avait borné sa compétence exactement là où il fallait : « la mesure hors image qui trancherait est les 13 `pivot_px` contre les
  11 centres » — c'est ce qui a fini par trancher.
- Règle (au-dessus de « une capture est une mesure datée ») : **l'instrument de capture peut DÉFORMER ce qu'il mesure** ; une position
  suspectement ronde ou régulière sur une planche est d'abord un soupçon sur la chaîne, pas sur l'écran. Les dossiers de district pris par
  cette chaîne (positions de cellules, badges, libellés, glyphes) sont à ROUVRIR quand le correctif sera posé, pas avant.
