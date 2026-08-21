#!/usr/bin/env bash
# family-bustes-render.sh — rasterise les 3 bustes silhouettes (homburg/fedora/casquette) de
# family-bustes-source.html en PNG transparents 256x256, importés comme Sprites Unity dans
# Assets/Resources/Lieutenant/ (PAS Assets/Art/ — ces 9 écrans opérationnels sont construits
# 100% à l'exécution, sans prefab ni scène : Resources.Load<Sprite> est le SEUL seam de livraison,
# même contrainte et même patron que Assets/Resources/DesignTokens.asset, cf DesignTokens.cs
# header. Le postprocesseur d'import W4P4aArtImportPostprocessor.cs est scopé à `Assets/Art/`
# et ne s'applique donc PAS ici — le Sprite import (textureType=Sprite, spriteImportMode=Single)
# est posé côté C# après ce rendu, voir implementation-notes.md § Bustes). Voir
# family-bustes-source.html pour la provenance CSS/SVG exacte.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$DIR/../Assets/Resources/Lieutenant}"
mkdir -p "$OUT_DIR"

for g in homburg fedora casquette; do
  OUT="$OUT_DIR/ui_element_buste_${g}.png"
  google-chrome --headless=new --disable-gpu --hide-scrollbars \
    --default-background-color=00000000 \
    --screenshot="$OUT" \
    --window-size=256,256 --force-device-scale-factor=1 \
    "file://$DIR/family-bustes-source.html?g=$g"
  python3 -c "
from PIL import Image
im = Image.open('$OUT')
print(f'{\"$g\":10s} -> {im.size[0]}x{im.size[1]} mode={im.mode}')
assert im.size == (256, 256), f'UNEXPECTED SIZE {im.size}'
assert im.mode == 'RGBA', f'pas de canal alpha ({im.mode}) — fond transparent manqué'
extrema = im.getextrema()
alpha_min, alpha_max = extrema[3]
assert alpha_max > 0, 'buste $g entièrement transparent — rendu vide'
assert alpha_min == 0, 'aucun pixel transparent — le fond n\'est pas transparent (silhouette pleine page ?)'
"
done
echo "3 bustes rendus dans $OUT_DIR"
