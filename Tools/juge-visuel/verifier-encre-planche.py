#!/usr/bin/env python3
"""Plancher d'ENCRE d'une planche avant de la donner à un juge (TD-541, 2026-09-06 : quatre planches de la base
étaient entièrement VIDES avec des tests verts — 0 pixel > 110). Seuil : part des pixels dont le canal max > 110
≥ 0,10 % (dérivé par le correcteur de la plus pauvre des 48 planches non vides : 0,518 %). Exit 1 si une planche
est sous le seuil. Contrôle négatif intégré : une image noire synthétique DOIT rendre 0,000 %."""
import sys
from PIL import Image
SEUIL = 0.10
def part_encre(im):
    im = im.convert('RGB'); px = im.getdata(); n = len(px)
    return 100.0 * sum(1 for r, g, b in px if max(r, g, b) > 110) / n
noir = Image.new('RGB', (64, 64), (0, 0, 0)); assert part_encre(noir) == 0.0, "contrôle négatif cassé"
ko = 0
for f in sys.argv[1:]:
    im = Image.open(f); p = part_encre(im)
    etat = 'OK' if p >= SEUIL else 'VIDE'
    if p < SEUIL: ko += 1
    print(f"{etat:4} {im.size[0]}x{im.size[1]}  encre {p:6.3f} %  {f}")
print(f"contrôle négatif (image noire) : 0,000 % ; seuil {SEUIL} % ; {ko} planche(s) VIDE(S)")
sys.exit(1 if ko else 0)
