#!/usr/bin/env python3
"""La derniere carte de la liste est-elle COUPEE par le bord de son cadre ?
Methode : dans le rectangle de la carte, compter les pixels d'ENCRE (lum > seuil)
par rangee, et regarder si l'encre touche la derniere rangee de la carte.
Controle positif : la carte 1 (dont on VOIT qu'elle est complete) doit montrer
>= 8 rangees vides sous sa derniere encre. Controle negatif : la derniere carte."""
from PIL import Image
import os

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def encre_par_rangee(im, x0, x1, y0, y1, seuil=60):
    px = im.load()
    return [(y, sum(1 for x in range(x0, x1) if lum(px[x, y]) > seuil)) for y in range(y0, y1)]

CAS = [
  ('capture-1080x2400.png',            [('carte1',674,888),('carte2',906,1121),
                                        ('carte3',1139,1353),('carte4',1371,1585),
                                        ('carte5 DERNIERE',1603,1752)]),
  ('capture-ecran-seul-1080x2400.png', [('carte1',675,888),('carte5 DERNIERE',1603,1752)]),
  ('capture-ecran-seul-1080x1920.png', [('carte1',675,888),('carte2',906,1121),
                                        ('carte3 DERNIERE',1139,1272)]),
]

for f, cartes in CAS:
    im = Image.open(os.path.join(D, f)).convert('RGB')
    W, H = im.size
    print(f"=== {f}  taille={W}x{H} ===")
    for nom, y0, y1 in cartes:
        rows = encre_par_rangee(im, 70, 1010, y0, y1)
        avec = [y for y, n in rows if n >= 3]
        if not avec:
            print(f"  {nom:18s} y={y0}-{y1} h={y1-y0:4d}  AUCUNE ENCRE")
            continue
        derniere = max(avec)
        marge = y1 - 1 - derniere
        # encre sur les 3 dernieres rangees du cadre ?
        touche = sum(n for y, n in rows if y >= y1-3)
        print(f"  {nom:18s} y={y0}-{y1} h={y1-y0:4d}  derniere encre y={derniere}"
              f"  marge_sous_encre={marge:3d}px  px_encre_3_dernieres_rangees={touche}")
    print()
