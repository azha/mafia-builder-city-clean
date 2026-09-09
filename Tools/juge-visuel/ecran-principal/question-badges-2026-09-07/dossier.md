# Dossier — QUESTION DE JUGE : les badges de bâtiment tombent-ils sur leur bâtiment ? — ① vue de district, NUIT — 2026-09-07

> ⚠️ Ce n’est pas un tour de conformité (aucune maquette ratifiée ne dessine la position des badges sur cette vue) : c’est UNE question
> géométrique, posée par `mafia-blender` qui refuse de la trancher elle-même (elle lit un recadrage et vient de passer trois heures dans
> ce code — *un juge qui hérite du contexte hérite des angles morts*). Tu réponds avec des MESURES sur l’image, rien d’autre.

## Le matériel

- `capture-nuit-1080x1920.png` — la vue de district de NUIT (écran ①, `DistrictInteriorScreenController`), 1080×1920, **13 bâtiments**,
  écrite le 2026-09-07 à 01:17:03 par un chemin de capture réparé (`3d1c679`) — c’est la première planche de nuit jamais ÉCRITE par un run
  batchmode (`ScreenCapture.CaptureScreenshot` n’écrivait rien en batchmode ; l’ancienne planche du dépôt datait du 25/08, 1200×1600).
  Provenance et empreinte : `captures-provenance.md`. Le journal du run n’est pas joint ; identité non établie ⇒ les VALEURS (noms, types)
  ne se comparent à rien ; la GÉOMÉTRIE se mesure.
- Aucune référence : la seule maquette ratifiée de ① est le HUD (gros plan, sans marqueurs). Le chrome (bandeau, dock) est hors question.

## La question, en trois parties

1. **Inventaire des badges** : chaque badge (une plaque avec un libellé — « Planque », « Serre », « Kiosque »… — et peut-être un glyphe) :
   son libellé lu, sa boîte d’encre, et son **point d’ancrage bas-centre** (milieu de son bord inférieur), en px.
2. **Inventaire des bâtiments** : chaque masse bâtie visible (façade, toit, fenêtres éclairées, enseigne) : boîte, et la **surface au sol**
   (la base de la façade) quand elle est lisible ; distingue **bâtiment / toit vide / rue / trottoir / végétation / eau** par ce que
   l’image montre (texture, éclairage, perspective). Déclare ta méthode (histogramme, segmentation par teinte, contours) et son contrôle
   positif (un bâtiment évident, une rue évidente).
3. **Appariement** : pour chaque badge, **ce qui se trouve SOUS son point d’ancrage** et dans un rayon de 40 px : `BÂTIMENT` (et lequel)
   · `TOIT VIDE` · `TROTTOIR / RUE` · `AUTRE`, avec la distance au bâtiment le plus proche quand il n’est pas dessus. Les deux cas que
   blender signale sans les affirmer : **« Planque » lu sur le trottoir devant le kiosque** et **« Serre » sur une zone de toit vide** —
   confirme, infirme, ou dis pourquoi l’image ne permet pas de trancher.

## Une hypothèse à TESTER, pas à croire

Le code (rapporté par blender, non lu par toi) ancre chaque badge en `anchorMin = anchorMax = pivot = (0.5, 0)`, `anchoredPosition =
(0, 26 × 0,55)` ⇒ **bas-centre, posé sur un point `pivot_px` du bâtiment**, indépendant de la largeur de cellule. Si tes 13 points
d’ancrage tombent tous à la même hauteur relative des bâtiments (par exemple tous ~14 px au-dessus d’une base), l’hypothèse tient et un
badge « à côté » désigne un `pivot_px` faux ; s’ils sont dispersés, c’est autre chose. Écris ce que tu observes.

## Ce que tu rends — `rapport.md`

```
# Question de juge — badges de ① (nuit) — 2026-09-07
## Réponse en trois lignes (les deux cas nommés + le compte : N badges sur 13 sur leur bâtiment)
## Méthode déclarée (segmentation, contrôles positif/négatif)
## Table par badge : | # | libellé | boîte d’encre | ancrage bas-centre (x,y) | sous l’ancrage | bâtiment le plus proche + distance | verdict |
## Table par bâtiment : | # | boîte | base au sol | badge(s) porté(s) |
## L’hypothèse d’ancrage : tenue / réfutée / indécidable, avec les 13 hauteurs relatives
## Non vérifié (jamais vide : pas de pivot_px imprimés, pas de scène 3D, une seule résolution, identité non établie… et la mesure hors image qui trancherait — les 13 `pivot_px` du run contre tes 13 ancrages)
## Annexes : scripts + sorties (mesures/)
```
Ids `G1…Gn` pour les badges, `T1…Tn` pour les bâtiments. Un chiffre non produit par un script est « estimé à l’œil ».
