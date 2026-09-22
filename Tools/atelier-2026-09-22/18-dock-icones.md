# Le dock — les quatre icônes : trois existent déjà dans le client, une manque (Filière)

> Atelier / DA, 2026-09-23. Rien produit (attente du go de l'orchestrateur). Constat de départ (CLIENT-1, F13 du juge r1 de ⑯) : les ronds
> du dock sont vides. **Canon** : `hud-brennar.html` (HUD v3.1, validé user, `5983267`, 2026-08-20), dock l.197 : Empire · Famille · Marché ·
> Plus, chaque icône un PNG embarqué 32×32, rendu `width:20px ; filter: brightness(0) invert(.78)` (l.114). **Dock ratifié** : Empire ·
> Famille · **Filière** · Plus. Client : arbre F `b82c3b9e`.

## 1. Les icônes du canon SONT dans le client — au pixel près

Chaque PNG du canon extrait, puis comparé à tout PNG de ≤ 256 px trouvé dans l'atelier, le client (`Assets`, `Tools`) et `assets_sprites`
(801 candidats), par le masque alpha réduit à 32×32 ; le meilleur vérifié ensuite en RGBA complet.

| dock (canon) | fichier du client, identique | écart RGBA max | ce que le client en fait aujourd'hui | source vectorielle |
|---|---|---|---|---|
| **Empire** | `Assets/Art/Icons/icon_building_office_32.png` | **0** | le bâtiment « bureau » (en 48 sous `Resources/BuildingIcons/`) | `Assets/Art/Icons/Source/icon_building_office.svg` |
| **Famille** | `Assets/Art/Icons/icon_more_menu_recruitment_32.png` | **0** | l'entrée « recrutement » du menu Plus ; **aucune** copie sous `Resources` | `…/Source/icon_more_menu_recruitment.svg` |
| Marché | `Assets/Art/Icons/icon_building_front_shop_32.png` | **0** | la façade (en 48 sous `Resources/BuildingIcons/`) | `…/Source/icon_building_front_shop.svg` |
| **Plus** | `Assets/Art/Icons/icon_more_menu_settings_32.png` | **0** | l'entrée « réglages » ; **aucune** copie sous `Resources` (même dessin que `icon_node_type_production_32`) | `…/Source/icon_more_menu_settings.svg` |

⇒ **« Aucune des quatre n'est livrée dans `Assets` » est inexact** : les quatre y sont, à l'octet de pixel près. Ce qui manque, c'est le
**montage** (joignables au runtime, et un lecteur : le dock). Elles viennent des deux lots d'icônes du 15/08 (`57e1a610` pour le bureau et la façade, `dc7d8d7c` « 23 icônes — navigation et
identité d'entité » pour le recrutement et les réglages) : SVG 24×24, aplats `#eef1f2`, rastérisés en 16/24/32/48.

**Montables tels quels ? Oui pour le dessin, non pour la taille.** Le dock dessine l'icône à **20 CSS px** ; à l'échelle du chrome
(`AppShell.Px(css) = css × 1280/392`, ×3,27) cela fait **≈ 65 px** à l'écran. Le plus grand raster livré fait 48 px : agrandi ×1,36, il
bave. ⇒ Rastériser les trois SVG à **64 px** (et 96 pour les écrans denses) depuis leur source — c'est le travail de l'exportateur
d'icônes du client (`IconRasterExporter`, qui réécrit un raster **là où il vit** depuis `1fb6148`), ou d'un rastériseur PIL. Le dessin ne
change pas. Montage : sous `Assets/Art/Icons/Resources/<…>/` (jamais `Assets/Resources/`), `.meta` déplacé avec le fichier.

⚠️ **Deux choses à savoir en montant** :
- **Double sens** : « Empire » réutilise l'icône du bâtiment « bureau », et « Plus » celle des réglages (identique à celle du nœud de
  production). C'est le choix du canon validé ; un joueur qui voit le même dessin sur la fiche d'un bureau et sur l'onglet Empire lira un
  lien qui n'existe pas. À dire à l'user, pas à corriger en douce.
- **La teinte** : le canon force l'icône en gris par `brightness(0) invert(.78)` (≈ `#c7c7c7`, sRGB) et non en `#eef1f2` ; l'onglet
  actif garde la même teinte (sa marque est la pointe, `.pointe`). Côté Unity : `Image.color` à ce gris, espace de couleur du projet
  (linéaire) — convertir, ne pas recopier la valeur sRGB.

## 2. La manquante : **Filière** — la forme proposée, dans le vocabulaire des trois autres

Aucune icône de filière n'existe : ni au canon (le dock du canon dit « Marché »), ni dans les 84 SVG du client (balayage des noms : rien
qui dise filière, chaîne, maillon, appro), ni dans `Tools/fal` (l'icône de l'application seulement).

**Ce que l'icône doit dire** : ㊵ La filière est l'écran des **maillons** (« Où en est chaque maillon », série 6 cadre 142) — une suite
d'étapes reliées. Le vocabulaire des icônes du client : un **24×24**, `#eef1f2`, 1 à 4 primitives (cercle, polygone, rectangle), en aplat ou en trait
de **2 unités** au moins (la façade et la planque sont en trait de 2) — à 20 CSS px, un trait plus fin disparaît ; lisible en silhouette grise.

**Proposition** — trois nœuds reliés, le dernier en pointe (la marchandise avance) :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
<rect x="3" y="10.6" width="17" height="2.8" rx="1.4" fill="#eef1f2"/>
<circle cx="5" cy="12" r="3.2" fill="#eef1f2"/><circle cx="12" cy="12" r="3.2" fill="#eef1f2"/>
<polygon points="16.2,7.4 22,12 16.2,16.6" fill="#eef1f2"/>
</svg>
```

- Pourquoi des nœuds et pas des maillons de chaîne : une chaîne se dessine en **anneaux** (des traits), qui s'empâtent à 65 px en gris ;
  trois disques pleins et une pointe restent lisibles à 16 px. (Les nœuds de filière du client, `icon_node_type_*`, sont un engrenage,
  un hexagone et une maison : ils disent le TYPE d'un nœud, pas la suite des nœuds — d'où une forme à part.)
- Pourquoi la pointe : sans elle, trois disques alignés se lisent « … » (plus) ; la pointe donne le **sens** du flux.
- Contrôle à faire sur la planche : la silhouette ne doit pas se confondre avec `icon_slot_dependency_arrow` (une flèche de dépendance,
  déjà au client) — les deux se regardent côte à côte avant validation.

**Coût, sans Blender** (même chemin que les silhouettes du 02/09) :

| étape | qui | coût |
|---|---|---|
| poser le SVG ci-dessus dans `Assets/Art/Icons/Source/icon_dock_filiere.svg` (+ 2 variantes : pointe à gauche, nœuds carrés) | atelier | 20 min |
| **planche** : les 4 icônes du dock côte à côte, en gris `invert(.78)` sur le verre du dock, à 16 / 20 CSS px, + `icon_slot_dependency_arrow` en témoin | atelier (PIL, sans navigateur) | 30 min |
| **regard de l'user** sur la planche — le rastériseur prouve l'absence de crop, pas le dessin | user | un regard |
| rastériser 16/24/32/48/64/96 depuis le SVG retenu | atelier (PIL) ou client (`IconRasterExporter`) | secondes |
| monter les 4 dans le dock (Resources + lecteur) | client | lot du dock |

**Total atelier ≈ 1 h + un regard.** Rien n'est lancé avant ton go.

## 3. À trancher (user)

1. **Le dessin de Filière** (§2) — sur planche.
2. **Le double sens** Empire = bureau, Plus = réglages / nœud de production (§1) : garder le canon, ou dessiner des icônes propres au dock.
3. Rappel : les dossiers de juge classent aujourd'hui « ronds du dock vides » en **arbitrage user**. Le montage le ferme.

## 4. GO livré (2026-09-23) — tout sous `Tools/dock/`, rien sous `Assets/` (CLIENT-1 monte)

| quoi | fichier |
|---|---|
| le rastériseur (PIL, ×16, sans navigateur) | `Tools/dock/rasterise-icones-dock.py` |
| les 3 variantes de Filière | `Tools/dock/source/icon_dock_filiere.svg` (A · nœuds et pointe), `…_carre.svg` (B · nœuds carrés), `…_maillons.svg` (C · maillons, en trait comme le bureau et les réglages) |
| les rasters 64 et 96 | `Tools/dock/icones/dock_{empire,famille,plus,filiere,filiere_carre,filiere_maillons,temoin_dependance}_{64,96}.png` — 14 fichiers |
| la planche pour l'user | `Tools/dock/planche-dock-2026-09-23.png` (script `Tools/dock/planche-dock.py`) |

**Contrôles** (sortie de `rasterise-icones-dock.py`, 0 défaut) :
- **bbox contre la géométrie** : les 14 rasters tombent à ≤ 1 px des bornes calculées sur le SVG (demi-trait compris).
- **forme contre le client** : re-rendues à 32 px et binarisées, les trois icônes existantes diffèrent des 32 px du client de **0**
  (Empire), **2** (Famille) et **16** (Plus, 8,7 %) pixels. ⚠️ Mesuré au passage : les rasters du client sont **binaires** (alpha 0/255,
  sans anticrénelage) — une comparaison en niveaux de gris accusait l'anticrénelage, pas le dessin. Les 16 pixels de l'engrenage sont un
  liseré : le client dessine le trait plus mince que son SVG ; nos 64/96 suivent le SVG (contrôle bbox). Le dessin n'est pas changé.
- **teinte** : la planche pose les icônes en gris `invert(.78)` = (199,199,199), relu sur le pixel le plus opaque de chaque icône.

**La planche** : le dock réel du canon du HUD (validé), les ronds nettoyés, nos icônes à 20 CSS × 3 = 60 px ; trois rangées (A, B, C), une
rangée témoin (la flèche de dépendance à la place de Filière) ; la légende pose les deux décisions à trancher d'un coup (forme de Filière,
double sens Empire = bureau / Plus = réglages = nœud de production).
