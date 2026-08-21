# Verdict du juge visuel frais (district) — 2026-08-21, et ce qui en découle

Agent sans contexte, lecture seule, mandaté par ruling user (« un agent qui pop fraîchement et
qui fasse la comparaison à chaque fin d'écran »). Ses mesures viennent d'oracles PIL qu'il a
écrits lui-même, avec contrôles positifs ET négatifs.

**Verdict : NOT_APPROVED.** Et il a raison sur l'essentiel : le travail du tour portait sur le
titre, qui n'est pas le problème de cet écran.

## Les trois défauts de tête — tous STRUCTURELS, tous bloqués sur l'user

| # | constat | mesure |
|---|---|---|
| 1 | le fond livré est le rendu canon **avec tous les bâtiments supprimés** ; le jeu ne recompose que ceux du joueur | intersection avec la masse bâtie du canon = **0,6 %** (1 976 px / 321 008) ⇒ **99,4 % de ce qui fait ressembler la référence à une ville est absent** ; **5 parcelles sur 60** occupées |
| 2 | tout ce qui est composé forme UN amas en haut-gauche | sous y=708, la capture est **bit-identique** au fond — 0 pixel modifié |
| 3 | art de NUIT sur un fond de JOUR | `Assets/Art/District/Sprites/` = **54 PNG, 54 `_nuit`, 0 `_jour`** ; et aucune ombre portée (alpha binaire à 97,7 %) |

**Mesure indépendante qui corrobore (1) et la range** : le rendu Blender SOURCE est lui-même
**73,5 % plat**, aplat dominant `(104,112,128)` à **19,1 %** — contre **18,9 %** en jeu, même
teinte. ⇒ **L'intégration est fidèle** (elle est même un peu moins plate, les bâtiments du joueur
ajoutant du détail). **Aucun travail Unity n'améliore ce point.** C'est la décision DA (3) en
attente : que dessine-t-on sur les parcelles non bâties.

Le juge le formule mieux que moi : *« dans la référence, l'identité visuelle du quartier vient
surtout des bâtiments que le joueur NE POSSÈDE PAS, et rien ne les remplace »*.

## Ce qui a été corrigé le soir même (3 commits)

1. **`4b18d5b` — le titre** : marge de gouttière (`ShellChrome.GutterX`, définition unique), serif,
   halo. Le juge confirme : marge **RÉUSSIE** (encre à x=15, alignée au chip du bouton retour à
   1 px près), serif **FAIT** (hauteur de capitale 17 px, la plus grande de l'écran — hiérarchie
   correcte), halo **FAIT mais insuffisant** (voir §Reste ci-dessous).
2. **`44e3168` — l'aiguille du manomètre était INVERSÉE.** Le HUD annonçait « brûlant » sur une
   ville froide. Trouvé par le juge, confirmé deux fois indépendamment de ses pixels.
3. **`2c6c026` — la phase du jour affichait son enum de base** (`DAWN` à côté de `JOUR 1`).

## Reste à faire — ce qui est FAISABLE, avec sa mesure

### A. Le contenu de district déborde dans la gouttière — MESURÉ, NON CORRIGÉ

Le fond fait 1080 de large dans un viewport de 1200 ⇒ deux bandes de 60 px. Du contenu de
district y est dessiné :

    titre (chrome)      :  31 lignes, y  79..109, jusqu'à x=15   ← LÉGITIME (le chrome traverse)
    contenu de district : 427 lignes, y 110..536, jusqu'à x=0    ← DÉFAUT
    gouttière droite    :   0 ligne

Le juge ajoute que la garde existante `JugeD2_Backdrop_AlwaysCoversTheFullSceneRect_BehindTheFond`
est **structurellement aveugle** à ce défaut : elle prouve que le backdrop est *derrière* et
*couvre*, jamais que le premier plan reste *dedans*. Elle restera verte.

**Correctif retenu et NON APPLIQUÉ ce soir — et pourquoi.** Le bon geste est un nœud de découpe
(`RectMask2D`) calqué sur le fond, parent des CELLULES seulement (le nœud du fond n'est pas
touché ⇒ la bit-exactitude est préservée par construction). Analyse faite, la voie est sûre sur
un point non trivial : `SnapToScreenPixel` snappe la position **MONDE** (`:1063-1073`), donc
reparenter une cellule ne déplace pas son pixel à l'écran.

Mais il touche **trois invariants qui interagissent**, et c'est ce qui en fait un changement de
CONCEPTION plutôt qu'une retouche :

1. **L'espace local du cadrage initial.** `DistrictMapNavigation.cs:112-114` dit que le barycentre
   est exprimé « dans les unités locales de CETTE RectTransform, le même espace que
   `Cell_x_y.anchoredPosition` ». Reparenter change cet espace du delta de snap du fond (< 1 px) —
   petit, mais c'est exactement la dérive sous-pixel que cet écran a mis quatre tours à éliminer.
   Il faut ajouter la position du nœud de découpe aux positions collectées.
2. **10 ancres de test** cherchent `Cell_x_y` directement sous `DistrictScene`
   (`DistrictBackgroundPlayModeTests` ×2, `DistrictSocleFootprintPlayModeTests` ×2,
   `DistrictMapNavigationPlayModeTests` ×4, `DistrictInteriorDioramaPlayModeTests` ×2).
3. **La branche de repli** (aucun fond réel pour ce profil) doit quand même fournir un parent
   valide.

⇒ **À passer par un design + une revue ⊥**, pas à improviser. La falsifiable à écrire est nommée :
*aucun pixel de premier plan hors du rect du fond*, avec contrôle positif (retirer la découpe ⇒
rouge) — et surtout PAS une garde qui vérifierait « le masque existe » (leçon du soir : une garde
sur les paramètres d'un dispositif certifie le défaut).

### B. Le halo du titre est propre mais insuffisant — MESURÉ

Le juge mesure le profil d'assombrissement : `d=1 : +0,073 · d=2 : +0,080 · d=3 : +0,031 ·
d=6 : +0,007 · d=10 : 0,000`. Halo serré de ~2 px qui retombe à zéro — *« sobre, bien fait »*, et
il prévient explicitement : **ne pas l'élargir** (ça donnerait le pâté). Mais le gain réel est de
**×1,21** : 2,23:1 → **2,70:1**, sous le seuil de 3:1 des grands textes. ⇒ Le levier restant est
l'**opacité/noirceur**, pas l'étendue.

**Et le vrai défaut du titre, que je n'avais pas vu** : il est **à cheval sur la couture du
letterbox**. 109 de ses 167 px d'encre (65 %) sont sur la bande sombre, 58 sur le ciel. Contraste
côté gouttière **7,31:1**, côté ciel **2,70:1** — **une rupture de ×3 au milieu du même mot**.
C'est ça, « posé dessus » : il n'appartient ni au bandeau ni à l'art.

### C. L'horloge de la maquette — FORME F, cause mesurée

`city_sim_clock.game_minute` existe côté back et `session/open` le LIT
(`session/session.repository.ts:161`) — mais seulement pour en dériver `opened_game_day`, la
12ᵉ clé. Le client reçoit un JOUR, jamais une minute. ⇒ trou de PROJECTION, réparable par un lot
back qui ajoute la minute. Le commentaire du contrôleur (« aucune donnée client ne porte
l'horloge ») est EXACT aujourd'hui.

### D. Autres constats du juge, non corrigés

- **Un seul marqueur de lieutenant** visible, 69×83 px, dont **87 % sur la gouttière**, coupé net
  par le bord d'écran. Plus grave que « deux aplats beiges » : il y en a **un**, hors cadre.
- **Une cheminée dessinée par-dessus un nuage** du fond — la profondeur casse.
- **Arc du manomètre de forme différente** : capture = demi-cercle continu 0–180° ; maquette =
  jauge de ~120° en **deux segments** avec trou à 12 h. **Losange doré sous le manomètre : absent.**
- **Hauteur du bandeau** : +6,7 % (règle dorée à y=51/1200 contre 47,8 attendus).
- **Format monétaire** : maquette `$ 24 850`, capture `$10,000.00`.
- **Langue** : barre de navigation entièrement en anglais sous un bandeau français. Mesuré avant
  d'agir : le **canon nomme ces 5 onglets en anglais** (`global_conventions_core.md:197`), les deux
  locales GA sont `en-US`/`fr-FR`, la phase CONTENU a shippé EN avec FR en preview, et le français
  du bandeau vient de la maquette ratifiée. **Incohérence réelle, arbitrage PRODUIT** — remontée,
  pas tranchée.

## Ce que le juge dit de RÉUSSI — à ne pas casser

1. **Le transport du fond : SAD = 0,0**, registration `capture(x,y) = asset(x−60, y)`. Blit 1:1,
   zéro rééchantillonnage. **Ne plus toucher à la parité du conteneur ni à l'ancrage.**
2. **L'extraction plaque/bâtiments est chirurgicale** : ciel (y<175) et eau (y>1409) **octet pour
   octet identiques**, delta strictement borné à y=175–1409.
3. La marge de gouttière du titre, la sobriété du halo, la hiérarchie typographique (17/11/9 px).
4. **La carte d'ancrage est saine** : 60 parcelles, grille 10×6, pas régulier, `ppm_plan` cohérent.
5. Il relève que les notes d'implémentation **nomment elles-mêmes un « STOP produit non remonté »**
   et consignent le pis-aller DAWN/DUSK avec son détecteur de péremption — *« c'est la bonne forme,
   à garder »*.

## Ce que le juge n'a PAS pu vérifier — à ne pas confondre avec un feu vert

- Il n'a **pas épinglé les sprites par appariement de gabarit** (meilleur SAD ppm24 = 52,49, trop
  élevé). Le verdict « art de nuit » repose sur le **recensement** (54/54 `_nuit`) et sur le
  commentaire du contrôleur, **pas** sur un appariement.
- Sa comparaison de luminance jour/nuit est **confondue** (jeux de bâtiments différents) — il le
  dit et ne s'appuie pas dessus.
- **Une seule résolution jugée** (1200×1600). 1080×2400 / 1440×3200 : non vérifiés.
- Le **second marqueur de lieutenant** : il ne peut pas distinguer « hors écran » de « non rendu ».

---

## Complément mesuré après le verdict — le débordement ne « déborde » pas, il PERD du contenu

Le juge écrit qu'il voit **UN seul** marqueur de lieutenant et qu'il ne peut pas distinguer
« hors écran » de « non rendu ». Recompté indépendamment sur la capture, par balayage de la
teinte du marqueur `(242,209,143)` avec regroupement en amas :

    points de cette teinte : 1475
    amas trouvés           : 1 (le second a moins de 20 points, c'est du bruit)
    amas : centre (0,454), x 0..68

Un seul amas, **68 px de large** — alors qu'un marqueur en fait **85**. Il est donc **coupé par
le bord d'écran**, pas simplement posé sur la bande.

**Et le kit de départ en pose DEUX** : `onboarding-grant.service.ts:362,377` recrute un
`primary` ET un `understudy`, tous deux `assignedBuildingId: labBuildingId` — donc **deux
marqueurs sur LE MÊME bâtiment**, que le contrôleur rend « EXACTEMENT un par entrée »
(`DistrictInteriorScreenController.cs:61`, cas dégénéré dimensionné par C10-F1 : « 2 marqueurs
DISTINCTS sur 1 bâtiment, jamais 1 »).

⇒ **Inférence, à VÉRIFIER par lecture de scène** (`RenderedLieutenantMarkerCount` + la position
de chaque marqueur, via l'éditeur — non fait, la suite occupait Unity) : les deux marqueurs sont
posés côte à côte, le premier est rogné à x=0 et **le second est entièrement hors écran**. Tant
que ce n'est pas lu dans la scène, ça reste DÉDUIT.

**Si l'inférence tient, elle change la spécification du correctif de découpe** : découper ne
suffirait pas — ça cacherait proprement un marqueur au lieu de le montrer mal. Le vrai besoin est
que la mise en page des marqueurs **reste dans le fond** quand le bâtiment est au bord du
district. C'est une question de conception (où va un marqueur quand il n'y a plus de place à
gauche ?), et c'est exactement pourquoi ce chantier passe par un design plutôt que par une
retouche.
