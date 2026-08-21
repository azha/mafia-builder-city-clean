#!/usr/bin/env bash
# hud-topbar-reference-render.sh — HUD v3.1 boucle ⊥ pixel-perfect (2026-08-21).
#
# Rend `hud-topbar-reference-source.html` (extrait ISOLÉ du markup+CSS de `.barre`, REUSE verbatim
# depuis atelier3d-mafia/hud-brennar.html — voir ce fichier pour la provenance exacte de chaque
# règle CSS citée en commentaire) via headless Chrome, À L'ÉCHELLE UNITY :
#
#   - viewport CSS 1280 x 80 : 1280 == la reference resolution du CanvasScaler Unity
#     (Assets/Scripts/Shell/AppShell.cs, `scaler.referenceResolution = new Vector2(1280, 720)`,
#     REUSE — tous les écrans du client la partagent). La barre elle-même a `height:52px` FIXE
#     (indépendant de la largeur) ; 80 est juste assez pour contenir le médaillon qui déborde du
#     bas de la barre (top:7px + height:64px = 71px) sans couper la légende "HEAT".
#   - `--force-device-scale-factor=2` : sortie physique 2560x160 — 2x exact de 1280x80. Choisi pour
#     que le PNG produit soit pixel-À-pixel comparable à une capture Unity prise à 2560x1440 (2x de
#     1280x720), SANS aucune remise à l'échelle des deux côtés — les coordonnées (padding 16px,
#     diamètre médaillon 64px, etc.) sont les MÊMES unités des deux côtés, juste x2 physiquement.
#
# Piège mesuré en construisant ce script : `--window-size=1280,104` (H=104 CSS px, un nombre "rond"
# en apparence) a produit un rendu ÉCRASÉ (barre visible sur ~5px puis fond violet de contrôle) alors
# que H=60/71/75/80 rendent correctement — cause non identifiée (soupçon : re-layout mi-capture sous
# charge). Le protocole retenu (H=80) a été RE-testé 2x, stable — ne pas changer cette valeur sans
# re-vérifier par capture, pas par raisonnement.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$DIR/hud-topbar-reference-2560.png}"

google-chrome --headless=new --disable-gpu --hide-scrollbars \
  --screenshot="$OUT" \
  --window-size=1280,80 --force-device-scale-factor=2 \
  "file://$DIR/hud-topbar-reference-source.html"

python3 -c "
from PIL import Image
im = Image.open('$OUT')
print(f'rendered: {im.size[0]}x{im.size[1]} -> $OUT')
assert im.size == (2560, 160), f'UNEXPECTED SIZE {im.size} — protocole cassé, ne PAS utiliser cette image comme référence'
"
