# -*- coding: utf-8 -*-
"""m14 — couleur PURE du trait des pastilles : coupe transversale, on imprime chaque pixel.
Une mediane sur 'les plus clairs' d'un trait fin melange le fond ; ici on LIT la coupe.
Contrôle positif : le fond de part et d'autre du trait doit valoir ~(13,13,13).
Contrôle negatif : si tous les pixels de la coupe etaient identiques, la sonde ne verrait pas de trait.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D, 'capture-1080x2400.png')).convert('RGB')
print("OUVERT capture taille=%s" % (im.size,)); px = im.load()

def coupe(nom, y, x0, x1):
    print("-- %s : coupe horizontale y=%d, x=%d..%d" % (nom, y, x0, x1))
    print("   " + " ".join("%d:(%3d,%3d,%3d)" % (x, px[x, y][0], px[x, y][1], px[x, y][2]) for x in range(x0, x1+1)))
    best = max(range(x0, x1+1), key=lambda x: sum(px[x, y]))
    print("   pixel le plus clair : x=%d RGB=%s" % (best, px[best, y]))
    return px[best, y]

# rail GAUCHE des pastilles, a mi-hauteur
a = coupe('Charge  seg1 ALLUME  (y=418)', 418, 422, 436)
b = coupe('Charge  seg4 ETEINT  (y=418)', 418, 563, 577)
c = coupe('Faible  seg1 ALLUME  (y=700)', 700, 279, 293)
d = coupe('Critique seg1 ETEINT (y=530)', 530, 279, 293)
# rail HAUT (epaisseur)
print()
def coupev(nom, x, y0, y1):
    print("-- %s : coupe verticale x=%d, y=%d..%d" % (nom, x, y0, y1))
    print("   " + " ".join("%d:(%3d,%3d,%3d)" % (y, px[x, y][0], px[x, y][1], px[x, y][2]) for y in range(y0, y1+1)))
coupev('Charge seg1, rail haut', 445, 400, 412)
coupev('Faible seg1, rail haut', 310, 684, 696)
print()
print("CONTROLE POSITIF fond a 10 px a gauche des pastilles : (427-12)=%s / (284-12)=%s"
      % (px[415, 418], px[272, 700]))
print("CONTROLE NEGATIF la coupe n'est pas uniforme :", len(set(px[x, 418] for x in range(422, 437))) > 1)
