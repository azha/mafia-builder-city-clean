# Icônes du dock — provenance et dérivation (2026-09-23)

Source : atelier, `~/project/mafia-unity-DA/Tools/dock/icones/` (commit `f9e939af`), rastérisées depuis les SVG du canon
(`hud-brennar.html` l.197-201), contrôle bbox ≤ 1 px, alpha binaire. Trois existent au canon : Empire, Famille, Plus.
**Filière n'en a pas** (le 3ᵉ bouton du canon est « Marché ») : l'user choisit la variante sur la planche — emplacement vide.

| fichier client | source atelier | sha256 (16) de la source | bbox |
|---|---|---|---|
| `Assets/Art/Icons/Resources/DockIcons/dock_empire_64.png` | `dock_empire_64.png` | e4d6a004f27f9b6e | (10,10,54,54) |
| `…/dock_famille_64.png` | `dock_famille_64.png` | 7ba4c1b58a2c2e4e | (22,17,42,49) |
| `…/dock_plus_64.png` | `dock_plus_64.png` | 91d290125ab64bf2 | (13,13,51,51) |

**Dérivation (la seule) : RVB ← blanc, alpha INTACT** (vérifié pixel à pixel). Raison : le canon applique
`filter:brightness(0) invert(.78)` — `brightness(0)` jette la couleur de la source, seule la forme compte. Les rasters
livrés ne sont pas uniformes (Empire et Plus en (138,151,156), Famille en (237,240,241)) : teintés tels quels par une
`Image`, qui MULTIPLIE, ils rendraient ≈ (108,118,122) au lieu du 199 du canon, et Famille plus clair que ses voisins.
En blanc, la teinte `0,78` (sRGB) de `AppShell.AddTabButton` rend exactement `invert(.78)` — projet en linéaire, Unity
convertit la couleur de sommet lui-même, et l'alpha binaire ne mélange aucun pixel.

Taille : 64 px ≈ `Px(20)` = 65 (échelle 1280/392) — le 96 serait réduit de 1,47 sans mipmaps. Import : celui des icônes
de répartiteur (6777293b) — Sprite, sRGB, sans mipmaps, bilinéaire. GUID et spriteID tirés au hasard, prouvés absents
d'`Assets`, `Packages`, `ProjectSettings` avant écriture.

Reproduire : `python3 -c "from PIL import Image; im=Image.open(SRC).convert('RGBA'); b=Image.new('RGBA',im.size,(255,255,255,0)); b.putalpha(im.getchannel('A')); b.save(DST,optimize=True)"`
