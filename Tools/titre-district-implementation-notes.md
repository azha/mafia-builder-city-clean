# Titre de district — marge, serif, halo (2026-08-21, soir)

Point de départ : la capture de livraison `Assets/Screenshots/vue_principale_batiments_hud.png`
montrait trois choses que je n'aimais pas et une que je n'avais pas vue.

## Les trois défauts, mesurés

| # | défaut | mesure |
|---|--------|--------|
| a | le titre commence au **pixel 1**, le « V » rogné | premier pixel non-fond à `x=1` sur la ligne `y=84` ; le bouton de retour du bandeau, lui, commence à `x=15` |
| b | sans-serif, alors que la DA met les titres d'écran en serif | l'en-tête « LA FAMILLE » du même corpus est en serif (`ecran-famille-mesures.md:167-168`) |
| c | **2,19:1** de contraste sur le ciel pâle | glyphe `(238,241,242)` · ciel `(150,164,183)` · silhouette `(34,38,49)` → 13,19:1 sur la silhouette, 2,19:1 sur le ciel |

(c) est le seul défaut *fonctionnel* des trois, et c'est celui qui commande la forme du
correctif : le fond est **peint** et il **défile** (pan, zoom, quart du jour, district). Aucune
couleur de texte fixe n'est lisible sur les deux extrêmes — le problème n'est pas réglable en
changeant la teinte, il faut intercaler quelque chose.

## (a) — la gouttière a maintenant UNE définition

`TopBarController.BarPaddingX = 16f` existait, mais **privée, dans l'assembly `Shell`**. Or
`Shell` référence `CityMap`, donc un locataire ne peut pas lire une constante du shell :

    error CS0234: The type or namespace name 'TopBarController' does not exist in the
    namespace 'MafiaCleanCity.Shell' (are you missing an assembly reference?)

D'où `ShellChrome.GutterX` dans **`ShellContracts`** — la seule assembly que les deux voient,
et l'endroit conceptuellement juste (une gouttière est une contrainte que le chrome IMPOSE,
au même titre que `IShellTenant`). `BarPaddingX` la lit désormais : les ~30 sites d'appel du
bandeau ne bougent pas, et il n'y a plus qu'une définition. Un `16` recopié aurait vieilli seul.

## (c) — et c'est là que j'ai eu tort, deux fois

### Premier tort : un halo qui ne produisait rien

J'ai posé l'ombre à `dilate = 0,2` et écrit une falsifiable qui vérifiait qu'elle était
**activée**, **opaque** et **dilatée**, en tuant nommément deux mondes dégénérés (alpha nul,
étendue nulle). **Les trois propriétés étaient vraies. Le halo ne produisait aucun pixel.**

Deux mesures indépendantes le disent :

**(1) Deux captures ne différant que par la ligne d'appel du halo** (une seule variable — le
titre n'a pas bougé, la boîte de différence fait `(15,79,97,98)`, donc seuls les glyphes
changent) :

    sans halo : luminance d'anneau 0,2709
    avec halo : luminance d'anneau 0,2712

**(2) Balayage en rendu hors-écran**, sur le ciel pâle mesuré `(150,164,183)`, en comptant les
pixels plus sombres que le fond :

    dilate 0,0 → 0 px    0,2 → 0 px    0,4 → 94    0,6 → 204    0,8 → 299    1,0 → 340
    luminance minimale : 0,613 · 0,558 · 0,497 · 0,423 · 0,329 · 0,210   (à alpha 0,9)
    à alpha 1,0 / softness 0 : 0,481 · 0,369 · 0,187 · 0,000  (pour 0,4 / 0,6 / 0,8 / 1,0)

À `0,2`, le réglage est valide, non nul, dans son domaine, documenté — et **inerte**. Le seuil
d'existence de l'effet ne se déduit pas de la plage du paramètre.

### Le mécanisme concurrent, essayé et réfuté

Le **contour** (`_OutlineWidth`) semblait le choix naturel. La même sonde le tue : il est tracé
**à l'intérieur** du bord SDF, donc il ronge la lettre sans jamais devenir sombre.

    outline w0,10 → 195 px clairs, luminance min 0,637
    outline w0,20 →  90 px clairs, luminance min 0,566
    outline w0,30 →  28 px clairs, luminance min 0,371   (la lettre est détruite)

Le halo passe **derrière** : c'est ce qui le rend seul capable de la propriété. Retenu :
`alpha 1,0 · dilate 1,0 · offset 0/0 · softness 0,05`. Le décalage est **nul sur les deux axes**
délibérément — une ombre directionnelle ne protège qu'un côté, et l'art défile sous le titre.

### Second tort : mon instrument de mesure

Trois versions de la sonde de contraste ont rendu « **100 % des pixels sous le seuil** », un
verdict d'apparence catastrophique et entièrement faux :

- **v1** minimum sur tous les voisins → trouve toujours **un autre pixel du glyphe** (1,00:1) ;
- **v2** minimum sur les voisins hors-glyphe → trouve toujours la **frange d'anti-crénelage** (1,02:1) ;
- **v3** maximum sur un anneau à 3 px → **encore la frange**, par l'autre bout.

Le lissé entoure chaque glyphe : tout ce qui interroge « le voisin » le rencontre d'abord. Le
remède n'est pas de filtrer l'artefact mais de **sauter la zone où il vit** (bande morte de 2 px),
et surtout de **nommer la grandeur qui doit bouger** : le halo ne change pas le contraste
glyphe↔art (le glyphe garde sa couleur), il **intercale**. La bonne mesure est donc *anneau
proche vs art alentour*.

Et la v4, correcte, a réfuté la comparaison qu'elle devait servir : mes captures « avant » et
« après » n'étaient **pas comparables**, le titre ayant bougé de 16 px et ne reposant plus sur le
même art. C'est de là que vient l'expérience à une seule variable ci-dessus.

## Résultat

    anneau              0,2712 → 0,2223
    glyphe / anneau     2,79:1 → 3,40:1
    anneau sous l'art   +0,0778 → +0,1267

Instrument commité : `Tools/mesure-contraste-titre.py` (il porte ses trois versions fausses en
commentaire — elles sont plus instructives que la bonne).

## Falsifiables, et pourquoi il en faut DEUX

- **nav-district-F12** — la FORME : marge lue sur le rect *rendu* (pas sur le champ qu'on vient
  d'écrire), serif, interlettrage, halo actif/opaque/étendu, matériau partagé de la fonte serif
  **sans** halo.
- **nav-district-F13** — l'EFFET : rend le matériau **réel** du titre sur le ciel pâle mesuré et
  **compte les pixels**. Une sonde qui se re-paramètrerait elle-même prouverait que TMP sait faire
  un halo, pas que *ce* titre en a un. Plancher anti-vacuité sur les pixels **clairs** avant de
  compter les **sombres** : sans glyphe rendu, « 0 sombre » serait vrai pour rien.

**Contrôles positifs, tous exécutés :**

| contrôle | geste | résultat |
|---|---|---|
| A | marge neutralisée | F12/E1 **rouge** — `Expected: 16.0 ± 0.5, But was: 0.0` |
| B | ligne serif retirée | F12/E2 **rouge** — `DejaVuSans SDF` au lieu de `DejaVuSerif SDF` |
| C | appel du halo retiré | F12/E3 **rouge** — mot-clé absent |
| D | `fontSharedMaterial` au lieu de `fontMaterial` | F12/E4 **rouge** — `Expected: False, But was: True` |
| E | `dilate` remis à 0,2 | **F13 rouge (`0 px`) et F12 VERTE** |

Le contrôle E est le seul qui compte vraiment : il démontre que la garde de forme **certifiait le
défaut**. Les deux gardes ne sont pas redondantes.

Le contrôle D a aussi trouvé une **tautologie** dans ma propre falsifiable : j'assertais
`AreNotSame(matériau partagé, instance)`, et elle est restée **verte avec la faute en place**,
parce que `instance` est lu par le TEST via `title.fontMaterial`, qui fabrique l'instance
lui-même quoi qu'ait fait le contrôleur. Elle observait l'API de TMP, pas le code testé. Retirée.
Mesure qui la remplace : `hudSerifFont.material` et `title.fontSharedMaterial` sont **le même
objet** (instance id 49846, `ReferenceEquals == True`), donc asserter que l'asset est propre EST
le détecteur.

## ⚠️ Deux pièges payés en chemin

**Le contrôle D a contaminé le dépôt.** Armer la faute a fait écrire l'underlay sur l'asset de
fonte **partagé**, que trois écrans consomment. `md5sum` juste après le run rendait la valeur
d'origine — l'éditeur a écrit **plus tard**, à la sauvegarde suivante. Un rechargement de domaine
puis un **réimport forcé** n'ont rien restauré (l'objet chargé survit aux deux). Le rétablissement
se fait **par le dépôt d'abord** (`git checkout`), **puis** réimport — dans cet ordre, sinon le
réimport relit le fichier encore sale.

**Un filtre de test qui ne matche rien rend un run VERT.** Le premier lancement de F12 avec le
nom court a rendu `total: 0, passed: 0, resultState: Passed`. Il faut le **nom complet**
(`MafiaCleanCity.CityMap.Tests.…`), et **lire `total`** avant de lire `passed`.

## Réparations de jointure trouvées en passant

- La prose du contrôleur annonçait encore « **EXACTEMENT 2 enfants directs** » alors que le
  backdrop en a fait 3 le matin même — un texte laissé intact dans un fichier corrigé devient
  faux dès que la correction déplace ce qu'il référence.
- `VuePrincipaleCapturePlayModeTests.cs` était commité **sans son `.meta`** : GUID regénéré à
  chaque clone.
- L'atlas de `DejaVuSerif SDF` grossit dans le même commit (TMP y rasterise à la demande les
  glyphes que le titre introduit). Le **matériau** est vérifié intact : `dilate 0`, `softness 0`,
  `_UnderlayColor a: 0.5` — les valeurs du disque. ⚠️ Conséquence à connaître : cette fonte est
  **dynamique**, donc un run de tests peut salir un asset commité. Si la churn devient gênante,
  la réponse est de pré-rasteriser un jeu de glyphes fixe, pas d'ignorer le fichier.
