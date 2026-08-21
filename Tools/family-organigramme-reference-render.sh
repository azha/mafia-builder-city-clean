#!/usr/bin/env bash
# family-organigramme-reference-render.sh — La Famille : l'organigramme, boucle ⊥ pixel-perfect
# (2026-08-21). Reproduit la méthode de Tools/hud-topbar-reference-render.sh (patron prouvé).
#
# Rend `family-organigramme-reference-source.html` (extrait ISOLÉ + mis à l'échelle du panneau
# Famille, voir ce fichier pour la provenance CSS ligne par ligne) via headless Chrome :
#
#   - viewport CSS 560 x <H> : 560 == la largeur RÉELLE de la card Unity (LieutenantScreenController
#     cardRt.sizeDelta.x, précédent DashboardController) dans le canvas référencé 1280x720
#     (AppShell.cs:386). La hauteur est mesurée empiriquement (contenu variable — 3 lieutenants +
#     Don + CTA) puis FIGÉE ici avec une assertion de taille (même garde que le précédent HUD).
#   - `--force-device-scale-factor=2` : sortie physique 2x — comparable pixel-à-pixel à une capture
#     Unity prise à une résolution 2x de la largeur-carte (mêmes unités des deux côtés, x2 physique).
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$DIR/family-organigramme-reference-1120.png}"
# PIÈGE MESURÉ (2026-08-21, en construisant ce script) : demander une fenêtre JUSTE À LA TAILLE du
# contenu produit un CROP (Chrome capture le VIEWPORT, pas la page entière — sans marge de sécurité
# généreuse, le rendu est TRONQUÉ en plein milieu d'un élément, silencieusement, aucune erreur). Une
# fenêtre trop proche de la hauteur réelle du contenu (essayé : 930 CSS px pour un contenu mesuré à
# 924.5 CSS px, marge de 5.5px seulement) a aussi produit un crop flaky (reproductible différemment
# selon le run) — cause non identifiée (métriques de police / timing de layout), non creusée plus
# avant. ⇒ Fenêtre TOUJOURS généreuse (1300 CSS px, très au-dessus du contenu ~925 CSS px mesuré),
# puis CROP du PNG à la bounding box réelle du contenu (mesurée par balayage pixel depuis le bas,
# comparé au fond --encre #0b1016 — PAS le fond de la .sheet #16191b, piège de mesure #1 de cette
# passe : comparer contre la mauvaise couleur de fond fait croire que tout est "contenu").
HEIGHT_GENEROUS=1300

google-chrome --headless=new --disable-gpu --hide-scrollbars \
  --screenshot="$OUT" \
  --window-size=560,"$HEIGHT_GENEROUS" --force-device-scale-factor=2 \
  "file://$DIR/family-organigramme-reference-source.html"

python3 -c "
from PIL import Image
im = Image.open('$OUT').convert('RGB')
w, h = im.size
px = im.load()
encre = (11, 16, 22)  # --encre #0b1016 — le fond de body, PAS celui de .sheet (#16191b)
def close(a, b, tol=3):
    return all(abs(a[i] - b[i]) <= tol for i in range(3))
last_row = None
for y in range(h - 1, -1, -1):
    if not close(px[0, y], encre):
        last_row = y
        break
assert last_row is not None, 'aucun contenu détecté — protocole cassé'
assert last_row < h - 50, f'contenu à {last_row}px sur {h} — marge insuffisante, augmenter HEIGHT_GENEROUS'
crop = im.crop((0, 0, w, last_row + 1))
crop.save('$OUT')
print(f'rendered+cropped: {crop.size[0]}x{crop.size[1]} -> $OUT (contenu détecté jusqu\'à la ligne {last_row}/{h})')
assert crop.size[0] == 1120, f'UNEXPECTED WIDTH {crop.size[0]} — protocole cassé, ne PAS utiliser cette image comme reference'
"
